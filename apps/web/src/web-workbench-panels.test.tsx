import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WebWorkbenchPanels } from './web-workbench-panels';

describe('web workbench planning pulse', () => {
  it('renders a shared MyPlan planning summary in the decision lane', () => {
    const html = renderToStaticMarkup(
      createElement(WebWorkbenchPanels, {
        workbenchReady: true,
        todaySnapshot: {
          totalAssignments: 5,
          dueSoonAssignments: 2,
          recentUpdates: 1,
          newGrades: 1,
          riskAlerts: 0,
          syncedSites: 4,
        },
        recentUpdates: { unseenCount: 0, items: [] },
        currentViewExport: {
          preset: 'current_view',
          format: 'markdown',
          filename: 'web-current-view.md',
          mimeType: 'text/markdown',
          scope: {
            scopeType: 'current_course',
            preset: 'current_view',
            site: 'myplan',
            courseIdOrKey: 'plan:cse',
            resourceFamily: 'workspace_snapshot',
          },
          packaging: {
            authorizationLevel: 'partial',
            aiAllowed: false,
            riskLabel: 'high',
            matchConfidence: 'medium',
            provenance: [
              {
                sourceType: 'derived_read_model',
                label: 'Unified local read model',
                readOnly: true,
              },
            ],
          },
          content: '# Current view',
        },
        importedEnvelope: {
          title: 'Imported planning packet',
          generatedAt: '2026-04-01T02:00:00.000Z',
          scope: {
            scopeType: 'current_course',
            preset: 'current_view',
            site: 'myplan',
            courseIdOrKey: 'plan:cse',
            resourceFamily: 'workspace_snapshot',
          },
          packaging: {
            authorizationLevel: 'confirm_required',
            aiAllowed: false,
            riskLabel: 'high',
            matchConfidence: 'medium',
            provenance: [
              {
                sourceType: 'derived_read_model',
                label: 'Imported planning packet',
                readOnly: true,
              },
            ],
          },
        },
        focusQueue: [],
        planningSubstrates: [
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
        ],
        weeklyLoad: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [
          {
            id: 'admin:transcript:1',
            family: 'transcript',
            laneStatus: 'landed_summary_lane',
            detailRuntimeStatus: 'pending',
            title: 'Transcript summary',
            summary: 'Latest transcript lane currently appears as a review-first summary and stays export-first.',
            importance: 'high',
            aiDefault: 'confirm_required',
            authoritySource: 'myuw summary lane',
            sourceSurface: 'myuw',
            nextAction: 'Export before sharing with AI.',
            exactBlockers: [],
            updatedAt: '2026-04-01T03:00:00.000Z',
          },
        ],
        mergeHealth: {
          mergedCount: 0,
          possibleMatchCount: 0,
          unresolvedCount: 0,
          authorityConflictCount: 0,
        },
        currentAssignments: [],
        currentMessages: [],
        currentResources: [],
        currentAnnouncements: [],
        currentEvents: [],
        recentChangeEvents: [],
        countsBySite: [],
        siteLabels: {
          canvas: 'Canvas',
          gradescope: 'Gradescope',
          edstem: 'EdStem',
          myuw: 'MyUW',
          'time-schedule': 'Time Schedule',
          'course-sites': 'Course Websites',
        },
      }),
    );

    expect(html).toContain('Grouped student view');
    expect(html).toContain('Academic lane');
    expect(html).toContain('Administrative lane');
    expect(html).toContain('Auth &amp; Export Management');
    expect(html).toContain('Review scope');
    expect(html).toContain('Current policy envelope');
    expect(html).toContain('Site policy overlay and review honesty');
    expect(html).toContain('Provenance and imported receipt');
    expect(html).toContain('MyPlan · current_course · workspace_snapshot · plan:cse');
    expect(html).toContain('Imported snapshot: Imported planning packet');
    expect(html).toContain('Read/export partial · AI blocked');
    expect(html).toContain('Allowed: planning substrates, degree requirement summaries, schedule option context.');
    expect(html).toContain('No review-ready administrative summary families are visible in this slice.');
    expect(html).toContain('detail runtime pending');
    expect(html).toContain('Planning Pulse');
    expect(html).toContain('Allen School planning draft');
    expect(html).toContain('3 term(s) · 9 planned course(s) · 2 backup course(s) · 4 schedule option(s)');
    expect(html).toContain('Degree progress: Core degree requirements still need one systems elective.');
    expect(html).toContain('Spring 2026: 3 planned · 1 backup · 2 option(s)');
    expect(html.indexOf('Focus Queue')).toBeLessThan(html.indexOf('Auth &amp; Export Management'));
    expect(html.indexOf('Weekly Load')).toBeLessThan(html.indexOf('Auth &amp; Export Management'));
  });

  it('shows the true planning source badge when the latest substrate came from Time Schedule', () => {
    const html = renderToStaticMarkup(
      createElement(WebWorkbenchPanels, {
        workbenchReady: true,
        todaySnapshot: {
          totalAssignments: 0,
          dueSoonAssignments: 0,
          recentUpdates: 0,
          newGrades: 0,
          riskAlerts: 0,
          syncedSites: 1,
        },
        recentUpdates: { unseenCount: 0, items: [] },
        currentViewExport: undefined,
        importedEnvelope: undefined,
        focusQueue: [],
        planningSubstrates: [
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
        ],
        weeklyLoad: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [],
        mergeHealth: {
          mergedCount: 0,
          possibleMatchCount: 0,
          unresolvedCount: 0,
          authorityConflictCount: 0,
        },
        currentAssignments: [],
        currentMessages: [],
        currentResources: [],
        currentAnnouncements: [],
        currentEvents: [],
        recentChangeEvents: [],
        countsBySite: [],
        topSyncRun: undefined,
        siteLabels: {
          canvas: 'Canvas',
          gradescope: 'Gradescope',
          edstem: 'EdStem',
          myuw: 'MyUW',
          'time-schedule': 'Time Schedule',
          'course-sites': 'Course Websites',
        },
      }),
    );

    expect(html).toContain('Time Schedule · Spring 2026');
    expect(html).toContain('<span class="badge">Time Schedule</span>');
    expect(html).not.toContain('<span class="badge">MyPlan</span><span class="badge">Read-only</span>');
  });

  it('shows EdStem lesson and grouped-resource badges in study materials', () => {
    const html = renderToStaticMarkup(
      createElement(WebWorkbenchPanels, {
        workbenchReady: true,
        todaySnapshot: {
          totalAssignments: 0,
          dueSoonAssignments: 0,
          recentUpdates: 0,
          newGrades: 0,
          riskAlerts: 0,
          syncedSites: 1,
        },
        recentUpdates: { unseenCount: 0, items: [] },
        currentViewExport: undefined,
        importedEnvelope: undefined,
        focusQueue: [],
        planningSubstrates: [],
        weeklyLoad: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [],
        mergeHealth: {
          mergedCount: 0,
          possibleMatchCount: 0,
          unresolvedCount: 0,
          authorityConflictCount: 0,
        },
        currentAssignments: [],
        currentMessages: [],
        currentResources: [
          {
            id: 'edstem:lesson:162340',
            site: 'edstem',
            title: '[HW1 problem 7(a)] Python Tutorial & Coding Exercises',
            resourceKind: 'link',
            summary: 'A. Using - Spring 2026',
            detail: 'Lesson · attempted · Closed Due: Wed April 8th, 11:59pm',
          },
          {
            id: 'edstem:lesson-slide:162340:954014',
            site: 'edstem',
            source: { resourceType: 'lesson_slide' },
            title: 'redacted slide title 1',
            resourceKind: 'link',
            resourceGroup: {
              key: 'edstem:resource-group:96846:lesson:redacted-lesson-a',
              label: '[HW1 problem 7(a)] Python Tutorial & Coding Exercises',
              memberCount: 3,
            },
            summary: '[HW1 problem 7(a)] Python Tutorial & Coding Exercises',
            detail: 'Slide 1 · document · completed · Lesson state: scheduled',
            url: 'https://edstem.org/us/courses/96846/lessons/162340/slides/954014',
          },
          {
            id: 'edstem:resource:dom:96846:a-using-spring-2026:starter-code:1',
            site: 'edstem',
            title: 'Starter code',
            resourceKind: 'file',
            resourceGroup: {
              key: 'edstem:resource-group:96846:a-using-spring-2026',
              label: 'A. Using - Spring 2026',
              memberCount: 2,
            },
            summary: 'A. Using - Spring 2026',
            detail: 'ZIP · A. Using - Spring 2026 · Download file',
            downloadUrl: 'https://edstem.org/us/courses/96846/resources/1',
          },
          {
            id: 'canvas:resource:module-item:42:7001:8107',
            site: 'canvas',
            title: 'Checkpoint 1',
            resourceKind: 'link',
            resourceModule: {
              key: 'canvas:module:42:7001',
              label: 'Week 1',
              itemType: 'assignment',
            },
            summary: 'Week 1',
            detail: 'Assignment · Week 1',
          },
        ],
        currentAnnouncements: [],
        currentEvents: [],
        recentChangeEvents: [],
        countsBySite: [],
        topSyncRun: undefined,
        siteLabels: {
          canvas: 'Canvas',
          gradescope: 'Gradescope',
          edstem: 'EdStem',
          myuw: 'MyUW',
          'time-schedule': 'Time Schedule',
          'course-sites': 'Course Websites',
        },
      }),
    );

    expect(html).toContain('Study Materials');
    expect(html).toContain('lesson');
    expect(html).toContain('lesson slide');
    expect(html).toContain('Slide 1 · document · completed · Lesson state: scheduled');
    expect(html).toContain('Resource set: [HW1 problem 7(a)] Python Tutorial &amp; Coding Exercises · 3 items');
    expect(html).toContain('Resource set: A. Using - Spring 2026 · 2 items');
    expect(html).toContain('Module: Week 1 · assignment');
    expect(html).toContain('Lesson · attempted · Closed Due: Wed April 8th, 11:59pm');
    expect(html).toContain('ZIP · A. Using - Spring 2026 · Download file');
    expect(html).toContain('Open slide');
    expect(html).toContain('href="https://edstem.org/us/courses/96846/lessons/162340/slides/954014"');
  });

  it('labels Gradescope regrade hub resources as a queue instead of a generic download', () => {
    const html = renderToStaticMarkup(
      createElement(WebWorkbenchPanels, {
        workbenchReady: true,
        todaySnapshot: {
          totalAssignments: 0,
          dueSoonAssignments: 0,
          recentUpdates: 0,
          newGrades: 0,
          riskAlerts: 0,
          syncedSites: 1,
        },
        recentUpdates: { unseenCount: 0, items: [] },
        currentViewExport: undefined,
        importedEnvelope: undefined,
        focusQueue: [],
        planningSubstrates: [],
        weeklyLoad: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [],
        mergeHealth: {
          mergedCount: 0,
          possibleMatchCount: 0,
          unresolvedCount: 0,
          authorityConflictCount: 0,
        },
        currentAssignments: [],
        currentMessages: [],
        currentResources: [
          {
            id: 'gradescope:resource:1211108:regrade_requests',
            site: 'gradescope',
            source: { resourceType: 'regrade_requests' },
            title: 'Regrade requests',
            resourceKind: 'other',
            summary: 'No submitted regrade requests yet.',
            detail: 'Course-level regrade hub is currently empty. Columns: Question · Assignment · Requested · Status.',
            url: 'https://www.gradescope.com/courses/1211108/regrade_requests',
          },
        ],
        currentAnnouncements: [],
        currentEvents: [],
        recentChangeEvents: [],
        countsBySite: [],
        topSyncRun: undefined,
        siteLabels: {
          canvas: 'Canvas',
          gradescope: 'Gradescope',
          edstem: 'EdStem',
          myuw: 'MyUW',
          'time-schedule': 'Time Schedule',
          'course-sites': 'Course Websites',
        },
      }),
    );

    expect(html).toContain('Regrade requests');
    expect(html).toContain('regrade hub');
    expect(html).toContain('Open regrade hub');
    expect(html).toContain('https://www.gradescope.com/courses/1211108/regrade_requests');
  });

  it('shows administrative summary source, authority, blockers, and next action in the workbench', () => {
    const html = renderToStaticMarkup(
      createElement(WebWorkbenchPanels, {
        workbenchReady: true,
        todaySnapshot: {
          totalAssignments: 0,
          dueSoonAssignments: 0,
          recentUpdates: 0,
          newGrades: 0,
          riskAlerts: 0,
          syncedSites: 1,
        },
        recentUpdates: { unseenCount: 0, items: [] },
        currentViewExport: undefined,
        importedEnvelope: undefined,
        focusQueue: [],
        planningSubstrates: [],
        weeklyLoad: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [
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
        ],
        mergeHealth: {
          mergedCount: 0,
          possibleMatchCount: 0,
          unresolvedCount: 0,
          authorityConflictCount: 0,
        },
        currentAssignments: [],
        currentMessages: [],
        currentResources: [],
        currentAnnouncements: [],
        currentEvents: [],
        recentChangeEvents: [],
        countsBySite: [],
        topSyncRun: undefined,
        siteLabels: {
          canvas: 'Canvas',
          gradescope: 'Gradescope',
          edstem: 'EdStem',
          myuw: 'MyUW',
          'time-schedule': 'Time Schedule',
          'course-sites': 'Course Websites',
        },
      }),
    );

    expect(html).toContain('Transcript summary');
    expect(html).toContain('detail-runtime lane');
    expect(html).toContain('detail runtime review-ready');
    expect(html).toContain('Review-ready summary stays export-first until a stronger transcript detail lane is promoted.');
    expect(html).toContain('Exact blockers: transcript_ai_blocked');
    expect(html).toContain('MyUW · myuw summary lane · Export before sharing with AI.');
    expect(html).toContain('myuw summary lane · Export before sharing with AI.');
  });

  it('shows Canvas semantic badges for landed module, group, and recording carriers', () => {
    const html = renderToStaticMarkup(
      createElement(WebWorkbenchPanels, {
        workbenchReady: true,
        todaySnapshot: {
          totalAssignments: 0,
          dueSoonAssignments: 0,
          recentUpdates: 0,
          newGrades: 0,
          riskAlerts: 0,
          syncedSites: 1,
        },
        recentUpdates: { unseenCount: 0, items: [] },
        currentViewExport: undefined,
        importedEnvelope: undefined,
        focusQueue: [],
        planningSubstrates: [],
        weeklyLoad: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [],
        mergeHealth: {
          mergedCount: 0,
          possibleMatchCount: 0,
          unresolvedCount: 0,
          authorityConflictCount: 0,
        },
        currentAssignments: [],
        currentMessages: [],
        currentResources: [
          {
            id: 'canvas:resource:module-item:42:7001:8107',
            site: 'canvas',
            source: { resourceType: 'assignment_reference' },
            title: 'Checkpoint 1',
            resourceKind: 'link',
            summary: 'Week 1',
            detail: 'Assignment · Week 1',
          },
          {
            id: 'canvas:resource:group:901',
            site: 'canvas',
            source: { resourceType: 'group' },
            title: 'Project Team 7',
            resourceKind: 'link',
            detail: 'Canvas group · 4 members · invitation_only',
          },
          {
            id: 'canvas:resource:media:media-42',
            site: 'canvas',
            source: { resourceType: 'media_object' },
            title: 'Lecture capture 3',
            resourceKind: 'embed',
            detail: 'Canvas media · video',
          },
        ],
        currentAnnouncements: [],
        currentEvents: [],
        recentChangeEvents: [],
        countsBySite: [],
        topSyncRun: undefined,
        siteLabels: {
          canvas: 'Canvas',
          gradescope: 'Gradescope',
          edstem: 'EdStem',
          myuw: 'MyUW',
          'time-schedule': 'Time Schedule',
          'course-sites': 'Course Websites',
        },
      }),
    );

    expect(html).toContain('module assignment');
    expect(html).toContain('group');
    expect(html).toContain('recording');
  });

  it('shows Gradescope review summaries on current task cards', () => {
    const html = renderToStaticMarkup(
      createElement(WebWorkbenchPanels, {
        workbenchReady: true,
        todaySnapshot: {
          totalAssignments: 1,
          dueSoonAssignments: 0,
          recentUpdates: 0,
          newGrades: 1,
          riskAlerts: 0,
          syncedSites: 1,
        },
        recentUpdates: { unseenCount: 0, items: [] },
        currentViewExport: undefined,
        importedEnvelope: undefined,
        focusQueue: [],
        planningSubstrates: [],
        weeklyLoad: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [],
        mergeHealth: {
          mergedCount: 0,
          possibleMatchCount: 0,
          unresolvedCount: 0,
          authorityConflictCount: 0,
        },
        currentAssignments: [
          {
            id: 'gradescope:assignment:7244652',
            site: 'gradescope',
            title: 'Concept Check 30',
            status: 'graded',
            summary: 'Graded 7.5 / 15 · Q2.1 redacted-question-title 3 / 9 [3 annotations on page 3]',
            detail: 'Actions: Download graded copy | Submission history | Request regrade (Please select a question.)',
            actionHints: ['Download graded copy', 'Submission history', 'Request regrade (Please select a question.)'],
            reviewSummary: {
              questions: [
                {
                  label: 'Q2.1 redacted-question-title',
                  score: 3,
                  maxScore: 9,
                  rubricLabels: ['Needs work'],
                  annotationCount: 3,
                  annotationPages: [3],
                },
              ],
            },
          },
        ],
        currentMessages: [],
        currentResources: [],
        currentAnnouncements: [],
        currentEvents: [],
        recentChangeEvents: [],
        countsBySite: [],
        topSyncRun: undefined,
        siteLabels: {
          canvas: 'Canvas',
          gradescope: 'Gradescope',
          edstem: 'EdStem',
          myuw: 'MyUW',
          'time-schedule': 'Time Schedule',
          'course-sites': 'Course Websites',
        },
      }),
    );

    expect(html).toContain('Question breakdown: Q2.1 redacted-question-title 3 / 9 (Needs work) [3 annotations on page 3]');
    expect(html).toContain('Available actions: Download graded copy · Submission history · Request regrade (Please select a question.)');
  });

  it('shows course-sites spec witness strings on current task cards', () => {
    const html = renderToStaticMarkup(
      createElement(WebWorkbenchPanels, {
        workbenchReady: true,
        todaySnapshot: {
          totalAssignments: 1,
          dueSoonAssignments: 1,
          recentUpdates: 0,
          newGrades: 0,
          riskAlerts: 0,
          syncedSites: 1,
        },
        recentUpdates: { unseenCount: 0, items: [] },
        currentViewExport: undefined,
        importedEnvelope: undefined,
        focusQueue: [],
        planningSubstrates: [],
        weeklyLoad: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [],
        mergeHealth: {
          mergedCount: 0,
          possibleMatchCount: 0,
          unresolvedCount: 0,
          authorityConflictCount: 0,
        },
        currentAssignments: [
          {
            id: 'course-sites:assignment:cse312-pset1',
            site: 'course-sites',
            title: 'Pset 1',
            status: 'unknown',
            summary: 'Spec witness: PDF spec · HTML spec · LaTeX template. Released April 1.',
            detail: 'Spec columns: Pset (pdf) · Pset (html) · Latex template.',
            actionHints: ['Open PDF spec', 'Open HTML spec', 'Open LaTeX template'],
            dueAt: '2026-04-08T23:59:00-07:00',
          },
        ],
        currentMessages: [],
        currentResources: [],
        currentAnnouncements: [],
        currentEvents: [],
        recentChangeEvents: [],
        countsBySite: [],
        topSyncRun: undefined,
        siteLabels: {
          canvas: 'Canvas',
          gradescope: 'Gradescope',
          edstem: 'EdStem',
          myuw: 'MyUW',
          'time-schedule': 'Time Schedule',
          'course-sites': 'Course Websites',
        },
      }),
    );

    expect(html).toContain('Spec witness: PDF spec · HTML spec · LaTeX template. Released April 1.');
    expect(html).toContain('Spec columns: Pset (pdf) · Pset (html) · Latex template.');
    expect(html).toContain('Available actions: Open PDF spec · Open HTML spec · Open LaTeX template');
  });

  it('shows authority details for merged course and work-item clusters', () => {
    const html = renderToStaticMarkup(
      createElement(WebWorkbenchPanels, {
        workbenchReady: true,
        todaySnapshot: {
          totalAssignments: 0,
          dueSoonAssignments: 0,
          recentUpdates: 0,
          newGrades: 0,
          riskAlerts: 0,
          syncedSites: 1,
        },
        recentUpdates: { unseenCount: 0, items: [] },
        currentViewExport: undefined,
        importedEnvelope: undefined,
        focusQueue: [],
        planningSubstrates: [],
        weeklyLoad: [],
        courseClusters: [
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
        ],
        workItemClusters: [
          {
            id: 'cluster:work:cse312:hw5',
            workType: 'assignment',
            title: 'Homework 5',
            authoritySurface: 'course-sites',
            authorityEntityKey: 'course-sites:assignment:hw5',
            authorityResourceType: 'assignment_row',
            authorityNarrative: 'Course site keeps the assignment spec while Canvas still reflects the submission state.',
            authorityBreakdown: [
              {
                role: 'assignment_spec',
                surface: 'course-sites',
                entityKey: 'course-sites:assignment:hw5',
                resourceType: 'assignment_row',
                label: 'Homework 5',
                reason: 'Course site owns the assignment spec.',
              },
              {
                role: 'submission_state',
                surface: 'canvas',
                entityKey: 'canvas:assignment:hw5',
                resourceType: 'assignment',
                label: 'Homework 5',
                reason: 'Canvas still owns the submission state.',
              },
              {
                role: 'feedback_detail',
                surface: 'gradescope',
                entityKey: 'gradescope:grade:hw5',
                resourceType: 'grade',
                label: 'Homework 5',
                reason: 'Gradescope still owns the richer feedback lane.',
              },
            ],
            confidenceBand: 'medium',
            confidenceScore: 0.7,
            needsReview: true,
            relatedSites: ['canvas', 'course-sites', 'gradescope'],
            memberEntityKeys: ['canvas:assignment:hw5', 'course-sites:assignment:hw5', 'gradescope:grade:hw5'],
            members: [],
            evidenceBundle: [],
            summary: 'Assignment merge still needs a human decision.',
            createdAt: '2026-04-14T15:00:00.000Z',
            updatedAt: '2026-04-14T15:00:00.000Z',
          },
        ],
        administrativeSummaries: [],
        mergeHealth: {
          mergedCount: 1,
          possibleMatchCount: 1,
          unresolvedCount: 1,
          authorityConflictCount: 0,
        },
        currentAssignments: [],
        currentMessages: [],
        currentResources: [],
        currentAnnouncements: [],
        currentEvents: [],
        recentChangeEvents: [],
        countsBySite: [],
        topSyncRun: undefined,
        siteLabels: {
          canvas: 'Canvas',
          gradescope: 'Gradescope',
          edstem: 'EdStem',
          myuw: 'MyUW',
          'time-schedule': 'Time Schedule',
          'course-sites': 'Course Websites',
        },
      }),
    );

    expect(html).toContain('canvas · edstem · gradescope · course-sites · authority course-sites · course page');
    expect(html).toContain('authority course-sites · assignment row');
    expect(html).toContain(
      'Course identity stays on the course website while Canvas keeps the execution lane, EdStem keeps the discussion lane, and Gradescope keeps the assessment lane.',
    );
    expect(html).toContain('Boundary map: identity=course-sites · delivery=canvas · discussion=edstem · assessment=gradescope');
    expect(html).toContain('Boundary map: spec=course-sites · submission=canvas · feedback=gradescope');
    expect(html).toContain('course identity:</strong> course-sites · course page - Course website is the canonical course identity surface.');
    expect(html).toContain('discussion runtime:</strong> edstem · thread - EdStem still owns the discussion runtime.');
    expect(html).toContain('assessment runtime:</strong> gradescope · assignment row - Gradescope still owns grading and rubric truth.');
    expect(html).toContain('feedback detail:</strong> gradescope · grade - Gradescope still owns the richer feedback lane.');
    expect(html).toContain('Accept');
    expect(html).toContain('Review later');
    expect(html).toContain('Dismiss');
  });
});
