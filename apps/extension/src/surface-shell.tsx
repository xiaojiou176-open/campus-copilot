import { useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  type AdvancedMaterialAnalysisRequest,
  resolveAiAnswer,
  type AiStructuredAnswer,
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
import type { ExportFormat, ExportPreset, ExportProvenanceEntry } from '@campus-copilot/exporter';
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
    usePlanningSubstratesBySource,
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
import { buildDiagnosticsReport } from './diagnostics';
import {
  buildNextConfig,
  getDefaultExtensionConfig,
  getProviderModel,
  getSwitchyardLane,
  getSwitchyardRuntimeProvider,
  loadExtensionConfig,
  saveExtensionConfig,
  subscribeExtensionConfig,
  type ExtensionConfig,
  upsertAuthorizationRule,
} from './config';
import './styles.css';
import { buildAiProxyRequest } from './ai-request';
import { buildWorkbenchExportInput } from './export-input';
import { formatRelativeTime, getUiText, readBrowserLanguage, resolveUiLanguage } from './i18n';
import { buildSurfaceAiRequest, buildSurfaceExportArtifact } from './surface-shell-composition';
import {
  buildDownloadPayload,
  buildEmptyProviderStatus,
  buildSurfaceViewModel,
  EXPORT_FORMAT_OPTIONS,
  PROVIDER_OPTIONS,
  type AiResponsePayload,
  type ProviderStatusPayload,
  type ProviderStatusState,
  type SidepanelMode,
  type SurfaceKind,
  SIDEPANEL_MODE_ORDER,
  SITE_LABELS,
} from './surface-shell-model';
import { type ExportFamilyKind, getSidepanelModeCopy } from './sidepanel-mode-copy';
import {
  AskAiPanel,
  OptionsPanels,
  WorkbenchPanels,
} from './surface-shell-panels';

type ExportScopeSite = Site | 'all';
type ActiveTabContext = {
  tabId?: number;
  url?: string;
};

type ExportFamilyCard = {
  family: ExportFamilyKind;
  status: 'available' | 'partial' | 'blocked';
  exportable: boolean;
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

function filterCourseResources(resources: Resource[], site: ExportScopeSite, courseId?: string) {
  return resources.filter((resource) => {
    if (site !== 'all' && resource.site !== site) {
      return false;
    }

    if (courseId && resource.courseId !== courseId) {
      return false;
    }

    return true;
  });
}

export function SurfaceShell({ surface }: { surface: SurfaceKind }) {
  const browserLanguage = readBrowserLanguage();
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(() => new Date().toISOString());
  const [sidepanelMode, setSidepanelMode] = useState<SidepanelMode>(() => readInitialSidepanelMode());
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
  const [aiProvider, setAiProvider] = useState<ProviderId>('openai');
  const [aiModel, setAiModel] = useState('gpt-4.1-mini');
  const [switchyardProvider, setSwitchyardProvider] = useState<SwitchyardRuntimeProvider>('chatgpt');
  const [switchyardLane, setSwitchyardLane] = useState<SwitchyardLane>('web');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string>();
  const [aiStructuredAnswer, setAiStructuredAnswer] = useState<AiStructuredAnswer>();
  const [aiNotice, setAiNotice] = useState<string>();
  const [aiError, setAiError] = useState<string>();
  const [aiPending, setAiPending] = useState(false);
  const [advancedMaterialEnabled, setAdvancedMaterialEnabled] = useState(false);
  const [advancedMaterialCourseId, setAdvancedMaterialCourseId] = useState('');
  const [advancedMaterialExcerpt, setAdvancedMaterialExcerpt] = useState('');
  const [advancedMaterialAcknowledged, setAdvancedMaterialAcknowledged] = useState(false);
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
  const planningSubstrates = usePlanningSubstratesBySource('myplan', undefined, refreshKey) ?? [];
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
      setAiProvider(loadedConfig.ai.defaultProvider);
      setAiModel(getProviderModel(loadedConfig, loadedConfig.ai.defaultProvider));
      setSwitchyardProvider(getSwitchyardRuntimeProvider(loadedConfig));
      setSwitchyardLane(getSwitchyardLane(loadedConfig));

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
      setAiProvider(nextConfig.ai.defaultProvider);
      setAiModel(getProviderModel(nextConfig, nextConfig.ai.defaultProvider));
      setSwitchyardProvider(getSwitchyardRuntimeProvider(nextConfig));
      setSwitchyardLane(getSwitchyardLane(nextConfig));
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
  const exportScopeFilters: WorkbenchFilter = {
    site: exportScopeSite === 'all' ? 'all' : exportScopeSite,
    onlyUnseenUpdates: false,
  };
  const exportWorkbenchView = useWorkbenchView(now, exportScopeFilters, undefined, refreshKey);
  const availableCourses = allCourses
    .filter((course) => filters.site === 'all' || course.site === filters.site)
    .map((course) => ({
      id: course.id,
      site: course.site,
      title: course.title,
      label: `${SITE_LABELS[course.site]} · ${course.title}`,
    }));
  const exportScopedCourses = allCourses
    .filter((course) => exportScopeSite === 'all' || course.site === exportScopeSite)
    .map((course) => ({
      id: course.id,
      label: `${SITE_LABELS[course.site]} · ${course.title}`,
    }));
  const currentRecentUpdates = workbenchView?.recentUpdates;
  const planningCaptureContext = getPlanningCaptureContext(activeTabContext.url);
  const exportFamilyCards = useMemo<ExportFamilyCard[]>(() => {
    if (exportScopeSite === 'canvas') {
      return [
        { family: 'current_view', status: 'available', exportable: true },
        { family: 'resources', status: 'available', exportable: true },
        { family: 'assignments', status: 'available', exportable: true },
        { family: 'announcements', status: 'available', exportable: true },
        { family: 'messages', status: 'available', exportable: true },
        { family: 'grades', status: 'partial', exportable: true },
        { family: 'deadlines', status: 'available', exportable: true },
        {
          family: 'course_panorama',
          status: courseClusters.length > 0 ? 'available' : 'partial',
          exportable: courseClusters.length > 0,
        },
        {
          family: 'administrative_snapshot',
          status: administrativeSummaries.length > 0 ? 'available' : 'partial',
          exportable: administrativeSummaries.length > 0,
        },
        {
          family: 'cluster_merge_review',
          status: workItemClusters.length > 0 ? 'available' : 'partial',
          exportable: workItemClusters.length > 0,
        },
        { family: 'instructor_feedback', status: 'partial', exportable: false },
        { family: 'syllabus', status: 'blocked', exportable: false },
        { family: 'groups', status: 'blocked', exportable: false },
        { family: 'recordings', status: 'blocked', exportable: false },
      ];
    }

    return [
      { family: 'current_view', status: 'available', exportable: true },
      { family: 'resources', status: 'available', exportable: true },
      { family: 'assignments', status: 'available', exportable: true },
      { family: 'announcements', status: 'available', exportable: true },
      { family: 'messages', status: 'available', exportable: true },
      { family: 'grades', status: 'partial', exportable: true },
      { family: 'deadlines', status: 'available', exportable: true },
      {
        family: 'course_panorama',
        status: courseClusters.length > 0 ? 'available' : 'partial',
        exportable: courseClusters.length > 0,
      },
      {
        family: 'administrative_snapshot',
        status: administrativeSummaries.length > 0 ? 'available' : 'partial',
        exportable: administrativeSummaries.length > 0,
      },
      {
        family: 'cluster_merge_review',
        status: workItemClusters.length > 0 ? 'available' : 'partial',
        exportable: workItemClusters.length > 0,
      },
    ];
  }, [administrativeSummaries.length, courseClusters.length, exportScopeSite, workItemClusters.length]);

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

  async function handleExport(preset: ExportPreset) {
    const artifact = buildSurfaceExportArtifact({
      preset,
      format: selectedFormat,
      exportScope: {
        site: filters.site === 'all' ? undefined : filters.site,
      },
      authorization: config.authorization,
      state: {
        now,
        uiLanguage,
        filters,
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
    });

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

  async function handleAskAi() {
    if (!activeBffBaseUrl) {
      setAiError(text.feedback.bffMissingForAi);
      return;
    }

    if (!providerStatus.providers[aiProvider]?.ready) {
      const providerLabel = PROVIDER_OPTIONS.find((option) => option.value === aiProvider)?.label ?? aiProvider;
      setAiError(text.feedback.providerNotReadyInBff(providerLabel));
      await refreshProviderStatus();
      return;
    }

    if (!aiQuestion.trim()) {
      setAiError(text.feedback.questionRequired);
      return;
    }

    const selectedCourse = allCourses.find((course) => course.id === advancedMaterialCourseId);

    if (advancedMaterialEnabled) {
      if (!selectedCourse) {
        setAiError('Select one course before turning on advanced material analysis.');
        return;
      }

      if (!advancedMaterialExcerpt.trim()) {
        setAiError('Paste a course excerpt before asking for advanced material analysis.');
        return;
      }

      if (!advancedMaterialAcknowledged) {
        setAiError('Confirm the course-material responsibility notice before continuing.');
        return;
      }
    }

    const advancedMaterialAnalysis: AdvancedMaterialAnalysisRequest =
      advancedMaterialEnabled && selectedCourse
        ? {
            enabled: true,
            policy: 'per_course_opt_in',
            courseId: selectedCourse.id,
            courseLabel: `${SITE_LABELS[selectedCourse.site]} · ${selectedCourse.title}`,
            excerpt: advancedMaterialExcerpt.trim(),
            userAcknowledgedResponsibility: true,
          }
        : {
            enabled: false,
            policy: 'default_disabled',
          };
    let effectiveAuthorization = config.authorization;

    setAiPending(true);
    setAiError(undefined);
    setAiNotice(undefined);
    setAiStructuredAnswer(undefined);

    try {
      if (advancedMaterialEnabled && selectedCourse) {
        const nextConfig = upsertAuthorizationRule(config, {
          id: `course-material-ai:${selectedCourse.id}`,
          layer: 'layer2_ai_read_analysis',
          status: 'allowed',
          site: selectedCourse.site,
          courseIdOrKey: selectedCourse.id,
          resourceFamily: 'course_material_excerpt',
          label: `${SITE_LABELS[selectedCourse.site]} · ${selectedCourse.title} course-material AI analysis`,
          reason: 'Explicit per-course opt-in for user-pasted excerpts only.',
        });
        const saved = await saveExtensionConfig(nextConfig);
        setConfig(saved);
        setOptionsDraft(saved);
        effectiveAuthorization = saved.authorization;
      }

      const { currentViewExport: exportArtifact, proxyRequest } = buildSurfaceAiRequest({
        provider: aiProvider,
        model: aiModel,
        switchyardProvider,
        switchyardLane,
        question: aiQuestion,
        advancedMaterialAnalysis,
        authorization: effectiveAuthorization,
        todaySnapshot: todaySnapshot ?? {
          totalAssignments: 0,
          dueSoonAssignments: 0,
          recentUpdates: 0,
          newGrades: 0,
          riskAlerts: 0,
          syncedSites: 0,
        },
        state: {
          now,
          uiLanguage,
          filters,
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
      });

      if (!exportArtifact.packaging.aiAllowed) {
        setAiError(
          uiLanguage === 'zh-CN'
            ? '当前范围的 AI 读取仍需在“设置与授权”里单独放行。'
            : 'AI access for this scope still needs to be enabled in Settings/Auth.',
        );
        return;
      }

      const response = await fetch(`${activeBffBaseUrl}${proxyRequest.route}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(proxyRequest.body),
      });
      const payload = (await response.json()) as AiResponsePayload;
      const resolvedAnswer = resolveAiAnswer({
        answerText: payload.answerText,
        structuredAnswer: payload.structuredAnswer,
        citationCoverage: payload.citationCoverage,
      });

      if (!response.ok || payload.ok === false || !resolvedAnswer.answerText) {
        setAiAnswer(undefined);
        setAiStructuredAnswer(undefined);
        setAiNotice(undefined);
        setAiError(payload.error ?? payload.answerText ?? text.feedback.noDisplayableAnswer);
        return;
      }

      setAiAnswer(resolvedAnswer.answerText);
      setAiStructuredAnswer(resolvedAnswer.structuredAnswer);
      setAiNotice(
        advancedMaterialAnalysis.enabled
          ? `Advanced material analysis used only the pasted excerpt for ${advancedMaterialAnalysis.courseLabel}.`
          : resolvedAnswer.citationCoverage === 'uncited_fallback'
          ? text.feedback.aiFallbackWithoutCitations
          : undefined,
      );
    } catch (error) {
      setAiAnswer(undefined);
      setAiStructuredAnswer(undefined);
      setAiNotice(undefined);
      setAiError(error instanceof Error ? error.message : text.feedback.aiRequestFailed);
    } finally {
      setAiPending(false);
    }
  }

  async function handleExportDiagnostics() {
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
      ? `授权 ${confirmRequiredAuthorizationCount} 待确认 · ${blockedAuthorizationCount} 受阻`
      : `Auth ${confirmRequiredAuthorizationCount} confirm · ${blockedAuthorizationCount} blocked`;
  const preferredExportSite: ExportScopeSite =
    surfaceView.currentSiteSelection ?? (filters.site === 'all' ? 'all' : filters.site);
  const exportScopeLabel = exportScopeSite === 'all' ? modeCopy.export.allSites : SITE_LABELS[exportScopeSite];
  const exportCourseLabel = exportCourseId
    ? exportScopedCourses.find((course) => course.id === exportCourseId)?.label
    : undefined;
  const selectedExportFamilyCard = exportFamilyCards.find((card) => card.family === exportFamily);
  const exportResources = exportWorkbenchView?.resources ?? [];
  const exportAssignments = exportWorkbenchView?.assignments ?? [];
  const exportAnnouncements = exportWorkbenchView?.announcements ?? [];
  const exportMessages = exportWorkbenchView?.messages ?? [];
  const exportGrades = exportWorkbenchView?.grades ?? [];
  const exportEvents = exportWorkbenchView?.events ?? [];
  const scopedExportAssignments = filterSiteRecords(exportAssignments, exportScopeSite, exportCourseId);
  const scopedExportAnnouncements = filterSiteRecords(exportAnnouncements, exportScopeSite, exportCourseId);
  const scopedExportMessages = filterSiteRecords(exportMessages, exportScopeSite, exportCourseId);
  const scopedExportGrades = filterSiteRecords(exportGrades, exportScopeSite, exportCourseId);
  const scopedExportEvents = filterSiteRecords(exportEvents, exportScopeSite, exportCourseId);
  const scopedExportResources = filterCourseResources(exportResources, exportScopeSite, exportCourseId);
  const exportReviewCount =
    exportFamily === 'resources'
      ? scopedExportResources.length
      : exportFamily === 'assignments'
        ? scopedExportAssignments.length
        : exportFamily === 'announcements'
          ? scopedExportAnnouncements.length
          : exportFamily === 'messages'
            ? scopedExportMessages.length
            : exportFamily === 'grades'
              ? scopedExportGrades.length
              : exportFamily === 'deadlines'
                ? scopedExportAssignments.filter((assignment) => Boolean(assignment.dueAt)).length +
                  scopedExportEvents.filter((event) => event.eventKind === 'deadline').length
                : exportFamily === 'course_panorama'
                  ? courseClusters.length
                  : exportFamily === 'administrative_snapshot'
                    ? administrativeSummaries.length
                    : exportFamily === 'cluster_merge_review'
                      ? workItemClusters.length + courseClusters.length
                      : scopedExportResources.length +
                        scopedExportAssignments.length +
                        scopedExportAnnouncements.length +
                        scopedExportMessages.length +
                        scopedExportGrades.length +
                        scopedExportEvents.length;
  const exportReviewStatus =
    selectedExportFamilyCard?.status === 'blocked'
      ? modeCopy.export.badges.blocked
      : selectedExportFamilyCard?.status === 'partial'
        ? modeCopy.export.badges.partial
        : modeCopy.export.badges.available;
  const exportReviewTitle = modeCopy.export.families[exportFamily].label;
  const exportReviewDescription = modeCopy.export.families[exportFamily].description;
  const exportTrustSummary =
    exportFamily === 'administrative_snapshot'
      ? 'Summary-first and review-first. AI stays more restrictive than read/export for this packet.'
      : exportFamily === 'cluster_merge_review'
        ? 'Review-first packet for authority and possible-match checks before anything leaves the extension.'
        : isCourseScopedExportSite(exportScopeSite)
          ? 'Course scope narrows the packet before export, so review stays tied to one course lane.'
          : 'Whole-site export stays truthful when the source does not map cleanly to one course lane.';
  const getWorkspaceAuthorizationRule = (
    layer: 'layer1_read_export' | 'layer2_ai_read_analysis',
    site?: ExportScopeSite,
  ) =>
    authorizationRules.find(
      (rule) =>
        rule.layer === layer &&
        rule.resourceFamily === 'workspace_snapshot' &&
        !rule.courseIdOrKey &&
        (site && site !== 'all' ? rule.site === site : !rule.site),
    );
  const formatAuthorizationStatusLabel = (status: string | undefined) => {
    if (uiLanguage === 'zh-CN') {
      if (status === 'allowed') return '已允许';
      if (status === 'partial') return '部分';
      if (status === 'confirm_required') return '需确认';
      if (status === 'blocked') return '已阻止';
      return '未设置';
    }
    if (status === 'allowed') return 'Allowed';
    if (status === 'partial') return 'Partial';
    if (status === 'confirm_required') return 'Confirm required';
    if (status === 'blocked') return 'Blocked';
    return 'Unset';
  };
  const formatRiskLabel = (riskLabel: 'low' | 'medium' | 'high') => {
    if (uiLanguage === 'zh-CN') {
      if (riskLabel === 'high') return '高风险';
      if (riskLabel === 'medium') return '中风险';
      return '低风险';
    }
    if (riskLabel === 'high') return 'High risk';
    if (riskLabel === 'medium') return 'Medium risk';
    return 'Low risk';
  };
  const formatMatchConfidenceLabel = (matchConfidence: 'low' | 'medium' | 'high') => {
    if (uiLanguage === 'zh-CN') {
      if (matchConfidence === 'high') return '高匹配置信度';
      if (matchConfidence === 'medium') return '中匹配置信度';
      return '低匹配置信度';
    }
    if (matchConfidence === 'high') return 'High match confidence';
    if (matchConfidence === 'medium') return 'Medium match confidence';
    return 'Low match confidence';
  };
  const formatProvenanceSourceType = (sourceType: ExportProvenanceEntry['sourceType']) => {
    if (uiLanguage === 'zh-CN') {
      if (sourceType === 'official_api') return '官方 API';
      if (sourceType === 'session_interface') return '会话载体';
      if (sourceType === 'page_state') return '页面状态';
      return '派生读模型';
    }
    if (sourceType === 'official_api') return 'official API';
    if (sourceType === 'session_interface') return 'session-backed carrier';
    if (sourceType === 'page_state') return 'page-state carrier';
    return 'derived read model';
  };
  const exportLayer1Rule =
    getWorkspaceAuthorizationRule('layer1_read_export', exportScopeSite) ?? getWorkspaceAuthorizationRule('layer1_read_export');
  const exportLayer2Rule =
    getWorkspaceAuthorizationRule('layer2_ai_read_analysis', exportScopeSite) ?? getWorkspaceAuthorizationRule('layer2_ai_read_analysis');
  const highSensitivityLayer1Rules = authorizationRules.filter(
    (rule) => rule.layer === 'layer1_read_export' && rule.resourceFamily?.endsWith('_summary'),
  );
  const highSensitivityLayer2Rules = authorizationRules.filter(
    (rule) => rule.layer === 'layer2_ai_read_analysis' && rule.resourceFamily?.endsWith('_summary'),
  );
  const exportAuthorizationLead =
    exportFamily === 'administrative_snapshot'
      ? uiLanguage === 'zh-CN'
        ? `高敏摘要导出 ${highSensitivityLayer1Rules.filter((rule) => rule.status === 'confirm_required').length} 项需确认 · AI ${highSensitivityLayer2Rules.filter((rule) => rule.status === 'blocked').length} 项保持阻止`
        : `${highSensitivityLayer1Rules.filter((rule) => rule.status === 'confirm_required').length} high-sensitivity summaries require Layer 1 confirmation · ${highSensitivityLayer2Rules.filter((rule) => rule.status === 'blocked').length} stay AI-blocked`
      : `${formatAuthorizationStatusLabel(exportLayer1Rule?.status)} · ${formatAuthorizationStatusLabel(exportLayer2Rule?.status)}`;
  const exportAuthorizationDetail =
    exportFamily === 'administrative_snapshot'
      ? uiLanguage === 'zh-CN'
        ? '这组导出保持 summary-first / export-first；AI 不会因为能导出就自动获得读取权限。'
        : 'This packet stays summary-first and export-first; AI does not inherit access just because export is allowed.'
      : uiLanguage === 'zh-CN'
        ? `当前导出按 ${exportScopeLabel} 的 Layer 1 / Layer 2 工作区授权来解释边界。`
        : `This export follows the current Layer 1 / Layer 2 workspace authorization for ${exportScopeLabel}.`;
  const exportDepthDetail =
    selectedExportFamilyCard?.status === 'partial'
      ? uiLanguage === 'zh-CN'
        ? '这条资源族已经 landed，但仍是部分深度，不会伪装成 full parity。'
        : 'This family is landed but still partial depth; it should not be treated as full parity.'
      : selectedExportFamilyCard?.status === 'blocked'
        ? uiLanguage === 'zh-CN'
          ? '当前 carrier 还没到可导出产品面，这里只允许诚实地显示为 blocked。'
          : 'The carrier is not productized for export yet, so this stays honestly blocked.'
        : uiLanguage === 'zh-CN'
        ? '这条资源族当前已经处在可导出的 landed 路径上。'
        : 'This family is currently on the landed export path.';
  const exportPacketHonesty =
    exportFamily === 'administrative_snapshot'
      ? uiLanguage === 'zh-CN'
        ? '高敏摘要保持 summary-first；导出允许不等于 AI 自动继承读取。'
        : 'High-sensitivity summaries stay summary-first; export allowed does not mean AI automatically inherits read access.'
      : selectedExportFamilyCard?.status === 'blocked'
        ? uiLanguage === 'zh-CN'
          ? '当前只允许诚实地停在 review blocked，不把未产品化 carrier 包装成可导出。'
          : 'This stays honestly review-blocked instead of pretending an unproductized carrier is export-ready.'
        : uiLanguage === 'zh-CN'
          ? '先审 scope、授权和深度，再决定是否导出这个 packet。'
          : 'Review scope, authorization, and depth before deciding to export this packet.';

  function buildSelectedExportArtifact() {
    const exportResources = exportWorkbenchView?.resources ?? [];
    const exportAssignments = exportWorkbenchView?.assignments ?? [];
    const exportAnnouncements = exportWorkbenchView?.announcements ?? [];
    const exportMessages = exportWorkbenchView?.messages ?? [];
    const exportGrades = exportWorkbenchView?.grades ?? [];
    const exportEvents = exportWorkbenchView?.events ?? [];
    const exportAlerts = exportWorkbenchView?.alerts ?? [];
    const exportRecentUpdates = exportWorkbenchView?.recentUpdates;

    const scopedAssignments = filterSiteRecords(exportAssignments, exportScopeSite, exportCourseId);
    const scopedAnnouncements = filterSiteRecords(exportAnnouncements, exportScopeSite, exportCourseId);
    const scopedMessages = filterSiteRecords(exportMessages, exportScopeSite, exportCourseId);
    const scopedGrades = filterSiteRecords(exportGrades, exportScopeSite, exportCourseId);
    const scopedEvents = filterSiteRecords(exportEvents, exportScopeSite, exportCourseId);
    const scopedResources = filterCourseResources(exportResources, exportScopeSite, exportCourseId);
    const scopedAlerts = exportCourseId
      ? []
      : exportAlerts.filter((alert) => exportScopeSite === 'all' || alert.site === exportScopeSite);
    const scopedRecentUpdates =
      exportScopeSite === 'all'
        ? exportRecentUpdates
        : exportRecentUpdates
            ? {
                ...exportRecentUpdates,
                items: exportRecentUpdates.items.filter((entry) => entry.site === exportScopeSite),
                unseenCount: exportRecentUpdates.items.filter((entry) => entry.site === exportScopeSite).length,
              }
            : undefined;

    let preset: ExportPreset = 'current_view';
    let nextAssignments = scopedAssignments;
    let nextAnnouncements = scopedAnnouncements;
    let nextMessages = scopedMessages;
    let nextGrades = scopedGrades;
    let nextEvents = scopedEvents;
    let nextResources = scopedResources;
    let nextAlerts = scopedAlerts;
    let nextRecentUpdates = exportCourseId ? undefined : scopedRecentUpdates;
    let nextFocusQueue = exportCourseId ? [] : focusQueue.filter((item) => exportScopeSite === 'all' || item.site === exportScopeSite);
    let nextWeeklyLoad = exportCourseId ? [] : weeklyLoad;
    let nextChangeEvents = exportCourseId ? [] : recentChangeEvents.filter((event) => exportScopeSite === 'all' || event.site === exportScopeSite);

    switch (exportFamily) {
      case 'assignments':
      case 'resources':
        nextAnnouncements = [];
        if (exportFamily !== 'resources') {
          nextResources = [];
        }
        nextMessages = [];
        nextGrades = [];
        nextEvents = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'announcements':
        nextAssignments = [];
        nextMessages = [];
        nextGrades = [];
        nextEvents = [];
        nextResources = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'messages':
        nextAssignments = [];
        nextAnnouncements = [];
        nextGrades = [];
        nextEvents = [];
        nextResources = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'grades':
        nextAssignments = [];
        nextAnnouncements = [];
        nextMessages = [];
        nextEvents = [];
        nextResources = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'deadlines':
        preset = 'all_deadlines';
        nextAssignments = scopedAssignments.filter((assignment) => Boolean(assignment.dueAt));
        nextAnnouncements = [];
        nextMessages = [];
        nextGrades = [];
        nextEvents = scopedEvents.filter((event) => event.eventKind === 'deadline');
        nextResources = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'course_panorama':
        preset = 'course_panorama';
        nextAnnouncements = [];
        nextMessages = [];
        nextGrades = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'administrative_snapshot':
        preset = 'administrative_snapshot';
        nextAssignments = [];
        nextAnnouncements = [];
        nextMessages = [];
        nextGrades = [];
        nextEvents = [];
        nextResources = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'cluster_merge_review':
        preset = 'cluster_merge_review';
        nextAssignments = [];
        nextAnnouncements = [];
        nextMessages = [];
        nextGrades = [];
        nextEvents = [];
        nextResources = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      default:
        break;
    }

    return buildSurfaceExportArtifact({
      preset,
      format: selectedFormat,
      viewTitleOverride: [
        exportScopeSite === 'all' ? modeCopy.export.allSites : SITE_LABELS[exportScopeSite],
        exportCourseId ? exportScopedCourses.find((course) => course.id === exportCourseId)?.label : undefined,
        modeCopy.export.families[exportFamily].label,
      ]
        .filter(Boolean)
        .join(' · '),
      exportScope: {
        site: exportScopeSite === 'all' ? undefined : exportScopeSite,
        courseIdOrKey: exportCourseId || undefined,
        resourceFamily: exportFamily === 'current_view' ? 'workspace_snapshot' : exportFamily,
      },
      authorization: config.authorization,
      state: {
        now,
        uiLanguage,
        filters: {
          site: exportScopeSite === 'all' ? 'all' : exportScopeSite,
          onlyUnseenUpdates: false,
        },
        currentResources: nextResources,
        currentAssignments: nextAssignments,
        currentAnnouncements: nextAnnouncements,
        currentMessages: nextMessages,
        currentGrades: nextGrades,
        currentEvents: nextEvents,
        currentAlerts: nextAlerts,
        currentRecentUpdates: nextRecentUpdates,
        workbenchResources: nextResources,
        workbenchAssignments: nextAssignments,
        workbenchAnnouncements: nextAnnouncements,
        workbenchMessages: nextMessages,
        workbenchGrades: nextGrades,
        workbenchEvents: nextEvents,
        priorityAlerts: nextAlerts,
        focusQueue: nextFocusQueue,
        planningSubstrates: [],
        weeklyLoad: nextWeeklyLoad,
        latestSyncRuns,
        recentChangeEvents: nextChangeEvents,
        courseClusters,
        workItemClusters,
        administrativeSummaries,
        mergeHealth,
      },
    });
  }

  const exportReviewArtifact = useMemo(
    () => buildSelectedExportArtifact(),
    [
      administrativeSummaries,
      config.authorization,
      courseClusters,
      exportCourseId,
      exportFamily,
      exportScopeSite,
      exportScopedCourses,
      exportWorkbenchView,
      focusQueue,
      latestSyncRuns,
      mergeHealth,
      modeCopy,
      now,
      recentChangeEvents,
      selectedFormat,
      uiLanguage,
      weeklyLoad,
      workItemClusters,
    ],
  );
  const exportReviewPackaging = exportReviewArtifact.packaging;
  const exportAiAllowedLead =
    uiLanguage === 'zh-CN'
      ? exportReviewPackaging.aiAllowed
        ? 'AI 分析已允许'
        : 'AI 分析保持阻止'
      : exportReviewPackaging.aiAllowed
        ? 'AI analysis allowed'
        : 'AI analysis blocked';
  const exportAiAllowedDetail =
    exportReviewPackaging.aiAllowed
      ? uiLanguage === 'zh-CN'
        ? 'Layer 2 当前允许 AI 在这个 packet 上做分析，但不改变导出或站外写边界。'
        : 'Layer 2 currently allows AI analysis for this packet without changing export or external-write boundaries.'
      : uiLanguage === 'zh-CN'
        ? 'Layer 2 仍然比导出更严格；就算能导出，这个 packet 也不会自动开放给 AI。'
        : 'Layer 2 stays stricter than export here; an exportable packet does not automatically become AI-readable.';
  const exportRiskLead = formatRiskLabel(exportReviewPackaging.riskLabel);
  const exportRiskDetail =
    exportReviewPackaging.riskLabel === 'high'
      ? uiLanguage === 'zh-CN'
        ? '这个 packet 需要更高强度的 operator 判断，不应被当成低风险素材。'
        : 'This packet needs stronger operator judgment and should not be treated as low-risk material.'
      : exportReviewPackaging.riskLabel === 'medium'
        ? uiLanguage === 'zh-CN'
          ? '当前允许 review-first 地继续，但仍需要看清 carrier 和授权边界。'
          : 'This can proceed review-first, but the carrier and authorization boundary still need to stay visible.'
        : uiLanguage === 'zh-CN'
          ? '当前风险标签较低，但仍按 review-first desk 展示，不做静默导出假设。'
          : 'This currently carries a lower risk label, but it still stays on the review-first desk instead of assuming silent export.';
  const exportMatchLead = formatMatchConfidenceLabel(exportReviewPackaging.matchConfidence);
  const exportMatchDetail =
    exportReviewPackaging.matchConfidence === 'high'
      ? uiLanguage === 'zh-CN'
        ? '当前 packet 的作用域和载体比较稳定，operator 只需要做常规核对。'
        : 'This packet currently maps through a more stable scope and carrier lane, so normal operator review is usually enough.'
      : exportReviewPackaging.matchConfidence === 'medium'
        ? uiLanguage === 'zh-CN'
          ? '当前仍有一定的合并或作用域不确定性，所以 review 不该被跳过。'
          : 'There is still some scope or merge uncertainty here, so the review step should stay visible.'
        : uiLanguage === 'zh-CN'
          ? '当前匹配把握较弱，适合先停在 review，而不是假装已经 fully resolved。'
          : 'Confidence is weaker here, so it is more honest to stop at review than to pretend the packet is fully resolved.';
  const exportProvenanceEntries = exportReviewPackaging.provenance;
  const exportProvenanceLead =
    exportProvenanceEntries[0]?.label ??
    (uiLanguage === 'zh-CN' ? '当前 packet 没有来源标签' : 'No provenance label on this packet');
  const exportProvenanceSourceSummary =
    exportProvenanceEntries.length > 0
      ? Array.from(new Set(exportProvenanceEntries.map((entry) => formatProvenanceSourceType(entry.sourceType)))).join(' · ')
      : uiLanguage === 'zh-CN'
        ? '暂无来源类型'
        : 'No provenance types yet';
  const exportProvenanceDetail =
    exportProvenanceEntries.length > 0
      ? uiLanguage === 'zh-CN'
        ? `${exportProvenanceEntries.length} 条只读来源线索 · ${exportProvenanceSourceSummary}`
        : `${exportProvenanceEntries.length} read-only provenance lanes · ${exportProvenanceSourceSummary}`
      : uiLanguage === 'zh-CN'
        ? '当前 review 卡还没有拿到来源明细。'
        : 'This review card does not currently have provenance detail.';
  const exportProvenanceSecondary =
    exportProvenanceEntries.length > 1
      ? exportProvenanceEntries
          .slice(1, 3)
          .map((entry) => entry.label)
          .join(' · ')
      : undefined;
  const exportScopeReceipt = [exportScopeLabel, exportCourseLabel ?? modeCopy.export.allCourses, selectedFormatLabel].join(' · ');

  function enterExportMode(nextSite: ExportScopeSite = preferredExportSite) {
    setExportScopeSite(nextSite);
    setSidepanelMode('export');
  }

  async function handleExportSelection() {
    const artifact = exportReviewArtifact;

    const blob = buildDownloadPayload(artifact.format, artifact.content);
    const url = URL.createObjectURL(blob);

    try {
      await browser.downloads.download({
        url,
        filename: artifact.filename,
        saveAs: true,
      });
      setExportFeedback(text.feedback.downloadReady(artifact.filename));
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
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
                <button className="surface__button surface__button--ghost" onClick={() => void handleCycleLanguagePreference()} type="button">
                  {config.uiLanguage === 'auto' ? 'Auto' : config.uiLanguage === 'en' ? 'EN' : '中文'}
                </button>
                <span className={`surface__badge surface__badge--${activeBffBaseUrl ? 'success' : 'warning'}`}>
                  {bffStatusLabel}
                </span>
                <span className={`surface__badge surface__badge--${authorizationStatusVariant}`}>{authorizationStatusLabel}</span>
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
                        <p className="surface__meta">{assistantFactSummary}</p>
                      </div>
                      <span className={`surface__badge surface__badge--${activeBffBaseUrl ? 'success' : 'warning'}`}>
                        {bffStatusLabel}
                      </span>
                    </div>
                    <p className="surface__item-lead">{primaryFocusItem ? primaryFocusItem.title : text.nextUp.none}</p>
                    {primaryFocusItem?.summary ? <p>{primaryFocusItem.summary}</p> : null}
                    <p className="surface__meta">
                      {text.metrics.dueWithin48Hours} {todaySnapshot?.dueSoonAssignments ?? 0} · {text.metrics.unseenUpdates}{' '}
                      {currentRecentUpdates?.unseenCount ?? 0} · {text.askAi.structuredInputLabels.priorityAlerts}{' '}
                      {currentAlerts.length}
                    </p>
                    <p className="surface__meta">{assistantReadinessSummary}</p>
                    <div className="surface__actions surface__actions--wrap">
                      <button className="surface__button" onClick={() => enterExportMode()} type="button">
                        {modeCopy.assistant.openExport}
                      </button>
                      <button className="surface__button surface__button--secondary" onClick={() => setSidepanelMode('settings')} type="button">
                        {modeCopy.assistant.openSettings}
                      </button>
                    </div>
                    {syncFeedback.message ? <p className="surface__feedback">{syncFeedback.message}</p> : null}
                    {exportFeedback ? <p className="surface__feedback">{exportFeedback}</p> : null}
                  </article>
                </div>
                <div className="surface__assistant-trust-strip" role="list" aria-label={modeCopy.authorization.title}>
                  <span className="surface__assistant-trust-chip surface__assistant-trust-chip--success">{modeCopy.assistant.readOnly}</span>
                  <span className="surface__assistant-trust-chip">{modeCopy.assistant.structuredOnly}</span>
                  <span className="surface__assistant-trust-chip">{modeCopy.assistant.manualOnly}</span>
                  <span className="surface__assistant-trust-chip">{assistantReceiptSummary}</span>
                </div>

                <AskAiPanel
                  text={text}
                  uiLanguage={uiLanguage}
                  config={config}
                  activeBffBaseUrl={activeBffBaseUrl}
                  providerStatus={providerStatus}
                  providerStatusPending={providerStatusPending}
                  aiProvider={aiProvider}
                  aiModel={aiModel}
                  switchyardProvider={switchyardProvider}
                  switchyardLane={switchyardLane}
                  aiQuestion={aiQuestion}
                  aiPending={aiPending}
                  aiAnswer={aiAnswer}
                  aiStructuredAnswer={aiStructuredAnswer}
                  aiNotice={aiNotice}
                  aiError={aiError}
                  currentPolicySite={filters.site === 'all' ? undefined : filters.site}
                  availableCourses={availableCourses}
                  advancedMaterialEnabled={advancedMaterialEnabled}
                  advancedMaterialCourseId={advancedMaterialCourseId}
                  advancedMaterialExcerpt={advancedMaterialExcerpt}
                  advancedMaterialAcknowledged={advancedMaterialAcknowledged}
                  structuredInputSummary={{
                    totalAssignments: todaySnapshot?.totalAssignments ?? 0,
                    dueSoonAssignments: todaySnapshot?.dueSoonAssignments ?? 0,
                    newGrades: todaySnapshot?.newGrades ?? 0,
                    recentUpdatesCount: currentRecentUpdates?.items.length ?? 0,
                    priorityAlertsCount: currentAlerts.length,
                    focusQueueCount: focusQueue.length,
                    weeklyLoadCount: weeklyLoad.length,
                    changeJournalCount: recentChangeEvents.length,
                    courseClusterCount: courseClusters.length,
                    workItemClusterCount: workItemClusters.length,
                    administrativeSummaryCount: administrativeSummaries.length,
                    currentViewFormat: 'markdown',
                  }}
                  onProviderChange={(provider) => {
                    setAiProvider(provider);
                    setAiModel(getProviderModel(config, provider));
                  }}
                  onModelChange={setAiModel}
                  onSwitchyardProviderChange={setSwitchyardProvider}
                  onSwitchyardLaneChange={setSwitchyardLane}
                  onQuestionChange={setAiQuestion}
                  onAdvancedMaterialEnabledChange={(value) => {
                    setAdvancedMaterialEnabled(value);
                    if (!value) {
                      setAdvancedMaterialCourseId('');
                      setAdvancedMaterialExcerpt('');
                      setAdvancedMaterialAcknowledged(false);
                    }
                  }}
                  onAdvancedMaterialCourseChange={setAdvancedMaterialCourseId}
                  onAdvancedMaterialExcerptChange={setAdvancedMaterialExcerpt}
                  onAdvancedMaterialAcknowledgedChange={setAdvancedMaterialAcknowledged}
                  onAskAi={handleAskAi}
                  onRefreshProviderStatus={refreshProviderStatus}
                  onOpenConfiguration={() => setSidepanelMode('settings')}
                />

                <details
                  className="surface__workspace-detail"
                  onToggle={(event) => setWorkspaceDetailsOpen((event.currentTarget as HTMLDetailsElement).open)}
                  open={workspaceDetailsOpen}
                >
                  <summary className="surface__workspace-detail-summary">
                    {workspaceDetailsOpen ? modeCopy.assistant.hideWorkspace : modeCopy.assistant.showWorkspace}
                  </summary>
                  <WorkbenchPanels
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
                </details>
              </>
            ) : sidepanelMode === 'export' ? (
              <>
                <article className="surface__panel surface__panel--hero">
                  <h2>{modeCopy.export.title}</h2>
                  <p>{modeCopy.export.description}</p>
                  <div className="surface__actions surface__actions--wrap surface__actions--tight">
                    <span className="surface__badge surface__badge--neutral">1 · {modeCopy.export.siteLabel}</span>
                    <span className="surface__badge surface__badge--neutral">2 · {modeCopy.export.familyLabel}</span>
                    <span className="surface__badge surface__badge--neutral">3 · {modeCopy.export.formatLabel}</span>
                    <span className="surface__badge surface__badge--neutral">
                      4 · {uiLanguage === 'zh-CN' ? '审核并导出' : 'Review & export'}
                    </span>
                  </div>
                </article>
                <div className="surface__grid surface__grid--split">
                  <article className="surface__panel">
                    <p className="surface__meta-label">1 · {modeCopy.export.siteLabel}</p>
                    <label className="surface__field">
                      <span>{modeCopy.export.siteLabel}</span>
                      <select
                        value={exportScopeSite}
                        onChange={(event) => setExportScopeSite(event.target.value as ExportScopeSite)}
                      >
                        <option value="all">{modeCopy.export.allSites}</option>
                        {surfaceView.orderedSiteStatus.map((entry) => (
                          <option key={entry.site} value={entry.site}>
                            {SITE_LABELS[entry.site]}
                          </option>
                        ))}
                      </select>
                    </label>
                    {isCourseScopedExportSite(exportScopeSite) ? (
                      <label className="surface__field">
                        <span>{modeCopy.export.courseLabel}</span>
                        <select value={exportCourseId} onChange={(event) => setExportCourseId(event.target.value)}>
                          <option value="">{modeCopy.export.allCourses}</option>
                          {exportScopedCourses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.label}
                            </option>
                          ))}
                        </select>
                        <p className="surface__meta">{modeCopy.export.courseScopedHint}</p>
                      </label>
                    ) : (
                      <p className="surface__meta">{modeCopy.export.globalHint}</p>
                    )}
                    <p className="surface__meta-label">3 · {modeCopy.export.formatLabel}</p>
                    <label className="surface__field">
                      <span>{modeCopy.export.formatLabel}</span>
                      <select
                        value={selectedFormat}
                        onChange={(event) => setSelectedFormat(event.target.value as ExportFormat)}
                      >
                        {EXPORT_FORMAT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="surface__actions surface__actions--wrap">
                      <button className="surface__button surface__button--ghost" onClick={() => setSidepanelMode('assistant')} type="button">
                        {modeCopy.modeNav.assistant}
                      </button>
                    </div>
                    {exportFeedback ? <p className="surface__feedback">{exportFeedback}</p> : null}
                  </article>

                  <article className="surface__panel">
                    <p className="surface__meta-label">2 · {modeCopy.export.familyLabel}</p>
                    <div className="surface__grid">
                      {exportFamilyCards.map((card) => (
                        <button
                          key={card.family}
                          className={`surface__resource-card ${exportFamily === card.family ? 'surface__resource-card--active' : ''}`}
                          disabled={!card.exportable}
                          onClick={() => setExportFamily(card.family)}
                          type="button"
                        >
                          <div className="surface__item-header">
                            <strong>{modeCopy.export.families[card.family].label}</strong>
                            <span className={`surface__badge surface__badge--${card.status === 'available' ? 'success' : card.status === 'partial' ? 'warning' : 'danger'}`}>
                              {modeCopy.export.badges[card.status]}
                            </span>
                          </div>
                          <p>{modeCopy.export.families[card.family].description}</p>
                        </button>
                      ))}
                    </div>
                  </article>
                </div>
                <article className="surface__panel surface__panel--trust">
                  <p className="surface__meta-label">4 · {uiLanguage === 'zh-CN' ? '审核并导出' : 'Review & export'}</p>
                  <div className="surface__item-header">
                    <div>
                      <strong>{exportReviewTitle}</strong>
                      <p className="surface__meta">
                        {exportReviewDescription} {uiLanguage === 'zh-CN' ? '先看 trust review，再点导出。' : 'Trust review comes before the export action.'}
                      </p>
                      <p className="surface__meta">
                        {uiLanguage === 'zh-CN' ? '当前 packet receipt：' : 'Current packet receipt: '} {exportScopeReceipt}
                      </p>
                    </div>
                    <span
                      className={`surface__badge surface__badge--${
                        selectedExportFamilyCard?.status === 'blocked'
                          ? 'danger'
                          : selectedExportFamilyCard?.status === 'partial'
                            ? 'warning'
                            : 'success'
                      }`}
                    >
                      {exportReviewStatus}
                    </span>
                  </div>
                  <div className="surface__evidence-grid surface__evidence-grid--compact">
                    <article className="surface__evidence-card">
                      <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? '授权摘要' : 'Authorization summary'}</p>
                      <p className="surface__item-lead">{exportAuthorizationLead}</p>
                      <p className="surface__meta">{exportAuthorizationDetail}</p>
                    </article>
                    <article className="surface__evidence-card">
                      <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? '深度状态' : 'Depth status'}</p>
                      <p className="surface__item-lead">{exportReviewStatus}</p>
                      <p className="surface__meta">{exportDepthDetail}</p>
                    </article>
                    <article className="surface__evidence-card">
                      <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? '导出包诚实度' : 'Packet honesty'}</p>
                      <p className="surface__item-lead">{selectedExportFamilyCard?.status === 'blocked' ? exportReviewStatus : exportReviewTitle}</p>
                      <p className="surface__meta">{exportPacketHonesty}</p>
                    </article>
                    <article className="surface__evidence-card">
                      <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? 'AI 可见性' : 'AI visibility'}</p>
                      <p className="surface__item-lead">{exportAiAllowedLead}</p>
                      <p className="surface__meta">{exportAiAllowedDetail}</p>
                    </article>
                    <article className="surface__evidence-card">
                      <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? '风险标签' : 'Risk label'}</p>
                      <p className="surface__item-lead">{exportRiskLead}</p>
                      <p className="surface__meta">{exportRiskDetail}</p>
                    </article>
                    <article className="surface__evidence-card">
                      <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? '匹配把握' : 'Match confidence'}</p>
                      <p className="surface__item-lead">{exportMatchLead}</p>
                      <p className="surface__meta">{exportMatchDetail}</p>
                    </article>
                    <article className="surface__evidence-card">
                      <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? '来源线索' : 'Provenance'}</p>
                      <p className="surface__item-lead">{exportProvenanceLead}</p>
                      <p className="surface__meta">{exportProvenanceDetail}</p>
                      {exportProvenanceSecondary ? <p className="surface__meta">{exportProvenanceSecondary}</p> : null}
                    </article>
                  </div>
                  <p className="surface__item-lead">
                    {uiLanguage === 'zh-CN' ? '本次导出预计包含' : 'This export currently includes'} {exportReviewCount}{' '}
                    {uiLanguage === 'zh-CN' ? '项结构化结果。' : 'structured items.'}
                  </p>
                  <p className="surface__meta">{exportTrustSummary}</p>
                  <div className="surface__actions surface__actions--wrap">
                    <button
                      className="surface__button"
                      disabled={!selectedExportFamilyCard?.exportable}
                      onClick={() => void handleExportSelection()}
                      type="button"
                    >
                      {modeCopy.export.exportButton}
                    </button>
                    <button className="surface__button surface__button--secondary" onClick={() => setSidepanelMode('settings')} type="button">
                      {modeCopy.modeNav.settings}
                    </button>
                  </div>
                </article>
              </>
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
                      <p className="surface__meta">Canvas assignments, announcements, inbox, deadlines, plus the current four-site read-only workspace.</p>
                      <p className="surface__meta-label">{modeCopy.authorization.plannedReads}</p>
                      <div className="surface__pill-row">
                        <span className="surface__badge surface__badge--success">Canvas inbox</span>
                        <span className="surface__badge surface__badge--warning">Canvas grades</span>
                        <span className="surface__badge surface__badge--danger">Canvas syllabus</span>
                        <span className="surface__badge surface__badge--danger">Canvas recordings</span>
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

            <OptionsPanels
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
          </>
        )}
      </section>
    </main>
  );
}
