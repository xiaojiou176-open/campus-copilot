import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GradescopeApiClient,
  createGradescopeAdapter,
  type GradescopePathConfig,
  type GradescopeRequestExecutor,
} from './index';

const paths: GradescopePathConfig = {
  assignmentsPath: '/internal/assignments',
  gradesPath: '/internal/grades',
};

function readFixture(relativePath: string) {
  return readFileSync(new URL(`./__fixtures__/live/${relativePath}`, import.meta.url), 'utf8');
}

function readJsonFixture<T>(relativePath: string): T {
  return JSON.parse(readFixture(relativePath)) as T;
}

const okExecutor =
  (payloads: Record<string, unknown>): GradescopeRequestExecutor =>
  async (path) => {
    const normalizedPath = path.startsWith('__html__:') ? path.replace(/^__html__:/, '') : path;
    const payload = payloads[path] ?? payloads[normalizedPath];
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
      responseUrl: `https://www.gradescope.com${normalizedPath}`,
      bodyText: typeof payload === 'string' ? payload : JSON.stringify(payload),
      contentType: typeof payload === 'string' ? 'text/html' : 'application/json',
    };
  };

describe('GradescopeApiClient', () => {
  it('maps 401/403 into unauthorized errors', async () => {
    const client = new GradescopeApiClient(
      async () => ({
        ok: true,
        status: 401,
        responseUrl: 'https://www.gradescope.com/internal/assignments',
        bodyText: '{"error":"unauthorized"}',
        contentType: 'application/json',
      }),
      paths,
    );

    await expect(client.getAssignments()).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('rejects malformed JSON payloads', async () => {
    const client = new GradescopeApiClient(
      async () => ({
        ok: true,
        status: 200,
        responseUrl: 'https://www.gradescope.com/internal/assignments',
        bodyText: '{"not":"an array"}',
        contentType: 'application/json',
      }),
      paths,
    );

    await expect(client.getAssignments()).rejects.toMatchObject({
      code: 'malformed_response',
    });
  });

  it('parses assignments and grades from private/internal payloads', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': readJsonFixture('/internal-assignments.json'),
        '/internal/grades': readJsonFixture('/internal-grades.json'),
      }),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/account',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments).toHaveLength(1);
      expect(result.snapshot.assignments?.[0]?.status).toBe('submitted');
      expect(result.snapshot.grades).toHaveLength(1);
      expect(result.snapshot.grades?.[0]?.assignmentId).toBe('gradescope:assignment:9');
    }
  });

  it('returns capabilities and health scoped to gradescope private-request phase support', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': [],
        '/internal/grades': [],
      }),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const capabilities = await adapter.getCapabilities({
      url: 'https://www.gradescope.com/account',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
    });
    const health = await adapter.healthCheck?.({
      url: 'https://www.gradescope.com/account',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(capabilities.resources.assignments?.preferredMode).toBe('private_api');
    expect(capabilities.resources.grades?.preferredMode).toBe('private_api');
    expect(capabilities.resources.courses?.supported).toBe(true);
    expect(health?.status).toBe('healthy');
  });

  it('treats empty assignments and grades as a valid empty snapshot', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': [],
        '/internal/grades': [],
      }),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/account',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments).toHaveLength(0);
      expect(result.snapshot.grades).toHaveLength(0);
    }
  });

  it('fetches course pages from DOM-discovered courses and upgrades the result to success', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
        '/courses/1211108': readFixture('course-page-row.html'),
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/account',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('dashboard-course-boxes.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses?.[0]?.title).toBe('Foundations of Computing II');
      expect(result.snapshot.assignments).toHaveLength(1);
      expect(result.snapshot.assignments?.[0]?.title).toBe('Section Participation');
      expect(result.snapshot.grades).toHaveLength(1);
      expect(result.snapshot.grades?.[0]?.score).toBe(1);
    }
  });

  it('derives the current course from the sidebar when live validation starts on a course dashboard page', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': readJsonFixture('/course-internal-assignments.json'),
        '/internal/grades': readJsonFixture('/course-internal-grades.json'),
      }),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1211108',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('course-sidebar.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses?.[0]?.title).toBe('Foundations of Computing II');
      expect(result.snapshot.courses?.[0]?.code).toBe('CSE 312 - 26Wi');
    }
  });

  it('falls back to DOM assignments and grades on a course page when private endpoints fail', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1211108',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('course-page-row.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.assignments?.[0]?.title).toBe('Section Participation');
      expect(result.snapshot.assignments?.[0]?.status).toBe('graded');
      expect(result.snapshot.grades?.[0]?.score).toBe(1);
      expect(result.snapshot.grades?.[0]?.maxScore).toBe(9);
    }
  });

  it('replays the committed redacted live fixture set for regression coverage', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': readJsonFixture('/course-internal-assignments.json'),
        '/internal/grades': readJsonFixture('/course-internal-grades.json'),
      }),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1211108',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: `${readFixture('course-sidebar.html')}\n${readFixture('course-page-row.html')}`,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.courses?.[0]?.id).toBe('gradescope:course:1211108');
      expect(result.snapshot.assignments?.[0]?.id).toBe('gradescope:assignment:7421057');
      expect(result.snapshot.grades?.[0]?.assignmentId).toBe('gradescope:assignment:7421057');
    }
  });
});
