import Dexie from 'dexie';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Announcement, Assignment, Course, Event, Grade, Message } from '@campus-copilot/schema';
import * as storage from './index';
import { WorkItemClusterSchema } from './contracts';
import {
  clearLocalEntityOverlayField,
  createCampusCopilotDb,
  getAllAnnouncements,
  getFocusQueue,
  getLatestSyncRuns,
  getTodaySnapshot,
  getPriorityAlerts,
  getRecentChangeEvents,
  getRecentUpdates,
  getWeeklyLoad,
  getWorkbenchView,
  getAssignmentsBySite,
  getEntityCounts,
  getLatestPlanningSubstrateBySource,
  getPlanningSubstratesBySource,
  getSiteEntityCounts,
  markEntitiesSeen,
  putAnnouncements,
  putAssignments,
  putPlanningSubstrates,
  putCourses,
  recordSiteSyncError,
  replacePlanningSubstratesBySource,
  replaceSiteSnapshot,
  upsertLocalEntityOverlay,
} from './index';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

const source = {
  site: 'canvas' as const,
  resourceId: '1',
  resourceType: 'assignment',
};

describe('storage package', () => {
  const db = createCampusCopilotDb('campus-copilot-test');

  beforeEach(async () => {
    await db.delete();
    db.open();
  });

  it('keeps the public barrel explicit and does not leak internal storage helpers', () => {
    expect(storage).toHaveProperty('getFocusQueue');
    expect(storage).toHaveProperty('getPriorityAlerts');
    expect(storage).toHaveProperty('PlanningSubstrateOwnerSchema');
    expect(storage).toHaveProperty('useWorkbenchView');
    expect(storage).toHaveProperty('putSyncState');
    expect(storage).not.toHaveProperty('compareNewest');
    expect(storage).not.toHaveProperty('toEntityRef');
    expect(storage).not.toHaveProperty('makePriorityReason');
  });

  it('initializes dexie tables and records entity counts', async () => {
    const course: Course = {
      id: 'course-1',
      kind: 'course',
      site: 'canvas',
      source,
      title: 'CSE 142',
    };
    const assignment: Assignment = {
      id: 'assignment-1',
      kind: 'assignment',
      site: 'canvas',
      source,
      courseId: 'course-1',
      title: 'Homework 1',
      dueAt: '2026-03-25T23:59:00-07:00',
      status: 'todo',
    };
    const announcement: Announcement = {
      id: 'announcement-1',
      kind: 'announcement',
      site: 'canvas',
      source: { ...source, resourceType: 'announcement' },
      courseId: 'course-1',
      title: 'Section moved',
      postedAt: '2026-03-24T10:00:00-07:00',
    };

    await putCourses([course], db);
    await putAssignments([assignment], db);
    await putAnnouncements([announcement], db);
    await replaceSiteSnapshot(
      'canvas',
      {
        courses: [course],
        assignments: [assignment],
        announcements: [announcement],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:30:00-07:00',
      },
      db,
    );

    await expect(getEntityCounts(db)).resolves.toEqual({
      courses: 1,
      resources: 0,
      assignments: 1,
      announcements: 1,
      messages: 0,
      events: 0,
    });
  });

  it('persists and reads unified schema records only', async () => {
    await putAssignments(
      [
        {
          id: 'assignment-2',
          kind: 'assignment',
          site: 'canvas',
          source,
          title: 'Homework 2',
          dueAt: '2026-03-26T23:59:00-07:00',
          status: 'todo',
        },
      ],
      db,
    );

    const assignments = await getAssignmentsBySite('canvas', db);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]?.title).toBe('Homework 2');
  });

  it('exposes a strict shared planning substrate owner without protected MyPlan fields', () => {
    const owner = storage.PlanningSubstrateOwnerSchema.parse({
      id: 'myplan:student-plan',
      source: 'myplan',
      fit: 'derived_planning_substrate',
      readOnly: true,
      capturedAt: '2026-04-09T18:00:00.000Z',
      planId: 'student-plan',
      planLabel: 'Student Plan',
      termCount: 2,
      plannedCourseCount: 6,
      backupCourseCount: 1,
      scheduleOptionCount: 3,
      requirementGroupCount: 4,
      programExplorationCount: 2,
      degreeProgressSummary: '90 of 180 credits planned or completed',
      transferPlanningSummary: 'Transfer credits still need manual review.',
      currentStage: 'partial_shared_landing',
      runtimePosture: 'comparison_oriented_planning_substrate',
      currentTruth: 'MyPlan is a real planning lane but still summary-first.',
      exactBlockers: [
        {
          id: 'plan_audit_dual_capture',
          class: 'repo-owned blocker',
          summary: 'Planning Pulse still needs both plan context and audit-summary context before it can claim complete shared coverage.',
          whyItStopsPromotion: 'A single MyPlan or DARS capture still leaves the other half missing from the shared Planning Pulse lane.',
        },
      ],
      hardDeferredMoves: ['registration handoff'],
      terms: [
        {
          termCode: '2026-spring',
          termLabel: 'Spring 2026',
          plannedCourseCount: 3,
          backupCourseCount: 1,
          scheduleOptionCount: 2,
          summary: 'Core major classes stay on track.',
        },
      ],
    });

    expect(owner.fit).toBe('derived_planning_substrate');
    expect(owner.source).toBe('myplan');
    expect(owner.readOnly).toBe(true);
    expect(owner.currentStage).toBe('partial_shared_landing');
    expect(owner.exactBlockers[0]?.id).toBe('plan_audit_dual_capture');
    expect(owner.termCount).toBe(2);
    expect(owner.terms[0]?.termCode).toBe('2026-spring');

    expect(() =>
      storage.PlanningSubstrateOwnerSchema.parse({
        ...owner,
        registrationHandoff: 'register now',
      }),
    ).toThrow();

    expect(() =>
      storage.PlanningSubstrateOwnerSchema.parse({
        ...owner,
        adviserShare: 'share this with adviser',
      }),
    ).toThrow();
  });

  it('persists and replaces shared planning substrates by source', async () => {
    const springOwner = storage.PlanningSubstrateOwnerSchema.parse({
      id: 'myplan:student-plan:spring',
      source: 'myplan',
      fit: 'derived_planning_substrate',
      readOnly: true,
      capturedAt: '2026-04-10T07:00:00.000Z',
      planId: 'student-plan',
      planLabel: 'Student Plan',
      termCount: 1,
      plannedCourseCount: 3,
      backupCourseCount: 1,
      scheduleOptionCount: 2,
      requirementGroupCount: 4,
      programExplorationCount: 1,
      terms: [
        {
          termCode: '2026-spring',
          termLabel: 'Spring 2026',
          plannedCourseCount: 3,
          backupCourseCount: 1,
          scheduleOptionCount: 2,
        },
      ],
    });
    const autumnOwner = storage.PlanningSubstrateOwnerSchema.parse({
      ...springOwner,
      id: 'myplan:student-plan:autumn',
      capturedAt: '2026-04-10T08:00:00.000Z',
      termCount: 2,
      plannedCourseCount: 6,
      terms: [
        ...springOwner.terms,
        {
          termCode: '2026-autumn',
          termLabel: 'Autumn 2026',
          plannedCourseCount: 3,
          backupCourseCount: 0,
          scheduleOptionCount: 1,
        },
      ],
    });

    await putPlanningSubstrates([springOwner], db);
    await expect(getPlanningSubstratesBySource('myplan', db)).resolves.toHaveLength(1);

    await replacePlanningSubstratesBySource('myplan', [autumnOwner], db);

    const records = await getPlanningSubstratesBySource('myplan', db);
    expect(records).toHaveLength(1);
    expect(records[0]?.id).toBe('myplan:student-plan:autumn');

    const latest = await getLatestPlanningSubstrateBySource('myplan', db);
    expect(latest?.capturedAt).toBe('2026-04-10T08:00:00.000Z');
    expect(latest?.plannedCourseCount).toBe(6);
  });

  it('surfaces planning substrates only on the shared all-sites workbench view', async () => {
    const olderOwner = storage.PlanningSubstrateOwnerSchema.parse({
      id: 'myplan:student-plan:older',
      source: 'myplan',
      fit: 'derived_planning_substrate',
      readOnly: true,
      capturedAt: '2026-04-10T07:00:00.000Z',
      planId: 'student-plan',
      planLabel: 'Student Plan',
      termCount: 1,
      plannedCourseCount: 3,
      backupCourseCount: 1,
      scheduleOptionCount: 2,
      requirementGroupCount: 4,
      programExplorationCount: 1,
      terms: [],
    });
    const newerOwner = storage.PlanningSubstrateOwnerSchema.parse({
      ...olderOwner,
      id: 'myplan:student-plan:newer',
      capturedAt: '2026-04-10T09:00:00.000Z',
      termCount: 2,
      plannedCourseCount: 6,
    });
    const timeScheduleOwner = storage.PlanningSubstrateOwnerSchema.parse({
      id: 'time-schedule:planning-substrate:spring-2026',
      source: 'time-schedule',
      fit: 'derived_planning_substrate',
      readOnly: true,
      capturedAt: '2026-04-10T09:30:00.000Z',
      planId: 'time-schedule:spring-2026',
      planLabel: 'Time Schedule · Spring 2026',
      termCount: 1,
      plannedCourseCount: 12,
      backupCourseCount: 0,
      scheduleOptionCount: 18,
      requirementGroupCount: 0,
      programExplorationCount: 0,
      currentStage: 'partial_shared_landing',
      runtimePosture: 'public_course_offerings_planning_lane',
      currentTruth: 'Time Schedule is a public planning carrier, not authenticated schedule parity.',
      exactBlockers: [
        {
          id: 'netid_richer_schedule_view',
          class: 'owner-manual later',
          summary: 'Richer authenticated schedule view still needs live proof.',
          whyItStopsPromotion: 'The public planning lane is real, but the NetID-only lane still needs canonical corroboration.',
        },
      ],
      hardDeferredMoves: ['registration helper'],
      terms: [
        {
          termCode: 'spring-2026',
          termLabel: 'Spring 2026',
          plannedCourseCount: 12,
          backupCourseCount: 0,
          scheduleOptionCount: 18,
        },
      ],
    });

    await putPlanningSubstrates([olderOwner, newerOwner, timeScheduleOwner], db);

    const allSitesView = await getWorkbenchView(
      '2026-04-10T09:30:00.000Z',
      {
        site: 'all',
        onlyUnseenUpdates: false,
      },
      db,
    );
    expect(allSitesView.planningSubstrates.map((item) => item.id)).toEqual([
      'time-schedule:planning-substrate:spring-2026',
      'myplan:student-plan:newer',
      'myplan:student-plan:older',
    ]);

    const canvasOnlyView = await getWorkbenchView(
      '2026-04-10T09:30:00.000Z',
      {
        site: 'canvas',
        onlyUnseenUpdates: false,
      },
      db,
    );
    expect(canvasOnlyView.planningSubstrates).toEqual([]);
  });

  it('replaces a site snapshot atomically and tracks site counts', async () => {
    const course: Course = {
      id: 'canvas:course:1',
      kind: 'course',
      site: 'canvas',
      source,
      title: 'CSE 142',
    };
    const assignment: Assignment = {
      id: 'canvas:assignment:1',
      kind: 'assignment',
      site: 'canvas',
      source,
      courseId: 'canvas:course:1',
      title: 'Homework 1',
      dueAt: '2026-03-25T23:59:00-07:00',
      status: 'todo',
    };
    const announcement: Announcement = {
      id: 'canvas:announcement:1',
      kind: 'announcement',
      site: 'canvas',
      source: { ...source, resourceType: 'announcement' },
      courseId: 'canvas:course:1',
      title: 'Welcome',
      postedAt: '2026-03-24T10:00:00-07:00',
    };

    await replaceSiteSnapshot(
      'canvas',
      {
        courses: [course],
        assignments: [assignment],
        announcements: [announcement],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:30:00-07:00',
      },
      db,
    );

    await expect(getSiteEntityCounts('canvas', db)).resolves.toEqual({
      site: 'canvas',
      courses: 1,
      resources: 0,
      assignments: 1,
      announcements: 1,
      grades: 0,
      messages: 0,
      events: 0,
    });
  });

  it('records sync errors without writing dirty entity payloads', async () => {
    await recordSiteSyncError('canvas', 'not_logged_in', '2026-03-24T18:31:00-07:00', 'not_logged_in', undefined, db);

    await expect(getSiteEntityCounts('canvas', db)).resolves.toEqual({
      site: 'canvas',
      courses: 0,
      resources: 0,
      assignments: 0,
      announcements: 0,
      grades: 0,
      messages: 0,
      events: 0,
    });
  });

  it('preserves untouched resource families when only assignments refresh for a site', async () => {
    const announcement: Announcement = {
      id: 'canvas:announcement:preserved',
      kind: 'announcement',
      site: 'canvas',
      source: { ...source, resourceId: 'announcement-preserved', resourceType: 'announcement' },
      courseId: 'canvas:course:1',
      title: 'Keep this announcement',
      postedAt: '2026-03-24T10:00:00-07:00',
    };
    const assignmentBefore: Assignment = {
      id: 'canvas:assignment:partial-before',
      kind: 'assignment',
      site: 'canvas',
      source,
      courseId: 'canvas:course:1',
      title: 'Homework before refresh',
      dueAt: '2026-03-25T23:59:00-07:00',
      status: 'todo',
      actionHints: [],
    };
    const assignmentAfter: Assignment = {
      ...assignmentBefore,
      title: 'Homework after refresh',
      dueAt: '2026-03-26T23:59:00-07:00',
    };

    await replaceSiteSnapshot(
      'canvas',
      {
        assignments: [assignmentBefore],
        announcements: [announcement],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:32:00-07:00',
      },
      db,
    );

    await replaceSiteSnapshot(
      'canvas',
      {
        assignments: [assignmentAfter],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:35:00-07:00',
      },
      db,
    );

    await expect(getAssignmentsBySite('canvas', db)).resolves.toEqual([assignmentAfter]);
    await expect(getAllAnnouncements(db)).resolves.toEqual([announcement]);
  });

  it('builds workbench read models from canonical storage', async () => {
    const course: Course = {
      id: 'canvas:course:1',
      kind: 'course',
      site: 'canvas',
      source,
      title: 'CSE 142',
    };
    const assignment: Assignment = {
      id: 'canvas:assignment:1',
      kind: 'assignment',
      site: 'canvas',
      source,
      courseId: 'canvas:course:1',
      title: 'Homework 1',
      dueAt: '2026-03-25T23:59:00-07:00',
      status: 'todo',
    };
    const announcement: Announcement = {
      id: 'canvas:announcement:1',
      kind: 'announcement',
      site: 'canvas',
      source: { ...source, resourceType: 'announcement' },
      courseId: 'canvas:course:1',
      title: 'Project update',
      postedAt: '2026-03-24T10:00:00-07:00',
    };
    const grade: Grade = {
      id: 'gradescope:grade:1',
      kind: 'grade',
      site: 'gradescope',
      source: { ...source, site: 'gradescope', resourceId: 'grade-1', resourceType: 'grade' },
      courseId: 'gradescope:course:1',
      assignmentId: 'gradescope:assignment:1',
      title: 'Homework 1',
      score: 95,
      maxScore: 100,
      releasedAt: '2026-03-24T15:00:00-07:00',
    };
    const message: Message = {
      id: 'edstem:message:1',
      kind: 'message',
      site: 'edstem',
      source: { ...source, site: 'edstem', resourceId: 'thread-1', resourceType: 'thread' },
      messageKind: 'thread',
      title: 'Instructor follow-up',
      summary: 'Staff posted the final review checklist.',
      createdAt: '2026-03-24T12:00:00-07:00',
      unread: true,
      instructorAuthored: true,
    };

    await replaceSiteSnapshot(
      'canvas',
      {
        courses: [course],
        assignments: [assignment],
        announcements: [announcement],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:30:00-07:00',
      },
      db,
    );

    await replaceSiteSnapshot(
      'gradescope',
      {
        grades: [grade],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:31:00-07:00',
      },
      db,
    );

    await replaceSiteSnapshot(
      'edstem',
      {
        messages: [message],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:32:00-07:00',
      },
      db,
    );

    const now = '2026-03-24T18:40:00-07:00';
    const [snapshot, alerts, updates] = await Promise.all([
      getTodaySnapshot(now, db),
      getPriorityAlerts(now, db),
      getRecentUpdates(now, 10, db),
    ]);

    expect(snapshot.totalAssignments).toBe(1);
    expect(snapshot.dueSoonAssignments).toBe(1);
    expect(snapshot.newGrades).toBe(1);
    expect(snapshot.syncedSites).toBe(3);

    expect(alerts.some((alert) => alert.alertKind === 'due_soon')).toBe(true);
    expect(alerts.some((alert) => alert.alertKind === 'new_grade')).toBe(true);
    expect(updates.items.some((entry) => entry.timelineKind === 'announcement_posted')).toBe(true);
    expect(updates.items.find((entry) => entry.timelineKind === 'discussion_replied')?.summary).toContain(
      'final review checklist',
    );
    expect(updates.unseenCount).toBeGreaterThan(0);
  });

  it('marks recent updates as seen', async () => {
    const message: Message = {
      id: 'edstem:message:2',
      kind: 'message',
      site: 'edstem',
      source: { ...source, site: 'edstem', resourceId: 'thread-2', resourceType: 'thread' },
      messageKind: 'thread',
      title: 'New reply',
      createdAt: '2026-03-24T13:00:00-07:00',
      unread: true,
    };

    await replaceSiteSnapshot(
      'edstem',
      {
        messages: [message],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:33:00-07:00',
      },
      db,
    );

    const before = await getRecentUpdates('2026-03-24T18:40:00-07:00', 10, db);
    expect(before.unseenCount).toBeGreaterThan(0);

    await markEntitiesSeen([message.id], '2026-03-24T18:45:00-07:00', db);

    const after = await getRecentUpdates('2026-03-24T18:46:00-07:00', 10, db);
    expect(after.unseenCount).toBe(0);
  });

  it('surfaces partial success as a low-severity attention alert', async () => {
    await recordSiteSyncError(
      'myuw',
      'myuw_state_dom_partial_mock',
      '2026-03-24T18:50:00-07:00',
      'request_failed',
      [
        {
          resource: 'events',
          errorReason: 'myuw_state_dom_partial_mock',
          attemptedModes: ['dom'],
          attemptedCollectors: ['MyUWEventsDomCollector'],
        },
      ],
      db,
    );

    await db.sync_state.put({
      key: 'gradescope',
      site: 'gradescope',
      status: 'success',
      lastSyncedAt: '2026-03-24T18:51:00-07:00',
      lastOutcome: 'partial_success',
      errorReason: 'gradescope_courses_optional_collector_failed',
      resourceFailures: [
        {
          resource: 'courses',
          errorReason: 'gradescope_courses_optional_collector_failed',
          attemptedModes: ['private_api'],
          attemptedCollectors: ['GradescopeCoursesCollector'],
        },
      ],
    });

    const alerts = await getPriorityAlerts('2026-03-24T19:00:00-07:00', db);
    const partialAlert = alerts.find((alert) => alert.site === 'gradescope');

    expect(partialAlert?.importance).toBe('low');
    expect(partialAlert?.summary).toContain('courses');
  });

  it('builds a filtered workbench view without re-deriving current_view in the exporter', async () => {
    const canvasAssignment: Assignment = {
      id: 'canvas:assignment:2',
      kind: 'assignment',
      site: 'canvas',
      source,
      title: 'Canvas Homework',
      dueAt: '2026-03-26T12:00:00-07:00',
      status: 'todo',
    };
    const myuwMessage: Message = {
      id: 'edstem:message:3',
      kind: 'message',
      site: 'edstem',
      source: { ...source, site: 'edstem', resourceId: 'thread-3', resourceType: 'thread' },
      messageKind: 'thread',
      title: 'Unread discussion',
      createdAt: '2026-03-24T13:00:00-07:00',
      unread: true,
    };

    await replaceSiteSnapshot(
      'canvas',
      {
        assignments: [canvasAssignment],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:33:00-07:00',
      },
      db,
    );

    await replaceSiteSnapshot(
      'edstem',
      {
        messages: [myuwMessage],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:34:00-07:00',
      },
      db,
    );

    let view = await getWorkbenchView(
      '2026-03-24T18:40:00-07:00',
      {
        site: 'edstem',
        onlyUnseenUpdates: true,
      },
      db,
    );

    expect(view.filters.site).toBe('edstem');
    expect(view.assignments).toHaveLength(0);
    expect(view.messages).toHaveLength(1);
    expect(view.recentUpdates.items).toHaveLength(1);

    await markEntitiesSeen([myuwMessage.id], '2026-03-24T18:45:00-07:00', db);

    view = await getWorkbenchView(
      '2026-03-24T18:46:00-07:00',
      {
        site: 'edstem',
        onlyUnseenUpdates: true,
      },
      db,
    );

    expect(view.recentUpdates.items).toHaveLength(0);
    expect(view.recentUpdates.unseenCount).toBe(0);
  });

  it('stores local overlay data without mutating canonical site facts', async () => {
    const assignment: Assignment = {
      id: 'canvas:assignment:overlay-1',
      kind: 'assignment',
      site: 'canvas',
      source,
      title: 'Overlay target',
      dueAt: '2026-03-26T18:00:00-07:00',
      status: 'todo',
    };

    await replaceSiteSnapshot(
      'canvas',
      {
        assignments: [assignment],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:33:00-07:00',
      },
      db,
    );

    await upsertLocalEntityOverlay(
      {
        entityId: assignment.id,
        site: assignment.site,
        kind: assignment.kind,
        pinnedAt: '2026-03-24T18:34:00-07:00',
        note: 'Start with the database section',
      },
      db,
    );

    const storedAssignment = await db.assignments.get(assignment.id);
    const overlay = await db.local_entity_overlay.get(assignment.id);

    expect(storedAssignment?.title).toBe('Overlay target');
    expect(storedAssignment).not.toHaveProperty('note');
    expect(overlay?.pinnedAt).toBeTruthy();
    expect(overlay?.note).toBe('Start with the database section');
  });

  it('builds a focus queue from canonical facts plus local overlay', async () => {
    const assignment: Assignment = {
      id: 'canvas:assignment:focus-1',
      kind: 'assignment',
      site: 'canvas',
      source,
      title: 'Homework 7',
      dueAt: '2026-03-25T09:00:00-07:00',
      status: 'todo',
    };
    const message: Message = {
      id: 'edstem:message:focus-1',
      kind: 'message',
      site: 'edstem',
      source: { ...source, site: 'edstem', resourceId: 'focus-thread', resourceType: 'thread' },
      messageKind: 'thread',
      title: 'Instructor follow-up',
      summary: 'Thread now includes the database migration checklist.',
      createdAt: '2026-03-24T10:00:00-07:00',
      unread: true,
      instructorAuthored: true,
    };

    await replaceSiteSnapshot(
      'canvas',
      {
        assignments: [assignment],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:40:00-07:00',
      },
      db,
    );
    await replaceSiteSnapshot(
      'edstem',
      {
        messages: [message],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:41:00-07:00',
      },
      db,
    );
    await db.sync_state.put({
      key: 'gradescope',
      site: 'gradescope',
      status: 'success',
      lastSyncedAt: '2026-03-24T18:42:00-07:00',
      lastOutcome: 'partial_success',
      resourceFailures: [
        {
          resource: 'courses',
          errorReason: 'missing_courses',
          attemptedModes: ['private_api'],
          attemptedCollectors: ['GradescopeCoursesCollector'],
        },
      ],
    });

    await upsertLocalEntityOverlay(
      {
        entityId: assignment.id,
        site: assignment.site,
        kind: assignment.kind,
        pinnedAt: '2026-03-24T18:43:00-07:00',
        note: 'Start this before lunch',
      },
      db,
    );

    const queue = await getFocusQueue('2026-03-24T18:45:00-07:00', db);
    expect(queue[0]?.entityRef?.id).toBe(assignment.id);
    expect(queue[0]?.pinned).toBe(true);
    expect(queue[0]?.note).toBe('Start this before lunch');
    expect(queue[0]?.reasons.some((reason) => reason.detail?.includes('Deadline:'))).toBe(true);
    expect(queue.some((item) => item.entityRef?.id === message.id)).toBe(true);
    expect(queue.find((item) => item.entityRef?.id === message.id)?.summary).toContain('database migration checklist');
    const syncItem = queue.find((item) => item.kind === 'sync_state');
    expect(syncItem).toBeDefined();
    expect(syncItem?.blockedBy[0]).toContain('未同步');
    expect(syncItem?.reasons[0]?.detail).toContain('缺失资源');
  });

  it('selectively promotes MyUW tuition and registration reminders through existing announcement/event carriers', async () => {
    const announcement: Announcement = {
      id: 'myuw:notice:tuition-due',
      kind: 'announcement',
      site: 'myuw',
      source: { ...source, site: 'myuw', resourceId: 'tuition-due', resourceType: 'notice' },
      title: 'Tuition Due',
      summary: 'Spring quarter tuition is due.',
    };
    const event: Event = {
      id: 'myuw:event:registration-deadline',
      kind: 'event',
      site: 'myuw',
      source: { ...source, site: 'myuw', resourceId: 'registration-deadline', resourceType: 'event' },
      eventKind: 'deadline',
      title: 'Registration deadline',
      summary: 'Registration closes soon for the coming quarter.',
      startAt: '2026-03-27T09:00:00-07:00',
    };

    await replaceSiteSnapshot(
      'myuw',
      {
        announcements: [announcement],
        events: [event],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T19:00:00-07:00',
      },
      db,
    );

    const now = '2026-03-24T19:10:00-07:00';
    const [queue, alerts] = await Promise.all([getFocusQueue(now, db), getPriorityAlerts(now, db)]);

    const announcementItem = queue.find((entry) => entry.entityRef?.id === announcement.id);
    const eventItem = queue.find((entry) => entry.entityRef?.id === event.id);

    expect(announcementItem?.reasons.some((reason) => reason.code === 'important_announcement' && reason.importance === 'high')).toBe(true);
    expect(announcementItem?.summary).toBe('Spring quarter tuition is due.');
    expect(eventItem?.reasons.some((reason) => reason.code === 'due_soon')).toBe(true);
    expect(eventItem?.dueAt).toBe('2026-03-27T09:00:00-07:00');

    expect(
      alerts.some(
        (alert) =>
          alert.alertKind === 'important_announcement' &&
          alert.importance === 'high' &&
          alert.relatedEntities.some((entity) => entity.id === announcement.id),
      ),
    ).toBe(true);
    expect(
      alerts.some(
        (alert) =>
          alert.alertKind === 'due_soon' && alert.relatedEntities.some((entity) => entity.id === event.id),
      ),
    ).toBe(true);
  });

  it('builds weekly load buckets for the next seven days', async () => {
    await replaceSiteSnapshot(
      'canvas',
      {
        assignments: [
          {
            id: 'canvas:assignment:week-1',
            kind: 'assignment',
            site: 'canvas',
            source,
            title: 'Homework 8',
            dueAt: '2026-03-25T10:00:00-07:00',
            status: 'todo',
          },
          {
            id: 'canvas:assignment:week-2',
            kind: 'assignment',
            site: 'canvas',
            source,
            title: 'Homework 9',
            dueAt: '2026-03-27T10:00:00-07:00',
            status: 'todo',
          },
        ],
        events: [
          {
            id: 'myuw:event:week-1',
            kind: 'event',
            site: 'myuw',
            source: { ...source, site: 'myuw', resourceId: 'event-week-1', resourceType: 'event' },
            eventKind: 'deadline',
            title: 'Registration reminder',
            startAt: '2026-03-27T09:00:00-07:00',
          },
        ],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:50:00-07:00',
      },
      db,
    );

    const weeklyLoad = await getWeeklyLoad('2026-03-24T18:55:00-07:00', db);
    expect(weeklyLoad).toHaveLength(7);
    const firstDueBucket = weeklyLoad.find((entry) => entry.dateKey === '2026-03-25');
    const laterBucket = weeklyLoad.find((entry) => entry.dateKey === '2026-03-27');
    expect(firstDueBucket?.assignmentCount).toBe(1);
    expect(laterBucket?.assignmentCount).toBe(1);
    expect(firstDueBucket?.dueSoonCount).toBe(1);
    expect(firstDueBucket?.summary).toContain('中等负荷');
    expect(firstDueBucket?.highlights).toContain('1 个 48 小时内到期');
  });

  it('writes sync runs and change events alongside snapshot replacement', async () => {
    const assignmentBefore: Assignment = {
      id: 'canvas:assignment:ledger-1',
      kind: 'assignment',
      site: 'canvas',
      source,
      title: 'Project checkpoint',
      dueAt: '2026-03-26T12:00:00-07:00',
      status: 'todo',
    };
    const assignmentAfter: Assignment = {
      ...assignmentBefore,
      dueAt: '2026-03-27T12:00:00-07:00',
      status: 'missing',
    };

    await replaceSiteSnapshot(
      'canvas',
      {
        assignments: [assignmentBefore],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T19:00:00-07:00',
      },
      db,
    );

    await replaceSiteSnapshot(
      'canvas',
      {
        assignments: [assignmentAfter],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T19:05:00-07:00',
        lastOutcome: 'partial_success',
        resourceFailures: [
          {
            resource: 'announcements',
            errorReason: 'collector_failed',
            attemptedModes: ['official_api'],
            attemptedCollectors: ['CanvasAnnouncementsCollector'],
          },
        ],
      },
      db,
    );

    const runs = await getLatestSyncRuns(4, db);
    const changes = await getRecentChangeEvents(12, db);

    expect(runs[0]?.site).toBe('canvas');
    expect(runs[0]?.changeCount).toBeGreaterThan(0);
    expect(changes.some((event) => event.changeType === 'status_changed')).toBe(true);
    expect(changes.some((event) => event.changeType === 'due_changed')).toBe(true);
    expect(changes.some((event) => event.changeType === 'sync_partial')).toBe(true);
  });

  it('adds sync-gap context to focus items from partially synced sites', async () => {
    const assignment: Assignment = {
      id: 'gradescope:assignment:gap-1',
      kind: 'assignment',
      site: 'gradescope',
      source: { ...source, site: 'gradescope', resourceId: 'gap-1', resourceType: 'assignment' },
      title: 'Review rubric',
      dueAt: '2026-03-25T09:00:00-07:00',
      status: 'todo',
    };

    await replaceSiteSnapshot(
      'gradescope',
      {
        assignments: [assignment],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T18:40:00-07:00',
        lastOutcome: 'partial_success',
        resourceFailures: [
          {
            resource: 'courses',
            errorReason: 'missing_courses',
            attemptedModes: ['private_api'],
            attemptedCollectors: ['GradescopeCoursesCollector'],
          },
        ],
      },
      db,
    );

    const queue = await getFocusQueue('2026-03-24T18:45:00-07:00', db);
    const item = queue.find((entry) => entry.entityRef?.id === assignment.id);

    expect(item?.blockedBy).toEqual(['未同步 courses']);
    expect(item?.reasons.some((reason) => reason.code === 'sync_stale' && reason.detail?.includes('未同步 courses'))).toBe(true);
  });

  it('adds stale-sync context to focus items when a site has not refreshed recently', async () => {
    const assignment: Assignment = {
      id: 'canvas:assignment:stale-1',
      kind: 'assignment',
      site: 'canvas',
      source,
      title: 'Stale sync homework',
      dueAt: '2026-03-25T09:00:00-07:00',
      status: 'todo',
    };

    await replaceSiteSnapshot(
      'canvas',
      {
        assignments: [assignment],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-20T18:40:00-07:00',
      },
      db,
    );

    const queue = await getFocusQueue('2026-03-24T18:45:00-07:00', db);
    const item = queue.find((entry) => entry.entityRef?.id === assignment.id);

    expect(item?.reasons.some((reason) => reason.code === 'sync_stale' && reason.label === '该站同步时间偏旧')).toBe(true);
    expect(item?.reasons.some((reason) => reason.detail?.includes('最近同步时间是 2026-03-20T18:40:00-07:00'))).toBe(true);
  });

  it('suppresses focus items when they are snoozed or dismissed', async () => {
    const assignment: Assignment = {
      id: 'canvas:assignment:focus-hidden',
      kind: 'assignment',
      site: 'canvas',
      source,
      title: 'Hidden homework',
      dueAt: '2026-03-25T09:00:00-07:00',
      status: 'todo',
    };

    await replaceSiteSnapshot(
      'canvas',
      {
        assignments: [assignment],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T19:10:00-07:00',
      },
      db,
    );

    await upsertLocalEntityOverlay(
      {
        entityId: assignment.id,
        site: assignment.site,
        kind: assignment.kind,
        snoozeUntil: '2026-03-26T19:10:00-07:00',
      },
      db,
    );

    let queue = await getFocusQueue('2026-03-24T19:11:00-07:00', db);
    expect(queue.some((item) => item.entityRef?.id === assignment.id)).toBe(false);

    await clearLocalEntityOverlayField(assignment.id, 'snoozeUntil', db);
    await upsertLocalEntityOverlay(
      {
        entityId: assignment.id,
        site: assignment.site,
        kind: assignment.kind,
        dismissUntil: '2026-03-26T19:12:00-07:00',
      },
      db,
    );

    queue = await getFocusQueue('2026-03-24T19:13:00-07:00', db);
    expect(queue.some((item) => item.entityRef?.id === assignment.id)).toBe(false);
  });

  it('keeps pinned work visible even while snoozed', async () => {
    const assignment: Assignment = {
      id: 'canvas:assignment:focus-pinned-snoozed',
      kind: 'assignment',
      site: 'canvas',
      source,
      title: 'Pinned and snoozed homework',
      dueAt: '2026-03-25T08:30:00-07:00',
      status: 'todo',
    };

    await replaceSiteSnapshot(
      'canvas',
      {
        assignments: [assignment],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T19:20:00-07:00',
      },
      db,
    );

    await upsertLocalEntityOverlay(
      {
        entityId: assignment.id,
        site: assignment.site,
        kind: assignment.kind,
        pinnedAt: '2026-03-24T19:21:00-07:00',
        snoozeUntil: '2026-03-26T19:21:00-07:00',
        note: 'Pinned should override snooze hiding',
      },
      db,
    );

    const queue = await getFocusQueue('2026-03-24T19:22:00-07:00', db);
    const weeklyLoad = await getWeeklyLoad('2026-03-24T19:22:00-07:00', db);
    const focusItem = queue.find((item) => item.entityRef?.id === assignment.id);
    const dueBucket = weeklyLoad.find((entry) => entry.dateKey === '2026-03-25');

    expect(focusItem?.pinned).toBe(true);
    expect(focusItem?.note).toBe('Pinned should override snooze hiding');
    expect(dueBucket?.items.some((item) => item.id === assignment.id)).toBe(true);
  });

  it('treats accepted work-item clusters as merged in queue, alerts, and weekly load', async () => {
    const dueAt = '2026-03-25T08:30:00-07:00';
    const canvasAssignment: Assignment = {
      id: 'canvas:assignment:cluster-accepted',
      kind: 'assignment',
      site: 'canvas',
      source,
      title: 'Homework 5',
      dueAt,
      status: 'todo',
    };
    const courseSiteAssignment: Assignment = {
      id: 'course-sites:assignment:cluster-accepted',
      kind: 'assignment',
      site: 'course-sites',
      source: { site: 'course-sites', resourceId: 'cluster-accepted', resourceType: 'assignment_row' },
      title: 'Homework 5',
      dueAt,
      status: 'unknown',
    };

    await replaceSiteSnapshot(
      'canvas',
      { assignments: [canvasAssignment] },
      { status: 'success', lastSyncedAt: '2026-03-24T19:20:00-07:00' },
      db,
    );
    await replaceSiteSnapshot(
      'course-sites',
      { assignments: [courseSiteAssignment] },
      { status: 'success', lastSyncedAt: '2026-03-24T19:20:00-07:00' },
      db,
    );

    await db.work_item_clusters.put(
      WorkItemClusterSchema.parse({
        id: 'cluster:work:accepted-homework-5',
        workType: 'assignment',
        title: 'Homework 5',
        status: 'todo',
        dueAt,
        authoritySurface: 'course-sites',
        authorityEntityKey: courseSiteAssignment.id,
        authorityResourceType: 'assignment_row',
        confidenceBand: 'medium',
        confidenceScore: 0.7,
        needsReview: true,
        reviewDecision: 'accepted',
        reviewDecidedAt: '2026-03-24T19:21:00-07:00',
        relatedSites: ['canvas', 'course-sites'],
        memberEntityKeys: [canvasAssignment.id, courseSiteAssignment.id],
        members: [],
        evidenceBundle: [],
        summary: 'Accepted locally as the canonical assignment merge.',
        createdAt: '2026-03-24T19:20:00-07:00',
        updatedAt: '2026-03-24T19:21:00-07:00',
      }),
    );

    const [queue, alerts, weeklyLoad] = await Promise.all([
      getFocusQueue('2026-03-24T19:22:00-07:00', db),
      getPriorityAlerts('2026-03-24T19:22:00-07:00', db),
      getWeeklyLoad('2026-03-24T19:22:00-07:00', db),
    ]);

    const matchingQueueItems = queue.filter((item) => item.title === 'Homework 5');
    const matchingAlerts = alerts.filter((alert) => alert.title.includes('Homework 5'));
    const dueBucket = weeklyLoad.find((entry) => entry.dateKey === '2026-03-25');

    expect(matchingQueueItems).toHaveLength(1);
    expect(matchingQueueItems[0]?.entityId).toBe(courseSiteAssignment.id);
    expect(matchingAlerts).toHaveLength(1);
    expect(matchingAlerts[0]?.source.resourceType).toBe('cluster_alert');
    expect(dueBucket?.assignmentCount).toBe(1);
    expect(dueBucket?.items).toEqual([
      {
        id: courseSiteAssignment.id,
        kind: 'assignment',
        site: 'course-sites',
      },
    ]);
  });

  it('keeps dismissed work-item clusters expanded as separate member items', async () => {
    const dueAt = '2026-03-25T08:30:00-07:00';
    const canvasAssignment: Assignment = {
      id: 'canvas:assignment:cluster-dismissed',
      kind: 'assignment',
      site: 'canvas',
      source,
      title: 'Homework 6',
      dueAt,
      status: 'todo',
    };
    const courseSiteAssignment: Assignment = {
      id: 'course-sites:assignment:cluster-dismissed',
      kind: 'assignment',
      site: 'course-sites',
      source: { site: 'course-sites', resourceId: 'cluster-dismissed', resourceType: 'assignment_row' },
      title: 'Homework 6',
      dueAt,
      status: 'unknown',
    };

    await replaceSiteSnapshot(
      'canvas',
      { assignments: [canvasAssignment] },
      { status: 'success', lastSyncedAt: '2026-03-24T19:20:00-07:00' },
      db,
    );
    await replaceSiteSnapshot(
      'course-sites',
      { assignments: [courseSiteAssignment] },
      { status: 'success', lastSyncedAt: '2026-03-24T19:20:00-07:00' },
      db,
    );

    await db.work_item_clusters.put(
      WorkItemClusterSchema.parse({
        id: 'cluster:work:dismissed-homework-6',
        workType: 'assignment',
        title: 'Homework 6',
        status: 'todo',
        dueAt,
        authoritySurface: 'course-sites',
        authorityEntityKey: courseSiteAssignment.id,
        authorityResourceType: 'assignment_row',
        confidenceBand: 'medium',
        confidenceScore: 0.7,
        needsReview: true,
        reviewDecision: 'dismissed',
        reviewDecidedAt: '2026-03-24T19:21:00-07:00',
        relatedSites: ['canvas', 'course-sites'],
        memberEntityKeys: [canvasAssignment.id, courseSiteAssignment.id],
        members: [],
        evidenceBundle: [],
        summary: 'Dismissed locally; keep member assignments separate.',
        createdAt: '2026-03-24T19:20:00-07:00',
        updatedAt: '2026-03-24T19:21:00-07:00',
      }),
    );

    const [queue, alerts, weeklyLoad] = await Promise.all([
      getFocusQueue('2026-03-24T19:22:00-07:00', db),
      getPriorityAlerts('2026-03-24T19:22:00-07:00', db),
      getWeeklyLoad('2026-03-24T19:22:00-07:00', db),
    ]);

    const matchingQueueItems = queue.filter((item) => item.title === 'Homework 6');
    const matchingAlerts = alerts.filter((alert) => alert.title.includes('Homework 6'));
    const dueBucket = weeklyLoad.find((entry) => entry.dateKey === '2026-03-25');

    expect(matchingQueueItems).toHaveLength(2);
    expect(matchingAlerts).toHaveLength(2);
    expect(dueBucket?.assignmentCount).toBe(2);
  });

  it('deletes the overlay row when the last local-only field is cleared', async () => {
    const assignment: Assignment = {
      id: 'canvas:assignment:overlay-clear-last-field',
      kind: 'assignment',
      site: 'canvas',
      source,
      title: 'Overlay cleanup target',
      dueAt: '2026-03-27T08:30:00-07:00',
      status: 'todo',
    };

    await replaceSiteSnapshot(
      'canvas',
      {
        assignments: [assignment],
      },
      {
        status: 'success',
        lastSyncedAt: '2026-03-24T19:30:00-07:00',
      },
      db,
    );

    await upsertLocalEntityOverlay(
      {
        entityId: assignment.id,
        site: assignment.site,
        kind: assignment.kind,
        note: 'Temporary note only',
      },
      db,
    );

    await clearLocalEntityOverlayField(assignment.id, 'note', db);

    await expect(db.local_entity_overlay.get(assignment.id)).resolves.toBeUndefined();
  });
});
