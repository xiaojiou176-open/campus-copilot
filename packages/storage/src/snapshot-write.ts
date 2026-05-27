import {
  AnnouncementSchema,
  AssignmentSchema,
  CourseSchema,
  EventSchema,
  GradeSchema,
  MessageSchema,
  ResourceSchema,
  type Announcement,
  type Assignment,
  type Course,
  type Event,
  type Grade,
  type Message,
  type Resource,
  type Site,
} from '@campus-copilot/schema';
import { openCampusDb, type CampusCopilotDB } from './db.ts';
import {
  SyncRunSchema,
  SyncStateSchema,
  type ApplySiteSnapshotWithLedgerOptions,
  type SiteSnapshotPayload,
  type SiteSnapshotRecords,
  type SyncState,
} from './contracts.ts';
import { buildChangeEvents, buildEntityStates, makeSyncRunId } from './sync-ledger.ts';
import { recomputeClusterSubstrate } from './cluster-substrate.ts';

type TrackedEntity = Course | Resource | Assignment | Announcement | Grade | Message | Event;

function parseArray<T>(schema: { parse: (value: unknown) => T }, records: T[]) {
  return records.map((record) => schema.parse(record));
}

function buildEmptySiteSnapshot(): SiteSnapshotRecords {
  return {
    courses: [],
    resources: [],
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
    resources: parseArray(ResourceSchema, payload.resources ?? []),
    assignments: parseArray(AssignmentSchema, payload.assignments ?? []),
    announcements: parseArray(AnnouncementSchema, payload.announcements ?? []),
    grades: parseArray(GradeSchema, payload.grades ?? []),
    messages: parseArray(MessageSchema, payload.messages ?? []),
    events: parseArray(EventSchema, payload.events ?? []),
  };
}

async function readExistingSiteSnapshot(site: Site, payload: SiteSnapshotPayload, db: CampusCopilotDB) {
  const existingSnapshot = buildEmptySiteSnapshot();

  if (Object.prototype.hasOwnProperty.call(payload, 'courses')) {
    existingSnapshot.courses = await db.courses.where('site').equals(site).toArray();
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'resources')) {
    existingSnapshot.resources = await db.resources.where('site').equals(site).toArray();
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

export async function putCourses(records: Course[], db = openCampusDb) {
  await db.courses.bulkPut(parseArray(CourseSchema, records));
}

export async function putResources(records: Resource[], db = openCampusDb) {
  await db.resources.bulkPut(parseArray(ResourceSchema, records));
}

export async function putAssignments(records: Assignment[], db = openCampusDb) {
  await db.assignments.bulkPut(parseArray(AssignmentSchema, records));
}

export async function putAnnouncements(records: Announcement[], db = openCampusDb) {
  await db.announcements.bulkPut(parseArray(AnnouncementSchema, records));
}

export async function putGrades(records: Grade[], db = openCampusDb) {
  await db.grades.bulkPut(parseArray(GradeSchema, records));
}

export async function putMessages(records: Message[], db = openCampusDb) {
  await db.messages.bulkPut(parseArray(MessageSchema, records));
}

export async function putEvents(records: Event[], db = openCampusDb) {
  await db.events.bulkPut(parseArray(EventSchema, records));
}

export async function applySiteSnapshotWithLedger(
  site: Site,
  payload: SiteSnapshotPayload,
  syncState: Omit<SyncState, 'key' | 'site'>,
  options: ApplySiteSnapshotWithLedgerOptions = {},
  db = openCampusDb,
) {
  const hasCourses = Object.prototype.hasOwnProperty.call(payload, 'courses');
  const hasResources = Object.prototype.hasOwnProperty.call(payload, 'resources');
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
    ...parsedPayload.resources,
    ...parsedPayload.assignments,
    ...parsedPayload.announcements,
    ...parsedPayload.grades,
    ...parsedPayload.messages,
    ...parsedPayload.events,
  ];
  const completedAt = parsedSyncState.lastSyncedAt ?? new Date().toISOString();
  const startedAt = options.startedAt ?? completedAt;
  const runId = options.runId ?? makeSyncRunId(site, startedAt, completedAt);

  const result = await db.transaction(
    'rw',
    [
      db.courses,
      db.resources,
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
      if (hasResources) {
        await db.resources.where('site').equals(site).delete();
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
      if (hasResources && parsedPayload.resources.length > 0) {
        await db.resources.bulkPut(parsedPayload.resources);
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

      const existingStates =
        trackedEntities.length > 0 ? await db.entity_state.bulkGet(trackedEntities.map((entity) => entity.id)) : [];
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
  await recomputeClusterSubstrate(db);
  return result;
}

export async function replaceSiteSnapshot(
  site: Site,
  payload: SiteSnapshotPayload,
  syncState: Omit<SyncState, 'key' | 'site'>,
  db = openCampusDb,
) {
  return applySiteSnapshotWithLedger(site, payload, syncState, {}, db);
}
