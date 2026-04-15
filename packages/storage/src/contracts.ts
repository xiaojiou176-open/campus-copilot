import { z } from 'zod';
import {
  RESOURCE_NAMES,
  SITE_SYNC_OUTCOMES,
  type SiteSyncOutcome,
} from '@campus-copilot/adapters-base';
import {
  AlertSchema,
  AnnouncementSchema,
  AssignmentSchema,
  EntityKindSchema,
  EntityRefSchema,
  EventSchema,
  FetchModeSchema,
  GradeSchema,
  ImportanceLevelSchema,
  TimelineEntrySchema,
  IsoDateTimeSchema,
  MessageSchema,
  PriorityReasonSchema,
  ResourceSchema,
  SiteSchema,
  type Course,
  type Assignment,
  type Announcement,
  type Grade,
  type Message,
  type Event,
  type Resource,
} from '@campus-copilot/schema';

export const SyncResourceFailureSchema = z
  .object({
    resource: z.enum(RESOURCE_NAMES),
    errorReason: z.string().min(1),
    attemptedModes: z.array(FetchModeSchema),
    attemptedCollectors: z.array(z.string().min(1)).default([]),
  })
  .strict();
export type SyncResourceFailure = z.infer<typeof SyncResourceFailureSchema>;

export const SyncStateSchema = z
  .object({
    key: z.string().min(1),
    site: SiteSchema,
    status: z.enum(['idle', 'syncing', 'success', 'error']),
    lastSyncedAt: IsoDateTimeSchema.optional(),
    lastOutcome: z.enum(SITE_SYNC_OUTCOMES).optional(),
    errorReason: z.string().min(1).optional(),
    resourceFailures: z.array(SyncResourceFailureSchema).optional(),
  })
  .strict();
export type SyncState = z.infer<typeof SyncStateSchema>;

export const EntityStateSchema = z
  .object({
    key: z.string().min(1),
    entityId: z.string().min(1),
    site: SiteSchema,
    kind: EntityKindSchema,
    firstSeenAt: IsoDateTimeSchema,
    lastSyncedAt: IsoDateTimeSchema,
    seenAt: IsoDateTimeSchema.optional(),
  })
  .strict();
export type EntityState = z.infer<typeof EntityStateSchema>;

export const LocalEntityOverlaySchema = z
  .object({
    entityId: z.string().min(1),
    site: SiteSchema,
    kind: EntityKindSchema,
    pinnedAt: IsoDateTimeSchema.optional(),
    snoozeUntil: IsoDateTimeSchema.optional(),
    dismissUntil: IsoDateTimeSchema.optional(),
    note: z.string().min(1).optional(),
    updatedAt: IsoDateTimeSchema,
  })
  .strict();
export type LocalEntityOverlay = z.infer<typeof LocalEntityOverlaySchema>;

export const LocalEntityOverlayFieldSchema = z.enum(['pinnedAt', 'snoozeUntil', 'dismissUntil', 'note']);
export type LocalEntityOverlayField = z.infer<typeof LocalEntityOverlayFieldSchema>;

export const LocalEntityOverlayInputSchema = z
  .object({
    entityId: z.string().min(1),
    site: SiteSchema,
    kind: EntityKindSchema,
    pinnedAt: IsoDateTimeSchema.nullish(),
    snoozeUntil: IsoDateTimeSchema.nullish(),
    dismissUntil: IsoDateTimeSchema.nullish(),
    note: z.string().optional().nullable(),
    updatedAt: IsoDateTimeSchema.optional(),
  })
  .strict();
export type LocalEntityOverlayInput = z.infer<typeof LocalEntityOverlayInputSchema>;

const SyncRunStatusSchema = z.enum(['success', 'error']);
export const SyncRunSchema = z
  .object({
    id: z.string().min(1),
    site: SiteSchema,
    startedAt: IsoDateTimeSchema,
    completedAt: IsoDateTimeSchema,
    status: SyncRunStatusSchema,
    outcome: z.enum(SITE_SYNC_OUTCOMES),
    changeCount: z.number().int().nonnegative(),
    errorReason: z.string().min(1).optional(),
    resourceFailures: z.array(SyncResourceFailureSchema).optional(),
  })
  .strict();
export type SyncRun = z.infer<typeof SyncRunSchema>;

export const ChangeEventTypeSchema = z.enum([
  'created',
  'removed',
  'status_changed',
  'due_changed',
  'grade_released',
  'message_unread',
  'sync_partial',
]);
export type ChangeEventType = z.infer<typeof ChangeEventTypeSchema>;

export const ChangeEventSchema = z
  .object({
    id: z.string().min(1),
    runId: z.string().min(1),
    site: SiteSchema,
    changeType: ChangeEventTypeSchema,
    occurredAt: IsoDateTimeSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    entityId: z.string().min(1).optional(),
    entityKind: EntityKindSchema.optional(),
    relatedEntity: EntityRefSchema.optional(),
    previousValue: z.string().min(1).optional(),
    nextValue: z.string().min(1).optional(),
  })
  .strict();
export type ChangeEvent = z.infer<typeof ChangeEventSchema>;

const FocusQueueItemKindSchema = z.union([EntityKindSchema, z.literal('sync_state')]);
export type FocusQueueItemKind = z.infer<typeof FocusQueueItemKindSchema>;

export const FocusQueueItemSchema = z
  .object({
    id: z.string().min(1),
    entityRef: EntityRefSchema.optional(),
    entity: EntityRefSchema.optional(),
    entityId: z.string().min(1).optional(),
    kind: FocusQueueItemKindSchema,
    site: SiteSchema,
    title: z.string().min(1),
    score: z.number(),
    reasons: z.array(PriorityReasonSchema),
    blockedBy: z.array(z.string().min(1)).default([]),
    dueAt: IsoDateTimeSchema.optional(),
    updatedAt: IsoDateTimeSchema.optional(),
    pinned: z.boolean().default(false),
    note: z.string().min(1).optional(),
    summary: z.string().min(1).optional(),
  })
  .strict();
export type FocusQueueItem = z.infer<typeof FocusQueueItemSchema>;

export const WeeklyLoadEntrySchema = z
  .object({
    dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startsAt: IsoDateTimeSchema,
    endsAt: IsoDateTimeSchema,
    assignmentCount: z.number().int().nonnegative(),
    eventCount: z.number().int().nonnegative().optional(),
    overdueCount: z.number().int().nonnegative(),
    dueSoonCount: z.number().int().nonnegative(),
    pinnedCount: z.number().int().nonnegative(),
    totalScore: z.number().nonnegative(),
    summary: z.string().min(1).optional(),
    highlights: z.array(z.string().min(1)).optional(),
    items: z.array(EntityRefSchema),
  })
  .strict();
export type WeeklyLoadEntry = z.infer<typeof WeeklyLoadEntrySchema>;

export const SiteEntityCountsSchema = z
  .object({
    site: SiteSchema,
    courses: z.number().int().nonnegative(),
    resources: z.number().int().nonnegative(),
    assignments: z.number().int().nonnegative(),
    announcements: z.number().int().nonnegative(),
    grades: z.number().int().nonnegative(),
    messages: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
  })
  .strict();
export type SiteEntityCounts = z.infer<typeof SiteEntityCountsSchema>;

export const EntityCountsSchema = z
  .object({
    courses: z.number().int().nonnegative(),
    resources: z.number().int().nonnegative(),
    assignments: z.number().int().nonnegative(),
    announcements: z.number().int().nonnegative(),
    messages: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
  })
  .strict();
export type EntityCounts = z.infer<typeof EntityCountsSchema>;

export const TodaySnapshotSchema = z
  .object({
    totalAssignments: z.number().int().nonnegative(),
    dueSoonAssignments: z.number().int().nonnegative(),
    recentUpdates: z.number().int().nonnegative(),
    newGrades: z.number().int().nonnegative(),
    riskAlerts: z.number().int().nonnegative(),
    syncedSites: z.number().int().nonnegative(),
  })
  .strict();
export type TodaySnapshot = z.infer<typeof TodaySnapshotSchema>;

export const RecentUpdatesFeedSchema = z
  .object({
    items: z.array(TimelineEntrySchema),
    unseenCount: z.number().int().nonnegative(),
  })
  .strict();
export type RecentUpdatesFeed = z.infer<typeof RecentUpdatesFeedSchema>;

export const WorkbenchFilterSchema = z
  .object({
    site: z.union([SiteSchema, z.literal('all')]).default('all'),
    onlyUnseenUpdates: z.boolean().default(false),
  })
  .strict();
export type WorkbenchFilter = z.infer<typeof WorkbenchFilterSchema>;

export const WorkbenchViewSchema = z
  .object({
    filters: WorkbenchFilterSchema,
    resources: z.array(ResourceSchema),
    assignments: z.array(AssignmentSchema),
    announcements: z.array(AnnouncementSchema),
    messages: z.array(MessageSchema),
    grades: z.array(GradeSchema),
    events: z.array(EventSchema),
    alerts: z.array(AlertSchema),
    // Planning substrates stay a limited read-only summary lane on the shared workbench,
    // not a promotion to site-parity or registration semantics.
    planningSubstrates: z.array(z.lazy(() => PlanningSubstrateOwnerSchema)).default([]),
    courseClusters: z.array(z.lazy(() => CourseClusterSchema)).default([]),
    workItemClusters: z.array(z.lazy(() => WorkItemClusterSchema)).default([]),
    administrativeSummaries: z.array(z.lazy(() => AdministrativeSummarySchema)).default([]),
    mergeHealth: z.lazy(() => MergeHealthSummarySchema),
    recentUpdates: RecentUpdatesFeedSchema,
  })
  .strict();
export type WorkbenchView = z.infer<typeof WorkbenchViewSchema>;

export const PlanningSubstrateSourceSchema = z.enum(['myplan', 'time-schedule']);
export type PlanningSubstrateSource = z.infer<typeof PlanningSubstrateSourceSchema>;

export const PlanningSubstrateFitSchema = z.enum(['derived_planning_substrate']);
export type PlanningSubstrateFit = z.infer<typeof PlanningSubstrateFitSchema>;

export const PlanningSubstrateTermSummarySchema = z
  .object({
    termCode: z.string().min(1),
    termLabel: z.string().min(1),
    plannedCourseCount: z.number().int().nonnegative(),
    backupCourseCount: z.number().int().nonnegative(),
    scheduleOptionCount: z.number().int().nonnegative(),
    summary: z.string().min(1).optional(),
  })
  .strict();
export type PlanningSubstrateTermSummary = z.infer<typeof PlanningSubstrateTermSummarySchema>;

export const PlanningSubstrateBlockerSchema = z
  .object({
    id: z.string().min(1),
    class: z.enum(['repo-owned blocker', 'GitHub-owned blocker', 'external-only blocker', 'owner-manual later']),
    summary: z.string().min(1),
    whyItStopsPromotion: z.string().min(1),
  })
  .strict();
export type PlanningSubstrateBlocker = z.infer<typeof PlanningSubstrateBlockerSchema>;

export const PlanningSubstrateOwnerSchema = z
  .object({
    id: z.string().min(1),
    source: PlanningSubstrateSourceSchema,
    fit: PlanningSubstrateFitSchema,
    readOnly: z.literal(true),
    capturedAt: IsoDateTimeSchema,
    planId: z.string().min(1),
    planLabel: z.string().min(1),
    lastUpdatedAt: IsoDateTimeSchema.optional(),
    termCount: z.number().int().nonnegative(),
    plannedCourseCount: z.number().int().nonnegative(),
    backupCourseCount: z.number().int().nonnegative(),
    scheduleOptionCount: z.number().int().nonnegative(),
    requirementGroupCount: z.number().int().nonnegative(),
    programExplorationCount: z.number().int().nonnegative(),
    degreeProgressSummary: z.string().min(1).optional(),
    transferPlanningSummary: z.string().min(1).optional(),
    currentStage: z.string().min(1).optional(),
    runtimePosture: z.string().min(1).optional(),
    currentTruth: z.string().min(1).optional(),
    exactBlockers: z.array(PlanningSubstrateBlockerSchema).default([]),
    hardDeferredMoves: z.array(z.string().min(1)).default([]),
    terms: z.array(PlanningSubstrateTermSummarySchema),
  })
  .strict();
export type PlanningSubstrateOwner = z.infer<typeof PlanningSubstrateOwnerSchema>;

export const ClusterSurfaceSchema = z.union([SiteSchema, z.literal('myplan')]);
export type ClusterSurface = z.infer<typeof ClusterSurfaceSchema>;

export const MatchConfidenceBandSchema = z.enum(['high', 'medium', 'low']);
export type MatchConfidenceBand = z.infer<typeof MatchConfidenceBandSchema>;

export const ClusterMemberKindSchema = z.enum([
  'course',
  'assignment',
  'grade',
  'event',
  'announcement',
  'message',
  'resource',
  'planning_substrate',
]);
export type ClusterMemberKind = z.infer<typeof ClusterMemberKindSchema>;

export const ClusterMemberRefSchema = z
  .object({
    entityKey: z.string().min(1),
    surfaceKey: ClusterSurfaceSchema,
    entityKind: ClusterMemberKindSchema,
    relation: z.string().min(1),
    label: z.string().min(1),
    courseId: z.string().min(1).optional(),
    url: z.url().optional(),
    dueAt: IsoDateTimeSchema.optional(),
    startAt: IsoDateTimeSchema.optional(),
    endAt: IsoDateTimeSchema.optional(),
  })
  .strict();
export type ClusterMemberRef = z.infer<typeof ClusterMemberRefSchema>;

export const CrossSiteEvidenceItemSchema = z
  .object({
    code: z.string().min(1),
    label: z.string().min(1),
    detail: z.string().min(1).optional(),
  })
  .strict();
export type CrossSiteEvidenceItem = z.infer<typeof CrossSiteEvidenceItemSchema>;

export const ClusterAuthorityRoleSchema = z.enum([
  'course_identity',
  'course_delivery',
  'discussion_runtime',
  'assessment_runtime',
  'assignment_spec',
  'schedule_signal',
  'submission_state',
  'feedback_detail',
]);
export type ClusterAuthorityRole = z.infer<typeof ClusterAuthorityRoleSchema>;

export const ClusterAuthorityFacetSchema = z
  .object({
    role: ClusterAuthorityRoleSchema,
    surface: ClusterSurfaceSchema,
    entityKey: z.string().min(1),
    resourceType: z.string().min(1),
    label: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();
export type ClusterAuthorityFacet = z.infer<typeof ClusterAuthorityFacetSchema>;

export const CourseClusterSchema = z
  .object({
    id: z.string().min(1),
    canonicalCourseKey: z.string().min(1),
    displayTitle: z.string().min(1),
    normalizedCourseCode: z.string().min(1).optional(),
    termKey: z.string().min(1).optional(),
    authoritySurface: SiteSchema,
    authorityEntityKey: z.string().min(1),
    authorityResourceType: z.string().min(1),
    confidenceBand: MatchConfidenceBandSchema,
    confidenceScore: z.number().min(0).max(1),
    needsReview: z.boolean(),
    relatedSites: z.array(SiteSchema),
    memberEntityKeys: z.array(z.string().min(1)),
    members: z.array(ClusterMemberRefSchema),
    evidenceBundle: z.array(CrossSiteEvidenceItemSchema),
    summary: z.string().min(1),
    authorityNarrative: z.string().min(1).optional(),
    authorityBreakdown: z.array(ClusterAuthorityFacetSchema).optional(),
    reviewDecision: z.enum(['accepted', 'review_later', 'dismissed']).optional(),
    reviewDecidedAt: IsoDateTimeSchema.optional(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();
export type CourseCluster = z.infer<typeof CourseClusterSchema>;

export const WorkItemClusterTypeSchema = z.enum([
  'assignment',
  'deadline_signal',
  'grade_signal',
  'admin_requirement',
  'planning_requirement',
]);
export type WorkItemClusterType = z.infer<typeof WorkItemClusterTypeSchema>;

export const WorkItemClusterSchema = z
  .object({
    id: z.string().min(1),
    workType: WorkItemClusterTypeSchema,
    courseClusterId: z.string().min(1).optional(),
    title: z.string().min(1),
    status: z.string().min(1).optional(),
    dueAt: IsoDateTimeSchema.optional(),
    startAt: IsoDateTimeSchema.optional(),
    endAt: IsoDateTimeSchema.optional(),
    authoritySurface: ClusterSurfaceSchema,
    authorityEntityKey: z.string().min(1),
    authorityResourceType: z.string().min(1),
    confidenceBand: MatchConfidenceBandSchema,
    confidenceScore: z.number().min(0).max(1),
    needsReview: z.boolean(),
    relatedSites: z.array(SiteSchema),
    memberEntityKeys: z.array(z.string().min(1)),
    members: z.array(ClusterMemberRefSchema),
    evidenceBundle: z.array(CrossSiteEvidenceItemSchema),
    summary: z.string().min(1),
    authorityNarrative: z.string().min(1).optional(),
    authorityBreakdown: z.array(ClusterAuthorityFacetSchema).optional(),
    reviewDecision: z.enum(['accepted', 'review_later', 'dismissed']).optional(),
    reviewDecidedAt: IsoDateTimeSchema.optional(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();
export type WorkItemCluster = z.infer<typeof WorkItemClusterSchema>;

export const ClusterReviewTargetKindSchema = z.enum(['course_cluster', 'work_item_cluster']);
export type ClusterReviewTargetKind = z.infer<typeof ClusterReviewTargetKindSchema>;

export const ClusterReviewDecisionSchema = z.enum(['accepted', 'review_later', 'dismissed']);
export type ClusterReviewDecision = z.infer<typeof ClusterReviewDecisionSchema>;

export const ClusterReviewOverrideSchema = z
  .object({
    id: z.string().min(1),
    targetKind: ClusterReviewTargetKindSchema,
    targetId: z.string().min(1),
    decision: ClusterReviewDecisionSchema,
    decidedAt: IsoDateTimeSchema,
  })
  .strict();
export type ClusterReviewOverride = z.infer<typeof ClusterReviewOverrideSchema>;

export const MergeLedgerDecisionSchema = z.enum(['merged', 'candidate', 'singleton']);
export type MergeLedgerDecision = z.infer<typeof MergeLedgerDecisionSchema>;

export const MergeLedgerEntrySchema = z
  .object({
    id: z.string().min(1),
    targetKind: z.enum(['course_cluster', 'work_item_cluster']),
    targetId: z.string().min(1),
    entityKey: z.string().min(1),
    surfaceKey: ClusterSurfaceSchema,
    entityKind: ClusterMemberKindSchema,
    decision: MergeLedgerDecisionSchema,
    rule: z.string().min(1),
    confidenceBand: MatchConfidenceBandSchema,
    confidenceScore: z.number().min(0).max(1),
    matchedFields: z.array(z.string().min(1)),
    authorityWinner: z.string().min(1),
    reason: z.string().min(1),
    decidedAt: IsoDateTimeSchema,
  })
  .strict();
export type MergeLedgerEntry = z.infer<typeof MergeLedgerEntrySchema>;

export const AdministrativeSummaryFamilySchema = z.enum([
  'dars',
  'tuition',
  'tuition_detail',
  'transcript',
  'finaid',
  'accounts',
  'profile',
]);
export type AdministrativeSummaryFamily = z.infer<typeof AdministrativeSummaryFamilySchema>;

export const AdministrativeAiDefaultSchema = z.enum(['blocked', 'confirm_required', 'allowed']);
export type AdministrativeAiDefault = z.infer<typeof AdministrativeAiDefaultSchema>;

export const AdministrativeLaneStatusSchema = z.enum([
  'landed_summary_lane',
  'standalone_detail_runtime_lane',
  'carrier_not_landed',
]);
export type AdministrativeLaneStatus = z.infer<typeof AdministrativeLaneStatusSchema>;

export const AdministrativeDetailRuntimeStatusSchema = z.enum([
  'review_ready',
  'pending',
  'blocked_missing_carrier',
]);
export type AdministrativeDetailRuntimeStatus = z.infer<typeof AdministrativeDetailRuntimeStatusSchema>;

export const AdministrativePromotionBlockerSchema = z
  .object({
    id: z.string().min(1),
    summary: z.string().min(1),
    whyItStopsPromotion: z.string().min(1),
  })
  .strict();
export type AdministrativePromotionBlocker = z.infer<typeof AdministrativePromotionBlockerSchema>;

export const AdminCarrierFamilySchema = z.enum(['transcript', 'finaid', 'accounts', 'tuition_detail', 'profile']);
export type AdminCarrierFamily = z.infer<typeof AdminCarrierFamilySchema>;

export const AdminCarrierRecordSchema = z
  .object({
    id: z.string().min(1),
    family: AdminCarrierFamilySchema,
    laneStatus: AdministrativeLaneStatusSchema.default('landed_summary_lane'),
    detailRuntimeStatus: AdministrativeDetailRuntimeStatusSchema.default('pending'),
    title: z.string().min(1),
    summary: z.string().min(1),
    detailRuntimeNote: z.string().min(1).optional(),
    sourceSurface: ClusterSurfaceSchema,
    sourceUrl: z.url().optional(),
    authoritySource: z.string().min(1),
    importance: ImportanceLevelSchema,
    aiDefault: AdministrativeAiDefaultSchema,
    nextAction: z.string().min(1).optional(),
    exactBlockers: z.array(AdministrativePromotionBlockerSchema).default([]),
    updatedAt: IsoDateTimeSchema,
  })
  .strict();
export type AdminCarrierRecord = z.infer<typeof AdminCarrierRecordSchema>;

export const AdministrativeSummarySchema = z
  .object({
    id: z.string().min(1),
    family: AdministrativeSummaryFamilySchema,
    laneStatus: AdministrativeLaneStatusSchema.default('landed_summary_lane'),
    detailRuntimeStatus: AdministrativeDetailRuntimeStatusSchema.default('pending'),
    title: z.string().min(1),
    summary: z.string().min(1),
    detailRuntimeNote: z.string().min(1).optional(),
    importance: ImportanceLevelSchema,
    aiDefault: AdministrativeAiDefaultSchema,
    authoritySource: z.string().min(1),
    sourceSurface: ClusterSurfaceSchema,
    nextAction: z.string().min(1).optional(),
    exactBlockers: z.array(AdministrativePromotionBlockerSchema).default([]),
    updatedAt: IsoDateTimeSchema,
  })
  .strict();
export type AdministrativeSummary = z.infer<typeof AdministrativeSummarySchema>;

export const MergeHealthSummarySchema = z
  .object({
    mergedCount: z.number().int().nonnegative(),
    possibleMatchCount: z.number().int().nonnegative(),
    unresolvedCount: z.number().int().nonnegative(),
    authorityConflictCount: z.number().int().nonnegative(),
  })
  .strict();
export type MergeHealthSummary = z.infer<typeof MergeHealthSummarySchema>;

export type SiteSnapshotRecords = {
  courses: Course[];
  resources: Resource[];
  assignments: Assignment[];
  announcements: Announcement[];
  grades: Grade[];
  messages: Message[];
  events: Event[];
};

export interface SiteSnapshotPayload {
  courses?: Course[];
  resources?: Resource[];
  assignments?: Assignment[];
  announcements?: Announcement[];
  grades?: Grade[];
  messages?: Message[];
  events?: Event[];
}

export interface ApplySiteSnapshotWithLedgerOptions {
  startedAt?: string;
  runId?: string;
}

export type FailedSiteSyncOutcome = Exclude<SiteSyncOutcome, 'success' | 'partial_success'>;
