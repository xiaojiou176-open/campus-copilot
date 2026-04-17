import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  WorkbenchDecisionSections,
  WorkbenchOperationsSections,
  WorkbenchOverviewSections,
} from './workbench-panel-sections';
import { getUiText } from './i18n';

describe('workbench overview sections', () => {
  it('keeps sidepanel first screen anchored on next up, trust summary, quick actions, then diagnostics', () => {
    const html = renderToStaticMarkup(
      <WorkbenchOverviewSections
        copy={{
          eyebrow: 'Campus Copilot',
          title: 'Local-first academic decision workspace',
          description: 'Read-only pulse for the current study surface.',
        }}
        text={getUiText('en')}
        uiLanguage="en"
        selectedFormatLabel="Markdown"
        lastSuccessfulSync="2026-04-10T08:00:00.000Z"
        surface="sidepanel"
        filters={{ site: 'all', onlyUnseenUpdates: false }}
        setFilters={() => {}}
        orderedSiteStatus={[
          {
            site: 'canvas',
            counts: {
              site: 'canvas',
              courses: 1,
              resources: 4,
              assignments: 3,
              announcements: 1,
              grades: 1,
              messages: 0,
              events: 1,
            },
            sync: {
              key: 'canvas',
              site: 'canvas',
              status: 'success',
              lastOutcome: 'success',
              lastSyncedAt: '2026-04-10T07:45:00.000Z',
            },
          },
          {
            site: 'edstem',
            counts: {
              site: 'edstem',
              courses: 1,
              resources: 1,
              assignments: 0,
              announcements: 0,
              grades: 0,
              messages: 2,
              events: 0,
            },
            sync: {
              key: 'edstem',
              site: 'edstem',
              status: 'error',
              lastOutcome: 'request_failed',
              lastSyncedAt: '2026-04-10T04:00:00.000Z',
            },
            hint: 'EdStem needs a fresh repo-owned sign-in.',
          },
        ]}
        todaySnapshot={{
          totalAssignments: 6,
          dueSoonAssignments: 2,
          recentUpdates: 3,
          newGrades: 1,
          riskAlerts: 2,
          syncedSites: 3,
        }}
        currentRecentUpdates={{
          unseenCount: 2,
          items: [],
        }}
        syncFeedback={{ message: 'Canvas sync refreshed.' }}
        exportFeedback="Current view exported."
        currentSiteSelection="canvas"
        onSyncSite={async () => {}}
        onExport={async () => {}}
        onOpenConfiguration={() => {}}
        onOpenMainWorkbench={async () => {}}
        onMarkVisibleUpdatesSeen={async () => {}}
        diagnostics={{
          healthy: false,
          blockers: ['EdStem needs a fresh repo-owned sign-in.', 'MyUW lane is stale.'],
          nextActions: ['Resume the EdStem session in Profile 1.', 'Re-run the current site sync.'],
        }}
        onExportDiagnostics={async () => {}}
        focusQueue={[
          {
            id: 'focus:1',
            title: 'Finish the Canvas lab reflection',
            summary: 'This is the highest-leverage next step before the next sync.',
            note: 'Need 20 focused minutes.',
            site: 'canvas',
            score: 92,
            dueAt: '2026-04-10T12:00:00.000Z',
            blockedBy: ['grader feedback'],
            reasons: [
              {
                code: 'due_soon',
                label: 'Due soon',
                importance: 'high',
                detail: 'Needs attention before noon.',
              },
            ],
            pinned: true,
            entityId: 'canvas:assignment:1',
            entityRef: { id: 'canvas:assignment:1', kind: 'assignment', site: 'canvas' },
            kind: 'assignment',
          },
        ]}
        latestSyncRun={{
          id: 'sync:1',
          site: 'canvas',
          startedAt: '2026-04-10T07:40:00.000Z',
          completedAt: '2026-04-10T07:45:00.000Z',
          status: 'success',
          outcome: 'partial_success',
          changeCount: 4,
          resourceFailures: [],
        }}
      />,
    );

    expect(html).toContain('surface__hero-stage');
    expect(html).toContain('surface__panel--priority');
    expect(html).toContain('surface__panel--trust');
    expect(html).toContain('surface__panel--actions');
    expect(html).toContain('surface__panel--diagnostics');
    expect(html).toContain('Finish the Canvas lab reflection');
    expect(html).toContain('Resume the EdStem session in Profile 1.');
    expect(html.indexOf('Start here')).toBeLessThan(html.indexOf('System check'));
  });
});

describe('workbench decision sections', () => {
  it('renders English-facing alerts and recent updates through localization helpers', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchDecisionSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="sidepanel"
        focusQueue={[]}
        planningSubstrates={[
          {
            id: 'myplan:plan:1',
            source: 'myplan',
            fit: 'derived_planning_substrate',
            readOnly: true,
            capturedAt: '2026-04-01T00:00:00.000Z',
            lastUpdatedAt: '2026-04-01T03:00:00.000Z',
            planId: 'plan-1',
            planLabel: 'Allen School planning draft',
            termCount: 3,
            plannedCourseCount: 9,
            backupCourseCount: 2,
            scheduleOptionCount: 4,
            requirementGroupCount: 5,
            programExplorationCount: 1,
            degreeProgressSummary: 'Core degree requirements still need one systems elective.',
            transferPlanningSummary: 'One transfer credit is still pending review.',
            exactBlockers: [],
            hardDeferredMoves: [],
            terms: [
              {
                termCode: '2026-spring',
                termLabel: 'Spring 2026',
                plannedCourseCount: 3,
                backupCourseCount: 1,
                scheduleOptionCount: 2,
              },
            ],
          },
        ]}
        weeklyLoad={[]}
        priorityAlerts={[
          {
            id: 'alert:1',
            kind: 'alert',
            site: 'canvas',
            source: { site: 'canvas', resourceId: 'alert:1', resourceType: 'derived_alert' },
            alertKind: 'due_soon',
            title: 'Homework 5 48 小时内截止',
            summary: '这个任务正在逼近截止时间，应该继续留在高优先级。',
            importance: 'high',
            relatedEntities: [],
            triggeredAt: '2026-04-01T00:00:00.000Z',
          },
        ]}
        criticalAlerts={[]}
        highAlerts={[
          {
            id: 'alert:1',
            kind: 'alert',
            site: 'canvas',
            source: { site: 'canvas', resourceId: 'alert:1', resourceType: 'derived_alert' },
            alertKind: 'due_soon',
            title: 'Homework 5 48 小时内截止',
            summary: '这个任务正在逼近截止时间，应该继续留在高优先级。',
            importance: 'high',
            relatedEntities: [],
            triggeredAt: '2026-04-01T00:00:00.000Z',
          },
        ]}
        mediumAlerts={[]}
        currentRecentUpdates={{
          unseenCount: 1,
          items: [
            {
              id: 'timeline:1',
              kind: 'timeline_entry',
              site: 'edstem',
              source: { site: 'edstem', resourceId: 'timeline:1', resourceType: 'timeline_entry' },
              timelineKind: 'discussion_replied',
              occurredAt: '2026-04-01T01:00:00.000Z',
              title: '讨论区有新动态',
              summary: '近期有新的讨论更新。',
              relatedEntities: [],
            },
          ],
        }}
        onExport={async () => {}}
        onTogglePin={async () => {}}
        onSnooze={async () => {}}
        onDismiss={async () => {}}
        onNote={async () => {}}
      />,
    );

    expect(markup).toContain('Homework 5 is due soon');
    expect(markup).toContain('This work is approaching its deadline and should stay near the top.');
    expect(markup).toContain('High');
    expect(markup).toContain('One sorter, two ways to read it');
    expect(markup).toContain('Academic');
    expect(markup).toContain('Administrative');
    expect(markup).toContain('Planning Pulse');
    expect(markup).toContain('Allen School planning draft');
    expect(markup).toContain('Read-only');
    expect(markup).toContain('3 term(s) · 9 planned course(s) · 2 backup course(s) · 4 schedule option(s)');
    expect(markup).toContain('Degree progress: Core degree requirements still need one systems elective.');
    expect(markup).toContain('Spring 2026: 3 planned · 1 backup · 2 option(s)');
    expect(markup).toContain('Recent discussion update');
    expect(markup).toContain('Recent discussion activity landed here.');
    expect(markup).toContain('Discussion reply');
    expect(markup).not.toContain('48 小时内截止');
    expect(markup).not.toContain('近期有新的讨论更新');
  });

  it('shows the true planning source badge when the latest substrate came from Time Schedule', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchDecisionSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="sidepanel"
        focusQueue={[]}
        planningSubstrates={[
          {
            id: 'myplan:plan:1',
            source: 'myplan',
            fit: 'derived_planning_substrate',
            readOnly: true,
            capturedAt: '2026-04-01T00:00:00.000Z',
            lastUpdatedAt: '2026-04-01T03:00:00.000Z',
            planId: 'plan-1',
            planLabel: 'Allen School planning draft',
            termCount: 3,
            plannedCourseCount: 9,
            backupCourseCount: 2,
            scheduleOptionCount: 4,
            requirementGroupCount: 5,
            programExplorationCount: 1,
            exactBlockers: [],
            hardDeferredMoves: [],
            terms: [],
          },
          {
            id: 'time-schedule:planning:1',
            source: 'time-schedule',
            fit: 'derived_planning_substrate',
            readOnly: true,
            capturedAt: '2026-04-01T04:00:00.000Z',
            lastUpdatedAt: '2026-04-01T05:00:00.000Z',
            planId: 'timeschedule-1',
            planLabel: 'Time Schedule · Spring 2026',
            termCount: 1,
            plannedCourseCount: 2,
            backupCourseCount: 0,
            scheduleOptionCount: 1,
            requirementGroupCount: 0,
            programExplorationCount: 0,
            exactBlockers: [],
            hardDeferredMoves: [],
            terms: [],
          },
        ]}
        weeklyLoad={[]}
        priorityAlerts={[]}
        criticalAlerts={[]}
        highAlerts={[]}
        mediumAlerts={[]}
        currentRecentUpdates={undefined}
        onExport={async () => {}}
        onTogglePin={async () => {}}
        onSnooze={async () => {}}
        onDismiss={async () => {}}
        onNote={async () => {}}
      />,
    );

    expect(markup).toContain('Time Schedule · Spring 2026');
    expect(markup).toContain('<span class="surface__badge surface__badge--neutral">Time Schedule</span>');
    expect(markup).not.toContain('<span class="surface__badge surface__badge--neutral">MyPlan</span>');
  });
});

describe('workbench operations sections', () => {
  it('renders richer assignment, discussion, and schedule detail when canonical summaries are present', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchOperationsSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="sidepanel"
        planningSubstrates={[
          {
            id: 'myplan:plan:1',
            source: 'myplan',
            fit: 'derived_planning_substrate',
            readOnly: true,
            capturedAt: '2026-04-01T00:00:00.000Z',
            lastUpdatedAt: '2026-04-01T03:00:00.000Z',
            planId: 'plan-1',
            planLabel: 'Allen School planning draft',
            termCount: 3,
            plannedCourseCount: 9,
            backupCourseCount: 2,
            scheduleOptionCount: 4,
            requirementGroupCount: 5,
            programExplorationCount: 1,
            degreeProgressSummary: 'Core degree requirements still need one systems elective.',
            transferPlanningSummary: 'One transfer credit is still pending review.',
            exactBlockers: [],
            hardDeferredMoves: [],
            terms: [],
          },
        ]}
        currentResources={[
          {
            id: 'edstem:resource:1',
            kind: 'resource',
            site: 'edstem',
            source: { site: 'edstem', resourceId: '1', resourceType: 'resource' },
            courseId: 'edstem:course:11',
            resourceKind: 'file',
            title: 'Week 8 review sheet',
            resourceGroup: {
              key: 'edstem:resource-group:11:homework',
              label: 'Homework',
              memberCount: 2,
            },
            summary: 'Homework',
            detail: 'Download file · PDF · 452 KB',
            downloadUrl: 'https://us.edstem.org/api/resources/1/download/week-8-review-sheet.pdf?dl=1',
            releasedAt: '2026-04-03T09:00:00.000Z',
          },
          {
            id: 'edstem:lesson-slide:162340:954014',
            kind: 'resource',
            site: 'edstem',
            source: { site: 'edstem', resourceId: '954014', resourceType: 'lesson_slide' },
            courseId: 'edstem:course:11',
            resourceKind: 'link',
            title: 'Week 8 slide 1',
            resourceGroup: {
              key: 'edstem:resource-group:11:lesson:162340',
              label: 'Week 8 review walkthrough',
              memberCount: 3,
            },
            summary: 'Week 8 review walkthrough',
            detail: 'Slide 1 · document · completed · Lesson state: scheduled',
            url: 'https://us.edstem.org/courses/11/lessons/162340/slides/954014',
          },
          {
            id: 'canvas:resource:module-item:42:7001:8107',
            kind: 'resource',
            site: 'canvas',
            source: { site: 'canvas', resourceId: '42:7001:8107', resourceType: 'assignment_reference' },
            courseId: 'canvas:course:42',
            resourceKind: 'link',
            title: 'Checkpoint 1',
            summary: 'Week 1',
            detail: 'Assignment · Week 1',
            resourceModule: {
              key: 'canvas:module:42:7001',
              label: 'Week 1',
              itemType: 'assignment',
            },
          },
        ]}
        currentAssignments={[
          {
            id: 'canvas:assignment:1',
            kind: 'assignment',
            site: 'canvas',
            source: { site: 'canvas', resourceId: '1', resourceType: 'assignment' },
            title: 'Homework 5',
            status: 'submitted',
            summary: 'Submitted late and still awaiting grading.',
            detail: 'Q1 1 / 1 · Correct; Q2 0 / 1 · Incorrect',
            dueAt: '2026-04-05T09:00:00.000Z',
          },
        ]}
        currentAnnouncements={[
          {
            id: 'myuw:notice:1',
            kind: 'announcement',
            site: 'myuw',
            source: { site: 'myuw', resourceId: 'notice-1', resourceType: 'notice' },
            title: 'Tuition Due',
            summary: 'Spring quarter tuition is due.',
          },
        ]}
        currentMessages={[
          {
            id: 'edstem:message:1',
            kind: 'message',
            site: 'edstem',
            source: { site: 'edstem', resourceId: '1', resourceType: 'thread' },
            messageKind: 'thread',
            title: 'Staff follow-up',
            summary: 'Project 2 thread: instructor clarified the grading scope.',
            updatedAt: '2026-04-04T09:30:00.000Z',
            unread: true,
            instructorAuthored: true,
          },
        ]}
        currentEvents={[
          {
            id: 'myuw:event:1',
            kind: 'event',
            site: 'myuw',
            source: { site: 'myuw', resourceId: '1', resourceType: 'schedule_meeting' },
            eventKind: 'class',
            title: 'CSE 142 lecture',
            summary: 'Lecture meets in person this week.',
            location: 'MEB 246',
            startAt: '2026-04-04T17:30:00.000Z',
            endAt: '2026-04-04T18:20:00.000Z',
          },
        ]}
        orderedSiteStatus={[]}
        syncFeedback={{}}
        onSyncSite={async () => {}}
        onExport={async () => {}}
        latestSyncRun={undefined}
        recentChangeEvents={[]}
      />,
    );

    expect(markup).toContain('Submitted late and still awaiting grading.');
    expect(markup).toContain('Q1 1 / 1 · Correct; Q2 0 / 1 · Incorrect');
    expect(markup).toContain('Study Materials');
    expect(markup).toContain('Week 8 review sheet');
    expect(markup).toContain('lesson slide');
    expect(markup).toContain('Resource set: Homework · 2 items');
    expect(markup).toContain('Resource set: Week 8 review walkthrough · 3 items');
    expect(markup).toContain('Module: Week 1 · assignment');
    expect(markup).toContain('Download file · PDF · 452 KB');
    expect(markup).toContain('Slide 1 · document · completed · Lesson state: scheduled');
    expect(markup).toContain('Download file');
    expect(markup).toContain('Open slide');
    expect(markup).toContain('https://us.edstem.org/api/resources/1/download/week-8-review-sheet.pdf?dl=1');
    expect(markup).toContain('https://us.edstem.org/courses/11/lessons/162340/slides/954014');
    expect(markup).toContain('Notice Signals');
    expect(markup).toContain('Spring quarter tuition is due.');
    expect(markup).toContain('Administrative lane');
    expect(markup).toContain('Planning Pulse stays in the academic/planning lane');
    expect(markup).toContain('No administrative summaries are visible yet.');
    expect(markup).toContain('Manual-only campus boundary');
    expect(markup).toContain('Not supported in the current product path');
    expect(markup).toContain('Register.UW automation not supported');
    expect(markup).toContain('Notify.UW automation not supported');
    expect(markup).toContain('href="https://register.uw.edu/"');
    expect(markup).toContain('href="https://notify.uw.edu/"');
    expect(markup).toContain('Discussion Highlights');
    expect(markup).toContain('Project 2 thread: instructor clarified the grading scope.');
    expect(markup).toContain('Unread');
    expect(markup).toContain('Staff');
    expect(markup).toContain('Schedule Outlook');
    expect(markup).toContain('Lecture meets in person this week.');
    expect(markup).toContain('MEB 246');
  });

  it('marks EdStem lesson resources with a lesson badge instead of a generic link badge', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchOperationsSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="sidepanel"
        planningSubstrates={[]}
        currentResources={[
          {
            id: 'edstem:lesson:162340',
            kind: 'resource',
            site: 'edstem',
            source: { site: 'edstem', resourceId: '162340', resourceType: 'lesson' },
            courseId: 'edstem:course:96846',
            resourceKind: 'link',
            title: '[HW1 problem 7(a)] Python Tutorial & Coding Exercises',
            summary: 'A. Using - Spring 2026',
            detail: 'Lesson · attempted · Closed Due: Wed April 8th, 11:59pm',
            url: 'https://edstem.org/us/courses/96846/lessons/162340',
          },
        ]}
        currentAssignments={[]}
        currentAnnouncements={[]}
        currentMessages={[]}
        currentEvents={[]}
        orderedSiteStatus={[]}
        syncFeedback={{}}
        onSyncSite={async () => {}}
        onExport={async () => {}}
        latestSyncRun={undefined}
        recentChangeEvents={[]}
      />,
    );

    expect(markup).toContain('Study Materials');
    expect(markup).toContain('lesson');
    expect(markup).toContain('Lesson · attempted · Closed Due: Wed April 8th, 11:59pm');
    expect(markup).toContain('Open lesson');
  });

  it('marks Gradescope regrade hub resources as a queue instead of a generic download', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchOperationsSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="sidepanel"
        planningSubstrates={[]}
        currentResources={[
          {
            id: 'gradescope:resource:1211108:regrade_requests',
            kind: 'resource',
            site: 'gradescope',
            source: { site: 'gradescope', resourceId: '1211108:regrade_requests', resourceType: 'regrade_requests' },
            courseId: 'gradescope:course:1211108',
            resourceKind: 'other',
            title: 'Regrade requests',
            summary: 'No submitted regrade requests yet.',
            detail: 'Course-level regrade hub is currently empty. Columns: Question · Assignment · Requested · Status.',
            url: 'https://www.gradescope.com/courses/1211108/regrade_requests',
          },
        ]}
        currentAssignments={[]}
        currentAnnouncements={[]}
        currentMessages={[]}
        currentEvents={[]}
        orderedSiteStatus={[]}
        syncFeedback={{}}
        onSyncSite={async () => {}}
        onExport={async () => {}}
        latestSyncRun={undefined}
        recentChangeEvents={[]}
      />,
    );

    expect(markup).toContain('Regrade requests');
    expect(markup).toContain('regrade hub');
    expect(markup).toContain('Open regrade hub');
    expect(markup).toContain('https://www.gradescope.com/courses/1211108/regrade_requests');
  });

  it('shows administrative summary source, authority, blockers, and next action in the workbench', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchOperationsSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="sidepanel"
        planningSubstrates={[]}
        administrativeSummaries={[
          {
            id: 'admin:transcript:1',
            family: 'transcript',
            laneStatus: 'standalone_detail_runtime_lane',
            detailRuntimeStatus: 'review_ready',
            detailRuntimeNote: 'Review-ready summary stays export-first until a stronger transcript detail lane is promoted.',
            title: 'Transcript summary',
            summary: 'Latest transcript lane currently appears as a review-first summary and stays export-first.',
            importance: 'high',
            aiDefault: 'blocked',
            authoritySource: 'myuw summary lane',
            sourceSurface: 'myuw',
            nextAction: 'Export before sharing with AI.',
            exactBlockers: [
              {
                id: 'transcript_ai_blocked',
                summary: 'Transcript AI remains blocked.',
                whyItStopsPromotion: 'Keep transcript review/export-first until a lawful summary workflow is explicitly promoted.',
              },
            ],
            updatedAt: '2026-04-01T03:00:00.000Z',
          },
        ]}
        currentResources={[]}
        currentAssignments={[]}
        currentAnnouncements={[]}
        currentMessages={[]}
        currentEvents={[]}
        orderedSiteStatus={[]}
        syncFeedback={{}}
        onSyncSite={async () => {}}
        onExport={async () => {}}
        latestSyncRun={undefined}
        recentChangeEvents={[]}
      />,
    );

    expect(markup).toContain('Transcript summary');
    expect(markup).toContain('Details ready');
    expect(markup).toContain('Review ready');
    expect(markup).toContain('This stays a review summary for now.');
    expect(markup).toContain('Transcript is currently available as a review summary.');
    expect(markup).toContain('Exact blockers: transcript_ai_blocked');
    expect(markup).toContain('MyUW · myuw summary lane · Export before sharing with AI.');
    expect(markup).toContain('myuw summary lane · Export before sharing with AI.');
  });

  it('shows course-sites spec witness strings on current task cards', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchOperationsSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="sidepanel"
        planningSubstrates={[]}
        currentResources={[]}
        currentAssignments={[
          {
            id: 'course-sites:assignment:cse312-pset1',
            kind: 'assignment',
            site: 'course-sites',
            source: { site: 'course-sites', resourceId: 'cse312:pset1', resourceType: 'assignment_row' },
            courseId: 'course-sites:course:cse312:26sp',
            title: 'Pset 1',
            status: 'unknown',
            summary: 'Spec witness: PDF spec · HTML spec · LaTeX template. Released April 1.',
            detail: 'Spec columns: Pset (pdf) · Pset (html) · Latex template.',
            actionHints: ['Open PDF spec', 'Open HTML spec', 'Open LaTeX template'],
            dueAt: '2026-04-08T23:59:00-07:00',
          },
        ]}
        currentAnnouncements={[]}
        currentMessages={[]}
        currentEvents={[]}
        orderedSiteStatus={[]}
        syncFeedback={{}}
        onSyncSite={async () => {}}
        onExport={async () => {}}
        latestSyncRun={undefined}
        recentChangeEvents={[]}
      />,
    );

    expect(markup).toContain('Spec witness: PDF spec · HTML spec · LaTeX template. Released April 1.');
    expect(markup).toContain('Spec columns: Pset (pdf) · Pset (html) · Latex template.');
    expect(markup).toContain('Available actions: Open PDF spec · Open HTML spec · Open LaTeX template');
  });

  it('marks Canvas module, group, and recording carriers with semantic badges', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchOperationsSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="sidepanel"
        planningSubstrates={[]}
        currentResources={[
          {
            id: 'canvas:resource:module-item:42:7001:8107',
            kind: 'resource',
            site: 'canvas',
            source: {
              site: 'canvas',
              resourceId: '42:7001:8107',
              resourceType: 'assignment_reference',
            },
            courseId: 'canvas:course:42',
            resourceKind: 'link',
            title: 'Checkpoint 1',
            summary: 'Week 1',
            detail: 'Assignment · Week 1',
            url: 'https://canvas.example.edu/courses/42/assignments/88',
          },
          {
            id: 'canvas:resource:group:901',
            kind: 'resource',
            site: 'canvas',
            source: { site: 'canvas', resourceId: '901', resourceType: 'group' },
            courseId: 'canvas:course:42',
            resourceKind: 'link',
            title: 'Project Team 7',
            detail: 'Canvas group · 4 members · invitation_only',
            url: 'https://canvas.example.edu/groups/901',
          },
          {
            id: 'canvas:resource:media:media-42',
            kind: 'resource',
            site: 'canvas',
            source: { site: 'canvas', resourceId: 'media-42', resourceType: 'media_object' },
            courseId: 'canvas:course:42',
            resourceKind: 'embed',
            title: 'Lecture capture 3',
            detail: 'Canvas media · video',
            url: 'https://canvas.example.edu/media_objects/media-42',
          },
        ]}
        currentAssignments={[]}
        currentAnnouncements={[]}
        currentMessages={[]}
        currentEvents={[]}
        orderedSiteStatus={[]}
        syncFeedback={{}}
        onSyncSite={async () => {}}
        onExport={async () => {}}
        latestSyncRun={undefined}
        recentChangeEvents={[]}
      />,
    );

    expect(markup).toContain('module assignment');
    expect(markup).toContain('group');
    expect(markup).toContain('recording');
  });

  it('shows Gradescope review summaries on current task cards without promoting raw artifacts', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchOperationsSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="sidepanel"
        planningSubstrates={[]}
        currentResources={[]}
        currentAssignments={[
          {
            id: 'gradescope:assignment:7244652',
            kind: 'assignment',
            site: 'gradescope',
            source: { site: 'gradescope', resourceId: '7244652', resourceType: 'assignment' },
            title: 'Concept Check 30',
            status: 'graded',
            summary: 'Graded 7.5 / 15 · Q2.1 redacted-question-title 3 / 9 [3 annotations on page 3]',
            detail: 'Actions: Download graded copy | Submission history | Request regrade (Please select a question.)',
            actionHints: ['Download graded copy', 'Submission history', 'Request regrade (Please select a question.)'],
            reviewSummary: {
              questions: [
                {
                  label: 'Q2.1 redacted-question-title',
                  modality: 'manual',
                  score: 3,
                  maxScore: 9,
                  rubricLabels: ['Needs work'],
                  annotationCount: 3,
                  annotationPages: [3],
                },
              ],
            },
          },
        ]}
        currentAnnouncements={[]}
        currentMessages={[]}
        currentEvents={[]}
        orderedSiteStatus={[]}
        syncFeedback={{}}
        onSyncSite={async () => {}}
        onExport={async () => {}}
        latestSyncRun={undefined}
        recentChangeEvents={[]}
      />,
    );

    expect(markup).toContain('Question breakdown: Q2.1 redacted-question-title 3 / 9 (Needs work) [3 annotations on page 3]');
    expect(markup).toContain('Available actions: Download graded copy · Submission history · Request regrade (Please select a question.)');
  });

  it('shows course authority narrative and breakdown on merged cluster cards', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchOperationsSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="sidepanel"
        planningSubstrates={[]}
        courseClusters={[
          {
            id: 'cluster:course:cse312',
            canonicalCourseKey: 'sp26:cse-312',
            displayTitle: 'CSE 312',
            authoritySurface: 'course-sites',
            authorityEntityKey: 'course-sites:course:cse312:26sp',
            authorityResourceType: 'course_page',
            authorityNarrative:
              'Course identity stays on the course website while Canvas keeps the execution lane, EdStem keeps the discussion lane, and Gradescope keeps the assessment lane.',
            authorityBreakdown: [
              {
                role: 'course_identity',
                surface: 'course-sites',
                entityKey: 'course-sites:course:cse312:26sp',
                resourceType: 'course_page',
                label: 'CSE 312',
                reason: 'Course website is the canonical course identity surface.',
              },
              {
                role: 'course_delivery',
                surface: 'canvas',
                entityKey: 'canvas:course:cse312',
                resourceType: 'course',
                label: 'CSE 312',
                reason: 'Canvas still owns module and assignment delivery.',
              },
              {
                role: 'discussion_runtime',
                surface: 'edstem',
                entityKey: 'edstem:course:cse312',
                resourceType: 'thread',
                label: 'CSE 312',
                reason: 'EdStem still owns the discussion runtime.',
              },
              {
                role: 'assessment_runtime',
                surface: 'gradescope',
                entityKey: 'gradescope:course:cse312',
                resourceType: 'assignment_row',
                label: 'CSE 312',
                reason: 'Gradescope still owns grading and rubric truth.',
              },
            ],
            confidenceBand: 'high',
            confidenceScore: 0.92,
            needsReview: false,
            relatedSites: ['canvas', 'edstem', 'gradescope', 'course-sites'],
            memberEntityKeys: ['canvas:course:cse312', 'edstem:course:cse312', 'gradescope:course:cse312', 'course-sites:course:cse312:26sp'],
            members: [],
            evidenceBundle: [],
            summary: 'Course website now leads the course identity merge.',
            createdAt: '2026-04-14T15:00:00.000Z',
            updatedAt: '2026-04-14T15:00:00.000Z',
          },
        ]}
        workItemClusters={[]}
        administrativeSummaries={[]}
        currentResources={[]}
        currentAssignments={[]}
        currentAnnouncements={[]}
        currentMessages={[]}
        currentEvents={[]}
        orderedSiteStatus={[]}
        syncFeedback={{}}
        onSyncSite={async () => {}}
        onExport={async () => {}}
        latestSyncRun={undefined}
        recentChangeEvents={[]}
      />,
    );

    expect(markup).toContain(
      'Course identity stays on the course website while Canvas keeps the execution lane, EdStem keeps the discussion lane, and Gradescope keeps the assessment lane.',
    );
    expect(markup).toContain('Boundary map: identity=course-sites · delivery=canvas · discussion=edstem · assessment=gradescope');
    expect(markup).toContain('course identity:</strong> Authority: course-sites · course page - Course website is the canonical course identity surface.');
    expect(markup).toContain('course delivery:</strong> Authority: canvas · course - Canvas still owns module and assignment delivery.');
    expect(markup).toContain('discussion runtime:</strong> Authority: edstem · thread - EdStem still owns the discussion runtime.');
    expect(markup).toContain('assessment runtime:</strong> Authority: gradescope · assignment row - Gradescope still owns grading and rubric truth.');
  });

  it('shows local review decision controls for cluster matches instead of leaving possible matches read-only', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchOperationsSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="sidepanel"
        planningSubstrates={[]}
        courseClusters={[
          {
            id: 'cluster:course:seminar',
            canonicalCourseKey: 'active:foundations-seminar',
            displayTitle: 'Foundations Seminar',
            authoritySurface: 'canvas',
            authorityEntityKey: 'canvas:course:seminar',
            authorityResourceType: 'course',
            confidenceBand: 'medium',
            confidenceScore: 0.7,
            needsReview: true,
            reviewDecision: 'accepted',
            reviewDecidedAt: '2026-04-12T12:00:00.000Z',
            relatedSites: ['canvas', 'edstem'],
            memberEntityKeys: ['canvas:course:seminar', 'edstem:course:seminar'],
            members: [],
            evidenceBundle: [],
            summary: 'Shared title alignment created a reviewable course cluster.',
            createdAt: '2026-04-12T11:00:00.000Z',
            updatedAt: '2026-04-12T11:00:00.000Z',
          },
        ]}
        workItemClusters={[
          {
            id: 'cluster:work:seminar:deadline',
            workType: 'assignment',
            title: 'Project milestone',
            authoritySurface: 'canvas',
            authorityEntityKey: 'canvas:assignment:milestone',
            authorityResourceType: 'assignment',
            confidenceBand: 'medium',
            confidenceScore: 0.7,
            needsReview: true,
            reviewDecision: 'review_later',
            reviewDecidedAt: '2026-04-12T12:05:00.000Z',
            relatedSites: ['canvas', 'course-sites'],
            memberEntityKeys: ['canvas:assignment:milestone', 'course-sites:assignment:milestone'],
            members: [],
            evidenceBundle: [],
            summary: 'This work item still needs a human decision.',
            createdAt: '2026-04-12T11:00:00.000Z',
            updatedAt: '2026-04-12T11:00:00.000Z',
          },
        ]}
        currentResources={[]}
        currentAssignments={[]}
        currentAnnouncements={[]}
        currentMessages={[]}
        currentEvents={[]}
        orderedSiteStatus={[]}
        syncFeedback={{}}
        onSyncSite={async () => {}}
        onExport={async () => {}}
        latestSyncRun={undefined}
        recentChangeEvents={[]}
      />,
    );

    expect(markup).toContain('Accepted locally');
    expect(markup).toContain('Review later');
    expect(markup).toContain('Accept');
    expect(markup).toContain('Dismiss');
    expect(markup).toContain('Authority: canvas · course · Sites: canvas / edstem');
    expect(markup).toContain('Authority: canvas · assignment');
  });

  it('announces sync and export feedback through live regions on landed quick-action surfaces', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchOperationsSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="popup"
        planningSubstrates={[]}
        currentResources={[]}
        currentAssignments={[]}
        currentAnnouncements={[]}
        currentMessages={[]}
        currentEvents={[]}
        orderedSiteStatus={[]}
        syncFeedback={{ message: 'Sync finished for Canvas.' }}
        exportFeedback="Current view exported."
        onSyncSite={async () => {}}
        onExport={async () => {}}
        latestSyncRun={undefined}
        recentChangeEvents={[]}
      />,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('Sync finished for Canvas.');
    expect(markup).toContain('Current view exported.');
  });
});
