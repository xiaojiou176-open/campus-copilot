import { describe, expect, it } from 'vitest';
import { createExportArtifact } from './index';

const generatedAt = '2026-03-24T18:00:00-07:00';

const baseInput = {
  generatedAt,
  viewTitle: 'Status board',
  assignments: [
    {
      id: 'canvas:assignment:1',
      kind: 'assignment' as const,
      site: 'canvas' as const,
      source: {
        site: 'canvas' as const,
        resourceId: '1',
        resourceType: 'assignment',
      },
      courseId: 'canvas:course:1',
      title: 'Homework 5',
      dueAt: '2026-03-26T23:59:00-07:00',
      status: 'todo' as const,
    },
  ],
  announcements: [
    {
      id: 'canvas:announcement:2',
      kind: 'announcement' as const,
      site: 'canvas' as const,
      source: {
        site: 'canvas' as const,
        resourceId: '2',
        resourceType: 'announcement',
      },
      title: 'Project requirements changed',
      postedAt: '2026-03-23T20:00:00-07:00',
    },
  ],
  messages: [
    {
      id: 'edstem:message:3',
      kind: 'message' as const,
      site: 'edstem' as const,
      source: {
        site: 'edstem' as const,
        resourceId: '3',
        resourceType: 'thread',
      },
      messageKind: 'thread' as const,
      title: 'Staff follow-up',
      createdAt: '2026-03-24T08:00:00-07:00',
      unread: true,
    },
  ],
  grades: [
    {
      id: 'gradescope:grade:4',
      kind: 'grade' as const,
      site: 'gradescope' as const,
      source: {
        site: 'gradescope' as const,
        resourceId: '4',
        resourceType: 'grade',
      },
      assignmentId: 'gradescope:assignment:4',
      title: 'Midterm',
      score: 95,
      maxScore: 100,
      releasedAt: '2026-03-22T10:00:00-07:00',
    },
  ],
  events: [
    {
      id: 'myuw:event:5',
      kind: 'event' as const,
      site: 'myuw' as const,
      source: {
        site: 'myuw' as const,
        resourceId: '5',
        resourceType: 'event',
      },
      eventKind: 'deadline' as const,
      title: 'Registration deadline',
      startAt: '2026-03-28T09:00:00-07:00',
      endAt: '2026-03-28T09:30:00-07:00',
    },
  ],
  alerts: [
    {
      id: 'derived:alert:6',
      kind: 'alert' as const,
      site: 'canvas' as const,
      source: {
        site: 'canvas' as const,
        resourceId: '6',
        resourceType: 'derived_alert',
      },
      alertKind: 'due_soon' as const,
      title: 'Homework 5 due soon',
      summary: 'Due within this week.',
      importance: 'high' as const,
      relatedEntities: [],
      triggeredAt: '2026-03-24T18:00:00-07:00',
    },
  ],
  timelineEntries: [
    {
      id: 'derived:timeline:7',
      kind: 'timeline_entry' as const,
      site: 'canvas' as const,
      source: {
        site: 'canvas' as const,
        resourceId: '7',
        resourceType: 'timeline_entry',
      },
      timelineKind: 'announcement_posted' as const,
      occurredAt: '2026-03-23T20:00:00-07:00',
      title: 'Project requirements changed',
      relatedEntities: [],
    },
  ],
  focusQueue: [
    {
      id: 'focus:assignment:1',
      kind: 'assignment',
      site: 'canvas',
      title: 'Homework 5',
      score: 210,
      pinned: true,
      note: 'Start this tonight',
      dueAt: '2026-03-26T23:59:00-07:00',
      entityId: 'canvas:assignment:1',
      entity: {
        id: 'canvas:assignment:1',
        kind: 'assignment',
        site: 'canvas',
      },
      reasons: [
        {
          code: 'due_soon',
          label: '48 hours remaining',
          importance: 'high',
        },
      ],
      blockedBy: [],
    },
  ],
  weeklyLoad: [
    {
      dateKey: '2026-03-26',
      startsAt: '2026-03-26T00:00:00.000Z',
      endsAt: '2026-03-26T23:59:59.999Z',
      assignmentCount: 1,
      eventCount: 0,
      overdueCount: 0,
      dueSoonCount: 1,
      pinnedCount: 1,
      totalScore: 210,
    },
  ],
  syncRuns: [
    {
      id: 'sync-run:canvas:1',
      site: 'canvas',
      status: 'success',
      outcome: 'partial_success',
      startedAt: '2026-03-24T17:59:00-07:00',
      completedAt: '2026-03-24T18:00:00-07:00',
      changeCount: 2,
      errorReason: 'announcements collector failed',
    },
  ],
  changeEvents: [
    {
      id: 'change-event:1',
      site: 'canvas',
      changeType: 'due_changed',
      occurredAt: '2026-03-24T18:00:00-07:00',
      title: 'Homework 5 due date changed',
      summary: 'Due date moved by one day.',
      entityId: 'canvas:assignment:1',
      previousValue: '2026-03-25T23:59:00-07:00',
      nextValue: '2026-03-26T23:59:00-07:00',
    },
  ],
};

describe('exporter package', () => {
  it('builds weekly assignments as human-readable markdown', () => {
    const artifact = createExportArtifact({
      preset: 'weekly_assignments',
      format: 'markdown',
      input: baseInput,
    });

    expect(artifact.filename).toContain('weekly-assignments');
    expect(artifact.mimeType).toBe('text/markdown');
    expect(artifact.content).toContain('# Weekly assignments');
    expect(artifact.content).toContain('Homework 5');
  });

  it('builds recent updates as csv rows', () => {
    const artifact = createExportArtifact({
      preset: 'recent_updates',
      format: 'csv',
      input: baseInput,
    });

    expect(artifact.mimeType).toBe('text/csv');
    expect(artifact.content).toContain('kind,site,title');
    expect(artifact.content).toContain('announcement,canvas,Project requirements changed');
    expect(artifact.content).toContain('grade,gradescope,Midterm');
  });

  it('builds all deadlines as calendar output', () => {
    const artifact = createExportArtifact({
      preset: 'all_deadlines',
      format: 'ics',
      input: baseInput,
    });

    expect(artifact.mimeType).toBe('text/calendar');
    expect(artifact.content).toContain('BEGIN:VCALENDAR');
    expect(artifact.content).toContain('SUMMARY:Homework 5');
    expect(artifact.content).toContain('SUMMARY:Registration deadline');
  });

  it('builds current view as structured json', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'json',
      input: baseInput,
    });

    expect(artifact.mimeType).toBe('application/json');
    expect(artifact.content).toContain('"title": "Status board"');
    expect(artifact.content).toContain('"assignments": 1');
    expect(artifact.content).toContain('"timelineEntries": 1');
    expect(artifact.content).toContain('"focusQueue": 1');
    expect(artifact.content).toContain('"weeklyLoad": 1');
  });

  it('builds focus queue as markdown without re-deriving scores', () => {
    const artifact = createExportArtifact({
      preset: 'focus_queue',
      format: 'markdown',
      input: baseInput,
    });

    expect(artifact.filename).toContain('focus-queue');
    expect(artifact.content).toContain('# Focus queue');
    expect(artifact.content).toContain('Homework 5');
    expect(artifact.content).toContain('score 210');
  });

  it('builds weekly load as csv rows', () => {
    const artifact = createExportArtifact({
      preset: 'weekly_load',
      format: 'csv',
      input: baseInput,
    });

    expect(artifact.filename).toContain('weekly-load');
    expect(artifact.content).toContain('dateKey');
    expect(artifact.content).toContain('2026-03-26');
    expect(artifact.content).toContain('assignments=1');
  });
});
