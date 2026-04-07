import { describe, expect, it } from 'vitest';
import { buildWorkbenchAiProxyRequest, buildWorkbenchExportInput, CanvasSyncOutcomeSchema, createSurfaceSnapshot } from './index';

describe('core contracts', () => {
  it('creates a surface snapshot from canonical storage results', () => {
    const snapshot = createSurfaceSnapshot('sidepanel', {
      courses: 1,
      resources: 0,
      assignments: 2,
      announcements: 3,
      messages: 0,
      events: 0,
    });

    expect(snapshot.surface).toBe('sidepanel');
    expect(snapshot.counts.assignments).toBe(2);
  });

  it('locks canvas sync outcomes to the allowed contract', () => {
    expect(CanvasSyncOutcomeSchema.parse('success')).toBe('success');
    expect(CanvasSyncOutcomeSchema.parse('unauthorized')).toBe('unauthorized');
    expect(() => CanvasSyncOutcomeSchema.parse('not_a_real_outcome')).toThrow();
  });

  it('builds shared workbench export input with presentation overrides', () => {
    const input = buildWorkbenchExportInput({
      preset: 'current_view',
      generatedAt: '2026-04-06T00:00:00.000Z',
      filters: { site: 'canvas', onlyUnseenUpdates: false },
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
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      changeEvents: [],
      presentation: {
        viewTitle: 'Localized current view',
      },
    });

    expect(input.viewTitle).toBe('Localized current view');
    expect(input.timelineEntries).toEqual([]);
  });

  it('builds a shared AI proxy request on the existing route/body contract', () => {
    const request = buildWorkbenchAiProxyRequest({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      question: 'What should I do first?',
      todaySnapshot: {
        totalAssignments: 2,
        dueSoonAssignments: 1,
        recentUpdates: 3,
        newGrades: 0,
        riskAlerts: 1,
        syncedSites: 4,
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
        content: '# Current view',
      },
    });

    expect(request.route).toBe('/api/providers/gemini/chat');
    expect(request.body.messages).toHaveLength(2);
    expect(request.body.messages[0]?.role).toBe('system');
    expect(request.body.messages[1]?.role).toBe('user');
  });
});
