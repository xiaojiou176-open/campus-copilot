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
        resourceType: 'alert',
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
  });
});
