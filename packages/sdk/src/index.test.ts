import { describe, expect, it } from 'vitest';
import type { ImportedWorkbenchSnapshot } from '@campus-copilot/storage';
import {
  buildExportInputFromSnapshot,
  buildSnapshotSiteView,
  createExportArtifactFromSnapshot,
  parseImportedWorkbenchSnapshot,
  resolveSwitchyardFirstProvider,
} from './index';

const FIXTURE: ImportedWorkbenchSnapshot = {
  generatedAt: '2026-04-03T09:00:00-07:00',
  planningSubstrates: [
    {
      id: 'myplan:student-plan',
      source: 'myplan',
      fit: 'derived_planning_substrate',
      readOnly: true,
      capturedAt: '2026-04-03T08:30:00-07:00',
      lastUpdatedAt: '2026-04-03T08:45:00-07:00',
      planId: 'student-plan',
      planLabel: 'Student Plan',
      currentStage: 'partial_shared_landing',
      runtimePosture: 'comparison_oriented_planning_substrate',
      currentTruth: 'Planning Pulse already carries review-first MyPlan context.',
      termCount: 1,
      plannedCourseCount: 3,
      backupCourseCount: 1,
      scheduleOptionCount: 2,
      requirementGroupCount: 2,
      programExplorationCount: 0,
      degreeProgressSummary: '90 of 180 credits planned or completed.',
      transferPlanningSummary: 'Transfer review is still pending.',
      exactBlockers: [],
      hardDeferredMoves: ['registration handoff'],
      terms: [
        {
          termCode: '2026-spring',
          termLabel: 'Spring 2026',
          plannedCourseCount: 3,
          backupCourseCount: 1,
          scheduleOptionCount: 2,
          summary: 'Core major classes stay on track.',
        },
      ],
    },
  ],
  resources: [
    {
      id: 'edstem:resource:guide-1',
      kind: 'resource',
      site: 'edstem',
      source: {
        site: 'edstem',
        resourceId: 'guide-1',
        resourceType: 'resource',
      },
      courseId: 'edstem:course:cse312',
      resourceKind: 'file',
      title: 'Week 8 review sheet',
    },
  ],
  assignments: [
    {
      id: 'canvas:assignment:hw5',
      kind: 'assignment',
      site: 'canvas',
      source: {
        site: 'canvas',
        resourceId: 'hw5',
        resourceType: 'assignment',
      },
      title: 'Homework 5',
      status: 'submitted',
      dueAt: '2026-04-04T23:59:00-07:00',
      summary: 'Submitted · 92 / 100',
    },
  ],
  announcements: [],
  messages: [
    {
      id: 'edstem:message:office-hours',
      kind: 'message',
      site: 'edstem',
      source: {
        site: 'edstem',
        resourceId: 'office-hours',
        resourceType: 'thread',
      },
      messageKind: 'thread',
      title: 'Office hours follow-up',
      summary: 'General / Logistics',
      unread: true,
    },
  ],
  grades: [],
  events: [],
  syncRuns: [],
  changeEvents: [],
};

describe('@campus-copilot/sdk', () => {
  it('parses both direct and wrapped imported snapshots', () => {
    const direct = parseImportedWorkbenchSnapshot(JSON.stringify(FIXTURE));
    const wrapped = parseImportedWorkbenchSnapshot(
      JSON.stringify({
        generatedAt: FIXTURE.generatedAt,
        data: FIXTURE,
      }),
    );

    expect(direct.resources?.[0]?.title).toBe('Week 8 review sheet');
    expect(direct.assignments?.[0]?.title).toBe('Homework 5');
    expect(direct.planningSubstrates?.[0]?.planLabel).toBe('Student Plan');
    expect(wrapped.messages?.[0]?.site).toBe('edstem');
    expect(wrapped.planningSubstrates?.[0]?.currentTruth).toContain('Planning Pulse');
  });

  it('resolves switchyard-first provider order', () => {
    const provider = resolveSwitchyardFirstProvider({
      openai: { ready: true, reason: 'configured' },
      gemini: { ready: true, reason: 'configured' },
      switchyard: { ready: true, reason: 'configured_local_runtime' },
    });

    expect(provider).toBe('switchyard');
  });

  it('builds site views and export artifacts from a snapshot', () => {
    const edstemView = buildSnapshotSiteView(FIXTURE, 'edstem');
    const exportInput = buildExportInputFromSnapshot(FIXTURE);
    const artifact = createExportArtifactFromSnapshot({
      snapshot: FIXTURE,
      preset: 'current_view',
      format: 'markdown',
      site: 'canvas',
    });

    expect(edstemView.counts.resources).toBe(1);
    expect(edstemView.counts.messages).toBe(1);
    expect(edstemView.resources[0]?.title).toBe('Week 8 review sheet');
    expect(edstemView.messages[0]?.title).toBe('Office hours follow-up');
    expect(exportInput.planningSubstrates?.[0]?.planLabel).toBe('Student Plan');
    expect(artifact.filename).toContain('current-view');
    expect(artifact.content).toContain('Homework 5');
  });
});
