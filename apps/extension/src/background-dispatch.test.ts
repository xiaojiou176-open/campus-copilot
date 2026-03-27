import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';

vi.mock('wxt/utils/define-background', () => ({
  defineBackground: (init: () => unknown) => init,
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      onMessage: {
        addListener: vi.fn(),
      },
    },
    scripting: {
      executeScript: vi.fn(),
    },
    tabs: {
      query: vi.fn(),
    },
  },
}));

import { SITE_SYNC_HANDLERS } from '../entrypoints/background';
import { getDefaultExtensionConfig } from './config';

type ExecuteScriptMockResult = Array<{ result: unknown }>;

describe('background site dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers all four site handlers in the extension runtime', () => {
    expect(Object.keys(SITE_SYNC_HANDLERS).sort()).toEqual(['canvas', 'edstem', 'gradescope', 'myuw']);
  });

  it('falls back to EdStem dashboard DOM when path config is missing but the active tab still exposes course cards', async () => {
    const executeScriptMock = vi.spyOn(
      browser.scripting as {
        executeScript: (...args: unknown[]) => Promise<ExecuteScriptMockResult>;
      },
      'executeScript',
    );
    executeScriptMock.mockResolvedValueOnce([
      {
        result:
          '<a href="/us/courses/90031" class="dash-course"><div class="dash-course-header"><div class="dash-course-code">CSE 312 - 26wi</div><div class="dash-course-unread-count">99+</div></div><div><div class="dash-course-name">Foundations Of Computing II</div></div></a>',
      },
    ]);

    const result = await SITE_SYNC_HANDLERS.edstem({
      activeTab: {
        tabId: 1,
        url: 'https://edstem.org/us/dashboard',
      },
      now: '2026-03-25T10:00:00Z',
      config: getDefaultExtensionConfig(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.messages?.[0]?.title).toContain('CSE 312 - 26wi');
    }
  });

  it('derives the EdStem threads path from a course URL and succeeds through the token-backed background request path', async () => {
    const executeScriptMock = vi.spyOn(
      browser.scripting as {
        executeScript: (...args: unknown[]) => Promise<ExecuteScriptMockResult>;
      },
      'executeScript',
    );
    const htmlResult: ExecuteScriptMockResult = [
      {
        result: '<a href="/us/courses/90031/discussion/7850092">Wrapping up the quarter</a>',
      },
    ];
    const tokenResult: ExecuteScriptMockResult = [
      {
        result: 'token-from-page',
      },
    ];
    executeScriptMock
      .mockResolvedValueOnce(htmlResult)
      .mockResolvedValueOnce(tokenResult);

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sort_key: '',
            threads: [
              {
                id: 7850092,
                course_id: 90031,
                title: 'Wrapping up the quarter',
                updated_at: '2026-03-26T20:22:29.739841+11:00',
              },
            ],
            users: [],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      );

    const result = await SITE_SYNC_HANDLERS.edstem({
      activeTab: {
        tabId: 1,
        url: 'https://edstem.org/us/courses/90031/discussion',
      },
      now: '2026-03-26T11:24:28.944Z',
      config: getDefaultExtensionConfig(),
    });

    expect(fetchMock).toHaveBeenCalledWith('https://us.edstem.org/api/courses/90031/threads?limit=30&sort=new', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'x-token': 'token-from-page',
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.messages?.[0]?.title).toBe('Wrapping up the quarter');
    }

    fetchMock.mockRestore();
  });
});
