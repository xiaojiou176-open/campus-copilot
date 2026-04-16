import { describe, expect, it } from 'vitest';
import type { ImportedArtifactEnvelope } from './import-export-snapshot';
import { buildWebCurrentViewArtifact } from './App';

describe('buildWebCurrentViewArtifact', () => {
  it('keeps the imported envelope on actual current-view downloads', () => {
    const importedEnvelope: ImportedArtifactEnvelope = {
      title: 'Imported workspace packet',
      generatedAt: '2026-04-13T05:40:00.000Z',
      scope: {
        scopeType: 'current_view',
        preset: 'current_view',
        site: 'edstem',
        resourceFamily: 'workspace_snapshot',
      },
      packaging: {
        authorizationLevel: 'partial',
        aiAllowed: false,
        riskLabel: 'high',
        matchConfidence: 'low',
        provenance: [
          {
            sourceType: 'session_interface',
            label: 'Imported review packet',
            readOnly: true,
          },
        ],
      },
    };

    const artifact = buildWebCurrentViewArtifact({
      now: '2026-04-13T05:40:00.000Z',
      format: 'markdown',
      filters: { site: 'edstem', onlyUnseenUpdates: false },
      importedEnvelope,
      resources: [],
      assignments: [],
      announcements: [],
      messages: [],
      grades: [],
      events: [],
      alerts: [],
      recentUpdates: undefined,
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      changeEvents: [],
      courseClusters: [],
      workItemClusters: [],
      administrativeSummaries: [],
      mergeHealth: undefined,
    });

    expect(artifact.scope.site).toBe('edstem');
    expect(artifact.scope.scopeType).toBe('current_view');
    expect(artifact.scope.resourceFamily).toBe('workspace_snapshot');
    expect(artifact.packaging.authorizationLevel).toBe('partial');
    expect(artifact.packaging.aiAllowed).toBe(false);
    expect(artifact.packaging.riskLabel).toBe('high');
    expect(artifact.packaging.matchConfidence).toBe('low');
    expect(artifact.packaging.provenance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Imported review packet',
          sourceType: 'session_interface',
        }),
      ]),
    );
  });

  it('includes the latest planning pulse body in current-view exports', () => {
    const artifact = buildWebCurrentViewArtifact({
      now: '2026-04-13T05:40:00.000Z',
      format: 'markdown',
      filters: { site: 'all', onlyUnseenUpdates: false },
      importedEnvelope: undefined,
      resources: [],
      assignments: [],
      announcements: [],
      messages: [],
      grades: [],
      events: [],
      alerts: [],
      recentUpdates: undefined,
      planningSubstrates: [
        {
          id: 'myplan:student-plan',
          source: 'myplan',
          fit: 'derived_planning_substrate',
          readOnly: true,
          capturedAt: '2026-04-13T04:00:00.000Z',
          lastUpdatedAt: '2026-04-13T05:00:00.000Z',
          planId: 'student-plan',
          planLabel: 'Student Plan',
          currentStage: 'partial_shared_landing',
          runtimePosture: 'comparison_oriented_planning_substrate',
          currentTruth: 'Planning Pulse now carries a read-only shared summary.',
          termCount: 2,
          plannedCourseCount: 6,
          backupCourseCount: 1,
          scheduleOptionCount: 3,
          requirementGroupCount: 4,
          programExplorationCount: 2,
          degreeProgressSummary: 'Core requirements still need one systems elective.',
          transferPlanningSummary: 'Transfer review remains manual.',
          exactBlockers: [],
          hardDeferredMoves: [],
          terms: [
            {
              termCode: '2026-sp',
              termLabel: 'Spring 2026',
              plannedCourseCount: 3,
              backupCourseCount: 1,
              scheduleOptionCount: 2,
            },
          ],
        },
        {
          id: 'time-schedule:planning-substrate:spring-2026',
          source: 'time-schedule',
          fit: 'derived_planning_substrate',
          readOnly: true,
          capturedAt: '2026-04-13T04:30:00.000Z',
          planId: 'timeschedule-2026-spring',
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
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      changeEvents: [],
      courseClusters: [],
      workItemClusters: [],
      administrativeSummaries: [],
      mergeHealth: undefined,
    });

    expect(artifact.content).toContain('## Planning Pulse');
    expect(artifact.content).toContain('Student Plan');
    expect(artifact.content).toContain('Planning Pulse now carries a read-only shared summary.');
    expect(artifact.content).toContain('Core requirements still need one systems elective.');
    expect(artifact.content).not.toContain('Time Schedule · Spring 2026');
  });
});
