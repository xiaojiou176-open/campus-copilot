import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { campusCopilotDb, getLatestPlanningSubstrateBySource } from '@campus-copilot/storage';

vi.mock('./background-tab-context', () => ({
  getActiveTabContext: vi.fn(),
  extractPageHtml: vi.fn(),
}));

import { capturePlanningSubstrateFromActiveTab } from './background-planning-substrate';
import { extractPageHtml, getActiveTabContext } from './background-tab-context';

describe('capturePlanningSubstrateFromActiveTab', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await campusCopilotDb.planning_substrates.clear();
  });

  it('writes a partial planning substrate from a MyPlan term page', async () => {
    vi.mocked(getActiveTabContext).mockResolvedValue({
      tabId: 1,
      url: 'https://myplan.uw.edu/plan/#/sp26',
    });
    vi.mocked(extractPageHtml).mockResolvedValue(`
      <main>
        <h1 class="mb-0 fw-bold">Spring 2026 Current Quarter</h1>
        <a href="/plan/#/sp26">SP 26</a>
        <h2 class="mb-0">Issues to Resolve</h2>
        <div class="card-body">Resolve issues with your planned courses before registration.</div>
        <h3 class="mb-0 d-inline align-middle h3">CSE 421</h3>
        <a class="d-block lead me-4" href="/course/#/courses/CSE 421?id=1">Introduction to Algorithms</a>
        <div>3 Credits</div>
        <h3 class="mb-0 d-inline align-middle h3">CSE 331</h3>
        <a class="d-block lead me-4" href="/course/#/courses/CSE 331?id=2">Software Design and Implementation</a>
        <div>4 Credits</div>
        <a href="/audit/#/equivalency">Find CTC Transfer Equivalency</a>
      </main>
    `);

    const result = await capturePlanningSubstrateFromActiveTab('2026-04-11T12:00:00-07:00');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.planLabel).toBe('Spring 2026');
    }

    const stored = await getLatestPlanningSubstrateBySource('myplan', campusCopilotDb);
    expect(stored?.termCount).toBe(1);
    expect(stored?.plannedCourseCount).toBe(2);
    expect(stored?.currentStage).toBe('partial_shared_landing');
    expect(stored?.exactBlockers[0]?.id).toBe('plan_audit_dual_capture');
    expect(stored?.degreeProgressSummary).toContain('not exposed');
  });

  it('merges a DARS audit page into the existing planning substrate and upgrades the outcome', async () => {
    vi.mocked(getActiveTabContext).mockResolvedValue({
      tabId: 1,
      url: 'https://myplan.uw.edu/plan/#/sp26',
    });
    vi.mocked(extractPageHtml).mockResolvedValue(`
      <main>
        <h1 class="mb-0 fw-bold">Spring 2026 Current Quarter</h1>
        <a href="/plan/#/sp26">SP 26</a>
        <h3 class="mb-0 d-inline align-middle h3">CSE 421</h3>
        <a class="d-block lead me-4" href="/course/#/courses/CSE 421?id=1">Introduction to Algorithms</a>
        <div>3 Credits</div>
      </main>
    `);
    await capturePlanningSubstrateFromActiveTab('2026-04-11T12:00:00-07:00');

    vi.mocked(getActiveTabContext).mockResolvedValue({
      tabId: 1,
      url: 'https://myplan.uw.edu/audit/#/degree',
    });
    vi.mocked(extractPageHtml).mockResolvedValue(`
      <main>
        <h1>Audit a UW Degree Program (DARS)</h1>
        <h1>Bachelor of Science (Computer Science)</h1>
        <div class="audit-state">NOTE: At least one requirement still incomplete.</div>
        <div class="audit-requirement-totals">Earned: 106 credits In-progress: 14 credits Needs: 60 credits</div>
        <div class="audit-requirement requirement 180SUM Status_NO">
          <div class="audit-requirement-status status Status_NO">
            <span aria-hidden="true" title="Not completed">NO</span>
            <span class="sr-only">Not completed</span>
          </div>
          <div class="audit-requirement-info">
            <div class="text linkify">Complete at least 180 total credits for the degree.</div>
          </div>
          <div class="audit-requirement-details">
            <div class="audit-requirement-totals">Earned: 106 credits In-progress: 14 credits Needs: 60 credits</div>
          </div>
        </div>
        <div class="audit-requirement requirement WRITING Status_NO">
          <div class="audit-requirement-status status Status_NO">
            <span aria-hidden="true" title="Not completed">NO</span>
            <span class="sr-only">Not completed</span>
          </div>
          <div class="audit-requirement-info">
            <div class="text linkify">Writing across the curriculum (10 credits required).</div>
          </div>
          <div class="audit-requirement-details">
            <div class="audit-requirement-totals">Earned: 3 credits Needs: 7 credits</div>
          </div>
        </div>
        <a href="/audit/#/equivalency">Find CTC Transfer Equivalency</a>
      </main>
    `);

    const result = await capturePlanningSubstrateFromActiveTab('2026-04-11T12:05:00-07:00');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.planLabel).toBe('Bachelor of Science (Computer Science)');
    }

    const stored = await getLatestPlanningSubstrateBySource('myplan', campusCopilotDb);
    expect(stored?.planLabel).toBe('Bachelor of Science (Computer Science)');
    expect(stored?.termCount).toBe(1);
    expect(stored?.requirementGroupCount).toBe(2);
    expect(stored?.degreeProgressSummary).toContain('At least one requirement still incomplete');
    expect(stored?.degreeProgressSummary).toContain('Visible DARS requirement spine:');
    expect(stored?.degreeProgressSummary).toContain('Writing across the curriculum');
    expect(stored?.exactBlockers ?? []).toHaveLength(0);
  });

  it('captures live-style MyPlan issue cards with longer course blocks', async () => {
    vi.mocked(getActiveTabContext).mockResolvedValue({
      tabId: 1,
      url: 'https://myplan.uw.edu/plan/#/sp26',
    });
    vi.mocked(extractPageHtml).mockResolvedValue(`
      <main>
        <h1 class="mb-0 fw-bold">Spring 2026 <span class="sr-only">Current Quarter</span></h1>
        <div role="region" aria-label="Courses Not Ready for PlanTermView" class="border card bg-transparent">
          <div class="card-body">
            <p id="issues-list-desc">The following plan items have issues you must resolve before they can be sent to Registration.</p>
            <ul class="registrationCoursesList list-unstyled d-flex flex-column gap-3 mb-0" aria-describedby="issues-list-desc">
              <li id="plan-item-1" class="border-start border-start-5 border-top py-3 ps-3 pe-0">
                <div class="d-flex align-items-center">
                  <div class="flex-grow-1">
                    <h3 class="mb-0 d-inline align-middle h3">
                      <a
                        aria-label="COMPUTER SCIENCE &amp; ENGINEERING 421 Introduction to Algorithms"
                        aria-describedby="course-item-1-messages"
                        href="/course/#/courses/CSE 421?id=1"
                      >CSE 421</a>
                    </h3>
                    <span class="sr-only">3 Credits</span>
                    <span title="3 Credits" aria-hidden="true" class="text-dark align-middle fs-9 text-uppercase fw-normal border ms-2 badge bg-light-gray">3 <abbr title="Credit">CR</abbr></span>
                    <a class="d-block lead me-4" title="CSE 421 - Introduction to Algorithms" href="/course/#/courses/CSE 421?id=1">Introduction to Algorithms</a>
                  </div>
                </div>
              </li>
              <li id="plan-item-2" class="border-start border-start-5 border-top py-3 ps-3 pe-0">
                <div class="d-flex align-items-center">
                  <div class="flex-grow-1">
                    <h3 class="mb-0 d-inline align-middle h3">
                      <a
                        aria-label="COMPUTER SCIENCE &amp; ENGINEERING 331 Software Design and Implementation"
                        aria-describedby="course-item-2-messages"
                        href="/course/#/courses/CSE 331?id=2"
                      >CSE 331</a>
                    </h3>
                    <span class="sr-only">4 Credits</span>
                    <span title="4 Credits" aria-hidden="true" class="text-dark align-middle fs-9 text-uppercase fw-normal border ms-2 badge bg-light-gray">4 <abbr title="Credit">CR</abbr></span>
                    <a class="d-block lead me-4" title="CSE 331 - Software Design and Implementation" href="/course/#/courses/CSE 331?id=2">Software Design and Implementation</a>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </main>
    `);

    const result = await capturePlanningSubstrateFromActiveTab('2026-04-11T12:08:00-07:00');

    expect(result.ok).toBe(true);
    const stored = await getLatestPlanningSubstrateBySource('myplan', campusCopilotDb);
    expect(stored?.plannedCourseCount).toBe(2);
    expect(stored?.terms[0]?.summary).toContain('2 visible planned/issue course card(s)');
  });

  it('keeps plan-only bootstrap captures partial while still landing richer shared planning counts', async () => {
    vi.mocked(getActiveTabContext).mockResolvedValue({
      tabId: 1,
      url: 'https://myplan.uw.edu/plan/#/sp26',
    });
    vi.mocked(extractPageHtml).mockResolvedValue(`
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
        </script>
      </main>
    `);

    const result = await capturePlanningSubstrateFromActiveTab('2026-04-11T12:10:00-07:00');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.planLabel).toBe('Computer Science transfer plan');
    }

    const stored = await getLatestPlanningSubstrateBySource('myplan', campusCopilotDb);
    expect(stored?.termCount).toBe(2);
    expect(stored?.plannedCourseCount).toBe(3);
    expect(stored?.backupCourseCount).toBe(1);
    expect(stored?.scheduleOptionCount).toBe(2);
    expect(stored?.programExplorationCount).toBe(1);
    expect(stored?.requirementGroupCount).toBe(0);
    expect(stored?.degreeProgressSummary).toContain('not exposed');
    expect(stored?.transferPlanningSummary).toContain(
      'Program exploration: Informatics B.S. (major) - Backup planning path for HCI-heavy study plans.',
    );
    expect(stored?.terms[0]?.summary).toContain('Backup path: MATH 300 Mathematical Reasoning.');
    expect(stored?.terms[0]?.summary).toContain('Schedule options: Balanced load (CSE 421, CSE 331).');
    expect(stored?.terms[1]?.summary).toContain('Schedule options: Summer focus (INFO 340).');
  });
});
