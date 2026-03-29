import Dexie, { type Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { z } from 'zod';
import {
  RESOURCE_NAMES,
  SITE_SYNC_OUTCOMES,
  type ResourceName,
  type SiteSyncOutcome,
} from '@campus-copilot/adapters-base';
import {
  AlertSchema,
  AnnouncementSchema,
  AssignmentSchema,
  CourseSchema,
  EntityKindSchema,
  EntityRefSchema,
  EventSchema,
  FetchModeSchema,
  GradeSchema,
  TimelineEntrySchema,
  IsoDateTimeSchema,
  MessageSchema,
  PriorityReasonSchema,
  SiteSchema,
  type Alert,
  type Announcement,
  type Assignment,
  type Course,
  type Event,
  type Grade,
  type EntityRef,
  type EntityKind,
  type Message,
  type Site,
  type TimelineEntry,
  type PriorityReason,
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
    items: z.array(EntityRefSchema),
  })
  .strict();
export type WeeklyLoadEntry = z.infer<typeof WeeklyLoadEntrySchema>;

const SiteEntityCountsSchema = z
  .object({
    site: SiteSchema,
    courses: z.number().int().nonnegative(),
    assignments: z.number().int().nonnegative(),
    announcements: z.number().int().nonnegative(),
    grades: z.number().int().nonnegative(),
    messages: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    alerts: z.number().int().nonnegative(),
  })
  .strict();
export type SiteEntityCounts = z.infer<typeof SiteEntityCountsSchema>;

const EntityCountsSchema = z
  .object({
    courses: z.number().int().nonnegative(),
    assignments: z.number().int().nonnegative(),
    announcements: z.number().int().nonnegative(),
    messages: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    alerts: z.number().int().nonnegative(),
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
    assignments: z.array(AssignmentSchema),
    announcements: z.array(AnnouncementSchema),
    messages: z.array(MessageSchema),
    grades: z.array(GradeSchema),
    events: z.array(EventSchema),
    alerts: z.array(AlertSchema),
    recentUpdates: RecentUpdatesFeedSchema,
  })
  .strict();
export type WorkbenchView = z.infer<typeof WorkbenchViewSchema>;

export class CampusCopilotDB extends Dexie {
  courses!: Table<Course, string>;
  assignments!: Table<Assignment, string>;
  announcements!: Table<Announcement, string>;
  grades!: Table<Grade, string>;
  messages!: Table<Message, string>;
  events!: Table<Event, string>;
  alerts!: Table<Alert, string>;
  sync_state!: Table<SyncState, string>;
  entity_state!: Table<EntityState, string>;
  local_entity_overlay!: Table<LocalEntityOverlay, string>;
  sync_runs!: Table<SyncRun, string>;
  change_events!: Table<ChangeEvent, string>;

  constructor(name = 'campus-copilot') {
    super(name);
    this.version(1).stores({
      courses: '&id, site, title, code',
      assignments: '&id, site, courseId, dueAt, status',
      announcements: '&id, site, courseId, postedAt',
      messages: '&id, site, courseId, createdAt, unread',
      events: '&id, site, eventKind, startAt, endAt',
      alerts: '&id, site, importance, triggeredAt',
      sync_state: '&key, site, status, lastSyncedAt',
    });
    this.version(2).stores({
      courses: '&id, site, title, code',
      assignments: '&id, site, courseId, dueAt, status',
      announcements: '&id, site, courseId, postedAt',
      grades: '&id, site, courseId, assignmentId, releasedAt, gradedAt',
      messages: '&id, site, courseId, createdAt, unread',
      events: '&id, site, eventKind, startAt, endAt',
      alerts: '&id, site, importance, triggeredAt',
      sync_state: '&key, site, status, lastSyncedAt',
    });
    this.version(3).stores({
      courses: '&id, site, title, code',
      assignments: '&id, site, courseId, dueAt, status',
      announcements: '&id, site, courseId, postedAt',
      grades: '&id, site, courseId, assignmentId, releasedAt, gradedAt',
      messages: '&id, site, courseId, createdAt, unread',
      events: '&id, site, eventKind, startAt, endAt',
      alerts: '&id, site, importance, triggeredAt',
      sync_state: '&key, site, status, lastSyncedAt',
      entity_state: '&key, site, kind, firstSeenAt, lastSyncedAt, seenAt',
    });
    this.version(4).stores({
      courses: '&id, site, title, code',
      assignments: '&id, site, courseId, dueAt, status',
      announcements: '&id, site, courseId, postedAt',
      grades: '&id, site, courseId, assignmentId, releasedAt, gradedAt',
      messages: '&id, site, courseId, createdAt, unread',
      events: '&id, site, eventKind, startAt, endAt',
      alerts: '&id, site, importance, triggeredAt',
      sync_state: '&key, site, status, lastSyncedAt, lastOutcome',
      entity_state: '&key, site, kind, firstSeenAt, lastSyncedAt, seenAt',
    });
    this.version(5).stores({
      courses: '&id, site, title, code',
      assignments: '&id, site, courseId, dueAt, status',
      announcements: '&id, site, courseId, postedAt',
      grades: '&id, site, courseId, assignmentId, releasedAt, gradedAt',
      messages: '&id, site, courseId, createdAt, unread',
      events: '&id, site, eventKind, startAt, endAt',
      alerts: '&id, site, importance, triggeredAt',
      sync_state: '&key, site, status, lastSyncedAt, lastOutcome',
      entity_state: '&key, site, kind, firstSeenAt, lastSyncedAt, seenAt',
      local_entity_overlay: '&entityId, site, kind, updatedAt, pinnedAt, snoozeUntil, dismissUntil',
      sync_runs: '&id, site, completedAt, startedAt, outcome',
      change_events: '&id, runId, site, entityId, changeType, occurredAt',
    });
  }
}

export function createCampusCopilotDb(name?: string) {
  return new CampusCopilotDB(name);
}

export const campusCopilotDb = createCampusCopilotDb();

function parseArray<T>(schema: z.ZodType<T>, records: T[]) {
  return z.array(schema).parse(records);
}

type TrackedEntity = Course | Assignment | Announcement | Grade | Message | Event;

type SiteSnapshotRecords = {
  courses: Course[];
  assignments: Assignment[];
  announcements: Announcement[];
  grades: Grade[];
  messages: Message[];
  events: Event[];
};

export interface SiteSnapshotPayload {
  courses?: Course[];
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

function toTimestamp(value?: string) {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function isWithinHours(value: string | undefined, now: string, hours: number) {
  const target = toTimestamp(value);
  const reference = toTimestamp(now);
  if (target === undefined || reference === undefined) {
    return false;
  }

  const delta = reference - target;
  return delta >= 0 && delta <= hours * 60 * 60 * 1000;
}

function isWithinUpcomingHours(value: string | undefined, now: string, hours: number) {
  const target = toTimestamp(value);
  const reference = toTimestamp(now);
  if (target === undefined || reference === undefined) {
    return false;
  }

  const delta = target - reference;
  return delta >= 0 && delta <= hours * 60 * 60 * 1000;
}

function isPast(value: string | undefined, now: string) {
  const target = toTimestamp(value);
  const reference = toTimestamp(now);
  if (target === undefined || reference === undefined) {
    return false;
  }

  return target < reference;
}

function toEntityRef(entity: TrackedEntity): EntityRef {
  return EntityRefSchema.parse({
    id: entity.id,
    kind: entity.kind,
    site: entity.site,
  });
}

function buildEntityStates(entities: TrackedEntity[], syncedAt: string, existingStates: Array<EntityState | undefined>) {
  return entities.map((entity, index) =>
    EntityStateSchema.parse({
      key: entity.id,
      entityId: entity.id,
      site: entity.site,
      kind: entity.kind,
      firstSeenAt: existingStates[index]?.firstSeenAt ?? syncedAt,
      lastSyncedAt: syncedAt,
      seenAt: existingStates[index]?.seenAt,
    }),
  );
}

function compareNewest(left: string | undefined, right: string | undefined) {
  return (toTimestamp(right) ?? 0) - (toTimestamp(left) ?? 0);
}

function compareOldest(left: string | undefined, right: string | undefined) {
  return (toTimestamp(left) ?? Number.POSITIVE_INFINITY) - (toTimestamp(right) ?? Number.POSITIVE_INFINITY);
}

function buildEmptySiteSnapshot(): SiteSnapshotRecords {
  return {
    courses: [],
    assignments: [],
    announcements: [],
    grades: [],
    messages: [],
    events: [],
  };
}

function parseSiteSnapshotPayload(payload: SiteSnapshotPayload): SiteSnapshotRecords {
  return {
    courses: parseArray(CourseSchema, payload.courses ?? []),
    assignments: parseArray(AssignmentSchema, payload.assignments ?? []),
    announcements: parseArray(AnnouncementSchema, payload.announcements ?? []),
    grades: parseArray(GradeSchema, payload.grades ?? []),
    messages: parseArray(MessageSchema, payload.messages ?? []),
    events: parseArray(EventSchema, payload.events ?? []),
  };
}

function sanitizeNote(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function hasOverlayContent(input: {
  pinnedAt?: string;
  snoozeUntil?: string;
  dismissUntil?: string;
  note?: string;
}) {
  return Boolean(input.pinnedAt || input.snoozeUntil || input.dismissUntil || input.note);
}

function normalizeOverlay(
  existing: LocalEntityOverlay | undefined,
  input: LocalEntityOverlayInput,
): LocalEntityOverlay | undefined {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const nextOverlay = {
    entityId: input.entityId,
    site: input.site,
    kind: input.kind,
    pinnedAt: input.pinnedAt === null ? undefined : input.pinnedAt ?? existing?.pinnedAt,
    snoozeUntil: input.snoozeUntil === null ? undefined : input.snoozeUntil ?? existing?.snoozeUntil,
    dismissUntil: input.dismissUntil === null ? undefined : input.dismissUntil ?? existing?.dismissUntil,
    note: input.note === null ? undefined : sanitizeNote(input.note ?? existing?.note),
    updatedAt,
  };

  if (!hasOverlayContent(nextOverlay)) {
    return undefined;
  }

  return LocalEntityOverlaySchema.parse(nextOverlay);
}

function makePriorityReason(
  code: PriorityReason['code'],
  label: string,
  importance: PriorityReason['importance'],
  relatedEntity?: EntityRef,
  detail?: string,
) {
  return PriorityReasonSchema.parse({
    code,
    label,
    importance,
    relatedEntity,
    detail,
  });
}

function isOverlayDismissed(overlay: LocalEntityOverlay | undefined, now: string) {
  return Boolean(overlay?.dismissUntil && !isPast(overlay.dismissUntil, now));
}

function isOverlaySnoozed(overlay: LocalEntityOverlay | undefined, now: string) {
  return Boolean(overlay?.snoozeUntil && !isPast(overlay.snoozeUntil, now));
}

function isAssignmentOpen(assignment: Assignment) {
  return assignment.status !== 'submitted' && assignment.status !== 'graded';
}

function toDateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function startOfUtcDay(value: string, offsetDays = 0) {
  const day = new Date(value);
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() + offsetDays);
  return day;
}

function endOfUtcDay(value: Date) {
  const day = new Date(value.getTime());
  day.setUTCHours(23, 59, 59, 999);
  return day;
}

function getEntityTitle(entity: TrackedEntity) {
  return entity.title;
}

function makeSyncRunId(site: Site, startedAt: string, completedAt: string) {
  return `sync-run:${site}:${startedAt}:${completedAt}`;
}

function makeChangeEventId(runId: string, changeType: ChangeEventType, suffix: string) {
  return `${runId}:${changeType}:${suffix}`;
}

function summarizeResourceFailures(resourceFailures?: SyncResourceFailure[]) {
  const resources = (resourceFailures ?? []).map((failure) => failure.resource);
  return resources.length > 0 ? resources.join(' / ') : '部分资源';
}

function buildGenericCreatedEvent(runId: string, entity: TrackedEntity, occurredAt: string): ChangeEvent {
  return ChangeEventSchema.parse({
    id: makeChangeEventId(runId, 'created', entity.id),
    runId,
    site: entity.site,
    changeType: 'created',
    occurredAt,
    entityId: entity.id,
    entityKind: entity.kind,
    relatedEntity: toEntityRef(entity),
    title: `${getEntityTitle(entity)} 新增`,
    summary: `${entity.kind} 已进入本地快照。`,
  });
}

function buildGenericRemovedEvent(runId: string, entity: TrackedEntity, occurredAt: string): ChangeEvent {
  return ChangeEventSchema.parse({
    id: makeChangeEventId(runId, 'removed', entity.id),
    runId,
    site: entity.site,
    changeType: 'removed',
    occurredAt,
    entityId: entity.id,
    entityKind: entity.kind,
    relatedEntity: toEntityRef(entity),
    title: `${getEntityTitle(entity)} 已移除`,
    summary: `${entity.kind} 不再出现在最新快照里。`,
  });
}

function buildAssignmentChangeEvents(
  runId: string,
  occurredAt: string,
  previousRecords: Assignment[],
  nextRecords: Assignment[],
) {
  const events: ChangeEvent[] = [];
  const previousMap = new Map(previousRecords.map((record) => [record.id, record]));
  const nextMap = new Map(nextRecords.map((record) => [record.id, record]));

  for (const record of nextRecords) {
    const previous = previousMap.get(record.id);
    if (!previous) {
      events.push(buildGenericCreatedEvent(runId, record, occurredAt));
      continue;
    }

    if (previous.status !== record.status) {
      events.push(
        ChangeEventSchema.parse({
          id: makeChangeEventId(runId, 'status_changed', record.id),
          runId,
          site: record.site,
          changeType: 'status_changed',
          occurredAt,
          entityId: record.id,
          entityKind: record.kind,
          relatedEntity: toEntityRef(record),
          title: `${record.title} 状态变化`,
          summary: `状态从 ${previous.status} 变为 ${record.status}。`,
          previousValue: previous.status,
          nextValue: record.status,
        }),
      );
    }

    if ((previous.dueAt ?? '') !== (record.dueAt ?? '')) {
      events.push(
        ChangeEventSchema.parse({
          id: makeChangeEventId(runId, 'due_changed', record.id),
          runId,
          site: record.site,
          changeType: 'due_changed',
          occurredAt,
          entityId: record.id,
          entityKind: record.kind,
          relatedEntity: toEntityRef(record),
          title: `${record.title} 截止时间变化`,
          summary: `截止时间从 ${previous.dueAt ?? '未设置'} 变为 ${record.dueAt ?? '未设置'}。`,
          previousValue: previous.dueAt,
          nextValue: record.dueAt,
        }),
      );
    }
  }

  for (const record of previousRecords) {
    if (!nextMap.has(record.id)) {
      events.push(buildGenericRemovedEvent(runId, record, occurredAt));
    }
  }

  return events;
}

function buildGradeChangeEvents(runId: string, occurredAt: string, previousRecords: Grade[], nextRecords: Grade[]) {
  const events: ChangeEvent[] = [];
  const previousMap = new Map(previousRecords.map((record) => [record.id, record]));
  const nextMap = new Map(nextRecords.map((record) => [record.id, record]));

  for (const record of nextRecords) {
    const previous = previousMap.get(record.id);
    const currentValue = `${record.score ?? '-'} / ${record.maxScore ?? '-'}`;
    const previousValue = previous ? `${previous.score ?? '-'} / ${previous.maxScore ?? '-'}` : undefined;
    const gradeChanged =
      !previous ||
      previous.score !== record.score ||
      previous.maxScore !== record.maxScore ||
      (previous.releasedAt ?? previous.gradedAt ?? '') !== (record.releasedAt ?? record.gradedAt ?? '');

    if (gradeChanged) {
      events.push(
        ChangeEventSchema.parse({
          id: makeChangeEventId(runId, 'grade_released', record.id),
          runId,
          site: record.site,
          changeType: 'grade_released',
          occurredAt,
          entityId: record.id,
          entityKind: record.kind,
          relatedEntity: toEntityRef(record),
          title: `${record.title} 有新的成绩信息`,
          summary: `当前成绩为 ${currentValue}。`,
          previousValue,
          nextValue: currentValue,
        }),
      );
    }
  }

  for (const record of previousRecords) {
    if (!nextMap.has(record.id)) {
      events.push(buildGenericRemovedEvent(runId, record, occurredAt));
    }
  }

  return events;
}

function buildMessageChangeEvents(runId: string, occurredAt: string, previousRecords: Message[], nextRecords: Message[]) {
  const events: ChangeEvent[] = [];
  const previousMap = new Map(previousRecords.map((record) => [record.id, record]));
  const nextMap = new Map(nextRecords.map((record) => [record.id, record]));

  for (const record of nextRecords) {
    const previous = previousMap.get(record.id);
    if (!previous && record.unread) {
      events.push(
        ChangeEventSchema.parse({
          id: makeChangeEventId(runId, 'message_unread', record.id),
          runId,
          site: record.site,
          changeType: 'message_unread',
          occurredAt,
          entityId: record.id,
          entityKind: record.kind,
          relatedEntity: toEntityRef(record),
          title: record.title ?? '新的未读讨论',
          summary: '这条讨论在最新同步后处于未读状态。',
          nextValue: 'unread',
        }),
      );
      continue;
    }

    if (!previous) {
      events.push(buildGenericCreatedEvent(runId, record, occurredAt));
      continue;
    }

    if (!previous.unread && record.unread) {
      events.push(
        ChangeEventSchema.parse({
          id: makeChangeEventId(runId, 'message_unread', record.id),
          runId,
          site: record.site,
          changeType: 'message_unread',
          occurredAt,
          entityId: record.id,
          entityKind: record.kind,
          relatedEntity: toEntityRef(record),
          title: record.title ?? '新的未读讨论',
          summary: '这条讨论从已读变成了未读。',
          previousValue: previous.unread ? 'unread' : 'read',
          nextValue: 'unread',
        }),
      );
    }
  }

  for (const record of previousRecords) {
    if (!nextMap.has(record.id)) {
      events.push(buildGenericRemovedEvent(runId, record, occurredAt));
    }
  }

  return events;
}

function buildSimpleEntityChangeEvents<T extends Course | Announcement | Event>(
  runId: string,
  occurredAt: string,
  previousRecords: T[],
  nextRecords: T[],
) {
  const events: ChangeEvent[] = [];
  const previousMap = new Map(previousRecords.map((record) => [record.id, record]));
  const nextMap = new Map(nextRecords.map((record) => [record.id, record]));

  for (const record of nextRecords) {
    if (!previousMap.has(record.id)) {
      events.push(buildGenericCreatedEvent(runId, record, occurredAt));
    }
  }

  for (const record of previousRecords) {
    if (!nextMap.has(record.id)) {
      events.push(buildGenericRemovedEvent(runId, record, occurredAt));
    }
  }

  return events;
}

function buildChangeEvents(
  site: Site,
  runId: string,
  occurredAt: string,
  previousSnapshot: SiteSnapshotRecords,
  nextSnapshot: SiteSnapshotRecords,
  syncState: SyncState,
) {
  const events: ChangeEvent[] = [];

  events.push(...buildSimpleEntityChangeEvents(runId, occurredAt, previousSnapshot.courses, nextSnapshot.courses));
  events.push(...buildAssignmentChangeEvents(runId, occurredAt, previousSnapshot.assignments, nextSnapshot.assignments));
  events.push(
    ...buildSimpleEntityChangeEvents(runId, occurredAt, previousSnapshot.announcements, nextSnapshot.announcements),
  );
  events.push(...buildGradeChangeEvents(runId, occurredAt, previousSnapshot.grades, nextSnapshot.grades));
  events.push(...buildMessageChangeEvents(runId, occurredAt, previousSnapshot.messages, nextSnapshot.messages));
  events.push(...buildSimpleEntityChangeEvents(runId, occurredAt, previousSnapshot.events, nextSnapshot.events));

  if (syncState.lastOutcome === 'partial_success') {
    events.push(
      ChangeEventSchema.parse({
        id: makeChangeEventId(runId, 'sync_partial', site),
        runId,
        site,
        changeType: 'sync_partial',
        occurredAt,
        title: `${site} 同步部分成功`,
        summary: `成功写入的内容已更新，但 ${summarizeResourceFailures(syncState.resourceFailures)} 仍有缺口。`,
        nextValue: summarizeResourceFailures(syncState.resourceFailures),
      }),
    );
  }

  return events.sort((left, right) => compareNewest(left.occurredAt, right.occurredAt));
}

function matchesSiteFilter<T extends { site: Site }>(records: T[], site: WorkbenchFilter['site']) {
  return site === 'all' ? records : records.filter((record) => record.site === site);
}

function isEntryUnseen(entry: TimelineEntry, stateMap: Map<string, EntityState>) {
  const entityId = entry.relatedEntities[0]?.id;
  if (!entityId) {
    return true;
  }

  const state = stateMap.get(entityId);
  if (!state?.seenAt) {
    return true;
  }

  const seenAt = toTimestamp(state.seenAt);
  const occurredAt = toTimestamp(entry.occurredAt);
  return seenAt === undefined || occurredAt === undefined ? true : seenAt < occurredAt;
}

function buildRecentChangeMap(changeEvents: ChangeEvent[]) {
  const map = new Map<string, ChangeEvent>();
  for (const event of changeEvents) {
    if (event.entityId && !map.has(event.entityId)) {
      map.set(event.entityId, event);
    }
  }
  return map;
}

function buildAssignmentFocusItem(
  assignment: Assignment,
  overlay: LocalEntityOverlay | undefined,
  now: string,
  recentChangeEvent: ChangeEvent | undefined,
) {
  if (!isAssignmentOpen(assignment)) {
    return undefined;
  }
  if (isOverlayDismissed(overlay, now)) {
    return undefined;
  }
  if (isOverlaySnoozed(overlay, now) && !overlay?.pinnedAt) {
    return undefined;
  }

  const entityRef = toEntityRef(assignment);
  const reasons: PriorityReason[] = [];
  let score = 0;

  if (overlay?.pinnedAt) {
    reasons.push(makePriorityReason('manual', '你已手动置顶', 'high', entityRef));
    score += 120;
  }

  if (assignment.dueAt && isPast(assignment.dueAt, now)) {
    reasons.push(makePriorityReason('overdue', '截止时间已过', 'critical', entityRef));
    score += assignment.status === 'missing' ? 260 : 230;
  } else if (assignment.dueAt && isWithinUpcomingHours(assignment.dueAt, now, 48)) {
    const importance = assignment.status === 'missing' ? 'critical' : 'high';
    reasons.push(makePriorityReason('due_soon', '48 小时内到期', importance, entityRef));
    score += assignment.status === 'missing' ? 210 : 180;
  } else if (assignment.dueAt && isWithinUpcomingHours(assignment.dueAt, now, 24 * 7)) {
    reasons.push(makePriorityReason('due_soon', '本周内到期', 'medium', entityRef));
    score += 90;
  }

  if (recentChangeEvent) {
    reasons.push(makePriorityReason('recently_updated', '最近同步里有变化', 'medium', entityRef));
    score += 25;
  }

  if (reasons.length === 0) {
    return undefined;
  }

  return FocusQueueItemSchema.parse({
    id: `focus:${assignment.id}`,
    entityId: assignment.id,
    entityRef,
    entity: entityRef,
    kind: assignment.kind,
    site: assignment.site,
    title: assignment.title,
    score,
    reasons,
    dueAt: assignment.dueAt,
    updatedAt: overlay?.updatedAt ?? assignment.updatedAt ?? assignment.createdAt,
    pinned: Boolean(overlay?.pinnedAt),
    note: overlay?.note,
    blockedBy: [],
  });
}

function buildAnnouncementFocusItem(
  announcement: Announcement,
  overlay: LocalEntityOverlay | undefined,
  now: string,
  recentChangeEvent: ChangeEvent | undefined,
) {
  if (isOverlayDismissed(overlay, now)) {
    return undefined;
  }
  if (isOverlaySnoozed(overlay, now) && !overlay?.pinnedAt) {
    return undefined;
  }

  const entityRef = toEntityRef(announcement);
  const reasons: PriorityReason[] = [];
  let score = 0;

  if (overlay?.pinnedAt) {
    reasons.push(makePriorityReason('manual', '你已手动置顶', 'high', entityRef));
    score += 120;
  }
  if (isWithinHours(announcement.postedAt, now, 48)) {
    reasons.push(makePriorityReason('important_announcement', '最近有新公告', 'medium', entityRef));
    score += 80;
  }
  if (recentChangeEvent) {
    reasons.push(makePriorityReason('recently_updated', '最近同步里有变化', 'medium', entityRef));
    score += 20;
  }

  if (reasons.length === 0) {
    return undefined;
  }

  return FocusQueueItemSchema.parse({
    id: `focus:${announcement.id}`,
    entityId: announcement.id,
    entityRef,
    entity: entityRef,
    kind: announcement.kind,
    site: announcement.site,
    title: announcement.title,
    score,
    reasons,
    updatedAt: overlay?.updatedAt ?? announcement.postedAt,
    pinned: Boolean(overlay?.pinnedAt),
    note: overlay?.note,
    blockedBy: [],
  });
}

function buildMessageFocusItem(
  message: Message,
  overlay: LocalEntityOverlay | undefined,
  now: string,
  recentChangeEvent: ChangeEvent | undefined,
) {
  if (isOverlayDismissed(overlay, now)) {
    return undefined;
  }
  if (isOverlaySnoozed(overlay, now) && !overlay?.pinnedAt) {
    return undefined;
  }

  const entityRef = toEntityRef(message);
  const reasons: PriorityReason[] = [];
  let score = 0;

  if (overlay?.pinnedAt) {
    reasons.push(makePriorityReason('manual', '你已手动置顶', 'high', entityRef));
    score += 120;
  }
  if (message.instructorAuthored && isWithinHours(message.createdAt, now, 72)) {
    reasons.push(makePriorityReason('important_announcement', '老师最近有新动态', 'high', entityRef));
    score += 150;
  } else if (message.unread && isWithinHours(message.createdAt, now, 72)) {
    reasons.push(makePriorityReason('unread_activity', '近期有未读讨论', 'medium', entityRef));
    score += 110;
  }
  if (recentChangeEvent) {
    reasons.push(makePriorityReason('recently_updated', '最近同步里有变化', 'medium', entityRef));
    score += 20;
  }

  if (reasons.length === 0) {
    return undefined;
  }

  return FocusQueueItemSchema.parse({
    id: `focus:${message.id}`,
    entityId: message.id,
    entityRef,
    entity: entityRef,
    kind: message.kind,
    site: message.site,
    title: message.title ?? '讨论区新动态',
    score,
    reasons,
    updatedAt: overlay?.updatedAt ?? message.createdAt,
    pinned: Boolean(overlay?.pinnedAt),
    note: overlay?.note,
    blockedBy: [],
  });
}

function buildGradeFocusItem(
  grade: Grade,
  overlay: LocalEntityOverlay | undefined,
  now: string,
  recentChangeEvent: ChangeEvent | undefined,
) {
  if (isOverlayDismissed(overlay, now)) {
    return undefined;
  }
  if (isOverlaySnoozed(overlay, now) && !overlay?.pinnedAt) {
    return undefined;
  }

  const entityRef = toEntityRef(grade);
  const reasons: PriorityReason[] = [];
  let score = 0;

  if (overlay?.pinnedAt) {
    reasons.push(makePriorityReason('manual', '你已手动置顶', 'high', entityRef));
    score += 120;
  }
  if (isWithinHours(grade.releasedAt ?? grade.gradedAt, now, 24 * 7)) {
    reasons.push(makePriorityReason('new_grade', '最近出了新成绩', 'medium', entityRef));
    score += 100;
  }
  if (recentChangeEvent) {
    reasons.push(makePriorityReason('recently_updated', '最近同步里有变化', 'medium', entityRef));
    score += 20;
  }

  if (reasons.length === 0) {
    return undefined;
  }

  return FocusQueueItemSchema.parse({
    id: `focus:${grade.id}`,
    entityId: grade.id,
    entityRef,
    entity: entityRef,
    kind: grade.kind,
    site: grade.site,
    title: grade.title,
    score,
    reasons,
    updatedAt: overlay?.updatedAt ?? grade.releasedAt ?? grade.gradedAt,
    pinned: Boolean(overlay?.pinnedAt),
    note: overlay?.note,
    blockedBy: [],
  });
}

function buildSyncFocusItem(syncState: SyncState, now: string) {
  if (syncState.status !== 'error' && syncState.lastOutcome !== 'partial_success') {
    return undefined;
  }

  const blockedBy = (syncState.resourceFailures ?? []).map((item) => item.resource);
  const importance = syncState.lastOutcome === 'partial_success' ? 'low' : 'medium';
  const score = syncState.lastOutcome === 'partial_success' ? 70 : 130;
  const label = syncState.lastOutcome === 'partial_success' ? '同步部分成功' : '同步状态异常';
  const title =
    syncState.lastOutcome === 'partial_success'
      ? `${syncState.site} 有部分资源未同步`
      : `${syncState.site} 最近一次同步失败`;

  return FocusQueueItemSchema.parse({
    id: `focus:sync:${syncState.site}`,
    kind: 'sync_state',
    site: syncState.site,
    title,
    score,
    reasons: [makePriorityReason('sync_stale', label, importance)],
    blockedBy,
    updatedAt: syncState.lastSyncedAt ?? now,
    pinned: false,
  });
}

function compareFocusQueueItems(left: FocusQueueItem, right: FocusQueueItem) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  if ((left.pinned ? 1 : 0) !== (right.pinned ? 1 : 0)) {
    return (right.pinned ? 1 : 0) - (left.pinned ? 1 : 0);
  }
  const dueComparison = compareOldest(left.dueAt, right.dueAt);
  if (dueComparison !== 0) {
    return dueComparison;
  }
  const updatedComparison = compareNewest(left.updatedAt, right.updatedAt);
  if (updatedComparison !== 0) {
    return updatedComparison;
  }
  return left.title.localeCompare(right.title);
}

export async function putCourses(records: Course[], db = campusCopilotDb) {
  await db.courses.bulkPut(parseArray(CourseSchema, records));
}

export async function putAssignments(records: Assignment[], db = campusCopilotDb) {
  await db.assignments.bulkPut(parseArray(AssignmentSchema, records));
}

export async function putAnnouncements(records: Announcement[], db = campusCopilotDb) {
  await db.announcements.bulkPut(parseArray(AnnouncementSchema, records));
}

export async function putGrades(records: Grade[], db = campusCopilotDb) {
  await db.grades.bulkPut(parseArray(GradeSchema, records));
}

export async function putMessages(records: Message[], db = campusCopilotDb) {
  await db.messages.bulkPut(parseArray(MessageSchema, records));
}

export async function putEvents(records: Event[], db = campusCopilotDb) {
  await db.events.bulkPut(parseArray(EventSchema, records));
}

export async function putAlerts(records: Alert[], db = campusCopilotDb) {
  await db.alerts.bulkPut(parseArray(AlertSchema, records));
}

export async function putSyncState(record: SyncState, db = campusCopilotDb) {
  await db.sync_state.put(SyncStateSchema.parse(record));
}

export async function upsertLocalEntityOverlay(input: LocalEntityOverlayInput, db = campusCopilotDb) {
  const parsedInput = LocalEntityOverlayInputSchema.parse(input);
  const existing = await db.local_entity_overlay.get(parsedInput.entityId);
  const nextOverlay = normalizeOverlay(existing, parsedInput);

  if (!nextOverlay) {
    await db.local_entity_overlay.delete(parsedInput.entityId);
    return undefined;
  }

  await db.local_entity_overlay.put(nextOverlay);
  return nextOverlay;
}

export async function clearLocalEntityOverlayField(
  entityId: string,
  field: LocalEntityOverlayField,
  db = campusCopilotDb,
) {
  const parsedField = LocalEntityOverlayFieldSchema.parse(field);
  const existing = await db.local_entity_overlay.get(entityId);
  if (!existing) {
    return undefined;
  }

  const nextOverlay = normalizeOverlay(existing, {
    entityId: existing.entityId,
    site: existing.site,
    kind: existing.kind,
    [parsedField]: null,
    updatedAt: new Date().toISOString(),
  });

  if (!nextOverlay) {
    await db.local_entity_overlay.delete(entityId);
    return undefined;
  }

  await db.local_entity_overlay.put(nextOverlay);
  return nextOverlay;
}

export async function pinEntity(
  entity: Pick<LocalEntityOverlayInput, 'entityId' | 'site' | 'kind'>,
  pinned: boolean,
  db = campusCopilotDb,
) {
  return upsertLocalEntityOverlay(
    {
      ...entity,
      pinnedAt: pinned ? new Date().toISOString() : null,
    },
    db,
  );
}

export async function snoozeEntity(
  entity: Pick<LocalEntityOverlayInput, 'entityId' | 'site' | 'kind'>,
  snoozeUntil: string | undefined,
  db = campusCopilotDb,
) {
  return upsertLocalEntityOverlay(
    {
      ...entity,
      snoozeUntil: snoozeUntil ?? null,
    },
    db,
  );
}

export async function dismissEntity(
  entity: Pick<LocalEntityOverlayInput, 'entityId' | 'site' | 'kind'>,
  dismissUntil: string | undefined,
  db = campusCopilotDb,
) {
  return upsertLocalEntityOverlay(
    {
      ...entity,
      dismissUntil: dismissUntil ?? null,
    },
    db,
  );
}

export async function saveEntityNote(
  entity: Pick<LocalEntityOverlayInput, 'entityId' | 'site' | 'kind'>,
  note: string | undefined,
  db = campusCopilotDb,
) {
  return upsertLocalEntityOverlay(
    {
      ...entity,
      note: note ?? null,
    },
    db,
  );
}

export async function getLocalEntityOverlayByEntityIds(entityIds: string[], db = campusCopilotDb) {
  const overlays = entityIds.length > 0 ? await db.local_entity_overlay.bulkGet(entityIds) : [];
  return overlays.filter((overlay): overlay is LocalEntityOverlay => Boolean(overlay));
}

async function readExistingSiteSnapshot(site: Site, payload: SiteSnapshotPayload, db: CampusCopilotDB) {
  const existingSnapshot = buildEmptySiteSnapshot();

  if (Object.prototype.hasOwnProperty.call(payload, 'courses')) {
    existingSnapshot.courses = await db.courses.where('site').equals(site).toArray();
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'assignments')) {
    existingSnapshot.assignments = await db.assignments.where('site').equals(site).toArray();
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'announcements')) {
    existingSnapshot.announcements = await db.announcements.where('site').equals(site).toArray();
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'grades')) {
    existingSnapshot.grades = await db.grades.where('site').equals(site).toArray();
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'messages')) {
    existingSnapshot.messages = await db.messages.where('site').equals(site).toArray();
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'events')) {
    existingSnapshot.events = await db.events.where('site').equals(site).toArray();
  }

  return existingSnapshot;
}

export async function applySiteSnapshotWithLedger(
  site: Site,
  payload: SiteSnapshotPayload,
  syncState: Omit<SyncState, 'key' | 'site'>,
  options: ApplySiteSnapshotWithLedgerOptions = {},
  db = campusCopilotDb,
) {
  const hasCourses = Object.prototype.hasOwnProperty.call(payload, 'courses');
  const hasAssignments = Object.prototype.hasOwnProperty.call(payload, 'assignments');
  const hasAnnouncements = Object.prototype.hasOwnProperty.call(payload, 'announcements');
  const hasGrades = Object.prototype.hasOwnProperty.call(payload, 'grades');
  const hasMessages = Object.prototype.hasOwnProperty.call(payload, 'messages');
  const hasEvents = Object.prototype.hasOwnProperty.call(payload, 'events');

  const parsedPayload = parseSiteSnapshotPayload(payload);
  const parsedSyncState = SyncStateSchema.parse({
    key: site,
    site,
    ...syncState,
  });
  const trackedEntities: TrackedEntity[] = [
    ...parsedPayload.courses,
    ...parsedPayload.assignments,
    ...parsedPayload.announcements,
    ...parsedPayload.grades,
    ...parsedPayload.messages,
    ...parsedPayload.events,
  ];
  const completedAt = parsedSyncState.lastSyncedAt ?? new Date().toISOString();
  const startedAt = options.startedAt ?? completedAt;
  const runId = options.runId ?? makeSyncRunId(site, startedAt, completedAt);

  return db.transaction(
    'rw',
    [
      db.courses,
      db.assignments,
      db.announcements,
      db.grades,
      db.messages,
      db.events,
      db.sync_state,
      db.entity_state,
      db.sync_runs,
      db.change_events,
    ],
    async () => {
      const existingSnapshot = await readExistingSiteSnapshot(site, payload, db);
      const changeEvents = buildChangeEvents(site, runId, completedAt, existingSnapshot, parsedPayload, parsedSyncState);

      if (hasCourses) {
        await db.courses.where('site').equals(site).delete();
      }
      if (hasAssignments) {
        await db.assignments.where('site').equals(site).delete();
      }
      if (hasAnnouncements) {
        await db.announcements.where('site').equals(site).delete();
      }
      if (hasGrades) {
        await db.grades.where('site').equals(site).delete();
      }
      if (hasMessages) {
        await db.messages.where('site').equals(site).delete();
      }
      if (hasEvents) {
        await db.events.where('site').equals(site).delete();
      }

      if (hasCourses && parsedPayload.courses.length > 0) {
        await db.courses.bulkPut(parsedPayload.courses);
      }
      if (hasAssignments && parsedPayload.assignments.length > 0) {
        await db.assignments.bulkPut(parsedPayload.assignments);
      }
      if (hasAnnouncements && parsedPayload.announcements.length > 0) {
        await db.announcements.bulkPut(parsedPayload.announcements);
      }
      if (hasGrades && parsedPayload.grades.length > 0) {
        await db.grades.bulkPut(parsedPayload.grades);
      }
      if (hasMessages && parsedPayload.messages.length > 0) {
        await db.messages.bulkPut(parsedPayload.messages);
      }
      if (hasEvents && parsedPayload.events.length > 0) {
        await db.events.bulkPut(parsedPayload.events);
      }

      const existingStates = trackedEntities.length > 0 ? await db.entity_state.bulkGet(trackedEntities.map((entity) => entity.id)) : [];
      const nextStates = buildEntityStates(trackedEntities, completedAt, existingStates);
      if (nextStates.length > 0) {
        await db.entity_state.bulkPut(nextStates);
      }

      await db.sync_state.put(parsedSyncState);

      const syncRun = SyncRunSchema.parse({
        id: runId,
        site,
        startedAt,
        completedAt,
        status: 'success',
        outcome: parsedSyncState.lastOutcome ?? 'success',
        changeCount: changeEvents.length,
        errorReason: parsedSyncState.errorReason,
        resourceFailures: parsedSyncState.resourceFailures,
      });
      await db.sync_runs.put(syncRun);

      if (changeEvents.length > 0) {
        await db.change_events.bulkPut(changeEvents);
      }

      return {
        syncRun,
        changeEvents,
      };
    },
  );
}

export async function replaceSiteSnapshot(
  site: Site,
  payload: SiteSnapshotPayload,
  syncState: Omit<SyncState, 'key' | 'site'>,
  db = campusCopilotDb,
) {
  return applySiteSnapshotWithLedger(site, payload, syncState, {}, db);
}

export async function recordSiteSyncError(
  site: Site,
  errorReason: string,
  syncedAt: string,
  lastOutcome: Exclude<SiteSyncOutcome, 'success' | 'partial_success'> = 'request_failed',
  resourceFailures: SyncResourceFailure[] | undefined = undefined,
  db = campusCopilotDb,
) {
  const syncState = SyncStateSchema.parse({
    key: site,
    site,
    status: 'error',
    lastSyncedAt: syncedAt,
    lastOutcome,
    errorReason,
    resourceFailures,
  });
  const syncRun = SyncRunSchema.parse({
    id: makeSyncRunId(site, syncedAt, syncedAt),
    site,
    startedAt: syncedAt,
    completedAt: syncedAt,
    status: 'error',
    outcome: lastOutcome,
    changeCount: 0,
    errorReason,
    resourceFailures,
  });

  await db.transaction('rw', [db.sync_state, db.sync_runs], async () => {
    await db.sync_state.put(syncState);
    await db.sync_runs.put(syncRun);
  });
}

export async function getEntityCounts(db = campusCopilotDb): Promise<EntityCounts> {
  return EntityCountsSchema.parse({
    courses: await db.courses.count(),
    assignments: await db.assignments.count(),
    announcements: await db.announcements.count(),
    messages: await db.messages.count(),
    events: await db.events.count(),
    alerts: await db.alerts.count(),
  });
}

export async function getAssignmentsBySite(site: Site, db = campusCopilotDb) {
  return db.assignments.where('site').equals(site).sortBy('dueAt');
}

export async function getLatestSyncState(db = campusCopilotDb) {
  const states = await db.sync_state.toArray();
  return states
    .filter((state) => state.lastSyncedAt)
    .sort((left, right) => {
      return (right.lastSyncedAt ?? '').localeCompare(left.lastSyncedAt ?? '');
    })[0];
}

export async function getSyncStateBySite(site: Site, db = campusCopilotDb) {
  return db.sync_state.get(site);
}

export async function getLatestSyncRuns(limit = 8, db = campusCopilotDb) {
  const runs = await db.sync_runs.orderBy('completedAt').reverse().limit(limit).toArray();
  return runs.map((run) => SyncRunSchema.parse(run));
}

export async function getLatestSyncRunBySite(site: Site, db = campusCopilotDb) {
  const runs = await db.sync_runs.where('site').equals(site).toArray();
  const latestRun = runs.sort((left, right) => compareNewest(left.completedAt, right.completedAt))[0];
  return latestRun ? SyncRunSchema.parse(latestRun) : undefined;
}

export async function getRecentChangeEvents(limit = 20, db = campusCopilotDb) {
  const events = await db.change_events.orderBy('occurredAt').reverse().limit(limit).toArray();
  return events.map((event) => ChangeEventSchema.parse(event));
}

export async function getSiteEntityCounts(site: Site, db = campusCopilotDb): Promise<SiteEntityCounts> {
  return SiteEntityCountsSchema.parse({
    site,
    courses: await db.courses.where('site').equals(site).count(),
    assignments: await db.assignments.where('site').equals(site).count(),
    announcements: await db.announcements.where('site').equals(site).count(),
    grades: await db.grades.where('site').equals(site).count(),
    messages: await db.messages.where('site').equals(site).count(),
    events: await db.events.where('site').equals(site).count(),
    alerts: await db.alerts.where('site').equals(site).count(),
  });
}

export async function getAllSiteEntityCounts(db = campusCopilotDb): Promise<SiteEntityCounts[]> {
  const sites = SiteSchema.options;
  return Promise.all(sites.map((site) => getSiteEntityCounts(site, db)));
}

export async function getSiteSyncStates(db = campusCopilotDb) {
  return db.sync_state.toArray();
}

export async function getAllAssignments(db = campusCopilotDb) {
  const assignments = await db.assignments.toArray();
  return assignments.sort((left, right) => compareNewest(left.dueAt, right.dueAt));
}

export async function getAllAnnouncements(db = campusCopilotDb) {
  const announcements = await db.announcements.toArray();
  return announcements.sort((left, right) => compareNewest(left.postedAt, right.postedAt));
}

export async function getAllMessages(db = campusCopilotDb) {
  const messages = await db.messages.toArray();
  return messages.sort((left, right) => compareNewest(left.createdAt, right.createdAt));
}

export async function getAllGrades(db = campusCopilotDb) {
  const grades = await db.grades.toArray();
  return grades.sort((left, right) => compareNewest(left.releasedAt ?? left.gradedAt, right.releasedAt ?? right.gradedAt));
}

export async function getAllEvents(db = campusCopilotDb) {
  const events = await db.events.toArray();
  return events.sort((left, right) => compareNewest(left.startAt ?? left.endAt, right.startAt ?? right.endAt));
}

export async function markEntitiesSeen(entityIds: string[], seenAt: string, db = campusCopilotDb) {
  if (entityIds.length === 0) {
    return;
  }

  const states = await db.entity_state.bulkGet(entityIds);
  const updates = states
    .filter((state): state is EntityState => Boolean(state))
    .map((state) =>
      EntityStateSchema.parse({
        ...state,
        seenAt,
      }),
    );

  if (updates.length > 0) {
    await db.entity_state.bulkPut(updates);
  }
}

export async function getPriorityAlerts(now: string, db = campusCopilotDb): Promise<Alert[]> {
  const [assignments, announcements, messages, grades, syncStates] = await Promise.all([
    db.assignments.toArray(),
    db.announcements.toArray(),
    db.messages.toArray(),
    db.grades.toArray(),
    db.sync_state.toArray(),
  ]);

  const alerts: Alert[] = [];

  for (const assignment of assignments) {
    if (!isAssignmentOpen(assignment)) {
      continue;
    }

    if (assignment.dueAt && isPast(assignment.dueAt, now)) {
      alerts.push(
        AlertSchema.parse({
          id: `derived:alert:${assignment.id}:overdue`,
          kind: 'alert',
          site: assignment.site,
          source: {
            site: assignment.site,
            resourceId: assignment.id,
            resourceType: 'derived_alert',
          },
          alertKind: 'overdue',
          title: `${assignment.title} 已逾期`,
          summary: '这个任务已经过了截止时间，应该被优先处理。',
          importance: 'critical',
          relatedEntities: [toEntityRef(assignment)],
          triggeredAt: now,
          reasons: [
            makePriorityReason('overdue', '截止时间已过', 'critical', toEntityRef(assignment)),
          ],
        }),
      );
      continue;
    }

    if (assignment.dueAt && isWithinUpcomingHours(assignment.dueAt, now, 48)) {
      alerts.push(
        AlertSchema.parse({
          id: `derived:alert:${assignment.id}:due_soon`,
          kind: 'alert',
          site: assignment.site,
          source: {
            site: assignment.site,
            resourceId: assignment.id,
            resourceType: 'derived_alert',
          },
          alertKind: 'due_soon',
          title: `${assignment.title} 48 小时内截止`,
          summary: '这是近期要优先确认的任务。',
          importance: assignment.status === 'missing' ? 'critical' : 'high',
          relatedEntities: [toEntityRef(assignment)],
          triggeredAt: now,
          reasons: [
            makePriorityReason(
              'due_soon',
              '即将到期',
              assignment.status === 'missing' ? 'critical' : 'high',
              toEntityRef(assignment),
            ),
          ],
        }),
      );
    }
  }

  for (const grade of grades) {
    const gradeTime = grade.releasedAt ?? grade.gradedAt;
    if (!isWithinHours(gradeTime, now, 24 * 7)) {
      continue;
    }

    alerts.push(
      AlertSchema.parse({
        id: `derived:alert:${grade.id}:new_grade`,
        kind: 'alert',
        site: grade.site,
        source: {
          site: grade.site,
          resourceId: grade.id,
          resourceType: 'derived_alert',
        },
        alertKind: 'new_grade',
        title: `${grade.title} 出了新成绩`,
        summary: '最近有新的评分结果可查看。',
        importance: 'medium',
        relatedEntities: [toEntityRef(grade)],
        triggeredAt: now,
        reasons: [makePriorityReason('new_grade', '近期新增成绩', 'medium', toEntityRef(grade))],
      }),
    );
  }

  for (const announcement of announcements) {
    if (!isWithinHours(announcement.postedAt, now, 48)) {
      continue;
    }

    alerts.push(
      AlertSchema.parse({
        id: `derived:alert:${announcement.id}:announcement`,
        kind: 'alert',
        site: announcement.site,
        source: {
          site: announcement.site,
          resourceId: announcement.id,
          resourceType: 'derived_alert',
        },
        alertKind: 'important_announcement',
        title: announcement.title,
        summary: '最近有新的课程公告，可能影响任务安排。',
        importance: 'medium',
        relatedEntities: [toEntityRef(announcement)],
        triggeredAt: now,
        reasons: [
          makePriorityReason('important_announcement', '近期有公告更新', 'medium', toEntityRef(announcement)),
        ],
      }),
    );
  }

  for (const message of messages) {
    if ((!message.unread && !message.instructorAuthored) || !isWithinHours(message.createdAt, now, 72)) {
      continue;
    }

    alerts.push(
      AlertSchema.parse({
        id: `derived:alert:${message.id}:message`,
        kind: 'alert',
        site: message.site,
        source: {
          site: message.site,
          resourceId: message.id,
          resourceType: 'derived_alert',
        },
        alertKind: message.instructorAuthored ? 'instructor_activity' : 'unread_mention',
        title: message.title ?? '有新的讨论更新',
        summary: message.instructorAuthored ? '老师最近在讨论区发了新内容。' : '你有未读的近期讨论更新。',
        importance: message.instructorAuthored ? 'high' : 'medium',
        relatedEntities: [toEntityRef(message)],
        triggeredAt: now,
        reasons: [
          makePriorityReason(
            message.instructorAuthored ? 'important_announcement' : 'unread_activity',
            message.instructorAuthored ? '老师有新动态' : '近期有未读更新',
            message.instructorAuthored ? 'high' : 'medium',
            toEntityRef(message),
          ),
        ],
      }),
    );
  }

  for (const syncState of syncStates) {
    if (syncState.status !== 'error' && syncState.lastOutcome !== 'partial_success') {
      continue;
    }

    alerts.push(
      AlertSchema.parse({
        id: `derived:alert:sync:${syncState.site}`,
        kind: 'alert',
        site: syncState.site,
        source: {
          site: syncState.site,
          resourceId: syncState.site,
          resourceType: 'sync_state',
        },
        alertKind: 'attention_needed',
        title: `${syncState.site} ${syncState.lastOutcome === 'partial_success' ? '部分同步成功' : '同步失败'}`,
        summary:
          syncState.lastOutcome === 'partial_success'
            ? `部分资源仍有缺口：${summarizeResourceFailures(syncState.resourceFailures)}`
            : syncState.errorReason ?? '最近一次同步没有成功。',
        importance: syncState.lastOutcome === 'partial_success' ? 'low' : 'medium',
        relatedEntities: [],
        triggeredAt: syncState.lastSyncedAt ?? now,
        reasons: [
          makePriorityReason(
            'sync_stale',
            syncState.lastOutcome === 'partial_success' ? '同步部分成功' : '同步状态异常',
            syncState.lastOutcome === 'partial_success' ? 'low' : 'medium',
          ),
        ],
      }),
    );
  }

  return alerts.sort((left, right) => compareNewest(left.triggeredAt, right.triggeredAt)).slice(0, 6);
}

export async function getRecentUpdates(
  now: string,
  limit = 8,
  db = campusCopilotDb,
): Promise<RecentUpdatesFeed> {
  const [announcements, assignments, grades, messages, events, entityStates] = await Promise.all([
    db.announcements.toArray(),
    db.assignments.toArray(),
    db.grades.toArray(),
    db.messages.toArray(),
    db.events.toArray(),
    db.entity_state.toArray(),
  ]);

  const stateMap = new Map(entityStates.map((state) => [state.entityId, state]));
  const items: TimelineEntry[] = [];

  for (const announcement of announcements) {
    const occurredAt = announcement.postedAt ?? stateMap.get(announcement.id)?.firstSeenAt;
    if (!isWithinHours(occurredAt, now, 24 * 7)) {
      continue;
    }

    items.push(
      TimelineEntrySchema.parse({
        id: `timeline:${announcement.id}`,
        kind: 'timeline_entry',
        site: announcement.site,
        source: announcement.source,
        url: announcement.url,
        timelineKind: 'announcement_posted',
        occurredAt,
        title: announcement.title,
        relatedEntities: [toEntityRef(announcement)],
        summary: '近期有新的课程公告。',
      }),
    );
  }

  for (const assignment of assignments) {
    const occurredAt = assignment.createdAt ?? stateMap.get(assignment.id)?.firstSeenAt;
    if (!isWithinHours(occurredAt, now, 24 * 7)) {
      continue;
    }

    items.push(
      TimelineEntrySchema.parse({
        id: `timeline:${assignment.id}`,
        kind: 'timeline_entry',
        site: assignment.site,
        source: assignment.source,
        url: assignment.url,
        timelineKind: 'assignment_created',
        occurredAt,
        title: assignment.title,
        relatedEntities: [toEntityRef(assignment)],
        summary: '最近出现了新的任务。',
      }),
    );
  }

  for (const grade of grades) {
    const occurredAt = grade.releasedAt ?? grade.gradedAt ?? stateMap.get(grade.id)?.firstSeenAt;
    if (!isWithinHours(occurredAt, now, 24 * 7)) {
      continue;
    }

    items.push(
      TimelineEntrySchema.parse({
        id: `timeline:${grade.id}`,
        kind: 'timeline_entry',
        site: grade.site,
        source: grade.source,
        url: grade.url,
        timelineKind: 'grade_released',
        occurredAt,
        title: grade.title,
        relatedEntities: [toEntityRef(grade)],
        summary: '最近有新的评分结果发布。',
      }),
    );
  }

  for (const message of messages) {
    const occurredAt = message.createdAt ?? stateMap.get(message.id)?.firstSeenAt;
    if (!isWithinHours(occurredAt, now, 24 * 7)) {
      continue;
    }

    items.push(
      TimelineEntrySchema.parse({
        id: `timeline:${message.id}`,
        kind: 'timeline_entry',
        site: message.site,
        source: message.source,
        url: message.url,
        timelineKind: 'discussion_replied',
        occurredAt,
        title: message.title ?? '讨论区有新动态',
        relatedEntities: [toEntityRef(message)],
        summary: message.instructorAuthored ? '老师最近参与了讨论。' : '近期有新的讨论更新。',
      }),
    );
  }

  for (const event of events) {
    const occurredAt = event.updatedAt ?? event.startAt ?? stateMap.get(event.id)?.firstSeenAt;
    if (!isWithinHours(occurredAt, now, 24 * 7)) {
      continue;
    }

    items.push(
      TimelineEntrySchema.parse({
        id: `timeline:${event.id}`,
        kind: 'timeline_entry',
        site: event.site,
        source: event.source,
        url: event.url,
        timelineKind: 'schedule_updated',
        occurredAt,
        title: event.title,
        relatedEntities: [toEntityRef(event)],
        summary: '近期有时间相关事项更新。',
      }),
    );
  }

  const sortedItems = items.sort((left, right) => compareNewest(left.occurredAt, right.occurredAt)).slice(0, limit);
  const unseenCount = sortedItems.filter((entry) => {
    const state = stateMap.get(entry.relatedEntities[0]?.id ?? '');
    if (!state?.seenAt) {
      return true;
    }
    const seenAt = toTimestamp(state.seenAt);
    const occurredAt = toTimestamp(entry.occurredAt);
    return seenAt === undefined || occurredAt === undefined ? true : seenAt < occurredAt;
  }).length;

  return RecentUpdatesFeedSchema.parse({
    items: sortedItems,
    unseenCount,
  });
}

export async function getFocusQueue(now: string, db = campusCopilotDb): Promise<FocusQueueItem[]> {
  const [assignments, announcements, messages, grades, syncStates, overlays, recentChangeEvents] = await Promise.all([
    db.assignments.toArray(),
    db.announcements.toArray(),
    db.messages.toArray(),
    db.grades.toArray(),
    db.sync_state.toArray(),
    db.local_entity_overlay.toArray(),
    getRecentChangeEvents(200, db),
  ]);

  const overlayMap = new Map(overlays.map((overlay) => [overlay.entityId, overlay]));
  const recentChangeMap = buildRecentChangeMap(
    recentChangeEvents.filter((event) => isWithinHours(event.occurredAt, now, 24 * 7)),
  );
  const items: FocusQueueItem[] = [];

  for (const assignment of assignments) {
    const item = buildAssignmentFocusItem(assignment, overlayMap.get(assignment.id), now, recentChangeMap.get(assignment.id));
    if (item) {
      items.push(item);
    }
  }

  for (const announcement of announcements) {
    const item = buildAnnouncementFocusItem(
      announcement,
      overlayMap.get(announcement.id),
      now,
      recentChangeMap.get(announcement.id),
    );
    if (item) {
      items.push(item);
    }
  }

  for (const message of messages) {
    const item = buildMessageFocusItem(message, overlayMap.get(message.id), now, recentChangeMap.get(message.id));
    if (item) {
      items.push(item);
    }
  }

  for (const grade of grades) {
    const item = buildGradeFocusItem(grade, overlayMap.get(grade.id), now, recentChangeMap.get(grade.id));
    if (item) {
      items.push(item);
    }
  }

  for (const syncState of syncStates) {
    const item = buildSyncFocusItem(syncState, now);
    if (item) {
      items.push(item);
    }
  }

  return items.sort(compareFocusQueueItems);
}

export async function getWeeklyLoad(now: string, db = campusCopilotDb): Promise<WeeklyLoadEntry[]> {
  const [assignments, events, overlays] = await Promise.all([
    db.assignments.toArray(),
    db.events.toArray(),
    db.local_entity_overlay.toArray(),
  ]);
  const overlayMap = new Map(overlays.map((overlay) => [overlay.entityId, overlay]));
  const bucketStarts = Array.from({ length: 7 }, (_, index) => startOfUtcDay(now, index));
  const buckets = bucketStarts.map((start) => {
    return {
      dateKey: start.toISOString().slice(0, 10),
      startsAt: start.toISOString(),
      endsAt: endOfUtcDay(start).toISOString(),
      assignmentCount: 0,
      eventCount: 0,
      overdueCount: 0,
      dueSoonCount: 0,
      pinnedCount: 0,
      totalScore: 0,
      items: [] as EntityRef[],
    };
  });
  const bucketMap = new Map(buckets.map((bucket) => [bucket.dateKey, bucket]));
  const todayBucket = buckets[0];

  for (const assignment of assignments) {
    if (!isAssignmentOpen(assignment)) {
      continue;
    }

    const overlay = overlayMap.get(assignment.id);
    if (isOverlayDismissed(overlay, now)) {
      continue;
    }
    if (isOverlaySnoozed(overlay, now) && !overlay?.pinnedAt) {
      continue;
    }
    if (!assignment.dueAt) {
      continue;
    }

    const bucketKey = isPast(assignment.dueAt, now) ? todayBucket.dateKey : toDateKey(assignment.dueAt);
    const bucket = bucketMap.get(bucketKey);
    if (!bucket) {
      continue;
    }

    bucket.assignmentCount += 1;
    bucket.items.push(toEntityRef(assignment));
    if (overlay?.pinnedAt) {
      bucket.pinnedCount += 1;
      bucket.totalScore += 120;
    }
    if (isPast(assignment.dueAt, now)) {
      bucket.overdueCount += 1;
      bucket.totalScore += assignment.status === 'missing' ? 260 : 230;
    } else if (isWithinUpcomingHours(assignment.dueAt, now, 48)) {
      bucket.dueSoonCount += 1;
      bucket.totalScore += assignment.status === 'missing' ? 210 : 180;
    } else {
      bucket.totalScore += 90;
    }
  }

  for (const event of events) {
    const overlay = overlayMap.get(event.id);
    if (isOverlayDismissed(overlay, now)) {
      continue;
    }
    if (isOverlaySnoozed(overlay, now) && !overlay?.pinnedAt) {
      continue;
    }

    const eventAt = event.startAt ?? event.endAt;
    if (!eventAt) {
      continue;
    }

    const bucketKey = isPast(eventAt, now) ? todayBucket.dateKey : toDateKey(eventAt);
    const bucket = bucketMap.get(bucketKey);
    if (!bucket) {
      continue;
    }

    bucket.eventCount += 1;
    bucket.items.push(
      EntityRefSchema.parse({
        id: event.id,
        kind: event.kind,
        site: event.site,
      }),
    );
    bucket.totalScore += overlay?.pinnedAt ? 70 : 40;
    if (overlay?.pinnedAt) {
      bucket.pinnedCount += 1;
    }
  }

  return buckets.map((bucket) => WeeklyLoadEntrySchema.parse(bucket));
}

export async function getTodaySnapshot(now: string, db = campusCopilotDb): Promise<TodaySnapshot> {
  const [assignments, grades, syncStates, recentUpdates, alerts] = await Promise.all([
    db.assignments.toArray(),
    db.grades.toArray(),
    db.sync_state.toArray(),
    getRecentUpdates(now, 20, db),
    getPriorityAlerts(now, db),
  ]);

  const openAssignments = assignments.filter((assignment) => isAssignmentOpen(assignment));
  const dueSoonAssignments = openAssignments.filter((assignment) => isWithinUpcomingHours(assignment.dueAt, now, 48));
  const newGrades = grades.filter((grade) => isWithinHours(grade.releasedAt ?? grade.gradedAt, now, 24 * 7));
  const syncedSites = syncStates.filter((state) => state.status === 'success').length;

  return TodaySnapshotSchema.parse({
    totalAssignments: openAssignments.length,
    dueSoonAssignments: dueSoonAssignments.length,
    recentUpdates: recentUpdates.items.length,
    newGrades: newGrades.length,
    riskAlerts: alerts.length,
    syncedSites,
  });
}

export async function getWorkbenchView(
  now: string,
  filters: WorkbenchFilter,
  db = campusCopilotDb,
): Promise<WorkbenchView> {
  const parsedFilters = WorkbenchFilterSchema.parse(filters);
  const [assignments, announcements, messages, grades, events, alerts, recentUpdates, entityStates] = await Promise.all([
    getAllAssignments(db),
    getAllAnnouncements(db),
    getAllMessages(db),
    getAllGrades(db),
    getAllEvents(db),
    getPriorityAlerts(now, db),
    getRecentUpdates(now, 20, db),
    db.entity_state.toArray(),
  ]);

  const stateMap = new Map(entityStates.map((state) => [state.entityId, state]));
  const filteredRecentUpdates = recentUpdates.items.filter((entry) => {
    const matchesSite = parsedFilters.site === 'all' || entry.site === parsedFilters.site;
    if (!matchesSite) {
      return false;
    }

    return parsedFilters.onlyUnseenUpdates ? isEntryUnseen(entry, stateMap) : true;
  });

  return WorkbenchViewSchema.parse({
    filters: parsedFilters,
    assignments: matchesSiteFilter(assignments, parsedFilters.site),
    announcements: matchesSiteFilter(announcements, parsedFilters.site),
    messages: matchesSiteFilter(messages, parsedFilters.site),
    grades: matchesSiteFilter(grades, parsedFilters.site),
    events: matchesSiteFilter(events, parsedFilters.site),
    alerts: matchesSiteFilter(alerts, parsedFilters.site),
    recentUpdates: {
      items: filteredRecentUpdates,
      unseenCount: filteredRecentUpdates.filter((entry) => isEntryUnseen(entry, stateMap)).length,
    },
  });
}

export function useEntityCounts(db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getEntityCounts(db), [db, refreshKey]);
}

export function useSyncState(db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getLatestSyncState(db), [db, refreshKey]);
}

export function useSiteSyncStates(db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getSiteSyncStates(db), [db, refreshKey]);
}

export function useLatestSyncRuns(limit = 8, db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getLatestSyncRuns(limit, db), [limit, db, refreshKey]);
}

export function useLatestSyncRunBySite(site: Site, db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getLatestSyncRunBySite(site, db), [site, db, refreshKey]);
}

export function useAllAssignments(db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getAllAssignments(db), [db, refreshKey]);
}

export function useAllAnnouncements(db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getAllAnnouncements(db), [db, refreshKey]);
}

export function useAllMessages(db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getAllMessages(db), [db, refreshKey]);
}

export function useAllGrades(db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getAllGrades(db), [db, refreshKey]);
}

export function useAllEvents(db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getAllEvents(db), [db, refreshKey]);
}

export function useSiteEntityCounts(site: Site, db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getSiteEntityCounts(site, db), [site, db, refreshKey]);
}

export function useAllSiteEntityCounts(db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getAllSiteEntityCounts(db), [db, refreshKey]);
}

export function useSiteSyncState(site: Site, db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getSyncStateBySite(site, db), [site, db, refreshKey]);
}

export function useTodaySnapshot(now: string, db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getTodaySnapshot(now, db), [now, db, refreshKey]);
}

export function usePriorityAlerts(now: string, db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getPriorityAlerts(now, db), [now, db, refreshKey]);
}

export function useRecentUpdates(now: string, limit = 8, db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getRecentUpdates(now, limit, db), [now, limit, db, refreshKey]);
}

export function useRecentChangeEvents(limit = 20, db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getRecentChangeEvents(limit, db), [limit, db, refreshKey]);
}

export function useFocusQueue(now: string, db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getFocusQueue(now, db), [now, db, refreshKey]);
}

export function useWeeklyLoad(now: string, db = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getWeeklyLoad(now, db), [now, db, refreshKey]);
}

export function useWorkbenchView(
  now: string,
  filters: WorkbenchFilter,
  db = campusCopilotDb,
  refreshKey?: number,
) {
  return useLiveQuery(() => getWorkbenchView(now, filters, db), [now, filters.site, filters.onlyUnseenUpdates, db, refreshKey]);
}
