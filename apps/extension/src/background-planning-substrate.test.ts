import { describe, expect, it } from 'vitest';
import { buildMyPlanPlanningSubstrateFromHtml } from './background-planning-substrate';

describe('background planning substrate capture', () => {
  it('does not double-unescape encoded ampersand entities inside visible course titles', () => {
    const record = buildMyPlanPlanningSubstrateFromHtml({
      url: 'https://myplan.uw.edu/plan/#/sp26',
      capturedAt: '2026-04-11T12:00:00-07:00',
      pageHtml: `
        <main>
          <h1 class="mb-0 fw-bold">Spring 2026 Current Quarter</h1>
          <a href="/plan/#/sp26">SP 26</a>
          <h2 class="mb-0">Issues to Resolve</h2>
          <div class="card-body">
            Review Research &amp;lt;Practice&amp;gt; before registration.
          </div>
          <h3 class="mb-0 d-inline align-middle h3">CSE 999</h3>
          <a class="d-block lead me-4" href="/course/#/courses/CSE 999?id=1">Research &amp;lt;Practice&amp;gt;</a>
          <div>1 Credit</div>
        </main>
      `,
    });

    expect(record.terms[0]?.summary).toContain('Research &lt;Practice&gt;');
    expect(record.terms[0]?.summary).not.toContain('Research <Practice>');
    expect(record.planLabel).toBe('Spring 2026');
  });

  it('builds a planning substrate summary from a live MyPlan term page', () => {
    const record = buildMyPlanPlanningSubstrateFromHtml({
      url: 'https://myplan.uw.edu/plan/#/sp26',
      capturedAt: '2026-04-11T12:00:00-07:00',
      pageHtml: `
        <main>
          <h1 class="mb-0 fw-bold">Spring 2026 Current Quarter</h1>
          <a href="/plan/#/sp26">SP 26</a>
          <a href="/plan/#/su26">SU 26</a>
          <a href="/plan/#/au26">AU 26</a>
          <div class="card-body">
            <h2 class="mb-0">Issues to Resolve</h2>
            Resolve issues with your planned courses before registration.
          </div>
          <h3 class="mb-0 d-inline align-middle h3">CSE 421</h3>
          <a class="d-block lead me-4" href="/course/#/courses/CSE 421?id=1">Introduction to Algorithms</a>
          <div>3 Credits</div>
          <h3 class="mb-0 d-inline align-middle h3">CSE 331</h3>
          <a class="d-block lead me-4" href="/course/#/courses/CSE 331?id=2">Software Design and Implementation</a>
          <div>4 Credits</div>
          <a href="/audit/#/degree">Audit Degree (DARS)</a>
          <a href="/audit/#/equivalency">Find CTC Transfer Equivalency</a>
        </main>
      `,
    });

    expect(record.source).toBe('myplan');
    expect(record.fit).toBe('derived_planning_substrate');
    expect(record.termCount).toBe(1);
    expect(record.planLabel).toBe('Spring 2026');
    expect(record.plannedCourseCount).toBe(2);
    expect(record.terms[0]?.termCode).toBe('sp26');
    expect(record.terms[0]?.termLabel).toBe('Spring 2026');
    expect(record.transferPlanningSummary).toContain('CTC transfer equivalency');
    expect(record.degreeProgressSummary).toContain('not exposed');
  });

  it('promotes embedded MyPlan bootstrap counts into the shared planning substrate without claiming audit completion', () => {
    const record = buildMyPlanPlanningSubstrateFromHtml({
      url: 'https://myplan.uw.edu/plan/#/sp26',
      capturedAt: '2026-04-11T12:00:00-07:00',
      pageHtml: `
        <main data-myplan-auth="authenticated" data-myplan-surface="planning">
          <h1 class="mb-0 fw-bold">Spring 2026 Current Quarter</h1>
          <div class="card-body">
            <h2 class="mb-0">Issues to Resolve</h2>
            Resolve issues with your planned courses before registration.
          </div>
          <h3 class="mb-0 d-inline align-middle h3">CSE 421</h3>
          <a class="d-block lead me-4" href="/course/#/courses/CSE 421?id=1">Introduction to Algorithms</a>
          <div>3 Credits</div>
          <script id="myplan-bootstrap" type="application/json">
            {
              "authentication": {
                "state": "authenticated",
                "sessionKind": "netid"
              },
              "carrier": {
                "kind": "authenticated_html_bootstrap",
                "shellTitle": "MyPlan Academic Planner"
              },
              "plan": {
                "id": "plan-redacted-spring",
                "label": "Computer Science transfer plan",
                "lastUpdatedAt": "2026-04-10T09:00:00-07:00",
                "terms": [
                  {
                    "termCode": "sp26",
                    "termLabel": "Spring 2026",
                    "planStatus": "draft",
                    "plannedCourses": [
                      { "id": "cse421", "code": "CSE 421", "title": "Introduction to Algorithms" },
                      { "id": "cse331", "code": "CSE 331", "title": "Software Design and Implementation" }
                    ],
                    "backupCourses": [
                      { "id": "math300", "code": "MATH 300", "title": "Mathematical Reasoning" }
                    ],
                    "scheduleOptions": [
                      { "id": "balanced", "label": "Balanced load", "plannedCourseIds": ["cse421", "cse331"] }
                    ]
                  },
                  {
                    "termCode": "su26",
                    "termLabel": "Summer 2026",
                    "plannedCourses": [
                      { "id": "info340", "code": "INFO 340", "title": "Client-Side Development" }
                    ],
                    "backupCourses": [],
                    "scheduleOptions": [
                      { "id": "summer", "label": "Summer focus", "plannedCourseIds": ["info340"] }
                    ]
                  }
                ],
                "degreeProgress": {
                  "summary": "90 of 180 credits complete",
                  "completedCredits": 90,
                  "remainingCredits": 90
                },
                "requirementGroups": [
                  { "id": "core", "label": "Core requirements", "status": "in_progress" }
                ],
                "transferPlanningSummary": "Transfer pathway reviewed against UW prerequisite expectations.",
                "programExplorationResults": [
                  {
                    "id": "informatics-bs",
                    "label": "Informatics B.S.",
                    "kind": "major",
                    "summary": "Backup planning path for HCI-heavy study plans."
                  }
                ]
              }
            }
          </script
            data-ignore="true">
        </main>
      `,
    });

    expect(record.planId).toBe('plan-redacted-spring');
    expect(record.planLabel).toBe('Computer Science transfer plan');
    expect(record.lastUpdatedAt).toBe('2026-04-10T09:00:00-07:00');
    expect(record.termCount).toBe(2);
    expect(record.plannedCourseCount).toBe(3);
    expect(record.backupCourseCount).toBe(1);
    expect(record.scheduleOptionCount).toBe(2);
    expect(record.programExplorationCount).toBe(1);
    expect(record.requirementGroupCount).toBe(0);
    expect(record.degreeProgressSummary).toContain('not exposed');
    expect(record.transferPlanningSummary).toContain('Transfer pathway reviewed');
    expect(record.terms[0]).toMatchObject({
      termCode: 'sp26',
      termLabel: 'Spring 2026',
      plannedCourseCount: 2,
      backupCourseCount: 1,
      scheduleOptionCount: 1,
    });
    expect(record.terms[0]?.summary).toContain('draft plan.');
    expect(record.terms[1]).toMatchObject({
      termCode: 'su26',
      termLabel: 'Summer 2026',
      plannedCourseCount: 1,
      backupCourseCount: 0,
      scheduleOptionCount: 1,
    });
  });

  it('merges a DARS audit page into an existing planning substrate', () => {
    const record = buildMyPlanPlanningSubstrateFromHtml({
      url: 'https://myplan.uw.edu/audit/#/degree',
      capturedAt: '2026-04-11T12:05:00-07:00',
      previous: {
        id: 'myplan:planning-substrate:live',
        source: 'myplan',
        fit: 'derived_planning_substrate',
        readOnly: true,
        capturedAt: '2026-04-11T12:00:00-07:00',
        lastUpdatedAt: '2026-04-11T12:00:00-07:00',
        planId: 'myplan-live',
        planLabel: 'Spring 2026',
        termCount: 1,
        plannedCourseCount: 2,
        backupCourseCount: 0,
        scheduleOptionCount: 0,
        requirementGroupCount: 0,
        programExplorationCount: 0,
        degreeProgressSummary: 'Requirement progress is not exposed on this MyPlan planning page yet. Open Degree Audit (DARS) to capture requirement detail.',
        transferPlanningSummary: undefined,
        exactBlockers: [],
        hardDeferredMoves: [],
        terms: [
          {
            termCode: 'sp26',
            termLabel: 'Spring 2026',
            plannedCourseCount: 2,
            backupCourseCount: 0,
            scheduleOptionCount: 0,
            summary: '2 visible planned course card(s) captured from the MyPlan planning page.',
          },
        ],
      },
      pageHtml: `
        <main>
          <h1>Audit a UW Degree Program (DARS)</h1>
          <h1>Bachelor of Science (Computer Science)</h1>
          <div class="audit-state">NOTE: At least one requirement still incomplete.</div>
          <div class="audit-requirement-totals">Earned: 106 credits In-progress: 14 credits Needs: 60 credits</div>
          <div class="audit-requirement requirement 180SUM Status_NO"></div>
          <div class="audit-requirement requirement UWGPA Status_NO"></div>
          <a href="/audit/#/equivalency">Find CTC Transfer Equivalency</a>
        </main>
      `,
    });

    expect(record.planLabel).toBe('Bachelor of Science (Computer Science)');
    expect(record.termCount).toBe(1);
    expect(record.plannedCourseCount).toBe(2);
    expect(record.requirementGroupCount).toBe(2);
    expect(record.degreeProgressSummary).toContain('At least one requirement still incomplete');
    expect(record.degreeProgressSummary).toContain('Earned: 106 credits');
  });
});
