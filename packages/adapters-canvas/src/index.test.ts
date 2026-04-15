import { describe, expect, it } from 'vitest';
import {
  CanvasApiClient,
  createCanvasAdapter,
  type CanvasRequestExecutor,
} from './index';

const CANVAS_COURSES_PATH = '/api/v1/courses?state[]=available&include[]=syllabus_body&per_page=100';
const canvasFilesPath = (courseId: string | number) => `/api/v1/courses/${courseId}/files?per_page=100`;
const canvasModulesPath = (courseId: string | number) =>
  '/api/v1/courses/' +
  `${courseId}/modules?include%5B%5D=items&include%5B%5D=content_details&per_page=100`;
const canvasGroupsPath = (courseId: string | number) => `/api/v1/courses/${courseId}/groups?per_page=100`;
const canvasMediaObjectsPath = (courseId: string | number) =>
  '/api/v1/courses/' +
  `${courseId}/media_objects?exclude%5B%5D=sources&exclude%5B%5D=tracks&per_page=100`;
const canvasSubmissionFeedbackPath = (courseId: string | number, assignmentIds: Array<string | number>) => {
  const params = new URLSearchParams();
  params.set('per_page', '100');
  params.append('include[]', 'submission_comments');
  params.append('include[]', 'submission_html_comments');
  params.append('include[]', 'rubric_assessment');
  for (const assignmentId of assignmentIds) {
    params.append('assignment_ids[]', String(assignmentId));
  }

  return `/api/v1/courses/${courseId}/students/submissions?${params.toString()}`;
};

const canvasDepthResourcePayloads = (
  courseId: string | number,
  overrides: Partial<Record<string, unknown>> = {},
) => ({
  [canvasFilesPath(courseId)]: [],
  [canvasModulesPath(courseId)]: [],
  [canvasGroupsPath(courseId)]: [],
  [canvasMediaObjectsPath(courseId)]: [],
  ...overrides,
});

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

  it('parses courses, assignments, announcements, messages, grades, and events from official API payloads', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
            workflow_state: 'available',
            syllabus_body: '<p>Review the course policies and weekly reading plan.</p>',
          },
        ],
        ...canvasDepthResourcePayloads(42, {
          [canvasFilesPath(42)]: [
            {
              id: 501,
              display_name: 'lecture-01.pdf',
              filename: 'lecture-01.pdf',
              html_url: 'https://canvas.example.edu/courses/42/files/501',
              url: 'https://canvas.example.edu/files/501/download',
              size: 204800,
              updated_at: '2026-03-24T09:00:00-07:00',
            },
          ],
          [canvasModulesPath(42)]: [
            {
              id: 7001,
              name: 'Week 1',
              published: true,
              items: [
                {
                  id: 8101,
                  type: 'Page',
                  title: 'Week 1 overview',
                  html_url: 'https://canvas.example.edu/courses/42/modules/items/8101',
                  page_url: 'week-1-overview',
                  published: true,
                },
                {
                  id: 8102,
                  type: 'ExternalUrl',
                  title: 'Panopto recording',
                  external_url: 'https://uw.hosted.panopto.com/Panopto/Pages/Viewer.aspx?id=abc',
                  published: true,
                },
                {
                  id: 8106,
                  type: 'File',
                  title: 'Week 1 worksheet',
                  html_url: 'https://canvas.example.edu/courses/42/files/777',
                  published: true,
                  content_details: {
                    url: 'https://canvas.example.edu/files/777/download',
                    file_name: 'week-1-worksheet.pdf',
                  },
                },
                {
                  id: 8107,
                  type: 'Assignment',
                  title: 'Checkpoint 1',
                  html_url: 'https://canvas.example.edu/courses/42/assignments/88',
                  published: true,
                },
                {
                  id: 8103,
                  type: 'Discussion',
                  title: 'Lab 1 discussion',
                  html_url: 'https://canvas.example.edu/courses/42/discussion_topics/55',
                  published: true,
                },
                {
                  id: 8104,
                  type: 'Quiz',
                  title: 'Week 1 readiness quiz',
                  html_url: 'https://canvas.example.edu/courses/42/quizzes/19',
                  published: true,
                },
                {
                  id: 8105,
                  type: 'SubHeader',
                  title: 'Prepare before section',
                  published: true,
                },
              ],
            },
          ],
          [canvasGroupsPath(42)]: [
            {
              id: 901,
              name: 'Project Team 7',
              description: '<p>Coordinate the API milestone here.</p>',
              members_count: 4,
              join_level: 'invitation_only',
              html_url: 'https://canvas.example.edu/groups/901',
            },
          ],
          [canvasMediaObjectsPath(42)]: [
            {
              media_id: 'media-42',
              user_entered_title: 'Lecture capture 3',
              media_type: 'video',
              html_url: 'https://canvas.example.edu/media_objects/media-42',
              updated_at: '2026-03-24T11:00:00-07:00',
            },
          ],
        }),
        [canvasSubmissionFeedbackPath(42, [8])]: [
          {
            assignment_id: 8,
            submission_comments: [{ comment: '<p>Great job.</p>' }],
          },
        ],
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [
          {
            id: 8,
            course_id: 42,
            name: 'Homework 1',
            html_url: 'https://canvas.example.edu/courses/42/assignments/8',
            due_at: '2026-03-25T23:59:00-07:00',
            points_possible: 100,
            submission: {
              workflow_state: 'submitted',
              submitted_at: '2026-03-24T00:05:00-07:00',
              score: 95,
              graded_at: '2026-03-24T12:00:00-07:00',
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
            message: '<p>Read the updated syllabus before lab.</p>',
          },
        ],
        '/api/v1/conversations?scope=inbox&per_page=100': [
          {
            id: 108,
            subject: 'Midterm logistics',
            last_message: 'Bring your Husky Card and one handwritten note sheet.',
            last_message_at: '2026-03-24T15:30:00-07:00',
            workflow_state: 'unread',
            context_code: 'course_42',
            html_url: 'https://canvas.example.edu/conversations/108',
          },
        ],
        '/api/v1/conversations/108': {
          id: 108,
          subject: 'Midterm logistics',
          last_message: 'Bring your Husky Card and one handwritten note sheet.',
          last_message_at: '2026-03-24T15:30:00-07:00',
          workflow_state: 'unread',
          context_code: 'course_42',
          html_url: 'https://canvas.example.edu/conversations/108',
          message_count: 2,
          messages: [
            {
              body: '<p>Initial question</p>',
              attachments: [],
            },
            {
              body: '<p>Please review the updated logistics note.</p>',
              attachments: [
                {
                  display_name: 'midterm-logistics.pdf',
                },
              ],
            },
          ],
        },
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42': [
          {
            id: 'assignment_8',
            title: 'Homework 1',
            html_url: 'https://canvas.example.edu/courses/42/assignments/8',
            start_at: '2026-03-25T23:59:00-07:00',
            end_at: '2026-03-25T23:59:00-07:00',
            context_code: 'course_42',
          },
          {
            id: 91,
            title: 'Midterm review',
            html_url: 'https://canvas.example.edu/calendar?event_id=91&include_contexts=course_42',
            start_at: '2026-03-24T19:00:00-07:00',
            end_at: '2026-03-24T20:00:00-07:00',
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
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses).toHaveLength(1);
      expect(result.snapshot.assignments?.[0]?.status).toBe('submitted');
      expect(result.snapshot.assignments?.[0]?.summary).toBe('Graded · 95 / 100');
      expect(result.snapshot.assignments?.[0]?.submittedAt).toBe('2026-03-24T00:05:00-07:00');
      expect(result.snapshot.assignments?.[0]?.score).toBe(95);
      expect(result.snapshot.assignments?.[0]?.maxScore).toBe(100);
      expect(result.snapshot.resources).toHaveLength(11);
      expect(result.snapshot.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'canvas:resource:42:syllabus',
            courseId: 'canvas:course:42',
            resourceKind: 'other',
            title: 'Syllabus summary',
            summary: 'Review the course policies and weekly reading plan.',
          }),
          expect.objectContaining({
            id: 'canvas:resource:501',
            courseId: 'canvas:course:42',
            resourceKind: 'file',
            title: 'lecture-01.pdf',
            fileExtension: '.pdf',
            sizeBytes: 204800,
            downloadUrl: 'https://canvas.example.edu/files/501/download',
          }),
          expect.objectContaining({
            id: 'canvas:resource:module-item:42:7001:8101',
            courseId: 'canvas:course:42',
            resourceKind: 'link',
            title: 'Week 1 overview',
            detail: 'Page · Week 1 · Page ref: week-1-overview',
            url: 'https://canvas.example.edu/courses/42/pages/week-1-overview',
            source: expect.objectContaining({
              resourceType: 'page_reference',
              url: 'https://canvas.example.edu/courses/42/pages/week-1-overview',
            }),
            summary: 'Week 1',
            resourceModule: {
              key: 'canvas:module:42:7001',
              label: 'Week 1',
              itemType: 'page',
            },
          }),
          expect.objectContaining({
            id: 'canvas:resource:module-item:42:7001:8102',
            courseId: 'canvas:course:42',
            resourceKind: 'embed',
            title: 'Panopto recording',
            detail: 'Recording · Week 1 · Source: Panopto',
            resourceModule: {
              key: 'canvas:module:42:7001',
              label: 'Week 1',
              itemType: 'recording',
            },
          }),
          expect.objectContaining({
            id: 'canvas:resource:module-item:42:7001:8106',
            courseId: 'canvas:course:42',
            resourceKind: 'link',
            title: 'Week 1 worksheet',
            detail: 'File · Week 1',
            fileExtension: '.pdf',
            resourceModule: {
              key: 'canvas:module:42:7001',
              label: 'Week 1',
              itemType: 'file',
            },
          }),
          expect.objectContaining({
            id: 'canvas:resource:module-item:42:7001:8107',
            courseId: 'canvas:course:42',
            resourceKind: 'link',
            title: 'Checkpoint 1',
            detail: 'Assignment · Week 1',
            resourceModule: {
              key: 'canvas:module:42:7001',
              label: 'Week 1',
              itemType: 'assignment',
            },
          }),
          expect.objectContaining({
            id: 'canvas:resource:module-item:42:7001:8103',
            courseId: 'canvas:course:42',
            resourceKind: 'link',
            title: 'Lab 1 discussion',
            detail: 'Discussion · Week 1',
            resourceModule: {
              key: 'canvas:module:42:7001',
              label: 'Week 1',
              itemType: 'discussion',
            },
          }),
          expect.objectContaining({
            id: 'canvas:resource:module-item:42:7001:8104',
            courseId: 'canvas:course:42',
            resourceKind: 'link',
            title: 'Week 1 readiness quiz',
            detail: 'Quiz · Week 1',
            resourceModule: {
              key: 'canvas:module:42:7001',
              label: 'Week 1',
              itemType: 'quiz',
            },
          }),
          expect.objectContaining({
            id: 'canvas:resource:module-item:42:7001:8105',
            courseId: 'canvas:course:42',
            resourceKind: 'other',
            title: 'Prepare before section',
            detail: 'SubHeader · Week 1',
            resourceModule: {
              key: 'canvas:module:42:7001',
              label: 'Week 1',
              itemType: 'subheader',
            },
          }),
          expect.objectContaining({
            id: 'canvas:resource:group:901',
            courseId: 'canvas:course:42',
            resourceKind: 'link',
            title: 'Project Team 7',
            summary: 'Coordinate the API milestone here.',
            detail: 'Canvas group · 4 members · Join: invitation only',
          }),
          expect.objectContaining({
            id: 'canvas:resource:media:media-42',
            courseId: 'canvas:course:42',
            resourceKind: 'embed',
            title: 'Lecture capture 3',
            detail: 'Canvas media · video · Source: Canvas media library · Updated: 2026-03-24T11:00:00-07:00',
          }),
        ]),
      );
      expect(result.snapshot.announcements?.[0]?.courseId).toBe('canvas:course:42');
      expect(result.snapshot.announcements?.[0]?.summary).toBe('Read the updated syllabus before lab.');
      expect(result.snapshot.messages?.[0]).toMatchObject({
        courseId: 'canvas:course:42',
        title: 'Midterm logistics',
        summary:
          'Started: Initial question · Latest: Please review the updated logistics note. · Attachment: midterm-logistics.pdf · 2-message thread',
        unread: true,
      });
      expect(result.snapshot.grades?.[0]).toMatchObject({
        assignmentId: 'canvas:assignment:8',
        score: 95,
        maxScore: 100,
      });
      expect(result.snapshot.events).toHaveLength(2);
      expect(result.snapshot.events?.[0]?.eventKind).toBe('deadline');
      expect(result.snapshot.events?.[0]?.relatedAssignmentId).toBe('canvas:assignment:8');
      expect(result.snapshot.events?.[1]?.eventKind).toBe('exam');
    }
  });

  it('includes late submission detail in the canonical assignment summary', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
        ],
        ...canvasDepthResourcePayloads(42),
        [canvasSubmissionFeedbackPath(42, [9])]: [],
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [
          {
            id: 9,
            course_id: 42,
            name: 'Homework 2',
            html_url: 'https://canvas.example.edu/courses/42/assignments/9',
            due_at: '2026-03-23T23:59:00-07:00',
            points_possible: 20,
            submission: {
              workflow_state: 'submitted',
              submitted_at: '2026-03-24T00:05:00-07:00',
              late: true,
            },
          },
        ],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [],
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42': [],
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
      expect(result.snapshot.assignments?.[0]).toMatchObject({
        summary: 'Submitted · Late · - / 20',
        submittedAt: '2026-03-24T00:05:00-07:00',
      });
    }
  });

  it('keeps assignment core fields when submission feedback enrichment fails', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
        ],
        ...canvasDepthResourcePayloads(42),
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [
          {
            id: 10,
            course_id: 42,
            name: 'Homework 3',
            html_url: 'https://canvas.example.edu/courses/42/assignments/10',
            due_at: '2026-03-26T23:59:00-07:00',
            points_possible: 25,
            submission: {
              workflow_state: 'submitted',
              submitted_at: '2026-03-24T08:15:00-07:00',
              score: 24,
            },
          },
        ],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [],
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42': [],
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
      expect(result.snapshot.assignments?.[0]).toMatchObject({
        title: 'Homework 3',
        status: 'submitted',
        summary: 'Submitted · 24 / 25',
        submittedAt: '2026-03-24T08:15:00-07:00',
        score: 24,
        maxScore: 25,
        detail: undefined,
      });
      expect(result.snapshot.grades?.[0]).toMatchObject({
        assignmentId: 'canvas:assignment:10',
        score: 24,
        maxScore: 25,
      });
      expect(result.attemptsByResource?.assignments).toHaveLength(2);
      expect(result.attemptsByResource?.assignments?.[0]).toMatchObject({
        collectorName: 'CanvasAssignmentsApiCollector',
        success: true,
      });
      expect(result.attemptsByResource?.assignments?.[1]).toMatchObject({
        collectorName: 'CanvasSubmissionFeedbackCollector',
        success: false,
      });
    }
  });

  it('uses the feedback attachment hint when submission comments have no body text', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
        ],
        ...canvasDepthResourcePayloads(42),
        [canvasSubmissionFeedbackPath(42, [10])]: [
          {
            assignment_id: 10,
            submission_comments: [
              {
                comment: '   ',
                attachments: [{ display_name: 'rubric-feedback.pdf' }],
              },
            ],
          },
        ],
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [
          {
            id: 10,
            course_id: 42,
            name: 'Homework 3',
            html_url: 'https://canvas.example.edu/courses/42/assignments/10',
            due_at: '2026-03-26T23:59:00-07:00',
            points_possible: 25,
            submission: {
              workflow_state: 'submitted',
              submitted_at: '2026-03-24T08:15:00-07:00',
              score: 24,
            },
          },
        ],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [],
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42': [],
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
      expect(result.snapshot.assignments?.[0]).toMatchObject({
        title: 'Homework 3',
        detail: 'Attachment: rubric-feedback.pdf',
      });
    }
  });

  it('includes feedback provenance when submission comments expose author and time', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
        ],
        ...canvasDepthResourcePayloads(42),
        [canvasSubmissionFeedbackPath(42, [10])]: [
          {
            assignment_id: 10,
            submission_comments: [
              {
                author_name: 'Course staff',
                created_at: '2026-03-24T12:45:00-07:00',
                comment: '<p>Great revision on the loop invariant write-up.</p>',
              },
            ],
          },
        ],
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [
          {
            id: 10,
            course_id: 42,
            name: 'Homework 3',
            html_url: 'https://canvas.example.edu/courses/42/assignments/10',
            due_at: '2026-03-26T23:59:00-07:00',
            points_possible: 25,
            submission: {
              workflow_state: 'submitted',
              submitted_at: '2026-03-24T08:15:00-07:00',
              score: 24,
            },
          },
        ],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [],
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42': [],
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
      expect(result.snapshot.assignments?.[0]).toMatchObject({
        title: 'Homework 3',
        detail:
          'Feedback (Course staff · 2026-03-24T12:45:00-07:00): Great revision on the loop invariant write-up.',
      });
    }
  });

  it('keeps module completion requirements in resource detail truth', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
        ],
        ...canvasDepthResourcePayloads(42, {
          [canvasModulesPath(42)]: [
            {
              id: 7001,
              name: 'Week 1',
              published: true,
              items: [
                {
                  id: 8101,
                  type: 'Page',
                  title: 'Week 1 overview',
                  html_url: 'https://canvas.example.edu/courses/42/modules/items/8101',
                  page_url: 'week-1-overview',
                  published: true,
                  completion_requirement: {
                    type: 'must_view',
                    completed: false,
                  },
                },
                {
                  id: 8107,
                  type: 'Assignment',
                  title: 'Checkpoint 1',
                  html_url: 'https://canvas.example.edu/courses/42/assignments/88',
                  published: true,
                  completion_requirement: {
                    type: 'min_score',
                    min_score: 8,
                    completed: true,
                  },
                },
              ],
            },
          ],
        }),
        [canvasSubmissionFeedbackPath(42, [])]: [],
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [],
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42': [],
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
        expect(result.snapshot.resources).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'canvas:resource:module-item:42:7001:8101',
              detail: 'Page · Week 1 · Page ref: week-1-overview · Requirement: view (pending)',
            }),
            expect.objectContaining({
              id: 'canvas:resource:module-item:42:7001:8107',
              detail: 'Assignment · Week 1 · Requirement: score at least 8 (met)',
            }),
          ]),
        );
      }
  });

  it('uses the detail attachment hint even when the latest message body is empty', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
        ],
        ...canvasDepthResourcePayloads(42),
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [
          {
            id: 208,
            subject: 'Lab handout',
            last_message: 'See latest attachment.',
            last_message_at: '2026-03-24T15:30:00-07:00',
            workflow_state: 'read',
            context_code: 'course_42',
            html_url: 'https://canvas.example.edu/conversations/208',
          },
        ],
        '/api/v1/conversations/208': {
          id: 208,
          subject: 'Lab handout',
          last_message: 'See latest attachment.',
          last_message_at: '2026-03-24T15:30:00-07:00',
          workflow_state: 'read',
          context_code: 'course_42',
          html_url: 'https://canvas.example.edu/conversations/208',
          messages: [
            {
              body: '   ',
              attachments: [{ display_name: 'lab-3.pdf' }],
            },
          ],
        },
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42': [],
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
      expect(result.snapshot.messages?.[0]).toMatchObject({
        title: 'Lab handout',
        summary: 'See latest attachment. · Attachment: lab-3.pdf',
        unread: false,
      });
    }
  });

  it('adds a thread-count hint when a conversation detail exposes multiple messages', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
        ],
        ...canvasDepthResourcePayloads(42),
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [
          {
            id: 408,
            subject: 'Project checkpoint',
            last_message: 'Can we move the milestone review?',
            last_message_at: '2026-03-24T15:30:00-07:00',
            workflow_state: 'read',
            context_code: 'course_42',
            html_url: 'https://canvas.example.edu/conversations/408',
          },
        ],
        '/api/v1/conversations/408': {
          id: 408,
          subject: 'Project checkpoint',
          last_message: 'Can we move the milestone review?',
          last_message_at: '2026-03-24T15:30:00-07:00',
          workflow_state: 'read',
          context_code: 'course_42',
          html_url: 'https://canvas.example.edu/conversations/408',
          message_count: 3,
          messages: [
            { body: '<p>Initial scheduling question.</p>', attachments: [] },
            { body: '<p>Follow-up from the TA.</p>', attachments: [] },
            { body: '<p>Can we move the milestone review?</p>', attachments: [] },
          ],
        },
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42': [],
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
      expect(result.snapshot.messages?.[0]).toMatchObject({
        title: 'Project checkpoint',
        summary:
          'Started: Initial scheduling question. · In between: Follow-up from the TA. · Latest: Can we move the milestone review? · 3-message thread',
        unread: false,
      });
    }
  });

  it('keeps intermediate thread progression truth when a conversation detail exposes multiple updates', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
        ],
        ...canvasDepthResourcePayloads(42),
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [
          {
            id: 410,
            subject: 'Capstone check-in',
            last_message: 'Can we lock the project scope today?',
            last_message_at: '2026-03-24T15:30:00-07:00',
            workflow_state: 'read',
            context_code: 'course_42',
            html_url: 'https://canvas.example.edu/conversations/410',
          },
        ],
        '/api/v1/conversations/410': {
          id: 410,
          subject: 'Capstone check-in',
          last_message: 'Can we lock the project scope today?',
          last_message_at: '2026-03-24T15:30:00-07:00',
          workflow_state: 'read',
          context_code: 'course_42',
          html_url: 'https://canvas.example.edu/conversations/410',
          message_count: 4,
          messages: [
            { body: '<p>Initial capstone scope question.</p>', attachments: [] },
            { body: '<p>TA follow-up with milestone concerns.</p>', attachments: [] },
            { body: '<p>Instructor asked for a tighter proposal.</p>', attachments: [] },
            { body: '<p>Can we lock the project scope today?</p>', attachments: [] },
          ],
        },
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42': [],
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
      expect(result.snapshot.messages?.[0]).toMatchObject({
        title: 'Capstone check-in',
        summary:
          'Started: Initial capstone scope question. · 2 updates in between · Latest: Can we lock the project scope today? · 4-message thread',
        unread: false,
      });
    }
  });

  it('keeps thread progression truth when the latest reply is attachment-only', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
        ],
        ...canvasDepthResourcePayloads(42),
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [
          {
            id: 409,
            subject: 'Lab handout follow-up',
            last_message: 'See latest attachment.',
            last_message_at: '2026-03-24T15:30:00-07:00',
            workflow_state: 'unread',
            context_code: 'course_42',
            html_url: 'https://canvas.example.edu/conversations/409',
          },
        ],
        '/api/v1/conversations/409': {
          id: 409,
          subject: 'Lab handout follow-up',
          last_message: 'See latest attachment.',
          last_message_at: '2026-03-24T15:30:00-07:00',
          workflow_state: 'unread',
          context_code: 'course_42',
          html_url: 'https://canvas.example.edu/conversations/409',
          message_count: 2,
          messages: [
            {
              body: '<p>Where can I find the updated lab handout?</p>',
              attachments: [],
            },
            {
              body: '   ',
              attachments: [{ display_name: 'lab-3.pdf' }],
            },
          ],
        },
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42': [],
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
      expect(result.snapshot.messages?.[0]).toMatchObject({
        title: 'Lab handout follow-up',
        summary:
          'Started: Where can I find the updated lab handout? · Latest: See latest attachment. · Attachment: lab-3.pdf · 2-message thread',
        unread: true,
      });
    }
  });

  it('falls back to the list preview when a conversation detail request fails', async () => {
    const client = new CanvasApiClient(async (path) => {
      if (path === '/api/v1/conversations/308') {
        return {
          ok: false,
          code: 'request_failed',
          message: 'detail failed',
          status: 500,
        };
      }

      return okExecutor({
        [CANVAS_COURSES_PATH]: [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
        ],
        ...canvasDepthResourcePayloads(42),
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [
          {
            id: 308,
            subject: 'Project reminder',
            last_message: 'Remember to submit milestone zero tonight.',
            last_message_at: '2026-03-24T15:30:00-07:00',
            workflow_state: 'unread',
            context_code: 'course_42',
            html_url: 'https://canvas.example.edu/conversations/308',
          },
        ],
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42': [],
      })(path);
    });

    const adapter = createCanvasAdapter(client);
    const result = await adapter.sync({
      url: 'https://canvas.example.edu/courses/42',
      site: 'canvas',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.messages?.[0]).toMatchObject({
        title: 'Project reminder',
        summary: 'Remember to submit milestone zero tonight.',
        unread: true,
      });
    }
  });

  it('returns adapter capabilities and health scoped to canvas phase-2 support', async () => {
    const client = new CanvasApiClient(okExecutor({ [CANVAS_COURSES_PATH]: [] }));
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

    expect(capabilities.resources.messages?.preferredMode).toBe('official_api');
    expect(capabilities.resources.assignments?.preferredMode).toBe('official_api');
    expect(capabilities.resources.grades?.preferredMode).toBe('official_api');
    expect(capabilities.resources.events?.preferredMode).toBe('official_api');
    expect(capabilities.resources.resources?.preferredMode).toBe('official_api');
    expect(health?.status).toBe('healthy');
  });

  it('treats an empty course list as a valid empty snapshot, not a sync failure', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [],
        ...canvasDepthResourcePayloads(42),
        '/api/v1/conversations?scope=inbox&per_page=100': [],
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
      expect(result.snapshot.courses).toHaveLength(0);
      expect(result.snapshot.resources).toHaveLength(0);
      expect(result.snapshot.assignments).toHaveLength(0);
      expect(result.snapshot.announcements).toHaveLength(0);
      expect(result.snapshot.messages).toHaveLength(0);
      expect(result.snapshot.grades).toHaveLength(0);
      expect(result.snapshot.events).toHaveLength(0);
    }
  });

  it('falls back to a synthetic course title when canvas omits name', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [
          {
            id: 1830320,
            workflow_state: 'available',
          },
        ],
        ...canvasDepthResourcePayloads(1830320),
        '/api/v1/courses/1830320/assignments?include[]=submission&order_by=due_at&per_page=100': [],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_1830320': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [],
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_1830320': [],
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
        [CANVAS_COURSES_PATH]: [
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
        ...canvasDepthResourcePayloads(42),
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [],
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42': [],
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
      expect(result.snapshot.messages).toHaveLength(0);
      expect(result.snapshot.events).toHaveLength(0);
    }
  });

  it('returns partial_success when assignments fail but courses still sync', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [
          {
            id: 42,
            name: 'CSE 142',
            course_code: 'CSE 142',
            html_url: 'https://canvas.example.edu/courses/42',
          },
        ],
        ...canvasDepthResourcePayloads(42),
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [],
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42': [],
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
      expect(result.snapshot.grades).toBeUndefined();
      expect(result.snapshot.announcements).toHaveLength(0);
      expect(result.snapshot.messages).toHaveLength(0);
      expect(result.snapshot.events).toHaveLength(0);
      expect(result.health.code).toBe('partial_success');
    }
    expect(result.attemptsByResource?.assignments?.[0]?.success).toBe(false);
  });

  it('preserves successful assignments without stuffing the payload into the error string when one course fails', async () => {
    const client = new CanvasApiClient(
      okExecutor({
        [CANVAS_COURSES_PATH]: [
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
        ...canvasDepthResourcePayloads(42),
        ...canvasDepthResourcePayloads(84),
        '/api/v1/courses/42/assignments?include[]=submission&order_by=due_at&per_page=100': [
          {
            id: 8,
            course_id: 42,
            name: 'Homework 1',
            html_url: 'https://canvas.example.edu/courses/42/assignments/8',
            due_at: '2026-03-25T23:59:00-07:00',
            points_possible: 10,
            submission: {
              workflow_state: 'graded',
              score: 9,
              graded_at: '2026-03-24T12:00:00-07:00',
            },
          },
        ],
        '/api/v1/announcements?per_page=100&context_codes%5B%5D=course_42&context_codes%5B%5D=course_84': [],
        '/api/v1/conversations?scope=inbox&per_page=100': [],
        '/api/v1/calendar_events?all_events=true&per_page=100&context_codes%5B%5D=course_42&context_codes%5B%5D=course_84': [],
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
      expect(result.snapshot.grades?.[0]?.score).toBe(9);
    }
    expect(result.attemptsByResource?.assignments?.[0]?.errorReason).not.toContain('PARTIAL_ASSIGNMENTS');
    expect(result.attemptsByResource?.assignments?.[0]?.errorReason).toContain('course_84');
  });
});
