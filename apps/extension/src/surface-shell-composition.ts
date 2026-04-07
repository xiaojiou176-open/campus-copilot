import { createExportArtifact, type ExportArtifact, type ExportFormat, type ExportPreset } from '@campus-copilot/exporter';
import type { Alert, Announcement, Assignment, Event, Grade, Message, Resource, TimelineEntry } from '@campus-copilot/schema';
import type {
  ChangeEvent,
  FocusQueueItem,
  RecentUpdatesFeed,
  SyncRun,
  TodaySnapshot,
  WeeklyLoadEntry,
  WorkbenchFilter,
} from '@campus-copilot/storage';
import type { ProviderId, SwitchyardLane, SwitchyardRuntimeProvider } from '@campus-copilot/ai';
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
  weeklyLoad: WeeklyLoadEntry[];
  latestSyncRuns: SyncRun[];
  recentChangeEvents: ChangeEvent[];
}

function selectPresetRecords<T>(preset: ExportPreset, current: T[], workbench: T[]) {
  return preset === 'current_view' ? current : workbench;
}

export function buildSurfaceExportArtifact(input: {
  preset: ExportPreset;
  format: ExportFormat;
  state: SurfaceCompositionState;
}): ExportArtifact {
  const { preset, format, state } = input;

  return createExportArtifact({
    preset,
    format,
    input: buildWorkbenchExportInput({
      preset,
      generatedAt: state.now,
      uiLanguage: state.uiLanguage,
      filters: state.filters,
      resources: selectPresetRecords(preset, state.currentResources, state.workbenchResources),
      assignments: selectPresetRecords(preset, state.currentAssignments, state.workbenchAssignments),
      announcements: selectPresetRecords(preset, state.currentAnnouncements, state.workbenchAnnouncements),
      messages: selectPresetRecords(preset, state.currentMessages, state.workbenchMessages),
      grades: selectPresetRecords(preset, state.currentGrades, state.workbenchGrades),
      events: selectPresetRecords(preset, state.currentEvents, state.workbenchEvents),
      alerts: preset === 'current_view' ? state.currentAlerts : state.priorityAlerts,
      recentUpdates: state.currentRecentUpdates,
      focusQueue: state.focusQueue,
      weeklyLoad: state.weeklyLoad,
      syncRuns: state.latestSyncRuns,
      changeEvents: state.recentChangeEvents,
    }),
  });
}

export function buildSurfaceAiRequest(input: {
  provider: ProviderId;
  model: string;
  switchyardProvider?: SwitchyardRuntimeProvider;
  switchyardLane?: SwitchyardLane;
  question: string;
  todaySnapshot: TodaySnapshot;
  state: SurfaceCompositionState;
}): {
  currentViewExport: ExportArtifact;
  proxyRequest: ReturnType<typeof buildAiProxyRequest>;
} {
  const currentViewExport = buildSurfaceExportArtifact({
    preset: 'current_view',
    format: 'markdown',
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
      todaySnapshot: input.todaySnapshot,
      recentUpdates: input.state.currentRecentUpdates?.items ?? [],
      alerts: input.state.currentAlerts,
      focusQueue: input.state.focusQueue,
      weeklyLoad: input.state.weeklyLoad,
      syncRuns: input.state.latestSyncRuns,
      recentChanges: input.state.recentChangeEvents,
      currentViewExport,
    }),
  };
}
