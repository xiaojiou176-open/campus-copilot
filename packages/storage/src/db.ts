import Dexie, { type Table } from 'dexie';
import type { Announcement, Assignment, Course, Event, Grade, Message, Resource } from '@opencampus/schema';
import type {
  AdminCarrierRecord,
  AdministrativeSummary,
  ChangeEvent,
  ClusterReviewOverride,
  CourseCluster,
  EntityState,
  LocalEntityOverlay,
  MergeLedgerEntry,
  PlanningSubstrateOwner,
  SyncRun,
  SyncState,
  WorkItemCluster,
} from './contracts.ts';

export class OpenCampusDB extends Dexie {
  courses!: Table<Course, string>;
  resources!: Table<Resource, string>;
  assignments!: Table<Assignment, string>;
  announcements!: Table<Announcement, string>;
  grades!: Table<Grade, string>;
  messages!: Table<Message, string>;
  events!: Table<Event, string>;
  sync_state!: Table<SyncState, string>;
  entity_state!: Table<EntityState, string>;
  local_entity_overlay!: Table<LocalEntityOverlay, string>;
  planning_substrates!: Table<PlanningSubstrateOwner, string>;
  admin_carriers!: Table<AdminCarrierRecord, string>;
  course_clusters!: Table<CourseCluster, string>;
  work_item_clusters!: Table<WorkItemCluster, string>;
  merge_ledger!: Table<MergeLedgerEntry, string>;
  cluster_review_overrides!: Table<ClusterReviewOverride, string>;
  administrative_summaries!: Table<AdministrativeSummary, string>;
  sync_runs!: Table<SyncRun, string>;
  change_events!: Table<ChangeEvent, string>;

  constructor(name = 'opencampus') {
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
    this.version(7).stores({
      courses: '&id, site, title, code',
      resources: '&id, site, courseId, releasedAt, resourceKind',
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
    this.version(8).stores({
      courses: '&id, site, title, code',
      resources: '&id, site, courseId, releasedAt, resourceKind',
      assignments: '&id, site, courseId, dueAt, status',
      announcements: '&id, site, courseId, postedAt',
      grades: '&id, site, courseId, assignmentId, releasedAt, gradedAt',
      messages: '&id, site, courseId, createdAt, unread',
      events: '&id, site, eventKind, startAt, endAt',
      alerts: null,
      sync_state: '&key, site, status, lastSyncedAt, lastOutcome',
      entity_state: '&key, site, kind, firstSeenAt, lastSyncedAt, seenAt',
      local_entity_overlay: '&entityId, site, kind, updatedAt, pinnedAt, snoozeUntil, dismissUntil',
      planning_substrates: '&id, source, fit, capturedAt, planId',
      sync_runs: '&id, site, completedAt, startedAt, outcome',
      change_events: '&id, runId, site, entityId, changeType, occurredAt',
    });
    this.version(9).stores({
      courses: '&id, site, title, code',
      resources: '&id, site, courseId, releasedAt, resourceKind',
      assignments: '&id, site, courseId, dueAt, status',
      announcements: '&id, site, courseId, postedAt',
      grades: '&id, site, courseId, assignmentId, releasedAt, gradedAt',
      messages: '&id, site, courseId, createdAt, unread',
      events: '&id, site, eventKind, startAt, endAt',
      alerts: null,
      sync_state: '&key, site, status, lastSyncedAt, lastOutcome',
      entity_state: '&key, site, kind, firstSeenAt, lastSyncedAt, seenAt',
      local_entity_overlay: '&entityId, site, kind, updatedAt, pinnedAt, snoozeUntil, dismissUntil',
      planning_substrates: '&id, source, fit, capturedAt, planId',
      admin_carriers: '&id, family, sourceSurface, updatedAt',
      course_clusters: '&id, canonicalCourseKey, termKey, authoritySurface, confidenceBand, *memberEntityKeys, updatedAt',
      work_item_clusters: '&id, courseClusterId, workType, dueAt, confidenceBand, *memberEntityKeys, updatedAt',
      merge_ledger: '&id, [targetKind+targetId], [surfaceKey+entityKey], decision, decidedAt',
      administrative_summaries: '&id, family, sourceSurface, importance, updatedAt',
      sync_runs: '&id, site, completedAt, startedAt, outcome',
      change_events: '&id, runId, site, entityId, changeType, occurredAt',
    });
    this.version(10).stores({
      courses: '&id, site, title, code',
      resources: '&id, site, courseId, releasedAt, resourceKind',
      assignments: '&id, site, courseId, dueAt, status',
      announcements: '&id, site, courseId, postedAt',
      grades: '&id, site, courseId, assignmentId, releasedAt, gradedAt',
      messages: '&id, site, courseId, createdAt, unread',
      events: '&id, site, eventKind, startAt, endAt',
      alerts: null,
      sync_state: '&key, site, status, lastSyncedAt, lastOutcome',
      entity_state: '&key, site, kind, firstSeenAt, lastSyncedAt, seenAt',
      local_entity_overlay: '&entityId, site, kind, updatedAt, pinnedAt, snoozeUntil, dismissUntil',
      planning_substrates: '&id, source, fit, capturedAt, planId',
      admin_carriers: '&id, family, sourceSurface, updatedAt',
      course_clusters: '&id, canonicalCourseKey, termKey, authoritySurface, confidenceBand, *memberEntityKeys, updatedAt',
      work_item_clusters: '&id, courseClusterId, workType, dueAt, confidenceBand, *memberEntityKeys, updatedAt',
      merge_ledger: '&id, [targetKind+targetId], [surfaceKey+entityKey], decision, decidedAt',
      administrative_summaries: '&id, family, sourceSurface, importance, updatedAt',
      sync_runs: '&id, site, completedAt, startedAt, outcome',
      change_events: '&id, runId, site, entityId, changeType, occurredAt',
    });
    this.version(11).stores({
      courses: '&id, site, title, code',
      resources: '&id, site, courseId, releasedAt, resourceKind',
      assignments: '&id, site, courseId, dueAt, status',
      announcements: '&id, site, courseId, postedAt',
      grades: '&id, site, courseId, assignmentId, releasedAt, gradedAt',
      messages: '&id, site, courseId, createdAt, unread',
      events: '&id, site, eventKind, startAt, endAt',
      alerts: null,
      sync_state: '&key, site, status, lastSyncedAt, lastOutcome',
      entity_state: '&key, site, kind, firstSeenAt, lastSyncedAt, seenAt',
      local_entity_overlay: '&entityId, site, kind, updatedAt, pinnedAt, snoozeUntil, dismissUntil',
      planning_substrates: '&id, source, fit, capturedAt, planId',
      admin_carriers: '&id, family, sourceSurface, updatedAt',
      course_clusters: '&id, canonicalCourseKey, termKey, authoritySurface, confidenceBand, *memberEntityKeys, updatedAt',
      work_item_clusters: '&id, courseClusterId, workType, dueAt, confidenceBand, *memberEntityKeys, updatedAt',
      merge_ledger: '&id, [targetKind+targetId], [surfaceKey+entityKey], decision, decidedAt',
      cluster_review_overrides: '&id, targetKind, targetId, decision, decidedAt',
      administrative_summaries: '&id, family, sourceSurface, importance, updatedAt',
      sync_runs: '&id, site, completedAt, startedAt, outcome',
      change_events: '&id, runId, site, entityId, changeType, occurredAt',
    });
  }
}

export function createOpenCampusDb(name?: string) {
  return new OpenCampusDB(name);
}

export const openCampusDb = createOpenCampusDb();
