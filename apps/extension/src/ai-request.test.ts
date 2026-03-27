import { describe, expect, it } from 'vitest';
import { buildAiProxyRequest } from './ai-request';

describe('ai request wiring', () => {
  it('builds a provider proxy request from structured workbench inputs', () => {
    const request = buildAiProxyRequest({
      provider: 'openai',
      model: 'gpt-4.1-mini',
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
      currentViewExport: {
        preset: 'current_view',
        format: 'markdown',
        filename: 'current-view.md',
        mimeType: 'text/markdown',
        content: '# Current view',
      },
    });

    expect(request.route).toBe('/api/providers/openai/chat');
    expect(request.body.authMode).toBe('api_key');
    expect(request.body.messages[0]?.content).toContain('Never request raw DOM');
    expect(request.body.messages[1]?.content).toContain('Homework 5 48 小时内截止');
    expect(request.body.messages[1]?.content).toContain('current-view.md');
  });
});
