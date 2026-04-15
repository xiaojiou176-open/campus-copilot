import type {
  Announcement,
  Assignment,
  Event,
  Grade,
  Message,
  PriorityReason,
} from '@campus-copilot/schema';
import {
  ChangeEventSchema,
  FocusQueueItemSchema,
  type ChangeEvent,
  type FocusQueueItem,
  type LocalEntityOverlay,
  type SyncState,
} from './contracts.ts';
import { campusCopilotDb, type CampusCopilotDB } from './db.ts';
import { getAdministrativeSummaries, getAllWorkItemClusters } from './cluster-substrate.ts';
import {
  buildSiteSyncContext,
  formatBlockedResource,
  formatReasonDetail,
} from './focus-queue-shared.ts';
import {
  buildRecentChangeMap,
  compareFocusQueueItems,
  getEventActionAt,
  isAssignmentOpen,
  isClusterReviewPending,
  isMyUWDecisionSignalAnnouncement,
  isMyUWDecisionSignalEvent,
  isOverlayDismissed,
  isOverlaySnoozed,
  isPast,
  isWithinHours,
  isWithinUpcomingHours,
  makePriorityReason,
  shouldUseMergedCluster,
  toEntityRef,
} from './storage-shared.ts';

function normalizeClusterSite(site: string) {
  return site === 'myplan' ? 'myuw' : site;
}

function buildWorkItemClusterFocusItem(
  cluster: Awaited<ReturnType<typeof getAllWorkItemClusters>>[number],
  now: string,
  overlay: LocalEntityOverlay | undefined,
  siteSyncState: SyncState | undefined,
) {
  const reasons: PriorityReason[] = [];
  const syncContext = buildSiteSyncContext(siteSyncState, now);
  let score = 0;
  const entityKind =
    cluster.workType === 'grade_signal'
      ? 'grade'
      : cluster.workType === 'deadline_signal'
      ? 'event'
      : cluster.workType === 'admin_requirement' || cluster.workType === 'planning_requirement'
      ? 'announcement'
      : 'assignment';

  if (isOverlayDismissed(overlay, now)) {
    return undefined;
  }
  if (isOverlaySnoozed(overlay, now) && !overlay?.pinnedAt) {
    return undefined;
  }

  if (overlay?.pinnedAt) {
    reasons.push(makePriorityReason('manual', '你已手动置顶', 'high', undefined, '手动置顶会覆盖普通排序。'));
    score += 120;
  }

  if (cluster.workType === 'assignment' || cluster.workType === 'deadline_signal') {
    if (cluster.dueAt && isPast(cluster.dueAt, now)) {
      reasons.push(
        makePriorityReason('overdue', 'cluster 截止时间已过', 'critical', undefined, `截止时间是 ${cluster.dueAt}。`),
      );
      score += 240;
    } else if (cluster.dueAt && isWithinUpcomingHours(cluster.dueAt, now, 48)) {
      reasons.push(
        makePriorityReason('due_soon', 'cluster 48 小时内到期', 'high', undefined, `截止时间是 ${cluster.dueAt}。`),
      );
      score += 190;
    } else if (cluster.dueAt && isWithinUpcomingHours(cluster.dueAt, now, 24 * 7)) {
      reasons.push(
        makePriorityReason('due_soon', 'cluster 本周内到期', 'medium', undefined, `截止时间是 ${cluster.dueAt}。`),
      );
      score += 110;
    }
  } else if (cluster.workType === 'grade_signal') {
    reasons.push(makePriorityReason('new_grade', 'cluster 有新的成绩结果', 'medium'));
    score += 105;
  }

  if (isClusterReviewPending(cluster)) {
    reasons.push(
      makePriorityReason('recently_updated', '当前工作项仍是可能匹配', 'medium', undefined, '这条统一工作项仍需要人工确认。'),
    );
    score += 40;
  }

  if (syncContext.extraReason) {
    reasons.push(syncContext.extraReason);
    score += syncContext.extraScore;
  }

  if (reasons.length === 0) {
    return undefined;
  }

  return FocusQueueItemSchema.parse({
    id: `focus:${cluster.id}`,
    entityId: cluster.authorityEntityKey,
    entityRef: {
      id: cluster.authorityEntityKey,
      kind: entityKind,
      site: normalizeClusterSite(cluster.authoritySurface),
    },
    entity: {
      id: cluster.authorityEntityKey,
      kind: entityKind,
      site: normalizeClusterSite(cluster.authoritySurface),
    },
    kind: entityKind,
    site: normalizeClusterSite(cluster.authoritySurface),
    title: cluster.title,
    score,
    reasons,
    dueAt: cluster.dueAt ?? cluster.startAt ?? cluster.endAt,
    updatedAt: cluster.updatedAt,
    pinned: Boolean(overlay?.pinnedAt),
    note: overlay?.note,
    summary: cluster.summary,
    blockedBy: syncContext.blockedBy,
  });
}

function buildAdministrativeSummaryFocusItem(
  summary: Awaited<ReturnType<typeof getAdministrativeSummaries>>[number],
  now: string,
  siteSyncState: SyncState | undefined,
) {
  const syncContext = buildSiteSyncContext(siteSyncState, now);
  const importance = summary.importance === 'critical' ? 'critical' : summary.importance === 'high' ? 'high' : 'medium';
  const score = importance === 'critical' ? 220 : importance === 'high' ? 170 : 95;
  const reasons: PriorityReason[] = [
    makePriorityReason('important_announcement', `${summary.family} 摘要值得确认`, importance, undefined, summary.summary),
  ];

  if (syncContext.extraReason) {
    reasons.push(syncContext.extraReason);
  }

  return FocusQueueItemSchema.parse({
    id: `focus:${summary.id}`,
    kind: 'announcement',
    site: normalizeClusterSite(summary.sourceSurface),
    title: summary.title,
    score: score + syncContext.extraScore,
    reasons,
    updatedAt: summary.updatedAt,
    pinned: false,
    summary: summary.summary,
    blockedBy: summary.aiDefault === 'blocked' ? ['ai_blocked'] : syncContext.blockedBy,
  });
}

function buildAssignmentFocusItem(
  assignment: Assignment,
  overlay: LocalEntityOverlay | undefined,
  now: string,
  recentChangeEvent: ChangeEvent | undefined,
  siteSyncState: SyncState | undefined,
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
  const syncContext = buildSiteSyncContext(siteSyncState, now);
  let score = 0;

  if (overlay?.pinnedAt) {
    reasons.push(
      makePriorityReason('manual', '你已手动置顶', 'high', entityRef, '手动置顶会覆盖普通排序。'),
    );
    score += 120;
  }

  if (assignment.dueAt && isPast(assignment.dueAt, now)) {
    reasons.push(
      makePriorityReason(
        'overdue',
        '截止时间已过',
        'critical',
        entityRef,
        formatReasonDetail(
          `${assignment.status === 'missing' ? '当前仍是 missing 状态，' : ''}截止时间是 ${assignment.dueAt}。`,
        ),
      ),
    );
    score += assignment.status === 'missing' ? 260 : 230;
  } else if (assignment.dueAt && isWithinUpcomingHours(assignment.dueAt, now, 48)) {
    const importance = assignment.status === 'missing' ? 'critical' : 'high';
    reasons.push(
      makePriorityReason(
        'due_soon',
        '48 小时内到期',
        importance,
        entityRef,
        formatReasonDetail(
          `${assignment.status === 'missing' ? '当前仍是 missing 状态，' : ''}截止时间是 ${assignment.dueAt}。`,
        ),
      ),
    );
    score += assignment.status === 'missing' ? 210 : 180;
  } else if (assignment.dueAt && isWithinUpcomingHours(assignment.dueAt, now, 24 * 7)) {
    reasons.push(
      makePriorityReason('due_soon', '本周内到期', 'medium', entityRef, `截止时间是 ${assignment.dueAt}。`),
    );
    score += 90;
  }

  if (recentChangeEvent) {
    reasons.push(
      makePriorityReason(
        'recently_updated',
        '最近同步里有变化',
        'medium',
        entityRef,
        formatReasonDetail(recentChangeEvent.summary),
      ),
    );
    score += 25;
  }

  if (syncContext.extraReason) {
    reasons.push(syncContext.extraReason);
    score += syncContext.extraScore;
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
    summary: assignment.summary,
    blockedBy: syncContext.blockedBy,
  });
}

function buildAnnouncementFocusItem(
  announcement: Announcement,
  overlay: LocalEntityOverlay | undefined,
  now: string,
  recentChangeEvent: ChangeEvent | undefined,
  siteSyncState: SyncState | undefined,
) {
  if (isOverlayDismissed(overlay, now)) {
    return undefined;
  }
  if (isOverlaySnoozed(overlay, now) && !overlay?.pinnedAt) {
    return undefined;
  }

  const entityRef = toEntityRef(announcement);
  const reasons: PriorityReason[] = [];
  const syncContext = buildSiteSyncContext(siteSyncState, now);
  let score = 0;

  if (overlay?.pinnedAt) {
    reasons.push(
      makePriorityReason('manual', '你已手动置顶', 'high', entityRef, '手动置顶会覆盖普通排序。'),
    );
    score += 120;
  }
  if (isMyUWDecisionSignalAnnouncement(announcement)) {
    reasons.push(
      makePriorityReason(
        'important_announcement',
        'MyUW 提醒值得优先确认',
        'high',
        entityRef,
        announcement.summary
          ? `这条提醒与注册或学费决策相关：${announcement.summary}`
          : '这条 MyUW 提醒与注册或学费决策相关，建议尽快确认。',
      ),
    );
    score += 145;
  } else if (isWithinHours(announcement.postedAt, now, 48)) {
    reasons.push(
      makePriorityReason(
        'important_announcement',
        '最近有新公告',
        'medium',
        entityRef,
        `发布时间是 ${announcement.postedAt}。`,
      ),
    );
    score += 80;
  }
  if (recentChangeEvent) {
    reasons.push(
      makePriorityReason(
        'recently_updated',
        '最近同步里有变化',
        'medium',
        entityRef,
        formatReasonDetail(recentChangeEvent.summary),
      ),
    );
    score += 20;
  }

  if (syncContext.extraReason) {
    reasons.push(syncContext.extraReason);
    score += syncContext.extraScore;
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
    summary: announcement.summary,
    blockedBy: syncContext.blockedBy,
  });
}

function buildEventFocusItem(
  event: Event,
  overlay: LocalEntityOverlay | undefined,
  now: string,
  recentChangeEvent: ChangeEvent | undefined,
  siteSyncState: SyncState | undefined,
) {
  if (!isMyUWDecisionSignalEvent(event)) {
    return undefined;
  }
  if (isOverlayDismissed(overlay, now)) {
    return undefined;
  }
  if (isOverlaySnoozed(overlay, now) && !overlay?.pinnedAt) {
    return undefined;
  }

  const entityRef = toEntityRef(event);
  const reasons: PriorityReason[] = [];
  const syncContext = buildSiteSyncContext(siteSyncState, now);
  const actionAt = getEventActionAt(event);
  let score = 0;

  if (overlay?.pinnedAt) {
    reasons.push(
      makePriorityReason('manual', '你已手动置顶', 'high', entityRef, '手动置顶会覆盖普通排序。'),
    );
    score += 120;
  }

  if (actionAt && isPast(actionAt, now) && isWithinHours(actionAt, now, 24 * 7)) {
    reasons.push(
      makePriorityReason(
        'overdue',
        '相关提醒时间已过',
        'high',
        entityRef,
        `提醒时间是 ${actionAt}。`,
      ),
    );
    score += 180;
  } else if (actionAt && isWithinUpcomingHours(actionAt, now, 48)) {
    reasons.push(
      makePriorityReason(
        'due_soon',
        '48 小时内需要确认',
        'high',
        entityRef,
        `48 小时窗口内的 MyUW 提醒，时间是 ${actionAt}。`,
      ),
    );
    score += 150;
  } else if (actionAt && isWithinUpcomingHours(actionAt, now, 24 * 7)) {
    reasons.push(
      makePriorityReason(
        'due_soon',
        '本周内需要确认',
        'medium',
        entityRef,
        `本周内的 MyUW 提醒，时间是 ${actionAt}。`,
      ),
    );
    score += 105;
  } else if (!actionAt) {
    reasons.push(
      makePriorityReason(
        'important_announcement',
        'MyUW 提醒值得确认',
        'medium',
        entityRef,
        event.summary ?? event.detail ?? '这条 MyUW 日程提醒可能影响注册或费用安排。',
      ),
    );
    score += 80;
  }

  if (reasons.length === 0 && !recentChangeEvent && !syncContext.extraReason) {
    return undefined;
  }

  if (recentChangeEvent) {
    reasons.push(
      makePriorityReason(
        'recently_updated',
        '最近同步里有变化',
        'medium',
        entityRef,
        formatReasonDetail(recentChangeEvent.summary),
      ),
    );
    score += 20;
  }

  if (syncContext.extraReason) {
    reasons.push(syncContext.extraReason);
    score += syncContext.extraScore;
  }

  return FocusQueueItemSchema.parse({
    id: `focus:${event.id}`,
    entityId: event.id,
    entityRef,
    entity: entityRef,
    kind: event.kind,
    site: event.site,
    title: event.title,
    score,
    reasons,
    dueAt: actionAt,
    updatedAt: overlay?.updatedAt ?? event.updatedAt ?? actionAt,
    pinned: Boolean(overlay?.pinnedAt),
    note: overlay?.note,
    summary: event.summary ?? event.detail ?? event.location,
    blockedBy: syncContext.blockedBy,
  });
}

function buildMessageFocusItem(
  message: Message,
  overlay: LocalEntityOverlay | undefined,
  now: string,
  recentChangeEvent: ChangeEvent | undefined,
  siteSyncState: SyncState | undefined,
) {
  if (isOverlayDismissed(overlay, now)) {
    return undefined;
  }
  if (isOverlaySnoozed(overlay, now) && !overlay?.pinnedAt) {
    return undefined;
  }

  const entityRef = toEntityRef(message);
  const reasons: PriorityReason[] = [];
  const syncContext = buildSiteSyncContext(siteSyncState, now);
  let score = 0;

  if (overlay?.pinnedAt) {
    reasons.push(
      makePriorityReason('manual', '你已手动置顶', 'high', entityRef, '手动置顶会覆盖普通排序。'),
    );
    score += 120;
  }
  if (message.instructorAuthored && isWithinHours(message.createdAt, now, 72)) {
    reasons.push(
      makePriorityReason(
        'important_announcement',
        '老师最近有新动态',
        'high',
        entityRef,
        `最新消息时间是 ${message.createdAt}。`,
      ),
    );
    score += 150;
  } else if (message.unread && isWithinHours(message.createdAt, now, 72)) {
    reasons.push(
      makePriorityReason(
        'unread_activity',
        '近期有未读讨论',
        'medium',
        entityRef,
        `最新消息时间是 ${message.createdAt}。`,
      ),
    );
    score += 110;
  }
  if (recentChangeEvent) {
    reasons.push(
      makePriorityReason(
        'recently_updated',
        '最近同步里有变化',
        'medium',
        entityRef,
        formatReasonDetail(recentChangeEvent.summary),
      ),
    );
    score += 20;
  }

  if (syncContext.extraReason) {
    reasons.push(syncContext.extraReason);
    score += syncContext.extraScore;
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
    summary: message.summary,
    blockedBy: syncContext.blockedBy,
  });
}

function buildGradeFocusItem(
  grade: Grade,
  overlay: LocalEntityOverlay | undefined,
  now: string,
  recentChangeEvent: ChangeEvent | undefined,
  siteSyncState: SyncState | undefined,
) {
  if (isOverlayDismissed(overlay, now)) {
    return undefined;
  }
  if (isOverlaySnoozed(overlay, now) && !overlay?.pinnedAt) {
    return undefined;
  }

  const entityRef = toEntityRef(grade);
  const reasons: PriorityReason[] = [];
  const syncContext = buildSiteSyncContext(siteSyncState, now);
  let score = 0;

  if (overlay?.pinnedAt) {
    reasons.push(
      makePriorityReason('manual', '你已手动置顶', 'high', entityRef, '手动置顶会覆盖普通排序。'),
    );
    score += 120;
  }
  if (isWithinHours(grade.releasedAt ?? grade.gradedAt, now, 24 * 7)) {
    reasons.push(
      makePriorityReason(
        'new_grade',
        '最近出了新成绩',
        'medium',
        entityRef,
        `当前成绩是 ${grade.score ?? '-'} / ${grade.maxScore ?? '-'}。`,
      ),
    );
    score += 100;
  }
  if (recentChangeEvent) {
    reasons.push(
      makePriorityReason(
        'recently_updated',
        '最近同步里有变化',
        'medium',
        entityRef,
        formatReasonDetail(recentChangeEvent.summary),
      ),
    );
    score += 20;
  }

  if (syncContext.extraReason) {
    reasons.push(syncContext.extraReason);
    score += syncContext.extraScore;
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
    summary:
      grade.score != null || grade.maxScore != null
        ? `${grade.score ?? '-'} / ${grade.maxScore ?? '-'}`
        : undefined,
    blockedBy: syncContext.blockedBy,
  });
}

function buildSyncFocusItem(syncState: SyncState, now: string) {
  if (syncState.status !== 'error' && syncState.lastOutcome !== 'partial_success') {
    return undefined;
  }

  const blockedBy = (syncState.resourceFailures ?? []).map((item) => formatBlockedResource(item.resource));
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
    reasons: [
      makePriorityReason(
        'sync_stale',
        label,
        importance,
        undefined,
        syncState.lastOutcome === 'partial_success'
          ? `缺失资源：${blockedBy.join(' / ') || '无明确资源名'}。`
          : formatReasonDetail(syncState.errorReason) ?? '最近一次同步没有成功完成。',
      ),
    ],
    blockedBy,
    updatedAt: syncState.lastSyncedAt ?? now,
    pinned: false,
  });
}

export async function getFocusQueue(now: string, db: CampusCopilotDB = campusCopilotDb): Promise<FocusQueueItem[]> {
  const [assignments, announcements, messages, grades, events, syncStates, overlays, recentChangeEvents, workItemClusters, administrativeSummaries] = await Promise.all([
    db.assignments.toArray(),
    db.announcements.toArray(),
    db.messages.toArray(),
    db.grades.toArray(),
    db.events.toArray(),
    db.sync_state.toArray(),
    db.local_entity_overlay.toArray(),
    db.change_events.orderBy('occurredAt').reverse().limit(200).toArray(),
    getAllWorkItemClusters(db),
    getAdministrativeSummaries(db),
  ]);

  const overlayMap = new Map(overlays.map((overlay) => [overlay.entityId, overlay]));
  const syncStateBySite = new Map(syncStates.map((syncState) => [syncState.site, syncState]));
  const workItemClusterByEntityKey = new Map<string, Awaited<ReturnType<typeof getAllWorkItemClusters>>[number]>();
  for (const cluster of workItemClusters) {
    for (const entityKey of cluster.memberEntityKeys) {
      if (!workItemClusterByEntityKey.has(entityKey)) {
        workItemClusterByEntityKey.set(entityKey, cluster);
      }
    }
  }
  const recentChangeMap = buildRecentChangeMap(
    recentChangeEvents
      .map((event) => ChangeEventSchema.parse(event))
      .filter((event) => isWithinHours(event.occurredAt, now, 24 * 7)),
  );
  const items: FocusQueueItem[] = [];
  const emittedClusterIds = new Set<string>();

  for (const assignment of assignments) {
    const cluster = workItemClusterByEntityKey.get(assignment.id);
    if (!cluster) {
      const item = buildAssignmentFocusItem(
        assignment,
        overlayMap.get(assignment.id),
        now,
        recentChangeMap.get(assignment.id),
        syncStateBySite.get(assignment.site),
      );
      if (item) {
        items.push(item);
      }
      continue;
    }

    if (isClusterReviewPending(cluster)) {
      if (cluster.authorityEntityKey !== assignment.id || emittedClusterIds.has(cluster.id)) {
        continue;
      }
      emittedClusterIds.add(cluster.id);
      const item = buildAssignmentFocusItem(
        assignment,
        overlayMap.get(assignment.id),
        now,
        recentChangeMap.get(assignment.id),
        syncStateBySite.get(assignment.site),
      );
      if (item) {
        items.push(item);
      }
      continue;
    }

    if (shouldUseMergedCluster(cluster)) {
      if (!emittedClusterIds.has(cluster.id)) {
        emittedClusterIds.add(cluster.id);
        const item = buildWorkItemClusterFocusItem(
          cluster,
          now,
          overlayMap.get(cluster.authorityEntityKey),
          cluster.authoritySurface === 'myplan' ? undefined : syncStateBySite.get(cluster.authoritySurface),
        );
        if (item) {
          items.push(item);
        }
      }
      continue;
    }

    const item = buildAssignmentFocusItem(
      assignment,
      overlayMap.get(assignment.id),
      now,
      recentChangeMap.get(assignment.id),
      syncStateBySite.get(assignment.site),
    );
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
      syncStateBySite.get(announcement.site),
    );
    if (item) {
      items.push(item);
    }
  }

  for (const grade of grades) {
    const cluster = workItemClusterByEntityKey.get(grade.id);
    if (!cluster) {
      const item = buildGradeFocusItem(
        grade,
        overlayMap.get(grade.id),
        now,
        recentChangeMap.get(grade.id),
        syncStateBySite.get(grade.site),
      );
      if (item) {
        items.push(item);
      }
      continue;
    }

    if (isClusterReviewPending(cluster)) {
      if (cluster.authorityEntityKey !== grade.id || emittedClusterIds.has(cluster.id)) {
        continue;
      }
      emittedClusterIds.add(cluster.id);
      const item = buildGradeFocusItem(
        grade,
        overlayMap.get(grade.id),
        now,
        recentChangeMap.get(grade.id),
        syncStateBySite.get(grade.site),
      );
      if (item) {
        items.push(item);
      }
      continue;
    }

    if (shouldUseMergedCluster(cluster)) {
      if (!emittedClusterIds.has(cluster.id)) {
        emittedClusterIds.add(cluster.id);
        const item = buildWorkItemClusterFocusItem(
          cluster,
          now,
          overlayMap.get(cluster.authorityEntityKey),
          cluster.authoritySurface === 'myplan' ? undefined : syncStateBySite.get(cluster.authoritySurface),
        );
        if (item) {
          items.push(item);
        }
      }
      continue;
    }

    const item = buildGradeFocusItem(
      grade,
      overlayMap.get(grade.id),
      now,
      recentChangeMap.get(grade.id),
      syncStateBySite.get(grade.site),
    );
    if (item) {
      items.push(item);
    }
  }

  for (const event of events) {
    const cluster = workItemClusterByEntityKey.get(event.id);
    if (!cluster) {
      const item = buildEventFocusItem(
        event,
        overlayMap.get(event.id),
        now,
        recentChangeMap.get(event.id),
        syncStateBySite.get(event.site),
      );
      if (item) {
        items.push(item);
      }
      continue;
    }

    if (isClusterReviewPending(cluster)) {
      if (cluster.authorityEntityKey !== event.id || emittedClusterIds.has(cluster.id)) {
        continue;
      }
      emittedClusterIds.add(cluster.id);
      const item = buildEventFocusItem(
        event,
        overlayMap.get(event.id),
        now,
        recentChangeMap.get(event.id),
        syncStateBySite.get(event.site),
      );
      if (item) {
        items.push(item);
      }
      continue;
    }

    if (shouldUseMergedCluster(cluster)) {
      if (!emittedClusterIds.has(cluster.id)) {
        emittedClusterIds.add(cluster.id);
        const item = buildWorkItemClusterFocusItem(
          cluster,
          now,
          overlayMap.get(cluster.authorityEntityKey),
          cluster.authoritySurface === 'myplan' ? undefined : syncStateBySite.get(cluster.authoritySurface),
        );
        if (item) {
          items.push(item);
        }
      }
      continue;
    }

    const item = buildEventFocusItem(
      event,
      overlayMap.get(event.id),
      now,
      recentChangeMap.get(event.id),
      syncStateBySite.get(event.site),
    );
    if (item) {
      items.push(item);
    }
  }

  for (const summary of administrativeSummaries) {
    items.push(
      buildAdministrativeSummaryFocusItem(
        summary,
        now,
        summary.sourceSurface === 'myplan' ? undefined : syncStateBySite.get(summary.sourceSurface),
      ),
    );
  }

  for (const message of messages) {
    const item = buildMessageFocusItem(
      message,
      overlayMap.get(message.id),
      now,
      recentChangeMap.get(message.id),
      syncStateBySite.get(message.site),
    );
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
