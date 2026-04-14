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

function buildSubmissionViewerFixtureHtml(relativePath: string) {
  return `<div data-react-class="AssignmentSubmissionViewer" data-react-props="${JSON.stringify(
    readJsonFixture(relativePath),
  ).replace(/"/g, '&quot;')}"></div>`;
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
      expect(result.snapshot.assignments?.[0]?.status).toBe('graded');
      expect(result.snapshot.assignments?.[0]?.summary).toContain('Graded');
      expect(result.snapshot.assignments?.[0]?.score).toBe(92);
      expect(result.snapshot.assignments?.[0]?.maxScore).toBe(100);
      expect(result.snapshot.grades).toHaveLength(1);
      expect(result.snapshot.grades?.[0]?.assignmentId).toBe('gradescope:assignment:9');
    }
  });

  it('derives courses from private assignments and grades when no course collector succeeds', async () => {
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
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses).toEqual([
        expect.objectContaining({
          id: 'gradescope:course:17',
          title: 'Gradescope course 17',
        }),
      ]);
    }
  });

  it('prefers private assignment course names when deriving courses without a dedicated courses collector', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': [
          {
            id: 9,
            course_id: 17,
            course_name: 'Introduction to Algorithms',
            title: 'Problem Set 1',
            due_at: '2026-03-27T23:59:00-07:00',
            submission_status: 'submitted',
            url: 'https://www.gradescope.com/courses/17/assignments/9',
          },
        ],
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
      expect(result.snapshot.courses).toEqual([
        expect.objectContaining({
          id: 'gradescope:course:17',
          title: 'Introduction to Algorithms',
        }),
      ]);
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
      expect(result.snapshot.assignments?.[0]?.summary).toContain('Graded');
      expect(result.snapshot.grades).toHaveLength(1);
      expect(result.snapshot.grades?.[0]?.score).toBe(1);
    }
  });

  it('surfaces late submission detail from private assignments in the canonical summary', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': [
          {
            id: 9,
            course_id: 17,
            course_name: 'Introduction to Algorithms',
            title: 'Problem Set 1',
            due_at: '2026-03-27T23:59:00-07:00',
            submission_status: 'submitted',
            late: true,
            score: null,
            max_score: 20,
            url: 'https://www.gradescope.com/courses/17/assignments/9',
          },
        ],
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
      expect(result.snapshot.assignments?.[0]?.summary).toBe(
        'Introduction to Algorithms · Submitted late',
      );
    }
  });

  it('builds a graded summary from DOM fallback rows', async () => {
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
      expect(result.snapshot.assignments?.[0]?.summary).toBe('Graded 1 / 9');
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
      expect(result.outcome).toBe('success');
      expect(result.snapshot.assignments?.[0]?.title).toBe('Section Participation');
      expect(result.snapshot.assignments?.[0]?.status).toBe('graded');
      expect(result.snapshot.grades?.[0]?.score).toBe(1);
      expect(result.snapshot.grades?.[0]?.maxScore).toBe(9);
      expect(result.snapshot.grades?.[0]?.title).toBe('Section Participation');
      expect(result.snapshot.grades?.[0]?.url).toBe(
        'https://www.gradescope.com/courses/1211108/assignments/7421057/submissions/380090124',
      );
    }
  });

  it('enriches graded course-page assignments with question detail from the submission DOM carrier', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
        '/courses/1211108/assignments/7421057/submissions/380090124': readFixture('submission-question-detail.html'),
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
      expect(result.snapshot.assignments?.[0]?.summary).toContain('Graded 1 / 9 · Q1 redacted-text 1 / 9 (redacted-text)');
      expect(result.snapshot.assignments?.[0]?.detail).toBe('Q1 redacted-text · 1 / 9 · redacted-text');
      expect(result.snapshot.assignments?.[0]?.score).toBe(1);
      expect(result.snapshot.assignments?.[0]?.maxScore).toBe(9);
    }
  });

  it('enriches graded course-page assignments with rubric labels from a state-backed submission fixture', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
        '/courses/1144890/assignments/6836461/submissions/351643803': readFixture('submission-question-detail-multi.html'),
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1144890',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: `
        <table>
          <tr>
            <td>
              <a href="/courses/1144890/assignments/6836461/submissions/351643803">redacted-text</a>
            </td>
            <td class="submissionStatus">5 / 5</td>
          </tr>
        </table>
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments?.[0]?.summary).toBe(
        'Graded 5 / 5 · Q1 1 / 1 (Correct); Q2 1 / 1 (Correct); Q3 1 / 1 (Correct); +2 more',
      );
      expect(result.snapshot.assignments?.[0]?.detail).toBe(
        'Q1 · 1 / 1 · Correct; Q2 · 1 / 1 · Correct; Q3 · 1 / 1 · Correct; Q4 · 1 / 1 · Correct; Q5 · 1 / 1 · Correct',
      );
      expect(result.snapshot.assignments?.[0]?.score).toBe(5);
      expect(result.snapshot.assignments?.[0]?.maxScore).toBe(5);
    }
  });

  it('accepts course-page assignment links that point to /submissions/new', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1285555',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: `
        <table>
          <tr>
            <td>
              <a href="/courses/1285555/assignments/7880245/submissions/new">PSet 1, problem 1</a>
            </td>
            <td class="submissionStatus">No submission</td>
          </tr>
        </table>
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments).toHaveLength(1);
      expect(result.snapshot.assignments?.[0]?.id).toBe('gradescope:assignment:7880245');
      expect(result.snapshot.assignments?.[0]?.courseId).toBe('gradescope:course:1285555');
    }
  });

  it('promotes /submissions/new composer pages into assignment detail instead of treating them as link-only rows', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
        '/courses/1285555/assignments/7880245/submissions/new': readFixture('submission-composer.html'),
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1285555',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: `
        <table>
          <tr>
            <td>
              <a href="/courses/1285555/assignments/7880245/submissions/new">PSet 1, problem 1</a>
            </td>
            <td class="submissionStatus">No submission</td>
          </tr>
        </table>
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments?.[0]).toMatchObject({
        id: 'gradescope:assignment:7880245',
        courseId: 'gradescope:course:1285555',
        status: 'todo',
        maxScore: 12,
      });
      expect(result.snapshot.assignments?.[0]?.summary).toContain('No submission');
      expect(result.snapshot.assignments?.[0]?.summary).toContain('Q1 redacted-text');
      expect(result.snapshot.assignments?.[0]?.detail).toContain('Q2 redacted-text');
    }
  });

  it('fetches plain assignment links and promotes composer detail even when the row has no submission id yet', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
        '/courses/1285555/assignments/7880245': readFixture('submission-composer.html'),
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1285555',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: `
        <table>
          <tr>
            <td>
              <a href="/courses/1285555/assignments/7880245">PSet 1, problem 1</a>
            </td>
            <td class="submissionStatus">No submission</td>
          </tr>
        </table>
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments?.[0]).toMatchObject({
        id: 'gradescope:assignment:7880245',
        courseId: 'gradescope:course:1285555',
        status: 'todo',
        maxScore: 12,
      });
      expect(result.snapshot.assignments?.[0]?.summary).toContain('No submission');
      expect(result.snapshot.assignments?.[0]?.summary).toContain('Q1 redacted-text 4 pts');
      expect(result.snapshot.assignments?.[0]?.detail).toContain('Q2 redacted-text · 8 pts');
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
      expect(result.snapshot.grades?.[0]?.title).toBe('Section Participation');
    }
  });

  it('commits a redacted graded submission DOM proof fixture for question-detail source-path evidence', () => {
    const html = readFixture('submission-question-detail.html');

    expect(html).toContain('AssignmentSubmissionViewer');
    expect(html).toContain('questionHeading--title');
    expect(html).toContain('questionHeading--points');
    expect(html).toContain('submissionOutlineHeader--totalPoints');
    expect(html).toContain('submissionOutlineQuestion');
    expect(html).toContain('submissionOutlineQuestion--score');
  });

  it('commits a redacted rich graded submission DOM fixture for grouped question-detail proof', () => {
    const html = readFixture('submission-question-detail-rich.html');

    expect(html).toContain('submissionOutlineHeader--assignmentTitle');
    expect(html).toContain('submissionOutlineHeader--totalPoints');
    expect(html).toContain('submissionOutlineQuestion--title');
    expect(html).toContain('submissionOutlineQuestion--score');
    expect(html).toContain('Question 4');
  });

  it('commits a redacted state-backed graded submission fixture for rubric-summary proof', () => {
    const html = readFixture('submission-question-detail-multi.html');

    expect(html).toContain('AssignmentSubmissionViewer');
    expect(html).toContain('Question_1-rubric');
    expect(html).toContain('Question_2-rubric');
    expect(html).toContain('Question_3-rubric');
  });

  it('commits a redacted evaluated submission fixture for deeper grading-comment proof', () => {
    const html = readFixture('submission-question-detail-evaluations.html');

    expect(html).toContain('AssignmentSubmissionViewer');
    expect(html).toContain('Solid explanation here.');
    expect(html).toContain('Correct explanation');
  });

  it('commits a redacted state-backed submission fixture for inline-annotation proof', () => {
    const props = readJsonFixture<Record<string, unknown>>('submission-question-detail-annotations.json');
    const serialized = JSON.stringify(props);

    expect(serialized).toContain('"annotations"');
    expect(serialized).toContain('"geometry_type":"text"');
    expect(serialized).toContain('"page_number":3');
    expect(serialized).toContain('"redacted-annotation-link"');
  });

  it('parses a direct graded submission page into assignment and grade rows on the current contract', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1211108/assignments/7421057/submissions/380090124',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('submission-question-detail.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses?.[0]).toMatchObject({
        id: 'gradescope:course:1211108',
        title: 'redacted-text',
      });
      expect(result.snapshot.assignments?.[0]).toMatchObject({
        id: 'gradescope:assignment:7421057',
        score: 1,
        maxScore: 9,
      });
      expect(result.snapshot.assignments?.[0]?.summary).toContain('Graded 1 / 9 · Q1 redacted-text 1 / 9 (redacted-text)');
      expect(result.snapshot.assignments?.[0]?.detail).toBe('Q1 redacted-text · 1 / 9 · redacted-text');
      expect(result.snapshot.grades?.[0]).toMatchObject({
        id: 'gradescope:grade:380090124',
        assignmentId: 'gradescope:assignment:7421057',
        score: 1,
        maxScore: 9,
      });
    }
  });

  it('parses a direct state-backed multi-question submission page into rubric-summary assignment detail', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1144890/assignments/6836461/submissions/351643803',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('submission-question-detail-multi.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses?.[0]).toMatchObject({
        id: 'gradescope:course:1144890',
        title: 'redacted-text',
      });
      expect(result.snapshot.assignments?.[0]?.summary).toBe(
        'Graded 5 / 5 · Q1 1 / 1 (Correct); Q2 1 / 1 (Correct); Q3 1 / 1 (Correct); +2 more',
      );
      expect(result.snapshot.assignments?.[0]?.detail).toBe(
        'Q1 · 1 / 1 · Correct; Q2 · 1 / 1 · Correct; Q3 · 1 / 1 · Correct; Q4 · 1 / 1 · Correct; Q5 · 1 / 1 · Correct',
      );
      expect(result.snapshot.assignments?.[0]?.reviewSummary).toEqual({
        questions: [
          {
            label: 'Q1',
            modality: 'manual',
            score: 1,
            maxScore: 1,
            rubricLabels: ['Correct'],
            annotationPages: [],
          },
          {
            label: 'Q2',
            modality: 'manual',
            score: 1,
            maxScore: 1,
            rubricLabels: ['Correct'],
            annotationPages: [],
          },
          {
            label: 'Q3',
            modality: 'manual',
            score: 1,
            maxScore: 1,
            rubricLabels: ['Correct'],
            annotationPages: [],
          },
          {
            label: 'Q4',
            modality: 'manual',
            score: 1,
            maxScore: 1,
            rubricLabels: ['Correct'],
            annotationPages: [],
          },
          {
            label: 'Q5',
            modality: 'manual',
            score: 1,
            maxScore: 1,
            rubricLabels: ['Correct'],
            annotationPages: [],
          },
        ],
      });
      expect(result.snapshot.grades?.[0]).toMatchObject({
        id: 'gradescope:grade:351643803',
        assignmentId: 'gradescope:assignment:6836461',
        score: 5,
        maxScore: 5,
      });
    }
  });

  it('parses evaluation comments into assignment detail for a direct submission page', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1064763/assignments/6758162/submissions/356585054',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('submission-question-detail-evaluations.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments?.[0]?.summary).toContain('Autograder result 18 / 18 (Autograder passed)');
      expect(result.snapshot.assignments?.[0]?.summary).toContain('[1 comment]');
      expect(result.snapshot.assignments?.[0]?.detail).toContain('Q2.1 Difference between addresses · 3 / 3');
      expect(result.snapshot.assignments?.[0]?.detail).toContain('Correct type casting');
      expect(result.snapshot.assignments?.[0]?.detail).toContain('Correct explanation');
      expect(result.snapshot.assignments?.[0]?.detail).toContain('Correct steps');
      expect(result.snapshot.assignments?.[0]?.detail).toContain('Comment: Solid explanation here. Like how you equated the ptrdiff_t to the size in bytes.');
    }
  });

  it('parses inline annotation detail from a state-backed submission fixture', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1144890/assignments/7244652/submissions/375869113',
      site: 'gradescope',
      now: '2026-04-05T17:24:00-07:00',
      pageHtml: buildSubmissionViewerFixtureHtml('submission-question-detail-annotations.json'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments?.[0]?.summary).toBe(
        'Graded 7.5 / 15 · Q2.1 redacted-question-title 3 / 9 [3 annotations]; Q3.2 redacted-question-title 1.5 / 3 [1 annotation]; Q3.3 redacted-question-title 3 / 3 [1 annotation]',
      );
      expect(result.snapshot.assignments?.[0]?.detail).toBe(
        'Q2.1 redacted-question-title · 3 / 9 · Annotations: redacted-annotation-1 | redacted-annotation-2 | +1 more (page 3); Q3.2 redacted-question-title · 1.5 / 3 · Annotations: redacted-annotation-link (page 5); Q3.3 redacted-question-title · 3 / 3 · Annotations: redacted-annotation-5 (page 5)',
      );
      expect(result.snapshot.assignments?.[0]?.reviewSummary).toEqual({
        questions: [
          {
            label: 'Q2.1 redacted-question-title',
            modality: 'manual',
            score: 3,
            maxScore: 9,
            rubricLabels: [],
            annotationCount: 3,
            annotationPages: [3],
          },
          {
            label: 'Q3.2 redacted-question-title',
            modality: 'manual',
            score: 1.5,
            maxScore: 3,
            rubricLabels: [],
            annotationCount: 1,
            annotationPages: [5],
          },
          {
            label: 'Q3.3 redacted-question-title',
            modality: 'manual',
            score: 3,
            maxScore: 3,
            rubricLabels: [],
            annotationCount: 1,
            annotationPages: [5],
          },
        ],
      });
      expect(result.snapshot.grades?.[0]).toMatchObject({
        id: 'gradescope:grade:375869113',
        assignmentId: 'gradescope:assignment:7244652',
        score: 7.5,
        maxScore: 15,
      });
    }
  });

  it('enriches course-page assignment rows with evaluation comments from a fetched submission fixture', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
        '/courses/1064763/assignments/6758162/submissions/356585054': readFixture('submission-question-detail-evaluations.html'),
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1064763',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: `
        <table>
          <tr>
            <td>
              <a href="/courses/1064763/assignments/6758162/submissions/356585054">redacted-text</a>
            </td>
            <td class="submissionStatus">24 / 24</td>
          </tr>
        </table>
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments?.[0]?.summary).toContain('Autograder result 18 / 18 (Autograder passed)');
      expect(result.snapshot.assignments?.[0]?.summary).toContain('[1 comment]');
      expect(result.snapshot.assignments?.[0]?.summary).toContain('Graded 24 / 24');
      expect(result.snapshot.assignments?.[0]?.detail).toContain('Comment: Solid explanation here. Like how you equated the ptrdiff_t to the size in bytes.');
    }
  });

  it('enriches course-page assignment rows with inline annotation detail from a fetched submission fixture', async () => {
    const annotationFixtureHtml = buildSubmissionViewerFixtureHtml('submission-question-detail-annotations.json');
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
        '/courses/1144890/assignments/7244652/submissions/375869113': annotationFixtureHtml,
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1144890',
      site: 'gradescope',
      now: '2026-04-05T17:24:00-07:00',
      pageHtml: `
        <table>
          <tr>
            <td>
              <a href="/courses/1144890/assignments/7244652/submissions/375869113">redacted-text</a>
            </td>
            <td class="submissionStatus">7.5 / 15</td>
          </tr>
        </table>
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments?.[0]?.summary).toContain('[3 annotations]');
      expect(result.snapshot.assignments?.[0]?.detail).toContain('Annotations: redacted-annotation-1 | redacted-annotation-2 | +1 more (page 3)');
      expect(result.snapshot.assignments?.[0]?.detail).toContain('Annotations: redacted-annotation-link (page 5)');
    }
  });

  it('parses grouped multi-question submission detail into a truncated assignment summary and canonical grade', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1144890/assignments/7224262/submissions/376035162',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('submission-question-detail-rich.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments?.[0]?.summary).toBe(
        'Graded 5 / 5 · Q1 redacted-text 3.5 / 3.5; Q2 redacted-text 0.5 / 0.5; Q3 redacted-text 1 / 1; +1 more',
      );
      expect(result.snapshot.assignments?.[0]?.detail).toBe(
        'Q1 redacted-text · 3.5 / 3.5; Q2 redacted-text · 0.5 / 0.5; Q3 redacted-text · 1 / 1; Q4 redacted-text · 0 / 0',
      );
      expect(result.snapshot.grades?.[0]).toMatchObject({
        id: 'gradescope:grade:376035162',
        assignmentId: 'gradescope:assignment:7224262',
        score: 5,
        maxScore: 5,
      });
    }
  });

  it('enriches a graded course-page row with grouped multi-question submission detail', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
        '/courses/1144890/assignments/7224262/submissions/376035162': readFixture('submission-question-detail-rich.html'),
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1144890',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: `
        <table>
          <tr>
            <td>
              <a href="/courses/1144890/assignments/7224262/submissions/376035162">redacted-text</a>
            </td>
            <td class="submissionStatus">5 / 5</td>
          </tr>
        </table>
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments?.[0]?.summary).toBe(
        'Graded 5 / 5 · Q1 redacted-text 3.5 / 3.5; Q2 redacted-text 0.5 / 0.5; Q3 redacted-text 1 / 1; +1 more',
      );
      expect(result.snapshot.assignments?.[0]?.detail).toBe(
        'Q1 redacted-text · 3.5 / 3.5; Q2 redacted-text · 0.5 / 0.5; Q3 redacted-text · 1 / 1; Q4 redacted-text · 0 / 0',
      );
    }
  });

  it('merges grouped submission detail into private assignment and grade collectors when the live page is already on a submission', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': [
          {
            id: 7224262,
            course_id: 1144890,
            course_name: 'Foundations of Computing I',
            title: 'Concept Check 30: Halting Problem',
            submission_status: 'graded',
            score: 5,
            max_score: 5,
            url: 'https://www.gradescope.com/courses/1144890/assignments/7224262',
          },
        ],
        '/internal/grades': [
          {
            id: 376035162,
            assignment_id: 7224262,
            course_id: 1144890,
            title: 'Concept Check 30: Halting Problem',
            score: 5,
            max_score: 5,
            url: 'https://www.gradescope.com/courses/1144890/assignments/7224262',
          },
        ],
      }),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1144890/assignments/7224262/submissions/376035162',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('submission-question-detail-rich.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.assignments?.[0]?.summary).toBe(
        'Foundations of Computing I · Graded 5 / 5 · Q1 redacted-text 3.5 / 3.5; Q2 redacted-text 0.5 / 0.5; Q3 redacted-text 1 / 1; +1 more',
      );
      expect(result.snapshot.assignments?.[0]?.detail).toBe(
        'Q1 redacted-text · 3.5 / 3.5; Q2 redacted-text · 0.5 / 0.5; Q3 redacted-text · 1 / 1; Q4 redacted-text · 0 / 0',
      );
      expect(result.snapshot.grades?.[0]?.url).toBe(
        'https://www.gradescope.com/courses/1144890/assignments/7224262/submissions/376035162',
      );
    }
  });

  it('surfaces graded-copy, history, and regrade availability from a graded submission page', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1144890/assignments/7224260/submissions/374320968',
      site: 'gradescope',
      now: '2026-04-13T08:00:00-07:00',
      pageHtml: readFixture('submission-question-detail-rich.html').replace(
        '</section>',
        '<ul><li><a href="/courses/1144890/assignments/7224260/submissions/374320968.pdf">Download Graded Copy</a></li><li><button type="button">Submission History</button></li><li><button type="button" aria-label=" Request Regrade. Please select a question.">Request Regrade</button></li></ul></section>',
      ),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments?.[0]?.detail).toContain('Actions: Download graded copy | Submission history | Request regrade (Please select a question.)');
      expect(result.snapshot.assignments?.[0]?.actionHints).toEqual([
        'Download graded copy',
        'Submission history',
        'Request regrade (Please select a question.)',
      ]);
    }
  });

  it('parses rubric labels from a state-backed multi-question submission fixture', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1144890/assignments/6836461/submissions/351643803',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('submission-question-detail-multi.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses?.[0]).toMatchObject({
        id: 'gradescope:course:1144890',
        title: 'redacted-text',
      });
      expect(result.snapshot.assignments?.[0]).toMatchObject({
        id: 'gradescope:assignment:6836461',
        score: 5,
        maxScore: 5,
      });
      expect(result.snapshot.assignments?.[0]?.summary).toBe(
        'Graded 5 / 5 · Q1 1 / 1 (Correct); Q2 1 / 1 (Correct); Q3 1 / 1 (Correct); +2 more',
      );
      expect(result.snapshot.grades?.[0]?.id).toBe('gradescope:grade:351643803');
    }
  });

  it('enriches a graded course-page row with rubric labels from a fetched state-backed submission fixture', async () => {
    const client = new GradescopeApiClient(
      okExecutor({
        '/internal/assignments': undefined,
        '/internal/grades': undefined,
        '/courses/1144890/assignments/6836461/submissions/351643803': readFixture('submission-question-detail-multi.html'),
      } as unknown as Record<string, unknown>),
      paths,
    );

    const adapter = createGradescopeAdapter(client);
    const result = await adapter.sync({
      url: 'https://www.gradescope.com/courses/1144890',
      site: 'gradescope',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: `
        <table>
          <tr>
            <td>
              <a href="/courses/1144890/assignments/6836461/submissions/351643803">redacted-text</a>
            </td>
            <td class="submissionStatus">5 / 5</td>
          </tr>
        </table>
      `,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.assignments?.[0]?.summary).toBe(
        'Graded 5 / 5 · Q1 1 / 1 (Correct); Q2 1 / 1 (Correct); Q3 1 / 1 (Correct); +2 more',
      );
    }
  });
});
