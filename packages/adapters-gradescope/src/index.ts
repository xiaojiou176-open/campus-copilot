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
  ResourceSchema,
  type Assignment,
  type AssignmentStatus,
  type Course,
  type Grade,
  type HealthStatus,
  type Resource,
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

const GradescopeSubmissionViewerAssignmentSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    title: z.string().optional(),
    total_points: NumericLikeSchema,
    regrade_requests_open: z.boolean().optional(),
  })
  .passthrough();

const GradescopeSubmissionViewerSubmissionSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    score: NumericLikeSchema,
  })
  .passthrough();

const GradescopeSubmissionViewerPastSubmissionSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    created_at: z.string().nullable().optional(),
    active: z.boolean().optional(),
    show_path: z.string().optional(),
  })
  .passthrough();

const GradescopeSubmissionViewerPathsSchema = z
  .object({
    graded_pdf_path: z.string().optional(),
    regrade_requests_path: z.string().optional(),
  })
  .passthrough();

const GradescopeSubmissionViewerQuestionSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    index: z.number().optional(),
    full_index: z.string().optional(),
    numbered_title: z.string().optional(),
    title: z.string().optional(),
    weight: NumericLikeSchema,
  })
  .passthrough();

const GradescopeSubmissionViewerQuestionSubmissionSchema = z
  .object({
    question_id: z.union([z.number(), z.string()]),
    score: NumericLikeSchema,
    active: z.boolean().optional(),
    annotations: z
      .array(
        z
          .object({
            id: z.union([z.number(), z.string()]).optional(),
            page_number: z.number().optional(),
            geometry_type: z.string().optional(),
            question_submission_id: z.union([z.number(), z.string()]).optional(),
            annotatable_id: z.union([z.number(), z.string()]).optional(),
            annotatable_type: z.string().optional(),
            content: z.string().nullable().optional(),
            coordinates: z.unknown().optional(),
            style: z.unknown().optional(),
            links: z
              .array(
                z
                  .object({
                    annotation_comments: z.record(z.string(), z.array(z.unknown())).optional(),
                    rubric_item: z
                      .object({
                        description: z.string().optional(),
                      })
                      .passthrough()
                      .optional(),
                  })
                  .passthrough(),
              )
              .default([]),
          })
          .passthrough(),
      )
      .default([]),
    evaluations: z
      .array(
        z
          .object({
            points: NumericLikeSchema,
            comments: z.string().nullable().optional(),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

const GradescopeSubmissionViewerRubricItemSchema = z
  .object({
    question_id: z.union([z.number(), z.string()]),
    description: z.string().optional(),
    weight: NumericLikeSchema,
    position: z.number().optional(),
    present: z.boolean().optional(),
  })
  .passthrough();

const GradescopeSubmissionViewerPropsSchema = z
  .object({
    assignment: GradescopeSubmissionViewerAssignmentSchema,
    assignment_submission: GradescopeSubmissionViewerSubmissionSchema,
    questions: z.array(GradescopeSubmissionViewerQuestionSchema).default([]),
    question_submissions: z.array(GradescopeSubmissionViewerQuestionSubmissionSchema).default([]),
    rubric_items: z.array(GradescopeSubmissionViewerRubricItemSchema).default([]),
    past_submissions: z.array(GradescopeSubmissionViewerPastSubmissionSchema).default([]),
    paths: GradescopeSubmissionViewerPathsSchema.optional(),
  })
  .passthrough();

type GradescopeRawCourse = z.infer<typeof GradescopeRawCourseSchema>;
type GradescopeRawAssignment = z.infer<typeof GradescopeRawAssignmentSchema>;
type GradescopeRawGrade = z.infer<typeof GradescopeRawGradeSchema>;
type GradescopeSubmissionViewerProps = z.infer<typeof GradescopeSubmissionViewerPropsSchema>;
type GradescopeSubmissionViewerQuestion = z.infer<typeof GradescopeSubmissionViewerQuestionSchema>;
type GradescopeDerivedCourseHint = {
  courseId: string;
  title?: string;
};
type GradescopeRubricCriterion = {
  label: string;
  points?: number;
};
type GradescopeSubmissionQuestion = {
  label: string;
  title?: string;
  modality?: 'autograder' | 'manual';
  score?: number;
  maxScore?: number;
  rubricLabels?: string[];
  rubricCriteria?: GradescopeRubricCriterion[];
  evaluationComments?: string[];
  annotationCount?: number;
  annotationPreview?: string;
  annotationPages?: number[];
};
type GradescopeSubmissionDetail = {
  courseId: string;
  assignmentId: string;
  url: string;
  title: string;
  submissionId?: string;
  status: AssignmentStatus;
  score?: number;
  maxScore?: number;
  questions: GradescopeSubmissionQuestion[];
  actionHints?: string[];
};

function buildGradescopeReviewSummary(detail: GradescopeSubmissionDetail): Assignment['reviewSummary'] | undefined {
  if (detail.questions.length === 0) {
    return undefined;
  }

  return {
    questions: detail.questions.map((question) => ({
      label: normalizeQuestionLabel(question),
      modality: question.modality,
      score: question.score,
      maxScore: question.maxScore,
      rubricLabels: question.rubricLabels ?? [],
      evaluationCommentCount: question.evaluationComments?.length ? question.evaluationComments.length : undefined,
      annotationCount: question.annotationCount,
      annotationPages: question.annotationPages ?? [],
    })),
  };
}

const MAX_SUBMISSION_DETAIL_FETCHES = 10;

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

function parseGradescopeAssignmentDetailLinks(pageHtml: string | undefined) {
  if (!pageHtml) {
    return [];
  }

  return Array.from(
    pageHtml.matchAll(
      /\/courses\/(?<courseId>\d+)\/assignments\/(?<assignmentId>\d+)(?:\/submissions\/(?<submissionId>\d+|new))?/g,
    ),
  ).map((match) => ({
    courseId: match.groups?.courseId ?? '',
    assignmentId: match.groups?.assignmentId ?? '',
    submissionId: match.groups?.submissionId ?? undefined,
    path:
      match.groups?.submissionId
        ? `/courses/${match.groups?.courseId}/assignments/${match.groups?.assignmentId}/submissions/${match.groups?.submissionId}`
        : `/courses/${match.groups?.courseId}/assignments/${match.groups?.assignmentId}`,
  }));
}

function rankGradescopeSubmissionDetailLink(link: {
  submissionId?: string;
}) {
  if (link.submissionId && link.submissionId !== 'new') {
    return 0;
  }

  if (link.submissionId === 'new') {
    return 2;
  }

  return 1;
}

async function enrichAssignmentsWithSubmissionDetails(input: {
  assignments: Assignment[];
  client?: GradescopeApiClient;
  currentPageHtml?: string;
  currentUrl: string;
}) {
  const detailByAssignmentId = new Map<string, GradescopeSubmissionDetail>();
  const currentDetail = parseGradescopeAssignmentPageDetail(input.currentPageHtml, input.currentUrl);
  if (currentDetail) {
    detailByAssignmentId.set(currentDetail.assignmentId, currentDetail);
  }

  const isCourseScopedContext =
    /\/courses\/\d+(?:\/assignments\/\d+(?:\/submissions\/(?:\d+|new))?)?$/.test(input.currentUrl) ||
    /\/courses\/\d+/.test(input.currentUrl);
  if (input.client && isCourseScopedContext) {
    const assignmentIdsToEnrich = new Set(
      input.assignments.map((assignment) => assignment.id.replace(/^gradescope:assignment:/, '')),
    );
    const submissionLinks = Array.from(
      parseGradescopeAssignmentDetailLinks(input.currentPageHtml)
        .filter((link) => {
        if (!link.assignmentId) {
          return false;
        }

        if (!assignmentIdsToEnrich.has(link.assignmentId) || detailByAssignmentId.has(link.assignmentId)) {
          return false;
        }

        return true;
      })
        .reduce((bestLinksByAssignmentId, link) => {
          const currentBest = bestLinksByAssignmentId.get(link.assignmentId);
          if (
            !currentBest ||
            rankGradescopeSubmissionDetailLink(link) < rankGradescopeSubmissionDetailLink(currentBest)
          ) {
            bestLinksByAssignmentId.set(link.assignmentId, link);
          }
          return bestLinksByAssignmentId;
        }, new Map<string, ReturnType<typeof parseGradescopeAssignmentDetailLinks>[number]>())
        .values(),
    )
      .slice(0, MAX_SUBMISSION_DETAIL_FETCHES);
    for (const link of submissionLinks) {
      try {
        const submissionHtml = await input.client.fetchHtml(link.path);
        const detail = parseGradescopeAssignmentPageDetail(submissionHtml, `https://www.gradescope.com${link.path}`);
        if (detail) {
          detailByAssignmentId.set(detail.assignmentId, detail);
        }
      } catch {
        // Keep question-detail enrichment best-effort so the base assignment collector stays stable.
      }
    }
  }

  if (detailByAssignmentId.size === 0) {
    return input.assignments;
  }

  return input.assignments.map((assignment) => {
    const assignmentId = assignment.id.replace(/^gradescope:assignment:/, '');
    const detail = detailByAssignmentId.get(assignmentId);
    return detail ? enrichAssignmentWithSubmissionDetail(assignment, detail) : assignment;
  });
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
  const courseId = pageUrl.match(/\/courses\/(?<courseId>\d+)/)?.groups?.courseId;
  if (!pageHtml) {
    return courseId ? normalizeDerivedCourse({ courseId }) : undefined;
  }

  const sidebarMatch = pageHtml.match(
    /<div[^>]*class="sidebar--title[^"]*sidebar--title-course[^"]*"[^>]*>[\s\S]*?<a[^>]+href="\/courses\/(?<id>\d+)"[^>]*>(?<short>[\s\S]*?)<\/a>[\s\S]*?<\/div>\s*<div[^>]*class="sidebar--subtitle"[^>]*>(?<name>[\s\S]*?)<\/div>/,
  );

  const id = sidebarMatch?.groups?.id ?? courseId;
  const name = decodeHtmlText(sidebarMatch?.groups?.name);
  if (!id) {
    return undefined;
  }

  if (!name) {
    return normalizeDerivedCourse({ courseId: id });
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

function normalizeDerivedCourse(input: {
  courseId: string;
  title?: string;
  code?: string;
}): Course {
  const url = `https://www.gradescope.com/courses/${input.courseId}`;
  return CourseSchema.parse({
    id: `gradescope:course:${input.courseId}`,
    kind: 'course',
    site: 'gradescope',
    source: {
      site: 'gradescope',
      resourceId: input.courseId,
      resourceType: 'course',
      url,
    },
    url,
    title: input.title ?? `Gradescope course ${input.courseId}`,
    code: input.code,
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

function buildGradescopeAssignmentSummary(
  rawAssignment: GradescopeRawAssignment,
  status: AssignmentStatus,
) {
  const parts: string[] = [];
  const score = toOptionalNumber(rawAssignment.score);
  const maxScore = toOptionalNumber(rawAssignment.max_score);

  if (rawAssignment.course_name) {
    parts.push(rawAssignment.course_name);
  }

  switch (status) {
    case 'graded':
      parts.push(`Graded ${score ?? '-'} / ${maxScore ?? '-'}`);
      break;
    case 'submitted':
      parts.push(rawAssignment.late ? 'Submitted late' : 'Submitted');
      break;
    case 'missing':
      parts.push('Missing submission');
      break;
    case 'overdue':
      parts.push('Overdue');
      break;
    default:
      break;
  }

  if (rawAssignment.late && !parts.includes('Submitted late')) {
    parts.push('Late');
  }

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function normalizeAssignment(rawAssignment: GradescopeRawAssignment, now: string): Assignment {
  const status = deriveAssignmentStatus(rawAssignment, now);

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
    summary: buildGradescopeAssignmentSummary(rawAssignment, status),
    dueAt: rawAssignment.due_at ?? undefined,
    status,
    score: toOptionalNumber(rawAssignment.score),
    maxScore: toOptionalNumber(rawAssignment.max_score),
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

function parseScorePair(value: string | undefined) {
  const match = value?.match(/(?<score>\d+(?:\.\d+)?)\s*\/\s*(?<max>\d+(?:\.\d+)?)/);
  if (!match?.groups) {
    return {};
  }

  return {
    score: Number(match.groups.score),
    maxScore: Number(match.groups.max),
  };
}

function decodeHtmlAttributeJson(value: string) {
  // data-react-props is an HTML attribute that primarily escapes JSON quotes.
  // Leave content-level entities intact so later field-specific decoding only
  // happens once and we do not accidentally double-unescape payload text.
  return value.replace(/&quot;/g, '"');
}

function extractGradescopeSubmissionViewerProps(pageHtml: string | undefined): GradescopeSubmissionViewerProps | undefined {
  if (!pageHtml) {
    return undefined;
  }

  const propsText = pageHtml.match(
    /data-react-class="AssignmentSubmissionViewer"[^>]*data-react-props="(?<props>[\s\S]*?)"/i,
  )?.groups?.props;
  if (!propsText) {
    return undefined;
  }

  try {
    return GradescopeSubmissionViewerPropsSchema.parse(JSON.parse(decodeHtmlAttributeJson(propsText)));
  } catch {
    return undefined;
  }
}

function truncateGradescopeDetailText(value: string, maxLength = 48) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trimEnd()}…` : value;
}

function isAutograderQuestion(question: Pick<GradescopeSubmissionQuestion, 'label' | 'title'>) {
  return /autograder/i.test(`${question.title ?? ''} ${question.label}`);
}

function normalizeQuestionLabel(question: GradescopeSubmissionQuestion) {
  return isAutograderQuestion(question) ? 'Autograder result' : question.label;
}

function buildGradescopeRubricLabelSummary(labels: string[] | undefined) {
  const uniqueLabels = Array.from(
    new Set(
      (labels ?? [])
        .map((label) => decodeHtmlText(label))
        .filter((label): label is string => Boolean(label)),
    ),
  );
  if (uniqueLabels.length === 0) {
    return undefined;
  }

  const preview = uniqueLabels.slice(0, 2).map((label) => truncateGradescopeDetailText(label, 28));
  if (uniqueLabels.length > 2) {
    preview.push(`+${uniqueLabels.length - 2} more`);
  }

  return preview.join(', ');
}

function buildGradescopeRubricCriteriaDetail(criteria: GradescopeRubricCriterion[] | undefined) {
  const seenCriteria = new Set<string>();
  const normalizedCriteria: Array<{ label: string; points: number | undefined }> = [];
  for (const criterion of criteria ?? []) {
    const label = decodeHtmlText(criterion.label);
    if (!label) {
      continue;
    }

    const points = toOptionalNumber(criterion.points);
    const key = `${label}::${points ?? 'na'}`;
    if (seenCriteria.has(key)) {
      continue;
    }

    seenCriteria.add(key);
    normalizedCriteria.push({ label, points });
  }
  if (normalizedCriteria.length === 0) {
    return undefined;
  }

  const hasWeightedCriteria = normalizedCriteria.some((criterion) => criterion.points !== undefined);
  if (!hasWeightedCriteria) {
    return normalizedCriteria.map((criterion) => criterion.label).join(', ');
  }

  return `Rubric: ${normalizedCriteria
    .map((criterion) => {
      const pointsText = formatGradescopeEvaluationPoints(criterion.points);
      return pointsText ? `${criterion.label} (${pointsText})` : criterion.label;
    })
    .join(' | ')}`;
}

function formatGradescopeQuestionScore(question: Pick<GradescopeSubmissionQuestion, 'score' | 'maxScore'>) {
  if (question.score !== undefined && question.maxScore !== undefined) {
    return `${question.score} / ${question.maxScore}`;
  }

  if (question.score !== undefined) {
    return `${question.score}`;
  }

  if (question.maxScore !== undefined) {
    return `${question.maxScore} pts`;
  }

  return undefined;
}

function buildGradescopeAnnotationSummary(input: {
  count: number | undefined;
  pageNumbers?: number[];
}) {
  if (!input.count || input.count <= 0) {
    return undefined;
  }

  const countText = `${input.count} annotation${input.count === 1 ? '' : 's'}`;
  const pageText = formatGradescopeAnnotationPages(input.pageNumbers ?? []);
  return pageText ? `[${countText} on ${pageText}]` : `[${countText}]`;
}

function buildGradescopeEvaluationSummaryCount(comments: string[] | undefined) {
  const count = (comments ?? []).length;
  if (count <= 0) {
    return undefined;
  }

  return `[${count} comment${count === 1 ? '' : 's'}]`;
}

function formatGradescopeEvaluationPoints(points: number | undefined) {
  if (points === undefined) {
    return undefined;
  }

  return `${points > 0 ? '+' : ''}${points} pts`;
}

function buildGradescopeEvaluationDetailText(comments: string[] | undefined) {
  const uniqueComments = Array.from(
    new Set(
      (comments ?? [])
        .map((comment) => decodeHtmlText(comment))
        .filter((comment): comment is string => Boolean(comment)),
    ),
  );
  if (uniqueComments.length === 0) {
    return undefined;
  }

  const prefix = uniqueComments.some((comment) => comment.startsWith('(')) ? 'Comment ' : 'Comment: ';
  return `${prefix}${uniqueComments.join(' | ')}`;
}

function formatGradescopeAnnotationPages(pageNumbers: number[]) {
  if (pageNumbers.length === 0) {
    return undefined;
  }

  return pageNumbers.length === 1 ? `page ${pageNumbers[0]}` : `pages ${pageNumbers.join(', ')}`;
}

function buildGradescopeAnnotationPreview(input: {
  contents: string[];
  count: number;
  pageNumbers: number[];
}) {
  if (input.count <= 0) {
    return undefined;
  }

  const preview = input.contents
    .slice(0, 2)
    .map((content) => truncateGradescopeDetailText(content, 44));
  if (input.count > preview.length) {
    preview.push(`+${input.count - preview.length} more`);
  }

  const baseText =
    preview.length > 0 ? `Annotations: ${preview.join(' | ')}` : `Annotations: ${input.count} annotation${input.count === 1 ? '' : 's'}`;
  const pageText = formatGradescopeAnnotationPages(input.pageNumbers);
  return pageText ? `${baseText} (${pageText})` : baseText;
}

function buildGradescopeQuestionBreakdownSummary(detail: GradescopeSubmissionDetail) {
  const questionParts = detail.questions
    .map((question) => {
      const label = normalizeQuestionLabel(question);
      const scoreText = formatGradescopeQuestionScore(question);
      const rubricText = buildGradescopeRubricLabelSummary(question.rubricLabels);
      const annotationText = buildGradescopeAnnotationSummary({
        count: question.annotationCount,
        pageNumbers: question.annotationPages,
      });
      const evaluationText = buildGradescopeEvaluationSummaryCount(question.evaluationComments);
      return [label, scoreText, rubricText ? `(${rubricText})` : undefined, evaluationText, annotationText].filter(Boolean).join(' ');
    })
    .filter(Boolean);

  if (questionParts.length === 0) {
    return undefined;
  }

  const visibleParts = questionParts.slice(0, 3);
  const remainingCount = questionParts.length - visibleParts.length;
  if (remainingCount <= 0) {
    return visibleParts.join('; ');
  }

  return `${visibleParts.join('; ')}; +${remainingCount} more`;
}

function buildGradescopeQuestionBreakdownDetail(detail: GradescopeSubmissionDetail) {
  const questionParts = detail.questions
    .map((question) => {
      const label = normalizeQuestionLabel(question);
      const scoreText = formatGradescopeQuestionScore(question);
      const fallbackRubricText =
        Array.from(
          new Set(
            (question.rubricLabels ?? [])
              .map((label) => decodeHtmlText(label))
              .filter((label): label is string => Boolean(label)),
          ),
        ).join(', ') || undefined;
      const rubricText = buildGradescopeRubricCriteriaDetail(question.rubricCriteria) ?? fallbackRubricText;
      const commentText = buildGradescopeEvaluationDetailText(question.evaluationComments);
      return [label, scoreText, rubricText, commentText, question.annotationPreview].filter(Boolean).join(' · ');
    })
    .filter(Boolean);

  const baseDetail = questionParts.length > 0 ? questionParts.join('; ') : undefined;
  const actionText = detail.actionHints && detail.actionHints.length > 0 ? `Actions: ${detail.actionHints.join(' | ')}` : undefined;
  return [baseDetail, actionText].filter(Boolean).join('; ') || undefined;
}

function parseGradescopeSubmissionActions(
  pageHtml: string | undefined,
  viewerProps?: Pick<GradescopeSubmissionViewerProps, 'assignment' | 'past_submissions' | 'paths'>,
) {
  if (!pageHtml && !viewerProps) {
    return [];
  }

  const actionHints: string[] = [];
  const gradedCopyHref =
    viewerProps?.paths?.graded_pdf_path ??
    pageHtml?.match(/href="(?<href>\/courses\/\d+\/assignments\/\d+\/submissions\/\d+\.pdf)"/i)?.groups?.href;
  if (gradedCopyHref) {
    actionHints.push('Download graded copy');
  }

  const submissionHistoryCount = viewerProps?.past_submissions?.length;
  if (submissionHistoryCount && submissionHistoryCount > 0) {
    actionHints.push(
      `Submission history (${submissionHistoryCount} submission${submissionHistoryCount === 1 ? '' : 's'} on record)`,
    );
  } else if (pageHtml && />\s*Submission History\s*</i.test(pageHtml)) {
    actionHints.push('Submission history');
  }

  const regradeLabel = pageHtml?.match(/aria-label="(?<label>\s*Request Regrade[^"]*)"/i)?.groups?.label?.trim();
  if (regradeLabel) {
    const normalized = regradeLabel.replace(/^Request Regrade\.?\s*/i, '').trim();
    actionHints.push(normalized ? `Request regrade (${normalized})` : 'Request regrade');
  } else if (
    viewerProps?.paths?.regrade_requests_path &&
    viewerProps.assignment.regrade_requests_open === false
  ) {
    actionHints.push('Request regrade (window closed)');
  } else if (pageHtml && />\s*Request Regrade\s*</i.test(pageHtml)) {
    const disabled = /Request Regrade[\s\S]*?aria-disabled="true"/i.test(pageHtml);
    actionHints.push(disabled ? 'Request regrade (disabled)' : 'Request regrade');
  }

  return Array.from(new Set(actionHints));
}

function parseGradescopeTotalPoints(totalPointsText: string | undefined) {
  const pair = parseScorePair(totalPointsText);
  if (pair.score !== undefined || pair.maxScore !== undefined) {
    return pair;
  }

  const maxOnly = totalPointsText?.match(/(?<max>\d+(?:\.\d+)?)\s*pts/i)?.groups?.max;
  return {
    score: undefined,
    maxScore: maxOnly ? Number(maxOnly) : undefined,
  };
}

function parseGradescopeQuestionSections(pageHtml: string) {
  return Array.from(
    pageHtml.matchAll(/<li class="submissionOutline--section">[\s\S]*?<\/li>/gi),
  ).flatMap((sectionMatch): GradescopeSubmissionQuestion[] => {
    const sectionHtml = sectionMatch[0];
    const index = sectionHtml.match(/<h2 class="submissionOutline--sectionHeading">Question (?<index>[\d.]+)<\/h2>/i)?.groups?.index;
    if (!index) {
      return [];
    }

    const title = stripHtml(
      sectionHtml.match(/<h3[^>]*class="submissionOutlineQuestion--titleContainer"[^>]*>(?<title>[\s\S]*?)<\/h3>/i)?.groups
        ?.title ??
        sectionHtml.match(/<a[^>]*class="submissionOutlineQuestion--title[^"]*"[^>]*>(?<title>[\s\S]*?)<\/a>/i)?.groups
          ?.title ??
        sectionHtml.match(/<h3[^>]*class="submissionOutlineQuestion--title[^"]*"[^>]*>(?<title>[\s\S]*?)<\/h3>/i)?.groups
          ?.title,
    );
    const scoreMatch = sectionHtml.match(
      /<span class="submissionOutlineQuestion--score">(?<score>[^<]+)<\/span>\s*\/\s*(?<max>\d+(?:\.\d+)?)\s*pts/i,
    );
    const maxOnly =
      sectionHtml.match(/<span[^>]*class="questionHeading--points"[^>]*>(?<points>\d+(?:\.\d+)?)\s*Points<\/span>/i)?.groups
        ?.points ??
      sectionHtml.match(/<span[^>]*aria-hidden="true">(?<points>\d+(?:\.\d+)?)\s*pts<\/span>/i)?.groups?.points;

      return [
        {
          label: title ? `Q${index} ${title}` : `Q${index}`,
          title,
          modality: /autograder/i.test(title ?? '') ? 'autograder' : 'manual',
          score: toOptionalNumber(scoreMatch?.groups?.score),
          maxScore: toOptionalNumber(scoreMatch?.groups?.max ?? maxOnly),
        } satisfies GradescopeSubmissionQuestion,
    ];
  });
}

function parseGradescopeAssignmentPageDetail(pageHtml: string | undefined, pageUrl: string) {
  const match = pageUrl.match(
    /\/courses\/(?<courseId>\d+)\/assignments\/(?<assignmentId>\d+)(?:\/submissions\/(?<submissionId>\d+|new))?/,
  );
  if (!pageHtml || !match?.groups?.courseId || !match.groups.assignmentId) {
    return undefined;
  }

  const submissionId = match.groups.submissionId;
  const isComposerPage = !submissionId || submissionId === 'new';
  const viewerProps = extractGradescopeSubmissionViewerProps(pageHtml);
  const title = decodeHtmlText(
    pageHtml.match(/submissionOutlineHeader--assignmentTitle">(?<title>[\s\S]*?)<\/h1>/)?.groups?.title,
  );
  const totalPointsText = stripHtml(
    pageHtml.match(/submissionOutlineHeader--totalPoints">(?<total>[\s\S]*?)<\/p>/)?.groups?.total,
  );
  if (viewerProps) {
    const questionSubmissionsByQuestionId = new Map(
      viewerProps.question_submissions
        .filter((questionSubmission) => questionSubmission.active !== false)
        .map((questionSubmission) => [String(questionSubmission.question_id), questionSubmission]),
    );
    const rubricCriteriaByQuestionId = new Map<string, GradescopeRubricCriterion[]>();
    for (const rubricItem of viewerProps.rubric_items
      .filter((item) => item.present)
      .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))) {
      if (!rubricItem.description) {
        continue;
      }

      const questionId = String(rubricItem.question_id);
      const currentCriteria = rubricCriteriaByQuestionId.get(questionId) ?? [];
      currentCriteria.push({
        label: rubricItem.description,
        points: toOptionalNumber(rubricItem.weight),
      });
      rubricCriteriaByQuestionId.set(questionId, currentCriteria);
    }

    const questions = viewerProps.questions
      .slice()
      .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
      .flatMap((question): GradescopeSubmissionQuestion[] => {
        const questionIndex =
          question.full_index ??
          question.numbered_title ??
          (question.index !== undefined ? String(question.index) : undefined);
        const questionTitle = decodeHtmlText(question.title);
        const label =
          questionIndex && questionTitle
            ? `Q${questionIndex} ${questionTitle}`
            : questionIndex
              ? `Q${questionIndex}`
              : questionTitle;
        if (!label) {
          return [];
        }

        const questionSubmission = questionSubmissionsByQuestionId.get(String(question.id));
        const annotationContents = Array.from(
          new Set(
            (questionSubmission?.annotations ?? [])
              .flatMap((annotation) => {
                const directContent = decodeHtmlText(annotation.content ?? undefined);
                if (directContent) {
                  return [directContent];
                }

                return (annotation.links ?? [])
                  .flatMap((link) => {
                    const linkedComments = Object.keys(link.annotation_comments ?? {})
                      .map((comment) => decodeHtmlText(comment))
                      .filter((comment): comment is string => Boolean(comment));
                    if (linkedComments.length > 0) {
                      return linkedComments;
                    }

                    const rubricDescription = decodeHtmlText(link.rubric_item?.description ?? undefined);
                    return rubricDescription ? [rubricDescription] : [];
                  });
              })
              .filter((content): content is string => Boolean(content)),
          ),
        );
        const annotationRubricLabels = Array.from(
          new Set(
            (questionSubmission?.annotations ?? [])
              .flatMap((annotation) => annotation.links ?? [])
              .map((link) => decodeHtmlText(link.rubric_item?.description ?? undefined))
              .filter((label): label is string => Boolean(label)),
          ),
        );
        const annotationPageNumbers = Array.from(
          new Set(
            (questionSubmission?.annotations ?? [])
              .map((annotation) => annotation.page_number)
              .filter((pageNumber): pageNumber is number => Number.isFinite(pageNumber)),
          ),
        ).sort((left, right) => left - right);
        const annotationCount = (questionSubmission?.annotations ?? []).length;
        const rubricCriteria = [
          ...(rubricCriteriaByQuestionId.get(String(question.id)) ?? []),
          ...annotationRubricLabels
            .filter(
              (label) =>
                !(rubricCriteriaByQuestionId.get(String(question.id)) ?? []).some(
                  (criterion) => decodeHtmlText(criterion.label) === label,
                ),
            )
            .map((label) => ({ label })),
        ];
        return [
          {
            label,
            title: questionTitle,
            modality: isAutograderQuestion({ label, title: questionTitle }) ? 'autograder' : 'manual',
            score: toOptionalNumber(questionSubmission?.score),
            maxScore: toOptionalNumber(question.weight),
            rubricLabels: Array.from(
              new Set(rubricCriteria.map((criterion) => decodeHtmlText(criterion.label)).filter(Boolean)),
            ) as string[],
            rubricCriteria: rubricCriteria.length > 0 ? rubricCriteria : undefined,
            evaluationComments: (questionSubmission?.evaluations ?? [])
              .map((evaluation) => {
                const comment = decodeHtmlText(evaluation.comments ?? undefined);
                if (!comment) {
                  return undefined;
                }

                const pointsText = formatGradescopeEvaluationPoints(toOptionalNumber(evaluation.points));
                return pointsText ? `(${pointsText}): ${comment}` : comment;
              })
              .filter((comment): comment is string => Boolean(comment)),
            annotationCount: annotationCount > 0 ? annotationCount : undefined,
            annotationPages: annotationPageNumbers,
            annotationPreview: buildGradescopeAnnotationPreview({
              contents: annotationContents,
              count: annotationCount,
              pageNumbers: annotationPageNumbers,
            }),
          } satisfies GradescopeSubmissionQuestion,
        ];
      });

    const total = {
      score: toOptionalNumber(viewerProps.assignment_submission.score),
      maxScore: toOptionalNumber(viewerProps.assignment.total_points),
    };

    if (decodeHtmlText(viewerProps.assignment.title) || questions.length > 0 || total.score !== undefined || total.maxScore !== undefined) {
      return {
        courseId: match.groups.courseId,
        assignmentId: match.groups.assignmentId,
        submissionId: isComposerPage ? undefined : submissionId,
        url: `https://www.gradescope.com${match[0]}`,
        title: decodeHtmlText(viewerProps.assignment.title) ?? title ?? `Gradescope assignment ${match.groups.assignmentId}`,
        status: isComposerPage ? 'todo' : 'graded',
        score: total.score,
        maxScore: total.maxScore,
        questions,
        actionHints: parseGradescopeSubmissionActions(pageHtml, viewerProps),
      } satisfies GradescopeSubmissionDetail;
    }
  }

  const questions = parseGradescopeQuestionSections(pageHtml);
  const total = parseGradescopeTotalPoints(totalPointsText);
  if (!title && questions.length === 0 && total.score === undefined && total.maxScore === undefined) {
    return undefined;
  }

  return {
    courseId: match.groups.courseId,
    assignmentId: match.groups.assignmentId,
    submissionId: isComposerPage ? undefined : submissionId,
    url: `https://www.gradescope.com${match[0]}`,
    title: title ?? `Gradescope assignment ${match.groups.assignmentId}`,
    status: isComposerPage ? 'todo' : 'graded',
    score: total.score,
    maxScore: total.maxScore,
    questions,
    actionHints: parseGradescopeSubmissionActions(pageHtml),
  } satisfies GradescopeSubmissionDetail;
}

function parseGradescopeRegradeRequestsResource(pageHtml: string | undefined, pageUrl: string) {
  const match = pageUrl.match(/\/courses\/(?<courseId>\d+)\/regrade_requests(?:[?#].*)?$/);
  if (!pageHtml || !match?.groups?.courseId) {
    return undefined;
  }

  const headers = Array.from(pageHtml.matchAll(/<th[^>]*scope="col"[^>]*>(?<label>[\s\S]*?)<\/th>/gi))
    .map((headerMatch) => stripHtml(headerMatch.groups?.label))
    .filter((label): label is string => Boolean(label));
  const hasEmptyTable = /<tbody>\s*<\/tbody>/i.test(pageHtml);
  const hasBlankState = /blankState/i.test(pageHtml);

  if (!hasEmptyTable && !hasBlankState) {
    return undefined;
  }

  const courseId = match.groups.courseId;
  const url = `https://www.gradescope.com/courses/${courseId}/regrade_requests`;
  const columnDetail = headers.length > 0 ? `Columns: ${headers.join(' · ')}.` : undefined;

  return ResourceSchema.parse({
    id: `gradescope:resource:${courseId}:regrade_requests`,
    kind: 'resource',
    site: 'gradescope',
    source: {
      site: 'gradescope',
      resourceId: `${courseId}:regrade_requests`,
      resourceType: 'regrade_requests',
      url,
    },
    url,
    courseId: `gradescope:course:${courseId}`,
    resourceKind: 'other',
    title: 'Regrade requests',
    summary: 'No submitted regrade requests yet.',
    detail: ['Course-level regrade hub is currently empty.', columnDetail].filter(Boolean).join(' '),
  });
}

function enrichAssignmentWithSubmissionDetail(assignment: Assignment, detail: GradescopeSubmissionDetail) {
  const detailSummary = buildGradescopeQuestionBreakdownSummary(detail);
  const fullDetail = buildGradescopeQuestionBreakdownDetail(detail);
  const baseSummary =
    assignment.summary ??
    (detail.status === 'graded'
      ? `Graded ${assignment.score ?? detail.score ?? '-'} / ${assignment.maxScore ?? detail.maxScore ?? '-'}`
      : 'No submission');

  return AssignmentSchema.parse({
    ...assignment,
    url: detail.url,
    source: {
      ...assignment.source,
      url: detail.url,
    },
    title: assignment.title || detail.title,
    summary: detailSummary ? `${baseSummary} · ${detailSummary}` : baseSummary,
    detail: assignment.detail ?? fullDetail,
    score: detail.status === 'graded' ? assignment.score ?? detail.score : assignment.score,
    maxScore: assignment.maxScore ?? detail.maxScore,
    status: detail.status === 'graded' ? 'graded' : assignment.status,
    actionHints: detail.actionHints ?? assignment.actionHints,
    reviewSummary: buildGradescopeReviewSummary(detail),
  });
}

function buildAssignmentFromSubmissionDetail(detail: GradescopeSubmissionDetail) {
  const detailSummary = buildGradescopeQuestionBreakdownSummary(detail);
  const fullDetail = buildGradescopeQuestionBreakdownDetail(detail);
  const baseSummary =
    detail.status === 'graded'
      ? `Graded ${detail.score ?? '-'} / ${detail.maxScore ?? '-'}`
      : detail.maxScore !== undefined
        ? `No submission · ${detail.maxScore} pts total`
        : 'No submission';

  return AssignmentSchema.parse({
    id: `gradescope:assignment:${detail.assignmentId}`,
    kind: 'assignment',
    site: 'gradescope',
    source: {
      site: 'gradescope',
      resourceId: detail.assignmentId,
      resourceType: 'assignment',
      url: detail.url,
    },
    url: detail.url,
    courseId: `gradescope:course:${detail.courseId}`,
    title: detail.title,
    summary: detailSummary ? `${baseSummary} · ${detailSummary}` : baseSummary,
    detail: fullDetail,
    status: detail.status,
    score: detail.status === 'graded' ? detail.score : undefined,
    maxScore: detail.maxScore,
    actionHints: detail.actionHints,
    reviewSummary: buildGradescopeReviewSummary(detail),
  });
}

function buildGradeFromSubmissionDetail(detail: GradescopeSubmissionDetail & { submissionId: string }) {
  return GradeSchema.parse({
    id: `gradescope:grade:${detail.submissionId}`,
    kind: 'grade',
    site: 'gradescope',
    source: {
      site: 'gradescope',
      resourceId: detail.submissionId,
      resourceType: 'grade',
      url: detail.url,
    },
    url: detail.url,
    courseId: `gradescope:course:${detail.courseId}`,
    assignmentId: `gradescope:assignment:${detail.assignmentId}`,
    title: detail.title,
    score: detail.score,
    maxScore: detail.maxScore,
  });
}

function deriveCoursesFromPrivatePayloads(input: {
  privateCourseHints?: GradescopeDerivedCourseHint[];
  assignments?: Assignment[];
  grades?: Grade[];
  existingCourses?: Course[];
}) {
  if (input.existingCourses) {
    return input.existingCourses;
  }

  const courseMap = new Map<string, Course>();
  for (const hint of input.privateCourseHints ?? []) {
    if (courseMap.has(hint.courseId)) {
      continue;
    }

    courseMap.set(
      hint.courseId,
      normalizeDerivedCourse({
        courseId: hint.courseId,
        title: hint.title,
      }),
    );
  }

  for (const assignment of input.assignments ?? []) {
    if (!assignment.courseId) {
      continue;
    }

    const courseId = assignment.courseId.replace(/^gradescope:course:/, '');
    if (courseMap.has(courseId)) {
      continue;
    }

    courseMap.set(
      courseId,
      normalizeDerivedCourse({
        courseId,
        title: undefined,
      }),
    );
  }

  for (const grade of input.grades ?? []) {
    if (!grade.courseId) {
      continue;
    }

    const courseId = grade.courseId.replace(/^gradescope:course:/, '');
    if (courseMap.has(courseId)) {
      continue;
    }

    courseMap.set(
      courseId,
      normalizeDerivedCourse({
        courseId,
      }),
    );
  }

  return courseMap.size > 0 ? Array.from(courseMap.values()) : undefined;
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
  resources?: Resource[];
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
  lastCourseHints: GradescopeDerivedCourseHint[] = [];

  constructor(private readonly client: GradescopeApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'gradescope';
  }

  async collect(ctx: AdapterContext) {
    const rawAssignments = await this.client.getAssignments();
    this.lastCourseHints = Array.from(
      new Map(
        rawAssignments
          .filter((rawAssignment) => rawAssignment.course_id)
          .map((rawAssignment) => [
            String(rawAssignment.course_id),
            {
              courseId: String(rawAssignment.course_id),
              title: rawAssignment.course_name,
            },
          ]),
      ).values(),
    );
    const assignments = rawAssignments.map((rawAssignment) => normalizeAssignment(rawAssignment, ctx.now));
    const currentDetail = parseGradescopeAssignmentPageDetail(ctx.pageHtml, ctx.url);
    if (!currentDetail) {
      return assignments;
    }

    return assignments.map((assignment) => {
      const assignmentId = assignment.id.replace(/^gradescope:assignment:/, '');
      return assignmentId === currentDetail.assignmentId ? enrichAssignmentWithSubmissionDetail(assignment, currentDetail) : assignment;
    });
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

  async collect(ctx: AdapterContext) {
    const rawGrades = await this.client.getGrades();
    const grades = rawGrades.map(normalizeGrade);
    const currentDetail = parseGradescopeSubmissionDetail(ctx.pageHtml, ctx.url);
    if (!currentDetail) {
      return grades;
    }

    return grades.map((grade) =>
      grade.assignmentId === `gradescope:assignment:${currentDetail.assignmentId}`
        ? buildGradeFromSubmissionDetail(currentDetail)
        : grade,
    );
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
    const directAssignmentDetail = parseGradescopeAssignmentPageDetail(ctx.pageHtml, ctx.url);
    if (directAssignmentDetail) {
      return [buildAssignmentFromSubmissionDetail(directAssignmentDetail)];
    }

    const collectFromHtml = (html: string, fallbackCourseId?: string) =>
      Array.from(
        html.matchAll(
          /(?<href>\/courses\/(?<linkedCourseId>\d+)\/assignments\/(?<assignmentId>\d+)(?:\/submissions\/(?<submissionId>\d+|new))?)"[^>]*>(?<title>[\s\S]*?)<\/a>/g,
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

          const scoreMatch = statusCell.match(/(?<score>\d+(?:\.\d+)?)\s*\/\s*(?<max>\d+(?:\.\d+)?)/);
          const score = scoreMatch?.groups?.score ? Number(scoreMatch.groups.score) : undefined;
          const maxScore = scoreMatch?.groups?.max ? Number(scoreMatch.groups.max) : undefined;
          const isLate = /late/i.test(statusCell);

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
            summary: buildGradescopeAssignmentSummary(
              {
                id: assignmentId,
                course_id: resolvedCourseId,
                title,
                due_at: dueAt,
                submission_status:
                  status === 'graded' ? 'graded' : status === 'submitted' ? 'submitted' : undefined,
                missing: /no submission/i.test(statusCell),
                late: isLate,
                score,
                max_score: maxScore,
                url: match.groups?.href ? `https://www.gradescope.com${match.groups.href}` : undefined,
              },
              status,
            ),
            dueAt,
            status,
            score,
            maxScore,
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

    return enrichAssignmentsWithSubmissionDetails({
      assignments,
      client: this.client,
      currentPageHtml: ctx.pageHtml,
      currentUrl: ctx.url,
    });
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
    const directSubmissionDetail = parseGradescopeSubmissionDetail(ctx.pageHtml, ctx.url);
    if (directSubmissionDetail) {
      return [buildGradeFromSubmissionDetail(directSubmissionDetail)];
    }

    const collectFromHtml = (html: string) =>
      Array.from(
        html.matchAll(
          /(?<href>\/courses\/(?<courseId>\d+)\/assignments\/(?<assignmentId>\d+)(?:\/submissions\/(?<submissionId>\d+))?)"[^>]*>(?<title>[\s\S]*?)<\/a>/g,
        ),
      )
        .map((match) => {
          const assignmentId = match.groups?.assignmentId;
          const title = stripHtml(match.groups?.title);
          const rowHtml = html.slice(match.index, html.indexOf('</tr>', match.index) + 5);
          const statusCellMatch = rowHtml.match(/<td[^>]*class="submissionStatus[^"]*"[^>]*>([\s\S]*?)<\/td>/);
          const statusCell = stripHtml(statusCellMatch?.[1]) ?? '';
          const scoreMatch = statusCell.match(/(?<score>\d+(?:\.\d+)?)\s*\/\s*(?<max>\d+(?:\.\d+)?)/);
          if (!assignmentId || !scoreMatch?.groups) {
            return undefined;
          }

          const gradeId = match.groups?.submissionId ?? assignmentId;
          const exactUrl = match.groups?.href ? `https://www.gradescope.com${match.groups.href}` : undefined;
          const assignmentUrl = match.groups?.courseId
            ? `https://www.gradescope.com/courses/${match.groups.courseId}/assignments/${assignmentId}`
            : undefined;
          return GradeSchema.parse({
            id: `gradescope:grade:${gradeId}`,
            kind: 'grade',
            site: 'gradescope',
            source: {
              site: 'gradescope',
              resourceId: gradeId,
              resourceType: 'grade',
              url: exactUrl ?? assignmentUrl,
            },
            url: exactUrl ?? assignmentUrl,
            courseId: match.groups?.courseId ? `gradescope:course:${match.groups.courseId}` : undefined,
            assignmentId: `gradescope:assignment:${assignmentId}`,
            title: title ?? `Grade ${gradeId}`,
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

class GradescopeRegradeRequestsDomCollector implements ResourceCollector<Resource> {
  readonly name = 'GradescopeRegradeRequestsDomCollector';
  readonly resource = 'resources';
  readonly mode = 'dom' as const;
  readonly priority = 10;

  async supports(ctx: AdapterContext) {
    return ctx.site === 'gradescope' && /\/courses\/\d+\/regrade_requests(?:[?#].*)?$/.test(ctx.url) && Boolean(ctx.pageHtml);
  }

  async collect(ctx: AdapterContext) {
    const resource = parseGradescopeRegradeRequestsResource(ctx.pageHtml, ctx.url);
    if (!resource) {
      throw new GradescopeApiError('unsupported_context', 'Gradescope regrade-requests page is unavailable.');
    }
    return [resource];
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

function parseGradescopeSubmissionDetail(pageHtml: string | undefined, pageUrl: string) {
  const detail = parseGradescopeAssignmentPageDetail(pageHtml, pageUrl);
  return detail?.submissionId ? (detail as GradescopeSubmissionDetail & { submissionId: string }) : undefined;
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
        resources: {
          supported: ctx.site === 'gradescope',
          modes: ['dom'],
          preferredMode: 'dom',
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
      const assignmentsCollector = new GradescopeAssignmentsCollector(this.client);
      const assignmentsPipeline = await runCollectorPipeline(ctx, [assignmentsCollector, new GradescopeAssignmentsDomCollector(this.client)]);
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
      const resourcesPipeline = await runCollectorPipeline(ctx, [new GradescopeRegradeRequestsDomCollector()]);
      attemptsByResource.resources = resourcesPipeline.attempts;

      const assignments = assignmentsPipeline.ok ? z.array(AssignmentSchema).parse(assignmentsPipeline.items) : undefined;
      const grades = gradesPipeline.ok ? z.array(GradeSchema).parse(gradesPipeline.items) : undefined;
      const courses = coursesPipeline.ok ? z.array(CourseSchema).parse(coursesPipeline.items) : undefined;
      const resources = resourcesPipeline.ok ? z.array(ResourceSchema).parse(resourcesPipeline.items) : undefined;
      const privateAssignments =
        assignmentsPipeline.ok && assignmentsPipeline.winningMode === 'private_api' ? assignments : undefined;
      const privateGrades = gradesPipeline.ok && gradesPipeline.winningMode === 'private_api' ? grades : undefined;
      const resolvedCourses = deriveCoursesFromPrivatePayloads({
        privateCourseHints: assignmentsCollector.lastCourseHints,
        assignments: privateAssignments,
        grades: privateGrades,
        existingCourses: courses,
      });

      if (!assignments && !grades && !resolvedCourses) {
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

      const hasFailure = !assignments || !grades || !resolvedCourses;
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
          courses: resolvedCourses,
          resources,
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
