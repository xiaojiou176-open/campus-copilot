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
  planningSubstrates?: WorkbenchView['planningSubstrates'];
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

type PlanningPulseCoverageStatus = 'missing' | 'metadata_only' | 'plan_only' | 'audit_only' | 'plan_and_audit';

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
    planningSubstrates: args.planningSubstrates ?? [],
    focusQueue: presentation?.focusQueue ?? args.focusQueue,
    weeklyLoad: presentation?.weeklyLoad ?? args.weeklyLoad,
    syncRuns: args.syncRuns,
    changeEvents: presentation?.changeEvents ?? args.changeEvents,
    courseClusters: (presentation?.courseClusters ?? args.courseClusters ?? []).map((cluster) => ({
      id: cluster.id,
      title: cluster.displayTitle,
      summary: cluster.summary,
      authoritySource: `${cluster.authoritySurface}:${cluster.authorityResourceType}`,
      authorityNarrative: cluster.authorityNarrative,
      authorityBreakdown: cluster.authorityBreakdown?.map((entry) => ({
        role: entry.role,
        surface: entry.surface,
        entityKey: entry.entityKey,
        resourceType: entry.resourceType,
        label: entry.label,
        reason: entry.reason,
      })),
      matchConfidence: cluster.confidenceBand,
      relatedSites: cluster.relatedSites,
      needsReview: cluster.needsReview,
      reviewDecision: cluster.reviewDecision,
    })),
    workItemClusters: (presentation?.workItemClusters ?? args.workItemClusters ?? []).map((cluster) => ({
      id: cluster.id,
      title: cluster.title,
      summary: cluster.summary,
      authoritySource: `${cluster.authoritySurface}:${cluster.authorityResourceType}`,
      authorityNarrative: cluster.authorityNarrative,
      authorityBreakdown: cluster.authorityBreakdown?.map((entry) => ({
        role: entry.role,
        surface: entry.surface,
        entityKey: entry.entityKey,
        resourceType: entry.resourceType,
        label: entry.label,
        reason: entry.reason,
      })),
      matchConfidence: cluster.confidenceBand,
      relatedSites: cluster.relatedSites,
      workType: cluster.workType,
      courseClusterId: cluster.courseClusterId,
      dueAt: cluster.dueAt,
      status: cluster.status,
      needsReview: cluster.needsReview,
      reviewDecision: cluster.reviewDecision,
    })),
    administrativeSummaries: (presentation?.administrativeSummaries ?? args.administrativeSummaries ?? []).map((summary) => ({
      id: summary.id,
      family: summary.family,
      laneStatus: summary.laneStatus,
      detailRuntimeStatus: summary.detailRuntimeStatus,
      title: summary.title,
      summary: summary.summary,
      importance: summary.importance,
      aiDefault: summary.aiDefault,
      authoritySource: summary.authoritySource,
      nextAction: summary.nextAction,
      exactBlockers: summary.exactBlockers,
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

function buildPlanningSubstrateToolPayload(planningSubstrates: WorkbenchView['planningSubstrates'] = []) {
  const orderedPlanningSubstrates = [...planningSubstrates].sort((left, right) =>
    right.capturedAt.localeCompare(left.capturedAt),
  );
  const primaryPlanning = orderedPlanningSubstrates.find((entry) => entry.source === 'myplan') ?? orderedPlanningSubstrates[0];
  const additionalSources = orderedPlanningSubstrates
    .filter((entry) => entry.id !== primaryPlanning?.id)
    .map((entry) => entry.source);
  const exactBlockers = primaryPlanning?.exactBlockers ?? [];
  const hardDeferredMoves = primaryPlanning?.hardDeferredMoves ?? [];

  if (!primaryPlanning) {
    return {
      lane: 'summary_first_read_only_planning_lane' as const,
      posture: 'planning_only_not_registration_or_enrollment_proof' as const,
      coverageStatus: 'missing' as PlanningPulseCoverageStatus,
      summary:
        'Planning Pulse has no current MyPlan/DARS capture in this workbench view yet, so planning guidance still needs a fresh manual capture.',
      exactMissingSlice: 'No shared MyPlan/DARS planning substrate is present in the current workbench view.',
      operatorNotes: [
        'Planning Pulse is a shared planning summary lane, not MyPlan parity or registration automation.',
        'Absent planning capture should be treated as missing evidence, not as an all-clear state.',
      ],
      records: [],
    };
  }

  const hasPlanCapture =
    primaryPlanning.termCount > 0 ||
    primaryPlanning.plannedCourseCount > 0 ||
    primaryPlanning.backupCourseCount > 0 ||
    primaryPlanning.scheduleOptionCount > 0;
  const hasAuditCapture =
    primaryPlanning.requirementGroupCount > 0 || Boolean(primaryPlanning.degreeProgressSummary);

  let coverageStatus: PlanningPulseCoverageStatus = 'metadata_only';
  let exactMissingSlice = 'Current capture needs a stronger planning/audit continuation before it can claim a complete Planning Pulse lane.';

  if (hasPlanCapture && hasAuditCapture) {
    coverageStatus = 'plan_and_audit';
    exactMissingSlice =
      'Current Planning Pulse capture includes both plan context and audit-summary context and now behaves like a review-first summary lane, but it still stays read-only and detail/runtime-lane pending.';
  } else if (hasPlanCapture) {
    coverageStatus = 'plan_only';
    exactMissingSlice =
      'Current Planning Pulse capture includes MyPlan plan context, but the DARS/degree-audit half is still missing from this shared lane.';
  } else if (hasAuditCapture) {
    coverageStatus = 'audit_only';
    exactMissingSlice =
      'Current Planning Pulse capture includes DARS/degree-audit summary context, but the MyPlan term/plan half is still missing from this shared lane.';
  }

  return {
    lane: 'summary_first_read_only_planning_lane' as const,
    posture: primaryPlanning.runtimePosture ?? ('planning_only_not_registration_or_enrollment_proof' as const),
    coverageStatus,
    summary: primaryPlanning.currentTruth
      ? `${primaryPlanning.currentTruth} ${primaryPlanning.planLabel} currently tracks ${primaryPlanning.termCount} term(s), ${primaryPlanning.plannedCourseCount} planned course(s), ${primaryPlanning.backupCourseCount} backup option(s), ${primaryPlanning.scheduleOptionCount} schedule option(s), and ${primaryPlanning.requirementGroupCount} requirement group(s) in the shared Planning Pulse lane.`
      : `${primaryPlanning.planLabel} currently tracks ${primaryPlanning.termCount} term(s), ${primaryPlanning.plannedCourseCount} planned course(s), ${primaryPlanning.backupCourseCount} backup option(s), ${primaryPlanning.scheduleOptionCount} schedule option(s), and ${primaryPlanning.requirementGroupCount} requirement group(s) in the shared Planning Pulse lane.`,
    exactMissingSlice: exactBlockers.length > 0 ? exactBlockers.map((blocker) => `${blocker.id}: ${blocker.summary}`).join(' | ') : exactMissingSlice,
    latestCapture: {
      id: primaryPlanning.id,
      capturedAt: primaryPlanning.capturedAt,
      planLabel: primaryPlanning.planLabel,
      planId: primaryPlanning.planId,
      source: primaryPlanning.source,
      currentStage: primaryPlanning.currentStage,
      runtimePosture: primaryPlanning.runtimePosture,
      currentTruth: primaryPlanning.currentTruth,
      termCount: primaryPlanning.termCount,
      plannedCourseCount: primaryPlanning.plannedCourseCount,
      backupCourseCount: primaryPlanning.backupCourseCount,
      scheduleOptionCount: primaryPlanning.scheduleOptionCount,
      requirementGroupCount: primaryPlanning.requirementGroupCount,
      degreeProgressSummary: primaryPlanning.degreeProgressSummary,
      transferPlanningSummary: primaryPlanning.transferPlanningSummary,
      exactBlockers,
      hardDeferredMoves,
    },
    operatorNotes: [
      ...(primaryPlanning.currentStage ? [`Current stage: ${primaryPlanning.currentStage}.`] : []),
      'Planning Pulse stays a shared planning summary lane, not proof of enrollment entitlement or registration execution state.',
      'Requirement and degree-progress signals now live on a review-first summary lane until a stronger standalone detail/runtime lane is promoted.',
      ...(additionalSources.length > 0 ? [`Additional planning carriers: ${additionalSources.join(', ')}.`] : []),
      ...(hardDeferredMoves.length > 0
        ? [`Hard deferred moves: ${hardDeferredMoves.join(', ')}.`]
        : []),
    ],
    records: orderedPlanningSubstrates,
  };
}

function buildAiExportToolPayload(args: BuildWorkbenchAiProxyRequestArgs, presentation: BuildWorkbenchAiProxyRequestArgs['presentation']) {
  const decisionContext = buildAiDecisionContext(args, presentation);
  const exportContentAllowed =
    args.currentViewExport.packaging.authorizationLevel === 'allowed' && args.currentViewExport.packaging.aiAllowed;

  if (exportContentAllowed) {
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
  const planningSubstrates = args.planningSubstrates ?? args.workbenchView?.planningSubstrates ?? [];
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
      payload: buildPlanningSubstrateToolPayload(planningSubstrates),
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
