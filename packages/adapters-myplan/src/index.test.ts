import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MYPLAN_EXACT_BLOCKERS,
  MYPLAN_COMPARISON_DEFERRED_FIELDS,
  MYPLAN_CONTINUATION_PROVED_FIELDS,
  MYPLAN_DEFERRED_FIELDS,
  MYPLAN_HARD_DEFERRED_MOVES,
  MYPLAN_PROVED_FIELDS,
  MYPLAN_STAGE_UNDERSTANDING,
  buildMyPlanRuntimePromotionPacket,
  buildMyPlanCarrierComparisonPacket,
  buildMyPlanPrototype,
  getMyPlanDeferredFieldSet,
  getMyPlanMinimalFieldSet,
} from './index';

function readFixture(relativePath: string) {
  return readFileSync(new URL(`./__fixtures__/redacted/${relativePath}`, import.meta.url), 'utf8');
}

function readJsonFixture<T>(relativePath: string): T {
  return JSON.parse(readFixture(relativePath)) as T;
}

describe('MyPlanPrototype', () => {
  it('normalizes a redacted authenticated bootstrap into a planning-first prototype snapshot', () => {
    const snapshot = buildMyPlanPrototype({
      capturedAt: '2026-04-09T12:00:00-07:00',
      pageHtml: readFixture('authenticated-shell.html'),
    });

    expect(snapshot.surface).toBe('myplan');
    expect(snapshot.fit).toBe('derived_planning_substrate');
    expect(snapshot.carrier.authBoundary).toBe('authenticated');
    expect(snapshot.carrier.posture).toBe('read_only');
    expect(snapshot.metadata.contractRole).toBe('planning_substrate_candidate');
    expect(snapshot.metadata.canonicalEntitySink).toBe(false);
    expect(snapshot.metadata.termCount).toBe(2);
    expect(snapshot.metadata.plannedCourseCount).toBe(3);
    expect(snapshot.metadata.backupCourseCount).toBe(1);
    expect(snapshot.metadata.requirementGroupCount).toBe(2);
    expect(snapshot.provenance.sourceKind).toBe('redacted_html_shell');
    expect(snapshot.provenance.boundaryClass).toBe('institution_recognized_session_backed_surface');
    expect(snapshot.provenance.publicClaim).toBe('current_shipped_support');
    expect(snapshot.planLabel).toBe('Computer Science transfer plan');
    expect(snapshot.terms).toHaveLength(2);
    expect(snapshot.terms[0]?.plannedCourses.map((course: { courseCode: string }) => course.courseCode)).toEqual([
      'CSE 373',
      'INFO 340',
    ]);
    expect(snapshot.terms[0]?.backupCourses.map((course: { courseCode: string }) => course.courseCode)).toEqual([
      'MATH 300',
    ]);
    expect(snapshot.degreeProgress.summary).toBe('90 of 180 credits complete');
    expect(snapshot.requirementGroups.map((group: { label: string }) => group.label)).toEqual([
      'Core requirements',
      'Supporting electives',
    ]);
    expect(snapshot.provedFields).toEqual([...MYPLAN_PROVED_FIELDS]);
    expect(snapshot.deferredFields).toEqual([...MYPLAN_DEFERRED_FIELDS]);
  });

  it('keeps registration handoff and adviser sharing outside the normalized snapshot', () => {
    const snapshot = buildMyPlanPrototype({
      capturedAt: '2026-04-09T12:00:00-07:00',
      bootstrap: readJsonFixture('authenticated-bootstrap.json'),
    });

    expect('registrationHandoff' in snapshot).toBe(false);
    expect('adviserShare' in snapshot).toBe(false);
    expect('collaboration' in snapshot).toBe(false);
    expect(JSON.stringify(snapshot)).not.toContain('register.uw.edu');
    expect(
      snapshot.programExplorationResults.every(
        (result) => !('registrationHandoff' in result) && !('adviserShare' in result),
      ),
    ).toBe(true);
    expect(snapshot.provenance.sourceKind).toBe('redacted_json_bootstrap');
    expect(snapshot.deferredFields).toContain('registrationHandoff');
    expect(snapshot.deferredFields).toContain('adviserShare');
  });

  it('rejects a bootstrap that is not authenticated', () => {
    expect(() =>
      buildMyPlanPrototype({
        capturedAt: '2026-04-09T12:00:00-07:00',
        bootstrap: {
          authentication: {
            state: 'logged_out',
            sessionKind: 'netid',
          },
          carrier: {
            kind: 'authenticated_html_bootstrap',
            shellTitle: 'MyPlan Academic Planner',
          },
          plan: {
            id: 'plan-1',
            label: 'invalid',
            terms: [],
            degreeProgress: {
              summary: 'invalid',
              completedCredits: 0,
              remainingCredits: 0,
            },
            requirementGroups: [],
          },
        },
      }),
    ).toThrow();
  });

  it('exposes the minimal field set and deferred field set as explicit contracts', () => {
    expect(getMyPlanMinimalFieldSet()).toEqual([...MYPLAN_PROVED_FIELDS]);
    expect(getMyPlanDeferredFieldSet()).toEqual([...MYPLAN_DEFERRED_FIELDS]);
  });

  it('normalizes a second authenticated session snapshot into a richer planning evidence packet', () => {
    const snapshot = buildMyPlanPrototype({
      capturedAt: '2026-04-09T13:15:00-07:00',
      sessionSnapshot: readJsonFixture('authenticated-planning-snapshot.json'),
    });

    expect(snapshot.carrier.carrierKind).toBe('authenticated_session_snapshot_candidate');
    expect(snapshot.carrier.proofStatus).toBe('redacted_fixture_comparison_candidate');
    expect(snapshot.carrier.capturedFrom).toBe('https://myplan.example.test/student/plan');
    expect(snapshot.provenance.sourceKind).toBe('redacted_authenticated_session_snapshot');
    expect(snapshot.terms[0]?.planStatus).toBe('draft');
    expect(snapshot.terms[0]?.plannedCourses[0]?.note).toBe('Primary option');
    expect(snapshot.terms[0]?.scheduleOptions[0]?.summary).toBe('MWF morning planning block');
    expect(snapshot.degreeProgress.percentComplete).toBe(40);
    expect(snapshot.degreeProgress.creditsEarned).toBe(64);
    expect(snapshot.degreeProgress.creditsPlanned).toBe(8);
    expect(snapshot.degreeProgress.creditsRequired).toBe(180);
    expect(snapshot.requirementGroups[0]?.summary).toContain('calculus sequence');
    expect(snapshot.programExplorationResults[0]?.summary).toContain('lower-division prerequisites');
    expect(snapshot.transferPlanningSummary).toContain('planning lane');
    expect(snapshot.provedFields).toEqual([...MYPLAN_CONTINUATION_PROVED_FIELDS]);
    expect(JSON.stringify(snapshot)).not.toContain('register.uw.edu');
    expect(JSON.stringify(snapshot)).not.toContain('share/adviser');
    expect(JSON.stringify(snapshot)).not.toContain('collaborate/invite');
  });

  it('builds a carrier comparison packet that separates stable signals from richer second-carrier signals', () => {
    const comparison = buildMyPlanCarrierComparisonPacket({
      comparedAt: '2026-04-09T13:30:00-07:00',
      bootstrap: readJsonFixture('authenticated-bootstrap.json'),
      sessionSnapshot: readJsonFixture('authenticated-planning-snapshot.json'),
    });

    expect(comparison.comparedCarriers).toEqual([
      'authenticated_html_bootstrap',
      'authenticated_session_snapshot_candidate',
    ]);
    expect(comparison.carrierPosture).toBe('comparison_only_candidate_evidence');
    expect(comparison.stableSignals).toEqual(
      expect.arrayContaining([
        'carrier.capturedFrom',
        'plan.label',
        'term.termCode',
        'term.termLabel',
        'term.plannedCourses',
        'term.backupCourses',
        'term.scheduleOptions',
        'degreeProgress.summary',
        'programExplorationResults.summary',
        'transferPlanningSummary',
      ]),
    );
    expect(comparison.sessionSnapshotOnlySignals).toEqual(
      expect.arrayContaining([
        'term.planStatus',
        'degreeProgress.percentComplete',
        'degreeProgress.creditsEarned',
        'degreeProgress.creditsPlanned',
        'degreeProgress.creditsRequired',
        'requirementGroups.summary',
      ]),
    );
    expect(comparison.bootstrapOnlySignals).toContain('plan.lastUpdatedAt');
    expect(comparison.continuationProvedFields).toEqual([...MYPLAN_CONTINUATION_PROVED_FIELDS]);
    expect(comparison.deferredSignalsConfirmed).toEqual([...MYPLAN_COMPARISON_DEFERRED_FIELDS]);
    expect(comparison.weeklyLoadCandidateSignals).toContain('term.scheduleOptions');
    expect(comparison.promotionEntryCriteria[0]).toContain('live current-user session');
    expect(comparison.sharedPromotionBlockers).toContain('live current-user carrier lock still pending');
    expect(comparison.sharedPromotionBlockers).toContain(
      'the shared Planning Pulse lane still needs both plan and audit captures before it can claim complete coverage',
    );
  });

  it('builds a runtime-promotion packet with only the blockers that still survive redacted fixture proof', () => {
    const packet = buildMyPlanRuntimePromotionPacket({
      capturedAt: '2026-04-09T13:30:00-07:00',
      bootstrap: readJsonFixture('authenticated-bootstrap.json'),
      sessionSnapshot: readJsonFixture('authenticated-planning-snapshot.json'),
    });

    expect(packet.surface).toBe('myplan');
    expect(packet.stage).toBe(MYPLAN_STAGE_UNDERSTANDING.currentStage);
    expect(packet.runtimePosture).toBe(MYPLAN_STAGE_UNDERSTANDING.runtimePosture);
    expect(packet.currentTruth).toContain('both MyPlan plan context and DARS-style audit context');
    expect(packet.prototype.planLabel).toBe('Computer Science transfer plan');
    expect(packet.comparison?.surface).toBe('myplan');
    expect(packet.exactBlockers).toEqual([
      expect.objectContaining({
        id: 'live_current_user_carrier_lock',
        class: 'owner-manual later',
      }),
    ]);
    expect(packet.hardDeferredMoves).toEqual([...MYPLAN_HARD_DEFERRED_MOVES]);
    expect(packet.noRegistrationAutomation).toBe(true);
  });

  it('extracts the bootstrap script even when script attributes are reordered', () => {
    const bootstrapJson = readFixture('authenticated-bootstrap.json');
    const pageHtml = `
      <main data-myplan-auth="authenticated" data-myplan-surface="planning">
        <script type="application/json" data-captured="true" id="myplan-bootstrap">
          ${bootstrapJson}
        </script>
      </main>
    `;

    const snapshot = buildMyPlanPrototype({
      capturedAt: '2026-04-09T14:00:00-07:00',
      pageHtml,
    });

    expect(snapshot.planLabel).toBe('Computer Science transfer plan');
    expect(snapshot.carrier.carrierKind).toBe('authenticated_html_bootstrap');
  });
});
