import { useEffect, useMemo, useState } from 'react';
import type {
  AdvancedMaterialAnalysisRequest,
  ProviderId,
  SwitchyardLane,
  SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
import type { TodaySnapshot, FocusQueueItem, PlanningSubstrateOwner, WeeklyLoadEntry, ChangeEvent, WorkbenchFilter } from '@campus-copilot/storage';
import { useWorkbenchView } from '@campus-copilot/storage';
import { resolveAiAnswer, type AiStructuredAnswer } from './ai-answer-resolution';
import { AskAiPanel } from './ask-ai-panel';
import {
  getProviderModel,
  getSwitchyardLane,
  getSwitchyardRuntimeProvider,
  saveExtensionConfig,
  upsertAuthorizationRule,
  type ExtensionConfig,
} from './config';
import { buildSurfaceAiRequest, type SurfaceCompositionState } from './surface-shell-composition';
import {
  PROVIDER_OPTIONS,
  SITE_LABELS,
  type AiResponsePayload,
  type ProviderStatusState,
} from './surface-shell-model';
import type { ResolvedUiLanguage } from './i18n';
import type { UiText } from './surface-shell-view-helpers';

export function SurfaceShellAskAiContainer(props: {
  text: UiText;
  uiLanguage: ResolvedUiLanguage;
  config: ExtensionConfig;
  onConfigSaved: (config: ExtensionConfig) => void;
  activeBffBaseUrl?: string;
  providerStatus: ProviderStatusState;
  providerStatusPending: boolean;
  allCourses: Array<{ id: string; site: keyof typeof SITE_LABELS; title: string; label: string }>;
  filters: WorkbenchFilter;
  now: string;
  refreshKey: number;
  todaySnapshot?: TodaySnapshot;
  focusQueue: FocusQueueItem[];
  planningSubstrates: PlanningSubstrateOwner[];
  weeklyLoad: WeeklyLoadEntry[];
  recentChangeEvents: ChangeEvent[];
  onRefreshProviderStatus: () => Promise<void>;
  onOpenConfiguration?: () => void;
}) {
  const {
    text,
    uiLanguage,
    config,
    onConfigSaved,
    activeBffBaseUrl,
    providerStatus,
    providerStatusPending,
    allCourses,
    filters,
    now,
    refreshKey,
    todaySnapshot,
    focusQueue,
    planningSubstrates,
    weeklyLoad,
    recentChangeEvents,
    onRefreshProviderStatus,
    onOpenConfiguration,
  } = props;

  const [aiProvider, setAiProvider] = useState<ProviderId>(config.ai.defaultProvider);
  const [aiModel, setAiModel] = useState(getProviderModel(config, config.ai.defaultProvider));
  const [switchyardProvider, setSwitchyardProvider] = useState<SwitchyardRuntimeProvider>(getSwitchyardRuntimeProvider(config));
  const [switchyardLane, setSwitchyardLane] = useState<SwitchyardLane>(getSwitchyardLane(config));
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

  useEffect(() => {
    setAiProvider(config.ai.defaultProvider);
    setAiModel(getProviderModel(config, config.ai.defaultProvider));
    setSwitchyardProvider(getSwitchyardRuntimeProvider(config));
    setSwitchyardLane(getSwitchyardLane(config));
  }, [config]);

  const workbenchView = useWorkbenchView(now, filters, undefined, refreshKey);
  const compositionState: SurfaceCompositionState = useMemo(
    () => ({
      now,
      uiLanguage,
      filters,
      currentResources: workbenchView?.resources ?? [],
      currentAssignments: workbenchView?.assignments ?? [],
      currentAnnouncements: workbenchView?.announcements ?? [],
      currentMessages: workbenchView?.messages ?? [],
      currentGrades: workbenchView?.grades ?? [],
      currentEvents: workbenchView?.events ?? [],
      currentAlerts: workbenchView?.alerts ?? [],
      currentRecentUpdates: workbenchView?.recentUpdates,
      workbenchResources: workbenchView?.resources ?? [],
      workbenchAssignments: workbenchView?.assignments ?? [],
      workbenchAnnouncements: workbenchView?.announcements ?? [],
      workbenchMessages: workbenchView?.messages ?? [],
      workbenchGrades: workbenchView?.grades ?? [],
      workbenchEvents: workbenchView?.events ?? [],
      priorityAlerts: workbenchView?.alerts ?? [],
      focusQueue,
      planningSubstrates,
      weeklyLoad,
      latestSyncRuns: [],
      recentChangeEvents,
      courseClusters: workbenchView?.courseClusters ?? [],
      workItemClusters: workbenchView?.workItemClusters ?? [],
      administrativeSummaries: workbenchView?.administrativeSummaries ?? [],
      mergeHealth: workbenchView?.mergeHealth,
    }),
    [filters, focusQueue, now, planningSubstrates, recentChangeEvents, uiLanguage, weeklyLoad, workbenchView],
  );

  const structuredInputSummary = useMemo(
    () => ({
      totalAssignments: todaySnapshot?.totalAssignments ?? 0,
      dueSoonAssignments: todaySnapshot?.dueSoonAssignments ?? 0,
      newGrades: todaySnapshot?.newGrades ?? 0,
      recentUpdatesCount: compositionState.currentRecentUpdates?.items.length ?? 0,
      priorityAlertsCount: compositionState.currentAlerts.length,
      focusQueueCount: compositionState.focusQueue.length,
      weeklyLoadCount: compositionState.weeklyLoad.length,
      changeJournalCount: compositionState.recentChangeEvents.length,
      courseClusterCount: compositionState.courseClusters?.length ?? 0,
      workItemClusterCount: compositionState.workItemClusters?.length ?? 0,
      administrativeSummaryCount: compositionState.administrativeSummaries?.length ?? 0,
      currentViewFormat: 'markdown',
    }),
    [compositionState, todaySnapshot],
  );

  async function handleAskAi() {
    if (!activeBffBaseUrl) {
      setAiError(text.feedback.bffMissingForAi);
      return;
    }

    if (!providerStatus.providers[aiProvider]?.ready) {
      const providerLabel = PROVIDER_OPTIONS.find((option) => option.value === aiProvider)?.label ?? aiProvider;
      setAiError(text.feedback.providerNotReadyInBff(providerLabel));
      await onRefreshProviderStatus();
      return;
    }

    if (!aiQuestion.trim()) {
      setAiError(text.feedback.questionRequired);
      return;
    }

    const selectedCourse = allCourses.find((course) => course.id === advancedMaterialCourseId);

    if (advancedMaterialEnabled) {
      if (!selectedCourse) {
        setAiError(text.feedback.advancedMaterialCourseRequired);
        return;
      }

      if (!advancedMaterialExcerpt.trim()) {
        setAiError(text.feedback.advancedMaterialExcerptRequired);
        return;
      }

      if (!advancedMaterialAcknowledged) {
        setAiError(text.feedback.advancedMaterialAcknowledgementRequired);
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
        onConfigSaved(saved);
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
        state: compositionState,
      });

      if (!exportArtifact.packaging.aiAllowed) {
        setAiError(text.feedback.aiScopeNeedsTrustCenter);
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
        advancedMaterialAnalysis.enabled && selectedCourse
          ? text.feedback.advancedMaterialNotice(advancedMaterialAnalysis.courseLabel)
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

  return (
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
      availableCourses={allCourses.map((course) => ({ id: course.id, label: course.label }))}
      advancedMaterialEnabled={advancedMaterialEnabled}
      advancedMaterialCourseId={advancedMaterialCourseId}
      advancedMaterialExcerpt={advancedMaterialExcerpt}
      advancedMaterialAcknowledged={advancedMaterialAcknowledged}
      structuredInputSummary={structuredInputSummary}
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
      onRefreshProviderStatus={onRefreshProviderStatus}
      onOpenConfiguration={onOpenConfiguration}
    />
  );
}
