import {
  AlertSchema,
  AnnouncementSchema,
  AssignmentSchema,
  EventSchema,
  GradeSchema,
  IsoDateTimeSchema,
  MessageSchema,
  ResourceSchema,
  TimelineEntrySchema,
  type Alert,
  type Announcement,
  type Assignment,
  type Event,
  type Grade,
  type Message,
  type Resource,
  type TimelineEntry,
} from '@campus-copilot/schema';

export type ExportPreset =
  | 'weekly_assignments'
  | 'recent_updates'
  | 'all_deadlines'
  | 'current_view'
  | 'focus_queue'
  | 'weekly_load'
  | 'change_journal'
  | 'course_panorama'
  | 'administrative_snapshot'
  | 'cluster_merge_review';
export type ExportFormat = 'json' | 'csv' | 'markdown' | 'ics';
export const AUTHORIZATION_LAYERS = ['layer1_read_export', 'layer2_ai_read_analysis'] as const;
export type AuthorizationLayer = (typeof AUTHORIZATION_LAYERS)[number];
export const AUTHORIZATION_STATUSES = ['allowed', 'blocked', 'partial', 'confirm_required'] as const;
export type AuthorizationStatus = (typeof AUTHORIZATION_STATUSES)[number];
export const EXPORT_SCOPE_TYPES = ['current_view', 'current_site', 'current_course', 'multi_site', 'custom'] as const;
export type ExportScopeType = (typeof EXPORT_SCOPE_TYPES)[number];
export const EXPORT_RISK_LABELS = ['low', 'medium', 'high'] as const;
export type ExportRiskLabel = (typeof EXPORT_RISK_LABELS)[number];
export const EXPORT_MATCH_CONFIDENCES = ['low', 'medium', 'high'] as const;
export type ExportMatchConfidence = (typeof EXPORT_MATCH_CONFIDENCES)[number];
export const COMMON_EXPORT_RESOURCE_FAMILIES = [
  'workspace_snapshot',
  'assignments',
  'announcements',
  'messages',
  'grades',
  'events',
  'alerts',
  'recent_updates',
  'focus_queue',
  'weekly_load',
  'change_journal',
  'course_material_excerpt',
  'course_panorama',
  'administrative_snapshot',
  'cluster_merge_review',
] as const;

export interface AuthorizationRule {
  id: string;
  layer: AuthorizationLayer;
  status: AuthorizationStatus;
  site?: string;
  courseIdOrKey?: string;
  resourceFamily?: string;
  scopeType?: ExportScopeType;
  label?: string;
  reason?: string;
  updatedAt?: string;
}

export interface AuthorizationState {
  policyVersion: string;
  rules: AuthorizationRule[];
  updatedAt?: string;
}

export interface ExportScopeMetadata {
  scopeType: ExportScopeType;
  preset: ExportPreset;
  site?: string;
  courseIdOrKey?: string;
  resourceFamily: string;
}

export interface ExportProvenanceEntry {
  sourceType: 'official_api' | 'session_interface' | 'page_state' | 'derived_read_model';
  label: string;
  detail?: string;
  readOnly?: boolean;
}

export interface ExportPackagingMetadata {
  authorizationLevel: AuthorizationStatus;
  aiAllowed: boolean;
  riskLabel: ExportRiskLabel;
  matchConfidence: ExportMatchConfidence;
  provenance: ExportProvenanceEntry[];
}

export interface FocusQueueExportItem {
  id: string;
  kind: string;
  site: string;
  title: string;
  score: number;
  summary?: string;
  pinned?: boolean;
  note?: string;
  dueAt?: string;
  updatedAt?: string;
  entityId?: string;
  entity?: {
    id: string;
    kind: string;
    site: string;
  };
  entityRef?: {
    id: string;
    kind: string;
    site: string;
  };
  reasons: Array<{
    code: string;
    label: string;
    importance: string;
    detail?: string;
  }>;
  blockedBy?: string[];
}

export interface WeeklyLoadExportEntry {
  dateKey: string;
  startsAt: string;
  endsAt: string;
  assignmentCount: number;
  eventCount?: number;
  overdueCount?: number;
  dueSoonCount?: number;
  pinnedCount?: number;
  totalScore?: number;
  summary?: string;
  highlights?: string[];
}

export interface SyncRunExportEntry {
  id?: string;
  site: string;
  status: string;
  outcome: string;
  startedAt: string;
  completedAt: string;
  changeCount: number;
  errorReason?: string;
  resourceFailures?: Array<{
    resource: string;
    errorReason?: string;
  }>;
}

export interface ChangeEventExportEntry {
  id?: string;
  site: string;
  changeType: string;
  occurredAt: string;
  title: string;
  summary: string;
  entityId?: string;
  previousValue?: string;
  nextValue?: string;
}

export interface ExportInput {
  generatedAt: string;
  viewTitle?: string;
  scope?: Partial<ExportScopeMetadata>;
  packaging?: Partial<ExportPackagingMetadata>;
  authorization?: AuthorizationState;
  resources?: Resource[];
  assignments?: Assignment[];
  announcements?: Announcement[];
  messages?: Message[];
  grades?: Grade[];
  events?: Event[];
  alerts?: Alert[];
  timelineEntries?: TimelineEntry[];
  focusQueue?: FocusQueueExportItem[];
  weeklyLoad?: WeeklyLoadExportEntry[];
  syncRuns?: SyncRunExportEntry[];
  changeEvents?: ChangeEventExportEntry[];
  courseClusters?: Array<{
    id: string;
    title: string;
    summary: string;
    authoritySource: string;
    authorityNarrative?: string;
    authorityBreakdown?: Array<{
      role: string;
      surface: string;
      entityKey: string;
      resourceType: string;
      label: string;
      reason: string;
    }>;
    matchConfidence: ExportMatchConfidence;
    relatedSites: string[];
    needsReview?: boolean;
    reviewDecision?: 'accepted' | 'review_later' | 'dismissed';
  }>;
  workItemClusters?: Array<{
    id: string;
    title: string;
    summary: string;
    authoritySource: string;
    authorityNarrative?: string;
    authorityBreakdown?: Array<{
      role: string;
      surface: string;
      entityKey: string;
      resourceType: string;
      label: string;
      reason: string;
    }>;
    matchConfidence: ExportMatchConfidence;
    relatedSites: string[];
    workType: string;
    courseClusterId?: string;
    dueAt?: string;
    status?: string;
    needsReview?: boolean;
    reviewDecision?: 'accepted' | 'review_later' | 'dismissed';
  }>;
  administrativeSummaries?: Array<{
    id: string;
    family: string;
    laneStatus?: 'landed_summary_lane' | 'standalone_detail_runtime_lane' | 'carrier_not_landed';
    detailRuntimeStatus?: 'review_ready' | 'pending' | 'blocked_missing_carrier';
    title: string;
    summary: string;
    importance: string;
    aiDefault: string;
    authoritySource: string;
    nextAction?: string;
    exactBlockers?: Array<{
      id: string;
      summary: string;
      whyItStopsPromotion: string;
    }>;
  }>;
  mergeHealth?: {
    mergedCount: number;
    possibleMatchCount: number;
    unresolvedCount: number;
    authorityConflictCount: number;
  };
}

export interface ExportArtifact {
  preset: ExportPreset;
  format: ExportFormat;
  filename: string;
  mimeType: string;
  scope: ExportScopeMetadata;
  packaging: ExportPackagingMetadata;
  content: string;
}

interface NormalizedExportInput {
  generatedAt: string;
  viewTitle?: string;
  scope?: Partial<ExportScopeMetadata>;
  packaging?: Partial<ExportPackagingMetadata>;
  authorization?: AuthorizationState;
  resources: Resource[];
  assignments: Assignment[];
  announcements: Announcement[];
  messages: Message[];
  grades: Grade[];
  events: Event[];
  alerts: Alert[];
  timelineEntries: TimelineEntry[];
  focusQueue: FocusQueueExportItem[];
  weeklyLoad: WeeklyLoadExportEntry[];
  syncRuns: SyncRunExportEntry[];
  changeEvents: ChangeEventExportEntry[];
  courseClusters: NonNullable<ExportInput['courseClusters']>;
  workItemClusters: NonNullable<ExportInput['workItemClusters']>;
  administrativeSummaries: NonNullable<ExportInput['administrativeSummaries']>;
  mergeHealth?: ExportInput['mergeHealth'];
}

interface PreparedExportDataset extends NormalizedExportInput {
  title: string;
}

interface ExportDataset extends PreparedExportDataset {
  title: string;
  scope: ExportScopeMetadata;
  packaging: ExportPackagingMetadata;
}

interface CsvRow {
  kind: string;
  site: string;
  scopeType: string;
  scopeSite: string;
  scopeCourseIdOrKey: string;
  resourceFamily: string;
  authorizationLevel: string;
  aiAllowed: string;
  riskLabel: string;
  matchConfidence: string;
  provenance: string;
  title: string;
  courseId: string;
  assignmentId: string;
  status: string;
  occurredAt: string;
  dueAt: string;
  startAt: string;
  endAt: string;
  score: string;
  maxScore: string;
  importance: string;
  dateKey: string;
  reasons: string;
  blockedBy: string;
  outcome: string;
  changeCount: string;
  summary: string;
  detail: string;
  url: string;
  resourceGroupLabel?: string;
  resourceGroupCount?: string;
  resourceModuleLabel?: string;
  resourceModuleItemType?: string;
  relation?: string;
}

const MIME_TYPES: Record<ExportFormat, string> = {
  json: 'application/json',
  csv: 'text/csv',
  markdown: 'text/markdown',
  ics: 'text/calendar',
};

const PRESET_LABELS: Record<ExportPreset, string> = {
  weekly_assignments: 'weekly-assignments',
  recent_updates: 'recent-updates',
  all_deadlines: 'all-deadlines',
  current_view: 'current-view',
  focus_queue: 'focus-queue',
  weekly_load: 'weekly-load',
  change_journal: 'change-journal',
  course_panorama: 'course-panorama',
  administrative_snapshot: 'administrative-snapshot',
  cluster_merge_review: 'cluster-merge-review',
};

function normalizeInput(input: ExportInput): NormalizedExportInput {
  const generatedAt = IsoDateTimeSchema.parse(input.generatedAt);
  return {
    generatedAt,
    viewTitle: input.viewTitle,
    scope: input.scope,
    packaging: input.packaging,
    authorization: input.authorization,
    resources: (input.resources ?? []).map((record) => ResourceSchema.parse(record)),
    assignments: (input.assignments ?? []).map((record) => AssignmentSchema.parse(record)),
    announcements: (input.announcements ?? []).map((record) => AnnouncementSchema.parse(record)),
    messages: (input.messages ?? []).map((record) => MessageSchema.parse(record)),
    grades: (input.grades ?? []).map((record) => GradeSchema.parse(record)),
    events: (input.events ?? []).map((record) => EventSchema.parse(record)),
    alerts: (input.alerts ?? []).map((record) => AlertSchema.parse(record)),
    timelineEntries: (input.timelineEntries ?? []).map((record) => TimelineEntrySchema.parse(record)),
    focusQueue: [...(input.focusQueue ?? [])],
    weeklyLoad: [...(input.weeklyLoad ?? [])],
    syncRuns: [...(input.syncRuns ?? [])],
    changeEvents: [...(input.changeEvents ?? [])],
    courseClusters: [...(input.courseClusters ?? [])],
    workItemClusters: [...(input.workItemClusters ?? [])],
    administrativeSummaries: [...(input.administrativeSummaries ?? [])],
    mergeHealth: input.mergeHealth,
  };
}

function inferScopeType(preset: ExportPreset, site?: string, courseIdOrKey?: string): ExportScopeType {
  if (courseIdOrKey) {
    return 'current_course';
  }
  if (site) {
    return preset === 'current_view' ? 'current_view' : 'current_site';
  }
  return preset === 'current_view' ? 'current_view' : 'multi_site';
}

function inferResourceFamily(preset: ExportPreset): string {
  switch (preset) {
    case 'weekly_assignments':
      return 'assignments';
    case 'recent_updates':
      return 'recent_updates';
    case 'all_deadlines':
      return 'events';
    case 'focus_queue':
      return 'focus_queue';
    case 'weekly_load':
      return 'weekly_load';
    case 'change_journal':
      return 'change_journal';
    case 'course_panorama':
      return 'course_panorama';
    case 'administrative_snapshot':
      return 'administrative_snapshot';
    case 'cluster_merge_review':
      return 'cluster_merge_review';
    case 'current_view':
    default:
      return 'workspace_snapshot';
  }
}

function normalizeAdministrativeSummaryRuleFamily(family: string) {
  switch (family) {
    case 'dars':
      return 'degree_audit_summary';
    case 'transcript':
      return 'transcript_summary';
    case 'finaid':
      return 'financial_aid_summary';
    case 'profile':
      return 'profile_summary';
    case 'accounts':
    case 'tuition':
    case 'tuition_detail':
      return 'tuition_account_summary';
    default:
      return undefined;
  }
}

function getRelatedResourceFamilies(input: {
  scope: ExportScopeMetadata;
  normalized: NormalizedExportInput;
}) {
  const families = new Set<string>();
  families.add(input.scope.resourceFamily);

  if (
    input.scope.resourceFamily === 'workspace_snapshot' ||
    input.scope.resourceFamily === 'administrative_snapshot'
  ) {
    for (const summary of input.normalized.administrativeSummaries) {
      const mappedFamily = normalizeAdministrativeSummaryRuleFamily(summary.family);
      if (mappedFamily) {
        families.add(mappedFamily);
      }
    }
  }

  return families;
}

function getAuthorizationStatusSeverity(status: AuthorizationStatus) {
  switch (status) {
    case 'blocked':
      return 4;
    case 'confirm_required':
      return 3;
    case 'partial':
      return 2;
    case 'allowed':
    default:
      return 1;
  }
}

function resolveAuthorizationStatus(input: {
  normalized: NormalizedExportInput;
  authorization?: AuthorizationState;
  layer: AuthorizationLayer;
  scope: ExportScopeMetadata;
}): AuthorizationStatus {
  const rules = input.authorization?.rules ?? [];
  const relatedFamilies = getRelatedResourceFamilies(input);
  let match: AuthorizationRule | undefined;
  let bestSeverity = -1;
  let bestScore = -1;

  for (const rule of rules) {
    if (rule.layer !== input.layer) {
      continue;
    }
    if (rule.site && rule.site !== input.scope.site) {
      continue;
    }
    if (rule.courseIdOrKey && rule.courseIdOrKey !== input.scope.courseIdOrKey) {
      continue;
    }
    if (rule.resourceFamily && !relatedFamilies.has(rule.resourceFamily)) {
      continue;
    }
    if (rule.scopeType && rule.scopeType !== input.scope.scopeType) {
      continue;
    }

    const score =
      (rule.courseIdOrKey ? 16 : 0) +
      (rule.site ? 8 : 0) +
      (rule.resourceFamily ? 4 : 0) +
      (rule.scopeType ? 2 : 0);
    const severity = getAuthorizationStatusSeverity(rule.status);

    if (severity > bestSeverity || (severity === bestSeverity && score > bestScore)) {
      bestSeverity = severity;
      bestScore = score;
      match = rule;
    }
  }

  if (match) {
    return match.status;
  }

  return input.layer === 'layer1_read_export' ? 'partial' : 'confirm_required';
}

function inferRiskLabel(scope: ExportScopeMetadata, authorizationLevel: AuthorizationStatus, aiStatus: AuthorizationStatus): ExportRiskLabel {
  if (authorizationLevel === 'blocked' || aiStatus === 'blocked') {
    return 'high';
  }
  if (
    aiStatus === 'confirm_required' ||
    scope.resourceFamily === 'grades' ||
    scope.resourceFamily === 'messages' ||
    scope.resourceFamily === 'course_material_excerpt'
  ) {
    return 'high';
  }
  if (authorizationLevel === 'partial' || aiStatus === 'partial' || scope.resourceFamily === 'workspace_snapshot') {
    return 'medium';
  }
  return 'low';
}

function hasAdministrativeCarrierPlaceholders(
  summaries: Array<{
    id: string;
    laneStatus?: string;
  }>,
) {
  return summaries.some((summary) => summary.laneStatus === 'carrier_not_landed' || summary.id.endsWith(':blocker'));
}

function isPendingClusterReview(input: {
  needsReview?: boolean;
  reviewDecision?: 'accepted' | 'review_later' | 'dismissed';
}) {
  if (!input.needsReview) {
    return false;
  }
  return input.reviewDecision !== 'accepted' && input.reviewDecision !== 'dismissed';
}

function getClusterDisposition(input: {
  needsReview?: boolean;
  reviewDecision?: 'accepted' | 'review_later' | 'dismissed';
}) {
  if (input.reviewDecision === 'accepted') {
    return 'accepted_local';
  }
  if (input.reviewDecision === 'dismissed') {
    return 'dismissed_local';
  }
  if (isPendingClusterReview(input)) {
    return 'possible_match';
  }
  return 'merged';
}

function formatClusterDisposition(input: {
  needsReview?: boolean;
  reviewDecision?: 'accepted' | 'review_later' | 'dismissed';
}) {
  const disposition = getClusterDisposition(input);
  if (disposition === 'accepted_local') {
    return 'accepted locally';
  }
  if (disposition === 'dismissed_local') {
    return 'dismissed locally';
  }
  if (disposition === 'possible_match') {
    return 'possible match';
  }
  return 'merged';
}

function inferMatchConfidence(input: {
  scope: ExportScopeMetadata;
  normalized: NormalizedExportInput;
}): ExportMatchConfidence {
  const reviewSignalsPresent =
    (input.normalized.mergeHealth?.possibleMatchCount ?? 0) > 0 ||
    (input.normalized.mergeHealth?.unresolvedCount ?? 0) > 0 ||
    input.normalized.courseClusters.some((cluster) => isPendingClusterReview(cluster)) ||
    input.normalized.workItemClusters.some((cluster) => isPendingClusterReview(cluster));

  if (input.scope.resourceFamily === 'cluster_merge_review') {
    if (
      input.normalized.courseClusters.length === 0 &&
      input.normalized.workItemClusters.length === 0 &&
      !input.normalized.mergeHealth
    ) {
      return 'low';
    }
    return reviewSignalsPresent ? 'medium' : 'high';
  }

  if (input.scope.resourceFamily === 'course_panorama') {
    if (input.normalized.courseClusters.length === 0) {
      return 'low';
    }
    return reviewSignalsPresent ? 'medium' : 'high';
  }

  if (input.scope.resourceFamily === 'administrative_snapshot') {
    return input.normalized.administrativeSummaries.length > 0 ? 'medium' : 'low';
  }

  const scope = input.scope;
  if (scope.scopeType === 'current_course') {
    return reviewSignalsPresent ? 'medium' : 'high';
  }
  if (scope.scopeType === 'current_site' || scope.scopeType === 'current_view') {
    return 'medium';
  }
  return 'low';
}

function buildDefaultProvenance(input: {
  scope: ExportScopeMetadata;
  normalized: NormalizedExportInput;
}): ExportProvenanceEntry[] {
  const entries: ExportProvenanceEntry[] = [
    {
      sourceType: 'derived_read_model',
      label: 'Unified local read model',
      detail: 'Built from normalized schema entities before export packaging.',
      readOnly: true,
    },
  ];

  if (input.scope.resourceFamily === 'cluster_merge_review' || input.scope.resourceFamily === 'course_panorama') {
    entries.push({
      sourceType: 'derived_read_model',
      label: 'Cross-site authority and review ledger',
      detail: 'Includes authority winners, match confidence, and possible-match review flags from the cluster substrate.',
      readOnly: true,
    });
  }

  if (input.scope.resourceFamily === 'administrative_snapshot' || input.normalized.administrativeSummaries.length > 0) {
    entries.push({
      sourceType: 'derived_read_model',
      label: 'Administrative summary surface',
      detail: hasAdministrativeCarrierPlaceholders(input.normalized.administrativeSummaries)
        ? 'High-sensitivity academic and administrative records stay review-first and export-first. Some rows are still blocker placeholders, so their presence does not mean every family has a summary-ready lane yet.'
        : 'High-sensitivity academic and administrative records now flow through summary-ready review surfaces and stay export-first until a stronger detail/runtime lane is promoted.',
      readOnly: true,
    });
  }

  switch (input.scope.site) {
    case 'canvas':
      entries.push({
        sourceType: 'official_api',
        label: 'Canvas official API carrier',
        detail: 'Assignments, resources, messages, grades, and events stay grounded in official Canvas read-only responses, including landed module/group/media carriers on the shared Resource lane.',
        readOnly: true,
      });
      break;
    case 'gradescope':
      entries.push({
        sourceType: 'session_interface',
        label: 'Gradescope session-backed grading carrier',
        detail: 'Private grading endpoints and DOM fallback remain read-only and are never presented as official public APIs.',
        readOnly: true,
      });
      break;
    case 'edstem':
      entries.push({
        sourceType: 'session_interface',
        label: 'EdStem session-backed discussion carrier',
        detail: 'Thread and resource context stay read-only; resource DOM fallback is still narrower than the thread lane.',
        readOnly: true,
      });
      break;
    case 'myuw':
      entries.push({
        sourceType: 'session_interface',
        label: 'MyUW student-status carrier',
        detail: 'Notice and schedule signals can promote into the decision desk while transcript, finaid, and account detail stay at the review-first summary level with detail/runtime promotion still pending.',
        readOnly: true,
      });
      break;
    case 'myplan':
      entries.push({
        sourceType: 'page_state',
        label: 'MyPlan planning substrate capture',
        detail: 'Current MyPlan depth is a review-first summary lane: comparison-oriented, read-only, and still awaiting stronger live/runtime promotion.',
        readOnly: true,
      });
      break;
    case 'time-schedule':
      entries.push({
        sourceType: 'page_state',
        label: 'Time Schedule public planning carrier',
        detail: 'Public section context supports planning, not enrolled-state truth or registration entitlement.',
        readOnly: true,
      });
      break;
    case 'course-sites':
      entries.push({
        sourceType: 'page_state',
        label: 'Course website DOM carrier',
        detail: 'Course websites currently contribute a scope-limited runtime lane for metadata and schedule context, not default AI-readable raw materials.',
        readOnly: true,
      });
      break;
    default:
      entries.push({
        sourceType: 'session_interface',
        label: 'Multi-site read-only campus session',
        detail: 'Current Wave 2 exports may combine official, session-backed, and DOM-derived carriers through the shared read model.',
        readOnly: true,
      });
      break;
  }

  return entries;
}

function resolveScopeMetadata(input: {
  preset: ExportPreset;
  normalized: NormalizedExportInput;
}): ExportScopeMetadata {
  const requested = input.normalized.scope;
  const site = requested?.site;
  const courseIdOrKey = requested?.courseIdOrKey;
  return {
    scopeType: requested?.scopeType ?? inferScopeType(input.preset, site, courseIdOrKey),
    preset: input.preset,
    site,
    courseIdOrKey,
    resourceFamily: requested?.resourceFamily ?? inferResourceFamily(input.preset),
  };
}

function resolvePackagingMetadata(input: {
  normalized: NormalizedExportInput;
  scope: ExportScopeMetadata;
}): ExportPackagingMetadata {
  const requested = input.normalized.packaging;
  const layer1Status = resolveAuthorizationStatus({
    normalized: input.normalized,
    authorization: input.normalized.authorization,
    layer: 'layer1_read_export',
    scope: input.scope,
  });
  const layer2Status = resolveAuthorizationStatus({
    normalized: input.normalized,
    authorization: input.normalized.authorization,
    layer: 'layer2_ai_read_analysis',
    scope: input.scope,
  });

  return {
    authorizationLevel: layer1Status,
    aiAllowed: layer1Status === 'allowed' && layer2Status === 'allowed',
    riskLabel: requested?.riskLabel ?? inferRiskLabel(input.scope, layer1Status, layer2Status),
    matchConfidence: requested?.matchConfidence ?? inferMatchConfidence(input),
    provenance: requested?.provenance ?? buildDefaultProvenance(input),
  };
}

function formatProvenance(entries: ExportProvenanceEntry[]) {
  return entries
    .map((entry) => {
      const detail = entry.detail ? ` (${entry.detail})` : '';
      return `${entry.sourceType}:${entry.label}${detail}`;
    })
    .join(' | ');
}

function addDays(isoString: string, days: number) {
  const date = new Date(isoString);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function isWithinWindow(target: string | undefined, start: string, end: string) {
  if (!target) {
    return false;
  }
  const value = new Date(target).getTime();
  return value >= new Date(start).getTime() && value <= new Date(end).getTime();
}

function buildPresetDataset(preset: ExportPreset, input: NormalizedExportInput): PreparedExportDataset {
  const weekEnd = addDays(input.generatedAt, 7);
  const recentStart = addDays(input.generatedAt, -7);

  switch (preset) {
    case 'weekly_assignments':
      return {
        ...input,
        title: 'Weekly assignments',
        assignments: input.assignments.filter((assignment) => {
          return (
            isWithinWindow(assignment.dueAt, input.generatedAt, weekEnd) ||
            assignment.status === 'missing' ||
            assignment.status === 'overdue'
          );
        }),
        announcements: [],
        messages: [],
        grades: [],
        events: [],
        alerts: [],
        timelineEntries: [],
        focusQueue: [],
        weeklyLoad: [],
        syncRuns: [],
        changeEvents: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [],
      };
    case 'recent_updates':
      return {
        ...input,
        title: 'Recent updates',
        assignments: [],
        announcements: input.announcements.filter((item) => isWithinWindow(item.postedAt, recentStart, input.generatedAt)),
        messages: input.messages.filter((item) => isWithinWindow(item.createdAt, recentStart, input.generatedAt)),
        grades: input.grades.filter((item) => isWithinWindow(item.releasedAt ?? item.gradedAt, recentStart, input.generatedAt)),
        events: [],
        alerts: input.alerts.filter((item) => isWithinWindow(item.triggeredAt, recentStart, input.generatedAt)),
        timelineEntries: input.timelineEntries.filter((item) => isWithinWindow(item.occurredAt, recentStart, input.generatedAt)),
        focusQueue: [],
        weeklyLoad: [],
        syncRuns: [],
        changeEvents: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [],
      };
    case 'all_deadlines':
      return {
        ...input,
        title: 'All deadlines',
        assignments: input.assignments.filter((item) => Boolean(item.dueAt)),
        announcements: [],
        messages: [],
        grades: [],
        events: input.events.filter((item) => item.eventKind === 'deadline' || Boolean(item.startAt) || Boolean(item.endAt)),
        alerts: [],
        timelineEntries: [],
        focusQueue: [],
        weeklyLoad: [],
        syncRuns: [],
        changeEvents: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [],
      };
    case 'focus_queue':
      return {
        ...input,
        title: 'Focus queue',
        assignments: [],
        announcements: [],
        messages: [],
        grades: [],
        events: [],
        alerts: [],
        timelineEntries: [],
        focusQueue: input.focusQueue,
        weeklyLoad: [],
        syncRuns: [],
        changeEvents: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [],
      };
    case 'weekly_load':
      return {
        ...input,
        title: 'Weekly load',
        assignments: [],
        announcements: [],
        messages: [],
        grades: [],
        events: [],
        alerts: [],
        timelineEntries: [],
        focusQueue: [],
        syncRuns: [],
        changeEvents: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [],
      };
    case 'change_journal':
      return {
        ...input,
        title: 'Change journal',
        assignments: [],
        announcements: [],
        messages: [],
        grades: [],
        events: [],
        alerts: [],
        timelineEntries: [],
        focusQueue: [],
        weeklyLoad: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [],
      };
    case 'course_panorama':
      return {
        ...input,
        title: 'Course panorama',
        announcements: [],
        messages: [],
        grades: [],
        alerts: [],
        timelineEntries: [],
        focusQueue: [],
        weeklyLoad: [],
        syncRuns: [],
        changeEvents: [],
        courseClusters: input.courseClusters,
        workItemClusters: input.workItemClusters,
        administrativeSummaries: [],
      };
    case 'administrative_snapshot':
      return {
        ...input,
        title: 'Administrative snapshot',
        resources: [],
        assignments: [],
        announcements: [],
        messages: [],
        grades: [],
        events: [],
        alerts: [],
        timelineEntries: [],
        focusQueue: [],
        weeklyLoad: [],
        syncRuns: [],
        changeEvents: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: input.administrativeSummaries,
      };
    case 'cluster_merge_review':
      return {
        ...input,
        title: 'Cluster merge review',
        resources: [],
        assignments: [],
        announcements: [],
        messages: [],
        grades: [],
        events: [],
        alerts: [],
        timelineEntries: [],
        focusQueue: [],
        weeklyLoad: [],
        syncRuns: [],
        changeEvents: [],
        courseClusters: input.courseClusters,
        workItemClusters: input.workItemClusters,
        administrativeSummaries: input.administrativeSummaries,
      };
    case 'current_view':
    default:
      return {
        ...input,
        title: input.viewTitle ?? 'Current view',
      };
  }
}

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function formatOptionalNumber(value: number | undefined) {
  return value === undefined ? '' : String(value);
}

function formatOptionalString(value: string | undefined) {
  return value ?? '';
}

function buildCsvRows(dataset: ExportDataset): CsvRow[] {
  const rows: CsvRow[] = [];
  const sharedFields = {
    scopeType: dataset.scope.scopeType,
    scopeSite: formatOptionalString(dataset.scope.site),
    scopeCourseIdOrKey: formatOptionalString(dataset.scope.courseIdOrKey),
    resourceFamily: dataset.scope.resourceFamily,
    authorizationLevel: dataset.packaging.authorizationLevel,
    aiAllowed: String(dataset.packaging.aiAllowed),
    riskLabel: dataset.packaging.riskLabel,
    matchConfidence: dataset.packaging.matchConfidence,
    provenance: formatProvenance(dataset.packaging.provenance),
  };

  for (const resource of dataset.resources) {
    rows.push({
      ...sharedFields,
      kind: resource.kind,
      site: resource.site,
      title: resource.title,
      courseId: formatOptionalString(resource.courseId),
      assignmentId: '',
      status: resource.resourceKind,
      occurredAt: formatOptionalString(resource.releasedAt ?? resource.updatedAt ?? resource.createdAt),
      dueAt: '',
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
      importance: '',
      dateKey: '',
      reasons: '',
      blockedBy: '',
      outcome: '',
      changeCount: '',
      summary: formatOptionalString(resource.summary),
      detail: formatOptionalString(resource.detail),
      url: formatOptionalString(resource.url),
      resourceGroupLabel: formatOptionalString(resource.resourceGroup?.label),
      resourceGroupCount: formatOptionalNumber(resource.resourceGroup?.memberCount),
      resourceModuleLabel: formatOptionalString(resource.resourceModule?.label),
      resourceModuleItemType: formatOptionalString(resource.resourceModule?.itemType),
    });
  }

  for (const assignment of dataset.assignments) {
    rows.push({
      ...sharedFields,
      kind: assignment.kind,
      site: assignment.site,
      title: assignment.title,
      courseId: formatOptionalString(assignment.courseId),
      assignmentId: assignment.id,
      status: assignment.status,
      occurredAt: '',
      dueAt: formatOptionalString(assignment.dueAt),
      startAt: '',
      endAt: '',
      score: formatOptionalNumber(assignment.score),
      maxScore: formatOptionalNumber(assignment.maxScore),
      importance: '',
      dateKey: '',
      reasons: '',
      blockedBy: '',
      outcome: '',
      changeCount: '',
      summary: formatOptionalString(assignment.summary),
      detail: formatOptionalString(assignment.detail),
      url: formatOptionalString(assignment.url),
    });
  }

  for (const announcement of dataset.announcements) {
    rows.push({
      ...sharedFields,
      kind: announcement.kind,
      site: announcement.site,
      title: announcement.title,
      courseId: formatOptionalString(announcement.courseId),
      assignmentId: '',
      status: '',
      occurredAt: formatOptionalString(announcement.postedAt),
      dueAt: '',
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
      importance: '',
      dateKey: '',
      reasons: '',
      blockedBy: '',
      outcome: '',
      changeCount: '',
      summary: formatOptionalString(announcement.summary),
      detail: '',
      url: formatOptionalString(announcement.url),
    });
  }

  for (const message of dataset.messages) {
    rows.push({
      ...sharedFields,
      kind: message.kind,
      site: message.site,
      title: formatOptionalString(message.title),
      courseId: formatOptionalString(message.courseId),
      assignmentId: '',
      status: message.unread ? 'unread' : '',
      occurredAt: formatOptionalString(message.createdAt),
      dueAt: '',
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
      importance: '',
      dateKey: '',
      reasons: '',
      blockedBy: '',
      outcome: '',
      changeCount: '',
      summary: [message.messageKind, message.category, message.subcategory, message.summary].filter(Boolean).join(' · '),
      detail: '',
      url: formatOptionalString(message.url),
    });
  }

  for (const grade of dataset.grades) {
    rows.push({
      ...sharedFields,
      kind: grade.kind,
      site: grade.site,
      title: grade.title,
      courseId: formatOptionalString(grade.courseId),
      assignmentId: formatOptionalString(grade.assignmentId),
      status: '',
      occurredAt: formatOptionalString(grade.releasedAt ?? grade.gradedAt),
      dueAt: '',
      startAt: '',
      endAt: '',
      score: formatOptionalNumber(grade.score),
      maxScore: formatOptionalNumber(grade.maxScore),
      importance: '',
      dateKey: '',
      reasons: '',
      blockedBy: '',
      outcome: '',
      changeCount: '',
      summary: '',
      detail: '',
      url: formatOptionalString(grade.url),
    });
  }

  for (const event of dataset.events) {
    rows.push({
      ...sharedFields,
      kind: event.kind,
      site: event.site,
      title: event.title,
      courseId: '',
      assignmentId: formatOptionalString(event.relatedAssignmentId),
      status: event.eventKind,
      occurredAt: '',
      dueAt: '',
      startAt: formatOptionalString(event.startAt),
      endAt: formatOptionalString(event.endAt),
      score: '',
      maxScore: '',
      importance: '',
      dateKey: '',
      reasons: '',
      blockedBy: '',
      outcome: '',
      changeCount: '',
      summary: formatOptionalString(event.summary ?? event.location),
      detail: formatOptionalString(event.detail),
      url: formatOptionalString(event.url),
    });
  }

  for (const alert of dataset.alerts) {
    rows.push({
      ...sharedFields,
      kind: alert.kind,
      site: alert.site,
      title: alert.title,
      courseId: '',
      assignmentId: '',
      status: alert.alertKind,
      occurredAt: formatOptionalString(alert.triggeredAt),
      dueAt: '',
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
      importance: alert.importance,
      dateKey: '',
      reasons: '',
      blockedBy: '',
      outcome: '',
      changeCount: '',
      summary: alert.summary,
      detail: '',
      url: formatOptionalString(alert.url),
    });
  }

  for (const entry of dataset.timelineEntries) {
    rows.push({
      ...sharedFields,
      kind: entry.kind,
      site: entry.site,
      title: entry.title,
      courseId: '',
      assignmentId: '',
      status: entry.timelineKind,
      occurredAt: entry.occurredAt,
      dueAt: '',
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
      importance: '',
      dateKey: '',
      reasons: '',
      blockedBy: '',
      outcome: '',
      changeCount: '',
      summary: formatOptionalString(entry.summary),
      detail: '',
      url: formatOptionalString(entry.url),
    });
  }

  for (const item of dataset.focusQueue) {
    rows.push({
      ...sharedFields,
      kind: 'focus_item',
      site: item.site,
      title: item.title,
      courseId: '',
      assignmentId: item.entity?.id ?? item.entityRef?.id ?? item.entityId ?? '',
      status: item.pinned ? 'pinned' : '',
      occurredAt: '',
      dueAt: formatOptionalString(item.dueAt),
      startAt: '',
      endAt: '',
      score: String(item.score),
      maxScore: '',
      importance: item.reasons[0]?.importance ?? '',
      dateKey: '',
      reasons: item.reasons
        .map((reason) => (reason.detail ? `${reason.label}: ${reason.detail}` : reason.label))
        .join(' | '),
      blockedBy: (item.blockedBy ?? []).join(' | '),
      outcome: '',
      changeCount: '',
      summary: item.summary ?? item.note ?? '',
      detail: '',
      url: '',
    });
  }

  for (const entry of dataset.weeklyLoad) {
    rows.push({
      ...sharedFields,
      kind: 'weekly_load',
      site: '',
      title: `Load for ${entry.dateKey}`,
      courseId: '',
      assignmentId: '',
      status: '',
      occurredAt: '',
      dueAt: '',
      startAt: entry.startsAt,
      endAt: entry.endsAt,
      score: formatOptionalNumber(entry.totalScore),
      maxScore: '',
      importance: '',
      dateKey: entry.dateKey,
      reasons: (entry.highlights ?? []).join(' | '),
      blockedBy: '',
      outcome: '',
      changeCount: '',
      summary:
        entry.summary ??
        `assignments=${entry.assignmentCount}, events=${entry.eventCount ?? 0}, overdue=${entry.overdueCount ?? 0}`,
      detail: '',
      url: '',
    });
  }

  for (const run of dataset.syncRuns) {
    rows.push({
      ...sharedFields,
      kind: 'sync_run',
      site: run.site,
      title: `${run.site} sync`,
      courseId: '',
      assignmentId: '',
      status: run.status,
      occurredAt: run.completedAt,
      dueAt: '',
      startAt: run.startedAt,
      endAt: run.completedAt,
      score: '',
      maxScore: '',
      importance: '',
      dateKey: '',
      reasons: '',
      blockedBy: '',
      outcome: run.outcome,
      changeCount: String(run.changeCount),
      summary: run.errorReason ?? '',
      detail: '',
      url: '',
    });
  }

  for (const event of dataset.changeEvents) {
    rows.push({
      ...sharedFields,
      kind: 'change_event',
      site: event.site,
      title: event.title,
      courseId: '',
      assignmentId: event.entityId ?? '',
      status: event.changeType,
      occurredAt: event.occurredAt,
      dueAt: '',
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
      importance: '',
      dateKey: '',
      reasons: '',
      blockedBy: '',
      outcome: '',
      changeCount: '',
      summary: event.summary,
      detail: '',
      url: '',
    });
  }

  for (const cluster of dataset.courseClusters) {
    const disposition = getClusterDisposition(cluster);
    const boundaryMap = formatAuthorityBoundaryMap(cluster.authorityBreakdown);
    const surfaceCoverageMap = formatAuthoritySurfaceCoverageMap(cluster.authorityBreakdown);
    const detailParts = [
      `Authority: ${cluster.authoritySource}`,
      boundaryMap ? `Boundary map: ${boundaryMap}` : '',
      surfaceCoverageMap ? `Surface coverage: ${surfaceCoverageMap}` : '',
      cluster.authorityNarrative ? `Narrative: ${cluster.authorityNarrative}` : '',
      ...formatAuthorityBreakdownLines(cluster.authorityBreakdown),
    ].filter(Boolean);
    rows.push({
      ...sharedFields,
      kind: 'course_cluster',
      site: cluster.relatedSites.join('|'),
      title: cluster.title,
      courseId: cluster.id,
      assignmentId: '',
      status: disposition,
      occurredAt: '',
      dueAt: '',
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
      importance: '',
      dateKey: '',
      reasons: cluster.matchConfidence,
      blockedBy: isPendingClusterReview(cluster) ? 'review' : '',
      outcome: '',
      changeCount: '',
      summary: cluster.summary,
      detail: detailParts.join(' | '),
      url: '',
      relation: 'course_cluster',
    });
  }

  for (const cluster of dataset.workItemClusters) {
    const disposition = getClusterDisposition(cluster);
    const boundaryMap = formatAuthorityBoundaryMap(cluster.authorityBreakdown);
    const surfaceCoverageMap = formatAuthoritySurfaceCoverageMap(cluster.authorityBreakdown);
    const detailParts = [
      `Authority: ${cluster.authoritySource}`,
      boundaryMap ? `Boundary map: ${boundaryMap}` : '',
      surfaceCoverageMap ? `Surface coverage: ${surfaceCoverageMap}` : '',
      cluster.authorityNarrative ? `Narrative: ${cluster.authorityNarrative}` : '',
      ...formatAuthorityBreakdownLines(cluster.authorityBreakdown),
    ].filter(Boolean);
    rows.push({
      ...sharedFields,
      kind: 'work_item_cluster',
      site: cluster.relatedSites.join('|'),
      title: cluster.title,
      courseId: cluster.courseClusterId ?? '',
      assignmentId: cluster.id,
      status: disposition === 'merged' ? cluster.status ?? cluster.workType : disposition,
      occurredAt: '',
      dueAt: formatOptionalString(cluster.dueAt),
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
      importance: '',
      dateKey: '',
      reasons: cluster.matchConfidence,
      blockedBy: isPendingClusterReview(cluster) ? 'review' : '',
      outcome: '',
      changeCount: '',
      summary: cluster.summary,
      detail: detailParts.join(' | '),
      url: '',
      relation: cluster.workType,
    });
  }

  for (const summary of dataset.administrativeSummaries) {
    rows.push({
      ...sharedFields,
      kind: 'administrative_summary',
      site: 'administrative',
      title: summary.title,
      courseId: '',
      assignmentId: summary.id,
      status: summary.aiDefault,
      occurredAt: '',
      dueAt: '',
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
        importance: summary.importance,
        dateKey: '',
        reasons: summary.family,
      blockedBy: [
        summary.aiDefault === 'blocked' ? 'ai_blocked' : '',
        summary.laneStatus === 'carrier_not_landed' || summary.id.endsWith(':blocker') ? 'carrier_not_landed' : '',
      ]
        .filter(Boolean)
        .join(' | '),
      outcome: '',
      changeCount: '',
      summary: summary.summary,
      detail: [summary.detailRuntimeStatus ? `detail runtime ${summary.detailRuntimeStatus.replace(/_/g, ' ')}` : '', summary.nextAction ?? '']
        .filter(Boolean)
        .join(' · '),
      url: '',
      relation: summary.family,
    });
  }

  return rows;
}

function renderJson(dataset: ExportDataset) {
  return JSON.stringify(
    {
      title: dataset.title,
      generatedAt: dataset.generatedAt,
      scope: dataset.scope,
      packaging: {
        authorization_level: dataset.packaging.authorizationLevel,
        ai_allowed: dataset.packaging.aiAllowed,
        risk_label: dataset.packaging.riskLabel,
        match_confidence: dataset.packaging.matchConfidence,
        provenance: dataset.packaging.provenance,
      },
      counts: {
        assignments: dataset.assignments.length,
        announcements: dataset.announcements.length,
        messages: dataset.messages.length,
        grades: dataset.grades.length,
        events: dataset.events.length,
        alerts: dataset.alerts.length,
        timelineEntries: dataset.timelineEntries.length,
        focusQueue: dataset.focusQueue.length,
        weeklyLoad: dataset.weeklyLoad.length,
        syncRuns: dataset.syncRuns.length,
        changeEvents: dataset.changeEvents.length,
        courseClusters: dataset.courseClusters.length,
        workItemClusters: dataset.workItemClusters.length,
        administrativeSummaries: dataset.administrativeSummaries.length,
      },
      data: dataset,
    },
    null,
    2,
  );
}

function renderCsv(dataset: ExportDataset) {
  const rows = buildCsvRows(dataset);
  const headers: (keyof CsvRow)[] = [
    'kind',
    'site',
    'scopeType',
    'scopeSite',
    'scopeCourseIdOrKey',
    'resourceFamily',
    'authorizationLevel',
    'aiAllowed',
    'riskLabel',
    'matchConfidence',
    'provenance',
    'title',
    'courseId',
    'assignmentId',
    'status',
    'occurredAt',
    'dueAt',
    'startAt',
    'endAt',
    'score',
    'maxScore',
    'importance',
    'dateKey',
    'reasons',
    'blockedBy',
    'outcome',
    'changeCount',
    'summary',
    'detail',
    'url',
    'resourceGroupLabel',
    'resourceGroupCount',
    'resourceModuleLabel',
    'resourceModuleItemType',
    'relation',
  ];
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvCell(String(row[header] ?? ''))).join(','));
  }

  return lines.join('\n');
}

function renderMarkdownSection(title: string, lines: string[]) {
  if (lines.length === 0) {
    return '';
  }
  return `## ${title}\n${lines.join('\n')}\n`;
}

function formatAssignmentReviewAnnotationLabel(input: {
  count?: number;
  pageNumbers?: number[];
}) {
  if (input.count === undefined) {
    return undefined;
  }

  const countText = `${input.count} annotation${input.count === 1 ? '' : 's'}`;
  if (!input.pageNumbers || input.pageNumbers.length === 0) {
    return ` [${countText}]`;
  }

  const pageText =
    input.pageNumbers.length === 1
      ? `page ${input.pageNumbers[0]}`
      : `pages ${input.pageNumbers.join(', ')}`;
  return ` [${countText} on ${pageText}]`;
}

function formatAuthoritySource(value: string) {
  return value.replace(/_/g, ' ').replace(/:/g, ' · ');
}

function formatAuthorityRole(value: string) {
  return value.replace(/_/g, ' ');
}

function formatAuthorityBoundaryKey(value: string) {
  switch (value) {
    case 'course_identity':
      return 'identity';
    case 'course_delivery':
      return 'delivery';
    case 'discussion_runtime':
      return 'discussion';
    case 'assessment_runtime':
      return 'assessment';
    case 'assignment_spec':
      return 'spec';
    case 'schedule_signal':
      return 'schedule';
    case 'submission_state':
      return 'submission';
    case 'feedback_detail':
      return 'feedback';
    default:
      return formatAuthorityRole(value);
  }
}

function getAuthorityFieldMapTokens(input: {
  role: string;
  resourceType?: string;
}) {
  switch (input.role) {
    case 'course_identity':
      return ['title', 'code', 'term', 'link'];
    case 'course_delivery':
      return ['modules', 'assignments', 'announcements', 'runtime'];
    case 'discussion_runtime':
      return ['threads', 'replies', 'lesson-entry'];
    case 'assessment_runtime':
      return ['submissions', 'scores', 'review'];
    case 'assignment_spec':
      return input.resourceType === 'assignment_row' ? ['title', 'spec', 'link'] : ['title', 'spec'];
    case 'schedule_signal':
      return input.resourceType === 'event' ? ['startAt', 'endAt'] : ['dueAt', 'startAt', 'endAt'];
    case 'submission_state':
      return ['status', 'submission'];
    case 'feedback_detail':
      return ['score', 'rubric', 'comment', 'annotation'];
    default:
      return [];
  }
}

function formatAuthorityBoundaryFacetLabel(input: {
  role: string;
  resourceType?: string;
}) {
  const fieldTokens = getAuthorityFieldMapTokens(input);
  if (fieldTokens.length === 0) {
    return formatAuthorityBoundaryKey(input.role);
  }
  return `${formatAuthorityBoundaryKey(input.role)}[${fieldTokens.join('/')}]`;
}

function formatAuthorityBoundaryMap(
  breakdown:
    | Array<{
        role: string;
        surface: string;
        resourceType?: string;
      }>
    | undefined,
) {
  if (!breakdown || breakdown.length === 0) {
    return undefined;
  }

  return breakdown
    .map((facet) => `${formatAuthorityBoundaryFacetLabel({ role: facet.role, resourceType: facet.resourceType })}=${facet.surface}`)
    .join(' · ');
}

function formatAuthoritySurfaceCoverageMap(
  breakdown:
    | Array<{
        role: string;
        surface: string;
        resourceType?: string;
      }>
    | undefined,
) {
  if (!breakdown || breakdown.length === 0) {
    return undefined;
  }

  const grouped = new Map<
    string,
    Array<{
      role: string;
      resourceType?: string;
    }>
  >();

  for (const facet of breakdown) {
    grouped.set(facet.surface, [...(grouped.get(facet.surface) ?? []), { role: facet.role, resourceType: facet.resourceType }]);
  }

  return [...grouped.entries()]
    .map(([surface, facets]) => {
      const segments = facets.map((facet) =>
        `${formatAuthorityBoundaryKey(facet.role)}[${getAuthorityFieldMapTokens({
          role: facet.role,
          resourceType: facet.resourceType,
        }).join('/')}]`,
      );
      return `${surface}=>${segments.join(' + ')}`;
    })
    .join(' · ');
}

function formatAuthorityBreakdownLines(
  breakdown:
    | Array<{
        role: string;
        surface: string;
        resourceType: string;
        reason: string;
      }>
    | undefined,
) {
  if (!breakdown || breakdown.length === 0) {
    return [];
  }

  return breakdown.map((facet) => {
    const reason = facet.reason ? ` - ${facet.reason}` : '';
    const fieldTokens = getAuthorityFieldMapTokens({ role: facet.role, resourceType: facet.resourceType });
    const fields = fieldTokens.length > 0 ? ` · fields ${fieldTokens.join('/')}` : '';
    return `${formatAuthorityRole(facet.role)}: ${formatAuthoritySource(`${facet.surface}:${facet.resourceType}`)}${fields}${reason}`;
  });
}

function renderMarkdown(dataset: ExportDataset) {
  const sections: string[] = [];

  sections.push(`# ${dataset.title}`);
  sections.push('');
  sections.push(`Generated at: ${dataset.generatedAt}`);
  sections.push(`Scope: ${dataset.scope.scopeType} · ${dataset.scope.resourceFamily}`);
  if (dataset.scope.site) {
    sections.push(`Site: ${dataset.scope.site}`);
  }
  if (dataset.scope.courseIdOrKey) {
    sections.push(`Course: ${dataset.scope.courseIdOrKey}`);
  }
  sections.push(`Authorization: ${dataset.packaging.authorizationLevel}`);
  sections.push(`AI allowed: ${dataset.packaging.aiAllowed ? 'yes' : 'no'}`);
  sections.push(`Risk label: ${dataset.packaging.riskLabel}`);
  sections.push(`Match confidence: ${dataset.packaging.matchConfidence}`);
  sections.push('');

  sections.push(
    renderMarkdownSection(
      'Policy Envelope',
      dataset.packaging.provenance.map((entry) => {
        const detail = entry.detail ? ` - ${entry.detail}` : '';
        return `- ${entry.sourceType}: ${entry.label}${detail}`;
      }),
    ),
  );
  sections.push('');

  sections.push(
    renderMarkdownSection(
      'Resources',
      dataset.resources.map((resource) => {
        const releasedAt = resource.releasedAt ? ` - released ${resource.releasedAt}` : '';
        const summary = resource.summary ? ` - ${resource.summary}` : '';
        const detail = resource.detail ? ` - detail ${resource.detail}` : '';
        const kind = ` - kind ${resource.resourceKind}`;
        const group =
          resource.resourceGroup != null
            ? ` - resource set ${resource.resourceGroup.label}${
                resource.resourceGroup.memberCount != null ? ` (${resource.resourceGroup.memberCount} items)` : ''
              }`
            : '';
        const module = resource.resourceModule != null ? ` - module ${resource.resourceModule.label} (${resource.resourceModule.itemType})` : '';
        return `- ${resource.title} (${resource.site})${kind}${releasedAt}${summary}${detail}${group}${module}`;
      }),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Assignments',
      dataset.assignments.map((assignment) => {
        const detail = assignment.dueAt ? ` - due ${assignment.dueAt}` : '';
        const summary = assignment.summary ? ` - ${assignment.summary}` : '';
        const fullDetail = assignment.detail ? ` - detail ${assignment.detail}` : '';
        const reviewSummary = assignment.reviewSummary
          ? ` - review ${assignment.reviewSummary.questions
              .map((question) => {
                const score =
                  question.score !== undefined || question.maxScore !== undefined
                    ? ` ${question.score ?? '-'} / ${question.maxScore ?? '-'}`
                    : '';
                const rubric = question.rubricLabels.length > 0 ? ` (${question.rubricLabels.join(', ')})` : '';
                const comments =
                  question.evaluationCommentCount !== undefined ? ` [${question.evaluationCommentCount} comment${question.evaluationCommentCount === 1 ? '' : 's'}]` : '';
                const annotations = formatAssignmentReviewAnnotationLabel({
                  count: question.annotationCount,
                  pageNumbers: question.annotationPages,
                });
                return `${question.label}${score}${rubric}${comments}${annotations}`;
              })
              .join('; ')}`
          : '';
        const actionHints =
          assignment.actionHints && assignment.actionHints.length > 0 ? ` - actions ${assignment.actionHints.join(' | ')}` : '';
        const score = assignment.score !== undefined || assignment.maxScore !== undefined ? ` - score ${assignment.score ?? '-'} / ${assignment.maxScore ?? '-'}` : '';
        return `- ${assignment.title} (${assignment.site}, ${assignment.status})${detail}${score}${summary}${fullDetail}${actionHints}${reviewSummary}`;
      }),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Recent Updates',
      [
        ...dataset.announcements.map((item) => {
          const summary = item.summary ? ` - ${item.summary}` : '';
          return `- Announcement: ${item.title} (${item.site})${summary}`;
        }),
        ...dataset.messages.map((item) => {
          const summary = item.summary ? ` - ${item.summary}` : '';
          return `- Message: ${item.title ?? item.messageKind} (${item.site})${summary}`;
        }),
        ...dataset.grades.map((item) => `- Grade: ${item.title} (${item.score ?? '-'} / ${item.maxScore ?? '-'})`),
      ],
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Events',
      dataset.events.map((event) => {
        const when = `${event.startAt ?? event.endAt ?? ''}`.trim();
        const location = event.location ? ` - ${event.location}` : '';
        const detail = event.detail ? ` - ${event.detail}` : event.summary ? ` - ${event.summary}` : '';
        return `- ${event.title} (${event.eventKind}) ${when}${location}${detail}`.trim();
      }),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Alerts',
      dataset.alerts.map((alert) => `- ${alert.title} [${alert.importance}] - ${alert.summary}`),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Timeline',
      dataset.timelineEntries.map((entry) => `- ${entry.occurredAt}: ${entry.title} (${entry.timelineKind})`),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Focus Queue',
      dataset.focusQueue.map((item) => {
        const reasons = item.reasons
          .map((reason) => (reason.detail ? `${reason.label}: ${reason.detail}` : reason.label))
          .join(', ');
        const summary = item.summary ? ` - ${item.summary}` : '';
        const note = item.note ? ` - note: ${item.note}` : '';
        const blocked = item.blockedBy?.length ? ` - blocked by: ${item.blockedBy.join(' / ')}` : '';
        return `- ${item.title} (${item.site}, score ${item.score})${summary} - ${reasons}${note}${blocked}`;
      }),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Weekly Load',
      dataset.weeklyLoad.map((entry) => {
        const summary = entry.summary ? ` - ${entry.summary}` : '';
        return `- ${entry.dateKey}: assignments=${entry.assignmentCount}, events=${entry.eventCount ?? 0}, dueSoon=${entry.dueSoonCount ?? 0}, overdue=${entry.overdueCount ?? 0}, pinned=${entry.pinnedCount ?? 0}, totalScore=${entry.totalScore ?? 0}${summary}`;
      }),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Sync Runs',
      dataset.syncRuns.map((run) => {
        const gaps = Array.isArray(run.resourceFailures)
          ? ` - gaps: ${run.resourceFailures.map((item) => item.resource).join(' / ')}`
          : '';
        const suffix = run.errorReason ? ` - ${run.errorReason}` : gaps;
        return `- ${run.completedAt}: ${run.site} ${run.outcome} (${run.changeCount} changes)${suffix}`;
      }),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Change Events',
      dataset.changeEvents.map((event) => {
        const valueDelta =
          event.previousValue || event.nextValue
            ? ` [${event.previousValue ?? 'empty'} -> ${event.nextValue ?? 'empty'}]`
            : '';
        return `- ${event.occurredAt}: ${event.title} (${event.changeType}) - ${event.summary}${valueDelta}`;
      }),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Course Clusters',
      dataset.courseClusters.map((cluster) => {
        const flag = formatClusterDisposition(cluster);
        const narrative = cluster.authorityNarrative ? ` - authority narrative ${cluster.authorityNarrative}` : '';
        const boundaryMap = formatAuthorityBoundaryMap(cluster.authorityBreakdown);
        const surfaceCoverageMap = formatAuthoritySurfaceCoverageMap(cluster.authorityBreakdown);
        const breakdown = formatAuthorityBreakdownLines(cluster.authorityBreakdown)
          .map((line) => `\n  - ${line}`)
          .join('');
        const boundary = boundaryMap ? ` - boundary map ${boundaryMap}` : '';
        const surfaceCoverage = surfaceCoverageMap ? ` - surface coverage ${surfaceCoverageMap}` : '';
        return `- ${cluster.title} (${flag}; ${cluster.matchConfidence}; authority ${formatAuthoritySource(cluster.authoritySource)}) - ${cluster.summary}${boundary}${surfaceCoverage}${narrative}${breakdown}`;
      }),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Work-Item Clusters',
      dataset.workItemClusters.map((cluster) => {
        const due = cluster.dueAt ? ` - due ${cluster.dueAt}` : '';
        const flag = formatClusterDisposition(cluster);
        const narrative = cluster.authorityNarrative ? ` - authority narrative ${cluster.authorityNarrative}` : '';
        const boundaryMap = formatAuthorityBoundaryMap(cluster.authorityBreakdown);
        const surfaceCoverageMap = formatAuthoritySurfaceCoverageMap(cluster.authorityBreakdown);
        const breakdown = formatAuthorityBreakdownLines(cluster.authorityBreakdown)
          .map((line) => `\n  - ${line}`)
          .join('');
        const boundary = boundaryMap ? ` - boundary map ${boundaryMap}` : '';
        const surfaceCoverage = surfaceCoverageMap ? ` - surface coverage ${surfaceCoverageMap}` : '';
        return `- ${cluster.title} (${cluster.workType}; ${flag}; ${cluster.matchConfidence}; authority ${formatAuthoritySource(cluster.authoritySource)})${due} - ${cluster.summary}${boundary}${surfaceCoverage}${narrative}${breakdown}`;
      }),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Administrative Summaries',
      dataset.administrativeSummaries.map((summary) => {
        const detailRuntime = summary.detailRuntimeStatus ? `; detail runtime ${summary.detailRuntimeStatus.replace(/_/g, ' ')}` : '';
        const nextAction = summary.nextAction ? ` - next: ${summary.nextAction}` : '';
        return `- ${summary.title} (${summary.family}; AI ${summary.aiDefault}${detailRuntime}) - ${summary.summary}${nextAction}`;
      }),
    ),
  );

  return sections.filter(Boolean).join('\n').trimEnd();
}

function escapeIcsText(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
}

function formatIcsDate(isoString: string) {
  return new Date(isoString).toISOString().replaceAll('-', '').replaceAll(':', '').replace('.000', '');
}

function buildDeadlineEvents(dataset: ExportDataset) {
  const lines: string[] = [];

  for (const assignment of dataset.assignments) {
    if (!assignment.dueAt) {
      continue;
    }
    const due = formatIcsDate(assignment.dueAt);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeIcsText(assignment.id)}`);
    lines.push(`DTSTAMP:${formatIcsDate(dataset.generatedAt)}`);
    lines.push(`DTSTART:${due}`);
    lines.push(`DTEND:${due}`);
    lines.push(`SUMMARY:${escapeIcsText(assignment.title)}`);
    if (assignment.url) {
      lines.push(`URL:${escapeIcsText(assignment.url)}`);
    }
    lines.push('END:VEVENT');
  }

  for (const event of dataset.events) {
    const start = event.startAt ?? event.endAt;
    const end = event.endAt ?? event.startAt;
    if (!start || !end) {
      continue;
    }
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeIcsText(event.id)}`);
    lines.push(`DTSTAMP:${formatIcsDate(dataset.generatedAt)}`);
    lines.push(`DTSTART:${formatIcsDate(start)}`);
    lines.push(`DTEND:${formatIcsDate(end)}`);
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    if (event.url) {
      lines.push(`URL:${escapeIcsText(event.url)}`);
    }
    lines.push('END:VEVENT');
  }

  return lines;
}

function renderIcs(dataset: ExportDataset) {
  const events = buildDeadlineEvents(dataset);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Campus Copilot//Exporter//EN',
    'CALSCALE:GREGORIAN',
    `X-CAMPUS-COPILOT-GENERATED-AT:${escapeIcsText(dataset.generatedAt)}`,
    `X-CAMPUS-COPILOT-SCOPE-TYPE:${escapeIcsText(dataset.scope.scopeType)}`,
    `X-CAMPUS-COPILOT-SITE:${escapeIcsText(dataset.scope.site ?? 'multi-site')}`,
    `X-CAMPUS-COPILOT-COURSE-ID-OR-KEY:${escapeIcsText(dataset.scope.courseIdOrKey ?? 'all-courses')}`,
    `X-CAMPUS-COPILOT-RESOURCE-FAMILY:${escapeIcsText(dataset.scope.resourceFamily)}`,
    `X-CAMPUS-COPILOT-AUTHORIZATION-LEVEL:${escapeIcsText(dataset.packaging.authorizationLevel)}`,
    `X-CAMPUS-COPILOT-AI-ALLOWED:${dataset.packaging.aiAllowed ? 'TRUE' : 'FALSE'}`,
    `X-CAMPUS-COPILOT-RISK-LABEL:${escapeIcsText(dataset.packaging.riskLabel)}`,
    `X-CAMPUS-COPILOT-MATCH-CONFIDENCE:${escapeIcsText(dataset.packaging.matchConfidence)}`,
    `X-CAMPUS-COPILOT-PROVENANCE:${escapeIcsText(formatProvenance(dataset.packaging.provenance))}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

function buildFilename(preset: ExportPreset, format: ExportFormat, generatedAt: string) {
  const datePart = generatedAt.slice(0, 10);
  return `campus-copilot-${PRESET_LABELS[preset]}-${datePart}.${format}`;
}

export function createExportArtifact(request: {
  preset: ExportPreset;
  format: ExportFormat;
  input: ExportInput;
}): ExportArtifact {
  const normalized = normalizeInput(request.input);
  const scope = resolveScopeMetadata({
    preset: request.preset,
    normalized,
  });
  const packaging = resolvePackagingMetadata({
    normalized,
    scope,
  });
  const dataset = {
    ...buildPresetDataset(request.preset, normalized),
    scope,
    packaging,
  };

  const content =
    request.format === 'json'
      ? renderJson(dataset)
      : request.format === 'csv'
        ? renderCsv(dataset)
        : request.format === 'markdown'
          ? renderMarkdown(dataset)
          : renderIcs(dataset);

  return {
    preset: request.preset,
    format: request.format,
    filename: buildFilename(request.preset, request.format, normalized.generatedAt),
    mimeType: MIME_TYPES[request.format],
    scope,
    packaging,
    content,
  };
}
