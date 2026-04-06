import { describe, expect, it } from 'vitest';
import { buildWorkbenchExportInput } from './export-input';

describe('workbench export input builder', () => {
  it('keeps decision layer and change journal data attached to current view exports', () => {
    const input = buildWorkbenchExportInput({
      preset: 'current_view',
      generatedAt: '2026-03-30T22:00:00-07:00',
      uiLanguage: 'en',
      filters: {
        site: 'canvas',
        onlyUnseenUpdates: false,
      },
      resources: [],
      assignments: [],
      announcements: [],
      messages: [],
      grades: [],
      events: [],
      alerts: [],
      recentUpdates: {
        items: [],
        unseenCount: 0,
      },
      focusQueue: [
        {
          id: 'focus:assignment:1',
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
          pinned: false,
        },
      ],
      weeklyLoad: [
        {
          dateKey: '2026-03-31',
          startsAt: '2026-03-31T00:00:00.000Z',
          endsAt: '2026-03-31T23:59:59.999Z',
          assignmentCount: 1,
          overdueCount: 0,
          dueSoonCount: 1,
          pinnedCount: 0,
          totalScore: 180,
          items: [],
        },
      ],
      syncRuns: [
        {
          id: 'sync-run:canvas:1',
          site: 'canvas',
          status: 'success',
          outcome: 'partial_success',
          startedAt: '2026-03-30T21:58:00-07:00',
          completedAt: '2026-03-30T22:00:00-07:00',
          changeCount: 3,
        },
      ],
      changeEvents: [
        {
          id: 'change:1',
          runId: 'sync-run:canvas:1',
          site: 'canvas',
          changeType: 'due_changed',
          occurredAt: '2026-03-30T22:00:00-07:00',
          title: 'Homework 5 deadline changed',
          summary: 'Due date moved by one day.',
        },
      ],
    });

    expect(input.viewTitle).toBe('Canvas current view');
    expect(input.focusQueue).toHaveLength(1);
    expect(input.weeklyLoad).toHaveLength(1);
    expect(input.syncRuns).toHaveLength(1);
    expect(input.changeEvents).toHaveLength(1);
  });

  it('names the change journal export after the filtered site scope', () => {
    const input = buildWorkbenchExportInput({
      preset: 'change_journal',
      generatedAt: '2026-03-30T22:00:00-07:00',
      uiLanguage: 'en',
      filters: {
        site: 'all',
        onlyUnseenUpdates: false,
      },
      resources: [],
      assignments: [],
      announcements: [],
      messages: [],
      grades: [],
      events: [],
      alerts: [],
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      changeEvents: [],
    });

    expect(input.viewTitle).toBe('All sites change journal');
  });

  it('localizes export view titles for Chinese workbench exports', () => {
    const input = buildWorkbenchExportInput({
      preset: 'weekly_load',
      generatedAt: '2026-03-30T22:00:00-07:00',
      uiLanguage: 'zh-CN',
      filters: {
        site: 'all',
        onlyUnseenUpdates: false,
      },
      resources: [],
      assignments: [],
      announcements: [],
      messages: [],
      grades: [],
      events: [],
      alerts: [],
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      changeEvents: [],
    });

    expect(input.viewTitle).toBe('全部站点 本周负荷');
  });

  it('localizes decision-layer text for english exports', () => {
    const input = buildWorkbenchExportInput({
      preset: 'current_view',
      generatedAt: '2026-03-30T22:00:00-07:00',
      uiLanguage: 'en',
      filters: {
        site: 'canvas',
        onlyUnseenUpdates: false,
      },
      resources: [],
      assignments: [],
      announcements: [],
      messages: [],
      grades: [],
      events: [],
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
          triggeredAt: '2026-03-30T22:00:00-07:00',
          reasons: [],
        },
      ],
      recentUpdates: {
        items: [
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
            occurredAt: '2026-03-30T22:00:00-07:00',
            title: 'Project update',
            summary: '近期有新的课程公告。',
            relatedEntities: [],
          },
        ],
        unseenCount: 0,
      },
      focusQueue: [],
      weeklyLoad: [
        {
          dateKey: '2026-03-31',
          startsAt: '2026-03-31T00:00:00.000Z',
          endsAt: '2026-03-31T23:59:59.999Z',
          assignmentCount: 1,
          overdueCount: 0,
          dueSoonCount: 1,
          pinnedCount: 0,
          totalScore: 180,
          items: [],
        },
      ],
      syncRuns: [],
      changeEvents: [
        {
          id: 'change:1',
          runId: 'sync-run:canvas:1',
          site: 'canvas',
          changeType: 'due_changed',
          occurredAt: '2026-03-30T22:00:00-07:00',
          title: 'Homework 5 截止时间变化',
          summary: '截止时间从昨晚改到了明晚。',
        },
      ],
    });

    const alerts = input.alerts ?? [];
    const timelineEntries = input.timelineEntries ?? [];
    const weeklyLoad = input.weeklyLoad ?? [];
    const changeEvents = input.changeEvents ?? [];

    expect(alerts[0]?.title).toBe('Homework 5 is due soon');
    expect(alerts[0]?.summary).toContain('approaching its deadline');
    expect(timelineEntries[0]?.summary).toBe('A recent course announcement was posted.');
    expect(weeklyLoad[0]?.summary).toContain('active planning day');
    expect(changeEvents[0]?.title).toBe('Homework 5 due date changed');
    expect(changeEvents[0]?.summary).toContain('Due date changed');
  });
});
