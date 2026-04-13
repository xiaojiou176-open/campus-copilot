import type { AdapterCapabilities, AttemptsByResource, SiteSnapshot } from '@campus-copilot/adapters-base';
import type {
  Announcement,
  Assignment,
  Course,
  Event,
  HealthStatus,
  Message,
  Resource,
  SourceRef,
  Grade,
} from '@campus-copilot/schema';

export const COURSE_SITES_SUPPORTED_HOSTS = ['courses.cs.washington.edu'] as const;

export const COURSE_SITES_PAGE_FAMILIES = [
  'home',
  'syllabus',
  'schedule',
  'assignments',
  'resources',
  'exams',
  'policies',
] as const;

export const COURSE_SITES_POLICY_GUARDRAILS = [
  'pageHtml is an input-only carrier; the adapter never exposes raw HTML, cookies, or raw payloads in its public output',
  'public course websites may be read for structured metadata, but they do not become AI-readable by default',
  'high-risk detail pages and unfinished task details still require stronger downstream policy checks outside this package',
] as const;

export type CourseSitePageFamily = (typeof COURSE_SITES_PAGE_FAMILIES)[number];
export type CourseSiteSite = 'course-sites';

export type CourseSiteSourceRef = Omit<SourceRef, 'site'> & {
  site: CourseSiteSite;
};

type CanonicalCourseSiteEntity<T extends { site: unknown; source: unknown }> = Omit<T, 'site' | 'source'> & {
  site: CourseSiteSite;
  source: CourseSiteSourceRef;
};

export type CourseSiteCourse = CanonicalCourseSiteEntity<Course>;
export type CourseSiteResource = CanonicalCourseSiteEntity<Resource>;
export type CourseSiteAssignment = CanonicalCourseSiteEntity<Assignment>;
export type CourseSiteEvent = CanonicalCourseSiteEntity<Event>;
export type CourseSiteAnnouncement = CanonicalCourseSiteEntity<Announcement>;

export interface CourseSitesAdapterContext {
  url: string;
  pageHtml?: string;
  now: string;
  debug?: boolean;
}

export interface CourseSiteDetection {
  supportedHost: boolean;
  family: CourseSitePageFamily | null;
  courseSlug?: string;
  courseCode?: string;
  termCode?: string;
  baseUrl?: string;
}

export interface CourseSiteSnapshot extends SiteSnapshot {
  courses?: CourseSiteCourse[];
  resources?: CourseSiteResource[];
  assignments?: CourseSiteAssignment[];
  announcements?: CourseSiteAnnouncement[];
  events?: CourseSiteEvent[];
  messages?: Message[];
  grades?: Grade[];
}

export interface CourseSiteExtraction {
  family: CourseSitePageFamily;
  course: CourseSiteCourse;
  snapshot: CourseSiteSnapshot;
  warnings: string[];
}

export interface CourseSitesSyncSuccess {
  ok: true;
  site: CourseSiteSite;
  outcome: 'success';
  family: CourseSitePageFamily;
  snapshot: CourseSiteSnapshot;
  syncedAt: string;
  health: HealthStatus;
  warnings: string[];
  attemptsByResource?: AttemptsByResource;
}

export interface CourseSitesSyncFailure {
  ok: false;
  site: CourseSiteSite;
  outcome: 'unsupported_context' | 'normalize_failed';
  errorReason: string;
  syncedAt: string;
  health: HealthStatus;
  attemptsByResource?: AttemptsByResource;
}

export type CourseSitesSyncResult = CourseSitesSyncSuccess | CourseSitesSyncFailure;

export interface CourseSitesAdapter {
  site: CourseSiteSite;
  canRun(ctx: CourseSitesAdapterContext): Promise<boolean>;
  getCapabilities(ctx: CourseSitesAdapterContext): Promise<AdapterCapabilities>;
  healthCheck(ctx: CourseSitesAdapterContext): Promise<HealthStatus>;
  sync(ctx: CourseSitesAdapterContext): Promise<CourseSitesSyncResult>;
}

const PACIFIC_DST_OFFSET = '-07:00';
const PACIFIC_STANDARD_OFFSET = '-08:00';
const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const HOME_SELF_PATHS = new Set(['/', '/index.html']);

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/gi, '&');
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalizeWhitespace(value: string) {
  return stripTags(value).replace(/\s+/g, ' ').trim();
}

function slugify(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const HTML_TAG_BOUNDARY_CHARS = new Set([' ', '\t', '\n', '\r', '\f', '/', '>']);

function isHtmlTagBoundary(char: string | undefined) {
  return char === undefined || HTML_TAG_BOUNDARY_CHARS.has(char);
}

function findHtmlTagStart(lowerInput: string, tagName: string, fromIndex: number) {
  const openToken = `<${tagName}`;
  let cursor = fromIndex;
  while (cursor < lowerInput.length) {
    const start = lowerInput.indexOf(openToken, cursor);
    if (start === -1) {
      return -1;
    }
    if (isHtmlTagBoundary(lowerInput[start + openToken.length])) {
      return start;
    }
    cursor = start + openToken.length;
  }
  return -1;
}

function findHtmlTagBlockEnd(lowerInput: string, tagName: string, fromIndex: number) {
  const closeToken = `</${tagName}`;
  let cursor = fromIndex;
  while (cursor < lowerInput.length) {
    const closeStart = lowerInput.indexOf(closeToken, cursor);
    if (closeStart === -1) {
      return -1;
    }
    if (!isHtmlTagBoundary(lowerInput[closeStart + closeToken.length])) {
      cursor = closeStart + closeToken.length;
      continue;
    }
    const closeEnd = lowerInput.indexOf('>', closeStart + closeToken.length);
    return closeEnd === -1 ? -1 : closeEnd + 1;
  }
  return -1;
}

function stripHtmlElementBlock(input: string, tagName: 'script' | 'style' | 'noscript') {
  const lowerInput = input.toLowerCase();
  let result = '';
  let cursor = 0;

  while (cursor < input.length) {
    const start = findHtmlTagStart(lowerInput, tagName, cursor);
    if (start === -1) {
      result += input.slice(cursor);
      break;
    }

    result += `${input.slice(cursor, start)} `;
    const end = findHtmlTagBlockEnd(lowerInput, tagName, start + tagName.length + 1);
    if (end === -1) {
      break;
    }
    cursor = end;
  }

  return result;
}

function findHtmlCommentEnd(input: string, fromIndex: number) {
  const standardEnd = input.indexOf('-->', fromIndex);
  const bangEnd = input.indexOf('--!>', fromIndex);

  if (standardEnd === -1) {
    return bangEnd === -1 ? -1 : bangEnd + 4;
  }
  if (bangEnd === -1) {
    return standardEnd + 3;
  }
  return Math.min(standardEnd + 3, bangEnd + 4);
}

function stripHtmlComments(input: string) {
  let result = '';
  let cursor = 0;

  while (cursor < input.length) {
    const commentStart = input.indexOf('<!--', cursor);
    if (commentStart === -1) {
      result += input.slice(cursor);
      break;
    }

    result += `${input.slice(cursor, commentStart)} `;
    const commentEnd = findHtmlCommentEnd(input, commentStart + 4);
    if (commentEnd === -1) {
      break;
    }
    cursor = commentEnd;
  }

  return result;
}

function cleanHtml(input: string) {
  // This is a noise stripper for read-only extraction heuristics, not a sanitizer.
  const removableTags = ['script', 'style', 'noscript'] as const;
  return removableTags.reduce((current, tagName) => stripHtmlElementBlock(current, tagName), stripHtmlComments(input));
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? normalizeWhitespace(match[1]) : undefined;
}

function extractFirstText(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match ? normalizeWhitespace(match[1]) : undefined;
}

function extractAnchors(html: string, baseUrl: string) {
  const anchors: Array<{ href: string; text: string }> = [];
  const anchorPattern = /<a\b[^>]*href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1]?.trim();
    const text = normalizeWhitespace(match[2] ?? '');
    if (!href || !text) {
      continue;
    }

    try {
      anchors.push({
        href: new URL(href, baseUrl).toString(),
        text,
      });
    } catch {
      continue;
    }
  }

  return anchors;
}

function extractSectionBlock(html: string, sectionHeading: string) {
  const pattern = new RegExp(
    `<h\\d[^>]*>[^<]*${sectionHeading}[^<]*<\\/h\\d>([\\s\\S]*?)(?:<h\\d|$)`,
    'i',
  );
  const match = html.match(pattern);
  return match ? match[1] : undefined;
}

function supportsHost(url: string) {
  try {
    return COURSE_SITES_SUPPORTED_HOSTS.includes(new URL(url).hostname as (typeof COURSE_SITES_SUPPORTED_HOSTS)[number]);
  } catch {
    return false;
  }
}

function parseCourseIdentity(url: string) {
  try {
    const parsed = new URL(url);
    const courseMatch = parsed.pathname.match(/^\/courses\/([^/]+)\/([^/]+)(?:\/(.*))?$/i);
    if (!courseMatch) {
      return null;
    }

    const courseSlug = courseMatch[1]!.toLowerCase();
    const termCode = courseMatch[2]!.toLowerCase();
    const restPath = courseMatch[3] ?? '';
    const courseCodeMatch = courseSlug.match(/^([a-z]+)(\d+[a-z]?)$/i);
    const courseCode = courseCodeMatch
      ? `${courseCodeMatch[1]!.toUpperCase()} ${courseCodeMatch[2]!.toUpperCase()}`
      : courseSlug.toUpperCase();

    return {
      parsedUrl: parsed,
      courseSlug,
      courseCode,
      termCode,
      restPath: restPath.replace(/^\/+|\/+$/g, '').toLowerCase(),
      baseUrl: `https://${parsed.hostname}/courses/${courseSlug}/${termCode}/`,
    };
  } catch {
    return null;
  }
}

function detectFamilyFromPath(restPath: string) {
  if (!restPath || HOME_SELF_PATHS.has(`/${restPath}`)) {
    return 'home';
  }
  if (restPath.includes('syllabus')) {
    return 'syllabus';
  }
  if (restPath.includes('schedule') || restPath.includes('calendar')) {
    return 'schedule';
  }
  if (restPath.includes('assignments') || restPath.includes('tasks')) {
    return 'assignments';
  }
  if (restPath.includes('resources')) {
    return 'resources';
  }
  if (restPath.includes('exams')) {
    return 'exams';
  }
  if (restPath.includes('polic')) {
    return 'policies';
  }
  return null;
}

function detectFamilyFromHtml(html: string) {
  const title = extractTitle(html)?.toLowerCase() ?? '';
  if (title.includes('syllabus') || html.match(/doc-title[^>]*>\s*[^<]*syllabus/i)) {
    return 'syllabus' as const;
  }
  if (
    title.includes('calendar') ||
    title.includes('schedule') ||
    html.includes('Assignments and Tests') ||
    html.match(/id\s*=\s*"course-calendar"/i) ||
    html.match(/class\s*=\s*"day\s+[A-Za-z]+"/i)
  ) {
    return 'schedule' as const;
  }
  if (
    title.includes('tasks') ||
    title.includes('assignments') ||
    html.match(/Course Assignments with Release and Due Dates/i) ||
    html.match(/id\s*=\s*"concept-checks"/i)
  ) {
    return 'assignments' as const;
  }
  if (title.includes('resources')) {
    return 'resources' as const;
  }
  if (title.includes('exams')) {
    return 'exams' as const;
  }
  if (title.includes('polic')) {
    return 'policies' as const;
  }
  if (title.includes('home') || html.match(/welcome to\s+[A-Z]{2,}\s*\d+/i)) {
    return 'home' as const;
  }
  return null;
}

export function detectCourseSitePageFamily(ctx: Pick<CourseSitesAdapterContext, 'url' | 'pageHtml'>): CourseSiteDetection {
  const supportedHost = supportsHost(ctx.url);
  const parsedIdentity = parseCourseIdentity(ctx.url);
  const cleanedHtml = ctx.pageHtml ? cleanHtml(ctx.pageHtml) : '';
  const family =
    (parsedIdentity ? detectFamilyFromPath(parsedIdentity.restPath) : null) ?? detectFamilyFromHtml(cleanedHtml);

  return {
    supportedHost,
    family,
    courseSlug: parsedIdentity?.courseSlug,
    courseCode: parsedIdentity?.courseCode,
    termCode: parsedIdentity?.termCode,
    baseUrl: parsedIdentity?.baseUrl,
  };
}

function inferCourseTitle(html: string, courseCode: string) {
  const title = extractTitle(html);
  if (title?.includes(':')) {
    return title;
  }

  const heroTitle =
    extractFirstText(html, /class\s*=\s*"doc-title"[^>]*>([\s\S]*?)<\/span>/i) ??
    extractFirstText(html, /<h2[^>]*class\s*=\s*"subtitle"[^>]*>([\s\S]*?)<\/h2>/i) ??
    extractFirstText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ??
    undefined;

  if (!heroTitle) {
    return courseCode;
  }

  if (heroTitle.toLowerCase().includes('welcome to')) {
    return courseCode;
  }

  const normalizedHero = heroTitle.replace(/\s+[–-]\s+(home|syllabus|calendar|tasks|assignments)$/i, '').trim();
  return normalizedHero || courseCode;
}

function inferPacificOffset(month: number) {
  return month >= 3 && month <= 11 ? PACIFIC_DST_OFFSET : PACIFIC_STANDARD_OFFSET;
}

function resolveYear(termCode: string) {
  const prefix = termCode.slice(0, 2);
  const year = Number.parseInt(prefix, 10);
  return Number.isFinite(year) ? 2000 + year : new Date().getFullYear();
}

function toIsoDate(year: number, month: number, day: number, hour = 12, minute = 0) {
  const offset = inferPacificOffset(month);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(
    2,
    '0',
  )}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00${offset}`;
}

function parseMonthDay(value: string, year: number) {
  const monthDay = value.match(/\b([A-Z][a-z]{2})\s+(\d{1,2})\b/);
  if (!monthDay) {
    return undefined;
  }

  const month = MONTH_INDEX[monthDay[1]!.toLowerCase()];
  const day = Number.parseInt(monthDay[2]!, 10);
  if (!month || !Number.isFinite(day)) {
    return undefined;
  }

  const timeMatch = value.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!timeMatch) {
    return toIsoDate(year, month, day);
  }

  let hour = Number.parseInt(timeMatch[1]!, 10);
  const minute = Number.parseInt(timeMatch[2]!, 10);
  const meridiem = timeMatch[3]!.toLowerCase();
  if (meridiem === 'pm' && hour < 12) {
    hour += 12;
  }
  if (meridiem === 'am' && hour === 12) {
    hour = 0;
  }
  return toIsoDate(year, month, day, hour, minute);
}

function parseNumericMonthDay(value: string, year: number) {
  const match = value.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (!match) {
    return undefined;
  }

  const month = Number.parseInt(match[1]!, 10);
  const day = Number.parseInt(match[2]!, 10);
  if (!Number.isFinite(month) || !Number.isFinite(day)) {
    return undefined;
  }
  return toIsoDate(year, month, day);
}

function buildSource(pageUrl: string, resourceType: string, resourceId: string): CourseSiteSourceRef {
  return {
    site: 'course-sites',
    resourceId,
    resourceType,
    url: pageUrl,
  };
}

function buildCourseEntity(courseCode: string, courseTitle: string, baseUrl: string, now: string, courseSlug: string, termCode: string): CourseSiteCourse {
  const courseId = `course-sites:course:${courseSlug}:${termCode}`;
  return {
    id: courseId,
    kind: 'course',
    site: 'course-sites',
    source: buildSource(baseUrl, 'course_page', courseId),
    url: baseUrl,
    code: courseCode,
    title: courseTitle,
    updatedAt: now,
  };
}

function chooseResourceKind(url: string): CourseSiteResource['resourceKind'] {
  if (/\.(pdf|pptx|docx?|zip|tex|txt|html?)$/i.test(url)) {
    return 'file';
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return 'link';
  }
  return 'other';
}

function dedupeById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function courseSlugKey(course: Pick<CourseSiteCourse, 'code' | 'title'>) {
  return (course.code ?? course.title).replace(/\s+/g, '').toLowerCase();
}

function extractRelevantLinks(html: string, baseUrl: string, family: CourseSitePageFamily) {
  const anchors = extractAnchors(html, baseUrl);
  const ignoreTexts = new Set(['home', 'staff', 'accessibility']);
  const resourceAnchors = anchors.filter((anchor) => {
    const text = anchor.text.toLowerCase();
    if (!text || ignoreTexts.has(text)) {
      return false;
    }

    if (family === 'syllabus' && anchor.href.includes('#')) {
      return false;
    }

    return !anchor.href.endsWith('/index.html');
  });

  return dedupeById(
    resourceAnchors.map((anchor) => ({
      id: `${anchor.href}::${anchor.text.toLowerCase()}`,
      href: anchor.href,
      text: anchor.text,
    })),
  );
}

function buildPageResource(
  course: CourseSiteCourse,
  family: CourseSitePageFamily,
  pageUrl: string,
  summary: string | undefined,
  now: string,
) {
  const familyLabel = family.charAt(0).toUpperCase() + family.slice(1);
  return {
    id: `course-sites:resource:${courseSlugKey(course)}:${family}:page`,
    kind: 'resource',
    site: 'course-sites',
    source: buildSource(pageUrl, `${family}_page`, `${course.id}:${family}`),
    url: pageUrl,
    courseId: course.id,
    resourceKind: 'link',
    title: `${course.code} ${familyLabel}`,
    summary,
    releasedAt: now,
  } satisfies CourseSiteResource;
}

function buildLinkResources(
  links: Array<{ id: string; href: string; text: string }>,
  course: CourseSiteCourse,
  family: CourseSitePageFamily,
  now: string,
) {
  return links.map((link) => ({
    id: `course-sites:resource:${courseSlugKey(course)}:${family}:${slugify(link.text) || slugify(link.href)}`,
    kind: 'resource',
    site: 'course-sites',
    source: buildSource(link.href, 'link', link.id),
    url: link.href,
    courseId: course.id,
    resourceKind: chooseResourceKind(link.href),
    title: link.text,
    summary: undefined,
    releasedAt: now,
  }) satisfies CourseSiteResource);
}

function extractHomeAnnouncement(html: string, course: CourseSiteCourse, pageUrl: string, now: string) {
  const title =
    extractFirstText(html, /<h2[^>]*class\s*=\s*"subtitle"[^>]*>([\s\S]*?)<\/h2>/i) ??
    extractFirstText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const bullets = Array.from(html.matchAll(/<li>([\s\S]*?)<\/li>/gi))
    .map((match) => normalizeWhitespace(match[1] ?? ''))
    .filter(Boolean)
    .slice(0, 3);

  if (!title) {
    return undefined;
  }

  return {
    id: `course-sites:announcement:${courseSlugKey(course)}:home`,
    kind: 'announcement',
    site: 'course-sites',
    source: buildSource(pageUrl, 'home_intro', `${course.id}:home`),
    url: pageUrl,
    courseId: course.id,
    title,
    summary: bullets.join(' '),
    postedAt: now,
  } satisfies CourseSiteAnnouncement;
}

function extractScheduleTableEvents(html: string, course: CourseSiteCourse, pageUrl: string, year: number) {
  const events: CourseSiteEvent[] = [];

  for (const row of html.matchAll(/<tr[^>]*class\s*=\s*"data-row"[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const block = row[1] ?? '';
    const heading = extractFirstText(block, /<strong>([\s\S]*?)<\/strong>/i);
    if (!heading) {
      continue;
    }

    const meta = extractFirstText(block, /<div[^>]*class\s*=\s*"meta"[^>]*>([\s\S]*?)<\/div>/i);
    const split = heading.split(/[—-]/).map((part) => part.trim()).filter(Boolean);
    const dateText = split[0] ?? heading;
    const itemTitle = split.slice(1).join(' — ') || heading;
    const startAt = parseMonthDay(dateText, year);
    const resourceHint = Array.from(block.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi))
      .map((match) => normalizeWhitespace(match[1] ?? ''))
      .filter(Boolean)
      .slice(0, 3)
      .join(' · ');

    events.push({
      id: `course-sites:event:${courseSlugKey(course)}:${slugify(`${dateText}-${itemTitle}`)}`,
      kind: 'event',
      site: 'course-sites',
      source: buildSource(pageUrl, 'schedule_row', `${course.id}:${slugify(`${dateText}-${itemTitle}`)}`),
      url: pageUrl,
      courseId: course.id,
      eventKind: itemTitle.toLowerCase().includes('exam') ? 'exam' : 'class',
      title: itemTitle,
      summary: [meta, resourceHint].filter(Boolean).join(' · ') || undefined,
      startAt,
      detail: normalizeWhitespace(heading),
    });

    for (const note of block.matchAll(/<div[^>]*class\s*=\s*"chip-note"[^>]*>[\s\S]*?<strong>([\s\S]*?)<\/strong>[\s\S]*?<\/div>/gi)) {
      const noteTitle = normalizeWhitespace(note[1] ?? '');
      if (!noteTitle) {
        continue;
      }
      events.push({
        id: `course-sites:event:${courseSlugKey(course)}:${slugify(`${dateText}-${noteTitle}`)}`,
        kind: 'event',
        site: 'course-sites',
        source: buildSource(pageUrl, 'schedule_deadline_note', `${course.id}:${slugify(`${dateText}-${noteTitle}`)}`),
        url: pageUrl,
        courseId: course.id,
        eventKind: 'deadline',
        title: noteTitle,
        summary: `Course website schedule note on ${normalizeWhitespace(dateText)}.`,
        startAt,
      });
    }
  }

  return events;
}

function extractCalendarGridEvents(html: string, course: CourseSiteCourse, pageUrl: string) {
  const events: CourseSiteEvent[] = [];
  const dayPattern = /<div[^>]*class\s*=\s*"day[^"]*"[^>]*date\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;

  for (const dayMatch of html.matchAll(dayPattern)) {
    const dayIso = dayMatch[1]!;
    const body = dayMatch[2] ?? '';

    for (const lecture of body.matchAll(/<details[^>]*class\s*=\s*"([^"]*)"[^>]*>[\s\S]*?<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)) {
      const classes = lecture[1]?.toLowerCase() ?? '';
      const title = normalizeWhitespace(lecture[2] ?? '');
      const trailing = normalizeWhitespace(lecture[3] ?? '').slice(0, 160);
      if (!title) {
        continue;
      }

      events.push({
        id: `course-sites:event:${courseSlugKey(course)}:${slugify(`${dayIso}-${title}`)}`,
        kind: 'event',
        site: 'course-sites',
        source: buildSource(pageUrl, 'calendar_day', `${course.id}:${dayIso}:${slugify(title)}`),
        url: pageUrl,
        courseId: course.id,
        eventKind: classes.includes('exam') || title.toLowerCase().includes('exam') ? 'exam' : 'class',
        title,
        summary: trailing || undefined,
        startAt: `${dayIso}T12:00:00${inferPacificOffset(Number.parseInt(dayIso.slice(5, 7), 10))}`,
      });
    }

    for (const assignment of body.matchAll(/<div[^>]*class\s*=\s*"assignment[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)) {
      const title = normalizeWhitespace(assignment[1] ?? '');
      if (!title) {
        continue;
      }
      events.push({
        id: `course-sites:event:${courseSlugKey(course)}:${slugify(`${dayIso}-${title}-deadline`)}`,
        kind: 'event',
        site: 'course-sites',
        source: buildSource(pageUrl, 'calendar_deadline', `${course.id}:${dayIso}:${slugify(title)}:deadline`),
        url: pageUrl,
        courseId: course.id,
        eventKind: 'deadline',
        title: `${title} due`,
        summary: `Course website calendar marks ${title} on ${dayIso}.`,
        startAt: `${dayIso}T12:00:00${inferPacificOffset(Number.parseInt(dayIso.slice(5, 7), 10))}`,
      });
    }
  }

  return events;
}

function extractAssignmentsTable(html: string, course: CourseSiteCourse, pageUrl: string, year: number) {
  const assignments: CourseSiteAssignment[] = [];

  for (const row of html.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) {
    const block = row[1] ?? '';
    const links = extractAnchors(block, pageUrl);
    if (links.length === 0) {
      continue;
    }

    const titleLink =
      links.find((link) => /(html|pdf)/i.test(link.text)) ??
      links.find((link) => link.text.toLowerCase().includes('pset')) ??
      links[0];
    const title = titleLink?.text.replace(/\((?:pdf|html)\)$/i, '').trim();
    if (!title) {
      continue;
    }

    const cells = Array.from(block.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)).map((match) =>
      normalizeWhitespace(match[1] ?? ''),
    );
    const release = cells.at(-2);
    const due = cells.at(-1);
    assignments.push({
      id: `course-sites:assignment:${courseSlugKey(course)}:${slugify(title)}`,
      kind: 'assignment',
      site: 'course-sites',
      source: buildSource(pageUrl, 'assignment_row', `${course.id}:${slugify(title)}`),
      url: titleLink.href,
      courseId: course.id,
      title,
      summary: release ? `Released ${release}.` : undefined,
      detail: links
        .filter((link) => link.text !== titleLink.text)
        .map((link) => link.text)
        .join(' · ') || undefined,
      dueAt: due ? parseMonthDay(due, year) : undefined,
      status: 'unknown',
    });
  }

  return assignments;
}

function extractTasksAssignmentsAndEvents(html: string, course: CourseSiteCourse, pageUrl: string, year: number) {
  const assignments: CourseSiteAssignment[] = [];
  const events: CourseSiteEvent[] = [];

  const headingPattern = /<h2[^>]*id\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h[12][^>]*id\s*=|$)/gi;
  for (const section of html.matchAll(headingPattern)) {
    const rawId = section[1] ?? '';
    const title = normalizeWhitespace(section[2] ?? '');
    const block = section[3] ?? '';
    if (!title) {
      continue;
    }

    if (rawId.startsWith('cc') || title.toLowerCase().includes('concept check')) {
      const dueAt =
        parseMonthDay(block, year) ??
        parseNumericMonthDay(block, year);
      assignments.push({
        id: `course-sites:assignment:${courseSlugKey(course)}:${slugify(title)}`,
        kind: 'assignment',
        site: 'course-sites',
        source: buildSource(pageUrl, 'tasks_section', `${course.id}:${rawId}`),
        url: `${pageUrl}#${rawId}`,
        courseId: course.id,
        title,
        summary: extractFirstText(block, /<p>([\s\S]*?)<\/p>/i),
        dueAt,
        status: 'unknown',
      });
      continue;
    }

    if (rawId.startsWith('exam') || title.toLowerCase().includes('exam')) {
      const startAt = parseMonthDay(block, year);
      events.push({
        id: `course-sites:event:${courseSlugKey(course)}:${slugify(title)}`,
        kind: 'event',
        site: 'course-sites',
        source: buildSource(pageUrl, 'tasks_exam_section', `${course.id}:${rawId}`),
        url: `${pageUrl}#${rawId}`,
        courseId: course.id,
        eventKind: 'exam',
        title,
        summary: extractFirstText(block, /<p>([\s\S]*?)<\/p>/i),
        startAt,
      });
    }
  }

  return {
    assignments,
    events,
  };
}

function dropEmptyCollections(snapshot: CourseSiteSnapshot): CourseSiteSnapshot {
  return {
    courses: snapshot.courses?.length ? snapshot.courses : undefined,
    resources: snapshot.resources?.length ? snapshot.resources : undefined,
    assignments: snapshot.assignments?.length ? snapshot.assignments : undefined,
    announcements: snapshot.announcements?.length ? snapshot.announcements : undefined,
    events: snapshot.events?.length ? snapshot.events : undefined,
  };
}

export function extractCourseSiteSnapshot(ctx: CourseSitesAdapterContext): CourseSiteExtraction {
  if (!ctx.pageHtml?.trim()) {
    throw new Error('pageHtml is required for course website extraction');
  }

  const detection = detectCourseSitePageFamily(ctx);
  if (!detection.supportedHost || !detection.family || !detection.courseSlug || !detection.courseCode || !detection.termCode || !detection.baseUrl) {
    throw new Error('unsupported course website context');
  }

  const html = cleanHtml(ctx.pageHtml);
  if (!new RegExp(detection.courseCode.replace(/\s+/g, '\\s*'), 'i').test(html) && !extractTitle(html)) {
    throw new Error('course identity markers missing from page html');
  }
  const courseTitle = inferCourseTitle(html, detection.courseCode);
  const course = buildCourseEntity(
    detection.courseCode,
    courseTitle,
    detection.baseUrl,
    ctx.now,
    detection.courseSlug,
    detection.termCode,
  );
  const summary =
    extractFirstText(html, /<p>([\s\S]*?)<\/p>/i) ??
    extractFirstText(html, /<li>([\s\S]*?)<\/li>/i);
  const pageResource = buildPageResource(course, detection.family, ctx.url, summary, ctx.now);
  const warnings: string[] = [];

  let resources: CourseSiteResource[] = [pageResource];
  let assignments: CourseSiteAssignment[] = [];
  let announcements: CourseSiteAnnouncement[] = [];
  let events: CourseSiteEvent[] = [];

  switch (detection.family) {
    case 'home':
    case 'syllabus':
    case 'resources':
    case 'exams':
    case 'policies': {
      resources = resources.concat(
        buildLinkResources(extractRelevantLinks(html, detection.baseUrl, detection.family), course, detection.family, ctx.now),
      );
      const homeAnnouncement = detection.family === 'home' ? extractHomeAnnouncement(html, course, ctx.url, ctx.now) : undefined;
      if (homeAnnouncement) {
        announcements.push(homeAnnouncement);
      }
      break;
    }
    case 'schedule': {
      const year = resolveYear(detection.termCode);
      const tableEvents = extractScheduleTableEvents(html, course, ctx.url, year);
      const calendarEvents = extractCalendarGridEvents(html, course, ctx.url);
      events = dedupeById<CourseSiteEvent>([...tableEvents, ...calendarEvents]);
      resources = resources.concat(
        buildLinkResources(extractRelevantLinks(html, detection.baseUrl, detection.family), course, detection.family, ctx.now).slice(0, 8),
      );
      if (events.length === 0) {
        warnings.push('schedule page detected but no structured events were extracted');
      }
      break;
    }
    case 'assignments': {
      const year = resolveYear(detection.termCode);
      assignments = extractAssignmentsTable(html, course, ctx.url, year);
      const taskExtraction = extractTasksAssignmentsAndEvents(html, course, ctx.url, year);
      assignments = dedupeById<CourseSiteAssignment>([...assignments, ...taskExtraction.assignments]);
      events = dedupeById<CourseSiteEvent>(taskExtraction.events);
      resources = resources.concat(
        buildLinkResources(extractRelevantLinks(html, detection.baseUrl, detection.family), course, detection.family, ctx.now).slice(0, 6),
      );
      if (assignments.length === 0 && events.length === 0) {
        warnings.push('assignments/tasks page detected but no structured assignments were extracted');
      }
      break;
    }
  }

  return {
    family: detection.family,
    course,
    warnings,
    snapshot: dropEmptyCollections({
      courses: [course],
      resources: dedupeById<CourseSiteResource>(resources),
      assignments,
      announcements,
      events,
    }),
  };
}

function buildCapabilities(family: CourseSitePageFamily | null): AdapterCapabilities {
  const supportsResources = family !== null;
  return {
    officialApi: false,
    privateApi: false,
    pageState: false,
    dom: true,
    resources: {
      courses: {
        supported: family !== null,
        modes: ['dom'],
        preferredMode: 'dom',
      },
      resources: {
        supported: supportsResources,
        modes: ['dom'],
        preferredMode: 'dom',
      },
      assignments: {
        supported: family === 'assignments',
        modes: ['dom'],
        preferredMode: 'dom',
      },
      announcements: {
        supported: family === 'home',
        modes: ['dom'],
        preferredMode: 'dom',
      },
      events: {
        supported: family === 'schedule' || family === 'assignments',
        modes: ['dom'],
        preferredMode: 'dom',
      },
    },
  };
}

export function createCourseSitesAdapter(): CourseSitesAdapter {
  return {
    site: 'course-sites',
    async canRun(ctx) {
      const detection = detectCourseSitePageFamily(ctx);
      return detection.supportedHost && detection.family !== null && Boolean(ctx.pageHtml?.trim());
    },
    async getCapabilities(ctx) {
      return buildCapabilities(detectCourseSitePageFamily(ctx).family);
    },
    async healthCheck(ctx) {
      const detection = detectCourseSitePageFamily(ctx);
      if (!detection.supportedHost) {
        return {
          status: 'unavailable',
          checkedAt: ctx.now,
          code: 'unsupported_context',
          reason: 'course website adapter only supports courses.cs.washington.edu',
        };
      }

      if (!ctx.pageHtml?.trim()) {
        return {
          status: 'degraded',
          checkedAt: ctx.now,
          code: 'unsupported_context',
          reason: 'pageHtml is required for the first DOM-only runtime lane',
        };
      }

      return {
        status: detection.family ? 'healthy' : 'degraded',
        checkedAt: ctx.now,
        code: detection.family ? 'supported' : 'unsupported_context',
        reason: detection.family
          ? `detected ${detection.family} page family`
          : 'page did not match a supported course website family',
      };
    },
    async sync(ctx) {
      const supported = await this.canRun(ctx);
      if (!supported) {
        return {
          ok: false,
          site: 'course-sites',
          outcome: 'unsupported_context',
          errorReason: 'course website adapter requires courses.cs.washington.edu pageHtml for a supported page family',
          syncedAt: ctx.now,
          health: await this.healthCheck(ctx),
        };
      }

      try {
        const extraction = extractCourseSiteSnapshot(ctx);
        const attemptsByResource: AttemptsByResource = {
          courses: [
            {
              mode: 'dom',
              collectorName: 'CourseSitePageHtmlCollector',
              attemptedAt: ctx.now,
              success: true,
            },
          ],
          resources: [
            {
              mode: 'dom',
              collectorName: 'CourseSitePageHtmlCollector',
              attemptedAt: ctx.now,
              success: true,
            },
          ],
          assignments: extraction.snapshot.assignments
            ? [
                {
                  mode: 'dom',
                  collectorName: 'CourseSitePageHtmlCollector',
                  attemptedAt: ctx.now,
                  success: true,
                },
              ]
            : undefined,
          announcements: extraction.snapshot.announcements
            ? [
                {
                  mode: 'dom',
                  collectorName: 'CourseSitePageHtmlCollector',
                  attemptedAt: ctx.now,
                  success: true,
                },
              ]
            : undefined,
          events: extraction.snapshot.events
            ? [
                {
                  mode: 'dom',
                  collectorName: 'CourseSitePageHtmlCollector',
                  attemptedAt: ctx.now,
                  success: true,
                },
              ]
            : undefined,
        };
        return {
          ok: true,
          site: 'course-sites',
          outcome: 'success',
          family: extraction.family,
          snapshot: extraction.snapshot,
          syncedAt: ctx.now,
          warnings: extraction.warnings,
          attemptsByResource,
          health: {
            status: extraction.warnings.length > 0 ? 'degraded' : 'healthy',
            checkedAt: ctx.now,
            code: extraction.warnings.length > 0 ? 'partial_success' : 'supported',
            reason: extraction.warnings[0],
          },
        };
      } catch (error) {
        return {
          ok: false,
          site: 'course-sites',
          outcome: 'normalize_failed',
          errorReason: error instanceof Error ? error.message : 'course website normalization failed',
          syncedAt: ctx.now,
          attemptsByResource: {
            courses: [
              {
                mode: 'dom',
                collectorName: 'CourseSitePageHtmlCollector',
                attemptedAt: ctx.now,
                success: false,
                errorReason: error instanceof Error ? error.message : 'course website normalization failed',
              },
            ],
          },
          health: {
            status: 'unavailable',
            checkedAt: ctx.now,
            code: 'normalize_failed',
            reason: error instanceof Error ? error.message : 'course website normalization failed',
          },
        };
      }
    },
  };
}
