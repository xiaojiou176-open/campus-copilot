import { readFileSync } from 'node:fs';
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

function readFixture(relativePath: string) {
  return readFileSync(new URL(`./__fixtures__/live/${relativePath}`, import.meta.url), 'utf8');
}

function readJsonFixture<T>(relativePath: string): T {
  return JSON.parse(readFixture(relativePath)) as T;
}

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
        '/api/courses/11/threads?limit=30&sort=new': readJsonFixture('/threads.json'),
        '/configured/unread-activity': readJsonFixture('/unread-activity.json'),
        '/configured/recent-activity': readJsonFixture('/recent-activity.json'),
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
      pageHtml: readFixture('dashboard.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.messages?.[0]?.title).toContain('CSE 312 - 26wi');
      expect(result.snapshot.messages?.[0]?.messageKind).toBe('update');
      expect(result.health.code).toBe('partial_success');
    }
  });

  it('replays the committed redacted live fixture set for regression coverage', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/courses/11/threads?limit=30&sort=new': readJsonFixture('/threads.json'),
        '/configured/unread-activity': readJsonFixture('/unread-activity.json'),
        '/configured/recent-activity': readJsonFixture('/recent-activity.json'),
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
      expect(result.snapshot.messages?.map((item) => item.id)).toEqual([
        'edstem:message:7',
        'edstem:message:8',
        'edstem:message:9',
      ]);
    }
  });

  it('replays a redacted live dashboard capture from profile 13 for DOM fallback coverage', async () => {
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
      now: '2026-03-29T03:01:07.800Z',
      pageHtml: readFixture('dashboard-profile13.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.messages?.map((item) => item.id)).toEqual([
        'edstem:message:dashboard-course:855',
        'edstem:message:dashboard-course:488',
      ]);
      expect(result.snapshot.messages?.map((item) => item.courseId)).toEqual([
        'edstem:course:855',
        'edstem:course:488',
      ]);
    }
  });

  it('replays a redacted live threads capture from profile 13 for private API coverage', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/courses/11/threads?limit=30&sort=new': readJsonFixture('/threads-profile13.json'),
        '/configured/unread-activity': [],
        '/configured/recent-activity': [],
      }),
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/855/discussion',
      site: 'edstem',
      now: '2026-03-29T03:01:07.800Z',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.messages?.map((item) => item.id)).toEqual([
        'edstem:message:7681100',
        'edstem:message:6946835',
      ]);
      expect(result.snapshot.messages?.every((item) => item.courseId === 'edstem:course:855')).toBe(true);
    }
  });
});
