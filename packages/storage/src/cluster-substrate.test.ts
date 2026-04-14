import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import type { Announcement, Assignment, Course, Event } from '@campus-copilot/schema';
import { createCampusCopilotDb } from './db.ts';
import { upsertAdminCarriers } from './admin-high-sensitivity-substrate.ts';
import { replaceSiteSnapshot } from './snapshot-write.ts';
import { replacePlanningSubstratesBySource } from './planning-substrate.ts';
import { getMergeHealthSummary, recomputeClusterSubstrate } from './cluster-substrate.ts';
import { setClusterReviewDecision } from './cluster-review-overrides.ts';
import { getWorkbenchView } from './derived-workbench.ts';
import { getFocusQueue, getPriorityAlerts, getRecentChangeEvents, getWeeklyLoad } from './index.ts';

const now = '2026-04-11T12:00:00-07:00';
const canvasSource = {
  site: 'canvas' as const,
  resourceId: 'course-1',
  resourceType: 'course',
};

describe('cluster substrate', () => {
  it('recomputes course/work-item clusters and administrative summaries from shared site facts', async () => {
    const db = createCampusCopilotDb('cluster-substrate-test');

    const canvasCourse: Course = {
      id: 'canvas:course:cse312',
      kind: 'course',
      site: 'canvas',
      source: canvasSource,
      title: 'CSE 312: Foundations of Computing II',
      code: 'CSE 312',
      url: 'https://canvas.uw.edu/courses/1883261',
    };
    const gradescopeCourse: Course = {
      id: 'gradescope:course:cse312',
      kind: 'course',
      site: 'gradescope',
      source: { site: 'gradescope', resourceId: '17', resourceType: 'course' },
      title: 'CSE 312',
      code: 'CSE 312',
      url: 'https://www.gradescope.com/courses/17',
    };
    const courseSiteCourse: Course = {
      id: 'course-sites:course:cse312:26sp',
      kind: 'course',
      site: 'course-sites',
      source: {
        site: 'course-sites',
        resourceId: 'cse312:26sp',
        resourceType: 'course_page',
        url: 'https://courses.cs.washington.edu/courses/cse312/26sp/',
      },
      title: 'CSE 312: Foundations of Computing II',
      code: 'CSE 312',
      url: 'https://courses.cs.washington.edu/courses/cse312/26sp/',
    };
    const canvasAssignment: Assignment = {
      id: 'canvas:assignment:hw5',
      kind: 'assignment',
      site: 'canvas',
      source: { site: 'canvas', resourceId: 'hw5', resourceType: 'assignment' },
      courseId: canvasCourse.id,
      title: 'Homework 5',
      summary: 'Canvas assignment shell.',
      dueAt: '2026-04-15T23:59:00-07:00',
      status: 'todo',
    };
    const courseSiteAssignment: Assignment = {
      id: 'course-sites:assignment:hw5',
      kind: 'assignment',
      site: 'course-sites',
      source: {
        site: 'course-sites',
        resourceId: 'hw5',
        resourceType: 'assignment_row',
        url: 'https://www.gradescope.com/courses/17/assignments/hw5',
      },
      courseId: courseSiteCourse.id,
      title: 'Homework 5',
      summary: 'Course website assignment spec.',
      dueAt: '2026-04-15T23:59:00-07:00',
      status: 'unknown',
      url: 'https://www.gradescope.com/courses/17/assignments/hw5',
    };
    const tuitionNotice: Announcement = {
      id: 'myuw:notice:tuition-due',
      kind: 'announcement',
      site: 'myuw',
      source: { site: 'myuw', resourceId: 'tuition-due', resourceType: 'notice' },
      title: 'Tuition Due',
      summary: 'Spring quarter tuition is due soon.',
      postedAt: '2026-04-10T09:00:00-07:00',
    };
    const registrationEvent: Event = {
      id: 'myuw:event:registration-deadline',
      kind: 'event',
      site: 'myuw',
      source: { site: 'myuw', resourceId: 'registration-deadline', resourceType: 'event' },
      eventKind: 'deadline',
      title: 'Registration deadline',
      summary: 'Registration closes soon.',
      startAt: '2026-04-12T09:00:00-07:00',
    };

    await replaceSiteSnapshot(
      'canvas',
      {
        courses: [canvasCourse],
        assignments: [canvasAssignment],
      },
      {
        status: 'success',
        lastSyncedAt: now,
      },
      db,
    );

    await replaceSiteSnapshot(
      'gradescope',
      {
        courses: [gradescopeCourse],
      },
      {
        status: 'success',
        lastSyncedAt: now,
      },
      db,
    );

    await replaceSiteSnapshot(
      'course-sites',
      {
        courses: [courseSiteCourse],
        assignments: [courseSiteAssignment],
      },
      {
        status: 'success',
        lastSyncedAt: now,
      },
      db,
    );

    await replaceSiteSnapshot(
      'myuw',
      {
        announcements: [tuitionNotice],
        events: [registrationEvent],
      },
      {
        status: 'success',
        lastSyncedAt: now,
      },
      db,
    );

    await replacePlanningSubstratesBySource(
      'myplan',
      [
        {
          id: 'myplan:student-plan',
          source: 'myplan',
          fit: 'derived_planning_substrate',
          readOnly: true,
          capturedAt: now,
          planId: 'student-plan',
          planLabel: 'Student Plan',
          termCount: 2,
          plannedCourseCount: 6,
          backupCourseCount: 1,
          scheduleOptionCount: 3,
          requirementGroupCount: 4,
          programExplorationCount: 1,
          degreeProgressSummary: 'Core requirements still need one systems elective.',
          exactBlockers: [],
          hardDeferredMoves: [],
          terms: [],
        },
      ],
      db,
    );

    await upsertAdminCarriers(
      [
        {
          id: 'admin-carrier:transcript',
          family: 'transcript',
          title: 'Unofficial transcript',
          summary: 'Transcript summary carrier landed.',
          sourceSurface: 'myuw',
          authoritySource: 'sdb.admin unofficial transcript page',
          importance: 'high',
          aiDefault: 'blocked',
          updatedAt: now,
        },
        {
          id: 'admin-carrier:finaid',
          family: 'finaid',
          title: 'Financial aid status',
          summary: 'Financial aid summary carrier landed.',
          sourceSurface: 'myuw',
          authoritySource: 'sdb.admin financial aid page',
          importance: 'high',
          aiDefault: 'blocked',
          updatedAt: now,
        },
        {
          id: 'admin-carrier:accounts',
          family: 'accounts',
          title: 'Accounts summary',
          summary: 'Accounts summary carrier landed.',
          sourceSurface: 'myuw',
          authoritySource: 'myuw accounts page',
          importance: 'medium',
          aiDefault: 'blocked',
          updatedAt: now,
        },
        {
          id: 'admin-carrier:profile',
          family: 'profile',
          title: 'MyUW profile summary',
          summary: 'Profile summary carrier landed.',
          sourceSurface: 'myuw',
          authoritySource: 'myuw profile page',
          importance: 'high',
          aiDefault: 'blocked',
          updatedAt: now,
        },
      ],
      db,
    );
    await replaceSiteSnapshot(
      'canvas',
      {},
      {
        status: 'success',
        lastSyncedAt: now,
      },
      db,
    );

    const [view, mergeHealth] = await Promise.all([
      getWorkbenchView(now, { site: 'all', onlyUnseenUpdates: false }, db),
      getMergeHealthSummary(db),
    ]);

    expect(view.courseClusters).toHaveLength(1);
    expect(view.courseClusters[0]?.confidenceBand).toBe('high');
    expect(view.courseClusters[0]?.authoritySurface).toBe('course-sites');
    expect(view.workItemClusters.some((cluster) => cluster.title === 'Homework 5')).toBe(true);
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.authoritySurface).toBe('course-sites');
    expect(view.administrativeSummaries.some((summary) => summary.family === 'dars')).toBe(true);
    expect(view.administrativeSummaries.some((summary) => summary.family === 'tuition')).toBe(true);
    expect(view.administrativeSummaries.find((summary) => summary.family === 'transcript')?.summary).toContain('carrier landed');
    expect(view.administrativeSummaries.find((summary) => summary.family === 'finaid')?.summary).toContain('carrier landed');
    expect(view.administrativeSummaries.find((summary) => summary.family === 'accounts')?.summary).toContain('carrier landed');
    expect(view.administrativeSummaries.find((summary) => summary.family === 'profile')?.summary).toContain('carrier landed');
    expect(mergeHealth.mergedCount).toBeGreaterThan(0);

    const [focusQueue, alerts, weeklyLoad, changeEvents] = await Promise.all([
      getFocusQueue(now, db),
      getPriorityAlerts(now, db),
      getWeeklyLoad(now, db),
      getRecentChangeEvents(8, db),
    ]);

    expect(focusQueue[0]?.id.startsWith('focus:cluster:work:')).toBe(true);
    expect(weeklyLoad.some((entry) => entry.items.some((item) => item.id === 'course-sites:assignment:hw5'))).toBe(true);
    expect(alerts.some((alert) => alert.source.resourceType === 'cluster_alert')).toBe(true);
    expect(changeEvents.some((event) => event.id.startsWith('cluster-change:'))).toBe(true);
  });

  it('persists local cluster review decisions and projects them back onto the shared surface', async () => {
    const db = createCampusCopilotDb('cluster-substrate-review-override-test');

    const canvasCourse: Course = {
      id: 'canvas:course:seminar',
      kind: 'course',
      site: 'canvas',
      source: { site: 'canvas', resourceId: 'seminar', resourceType: 'course' },
      title: 'Foundations Seminar',
      url: 'https://canvas.uw.edu/courses/1883999',
    };
    const edstemCourse: Course = {
      id: 'edstem:course:seminar',
      kind: 'course',
      site: 'edstem',
      source: { site: 'edstem', resourceId: 'seminar', resourceType: 'course' },
      title: 'Foundations Seminar',
      url: 'https://edstem.org/us/courses/22/discussion/',
    };

    await replaceSiteSnapshot(
      'canvas',
      {
        courses: [canvasCourse],
      },
      {
        status: 'success',
        lastSyncedAt: now,
      },
      db,
    );

    await replaceSiteSnapshot(
      'edstem',
      {
        courses: [edstemCourse],
      },
      {
        status: 'success',
        lastSyncedAt: now,
      },
      db,
    );

    const initialView = await getWorkbenchView(now, { site: 'all', onlyUnseenUpdates: false }, db);
    const reviewCluster = initialView.courseClusters[0];

    expect(reviewCluster).toBeDefined();
    expect(reviewCluster?.needsReview).toBe(true);
    expect(reviewCluster?.reviewDecision).toBeUndefined();

    await setClusterReviewDecision(
      {
        targetKind: 'course_cluster',
        targetId: reviewCluster!.id,
        decision: 'accepted',
      },
      db,
    );

    await recomputeClusterSubstrate(db);

    const [reviewedView, mergeHealth] = await Promise.all([
      getWorkbenchView(now, { site: 'all', onlyUnseenUpdates: false }, db),
      getMergeHealthSummary(db),
    ]);
    const acceptedCluster = reviewedView.courseClusters[0];

    expect(acceptedCluster?.needsReview).toBe(true);
    expect(acceptedCluster?.reviewDecision).toBe('accepted');
    expect(acceptedCluster?.reviewDecidedAt).toBeTruthy();
    expect(mergeHealth.possibleMatchCount).toBe(1);
    expect(mergeHealth.unresolvedCount).toBe(0);
  });

  it('emits exact blocker summaries for admin families that still have no landed carrier', async () => {
    const db = createCampusCopilotDb('cluster-substrate-admin-blocker-test');

    await replaceSiteSnapshot(
      'myuw',
      {},
      {
        status: 'success',
        lastSyncedAt: now,
      },
      db,
    );

    const { administrativeSummaries } = await recomputeClusterSubstrate(db);
    const blockerFamilies = new Set(
      administrativeSummaries.filter((summary) => summary.id.endsWith(':blocker')).map((summary) => summary.family),
    );

    expect(blockerFamilies).toEqual(new Set(['dars', 'transcript', 'finaid', 'accounts', 'tuition_detail', 'profile']));
    expect(administrativeSummaries.find((summary) => summary.family === 'dars')?.sourceSurface).toBe('myplan');
    expect(administrativeSummaries.find((summary) => summary.family === 'tuition_detail')?.summary).toContain(
      'No truthful tuition-detail runtime carrier is landed yet.',
    );
  });
});
