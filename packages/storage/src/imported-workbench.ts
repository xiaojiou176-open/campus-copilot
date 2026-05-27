import {
  AssignmentSchema,
  AnnouncementSchema,
  EventSchema,
  GradeSchema,
  MessageSchema,
  ResourceSchema,
  type Assignment,
  type Announcement,
  type Event,
  type Grade,
  type Message,
  type Resource,
  type Site,
} from '@campus-copilot/schema';
import { IsoDateTimeSchema } from '@campus-copilot/schema';
import {
  ChangeEventSchema,
  EntityStateSchema,
  PlanningSubstrateOwnerSchema,
  SyncRunSchema,
  SyncStateSchema,
  type ChangeEvent,
  type EntityState,
  type PlanningSubstrateOwner,
  type SyncRun,
  type SyncState,
} from './contracts.ts';
import { openCampusDb, type CampusCopilotDB } from './db.ts';
import { recomputeClusterSubstrate } from './cluster-substrate.ts';

type ImportedTrackedEntity = Resource | Assignment | Announcement | Message | Grade | Event;

export interface ImportedWorkbenchSnapshot {
  generatedAt: string;
  planningSubstrates?: PlanningSubstrateOwner[];
  resources?: Resource[];
  assignments?: Assignment[];
  announcements?: Announcement[];
  messages?: Message[];
  grades?: Grade[];
  events?: Event[];
  syncRuns?: SyncRun[];
  changeEvents?: ChangeEvent[];
}

function buildEntityState(entity: ImportedTrackedEntity, importedAt: string): EntityState {
  return EntityStateSchema.parse({
    key: entity.id,
    entityId: entity.id,
    site: entity.site,
    kind: entity.kind,
    firstSeenAt: entity.createdAt ?? importedAt,
    lastSyncedAt: importedAt,
  });
}

function buildSyncStates(
  importedAt: string,
  syncRuns: SyncRun[],
  entities: ImportedTrackedEntity[],
): SyncState[] {
  const latestRuns = new Map<Site, SyncRun>();

  for (const run of syncRuns) {
    const current = latestRuns.get(run.site);
    if (!current || current.completedAt < run.completedAt) {
      latestRuns.set(run.site, run);
    }
  }

  const states: SyncState[] = [];

  for (const [site, run] of latestRuns.entries()) {
    states.push(
      SyncStateSchema.parse({
        key: site,
        site,
        status: run.status === 'error' ? 'error' : 'success',
        lastSyncedAt: run.completedAt,
        lastOutcome: run.outcome,
        errorReason: run.errorReason,
        resourceFailures: run.resourceFailures,
      }),
    );
  }

  for (const site of new Set(entities.map((entity) => entity.site))) {
    if (latestRuns.has(site)) {
      continue;
    }

    states.push(
      SyncStateSchema.parse({
        key: site,
        site,
        status: 'success',
        lastSyncedAt: importedAt,
        lastOutcome: 'success',
      }),
    );
  }

  return states;
}

export async function replaceImportedWorkbenchSnapshot(
  snapshot: ImportedWorkbenchSnapshot,
  db: CampusCopilotDB = openCampusDb,
) {
  const importedAt = IsoDateTimeSchema.parse(snapshot.generatedAt);
  const planningSubstrates = (snapshot.planningSubstrates ?? []).map((item) => PlanningSubstrateOwnerSchema.parse(item));
  const resources = (snapshot.resources ?? []).map((item) => ResourceSchema.parse(item));
  const assignments = (snapshot.assignments ?? []).map((item) => AssignmentSchema.parse(item));
  const announcements = (snapshot.announcements ?? []).map((item) => AnnouncementSchema.parse(item));
  const messages = (snapshot.messages ?? []).map((item) => MessageSchema.parse(item));
  const grades = (snapshot.grades ?? []).map((item) => GradeSchema.parse(item));
  const events = (snapshot.events ?? []).map((item) => EventSchema.parse(item));
  const syncRuns = (snapshot.syncRuns ?? []).map((item) => SyncRunSchema.parse(item));
  const changeEvents = (snapshot.changeEvents ?? []).map((item) => ChangeEventSchema.parse(item));
  const trackedEntities: ImportedTrackedEntity[] = [
    ...resources,
    ...assignments,
    ...announcements,
    ...messages,
    ...grades,
    ...events,
  ];
  const entityStates = trackedEntities.map((entity) => buildEntityState(entity, importedAt));
  const syncStates = buildSyncStates(importedAt, syncRuns, trackedEntities);

  await db.transaction(
    'rw',
    [
      db.courses,
      db.planning_substrates,
      db.resources,
      db.assignments,
      db.announcements,
      db.grades,
      db.messages,
      db.events,
      db.sync_state,
      db.entity_state,
      db.local_entity_overlay,
      db.sync_runs,
      db.change_events,
    ],
    async () => {
      await Promise.all([
        db.courses.clear(),
        db.planning_substrates.clear(),
        db.resources.clear(),
        db.assignments.clear(),
        db.announcements.clear(),
        db.grades.clear(),
        db.messages.clear(),
        db.events.clear(),
        db.sync_state.clear(),
        db.entity_state.clear(),
        db.local_entity_overlay.clear(),
        db.sync_runs.clear(),
        db.change_events.clear(),
      ]);

      if (planningSubstrates.length > 0) {
        await db.planning_substrates.bulkPut(planningSubstrates);
      }
      if (resources.length > 0) {
        await db.resources.bulkPut(resources);
      }
      if (assignments.length > 0) {
        await db.assignments.bulkPut(assignments);
      }
      if (announcements.length > 0) {
        await db.announcements.bulkPut(announcements);
      }
      if (grades.length > 0) {
        await db.grades.bulkPut(grades);
      }
      if (messages.length > 0) {
        await db.messages.bulkPut(messages);
      }
      if (events.length > 0) {
        await db.events.bulkPut(events);
      }
      if (syncStates.length > 0) {
        await db.sync_state.bulkPut(syncStates);
      }
      if (entityStates.length > 0) {
        await db.entity_state.bulkPut(entityStates);
      }
      if (syncRuns.length > 0) {
        await db.sync_runs.bulkPut(syncRuns);
      }
      if (changeEvents.length > 0) {
        await db.change_events.bulkPut(changeEvents);
      }
    },
  );

  await recomputeClusterSubstrate(db);
}
