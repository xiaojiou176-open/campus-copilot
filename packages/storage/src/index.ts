import Dexie, { type Table } from 'dexie';
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
      sync_state: '&key, site, status, lastSyncedAt',
    });
    this.version(2).stores({
      courses: '&id, site, title, code',
      assignments: '&id, site, courseId, dueAt, status',
      announcements: '&id, site, courseId, postedAt',
      grades: '&id, site, courseId, assignmentId, releasedAt, gradedAt',
      messages: '&id, site, courseId, createdAt, unread',
      events: '&id, site, eventKind, startAt, endAt',
      sync_state: '&key, site, status, lastSyncedAt',
    });
    this.version(3).stores({
      courses: '&id, site, title, code',
      assignments: '&id, site, courseId, dueAt, status',
      announcements: '&id, site, courseId, postedAt',
      grades: '&id, site, courseId, assignmentId, releasedAt, gradedAt',
      messages: '&id, site, courseId, createdAt, unread',
      events: '&id, site, eventKind, startAt, endAt',
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
      sync_state: '&key, site, status, lastSyncedAt, lastOutcome',
      entity_state: '&key, site, kind, firstSeenAt, lastSyncedAt, seenAt',
      local_entity_overlay: '&entityId, site, kind, updatedAt, pinnedAt, snoozeUntil, dismissUntil',
      sync_runs: '&id, site, completedAt, startedAt, outcome',
      change_events: '&id, runId, site, entityId, changeType, occurredAt',
    });
    this.version(6).stores({
      courses: '&id, site, title, code',
      assignments: '&id, site, courseId, dueAt, status',
      announcements: '&id, site, courseId, postedAt',
      grades: '&id, site, courseId, assignmentId, releasedAt, gradedAt',
      messages: '&id, site, courseId, createdAt, unread',
      events: '&id, site, eventKind, startAt, endAt',
      alerts: null,
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

export * from './derived';
export * from './hooks';
