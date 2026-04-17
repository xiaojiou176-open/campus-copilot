import { Suspense, lazy, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { ExportFormat, ExportPreset } from '@campus-copilot/exporter';
import {
  CAPTURE_PLANNING_SUBSTRATE_COMMAND,
  GET_SITE_SYNC_STATUS_COMMAND,
  resolveLocalBffBaseUrl,
  SYNC_SITE_COMMAND,
  type CapturePlanningSubstrateCommandResponse,
  type LocalBffResolution,
  type SiteSyncOutcome,
  type SyncSiteCommandResponse,
} from '@campus-copilot/core';
import type { EntityKind, Resource, Site } from '@campus-copilot/schema';
import {
  clearLocalEntityOverlayField,
  markEntitiesSeen,
  upsertLocalEntityOverlay,
  useAllCourses,
  useAllPlanningSubstrates,
  useFocusQueue,
  useLatestSyncRuns,
  type WorkbenchFilter,
  useAllSiteEntityCounts,
  usePriorityAlerts,
  useRecentChangeEvents,
  useSiteSyncStates,
  useTodaySnapshot,
  useWeeklyLoad,
  useWorkbenchView,
} from '@campus-copilot/storage';
import {
  buildNextConfig,
  getDefaultExtensionConfig,
  loadExtensionConfig,
  saveExtensionConfig,
  subscribeExtensionConfig,
  type ExtensionConfig,
} from './config';
import './styles.css';
import { formatRelativeTime, getUiText, readBrowserLanguage, resolveUiLanguage } from './i18n';
import {
  buildDownloadPayload,
  buildEmptyProviderStatus,
  buildSurfaceViewModel,
  EXPORT_FORMAT_OPTIONS,
  PROVIDER_OPTIONS,
  type ProviderStatusPayload,
  type ProviderStatusState,
  type SidepanelMode,
  type SurfaceKind,
  SIDEPANEL_MODE_ORDER,
  SITE_LABELS,
} from './surface-shell-model';
import { type ExportFamilyKind, getSidepanelModeCopy } from './sidepanel-mode-copy';
const LazyAskAiContainer = lazy(async () => {
  const module = await import('./surface-shell-ask-ai-container');
  return { default: module.SurfaceShellAskAiContainer };
});

const LazyOptionsPanels = lazy(async () => {
  const module = await import('./options-panels');
  return { default: module.OptionsPanels };
});

const LazyWorkbenchPanels = lazy(async () => {
  const module = await import('./workbench-panels');
  return { default: module.WorkbenchPanels };
});

const LazyExportModePanel = lazy(async () => {
  const module = await import('./surface-shell-export-panel');
  return { default: module.SurfaceShellExportPanel };
});

type ExportScopeSite = Site | 'all';
type ActiveTabContext = {
  tabId?: number;
  url?: string;
};

const COURSE_SCOPED_EXPORT_SITES = new Set<Site>(['canvas', 'gradescope', 'edstem']);

function readInitialSidepanelMode() {
  if (typeof window === 'undefined') {
    return 'assistant' as SidepanelMode;
  }

  const candidate = new URLSearchParams(window.location.search).get('mode');
  return candidate === 'export' || candidate === 'settings' ? candidate : 'assistant';
}

function isCourseScopedExportSite(site: ExportScopeSite) {
  return site !== 'all' && COURSE_SCOPED_EXPORT_SITES.has(site);
}

function getPlanningCaptureContext(url: string | undefined) {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'myplan.uw.edu') {
      return undefined;
    }

    if (parsed.pathname.startsWith('/plan/')) {
      return {
        kind: 'plan' as const,
        label: 'MyPlan',
        buttonLabel: 'plan',
      };
    }

    if (parsed.pathname.startsWith('/audit/')) {
      return {
        kind: 'audit' as const,
        label: 'DARS audit',
        buttonLabel: 'audit',
      };
    }
  } catch {}

  return undefined;
}

function filterSiteRecords<T extends { site: Site; courseId?: string }>(
  records: T[],
  site: ExportScopeSite,
  courseId?: string,
) {
  return records.filter((record) => {
    if (site !== 'all' && record.site !== site) {
      return false;
    }

    if (courseId && record.courseId !== courseId) {
      return false;
    }

    return true;
  });
}

export function SurfaceShell({ surface }: { surface: SurfaceKind }) {
  const browserLanguage = readBrowserLanguage();
  const initialSidepanelMode = readInitialSidepanelMode();
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(() => new Date().toISOString());
  const [sidepanelMode, setSidepanelMode] = useState<SidepanelMode>(() => initialSidepanelMode);
  const [workspaceDetailsOpen, setWorkspaceDetailsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [filters, setFilters] = useState<WorkbenchFilter>({
    site: 'all',
    onlyUnseenUpdates: false,
  });
  const [exportScopeSite, setExportScopeSite] = useState<ExportScopeSite>('all');
  const [exportCourseId, setExportCourseId] = useState('');
  const [exportFamily, setExportFamily] = useState<ExportFamilyKind>('current_view');
  const [config, setConfig] = useState<ExtensionConfig>(getDefaultExtensionConfig());
  const [optionsDraft, setOptionsDraft] = useState<ExtensionConfig>(getDefaultExtensionConfig());
  const [syncFeedback, setSyncFeedback] = useState<{
    inFlightSite?: Site;
    outcome?: SiteSyncOutcome;
    message?: string;
  }>({});
  const [exportFeedback, setExportFeedback] = useState<string>();
  const [optionsFeedback, setOptionsFeedback] = useState<string>();
  const [providerStatusPending, setProviderStatusPending] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusState>(buildEmptyProviderStatus());
  const [bffResolution, setBffResolution] = useState<LocalBffResolution>({
    source: 'none',
    checkedUrls: [],
  });
  const [activeTabContext, setActiveTabContext] = useState<ActiveTabContext>({});

  const activeLanguagePreference = surface === 'options' ? optionsDraft.uiLanguage : config.uiLanguage;
  const uiLanguage = resolveUiLanguage(activeLanguagePreference, browserLanguage);
  const text = getUiText(uiLanguage);
  const modeCopy = getSidepanelModeCopy(uiLanguage);
  const copy = {
    sidepanel: {
      eyebrow: text.hero.sidepanelEyebrow,
      title: text.hero.sidepanelTitle,
      description: text.hero.sidepanelDescription,
    },
    popup: {
      eyebrow: text.hero.popupEyebrow,
      title: text.hero.popupTitle,
      description: text.hero.popupDescription,
    },
    options: {
      eyebrow: text.hero.optionsEyebrow,
      title: text.hero.optionsTitle,
      description: text.hero.optionsDescription,
    },
  }[surface];
  const todaySnapshot = useTodaySnapshot(now, undefined, refreshKey);
  const allCourses = useAllCourses(undefined, refreshKey) ?? [];
  const focusQueue = useFocusQueue(now, undefined, refreshKey) ?? [];
  const planningSubstrates = useAllPlanningSubstrates(undefined, refreshKey) ?? [];
  const weeklyLoad = useWeeklyLoad(now, undefined, refreshKey) ?? [];
  const recentChangeEvents = useRecentChangeEvents(8, undefined, refreshKey) ?? [];
  const latestSyncRuns = useLatestSyncRuns(4, undefined, refreshKey) ?? [];
  const priorityAlerts = usePriorityAlerts(now, undefined, refreshKey) ?? [];
  const siteCounts = useAllSiteEntityCounts(undefined, refreshKey) ?? [];
  const siteSyncStates = useSiteSyncStates(undefined, refreshKey) ?? [];
  const workbenchView = useWorkbenchView(now, filters, undefined, refreshKey);

  useEffect(() => {
    async function hydrateConfigAndStatus() {
      const loadedConfig = await loadExtensionConfig();
      setConfig(loadedConfig);
      setOptionsDraft(loadedConfig);
      setSelectedFormat(loadedConfig.defaultExportFormat);

      await Promise.all(
        Object.keys(SITE_LABELS).map(async (site) => {
          await browser.runtime.sendMessage({
            type: GET_SITE_SYNC_STATUS_COMMAND,
            site,
          });
        }),
      );

      const [activeTab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      setActiveTabContext({
        tabId: typeof activeTab?.id === 'number' ? activeTab.id : undefined,
        url: typeof activeTab?.url === 'string' ? activeTab.url : undefined,
      });

      setRefreshKey((current) => current + 1);
      setNow(new Date().toISOString());
    }

    void hydrateConfigAndStatus();

    const unsubscribe = subscribeExtensionConfig((nextConfig) => {
      setConfig(nextConfig);
      setOptionsDraft(nextConfig);
      setSelectedFormat(nextConfig.defaultExportFormat);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateLocalBffResolution() {
      const resolution = await resolveLocalBffBaseUrl({
        configuredBaseUrl: config.ai.bffBaseUrl,
      });

      if (!cancelled) {
        setBffResolution(resolution);
      }
    }

    void hydrateLocalBffResolution();

    return () => {
      cancelled = true;
    };
  }, [config.ai.bffBaseUrl]);

  useEffect(() => {
    if (!isCourseScopedExportSite(exportScopeSite)) {
      setExportCourseId('');
    }
  }, [exportScopeSite]);

  const currentResources = workbenchView?.resources ?? [];
  const currentAssignments = workbenchView?.assignments ?? [];
  const currentAnnouncements = workbenchView?.announcements ?? [];
  const currentMessages = workbenchView?.messages ?? [];
  const currentGrades = workbenchView?.grades ?? [];
  const currentEvents = workbenchView?.events ?? [];
  const currentAlerts = workbenchView?.alerts ?? [];
  const courseClusters = workbenchView?.courseClusters ?? [];
  const workItemClusters = workbenchView?.workItemClusters ?? [];
  const administrativeSummaries = workbenchView?.administrativeSummaries ?? [];
  const mergeHealth = workbenchView?.mergeHealth;
  const activeBffBaseUrl = bffResolution.baseUrl;

  const availableCourses = allCourses
    .filter((course) => filters.site === 'all' || course.site === filters.site)
    .map((course) => ({
      id: course.id,
      site: course.site,
      title: course.title,
      label: `${SITE_LABELS[course.site]} · ${course.title}`,
    }));
  const currentRecentUpdates = workbenchView?.recentUpdates;
  const panelLoadingFallback = (
    <article className="surface__panel surface__panel--subtle" aria-busy="true">
      <p className="surface__meta">
        {uiLanguage === 'zh-CN'
          ? '正在准备这一块工作台内容…'
          : 'Preparing this workspace section...'}
      </p>
    </article>
  );
  const planningCaptureContext = getPlanningCaptureContext(activeTabContext.url);
  async function refreshProviderStatus() {
    setProviderStatusPending(true);

    if (!activeBffBaseUrl) {
      setProviderStatus(buildEmptyProviderStatus('missing_bff_base_url'));
      setProviderStatusPending(false);
      return;
    }

    try {
      const response = await fetch(`${activeBffBaseUrl}/api/providers/status`);
      const payload = (await response.json()) as ProviderStatusPayload;
      if (payload.ok) {
        setProviderStatus({
          providers: payload.providers,
          checkedAt: new Date().toISOString(),
        });
      }
    } catch {
      setProviderStatus(buildEmptyProviderStatus('provider_status_fetch_failed'));
    } finally {
      setProviderStatusPending(false);
    }
  }

  useEffect(() => {
    void refreshProviderStatus();
  }, [activeBffBaseUrl]);

  async function refreshStatus() {
    await Promise.all(
      Object.keys(SITE_LABELS).map(async (site) => {
        await browser.runtime.sendMessage({
          type: GET_SITE_SYNC_STATUS_COMMAND,
          site,
        });
      }),
    );
    const [activeTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    setActiveTabContext({
      tabId: typeof activeTab?.id === 'number' ? activeTab.id : undefined,
      url: typeof activeTab?.url === 'string' ? activeTab.url : undefined,
    });
    setRefreshKey((current) => current + 1);
    setNow(new Date().toISOString());
  }

  async function handleSiteSync(site: Site) {
    setSyncFeedback({
      inFlightSite: site,
      outcome: undefined,
      message: undefined,
    });

    const response = (await browser.runtime.sendMessage({
      type: SYNC_SITE_COMMAND,
      site,
      tabId: activeTabContext.tabId,
      url: activeTabContext.url,
    })) as SyncSiteCommandResponse;

    await refreshStatus();
    setSyncFeedback({
      inFlightSite: undefined,
      outcome: response.outcome,
      message:
        response.outcome === 'success'
          ? text.feedback.syncSuccess(SITE_LABELS[site])
          : response.outcome === 'partial_success'
            ? text.feedback.syncPartial(SITE_LABELS[site])
            : text.feedback.syncOutcome(SITE_LABELS[site], response.outcome),
    });
  }

  async function handleCapturePlanningSubstrate() {
    setSyncFeedback({
      inFlightSite: undefined,
      outcome: undefined,
      message: text.feedback.capturingPlanningSubstrate,
    });

    const response = (await browser.runtime.sendMessage({
      type: CAPTURE_PLANNING_SUBSTRATE_COMMAND,
      tabId: activeTabContext.tabId,
      url: activeTabContext.url,
    })) as CapturePlanningSubstrateCommandResponse;

    await refreshStatus();
    setSyncFeedback({
      inFlightSite: undefined,
      outcome: response.outcome,
      message:
        response.outcome === 'success'
          ? text.feedback.planningCaptureSuccess(response.planLabel ?? planningCaptureContext?.label ?? 'MyPlan')
          : response.outcome === 'partial_success'
            ? text.feedback.planningCapturePartial(response.planLabel ?? planningCaptureContext?.label ?? 'MyPlan')
            : response.message,
    });
  }

  async function handleOverlayUpdate(input: {
    entityId: string;
    site: Site;
    kind: EntityKind;
    pinnedAt?: string | null;
    snoozeUntil?: string | null;
    dismissUntil?: string | null;
    note?: string | null;
  }, feedbackMessage: string) {
    await upsertLocalEntityOverlay(input);
    setExportFeedback(feedbackMessage);
    setRefreshKey((current) => current + 1);
  }

  async function handleTogglePin(input: {
    entityId: string;
    site: Site;
    kind: EntityKind;
    pinned: boolean;
  }) {
    await handleOverlayUpdate(
      {
        entityId: input.entityId,
        site: input.site,
        kind: input.kind,
        pinnedAt: input.pinned ? null : new Date().toISOString(),
      },
      input.pinned ? text.feedback.overlayUnpinned : text.feedback.overlayPinned,
    );
  }

  async function handleSnooze(input: {
    entityId: string;
    site: Site;
    kind: EntityKind;
  }) {
    const snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await handleOverlayUpdate(
      {
        entityId: input.entityId,
        site: input.site,
        kind: input.kind,
        snoozeUntil,
      },
      text.feedback.overlaySnoozed,
    );
  }

  async function handleDismiss(input: {
    entityId: string;
    site: Site;
    kind: EntityKind;
  }) {
    const dismissUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await handleOverlayUpdate(
      {
        entityId: input.entityId,
        site: input.site,
        kind: input.kind,
        dismissUntil,
      },
      text.feedback.overlayDismissed,
    );
  }

  async function handleNote(input: {
    entityId: string;
    site: Site;
    kind: EntityKind;
    title: string;
    note?: string;
  }) {
    if (typeof window === 'undefined') {
      return;
    }

    const nextNote = window.prompt(text.focusQueue.notePrompt(input.title), input.note ?? '');
    if (nextNote === null) {
      return;
    }

    if (!nextNote.trim()) {
      await clearLocalEntityOverlayField(input.entityId, 'note');
      setExportFeedback(text.feedback.overlayNoteCleared);
      setRefreshKey((current) => current + 1);
      return;
    }

    await handleOverlayUpdate(
      {
        entityId: input.entityId,
        site: input.site,
        kind: input.kind,
        note: nextNote,
      },
      text.feedback.overlayNoteSaved,
    );
  }

  async function handleMarkVisibleUpdatesSeen() {
    const entityIds = Array.from(
      new Set(
        (currentRecentUpdates?.items ?? [])
          .flatMap((entry) => entry.relatedEntities.map((entity) => entity.id))
          .filter(Boolean),
      ),
    );

    if (entityIds.length === 0) {
      setExportFeedback(text.feedback.noVisibleUpdatesToMark);
      return;
    }

    await markEntitiesSeen(entityIds, new Date().toISOString());
    setExportFeedback(text.feedback.visibleUpdatesMarkedSeen);
    setRefreshKey((current) => current + 1);
  }

  function buildExportArtifactInput(preset: ExportPreset, format: ExportFormat, currentFilters: WorkbenchFilter) {
    return {
      preset,
      format,
      exportScope: {
        site: currentFilters.site === 'all' ? undefined : currentFilters.site,
      },
      authorization: config.authorization,
      state: {
        now,
        uiLanguage,
        filters: currentFilters,
        currentResources,
        currentAssignments,
        currentAnnouncements,
        currentMessages,
        currentGrades,
        currentEvents,
        currentAlerts,
        currentRecentUpdates,
        workbenchResources: workbenchView?.resources ?? [],
        workbenchAssignments: workbenchView?.assignments ?? [],
        workbenchAnnouncements: workbenchView?.announcements ?? [],
        workbenchMessages: workbenchView?.messages ?? [],
        workbenchGrades: workbenchView?.grades ?? [],
        workbenchEvents: workbenchView?.events ?? [],
        priorityAlerts,
        focusQueue,
        planningSubstrates,
        weeklyLoad,
        latestSyncRuns,
        recentChangeEvents,
        courseClusters,
        workItemClusters,
        administrativeSummaries,
        mergeHealth,
      },
    };
  }

  async function handleExport(preset: ExportPreset) {
    const { buildSurfaceExportArtifact } = await import('./surface-shell-composition');
    const artifact = buildSurfaceExportArtifact(buildExportArtifactInput(preset, selectedFormat, filters));

    const blob = buildDownloadPayload(artifact.format, artifact.content);
    const url = URL.createObjectURL(blob);

    try {
      await browser.downloads.download({
        url,
        filename: artifact.filename,
        saveAs: surface === 'sidepanel' || surface === 'options',
      });
      setExportFeedback(text.feedback.downloadReady(artifact.filename));
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  async function handleSaveOptions() {
    const nextConfig = buildNextConfig({
      current: config,
      defaultExportFormat: optionsDraft.defaultExportFormat,
      uiLanguage: optionsDraft.uiLanguage,
      ai: optionsDraft.ai,
      sites: optionsDraft.sites,
      authorization: optionsDraft.authorization,
    });
    const saved = await saveExtensionConfig(nextConfig);
    setConfig(saved);
    setOptionsDraft(saved);
    setSelectedFormat(saved.defaultExportFormat);
    setOptionsFeedback(text.options.configurationSaved);
    await refreshProviderStatus();
  }

  async function handleCycleLanguagePreference() {
    const sequence: ExtensionConfig['uiLanguage'][] = ['auto', 'en', 'zh-CN'];
    const nextPreference = sequence[(sequence.indexOf(config.uiLanguage) + 1) % sequence.length];
    const nextConfig = buildNextConfig({
      current: config,
      uiLanguage: nextPreference,
    });
    const saved = await saveExtensionConfig(nextConfig);
    setConfig(saved);
    setOptionsDraft(saved);
    setOptionsFeedback(text.options.configurationSaved);
  }

  async function handleExportDiagnostics() {
    const { buildDiagnosticsReport } = await import('./diagnostics');
    const report = buildDiagnosticsReport({
      generatedAt: new Date().toISOString(),
      bffBaseUrl: activeBffBaseUrl,
      providerStatus,
      orderedSiteStatus: surfaceView.orderedSiteStatus,
      providerOptions: PROVIDER_OPTIONS,
      defaultProvider: config.ai.defaultProvider,
      siteLabels: SITE_LABELS,
      locale: uiLanguage,
    });

    const blob = buildDownloadPayload('json', JSON.stringify(report, null, 2));
    const url = URL.createObjectURL(blob);

    try {
      await browser.downloads.download({
        url,
        filename: 'campus-copilot-diagnostics.json',
        saveAs: surface !== 'popup',
      });
      setExportFeedback(text.diagnostics.reportReady);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  async function handleOpenMainWorkbench() {
    await browser.tabs.create({
      url: browser.runtime.getURL('/sidepanel.html?mode=assistant'),
    });
  }

  async function openSidepanelMode(mode: SidepanelMode) {
    await browser.tabs.create({
      url: browser.runtime.getURL(`/sidepanel.html?mode=${mode}`),
    });
  }

  const selectedFormatLabel =
    EXPORT_FORMAT_OPTIONS.find((option) => option.value === selectedFormat)?.label ?? selectedFormat;

  const surfaceView = buildSurfaceViewModel({
    alerts: priorityAlerts,
    filters,
    config: {
      ...config,
      ai: {
        ...config.ai,
        bffBaseUrl: activeBffBaseUrl,
      },
    },
    siteCounts,
    siteSyncStates,
    latestSyncRuns,
    providerStatus,
    uiLanguage,
  });
  const primaryFocusItem = focusQueue[0];
  const currentContextLabel = surfaceView.currentSiteSelection
    ? SITE_LABELS[surfaceView.currentSiteSelection]
    : filters.site === 'all'
      ? planningCaptureContext?.label ?? modeCopy.export.allSites
      : SITE_LABELS[filters.site];
  const bffStatusLabel =
    bffResolution.source === 'manual'
      ? modeCopy.connection.manual
      : bffResolution.source === 'autodiscovered'
      ? modeCopy.connection.autodiscovered
        : modeCopy.connection.none;
  const activeSidepanelHeader =
    sidepanelMode === 'assistant'
      ? {
          title: modeCopy.assistant.title,
          description: modeCopy.assistant.description,
        }
      : sidepanelMode === 'export'
        ? {
            title: modeCopy.export.title,
            description: modeCopy.export.description,
          }
        : {
            title: modeCopy.authorization.title,
            description: modeCopy.authorization.description,
          };
  const assistantFactSummary = [
    `${text.metrics.openAssignments} ${todaySnapshot?.totalAssignments ?? 0}`,
    `${text.metrics.dueWithin48Hours} ${todaySnapshot?.dueSoonAssignments ?? 0}`,
    `${text.metrics.unseenUpdates} ${currentRecentUpdates?.unseenCount ?? 0}`,
  ].join(' · ');
  const assistantReadinessSummary = activeBffBaseUrl
    ? surfaceView.diagnostics.healthy
      ? text.diagnostics.readyToContinue
      : surfaceView.diagnostics.blockers[0] ?? text.diagnostics.blockedByEnvironmentOrRuntime
    : modeCopy.assistant.noConnection;
  const assistantReceiptSummary = `${text.meta.lastRefresh}: ${formatRelativeTime(uiLanguage, surfaceView.lastSuccessfulSync)}`;
  const popupLauncherCopy = modeCopy.popup;
  const authorizationRules = config.authorization.rules;
  const allowedAuthorizationCount = authorizationRules.filter((rule) => rule.status === 'allowed').length;
  const confirmRequiredAuthorizationCount = authorizationRules.filter((rule) => rule.status === 'confirm_required').length;
  const blockedAuthorizationCount = authorizationRules.filter((rule) => rule.status === 'blocked').length;
  const authorizationStatusVariant =
    blockedAuthorizationCount > 0 ? 'warning' : confirmRequiredAuthorizationCount > 0 ? 'neutral' : 'success';
  const authorizationStatusLabel =
    uiLanguage === 'zh-CN'
      ? blockedAuthorizationCount > 0
        ? `${blockedAuthorizationCount} 项受阻`
        : confirmRequiredAuthorizationCount > 0
          ? `${confirmRequiredAuthorizationCount} 项待确认`
          : '当前无信任阻碍'
      : blockedAuthorizationCount > 0
        ? `${blockedAuthorizationCount} blocked`
        : confirmRequiredAuthorizationCount > 0
          ? `${confirmRequiredAuthorizationCount} need review`
          : 'No trust blockers';
  function enterExportMode(
    nextSite: ExportScopeSite = surfaceView.currentSiteSelection ?? (filters.site === 'all' ? 'all' : filters.site),
  ) {
    setExportScopeSite(nextSite);
    setSidepanelMode('export');
  }

  return (
    <main className={`surface surface--${surface}`}>
      <section className="surface__card">
        {surface === 'sidepanel' ? (
          <>
            <div className="surface__mode-bar">
              <div>
                <p className="surface__eyebrow">{copy.eyebrow}</p>
                <h1 className="surface__title surface__title--compact">{activeSidepanelHeader.title}</h1>
                {sidepanelMode === 'assistant' ? null : <p className="surface__copy surface__copy--compact">{activeSidepanelHeader.description}</p>}
              </div>
              <div className="surface__mode-bar-actions">
                <div className="surface__mode-switch" role="tablist" aria-label="Sidepanel modes">
                  {SIDEPANEL_MODE_ORDER.map((mode) => (
                    <button
                      key={mode}
                      className={`surface__chip ${sidepanelMode === mode ? 'surface__chip--active' : ''}`}
                      onClick={() => setSidepanelMode(mode)}
                      role="tab"
                      type="button"
                    >
                      {modeCopy.modeNav[mode]}
                    </button>
                  ))}
                </div>
                <div className="surface__mode-context">
                  <span className="surface__badge surface__badge--neutral">
                    {uiLanguage === 'zh-CN' ? '只读桌面' : 'Read-only desk'}
                  </span>
                  <button className="surface__button surface__button--ghost" onClick={() => void handleCycleLanguagePreference()} type="button">
                    {config.uiLanguage === 'auto' ? 'Auto' : config.uiLanguage === 'en' ? 'EN' : '中文'}
                  </button>
                </div>
              </div>
            </div>

            {sidepanelMode === 'assistant' ? (
              <>
                <div className="surface__assistant-stage">
                  <article className="surface__panel surface__panel--hero surface__panel--companion">
                    <div className="surface__section-head">
                      <div>
                        <p className="surface__meta-label">{modeCopy.assistant.currentContext}</p>
                        <strong>{currentContextLabel}</strong>
                      </div>
                    <p className="surface__hero-status-line">
                      <span className={`surface__hero-status-token surface__hero-status-token--${activeBffBaseUrl ? 'success' : 'warning'}`}>
                        {bffStatusLabel}
                      </span>
                      <span className="surface__hero-status-separator" aria-hidden="true">
                        ·
                      </span>
                      <span className={`surface__hero-status-token surface__hero-status-token--${authorizationStatusVariant}`}>
                        {authorizationStatusLabel}
                      </span>
                    </p>
                    </div>
                    <div className="surface__companion-grid" role="list" aria-label={modeCopy.assistant.visibleFacts}>
                      <article className="surface__companion-cell" role="listitem">
                        <p className="surface__companion-label">{modeCopy.assistant.visibleFacts}</p>
                        <strong className="surface__companion-value">{currentContextLabel}</strong>
                        <p className="surface__companion-detail">{assistantFactSummary}</p>
                      </article>
                      <article className="surface__companion-cell" role="listitem">
                        <p className="surface__companion-label">{modeCopy.assistant.activeConnection}</p>
                        <strong className="surface__companion-value">
                          {activeBffBaseUrl ? bffStatusLabel : modeCopy.connection.none}
                        </strong>
                        <p className="surface__companion-detail">{assistantReadinessSummary}</p>
                      </article>
                    </div>
                    <p className="surface__item-lead">{primaryFocusItem ? primaryFocusItem.title : text.nextUp.none}</p>
                    {primaryFocusItem?.summary ? <p>{primaryFocusItem.summary}</p> : null}
                    <p className="surface__meta">
                      {text.metrics.dueWithin48Hours} {todaySnapshot?.dueSoonAssignments ?? 0} · {text.metrics.unseenUpdates}{' '}
                      {currentRecentUpdates?.unseenCount ?? 0} · {text.askAi.structuredInputLabels.priorityAlerts}{' '}
                      {currentAlerts.length}
                    </p>
                    <div className="surface__assistant-trust-strip" role="list" aria-label={modeCopy.authorization.title}>
                      <span className="surface__assistant-trust-chip">{modeCopy.assistant.manualOnly}</span>
                      <span className="surface__assistant-trust-chip">{assistantReceiptSummary}</span>
                    </div>
                    <div className="surface__actions surface__actions--wrap">
                      {planningCaptureContext ? (
                        <button className="surface__button surface__button--secondary" onClick={() => void handleCapturePlanningSubstrate()} type="button">
                          {text.quickActions.capturePlanningSubstrate(planningCaptureContext.label)}
                        </button>
                      ) : null}
                      <button className="surface__button" onClick={() => setWorkspaceDetailsOpen((current) => !current)} type="button">
                        {workspaceDetailsOpen ? modeCopy.assistant.hideWorkspace : modeCopy.assistant.showWorkspace}
                      </button>
                      <button className="surface__button surface__button--secondary" onClick={() => enterExportMode()} type="button">
                        {modeCopy.assistant.openExport}
                      </button>
                    </div>
                    {syncFeedback.message ? <p className="surface__feedback">{syncFeedback.message}</p> : null}
                    {exportFeedback ? <p className="surface__feedback">{exportFeedback}</p> : null}
                  </article>
                </div>

                <Suspense fallback={panelLoadingFallback}>
                  <details
                    className="surface__workspace-detail"
                    onToggle={(event) => setWorkspaceDetailsOpen((event.currentTarget as HTMLDetailsElement).open)}
                    open={workspaceDetailsOpen}
                  >
                    <summary className="surface__workspace-detail-summary">
                      <span className="surface__workspace-detail-copy">
                        <strong>{uiLanguage === 'zh-CN' ? '先看这一屏的事实' : 'Review this slice first'}</strong>
                        <span>
                          {uiLanguage === 'zh-CN'
                            ? '先确认这一屏的事实、提醒和导出范围，再决定要不要让 AI 解释。'
                            : 'Check the visible facts, alerts, and export scope before deciding whether AI needs to explain them.'}
                        </span>
                      </span>
                      <span className="surface__workspace-detail-actions">
                        <span className="surface__badge surface__badge--neutral">{`Focus ${focusQueue.length}`}</span>
                        <span className="surface__badge surface__badge--neutral">
                          {uiLanguage === 'zh-CN'
                            ? `更新 ${currentRecentUpdates?.items.length ?? 0}`
                            : `Updates ${currentRecentUpdates?.items.length ?? 0}`}
                        </span>
                        <span className="surface__workspace-detail-toggle">
                          {workspaceDetailsOpen ? modeCopy.assistant.hideWorkspace : modeCopy.assistant.showWorkspace}
                        </span>
                      </span>
                    </summary>
                    <Suspense fallback={panelLoadingFallback}>
                      <LazyWorkbenchPanels
                        surface={surface}
                        copy={copy}
                        text={text}
                        uiLanguage={uiLanguage}
                        selectedFormatLabel={selectedFormatLabel}
                        filters={filters}
                        setFilters={setFilters}
                        todaySnapshot={todaySnapshot}
                        currentRecentUpdates={currentRecentUpdates}
                        syncFeedback={syncFeedback}
                        exportFeedback={exportFeedback}
                        currentSiteSelection={surfaceView.currentSiteSelection}
                        onSyncSite={handleSiteSync}
                        onExport={handleExport}
                        onOpenConfiguration={() => setSidepanelMode('settings')}
                        onMarkVisibleUpdatesSeen={handleMarkVisibleUpdatesSeen}
                        onExportDiagnostics={handleExportDiagnostics}
                        diagnostics={surfaceView.diagnostics}
                        focusQueue={focusQueue}
                        planningSubstrates={planningSubstrates}
                        weeklyLoad={weeklyLoad}
                        courseClusters={courseClusters}
                        workItemClusters={workItemClusters}
                        administrativeSummaries={administrativeSummaries}
                        mergeHealth={mergeHealth}
                        priorityAlerts={priorityAlerts}
                        criticalAlerts={surfaceView.criticalAlerts}
                        highAlerts={surfaceView.highAlerts}
                        mediumAlerts={surfaceView.mediumAlerts}
                        currentResources={currentResources}
                        currentAnnouncements={currentAnnouncements}
                        currentAssignments={currentAssignments}
                        currentMessages={currentMessages}
                        currentEvents={currentEvents}
                        orderedSiteStatus={surfaceView.orderedSiteStatus}
                        recentChangeEvents={recentChangeEvents}
                        latestSyncRun={surfaceView.latestSyncRun}
                        lastSuccessfulSync={surfaceView.lastSuccessfulSync}
                        onTogglePin={handleTogglePin}
                        onSnooze={handleSnooze}
                        onDismiss={handleDismiss}
                        onNote={handleNote}
                      />
                    </Suspense>
                  </details>
                </Suspense>

                <Suspense fallback={panelLoadingFallback}>
                  <LazyAskAiContainer
                    text={text}
                    uiLanguage={uiLanguage}
                    config={config}
                    onConfigSaved={(saved) => {
                      setConfig(saved);
                      setOptionsDraft(saved);
                    }}
                    activeBffBaseUrl={activeBffBaseUrl}
                    providerStatus={providerStatus}
                    providerStatusPending={providerStatusPending}
                    allCourses={availableCourses}
                    filters={filters}
                    now={now}
                    refreshKey={refreshKey}
                    todaySnapshot={todaySnapshot}
                    focusQueue={focusQueue}
                    planningSubstrates={planningSubstrates}
                    weeklyLoad={weeklyLoad}
                    recentChangeEvents={recentChangeEvents}
                    onRefreshProviderStatus={refreshProviderStatus}
                    onOpenConfiguration={() => setSidepanelMode('settings')}
                  />
                </Suspense>
              </>
            ) : sidepanelMode === 'export' ? (
              <Suspense fallback={panelLoadingFallback}>
                <LazyExportModePanel
                  uiLanguage={uiLanguage}
                  modeCopy={modeCopy.export}
                  refreshKey={refreshKey}
                  exportScopeSite={exportScopeSite}
                  setExportScopeSite={setExportScopeSite}
                  exportCourseId={exportCourseId}
                  setExportCourseId={setExportCourseId}
                  exportFamily={exportFamily}
                  setExportFamily={setExportFamily}
                  selectedFormat={selectedFormat}
                  setSelectedFormat={setSelectedFormat}
                  exportFeedback={exportFeedback}
                  setExportFeedback={setExportFeedback}
                  onBackToAssistant={() => setSidepanelMode('assistant')}
                  onOpenSettings={() => setSidepanelMode('settings')}
                  orderedSiteStatus={surfaceView.orderedSiteStatus}
                  allCourses={allCourses.map((course) => ({
                    id: course.id,
                    site: course.site,
                    label: `${SITE_LABELS[course.site]} · ${course.title}`,
                  }))}
                  authorization={config.authorization}
                  now={now}
                  latestSyncRuns={latestSyncRuns}
                  focusQueue={focusQueue}
                  weeklyLoad={weeklyLoad}
                  recentChangeEvents={recentChangeEvents}
                  courseClusters={courseClusters}
                  workItemClusters={workItemClusters}
                  administrativeSummaries={administrativeSummaries}
                  mergeHealth={mergeHealth}
                />
              </Suspense>
            ) : (
              <>
                <div className="surface__grid surface__grid--split">
                  <article className="surface__panel surface__panel--trust">
                    <h2>{modeCopy.connection.title}</h2>
                    <p>{modeCopy.connection.description}</p>
                    <p className="surface__meta">
                      {modeCopy.connection.resolvedUrl}: {activeBffBaseUrl ?? modeCopy.connection.none}
                    </p>
                    <p className="surface__meta">
                      {modeCopy.connection.checkedUrls}: {bffResolution.checkedUrls.join(' · ') || modeCopy.connection.none}
                    </p>
                    {bffResolution.error === 'manual_unreachable' ? (
                      <p className="surface__feedback surface__feedback--error">{modeCopy.connection.manualUnreachable}</p>
                    ) : null}
                    <div className="surface__actions surface__actions--wrap">
                      <button className="surface__button surface__button--ghost" onClick={() => void refreshProviderStatus()} type="button">
                        {text.options.refreshBffStatus}
                      </button>
                      <button className="surface__button surface__button--secondary" onClick={() => void handleCycleLanguagePreference()} type="button">
                        {config.uiLanguage === 'auto' ? 'Auto' : config.uiLanguage === 'en' ? 'EN' : '中文'}
                      </button>
                      <button
                        className="surface__button surface__button--ghost"
                        onClick={() => {
                          void browser.runtime.openOptionsPage();
                        }}
                        type="button"
                      >
                        {text.quickActions.openOptions}
                      </button>
                    </div>
                  </article>

                  <article className="surface__panel surface__panel--actions">
                    <h2>{modeCopy.authorization.title}</h2>
                    <p>{modeCopy.authorization.description}</p>
                    <div className="surface__stack">
                      <p className="surface__meta-label">{modeCopy.authorization.currentReads}</p>
                      <p className="surface__meta">
                        Canvas, Gradescope, EdStem, and MyUW structured workspace facts, plus the current read-only
                        planning/admin lanes such as MyPlan Planning Pulse, Time Schedule planning context, and
                        review-first MyUW detail summaries.
                      </p>
                      <p className="surface__meta-label">{modeCopy.authorization.plannedReads}</p>
                      <div className="surface__pill-row">
                        <span className="surface__badge surface__badge--success">MyPlan / DARS Planning Pulse</span>
                        <span className="surface__badge surface__badge--success">MyUW review-first summaries</span>
                        <span className="surface__badge surface__badge--warning">Canvas deeper runtime detail</span>
                        <span className="surface__badge surface__badge--warning">Gradescope / EdStem deepwater tails</span>
                        <span className="surface__badge surface__badge--danger">Register.UW / Notify.UW red zone</span>
                      </div>
                    </div>
                  </article>
                  <article className="surface__panel">
                    <h2>{modeCopy.modeNav.settings}</h2>
                    <p>{modeCopy.connection.description}</p>
                    <div className="surface__stack">
                      <p className="surface__meta">
                        {text.options.defaultProvider}: {config.ai.defaultProvider}
                      </p>
                      <p className="surface__meta">
                        {text.options.defaultExportFormat}: {config.defaultExportFormat.toUpperCase()}
                      </p>
                      <p className="surface__meta">
                        {modeCopy.connection.overrideHint}
                      </p>
                      <div className="surface__actions surface__actions--wrap">
                        <button
                          className="surface__button"
                          onClick={() => {
                            void browser.runtime.openOptionsPage();
                          }}
                          type="button"
                        >
                          {text.quickActions.openOptions}
                        </button>
                        <button className="surface__button surface__button--secondary" onClick={() => setSidepanelMode('assistant')} type="button">
                          {modeCopy.modeNav.assistant}
                        </button>
                      </div>
                      {optionsFeedback ? <p className="surface__feedback">{optionsFeedback}</p> : null}
                    </div>
                  </article>
                </div>
              </>
            )}
          </>
        ) : surface === 'popup' ? (
          <>
            <article className="surface__panel surface__panel--pulse-summary">
              <p className="surface__eyebrow">{copy.eyebrow}</p>
              <h1 className="surface__title surface__title--compact">{popupLauncherCopy.launchTitle}</h1>
              <p className="surface__copy surface__copy--compact">{popupLauncherCopy.launchDescription}</p>
              <div className="surface__summary-grid surface__summary-grid--compact surface__summary-grid--slim">
                <div className="surface__summary-cell surface__summary-cell--slim">
                  <strong className="surface__summary-value">{todaySnapshot?.totalAssignments ?? 0}</strong>
                  <span className="surface__summary-label">{text.metrics.openAssignments}</span>
                </div>
                <div className="surface__summary-cell surface__summary-cell--slim">
                  <strong className="surface__summary-value">{todaySnapshot?.dueSoonAssignments ?? 0}</strong>
                  <span className="surface__summary-label">{text.metrics.dueWithin48Hours}</span>
                </div>
                <div className="surface__summary-cell surface__summary-cell--slim">
                  <strong className="surface__summary-value">{currentRecentUpdates?.unseenCount ?? 0}</strong>
                  <span className="surface__summary-label">{text.metrics.unseenUpdates}</span>
                </div>
              </div>
              <p className="surface__meta">
                {modeCopy.assistant.currentContext}: {currentContextLabel} · {bffStatusLabel}
              </p>
            </article>

            <article className="surface__panel surface__panel--fast-actions">
              <h2>{popupLauncherCopy.quickExportTitle}</h2>
              <p>{popupLauncherCopy.quickExportDescription}</p>
              <div className="surface__launcher-actions">
                <button className="surface__button" onClick={() => void handleOpenMainWorkbench()} type="button">
                  {popupLauncherCopy.openAssistant}
                </button>
                <button className="surface__button surface__button--secondary" onClick={() => void openSidepanelMode('export')} type="button">
                  {popupLauncherCopy.openExport}
                </button>
                <button className="surface__button surface__button--ghost" onClick={() => void openSidepanelMode('settings')} type="button">
                  {popupLauncherCopy.openSettings}
                </button>
                {surfaceView.currentSiteSelection ? (
                  <button
                    className="surface__button surface__button--ghost"
                    disabled={syncFeedback.inFlightSite === surfaceView.currentSiteSelection}
                    onClick={() => void handleSiteSync(surfaceView.currentSiteSelection!)}
                    type="button"
                  >
                    {popupLauncherCopy.syncCurrentSite}
                  </button>
                ) : null}
              </div>
              {syncFeedback.message ? <p className="surface__feedback">{syncFeedback.message}</p> : null}
            </article>

            <article className="surface__panel surface__panel--subtle">
              <div className="surface__item-header">
                <strong>{modeCopy.assistant.trustSummary}</strong>
                <span className="surface__badge surface__badge--neutral">{text.popup.readOnlyBadge}</span>
              </div>
              <p className="surface__meta">{assistantReadinessSummary}</p>
              <p className="surface__meta">{modeCopy.assistant.manualOnly}</p>
              <p className="surface__meta">{assistantReceiptSummary}</p>
            </article>
          </>
        ) : (
          <>
            <article className="surface__panel surface__panel--hero surface__panel--trust">
              <div className="surface__section-head">
                <div>
                  <p className="surface__eyebrow">{copy.eyebrow}</p>
                  <h1 className="surface__title surface__title--compact">{copy.title}</h1>
                  <p className="surface__copy surface__copy--compact">{copy.description}</p>
                </div>
                <span className={`surface__badge surface__badge--${activeBffBaseUrl ? 'success' : 'warning'}`}>
                  {bffStatusLabel}
                </span>
              </div>
              <div className="surface__grid surface__grid--stats">
                <article className="surface__metric">
                  <span className="surface__metric-value">{allowedAuthorizationCount}</span>
                  <span className="surface__metric-label">Allowed rules</span>
                </article>
                <article className="surface__metric">
                  <span className="surface__metric-value">{confirmRequiredAuthorizationCount}</span>
                  <span className="surface__metric-label">Confirm required</span>
                </article>
                <article className="surface__metric">
                  <span className="surface__metric-value">{blockedAuthorizationCount}</span>
                  <span className="surface__metric-label">Blocked</span>
                </article>
              </div>
              <p className="surface__meta">
                {modeCopy.connection.resolvedUrl}: {activeBffBaseUrl ?? modeCopy.connection.none}
              </p>
              <p className="surface__meta">
                Policy version: {config.authorization.policyVersion} · {text.options.defaultProvider}: {config.ai.defaultProvider}
              </p>
            </article>

            <Suspense fallback={panelLoadingFallback}>
              <LazyOptionsPanels
                text={text}
                uiLanguage={uiLanguage}
                optionsDraft={optionsDraft}
                setOptionsDraft={setOptionsDraft}
                providerStatus={providerStatus}
                providerStatusPending={providerStatusPending}
                availableCourses={availableCourses}
                optionsFeedback={optionsFeedback}
                onRefreshProviderStatus={refreshProviderStatus}
                onSaveOptions={handleSaveOptions}
                onExport={handleExport}
              />
            </Suspense>
          </>
        )}
      </section>
    </main>
  );
}
