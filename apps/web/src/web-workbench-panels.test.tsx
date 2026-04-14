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
            title: 'Transcript summary',
            summary: 'Latest transcript lane is still summary-first and export-first.',
            importance: 'high',
            aiDefault: 'confirm_required',
            authoritySource: 'myuw summary lane',
            sourceSurface: 'myuw',
            nextAction: 'Export before sharing with AI.',
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
    expect(html).toContain('Summary-first admin lanes: transcript.');
    expect(html).toContain('Planning Pulse');
    expect(html).toContain('Allen School planning draft');
    expect(html).toContain('3 term(s) · 9 planned course(s) · 2 backup course(s) · 4 schedule option(s)');
    expect(html).toContain('Degree progress: Core degree requirements still need one systems elective.');
    expect(html).toContain('Spring 2026: 3 planned · 1 backup · 2 option(s)');
    expect(html.indexOf('Focus Queue')).toBeLessThan(html.indexOf('Auth &amp; Export Management'));
    expect(html.indexOf('Weekly Load')).toBeLessThan(html.indexOf('Auth &amp; Export Management'));
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
            id: 'edstem:resource:dom:96846:a-using-spring-2026:starter-code:1',
            site: 'edstem',
            title: 'Starter code',
            resourceKind: 'file',
            summary: 'A. Using - Spring 2026',
            detail: 'ZIP · A. Using - Spring 2026 · Download file',
            downloadUrl: 'https://edstem.org/us/courses/96846/resources/1',
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
    expect(html).toContain('grouped resource');
    expect(html).toContain('Lesson · attempted · Closed Due: Wed April 8th, 11:59pm');
    expect(html).toContain('ZIP · A. Using - Spring 2026 · Download file');
  });
});
