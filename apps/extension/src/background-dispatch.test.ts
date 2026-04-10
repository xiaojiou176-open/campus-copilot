import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
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
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('registers all five site handlers in the extension runtime', () => {
    expect(Object.keys(SITE_SYNC_HANDLERS).sort()).toEqual(['canvas', 'edstem', 'gradescope', 'myuw', 'time-schedule']);
  });

  it('syncs Time Schedule from a public course offerings page in the active tab', async () => {
    const executeScriptMock = vi.spyOn(
      browser.scripting as {
        executeScript: (...args: unknown[]) => Promise<ExecuteScriptMockResult>;
      },
      'executeScript',
    );
    executeScriptMock.mockResolvedValueOnce([
      {
        result: readFileSync(
          new URL('../../../packages/adapters-time-schedule/src/__fixtures__/public-course-offerings-cse.html', import.meta.url),
          'utf8',
        ),
      },
    ]);

    const result = await SITE_SYNC_HANDLERS['time-schedule']({
      activeTab: {
        tabId: 1,
        url: 'https://www.washington.edu/students/timeschd/pub/SPR2026/cse.html',
      },
      now: '2026-04-10T06:10:00Z',
      config: getDefaultExtensionConfig(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses?.[0]).toEqual(
        expect.objectContaining({
          site: 'time-schedule',
          code: 'CSE 121',
          title: 'COMP PROGRAMMING I',
        }),
      );
      expect(result.snapshot.events?.[0]).toEqual(
        expect.objectContaining({
          site: 'time-schedule',
          eventKind: 'class',
        }),
      );
    }
  });

  it('keeps encoded angle-bracket course text when syncing Time Schedule in the background', async () => {
    const executeScriptMock = vi.spyOn(
      browser.scripting as {
        executeScript: (...args: unknown[]) => Promise<ExecuteScriptMockResult>;
      },
      'executeScript',
    );
    executeScriptMock.mockResolvedValueOnce([
      {
        result: readFileSync(
          new URL('../../../packages/adapters-time-schedule/src/__fixtures__/public-course-offerings-cse.html', import.meta.url),
          'utf8',
        ).replace('COMP PROGRAMMING I', 'COMP &lt;LAB&gt; PROGRAMMING I'),
      },
    ]);

    const result = await SITE_SYNC_HANDLERS['time-schedule']({
      activeTab: {
        tabId: 1,
        url: 'https://www.washington.edu/students/timeschd/pub/SPR2026/cse.html',
      },
      now: '2026-04-10T06:10:00Z',
      config: getDefaultExtensionConfig(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.courses?.[0]).toEqual(
        expect.objectContaining({
          title: 'COMP <LAB> PROGRAMMING I',
        }),
      );
    }
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
      .mockResolvedValueOnce(tokenResult)
      .mockResolvedValueOnce(tokenResult)
      .mockResolvedValueOnce(tokenResult)
      .mockResolvedValueOnce(tokenResult)
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
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            courses: [
              {
                course: {
                  id: 90031,
                  code: 'CSE 312 - 26wi',
                  name: 'Foundations of Computing II',
                },
              },
            ],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            resources: [],
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

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://us.edstem.org/api/courses/90031/threads?limit=30&sort=new', {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'x-token': 'token-from-page',
        },
      });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://us.edstem.org/internal/unread', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'x-token': 'token-from-page',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'https://us.edstem.org/internal/recent-activity', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'x-token': 'token-from-page',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, 'https://us.edstem.org/api/user', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'x-token': 'token-from-page',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(5, 'https://us.edstem.org/api/courses/90031/resources', {
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
      expect(result.snapshot.courses?.[0]?.title).toBe('Foundations of Computing II');
      expect(result.snapshot.messages?.[0]?.title).toBe('Wrapping up the quarter');
      expect(result.snapshot.resources).toEqual([]);
    }

    fetchMock.mockRestore();
  });

  it('returns partial_success when EdStem messages sync but /api/user cannot provide course metadata', async () => {
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
      .mockResolvedValueOnce(tokenResult)
      .mockResolvedValueOnce(tokenResult)
      .mockResolvedValueOnce(tokenResult)
      .mockResolvedValueOnce(tokenResult)
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
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'missing' }), {
          status: 404,
          headers: {
            'content-type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            resources: [],
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

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.health.code).toBe('partial_success');
      expect(result.snapshot.courses).toEqual([
        expect.objectContaining({
          id: 'edstem:course:90031',
          title: 'EdStem course 90031',
        }),
      ]);
      expect(result.snapshot.messages?.[0]?.title).toBe('Wrapping up the quarter');
      expect(result.snapshot.resources).toEqual([]);
    }

    fetchMock.mockRestore();
  });

  it('derives Gradescope course entities in runtime sync when internal assignments expose course names', async () => {
    const executeScriptMock = vi.spyOn(
      browser.scripting as {
        executeScript: (...args: unknown[]) => Promise<ExecuteScriptMockResult>;
      },
      'executeScript',
    );
    executeScriptMock
      .mockResolvedValueOnce([
        {
          result: '<main>Gradescope</main>',
        },
      ])
      .mockResolvedValueOnce([
        {
          result: {
            ok: true,
            status: 200,
            responseUrl: 'https://www.gradescope.com/internal/assignments',
            bodyText: JSON.stringify([
              {
                id: 9,
                course_id: 17,
                course_name: 'Introduction to Algorithms',
                title: 'Problem Set 1',
                due_at: '2026-03-27T23:59:00-07:00',
                submission_status: 'submitted',
                url: 'https://www.gradescope.com/courses/17/assignments/9',
              },
            ]),
            contentType: 'application/json',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          result: {
            ok: true,
            status: 200,
            responseUrl: 'https://www.gradescope.com/internal/grades',
            bodyText: JSON.stringify([
              {
                assignment_id: 9,
                course_id: 17,
                title: 'Problem Set 1',
                score: 92,
                max_score: 100,
                url: 'https://www.gradescope.com/courses/17/assignments/9/submissions/1',
              },
            ]),
            contentType: 'application/json',
          },
        },
      ]);

    const result = await SITE_SYNC_HANDLERS.gradescope({
      activeTab: {
        tabId: 1,
        url: 'https://www.gradescope.com/account',
      },
      now: '2026-03-24T18:00:00-07:00',
      config: getDefaultExtensionConfig(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses?.[0]).toMatchObject({
        id: 'gradescope:course:17',
        title: 'Introduction to Algorithms',
      });
      expect(result.snapshot.grades?.[0]?.title).toBe('Problem Set 1');
    }
  });

  it('uses MyUW session-backed api responses before state/dom fallbacks when available', async () => {
    const executeScriptMock = vi.spyOn(
      browser.scripting as {
        executeScript: (...args: unknown[]) => Promise<ExecuteScriptMockResult>;
      },
      'executeScript',
    );
    executeScriptMock
      .mockResolvedValueOnce([
        {
          result: {
            pageState: undefined,
            pageHtml: '<main>MyUW</main>',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          result: {
            ok: true,
            status: 200,
            responseUrl: 'https://my.uw.edu/api/v1/schedule/current',
            bodyText: JSON.stringify({
              sections: [
                {
                  curriculum_abbr: 'CSE',
                  course_number: '312',
                  section_id: 'A',
                  course_title: 'FOUNDATIONS COMP II',
                  canvas_url: 'https://canvas.uw.edu/courses/1883261',
                  sln: 12583,
                  is_primary_section: true,
                },
              ],
            }),
            contentType: 'application/json',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          result: {
            ok: true,
            status: 200,
            responseUrl: 'https://my.uw.edu/api/v1/notices/',
            bodyText: JSON.stringify([
              {
                id: 105,
                notice_content:
                  '<span class="notice-title">Tuition Due</span><span class="notice-body-with-title">Spring quarter tuition is due.</span>',
                attributes: [
                  {
                    name: 'DisplayBegin',
                    value: '2026-03-31T07:00:00+00:00',
                  },
                ],
              },
            ]),
            contentType: 'application/json',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          result: {
            ok: true,
            status: 200,
            responseUrl: 'https://my.uw.edu/api/v1/visual_schedule/current',
            bodyText: JSON.stringify({
              periods: [
                {
                  id: 0,
                  start_date: '2026-03-30',
                  end_date: '2026-06-05',
                  sections: [
                    {
                      curriculum_abbr: 'CSE',
                      course_number: '312',
                      section_id: 'A',
                      course_title: 'FOUNDATIONS COMP II',
                      canvas_url: 'https://canvas.uw.edu/courses/1883261',
                      sln: 12583,
                      is_primary_section: true,
                      start_date: '2026-03-30',
                      end_date: '2026-06-05',
                      meetings: [
                        {
                          index: '1',
                          type: 'lecture',
                          meeting_days: {
                            monday: true,
                            tuesday: null,
                            wednesday: true,
                            thursday: null,
                            friday: true,
                            saturday: null,
                            sunday: null,
                          },
                          start_time: '09:30',
                          end_time: '10:20',
                          building: 'KNE',
                          room: '110',
                          building_name: 'Kane Hall',
                        },
                      ],
                      final_exam: {
                        is_confirmed: false,
                        no_exam_or_nontraditional: false,
                        start_date: '2026-06-10T08:30:00',
                        end_date: '2026-06-10T10:20:00',
                        building: 'KNE',
                        room_number: '110',
                        room: '110',
                        building_name: 'Kane Hall',
                      },
                    },
                  ],
                },
                {
                  id: 'finals',
                  sections: [
                    {
                      curriculum_abbr: 'CSE',
                      course_number: '312',
                      section_id: 'A',
                      course_title: 'FOUNDATIONS COMP II',
                      canvas_url: 'https://canvas.uw.edu/courses/1883261',
                      sln: 12583,
                      is_primary_section: true,
                      final_exam: {
                        is_confirmed: false,
                        no_exam_or_nontraditional: false,
                        start_date: '2026-06-10T08:30:00',
                        end_date: '2026-06-10T10:20:00',
                        building: 'KNE',
                        room_number: '110',
                        room: '110',
                        building_name: 'Kane Hall',
                      },
                    },
                  ],
                },
              ],
              term: {
                first_day_quarter: '2026-03-30',
                last_day_instruction: '2026-06-05',
              },
            }),
            contentType: 'application/json',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          result: {
            ok: true,
            status: 200,
            responseUrl: 'https://my.uw.edu/api/v1/deptcal/',
            bodyText: JSON.stringify({
              events: [
                {
                  summary: 'Dissertation defense',
                  start: '2026-04-06T09:00:00-07:00',
                  end: '2026-04-06T10:00:00-07:00',
                  event_url: 'https://www.cs.washington.edu/news-events/research-colloquia/?event=1',
                },
              ],
            }),
            contentType: 'application/json',
          },
        },
      ]);

    const result = await SITE_SYNC_HANDLERS.myuw({
      activeTab: {
        tabId: 1,
        url: 'https://my.uw.edu/',
      },
      now: '2026-03-31T17:00:00Z',
      config: getDefaultExtensionConfig(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses?.[0]?.title).toBe('CSE 312 A: FOUNDATIONS COMP II');
      expect(result.snapshot.announcements?.[0]?.title).toBe('Tuition Due');
      expect(result.snapshot.events?.some((item) => item.title === 'CSE 312 A lecture')).toBe(true);
      expect(result.snapshot.events?.some((item) => item.title === 'CSE 312 A final exam')).toBe(true);
      expect(result.snapshot.events?.some((item) => item.title === 'Dissertation defense')).toBe(true);
      expect(result.attemptsByResource?.courses?.[0]?.mode).toBe('private_api');
      expect(result.attemptsByResource?.announcements?.[0]?.mode).toBe('private_api');
      expect(result.attemptsByResource?.events?.[0]?.mode).toBe('private_api');
    }
  });

  it('returns partial_success when MyUW courses fail but notices and events still sync', async () => {
    const executeScriptMock = vi.spyOn(
      browser.scripting as {
        executeScript: (...args: unknown[]) => Promise<ExecuteScriptMockResult>;
      },
      'executeScript',
    );
    executeScriptMock
      .mockResolvedValueOnce([
        {
          result: {
            pageState: undefined,
            pageHtml: '<main>MyUW</main>',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          result: {
            ok: true,
            status: 503,
            responseUrl: 'https://my.uw.edu/api/v1/schedule/current',
            bodyText: '{"error":"temporarily unavailable"}',
            contentType: 'application/json',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          result: {
            ok: true,
            status: 200,
            responseUrl: 'https://my.uw.edu/api/v1/notices/',
            bodyText: JSON.stringify([
              {
                id: 105,
                notice_content:
                  '<span class="notice-title">Tuition Due</span><span class="notice-body-with-title">Spring quarter tuition is due.</span>',
              },
            ]),
            contentType: 'application/json',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          result: {
            ok: true,
            status: 200,
            responseUrl: 'https://my.uw.edu/api/v1/visual_schedule/current',
            bodyText: JSON.stringify({
              periods: [
                {
                  id: 0,
                  start_date: '2026-03-30',
                  end_date: '2026-06-05',
                  sections: [
                    {
                      curriculum_abbr: 'CSE',
                      course_number: '312',
                      section_id: 'A',
                      course_title: 'FOUNDATIONS COMP II',
                      canvas_url: 'https://canvas.uw.edu/courses/1883261',
                      sln: 12583,
                      is_primary_section: true,
                      start_date: '2026-03-30',
                      end_date: '2026-06-05',
                      meetings: [
                        {
                          index: '1',
                          type: 'lecture',
                          meeting_days: {
                            monday: true,
                            tuesday: null,
                            wednesday: true,
                            thursday: null,
                            friday: true,
                            saturday: null,
                            sunday: null,
                          },
                          start_time: '09:30',
                          end_time: '10:20',
                        },
                      ],
                    },
                  ],
                },
              ],
              term: {
                first_day_quarter: '2026-03-30',
                last_day_instruction: '2026-06-05',
              },
            }),
            contentType: 'application/json',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          result: {
            ok: true,
            status: 200,
            responseUrl: 'https://my.uw.edu/api/v1/deptcal/',
            bodyText: JSON.stringify({
              events: [
                {
                  summary: 'Dissertation defense',
                  start: '2026-04-06T09:00:00-07:00',
                  end: '2026-04-06T10:00:00-07:00',
                  event_url: 'https://www.cs.washington.edu/news-events/research-colloquia/?event=1',
                },
              ],
            }),
            contentType: 'application/json',
          },
        },
      ]);

    const result = await SITE_SYNC_HANDLERS.myuw({
      activeTab: {
        tabId: 1,
        url: 'https://my.uw.edu/',
      },
      now: '2026-03-31T17:00:00-07:00',
      config: getDefaultExtensionConfig(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.courses).toBeUndefined();
      expect(result.snapshot.events?.some((item) => item.eventKind === 'class')).toBe(true);
      expect(result.health.reason).toBe('myuw_courses_collector_failed');
    }
  });
});
