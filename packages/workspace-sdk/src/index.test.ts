import { describe, expect, it } from 'vitest';
import {
  buildAiMessagesFromSnapshot,
  buildSiteOverview,
  buildWorkspaceSummary,
  createWorkspaceExport,
  deriveWorkspaceState,
  parseWorkspaceSnapshot,
} from './index';

const RAW_SNAPSHOT = JSON.stringify({
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
        resourceType: 'resource'
      },
      courseId: 'edstem:course:cse312',
      resourceKind: 'file',
      title: 'Week 8 review sheet'
    }
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
      courseId: 'canvas:course:cse142',
      dueAt: '2026-04-04T23:59:00-07:00',
      status: 'submitted',
    },
  ],
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
      courseId: 'edstem:course:cse312',
      messageKind: 'thread',
      threadId: 'office-hours',
      title: 'Office hours follow-up',
      createdAt: '2026-04-03T07:40:00-07:00',
      unread: true,
    },
  ],
  events: [
    {
      id: 'myuw:event:cse312-final',
      kind: 'event',
      site: 'myuw',
      source: {
        site: 'myuw',
        resourceId: 'cse312-final',
        resourceType: 'schedule_final_exam',
      },
      courseId: 'myuw:course:cse312a',
      eventKind: 'exam',
      title: 'CSE 312 final exam',
      startAt: '2026-06-10T08:30:00-07:00',
      endAt: '2026-06-10T10:20:00-07:00',
    },
  ],
  syncRuns: [
    {
      id: 'sync-run:canvas:1',
      site: 'canvas',
      status: 'success',
      outcome: 'success',
      startedAt: '2026-04-03T08:00:00-07:00',
      completedAt: '2026-04-03T08:02:00-07:00',
      changeCount: 1,
    },
  ],
  changeEvents: [
    {
      id: 'change-event:canvas:hw5',
      runId: 'sync-run:canvas:1',
      site: 'canvas',
      changeType: 'status_changed',
      occurredAt: '2026-04-03T08:02:00-07:00',
      title: 'Homework 5 status changed',
      summary: 'Submitted draft is already in Canvas.',
      entityId: 'canvas:assignment:hw5',
    },
  ],
});

describe('workspace sdk', () => {
  it('parses imported workspace snapshots and derives summary data', async () => {
    const snapshot = parseWorkspaceSnapshot(RAW_SNAPSHOT);
    const summary = await buildWorkspaceSummary(snapshot);

    expect(summary.generatedAt).toBe('2026-04-03T09:00:00-07:00');
    expect(snapshot.planningSubstrates?.[0]?.planLabel).toBe('Student Plan');
    expect(summary.siteCounts.find((entry) => entry.site === 'edstem')?.resources).toBe(1);
    expect(summary.siteCounts.find((entry) => entry.site === 'canvas')?.assignments).toBe(1);
    expect(summary.focusQueueTop.length).toBeGreaterThan(0);
    expect(summary.recentUpdateCount).toBeGreaterThan(0);
  });

  it('builds site-specific overviews without inventing a second truth path', async () => {
    const snapshot = parseWorkspaceSnapshot(RAW_SNAPSHOT);
    const overview = await buildSiteOverview(snapshot, 'canvas');

    expect(overview.site).toBe('canvas');
    expect(overview.counts.assignments).toBe(1);
    expect(overview.assignments[0]?.title).toBe('Homework 5');
  });

  it(
    'creates exporter artifacts and AI-ready messages from the same snapshot',
    async () => {
      const snapshot = parseWorkspaceSnapshot(RAW_SNAPSHOT);
      const derived = await deriveWorkspaceState(snapshot);
      const artifact = await createWorkspaceExport(snapshot, {
        preset: 'current_view',
        format: 'markdown',
      });
      const messages = await buildAiMessagesFromSnapshot(snapshot, {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        question: 'What should I do first?',
      });

      expect(artifact.filename).toContain('current-view');
      expect(artifact.content).toContain('Focus Queue');
      expect(derived.workbenchView.planningSubstrates[0]?.planLabel).toBe('Student Plan');
      expect(artifact.content).toContain('Student Plan');
      expect(artifact.content).toContain('90 of 180 credits planned or completed.');
      expect(messages[0]?.role).toBe('system');
      expect(messages[1]?.content).toContain('Structured tool results');
    },
    30_000,
  );
});
