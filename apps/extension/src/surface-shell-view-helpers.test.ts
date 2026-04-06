import { describe, expect, it } from 'vitest';
import {
  formatAlertImportanceLabel,
  formatAssignmentStatus,
  formatAlertSummary,
  formatAlertTitle,
  formatBlockedByList,
  formatChangeTypeLabel,
  formatChangeValue,
  formatChangeEventSummary,
  formatChangeEventTitle,
  formatFocusReason,
  formatLatestSyncReceipt,
  formatSiteTrustDetail,
  formatTimelineSummary,
  formatTimelineTitle,
  formatTimelineKindLabel,
  formatWeeklyLoadHighlights,
} from './surface-shell-view-helpers';
import { getUiText } from './i18n';

describe('surface shell view helpers', () => {
  it('humanizes focus reasons and blocked resources for English surfaces', () => {
    expect(
      formatFocusReason(
        {
          code: 'due_soon',
          label: '48 小时内到期',
          importance: 'high',
          detail: '48 小时内到期',
        },
        {
          id: 'focus:1',
          kind: 'assignment',
          site: 'canvas',
          title: 'Homework 5',
          score: 180,
          reasons: [],
          blockedBy: ['未同步 assignments'],
          dueAt: '2026-04-02T18:00:00.000Z',
          pinned: false,
        },
        'en',
      ),
    ).toContain('Due within 48 hours');
    expect(formatBlockedByList(['未同步 assignments', 'messages'], 'en')).toBe('Assignments / Messages');
  });

  it('rebuilds English alert and change-journal copy from structured state', () => {
    expect(
      formatAlertTitle(
        {
          id: 'alert:1',
          kind: 'alert',
          site: 'canvas',
          source: { site: 'canvas', resourceId: 'hw5', resourceType: 'derived_alert' },
          alertKind: 'overdue',
          title: 'Homework 5 已逾期',
          summary: '这个任务已经过了截止时间，应该被放到最前面处理。',
          importance: 'critical',
          relatedEntities: [],
          triggeredAt: '2026-04-01T00:00:00.000Z',
        },
        'en',
      ),
    ).toBe('Homework 5 is overdue');
    expect(
      formatAlertSummary(
        {
          id: 'alert:2',
          kind: 'alert',
          site: 'canvas',
          source: { site: 'canvas', resourceId: 'hw5', resourceType: 'derived_alert' },
          alertKind: 'due_soon',
          title: 'Homework 5 48 小时内截止',
          summary: '这个任务正在逼近截止时间，应该继续留在高优先级。',
          importance: 'high',
          relatedEntities: [],
          triggeredAt: '2026-04-01T00:00:00.000Z',
        },
        'en',
      ),
    ).toBe('This work is approaching its deadline and should stay near the top.');
    expect(
      formatChangeEventTitle(
        {
          id: 'change:1',
          runId: 'run:1',
          site: 'canvas',
          changeType: 'due_changed',
          occurredAt: '2026-04-01T00:00:00.000Z',
          title: 'Homework 5 截止时间变化',
          summary: '截止时间发生了变化。',
        },
        'en',
      ),
    ).toBe('Homework 5 due date changed');
    expect(
      formatChangeEventSummary(
        {
          id: 'change:2',
          runId: 'run:1',
          site: 'canvas',
          changeType: 'status_changed',
          occurredAt: '2026-04-01T00:00:00.000Z',
          title: 'Homework 5 状态变化',
          summary: '状态发生了变化。',
          previousValue: 'todo',
          nextValue: 'submitted',
        },
        'en',
        getUiText('en'),
      ),
    ).toBe('Status changed from To do to Submitted.');
    expect(
      formatTimelineTitle(
        {
          title: '讨论区有新动态',
          timelineKind: 'discussion_replied',
        },
        'en',
      ),
    ).toBe('Recent discussion update');
    expect(
      formatTimelineSummary(
        {
          timelineKind: 'discussion_replied',
          summary: '近期有新的讨论更新。',
        },
        'en',
      ),
    ).toBe('Recent discussion activity landed here.');
  });

  it('localizes enum-like badges and value deltas before they reach the UI', () => {
    expect(formatAssignmentStatus('submitted', 'en')).toBe('Submitted');
    expect(formatAssignmentStatus('submitted', 'zh-CN')).toBe('已提交');
    expect(formatTimelineKindLabel('announcement_posted', 'en')).toBe('Announcement');
    expect(formatTimelineKindLabel('announcement_posted', 'zh-CN')).toBe('课程公告');
    expect(formatChangeTypeLabel('status_changed', 'en')).toBe('Status changed');
    expect(formatChangeTypeLabel('status_changed', 'zh-CN')).toBe('状态变化');
    expect(formatChangeValue('todo', 'en', getUiText('en'))).toBe('To do');
    expect(formatChangeValue('submitted', 'zh-CN', getUiText('zh-CN'))).toBe('已提交');
    expect(formatAlertImportanceLabel('critical', 'zh-CN')).toBe('严重');
  });

  it('builds trust and weekly-load summaries from structure', () => {
    expect(
      formatSiteTrustDetail(
        {
          site: 'myuw',
          counts: {
            site: 'myuw',
            courses: 1,
            resources: 0,
            assignments: 0,
            announcements: 0,
            grades: 0,
            messages: 0,
            events: 2,
          },
          sync: {
            key: 'myuw',
            site: 'myuw',
            status: 'success',
            lastSyncedAt: '2026-04-01T00:00:00.000Z',
            lastOutcome: 'partial_success',
            resourceFailures: [
              {
                resource: 'events',
                errorReason: 'myuw_state_dom_partial_mock',
                attemptedModes: ['state'],
                attemptedCollectors: ['state-first'],
              },
            ],
          },
        },
        'en',
        '2026-04-01T12:00:00.000Z',
      ),
    ).toContain('Partial: missing Events');
    expect(
      formatWeeklyLoadHighlights(
        {
          dateKey: '2026-04-01',
          startsAt: '2026-04-01T00:00:00.000Z',
          endsAt: '2026-04-01T23:59:59.000Z',
          assignmentCount: 2,
          eventCount: 1,
          overdueCount: 1,
          dueSoonCount: 2,
          pinnedCount: 1,
          totalScore: 240,
          items: [],
        },
        'en',
      ),
    ).toEqual(['1 overdue', '2 due soon', '1 pinned', '1 event nodes']);
    expect(
      formatLatestSyncReceipt(
        {
          id: 'run:latest',
          site: 'canvas',
          startedAt: '2026-04-01T00:00:00.000Z',
          completedAt: '2026-04-01T00:05:00.000Z',
          status: 'success',
          outcome: 'partial_success',
          changeCount: 3,
        },
        getUiText('en'),
      ),
    ).toBe('3 change event(s) were recorded in the latest partial success run.');
  });
});
