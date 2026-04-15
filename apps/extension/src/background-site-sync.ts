import {
  CanvasApiClient,
  createCanvasAdapter,
  type CanvasSyncResult,
} from '@campus-copilot/adapters-canvas';
import {
  createEdStemAdapter,
  EdStemApiClient,
  type EdStemSyncResult,
} from '@campus-copilot/adapters-edstem';
import {
  GradescopeApiClient,
  createGradescopeAdapter,
  type GradescopePathConfig,
  type GradescopeSyncResult,
} from '@campus-copilot/adapters-gradescope';
import {
  createMyUWAdapter,
  MyUWApiClient,
  type MyUWSyncResult,
} from '@campus-copilot/adapters-myuw';
import {
  createCourseSitesAdapter,
  type CourseSitesSyncResult,
} from '@campus-copilot/adapters-course-sites';
import {
  extractTimeScheduleSectionDetailPage,
  TIME_SCHEDULE_EXACT_BLOCKERS,
  TIME_SCHEDULE_STAGE_UNDERSTANDING,
} from '../../../packages/adapters-time-schedule/src/index.ts';
import {
  type CanvasSyncStatusView,
  type GetSiteSyncStatusResponse,
  type SiteSyncStatusView,
  type SyncSiteCommandResponse,
  SYNC_SITE_COMMAND,
} from '@campus-copilot/core';
import {
  campusCopilotDb,
  getSiteEntityCounts,
  getSyncStateBySite,
  putSyncState,
  recordSiteSyncError,
  replacePlanningSubstratesBySource,
  replaceSiteSnapshot,
  type SiteSnapshotPayload,
  upsertAdminCarriers,
} from '@campus-copilot/storage';
import { HealthStatusSchema, type Site } from '@campus-copilot/schema';
import {
  buildDefaultEdStemPathConfig,
  createCanvasTabRequestExecutor,
  createEdStemTabRequestExecutor,
  createGradescopeTabRequestExecutor,
  createMyUWTabRequestExecutor,
  extractMyUWContext,
  extractPageHtml,
  getActiveTabContext,
  type ActiveTabContext,
  type SyncTargetOverride,
} from './background-tab-context';
import { extractAdminCarriersFromPageHtml } from './background-admin-high-sensitivity-substrate';
import { buildResourceFailures, getSyncOutcomeForPersistence } from './background-runtime';
import { getEdStemPathConfig, loadExtensionConfig, type ExtensionConfig } from './config';

export type SiteSyncDependencies = {
  activeTab: ActiveTabContext;
  now: string;
  config: ExtensionConfig;
  pageHtml?: string;
};

type SyncAttempt = {
  mode: 'official_api' | 'private_api' | 'state' | 'dom';
  collectorName: string;
  success: boolean;
  skipped?: boolean;
  errorReason?: string;
};

type TimeScheduleAttemptsByResource = Partial<
  Record<'courses' | 'resources' | 'assignments' | 'announcements' | 'grades' | 'messages' | 'events', SyncAttempt[]>
>;

type TimeScheduleSyncResult =
  | {
      ok: true;
      site: 'time-schedule';
      outcome: 'success';
      syncedAt: string;
      snapshot: SiteSnapshotPayload;
      health: {
        status: 'healthy';
        checkedAt: string;
        code: 'supported';
        reason?: string;
      };
      attemptsByResource: TimeScheduleAttemptsByResource;
    }
  | {
      ok: false;
      site: 'time-schedule';
      outcome: 'unsupported_context' | 'normalize_failed';
      syncedAt: string;
      errorReason: string;
      health: {
        status: 'unavailable';
        checkedAt: string;
        code: 'unsupported_context' | 'normalize_failed';
        reason: string;
      };
      attemptsByResource: TimeScheduleAttemptsByResource;
    };

type SiteSyncResult =
  | CanvasSyncResult
  | GradescopeSyncResult
  | EdStemSyncResult
  | MyUWSyncResult
  | CourseSitesSyncResult
  | TimeScheduleSyncResult;

const GRADESCOPE_PATHS: GradescopePathConfig = {
  assignmentsPath: '/internal/assignments',
  gradesPath: '/internal/grades',
};

type TimeScheduleParsedSection = {
  sectionIdentity: string;
  sectionId: string;
  sln: string;
  meetingMode: 'scheduled' | 'arranged';
  meetingDays: string;
  timeText: string;
  locationText?: string;
};

type TimeScheduleParsedCourse = {
  courseKey: string;
  title: string;
  catalogUrl?: string;
  sections: TimeScheduleParsedSection[];
};

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

function decodeEntities(input: string) {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (entity, token) => {
    const normalizedToken = String(token).toLowerCase();
    if (normalizedToken === '#39' || normalizedToken === '#x27') {
      return "'";
    }
    if (normalizedToken.startsWith('#x') || normalizedToken.startsWith('#')) {
      const codePoint = Number.parseInt(
        normalizedToken.startsWith('#x') ? normalizedToken.slice(2) : normalizedToken.slice(1),
        normalizedToken.startsWith('#x') ? 16 : 10,
      );
      if (!Number.isFinite(codePoint) || codePoint <= 0) {
        return entity;
      }
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return entity;
      }
    }
    return HTML_ENTITY_MAP[normalizedToken] ?? entity;
  });
}

function replaceLineBreakTags(input: string) {
  return input.replace(/<br\b[^>]*\/?>/gi, '\n');
}

function stripTags(input: string) {
  let text = '';
  let insideTag = false;

  for (const character of input) {
    if (character === '<') {
      insideTag = true;
      continue;
    }
    if (insideTag) {
      if (character === '>') {
        insideTag = false;
      }
      continue;
    }
    text += character;
  }

  return text;
}

function htmlToPlainText(input: string) {
  return decodeEntities(stripTags(input));
}

function htmlToPlainTextWithLineBreaks(input: string) {
  return decodeEntities(stripTags(replaceLineBreakTags(input)));
}

function normalizeWhitespace(input: string) {
  return htmlToPlainText(input).replace(/\s+/g, ' ').trim();
}

function absoluteTimeScheduleUrl(rawUrl: string) {
  return new URL(rawUrl, 'https://www.washington.edu').toString();
}

function parseTimeScheduleCourseHeaders(html: string) {
  const headerRegex =
    /<table[^>]*bgcolor=["']#ccffcc["'][^>]*>\s*<tr>\s*<td width="50%">\s*<b>\s*<a name=(?<anchor>["']?[^"'>\s]+["']?)>(?<courseHtml>[\s\S]*?)<\/a>\s*&nbsp;\s*<a href=(?<href>["']?[^>\s]+["']?)>(?<titleHtml>[\s\S]*?)<\/a>\s*<\/b>\s*<\/td>[\s\S]*?<\/table>/gi;
  const matches = Array.from(html.matchAll(headerRegex));

  return matches.map((match, index) => {
    const currentIndex = match.index ?? 0;
    const nextIndex = matches[index + 1]?.index ?? html.length;
    return {
      courseKey: normalizeWhitespace(match.groups?.courseHtml ?? ''),
      title: normalizeWhitespace(match.groups?.titleHtml ?? ''),
      catalogUrl: match.groups?.href
        ? absoluteTimeScheduleUrl(match.groups.href.replace(/^["']|["']$/g, ''))
        : undefined,
      blockHtml: html.slice(currentIndex, nextIndex),
    };
  });
}

function parseTimeScheduleNoteLines(sectionHtml: string) {
  return htmlToPlainTextWithLineBreaks(sectionHtml)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(1)
    .filter((line) => line !== '--');
}

function inferTimeScheduleLocation(noteLines: string[]) {
  const patterns = [
    /\bCLASS WILL BE IN ([A-Z]{2,5}\s+\d{2,4}[A-Z]?)\b/i,
    /\b(?:COURSE\s+)?MEETS IN ([A-Z]{2,5}\s+\d{2,4}[A-Z]?)\b/i,
    /\bIN ROOM ([A-Z]{2,5}\s+\d{2,4}[A-Z]?)\b/i,
  ];

  for (const line of noteLines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }

  return undefined;
}

function parseTimeScheduleMeetingTokens(rawTail: string) {
  const statusIndex = rawTail.search(/\b(?:Open|Closed)\b/);
  const tail = statusIndex >= 0 ? rawTail.slice(0, statusIndex).trim() : rawTail.trim();
  const normalized = tail.replace(/\s+/g, ' ').trim();
  const arranged = /to be arranged/i.test(normalized);
  const timeMatch = normalized.match(/(?<days>MTWThF|MTWTh|MTW|TTh|MWF|MW|WF|Th|T|W|F)\s+(?<time>\d{3,4}-\d{3,4}[A-Z]?)/i);

  if (arranged) {
    return {
      meetingMode: 'arranged' as const,
      meetingDays: 'to be arranged',
      timeText: 'to be arranged',
    };
  }

  if (timeMatch?.groups?.days && timeMatch.groups.time) {
    return {
      meetingMode: 'scheduled' as const,
      meetingDays: timeMatch.groups.days,
      timeText: timeMatch.groups.time,
    };
  }

  return {
    meetingMode: 'scheduled' as const,
    meetingDays: 'unknown',
    timeText: 'unknown',
  };
}

function parseTimeScheduleSection(sectionHtml: string, courseKey: string) {
  const lineText = normalizeWhitespace(sectionHtml);
  const prefixMatch = lineText.match(/^(?:(?:Restr|IS)\s+)?(?<sln>\d{5})\s+(?<sectionId>[A-Z0-9]+)\s+(?<tail>.+)$/i);
  if (!prefixMatch?.groups?.sln || !prefixMatch.groups.sectionId || !prefixMatch.groups.tail) {
    return undefined;
  }

  const noteLines = parseTimeScheduleNoteLines(sectionHtml);
  const meeting = parseTimeScheduleMeetingTokens(prefixMatch.groups.tail);

  return {
    sectionIdentity: `${courseKey}:${prefixMatch.groups.sectionId}:${prefixMatch.groups.sln}`,
    sectionId: prefixMatch.groups.sectionId,
    sln: prefixMatch.groups.sln,
    meetingMode: meeting.meetingMode,
    meetingDays: meeting.meetingDays,
    timeText: meeting.timeText,
    locationText: inferTimeScheduleLocation(noteLines),
  } satisfies TimeScheduleParsedSection;
}

function toTimeScheduleCourseId(courseKey: string) {
  return `time-schedule:course:${courseKey}`;
}

function isTimeScheduleSectionDetailUrl(url: string) {
  return /sdb\.admin\.washington\.edu\/timeschd\/uwnetid\/sln\.asp/i.test(url);
}

function formatTimeScheduleDetailStatus(status: ReturnType<typeof extractTimeScheduleSectionDetailPage>['status']) {
  if (status === 'open') {
    return 'Open';
  }
  if (status === 'closed') {
    return 'Closed';
  }
  return undefined;
}

function buildTimeScheduleSeatAvailabilitySummary(detail: ReturnType<typeof extractTimeScheduleSectionDetailPage>) {
  if (detail.spaceAvailable != null) {
    const seatsLabel = detail.spaceAvailable === 1 ? '1 seat available' : `${detail.spaceAvailable} seats available`;
    return detail.currentEnrollment != null && detail.enrollmentLimit != null
      ? `${seatsLabel} (${detail.currentEnrollment}/${detail.enrollmentLimit} enrolled)`
      : seatsLabel;
  }

  if (detail.currentEnrollment != null && detail.enrollmentLimit != null) {
    return `${detail.currentEnrollment}/${detail.enrollmentLimit} enrolled`;
  }

  return undefined;
}

function buildTimeScheduleAdvisorySummaries(detail: ReturnType<typeof extractTimeScheduleSectionDetailPage>) {
  const advisories: string[] = [];
  if (detail.noteLines.some((line) => /SELF-PLACEMENT/i.test(line))) {
    advisories.push('Advisory: Self-placement guidance available');
  }

  const noCreditLine = detail.noteLines.find((line) => /NO CREDIT FOR STUDENTS WHO HAVE COMPLETED/i.test(line));
  const blockedCourseMatch = noCreditLine?.match(/COMPLETED\s+(?<course>[A-Z]{2,5}\s*\d{3}[A-Z]?)\b/i);
  if (blockedCourseMatch?.groups?.course) {
    advisories.push(`Restriction: No credit after ${blockedCourseMatch.groups.course.replace(/\s+/g, ' ').trim()}`);
  }

  return advisories;
}

function buildTimeScheduleDetailSnapshot(pageHtml: string, url: string): SiteSnapshotPayload {
  const detail = extractTimeScheduleSectionDetailPage(pageHtml);
  const primaryMeeting = detail.meetings[0];
  const meetingPattern =
    primaryMeeting && primaryMeeting.days && primaryMeeting.timeText
      ? `${primaryMeeting.days} ${primaryMeeting.timeText}`.trim()
      : 'meeting pattern unavailable';
  const seatAvailabilitySummary = buildTimeScheduleSeatAvailabilitySummary(detail);
  const advisorySummaries = buildTimeScheduleAdvisorySummaries(detail);
  const detailParts = [
    meetingPattern,
    primaryMeeting?.location,
    primaryMeeting?.instructor,
    formatTimeScheduleDetailStatus(detail.status),
    seatAvailabilitySummary,
    detail.sectionType ? `${detail.sectionType} section` : undefined,
    detail.credits ? `${detail.credits} credits` : undefined,
    detail.generalEducation ? `Reqs: ${detail.generalEducation}` : undefined,
    detail.textbooksAvailable ? 'Textbooks listed' : undefined,
    ...advisorySummaries,
  ].filter(Boolean);

  return {
    courses: [
      {
        id: toTimeScheduleCourseId(detail.courseKey),
        kind: 'course',
        site: 'time-schedule',
        source: {
          site: 'time-schedule',
          resourceId: detail.courseKey,
          resourceType: 'section_detail_course',
          url,
        },
        url,
        title: detail.title,
        code: detail.courseKey,
      },
    ],
    events: [
      {
        id: `time-schedule:event:${detail.courseKey}:${detail.sectionId}:${detail.sln}`,
        kind: 'event',
        site: 'time-schedule',
        source: {
          site: 'time-schedule',
          resourceId: `${detail.courseKey}:${detail.sectionId}:${detail.sln}`,
          resourceType: 'section_detail',
          url,
        },
        courseId: toTimeScheduleCourseId(detail.courseKey),
        eventKind: 'class',
        title: `${detail.courseKey} ${detail.sectionId}`,
        summary: `${detail.quarterLabel} section detail`,
        location: primaryMeeting?.location,
        detail: detailParts.join(' · ') || undefined,
      },
    ],
  };
}

function buildTimeScheduleSnapshot(pageHtml: string, url: string): SiteSnapshotPayload {
  const quarter =
    normalizeWhitespace(pageHtml.match(/<h1>\s*(?<quarter>[^<]+?)\s+Course Offerings\s*<\/h1>/i)?.groups?.quarter ?? '') ||
    'Time Schedule';
  const courses = parseTimeScheduleCourseHeaders(pageHtml).map((course) => {
    const sectionRegex = /<table[^>]*width="100%"[^>]*>\s*<tr>\s*<td>\s*<pre>([\s\S]*?)<\/td>\s*<\/tr>\s*<\/table>/gi;
    const sections: TimeScheduleParsedSection[] = [];
    for (const match of Array.from(course.blockHtml.matchAll(sectionRegex))) {
      const parsedSection = parseTimeScheduleSection(match[1] ?? '', course.courseKey);
      if (parsedSection) {
        sections.push(parsedSection);
      }
    }

    return {
      courseKey: course.courseKey,
      title: course.title,
      catalogUrl: course.catalogUrl,
      sections,
    } satisfies TimeScheduleParsedCourse;
  });

  if (courses.length === 0 || courses.every((course) => course.sections.length === 0)) {
    throw new Error('Time Schedule public course offerings page did not expose any course rows.');
  }

  return {
    courses: courses.map((course) => ({
      id: toTimeScheduleCourseId(course.courseKey),
      kind: 'course',
      site: 'time-schedule',
      source: {
        site: 'time-schedule',
        resourceId: course.courseKey,
        resourceType: 'public_course_offering_course',
        url,
      },
      url: course.catalogUrl,
      title: course.title,
      code: course.courseKey,
    })),
    events: courses.flatMap((course) =>
      course.sections.map((section) => ({
        id: `time-schedule:event:${section.sectionIdentity}`,
        kind: 'event',
        site: 'time-schedule',
        source: {
          site: 'time-schedule',
          resourceId: section.sectionIdentity,
          resourceType: 'public_course_offering_section',
          url,
        },
        courseId: toTimeScheduleCourseId(course.courseKey),
        eventKind: 'class',
        title: `${course.courseKey} ${section.sectionId}`,
        summary: `${quarter} public course offering`,
        location: section.locationText,
        detail:
          section.meetingMode === 'arranged'
            ? 'to be arranged · public course offerings'
            : `${section.meetingDays} ${section.timeText} · public course offerings`,
      })),
    ),
  };
}

function slugifyTimeScheduleQuarter(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function inferTimeScheduleQuarterLabel(snapshot: SiteSnapshotPayload) {
  const summary = snapshot.events?.[0]?.summary;
  const match = summary?.match(/Current Time Schedule · (?<quarter>[^·]+)/);
  return match?.groups?.quarter?.trim() || 'Current quarter';
}

function buildTimeScheduleDetailCorroboration(snapshot: SiteSnapshotPayload) {
  const primaryEvent = snapshot.events?.[0];
  if (!primaryEvent) {
    return undefined;
  }

  const detailParts = [primaryEvent.title, primaryEvent.location, primaryEvent.detail]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
  if (detailParts.length === 0) {
    return undefined;
  }

  const primaryCourse = snapshot.courses?.find((course) => course.id === primaryEvent.courseId);
  const courseTitle =
    primaryCourse?.title && primaryCourse.title !== primaryEvent.title ? primaryCourse.title.trim() : undefined;

  return [detailParts[0], courseTitle, ...detailParts.slice(1)].filter(Boolean).join(' · ');
}

function buildTimeSchedulePlanningSubstrate(input: {
  snapshot: SiteSnapshotPayload;
  capturedAt: string;
  sourceUrl: string;
}) {
  const quarterLabel = inferTimeScheduleQuarterLabel(input.snapshot);
  const termCode = slugifyTimeScheduleQuarter(quarterLabel) || 'current-quarter';
  const capturedFromDetailPage = isTimeScheduleSectionDetailUrl(input.sourceUrl);
  const exactBlockers = TIME_SCHEDULE_EXACT_BLOCKERS.filter((blocker) =>
    capturedFromDetailPage ? blocker.id !== 'dom_sln_detail_fallback' : true,
  ).map((blocker) => ({ ...blocker }));
  const runtimePosture = capturedFromDetailPage
    ? 'public_course_offerings_planning_lane_with_sln_detail'
    : TIME_SCHEDULE_STAGE_UNDERSTANDING.runtimePosture;
  const currentTruth = capturedFromDetailPage
    ? 'Time Schedule still stays read-only and public-offerings-first, but the current planning lane now also has an authenticated SLN detail corroboration for richer section context, including concrete meeting, location, seat-availability, and exposed section-type / credit / requirement-tag proof.'
    : TIME_SCHEDULE_STAGE_UNDERSTANDING.currentTruth;
  const detailCorroboration = capturedFromDetailPage ? buildTimeScheduleDetailCorroboration(input.snapshot) : undefined;
  const termSummary = capturedFromDetailPage
    ? detailCorroboration
      ? `Public course offerings plus authenticated SLN detail were captured from ${input.sourceUrl}. Detail corroboration: ${detailCorroboration}.`
      : `Public course offerings plus authenticated SLN detail were captured from ${input.sourceUrl}.`
    : `Public course offerings captured from ${input.sourceUrl}.`;

  return {
    id: `time-schedule:planning-substrate:${termCode}`,
    source: 'time-schedule' as const,
    fit: 'derived_planning_substrate' as const,
    readOnly: true as const,
    capturedAt: input.capturedAt,
    planId: `time-schedule:${termCode}`,
    planLabel: `Time Schedule · ${quarterLabel}`,
    termCount: 1,
    plannedCourseCount: input.snapshot.courses?.length ?? 0,
    backupCourseCount: 0,
    scheduleOptionCount: input.snapshot.events?.length ?? 0,
    requirementGroupCount: 0,
    programExplorationCount: 0,
    currentStage: TIME_SCHEDULE_STAGE_UNDERSTANDING.currentStage,
    runtimePosture,
    currentTruth,
    exactBlockers,
    hardDeferredMoves: ['registration helper', 'watcher automation', 'enrollment-state truth'],
    terms: [
      {
        termCode,
        termLabel: quarterLabel,
        plannedCourseCount: input.snapshot.courses?.length ?? 0,
        backupCourseCount: 0,
        scheduleOptionCount: input.snapshot.events?.length ?? 0,
        summary: termSummary,
      },
    ],
  };
}

async function buildSiteStatusView(site: Site): Promise<SiteSyncStatusView> {
  const counts = await getSiteEntityCounts(site, campusCopilotDb);
  const syncState = await getSyncStateBySite(site, campusCopilotDb);

  return {
    site,
    status: syncState?.status ?? 'idle',
    lastSyncedAt: syncState?.lastSyncedAt,
    lastOutcome: syncState?.lastOutcome,
    errorReason: syncState?.errorReason,
    resourceFailures: syncState?.resourceFailures,
    counts,
  };
}

async function persistSyncResult(site: Site, result: SiteSyncResult) {
  const lastOutcome = getSyncOutcomeForPersistence(result);
  const resourceFailures = buildResourceFailures(result.attemptsByResource);

  if (result.ok) {
    await replaceSiteSnapshot(
      site,
      result.snapshot,
      {
        status: 'success',
        lastSyncedAt: result.syncedAt,
        lastOutcome,
        errorReason: lastOutcome === 'partial_success' ? result.health.reason : undefined,
        resourceFailures: resourceFailures.length > 0 ? resourceFailures : undefined,
      },
      campusCopilotDb,
    );
  } else {
    await recordSiteSyncError(
      site,
      result.errorReason,
      result.syncedAt,
      result.outcome,
      resourceFailures.length > 0 ? resourceFailures : undefined,
      campusCopilotDb,
    );
  }
}

export const SITE_SYNC_HANDLERS: Record<Site, (input: SiteSyncDependencies) => Promise<SiteSyncResult>> = {
  canvas: async ({ activeTab, now }) => {
    return createCanvasAdapter(new CanvasApiClient(createCanvasTabRequestExecutor(activeTab.tabId))).sync({
      url: activeTab.url,
      site: 'canvas',
      tabId: activeTab.tabId,
      now,
      runtimeAuth: {
        status: 'unknown',
      },
    });
  },
  gradescope: async ({ activeTab, now }) => {
    const pageHtml = await extractPageHtml(activeTab.tabId);
    return createGradescopeAdapter(
      new GradescopeApiClient(createGradescopeTabRequestExecutor(activeTab.tabId), GRADESCOPE_PATHS),
    ).sync({
      url: activeTab.url,
      site: 'gradescope',
      tabId: activeTab.tabId,
      now,
      pageHtml,
      runtimeAuth: {
        status: 'unknown',
      },
    });
  },
  edstem: async ({ activeTab, now, config }) => {
    const pathConfig = getEdStemPathConfig(config) ?? buildDefaultEdStemPathConfig(activeTab.url);
    const pageHtml = await extractPageHtml(activeTab.tabId);
    return createEdStemAdapter(
      pathConfig ? new EdStemApiClient(createEdStemTabRequestExecutor(activeTab.tabId), pathConfig) : undefined,
    ).sync({
      url: activeTab.url,
      site: 'edstem',
      tabId: activeTab.tabId,
      now,
      pageHtml,
      runtimeAuth: {
        status: 'unknown',
      },
    });
  },
  myuw: async ({ activeTab, now }) => {
    const myuwContext = await extractMyUWContext(activeTab.tabId);
    const pageHtml = myuwContext?.pageHtml ?? (await extractPageHtml(activeTab.tabId));
    const adminCarriers = extractAdminCarriersFromPageHtml({
      url: activeTab.url,
      pageHtml,
      now,
    });
    if (adminCarriers.length > 0) {
      await upsertAdminCarriers(adminCarriers, campusCopilotDb);
    }

    const result = await createMyUWAdapter(new MyUWApiClient(createMyUWTabRequestExecutor(activeTab.tabId))).sync({
      url: activeTab.url,
      site: 'myuw',
      tabId: activeTab.tabId,
      now,
      pageState: myuwContext?.pageState,
      pageHtml,
      runtimeAuth: {
        status: 'unknown',
      },
    });
    if (
      adminCarriers.length > 0 &&
      !result.ok &&
      (result.outcome === 'unsupported_context' || result.outcome === 'collector_failed' || result.outcome === 'request_failed')
    ) {
      return {
        ok: true as const,
        site: 'myuw' as const,
        outcome: 'partial_success' as const,
        syncedAt: now,
        snapshot: {},
        attemptsByResource: result.attemptsByResource,
        health: {
          status: 'degraded' as const,
          checkedAt: now,
          code: 'partial_success' as const,
          reason: 'admin_high_sensitivity_summary_captured',
        },
      };
    }
    return result;
  },
  'course-sites': async ({ activeTab, now, pageHtml }) => {
    const html = pageHtml ?? (await extractPageHtml(activeTab.tabId));
    return createCourseSitesAdapter().sync({
      url: activeTab.url,
      pageHtml: html,
      now,
    });
  },
  'time-schedule': async ({ activeTab, now, pageHtml }) => {
    const html = pageHtml ?? (await extractPageHtml(activeTab.tabId));
    const attempts = {
      courses: [
        {
          mode: 'dom' as const,
          collectorName: 'TimeSchedulePublicCourseOfferingsCollector',
          success: false,
        },
      ],
      events: [
        {
          mode: 'dom' as const,
          collectorName: 'TimeSchedulePublicCourseOfferingsCollector',
          success: false,
        },
      ],
    };

    if ((!activeTab.url.includes('/students/timeschd/') && !isTimeScheduleSectionDetailUrl(activeTab.url)) || !html) {
      return {
        ok: false,
        site: 'time-schedule',
        outcome: 'unsupported_context',
        syncedAt: now,
        errorReason: 'time_schedule_public_course_offerings_tab_required',
        health: {
          status: 'unavailable',
          checkedAt: now,
          code: 'unsupported_context',
          reason: 'time_schedule_public_course_offerings_tab_required',
        },
        attemptsByResource: {
          courses: attempts.courses.map((attempt) => ({
            ...attempt,
            errorReason: 'unsupported_context',
          })),
          events: attempts.events.map((attempt) => ({
            ...attempt,
            errorReason: 'unsupported_context',
          })),
        },
      };
    }

    try {
      const snapshot = isTimeScheduleSectionDetailUrl(activeTab.url)
        ? buildTimeScheduleDetailSnapshot(html, activeTab.url)
        : buildTimeScheduleSnapshot(html, activeTab.url);
      await replacePlanningSubstratesBySource(
        'time-schedule',
        [
          buildTimeSchedulePlanningSubstrate({
            snapshot,
            capturedAt: now,
            sourceUrl: activeTab.url,
          }),
        ],
        campusCopilotDb,
      );
      return {
        ok: true,
        site: 'time-schedule',
        outcome: 'success',
        syncedAt: now,
        snapshot,
        health: {
          status: 'healthy',
          checkedAt: now,
          code: 'supported',
        },
        attemptsByResource: {
          courses: attempts.courses.map((attempt) => ({
            ...attempt,
            success: true,
          })),
          events: attempts.events.map((attempt) => ({
            ...attempt,
            success: true,
          })),
        },
      };
    } catch (error) {
      const errorReason =
        error instanceof Error && error.message.includes('did not expose any course rows')
          ? 'unsupported_context'
          : 'normalize_failed';

      return {
        ok: false,
        site: 'time-schedule',
        outcome: errorReason,
        syncedAt: now,
        errorReason,
        health: {
          status: 'unavailable',
          checkedAt: now,
          code: errorReason,
          reason: errorReason,
        },
        attemptsByResource: {
          courses: attempts.courses.map((attempt) => ({
            ...attempt,
            errorReason,
          })),
          events: attempts.events.map((attempt) => ({
            ...attempt,
            errorReason,
          })),
        },
      };
    }
  },
};

export async function handleSyncSite(site: Site, targetOverride?: SyncTargetOverride): Promise<SyncSiteCommandResponse> {
  const syncedAt = new Date().toISOString();
  const activeTab = await getActiveTabContext(targetOverride);

  if (!activeTab) {
    await recordSiteSyncError(site, 'unsupported_context', syncedAt, 'unsupported_context', undefined, campusCopilotDb);
    return {
      type: SYNC_SITE_COMMAND,
      site,
      outcome: 'unsupported_context',
      status: await buildSiteStatusView(site),
    };
  }

  await putSyncState(
    {
      key: site,
      site,
      status: 'syncing',
      lastSyncedAt: syncedAt,
    },
    campusCopilotDb,
  );

  const config = await loadExtensionConfig();
  const result = await SITE_SYNC_HANDLERS[site]({
    activeTab,
    now: syncedAt,
    config,
  });

  await persistSyncResult(site, result);

  return {
    type: SYNC_SITE_COMMAND,
    site,
    outcome: getSyncOutcomeForPersistence(result),
    status: await buildSiteStatusView(site),
  };
}

export async function handleGetSiteSyncStatus(site: Site): Promise<GetSiteSyncStatusResponse> {
  return {
    type: 'getSiteSyncStatus',
    site,
    status: await buildSiteStatusView(site),
  };
}

export function asCanvasSyncStatusView(status: SiteSyncStatusView): CanvasSyncStatusView {
  return {
    ...status,
    site: 'canvas',
  };
}

export function createUnsupportedSyncHealth(reason: string, checkedAt: string) {
  return HealthStatusSchema.parse({
    status: 'unavailable',
    checkedAt,
    code: 'unsupported_context',
    reason,
  });
}
