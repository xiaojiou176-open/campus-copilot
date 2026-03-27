import {
  type AdapterCapabilities,
  type AdapterContext,
  type AttemptsByResource,
  type ResourceCollector,
  type SiteSyncSuccess,
  type SiteSnapshot,
  type SiteAdapter,
  type SiteSyncFailure,
  type SiteSyncOutcome,
  runCollectorPipeline,
} from '@campus-copilot/adapters-base';
import {
  AnnouncementSchema,
  AssignmentSchema,
  CourseSchema,
  HealthStatusSchema,
  type Announcement,
  type Assignment,
  type Course,
  type HealthStatus,
} from '@campus-copilot/schema';
import { z } from 'zod';

type CanvasRequestPath = string;

type CanvasApiFailureCode =
  | 'unauthorized'
  | 'request_failed'
  | 'malformed_response'
  | 'unsupported_context';

export class CanvasApiError extends Error {
  constructor(
    public readonly code: CanvasApiFailureCode,
    message: string,
    public readonly details?: { status?: number },
  ) {
    super(message);
    this.name = 'CanvasApiError';
  }
}

class PartialCanvasAssignmentsError extends Error {
  constructor(
    public readonly assignments: CanvasRawAssignment[],
    message: string,
  ) {
    super(message);
    this.name = 'PartialCanvasAssignmentsError';
  }
}

type CanvasRequestResult =
  | {
      ok: true;
      status: number;
      responseUrl: string;
      bodyText: string;
      linkHeader?: string;
      contentType?: string;
    }
  | {
      ok: false;
      code: CanvasApiFailureCode;
      message: string;
      status?: number;
    };

export type CanvasRequestExecutor = (path: CanvasRequestPath) => Promise<CanvasRequestResult>;

const CanvasRawCourseSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    name: z.string().min(1).nullable().optional(),
    course_code: z.string().optional(),
    html_url: z.url().optional(),
    access_restricted_by_date: z.boolean().optional(),
  })
  .passthrough();

const CanvasRawAssignmentSubmissionSchema = z
  .object({
    workflow_state: z.string().optional(),
    submitted_at: z.string().nullable().optional(),
    missing: z.boolean().optional(),
    late: z.boolean().optional(),
    grade: z.string().nullable().optional(),
  })
  .passthrough()
  .optional();

const CanvasRawAssignmentSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    course_id: z.union([z.number(), z.string()]),
    name: z.string().min(1),
    html_url: z.url().optional(),
    due_at: z.string().nullable().optional(),
    submission: CanvasRawAssignmentSubmissionSchema,
  })
  .passthrough();

const CanvasRawAnnouncementSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    title: z.string().min(1),
    html_url: z.url().optional(),
    posted_at: z.string().nullable().optional(),
    context_code: z.string().optional(),
  })
  .passthrough();

type CanvasRawCourse = z.infer<typeof CanvasRawCourseSchema>;
type CanvasRawAssignment = z.infer<typeof CanvasRawAssignmentSchema>;
type CanvasRawAnnouncement = z.infer<typeof CanvasRawAnnouncementSchema>;

function parseNextPath(linkHeader: string | undefined, currentResponseUrl: string): string | undefined {
  if (!linkHeader) {
    return undefined;
  }

  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  if (!match?.[1]) {
    return undefined;
  }

  const nextUrl = new URL(match[1], currentResponseUrl);
  return `${nextUrl.pathname}${nextUrl.search}`;
}

export class CanvasApiClient {
  constructor(
    private readonly executeRequest: CanvasRequestExecutor,
    private readonly maxPages = 5,
  ) {}

  private async fetchPage(path: CanvasRequestPath): Promise<{
    data: unknown;
    nextPath?: string;
  }> {
    const result = await this.executeRequest(path);
    if (!result.ok) {
      throw new CanvasApiError(result.code, result.message, { status: result.status });
    }

    if (result.status === 401 || result.status === 403) {
      throw new CanvasApiError('unauthorized', 'Canvas session is unauthorized.', { status: result.status });
    }

    if (result.status === 404) {
      throw new CanvasApiError('unsupported_context', 'Active tab does not expose Canvas API resources.', {
        status: result.status,
      });
    }

    if (result.status < 200 || result.status >= 300) {
      throw new CanvasApiError('request_failed', `Canvas API request failed with status ${result.status}.`, {
        status: result.status,
      });
    }

    try {
      const data = JSON.parse(result.bodyText);
      return {
        data,
        nextPath: parseNextPath(result.linkHeader, result.responseUrl),
      };
    } catch {
      throw new CanvasApiError('malformed_response', 'Canvas API returned malformed JSON.', {
        status: result.status,
      });
    }
  }

  private async fetchPaginatedArray(path: CanvasRequestPath): Promise<unknown[]> {
    const items: unknown[] = [];
    let nextPath: string | undefined = path;
    let pageCount = 0;

    while (nextPath && pageCount < this.maxPages) {
      const page = await this.fetchPage(nextPath);
      if (!Array.isArray(page.data)) {
        throw new CanvasApiError('malformed_response', 'Canvas API page is not an array.');
      }
      items.push(...page.data);
      nextPath = page.nextPath;
      pageCount += 1;
    }

    return items;
  }

  async getCourses(): Promise<CanvasRawCourse[]> {
    return z.array(CanvasRawCourseSchema).parse(
      await this.fetchPaginatedArray('/api/v1/courses?state[]=available&per_page=100'),
    );
  }

  async getAssignments(courseId: string): Promise<CanvasRawAssignment[]> {
    return z.array(CanvasRawAssignmentSchema).parse(
      await this.fetchPaginatedArray(
        `/api/v1/courses/${courseId}/assignments?include[]=submission&order_by=due_at&per_page=100`,
      ),
    );
  }

  async getAnnouncements(courseIds: string[]): Promise<CanvasRawAnnouncement[]> {
    if (courseIds.length === 0) {
      return [];
    }

    const params = new URLSearchParams();
    params.set('per_page', '100');
    for (const courseId of courseIds) {
      params.append('context_codes[]', `course_${courseId}`);
    }

    return z.array(CanvasRawAnnouncementSchema).parse(
      await this.fetchPaginatedArray(`/api/v1/announcements?${params.toString()}`),
    );
  }
}

function normalizeCourse(rawCourse: CanvasRawCourse): Course {
  const fallbackTitle =
    rawCourse.name ??
    rawCourse.course_code ??
    ((rawCourse as Record<string, unknown>).friendly_name as string | undefined) ??
    `Canvas course ${rawCourse.id}`;

  return CourseSchema.parse({
    id: `canvas:course:${rawCourse.id}`,
    kind: 'course',
    site: 'canvas',
    source: {
      site: 'canvas',
      resourceId: String(rawCourse.id),
      resourceType: 'course',
      url: rawCourse.html_url,
    },
    url: rawCourse.html_url,
    title: fallbackTitle,
    code: rawCourse.course_code,
  });
}

function shouldSyncCourse(rawCourse: CanvasRawCourse): boolean {
  const hasVisibleMetadata = Boolean(rawCourse.name || rawCourse.course_code || rawCourse.html_url);
  if (rawCourse.access_restricted_by_date && !hasVisibleMetadata) {
    return false;
  }

  return true;
}

function deriveAssignmentStatus(rawAssignment: CanvasRawAssignment, now: string): Assignment['status'] {
  const submission = rawAssignment.submission;
  if (submission?.grade || submission?.workflow_state === 'graded') {
    return 'graded';
  }
  if (submission?.missing) {
    return 'missing';
  }
  if (submission?.submitted_at || submission?.workflow_state === 'submitted') {
    return 'submitted';
  }
  if (rawAssignment.due_at && new Date(rawAssignment.due_at).getTime() < new Date(now).getTime()) {
    return 'overdue';
  }
  return 'todo';
}

function normalizeAssignment(rawAssignment: CanvasRawAssignment, now: string): Assignment {
  const dueAt = rawAssignment.due_at ?? undefined;
  return AssignmentSchema.parse({
    id: `canvas:assignment:${rawAssignment.id}`,
    kind: 'assignment',
    site: 'canvas',
    source: {
      site: 'canvas',
      resourceId: String(rawAssignment.id),
      resourceType: 'assignment',
      url: rawAssignment.html_url,
    },
    url: rawAssignment.html_url,
    courseId: `canvas:course:${rawAssignment.course_id}`,
    title: rawAssignment.name,
    dueAt: dueAt ?? undefined,
    status: deriveAssignmentStatus(rawAssignment, now),
  });
}

function normalizeAnnouncement(rawAnnouncement: CanvasRawAnnouncement): Announcement {
  const courseIdMatch = rawAnnouncement.context_code?.match(/^course_(.+)$/);
  return AnnouncementSchema.parse({
    id: `canvas:announcement:${rawAnnouncement.id}`,
    kind: 'announcement',
    site: 'canvas',
    source: {
      site: 'canvas',
      resourceId: String(rawAnnouncement.id),
      resourceType: 'announcement',
      url: rawAnnouncement.html_url,
    },
    url: rawAnnouncement.html_url,
    courseId: courseIdMatch ? `canvas:course:${courseIdMatch[1]}` : undefined,
    title: rawAnnouncement.title,
    postedAt: rawAnnouncement.posted_at ?? undefined,
  });
}

export type CanvasSyncOutcome = SiteSyncOutcome;
export interface CanvasSnapshot extends SiteSnapshot {
  courses: Course[];
  assignments?: Assignment[];
  announcements?: Announcement[];
}
export type CanvasSyncResult =
  | (SiteSyncSuccess & {
      site: 'canvas';
      snapshot: CanvasSnapshot;
    })
  | (SiteSyncFailure & {
      site: 'canvas';
    });

type CanvasSyncFailure = Extract<CanvasSyncResult, { ok: false }>;

class CanvasCoursesApiCollector implements ResourceCollector<Course> {
  readonly name = 'CanvasCoursesApiCollector';
  readonly resource = 'courses';
  readonly mode = 'official_api' as const;
  readonly priority = 10;

  constructor(private readonly client: CanvasApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'canvas';
  }

  async collect() {
    const rawCourses = await this.client.getCourses();
    return rawCourses.filter(shouldSyncCourse).map(normalizeCourse);
  }
}

class CanvasAssignmentsApiCollector implements ResourceCollector<Assignment> {
  readonly name = 'CanvasAssignmentsApiCollector';
  readonly resource = 'assignments';
  readonly mode = 'official_api' as const;
  readonly priority = 10;

  constructor(
    private readonly client: CanvasApiClient,
    private readonly courseIds: string[],
  ) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'canvas';
  }

  async collect(ctx: AdapterContext) {
    const collected: CanvasRawAssignment[] = [];
    const failures: string[] = [];

    for (const courseId of this.courseIds) {
      try {
        const rawAssignments = await this.client.getAssignments(courseId);
        collected.push(...rawAssignments);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'assignment_collector_failed';
        failures.push(`course_${courseId}:${reason}`);
      }
    }

    if (collected.length === 0 && failures.length > 0) {
      throw new CanvasApiError('request_failed', failures.join(' | '));
    }

    if (failures.length > 0) {
      throw new PartialCanvasAssignmentsError(collected, failures.join(' | '));
    }

    return collected.map((rawAssignment) => normalizeAssignment(rawAssignment, ctx.now));
  }
}

class CanvasAnnouncementsApiCollector implements ResourceCollector<Announcement> {
  readonly name = 'CanvasAnnouncementsApiCollector';
  readonly resource = 'announcements';
  readonly mode = 'official_api' as const;
  readonly priority = 10;

  constructor(
    private readonly client: CanvasApiClient,
    private readonly courseIds: string[],
  ) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'canvas';
  }

  async collect() {
    const rawAnnouncements = await this.client.getAnnouncements(this.courseIds);
    return rawAnnouncements.map(normalizeAnnouncement);
  }
}

function buildCanvasFailure(
  outcome: Exclude<CanvasSyncOutcome, 'success' | 'partial_success'>,
  errorReason: string,
  syncedAt: string,
  code: HealthStatus['code'],
  attemptsByResource?: AttemptsByResource,
): CanvasSyncFailure {
  return {
    ok: false,
    site: 'canvas',
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

function mapCanvasFailureToSyncOutcome(
  error: unknown,
  syncedAt: string,
  attemptsByResource?: AttemptsByResource,
): CanvasSyncFailure {
  if (error instanceof CanvasApiError) {
    switch (error.code) {
      case 'unauthorized':
        return buildCanvasFailure('not_logged_in', error.message, syncedAt, 'logged_out', attemptsByResource);
      case 'unsupported_context':
        return buildCanvasFailure('unsupported_context', error.message, syncedAt, 'unsupported_context', attemptsByResource);
      case 'malformed_response':
        return buildCanvasFailure('normalize_failed', error.message, syncedAt, 'normalize_failed', attemptsByResource);
      case 'request_failed':
      default:
        return buildCanvasFailure('request_failed', error.message, syncedAt, 'collector_failed', attemptsByResource);
    }
  }

  return buildCanvasFailure(
    'request_failed',
    error instanceof Error ? error.message : 'Canvas sync failed.',
    syncedAt,
    'collector_failed',
    attemptsByResource,
  );
}

export class CanvasAdapter implements SiteAdapter {
  readonly site = 'canvas' as const;

  constructor(private readonly client: CanvasApiClient) {}

  async canRun(ctx: AdapterContext): Promise<boolean> {
    return ctx.site === 'canvas';
  }

  async getCapabilities(ctx: AdapterContext): Promise<AdapterCapabilities> {
    return {
      officialApi: true,
      pageState: false,
      dom: false,
      resources: {
        courses: {
          supported: ctx.site === 'canvas',
          modes: ['official_api'],
          preferredMode: 'official_api',
        },
        assignments: {
          supported: ctx.site === 'canvas',
          modes: ['official_api'],
          preferredMode: 'official_api',
        },
        announcements: {
          supported: ctx.site === 'canvas',
          modes: ['official_api'],
          preferredMode: 'official_api',
        },
      },
    };
  }

  async healthCheck(ctx: AdapterContext): Promise<HealthStatus> {
    return HealthStatusSchema.parse({
      status: ctx.site === 'canvas' ? 'healthy' : 'unavailable',
      checkedAt: ctx.now,
      code: ctx.site === 'canvas' ? 'supported' : 'unsupported_context',
      reason: ctx.site === 'canvas' ? 'canvas_api_only_phase' : 'unsupported_context',
    });
  }

  async sync(ctx: AdapterContext): Promise<CanvasSyncResult> {
    const attemptsByResource: AttemptsByResource = {};

    try {
      const coursesPipeline = await runCollectorPipeline(ctx, [new CanvasCoursesApiCollector(this.client)]);
      attemptsByResource.courses = coursesPipeline.attempts;
      if (!coursesPipeline.ok) {
        return buildCanvasFailure('collector_failed', coursesPipeline.errorReason, ctx.now, 'collector_failed', attemptsByResource);
      }

      const courses = z.array(CourseSchema).parse(coursesPipeline.items);
      const courseIds = courses.map((course) => course.source.resourceId);
      const snapshot: CanvasSnapshot = {
        courses,
      };
      let outcome: CanvasSyncResult['outcome'] = 'success';
      let health = HealthStatusSchema.parse({
        status: 'healthy',
        checkedAt: ctx.now,
        code: 'supported',
        reason: 'canvas_sync_success',
      });

      const assignmentsCollector = new CanvasAssignmentsApiCollector(this.client, courseIds);
      try {
        const assignments = await assignmentsCollector.collect(ctx);
        attemptsByResource.assignments = [
          {
            mode: assignmentsCollector.mode,
            collectorName: assignmentsCollector.name,
            attemptedAt: ctx.now,
            success: true,
          },
        ];
        snapshot.assignments = z.array(AssignmentSchema).parse(assignments);
      } catch (error) {
        attemptsByResource.assignments = [
          {
            mode: assignmentsCollector.mode,
            collectorName: assignmentsCollector.name,
            attemptedAt: ctx.now,
            success: false,
            errorReason: error instanceof Error ? error.message : 'collector_failed',
          },
        ];

        if (error instanceof PartialCanvasAssignmentsError) {
          snapshot.assignments = error.assignments.map((rawAssignment) => normalizeAssignment(rawAssignment, ctx.now));
        }

        outcome = 'partial_success';
        health = HealthStatusSchema.parse({
          status: 'degraded',
          checkedAt: ctx.now,
          code: 'partial_success',
          reason: 'canvas_assignments_collector_failed',
        });
      }

      const announcementsPipeline = await runCollectorPipeline(ctx, [
        new CanvasAnnouncementsApiCollector(this.client, courseIds),
      ]);
      attemptsByResource.announcements = announcementsPipeline.attempts;
      if (announcementsPipeline.ok) {
        snapshot.announcements = z.array(AnnouncementSchema).parse(announcementsPipeline.items);
      } else {
        outcome = 'partial_success';
        health = HealthStatusSchema.parse({
          status: 'degraded',
          checkedAt: ctx.now,
          code: 'partial_success',
          reason:
            outcome === 'partial_success'
              ? health.reason === 'canvas_assignments_collector_failed'
                ? 'canvas_assignments_and_announcements_collectors_failed'
                : 'canvas_announcements_collector_failed'
              : 'canvas_announcements_collector_failed',
        });
      }

      return {
        ok: true,
        site: 'canvas',
        outcome,
        snapshot,
        syncedAt: ctx.now,
        health,
        attemptsByResource,
      };
    } catch (error) {
      return mapCanvasFailureToSyncOutcome(error, ctx.now, attemptsByResource);
    }
  }
}

export function createCanvasAdapter(client: CanvasApiClient) {
  return new CanvasAdapter(client);
}
