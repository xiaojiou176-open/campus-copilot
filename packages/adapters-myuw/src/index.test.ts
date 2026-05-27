import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MyUWApiClient, createMyUWAdapter } from './index';

function readFixture(relativePath: string) {
  return readFileSync(new URL(`./__fixtures__/live/${relativePath}`, import.meta.url), 'utf8');
}

function readJsonFixture<T>(relativePath: string): T {
  return JSON.parse(readFixture(relativePath)) as T;
}

const scheduleApiPayload = {
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
};

const noticesApiPayload = [
  {
    id: 105,
    notice_content:
      '<span class="notice-title">redacted-notice-title</span><span class="notice-body-with-title">redacted-notice-summary</span>',
    attributes: [
      {
        name: 'DisplayBegin',
        value: '2026-03-31T07:00:00+00:00',
      },
    ],
  },
];

const deptCalApiPayload = {
  events: [
    {
      summary: 'redacted-event-title',
      start: '2026-04-06T09:00:00-07:00',
      end: '2026-04-06T10:00:00-07:00',
      event_url: 'https://www.cs.washington.edu/news-events/research-colloquia/?event=1',
    },
  ],
};

const visualScheduleApiPayload = {
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
};

describe('MyUWAdapter', () => {
  it('prefers session-backed api payloads for notices, class/exam schedule events, and dept calendar events when available', async () => {
    const adapter = createMyUWAdapter(
      new MyUWApiClient(async (path) => {
        if (path === '/api/v1/notices/') {
          return {
            ok: true,
            status: 200,
            responseUrl: 'https://my.uw.edu/api/v1/notices/',
            bodyText: JSON.stringify(noticesApiPayload),
            contentType: 'application/json',
          };
        }

        return {
          ok: true,
          status: 200,
          responseUrl: `https://my.uw.edu${path}`,
          bodyText:
            path === '/api/v1/deptcal/'
              ? JSON.stringify(deptCalApiPayload)
              : path === '/api/v1/visual_schedule/current'
                ? JSON.stringify(visualScheduleApiPayload)
                : JSON.stringify(scheduleApiPayload),
          contentType: 'application/json',
        };
      }),
    );

    const result = await adapter.sync({
      url: 'https://my.uw.edu/',
      site: 'myuw',
      now: '2026-03-31T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses?.[0]?.title).toBe('CSE 312 A: FOUNDATIONS COMP II');
      expect(result.snapshot.announcements?.[0]?.title).toBe('redacted-notice-title');
      expect(result.snapshot.announcements?.[0]?.summary).toBe('redacted-notice-summary');
      expect(result.snapshot.events?.some((item) => item.title === 'CSE 312 A lecture')).toBe(true);
      expect(result.snapshot.events?.some((item) => item.title === 'CSE 312 A final exam')).toBe(true);
      expect(result.snapshot.events?.some((item) => item.title === 'redacted-event-title')).toBe(true);
      expect(result.snapshot.events?.find((item) => item.title === 'CSE 312 A lecture')?.location).toContain('Kane Hall');
      expect(result.snapshot.events?.find((item) => item.title === 'CSE 312 A lecture')?.summary).toBe(
        'CSE 312 A lecture for FOUNDATIONS COMP II at Kane Hall · KNE · 110.',
      );
      expect(result.snapshot.events?.find((item) => item.title === 'CSE 312 A lecture')?.courseId).toBe(
        'myuw:course:12583',
      );
      expect(result.snapshot.events?.find((item) => item.title === 'CSE 312 A lecture')?.detail).toBe(
        'lecture · Kane Hall · KNE · 110',
      );
      expect(result.snapshot.events?.find((item) => item.title === 'CSE 312 A lecture')?.startAt).toBe(
        '2026-04-01T09:30:00-07:00',
      );
      expect(result.snapshot.events?.find((item) => item.title === 'CSE 312 A final exam')?.eventKind).toBe('exam');
      expect(result.snapshot.events?.find((item) => item.title === 'CSE 312 A final exam')?.location).toContain('Kane Hall');
      expect(result.snapshot.events?.find((item) => item.title === 'CSE 312 A final exam')?.summary).toBe(
        'CSE 312 A final exam for FOUNDATIONS COMP II at Kane Hall · KNE · 110 · 110.',
      );
      expect(result.snapshot.events?.find((item) => item.title === 'CSE 312 A final exam')?.courseId).toBe(
        'myuw:course:12583',
      );
      expect(result.snapshot.events?.find((item) => item.title === 'CSE 312 A final exam')?.detail).toBe(
        'final exam · Kane Hall · KNE · 110 · 110',
      );
      expect(result.attemptsByResource?.courses?.[0]?.mode).toBe('private_api');
      expect(result.attemptsByResource?.announcements?.[0]?.mode).toBe('private_api');
      expect(result.attemptsByResource?.events?.[0]?.mode).toBe('private_api');
    }
  });

  it('returns partial_success when courses fail but notices and events still sync', async () => {
    const adapter = createMyUWAdapter(
      new MyUWApiClient(async (path) => {
        if (path === '/api/v1/schedule/current') {
          return {
            ok: true,
            status: 503,
            responseUrl: 'https://my.uw.edu/api/v1/schedule/current',
            bodyText: '{"error":"temporarily unavailable"}',
            contentType: 'application/json',
          };
        }

        if (path === '/api/v1/notices/') {
          return {
            ok: true,
            status: 200,
            responseUrl: 'https://my.uw.edu/api/v1/notices/',
            bodyText: JSON.stringify(noticesApiPayload),
            contentType: 'application/json',
          };
        }

        return {
          ok: true,
          status: 200,
          responseUrl: `https://my.uw.edu${path}`,
          bodyText:
            path === '/api/v1/deptcal/'
              ? JSON.stringify(deptCalApiPayload)
              : JSON.stringify(visualScheduleApiPayload),
          contentType: 'application/json',
        };
      }),
    );

    const result = await adapter.sync({
      url: 'https://my.uw.edu/',
      site: 'myuw',
      now: '2026-03-31T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.courses).toBeUndefined();
      expect(result.snapshot.announcements?.[0]?.title).toBe('redacted-notice-title');
      expect(result.snapshot.events?.some((item) => item.eventKind === 'class')).toBe(true);
      expect(result.health.code).toBe('partial_success');
      expect(result.health.reason).toBe('myuw_courses_collector_failed');
    }
  });

  it('maps unauthorized api responses to not_logged_in', async () => {
    const adapter = createMyUWAdapter(
      new MyUWApiClient(async (path) => ({
        ok: true,
        status: 401,
        responseUrl: `https://my.uw.edu${path}`,
        bodyText: '{"error":"unauthorized"}',
        contentType: 'application/json',
      })),
    );

    const result = await adapter.sync({
      url: 'https://my.uw.edu/',
      site: 'myuw',
      now: '2026-03-31T18:00:00-07:00',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.outcome).toBe('not_logged_in');
      expect(result.health.code).toBe('logged_out');
      expect(result.errorReason).toBe('MyUW session is unauthorized.');
    }
  });

  it('parses notices and events from page state first', async () => {
    const adapter = createMyUWAdapter();
    const result = await adapter.sync({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
      pageState: readJsonFixture('/page-state.json'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.announcements).toHaveLength(1);
      expect(result.snapshot.events).toHaveLength(1);
      expect(result.snapshot.announcements?.[0]?.kind).toBe('announcement');
      expect(result.snapshot.events?.[0]?.kind).toBe('event');
    }
  });

  it('falls back to DOM script payloads when page state is missing', async () => {
    const adapter = createMyUWAdapter();
    const result = await adapter.sync({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('script-payload.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.announcements?.[0]?.title).toBe('redacted-notice-title');
      expect(result.snapshot.events?.[0]?.eventKind).toBe('deadline');
      expect(result.attemptsByResource?.announcements?.[0]?.mode).toBe('state');
      expect(result.attemptsByResource?.announcements?.[0]?.skipped).toBe(true);
      expect(result.attemptsByResource?.announcements?.[1]?.mode).toBe('dom');
      expect(result.attemptsByResource?.announcements?.[1]?.success).toBe(true);
    }
  });

  it('parses visible notices and events from the current MyUW DOM when script payloads are absent', async () => {
    const adapter = createMyUWAdapter();
    const result = await adapter.sync({
      url: 'https://my.uw.edu/',
      site: 'myuw',
      now: '2026-03-26T18:00:00-07:00',
      pageHtml: readFixture('visible-dom.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.announcements?.[0]?.title).toBe('redacted-notice-title');
      expect(result.snapshot.announcements?.[0]?.summary).toBe('redacted-notice-summary');
      expect(result.snapshot.events?.[0]).toEqual(
        expect.objectContaining({
          title: 'redacted-event-title',
          eventKind: 'other',
        }),
      );
    }
  });

  it('parses academic calendar DOM entries into read-only timeline events', async () => {
    const adapter = createMyUWAdapter();

    const result = await adapter.sync({
      url: 'https://my.uw.edu/academic_calendar/',
      site: 'myuw',
      now: '2026-04-11T12:00:00-07:00',
      pageHtml: `
        <main>
          <h2 class="h4 mb-3 text-dark-beige myuw-font-encode-sans">Spring 2026</h2>
          <ul class="list-unstyled mb-0 myuw-text-md">
            <li class="mb-2">
              <div class="fw-bold">May 25</div>
              <a href="http://www.washington.edu/calendar/academic/?trumbaEmbed=view%3Devent%26eventid%3D177468211">
                Memorial Day
              </a>
            </li>
            <li class="mb-2">
              <div class="fw-bold">Jun 6 - 12</div>
              <a href="http://www.washington.edu/calendar/academic/?trumbaEmbed=view%3Devent%26eventid%3D177511985">
                Final Examinations - Spring 2026
              </a>
            </li>
          </ul>
        </main>
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.events?.map((item) => item.title)).toEqual([
        'Memorial Day',
        'Final Examinations - Spring 2026',
      ]);
      expect(result.snapshot.events?.[0]?.summary).toBe('Spring 2026 academic calendar');
      expect(result.snapshot.events?.[0]?.startAt).toBe('2026-05-25T00:00:00-07:00');
      expect(result.snapshot.events?.[0]?.endAt).toBe('2026-05-25T23:59:59-07:00');
      expect(result.snapshot.events?.[1]?.startAt).toBe('2026-06-06T00:00:00-07:00');
      expect(result.snapshot.events?.[1]?.endAt).toBe('2026-06-12T23:59:59-07:00');
      expect(
        result.attemptsByResource?.events?.some(
          (attempt) => attempt.mode === 'dom' && attempt.collectorName === 'MyUWEventsDomCollector' && attempt.success,
        ),
      ).toBe(true);
    }
  });

  it('returns unsupported_context when neither state nor DOM is available', async () => {
    const adapter = createMyUWAdapter();
    const result = await adapter.sync({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.outcome).toBe('unsupported_context');
    }
  });

  it('maps malformed DOM payloads to normalize_failed', async () => {
    const adapter = createMyUWAdapter();
    const result = await adapter.sync({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('malformed-script-payload.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.announcements).toBeUndefined();
      expect(result.snapshot.events).toHaveLength(0);
      expect(result.health.code).toBe('partial_success');
    }
  });

  it('reports capabilities and health for state/dom-first support', async () => {
    const adapter = createMyUWAdapter();
    const capabilities = await adapter.getCapabilities({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
      pageState: {},
    });
    const health = await adapter.healthCheck?.({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
      pageState: {},
    });

    expect(capabilities.resources.announcements?.preferredMode).toBe('state');
    expect(capabilities.resources.events?.preferredMode).toBe('state');
    expect(health?.status).toBe('healthy');
  });

  it('reports capabilities and health for api/state/dom support when a client is present', async () => {
    const adapter = createMyUWAdapter(
      new MyUWApiClient(async () => ({
        ok: true,
        status: 200,
        responseUrl: 'https://my.uw.edu/api/v1/notices/',
        bodyText: '[]',
        contentType: 'application/json',
      })),
    );
    const capabilities = await adapter.getCapabilities({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
    });
    const health = await adapter.healthCheck?.({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(capabilities.resources.courses?.preferredMode).toBe('private_api');
    expect(capabilities.resources.announcements?.preferredMode).toBe('private_api');
    expect(capabilities.resources.events?.preferredMode).toBe('private_api');
    expect(health?.reason).toBe('myuw_api_state_dom_phase');
  });

  it('replays the committed redacted live fixture set for regression coverage', async () => {
    const adapter = createMyUWAdapter();
    const result = await adapter.sync({
      url: 'https://my.uw.edu/',
      site: 'myuw',
      now: '2026-03-26T18:00:00-07:00',
      pageState: readJsonFixture('/page-state.json'),
      pageHtml: readFixture('visible-dom.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.announcements?.map((item) => item.id)).toContain('myuw:notice:notice-1');
      expect(result.snapshot.events?.some((item) => item.id === 'myuw:event:event-1')).toBe(true);
    }
  });
});
