import Dexie from 'dexie';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Alert, Announcement, Assignment, Course, Grade, Message } from '@campus-copilot/schema';
import {
  createCampusCopilotDb,
  getTodaySnapshot,
  getPriorityAlerts,
  getRecentUpdates,
  getWorkbenchView,
  getAssignmentsBySite,
  getEntityCounts,
  getSiteEntityCounts,
  markEntitiesSeen,
  putAlerts,
  putAnnouncements,
  putAssignments,
  putCourses,
  recordSiteSyncError,
  replaceSiteSnapshot,
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
    const alert: Alert = {
      id: 'alert-1',
      kind: 'alert',
      site: 'canvas',
      source: { ...source, resourceType: 'alert' },
      alertKind: 'deadline_risk',
      title: 'Homework 1 due soon',
      summary: 'Due within 24 hours.',
      importance: 'high',
      relatedEntities: [],
      triggeredAt: '2026-03-24T18:00:00-07:00',
    };

    await putCourses([course], db);
    await putAssignments([assignment], db);
    await putAnnouncements([announcement], db);
    await putAlerts([alert], db);
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
      assignments: 1,
      announcements: 1,
      messages: 0,
      events: 0,
      alerts: 1,
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
      assignments: 1,
      announcements: 1,
      grades: 0,
      messages: 0,
      events: 0,
      alerts: 0,
    });
  });

  it('records sync errors without writing dirty entity payloads', async () => {
    await recordSiteSyncError('canvas', 'not_logged_in', '2026-03-24T18:31:00-07:00', 'not_logged_in', undefined, db);

    await expect(getSiteEntityCounts('canvas', db)).resolves.toEqual({
      site: 'canvas',
      courses: 0,
      assignments: 0,
      announcements: 0,
      grades: 0,
      messages: 0,
      events: 0,
      alerts: 0,
    });
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
});
