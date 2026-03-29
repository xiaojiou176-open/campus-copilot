import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { AiStructuredAnswerSchema, type ProviderId, type AiStructuredAnswer } from '@campus-copilot/ai';
import type { ExportFormat, ExportPreset } from '@campus-copilot/exporter';
import { createExportArtifact } from '@campus-copilot/exporter';
import {
  GET_SITE_SYNC_STATUS_COMMAND,
  SYNC_SITE_COMMAND,
  type SiteSyncOutcome,
  type SyncSiteCommandResponse,
} from '@campus-copilot/core';
import type { EntityKind, Site } from '@campus-copilot/schema';
import {
  clearLocalEntityOverlayField,
  markEntitiesSeen,
  upsertLocalEntityOverlay,
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
import { buildSiteBlockingHint } from './background-runtime';
import {
  buildDiagnosticsReport,
  buildDiagnosticsSummary,
  formatProviderReason,
  formatProviderStatusError,
  type ProviderStatusLike,
} from './diagnostics';
import {
  buildNextConfig,
  getDefaultExtensionConfig,
  getProviderModel,
  loadExtensionConfig,
  saveExtensionConfig,
  subscribeExtensionConfig,
  type ExtensionConfig,
} from './config';
import './styles.css';
import { buildAiProxyRequest } from './ai-request';
import { formatDateTime, formatRelativeTime, getUiText, readBrowserLanguage, resolveUiLanguage, type ResolvedUiLanguage } from './i18n';

type SurfaceKind = 'sidepanel' | 'popup' | 'options';

type AiResponsePayload = {
  ok?: boolean;
  answerText?: string;
  structuredAnswer?: unknown;
  error?: string;
};

type ProviderStatusPayload = {
  ok: boolean;
  providers: Record<
    ProviderId,
    {
      ready: boolean;
      authMode: 'api_key';
      reason: string;
    }
  >;
};

type ProviderStatusState = {
  providers: ProviderStatusPayload['providers'];
  checkedAt?: string;
  error?: string;
};

const SITE_ORDER: Site[] = ['canvas', 'gradescope', 'edstem', 'myuw'];

const SITE_LABELS: Record<Site, string> = {
  canvas: 'Canvas',
  gradescope: 'Gradescope',
  edstem: 'EdStem',
  myuw: 'MyUW',
};

const EXPORT_FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
  { value: 'ics', label: 'ICS' },
];

const PROVIDER_OPTIONS: Array<{ value: ProviderId; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
];

function buildDownloadPayload(format: ExportFormat, content: string) {
  return new Blob([content], {
    type: format === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8',
  });
}

function getSiteStatusTone(outcome?: SiteSyncOutcome, status?: 'idle' | 'syncing' | 'success' | 'error') {
  if (status === 'syncing') {
    return 'neutral';
  }

  if (outcome === 'success') {
    return 'success';
  }

  if (outcome === 'partial_success') {
    return 'warning';
  }

  if (outcome) {
    return 'danger';
  }

  return 'neutral';
}

function getSiteStatusLabel(
  outcome: SiteSyncOutcome | undefined,
  status: 'idle' | 'syncing' | 'success' | 'error' | undefined,
  locale: ResolvedUiLanguage,
) {
  const labels = getUiText(locale).siteStatus.labels;
  if (status === 'syncing') {
    return labels.syncing;
  }

  if (outcome) {
    switch (outcome) {
      case 'success':
        return labels.success;
      case 'partial_success':
        return labels.partialSuccess;
      case 'not_logged_in':
        return labels.notLoggedIn;
      case 'unsupported_context':
        return labels.unsupportedContext;
      case 'unauthorized':
        return labels.unauthorized;
      case 'request_failed':
        return labels.requestFailed;
      case 'normalize_failed':
        return labels.normalizeFailed;
      case 'collector_failed':
        return labels.collectorFailed;
      default:
        return outcome;
    }
  }

  if (status === 'success') {
    return labels.success;
  }

  if (status === 'error') {
    return labels.error;
  }

  return labels.idle;
}

export function SurfaceShell({ surface }: { surface: SurfaceKind }) {
  const browserLanguage = readBrowserLanguage();
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(() => new Date().toISOString());
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [filters, setFilters] = useState<WorkbenchFilter>({
    site: 'all',
    onlyUnseenUpdates: false,
  });
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
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string>();
  const [aiStructuredAnswer, setAiStructuredAnswer] = useState<AiStructuredAnswer>();
  const [aiError, setAiError] = useState<string>();
  const [aiPending, setAiPending] = useState(false);
  const [providerStatusPending, setProviderStatusPending] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusState>({
    providers: {
      openai: {
        ready: false,
        authMode: 'api_key',
        reason: 'missing_api_key',
      },
      gemini: {
        ready: false,
        authMode: 'api_key',
        reason: 'missing_api_key',
      },
    },
  });

  const activeLanguagePreference = surface === 'options' ? optionsDraft.uiLanguage : config.uiLanguage;
  const uiLanguage = resolveUiLanguage(activeLanguagePreference, browserLanguage);
  const text = getUiText(uiLanguage);
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
  const focusQueue = useFocusQueue(now, undefined, refreshKey) ?? [];
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

      await Promise.all(
        SITE_ORDER.map(async (site) => {
          await browser.runtime.sendMessage({
            type: GET_SITE_SYNC_STATUS_COMMAND,
            site,
          });
        }),
      );

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
    });

    return unsubscribe;
  }, []);

  const currentAssignments = workbenchView?.assignments ?? [];
  const currentAnnouncements = workbenchView?.announcements ?? [];
  const currentMessages = workbenchView?.messages ?? [];
  const currentGrades = workbenchView?.grades ?? [];
  const currentEvents = workbenchView?.events ?? [];
  const currentAlerts = workbenchView?.alerts ?? [];
  const currentRecentUpdates = workbenchView?.recentUpdates;

  async function refreshProviderStatus() {
    setProviderStatusPending(true);

    if (!config.ai.bffBaseUrl) {
      setProviderStatus({
        providers: {
          openai: {
            ready: false,
            authMode: 'api_key',
            reason: 'missing_api_key',
          },
          gemini: {
            ready: false,
            authMode: 'api_key',
            reason: 'missing_api_key',
          },
        },
        checkedAt: new Date().toISOString(),
        error: 'missing_bff_base_url',
      });
      setProviderStatusPending(false);
      return;
    }

    try {
      const response = await fetch(`${config.ai.bffBaseUrl}/api/providers/status`);
      const payload = (await response.json()) as ProviderStatusPayload;
      if (payload.ok) {
        setProviderStatus({
          providers: payload.providers,
          checkedAt: new Date().toISOString(),
        });
      }
    } catch {
      setProviderStatus({
        providers: {
          openai: {
            ready: false,
            authMode: 'api_key',
            reason: 'missing_api_key',
          },
          gemini: {
            ready: false,
            authMode: 'api_key',
            reason: 'missing_api_key',
          },
        },
        checkedAt: new Date().toISOString(),
        error: 'provider_status_fetch_failed',
      });
    } finally {
      setProviderStatusPending(false);
    }
  }

  useEffect(() => {
    void refreshProviderStatus();
  }, [config.ai.bffBaseUrl]);

  async function refreshStatus() {
    await Promise.all(
      SITE_ORDER.map(async (site) => {
        await browser.runtime.sendMessage({
          type: GET_SITE_SYNC_STATUS_COMMAND,
          site,
        });
      }),
    );
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
    const artifact = createExportArtifact({
      preset,
      format: selectedFormat,
      input: {
        generatedAt: now,
        viewTitle:
          preset === 'current_view'
            ? `${filters.site === 'all' ? 'All sites' : SITE_LABELS[filters.site]} current view`
            : 'Campus Copilot Home',
        assignments: preset === 'current_view' ? currentAssignments : workbenchView?.assignments ?? [],
        announcements: preset === 'current_view' ? currentAnnouncements : workbenchView?.announcements ?? [],
        messages: preset === 'current_view' ? currentMessages : workbenchView?.messages ?? [],
        grades: preset === 'current_view' ? currentGrades : workbenchView?.grades ?? [],
        events: preset === 'current_view' ? currentEvents : workbenchView?.events ?? [],
        alerts: preset === 'current_view' ? currentAlerts : priorityAlerts,
        timelineEntries: preset === 'current_view' ? currentRecentUpdates?.items ?? [] : currentRecentUpdates?.items ?? [],
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
    });
    const saved = await saveExtensionConfig(nextConfig);
    setConfig(saved);
    setOptionsDraft(saved);
    setSelectedFormat(saved.defaultExportFormat);
    setOptionsFeedback(text.options.configurationSaved);
    await refreshProviderStatus();
  }

  async function handleAskAi() {
    if (!config.ai.bffBaseUrl) {
      setAiError(text.feedback.bffMissingForAi);
      return;
    }

    if (!providerStatus.providers[aiProvider]?.ready) {
      setAiError(text.feedback.providerNotReadyInBff(PROVIDER_OPTIONS.find((option) => option.value === aiProvider)?.label ?? aiProvider));
      await refreshProviderStatus();
      return;
    }

    if (!aiQuestion.trim()) {
      setAiError(text.feedback.questionRequired);
      return;
    }

    setAiPending(true);
    setAiError(undefined);
    setAiStructuredAnswer(undefined);

    try {
      const exportArtifact = createExportArtifact({
        preset: 'current_view',
        format: 'markdown',
        input: {
          generatedAt: now,
          viewTitle: 'Current workbench view',
          assignments: currentAssignments,
          announcements: currentAnnouncements,
          messages: currentMessages,
          grades: currentGrades,
          events: currentEvents,
          alerts: currentAlerts,
          timelineEntries: currentRecentUpdates?.items ?? [],
        },
      });

      const proxyRequest = buildAiProxyRequest({
        provider: aiProvider,
        model: aiModel,
        question: aiQuestion,
        todaySnapshot: todaySnapshot ?? {
          totalAssignments: 0,
          dueSoonAssignments: 0,
          recentUpdates: 0,
          newGrades: 0,
          riskAlerts: 0,
          syncedSites: 0,
        },
        recentUpdates: currentRecentUpdates?.items ?? [],
        alerts: currentAlerts,
        focusQueue,
        weeklyLoad,
        recentChanges: recentChangeEvents,
        currentViewExport: exportArtifact,
      });

      const response = await fetch(`${config.ai.bffBaseUrl}${proxyRequest.route}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(proxyRequest.body),
      });
      const payload = (await response.json()) as AiResponsePayload;

      if (!response.ok || payload.ok === false || !payload.answerText) {
        setAiAnswer(undefined);
        setAiStructuredAnswer(undefined);
        setAiError(payload.error ?? payload.answerText ?? text.feedback.noDisplayableAnswer);
        return;
      }

      setAiAnswer(payload.answerText);
      const parsedStructuredAnswer = AiStructuredAnswerSchema.safeParse(payload.structuredAnswer);
      setAiStructuredAnswer(parsedStructuredAnswer.success ? parsedStructuredAnswer.data : undefined);
    } catch (error) {
      setAiAnswer(undefined);
      setAiStructuredAnswer(undefined);
      setAiError(error instanceof Error ? error.message : text.feedback.aiRequestFailed);
    } finally {
      setAiPending(false);
    }
  }

  const orderedSiteStatus = SITE_ORDER.map((site) => {
    const sync = siteSyncStates.find((entry) => entry.site === site);
    const counts =
      siteCounts.find((entry) => entry.site === site) ?? {
        site,
        courses: 0,
        assignments: 0,
        announcements: 0,
        grades: 0,
        messages: 0,
        events: 0,
        alerts: 0,
      };

    return {
      site,
      counts,
      sync,
      hint: buildSiteBlockingHint(site, {
        outcome: sync?.lastOutcome,
        hasEdStemConfig: Boolean(config.sites.edstem.threadsPath),
        locale: uiLanguage,
      }),
    };
  });

  const criticalAlerts = priorityAlerts.filter((alert) => alert.importance === 'critical');
  const highAlerts = priorityAlerts.filter((alert) => alert.importance === 'high');
  const mediumAlerts = priorityAlerts.filter((alert) => !['critical', 'high'].includes(alert.importance));
  const lastSuccessfulSync = siteSyncStates.find((entry) => entry.status === 'success')?.lastSyncedAt;
  const currentSiteSelection = filters.site === 'all' ? undefined : filters.site;
  const latestSyncRun = latestSyncRuns[0];
  const diagnostics = buildDiagnosticsSummary({
    bffBaseUrl: config.ai.bffBaseUrl,
    providerStatus: providerStatus as ProviderStatusLike,
    orderedSiteStatus,
    providerOptions: PROVIDER_OPTIONS,
    defaultProvider: config.ai.defaultProvider,
    siteLabels: SITE_LABELS,
    locale: uiLanguage,
  });

  async function handleExportDiagnostics() {
    const report = buildDiagnosticsReport({
      generatedAt: new Date().toISOString(),
      bffBaseUrl: config.ai.bffBaseUrl,
      providerStatus: providerStatus as ProviderStatusLike,
      orderedSiteStatus,
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

  return (
    <main className={`surface surface--${surface}`}>
      <section className="surface__card">
        <div className="surface__hero">
          <div>
            <p className="surface__eyebrow">{copy.eyebrow}</p>
            <h1 className="surface__title">{copy.title}</h1>
            <p className="surface__copy">{copy.description}</p>
          </div>
          <div className="surface__hero-meta">
            <span>{text.meta.lastRefresh}: {formatRelativeTime(uiLanguage, lastSuccessfulSync)}</span>
            <span>{text.meta.defaultExport}: {EXPORT_FORMAT_OPTIONS.find((option) => option.value === selectedFormat)?.label}</span>
          </div>
        </div>

        <div className="surface__grid surface__grid--stats">
          <article className="surface__panel surface__metric">
            <span className="surface__metric-value">{todaySnapshot?.totalAssignments ?? 0}</span>
            <span className="surface__metric-label">{text.metrics.openAssignments}</span>
          </article>
          <article className="surface__panel surface__metric">
            <span className="surface__metric-value">{todaySnapshot?.dueSoonAssignments ?? 0}</span>
            <span className="surface__metric-label">{text.metrics.dueWithin48Hours}</span>
          </article>
          <article className="surface__panel surface__metric">
            <span className="surface__metric-value">{currentRecentUpdates?.unseenCount ?? 0}</span>
            <span className="surface__metric-label">{text.metrics.unseenUpdates}</span>
          </article>
          <article className="surface__panel surface__metric">
            <span className="surface__metric-value">{todaySnapshot?.newGrades ?? 0}</span>
            <span className="surface__metric-label">{text.metrics.newGrades}</span>
          </article>
          <article className="surface__panel surface__metric">
            <span className="surface__metric-value">{todaySnapshot?.syncedSites ?? 0}</span>
            <span className="surface__metric-label">{text.metrics.syncedSites}</span>
          </article>
        </div>

        {surface !== 'options' ? (
          <div className="surface__toolbar">
            <div className="surface__chips">
              <button
                className={`surface__chip ${filters.site === 'all' ? 'surface__chip--active' : ''}`}
                onClick={() => setFilters((current) => ({ ...current, site: 'all' }))}
              >
                {text.toolbar.allSites}
              </button>
              {SITE_ORDER.map((site) => (
                <button
                  key={site}
                  className={`surface__chip ${filters.site === site ? 'surface__chip--active' : ''}`}
                  onClick={() => setFilters((current) => ({ ...current, site }))}
                >
                  {SITE_LABELS[site]}
                </button>
              ))}
            </div>

            <label className="surface__toggle">
              <input
                type="checkbox"
                checked={filters.onlyUnseenUpdates}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    onlyUnseenUpdates: event.target.checked,
                  }))
                }
              />
              <span>{text.toolbar.onlyUnseen}</span>
            </label>
          </div>
        ) : null}

        <div className="surface__grid surface__grid--split">
          <article className="surface__panel">
            <h2>{text.todaySnapshot.title}</h2>
            <p>{text.todaySnapshot.description}</p>
            <ul className="surface__list">
              <li>{text.todaySnapshot.currentTodo}: {todaySnapshot?.totalAssignments ?? 0}</li>
              <li>{text.todaySnapshot.dueSoon}: {todaySnapshot?.dueSoonAssignments ?? 0}</li>
              <li>{text.todaySnapshot.recentUpdates}: {todaySnapshot?.recentUpdates ?? 0}</li>
              <li>{text.todaySnapshot.unseenInView}: {currentRecentUpdates?.unseenCount ?? 0}</li>
            </ul>
          </article>

          <article className="surface__panel">
            <h2>{text.quickActions.title}</h2>
            <p>{text.quickActions.description}</p>
            <div className="surface__actions surface__actions--wrap">
              <button
                className="surface__button"
                disabled={!currentSiteSelection || syncFeedback.inFlightSite === currentSiteSelection}
                onClick={() => (currentSiteSelection ? void handleSiteSync(currentSiteSelection) : undefined)}
              >
                {currentSiteSelection
                  ? syncFeedback.inFlightSite === currentSiteSelection
                    ? text.quickActions.syncInProgress(SITE_LABELS[currentSiteSelection])
                    : text.quickActions.syncCurrentSite(SITE_LABELS[currentSiteSelection])
                  : text.quickActions.selectSiteBeforeSync}
              </button>
              <button className="surface__button surface__button--secondary" onClick={() => void handleExport('current_view')}>
                {text.quickActions.openExport}
              </button>
              <button className="surface__button surface__button--secondary" onClick={() => void handleMarkVisibleUpdatesSeen()}>
                {text.quickActions.markUpdatesSeen}
              </button>
              <button className="surface__button surface__button--ghost" onClick={() => void browser.runtime.openOptionsPage()}>
                {text.quickActions.openOptions}
              </button>
            </div>
            {syncFeedback.message ? <p className="surface__feedback">{syncFeedback.message}</p> : null}
            {exportFeedback ? <p className="surface__feedback">{exportFeedback}</p> : null}
          </article>
        </div>

        {surface !== 'popup' ? (
          <article className="surface__panel">
            <h2>{text.diagnostics.title}</h2>
            <p>{text.diagnostics.description}</p>
            <div className="surface__stack">
              <p className="surface__meta">
                {text.meta.currentStatus}: {diagnostics.healthy ? text.diagnostics.readyToContinue : text.diagnostics.blockedByEnvironmentOrRuntime}
              </p>
              {diagnostics.blockers.length > 0 ? (
                <ul className="surface__list">
                  {diagnostics.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              ) : (
                <p>{text.diagnostics.noBlockers}</p>
              )}
              {diagnostics.nextActions.length > 0 ? (
                <div className="surface__group">
                  <h3>{text.diagnostics.nextActions}</h3>
                  <ul className="surface__list">
                    {diagnostics.nextActions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="surface__actions">
                <button className="surface__button surface__button--ghost" onClick={() => void handleExportDiagnostics()}>
                  {text.diagnostics.exportJson}
                </button>
              </div>
            </div>
          </article>
        ) : null}

        {surface !== 'popup' ? (
          <>
            <div className="surface__grid surface__grid--split">
              <article className="surface__panel">
                <h2>{text.focusQueue.title}</h2>
                <p>{text.focusQueue.description}</p>
                <div className="surface__stack">
                  {focusQueue.length ? (
                    focusQueue.slice(0, 6).map((item) => (
                      <article className="surface__item" key={item.id}>
                        <div className="surface__item-header">
                          <strong>{item.title}</strong>
                          <span className="surface__badge surface__badge--neutral">{item.score}</span>
                        </div>
                        <p>{item.reasons.map((reason) => reason.label).join(' · ')}</p>
                        {item.note ? <p className="surface__meta">{text.focusQueue.editNote}: {item.note}</p> : null}
                        <p className="surface__meta">
                          {SITE_LABELS[item.site]}
                          {item.dueAt ? ` · ${text.currentTasks.dueAt(formatDateTime(uiLanguage, item.dueAt))}` : ''}
                        </p>
                        {item.blockedBy.length ? <p className="surface__meta">{item.blockedBy.join(' / ')}</p> : null}
                        {item.entityId && item.entityRef ? (
                          <div className="surface__actions surface__actions--wrap">
                            <button
                              className="surface__button surface__button--ghost"
                              onClick={() =>
                                void handleTogglePin({
                                  entityId: item.entityId!,
                                  site: item.site,
                                  kind: item.entityRef!.kind,
                                  pinned: item.pinned,
                                })
                              }
                            >
                              {item.pinned ? text.focusQueue.unpin : text.focusQueue.pin}
                            </button>
                            <button
                              className="surface__button surface__button--ghost"
                              onClick={() =>
                                void handleSnooze({
                                  entityId: item.entityId!,
                                  site: item.site,
                                  kind: item.entityRef!.kind,
                                })
                              }
                            >
                              {text.focusQueue.snoozeUntilTomorrow}
                            </button>
                            <button
                              className="surface__button surface__button--ghost"
                              onClick={() =>
                                void handleDismiss({
                                  entityId: item.entityId!,
                                  site: item.site,
                                  kind: item.entityRef!.kind,
                                })
                              }
                            >
                              {text.focusQueue.dismissUntilTomorrow}
                            </button>
                            <button
                              className="surface__button surface__button--ghost"
                              onClick={() =>
                                void handleNote({
                                  entityId: item.entityId!,
                                  site: item.site,
                                  kind: item.entityRef!.kind,
                                  title: item.title,
                                  note: item.note,
                                })
                              }
                            >
                              {item.note ? text.focusQueue.editNote : text.focusQueue.addNote}
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p>{text.focusQueue.none}</p>
                  )}
                </div>
              </article>

              <article className="surface__panel">
                <h2>{text.weeklyLoad.title}</h2>
                <p>{text.weeklyLoad.description}</p>
                <div className="surface__stack">
                  {weeklyLoad.length ? (
                    weeklyLoad.map((entry) => (
                      <article className="surface__item" key={entry.dateKey}>
                        <div className="surface__item-header">
                          <strong>{entry.dateKey}</strong>
                          <span className={`surface__badge surface__badge--${entry.totalScore >= 200 ? 'critical' : entry.totalScore >= 120 ? 'warning' : 'neutral'}`}>
                            {text.weeklyLoad.score}: {entry.totalScore}
                          </span>
                        </div>
                        <p className="surface__meta">
                          {text.weeklyLoad.assignments} {entry.assignmentCount} · {text.weeklyLoad.dueSoon} {entry.dueSoonCount} · {text.weeklyLoad.overdue} {entry.overdueCount} · {text.weeklyLoad.pinned} {entry.pinnedCount}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p>{text.weeklyLoad.none}</p>
                  )}
                </div>
              </article>
            </div>

            <div className="surface__grid surface__grid--split">
              <article className="surface__panel">
                <h2>{text.priorityAlerts.title}</h2>
                <p>{text.priorityAlerts.description}</p>
                <div className="surface__stack">
                  {criticalAlerts.length > 0 ? (
                    <section className="surface__group">
                      <h3>{text.priorityAlerts.critical}</h3>
                      {criticalAlerts.map((alert) => (
                        <article className="surface__item" key={alert.id}>
                          <div className="surface__item-header">
                            <strong>{alert.title}</strong>
                            <span className={`surface__badge surface__badge--${alert.importance}`}>{alert.importance}</span>
                          </div>
                          <p>{alert.summary}</p>
                          <p className="surface__meta">
                            {SITE_LABELS[alert.site]} · {formatDateTime(uiLanguage, alert.triggeredAt)}
                          </p>
                        </article>
                      ))}
                    </section>
                  ) : null}
                  {highAlerts.length > 0 ? (
                    <section className="surface__group">
                      <h3>{text.priorityAlerts.high}</h3>
                      {highAlerts.map((alert) => (
                        <article className="surface__item" key={alert.id}>
                          <div className="surface__item-header">
                            <strong>{alert.title}</strong>
                            <span className={`surface__badge surface__badge--${alert.importance}`}>{alert.importance}</span>
                          </div>
                          <p>{alert.summary}</p>
                          <p className="surface__meta">
                            {SITE_LABELS[alert.site]} · {formatDateTime(uiLanguage, alert.triggeredAt)}
                          </p>
                        </article>
                      ))}
                    </section>
                  ) : null}
                  {mediumAlerts.length > 0 ? (
                    <section className="surface__group">
                      <h3>{text.priorityAlerts.medium}</h3>
                      {mediumAlerts.map((alert) => (
                        <article className="surface__item" key={alert.id}>
                          <div className="surface__item-header">
                            <strong>{alert.title}</strong>
                            <span className={`surface__badge surface__badge--${alert.importance}`}>{alert.importance}</span>
                          </div>
                          <p>{alert.summary}</p>
                          <p className="surface__meta">
                            {SITE_LABELS[alert.site]} · {formatDateTime(uiLanguage, alert.triggeredAt)}
                          </p>
                        </article>
                      ))}
                    </section>
                  ) : null}
                  {priorityAlerts.length === 0 ? <p>{text.priorityAlerts.none}</p> : null}
                </div>
              </article>

              <article className="surface__panel">
                <h2>{text.recentUpdates.title}</h2>
                <p>{text.recentUpdates.description}</p>
                <div className="surface__stack">
                  {currentRecentUpdates?.items.length ? (
                    currentRecentUpdates.items.map((entry) => (
                      <article className="surface__item" key={entry.id}>
                        <div className="surface__item-header">
                          <strong>{entry.title}</strong>
                          <span className="surface__badge surface__badge--neutral">{entry.timelineKind}</span>
                        </div>
                        {entry.summary ? <p>{entry.summary}</p> : null}
                        <p className="surface__meta">
                          {SITE_LABELS[entry.site]} · {formatDateTime(uiLanguage, entry.occurredAt)}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p>{text.recentUpdates.none}</p>
                  )}
                </div>
              </article>
            </div>

            <div className="surface__grid surface__grid--split">
              <article className="surface__panel">
                <h2>{text.currentTasks.title}</h2>
                <p>{text.currentTasks.description}</p>
                <div className="surface__stack">
                  {currentAssignments.length ? (
                    currentAssignments.slice(0, surface === 'sidepanel' ? 8 : 4).map((assignment) => (
                      <article className="surface__item" key={assignment.id}>
                        <div className="surface__item-header">
                          <strong>{assignment.title}</strong>
                          <span className="surface__badge surface__badge--neutral">{assignment.status}</span>
                        </div>
                        <p className="surface__meta">
                          {SITE_LABELS[assignment.site]} · {assignment.dueAt ? text.currentTasks.dueAt(formatDateTime(uiLanguage, assignment.dueAt)) : text.meta.noTimeProvided}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p>{text.currentTasks.none}</p>
                  )}
                </div>
              </article>

              <article className="surface__panel">
                <h2>{text.siteStatus.title}</h2>
                <p>{text.siteStatus.description}</p>
                <div className="surface__stack">
                  {orderedSiteStatus.map((entry) => (
                    <article className="surface__item" key={entry.site} aria-label={SITE_LABELS[entry.site]}>
                      <div className="surface__item-header">
                        <strong>{SITE_LABELS[entry.site]}</strong>
                        <span
                          className={`surface__badge surface__badge--${getSiteStatusTone(entry.sync?.lastOutcome, entry.sync?.status)}`}
                        >
                          {getSiteStatusLabel(entry.sync?.lastOutcome, entry.sync?.status, uiLanguage)}
                        </span>
                      </div>
                      <p className="surface__meta">{text.siteStatus.counts(entry.counts)}</p>
                      <p className="surface__meta">{text.meta.lastSync}: {formatRelativeTime(uiLanguage, entry.sync?.lastSyncedAt)}</p>
                      {entry.sync?.resourceFailures?.length ? (
                        <p>{text.siteStatus.resourceGaps(entry.sync.resourceFailures.map((item) => item.resource).join(' / '))}</p>
                      ) : null}
                      {entry.sync?.errorReason ? <p>{entry.sync.errorReason}</p> : null}
                      {entry.hint ? <p>{entry.hint}</p> : null}
                      <div className="surface__actions">
                        <button
                          className="surface__button surface__button--ghost"
                          disabled={syncFeedback.inFlightSite === entry.site}
                          onClick={() => void handleSiteSync(entry.site)}
                        >
                          {syncFeedback.inFlightSite === entry.site ? text.siteStatus.syncing : text.siteStatus.syncButton(SITE_LABELS[entry.site])}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            </div>

            <article className="surface__panel">
              <h2>{text.changeJournal.title}</h2>
              <p>{text.changeJournal.description}</p>
              {latestSyncRun ? (
                <p className="surface__meta">
                  {SITE_LABELS[latestSyncRun.site]} · {formatDateTime(uiLanguage, latestSyncRun.completedAt)} · {latestSyncRun.outcome}
                </p>
              ) : null}
              <div className="surface__stack">
                {recentChangeEvents.length ? (
                  recentChangeEvents.map((event) => (
                    <article className="surface__item" key={event.id}>
                      <div className="surface__item-header">
                        <strong>{event.title}</strong>
                        <span className="surface__badge surface__badge--neutral">{event.changeType}</span>
                      </div>
                      <p>{event.summary}</p>
                      <p className="surface__meta">
                        {SITE_LABELS[event.site]} · {formatDateTime(uiLanguage, event.occurredAt)}
                      </p>
                    </article>
                  ))
                ) : (
                  <p>{text.changeJournal.none}</p>
                )}
              </div>
            </article>

            {surface === 'sidepanel' ? (
              <article className="surface__panel">
                <h2>{text.askAi.title}</h2>
                <p>{text.askAi.description}</p>
                <div className="surface__grid surface__grid--split">
                  <label className="surface__field">
                    <span>{text.askAi.provider}</span>
                    <select
                      value={aiProvider}
                      onChange={(event) => {
                        const nextProvider = event.target.value as ProviderId;
                        setAiProvider(nextProvider);
                        setAiModel(getProviderModel(config, nextProvider));
                      }}
                    >
                      {PROVIDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="surface__field">
                    <span>{text.askAi.model}</span>
                    <input value={aiModel} onChange={(event) => setAiModel(event.target.value)} />
                  </label>
                </div>
                <div className="surface__stack">
                  {PROVIDER_OPTIONS.map((option) => (
                    <p className="surface__meta" key={option.value}>
                      {option.label} · {providerStatus.providers[option.value]?.ready ? text.meta.ready : text.meta.notReady} · {formatProviderReason(providerStatus.providers[option.value]?.reason, uiLanguage)}
                    </p>
                  ))}
                  <p className="surface__meta">
                    {text.meta.lastChecked}: {formatRelativeTime(uiLanguage, providerStatus.checkedAt)}
                    {providerStatus.error ? ` · ${formatProviderStatusError(providerStatus.error, uiLanguage)}` : ''}
                  </p>
                </div>
                <div className="surface__actions">
                  <button className="surface__button surface__button--ghost" disabled={providerStatusPending} onClick={() => void refreshProviderStatus()}>
                    {providerStatusPending ? text.askAi.refreshingProviderStatus : text.askAi.refreshProviderStatus}
                  </button>
                </div>
                <label className="surface__field">
                  <span>{text.askAi.question}</span>
                  <textarea
                    rows={4}
                    value={aiQuestion}
                    onChange={(event) => setAiQuestion(event.target.value)}
                    placeholder={text.askAi.placeholder}
                  />
                </label>
                <div className="surface__actions surface__actions--wrap">
                  <button className="surface__button" disabled={aiPending} onClick={() => void handleAskAi()}>
                    {aiPending ? `${text.askAi.ask}…` : text.askAi.ask}
                  </button>
                  <button className="surface__button surface__button--ghost" onClick={() => void browser.runtime.openOptionsPage()}>
                    {text.askAi.configure}
                  </button>
                </div>
                {!config.ai.bffBaseUrl ? <p className="surface__feedback">{text.askAi.missingBffFeedback}</p> : null}
                {aiError ? <p className="surface__feedback surface__feedback--error">{aiError}</p> : null}
                {aiStructuredAnswer ? (
                  <div className="surface__answer">
                    <p>{aiStructuredAnswer.summary}</p>
                    {aiStructuredAnswer.bullets.length ? (
                      <div className="surface__group">
                        <h3>{text.askAi.keyPoints}</h3>
                        <ul className="surface__list">
                          {aiStructuredAnswer.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {aiStructuredAnswer.citations.length ? (
                      <div className="surface__group">
                        <h3>{text.askAi.citations}</h3>
                        <ul className="surface__list">
                          {aiStructuredAnswer.citations.map((citation) => (
                            <li key={`${citation.entityId}:${citation.title}`}>
                              {citation.url ? (
                                <a href={citation.url} target="_blank" rel="noreferrer">
                                  {citation.title}
                                </a>
                              ) : (
                                citation.title
                              )}{' '}
                              · {citation.site} · {citation.kind}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : aiAnswer ? <div className="surface__answer">{aiAnswer}</div> : null}
              </article>
            ) : null}
          </>
        ) : null}

        {surface === 'popup' ? (
          <div className="surface__grid">
            <article className="surface__panel">
              <h2>{text.popup.quickExport}</h2>
              <div className="surface__actions surface__actions--wrap">
                <button className="surface__button surface__button--secondary" onClick={() => void handleExport('weekly_assignments')}>
                  {text.popup.weeklyAssignments}
                </button>
                <button className="surface__button surface__button--ghost" onClick={() => void handleExport('current_view')}>
                  {text.popup.currentView}
                </button>
              </div>
            </article>
          </div>
        ) : null}

        {surface === 'options' ? (
          <div className="surface__grid surface__grid--split">
            <article className="surface__panel">
              <h2>{text.options.siteConfiguration}</h2>
              <p>{text.options.siteConfigurationDescription}</p>
              <label className="surface__field">
                <span>{text.options.threadsPath}</span>
                <input
                  value={optionsDraft.sites.edstem.threadsPath ?? ''}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        sites: {
                          edstem: {
                            ...current.sites.edstem,
                            threadsPath: event.target.value || undefined,
                          },
                        },
                      }),
                    )
                  }
                  placeholder="/api/courses/90031/threads?limit=30&sort=new"
                />
              </label>
              <label className="surface__field">
                <span>{text.options.unreadPath}</span>
                <input
                  value={optionsDraft.sites.edstem.unreadPath ?? ''}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        sites: {
                          edstem: {
                            ...current.sites.edstem,
                            unreadPath: event.target.value || undefined,
                          },
                        },
                      }),
                    )
                  }
                  placeholder={text.options.unreadPathPlaceholder}
                />
              </label>
              <label className="surface__field">
                <span>{text.options.recentActivityPath}</span>
                <input
                  value={optionsDraft.sites.edstem.recentActivityPath ?? ''}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        sites: {
                          edstem: {
                            ...current.sites.edstem,
                            recentActivityPath: event.target.value || undefined,
                          },
                        },
                      }),
                    )
                  }
                  placeholder={text.options.recentActivityPathPlaceholder}
                />
              </label>
            </article>

            <article className="surface__panel">
              <h2>{text.options.aiBffConfiguration}</h2>
              <label className="surface__field">
                <span>{text.options.bffBaseUrl}</span>
                <input
                  value={optionsDraft.ai.bffBaseUrl ?? ''}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        ai: {
                          ...current.ai,
                          bffBaseUrl: event.target.value || undefined,
                        },
                      }),
                    )
                  }
                  placeholder="http://127.0.0.1:8787"
                />
              </label>
              <label className="surface__field">
                <span>{text.options.interfaceLanguage}</span>
                <select
                  value={optionsDraft.uiLanguage}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        uiLanguage: event.target.value as ExtensionConfig['uiLanguage'],
                      }),
                    )
                  }
                >
                  <option value="auto">{text.options.followBrowser}</option>
                  <option value="en">{text.options.english}</option>
                  <option value="zh-CN">{text.options.chinese}</option>
                </select>
              </label>
              <label className="surface__field">
                <span>{text.options.defaultProvider}</span>
                <select
                  value={optionsDraft.ai.defaultProvider}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        ai: {
                          ...current.ai,
                          defaultProvider: event.target.value as ProviderId,
                        },
                      }),
                    )
                  }
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="surface__stack">
                {PROVIDER_OPTIONS.map((option) => (
                  <p className="surface__meta" key={option.value}>
                    {option.label} · {providerStatus.providers[option.value]?.ready ? text.meta.ready : text.meta.notReady} · {formatProviderReason(providerStatus.providers[option.value]?.reason, uiLanguage)}
                  </p>
                ))}
                <p className="surface__meta">
                  {text.meta.lastChecked}: {formatRelativeTime(uiLanguage, providerStatus.checkedAt)}
                  {providerStatus.error ? ` · ${formatProviderStatusError(providerStatus.error, uiLanguage)}` : ''}
                </p>
              </div>
              <div className="surface__actions">
                <button className="surface__button surface__button--ghost" disabled={providerStatusPending} onClick={() => void refreshProviderStatus()}>
                  {providerStatusPending ? text.options.refreshingBffStatus : text.options.refreshBffStatus}
                </button>
              </div>
              <label className="surface__field">
                <span>{text.options.openAiModel}</span>
                <input
                  value={optionsDraft.ai.models.openai}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        ai: {
                          ...current.ai,
                          models: {
                            ...current.ai.models,
                            openai: event.target.value,
                          },
                        },
                      }),
                    )
                  }
                />
              </label>
              <label className="surface__field">
                <span>{text.options.geminiModel}</span>
                <input
                  value={optionsDraft.ai.models.gemini}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        ai: {
                          ...current.ai,
                          models: {
                            ...current.ai.models,
                            gemini: event.target.value,
                          },
                        },
                      }),
                    )
                  }
                />
              </label>
              <label className="surface__field">
                <span>{text.options.defaultExportFormat}</span>
                <select
                  value={optionsDraft.defaultExportFormat}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        defaultExportFormat: event.target.value as ExportFormat,
                      }),
                    )
                  }
                >
                  {EXPORT_FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="surface__actions surface__actions--wrap">
                <button className="surface__button" onClick={() => void handleSaveOptions()}>
                  {text.options.saveConfiguration}
                </button>
                <button className="surface__button surface__button--secondary" onClick={() => void handleExport('current_view')}>
                  {text.options.exportCurrentView}
                </button>
              </div>
              {optionsFeedback ? <p className="surface__feedback">{optionsFeedback}</p> : null}
            </article>

            <article className="surface__panel">
              <h2>{text.boundaryDisclosure.title}</h2>
              <ul className="surface__list">
                {text.boundaryDisclosure.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          </div>
        ) : null}
      </section>
    </main>
  );
}
