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

export interface SiteSnapshotPayload {
  courses?: Course[];
  assignments?: Assignment[];
  announcements?: Announcement[];
  grades?: Grade[];
  messages?: Message[];
  events?: Event[];
}

export async function replaceSiteSnapshot(
  site: Site,
  payload: SiteSnapshotPayload,
  syncState: Omit<SyncState, 'key' | 'site'>,
  db = campusCopilotDb,
) {
  const hasCourses = Object.prototype.hasOwnProperty.call(payload, 'courses');
  const hasAssignments = Object.prototype.hasOwnProperty.call(payload, 'assignments');
  const hasAnnouncements = Object.prototype.hasOwnProperty.call(payload, 'announcements');
  const hasGrades = Object.prototype.hasOwnProperty.call(payload, 'grades');
  const hasMessages = Object.prototype.hasOwnProperty.call(payload, 'messages');
  const hasEvents = Object.prototype.hasOwnProperty.call(payload, 'events');

  const parsedPayload = {
    courses: parseArray(CourseSchema, payload.courses ?? []),
    assignments: parseArray(AssignmentSchema, payload.assignments ?? []),
    announcements: parseArray(AnnouncementSchema, payload.announcements ?? []),
    grades: parseArray(GradeSchema, payload.grades ?? []),
    messages: parseArray(MessageSchema, payload.messages ?? []),
    events: parseArray(EventSchema, payload.events ?? []),
  };

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
  const syncedAt = parsedSyncState.lastSyncedAt ?? new Date().toISOString();

  await db.transaction(
    'rw',
    [db.courses, db.assignments, db.announcements, db.grades, db.messages, db.events, db.sync_state, db.entity_state],
    async () => {
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
      const nextStates = buildEntityStates(trackedEntities, syncedAt, existingStates);
      if (nextStates.length > 0) {
        await db.entity_state.bulkPut(nextStates);
      }

      await db.sync_state.put(parsedSyncState);
    },
  );
}

export async function recordSiteSyncError(
  site: Site,
  errorReason: string,
  syncedAt: string,
  lastOutcome: Exclude<SiteSyncOutcome, 'success' | 'partial_success'> = 'request_failed',
  resourceFailures: SyncResourceFailure[] | undefined = undefined,
  db = campusCopilotDb,
) {
  await putSyncState(
    {
      key: site,
      site,
      status: 'error',
      lastSyncedAt: syncedAt,
      lastOutcome,
      errorReason,
      resourceFailures,
    },
    db,
  );
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
    if (assignment.status === 'submitted' || assignment.status === 'graded') {
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
            PriorityReasonSchema.parse({
              code: 'overdue',
              label: '截止时间已过',
              importance: 'critical',
              relatedEntity: toEntityRef(assignment),
            }),
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
            PriorityReasonSchema.parse({
              code: 'due_soon',
              label: '即将到期',
              importance: assignment.status === 'missing' ? 'critical' : 'high',
              relatedEntity: toEntityRef(assignment),
            }),
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
        reasons: [
          PriorityReasonSchema.parse({
            code: 'new_grade',
            label: '近期新增成绩',
            importance: 'medium',
            relatedEntity: toEntityRef(grade),
          }),
        ],
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
          PriorityReasonSchema.parse({
            code: 'important_announcement',
            label: '近期有公告更新',
            importance: 'medium',
            relatedEntity: toEntityRef(announcement),
          }),
        ],
      }),
    );
  }

  for (const message of messages) {
    if ((!message.unread && !message.instructorAuthored) || !isWithinHours(message.createdAt, now, 72)) {
      continue;
    }

    const code = message.instructorAuthored ? 'important_announcement' : 'unread_activity';
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
        summary: message.instructorAuthored
          ? '老师最近在讨论区发了新内容。'
          : '你有未读的近期讨论更新。',
        importance: message.instructorAuthored ? 'high' : 'medium',
        relatedEntities: [toEntityRef(message)],
        triggeredAt: now,
        reasons: [
          PriorityReasonSchema.parse({
            code,
            label: message.instructorAuthored ? '老师有新动态' : '近期有未读更新',
            importance: message.instructorAuthored ? 'high' : 'medium',
            relatedEntity: toEntityRef(message),
          }),
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
            ? `部分资源仍有缺口：${(syncState.resourceFailures ?? []).map((item) => item.resource).join(' / ') || '请查看站点状态。'}`
            : syncState.errorReason ?? '最近一次同步没有成功。',
        importance: syncState.lastOutcome === 'partial_success' ? 'low' : 'medium',
        relatedEntities: [],
        triggeredAt: syncState.lastSyncedAt ?? now,
        reasons: [
          PriorityReasonSchema.parse({
            code: 'sync_stale',
            label: syncState.lastOutcome === 'partial_success' ? '同步部分成功' : '同步状态异常',
            importance: syncState.lastOutcome === 'partial_success' ? 'low' : 'medium',
          }),
        ],
      }),
    );
  }

  return alerts
    .sort((left, right) => compareNewest(left.triggeredAt, right.triggeredAt))
    .slice(0, 6);
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

export async function getTodaySnapshot(now: string, db = campusCopilotDb): Promise<TodaySnapshot> {
  const [assignments, grades, syncStates, recentUpdates, alerts] = await Promise.all([
    db.assignments.toArray(),
    db.grades.toArray(),
    db.sync_state.toArray(),
    getRecentUpdates(now, 20, db),
    getPriorityAlerts(now, db),
  ]);

  const openAssignments = assignments.filter(
    (assignment) => assignment.status !== 'submitted' && assignment.status !== 'graded',
  );
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

export function useWorkbenchView(
  now: string,
  filters: WorkbenchFilter,
  db = campusCopilotDb,
  refreshKey?: number,
) {
  return useLiveQuery(() => getWorkbenchView(now, filters, db), [now, filters.site, filters.onlyUnseenUpdates, db, refreshKey]);
}
