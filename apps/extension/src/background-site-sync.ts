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
  replaceSiteSnapshot,
  type SiteSnapshotPayload,
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
    return createMyUWAdapter(new MyUWApiClient(createMyUWTabRequestExecutor(activeTab.tabId))).sync({
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

    if (!activeTab.url.includes('/students/timeschd/') || !html) {
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
      const snapshot = buildTimeScheduleSnapshot(html, activeTab.url);
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
