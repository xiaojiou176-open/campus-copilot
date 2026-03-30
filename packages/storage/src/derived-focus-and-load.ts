import type {
  Announcement,
  Assignment,
  EntityRef,
  Grade,
  Message,
  PriorityReason,
} from '@campus-copilot/schema';
import {
  ChangeEventSchema,
  FocusQueueItemSchema,
  WeeklyLoadEntrySchema,
  campusCopilotDb,
  type CampusCopilotDB,
  type ChangeEvent,
  type FocusQueueItem,
  type LocalEntityOverlay,
  type SyncState,
  type WeeklyLoadEntry,
} from './index';
import {
  buildRecentChangeMap,
  compareFocusQueueItems,
  isAssignmentOpen,
  isOverlayDismissed,
  isOverlaySnoozed,
  isPast,
  isWithinHours,
  isWithinUpcomingHours,
  makePriorityReason,
  startOfUtcDay,
  endOfUtcDay,
  toDateKey,
  toEntityRef,
} from './derived-shared';

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

export async function getFocusQueue(now: string, db: CampusCopilotDB = campusCopilotDb): Promise<FocusQueueItem[]> {
  const [assignments, announcements, messages, grades, syncStates, overlays, recentChangeEvents] = await Promise.all([
    db.assignments.toArray(),
    db.announcements.toArray(),
    db.messages.toArray(),
    db.grades.toArray(),
    db.sync_state.toArray(),
    db.local_entity_overlay.toArray(),
    db.change_events.orderBy('occurredAt').reverse().limit(200).toArray(),
  ]);

  const overlayMap = new Map(overlays.map((overlay) => [overlay.entityId, overlay]));
  const recentChangeMap = buildRecentChangeMap(
    recentChangeEvents
      .map((event) => ChangeEventSchema.parse(event))
      .filter((event) => isWithinHours(event.occurredAt, now, 24 * 7)),
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

export async function getWeeklyLoad(now: string, db: CampusCopilotDB = campusCopilotDb): Promise<WeeklyLoadEntry[]> {
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
    bucket.items.push(toEntityRef(event));
    bucket.totalScore += overlay?.pinnedAt ? 70 : 40;
    if (overlay?.pinnedAt) {
      bucket.pinnedCount += 1;
    }
  }

  return buckets.map((bucket) => WeeklyLoadEntrySchema.parse(bucket));
}
