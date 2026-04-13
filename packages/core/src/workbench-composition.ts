import {
  type AiRuntimeRequest,
  type AiSitePolicyOverlay,
  type AdvancedMaterialAnalysisRequest,
  buildAiRuntimeMessages,
  createProviderProxyRequest,
  getAiSitePolicyOverlay,
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
import type {
  AuthorizationState,
  ExportArtifact,
  ExportInput,
  ExportPackagingMetadata,
  ExportPreset,
  ExportScopeMetadata,
} from '@campus-copilot/exporter';
import type { Alert, Announcement, Assignment, Event, Grade, Message, Resource, TimelineEntry } from '@campus-copilot/schema';
import type {
  AdministrativeSummary,
  ChangeEvent,
  CourseCluster,
  FocusQueueItem,
  MergeHealthSummary,
  RecentUpdatesFeed,
  SyncRun,
  TodaySnapshot,
  WeeklyLoadEntry,
  WorkItemCluster,
  WorkbenchFilter,
  WorkbenchView,
} from '@campus-copilot/storage';

export interface WorkbenchPresentationOverrides {
  viewTitle?: string;
  alerts?: Alert[];
  recentUpdates?: TimelineEntry[];
  focusQueue?: FocusQueueItem[];
  weeklyLoad?: WeeklyLoadEntry[];
  changeEvents?: ChangeEvent[];
  courseClusters?: CourseCluster[];
  workItemClusters?: WorkItemCluster[];
  administrativeSummaries?: AdministrativeSummary[];
  mergeHealth?: MergeHealthSummary;
}

export interface BuildWorkbenchExportInputArgs {
  preset: ExportPreset;
  generatedAt: string;
  filters: WorkbenchFilter;
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
  focusQueue: FocusQueueItem[];
  weeklyLoad: WeeklyLoadEntry[];
  syncRuns: SyncRun[];
  changeEvents: ChangeEvent[];
  courseClusters?: CourseCluster[];
  workItemClusters?: WorkItemCluster[];
  administrativeSummaries?: AdministrativeSummary[];
  mergeHealth?: MergeHealthSummary;
  presentation?: WorkbenchPresentationOverrides;
}

export interface BuildWorkbenchAiProxyRequestArgs {
  provider: ProviderId;
  model: string;
  switchyardProvider?: SwitchyardRuntimeProvider;
  switchyardLane?: SwitchyardLane;
  question: string;
  advancedMaterialAnalysis?: AdvancedMaterialAnalysisRequest;
  todaySnapshot: TodaySnapshot;
  recentUpdates: TimelineEntry[];
  alerts: Alert[];
  focusQueue: FocusQueueItem[];
  weeklyLoad: WeeklyLoadEntry[];
  syncRuns: SyncRun[];
  recentChanges: ChangeEvent[];
  currentViewExport: ExportArtifact;
  sitePolicyOverlay?: AiSitePolicyOverlay;
  planningSubstrates?: WorkbenchView['planningSubstrates'];
  workbenchView?: Partial<
    Pick<
    WorkbenchView,
    'planningSubstrates' | 'courseClusters' | 'workItemClusters' | 'administrativeSummaries' | 'mergeHealth'
    >
  >;
  presentation?: Omit<WorkbenchPresentationOverrides, 'viewTitle'>;
}

function buildDefaultViewTitle(preset: ExportPreset, filters: WorkbenchFilter) {
  const siteLabel = filters.site === 'all' ? 'All sites' : filters.site;

  switch (preset) {
    case 'current_view':
      return `Current view (${siteLabel})`;
    case 'change_journal':
      return `Change journal (${siteLabel})`;
    case 'course_panorama':
      return `Course panorama (${siteLabel})`;
    case 'administrative_snapshot':
      return `Administrative snapshot (${siteLabel})`;
    case 'cluster_merge_review':
      return `Cluster merge review (${siteLabel})`;
    case 'focus_queue':
      return `Focus queue (${siteLabel})`;
    case 'weekly_load':
      return `Weekly load (${siteLabel})`;
    case 'weekly_assignments':
      return 'Weekly assignments';
    case 'recent_updates':
      return 'Recent updates';
    case 'all_deadlines':
      return 'All deadlines';
    default:
      return 'Campus Copilot workbench';
  }
}

export function buildWorkbenchExportInput(args: BuildWorkbenchExportInputArgs): ExportInput {
  const presentation = args.presentation;

  return {
    generatedAt: args.generatedAt,
    viewTitle: presentation?.viewTitle ?? buildDefaultViewTitle(args.preset, args.filters),
    scope: {
      site: args.filters.site === 'all' ? undefined : args.filters.site,
      ...args.exportScope,
    },
    packaging: args.packaging,
    authorization: args.authorization,
    resources: args.resources,
    assignments: args.assignments,
    announcements: args.announcements,
    messages: args.messages,
    grades: args.grades,
    events: args.events,
    alerts: presentation?.alerts ?? args.alerts,
    timelineEntries: presentation?.recentUpdates ?? args.recentUpdates?.items ?? [],
    focusQueue: presentation?.focusQueue ?? args.focusQueue,
    weeklyLoad: presentation?.weeklyLoad ?? args.weeklyLoad,
    syncRuns: args.syncRuns,
    changeEvents: presentation?.changeEvents ?? args.changeEvents,
    courseClusters: (presentation?.courseClusters ?? args.courseClusters ?? []).map((cluster) => ({
      id: cluster.id,
      title: cluster.displayTitle,
      summary: cluster.summary,
      authoritySource: `${cluster.authoritySurface}:${cluster.authorityResourceType}`,
      matchConfidence: cluster.confidenceBand,
      relatedSites: cluster.relatedSites,
      needsReview: cluster.needsReview,
    })),
    workItemClusters: (presentation?.workItemClusters ?? args.workItemClusters ?? []).map((cluster) => ({
      id: cluster.id,
      title: cluster.title,
      summary: cluster.summary,
      authoritySource: `${cluster.authoritySurface}:${cluster.authorityResourceType}`,
      matchConfidence: cluster.confidenceBand,
      relatedSites: cluster.relatedSites,
      workType: cluster.workType,
      courseClusterId: cluster.courseClusterId,
      dueAt: cluster.dueAt,
      status: cluster.status,
      needsReview: cluster.needsReview,
    })),
    administrativeSummaries: (presentation?.administrativeSummaries ?? args.administrativeSummaries ?? []).map((summary) => ({
      id: summary.id,
      family: summary.family,
      title: summary.title,
      summary: summary.summary,
      importance: summary.importance,
      aiDefault: summary.aiDefault,
      authoritySource: summary.authoritySource,
      nextAction: summary.nextAction,
    })),
    mergeHealth: presentation?.mergeHealth ?? args.mergeHealth,
  };
}

function buildAiDecisionContext(args: BuildWorkbenchAiProxyRequestArgs, presentation: BuildWorkbenchAiProxyRequestArgs['presentation']) {
  return {
    focusQueue: presentation?.focusQueue ?? args.focusQueue,
    weeklyLoad: presentation?.weeklyLoad ?? args.weeklyLoad,
    syncRuns: args.syncRuns,
    recentChanges: presentation?.changeEvents ?? args.recentChanges,
    courseClusters:
      presentation?.courseClusters ?? args.workbenchView?.courseClusters ?? [],
    workItemClusters:
      presentation?.workItemClusters ?? args.workbenchView?.workItemClusters ?? [],
    administrativeSummaries:
      presentation?.administrativeSummaries ?? args.workbenchView?.administrativeSummaries ?? [],
    mergeHealth: presentation?.mergeHealth ?? args.workbenchView?.mergeHealth,
  };
}

function buildAiExportToolPayload(args: BuildWorkbenchAiProxyRequestArgs, presentation: BuildWorkbenchAiProxyRequestArgs['presentation']) {
  const decisionContext = buildAiDecisionContext(args, presentation);

  if (args.currentViewExport.packaging.aiAllowed) {
    return {
      filename: args.currentViewExport.filename,
      format: args.currentViewExport.format,
      scope: args.currentViewExport.scope,
      packaging: args.currentViewExport.packaging,
      content: args.currentViewExport.content,
      decisionContext,
    };
  }

  return {
    filename: args.currentViewExport.filename,
    format: args.currentViewExport.format,
    scope: args.currentViewExport.scope,
    packaging: args.currentViewExport.packaging,
    contentRedacted: true,
    redactionReason: 'ai_not_allowed_for_current_view_export' as const,
    reviewRequiredAdministrativeFamilies: Array.from(
      new Set(
        decisionContext.administrativeSummaries
          .filter((summary) => summary.aiDefault !== 'allowed')
          .map((summary) => summary.family),
      ),
    ),
    decisionContext: {
      focusQueueCount: decisionContext.focusQueue.length,
      weeklyLoadCount: decisionContext.weeklyLoad.length,
      syncRunsCount: decisionContext.syncRuns.length,
      recentChangesCount: decisionContext.recentChanges.length,
      courseClustersCount: decisionContext.courseClusters.length,
      workItemClustersCount: decisionContext.workItemClusters.length,
      administrativeSummariesCount: decisionContext.administrativeSummaries.length,
      mergeHealth: decisionContext.mergeHealth,
    },
  };
}

export function buildWorkbenchAiProxyRequest(args: BuildWorkbenchAiProxyRequestArgs) {
  const presentation = args.presentation;
  const sitePolicyOverlay = args.sitePolicyOverlay ?? getAiSitePolicyOverlay(args.currentViewExport.scope.site);
  const advancedMaterialAnalysis = args.advancedMaterialAnalysis ?? {
    enabled: false,
    policy: 'default_disabled',
  };
  const toolResults: AiRuntimeRequest['toolResults'] = [
    {
      name: 'get_today_snapshot' as const,
      payload: args.todaySnapshot,
    },
    {
      name: 'get_recent_updates' as const,
      payload: presentation?.recentUpdates ?? args.recentUpdates,
    },
    {
      name: 'get_priority_alerts' as const,
      payload: presentation?.alerts ?? args.alerts,
    },
    {
      name: 'export_current_view' as const,
      payload: buildAiExportToolPayload(args, presentation),
    },
    {
      name: 'get_planning_substrates' as const,
      payload: args.planningSubstrates ?? args.workbenchView?.planningSubstrates ?? [],
    },
  ];

  if (advancedMaterialAnalysis.enabled) {
    toolResults.push({
      name: 'get_opted_in_course_material_excerpt' as const,
      payload: {
        courseId: advancedMaterialAnalysis.courseId,
        courseLabel: advancedMaterialAnalysis.courseLabel,
        excerpt: advancedMaterialAnalysis.excerpt,
        policy: advancedMaterialAnalysis.policy,
        userAcknowledgedResponsibility: advancedMaterialAnalysis.userAcknowledgedResponsibility,
      },
    });
  }

  const runtimeMessages = buildAiRuntimeMessages({
    provider: args.provider,
    model: args.model,
    switchyardProvider: args.switchyardProvider,
    switchyardLane: args.switchyardLane,
    question: args.question,
    advancedMaterialAnalysis,
    sitePolicyOverlay,
    toolResults,
  });

  return createProviderProxyRequest({
    provider: args.provider,
    model: args.model,
    switchyardProvider: args.switchyardProvider,
    switchyardLane: args.switchyardLane,
    messages: [
      {
        role: 'system',
        content: runtimeMessages.systemPrompt,
      },
      {
        role: 'user',
        content: runtimeMessages.userPrompt,
      },
    ],
  });
}
