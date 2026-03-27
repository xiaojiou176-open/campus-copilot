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
        '/internal/assignments': [
          {
            id: 9,
            course_id: 17,
            title: 'Problem Set 1',
            due_at: '2026-03-27T23:59:00-07:00',
            submission_status: 'submitted',
            url: 'https://www.gradescope.com/courses/17/assignments/9',
          },
        ],
        '/internal/grades': [
          {
            assignment_id: 9,
            course_id: 17,
            title: 'Problem Set 1',
            score: 92,
            max_score: 100,
            released_at: '2026-03-28T10:00:00-07:00',
            url: 'https://www.gradescope.com/courses/17/assignments/9/submissions/1',
          },
        ],
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
        '/courses/1211108':
          '<tr role="row"><th scope="row" class="table--primaryLink"><a href="/courses/1211108/assignments/7421057/submissions/380090124">Section Participation</a></th><td class="submissionStatus"><div class="submissionStatus--score">1.0 / 9.0</div></td><td><time datetime="2026-03-26 09:00:00 -0700">Mar 26 at 9:00AM</time></td></tr>',
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/account',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml:
        '<a class="courseBox" href="/courses/1211108"><h3 class="courseBox--shortname">CSE 312 - 26Wi</h3><div class="courseBox--name">Foundations of Computing II</div><div class="courseBox--assignments"><div class="left">62 assignments</div></div></a>',
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
        '/internal/assignments': [
          {
            id: 7421057,
            course_id: 1211108,
            title: 'Section Participation',
            due_at: '2026-03-26T09:00:00-07:00',
            submission_status: 'graded',
            score: 1,
            max_score: 9,
            url: 'https://www.gradescope.com/courses/1211108/assignments/7421057/submissions/380090124',
          },
        ],
        '/internal/grades': [
          {
            assignment_id: 7421057,
            course_id: 1211108,
            title: 'Section Participation',
            score: 1,
            max_score: 9,
            url: 'https://www.gradescope.com/courses/1211108/assignments/7421057/submissions/380090124',
          },
        ],
      }),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1211108',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml:
        '<div class="sidebar--title sidebar--title-course"><a href="/courses/1211108">CSE 312 - 26Wi</a><span class="sr-only"> Navigation</span></div><div class="sidebar--subtitle">Foundations of Computing II</div>',
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
      pageHtml: `
        <tr role="row">
          <th scope="row" class="table--primaryLink">
            <a href="/courses/1211108/assignments/7421057/submissions/380090124">Section Participation</a>
          </th>
          <td class="submissionStatus"><div class="submissionStatus--score">1.0 / 9.0</div></td>
          <td><time datetime="2026-03-26 09:00:00 -0700">Mar 26 at 9:00AM</time></td>
        </tr>
      `,
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
});
