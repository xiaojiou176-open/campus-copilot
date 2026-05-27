import {
  type AdvancedMaterialAnalysisRequest,
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
import { buildWorkbenchAiProxyRequest as buildSharedWorkbenchAiProxyRequest } from '@campus-copilot/core';
import type { ExportArtifact } from '@campus-copilot/exporter';
import type { Alert, TimelineEntry } from '@campus-copilot/schema';
import type {
  AdministrativeSummary,
  ChangeEvent,
  CourseCluster,
  FocusQueueItem,
  MergeHealthSummary,
  PlanningSubstrateOwner,
  SyncRun,
  TodaySnapshot,
  WeeklyLoadEntry,
  WorkItemCluster,
} from '@campus-copilot/storage';
import { getUiText, type ResolvedUiLanguage } from './i18n';
import {
  buildLocalizedAlertPresentation,
  buildLocalizedChangeEventPresentation,
  buildLocalizedFocusQueuePresentation,
  buildLocalizedRecentUpdatesPresentation,
  buildLocalizedWeeklyLoadPresentation,
} from './workbench-presentation';

export function buildAiProxyRequest(input: {
  provider: ProviderId;
  model: string;
  switchyardProvider?: SwitchyardRuntimeProvider;
  switchyardLane?: SwitchyardLane;
  uiLanguage: ResolvedUiLanguage;
  question: string;
  advancedMaterialAnalysis?: AdvancedMaterialAnalysisRequest;
  todaySnapshot: TodaySnapshot;
  recentUpdates: TimelineEntry[];
  alerts: Alert[];
  focusQueue: FocusQueueItem[];
  weeklyLoad: WeeklyLoadEntry[];
  syncRuns: SyncRun[];
  recentChanges: ChangeEvent[];
  planningSubstrates?: PlanningSubstrateOwner[];
  workbenchView?: {
    planningSubstrates?: PlanningSubstrateOwner[];
    courseClusters?: CourseCluster[];
    workItemClusters?: WorkItemCluster[];
    administrativeSummaries?: AdministrativeSummary[];
    mergeHealth?: MergeHealthSummary;
  };
  currentViewExport: ExportArtifact;
}) {
  getUiText(input.uiLanguage);
  return buildSharedWorkbenchAiProxyRequest({
    provider: input.provider,
    model: input.model,
    switchyardProvider: input.switchyardProvider,
    switchyardLane: input.switchyardLane,
    question: input.question,
    advancedMaterialAnalysis: input.advancedMaterialAnalysis,
    todaySnapshot: input.todaySnapshot,
    recentUpdates: input.recentUpdates,
    alerts: input.alerts,
    focusQueue: input.focusQueue,
    weeklyLoad: input.weeklyLoad,
    syncRuns: input.syncRuns,
    recentChanges: input.recentChanges,
    planningSubstrates: input.planningSubstrates,
    workbenchView: input.workbenchView,
    currentViewExport: input.currentViewExport,
    presentation: {
      recentUpdates: buildLocalizedRecentUpdatesPresentation(input.recentUpdates, input.uiLanguage),
      alerts: buildLocalizedAlertPresentation(input.alerts, input.uiLanguage),
      focusQueue: buildLocalizedFocusQueuePresentation(input.focusQueue, input.uiLanguage),
      weeklyLoad: buildLocalizedWeeklyLoadPresentation(input.weeklyLoad, input.uiLanguage),
      changeEvents: buildLocalizedChangeEventPresentation(input.recentChanges, input.uiLanguage),
    },
  });
}
