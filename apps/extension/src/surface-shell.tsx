import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  resolveAiAnswer,
  type AiStructuredAnswer,
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
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
} from './config';
import './styles.css';
import { buildAiProxyRequest } from './ai-request';
import { buildWorkbenchExportInput } from './export-input';
import { getUiText, readBrowserLanguage, resolveUiLanguage } from './i18n';
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
  type SurfaceKind,
  SITE_LABELS,
} from './surface-shell-model';
import {
  AskAiPanel,
  OptionsPanels,
  PopupQuickExportPanel,
  WorkbenchPanels,
} from './surface-shell-panels';

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
  const [switchyardProvider, setSwitchyardProvider] = useState<SwitchyardRuntimeProvider>('chatgpt');
  const [switchyardLane, setSwitchyardLane] = useState<SwitchyardLane>('web');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string>();
  const [aiStructuredAnswer, setAiStructuredAnswer] = useState<AiStructuredAnswer>();
  const [aiNotice, setAiNotice] = useState<string>();
  const [aiError, setAiError] = useState<string>();
  const [aiPending, setAiPending] = useState(false);
  const [providerStatusPending, setProviderStatusPending] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusState>(buildEmptyProviderStatus());

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

  const currentResources = workbenchView?.resources ?? [];
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
      setProviderStatus(buildEmptyProviderStatus('missing_bff_base_url'));
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
      setProviderStatus(buildEmptyProviderStatus('provider_status_fetch_failed'));
    } finally {
      setProviderStatusPending(false);
    }
  }

  useEffect(() => {
    void refreshProviderStatus();
  }, [config.ai.bffBaseUrl]);

  async function refreshStatus() {
    await Promise.all(
      Object.keys(SITE_LABELS).map(async (site) => {
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
    const artifact = buildSurfaceExportArtifact({
      preset,
      format: selectedFormat,
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
        weeklyLoad,
        latestSyncRuns,
        recentChangeEvents,
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
      const providerLabel = PROVIDER_OPTIONS.find((option) => option.value === aiProvider)?.label ?? aiProvider;
      setAiError(text.feedback.providerNotReadyInBff(providerLabel));
      await refreshProviderStatus();
      return;
    }

    if (!aiQuestion.trim()) {
      setAiError(text.feedback.questionRequired);
      return;
    }

    setAiPending(true);
    setAiError(undefined);
    setAiNotice(undefined);
    setAiStructuredAnswer(undefined);

    try {
      const { currentViewExport: exportArtifact, proxyRequest } = buildSurfaceAiRequest({
        provider: aiProvider,
        model: aiModel,
        switchyardProvider,
        switchyardLane,
        question: aiQuestion,
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
          weeklyLoad,
          latestSyncRuns,
          recentChangeEvents,
        },
      });

      const response = await fetch(`${config.ai.bffBaseUrl}${proxyRequest.route}`, {
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
        resolvedAnswer.citationCoverage === 'uncited_fallback'
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
      bffBaseUrl: config.ai.bffBaseUrl,
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

  const selectedFormatLabel =
    EXPORT_FORMAT_OPTIONS.find((option) => option.value === selectedFormat)?.label ?? selectedFormat;

  const surfaceView = buildSurfaceViewModel({
    alerts: priorityAlerts,
    filters,
    config,
    siteCounts,
    siteSyncStates,
    latestSyncRuns,
    providerStatus,
    uiLanguage,
  });

  return (
    <main className={`surface surface--${surface}`}>
      <section className="surface__card">
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
          onOpenConfiguration={() => {
            void browser.runtime.openOptionsPage();
          }}
          onMarkVisibleUpdatesSeen={handleMarkVisibleUpdatesSeen}
          onExportDiagnostics={handleExportDiagnostics}
          diagnostics={surfaceView.diagnostics}
          focusQueue={focusQueue}
          weeklyLoad={weeklyLoad}
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

        {surface === 'sidepanel' ? (
          <AskAiPanel
            text={text}
            uiLanguage={uiLanguage}
            config={config}
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
            structuredInputSummary={{
              totalAssignments: todaySnapshot?.totalAssignments ?? 0,
              dueSoonAssignments: todaySnapshot?.dueSoonAssignments ?? 0,
              newGrades: todaySnapshot?.newGrades ?? 0,
              recentUpdatesCount: currentRecentUpdates?.items.length ?? 0,
              priorityAlertsCount: currentAlerts.length,
              focusQueueCount: focusQueue.length,
              weeklyLoadCount: weeklyLoad.length,
              changeJournalCount: recentChangeEvents.length,
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
            onAskAi={handleAskAi}
            onRefreshProviderStatus={refreshProviderStatus}
            onOpenConfiguration={() => {
              void browser.runtime.openOptionsPage();
            }}
          />
        ) : null}

        {surface === 'popup' ? (
          <PopupQuickExportPanel text={text} onExport={handleExport} />
        ) : null}

        {surface === 'options' ? (
          <OptionsPanels
            text={text}
            uiLanguage={uiLanguage}
            optionsDraft={optionsDraft}
            setOptionsDraft={setOptionsDraft}
            providerStatus={providerStatus}
            providerStatusPending={providerStatusPending}
            optionsFeedback={optionsFeedback}
            onRefreshProviderStatus={refreshProviderStatus}
            onSaveOptions={handleSaveOptions}
            onExport={handleExport}
          />
        ) : null}
      </section>
    </main>
  );
}
