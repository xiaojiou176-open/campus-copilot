import {
  type AdapterCapabilities,
  type AdapterContext,
  type AttemptsByResource,
  type ResourceCollector,
  type SiteAdapter,
  type SiteSyncFailure,
  type SiteSyncOutcome,
  type SiteSyncSuccess,
  type SiteSnapshot,
  runCollectorPipeline,
} from '@campus-copilot/adapters-base';
import {
  AssignmentSchema,
  CourseSchema,
  GradeSchema,
  HealthStatusSchema,
  type Assignment,
  type AssignmentStatus,
  type Course,
  type Grade,
  type HealthStatus,
} from '@campus-copilot/schema';
import { z } from 'zod';

type GradescopeRequestPath = string;

type GradescopeApiFailureCode =
  | 'unauthorized'
  | 'request_failed'
  | 'malformed_response'
  | 'unsupported_context';

export class GradescopeApiError extends Error {
  constructor(
    public readonly code: GradescopeApiFailureCode,
    message: string,
    public readonly details?: { status?: number },
  ) {
    super(message);
    this.name = 'GradescopeApiError';
  }
}

type GradescopeRequestResult =
  | {
      ok: true;
      status: number;
      responseUrl: string;
      bodyText: string;
      contentType?: string;
    }
  | {
      ok: false;
      code: GradescopeApiFailureCode;
      message: string;
      status?: number;
    };

export type GradescopeRequestExecutor = (path: GradescopeRequestPath) => Promise<GradescopeRequestResult>;

export interface GradescopePathConfig {
  assignmentsPath: string;
  gradesPath: string;
  coursesPath?: string;
}

const GradescopeRawCourseSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    name: z.string().min(1),
    short_name: z.string().optional(),
    url: z.url().optional(),
  })
  .passthrough();

const NumericLikeSchema = z.union([z.number(), z.string()]).nullable().optional();

const GradescopeRawAssignmentSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    course_id: z.union([z.number(), z.string()]).optional(),
    course_name: z.string().optional(),
    title: z.string().min(1),
    due_at: z.string().nullable().optional(),
    submission_status: z.string().optional(),
    missing: z.boolean().optional(),
    late: z.boolean().optional(),
    score: NumericLikeSchema,
    max_score: NumericLikeSchema,
    url: z.url().optional(),
  })
  .passthrough();

const GradescopeRawGradeSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    assignment_id: z.union([z.number(), z.string()]),
    course_id: z.union([z.number(), z.string()]).optional(),
    title: z.string().min(1).optional(),
    score: NumericLikeSchema,
    max_score: NumericLikeSchema,
    graded_at: z.string().nullable().optional(),
    released_at: z.string().nullable().optional(),
    url: z.url().optional(),
  })
  .passthrough();

type GradescopeRawCourse = z.infer<typeof GradescopeRawCourseSchema>;
type GradescopeRawAssignment = z.infer<typeof GradescopeRawAssignmentSchema>;
type GradescopeRawGrade = z.infer<typeof GradescopeRawGradeSchema>;

function decodeHtmlText(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(value: string | undefined) {
  return decodeHtmlText(value?.replace(/<[^>]+>/g, ' '));
}

function normalizeLooseDateTime(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(' ', 'T').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2');
  return z.string().datetime().safeParse(normalized).success ? normalized : undefined;
}

function parseGradescopeCourseLinks(pageHtml: string | undefined) {
  if (!pageHtml) {
    return [];
  }

  return Array.from(
    pageHtml.matchAll(
      /<a[^>]+href="\/courses\/(?<id>\d+)"[^>]*>[\s\S]*?<h3[^>]*class="courseBox--shortname"[^>]*>(?<short>[\s\S]*?)<\/h3>[\s\S]*?<div[^>]*class="courseBox--name"[^>]*>(?<name>[\s\S]*?)<\/div>/g,
    ),
  )
    .map((match) => {
      const id = match.groups?.id;
      const name = decodeHtmlText(match.groups?.name);
      if (!id || !name) {
        return undefined;
      }

      return {
        id,
        shortName: decodeHtmlText(match.groups?.short),
        name,
        url: `/courses/${id}`,
      };
    })
    .filter((course): course is { id: string; shortName: string | undefined; name: string; url: string } => Boolean(course));
}

function parseGradescopeCurrentCourse(pageHtml: string | undefined, pageUrl: string) {
  if (!pageHtml) {
    return undefined;
  }

  const courseId = pageUrl.match(/\/courses\/(?<courseId>\d+)/)?.groups?.courseId;
  const sidebarMatch = pageHtml.match(
    /<div[^>]*class="sidebar--title[^"]*sidebar--title-course[^"]*"[^>]*>[\s\S]*?<a[^>]+href="\/courses\/(?<id>\d+)"[^>]*>(?<short>[\s\S]*?)<\/a>[\s\S]*?<\/div>\s*<div[^>]*class="sidebar--subtitle"[^>]*>(?<name>[\s\S]*?)<\/div>/,
  );

  const id = sidebarMatch?.groups?.id ?? courseId;
  const name = decodeHtmlText(sidebarMatch?.groups?.name);
  if (!id || !name) {
    return undefined;
  }

  return normalizeCourse({
    id,
    name,
    short_name: decodeHtmlText(sidebarMatch?.groups?.short),
    url: `https://www.gradescope.com/courses/${id}`,
  });
}

function toOptionalNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function normalizeCourse(rawCourse: GradescopeRawCourse): Course {
  return CourseSchema.parse({
    id: `gradescope:course:${rawCourse.id}`,
    kind: 'course',
    site: 'gradescope',
    source: {
      site: 'gradescope',
      resourceId: String(rawCourse.id),
      resourceType: 'course',
      url: rawCourse.url,
    },
    url: rawCourse.url,
    title: rawCourse.name,
    code: rawCourse.short_name,
  });
}

function deriveAssignmentStatus(rawAssignment: GradescopeRawAssignment, now: string): AssignmentStatus {
  if (rawAssignment.missing) {
    return 'missing';
  }

  if (toOptionalNumber(rawAssignment.score) !== undefined || rawAssignment.submission_status === 'graded') {
    return 'graded';
  }

  if (rawAssignment.submission_status === 'submitted' || rawAssignment.submission_status === 'turned_in') {
    return 'submitted';
  }

  if (rawAssignment.due_at && new Date(rawAssignment.due_at).getTime() < new Date(now).getTime()) {
    return 'overdue';
  }

  return 'todo';
}

function normalizeAssignment(rawAssignment: GradescopeRawAssignment, now: string): Assignment {
  return AssignmentSchema.parse({
    id: `gradescope:assignment:${rawAssignment.id}`,
    kind: 'assignment',
    site: 'gradescope',
    source: {
      site: 'gradescope',
      resourceId: String(rawAssignment.id),
      resourceType: 'assignment',
      url: rawAssignment.url,
    },
    url: rawAssignment.url,
    courseId: rawAssignment.course_id ? `gradescope:course:${rawAssignment.course_id}` : undefined,
    title: rawAssignment.title,
    dueAt: rawAssignment.due_at ?? undefined,
    status: deriveAssignmentStatus(rawAssignment, now),
  });
}

function normalizeGrade(rawGrade: GradescopeRawGrade): Grade {
  const gradeId = rawGrade.id ? String(rawGrade.id) : String(rawGrade.assignment_id);
  return GradeSchema.parse({
    id: `gradescope:grade:${gradeId}`,
    kind: 'grade',
    site: 'gradescope',
    source: {
      site: 'gradescope',
      resourceId: gradeId,
      resourceType: 'grade',
      url: rawGrade.url,
    },
    url: rawGrade.url,
    courseId: rawGrade.course_id ? `gradescope:course:${rawGrade.course_id}` : undefined,
    assignmentId: `gradescope:assignment:${rawGrade.assignment_id}`,
    title: rawGrade.title ?? `Grade ${gradeId}`,
    score: toOptionalNumber(rawGrade.score),
    maxScore: toOptionalNumber(rawGrade.max_score),
    gradedAt: rawGrade.graded_at ?? undefined,
    releasedAt: rawGrade.released_at ?? undefined,
  });
}

export class GradescopeApiClient {
  constructor(
    private readonly executeRequest: GradescopeRequestExecutor,
    private readonly paths: GradescopePathConfig,
  ) {}

  private async fetchJson(path: GradescopeRequestPath): Promise<unknown> {
    const result = await this.executeRequest(path);
    if (!result.ok) {
      throw new GradescopeApiError(result.code, result.message, { status: result.status });
    }

    if (result.status === 401 || result.status === 403) {
      throw new GradescopeApiError('unauthorized', 'Gradescope session is unauthorized.', { status: result.status });
    }

    if (result.status === 404) {
      throw new GradescopeApiError('unsupported_context', 'Gradescope internal request path is unavailable.', {
        status: result.status,
      });
    }

    if (result.status < 200 || result.status >= 300) {
      throw new GradescopeApiError('request_failed', `Gradescope request failed with status ${result.status}.`, {
        status: result.status,
      });
    }

    try {
      return JSON.parse(result.bodyText);
    } catch {
      throw new GradescopeApiError('malformed_response', 'Gradescope returned malformed JSON.', {
        status: result.status,
      });
    }
  }

  async fetchHtml(path: GradescopeRequestPath): Promise<string> {
    const result = await this.executeRequest(`__html__:${path}`);
    if (!result.ok) {
      throw new GradescopeApiError(result.code, result.message, { status: result.status });
    }

    if (result.status === 401 || result.status === 403) {
      throw new GradescopeApiError('unauthorized', 'Gradescope session is unauthorized.', { status: result.status });
    }

    if (result.status === 404) {
      throw new GradescopeApiError('unsupported_context', 'Gradescope course page is unavailable.', {
        status: result.status,
      });
    }

    if (result.status < 200 || result.status >= 300) {
      throw new GradescopeApiError('request_failed', `Gradescope request failed with status ${result.status}.`, {
        status: result.status,
      });
    }

    return result.bodyText;
  }

  async getAssignments(): Promise<GradescopeRawAssignment[]> {
    try {
      return z.array(GradescopeRawAssignmentSchema).parse(await this.fetchJson(this.paths.assignmentsPath));
    } catch (error) {
      if (error instanceof GradescopeApiError) {
        throw error;
      }

      throw new GradescopeApiError('malformed_response', 'Gradescope assignments payload is malformed.');
    }
  }

  async getGrades(): Promise<GradescopeRawGrade[]> {
    try {
      return z.array(GradescopeRawGradeSchema).parse(await this.fetchJson(this.paths.gradesPath));
    } catch (error) {
      if (error instanceof GradescopeApiError) {
        throw error;
      }

      throw new GradescopeApiError('malformed_response', 'Gradescope grades payload is malformed.');
    }
  }

  async getCourses(): Promise<GradescopeRawCourse[]> {
    if (!this.paths.coursesPath) {
      return [];
    }

    try {
      return z.array(GradescopeRawCourseSchema).parse(await this.fetchJson(this.paths.coursesPath));
    } catch (error) {
      if (error instanceof GradescopeApiError) {
        throw error;
      }

      throw new GradescopeApiError('malformed_response', 'Gradescope courses payload is malformed.');
    }
  }

  getConfiguredPaths() {
    return this.paths;
  }
}

export type GradescopeSyncOutcome = SiteSyncOutcome;
export interface GradescopeSnapshot extends SiteSnapshot {
  assignments?: Assignment[];
  grades?: Grade[];
  courses?: Course[];
}
export type GradescopeSyncResult =
  | (SiteSyncSuccess & {
      site: 'gradescope';
      snapshot: GradescopeSnapshot;
    })
  | (SiteSyncFailure & {
      site: 'gradescope';
    });

type GradescopeSyncFailure = Extract<GradescopeSyncResult, { ok: false }>;

class GradescopeAssignmentsCollector implements ResourceCollector<Assignment> {
  readonly name = 'GradescopeAssignmentsPrivateCollector';
  readonly resource = 'assignments';
  readonly mode = 'private_api' as const;
  readonly priority = 10;

  constructor(private readonly client: GradescopeApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'gradescope';
  }

  async collect(ctx: AdapterContext) {
    const rawAssignments = await this.client.getAssignments();
    return rawAssignments.map((rawAssignment) => normalizeAssignment(rawAssignment, ctx.now));
  }
}

class GradescopeGradesCollector implements ResourceCollector<Grade> {
  readonly name = 'GradescopeGradesPrivateCollector';
  readonly resource = 'grades';
  readonly mode = 'private_api' as const;
  readonly priority = 10;

  constructor(private readonly client: GradescopeApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'gradescope';
  }

  async collect() {
    const rawGrades = await this.client.getGrades();
    return rawGrades.map(normalizeGrade);
  }
}

class GradescopeCoursesCollector implements ResourceCollector<Course> {
  readonly name = 'GradescopeCoursesPrivateCollector';
  readonly resource = 'courses';
  readonly mode = 'private_api' as const;
  readonly priority = 10;

  constructor(private readonly client: GradescopeApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'gradescope' && Boolean(this.client.getConfiguredPaths().coursesPath);
  }

  async collect() {
    const rawCourses = await this.client.getCourses();
    return rawCourses.map(normalizeCourse);
  }
}

class GradescopeCoursesDomCollector implements ResourceCollector<Course> {
  readonly name = 'GradescopeCoursesDomCollector';
  readonly resource = 'courses';
  readonly mode = 'dom' as const;
  readonly priority = 20;

  async supports(ctx: AdapterContext) {
    return ctx.site === 'gradescope' && Boolean(ctx.pageHtml);
  }

  async collect(ctx: AdapterContext) {
    const html = ctx.pageHtml ?? '';
    const courses = parseGradescopeCourseLinks(html)
      .map((course) =>
        normalizeCourse({
          id: course.id,
          name: course.name,
          short_name: course.shortName,
          url: `https://www.gradescope.com${course.url}`,
        }),
      )
      .filter((course): course is Course => Boolean(course));

    const currentCourse = parseGradescopeCurrentCourse(html, ctx.url);
    if (courses.length === 0 && currentCourse) {
      return [currentCourse];
    }

    if (courses.length === 0) {
      throw new GradescopeApiError('unsupported_context', 'Gradescope DOM fallback found no course cards.');
    }

    return courses;
  }
}

class GradescopeAssignmentsDomCollector implements ResourceCollector<Assignment> {
  readonly name = 'GradescopeAssignmentsDomCollector';
  readonly resource = 'assignments';
  readonly mode = 'dom' as const;
  readonly priority = 20;

  constructor(private readonly client: GradescopeApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'gradescope' && Boolean(ctx.pageHtml);
  }

  async collect(ctx: AdapterContext) {
    const collectFromHtml = (html: string, fallbackCourseId?: string) =>
      Array.from(
        html.matchAll(
          /(?<href>\/courses\/(?<linkedCourseId>\d+)\/assignments\/(?<assignmentId>\d+)(?:\/submissions\/(?<submissionId>\d+))?)"[^>]*>(?<title>[\s\S]*?)<\/a>/g,
        ),
      )
        .map((match) => {
          const assignmentId = match.groups?.assignmentId;
          const resolvedCourseId = match.groups?.linkedCourseId ?? fallbackCourseId;
          const title = stripHtml(match.groups?.title);
          if (!assignmentId || !resolvedCourseId || !title) {
            return undefined;
          }

          const rowHtml = html.slice(match.index, html.indexOf('</tr>', match.index) + 5);
          const statusCellMatch = rowHtml.match(/<td[^>]*class="submissionStatus[^"]*"[^>]*>([\s\S]*?)<\/td>/);
          const statusCell = stripHtml(statusCellMatch?.[1]) ?? '';
          const timeMatches = Array.from(rowHtml.matchAll(/datetime="([^"]+)"/g));
          const dueAt = normalizeLooseDateTime(
            timeMatches.length > 0 ? timeMatches[timeMatches.length - 1]?.[1] : undefined,
          );

          let status: AssignmentStatus = 'todo';
          if (/no submission/i.test(statusCell)) {
            status = dueAt && new Date(dueAt).getTime() < new Date(ctx.now).getTime() ? 'overdue' : 'todo';
          } else if (/^\s*\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?/i.test(statusCell)) {
            status = 'graded';
          } else if (/submitted/i.test(statusCell)) {
            status = 'submitted';
          }

          return AssignmentSchema.parse({
            id: `gradescope:assignment:${assignmentId}`,
            kind: 'assignment',
            site: 'gradescope',
            source: {
              site: 'gradescope',
              resourceId: assignmentId,
              resourceType: 'assignment',
              url: match.groups?.href ? `https://www.gradescope.com${match.groups.href}` : undefined,
            },
            url: match.groups?.href ? `https://www.gradescope.com${match.groups.href}` : undefined,
            courseId: `gradescope:course:${resolvedCourseId}`,
            title,
            dueAt,
            status,
          });
        })
        .filter((assignment): assignment is Assignment => Boolean(assignment));

    const html = ctx.pageHtml ?? '';
    const courseIdMatch = ctx.url.match(/\/courses\/(?<courseId>\d+)/);
    const courseId = courseIdMatch?.groups?.courseId;
    let assignments = collectFromHtml(html, courseId);

    if (assignments.length === 0) {
      const courseLinks = parseGradescopeCourseLinks(html);
      const failures: string[] = [];
      for (const course of courseLinks) {
        try {
          const courseHtml = await this.client.fetchHtml(course.url);
          assignments = assignments.concat(collectFromHtml(courseHtml, course.id));
        } catch (error) {
          failures.push(error instanceof Error ? error.message : String(error));
        }
      }
      if (assignments.length === 0 && failures.length > 0) {
        throw new GradescopeApiError('request_failed', failures.join(' | '));
      }
    }

    if (assignments.length === 0) {
      throw new GradescopeApiError('unsupported_context', 'Gradescope DOM fallback found no assignment rows.');
    }

    return assignments;
  }
}

class GradescopeGradesDomCollector implements ResourceCollector<Grade> {
  readonly name = 'GradescopeGradesDomCollector';
  readonly resource = 'grades';
  readonly mode = 'dom' as const;
  readonly priority = 20;

  constructor(private readonly client: GradescopeApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'gradescope' && Boolean(ctx.pageHtml);
  }

  async collect(ctx: AdapterContext) {
    const collectFromHtml = (html: string) =>
      Array.from(
        html.matchAll(
          /\/courses\/(?<courseId>\d+)\/assignments\/(?<assignmentId>\d+)(?:\/submissions\/(?<submissionId>\d+))?"[^>]*>[\s\S]*?<\/a>/g,
        ),
      )
        .map((match) => {
          const assignmentId = match.groups?.assignmentId;
          const rowHtml = html.slice(match.index, html.indexOf('</tr>', match.index) + 5);
          const statusCellMatch = rowHtml.match(/<td[^>]*class="submissionStatus[^"]*"[^>]*>([\s\S]*?)<\/td>/);
          const statusCell = stripHtml(statusCellMatch?.[1]) ?? '';
          const scoreMatch = statusCell.match(/(?<score>\d+(?:\.\d+)?)\s*\/\s*(?<max>\d+(?:\.\d+)?)/);
          if (!assignmentId || !scoreMatch?.groups) {
            return undefined;
          }

          const gradeId = match.groups?.submissionId ?? assignmentId;
          return GradeSchema.parse({
            id: `gradescope:grade:${gradeId}`,
            kind: 'grade',
            site: 'gradescope',
            source: {
              site: 'gradescope',
              resourceId: gradeId,
              resourceType: 'grade',
              url: match.groups?.courseId
                ? `https://www.gradescope.com/courses/${match.groups.courseId}/assignments/${assignmentId}`
                : undefined,
            },
            url: match.groups?.courseId
              ? `https://www.gradescope.com/courses/${match.groups.courseId}/assignments/${assignmentId}`
              : undefined,
            courseId: match.groups?.courseId ? `gradescope:course:${match.groups.courseId}` : undefined,
            assignmentId: `gradescope:assignment:${assignmentId}`,
            title: `Grade ${gradeId}`,
            score: Number(scoreMatch.groups.score),
            maxScore: Number(scoreMatch.groups.max),
          });
        })
        .filter((grade): grade is Grade => Boolean(grade));

    let grades = collectFromHtml(ctx.pageHtml ?? '');

    if (grades.length === 0) {
      const courseLinks = parseGradescopeCourseLinks(ctx.pageHtml ?? '');
      const failures: string[] = [];
      for (const course of courseLinks) {
        try {
          const courseHtml = await this.client.fetchHtml(course.url);
          grades = grades.concat(collectFromHtml(courseHtml));
        } catch (error) {
          failures.push(error instanceof Error ? error.message : String(error));
        }
      }
      if (grades.length === 0 && failures.length > 0) {
        throw new GradescopeApiError('request_failed', failures.join(' | '));
      }
    }

    if (grades.length === 0) {
      throw new GradescopeApiError('unsupported_context', 'Gradescope DOM fallback found no grade rows.');
    }

    return grades;
  }
}

function buildGradescopeFailure(
  outcome: Exclude<GradescopeSyncOutcome, 'success' | 'partial_success'>,
  errorReason: string,
  syncedAt: string,
  code: HealthStatus['code'],
  attemptsByResource?: AttemptsByResource,
): GradescopeSyncFailure {
  return {
    ok: false,
    site: 'gradescope',
    outcome,
    errorReason,
    syncedAt,
    health: HealthStatusSchema.parse({
      status: code === 'unsupported_context' ? 'unavailable' : 'degraded',
      checkedAt: syncedAt,
      code,
      reason: errorReason,
    }),
    attemptsByResource,
  };
}

function mapGradescopeFailureToSyncOutcome(
  error: unknown,
  syncedAt: string,
  attemptsByResource?: AttemptsByResource,
): GradescopeSyncFailure {
  if (error instanceof GradescopeApiError) {
    switch (error.code) {
      case 'unauthorized':
        return buildGradescopeFailure('not_logged_in', error.message, syncedAt, 'logged_out', attemptsByResource);
      case 'unsupported_context':
        return buildGradescopeFailure('unsupported_context', error.message, syncedAt, 'unsupported_context', attemptsByResource);
      case 'malformed_response':
        return buildGradescopeFailure('normalize_failed', error.message, syncedAt, 'normalize_failed', attemptsByResource);
      case 'request_failed':
      default:
        return buildGradescopeFailure('request_failed', error.message, syncedAt, 'collector_failed', attemptsByResource);
    }
  }

  return buildGradescopeFailure(
    'request_failed',
    error instanceof Error ? error.message : 'Gradescope sync failed.',
    syncedAt,
    'collector_failed',
    attemptsByResource,
  );
}

export class GradescopeAdapter implements SiteAdapter {
  readonly site = 'gradescope' as const;

  constructor(private readonly client: GradescopeApiClient) {}

  async canRun(ctx: AdapterContext): Promise<boolean> {
    return ctx.site === 'gradescope';
  }

  async getCapabilities(ctx: AdapterContext): Promise<AdapterCapabilities> {
    const hasCoursesPath = Boolean(this.client.getConfiguredPaths().coursesPath);
    return {
      privateApi: true,
      pageState: false,
      dom: true,
      resources: {
        courses: {
          supported: ctx.site === 'gradescope',
          modes: ['private_api', 'dom'],
          preferredMode: hasCoursesPath ? 'private_api' : 'dom',
        },
        assignments: {
          supported: ctx.site === 'gradescope',
          modes: ['private_api', 'dom'],
          preferredMode: 'private_api',
        },
        grades: {
          supported: ctx.site === 'gradescope',
          modes: ['private_api', 'dom'],
          preferredMode: 'private_api',
        },
      },
    };
  }

  async healthCheck(ctx: AdapterContext): Promise<HealthStatus> {
    return HealthStatusSchema.parse({
      status: ctx.site === 'gradescope' ? 'healthy' : 'unavailable',
      checkedAt: ctx.now,
      code: ctx.site === 'gradescope' ? 'supported' : 'unsupported_context',
      reason: ctx.site === 'gradescope' ? 'gradescope_private_request_only_phase' : 'unsupported_context',
    });
  }

  async sync(ctx: AdapterContext): Promise<GradescopeSyncResult> {
    const attemptsByResource: AttemptsByResource = {};
    try {
      const assignmentsPipeline = await runCollectorPipeline(ctx, [
        new GradescopeAssignmentsCollector(this.client),
        new GradescopeAssignmentsDomCollector(this.client),
      ]);
      attemptsByResource.assignments = assignmentsPipeline.attempts;
      const gradesPipeline = await runCollectorPipeline(ctx, [
        new GradescopeGradesCollector(this.client),
        new GradescopeGradesDomCollector(this.client),
      ]);
      attemptsByResource.grades = gradesPipeline.attempts;
      const coursesCollectors = [
        ...(this.client.getConfiguredPaths().coursesPath ? [new GradescopeCoursesCollector(this.client)] : []),
        new GradescopeCoursesDomCollector(),
      ];
      const coursesPipeline = await runCollectorPipeline(ctx, coursesCollectors);
      attemptsByResource.courses = coursesPipeline.attempts;

      const assignments = assignmentsPipeline.ok ? z.array(AssignmentSchema).parse(assignmentsPipeline.items) : undefined;
      const grades = gradesPipeline.ok ? z.array(GradeSchema).parse(gradesPipeline.items) : undefined;
      const courses = coursesPipeline.ok ? z.array(CourseSchema).parse(coursesPipeline.items) : undefined;

      if (!assignments && !grades && !courses) {
        return buildGradescopeFailure(
          'collector_failed',
          [assignmentsPipeline, gradesPipeline, coursesPipeline]
            .filter((pipeline) => !pipeline.ok)
            .map((pipeline) => pipeline.errorReason)
            .join(' | ') || 'all_collectors_failed',
          ctx.now,
          'collector_failed',
          attemptsByResource,
        );
      }

      const hasFailure = !assignmentsPipeline.ok || !gradesPipeline.ok || !coursesPipeline.ok;
      const outcome: GradescopeSyncResult['outcome'] = hasFailure ? 'partial_success' : 'success';
      const health = HealthStatusSchema.parse({
        status: hasFailure ? 'degraded' : 'healthy',
        checkedAt: ctx.now,
        code: hasFailure ? 'partial_success' : 'supported',
        reason: hasFailure ? 'gradescope_partial_sync' : 'gradescope_sync_success',
      });

      return {
        ok: true,
        site: 'gradescope',
        outcome,
        snapshot: {
          courses,
          assignments,
          grades,
        },
        syncedAt: ctx.now,
        health,
        attemptsByResource,
      };
    } catch (error) {
      return mapGradescopeFailureToSyncOutcome(error, ctx.now, attemptsByResource);
    }
  }
}

export function createGradescopeAdapter(client: GradescopeApiClient) {
  return new GradescopeAdapter(client);
}
