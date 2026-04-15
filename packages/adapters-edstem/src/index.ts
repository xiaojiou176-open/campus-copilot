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
  CourseSchema,
  HealthStatusSchema,
  MessageSchema,
  ResourceSchema,
  type Course,
  type HealthStatus,
  type Message,
  type Resource,
} from '@campus-copilot/schema';
import { z } from 'zod';

type EdStemRequestPath = string;

type EdStemApiFailureCode =
  | 'unauthorized'
  | 'request_failed'
  | 'malformed_response'
  | 'unsupported_context';

export class EdStemApiError extends Error {
  constructor(
    public readonly code: EdStemApiFailureCode,
    message: string,
    public readonly details?: { status?: number },
  ) {
    super(message);
    this.name = 'EdStemApiError';
  }
}

type EdStemRequestResult =
  | {
      ok: true;
      status: number;
      responseUrl: string;
      bodyText: string;
      contentType?: string;
    }
  | {
      ok: false;
      code: EdStemApiFailureCode;
      message: string;
      status?: number;
    };

export type EdStemRequestExecutor = (path: EdStemRequestPath) => Promise<EdStemRequestResult>;

export interface EdStemPathConfig {
  threadsPath: string;
  unreadPath?: string;
  recentActivityPath?: string;
}

const EdStemRawCourseSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    code: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough();

const EdStemRawCourseMembershipSchema = z
  .object({
    course: EdStemRawCourseSchema,
    role: z.unknown().optional(),
    lab: z.unknown().optional(),
    last_active: z.string().nullable().optional(),
  })
  .passthrough();

const EdStemRawUserSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    role: z.string().optional(),
    course_role: z.string().optional(),
  })
  .passthrough();

const EdStemRawThreadSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    user_id: z.union([z.number(), z.string()]).optional(),
    course_id: z.union([z.number(), z.string()]).optional(),
    type: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    unread: z.boolean().optional(),
    is_seen: z.boolean().optional(),
    instructor_authored: z.boolean().optional(),
    url: z.string().nullable().optional(),
  })
  .passthrough();

const EdStemRawResourceSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    course_id: z.union([z.number(), z.string()]).optional(),
    name: z.string().optional(),
    category: z.string().optional(),
    extension: z.string().optional(),
    link: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    staff_only: z.boolean().optional(),
    embedding: z.boolean().optional(),
    release_at: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

const EdStemRawActivitySchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    thread_id: z.union([z.number(), z.string()]).optional(),
    course_id: z.union([z.number(), z.string()]).optional(),
    title: z.string().optional(),
    updated_at: z.string().nullable().optional(),
    unread: z.boolean().optional(),
    instructor_authored: z.boolean().optional(),
    url: z.string().nullable().optional(),
  })
  .passthrough();

const EdStemRawUserPayloadSchema = z
  .object({
    courses: z.array(EdStemRawCourseMembershipSchema).default([]),
  })
  .passthrough();

const EdStemThreadsPayloadSchema = z
  .object({
    threads: z.array(EdStemRawThreadSchema),
    users: z.array(EdStemRawUserSchema).default([]),
  })
  .passthrough();

const EdStemResourcesPayloadSchema = z
  .object({
    resources: z.array(EdStemRawResourceSchema),
  })
  .passthrough();

const EdStemRawLessonSlideSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    lesson_id: z.union([z.number(), z.string()]).optional(),
    course_id: z.union([z.number(), z.string()]).optional(),
    type: z.string().optional(),
    title: z.string().nullable().optional(),
    index: z.number().nullable().optional(),
    status: z.string().nullable().optional(),
  })
  .passthrough();

const EdStemRawLessonSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    course_id: z.union([z.number(), z.string()]),
    module_id: z.union([z.number(), z.string()]).nullable().optional(),
    title: z.string().optional(),
    kind: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    available_at: z.string().nullable().optional(),
    effective_available_at: z.string().nullable().optional(),
    due_at: z.string().nullable().optional(),
    effective_due_at: z.string().nullable().optional(),
    locked_at: z.string().nullable().optional(),
    effective_locked_at: z.string().nullable().optional(),
    solutions_at: z.string().nullable().optional(),
    effective_solutions_at: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    submitted_at: z.string().nullable().optional(),
    attempted_at: z.string().nullable().optional(),
    attempt_id: z.union([z.number(), z.string()]).nullable().optional(),
    attempts_remaining: z.number().nullable().optional(),
    late_submissions: z.boolean().optional(),
    slide_count: z.number().nullable().optional(),
    slides: z.array(EdStemRawLessonSlideSchema).default([]),
  })
  .passthrough();

const EdStemLessonPayloadSchema = z
  .object({
    lesson: EdStemRawLessonSchema,
  })
  .passthrough();

type EdStemRawCourse = z.infer<typeof EdStemRawCourseSchema>;
type EdStemRawCourseMembership = z.infer<typeof EdStemRawCourseMembershipSchema>;
type EdStemRawUser = z.infer<typeof EdStemRawUserSchema>;
type EdStemRawThread = z.infer<typeof EdStemRawThreadSchema>;
type EdStemRawResource = z.infer<typeof EdStemRawResourceSchema>;
type EdStemRawActivity = z.infer<typeof EdStemRawActivitySchema>;
type EdStemRawUserPayload = z.infer<typeof EdStemRawUserPayloadSchema>;
type EdStemThreadsPayload = z.infer<typeof EdStemThreadsPayloadSchema>;
type EdStemResourcesPayload = z.infer<typeof EdStemResourcesPayloadSchema>;
type EdStemRawLesson = z.infer<typeof EdStemRawLessonSchema>;
type EdStemLessonPayload = z.infer<typeof EdStemLessonPayloadSchema>;

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

function buildMessageId(remoteId: string | number) {
  return `edstem:message:${remoteId}`;
}

function toAbsoluteEdStemUrl(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value, 'https://edstem.org').toString();
  } catch {
    return undefined;
  }
}

function normalizeThreadType(rawType: string | undefined): Message['messageKind'] {
  switch (rawType) {
    case 'announcement':
      return 'notice';
    case 'post':
      return 'thread';
    case undefined:
      return 'thread';
    default:
      return 'unknown';
  }
}

function formatFileSize(bytes: number | undefined | null) {
  if (!bytes || bytes <= 0) {
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

function parseEdStemCourseIdFromUrl(pageUrl: string) {
  return pageUrl.match(/\/us\/courses\/(?<courseId>\d+)/)?.groups?.courseId;
}

function parseEdStemLessonIdFromUrl(pageUrl: string) {
  return pageUrl.match(/\/us\/courses\/\d+\/lessons\/(?<lessonId>[^/?#]+)/)?.groups?.lessonId;
}

function buildEdStemResourceDownloadUrl(rawResource: EdStemRawResource) {
  if (rawResource.link) {
    return toAbsoluteEdStemUrl(rawResource.link);
  }

  const resourceId = rawResource.id == null ? undefined : String(rawResource.id);
  const name = rawResource.name ? decodeHtmlText(rawResource.name) : undefined;
  if (!resourceId || !name) {
    return undefined;
  }

  const extension = rawResource.extension ?? '';
  const filename = `${name}${extension}`;
  return `https://us.edstem.org/api/resources/${resourceId}/download/${encodeURIComponent(filename)}?dl=1`;
}

function getEdStemResourceActionLabel(rawResource: EdStemRawResource) {
  if (rawResource.link) {
    return 'Open link';
  }

  if (rawResource.embedding) {
    return 'Open material';
  }

  return 'Download file';
}

function slugifyEdStemResourcePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function buildEdStemResourceGroup(courseId: string, label: string | undefined, memberCount?: number) {
  const normalized = decodeHtmlText(label);
  if (!normalized) {
    return undefined;
  }

  return {
    key: `edstem:resource-group:${courseId}:${slugifyEdStemResourcePart(normalized)}`,
    label: normalized,
    memberCount,
  };
}

function parseEdStemResourcesFromDom(pageHtml: string, pageUrl: string) {
  const courseId = parseEdStemCourseIdFromUrl(pageUrl);
  if (!courseId) {
    return [];
  }

  const sections = Array.from(
    pageHtml.matchAll(/<h2 class="res-group">(?<group>[\s\S]*?)<\/h2>(?<section>[\s\S]*?)(?=<h2 class="res-group">|<\/main>|<\/body>|$)/gi),
  );

  const resources: Resource[] = [];
  for (const [sectionIndex, section] of sections.entries()) {
    const group = decodeHtmlText(section.groups?.group);
    const sectionHtml = section.groups?.section ?? '';
    const rows = Array.from(
      sectionHtml.matchAll(
        /<div class="res-row">[\s\S]*?<div class="res-body (?<bodyClass>[^"]*)"[\s\S]*?<div class="res-name"[^>]*>(?<name>[\s\S]*?)<\/div>[\s\S]*?<div class="res-type"[^>]*>(?<type>[\s\S]*?)<\/div>[\s\S]*?<\/div>\s*<\/div>/gi,
      ),
    );

    const resourceGroup = buildEdStemResourceGroup(courseId, group, rows.length > 0 ? rows.length : undefined);

    for (const [rowIndex, match] of rows.entries()) {
      const title = decodeHtmlText(match.groups?.name);
      const typeLabel = decodeHtmlText(match.groups?.type);
      const bodyClass = match.groups?.bodyClass ?? '';
      if (!title) {
        continue;
      }

      const resourceKind: Resource['resourceKind'] = /type-link/i.test(bodyClass)
        ? 'link'
        : /type-embed/i.test(bodyClass)
          ? 'embed'
          : 'file';
      const detailParts = [typeLabel, group, resourceKind === 'file' ? 'Download file' : undefined].filter(Boolean);
      const resourceId = `edstem:resource:dom:${courseId}:${slugifyEdStemResourcePart(group ?? 'group')}:${slugifyEdStemResourcePart(title)}:${sectionIndex + 1}:${rowIndex + 1}`;

      resources.push(
        ResourceSchema.parse({
          id: resourceId,
          kind: 'resource',
          site: 'edstem',
          source: {
            site: 'edstem',
            resourceId,
            resourceType: 'resource',
            url: pageUrl,
          },
          url: pageUrl,
          courseId: `edstem:course:${courseId}`,
          resourceKind,
          title,
          summary: group,
          detail: detailParts.join(' · '),
          resourceGroup,
        }),
      );
    }
  }

  return resources;
}

function findLatestLessonModuleLabel(prefixHtml: string) {
  const matches = Array.from(
    prefixHtml.matchAll(/<h2 class="lesson-module-header-name"[^>]*>(?<module>[\s\S]*?)<\/h2>/gi),
  );
  const latest = matches.at(-1)?.groups?.module;
  return latest ? decodeHtmlText(stripHtml(latest)) : undefined;
}

function parseEdStemLessonsFromDom(pageHtml: string, pageUrl: string) {
  const courseId = parseEdStemCourseIdFromUrl(pageUrl);
  if (!courseId) {
    return [];
  }

  const lessonRows = Array.from(
    pageHtml.matchAll(
      /<div class="table-listing-row lesi-row"[^>]*>[\s\S]*?<a href="(?<href>\/us\/courses\/[^"\/]+\/lessons\/(?<lessonId>[^"\/]+))" class="table-listing-cell[^"]*tabliscel-flex"[^>]*>[\s\S]*?<div class="tablistext-text">(?<title>[\s\S]*?)<span id="lesson-description-[^"]+" class="sr-only">(?<status>[\s\S]*?)<\/span>[\s\S]*?<div class="lesi-row-subtext">(?<subtext>[\s\S]*?)<\/div>[\s\S]*?<\/a>[\s\S]*?<\/div>/gi,
    ),
  );

  return lessonRows
    .map((match): Resource | undefined => {
      const rowHtml = match[0];
      const lessonId = match.groups?.lessonId;
      const href = match.groups?.href;
      const title = decodeHtmlText(stripHtml(match.groups?.title ?? ''));
      if (!lessonId || !href || !title) {
        return undefined;
      }

      const moduleLabel = findLatestLessonModuleLabel(pageHtml.slice(0, match.index ?? 0));
      const statusText = (decodeHtmlText(stripHtml(match.groups?.status ?? '')) ?? '').replace(/^lesson,\s*/i, '').trim();
      const subtext = decodeHtmlText(
        stripHtml(rowHtml.match(/<div class="lesi-row-subtext">(?<subtext>[\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/a>/i)?.groups?.subtext ?? ''),
      );
      const detailParts = ['Lesson', statusText || undefined, subtext || undefined].filter(Boolean);
      const url = toAbsoluteEdStemUrl(href);

      return ResourceSchema.parse({
        id: `edstem:lesson:${lessonId}`,
        kind: 'resource',
        site: 'edstem',
        source: {
          site: 'edstem',
          resourceId: lessonId,
          resourceType: 'lesson',
          url,
        },
        url,
        courseId: `edstem:course:${courseId}`,
        resourceKind: 'link',
        title,
        summary: moduleLabel,
        detail: detailParts.join(' · '),
      });
    })
    .filter((resource): resource is Resource => Boolean(resource));
}

function buildEdStemLessonSummary(rawLesson: EdStemRawLesson) {
  const slideTypeBreakdown = buildEdStemLessonSlideTypeBreakdown(rawLesson);
  const slideStatusBreakdown = buildEdStemLessonSlideStatusBreakdown(rawLesson);
  const parts = [
    rawLesson.type ? `${rawLesson.type} lesson` : 'Lesson detail',
    rawLesson.status ?? undefined,
    rawLesson.slide_count ? `${rawLesson.slide_count} slide${rawLesson.slide_count === 1 ? '' : 's'}` : undefined,
    slideTypeBreakdown,
    slideStatusBreakdown,
  ].filter(Boolean);

  return parts.join(' · ');
}

function buildEdStemLessonCountBreakdown(
  values: Array<string | undefined>,
  formatLabel: (label: string, count: number) => string,
) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const normalized = decodeHtmlText(value)?.trim().toLowerCase().replace(/[_-]+/g, ' ');
    if (!normalized) {
      continue;
    }

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return undefined;
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([label, count]) => `${count} ${formatLabel(label, count)}`)
    .join(', ');
}

function buildEdStemLessonSlideTypeBreakdown(rawLesson: EdStemRawLesson) {
  return buildEdStemLessonCountBreakdown(
    rawLesson.slides.map((slide) => slide.type ?? undefined),
    (label, count) => (count === 1 ? label : `${label}s`),
  );
}

function buildEdStemLessonSlideStatusBreakdown(rawLesson: EdStemRawLesson) {
  return buildEdStemLessonCountBreakdown(rawLesson.slides.map((slide) => slide.status ?? undefined), (label) => label);
}

function normalizeEdStemLessonStateToken(value: string | undefined | null) {
  return decodeHtmlText(value ?? undefined)?.trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function buildEdStemLessonProgressMeaning(rawLesson: EdStemRawLesson) {
  const statuses = rawLesson.slides
    .map((slide) => normalizeEdStemLessonStateToken(slide.status))
    .filter((status): status is string => Boolean(status));

  if (statuses.length === 0) {
    return undefined;
  }

  const distinctStatuses = Array.from(new Set(statuses));
  if (distinctStatuses.length > 1) {
    return 'Mixed progress';
  }

  switch (distinctStatuses[0]) {
    case 'completed':
      return 'Completed';
    case 'unseen':
    case 'not started':
      return 'Not started';
    case 'attempted':
    case 'started':
    case 'in progress':
      return 'In progress';
    default:
      return decodeHtmlText(distinctStatuses[0]);
  }
}

function buildEdStemLessonSlideActionLabel(
  rawLesson: EdStemRawLesson,
  slide: z.infer<typeof EdStemRawLessonSlideSchema>,
) {
  const slideType = normalizeEdStemLessonStateToken(slide.type);
  const slideStatus = normalizeEdStemLessonStateToken(slide.status);
  const lessonState = normalizeEdStemLessonStateToken(rawLesson.state);

  if (slideStatus === 'completed') {
    if (slideType === 'challenge') {
      return 'Review completed challenge';
    }

    if (slideType === 'document') {
      return 'Review document';
    }

    return 'Review slide';
  }

  if (slideStatus === 'attempted' || slideStatus === 'started' || slideStatus === 'in progress') {
    if (slideType === 'challenge') {
      return 'Continue challenge';
    }

    return 'Continue slide';
  }

  if (slideStatus === 'unseen' || slideStatus === 'not started') {
    if (slideType === 'challenge') {
      return 'Start challenge';
    }

    if (slideType === 'document') {
      return 'Open document';
    }

    return 'Open slide';
  }

  if (lessonState === 'scheduled') {
    return 'Open slide';
  }

  return undefined;
}

function buildEdStemLessonResourceGroup(rawLesson: EdStemRawLesson) {
  const courseId = String(rawLesson.course_id);
  const lessonId = String(rawLesson.id);
  const label = decodeHtmlText(rawLesson.title) ?? `Lesson ${lessonId}`;
  const memberCount = rawLesson.slide_count && rawLesson.slide_count > 0 ? rawLesson.slide_count : rawLesson.slides.length;
  return {
    key: `edstem:resource-group:${courseId}:lesson:${lessonId}`,
    label,
    memberCount: memberCount > 0 ? memberCount : undefined,
  };
}

function buildEdStemLessonDetail(rawLesson: EdStemRawLesson) {
  const slideStatusBreakdown = buildEdStemLessonSlideStatusBreakdown(rawLesson);
  const progressMeaning = buildEdStemLessonProgressMeaning(rawLesson);
  const parts = [
    rawLesson.state ? `State: ${rawLesson.state}` : undefined,
    rawLesson.due_at ?? rawLesson.effective_due_at ? `Due: ${rawLesson.due_at ?? rawLesson.effective_due_at}` : undefined,
    rawLesson.locked_at ?? rawLesson.effective_locked_at
      ? `Locks: ${rawLesson.locked_at ?? rawLesson.effective_locked_at}`
      : undefined,
    rawLesson.effective_solutions_at ? `Solutions: ${rawLesson.effective_solutions_at}` : undefined,
    rawLesson.attempt_id != null ? `Attempt: ${rawLesson.attempt_id}` : undefined,
    rawLesson.attempts_remaining != null ? `Attempts remaining: ${rawLesson.attempts_remaining}` : undefined,
    rawLesson.late_submissions ? 'Late submissions allowed' : undefined,
    slideStatusBreakdown ? `Progress: ${slideStatusBreakdown}` : undefined,
    progressMeaning ? `Meaning: ${progressMeaning}` : undefined,
    rawLesson.slides.length > 0
      ? `Slides: ${rawLesson.slides
          .slice(0, 3)
          .map((slide) =>
            [
              slide.index,
              decodeHtmlText(slide.title ?? undefined),
              decodeHtmlText(slide.type ?? undefined),
              slide.status,
              buildEdStemLessonSlideActionLabel(rawLesson, slide),
            ]
              .filter(Boolean)
              .join(' · '),
          )
          .join('; ')}${rawLesson.slides.length > 3 ? `; +${rawLesson.slides.length - 3} more` : ''}`
      : undefined,
  ].filter(Boolean);

  return parts.join(' · ');
}

function buildEdStemLessonSlideDetail(
  rawLesson: EdStemRawLesson,
  slide: z.infer<typeof EdStemRawLessonSlideSchema>,
) {
  const lessonProgressMeaning = buildEdStemLessonProgressMeaning(rawLesson);
  const parts = [
    slide.index != null ? `Slide ${slide.index}` : 'Lesson slide',
    slide.type ? decodeHtmlText(slide.type) : undefined,
    slide.status ? decodeHtmlText(slide.status) : undefined,
    buildEdStemLessonSlideActionLabel(rawLesson, slide),
  ].filter(Boolean);

  if (lessonProgressMeaning) {
    parts.push(`Lesson progress: ${lessonProgressMeaning}`);
  }

  const lessonState = rawLesson.state ? `Lesson state: ${rawLesson.state}` : undefined;
  if (lessonState) {
    parts.push(lessonState);
  }

  return parts.join(' · ');
}

function normalizeLessonDetail(rawLesson: EdStemRawLesson, pageUrl: string): Resource {
  const courseId = String(rawLesson.course_id);
  const lessonId = String(rawLesson.id);
  const url = toAbsoluteEdStemUrl(`/us/courses/${courseId}/lessons/${lessonId}`);
  const title = decodeHtmlText(rawLesson.title) ?? `Lesson ${lessonId}`;

  return ResourceSchema.parse({
    id: `edstem:lesson:${lessonId}`,
    kind: 'resource',
    site: 'edstem',
    source: {
      site: 'edstem',
      resourceId: lessonId,
      resourceType: 'lesson_detail',
      url: url ?? pageUrl,
    },
    url: url ?? pageUrl,
    courseId: `edstem:course:${courseId}`,
    resourceKind: 'link',
    title,
    summary: buildEdStemLessonSummary(rawLesson),
    detail: buildEdStemLessonDetail(rawLesson),
    releasedAt: rawLesson.available_at ?? rawLesson.effective_available_at ?? rawLesson.created_at ?? undefined,
    updatedAt: rawLesson.updated_at ?? undefined,
  });
}

function normalizeLessonSlideResources(rawLesson: EdStemRawLesson, pageUrl: string): Resource[] {
  const courseId = String(rawLesson.course_id);
  const lessonId = String(rawLesson.id);
  const lessonUrl = toAbsoluteEdStemUrl(`/us/courses/${courseId}/lessons/${lessonId}`);
  const resourceGroup = buildEdStemLessonResourceGroup(rawLesson);

  return rawLesson.slides.map((slide) => {
    const slideId = String(slide.id);
    const slideUrl = toAbsoluteEdStemUrl(`/us/courses/${courseId}/lessons/${lessonId}/slides/${slideId}`) ?? lessonUrl ?? pageUrl;
    const title = decodeHtmlText(slide.title ?? undefined) ?? `Lesson slide ${slide.index ?? slideId}`;

    return ResourceSchema.parse({
      id: `edstem:lesson-slide:${lessonId}:${slideId}`,
      kind: 'resource',
      site: 'edstem',
      source: {
        site: 'edstem',
        resourceId: slideId,
        resourceType: 'lesson_slide',
        url: slideUrl,
      },
      url: slideUrl,
      courseId: `edstem:course:${courseId}`,
      resourceKind: 'link',
      title,
      summary: resourceGroup.label,
      detail: buildEdStemLessonSlideDetail(rawLesson, slide),
      resourceGroup,
      releasedAt: rawLesson.available_at ?? rawLesson.effective_available_at ?? rawLesson.created_at ?? undefined,
      updatedAt: rawLesson.updated_at ?? undefined,
    });
  });
}

function isInstructorRole(rawRole: string | undefined) {
  if (!rawRole) {
    return false;
  }

  return ['admin', 'staff', 'instructor', 'teacher', 'moderator', 'ta'].includes(rawRole.toLowerCase());
}

function buildEdStemSummary(input: {
  content?: string;
  category?: string;
  subcategory?: string;
  fallbackTitle?: string;
}) {
  const prefix = [input.category, input.subcategory].filter(Boolean).join(' / ');
  const summary = stripDiscussionHtml(input.content);

  if (prefix && summary) {
    return `${prefix} · ${summary}`;
  }

  if (summary) {
    return summary;
  }

  return prefix || input.fallbackTitle;
}

function buildEdStemReplySummary(content: string | undefined, replyToCommentId?: string) {
  const summary = stripDiscussionHtml(content);
  if (!summary) {
    return undefined;
  }

  return replyToCommentId ? `Reply to comment ${replyToCommentId} · ${summary}` : summary;
}

function hasVisibleRoleBadge(markup: string, className: string) {
  return new RegExp(
    `class="${className}"(?![^>]*display:\\s*none)[^>]*>[\\s\\S]*?url-segment-role`,
    'i',
  ).test(markup);
}

function normalizeThread(rawThread: EdStemRawThread, author?: EdStemRawUser): Message {
  const resourceId = String(rawThread.id);
  const url = toAbsoluteEdStemUrl(rawThread.url);
  const unread = rawThread.unread ?? (rawThread.is_seen === undefined ? false : !rawThread.is_seen);
  const inferredInstructorAuthored = isInstructorRole(author?.course_role) || isInstructorRole(author?.role);
  return MessageSchema.parse({
    id: buildMessageId(resourceId),
    kind: 'message',
    site: 'edstem',
    source: {
      site: 'edstem',
      resourceId,
      resourceType: rawThread.type === 'announcement' ? 'announcement' : 'thread',
      url,
    },
    url,
    courseId: rawThread.course_id ? `edstem:course:${rawThread.course_id}` : undefined,
    messageKind: normalizeThreadType(rawThread.type),
    threadId: resourceId,
    title: rawThread.title ?? `EdStem thread ${resourceId}`,
    summary: buildEdStemSummary({
      content: rawThread.content ?? undefined,
      category: rawThread.category ?? undefined,
      subcategory: rawThread.subcategory ?? undefined,
    }),
    category: rawThread.category ? decodeHtmlText(rawThread.category) : undefined,
    subcategory: rawThread.subcategory ? decodeHtmlText(rawThread.subcategory) : undefined,
    createdAt: rawThread.created_at ?? rawThread.updated_at ?? undefined,
    updatedAt: rawThread.updated_at ?? rawThread.created_at ?? undefined,
    instructorAuthored: rawThread.instructor_authored ?? inferredInstructorAuthored,
    unread,
  });
}

function normalizeActivity(rawActivity: EdStemRawActivity, resourceType: 'unread_activity' | 'recent_activity'): Message {
  const resourceId = String(rawActivity.id);
  const threadId = rawActivity.thread_id ? String(rawActivity.thread_id) : resourceId;
  const url = toAbsoluteEdStemUrl(rawActivity.url);

  return MessageSchema.parse({
    id: buildMessageId(resourceId),
    kind: 'message',
    site: 'edstem',
    source: {
      site: 'edstem',
      resourceId,
      resourceType,
      url,
    },
    url,
    courseId: rawActivity.course_id ? `edstem:course:${rawActivity.course_id}` : undefined,
    messageKind: 'update',
    threadId,
    title: rawActivity.title ?? `EdStem activity ${resourceId}`,
    summary: buildEdStemSummary({
      fallbackTitle: rawActivity.title ?? `EdStem activity ${resourceId}`,
    }),
    createdAt: rawActivity.updated_at ?? undefined,
    updatedAt: rawActivity.updated_at ?? undefined,
    instructorAuthored: rawActivity.instructor_authored ?? false,
    unread: rawActivity.unread ?? resourceType === 'unread_activity',
  });
}

function normalizePrivateCourse(membership: EdStemRawCourseMembership): Course | undefined {
  const rawCourse = membership.course;
  const courseId = rawCourse.id == null ? undefined : String(rawCourse.id);
  const title = rawCourse.name ? decodeHtmlText(rawCourse.name) : undefined;
  if (!courseId || !title) {
    return undefined;
  }

  return CourseSchema.parse({
    id: `edstem:course:${courseId}`,
    kind: 'course',
    site: 'edstem',
    source: {
      site: 'edstem',
      resourceId: courseId,
      resourceType: 'course',
      url: `https://edstem.org/us/courses/${courseId}`,
    },
    url: `https://edstem.org/us/courses/${courseId}`,
    title,
    code: rawCourse.code ? decodeHtmlText(rawCourse.code) : undefined,
  });
}

function normalizeResource(rawResource: EdStemRawResource): Resource | undefined {
  const resourceId = rawResource.id == null ? undefined : String(rawResource.id);
  const courseId = rawResource.course_id == null ? undefined : String(rawResource.course_id);
  const title = rawResource.name ? decodeHtmlText(rawResource.name) : undefined;
  if (!resourceId || !courseId || !title) {
    return undefined;
  }

  const extension = rawResource.extension ? decodeHtmlText(rawResource.extension) : undefined;
  const detailParts = [
    getEdStemResourceActionLabel(rawResource),
    extension ? extension.replace(/^\./, '').toUpperCase() : undefined,
    formatFileSize(rawResource.size),
    rawResource.staff_only ? 'Staff only' : undefined,
  ].filter(Boolean);

  const downloadUrl = buildEdStemResourceDownloadUrl(rawResource);
  return ResourceSchema.parse({
    id: `edstem:resource:${resourceId}`,
    kind: 'resource',
    site: 'edstem',
    source: {
      site: 'edstem',
      resourceId,
      resourceType: 'resource',
      url: downloadUrl,
    },
    url: downloadUrl,
    downloadUrl,
    courseId: `edstem:course:${courseId}`,
    resourceKind: rawResource.link ? 'link' : rawResource.embedding ? 'embed' : 'file',
    title,
    summary: rawResource.category ? decodeHtmlText(rawResource.category) : undefined,
    detail: detailParts.length > 0 ? detailParts.join(' · ') : undefined,
    fileExtension: extension,
    sizeBytes: rawResource.size ?? undefined,
    releasedAt: rawResource.release_at ?? undefined,
    createdAt: rawResource.created_at ?? rawResource.release_at ?? undefined,
    updatedAt: rawResource.updated_at ?? rawResource.created_at ?? rawResource.release_at ?? undefined,
  });
}

function attachEdStemResourceGroups(resources: Resource[]) {
  const counts = new Map<string, number>();
  for (const resource of resources) {
    if (resource.site !== 'edstem' || !resource.summary || !resource.courseId) {
      continue;
    }
    const key = `${resource.courseId}:${resource.summary}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return resources.map((resource) => {
    if (resource.site !== 'edstem' || !resource.summary || !resource.courseId) {
      return resource;
    }
    const count = counts.get(`${resource.courseId}:${resource.summary}`) ?? 0;
    if (count <= 1) {
      return resource;
    }

    return ResourceSchema.parse({
      ...resource,
      resourceGroup: buildEdStemResourceGroup(resource.courseId.replace(/^edstem:course:/, ''), resource.summary, count),
    });
  });
}

export class EdStemApiClient {
  constructor(
    private readonly executeRequest: EdStemRequestExecutor,
    private readonly paths: EdStemPathConfig,
  ) {}

  private async fetchJson(path: EdStemRequestPath): Promise<unknown> {
    const result = await this.executeRequest(path);
    if (!result.ok) {
      throw new EdStemApiError(result.code, result.message, { status: result.status });
    }

    if (result.status === 401 || result.status === 403) {
      throw new EdStemApiError('unauthorized', 'EdStem session is unauthorized.', { status: result.status });
    }

    if (result.status === 404) {
      throw new EdStemApiError('unsupported_context', 'EdStem session-backed request path is unavailable.', {
        status: result.status,
      });
    }

    if (result.status < 200 || result.status >= 300) {
      throw new EdStemApiError('request_failed', `EdStem request failed with status ${result.status}.`, {
        status: result.status,
      });
    }

    try {
      return JSON.parse(result.bodyText);
    } catch {
      throw new EdStemApiError('malformed_response', 'EdStem returned malformed JSON.', {
        status: result.status,
      });
    }
  }

  private async fetchArray<T>(
    path: string | undefined,
    schema: z.ZodArray<z.ZodType<T>>,
    label: string,
    options?: {
      ignoreUnsupportedContext?: boolean;
      ignoreMalformedResponse?: boolean;
    },
  ): Promise<T[]> {
    if (!path) {
      return [];
    }

    try {
      const payload = await this.fetchJson(path);
      const normalizedPayload =
        label === 'threads' &&
        payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as { threads?: unknown }).threads)
          ? (payload as { threads: unknown[] }).threads
          : payload;

      return schema.parse(normalizedPayload);
    } catch (error) {
      if (error instanceof EdStemApiError) {
        if (options?.ignoreUnsupportedContext && error.code === 'unsupported_context') {
          return [];
        }
        if (options?.ignoreMalformedResponse && error.code === 'malformed_response') {
          return [];
        }
        throw error;
      }

      throw new EdStemApiError('malformed_response', `EdStem ${label} payload is malformed.`);
    }
  }

  async getThreads() {
    const payload = await this.getThreadsPayload();
    return payload.threads;
  }

  async getThreadsPayload(): Promise<EdStemThreadsPayload> {
    try {
      const payload = await this.fetchJson(this.paths.threadsPath);
      const normalizedPayload = Array.isArray(payload) ? { threads: payload, users: [] } : payload;
      return EdStemThreadsPayloadSchema.parse(normalizedPayload);
    } catch (error) {
      if (error instanceof EdStemApiError) {
        throw error;
      }

      throw new EdStemApiError('malformed_response', 'EdStem threads payload is malformed.');
    }
  }

  async getUnreadActivity() {
    return this.fetchArray(this.paths.unreadPath, z.array(EdStemRawActivitySchema), 'unread activity', {
      ignoreUnsupportedContext: true,
      ignoreMalformedResponse: true,
    });
  }

  async getRecentActivity() {
    return this.fetchArray(this.paths.recentActivityPath, z.array(EdStemRawActivitySchema), 'recent activity', {
      ignoreUnsupportedContext: true,
      ignoreMalformedResponse: true,
    });
  }

  async getUserCourses(): Promise<EdStemRawCourseMembership[]> {
    try {
      const payload = await this.fetchJson('/api/user');
      const userPayload = EdStemRawUserPayloadSchema.parse(payload);
      return userPayload.courses;
    } catch (error) {
      if (error instanceof EdStemApiError) {
        throw error;
      }

      throw new EdStemApiError('malformed_response', 'EdStem user payload is malformed.');
    }
  }

  async getResources(courseId: string): Promise<EdStemRawResource[]> {
    try {
      const payload = await this.fetchJson(`/api/courses/${courseId}/resources`);
      return EdStemResourcesPayloadSchema.parse(payload).resources;
    } catch (error) {
      if (error instanceof EdStemApiError) {
        throw error;
      }

      throw new EdStemApiError('malformed_response', 'EdStem resources payload is malformed.');
    }
  }

  getConfiguredPaths() {
    return this.paths;
  }

  async getLessonDetail(lessonId: string): Promise<EdStemRawLesson> {
    try {
      const payload = EdStemLessonPayloadSchema.parse(
        await this.fetchJson(`/api/lessons/${lessonId}?view=1`),
      ) as EdStemLessonPayload;
      return payload.lesson;
    } catch {
      throw new EdStemApiError('malformed_response', 'EdStem lesson payload is malformed.');
    }
  }
}

export type EdStemSyncOutcome = SiteSyncOutcome;
export interface EdStemSnapshot extends SiteSnapshot {
  courses?: Course[];
  messages?: Message[];
  resources?: Resource[];
}
export type EdStemSyncResult =
  | (SiteSyncSuccess & {
      site: 'edstem';
      snapshot: EdStemSnapshot;
    })
  | (SiteSyncFailure & {
      site: 'edstem';
    });

type EdStemSyncFailure = Extract<EdStemSyncResult, { ok: false }>;

class EdStemMessagesPrivateCollector implements ResourceCollector<Message> {
  readonly name = 'EdStemMessagesPrivateCollector';
  readonly resource = 'messages';
  readonly mode = 'private_api' as const;
  readonly priority = 10;

  constructor(private readonly client: EdStemApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'edstem';
  }

  async collect(ctx: AdapterContext) {
    const [threadsPayload, unreadActivity, recentActivity] = await Promise.all([
      this.client.getThreadsPayload(),
      this.client.getUnreadActivity(),
      this.client.getRecentActivity(),
    ]);
    const threadUsers = new Map(
      threadsPayload.users.map((user) => [String(user.id), user] satisfies [string, EdStemRawUser]),
    );

    const messages = [
      ...threadsPayload.threads.map((thread) =>
        normalizeThread(
          thread,
          thread.user_id == null ? undefined : threadUsers.get(String(thread.user_id)),
        ),
      ),
      ...unreadActivity.map((item) => normalizeActivity(item, 'unread_activity')),
      ...recentActivity.map((item) => normalizeActivity(item, 'recent_activity')),
    ];

    const deduped = new Map(messages.map((message) => [message.id, message]));
    for (const detailMessage of parseDirectThreadMessages(ctx.pageHtml ?? '', ctx.url) ?? []) {
      const existingMessage = deduped.get(detailMessage.id);
      deduped.set(
        detailMessage.id,
        existingMessage
          ? MessageSchema.parse({
              ...existingMessage,
              ...detailMessage,
              unread: detailMessage.unread ?? existingMessage.unread,
            })
          : detailMessage,
      );
    }
    return Array.from(deduped.values());
  }
}

class EdStemCoursesPrivateCollector implements ResourceCollector<Course> {
  readonly name = 'EdStemCoursesPrivateCollector';
  readonly resource = 'courses';
  readonly mode = 'private_api' as const;
  readonly priority = 10;

  constructor(private readonly client: EdStemApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'edstem';
  }

  async collect() {
    return this.client.getUserCourses().then((memberships) =>
      memberships
        .map(normalizePrivateCourse)
        .filter((course): course is Course => Boolean(course)),
    );
  }
}

class EdStemMessagesDomCollector implements ResourceCollector<Message> {
  readonly name = 'EdStemMessagesDomCollector';
  readonly resource = 'messages';
  readonly mode = 'dom' as const;
  readonly priority = 20;

  async supports(ctx: AdapterContext) {
    return ctx.site === 'edstem' && Boolean(ctx.pageHtml);
  }

  async collect(ctx: AdapterContext) {
    const html = ctx.pageHtml ?? '';
    const directThreadMessages = parseDirectThreadMessages(html, ctx.url);
    if (directThreadMessages && directThreadMessages.length > 0) {
      return directThreadMessages;
    }

    const discussionMatches = Array.from(
      html.matchAll(
        /<a[^>]+href="\/us\/courses\/(?<courseId>\d+)\/discussion\/(?<threadId>\d+)"[^>]*>(?<content>[\s\S]*?)<\/a>/g,
      ),
    );

    const discussionMessages = discussionMatches
      .map((match) => {
        const courseId = match.groups?.courseId;
        const threadId = match.groups?.threadId;
        const content = stripDiscussionHtml(match.groups?.content);
        if (!courseId || !threadId || !content) {
          return undefined;
        }

        return MessageSchema.parse({
          id: buildMessageId(threadId),
          kind: 'message',
          site: 'edstem',
          source: {
            site: 'edstem',
            resourceId: threadId,
            resourceType: 'thread',
            url: `https://edstem.org/us/courses/${courseId}/discussion/${threadId}`,
          },
          url: `https://edstem.org/us/courses/${courseId}/discussion/${threadId}`,
          courseId: `edstem:course:${courseId}`,
          messageKind: 'thread',
          threadId,
          title: content,
          unread: /unread/i.test(content),
          instructorAuthored: /staff/i.test(content),
        });
      })
      .filter((message): message is Message => Boolean(message));

    if (discussionMessages.length > 0) {
      return discussionMessages;
    }

    const messages = parseDashboardCourseCards(html)
      .map((course) => {
        const unread = Boolean(course.unreadCountText && course.unreadCountText !== '0');

        return MessageSchema.parse({
          id: `edstem:message:dashboard-course:${course.courseId}`,
          kind: 'message',
          site: 'edstem',
          source: {
            site: 'edstem',
            resourceId: course.courseId,
            resourceType: 'dashboard_course',
            url: course.url,
          },
          url: course.url,
          courseId: `edstem:course:${course.courseId}`,
          messageKind: 'update',
          threadId: course.courseId,
          title: `${course.courseCode} ${course.courseName}`,
          unread,
          instructorAuthored: false,
        });
      })
      .filter((message): message is Message => Boolean(message));

    if (messages.length === 0) {
      throw new EdStemApiError('unsupported_context', 'EdStem DOM fallback found no dashboard course cards.');
    }

    return messages;
  }
}

class EdStemResourcesPrivateCollector implements ResourceCollector<Resource> {
  readonly name = 'EdStemResourcesPrivateCollector';
  readonly resource = 'resources';
  readonly mode = 'private_api' as const;
  readonly priority = 10;

  constructor(private readonly client: EdStemApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'edstem' && Boolean(parseEdStemCourseIdFromUrl(ctx.url)) && !/\/lessons(?:\/|$)/.test(ctx.url);
  }

  async collect(ctx: AdapterContext) {
    const courseId = parseEdStemCourseIdFromUrl(ctx.url);
    if (!courseId) {
      throw new EdStemApiError('unsupported_context', 'EdStem resources require a course-scoped URL.');
    }

    return this.client.getResources(courseId).then((resources) =>
      attachEdStemResourceGroups(
        resources.map(normalizeResource).filter((resource): resource is Resource => Boolean(resource)),
      ),
    );
  }
}

class EdStemResourcesDomCollector implements ResourceCollector<Resource> {
  readonly name = 'EdStemResourcesDomCollector';
  readonly resource = 'resources';
  readonly mode = 'dom' as const;
  readonly priority = 20;

  async supports(ctx: AdapterContext) {
    return ctx.site === 'edstem' && Boolean(parseEdStemCourseIdFromUrl(ctx.url)) && Boolean(ctx.pageHtml?.includes('res-group'));
  }

  async collect(ctx: AdapterContext) {
    if (!ctx.pageHtml?.trim()) {
      throw new EdStemApiError('unsupported_context', 'EdStem resources DOM fallback needs page HTML.');
    }

    const resources = parseEdStemResourcesFromDom(ctx.pageHtml, ctx.url);
    if (resources.length === 0) {
      throw new EdStemApiError('unsupported_context', 'EdStem resources DOM fallback found no resource rows.');
    }

    return resources;
  }
}

class EdStemLessonsDomCollector implements ResourceCollector<Resource> {
  readonly name = 'EdStemLessonsDomCollector';
  readonly resource = 'resources';
  readonly mode = 'dom' as const;
  readonly priority = 15;

  async supports(ctx: AdapterContext) {
    return (
      ctx.site === 'edstem' &&
      /\/lessons(?:\/|$)/.test(ctx.url) &&
      Boolean(parseEdStemCourseIdFromUrl(ctx.url)) &&
      Boolean(ctx.pageHtml?.includes('lesson-module-header-name')) &&
      Boolean(ctx.pageHtml?.includes('table-listing-row lesi-row'))
    );
  }

  async collect(ctx: AdapterContext) {
    if (!ctx.pageHtml?.trim()) {
      throw new EdStemApiError('unsupported_context', 'EdStem lessons DOM fallback needs page HTML.');
    }

    const resources = parseEdStemLessonsFromDom(ctx.pageHtml, ctx.url);
    if (resources.length === 0) {
      throw new EdStemApiError('unsupported_context', 'EdStem lessons DOM fallback found no lesson rows.');
    }

    return resources;
  }
}

class EdStemLessonDetailPrivateCollector implements ResourceCollector<Resource> {
  readonly name = 'EdStemLessonDetailPrivateCollector';
  readonly resource = 'resources';
  readonly mode = 'private_api' as const;
  readonly priority = 12;

  constructor(private readonly client: EdStemApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'edstem' && Boolean(parseEdStemLessonIdFromUrl(ctx.url));
  }

  async collect(ctx: AdapterContext) {
    const lessonId = parseEdStemLessonIdFromUrl(ctx.url);
    if (!lessonId) {
      throw new EdStemApiError('unsupported_context', 'EdStem lesson detail requires a lesson-scoped URL.');
    }

    const lesson = await this.client.getLessonDetail(lessonId);
    return [normalizeLessonDetail(lesson, ctx.url), ...normalizeLessonSlideResources(lesson, ctx.url)];
  }
}

type DashboardCourseCard = {
  courseId: string;
  courseCode: string;
  courseName: string;
  unreadCountText?: string;
  url: string;
};

function parseDirectThreadMessages(pageHtml: string, pageUrl: string): Message[] | undefined {
  const match = pageUrl.match(/\/us\/courses\/(?<courseId>\d+)\/discussion\/(?<threadId>\d+)/);
  const courseId = match?.groups?.courseId;
  const threadId = match?.groups?.threadId;
  if (!courseId || !threadId || !pageHtml.includes('disthrb-title')) {
    return undefined;
  }

  const title = stripDiscussionHtml(pageHtml.match(/<h2 class="disthrb-title"[^>]*>(?<title>[\s\S]*?)<\/h2>/)?.groups?.title);
  const category = decodeHtmlText(
    pageHtml.match(/<span class="disthrb-category"[^>]*>(?<category>[\s\S]*?)<\/span>/)?.groups?.category,
  );
  const threadContent = pageHtml.match(
    /<div class="[^"]*disthrb-amber-display[^"]*"[^>]*>(?<content>[\s\S]*?)<\/div>\s*<div class="threadActions/i,
  )?.groups?.content;
  const threadCreatedAt = pageHtml.match(
    /<a[^>]+href="\/us\/courses\/\d+\/discussion\/\d+"[^>]*>[\s\S]*?<time datetime="(?<createdAt>[^"]+)"/i,
  )?.groups?.createdAt;
  const threadSummary = buildEdStemSummary({
    content: threadContent,
    category,
    fallbackTitle: title ?? `EdStem thread ${threadId}`,
  });

  if (!title && !threadSummary) {
    return undefined;
  }

  const messages: Message[] = [
    MessageSchema.parse({
      id: buildMessageId(threadId),
      kind: 'message',
      site: 'edstem',
      source: {
        site: 'edstem',
        resourceId: threadId,
        resourceType: 'thread',
        url: `https://edstem.org/us/courses/${courseId}/discussion/${threadId}`,
      },
      url: `https://edstem.org/us/courses/${courseId}/discussion/${threadId}`,
      courseId: `edstem:course:${courseId}`,
      messageKind: 'thread',
      threadId,
      title: title ?? `EdStem thread ${threadId}`,
      summary: threadSummary,
      category,
      createdAt: threadCreatedAt,
      updatedAt: threadCreatedAt,
      instructorAuthored: hasVisibleRoleBadge(pageHtml, 'user-role-label disthrb-role'),
    }),
  ];

  const replyMatches = Array.from(
    pageHtml.matchAll(
      /<div class="discuss-comment"[^>]*data-comment-id="(?<commentId>\d+)"[\s\S]*?<a[^>]*class="[^"]*discom-date[^"]*"[^>]*>[\s\S]*?<time datetime="(?<createdAt>[^"]+)"[\s\S]*?<\/time>\s*<\/a>[\s\S]*?(?:<a[^>]*class="[^"]*discuss-replying-to[^"]*"[^>]*href="[^"]*comment=(?<replyTo>\d+)"[^>]*>[\s\S]*?<\/a>)?[\s\S]*?<div class="[^"]*discom-content[^"]*"[^>]*>(?<content>[\s\S]*?)<\/div>\s*<div class="threadActions/gi,
    ),
  );

  for (const replyMatch of replyMatches) {
    const commentId = replyMatch.groups?.commentId;
    const createdAt = replyMatch.groups?.createdAt;
    const content = replyMatch.groups?.content;
    const replyToCommentId =
      replyMatch.groups?.replyTo ??
      replyMatch[0].match(/class="[^"]*discuss-replying-to[^"]*"[^>]*href="[^"]*comment=(?<replyTo>\d+)"/i)?.groups
        ?.replyTo;
    const summary = buildEdStemReplySummary(content, replyToCommentId);
    if (!commentId || !summary) {
      continue;
    }

    messages.push(
      MessageSchema.parse({
        id: buildMessageId(commentId),
        kind: 'message',
        site: 'edstem',
        source: {
          site: 'edstem',
          resourceId: commentId,
          resourceType: 'reply',
          url: `https://edstem.org/us/courses/${courseId}/discussion/${threadId}?comment=${commentId}`,
        },
        url: `https://edstem.org/us/courses/${courseId}/discussion/${threadId}?comment=${commentId}`,
        courseId: `edstem:course:${courseId}`,
        messageKind: 'reply',
        threadId,
        summary,
        createdAt,
        updatedAt: createdAt,
        instructorAuthored: hasVisibleRoleBadge(replyMatch[0], 'user-role-label discom-user-role'),
      }),
    );
  }

  return messages;
}

function parseDashboardCourseCards(pageHtml: string): DashboardCourseCard[] {
  return Array.from(
    pageHtml.matchAll(
      /<a[^>]+href="\/us\/courses\/(?<courseId>\d+)"[^>]*class="[^"]*dash-course[^"]*"[\s\S]*?<div[^>]*class="dash-course-code"[^>]*>(?<courseCode>[\s\S]*?)<\/div>[\s\S]*?(?:<div[^>]*class="dash-course-unread-count"[^>]*>(?<unreadCount>[\s\S]*?)<\/div>)?[\s\S]*?<div[^>]*class="dash-course-name"[^>]*>(?<courseName>[\s\S]*?)<\/div>/g,
    ),
  ).flatMap((match): DashboardCourseCard[] => {
    const courseId = match.groups?.courseId;
    const courseCode = decodeHtmlText(match.groups?.courseCode);
    const courseName = decodeHtmlText(match.groups?.courseName);
    if (!courseId || !courseCode || !courseName) {
      return [];
    }

    return [
      {
        courseId,
        courseCode,
        courseName,
        unreadCountText: decodeHtmlText(match.groups?.unreadCount),
        url: `https://edstem.org/us/courses/${courseId}`,
      },
    ];
  });
}

function normalizeDashboardCourse(course: DashboardCourseCard): Course {
  return CourseSchema.parse({
    id: `edstem:course:${course.courseId}`,
    kind: 'course',
    site: 'edstem',
    source: {
      site: 'edstem',
      resourceId: course.courseId,
      resourceType: 'course',
      url: course.url,
    },
    url: course.url,
    title: course.courseName,
    code: course.courseCode,
  });
}

function parseDiscussionCourse(pageHtml: string | undefined, pageUrl: string) {
  const courseId = pageUrl.match(/\/us\/courses\/(?<courseId>\d+)/)?.groups?.courseId;
  if (!courseId || !pageHtml) {
    return undefined;
  }

  const titleMatch = pageHtml.match(/<title>(?:\(\d+\)\s*)?(?<title>[^<]+?)\s+[–-]\s+Ed Discussion<\/title>/i);
  const title = decodeHtmlText(titleMatch?.groups?.title) ?? `EdStem course ${courseId}`;

  return CourseSchema.parse({
    id: `edstem:course:${courseId}`,
    kind: 'course',
    site: 'edstem',
    source: {
      site: 'edstem',
      resourceId: courseId,
      resourceType: 'course',
      url: `https://edstem.org/us/courses/${courseId}`,
    },
    url: `https://edstem.org/us/courses/${courseId}`,
    title,
  });
}

class EdStemCoursesDomCollector implements ResourceCollector<Course> {
  readonly name = 'EdStemCoursesDomCollector';
  readonly resource = 'courses';
  readonly mode = 'dom' as const;
  readonly priority = 20;

  async supports(ctx: AdapterContext) {
    return ctx.site === 'edstem' && Boolean(ctx.pageHtml);
  }

  async collect(ctx: AdapterContext) {
    const html = ctx.pageHtml ?? '';
    const dashboardCourses = parseDashboardCourseCards(html).map(normalizeDashboardCourse);
    if (dashboardCourses.length > 0) {
      return dashboardCourses;
    }

    const currentCourse = parseDiscussionCourse(html, ctx.url);
    if (currentCourse) {
      return [currentCourse];
    }

    throw new EdStemApiError('unsupported_context', 'EdStem DOM fallback found no course metadata.');
  }
}

function stripDiscussionHtml(value: string | undefined) {
  return decodeHtmlText(
    value
      ?.replace(/<svg[\s\S]*?<\/svg>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\b(STAFF|Pinned|Answered|General|Social|Final)\b/gi, ' $1 '),
  );
}

function buildEdStemFailure(
  outcome: Exclude<EdStemSyncOutcome, 'success' | 'partial_success'>,
  errorReason: string,
  syncedAt: string,
  code: HealthStatus['code'],
  attemptsByResource?: AttemptsByResource,
): EdStemSyncFailure {
  return {
    ok: false,
    site: 'edstem',
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

function mapEdStemFailureToSyncOutcome(
  error: unknown,
  syncedAt: string,
  attemptsByResource?: AttemptsByResource,
): EdStemSyncFailure {
  if (error instanceof EdStemApiError) {
    switch (error.code) {
      case 'unauthorized':
        return buildEdStemFailure('not_logged_in', error.message, syncedAt, 'logged_out', attemptsByResource);
      case 'unsupported_context':
        return buildEdStemFailure('unsupported_context', error.message, syncedAt, 'unsupported_context', attemptsByResource);
      case 'malformed_response':
        return buildEdStemFailure('normalize_failed', error.message, syncedAt, 'normalize_failed', attemptsByResource);
      case 'request_failed':
      default:
        return buildEdStemFailure('request_failed', error.message, syncedAt, 'collector_failed', attemptsByResource);
    }
  }

  return buildEdStemFailure(
    'request_failed',
    error instanceof Error ? error.message : 'EdStem sync failed.',
    syncedAt,
    'collector_failed',
    attemptsByResource,
  );
}

export class EdStemAdapter implements SiteAdapter {
  readonly site = 'edstem' as const;

  constructor(private readonly client?: EdStemApiClient) {}

  async canRun(ctx: AdapterContext): Promise<boolean> {
    return ctx.site === 'edstem';
  }

  async getCapabilities(ctx: AdapterContext): Promise<AdapterCapabilities> {
    const supportedModes = this.client ? (['private_api', 'dom'] as const) : (['dom'] as const);
    return {
      privateApi: Boolean(this.client),
      pageState: false,
      dom: true,
      resources: {
        courses: {
          supported: ctx.site === 'edstem',
          modes: [...supportedModes],
          preferredMode: this.client ? 'private_api' : 'dom',
        },
        messages: {
          supported: ctx.site === 'edstem',
          modes: [...supportedModes],
          preferredMode: this.client ? 'private_api' : 'dom',
        },
        resources: {
          supported: ctx.site === 'edstem',
          modes: this.client ? ['private_api', 'dom'] : ['dom'],
          preferredMode: this.client ? 'private_api' : 'dom',
        },
      },
    };
  }

  async healthCheck(ctx: AdapterContext): Promise<HealthStatus> {
    return HealthStatusSchema.parse({
      status: ctx.site === 'edstem' ? 'healthy' : 'unavailable',
      checkedAt: ctx.now,
      code: ctx.site === 'edstem' ? 'supported' : 'unsupported_context',
      reason: ctx.site === 'edstem' ? 'edstem_private_api_with_dom_fallback' : 'unsupported_context',
    });
  }

  async sync(ctx: AdapterContext): Promise<EdStemSyncResult> {
    const attemptsByResource: AttemptsByResource = {};
    const collectors: ResourceCollector<Message>[] = [];
    const courseCollectors: ResourceCollector<Course>[] = [];
    const resourceCollectors: ResourceCollector<Resource>[] = [];

    if (this.client) {
      collectors.push(new EdStemMessagesPrivateCollector(this.client));
      courseCollectors.push(new EdStemCoursesPrivateCollector(this.client));
      resourceCollectors.push(new EdStemResourcesPrivateCollector(this.client));
      resourceCollectors.push(new EdStemLessonDetailPrivateCollector(this.client));
    }
    collectors.push(new EdStemMessagesDomCollector());
    courseCollectors.push(new EdStemCoursesDomCollector());
    resourceCollectors.push(new EdStemLessonsDomCollector());
    resourceCollectors.push(new EdStemResourcesDomCollector());

    try {
      const messagesPipeline = await runCollectorPipeline(ctx, collectors);
      attemptsByResource.messages = messagesPipeline.attempts;
      const coursesPipeline = await runCollectorPipeline(ctx, courseCollectors);
      attemptsByResource.courses = coursesPipeline.attempts;
      const resourcesPipeline = await runCollectorPipeline(ctx, resourceCollectors);
      attemptsByResource.resources = resourcesPipeline.attempts;

      if (!messagesPipeline.ok) {
        return buildEdStemFailure(
          'collector_failed',
          messagesPipeline.errorReason,
          ctx.now,
          'collector_failed',
          attemptsByResource,
        );
      }

      const hasCourseGap = !coursesPipeline.ok;
      const hasResourceGap = !resourcesPipeline.ok && resourcesPipeline.errorReason !== 'no_supported_collectors';
      const hasFallbackSuccess =
        messagesPipeline.winningMode === 'dom' ||
        (coursesPipeline.ok ? coursesPipeline.winningMode === 'dom' : false) ||
        (resourcesPipeline.ok ? resourcesPipeline.winningMode === 'dom' : false);
      const hasPartialSuccess = hasCourseGap || hasResourceGap || hasFallbackSuccess;
      const fallbackReason = hasCourseGap
        ? 'edstem_course_metadata_partial'
        : hasResourceGap
          ? 'edstem_resources_partial'
        : resourcesPipeline.ok && resourcesPipeline.winningMode === 'dom'
          ? 'edstem_resources_dom_fallback'
        : hasFallbackSuccess
          ? 'edstem_dashboard_dom_fallback'
          : 'edstem_sync_success';
      return {
        ok: true,
        site: 'edstem',
        outcome: hasPartialSuccess ? 'partial_success' : 'success',
        snapshot: {
          courses: coursesPipeline.ok ? z.array(CourseSchema).parse(coursesPipeline.items) : undefined,
          messages: z.array(MessageSchema).parse(messagesPipeline.items),
          resources: resourcesPipeline.ok ? z.array(ResourceSchema).parse(resourcesPipeline.items) : undefined,
        },
        syncedAt: ctx.now,
        health: HealthStatusSchema.parse({
          status: hasPartialSuccess ? 'degraded' : 'healthy',
          checkedAt: ctx.now,
          code: hasPartialSuccess ? 'partial_success' : 'supported',
          reason: fallbackReason,
        }),
        attemptsByResource,
      };
    } catch (error) {
      return mapEdStemFailureToSyncOutcome(error, ctx.now, attemptsByResource);
    }
  }
}

export function createEdStemAdapter(client?: EdStemApiClient) {
  return new EdStemAdapter(client);
}
