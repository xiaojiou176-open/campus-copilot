import { describe, expect, it } from 'vitest';
import { createExportArtifact } from './index';

const generatedAt = '2026-03-24T18:00:00-07:00';

const baseInput = {
  generatedAt,
  viewTitle: 'Status board',
  scope: {
    site: 'canvas',
    courseIdOrKey: 'canvas:course:1',
  },
  authorization: {
    policyVersion: 'wave1-skeleton',
    rules: [
      {
        id: 'canvas-layer1',
        layer: 'layer1_read_export' as const,
        status: 'allowed' as const,
        site: 'canvas',
        courseIdOrKey: 'canvas:course:1',
        resourceFamily: 'workspace_snapshot',
      },
      {
        id: 'canvas-layer2',
        layer: 'layer2_ai_read_analysis' as const,
        status: 'blocked' as const,
        site: 'canvas',
        courseIdOrKey: 'canvas:course:1',
        resourceFamily: 'workspace_snapshot',
      },
    ],
  },
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
      summary: 'Submitted draft is already in Canvas.',
      detail: 'Q1 1 / 1 · Correct; Q2 0 / 1 · Incorrect',
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
      summary: 'Milestones and acceptance criteria were updated.',
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
      summary: 'Staff posted a reply with the updated review checklist.',
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
      summary: 'Drop and registration changes close this Friday.',
      location: 'Schmitz Hall',
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
      summary: 'Submitted draft is already in Canvas.',
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
          detail: 'Due at 2026-03-26T23:59:00-07:00.',
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
      summary: 'High load: 1 item due soon and 1 pinned item.',
      highlights: ['1 item due soon', '1 pinned item'],
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
    expect(artifact.content).toContain('Submitted draft is already in Canvas.');
    expect(artifact.content).toContain('Q1 1 / 1 · Correct; Q2 0 / 1 · Incorrect');
  });

  it('builds recent updates as csv rows', () => {
    const artifact = createExportArtifact({
      preset: 'recent_updates',
      format: 'csv',
      input: baseInput,
    });

    expect(artifact.mimeType).toBe('text/csv');
    expect(artifact.content).toContain(
      'kind,site,scopeType,scopeSite,scopeCourseIdOrKey,resourceFamily,authorizationLevel,aiAllowed,riskLabel,matchConfidence,provenance,title',
    );
    expect(artifact.content).toContain(',detail,');
    expect(artifact.content).toContain('false');
    expect(artifact.content).toContain('announcement,canvas,current_course,canvas,canvas:course:1,recent_updates');
    expect(artifact.content).toContain('Milestones and acceptance criteria were updated.');
    expect(artifact.content).toContain('grade,gradescope,current_course,canvas,canvas:course:1,recent_updates');
    expect(artifact.content).toContain('Project requirements changed');
    expect(artifact.content).toContain('Midterm');
  });

  it('builds all deadlines as calendar output', () => {
    const artifact = createExportArtifact({
      preset: 'all_deadlines',
      format: 'ics',
      input: baseInput,
    });

    expect(artifact.mimeType).toBe('text/calendar');
    expect(artifact.content).toContain('BEGIN:VCALENDAR');
    expect(artifact.content).toContain('X-CAMPUS-COPILOT-AUTHORIZATION-LEVEL');
    expect(artifact.content).toContain('X-CAMPUS-COPILOT-GENERATED-AT');
    expect(artifact.content).toContain('X-CAMPUS-COPILOT-MATCH-CONFIDENCE');
    expect(artifact.content).toContain('X-CAMPUS-COPILOT-PROVENANCE');
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
    expect(artifact.scope.site).toBe('canvas');
    expect(artifact.scope.courseIdOrKey).toBe('canvas:course:1');
    expect(artifact.packaging.authorizationLevel).toBe('allowed');
    expect(artifact.packaging.aiAllowed).toBe(false);
    expect(artifact.packaging.provenance.some((entry) => entry.label === 'Canvas official API carrier')).toBe(true);
    expect(artifact.content).toContain('"title": "Status board"');
    expect(artifact.content).toContain('"scope"');
    expect(artifact.content).toContain('"packaging"');
    expect(artifact.content).toContain('"authorization_level": "allowed"');
    expect(artifact.content).toContain('"ai_allowed": false');
    expect(artifact.content).toContain('"match_confidence": "high"');
    expect(artifact.content).toContain('"assignments": 1');
    expect(artifact.content).toContain('"timelineEntries": 1');
    expect(artifact.content).toContain('"focusQueue": 1');
    expect(artifact.content).toContain('"weeklyLoad": 1');
  });

  it('builds current view as csv with assignment detail in the dedicated detail column', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'csv',
      input: baseInput,
    });

    expect(artifact.mimeType).toBe('text/csv');
    expect(artifact.content).toContain(',detail,');
    expect(artifact.content).toContain('Submitted draft is already in Canvas.');
    expect(artifact.content).toContain('Q1 1 / 1 · Correct; Q2 0 / 1 · Incorrect');
  });

  it('builds focus queue as markdown without re-deriving scores', () => {
    const artifact = createExportArtifact({
      preset: 'focus_queue',
      format: 'markdown',
      input: baseInput,
    });

    expect(artifact.filename).toContain('focus-queue');
    expect(artifact.content).toContain('# Focus queue');
    expect(artifact.content).toContain('## Policy Envelope');
    expect(artifact.content).toContain('Homework 5');
    expect(artifact.content).toContain('score 210');
    expect(artifact.content).toContain('Submitted draft is already in Canvas.');
    expect(artifact.content).toContain('48 hours remaining: Due at 2026-03-26T23:59:00-07:00.');
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
    expect(artifact.content).toContain('High load: 1 item due soon and 1 pinned item.');
    expect(artifact.content).toContain('1 item due soon | 1 pinned item');
  });

  it('builds change journal as markdown from sync runs and change events', () => {
    const artifact = createExportArtifact({
      preset: 'change_journal',
      format: 'markdown',
      input: baseInput,
    });

    expect(artifact.filename).toContain('change-journal');
    expect(artifact.content).toContain('# Change journal');
    expect(artifact.content).toContain('Sync Runs');
    expect(artifact.content).toContain('Change Events');
    expect(artifact.content).toContain('Homework 5 due date changed');
  });

  it('falls back to a conservative packaging skeleton when no auth rules are provided', () => {
    const artifact = createExportArtifact({
      preset: 'focus_queue',
      format: 'json',
      input: {
        generatedAt,
        focusQueue: baseInput.focusQueue,
      },
    });

    expect(artifact.scope.scopeType).toBe('multi_site');
    expect(artifact.scope.resourceFamily).toBe('focus_queue');
    expect(artifact.packaging.authorizationLevel).toBe('partial');
    expect(artifact.packaging.aiAllowed).toBe(false);
    expect(artifact.packaging.provenance).toHaveLength(2);
  });

  it('tightens workspace snapshot packaging when high-sensitivity administrative summaries are present', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'json',
      input: {
        generatedAt,
        authorization: {
          policyVersion: 'wave2-deepwater-productization',
          rules: [
            {
              id: 'workspace-layer1',
              layer: 'layer1_read_export',
              status: 'allowed',
              resourceFamily: 'workspace_snapshot',
            },
            {
              id: 'workspace-layer2',
              layer: 'layer2_ai_read_analysis',
              status: 'allowed',
              resourceFamily: 'workspace_snapshot',
            },
            {
              id: 'transcript-layer1',
              layer: 'layer1_read_export',
              status: 'confirm_required',
              resourceFamily: 'transcript_summary',
            },
            {
              id: 'transcript-layer2',
              layer: 'layer2_ai_read_analysis',
              status: 'blocked',
              resourceFamily: 'transcript_summary',
            },
          ],
        },
        administrativeSummaries: [
          {
            id: 'admin:transcript:1',
            family: 'transcript',
            title: 'Transcript summary',
            summary: 'Latest transcript lane is still summary-first and export-first.',
            importance: 'high',
            aiDefault: 'blocked',
            authoritySource: 'myuw summary lane',
          },
        ],
      },
    });

    expect(artifact.scope.resourceFamily).toBe('workspace_snapshot');
    expect(artifact.packaging.authorizationLevel).toBe('confirm_required');
    expect(artifact.packaging.aiAllowed).toBe(false);
    expect(artifact.packaging.riskLabel).toBe('high');
    expect(artifact.packaging.provenance.some((entry) => entry.label === 'Administrative summary-first substrate')).toBe(true);
    expect(
      artifact.packaging.provenance.some((entry) =>
        entry.detail?.includes('their presence does not mean a truthful runtime carrier is landed'),
      ),
    ).toBe(false);
    expect(artifact.content).toContain('"administrativeSummaries": 1');
    expect(artifact.content).toContain('"authorization_level": "confirm_required"');
  });

  it('ignores caller-supplied packaging overrides that would overstate authorization truth', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'csv',
      input: {
        generatedAt,
        scope: {
          site: 'myuw',
        },
        packaging: {
          authorizationLevel: 'allowed',
          aiAllowed: true,
        },
        authorization: {
          policyVersion: 'wave2-deepwater-productization',
          rules: [
            {
              id: 'workspace-layer1',
              layer: 'layer1_read_export',
              status: 'allowed',
              resourceFamily: 'workspace_snapshot',
            },
            {
              id: 'workspace-layer2',
              layer: 'layer2_ai_read_analysis',
              status: 'allowed',
              resourceFamily: 'workspace_snapshot',
            },
            {
              id: 'transcript-layer1',
              layer: 'layer1_read_export',
              status: 'confirm_required',
              resourceFamily: 'transcript_summary',
            },
            {
              id: 'transcript-layer2',
              layer: 'layer2_ai_read_analysis',
              status: 'blocked',
              resourceFamily: 'transcript_summary',
            },
          ],
        },
        administrativeSummaries: [
          {
            id: 'admin-summary:transcript:blocker',
            family: 'transcript',
            title: 'Transcript summary lane',
            summary: 'No truthful transcript runtime carrier is landed yet. Historical-record detail remains blocked until a lawful summary carrier is proven.',
            importance: 'high',
            aiDefault: 'blocked',
            authoritySource: 'myuw candidate lane',
          },
        ],
      },
    });

    expect(artifact.packaging.authorizationLevel).toBe('confirm_required');
    expect(artifact.packaging.aiAllowed).toBe(false);
    expect(
      artifact.packaging.provenance.some((entry) =>
        entry.detail?.includes('their presence does not mean a truthful runtime carrier is landed'),
      ),
    ).toBe(true);
    expect(artifact.content).toContain('carrier_not_landed');
  });
});
