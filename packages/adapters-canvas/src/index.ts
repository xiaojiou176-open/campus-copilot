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
  EventSchema,
  GradeSchema,
  HealthStatusSchema,
  MessageSchema,
  ResourceSchema,
  type Announcement,
  type Assignment,
  type Course,
  type Event,
  type Grade,
  type HealthStatus,
  type Message,
  type Resource,
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

class PartialCanvasResourcesError extends Error {
  constructor(
    public readonly resources: Resource[],
    message: string,
  ) {
    super(message);
    this.name = 'PartialCanvasResourcesError';
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
    syllabus_body: z.string().nullable().optional(),
    access_restricted_by_date: z.boolean().optional(),
  })
  .passthrough();

const CanvasRawFileSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    display_name: z.string().nullable().optional(),
    filename: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    size: z.union([z.number(), z.string()]).nullable().optional(),
    updated_at: z.string().nullable().optional(),
    modified_at: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    content_type: z.string().nullable().optional(),
    'content-type': z.string().nullable().optional(),
  })
  .passthrough();

const CanvasRawModuleItemContentDetailsSchema = z
  .object({
    url: z.string().nullable().optional(),
    page_url: z.string().nullable().optional(),
    media_entry_title: z.string().nullable().optional(),
    file_name: z.string().nullable().optional(),
    content_type: z.string().nullable().optional(),
  })
  .passthrough();

const CanvasRawModuleItemCompletionRequirementSchema = z
  .object({
    type: z.string().nullable().optional(),
    min_score: z.union([z.number(), z.string()]).nullable().optional(),
    completed: z.boolean().optional(),
  })
  .passthrough();

const CanvasRawModuleItemSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    type: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    external_url: z.string().nullable().optional(),
    page_url: z.string().nullable().optional(),
    published: z.boolean().optional(),
    content_id: z.union([z.number(), z.string()]).nullable().optional(),
    content_details: CanvasRawModuleItemContentDetailsSchema.nullable().optional(),
    completion_requirement: CanvasRawModuleItemCompletionRequirementSchema.nullable().optional(),
  })
  .passthrough();

const CanvasRawModuleSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    name: z.string().nullable().optional(),
    published: z.boolean().optional(),
    items: z.array(CanvasRawModuleItemSchema).optional(),
  })
  .passthrough();

const CanvasRawGroupSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    members_count: z.union([z.number(), z.string()]).nullable().optional(),
    join_level: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    group_category_id: z.union([z.number(), z.string()]).nullable().optional(),
  })
  .passthrough();

const CanvasRawMediaObjectSchema = z
  .object({
    id: z.union([z.number(), z.string()]).nullable().optional(),
    media_id: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    user_entered_title: z.string().nullable().optional(),
    media_type: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

const CanvasRawAssignmentSubmissionSchema = z
  .object({
    workflow_state: z.string().optional(),
    submitted_at: z.string().nullable().optional(),
    missing: z.boolean().optional(),
    late: z.boolean().optional(),
    grade: z.string().nullable().optional(),
    score: z.number().nullable().optional(),
    graded_at: z.string().nullable().optional(),
  })
  .passthrough()
  .optional();

const CanvasRawSubmissionCommentSchema = z
  .object({
    comment: z.string().nullable().optional(),
    author_name: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
  })
  .passthrough();

const CanvasRawSubmissionSchema = z
  .object({
    assignment_id: z.union([z.number(), z.string()]),
    submission_comments: z.array(CanvasRawSubmissionCommentSchema).optional(),
    submission_html_comments: z.string().nullable().optional(),
    rubric_assessment: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const CanvasRawAssignmentSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    course_id: z.union([z.number(), z.string()]),
    name: z.string().min(1),
    html_url: z.url().optional(),
    due_at: z.string().nullable().optional(),
    points_possible: z.union([z.number(), z.string()]).nullable().optional(),
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
    message: z.string().nullable().optional(),
  })
  .passthrough();

const CanvasRawConversationSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    subject: z.string().nullable().optional(),
    last_message: z.string().nullable().optional(),
    last_message_at: z.string().nullable().optional(),
    context_code: z.string().optional(),
    workflow_state: z.string().optional(),
    read_state: z.string().optional(),
    html_url: z.url().optional(),
  })
  .passthrough();

const CanvasRawConversationAttachmentSchema = z
  .object({
    display_name: z.string().nullable().optional(),
    filename: z.string().nullable().optional(),
  })
  .passthrough();

const CanvasRawConversationMessageSchema = z
  .object({
    body: z.string().nullable().optional(),
    attachments: z.array(CanvasRawConversationAttachmentSchema).optional(),
  })
  .passthrough();

const CanvasRawConversationDetailSchema = CanvasRawConversationSchema.extend({
  message_count: z.number().optional(),
  messages: z.array(CanvasRawConversationMessageSchema).optional(),
}).passthrough();

const CanvasRawEventSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    title: z.string().min(1),
    html_url: z.url().optional(),
    start_at: z.string().nullable().optional(),
    end_at: z.string().nullable().optional(),
    context_code: z.string().optional(),
    assignment_id: z.union([z.number(), z.string()]).optional(),
    assignment: z
      .object({
        id: z.union([z.number(), z.string()]).optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

type CanvasRawCourse = z.infer<typeof CanvasRawCourseSchema>;
type CanvasRawFile = z.infer<typeof CanvasRawFileSchema>;
type CanvasRawModule = z.infer<typeof CanvasRawModuleSchema>;
type CanvasRawModuleItem = z.infer<typeof CanvasRawModuleItemSchema>;
type CanvasRawGroup = z.infer<typeof CanvasRawGroupSchema>;
type CanvasRawMediaObject = z.infer<typeof CanvasRawMediaObjectSchema>;
type CanvasRawAssignment = z.infer<typeof CanvasRawAssignmentSchema>;
type CanvasRawSubmission = z.infer<typeof CanvasRawSubmissionSchema>;
type CanvasRawAnnouncement = z.infer<typeof CanvasRawAnnouncementSchema>;
type CanvasRawConversation = z.infer<typeof CanvasRawConversationSchema>;
type CanvasRawConversationAttachment = z.infer<typeof CanvasRawConversationAttachmentSchema>;
type CanvasRawConversationMessage = z.infer<typeof CanvasRawConversationMessageSchema>;
type CanvasRawConversationDetail = z.infer<typeof CanvasRawConversationDetailSchema>;
type CanvasRawEvent = z.infer<typeof CanvasRawEventSchema>;

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
      await this.fetchPaginatedArray('/api/v1/courses?state[]=available&include[]=syllabus_body&per_page=100'),
    );
  }

  async getFiles(courseId: string): Promise<CanvasRawFile[]> {
    return z.array(CanvasRawFileSchema).parse(
      await this.fetchPaginatedArray(`/api/v1/courses/${courseId}/files?per_page=100`),
    );
  }

  async getModules(courseId: string): Promise<CanvasRawModule[]> {
    const params = new URLSearchParams();
    params.append('include[]', 'items');
    params.append('include[]', 'content_details');
    params.set('per_page', '100');

    return z.array(CanvasRawModuleSchema).parse(
      await this.fetchPaginatedArray(`/api/v1/courses/${courseId}/modules?${params.toString()}`),
    );
  }

  async getGroups(courseId: string): Promise<CanvasRawGroup[]> {
    return z.array(CanvasRawGroupSchema).parse(
      await this.fetchPaginatedArray(`/api/v1/courses/${courseId}/groups?per_page=100`),
    );
  }

  async getMediaObjects(courseId: string): Promise<CanvasRawMediaObject[]> {
    const params = new URLSearchParams();
    params.append('exclude[]', 'sources');
    params.append('exclude[]', 'tracks');
    params.set('per_page', '100');

    return z.array(CanvasRawMediaObjectSchema).parse(
      await this.fetchPaginatedArray(`/api/v1/courses/${courseId}/media_objects?${params.toString()}`),
    );
  }

  async getAssignments(courseId: string): Promise<CanvasRawAssignment[]> {
    return z.array(CanvasRawAssignmentSchema).parse(
      await this.fetchPaginatedArray(
        `/api/v1/courses/${courseId}/assignments?include[]=submission&order_by=due_at&per_page=100`,
      ),
    );
  }

  async getSubmissionFeedback(courseId: string, assignmentIds: string[]): Promise<CanvasRawSubmission[]> {
    if (assignmentIds.length === 0) {
      return [];
    }

    const params = new URLSearchParams();
    params.set('per_page', '100');
    params.append('include[]', 'submission_comments');
    params.append('include[]', 'submission_html_comments');
    params.append('include[]', 'rubric_assessment');
    for (const assignmentId of assignmentIds) {
      params.append('assignment_ids[]', assignmentId);
    }

    return z.array(CanvasRawSubmissionSchema).parse(
      await this.fetchPaginatedArray(`/api/v1/courses/${courseId}/students/submissions?${params.toString()}`),
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

  async getMessages(): Promise<CanvasRawConversation[]> {
    return z.array(CanvasRawConversationSchema).parse(
      await this.fetchPaginatedArray('/api/v1/conversations?scope=inbox&per_page=100'),
    );
  }

  async getConversationDetail(conversationId: string): Promise<CanvasRawConversationDetail> {
    return CanvasRawConversationDetailSchema.parse(
      (await this.fetchPage(`/api/v1/conversations/${encodeURIComponent(conversationId)}`)).data,
    );
  }

  async getEvents(courseIds: string[]): Promise<CanvasRawEvent[]> {
    if (courseIds.length === 0) {
      return [];
    }

    const params = new URLSearchParams();
    params.set('all_events', 'true');
    params.set('per_page', '100');
    for (const courseId of courseIds) {
      params.append('context_codes[]', `course_${courseId}`);
    }

    return z.array(CanvasRawEventSchema).parse(
      await this.fetchPaginatedArray(`/api/v1/calendar_events?${params.toString()}`),
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

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function toOptionalNonNegativeInt(value: unknown): number | undefined {
  const parsed = toOptionalNumber(value);
  if (parsed == null) {
    return undefined;
  }

  const normalized = Math.round(parsed);
  return normalized >= 0 ? normalized : undefined;
}

function stripCanvasHtml(value: string | undefined) {
  const normalized = value
    ?.replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || undefined;
}

function toOptionalAbsoluteUrl(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
}

function extractFileExtension(filename: string | undefined) {
  if (!filename) {
    return undefined;
  }

  const match = filename.trim().match(/(\.[a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase();
}

function formatFileSize(bytes: number | undefined) {
  if (bytes == null || bytes <= 0) {
    return undefined;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

function buildCanvasResourceDetail(input: { label: string; extension?: string; sizeBytes?: number }) {
  const parts = [input.label];
  if (input.extension) {
    parts.push(input.extension.replace(/^\./, '').toUpperCase());
  }

  const formattedSize = formatFileSize(input.sizeBytes);
  if (formattedSize) {
    parts.push(formattedSize);
  }

  return parts.join(' · ');
}

function looksLikeCanvasRecording(parts: Array<string | undefined>) {
  return parts.some((value) => Boolean(value && /(recording|panopto|lecture capture|video|media)/i.test(value)));
}

function buildCanvasModulePageUrl(pageUrl: string | null | undefined, courseUrl: string | undefined) {
  const normalizedPageUrl = pageUrl?.trim();
  if (!normalizedPageUrl) {
    return undefined;
  }

  const absoluteUrl = toOptionalAbsoluteUrl(normalizedPageUrl);
  if (absoluteUrl) {
    return absoluteUrl;
  }

  if (!courseUrl) {
    return undefined;
  }

  try {
    const course = new URL(courseUrl);
    const coursePath = course.pathname.replace(/\/+$/, '');
    const normalizedPath = normalizedPageUrl.replace(/^\/+/, '');
    const pagePath =
      normalizedPath.startsWith('courses/') || normalizedPath.startsWith('pages/')
        ? normalizedPath
        : `${coursePath.replace(/^\/+/, '')}/pages/${normalizedPath}`;
    return new URL(`/${pagePath}`, course.origin).toString();
  } catch {
    return undefined;
  }
}

function buildCanvasModuleItemDetail(rawModule: CanvasRawModule, rawItem: CanvasRawModuleItem) {
  const type = rawItem.type?.trim();
  const looksLikeRecording = looksLikeCanvasRecording([
    rawItem.title ?? undefined,
    rawItem.external_url ?? undefined,
    rawItem.html_url ?? undefined,
    rawItem.content_details?.media_entry_title ?? undefined,
  ]);
  const typeLabel = looksLikeRecording
    ? 'Recording'
    : type === 'Page'
      ? 'Page'
      : type === 'ExternalUrl'
        ? 'External link'
        : type === 'ExternalTool'
        ? 'External tool'
          : type || 'Item';
  const detailParts = [typeLabel, rawModule.name?.trim() || 'Canvas module'];
  const completionRequirement = buildCanvasModuleItemCompletionRequirementDetail(rawItem);
  if (completionRequirement) {
    detailParts.push(completionRequirement);
  }

  return detailParts.join(' · ');
}

function buildCanvasModuleItemCompletionRequirementDetail(rawItem: CanvasRawModuleItem) {
  const requirementType = rawItem.completion_requirement?.type?.trim();
  if (!requirementType) {
    return undefined;
  }

  if (requirementType === 'min_score') {
    const minScore = toOptionalNumber(rawItem.completion_requirement?.min_score);
    return minScore == null ? 'Requirement: minimum score' : `Requirement: score at least ${minScore}`;
  }

  const requirementLabel =
    requirementType === 'must_view'
      ? 'view'
      : requirementType === 'must_submit'
        ? 'submit'
        : requirementType === 'must_contribute'
          ? 'contribute'
          : requirementType === 'must_mark_done'
            ? 'mark done'
            : requirementType.replace(/_/g, ' ');

  return `Requirement: ${requirementLabel}`;
}

function normalizeCanvasModuleItemResource(
  rawModule: CanvasRawModule,
  rawItem: CanvasRawModuleItem,
  courseId: string,
  courseUrl?: string,
): Resource | undefined {
  if (rawModule.published === false || rawItem.published === false) {
    return undefined;
  }

  const type = rawItem.type?.trim();
  const pageUrl =
    type === 'Page'
      ? buildCanvasModulePageUrl(
          rawItem.page_url ?? rawItem.content_details?.page_url ?? undefined,
          courseUrl,
        )
      : undefined;
  const url = toOptionalAbsoluteUrl(
    rawItem.external_url ?? pageUrl ?? rawItem.html_url ?? rawItem.content_details?.url ?? undefined,
  );
  const title =
    rawItem.title?.trim() ||
    rawItem.content_details?.media_entry_title?.trim() ||
    (rawModule.name?.trim() ? `${rawModule.name.trim()} item` : undefined) ||
    `Canvas module item ${rawItem.id}`;
  const looksLikeRecording = looksLikeCanvasRecording([
    title,
    url,
    rawItem.content_details?.media_entry_title ?? undefined,
  ]);
  const normalizedItemType =
    looksLikeRecording
      ? 'recording'
      : type === 'File'
        ? 'file'
        : type === 'Page'
          ? 'page'
        : type === 'Assignment'
          ? 'assignment'
          : type === 'Discussion'
            ? 'discussion'
            : type === 'Quiz'
              ? 'quiz'
              : type === 'SubHeader'
                ? 'subheader'
                : 'item';
  const moduleLabel = rawModule.name?.trim() || 'Canvas module';

  return ResourceSchema.parse({
    id: `canvas:resource:module-item:${courseId}:${rawModule.id}:${rawItem.id}`,
    kind: 'resource',
    site: 'canvas',
    source: {
      site: 'canvas',
      resourceId: `${courseId}:${rawModule.id}:${rawItem.id}`,
      resourceType:
        looksLikeRecording
          ? 'recording'
          : type === 'File'
            ? 'file_reference'
            : type === 'Page'
              ? 'page_reference'
            : type === 'Assignment'
              ? 'assignment_reference'
            : type === 'Discussion'
              ? 'discussion_reference'
              : type === 'Quiz'
                ? 'quiz_reference'
              : type === 'SubHeader'
                ? 'module_header'
                : 'module_item',
      url,
    },
    url,
    courseId: `canvas:course:${courseId}`,
    resourceKind: looksLikeRecording ? 'embed' : url ? 'link' : 'other',
    title,
    summary: moduleLabel || undefined,
    detail: buildCanvasModuleItemDetail(rawModule, rawItem),
    resourceModule: {
      key: `canvas:module:${courseId}:${rawModule.id}`,
      label: moduleLabel,
      itemType: normalizedItemType,
    },
    fileExtension: extractFileExtension(rawItem.content_details?.file_name ?? undefined),
  });
}

function buildCanvasGroupDetail(rawGroup: CanvasRawGroup) {
  const parts = ['Canvas group'];
  const members = toOptionalNonNegativeInt(rawGroup.members_count);
  if (members != null) {
    parts.push(`${members} members`);
  }
  if (rawGroup.join_level?.trim()) {
    parts.push(rawGroup.join_level.trim());
  }

  return parts.join(' · ');
}

function normalizeCanvasGroupResource(rawGroup: CanvasRawGroup, courseId: string): Resource {
  const title = rawGroup.name?.trim() || `Canvas group ${rawGroup.id}`;
  const url = toOptionalAbsoluteUrl(rawGroup.html_url ?? undefined);

  return ResourceSchema.parse({
    id: `canvas:resource:group:${rawGroup.id}`,
    kind: 'resource',
    site: 'canvas',
    source: {
      site: 'canvas',
      resourceId: String(rawGroup.id),
      resourceType: 'group',
      url,
    },
    url,
    courseId: `canvas:course:${courseId}`,
    resourceKind: url ? 'link' : 'other',
    title,
    summary: stripCanvasHtml(rawGroup.description ?? undefined),
    detail: buildCanvasGroupDetail(rawGroup),
  });
}

function buildCanvasMediaDetail(rawMedia: CanvasRawMediaObject) {
  const parts = ['Canvas media'];
  if (rawMedia.media_type?.trim()) {
    parts.push(rawMedia.media_type.trim());
  }
  return parts.join(' · ');
}

function normalizeCanvasMediaResource(rawMedia: CanvasRawMediaObject, courseId: string): Resource | undefined {
  const mediaId = rawMedia.id ?? rawMedia.media_id;
  if (mediaId == null) {
    return undefined;
  }

  const title =
    rawMedia.user_entered_title?.trim() ||
    rawMedia.title?.trim() ||
    `Canvas recording ${mediaId}`;
  const url = toOptionalAbsoluteUrl(rawMedia.html_url ?? rawMedia.url ?? undefined);

  return ResourceSchema.parse({
    id: `canvas:resource:media:${mediaId}`,
    kind: 'resource',
    site: 'canvas',
    source: {
      site: 'canvas',
      resourceId: String(mediaId),
      resourceType: 'media_object',
      url,
    },
    url,
    courseId: `canvas:course:${courseId}`,
    resourceKind: 'embed',
    title,
    detail: buildCanvasMediaDetail(rawMedia),
    releasedAt: rawMedia.updated_at ?? rawMedia.created_at ?? undefined,
  });
}

function dedupeCanvasResources(resources: Resource[]) {
  const deduped = new Map<string, Resource>();
  for (const resource of resources) {
    if (!deduped.has(resource.id)) {
      deduped.set(resource.id, resource);
    }
  }
  return Array.from(deduped.values());
}

function isOptionalCanvasFamilyGap(error: unknown) {
  return error instanceof CanvasApiError && error.code === 'unsupported_context';
}

function buildSyllabusSummary(rawCourse: CanvasRawCourse) {
  const summary = stripCanvasHtml(rawCourse.syllabus_body ?? undefined);
  if (!summary) {
    return undefined;
  }

  return summary.length > 280 ? `${summary.slice(0, 277)}...` : summary;
}

function normalizeSyllabusResource(rawCourse: CanvasRawCourse): Resource | undefined {
  const summary = buildSyllabusSummary(rawCourse);
  if (!summary) {
    return undefined;
  }

  return ResourceSchema.parse({
    id: `canvas:resource:${rawCourse.id}:syllabus`,
    kind: 'resource',
    site: 'canvas',
    source: {
      site: 'canvas',
      resourceId: `${rawCourse.id}:syllabus`,
      resourceType: 'syllabus_summary',
      url: rawCourse.html_url,
    },
    url: rawCourse.html_url,
    courseId: `canvas:course:${rawCourse.id}`,
    resourceKind: 'other',
    title: 'Syllabus summary',
    summary,
    detail: 'Canvas course syllabus summary',
  });
}

function normalizeFileResource(rawFile: CanvasRawFile, courseId: string): Resource {
  const title = rawFile.display_name?.trim() || rawFile.filename?.trim() || `Canvas file ${rawFile.id}`;
  const fileExtension = extractFileExtension(rawFile.display_name ?? rawFile.filename ?? undefined);
  const sizeBytes = toOptionalNonNegativeInt(rawFile.size);
  const htmlUrl = toOptionalAbsoluteUrl(rawFile.html_url ?? undefined);
  const downloadUrl = toOptionalAbsoluteUrl(rawFile.url ?? undefined);

  return ResourceSchema.parse({
    id: `canvas:resource:${rawFile.id}`,
    kind: 'resource',
    site: 'canvas',
    source: {
      site: 'canvas',
      resourceId: String(rawFile.id),
      resourceType: 'file',
      url: htmlUrl ?? downloadUrl,
    },
    url: htmlUrl ?? downloadUrl,
    courseId: `canvas:course:${courseId}`,
    resourceKind: 'file',
    title,
    detail: buildCanvasResourceDetail({
      label: 'Canvas file',
      extension: fileExtension,
      sizeBytes,
    }),
    fileExtension,
    sizeBytes,
    downloadUrl,
    releasedAt: rawFile.updated_at ?? rawFile.modified_at ?? rawFile.created_at ?? undefined,
  });
}

function buildCanvasAssignmentSummary(rawAssignment: CanvasRawAssignment) {
  const parts: string[] = [];
  const submission = rawAssignment.submission;
  const pointsPossible = toOptionalNumber(rawAssignment.points_possible);
  const isLate = submission?.late === true;

  if (submission?.missing) {
    parts.push('Missing submission');
  } else if (submission?.workflow_state === 'graded' || submission?.graded_at) {
    parts.push('Graded');
  } else if (submission?.submitted_at || submission?.workflow_state === 'submitted') {
    parts.push('Submitted');
  }

  if (isLate) {
    parts.push('Late');
  }

  if (submission?.score != null || pointsPossible != null) {
    parts.push(`${submission?.score ?? '-'} / ${pointsPossible ?? '-'}`);
  } else if (pointsPossible != null) {
    parts.push(`${pointsPossible} pts`);
  }

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function buildCanvasAssignmentDetail(rawSubmission: CanvasRawSubmission | undefined) {
  const comments = [
    ...(rawSubmission?.submission_comments ?? []).flatMap((comment) => {
      const attachmentHint =
        comment && typeof comment === 'object' && 'attachments' in comment
          ? buildCanvasAttachmentHint(comment.attachments)
          : undefined;
      return [stripCanvasHtml(comment.comment ?? undefined), attachmentHint];
    }),
    stripCanvasHtml(rawSubmission?.submission_html_comments ?? undefined),
    ...Object.values(rawSubmission?.rubric_assessment ?? {}).flatMap((entry) => {
      if (!entry || typeof entry !== 'object') {
        return [];
      }

      const comment =
        'comments' in entry && typeof entry.comments === 'string'
          ? stripCanvasHtml(entry.comments)
          : 'comment' in entry && typeof entry.comment === 'string'
            ? stripCanvasHtml(entry.comment)
            : undefined;
      return comment ? [comment] : [];
    }),
  ].filter((value): value is string => Boolean(value));

  if (comments.length === 0) {
    return undefined;
  }

  const deduped = Array.from(new Set(comments));
  const preview = deduped.slice(0, 2).join(' · ');
  return preview.length > 200 ? `${preview.slice(0, 197)}...` : preview;
}

function normalizeAssignment(
  rawAssignment: CanvasRawAssignment,
  now: string,
  rawSubmission?: CanvasRawSubmission,
): Assignment {
  const dueAt = rawAssignment.due_at ?? undefined;
  const score = toOptionalNumber(rawAssignment.submission?.score);
  const maxScore = toOptionalNumber(rawAssignment.points_possible);
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
    summary: buildCanvasAssignmentSummary(rawAssignment),
    detail: buildCanvasAssignmentDetail(rawSubmission),
    dueAt: dueAt ?? undefined,
    status: deriveAssignmentStatus(rawAssignment, now),
    submittedAt: rawAssignment.submission?.submitted_at ?? undefined,
    score,
    maxScore,
  });
}

function normalizeAssignments(
  rawAssignments: CanvasRawAssignment[],
  now: string,
  feedbackByAssignmentId?: ReadonlyMap<string, CanvasRawSubmission>,
) {
  return z.array(AssignmentSchema).parse(
    rawAssignments.map((rawAssignment) =>
      normalizeAssignment(rawAssignment, now, feedbackByAssignmentId?.get(String(rawAssignment.id))),
    ),
  );
}

function normalizeGrade(rawAssignment: CanvasRawAssignment): Grade | undefined {
  const submission = rawAssignment.submission;
  if (!submission?.grade && submission?.score == null && !submission?.graded_at) {
    return undefined;
  }

  return GradeSchema.parse({
    id: `canvas:grade:${rawAssignment.id}`,
    kind: 'grade',
    site: 'canvas',
    source: {
      site: 'canvas',
      resourceId: String(rawAssignment.id),
      resourceType: 'grade',
      url: rawAssignment.html_url,
    },
    url: rawAssignment.html_url,
    courseId: `canvas:course:${rawAssignment.course_id}`,
    assignmentId: `canvas:assignment:${rawAssignment.id}`,
    title: rawAssignment.name,
    score: toOptionalNumber(submission?.score),
    maxScore: toOptionalNumber(rawAssignment.points_possible),
    gradedAt: submission?.graded_at ?? undefined,
    releasedAt: submission?.graded_at ?? undefined,
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
    summary: stripCanvasHtml(rawAnnouncement.message ?? undefined),
    postedAt: rawAnnouncement.posted_at ?? undefined,
  });
}

function extractLatestCanvasConversationMessage(
  rawConversationDetail: CanvasRawConversationDetail | undefined,
): CanvasRawConversationMessage | undefined {
  return rawConversationDetail?.messages?.at(-1);
}

function buildCanvasAttachmentHint(attachments: unknown): string | undefined {
  if (!Array.isArray(attachments)) {
    return undefined;
  }

  const attachmentCount = attachments.length;
  if (attachmentCount === 0) {
    return undefined;
  }

  if (attachmentCount === 1) {
    const firstAttachment = attachments[0];
    const attachmentName =
      firstAttachment &&
      typeof firstAttachment === 'object' &&
      !Array.isArray(firstAttachment) &&
      (
        ('display_name' in firstAttachment && typeof firstAttachment.display_name === 'string'
          ? firstAttachment.display_name.trim()
          : undefined) ||
        ('filename' in firstAttachment && typeof firstAttachment.filename === 'string'
          ? firstAttachment.filename.trim()
          : undefined)
      );
    return attachmentName ? `Attachment: ${attachmentName}` : 'Includes 1 attachment';
  }

  return `Includes ${attachmentCount} attachments`;
}

function buildCanvasThreadHint(rawConversationDetail: CanvasRawConversationDetail | undefined): string | undefined {
  const explicitCount = rawConversationDetail?.message_count;
  const derivedCount = rawConversationDetail?.messages?.length;
  const count = explicitCount ?? derivedCount;

  if (!count || count <= 1) {
    return undefined;
  }

  if (count === 2) {
    return '2-message thread';
  }

  return `${count}-message thread`;
}

function buildCanvasMessageSummary(
  rawConversation: CanvasRawConversation,
  rawConversationDetail?: CanvasRawConversationDetail,
): string | undefined {
  const latestMessage = extractLatestCanvasConversationMessage(rawConversationDetail);
  const detailBody = stripCanvasHtml(latestMessage?.body ?? undefined);
  const attachmentHint = buildCanvasAttachmentHint(latestMessage?.attachments);
  const threadHint = buildCanvasThreadHint(rawConversationDetail);
  const fallbackSummary = rawConversation.last_message?.trim() || undefined;
  const detailSummary = [detailBody, attachmentHint, threadHint].filter(Boolean).join(' · ');

  if (detailSummary) {
    return detailSummary;
  }

  return fallbackSummary;
}

function normalizeMessage(
  rawConversation: CanvasRawConversation,
  rawConversationDetail?: CanvasRawConversationDetail,
): Message {
  const courseIdMatch = rawConversation.context_code?.match(/^course_(.+)$/);
  const summary = buildCanvasMessageSummary(rawConversation, rawConversationDetail);
  const title = rawConversation.subject?.trim() || summary || `Canvas conversation ${rawConversation.id}`;
  const unread =
    rawConversation.workflow_state === 'unread' ||
    rawConversation.read_state === 'unread' ||
    rawConversation.workflow_state === 'read' ||
    rawConversation.read_state === 'read'
      ? rawConversation.workflow_state === 'unread' || rawConversation.read_state === 'unread'
      : undefined;

  return MessageSchema.parse({
    id: `canvas:message:${rawConversation.id}`,
    kind: 'message',
    site: 'canvas',
    source: {
      site: 'canvas',
      resourceId: String(rawConversation.id),
      resourceType: 'conversation',
      url: rawConversation.html_url,
    },
    url: rawConversation.html_url,
    courseId: courseIdMatch ? `canvas:course:${courseIdMatch[1]}` : undefined,
    messageKind: 'thread',
    threadId: String(rawConversation.id),
    title,
    summary,
    createdAt: rawConversation.last_message_at ?? undefined,
    unread,
  });
}

function extractCanvasAssignmentId(rawEvent: CanvasRawEvent) {
  const assignmentId =
    rawEvent.assignment_id ??
    rawEvent.assignment?.id ??
    String(rawEvent.id).match(/^assignment_(.+)$/)?.[1];

  return assignmentId != null ? `canvas:assignment:${assignmentId}` : undefined;
}

function deriveCanvasEventKind(rawEvent: CanvasRawEvent): Event['eventKind'] {
  if (extractCanvasAssignmentId(rawEvent)) {
    return 'deadline';
  }

  const title = rawEvent.title.toLowerCase();
  if (/(exam|midterm|final|quiz)/.test(title)) {
    return 'exam';
  }
  if (/(class|lecture|lab|section|discussion)/.test(title)) {
    return 'class';
  }
  if (/(notice|announcement)/.test(title)) {
    return 'notice';
  }

  return 'other';
}

function normalizeEvent(rawEvent: CanvasRawEvent): Event {
  return EventSchema.parse({
    id: `canvas:event:${rawEvent.id}`,
    kind: 'event',
    site: 'canvas',
    source: {
      site: 'canvas',
      resourceId: String(rawEvent.id),
      resourceType: 'event',
      url: rawEvent.html_url,
    },
    url: rawEvent.html_url,
    eventKind: deriveCanvasEventKind(rawEvent),
    title: rawEvent.title,
    startAt: rawEvent.start_at ?? undefined,
    endAt: rawEvent.end_at ?? undefined,
    relatedAssignmentId: extractCanvasAssignmentId(rawEvent),
  });
}

export type CanvasSyncOutcome = SiteSyncOutcome;
export interface CanvasSnapshot extends SiteSnapshot {
  courses: Course[];
  resources?: Resource[];
  assignments?: Assignment[];
  announcements?: Announcement[];
  grades?: Grade[];
  messages?: Message[];
  events?: Event[];
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
  lastRawCourses: CanvasRawCourse[] = [];

  constructor(private readonly client: CanvasApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'canvas';
  }

  async collect() {
    const rawCourses = await this.client.getCourses();
    this.lastRawCourses = rawCourses.filter(shouldSyncCourse);
    return this.lastRawCourses.map(normalizeCourse);
  }
}

class CanvasResourcesApiCollector implements ResourceCollector<Resource> {
  readonly name = 'CanvasResourcesApiCollector';
  readonly resource = 'resources';
  readonly mode = 'official_api' as const;
  readonly priority = 10;

  constructor(
    private readonly client: CanvasApiClient,
    private readonly rawCourses: CanvasRawCourse[],
  ) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'canvas';
  }

  async collect() {
    const collected: Resource[] = [];
    const failures: string[] = [];

    for (const rawCourse of this.rawCourses) {
      const courseId = String(rawCourse.id);
      const syllabusResource = normalizeSyllabusResource(rawCourse);
      if (syllabusResource) {
        collected.push(syllabusResource);
      }

      try {
        const rawFiles = await this.client.getFiles(courseId);
        collected.push(...rawFiles.map((rawFile) => normalizeFileResource(rawFile, courseId)));
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'resource_collector_failed';
        failures.push(`course_${courseId}:files:${reason}`);
      }

      try {
        const rawModules = await this.client.getModules(courseId);
        for (const rawModule of rawModules) {
          collected.push(
            ...((rawModule.items ?? [])
              .map((rawItem) => normalizeCanvasModuleItemResource(rawModule, rawItem, courseId, rawCourse.html_url))
              .filter((resource): resource is Resource => Boolean(resource))),
          );
        }
      } catch (error) {
        if (!isOptionalCanvasFamilyGap(error)) {
          const reason = error instanceof Error ? error.message : 'module_collector_failed';
          failures.push(`course_${courseId}:modules:${reason}`);
        }
      }

      try {
        const rawGroups = await this.client.getGroups(courseId);
        collected.push(...rawGroups.map((rawGroup) => normalizeCanvasGroupResource(rawGroup, courseId)));
      } catch (error) {
        if (!isOptionalCanvasFamilyGap(error)) {
          const reason = error instanceof Error ? error.message : 'group_collector_failed';
          failures.push(`course_${courseId}:groups:${reason}`);
        }
      }

      try {
        const rawMediaObjects = await this.client.getMediaObjects(courseId);
        collected.push(
          ...rawMediaObjects
            .map((rawMedia) => normalizeCanvasMediaResource(rawMedia, courseId))
            .filter((resource): resource is Resource => Boolean(resource)),
        );
      } catch (error) {
        if (!isOptionalCanvasFamilyGap(error)) {
          const reason = error instanceof Error ? error.message : 'media_collector_failed';
          failures.push(`course_${courseId}:media:${reason}`);
        }
      }
    }

    if (collected.length === 0 && failures.length > 0) {
      throw new CanvasApiError('request_failed', failures.join(' | '));
    }

    if (failures.length > 0) {
      throw new PartialCanvasResourcesError(dedupeCanvasResources(collected), failures.join(' | '));
    }

    return z.array(ResourceSchema).parse(dedupeCanvasResources(collected));
  }
}

class CanvasAssignmentsApiCollector implements ResourceCollector<Assignment> {
  readonly name = 'CanvasAssignmentsApiCollector';
  readonly resource = 'assignments';
  readonly mode = 'official_api' as const;
  readonly priority = 10;
  lastRawAssignments: CanvasRawAssignment[] = [];

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

    this.lastRawAssignments = collected;
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

class CanvasMessagesApiCollector implements ResourceCollector<Message> {
  readonly name = 'CanvasMessagesApiCollector';
  readonly resource = 'messages';
  readonly mode = 'official_api' as const;
  readonly priority = 10;

  constructor(private readonly client: CanvasApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'canvas';
  }

  async collect() {
    const rawMessages = await this.client.getMessages();
    const normalizedMessages: Message[] = [];

    for (const rawMessage of rawMessages) {
      let rawConversationDetail: CanvasRawConversationDetail | undefined;
      try {
        rawConversationDetail = await this.client.getConversationDetail(String(rawMessage.id));
      } catch {
        rawConversationDetail = undefined;
      }
      normalizedMessages.push(normalizeMessage(rawMessage, rawConversationDetail));
    }

    return normalizedMessages;
  }
}

class CanvasEventsApiCollector implements ResourceCollector<Event> {
  readonly name = 'CanvasEventsApiCollector';
  readonly resource = 'events';
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
    const rawEvents = await this.client.getEvents(this.courseIds);
    return rawEvents.map(normalizeEvent);
  }
}

function mergePartialReason(
  currentReason: string | undefined,
  failedResource: 'resources' | 'assignments' | 'announcements' | 'messages' | 'events',
) {
  const failures = new Set<string>();
  if (currentReason?.includes('resources')) {
    failures.add('resources');
  }
  if (currentReason?.includes('assignments')) {
    failures.add('assignments');
  }
  if (currentReason?.includes('announcements')) {
    failures.add('announcements');
  }
  if (currentReason?.includes('messages')) {
    failures.add('messages');
  }
  if (currentReason?.includes('events')) {
    failures.add('events');
  }
  failures.add(failedResource);

  if (failures.size === 1) {
    return `canvas_${failedResource}_collector_failed`;
  }

  return `canvas_${Array.from(failures).sort().join('_and_')}_collectors_failed`;
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
        grades: {
          supported: ctx.site === 'canvas',
          modes: ['official_api'],
          preferredMode: 'official_api',
        },
        resources: {
          supported: ctx.site === 'canvas',
          modes: ['official_api'],
          preferredMode: 'official_api',
        },
        messages: {
          supported: ctx.site === 'canvas',
          modes: ['official_api'],
          preferredMode: 'official_api',
        },
        events: {
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
      const coursesCollector = new CanvasCoursesApiCollector(this.client);
      const coursesPipeline = await runCollectorPipeline(ctx, [coursesCollector]);
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

      const resourcesCollector = new CanvasResourcesApiCollector(this.client, coursesCollector.lastRawCourses);
      try {
        const resources = await resourcesCollector.collect();
        attemptsByResource.resources = [
          {
            mode: resourcesCollector.mode,
            collectorName: resourcesCollector.name,
            attemptedAt: ctx.now,
            success: true,
          },
        ];
        snapshot.resources = z.array(ResourceSchema).parse(resources);
      } catch (error) {
        const errorReason = error instanceof Error ? error.message : 'collector_failed';
        attemptsByResource.resources = [
          {
            mode: resourcesCollector.mode,
            collectorName: resourcesCollector.name,
            attemptedAt: ctx.now,
            success: false,
            errorReason,
          },
        ];

        if (error instanceof PartialCanvasResourcesError) {
          snapshot.resources = z.array(ResourceSchema).parse(error.resources);
        }

        outcome = 'partial_success';
        health = HealthStatusSchema.parse({
          status: 'degraded',
          checkedAt: ctx.now,
          code: 'partial_success',
          reason: mergePartialReason(health.reason, 'resources'),
        });
      }

      const assignmentsCollector = new CanvasAssignmentsApiCollector(this.client, courseIds);
      try {
        const assignmentIdsByCourse = new Map<string, string[]>();
        const assignments = await assignmentsCollector.collect(ctx);
        for (const rawAssignment of assignmentsCollector.lastRawAssignments) {
          const courseId = String(rawAssignment.course_id);
          const assignmentId = String(rawAssignment.id);
          assignmentIdsByCourse.set(courseId, [...(assignmentIdsByCourse.get(courseId) ?? []), assignmentId]);
        }
        attemptsByResource.assignments = [
          {
            mode: assignmentsCollector.mode,
            collectorName: assignmentsCollector.name,
            attemptedAt: ctx.now,
            success: true,
          },
        ];
        snapshot.assignments = z.array(AssignmentSchema).parse(assignments);
        snapshot.grades = assignmentsCollector.lastRawAssignments
          .map((rawAssignment) => normalizeGrade(rawAssignment))
          .filter((grade): grade is Grade => Boolean(grade));
        attemptsByResource.grades = [
          {
            mode: assignmentsCollector.mode,
            collectorName: 'CanvasGradesFromAssignmentsCollector',
            attemptedAt: ctx.now,
            success: true,
          },
        ];

        try {
          const feedbackByAssignmentId = new Map<string, CanvasRawSubmission>();
          for (const [courseId, assignmentIds] of assignmentIdsByCourse) {
            const submissions = await this.client.getSubmissionFeedback(courseId, assignmentIds);
            for (const submission of submissions) {
              feedbackByAssignmentId.set(String(submission.assignment_id), submission);
            }
          }

          attemptsByResource.assignments.push({
            mode: assignmentsCollector.mode,
            collectorName: 'CanvasSubmissionFeedbackCollector',
            attemptedAt: ctx.now,
            success: true,
          });
          snapshot.assignments = normalizeAssignments(
            assignmentsCollector.lastRawAssignments,
            ctx.now,
            feedbackByAssignmentId,
          );
        } catch (error) {
          const errorReason = error instanceof Error ? error.message : 'collector_failed';
          attemptsByResource.assignments.push({
            mode: assignmentsCollector.mode,
            collectorName: 'CanvasSubmissionFeedbackCollector',
            attemptedAt: ctx.now,
            success: false,
            errorReason,
          });

          outcome = 'partial_success';
          health = HealthStatusSchema.parse({
            status: 'degraded',
            checkedAt: ctx.now,
            code: 'partial_success',
            reason: 'canvas_assignments_collector_failed',
          });
        }
      } catch (error) {
        const errorReason = error instanceof Error ? error.message : 'collector_failed';
        attemptsByResource.assignments = [
          {
            mode: assignmentsCollector.mode,
            collectorName: assignmentsCollector.name,
            attemptedAt: ctx.now,
            success: false,
            errorReason,
          },
        ];

        if (error instanceof PartialCanvasAssignmentsError) {
          snapshot.assignments = error.assignments.map((rawAssignment) => normalizeAssignment(rawAssignment, ctx.now));
          snapshot.grades = error.assignments
            .map((rawAssignment) => normalizeGrade(rawAssignment))
            .filter((grade): grade is Grade => Boolean(grade));
          attemptsByResource.grades = [
            {
              mode: assignmentsCollector.mode,
              collectorName: 'CanvasGradesFromAssignmentsCollector',
              attemptedAt: ctx.now,
              success: true,
            },
          ];
        } else {
          attemptsByResource.grades = [
            {
              mode: assignmentsCollector.mode,
              collectorName: 'CanvasGradesFromAssignmentsCollector',
              attemptedAt: ctx.now,
              success: false,
              errorReason,
            },
          ];
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
          reason: mergePartialReason(health.reason, 'announcements'),
        });
      }

      const messagesPipeline = await runCollectorPipeline(ctx, [new CanvasMessagesApiCollector(this.client)]);
      attemptsByResource.messages = messagesPipeline.attempts;
      if (messagesPipeline.ok) {
        snapshot.messages = z.array(MessageSchema).parse(messagesPipeline.items);
      } else {
        outcome = 'partial_success';
        health = HealthStatusSchema.parse({
          status: 'degraded',
          checkedAt: ctx.now,
          code: 'partial_success',
          reason: mergePartialReason(health.reason, 'messages'),
        });
      }

      const eventsPipeline = await runCollectorPipeline(ctx, [new CanvasEventsApiCollector(this.client, courseIds)]);
      attemptsByResource.events = eventsPipeline.attempts;
      if (eventsPipeline.ok) {
        snapshot.events = z.array(EventSchema).parse(eventsPipeline.items);
      } else {
        outcome = 'partial_success';
        health = HealthStatusSchema.parse({
          status: 'degraded',
          checkedAt: ctx.now,
          code: 'partial_success',
          reason: mergePartialReason(health.reason, 'events'),
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
