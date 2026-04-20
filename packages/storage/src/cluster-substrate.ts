import type { Announcement, Assignment, Course, Event, Grade, Site } from '@campus-copilot/schema';
import { campusCopilotDb, type CampusCopilotDB } from './db.ts';
import {
  type AdminCarrierRecord,
  AdministrativeSummarySchema,
  CourseClusterSchema,
  MatchConfidenceBandSchema,
  MergeHealthSummarySchema,
  MergeLedgerEntrySchema,
  WorkItemClusterSchema,
  type AdministrativeSummary,
  type ClusterMemberRef,
  type ClusterSurface,
  type ClusterAuthorityFacet,
  type CourseCluster,
  type CrossSiteEvidenceItem,
  type MergeHealthSummary,
  type MergeLedgerEntry,
  type PlanningSubstrateOwner,
  type WorkItemCluster,
} from './contracts.ts';
import { isMyUWDecisionSignalAnnouncement, isMyUWDecisionSignalEvent } from './storage-shared.ts';
import { getAdminCarriers } from './admin-high-sensitivity-substrate.ts';
import { applyClusterReviewOverrides, getClusterReviewOverrides } from './cluster-review-overrides.ts';

const COURSE_AUTHORITY_PRIORITY: Record<Site, number> = {
  myuw: 100,
  canvas: 90,
  edstem: 85,
  gradescope: 85,
  'course-sites': 80,
  'time-schedule': 70,
};

const WORK_ITEM_AUTHORITY_PRIORITY: Record<ClusterSurface, number> = {
  myuw: 90,
  canvas: 95,
  edstem: 85,
  gradescope: 100,
  'course-sites': 88,
  'time-schedule': 70,
  myplan: 60,
};

function isClusterReviewPending(input: {
  needsReview: boolean;
  reviewDecision?: 'accepted' | 'review_later' | 'dismissed';
}) {
  if (!input.needsReview) {
    return false;
  }
  return input.reviewDecision !== 'accepted' && input.reviewDecision !== 'dismissed';
}

function shouldCountClusterAsMerged(input: {
  confidenceBand: 'high' | 'medium' | 'low';
  needsReview: boolean;
  reviewDecision?: 'accepted' | 'review_later' | 'dismissed';
}) {
  if (input.confidenceBand === 'low') {
    return false;
  }
  if (!input.needsReview) {
    return true;
  }
  return input.reviewDecision === 'accepted';
}

const TUITION_PATTERN = /\b(tuition|payment|billing|bill|fee|fees|account)\b/i;
const COURSE_CODE_PATTERN = /\b([A-Z]{2,5})\s*([0-9]{2,3}[A-Z]?)\b/;

type WorkItemCandidate = {
  key: string;
  surface: ClusterSurface;
  entityKind: ClusterMemberRef['entityKind'];
  entityKey: string;
  title: string;
  relation: string;
  label: string;
  courseClusterId?: string;
  dueAt?: string;
  startAt?: string;
  endAt?: string;
  observedAt?: string;
  status?: string;
  resourceType: string;
  url?: string;
};

function formatCorroboratedFieldList(fields: Array<string | undefined>) {
  const normalized = fields.filter((field): field is string => Boolean(field));
  if (normalized.length === 0) {
    return '';
  }
  return `字段佐证锁在 ${normalized.join(' / ')}。`;
}

function formatCurrentValueList(values: Array<[string, string | undefined]>) {
  const normalized = values
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => `${label}=${value}`);
  if (normalized.length === 0) {
    return '';
  }
  return `当前值锁在 ${normalized.join(' / ')}。`;
}

function extractUrlHost(url: string | undefined) {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

function buildCourseIdentityFieldCorroboration(input: {
  authority: Course;
  exactAnchor: boolean;
}) {
  const termKey = extractTermKey(input.authority.url);
  return formatCorroboratedFieldList([
    '课程标题',
    input.authority.code ?? extractCourseCode(input.authority.title) ? '课程代码' : undefined,
    termKey ? '学期' : undefined,
    input.authority.url ? (input.exactAnchor ? '跨站深链' : '课程链接') : undefined,
  ]);
}

function buildCourseIdentityValueCorroboration(input: {
  authority: Course;
}) {
  const code = normalizeCourseCode(input.authority);
  const termKey = extractTermKey(input.authority.url);
  const linkHost = extractUrlHost(input.authority.url);
  return formatCurrentValueList([
    ['title', input.authority.title],
    ['code', code],
    ['term', termKey],
    ['linkHost', linkHost],
  ]);
}

function buildWorkFieldCorroboration(input: {
  role: ClusterAuthorityFacet['role'];
  member: WorkItemCandidate;
}) {
  switch (input.role) {
    case 'assignment_spec':
      return formatCorroboratedFieldList([
        'title',
        'summary/spec',
        input.member.url ? 'deep-link' : undefined,
      ]);
    case 'schedule_signal':
      return formatCorroboratedFieldList([
        input.member.dueAt ? 'dueAt' : undefined,
        input.member.startAt ? 'startAt' : undefined,
        input.member.endAt ? 'endAt' : undefined,
      ]);
    case 'submission_state':
      return formatCorroboratedFieldList(['status', 'submission runtime']);
    case 'feedback_detail':
      return formatCorroboratedFieldList(['score', 'rubric', 'comment', 'annotation']);
    default:
      return '';
  }
}

function buildWorkValueCorroboration(input: {
  role: ClusterAuthorityFacet['role'];
  member: WorkItemCandidate;
}) {
  switch (input.role) {
    case 'assignment_spec':
      return formatCurrentValueList([
        ['title', input.member.title],
        ['linkHost', extractUrlHost(input.member.url)],
      ]);
    case 'schedule_signal':
      return formatCurrentValueList([
        ['dueAt', input.member.dueAt],
        ['startAt', input.member.startAt],
        ['endAt', input.member.endAt],
      ]);
    case 'submission_state':
      return formatCurrentValueList([['status', input.member.status]]);
    default:
      return '';
  }
}

function joinChineseLabels(labels: string[]) {
  if (labels.length === 0) {
    return '';
  }
  if (labels.length === 1) {
    return labels[0]!;
  }
  if (labels.length === 2) {
    return `${labels[0]}与${labels[1]}`;
  }
  return `${labels.slice(0, -1).join('、')}与${labels[labels.length - 1]}`;
}

function formatAuthorityRoleLabel(role: ClusterAuthorityFacet['role']) {
  switch (role) {
    case 'course_identity':
      return '课程身份';
    case 'course_delivery':
      return '课程执行面';
    case 'discussion_runtime':
      return '讨论流';
    case 'assessment_runtime':
      return '评估流';
    case 'assignment_spec':
      return '作业规格';
    case 'schedule_signal':
      return '时间锚点';
    case 'submission_state':
      return '提交状态';
    case 'feedback_detail':
      return '反馈细节';
    default:
      return String(role).replace(/_/g, ' ');
  }
}

function buildCompressedAuthorityNarrative(breakdown: ClusterAuthorityFacet[]) {
  const grouped = new Map<string, string[]>();

  for (const facet of breakdown) {
    const roleLabel = formatAuthorityRoleLabel(facet.role);
    const existing = grouped.get(facet.surface) ?? [];
    if (!existing.includes(roleLabel)) {
      existing.push(roleLabel);
    }
    grouped.set(facet.surface, existing);
  }

  return [...grouped.entries()]
    .map(([surface, roleLabels]) => `${surface} 负责${joinChineseLabels(roleLabels)}`)
    .join('；');
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeTitle(value: string | undefined) {
  return normalizeWhitespace((value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' '));
}

function slugify(value: string | undefined) {
  const normalized = normalizeTitle(value).replace(/\s+/g, '-');
  return normalized || 'unknown';
}

function extractCourseCode(value: string | undefined) {
  const match = value?.match(COURSE_CODE_PATTERN);
  return match ? `${match[1]} ${match[2]}` : undefined;
}

function normalizeCourseCode(course: Course) {
  return normalizeWhitespace(course.code ?? extractCourseCode(course.title) ?? '').toUpperCase() || undefined;
}

function isCsCourseCode(code: string | undefined) {
  return /^(CSE|C SCI)\b/i.test(code ?? '');
}

function extractTermKey(url: string | undefined) {
  if (!url) {
    return undefined;
  }

  const quarterMatch = url.match(/\b(?:spr|sum|aut|win)\d{4}\b/i);
  if (quarterMatch) {
    return quarterMatch[0].toLowerCase();
  }

  const shortQuarterMatch = url.match(/\/(\d{2}(?:sp|su|au|wi))\b/i);
  return shortQuarterMatch?.[1]?.toLowerCase();
}

function memberRef(input: {
  entityKey: string;
  surfaceKey: ClusterSurface;
  entityKind: ClusterMemberRef['entityKind'];
  relation: string;
  label: string;
  courseId?: string;
  url?: string;
  dueAt?: string;
  startAt?: string;
  endAt?: string;
}): ClusterMemberRef {
  return {
    entityKey: input.entityKey,
    surfaceKey: input.surfaceKey,
    entityKind: input.entityKind,
    relation: input.relation,
    label: input.label,
    courseId: input.courseId,
    url: input.url,
    dueAt: input.dueAt,
    startAt: input.startAt,
    endAt: input.endAt,
  };
}

function evidence(code: string, label: string, detail?: string): CrossSiteEvidenceItem {
  return { code, label, detail };
}

function toAdministrativeBlockers(
  blockers: Array<{
    id: string;
    summary: string;
    whyItStopsPromotion: string;
  }> = [],
) {
  return blockers.map((blocker) => ({
    id: blocker.id,
    summary: blocker.summary,
    whyItStopsPromotion: blocker.whyItStopsPromotion,
  }));
}

function authorityFacet(input: {
  role: ClusterAuthorityFacet['role'];
  surface: ClusterSurface;
  entityKey: string;
  resourceType: string;
  label: string;
  reason: string;
}): ClusterAuthorityFacet {
  return {
    role: input.role,
    surface: input.surface,
    entityKey: input.entityKey,
    resourceType: input.resourceType,
    label: input.label,
    reason: input.reason,
  };
}

function buildCourseAuthorityBreakdown(input: {
  members: Course[];
  authority: Course;
  courseSitesCsAuthorityOverride: boolean;
  exactAnchor: boolean;
}) {
  const breakdown: ClusterAuthorityFacet[] = [];
  const { members, authority, courseSitesCsAuthorityOverride, exactAnchor } = input;

  breakdown.push(
    authorityFacet({
      role: 'course_identity',
      surface: authority.site,
      entityKey: authority.id,
      resourceType: authority.source.resourceType,
      label: authority.title,
      reason: courseSitesCsAuthorityOverride
        ? `CS 课程当前以课程网站承担课程身份 authority，避免把 Canvas/Gradescope/EdStem 误讲成同层课程定义面。 ${buildCourseIdentityFieldCorroboration({ authority, exactAnchor })} ${buildCourseIdentityValueCorroboration({ authority })}`.trim()
        : exactAnchor
        ? `课程网站已经给出跨站精确锚点，所以课程身份可以 anchored 到同一个课程对象。 ${buildCourseIdentityFieldCorroboration({ authority, exactAnchor })} ${buildCourseIdentityValueCorroboration({ authority })}`.trim()
        : `当前课程簇以最强课程级 carrier 作为课程身份 authority。 ${buildCourseIdentityFieldCorroboration({ authority, exactAnchor })} ${buildCourseIdentityValueCorroboration({ authority })}`.trim(),
    }),
  );

  const canvasMember = members.find((member) => member.site === 'canvas');
  if (canvasMember) {
    breakdown.push(
      authorityFacet({
        role: 'course_delivery',
        surface: canvasMember.site,
        entityKey: canvasMember.id,
        resourceType: canvasMember.source.resourceType,
        label: canvasMember.title,
        reason:
          'Canvas 仍然是课程执行面的 strongest runtime：模块、作业、公告、消息等日常课堂流转优先看这里。 字段佐证锁在 modules / assignments / announcements / day-to-day runtime。',
      }),
    );
  }

  const edstemMember = members.find((member) => member.site === 'edstem');
  if (edstemMember) {
    breakdown.push(
      authorityFacet({
        role: 'discussion_runtime',
        surface: edstemMember.site,
        entityKey: edstemMember.id,
        resourceType: edstemMember.source.resourceType,
        label: edstemMember.title,
        reason:
          'EdStem 负责讨论/问答 runtime，所以它是课程讨论面的真实 authority。 字段佐证锁在 threads / replies / lesson discussion entry。',
      }),
    );
  }

  const gradescopeMember = members.find((member) => member.site === 'gradescope');
  if (gradescopeMember) {
    breakdown.push(
      authorityFacet({
        role: 'assessment_runtime',
        surface: gradescopeMember.site,
        entityKey: gradescopeMember.id,
        resourceType: gradescopeMember.source.resourceType,
        label: gradescopeMember.title,
        reason:
          'Gradescope 负责测评/回评 runtime，所以它是课程评估面的真实 authority。 字段佐证锁在 submissions / scores / review entry.',
      }),
    );
  }

  return breakdown;
}

function buildCourseAuthorityNarrative(breakdown: ClusterAuthorityFacet[]) {
  const parts: string[] = [];
  const identity = breakdown.find((item) => item.role === 'course_identity');
  const delivery = breakdown.find((item) => item.role === 'course_delivery');
  const discussion = breakdown.find((item) => item.role === 'discussion_runtime');
  const assessment = breakdown.find((item) => item.role === 'assessment_runtime');
  const missingCourseLanes: string[] = [];

  if (identity) {
    parts.push(`课程身份以 ${identity.surface} 为准`);
  }
  if (delivery) {
    parts.push(`课程执行面以 ${delivery.surface} 为准`);
  } else {
    missingCourseLanes.push('课程执行面');
  }
  if (discussion) {
    parts.push(`讨论流以 ${discussion.surface} 为准`);
  } else {
    missingCourseLanes.push('讨论流');
  }
  if (assessment) {
    parts.push(`评估流以 ${assessment.surface} 为准`);
  } else {
    missingCourseLanes.push('评估流');
  }
  if (missingCourseLanes.length > 0) {
    parts.push(`当前还未见独立${joinChineseLabels(missingCourseLanes)}佐证`);
  }

  return parts.join('；');
}

function buildCourseRuntimeSurfaceSummary(breakdown: ClusterAuthorityFacet[]) {
  const runtimeSurfaces = [
    ...new Set(
      breakdown
        .filter((facet) => facet.role !== 'course_identity')
        .map((facet) => facet.surface),
    ),
  ];

  if (runtimeSurfaces.length === 0) {
    return '当前还未见独立 runtime 面佐证';
  }

  return `${joinChineseLabels(runtimeSurfaces)} 保留为已 landed runtime 面`;
}

function buildCourseCoverageGapSummary(breakdown: ClusterAuthorityFacet[]) {
  const roles = new Set(breakdown.map((facet) => facet.role));
  const missing: string[] = [];

  if (!roles.has('course_delivery')) {
    missing.push('课程执行面');
  }
  if (!roles.has('discussion_runtime')) {
    missing.push('讨论流');
  }
  if (!roles.has('assessment_runtime')) {
    missing.push('评估流');
  }

  if (missing.length === 0) {
    return '';
  }

  return `当前还未见独立${joinChineseLabels(missing)}佐证。`;
}

function pickWorkFacetMember(
  members: WorkItemCandidate[],
  role: ClusterAuthorityFacet['role'],
  workType: WorkItemCluster['workType'],
) {
  const score = (member: WorkItemCandidate) => {
    if (role === 'assignment_spec') {
      if (member.surface === 'course-sites') return 100;
      if (member.surface === 'canvas') return 95;
      if (member.surface === 'gradescope') return 88;
      if (member.surface === 'edstem') return 84;
      return 0;
    }

    if (role === 'schedule_signal') {
      if (!member.dueAt && !member.startAt && !member.endAt) {
        return 0;
      }
      if (member.surface === 'course-sites') return 100;
      if (member.surface === 'canvas') return 95;
      if (member.surface === 'gradescope') return 92;
      if (member.surface === 'myuw') return 86;
      if (member.surface === 'time-schedule') return 82;
      return 60;
    }

    if (role === 'submission_state') {
      if (workType === 'grade_signal') {
        if (member.surface === 'gradescope') return 100;
        if (member.surface === 'canvas') return 92;
      }
      if (member.surface === 'canvas') return 100;
      if (member.surface === 'gradescope') return 96;
      if (member.surface === 'edstem') return 70;
      return 0;
    }

    if (role === 'feedback_detail') {
      if (member.relation === 'grade_feedback' && member.surface === 'gradescope') return 100;
      if (member.relation === 'grade_feedback' && member.surface === 'canvas') return 92;
      if (member.surface === 'gradescope') return 86;
      if (member.surface === 'canvas') return 74;
      return 0;
    }

    return 0;
  };

  return [...members].sort((left, right) => score(right) - score(left))[0];
}

function buildWorkAuthorityBreakdown(input: {
  members: WorkItemCandidate[];
  authority: WorkItemCandidate;
  workType: WorkItemCluster['workType'];
}) {
  const { members, authority, workType } = input;
  const breakdown: ClusterAuthorityFacet[] = [];

  const specMember =
    workType === 'assignment' || workType === 'deadline_signal'
      ? pickWorkFacetMember(members, 'assignment_spec', workType)
      : undefined;
  if (specMember && (specMember.surface === 'course-sites' || specMember.surface === 'canvas' || specMember.surface === 'gradescope')) {
    breakdown.push(
      authorityFacet({
        role: 'assignment_spec',
        surface: specMember.surface,
        entityKey: specMember.entityKey,
        resourceType: specMember.resourceType,
        label: specMember.label,
        reason:
          specMember.surface === 'course-sites'
            ? `课程网站负责题目规格/说明书，所以 assignment spec 先以 course-sites 为准。 ${buildWorkFieldCorroboration({ role: 'assignment_spec', member: specMember })} ${buildWorkValueCorroboration({ role: 'assignment_spec', member: specMember })}`.trim()
            : `站内 assignment carrier 仍然是 assignment spec 的更强说明面。 ${buildWorkFieldCorroboration({ role: 'assignment_spec', member: specMember })} ${buildWorkValueCorroboration({ role: 'assignment_spec', member: specMember })}`.trim(),
      }),
    );
  }

  const scheduleMember = pickWorkFacetMember(members, 'schedule_signal', workType);
  if (scheduleMember && (scheduleMember.dueAt || scheduleMember.startAt || scheduleMember.endAt)) {
    breakdown.push(
      authorityFacet({
        role: 'schedule_signal',
        surface: scheduleMember.surface,
        entityKey: scheduleMember.entityKey,
        resourceType: scheduleMember.resourceType,
        label: scheduleMember.label,
        reason:
          `时间锚点优先跟随带有截止/开始/结束时间的 strongest carrier，避免把 loose title match 当成日程真相。 ${buildWorkFieldCorroboration({ role: 'schedule_signal', member: scheduleMember })} ${buildWorkValueCorroboration({ role: 'schedule_signal', member: scheduleMember })}`.trim(),
      }),
    );
  }

  const submissionMember = pickWorkFacetMember(members, 'submission_state', workType);
  if (submissionMember && (submissionMember.surface === 'canvas' || submissionMember.surface === 'gradescope')) {
    breakdown.push(
      authorityFacet({
        role: 'submission_state',
        surface: submissionMember.surface,
        entityKey: submissionMember.entityKey,
        resourceType: submissionMember.resourceType,
        label: submissionMember.label,
        reason:
          submissionMember.surface === 'canvas'
            ? `Canvas 仍然是提交状态/待办状态的 strongest runtime lane。 ${buildWorkFieldCorroboration({ role: 'submission_state', member: submissionMember })} ${buildWorkValueCorroboration({ role: 'submission_state', member: submissionMember })}`.trim()
            : `Gradescope 当前承担更强的提交/评分 runtime，所以 submission state 跟随 Gradescope。 ${buildWorkFieldCorroboration({ role: 'submission_state', member: submissionMember })} ${buildWorkValueCorroboration({ role: 'submission_state', member: submissionMember })}`.trim(),
      }),
    );
  }

  const feedbackMember = pickWorkFacetMember(members, 'feedback_detail', workType);
  if (feedbackMember && (feedbackMember.relation === 'grade_feedback' || feedbackMember.surface === 'gradescope')) {
    breakdown.push(
      authorityFacet({
        role: 'feedback_detail',
        surface: feedbackMember.surface,
        entityKey: feedbackMember.entityKey,
        resourceType: feedbackMember.resourceType,
        label: feedbackMember.label,
        reason:
          `评分、rubric、annotation 与回评细节优先跟随最强 feedback carrier，而不是复用 assignment spec surface。 ${buildWorkFieldCorroboration({ role: 'feedback_detail', member: feedbackMember })}`.trim(),
      }),
    );
  }

  if (breakdown.length === 0) {
    breakdown.push(
      authorityFacet({
        role: workType === 'deadline_signal' ? 'schedule_signal' : 'assignment_spec',
        surface: authority.surface,
        entityKey: authority.entityKey,
        resourceType: authority.resourceType,
        label: authority.label,
        reason: `当前只有一个可用 carrier，所以统一沿用主 authority。 ${buildWorkFieldCorroboration({
          role: workType === 'deadline_signal' ? 'schedule_signal' : 'assignment_spec',
          member: authority,
        })} ${buildWorkValueCorroboration({
          role: workType === 'deadline_signal' ? 'schedule_signal' : 'assignment_spec',
          member: authority,
        })}`.trim(),
      }),
    );
  }

  return breakdown;
}

function buildWorkAuthorityNarrative(breakdown: ClusterAuthorityFacet[]) {
  return buildCompressedAuthorityNarrative(breakdown);
}

function confidenceFromSites(distinctSites: number, hasStrongKey: boolean) {
  if (distinctSites >= 2 && hasStrongKey) {
    return MatchConfidenceBandSchema.parse('high');
  }
  if (distinctSites >= 2 || hasStrongKey) {
    return MatchConfidenceBandSchema.parse('medium');
  }
  return MatchConfidenceBandSchema.parse('low');
}

function confidenceScore(band: 'high' | 'medium' | 'low') {
  if (band === 'high') {
    return 0.92;
  }
  if (band === 'medium') {
    return 0.7;
  }
  return 0.42;
}

function buildCourseClusters(courses: Course[]) {
  const grouped = new Map<string, Course[]>();
  const baseGroups = new Map<string, Course[]>();
  for (const course of courses) {
    const code = normalizeCourseCode(course);
    const baseKey = code ?? slugify(course.title);
    baseGroups.set(baseKey, [...(baseGroups.get(baseKey) ?? []), course]);
  }

  for (const [baseKey, members] of baseGroups.entries()) {
    const explicitTerms = [...new Set(members.map((member) => extractTermKey(member.url)).filter(Boolean))];
    if (explicitTerms.length <= 1) {
      const termKey = explicitTerms[0] ?? 'active';
      grouped.set(`${termKey}:${baseKey}`, members);
      continue;
    }

    for (const termKey of explicitTerms) {
      grouped.set(
        `${termKey}:${baseKey}`,
        members.filter((member) => {
          const memberTerm = extractTermKey(member.url);
          return memberTerm == null || memberTerm === termKey;
        }),
      );
    }
  }

  const clusters: CourseCluster[] = [];
  const ledger: MergeLedgerEntry[] = [];
  const courseToClusterId = new Map<string, string>();
  const now = new Date().toISOString();

  for (const [canonicalCourseKey, members] of grouped.entries()) {
    const canonicalCourseCode = [...new Set(members.map((member) => normalizeCourseCode(member)).filter(Boolean))][0];
    const exactAnchor = members.some(
      (member) =>
        member.site === 'course-sites' &&
        /gradescope|canvas\.uw\.edu|edstem/i.test(member.url ?? ''),
    );
    const courseSitesCsAuthorityOverride =
      isCsCourseCode(canonicalCourseCode) && members.some((member) => member.site === 'course-sites');
    const getCourseAuthorityScore = (course: Course) => {
      if (courseSitesCsAuthorityOverride) {
        if (course.site === 'course-sites') return 100;
        if (course.site === 'edstem' || course.site === 'gradescope') return 97;
        if (course.site === 'canvas') return 88;
      }
      return COURSE_AUTHORITY_PRIORITY[course.site] ?? 0;
    };
    const authority = [...members].sort(
      (left, right) => getCourseAuthorityScore(right) - getCourseAuthorityScore(left),
    )[0]!;
    const relatedSites = [...new Set(members.map((member) => member.site))];
    const normalizedCourseCode = canonicalCourseCode ?? normalizeCourseCode(authority);
    const band = confidenceFromSites(relatedSites.length, exactAnchor || Boolean(normalizedCourseCode));
    const authorityBreakdown = buildCourseAuthorityBreakdown({
      members,
      authority,
      courseSitesCsAuthorityOverride,
      exactAnchor,
    });
    const authorityNarrative = buildCourseAuthorityNarrative(authorityBreakdown);
    const summary =
      members.length === 1
        ? `${authority.title} 当前来自单站课程 carrier，等待后续跨站证据补齐。`
        : courseSitesCsAuthorityOverride
        ? `${authority.title} 已形成跨站课程簇；当前 CS 课程优先由课程网站担任课程级 authority，${buildCourseRuntimeSurfaceSummary(authorityBreakdown)}。 ${buildCourseCoverageGapSummary(authorityBreakdown)}`.trim()
        : band === 'high'
        ? `${authority.title} 已由 ${relatedSites.length} 个站点事实对齐成同一门课程，不再只是 loose 拼图。`
        : band === 'medium'
        ? `${authority.title} 已形成跨站课程簇，但仍需人工留意可能匹配。`
        : `${authority.title} 当前只形成单站课程簇，后续仍需更多证据。`;
    const clusterId = `cluster:course:${canonicalCourseKey}`;
    const clusterMembers = members.map((member) =>
      memberRef({
        entityKey: member.id,
        surfaceKey: member.site,
        entityKind: 'course',
        relation: member.site === authority.site ? 'authority_course_identity' : 'supporting_course_identity',
        label: member.title,
        url: member.url,
      }),
    );

    for (const member of members) {
      courseToClusterId.set(member.id, clusterId);
      ledger.push(
        MergeLedgerEntrySchema.parse({
          id: `merge:course_cluster:${clusterId}:${member.id}`,
          targetKind: 'course_cluster',
          targetId: clusterId,
          entityKey: member.id,
          surfaceKey: member.site,
          entityKind: 'course',
          decision: band === 'low' && members.length > 1 ? 'candidate' : members.length > 1 ? 'merged' : 'singleton',
          rule: exactAnchor
            ? 'course_sites_exact_anchor'
            : courseSitesCsAuthorityOverride
            ? 'course_sites_cs_authority_override'
            : normalizedCourseCode
            ? 'course_code_alignment'
            : 'title_alignment_only',
          confidenceBand: band,
          confidenceScore: confidenceScore(band),
          matchedFields: exactAnchor ? ['deep_link', 'code', 'title'] : normalizedCourseCode ? ['code', 'title'] : ['title'],
          authorityWinner: authority.id,
          reason:
            exactAnchor
              ? 'An exact course-site link points at another course carrier, so the course cluster can anchor on the shared course identity.'
              : courseSitesCsAuthorityOverride
              ? 'CS course clusters prefer the course website as course-level authority when a course-site carrier is present.'
              : normalizedCourseCode != null
              ? 'Shared course code or equivalent title alignment established this course cluster.'
              : 'Only title-level alignment is currently available for this course cluster.',
          decidedAt: now,
        }),
      );
    }

    clusters.push(
      CourseClusterSchema.parse({
        id: clusterId,
        canonicalCourseKey,
        displayTitle: authority.title,
        normalizedCourseCode,
        termKey: extractTermKey(authority.url),
        authoritySurface: authority.site,
        authorityEntityKey: authority.id,
        authorityResourceType: authority.source.resourceType,
        confidenceBand: band,
        confidenceScore: confidenceScore(band),
        needsReview: members.length > 1 && band !== 'high',
        relatedSites,
        memberEntityKeys: members.map((member) => member.id),
        members: clusterMembers,
        evidenceBundle: [
          evidence('authority_surface', `Primary course identity comes from ${authority.site}.`),
          evidence('member_count', `${members.length} course carrier(s) participate in this cluster.`),
          ...(courseSitesCsAuthorityOverride
            ? [evidence('cs_course_sites_authority', 'CS course clusters currently prefer course websites when a course-site carrier is present.')]
            : []),
          ...(exactAnchor ? [evidence('exact_anchor', 'A course-site link points directly at another course carrier.')] : []),
        ],
        summary,
        authorityNarrative,
        authorityBreakdown,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  const courseClusterById = new Map(clusters.map((cluster) => [cluster.id, cluster]));
  return { clusters, ledger, courseToClusterId, courseClusterById };
}

function buildWorkItemClusters(
  assignments: Assignment[],
  grades: Grade[],
  events: Event[],
  courseToClusterId: Map<string, string>,
  courseClusterById: Map<string, CourseCluster>,
) {
  const grouped = new Map<string, WorkItemCandidate[]>();
  const assignmentClusterKeyByEntityId = new Map<string, string>();

  const addCandidate = (candidate: WorkItemCandidate) => {
    grouped.set(candidate.key, [...(grouped.get(candidate.key) ?? []), candidate]);
  };

  for (const assignment of assignments) {
    const courseClusterId = assignment.courseId ? courseToClusterId.get(assignment.courseId) : undefined;
    const dueKey = assignment.dueAt?.slice(0, 10) ?? 'undated';
    const key = `cluster:work:${courseClusterId ?? 'unscoped'}:assignment:${slugify(assignment.title)}:${dueKey}`;
    assignmentClusterKeyByEntityId.set(assignment.id, key);
    addCandidate({
      key,
      surface: assignment.site,
      entityKind: 'assignment',
      entityKey: assignment.id,
      title: assignment.title,
      relation: 'assignment_spec',
      label: assignment.title,
      courseClusterId,
      dueAt: assignment.dueAt,
      observedAt: assignment.updatedAt ?? assignment.createdAt ?? assignment.dueAt,
      status: assignment.status,
      resourceType: assignment.source.resourceType,
      url: assignment.url,
    });
  }

  for (const grade of grades) {
    const courseClusterId = grade.courseId ? courseToClusterId.get(grade.courseId) : undefined;
    const key =
      (grade.assignmentId && assignmentClusterKeyByEntityId.get(grade.assignmentId)) ??
      `cluster:work:${courseClusterId ?? 'unscoped'}:grade_signal:${slugify(grade.title)}`;
    addCandidate({
      key,
      surface: grade.site,
      entityKind: 'grade',
      entityKey: grade.id,
      title: grade.title,
      relation: 'grade_feedback',
      label: grade.title,
      courseClusterId,
      observedAt: grade.releasedAt ?? grade.gradedAt,
      status: grade.score != null ? 'graded' : undefined,
      resourceType: grade.source.resourceType,
      url: grade.url,
    });
  }

  for (const event of events) {
    if (!['deadline', 'exam'].includes(event.eventKind)) {
      continue;
    }

    const courseClusterId = event.courseId ? courseToClusterId.get(event.courseId) : undefined;
    const key =
      (event.relatedAssignmentId && assignmentClusterKeyByEntityId.get(event.relatedAssignmentId)) ??
      `cluster:work:${courseClusterId ?? 'unscoped'}:deadline_signal:${slugify(event.title)}:${(event.startAt ?? event.endAt ?? 'undated').slice(0, 10)}`;
    addCandidate({
      key,
      surface: event.site,
      entityKind: 'event',
      entityKey: event.id,
      title: event.title,
      relation: event.eventKind === 'exam' ? 'exam_schedule' : 'deadline_signal',
      label: event.title,
      courseClusterId,
      startAt: event.startAt,
      endAt: event.endAt,
      dueAt: event.startAt ?? event.endAt,
      observedAt: event.updatedAt ?? event.startAt ?? event.endAt,
      resourceType: event.source.resourceType,
      url: event.url,
    });
  }

  const clusters: WorkItemCluster[] = [];
  const ledger: MergeLedgerEntry[] = [];
  const now = new Date().toISOString();

  function isCsCourse(clusterId: string | undefined) {
    const code = clusterId ? courseClusterById.get(clusterId)?.normalizedCourseCode : undefined;
    return /^(CSE|C SCI)\b/i.test(code ?? '');
  }

  function getWorkItemAuthorityScore(member: WorkItemCandidate, workType: WorkItemCluster['workType']) {
    if (workType === 'grade_signal') {
      if (member.surface === 'gradescope') return 100;
      if (member.surface === 'canvas') return 90;
      return 50;
    }

    if (workType === 'assignment') {
      if (isCsCourse(member.courseClusterId)) {
        if (member.surface === 'course-sites') return 100;
        if (member.surface === 'edstem') return 97;
        if (member.surface === 'gradescope') return 97;
        if (member.surface === 'canvas') return 88;
      } else {
        if (member.surface === 'canvas') return 100;
        if (member.surface === 'edstem') return 94;
        if (member.surface === 'course-sites') return 90;
        if (member.surface === 'gradescope') return 86;
      }
    }

    if (workType === 'deadline_signal') {
      if (member.surface === 'course-sites') return 100;
      if (member.surface === 'canvas') return 90;
      if (member.surface === 'myuw') return 82;
      if (member.surface === 'time-schedule') return 75;
      return WORK_ITEM_AUTHORITY_PRIORITY[member.surface] ?? 0;
    }

    return WORK_ITEM_AUTHORITY_PRIORITY[member.surface] ?? 0;
  }

  for (const [id, members] of grouped.entries()) {
    const workType =
      members.some((member) => member.relation === 'grade_feedback')
        ? 'grade_signal'
        : members.some((member) => member.relation === 'deadline_signal' || member.relation === 'exam_schedule')
        ? 'deadline_signal'
        : 'assignment';
    const authority = [...members].sort(
      (left, right) => getWorkItemAuthorityScore(right, workType) - getWorkItemAuthorityScore(left, workType),
    )[0]!;
    const relatedSites = [...new Set(members.flatMap((member) => (member.surface === 'myplan' ? [] : [member.surface])))];
    const exactAnchor = members.some(
      (member) =>
        member.surface === 'course-sites' &&
        /gradescope|canvas\.uw\.edu|edstem/i.test(member.url ?? ''),
    );
    const band = confidenceFromSites(
      relatedSites.length,
      exactAnchor || (Boolean(authority.courseClusterId) && Boolean(authority.dueAt || authority.startAt || authority.endAt)),
    );
    const authorityBreakdown = buildWorkAuthorityBreakdown({ members, authority, workType });
    const authorityNarrative = buildWorkAuthorityNarrative(authorityBreakdown);
    const title = authority.title;
    const dueAt = authority.dueAt ?? members.find((member) => member.dueAt)?.dueAt;
    const startAt = authority.startAt ?? members.find((member) => member.startAt)?.startAt;
    const endAt = authority.endAt ?? members.find((member) => member.endAt)?.endAt;
    const observedAt =
      [...members]
        .map((member) => member.observedAt)
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => right.localeCompare(left))[0] ?? now;
    const status =
      members.some((member) => member.relation === 'grade_feedback')
        ? 'graded'
        : members.find((member) => member.status)?.status;

    for (const member of members) {
      ledger.push(
        MergeLedgerEntrySchema.parse({
          id: `merge:work_item_cluster:${id}:${member.entityKey}`,
          targetKind: 'work_item_cluster',
          targetId: id,
          entityKey: member.entityKey,
          surfaceKey: member.surface,
          entityKind: member.entityKind,
          decision: band === 'low' && members.length > 1 ? 'candidate' : members.length > 1 ? 'merged' : 'singleton',
          rule: member.relation,
          confidenceBand: band,
          confidenceScore: confidenceScore(band),
          matchedFields: exactAnchor ? ['deep_link', 'title', 'time_anchor'] : ['title', 'time_anchor'],
          authorityWinner: authority.entityKey,
          reason: exactAnchor
            ? 'Exact linked carrier plus shared course/time anchors determine the work-item cluster.'
            : 'Shared course cluster, normalized title, and time anchors determine the work-item cluster.',
          decidedAt: now,
        }),
      );
    }

    clusters.push(
      WorkItemClusterSchema.parse({
        id,
        workType,
        courseClusterId: authority.courseClusterId,
        title,
        status,
        dueAt,
        startAt,
        endAt,
        authoritySurface: authority.surface,
        authorityEntityKey: authority.entityKey,
        authorityResourceType: authority.resourceType,
        confidenceBand: band,
        confidenceScore: confidenceScore(band),
        needsReview: members.length > 1 && band !== 'high',
        relatedSites,
        memberEntityKeys: members.map((member) => member.entityKey),
        members: members.map((member) =>
          memberRef({
            entityKey: member.entityKey,
            surfaceKey: member.surface,
            entityKind: member.entityKind,
            relation: member.relation,
            label: member.label,
            courseId: undefined,
            dueAt: member.dueAt,
            startAt: member.startAt,
            endAt: member.endAt,
          }),
        ),
        evidenceBundle: [
          evidence('authority_surface', `Primary work-item truth comes from ${authority.surface}.`),
          evidence('member_count', `${members.length} carrier(s) currently support this work-item cluster.`),
          ...(exactAnchor ? [evidence('exact_anchor', 'A course-site deep link points directly at another site carrier.')] : []),
        ],
        summary:
          band === 'high'
            ? `${title} is now a high-confidence merged work item: ${authorityNarrative}.`
            : band === 'medium'
            ? `${title} now has a usable merged cluster: ${authorityNarrative}; some authority still needs manual review.`
            : `${title} still needs a clearer cross-site merge before it can act like one combined task.`,
        authorityNarrative,
        authorityBreakdown,
        createdAt: observedAt,
        updatedAt: observedAt,
      }),
    );
  }

  return { clusters, ledger };
}

function buildAdministrativeSummaries(
  planningSubstrates: PlanningSubstrateOwner[],
  announcements: Announcement[],
  events: Event[],
  adminCarriers: AdminCarrierRecord[],
) {
  const summaries: AdministrativeSummary[] = [];
  const landedFamilies = new Set<string>();
  const latestPlanning = [...planningSubstrates].sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))[0];
  const latestMyPlan = [...planningSubstrates]
    .filter((entry) => entry.source === 'myplan')
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))[0];
  const blockerUpdatedAt =
    [
      latestPlanning?.capturedAt,
      ...announcements.map((announcement) => announcement.postedAt),
      ...events.map((event) => event.startAt ?? event.endAt),
      ...adminCarriers.map((carrier) => carrier.updatedAt),
    ]
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => left.localeCompare(right))
      .at(-1) ?? '1970-01-01T00:00:00.000Z';

  if (latestMyPlan && (latestMyPlan.degreeProgressSummary || latestMyPlan.requirementGroupCount > 0)) {
    landedFamilies.add('dars');
    const darsReviewReady = (latestMyPlan.exactBlockers?.length ?? 0) === 0;
    summaries.push(
      AdministrativeSummarySchema.parse({
        id: `admin-summary:dars:${latestMyPlan.id}`,
        family: 'dars',
        laneStatus: darsReviewReady ? 'standalone_detail_runtime_lane' : 'landed_summary_lane',
        detailRuntimeStatus: darsReviewReady ? 'review_ready' : 'pending',
        title: `${latestMyPlan.planLabel} · Degree requirements`,
        summary:
          latestMyPlan.degreeProgressSummary ??
          `${latestMyPlan.requirementGroupCount} requirement group(s) are currently tracked in the planning substrate.`,
        detailRuntimeNote: darsReviewReady
          ? 'DARS now rides a review-first shared planning lane because both MyPlan plan context and audit-summary context are present in the current planning substrate.'
          : 'DARS still stays summary-first until the shared planning substrate captures both the MyPlan plan half and the audit-summary half.',
        importance: latestMyPlan.requirementGroupCount > 0 ? 'high' : 'medium',
        aiDefault: 'blocked',
        authoritySource: 'myplan planning snapshot',
        sourceSurface: 'myplan',
        nextAction: 'Review or export the DARS-aligned summary before any AI analysis.',
        exactBlockers: toAdministrativeBlockers(latestMyPlan.exactBlockers),
        updatedAt: latestMyPlan.capturedAt,
      }),
    );
  }

  const tuitionSignals = [
    ...announcements.filter((announcement) => isMyUWDecisionSignalAnnouncement(announcement) && TUITION_PATTERN.test(`${announcement.title} ${announcement.summary ?? ''}`)),
    ...events.filter((event) => isMyUWDecisionSignalEvent(event) && TUITION_PATTERN.test(`${event.title} ${event.summary ?? ''}`)),
  ];

  for (const signal of tuitionSignals) {
    landedFamilies.add('tuition');
    summaries.push(
      AdministrativeSummarySchema.parse({
        id: `admin-summary:tuition:${signal.id}`,
        family: 'tuition',
        laneStatus: 'landed_summary_lane',
        detailRuntimeStatus: 'pending',
        title: signal.title,
        summary: signal.summary ?? 'MyUW surfaced a tuition or billing reminder.',
        importance: signal.kind === 'event' ? 'high' : 'medium',
        aiDefault: 'blocked',
        authoritySource: `myuw ${signal.kind === 'event' ? 'event' : 'notice'} reminder`,
        sourceSurface: 'myuw',
        nextAction: 'Use export-first review for any billing or account detail.',
        updatedAt:
          signal.kind === 'event'
            ? signal.startAt ?? signal.endAt ?? new Date().toISOString()
            : signal.postedAt ?? new Date().toISOString(),
      }),
    );
  }

  for (const carrier of adminCarriers) {
    landedFamilies.add(carrier.family);
    summaries.push(
      AdministrativeSummarySchema.parse({
        id: carrier.id.replace('admin-carrier', 'admin-summary'),
        family: carrier.family,
        laneStatus: carrier.laneStatus,
        detailRuntimeStatus: carrier.detailRuntimeStatus,
        title: carrier.title,
        summary: carrier.summary,
        detailRuntimeNote: carrier.detailRuntimeNote,
        importance: carrier.importance,
        aiDefault: carrier.aiDefault,
        authoritySource: carrier.authoritySource,
        sourceSurface: carrier.sourceSurface,
        nextAction: carrier.nextAction,
        exactBlockers: carrier.exactBlockers,
        updatedAt: carrier.updatedAt,
      }),
    );
  }

  const blockerSummaries: Array<Pick<AdministrativeSummary, 'family' | 'title' | 'summary' | 'importance' | 'nextAction' | 'sourceSurface'>> =
    [
      {
        family: 'dars',
        title: 'Degree requirements review',
        summary:
          'Degree requirements are not visible in this desk yet. Keep DARS review-first until a trustworthy planning summary is available.',
        importance: 'high',
        nextAction:
          'Keep DARS export-first until a planning-backed degree review summary is available or an exact external blocker is proven.',
        sourceSurface: 'myplan',
      },
      {
        family: 'transcript',
        title: 'Transcript review summary',
        summary: 'Transcript details are not visible in this desk yet. Review the current summary or export first until a stronger transcript lane is available.',
        importance: 'high',
        nextAction: 'Do not claim transcript support; either land a summary-first carrier or record an exact external blocker after a bounded live push.',
        sourceSurface: 'myuw',
      },
      {
        family: 'finaid',
        title: 'Financial aid review summary',
        summary: 'Financial aid details are not visible in this desk yet. Keep this slice review-first until a stronger aid summary is available.',
        importance: 'high',
        nextAction: 'Keep export-first and AI-blocked until a summary carrier is landed or an exact external blocker is proven.',
        sourceSurface: 'myuw',
      },
      {
        family: 'accounts',
        title: 'Account review summary',
        summary: 'Account details are not visible in this desk yet. Keep this slice review-first until a stronger account summary is available.',
        importance: 'medium',
        nextAction: 'Keep review/export-first and AI-blocked until a summary carrier is landed or an exact blocker is proven.',
        sourceSurface: 'myuw',
      },
      {
        family: 'tuition_detail',
        title: 'Tuition review summary',
        summary:
          'Billing details are not visible in this desk yet. Keep this slice review-first until a stronger tuition summary is available.',
        importance: 'high',
        nextAction:
          'Keep tuition detail review/export-first until a statement-backed summary carrier is landed or an exact external blocker is proven.',
        sourceSurface: 'myuw',
      },
      {
        family: 'profile',
        title: 'Profile review summary',
        summary:
          'Profile details are not visible in this desk yet. Keep this slice review-first until a stronger profile summary is available.',
        importance: 'medium',
        nextAction:
          'Keep profile review/export-first until a page-backed summary carrier is landed or an exact external blocker is proven.',
        sourceSurface: 'myuw',
      },
    ];

  for (const blocker of blockerSummaries) {
    if (landedFamilies.has(blocker.family)) {
      continue;
    }
    summaries.push(
      AdministrativeSummarySchema.parse({
        id: `admin-summary:${blocker.family}:blocker`,
        family: blocker.family,
        laneStatus: 'carrier_not_landed',
        detailRuntimeStatus: 'blocked_missing_carrier',
        title: blocker.title,
        summary: blocker.summary,
        importance: blocker.importance,
        aiDefault: 'blocked',
        authoritySource: 'myuw candidate summary (capture needed)',
        sourceSurface: blocker.sourceSurface,
        nextAction: blocker.nextAction,
        exactBlockers: [
          {
            id: `${blocker.family}_missing_runtime_lane`,
            summary: blocker.summary,
            whyItStopsPromotion: blocker.nextAction,
          },
        ],
        updatedAt: blockerUpdatedAt,
      }),
    );
  }

  return summaries;
}

export async function recomputeClusterSubstrate(db: CampusCopilotDB = campusCopilotDb) {
  const [courses, assignments, grades, events, planningSubstrates, announcements, adminCarriers, reviewOverrides] =
    await Promise.all([
      db.courses.toArray(),
      db.assignments.toArray(),
      db.grades.toArray(),
      db.events.toArray(),
      db.planning_substrates.toArray(),
      db.announcements.toArray(),
      getAdminCarriers(db),
      getClusterReviewOverrides(db),
    ]);

  const { clusters: rawCourseClusters, ledger: courseLedger, courseToClusterId, courseClusterById } = buildCourseClusters(courses);
  const { clusters: rawWorkItemClusters, ledger: workItemLedger } = buildWorkItemClusters(
    assignments,
    grades,
    events,
    courseToClusterId,
    courseClusterById,
  );
  const courseClusters = applyClusterReviewOverrides('course_cluster', rawCourseClusters, reviewOverrides).map((cluster) =>
    CourseClusterSchema.parse(cluster),
  );
  const workItemClusters = applyClusterReviewOverrides('work_item_cluster', rawWorkItemClusters, reviewOverrides).map(
    (cluster) => WorkItemClusterSchema.parse(cluster),
  );
  const administrativeSummaries = buildAdministrativeSummaries(planningSubstrates, announcements, events, adminCarriers);
  const mergeLedger = [...courseLedger, ...workItemLedger];

  await db.transaction(
    'rw',
    [db.course_clusters, db.work_item_clusters, db.merge_ledger, db.administrative_summaries],
    async () => {
      await Promise.all([
        db.course_clusters.clear(),
        db.work_item_clusters.clear(),
        db.merge_ledger.clear(),
        db.administrative_summaries.clear(),
      ]);

      if (courseClusters.length > 0) {
        await db.course_clusters.bulkPut(courseClusters);
      }
      if (workItemClusters.length > 0) {
        await db.work_item_clusters.bulkPut(workItemClusters);
      }
      if (mergeLedger.length > 0) {
        await db.merge_ledger.bulkPut(mergeLedger);
      }
      if (administrativeSummaries.length > 0) {
        await db.administrative_summaries.bulkPut(administrativeSummaries);
      }
    },
  );

  return {
    courseClusters,
    workItemClusters,
    mergeLedger,
    administrativeSummaries,
  };
}

export async function getAllCourseClusters(db: CampusCopilotDB = campusCopilotDb) {
  return db.course_clusters.toArray();
}

export async function getAllWorkItemClusters(db: CampusCopilotDB = campusCopilotDb) {
  return db.work_item_clusters.toArray();
}

export async function getAdministrativeSummaries(db: CampusCopilotDB = campusCopilotDb) {
  return db.administrative_summaries.toArray();
}

export async function getMergeHealthSummary(db: CampusCopilotDB = campusCopilotDb): Promise<MergeHealthSummary> {
  const [courseClusters, workItemClusters] = await Promise.all([
    db.course_clusters.toArray(),
    db.work_item_clusters.toArray(),
  ]);

  const authorityConflictCount = [...courseClusters, ...workItemClusters].filter((cluster) => {
    if (!isClusterReviewPending(cluster) || cluster.relatedSites.length < 2) {
      return false;
    }

    const members = cluster.members.filter((member) => member.surfaceKey !== 'myplan');
    const topPriority = Math.max(
      ...members.map((member) =>
        member.entityKind === 'course'
          ? COURSE_AUTHORITY_PRIORITY[member.surfaceKey as Site] ?? 0
          : WORK_ITEM_AUTHORITY_PRIORITY[member.surfaceKey] ?? 0,
      ),
    );
    const topSurfaces = new Set(
      members
        .filter((member) =>
          (member.entityKind === 'course'
            ? COURSE_AUTHORITY_PRIORITY[member.surfaceKey as Site] ?? 0
            : WORK_ITEM_AUTHORITY_PRIORITY[member.surfaceKey] ?? 0) === topPriority,
        )
        .map((member) => member.surfaceKey),
    );

    return topSurfaces.size > 1;
  }).length;

  return MergeHealthSummarySchema.parse({
    mergedCount: [...courseClusters, ...workItemClusters].filter((cluster) => shouldCountClusterAsMerged(cluster)).length,
    possibleMatchCount: [...courseClusters, ...workItemClusters].filter((cluster) => isClusterReviewPending(cluster)).length,
    unresolvedCount: [...courseClusters, ...workItemClusters].filter(
      (cluster) => isClusterReviewPending(cluster),
    ).length,
    authorityConflictCount,
  });
}
