import type {
  Announcement,
  Assignment,
  Course,
  EntityRef,
  Event,
  Grade,
  Message,
  PriorityReason,
  Resource,
  TimelineEntry,
} from '@campus-copilot/schema';
import { EntityRefSchema } from '@campus-copilot/schema';
import type {
  ChangeEvent,
  EntityState,
  FocusQueueItem,
  LocalEntityOverlay,
  SyncState,
  WorkbenchFilter,
} from './contracts.ts';

export type TrackedEntity = Course | Resource | Assignment | Announcement | Grade | Message | Event;

export function toTimestamp(value?: string) {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

export function isWithinHours(value: string | undefined, now: string, hours: number) {
  const target = toTimestamp(value);
  const reference = toTimestamp(now);
  if (target === undefined || reference === undefined) {
    return false;
  }

  const delta = reference - target;
  return delta >= 0 && delta <= hours * 60 * 60 * 1000;
}

export function isWithinUpcomingHours(value: string | undefined, now: string, hours: number) {
  const target = toTimestamp(value);
  const reference = toTimestamp(now);
  if (target === undefined || reference === undefined) {
    return false;
  }

  const delta = target - reference;
  return delta >= 0 && delta <= hours * 60 * 60 * 1000;
}

export function isPast(value: string | undefined, now: string) {
  const target = toTimestamp(value);
  const reference = toTimestamp(now);
  if (target === undefined || reference === undefined) {
    return false;
  }

  return target < reference;
}

export function compareNewest(left: string | undefined, right: string | undefined) {
  return (toTimestamp(right) ?? 0) - (toTimestamp(left) ?? 0);
}

export function compareOldest(left: string | undefined, right: string | undefined) {
  return (toTimestamp(left) ?? Number.POSITIVE_INFINITY) - (toTimestamp(right) ?? Number.POSITIVE_INFINITY);
}

export function isAssignmentOpen(assignment: Assignment) {
  return assignment.status !== 'submitted' && assignment.status !== 'graded';
}

export function toDateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function startOfUtcDay(value: string, offsetDays = 0) {
  const day = new Date(value);
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() + offsetDays);
  return day;
}

export function endOfUtcDay(value: Date) {
  const day = new Date(value.getTime());
  day.setUTCHours(23, 59, 59, 999);
  return day;
}

export function toEntityRef(entity: TrackedEntity): EntityRef {
  return EntityRefSchema.parse({
    id: entity.id,
    kind: entity.kind,
    site: entity.site,
  });
}

export function makePriorityReason(
  code: PriorityReason['code'],
  label: string,
  importance: PriorityReason['importance'],
  relatedEntity?: EntityRef,
  detail?: string,
) {
  return {
    code,
    label,
    importance,
    relatedEntity,
    detail,
  } satisfies PriorityReason;
}

export function isOverlayDismissed(overlay: LocalEntityOverlay | undefined, now: string) {
  return Boolean(overlay?.dismissUntil && !isPast(overlay.dismissUntil, now));
}

export function isOverlaySnoozed(overlay: LocalEntityOverlay | undefined, now: string) {
  return Boolean(overlay?.snoozeUntil && !isPast(overlay.snoozeUntil, now));
}

export function summarizeResourceFailures(resourceFailures?: SyncState['resourceFailures']) {
  const resources = (resourceFailures ?? []).map((failure) => failure.resource);
  return resources.length > 0 ? resources.join(' / ') : '部分资源';
}

const MYUW_DECISION_SIGNAL_PATTERN =
  /\b(registration|register|registered|tuition|payment|billing|bill|fee|fees|hold|holds|full[- ]time|enrollment|enrolment)\b/i;

function hasMyUWDecisionSignal(values: Array<string | undefined>) {
  return values.some((value) => MYUW_DECISION_SIGNAL_PATTERN.test(value ?? ''));
}

export function isMyUWDecisionSignalAnnouncement(announcement: Announcement) {
  return announcement.site === 'myuw' && hasMyUWDecisionSignal([announcement.title, announcement.summary]);
}

export function isMyUWDecisionSignalEvent(event: Event) {
  return event.site === 'myuw' && hasMyUWDecisionSignal([event.title, event.summary, event.detail]);
}

export function getEventActionAt(event: Event) {
  return event.startAt ?? event.endAt;
}

export function matchesSiteFilter<
  T extends { site: WorkbenchFilter['site'] extends infer U ? Extract<U, string> : never },
>(records: T[], site: WorkbenchFilter['site']) {
  return site === 'all' ? records : records.filter((record) => record.site === site);
}

export function isEntryUnseen(entry: TimelineEntry, stateMap: Map<string, EntityState>) {
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

export function buildRecentChangeMap(changeEvents: ChangeEvent[]) {
  const map = new Map<string, ChangeEvent>();
  for (const event of changeEvents) {
    if (event.entityId && !map.has(event.entityId)) {
      map.set(event.entityId, event);
    }
  }
  return map;
}

export function isClusterReviewPending(input: {
  needsReview?: boolean;
  reviewDecision?: 'accepted' | 'review_later' | 'dismissed';
}) {
  if (!input.needsReview) {
    return false;
  }

  return input.reviewDecision !== 'accepted' && input.reviewDecision !== 'dismissed';
}

export function shouldUseMergedCluster(input: {
  needsReview?: boolean;
  reviewDecision?: 'accepted' | 'review_later' | 'dismissed';
}) {
  if (!input.needsReview) {
    return true;
  }

  return input.reviewDecision === 'accepted';
}

export function compareFocusQueueItems(left: FocusQueueItem, right: FocusQueueItem) {
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
