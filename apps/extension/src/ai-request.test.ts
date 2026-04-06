import { describe, expect, it } from 'vitest';
import { buildAiProxyRequest } from './ai-request';

describe('ai request wiring', () => {
  it('builds a provider proxy request from structured workbench inputs', () => {
    const request = buildAiProxyRequest({
      provider: 'openai',
      model: 'gpt-4.1-mini',
      uiLanguage: 'en',
      question: '我现在最该关注什么？',
      todaySnapshot: {
        totalAssignments: 3,
        dueSoonAssignments: 1,
        recentUpdates: 2,
        newGrades: 1,
        riskAlerts: 2,
        syncedSites: 2,
      },
      recentUpdates: [
        {
          id: 'timeline:1',
          kind: 'timeline_entry',
          site: 'canvas',
          source: {
            site: 'canvas',
            resourceId: '1',
            resourceType: 'announcement',
          },
          timelineKind: 'announcement_posted',
          occurredAt: '2026-03-25T09:00:00Z',
          title: 'Project update',
          relatedEntities: [
            {
              id: 'announcement:1',
              kind: 'announcement',
              site: 'canvas',
            },
          ],
          summary: '近期有新的课程公告。',
        },
      ],
      alerts: [
        {
          id: 'alert:1',
          kind: 'alert',
          site: 'canvas',
          source: {
            site: 'canvas',
            resourceId: '1',
            resourceType: 'derived_alert',
          },
          alertKind: 'due_soon',
          title: 'Homework 5 48 小时内截止',
          summary: '这是近期要优先确认的任务。',
          importance: 'high',
          relatedEntities: [],
          triggeredAt: '2026-03-25T10:00:00Z',
          reasons: [],
        },
      ],
      focusQueue: [
        {
          id: 'focus:1',
          entityId: 'canvas:assignment:1',
          entityRef: {
            id: 'canvas:assignment:1',
            kind: 'assignment',
            site: 'canvas',
          },
          kind: 'assignment',
          site: 'canvas',
          title: 'Homework 5',
          score: 180,
          reasons: [],
          blockedBy: [],
          dueAt: '2026-03-26T10:00:00Z',
          updatedAt: '2026-03-25T10:00:00Z',
          pinned: true,
          note: 'Finish this before lunch',
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
          totalScore: 180,
          items: [
            {
              id: 'canvas:assignment:1',
              kind: 'assignment',
              site: 'canvas',
            },
          ],
        },
      ],
      syncRuns: [
        {
          id: 'sync-run:canvas:1',
          site: 'canvas',
          status: 'success',
          outcome: 'partial_success',
          startedAt: '2026-03-25T10:10:00Z',
          completedAt: '2026-03-25T10:12:00Z',
          changeCount: 2,
          resourceFailures: [
            {
              resource: 'announcements',
              errorReason: 'collector_failed',
              attemptedModes: ['official_api'],
              attemptedCollectors: ['CanvasAnnouncementsApiCollector'],
            },
          ],
        },
      ],
      recentChanges: [
        {
          id: 'change:1',
          runId: 'run:1',
          site: 'canvas',
          changeType: 'due_changed',
          occurredAt: '2026-03-25T10:30:00Z',
          title: 'Homework 5 截止时间变化',
          summary: '截止时间从昨晚改到了明晚。',
          entityId: 'canvas:assignment:1',
          entityKind: 'assignment',
          relatedEntity: {
            id: 'canvas:assignment:1',
            kind: 'assignment',
            site: 'canvas',
          },
        },
      ],
      currentViewExport: {
        preset: 'current_view',
        format: 'markdown',
        filename: 'current-view.md',
        mimeType: 'text/markdown',
        content: '# Current view',
      },
    });

    expect(request.route).toBe('/api/providers/openai/chat');
    expect(request.body.messages[0]?.content).toContain('Never request raw DOM');
    expect(request.body.messages[1]?.content).toContain('Homework 5 is due soon');
    expect(request.body.messages[1]?.content).toContain('Due date changed from empty to empty.');
    expect(request.body.messages[1]?.content).toContain('current-view.md');
    expect(request.body.messages[1]?.content).toContain('Finish this before lunch');
    expect(request.body.messages[1]?.content).toContain('"syncRuns"');
    expect(request.body.messages[1]?.content).toContain('"changeCount":2');
  });
});
