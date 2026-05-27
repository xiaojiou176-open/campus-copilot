import type { Announcement, Assignment, Course, Event, Grade, Message, Resource, Site } from '@opencampus/schema';
import { openCampusDb, type OpenCampusDB } from './db.ts';
import {
  ChangeEventSchema,
  EntityStateSchema,
  SyncRunSchema,
  SyncStateSchema,
  type ChangeEvent,
  type ChangeEventType,
  type EntityState,
  type FailedSiteSyncOutcome,
  type SiteSnapshotRecords,
  type SyncResourceFailure,
  type SyncRun,
  type SyncState,
} from './contracts.ts';
import { compareNewest, summarizeResourceFailures, toEntityRef } from './storage-shared.ts';

export { compareNewest } from './storage-shared.ts';

type TrackedEntity = Course | Resource | Assignment | Announcement | Grade | Message | Event;

export function buildEntityStates(
  entities: TrackedEntity[],
  syncedAt: string,
  existingStates: Array<EntityState | undefined>,
) {
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

function getEntityTitle(entity: TrackedEntity) {
  return entity.title;
}

export function makeSyncRunId(site: Site, startedAt: string, completedAt: string) {
  return `sync-run:${site}:${startedAt}:${completedAt}`;
}

function makeChangeEventId(runId: string, changeType: ChangeEventType, suffix: string) {
  return `${runId}:${changeType}:${suffix}`;
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

function buildSimpleEntityChangeEvents<T extends Course | Resource | Announcement | Event>(
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

export function buildChangeEvents(
  site: Site,
  runId: string,
  occurredAt: string,
  previousSnapshot: SiteSnapshotRecords,
  nextSnapshot: SiteSnapshotRecords,
  syncState: SyncState,
) {
  const events: ChangeEvent[] = [];

  events.push(...buildSimpleEntityChangeEvents(runId, occurredAt, previousSnapshot.courses, nextSnapshot.courses));
  events.push(...buildSimpleEntityChangeEvents(runId, occurredAt, previousSnapshot.resources, nextSnapshot.resources));
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

export async function recordSiteSyncError(
  site: Site,
  errorReason: string,
  syncedAt: string,
  lastOutcome: FailedSiteSyncOutcome = 'request_failed',
  resourceFailures: SyncResourceFailure[] | undefined = undefined,
  db = openCampusDb,
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

export async function putSyncState(record: SyncState, db: OpenCampusDB = openCampusDb) {
  await db.sync_state.put(SyncStateSchema.parse(record));
}

export async function getLatestSyncState(db = openCampusDb) {
  const states = await db.sync_state.toArray();
  return states
    .filter((state) => state.lastSyncedAt)
    .sort((left, right) => {
      return (right.lastSyncedAt ?? '').localeCompare(left.lastSyncedAt ?? '');
    })[0];
}

export async function getSyncStateBySite(site: Site, db = openCampusDb) {
  return db.sync_state.get(site);
}

export async function getLatestSyncRuns(limit = 8, db = openCampusDb) {
  const runs = await db.sync_runs.orderBy('completedAt').reverse().limit(limit).toArray();
  return runs.map((run) => SyncRunSchema.parse(run));
}

export async function getLatestSyncRunBySite(site: Site, db = openCampusDb) {
  const runs = await db.sync_runs.where('site').equals(site).toArray();
  const latestRun = runs.sort((left, right) => compareNewest(left.completedAt, right.completedAt))[0];
  return latestRun ? SyncRunSchema.parse(latestRun) : undefined;
}

export async function getRecentChangeEvents(limit = 20, db = openCampusDb) {
  const [events, mergeLedger, courseClusters, workItemClusters] = await Promise.all([
    db.change_events.orderBy('occurredAt').reverse().limit(limit * 4).toArray(),
    db.merge_ledger.toArray(),
    db.course_clusters.toArray(),
    db.work_item_clusters.toArray(),
  ]);

  const parsedEvents = events.map((event) => ChangeEventSchema.parse(event));
  const mergeByEntityKey = new Map(
    mergeLedger
      .filter((entry) => entry.decision !== 'candidate')
      .map((entry) => [entry.entityKey, entry]),
  );
  const courseClusterById = new Map<string, (typeof courseClusters)[number]>(courseClusters.map((cluster) => [cluster.id, cluster]));
  const workItemClusterById = new Map<string, (typeof workItemClusters)[number]>(workItemClusters.map((cluster) => [cluster.id, cluster]));
  const aggregated = new Map<string, ChangeEvent>();
  const passthrough: ChangeEvent[] = [];

  for (const event of parsedEvents) {
    const mergeEntry = event.entityId ? mergeByEntityKey.get(event.entityId) : undefined;
    if (!mergeEntry) {
      passthrough.push(event);
      continue;
    }

    if (mergeEntry.targetKind === 'work_item_cluster') {
      const target = workItemClusterById.get(mergeEntry.targetId);
      if (!target) {
        passthrough.push(event);
        continue;
      }

      const site = target.authoritySurface === 'myplan' ? 'myuw' : target.authoritySurface;
      const aggregateKey = `${mergeEntry.targetId}:${event.changeType}`;
      const existing = aggregated.get(aggregateKey);
      if (existing && compareNewest(existing.occurredAt, event.occurredAt) <= 0) {
        continue;
      }

      const entityKind =
        target.workType === 'grade_signal'
          ? 'grade'
          : target.workType === 'deadline_signal'
          ? 'event'
          : target.workType === 'admin_requirement' || target.workType === 'planning_requirement'
          ? 'announcement'
          : 'assignment';

      aggregated.set(
        aggregateKey,
        ChangeEventSchema.parse({
          id: `cluster-change:${aggregateKey}`,
          runId: event.runId,
          site,
          changeType: event.changeType,
          occurredAt: event.occurredAt,
          entityId: mergeEntry.targetId,
          entityKind,
          title: `${target.title} cluster update`,
          summary: event.summary,
          previousValue: event.previousValue,
          nextValue: event.nextValue,
        }),
      );
      continue;
    }

    const target = courseClusterById.get(mergeEntry.targetId);
    if (!target) {
      passthrough.push(event);
      continue;
    }

    const site = target.authoritySurface;
    const aggregateKey = `${mergeEntry.targetId}:${event.changeType}`;
    const existing = aggregated.get(aggregateKey);
    if (existing && compareNewest(existing.occurredAt, event.occurredAt) <= 0) {
      continue;
    }

    aggregated.set(
      aggregateKey,
      ChangeEventSchema.parse({
        id: `cluster-change:${aggregateKey}`,
        runId: event.runId,
        site,
        changeType: event.changeType,
        occurredAt: event.occurredAt,
        entityId: mergeEntry.targetId,
        entityKind: 'course',
        title: `${target.displayTitle} cluster update`,
        summary: event.summary,
        previousValue: event.previousValue,
        nextValue: event.nextValue,
      }),
    );
  }

  return [...aggregated.values(), ...passthrough]
    .sort((left, right) => compareNewest(left.occurredAt, right.occurredAt))
    .slice(0, limit);
}

export async function getSiteSyncStates(db = openCampusDb) {
  return db.sync_state.toArray();
}

export async function markEntitiesSeen(entityIds: string[], seenAt: string, db = openCampusDb) {
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
