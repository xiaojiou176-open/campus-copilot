import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import type { Announcement, Assignment, Course, Event, Resource } from '@campus-copilot/schema';
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
    const edstemCourse: Course = {
      id: 'edstem:course:cse312',
      kind: 'course',
      site: 'edstem',
      source: { site: 'edstem', resourceId: '90031', resourceType: 'course' },
      title: 'CSE 312 - 26sp Foundations of Computing II',
      code: 'CSE 312',
      url: 'https://edstem.org/us/courses/90031/discussion/',
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
    const gradescopeAssignment: Assignment = {
      id: 'gradescope:assignment:hw5',
      kind: 'assignment',
      site: 'gradescope',
      source: {
        site: 'gradescope',
        resourceId: 'hw5',
        resourceType: 'assignment',
      },
      courseId: gradescopeCourse.id,
      title: 'Homework 5',
      summary: 'Gradescope submission and rubric detail.',
      dueAt: '2026-04-15T23:59:00-07:00',
      status: 'todo',
      url: 'https://www.gradescope.com/courses/17/assignments/hw5',
    };
    const courseSiteResource: Resource = {
      id: 'course-sites:resource:cse312:resources:week-8-review-walkthrough',
      kind: 'resource',
      site: 'course-sites',
      source: {
        site: 'course-sites',
        resourceId: 'cse312:resources:week-8-review-walkthrough',
        resourceType: 'resources_page',
        url: 'https://courses.cs.washington.edu/courses/cse312/26sp/resources.html',
      },
      courseId: courseSiteCourse.id,
      resourceKind: 'link',
      title: 'Week 8 review walkthrough',
      summary: 'Course website material hub.',
      detail: 'Definitions and Theorems · Z table · LaTeX resources.',
      url: 'https://courses.cs.washington.edu/courses/cse312/26sp/resources.html',
    };
    const edstemResource: Resource = {
      id: 'edstem:resource:cse312:week8-review',
      kind: 'resource',
      site: 'edstem',
      source: {
        site: 'edstem',
        resourceId: 'week8-review',
        resourceType: 'lesson_slide',
      },
      courseId: edstemCourse.id,
      resourceKind: 'file',
      title: 'Week 8 review walkthrough',
      summary: 'Week 8 review walkthrough',
      detail: 'Slide deck download.',
      url: 'https://edstem.org/us/courses/90031/lessons/162340/slides/954014',
      downloadUrl: 'https://edstem.org/us/courses/90031/resources/week8-review.pdf',
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
        assignments: [gradescopeAssignment],
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
        resources: [edstemResource],
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
        resources: [courseSiteResource],
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
          laneStatus: 'landed_summary_lane',
          detailRuntimeStatus: 'pending',
          title: 'Unofficial transcript',
          summary: 'Transcript summary carrier landed.',
          sourceSurface: 'myuw',
          authoritySource: 'sdb.admin unofficial transcript page',
          importance: 'high',
          aiDefault: 'blocked',
          exactBlockers: [],
          updatedAt: now,
        },
        {
          id: 'admin-carrier:finaid',
          family: 'finaid',
          laneStatus: 'landed_summary_lane',
          detailRuntimeStatus: 'pending',
          title: 'Financial aid status',
          summary: 'Financial aid summary carrier landed.',
          sourceSurface: 'myuw',
          authoritySource: 'sdb.admin financial aid page',
          importance: 'high',
          aiDefault: 'blocked',
          exactBlockers: [],
          updatedAt: now,
        },
        {
          id: 'admin-carrier:accounts',
          family: 'accounts',
          laneStatus: 'landed_summary_lane',
          detailRuntimeStatus: 'pending',
          title: 'Accounts summary',
          summary: 'Accounts summary carrier landed.',
          sourceSurface: 'myuw',
          authoritySource: 'myuw accounts page',
          importance: 'medium',
          aiDefault: 'blocked',
          exactBlockers: [],
          updatedAt: now,
        },
        {
          id: 'admin-carrier:profile',
          family: 'profile',
          laneStatus: 'landed_summary_lane',
          detailRuntimeStatus: 'pending',
          title: 'MyUW profile summary',
          summary: 'Profile summary carrier landed.',
          sourceSurface: 'myuw',
          authoritySource: 'myuw profile page',
          importance: 'high',
          aiDefault: 'blocked',
          exactBlockers: [],
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
    expect(view.courseClusters[0]?.authorityNarrative).toContain('课程身份以 course-sites 为准');
    expect(view.courseClusters[0]?.authorityNarrative).toContain('课程执行面以 canvas 为准');
    expect(view.courseClusters[0]?.authorityNarrative).toContain('讨论流以 edstem 为准');
    expect(view.courseClusters[0]?.authorityNarrative).toContain('评估流以 gradescope 为准');
    expect(view.courseClusters[0]?.summary).toContain('canvas、edstem与gradescope 保留为已 landed runtime 面');
    expect(view.courseClusters[0]?.authorityBreakdown?.map((facet) => facet.role)).toEqual([
      'course_identity',
      'course_delivery',
      'discussion_runtime',
      'assessment_runtime',
    ]);
    expect(view.courseClusters[0]?.fieldAuthorityMap?.course_identity?.surface).toBe('course-sites');
    expect(view.courseClusters[0]?.fieldAuthorityMap?.course_delivery?.surface).toBe('canvas');
    expect(view.courseClusters[0]?.fieldAuthorityMap?.discussion_runtime?.surface).toBe('edstem');
    expect(view.courseClusters[0]?.fieldAuthorityMap?.assessment_runtime?.surface).toBe('gradescope');
    expect(view.courseClusters[0]?.authorityBreakdown?.[0]?.reason).toContain('字段佐证锁在 课程标题 / 课程代码 / 学期 / 课程链接');
    expect(view.courseClusters[0]?.authorityBreakdown?.[0]?.reason).toContain(
      '当前值锁在 title=CSE 312: Foundations of Computing II / code=CSE 312 / term=26sp / linkHost=courses.cs.washington.edu',
    );
    expect(view.courseClusters[0]?.authorityBreakdown?.[1]?.reason).toContain(
      '字段佐证锁在 modules / assignments / announcements / day-to-day runtime',
    );
    expect(view.courseClusters[0]?.authorityBreakdown?.[2]?.reason).toContain(
      '字段佐证锁在 threads / replies / lesson discussion entry',
    );
    expect(view.workItemClusters.some((cluster) => cluster.title === 'Homework 5')).toBe(true);
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.authoritySurface).toBe('course-sites');
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.authorityNarrative).toContain(
      'course-sites 负责作业规格与时间锚点',
    );
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.summary).toContain(
      'course-sites 负责作业规格与时间锚点；canvas 负责提交状态',
    );
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.fieldAuthorityMap?.assignment_spec?.surface).toBe(
      'course-sites',
    );
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.fieldAuthorityMap?.schedule_signal?.surface).toBe(
      'course-sites',
    );
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.fieldAuthorityMap?.submission_state?.surface).toBe(
      'canvas',
    );
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.fieldAuthorityMap?.feedback_detail?.surface).toBe(
      'gradescope',
    );
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.authorityBreakdown?.[0]?.reason).toContain(
      '字段佐证锁在 title / summary/spec / deep-link',
    );
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.authorityBreakdown?.[0]?.reason).toContain(
      '当前值锁在 title=Homework 5 / linkHost=www.gradescope.com',
    );
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.authorityBreakdown?.[1]?.reason).toContain(
      '字段佐证锁在 dueAt',
    );
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.authorityBreakdown?.[1]?.reason).toContain(
      '当前值锁在 dueAt=2026-04-15T23:59:00-07:00',
    );
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.authorityBreakdown?.[2]?.reason).toContain(
      '当前值锁在 status=todo',
    );
    expect(view.workItemClusters.find((cluster) => cluster.title === 'Homework 5')?.authorityBreakdown?.[3]?.reason).toContain(
      '评分、rubric、annotation 与回评细节优先跟随最强 feedback carrier',
    );
    const resourceCluster = view.workItemClusters.find((cluster) => cluster.title === 'Week 8 review walkthrough');
    expect(resourceCluster).toBeTruthy();
    expect(resourceCluster?.workType).toBe('resource_material');
    expect(resourceCluster?.authoritySurface).toBe('course-sites');
    expect(resourceCluster?.summary).toContain('high-confidence merged resource cluster');
    expect(resourceCluster?.fieldAuthorityMap?.resource_identity?.surface).toBe('course-sites');
    expect(resourceCluster?.fieldAuthorityMap?.resource_access?.surface).toBe('edstem');
    expect(resourceCluster?.authorityNarrative).toContain('course-sites 负责资源定义');
    expect(resourceCluster?.authorityNarrative).toContain('edstem 负责资源访问');
    expect(view.administrativeSummaries.some((summary) => summary.family === 'dars')).toBe(true);
    expect(view.administrativeSummaries.find((summary) => summary.family === 'dars')?.detailRuntimeStatus).toBe(
      'review_ready',
    );
    expect(view.administrativeSummaries.find((summary) => summary.family === 'dars')?.laneStatus).toBe(
      'standalone_detail_runtime_lane',
    );
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
    expect(mergeHealth.mergedCount).toBe(1);
    expect(mergeHealth.possibleMatchCount).toBe(0);
    expect(mergeHealth.unresolvedCount).toBe(0);
  });

  it('does not count locally dismissed clusters as merged health', async () => {
    const db = createCampusCopilotDb('cluster-substrate-review-dismissed-test');

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

    await setClusterReviewDecision(
      {
        targetKind: 'course_cluster',
        targetId: reviewCluster!.id,
        decision: 'dismissed',
      },
      db,
    );

    await recomputeClusterSubstrate(db);

    const mergeHealth = await getMergeHealthSummary(db);
    expect(mergeHealth.mergedCount).toBe(0);
    expect(mergeHealth.possibleMatchCount).toBe(0);
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
      'Billing details are not visible in this desk yet.',
    );
  });
});
