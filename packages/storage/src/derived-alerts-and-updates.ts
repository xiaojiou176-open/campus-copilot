import type {
  Alert,
  TimelineEntry,
} from '@campus-copilot/schema';
import {
  AlertSchema,
  TimelineEntrySchema,
} from '@campus-copilot/schema';
import {
  campusCopilotDb,
  RecentUpdatesFeedSchema,
  type CampusCopilotDB,
  type RecentUpdatesFeed,
} from './index';
import {
  compareNewest,
  isAssignmentOpen,
  isPast,
  isWithinHours,
  isWithinUpcomingHours,
  makePriorityReason,
  summarizeResourceFailures,
  toEntityRef,
} from './derived-shared';

export async function getPriorityAlerts(now: string, db: CampusCopilotDB = campusCopilotDb): Promise<Alert[]> {
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
  db: CampusCopilotDB = campusCopilotDb,
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
    const seenAt = Date.parse(state.seenAt);
    const occurredAt = Date.parse(entry.occurredAt);
    return Number.isNaN(seenAt) || Number.isNaN(occurredAt) ? true : seenAt < occurredAt;
  }).length;

  return RecentUpdatesFeedSchema.parse({
    items: sortedItems,
    unseenCount,
  });
}
