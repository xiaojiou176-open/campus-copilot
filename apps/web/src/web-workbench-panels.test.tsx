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
        },
      }),
    );

    expect(html).toContain('Grouped student view');
    expect(html).toContain('Academic lane');
    expect(html).toContain('Administrative lane');
    expect(html).toContain('Planning Pulse');
    expect(html).toContain('Allen School planning draft');
    expect(html).toContain('3 term(s) · 9 planned course(s) · 2 backup course(s) · 4 schedule option(s)');
    expect(html).toContain('Degree progress: Core degree requirements still need one systems elective.');
    expect(html).toContain('Spring 2026: 3 planned · 1 backup · 2 option(s)');
  });
});
