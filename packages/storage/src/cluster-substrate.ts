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
    const summary =
      members.length === 1
        ? `${authority.title} 当前来自单站课程 carrier，等待后续跨站证据补齐。`
        : courseSitesCsAuthorityOverride
        ? `${authority.title} 已形成跨站课程簇；当前 CS 课程优先由课程网站担任课程级 authority。`
        : band === 'high'
        ? `${authority.title} 已由 ${relatedSites.length} 个站点事实对齐成同一门课程。`
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
            ? `${title} 已被折成高置信度统一工作项。`
            : band === 'medium'
            ? `${title} 已形成可用工作项簇，但仍应显示为可能匹配。`
            : `${title} 当前仍是单站工作项或低置信度候选。`,
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
    summaries.push(
      AdministrativeSummarySchema.parse({
        id: `admin-summary:dars:${latestMyPlan.id}`,
        family: 'dars',
        laneStatus: 'landed_summary_lane',
        title: `${latestMyPlan.planLabel} · Degree requirements`,
        summary:
          latestMyPlan.degreeProgressSummary ??
          `${latestMyPlan.requirementGroupCount} requirement group(s) are currently tracked in the planning substrate.`,
        importance: latestMyPlan.requirementGroupCount > 0 ? 'high' : 'medium',
        aiDefault: 'blocked',
        authoritySource: 'myplan planning substrate (DARS summary lane)',
        sourceSurface: 'myplan',
        nextAction: 'Review or export the DARS-aligned summary before any AI analysis.',
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
        laneStatus: 'landed_summary_lane',
        title: carrier.title,
        summary: carrier.summary,
        importance: carrier.importance,
        aiDefault: carrier.aiDefault,
        authoritySource: carrier.authoritySource,
        sourceSurface: carrier.sourceSurface,
        nextAction: carrier.nextAction,
        updatedAt: carrier.updatedAt,
      }),
    );
  }

  const blockerSummaries: Array<Pick<AdministrativeSummary, 'family' | 'title' | 'summary' | 'importance' | 'nextAction' | 'sourceSurface'>> =
    [
      {
        family: 'dars',
        title: 'DARS summary lane',
        summary:
          'No truthful DARS summary lane is landed yet. Degree-audit detail remains blocked until the shared planning substrate captures a lawful summary carrier.',
        importance: 'high',
        nextAction:
          'Keep DARS review/export-first until a planning-backed summary lane is landed or an exact external blocker is proven.',
        sourceSurface: 'myplan',
      },
      {
        family: 'transcript',
        title: 'Transcript summary lane',
        summary: 'No truthful transcript runtime carrier is landed yet. Historical-record detail remains blocked until a lawful summary carrier is proven.',
        importance: 'high',
        nextAction: 'Do not claim transcript support; either land a summary-first carrier or record an exact external blocker after a bounded live push.',
        sourceSurface: 'myuw',
      },
      {
        family: 'finaid',
        title: 'Financial-aid summary lane',
        summary: 'No truthful financial-aid runtime carrier is landed yet. Aid detail remains blocked pending a lawful summary-first carrier.',
        importance: 'high',
        nextAction: 'Keep export-first and AI-blocked until a summary carrier is landed or an exact external blocker is proven.',
        sourceSurface: 'myuw',
      },
      {
        family: 'accounts',
        title: 'Accounts summary lane',
        summary: 'No truthful accounts runtime carrier is landed yet. Account-state detail remains blocked pending a lawful summary-first carrier.',
        importance: 'medium',
        nextAction: 'Keep review/export-first and AI-blocked until a summary carrier is landed or an exact blocker is proven.',
        sourceSurface: 'myuw',
      },
      {
        family: 'tuition_detail',
        title: 'Tuition-detail summary lane',
        summary:
          'No truthful tuition-detail runtime carrier is landed yet. Billing-statement detail remains blocked until a lawful summary-first carrier is proven.',
        importance: 'high',
        nextAction:
          'Keep tuition detail review/export-first until a statement-backed summary carrier is landed or an exact external blocker is proven.',
        sourceSurface: 'myuw',
      },
      {
        family: 'profile',
        title: 'Profile summary lane',
        summary:
          'No truthful profile runtime carrier is landed yet. Personal-profile detail remains blocked until a lawful summary-first carrier is proven.',
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
        title: blocker.title,
        summary: blocker.summary,
        importance: blocker.importance,
        aiDefault: 'blocked',
        authoritySource: 'myuw candidate lane (carrier not landed)',
        sourceSurface: blocker.sourceSurface,
        nextAction: blocker.nextAction,
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
    if (!cluster.needsReview || cluster.relatedSites.length < 2) {
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
    mergedCount: [...courseClusters, ...workItemClusters].filter((cluster) => cluster.confidenceBand !== 'low').length,
    possibleMatchCount: [...courseClusters, ...workItemClusters].filter((cluster) => cluster.needsReview).length,
    unresolvedCount: [...courseClusters, ...workItemClusters].filter(
      (cluster) =>
        cluster.needsReview && cluster.reviewDecision !== 'accepted' && cluster.reviewDecision !== 'dismissed',
    ).length,
    authorityConflictCount,
  });
}
