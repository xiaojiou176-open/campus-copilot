import { z } from 'zod';

export const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const SiteSchema = z.enum(['canvas', 'gradescope', 'edstem', 'myuw', 'time-schedule', 'course-sites']);
export type Site = z.infer<typeof SiteSchema>;

export const EntityKindSchema = z.enum([
  'course',
  'resource',
  'assignment',
  'announcement',
  'message',
  'grade',
  'event',
  'alert',
  'timeline_entry',
]);
export type EntityKind = z.infer<typeof EntityKindSchema>;

export const ImportanceLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type ImportanceLevel = z.infer<typeof ImportanceLevelSchema>;

export const FetchModeSchema = z.enum(['official_api', 'private_api', 'state', 'dom']);
export type FetchMode = z.infer<typeof FetchModeSchema>;

export const SourceRefSchema = z
  .object({
    site: SiteSchema,
    resourceId: z.string().min(1),
    resourceType: z.string().min(1),
    url: z.url().optional(),
    rawSnapshotId: z.string().min(1).optional(),
  })
  .strict();
export type SourceRef = z.infer<typeof SourceRefSchema>;

const BaseEntityShape = {
  id: z.string().min(1),
  site: SiteSchema,
  source: SourceRefSchema,
  url: z.url().optional(),
  createdAt: IsoDateTimeSchema.optional(),
  updatedAt: IsoDateTimeSchema.optional(),
} as const;

export const CourseSchema = z
  .object({
    ...BaseEntityShape,
    kind: z.literal('course'),
    title: z.string().min(1),
    code: z.string().min(1).optional(),
  })
  .strict();
export type Course = z.infer<typeof CourseSchema>;

export const ResourceKindSchema = z.enum(['file', 'link', 'embed', 'other']);
export type ResourceKind = z.infer<typeof ResourceKindSchema>;

export const ResourceGroupSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    memberCount: z.number().int().positive().optional(),
  })
  .strict();
export type ResourceGroup = z.infer<typeof ResourceGroupSchema>;

export const ResourceModuleSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    itemType: z.string().min(1),
  })
  .strict();
export type ResourceModule = z.infer<typeof ResourceModuleSchema>;

export const ResourceSchema = z
  .object({
    ...BaseEntityShape,
    kind: z.literal('resource'),
    courseId: z.string().min(1).optional(),
    resourceKind: ResourceKindSchema,
    title: z.string().min(1),
    summary: z.string().min(1).optional(),
    detail: z.string().min(1).optional(),
    resourceGroup: ResourceGroupSchema.optional(),
    resourceModule: ResourceModuleSchema.optional(),
    fileExtension: z.string().min(1).optional(),
    sizeBytes: z.number().int().nonnegative().optional(),
    downloadUrl: z.url().optional(),
    releasedAt: IsoDateTimeSchema.optional(),
  })
  .strict();
export type Resource = z.infer<typeof ResourceSchema>;

export const AssignmentStatusSchema = z.enum([
  'todo',
  'submitted',
  'graded',
  'missing',
  'overdue',
  'unknown',
]);
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

export const AssignmentSchema = z
  .object({
    ...BaseEntityShape,
    kind: z.literal('assignment'),
    courseId: z.string().min(1).optional(),
    title: z.string().min(1),
    summary: z.string().min(1).optional(),
    detail: z.string().min(1).optional(),
    dueAt: IsoDateTimeSchema.optional(),
    status: AssignmentStatusSchema,
    submittedAt: IsoDateTimeSchema.optional(),
    score: z.number().finite().optional(),
    maxScore: z.number().finite().optional(),
    actionHints: z.array(z.string().min(1)).default([]).optional(),
    reviewSummary: z
      .object({
        questions: z.array(
          z
            .object({
              label: z.string().min(1),
              modality: z.enum(['autograder', 'manual']).optional(),
              score: z.number().finite().optional(),
              maxScore: z.number().finite().optional(),
              rubricLabels: z.array(z.string().min(1)).default([]),
              evaluationCommentCount: z.number().int().nonnegative().optional(),
              annotationCount: z.number().int().nonnegative().optional(),
              annotationPages: z.array(z.number().int().positive()).default([]),
            })
            .strict(),
        ),
      })
      .strict()
      .optional(),
  })
  .strict();
export type Assignment = z.infer<typeof AssignmentSchema>;

export const AnnouncementSchema = z
  .object({
    ...BaseEntityShape,
    kind: z.literal('announcement'),
    courseId: z.string().min(1).optional(),
    title: z.string().min(1),
    summary: z.string().min(1).optional(),
    postedAt: IsoDateTimeSchema.optional(),
  })
  .strict();
export type Announcement = z.infer<typeof AnnouncementSchema>;

export const MessageKindSchema = z.enum(['thread', 'reply', 'notice', 'update', 'unknown']);
export type MessageKind = z.infer<typeof MessageKindSchema>;

export const MessageSchema = z
  .object({
    ...BaseEntityShape,
    kind: z.literal('message'),
    courseId: z.string().min(1).optional(),
    messageKind: MessageKindSchema,
    threadId: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    summary: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    subcategory: z.string().min(1).optional(),
    createdAt: IsoDateTimeSchema.optional(),
    instructorAuthored: z.boolean().optional(),
    unread: z.boolean().optional(),
  })
  .strict();
export type Message = z.infer<typeof MessageSchema>;

export const GradeSchema = z
  .object({
    ...BaseEntityShape,
    kind: z.literal('grade'),
    courseId: z.string().min(1).optional(),
    assignmentId: z.string().min(1).optional(),
    title: z.string().min(1),
    score: z.number().finite().optional(),
    maxScore: z.number().finite().optional(),
    gradedAt: IsoDateTimeSchema.optional(),
    releasedAt: IsoDateTimeSchema.optional(),
  })
  .strict();
export type Grade = z.infer<typeof GradeSchema>;

export const EventKindSchema = z.enum(['deadline', 'class', 'exam', 'notice', 'other']);
export type EventKind = z.infer<typeof EventKindSchema>;

export const EventSchema = z
  .object({
    ...BaseEntityShape,
    kind: z.literal('event'),
    courseId: z.string().min(1).optional(),
    eventKind: EventKindSchema,
    title: z.string().min(1),
    summary: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    startAt: IsoDateTimeSchema.optional(),
    endAt: IsoDateTimeSchema.optional(),
    relatedAssignmentId: z.string().min(1).optional(),
    detail: z.string().min(1).optional(),
  })
  .strict();
export type Event = z.infer<typeof EventSchema>;

export const EntityRefSchema = z
  .object({
    id: z.string().min(1),
    kind: EntityKindSchema,
    site: SiteSchema,
  })
  .strict();
export type EntityRef = z.infer<typeof EntityRefSchema>;

export const PriorityReasonCodeSchema = z.enum([
  'due_soon',
  'overdue',
  'recently_updated',
  'unread_activity',
  'new_grade',
  'important_announcement',
  'sync_stale',
  'manual',
]);
export type PriorityReasonCode = z.infer<typeof PriorityReasonCodeSchema>;

export const PriorityReasonSchema = z
  .object({
    code: PriorityReasonCodeSchema,
    label: z.string().min(1),
    importance: ImportanceLevelSchema,
    detail: z.string().min(1).optional(),
    relatedEntity: EntityRefSchema.optional(),
  })
  .strict();
export type PriorityReason = z.infer<typeof PriorityReasonSchema>;

export const AlertKindSchema = z.enum([
  'deadline_risk',
  'new_update',
  'attention_needed',
  'other',
  'due_soon',
  'overdue',
  'new_grade',
  'important_announcement',
  'instructor_activity',
  'unread_mention',
  'schedule_change',
  'custom',
]);
export type AlertKind = z.infer<typeof AlertKindSchema>;

export const AlertSchema = z
  .object({
    ...BaseEntityShape,
    kind: z.literal('alert'),
    alertKind: AlertKindSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    importance: ImportanceLevelSchema,
    relatedEntities: z.array(EntityRefSchema).default([]),
    triggeredAt: IsoDateTimeSchema,
    reasons: z.array(PriorityReasonSchema).optional(),
  })
  .strict();
export type Alert = z.infer<typeof AlertSchema>;

export const TimelineKindSchema = z.enum([
  'announcement_posted',
  'assignment_created',
  'assignment_due',
  'grade_released',
  'discussion_replied',
  'schedule_updated',
  'alert_triggered',
]);
export type TimelineKind = z.infer<typeof TimelineKindSchema>;

export const TimelineEntrySchema = z
  .object({
    ...BaseEntityShape,
    kind: z.literal('timeline_entry'),
    timelineKind: TimelineKindSchema,
    occurredAt: IsoDateTimeSchema,
    title: z.string().min(1),
    relatedEntities: z.array(EntityRefSchema),
    summary: z.string().min(1).optional(),
  })
  .strict();
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

export const FetchMetadataSchema = z
  .object({
    mode: FetchModeSchema,
    attemptedAt: IsoDateTimeSchema,
    success: z.boolean(),
    collectorName: z.string().min(1),
    errorReason: z.string().min(1).optional(),
  })
  .strict();
export type FetchMetadata = z.infer<typeof FetchMetadataSchema>;

export const HealthStatusSchema = z
  .object({
    status: z.enum(['healthy', 'degraded', 'unavailable']),
    checkedAt: IsoDateTimeSchema,
    code: z
      .enum([
        'supported',
        'logged_out',
        'unauthorized',
        'collector_failed',
        'normalize_failed',
        'partial_success',
        'unsupported_context',
        'unknown',
      ])
      .optional(),
    reason: z.string().min(1).optional(),
  })
  .strict();
export type HealthStatus = z.infer<typeof HealthStatusSchema>;
