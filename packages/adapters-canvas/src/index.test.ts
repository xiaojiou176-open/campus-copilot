import { describe, expect, it } from 'vitest';
import {
  CanvasApiClient,
  createCanvasAdapter,
  type CanvasRequestExecutor,
} from './index';

const okExecutor =
  (payloads: Record<string, unknown>): CanvasRequestExecutor =>
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
      responseUrl: `https://canvas.example.edu${path}`,
      bodyText: JSON.stringify(payload),
      contentType: 'application/json',
    };
  };

describe('CanvasApiClient', () => {
  it('maps 401/403 into unauthorized errors', async () => {
    const client = new CanvasApiClient(async () => ({
      ok: true,
      status: 401,
      responseUrl: 'https://canvas.example.edu/api/v1/courses',
      bodyText: '{"errors":[{"message":"unauthorized"}]}',
      contentType: 'application/json',
    }));

    await expect(client.getCourses()).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('rejects malformed JSON payloads', async () => {
    const client = new CanvasApiClient(async () => ({
      ok: true,
      status: 200,
      responseUrl: 'https://canvas.example.edu/api/v1/courses',
      bodyText: '{"not":"an array"}',
      contentType: 'application/json',
    }));

    await expect(client.getCourses()).rejects.toMatchObject({
      code: 'malformed_response',
    });
  });

  it('parses courses, assignments, and announcements from official API payloads', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        '/api/v1/courses?state[]=available&per_page=100': [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
            workflow_state: 'available',
          },
        ],
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [
          {
            id: 8,
            course_id: 42,
            name: 'Homework 1',
            html_url: 'https://canvas.example.edu/courses/42/assignments/8',
            due_at: '2026-03-25T23:59:00-07:00',
            submission: {
              workflow_state: 'submitted',
            },
            extra_field: 'allowed',
          },
        ],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [
          {
            id: 77,
            title: 'Welcome',
            html_url: 'https://canvas.example.edu/courses/42/discussion_topics/77',
            posted_at: '2026-03-24T10:00:00-07:00',
            context_code: 'course_42',
          },
        ],
      }),
    );

    const adapter = createCanvasAdapter(client);
    const result = await adapter.sync({
      url: 'https://canvas.example.edu/courses/42',
      site: 'canvas',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.courses).toHaveLength(1);
      expect(result.snapshot.assignments?.[0]?.status).toBe('submitted');
      expect(result.snapshot.announcements?.[0]?.courseId).toBe('canvas:course:42');
    }
  });

  it('returns adapter capabilities and health scoped to canvas phase-2 support', async () => {
    const client = new CanvasApiClient(okExecutor({ '/api/v1/courses?state[]=available&per_page=100': [] }));
    const adapter = createCanvasAdapter(client);
    const capabilities = await adapter.getCapabilities({
      url: 'https://canvas.example.edu',
      site: 'canvas',
      now: '2026-03-24T18:00:00-07:00',
    });
    const health = await adapter.healthCheck?.({
      url: 'https://canvas.example.edu',
      site: 'canvas',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(capabilities.resources.assignments?.preferredMode).toBe('official_api');
    expect(health?.status).toBe('healthy');
  });

  it('treats an empty course list as a valid empty snapshot, not a sync failure', async () => {
    const client = new CanvasApiClient(okExecutor({ '/api/v1/courses?state[]=available&per_page=100': [] }));
    const adapter = createCanvasAdapter(client);
    const result = await adapter.sync({
      url: 'https://canvas.example.edu',
      site: 'canvas',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.courses).toHaveLength(0);
      expect(result.snapshot.assignments).toHaveLength(0);
      expect(result.snapshot.announcements).toHaveLength(0);
    }
  });

  it('falls back to a synthetic course title when canvas omits name', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        '/api/v1/courses?state[]=available&per_page=100': [
          {
            id: 1830320,
            workflow_state: 'available',
          },
        ],
        '/api/v1/courses/1830320/assignments?include[]=submission&order_by=due_at&per_page=100': [],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_1830320': [],
      }),
    );

    const adapter = createCanvasAdapter(client);
    const result = await adapter.sync({
      url: 'https://canvas.example.edu',
      site: 'canvas',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.courses[0]?.title).toBe('Canvas course 1830320');
    }
  });

  it('filters access-restricted placeholder courses out of the current sync set', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        '/api/v1/courses?state[]=available&per_page=100': [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
          {
            id: 1830320,
            access_restricted_by_date: true,
          },
        ],
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
      }),
    );

    const adapter = createCanvasAdapter(client);
    const result = await adapter.sync({
      url: 'https://canvas.example.edu',
      site: 'canvas',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses).toHaveLength(1);
      expect(result.snapshot.courses[0]?.source.resourceId).toBe('42');
      expect(result.snapshot.assignments).toHaveLength(0);
      expect(result.snapshot.announcements).toHaveLength(0);
    }
  });

  it('returns partial_success when assignments fail but courses still sync', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        '/api/v1/courses?state[]=available&per_page=100': [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
        ],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
      }),
    );

    const adapter = createCanvasAdapter(client);
    const result = await adapter.sync({
      url: 'https://canvas.example.edu/courses/42',
      site: 'canvas',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.courses).toHaveLength(1);
      expect(result.snapshot.assignments).toBeUndefined();
      expect(result.snapshot.announcements).toHaveLength(0);
      expect(result.health.code).toBe('partial_success');
    }
    expect(result.attemptsByResource?.assignments?.[0]?.success).toBe(false);
  });

  it('preserves successful assignments without stuffing the payload into the error string when one course fails', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        '/api/v1/courses?state[]=available&per_page=100': [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
          {
            id: 84,
            name: 'Restricted course',
            course_code: 'RESTRICTED 101',
            html_url: 'https://canvas.example.edu/courses/84',
          },
        ],
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [
          {
            id: 8,
            course_id: 42,
            name: 'Homework 1',
            html_url: 'https://canvas.example.edu/courses/42/assignments/8',
            due_at: '2026-03-25T23:59:00-07:00',
            submission: {
              workflow_state: 'submitted',
            },
          },
        ],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42&context_codes%5B%5D=course_84': [],
      }),
    );

    const adapter = createCanvasAdapter(client);
    const result = await adapter.sync({
      url: 'https://canvas.example.edu/courses/42',
      site: 'canvas',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.assignments).toHaveLength(1);
      expect(result.snapshot.assignments?.[0]?.title).toBe('Homework 1');
    }
    expect(result.attemptsByResource?.assignments?.[0]?.errorReason).not.toContain('PARTIAL_ASSIGNMENTS');
    expect(result.attemptsByResource?.assignments?.[0]?.errorReason).toContain('course_84');
  });
});
