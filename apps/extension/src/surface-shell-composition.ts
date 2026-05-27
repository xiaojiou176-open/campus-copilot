import {
  createExportArtifact,
  type AuthorizationState,
  type ExportArtifact,
  type ExportFormat,
  type ExportPackagingMetadata,
  type ExportPreset,
  type ExportScopeMetadata,
} from '@campus-copilot/exporter';
import type { Alert, Announcement, Assignment, Event, Grade, Message, Resource, TimelineEntry } from '@campus-copilot/schema';
import type {
  AdministrativeSummary,
  ChangeEvent,
  CourseCluster,
  FocusQueueItem,
  MergeHealthSummary,
  PlanningSubstrateOwner,
  RecentUpdatesFeed,
  SyncRun,
  TodaySnapshot,
  WeeklyLoadEntry,
  WorkItemCluster,
  WorkbenchFilter,
} from '@campus-copilot/storage';
import type {
  AdvancedMaterialAnalysisRequest,
  ProviderId,
  SwitchyardLane,
  SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
import { buildAiProxyRequest } from './ai-request';
import { buildWorkbenchExportInput } from './export-input';
import type { ResolvedUiLanguage } from './i18n';

export interface SurfaceCompositionState {
  now: string;
  uiLanguage: ResolvedUiLanguage;
  filters: WorkbenchFilter;
  currentResources: Resource[];
  currentAssignments: Assignment[];
  currentAnnouncements: Announcement[];
  currentMessages: Message[];
  currentGrades: Grade[];
  currentEvents: Event[];
  currentAlerts: Alert[];
  currentRecentUpdates?: RecentUpdatesFeed;
  workbenchResources: Resource[];
  workbenchAssignments: Assignment[];
  workbenchAnnouncements: Announcement[];
  workbenchMessages: Message[];
  workbenchGrades: Grade[];
  workbenchEvents: Event[];
  priorityAlerts: Alert[];
  focusQueue: FocusQueueItem[];
  planningSubstrates: PlanningSubstrateOwner[];
  weeklyLoad: WeeklyLoadEntry[];
  latestSyncRuns: SyncRun[];
  recentChangeEvents: ChangeEvent[];
  courseClusters?: CourseCluster[];
  workItemClusters?: WorkItemCluster[];
  administrativeSummaries?: AdministrativeSummary[];
  mergeHealth?: MergeHealthSummary;
}

function selectPresetRecords<T>(preset: ExportPreset, current: T[], workbench: T[]) {
  return preset === 'current_view' ? current : workbench;
}

export function buildSurfaceExportArtifact(input: {
  preset: ExportPreset;
  format: ExportFormat;
  viewTitleOverride?: string;
  exportScope?: Partial<ExportScopeMetadata>;
  packaging?: Partial<ExportPackagingMetadata>;
  authorization?: AuthorizationState;
  state: SurfaceCompositionState;
}): ExportArtifact {
  const { preset, format, state, viewTitleOverride, exportScope, packaging, authorization } = input;

  return createExportArtifact({
    preset,
    format,
    input: buildWorkbenchExportInput({
      preset,
      generatedAt: state.now,
      uiLanguage: state.uiLanguage,
      filters: state.filters,
      viewTitleOverride,
      exportScope,
      packaging,
      authorization,
      resources: selectPresetRecords(preset, state.currentResources, state.workbenchResources),
      assignments: selectPresetRecords(preset, state.currentAssignments, state.workbenchAssignments),
      announcements: selectPresetRecords(preset, state.currentAnnouncements, state.workbenchAnnouncements),
      messages: selectPresetRecords(preset, state.currentMessages, state.workbenchMessages),
      grades: selectPresetRecords(preset, state.currentGrades, state.workbenchGrades),
      events: selectPresetRecords(preset, state.currentEvents, state.workbenchEvents),
      alerts: preset === 'current_view' ? state.currentAlerts : state.priorityAlerts,
      recentUpdates: state.currentRecentUpdates,
      planningSubstrates: state.planningSubstrates,
      focusQueue: state.focusQueue,
      weeklyLoad: state.weeklyLoad,
      syncRuns: state.latestSyncRuns,
      changeEvents: state.recentChangeEvents,
      courseClusters: state.courseClusters,
      workItemClusters: state.workItemClusters,
      administrativeSummaries: state.administrativeSummaries,
      mergeHealth: state.mergeHealth,
    }),
  });
}

export function buildSurfaceAiRequest(input: {
  provider: ProviderId;
  model: string;
  switchyardProvider?: SwitchyardRuntimeProvider;
  switchyardLane?: SwitchyardLane;
  question: string;
  advancedMaterialAnalysis?: AdvancedMaterialAnalysisRequest;
  authorization?: AuthorizationState;
  todaySnapshot: TodaySnapshot;
  state: SurfaceCompositionState;
}) {
  const currentViewExport = buildSurfaceExportArtifact({
    preset: 'current_view',
    format: 'markdown',
    authorization: input.authorization,
    state: input.state,
  });

  return {
    currentViewExport,
    proxyRequest: buildAiProxyRequest({
      provider: input.provider,
      model: input.model,
      switchyardProvider: input.switchyardProvider,
      switchyardLane: input.switchyardLane,
      uiLanguage: input.state.uiLanguage,
      question: input.question,
      advancedMaterialAnalysis: input.advancedMaterialAnalysis,
      todaySnapshot: input.todaySnapshot,
      recentUpdates: input.state.currentRecentUpdates?.items ?? [],
      alerts: input.state.currentAlerts,
      focusQueue: input.state.focusQueue,
      weeklyLoad: input.state.weeklyLoad,
      syncRuns: input.state.latestSyncRuns,
      recentChanges: input.state.recentChangeEvents,
      planningSubstrates: input.state.planningSubstrates,
      workbenchView: {
        planningSubstrates: input.state.planningSubstrates,
        courseClusters: input.state.courseClusters,
        workItemClusters: input.state.workItemClusters,
        administrativeSummaries: input.state.administrativeSummaries,
        mergeHealth: input.state.mergeHealth,
      },
      currentViewExport,
    }),
  };
}
