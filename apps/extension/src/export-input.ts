import { buildWorkbenchExportInput as buildSharedWorkbenchExportInput } from '@campus-copilot/core';
import type {
  AuthorizationState,
  ExportInput,
  ExportPackagingMetadata,
  ExportPreset,
  ExportScopeMetadata,
} from '@campus-copilot/exporter';
import type { Alert, Announcement, Assignment, Event, Grade, Message, Resource } from '@campus-copilot/schema';
import type {
  AdministrativeSummary,
  ChangeEvent,
  CourseCluster,
  FocusQueueItem,
  MergeHealthSummary,
  PlanningSubstrateOwner,
  RecentUpdatesFeed,
  SyncRun,
  WeeklyLoadEntry,
  WorkItemCluster,
  WorkbenchFilter,
} from '@campus-copilot/storage';
import { getUiText, type ResolvedUiLanguage } from './i18n';
import { SITE_LABELS } from './surface-shell-model';
import {
  buildLocalizedAlertPresentation,
  buildLocalizedChangeEventPresentation,
  buildLocalizedFocusQueuePresentation,
  buildLocalizedRecentUpdatesPresentation,
  buildLocalizedWeeklyLoadPresentation,
} from './workbench-presentation';

export type AuthorizationLayerSummary = {
  layer: 'layer1_read_export' | 'layer2_ai_read_analysis';
  allowed: number;
  blocked: number;
  partial: number;
  confirmRequired: number;
  total: number;
};

type BuildWorkbenchExportInputArgs = {
  preset: ExportPreset;
  generatedAt: string;
  uiLanguage: ResolvedUiLanguage;
  filters: WorkbenchFilter;
  viewTitleOverride?: string;
  exportScope?: Partial<ExportScopeMetadata>;
  packaging?: Partial<ExportPackagingMetadata>;
  authorization?: AuthorizationState;
  resources: Resource[];
  assignments: Assignment[];
  announcements: Announcement[];
  messages: Message[];
  grades: Grade[];
  events: Event[];
  alerts: Alert[];
  recentUpdates?: RecentUpdatesFeed;
  planningSubstrates?: PlanningSubstrateOwner[];
  focusQueue: FocusQueueItem[];
  weeklyLoad: WeeklyLoadEntry[];
  syncRuns: SyncRun[];
  changeEvents: ChangeEvent[];
  courseClusters?: CourseCluster[];
  workItemClusters?: WorkItemCluster[];
  administrativeSummaries?: AdministrativeSummary[];
  mergeHealth?: MergeHealthSummary;
};

function buildViewTitle(
  preset: ExportPreset,
  filters: WorkbenchFilter,
  text: ReturnType<typeof getUiText>,
) {
  const siteLabel = filters.site === 'all' ? text.toolbar.allSites : SITE_LABELS[filters.site];

  switch (preset) {
    case 'current_view':
      return text.exportTitles.currentView(siteLabel);
    case 'change_journal':
      return text.exportTitles.changeJournal(siteLabel);
    case 'focus_queue':
      return text.exportTitles.focusQueue(siteLabel);
    case 'weekly_load':
      return text.exportTitles.weeklyLoad(siteLabel);
    default:
      return text.exportTitles.home;
  }
}

export function buildWorkbenchExportInput(args: BuildWorkbenchExportInputArgs): ExportInput {
  const text = getUiText(args.uiLanguage);

  return buildSharedWorkbenchExportInput({
    preset: args.preset,
    generatedAt: args.generatedAt,
    filters: args.filters,
    exportScope: args.exportScope,
    packaging: args.packaging,
    authorization: args.authorization,
    resources: args.resources,
    assignments: args.assignments,
    announcements: args.announcements,
    messages: args.messages,
    grades: args.grades,
    events: args.events,
    alerts: args.alerts,
    recentUpdates: args.recentUpdates,
    planningSubstrates: args.planningSubstrates ?? [],
    focusQueue: args.focusQueue,
    weeklyLoad: args.weeklyLoad,
    syncRuns: args.syncRuns,
    changeEvents: args.changeEvents,
    courseClusters: args.courseClusters,
    workItemClusters: args.workItemClusters,
    administrativeSummaries: args.administrativeSummaries,
    mergeHealth: args.mergeHealth,
    presentation: {
      viewTitle: args.viewTitleOverride ?? buildViewTitle(args.preset, args.filters, text),
      alerts: buildLocalizedAlertPresentation(args.alerts, args.uiLanguage),
      recentUpdates: buildLocalizedRecentUpdatesPresentation(args.recentUpdates?.items ?? [], args.uiLanguage),
      focusQueue: buildLocalizedFocusQueuePresentation(args.focusQueue, args.uiLanguage),
      weeklyLoad: buildLocalizedWeeklyLoadPresentation(args.weeklyLoad, args.uiLanguage),
      changeEvents: buildLocalizedChangeEventPresentation(args.changeEvents, args.uiLanguage),
    },
  });
}

export function summarizeAuthorizationState(authorization?: AuthorizationState): AuthorizationLayerSummary[] {
  const layers: AuthorizationLayerSummary[] = [
    {
      layer: 'layer1_read_export',
      allowed: 0,
      blocked: 0,
      partial: 0,
      confirmRequired: 0,
      total: 0,
    },
    {
      layer: 'layer2_ai_read_analysis',
      allowed: 0,
      blocked: 0,
      partial: 0,
      confirmRequired: 0,
      total: 0,
    },
  ];

  for (const rule of authorization?.rules ?? []) {
    const summary = layers.find((entry) => entry.layer === rule.layer);
    if (!summary) {
      continue;
    }
    summary.total += 1;
    if (rule.status === 'allowed') {
      summary.allowed += 1;
    } else if (rule.status === 'blocked') {
      summary.blocked += 1;
    } else if (rule.status === 'partial') {
      summary.partial += 1;
    } else if (rule.status === 'confirm_required') {
      summary.confirmRequired += 1;
    }
  }

  return layers;
}
