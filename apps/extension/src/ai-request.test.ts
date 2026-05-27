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
        scope: {
          scopeType: 'current_view',
          preset: 'current_view',
          site: 'canvas',
          resourceFamily: 'workspace_snapshot',
        },
        packaging: {
          authorizationLevel: 'allowed',
          aiAllowed: false,
          riskLabel: 'medium',
          matchConfidence: 'medium',
          provenance: [
            {
              sourceType: 'derived_read_model',
              label: 'Unified local read model',
              readOnly: true,
            },
          ],
        },
        content: '# Current view',
      },
    });

    expect(request.route).toBe('/api/providers/openai/chat');
    expect(request.body.messages[0]?.content).toContain('Never request raw DOM');
    expect(request.body.messages[0]?.content).toContain('raw course files');
    expect(request.body.messages[0]?.content).toContain('Advanced material analysis stays default-disabled');
    expect(request.body.messages[0]?.content).toContain('Current site policy overlay: Canvas.');
    expect(request.body.messages[1]?.content).toContain('Homework 5 is due soon');
    expect(request.body.messages[1]?.content).toContain('current-view.md');
    expect(request.body.messages[1]?.content).toContain('"contentRedacted":true');
    expect(request.body.messages[1]?.content).toContain('"redactionReason":"ai_not_allowed_for_current_view_export"');
    expect(request.body.messages[1]?.content).toContain('"focusQueueCount":1');
    expect(request.body.messages[1]?.content).toContain('"recentChangesCount":1');
    expect(request.body.messages[1]?.content).toContain('"syncRunsCount":1');
    expect(request.body.messages[1]?.content).not.toContain('Finish this before lunch');
    expect(request.body.messages[1]?.content).not.toContain('截止时间从昨晚改到了明晚。');
  });

  it('rejects raw material questions before the extension can proxy them to the shared AI seam', () => {
    expect(() =>
      buildAiProxyRequest({
        provider: 'openai',
        model: 'gpt-4.1-mini',
        uiLanguage: 'en',
        question: 'Please summarize my lecture slides and assignment PDF.',
        todaySnapshot: {
          totalAssignments: 0,
          dueSoonAssignments: 0,
          recentUpdates: 0,
          newGrades: 0,
          riskAlerts: 0,
          syncedSites: 0,
        },
        recentUpdates: [],
        alerts: [],
        focusQueue: [],
        weeklyLoad: [],
        syncRuns: [],
        recentChanges: [],
        currentViewExport: {
          preset: 'current_view',
          format: 'markdown',
          filename: 'current-view.md',
          mimeType: 'text/markdown',
          scope: {
            scopeType: 'current_view',
            preset: 'current_view',
            site: 'canvas',
            resourceFamily: 'workspace_snapshot',
          },
          packaging: {
            authorizationLevel: 'allowed',
            aiAllowed: false,
            riskLabel: 'medium',
            matchConfidence: 'medium',
            provenance: [
              {
                sourceType: 'derived_read_model',
                label: 'Unified local read model',
                readOnly: true,
              },
            ],
          },
          content: '# Current view',
        },
      }),
    ).toThrow('Advanced material analysis is not supported in the current product path.');
  });

  it('passes a per-course opt-in excerpt through the shared AI seam', () => {
    const request = buildAiProxyRequest({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      uiLanguage: 'en',
      question: 'Please summarize these lecture slides for the midterm.',
      advancedMaterialAnalysis: {
        enabled: true,
        policy: 'per_course_opt_in',
        courseId: 'canvas:course:1',
        courseLabel: 'Canvas · CSE 142',
        excerpt: 'The lecture focuses on asymptotic notation and binary search.',
        userAcknowledgedResponsibility: true,
      },
      todaySnapshot: {
        totalAssignments: 0,
        dueSoonAssignments: 0,
        recentUpdates: 0,
        newGrades: 0,
        riskAlerts: 0,
        syncedSites: 0,
      },
      recentUpdates: [],
      alerts: [],
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      recentChanges: [],
      currentViewExport: {
        preset: 'current_view',
        format: 'markdown',
        filename: 'current-view.md',
        mimeType: 'text/markdown',
        scope: {
          scopeType: 'current_view',
          preset: 'current_view',
          site: 'canvas',
          resourceFamily: 'workspace_snapshot',
        },
        packaging: {
          authorizationLevel: 'allowed',
          aiAllowed: false,
          riskLabel: 'medium',
          matchConfidence: 'medium',
          provenance: [
            {
              sourceType: 'derived_read_model',
              label: 'Unified local read model',
              readOnly: true,
            },
          ],
        },
        content: '# Current view',
      },
    });

    expect(request.body.messages[0]?.content).toContain('explicitly opted in to advanced material analysis');
    expect(request.body.messages[1]?.content).toContain('Canvas · CSE 142');
    expect(request.body.messages[1]?.content).toContain('binary search');
  });
});
