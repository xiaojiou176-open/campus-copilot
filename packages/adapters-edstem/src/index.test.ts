import { describe, expect, it } from 'vitest';
import {
  EdStemApiClient,
  createEdStemAdapter,
  type EdStemPathConfig,
  type EdStemRequestExecutor,
} from './index';

const paths: EdStemPathConfig = {
  threadsPath: '/api/courses/11/threads?limit=30&sort=new',
  unreadPath: '/configured/unread-activity',
  recentActivityPath: '/configured/recent-activity',
};

const okExecutor =
  (payloads: Record<string, unknown>): EdStemRequestExecutor =>
  async (path) => {
    const payload = payloads[path];
    if (payload === undefined) {
      return {
        ok: false,
        code: 'request_failed',
        message: `No mock payload for ${path}`,
        status: 500,
      };
    }

    return {
        ok: true,
        status: 200,
        responseUrl: `https://us.edstem.org${path}`,
        bodyText: JSON.stringify(payload),
        contentType: 'application/json',
      };
  };

describe('EdStemApiClient', () => {
  it('maps 401/403 into unauthorized errors', async () => {
    const client = new EdStemApiClient(
      async () => ({
        ok: true,
        status: 401,
        responseUrl: 'https://us.edstem.org/api/courses/11/threads?limit=30&sort=new',
        bodyText: '{"error":"unauthorized"}',
        contentType: 'application/json',
      }),
      paths,
    );

    await expect(client.getThreads()).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('rejects malformed JSON payloads', async () => {
    const client = new EdStemApiClient(
      async () => ({
        ok: true,
        status: 200,
        responseUrl: 'https://us.edstem.org/api/courses/11/threads?limit=30&sort=new',
        bodyText: '{"not":"an array"}',
        contentType: 'application/json',
      }),
      paths,
    );

    await expect(client.getThreads()).rejects.toMatchObject({
      code: 'malformed_response',
    });
  });

  it('parses threads, unread, and recent activity into unified messages', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/courses/11/threads?limit=30&sort=new': {
          threads: [
            {
              id: 7,
              course_id: 11,
              title: 'Project kickoff',
              created_at: '2026-03-24T09:00:00-07:00',
              unread: false,
              instructor_authored: true,
              url: 'https://edstem.org/us/courses/11/discussion/7',
            },
          ],
        },
        '/configured/unread-activity': [
          {
            id: 8,
            thread_id: 7,
            course_id: 11,
            title: 'Unread follow-up',
            updated_at: '2026-03-24T10:00:00-07:00',
            unread: true,
            url: 'https://edstem.org/us/courses/11/discussion/7',
          },
        ],
        '/configured/recent-activity': [
          {
            id: 9,
            thread_id: 7,
            course_id: 11,
            title: 'Recent staff reply',
            updated_at: '2026-03-24T11:00:00-07:00',
            instructor_authored: true,
            url: 'https://edstem.org/us/courses/11/discussion/7',
          },
        ],
      }),
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/11/discussion/7',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.messages).toHaveLength(3);
      expect(result.snapshot.messages?.[0]?.site).toBe('edstem');
      expect(result.snapshot.messages?.some((item) => item.unread)).toBe(true);
      expect(result.snapshot.messages?.some((item) => item.instructorAuthored)).toBe(true);
    }
  });

  it('returns capabilities and health scoped to edstem private-request phase support', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/courses/11/threads?limit=30&sort=new': [],
        '/configured/unread-activity': [],
        '/configured/recent-activity': [],
      }),
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const capabilities = await adapter.getCapabilities({
      url: 'https://edstem.org/us/courses/11',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
    });
    const health = await adapter.healthCheck?.({
      url: 'https://edstem.org/us/courses/11',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(capabilities.dom).toBe(true);
    expect(capabilities.resources.messages?.modes).toEqual(['private_api', 'dom']);
    expect(capabilities.resources.messages?.preferredMode).toBe('private_api');
    expect(health?.status).toBe('healthy');
  });

  it('treats empty thread/activity payloads as a valid empty snapshot', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/courses/11/threads?limit=30&sort=new': [],
        '/configured/unread-activity': [],
        '/configured/recent-activity': [],
      }),
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/11',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.messages).toHaveLength(0);
    }
  });

  it('falls back to dashboard DOM and returns partial_success when private endpoints are unavailable', async () => {
    const client = new EdStemApiClient(
      async () => ({
        ok: false,
        code: 'unsupported_context',
        message: 'EdStem session-backed request path is unavailable.',
        status: 404,
      }),
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/dashboard',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml:
        '<a href="/us/courses/90031" class="dash-course"><div class="dash-course-header"><div class="dash-course-code">CSE 312 - 26wi</div><div class="dash-course-unread-count">99+</div></div><div><div class="dash-course-name">Foundations Of Computing II</div></div></a>',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.messages?.[0]?.title).toContain('CSE 312 - 26wi');
      expect(result.snapshot.messages?.[0]?.unread).toBe(true);
      expect(result.health.code).toBe('partial_success');
    }
  });
});
