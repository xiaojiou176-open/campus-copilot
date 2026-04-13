const ROOT_ORIGIN = 'https://www.washington.edu';

export const TIME_SCHEDULE_CARRIER_ORDER = [
  {
    carrier: 'public_course_offerings',
    posture: 'primary',
    rationale: 'official/public schedule surface first',
  },
  {
    carrier: 'netid_full_schedule_view',
    posture: 'secondary',
    rationale: 'NetID-required full schedule view is a richer follow-up lane, not the current shared landing default',
  },
  {
    carrier: 'dom_sln_detail_fallback',
    posture: 'fallback',
    rationale: 'DOM or SLN detail parsing is a last-resort field recovery path',
  },
] as const;

export const TIME_SCHEDULE_FIELD_DECISIONS = [
  {
    field: 'course_identity',
    status: 'proved',
    reason: 'subject/catalog/title are explicit in the public course header',
  },
  {
    field: 'section_identity',
    status: 'proved',
    reason: 'SLN plus section id are explicit in the public section row',
  },
  {
    field: 'meeting_day_time',
    status: 'proved',
    reason: 'meeting day/time are explicit in the public section row or its immediate continuation notes',
  },
  {
    field: 'location',
    status: 'partially_proved',
    reason: 'location can appear in note text, but it is not consistently a structured row column',
  },
  {
    field: 'modality',
    status: 'partially_proved',
    reason: 'modality is sometimes inferable from freeform note text only',
  },
  {
    field: 'registration_semantics',
    status: 'deferred',
    reason: 'seat watching, add/drop, and registration workflows remain outside the current limited read-only lane',
  },
  {
    field: 'watcher_style_fields',
    status: 'deferred',
    reason: 'status and enrollment columns must not become a watcher/helper contract in this wave',
  },
] as const;

export const TIME_SCHEDULE_PROMOTION_HOLDS = [
  'shared runtime landing is intentionally limited to the public course-offerings carrier, not full upstream Time Schedule parity',
  'registration-aware merge and registration workflows remain intentionally deferred beyond the limited read-only expansion lane',
  'note-derived modality/location need stronger proof before any broader shared field promotion',
] as const;

export interface ScheduleRootQuarterLink {
  quarter: string;
  netIdTimeScheduleUrl: string;
  publicCourseOfferingsUrl: string;
}

export interface ScheduleRootSnapshot {
  publicDisclosure: string;
  quarterLinks: ScheduleRootQuarterLink[];
}

export interface TimeScheduleBoundaryProof {
  fullScheduleRequiresNetId: boolean;
  publicCourseOfferingsAvailable: boolean;
  publicViewStatement: string;
  quarterLinks: Array<{
    quarterLabel: string;
    fullScheduleUrl: string;
    publicOfferingsUrl: string;
  }>;
}

export interface PublicCourseOfferingMeeting {
  days: string;
  rawTime: string;
  startTime?: string;
  endTime?: string;
  daysSource: 'row' | 'note';
  timeSource: 'row' | 'note';
  modality?: 'hybrid' | 'online' | 'remote_async' | 'remote_sync';
}

export interface PublicCourseOfferingSection {
  sectionIdentity: string;
  sectionId: string;
  sln: string;
  credits?: string;
  status: 'open' | 'closed' | 'unknown';
  meetingMode: 'scheduled' | 'arranged';
  meetingDays: string;
  timeText: string;
  daysSource: 'row' | 'note';
  timeSource: 'row' | 'note';
  locationText?: string;
  locationSource?: 'note';
  modality?: 'hybrid' | 'online' | 'remote_async' | 'remote_sync';
  noteLines: string[];
  meetings: PublicCourseOfferingMeeting[];
}

export interface PublicCourseOfferingCourse {
  courseKey: string;
  title: string;
  catalogUrl?: string;
  subject: string;
  catalogNumber: string;
  tags: string[];
  sections: PublicCourseOfferingSection[];
  offerings: PublicCourseOfferingSection[];
}

export interface PublicCourseOfferingsPage {
  carrier: 'public_course_offerings';
  quarter: string;
  department?: string;
  lastUpdatedText?: string;
  courses: PublicCourseOfferingCourse[];
  warnings: string[];
}

type ParsedCourseHeader = {
  anchor: string;
  courseKey: string;
  courseTitle: string;
  catalogUrl?: string;
  tags: string[];
  blockHtml: string;
};

type HtmlBlock = {
  openTag: string;
  innerHtml: string;
  html: string;
  startIndex: number;
  endIndex: number;
};

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

const HTML_TIMESTAMP_PATTERN = /\d{1,2}:\d{2}\s*(?:am|pm)\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}/i;

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

function absoluteUrl(rawUrl: string) {
  return new URL(rawUrl, ROOT_ORIGIN).toString();
}

function readHtmlAttribute(openTag: string, attributeName: string) {
  const attributePattern = new RegExp(
    `${attributeName}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`,
    'i',
  );
  const match = openTag.match(attributePattern);
  return match ? match[1] ?? match[2] ?? match[3] : undefined;
}

function collectElementBlocks(html: string, tagName: string): HtmlBlock[] {
  const normalizedTagName = tagName.toLowerCase();
  const lowerHtml = html.toLowerCase();
  const openNeedle = `<${normalizedTagName}`;
  const closeNeedle = `</${normalizedTagName}>`;
  const blocks: HtmlBlock[] = [];
  let searchIndex = 0;

  while (searchIndex < html.length) {
    const openStart = lowerHtml.indexOf(openNeedle, searchIndex);
    if (openStart < 0) {
      break;
    }

    const openEnd = lowerHtml.indexOf('>', openStart);
    if (openEnd < 0) {
      break;
    }

    let cursor = openEnd + 1;
    let depth = 1;

    while (cursor < html.length) {
      const nextOpen = lowerHtml.indexOf(openNeedle, cursor);
      const nextClose = lowerHtml.indexOf(closeNeedle, cursor);
      if (nextClose < 0) {
        depth = 0;
        break;
      }

      if (nextOpen >= 0 && nextOpen < nextClose) {
        const nextOpenEnd = lowerHtml.indexOf('>', nextOpen);
        if (nextOpenEnd < 0) {
          depth = 0;
          break;
        }
        depth += 1;
        cursor = nextOpenEnd + 1;
        continue;
      }

      depth -= 1;
      const closeStart = nextClose;
      const closeEnd = nextClose + closeNeedle.length;
      if (depth === 0) {
        blocks.push({
          openTag: html.slice(openStart, openEnd + 1),
          innerHtml: html.slice(openEnd + 1, closeStart),
          html: html.slice(openStart, closeEnd),
          startIndex: openStart,
          endIndex: closeEnd,
        });
        searchIndex = closeEnd;
        break;
      }

      cursor = closeEnd;
    }

    if (searchIndex <= openStart) {
      break;
    }
  }

  return blocks;
}

function getFirstTextBlock(html: string, tagName: string, predicate?: (text: string) => boolean) {
  for (const block of collectElementBlocks(html, tagName)) {
    const text = normalizeWhitespace(block.innerHtml);
    if (!predicate || predicate(text)) {
      return text;
    }
  }
  return '';
}

function parseStatus(line: string) {
  if (/\bOpen\b/i.test(line)) {
    return 'open' as const;
  }
  if (/\bClosed\b/i.test(line)) {
    return 'closed' as const;
  }
  return 'unknown' as const;
}

function parseCourseHeaders(html: string): ParsedCourseHeader[] {
  const headerTables = collectElementBlocks(html, 'table').filter(
    (table) => readHtmlAttribute(table.openTag, 'bgcolor')?.toLowerCase() === '#ccffcc',
  );

  return headerTables.map((table, index) => {
    const nextIndex = headerTables[index + 1]?.startIndex ?? html.length;
    const anchors = collectElementBlocks(table.html, 'a');
    const courseAnchor = anchors.find((anchor) => readHtmlAttribute(anchor.openTag, 'name'));
    const titleAnchor = anchors.find((anchor) => readHtmlAttribute(anchor.openTag, 'href'));
    const tagCell = collectElementBlocks(table.html, 'td').find(
      (cell) => readHtmlAttribute(cell.openTag, 'width') === '15%',
    );
    const rawTags = normalizeWhitespace(tagCell?.innerHtml ?? '');
    const trimmedTags = rawTags.startsWith('(') && rawTags.endsWith(')')
      ? rawTags.slice(1, -1)
      : rawTags;
    const tags = trimmedTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    return {
      anchor: readHtmlAttribute(courseAnchor?.openTag ?? '', 'name') ?? '',
      courseKey: normalizeWhitespace(courseAnchor?.innerHtml ?? ''),
      courseTitle: normalizeWhitespace(titleAnchor?.innerHtml ?? ''),
      catalogUrl: titleAnchor?.openTag
        ? absoluteUrl(readHtmlAttribute(titleAnchor.openTag, 'href') ?? '/')
        : undefined,
      tags,
      blockHtml: html.slice(table.startIndex, nextIndex),
    };
  });
}

function parseNoteLines(sectionHtml: string) {
  return htmlToPlainTextWithLineBreaks(sectionHtml)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(1)
    .filter((line) => line !== '--');
}

function parseMeetingTokens(rawTail: string) {
  const statusIndex = rawTail.search(/\b(?:Open|Closed)\b/);
  const tail = statusIndex >= 0 ? rawTail.slice(0, statusIndex).trim() : rawTail.trim();
  const normalized = tail.replace(/\s+/g, ' ').trim();
  const arranged = /to be arranged/i.test(normalized);
  const timeMatch = normalized.match(/(?<days>MTWThF|MTWTh|MTW|TTh|MWF|MTWThF|MW|WF|Th|T|W|F)\s+(?<time>\d{3,4}-\d{3,4}[A-Z]?)/i);
  const creditMatch = normalized.match(/\b(\d+(?:[-/]\d+)?|VAR)\b/i);

  if (arranged) {
    return {
      credits: creditMatch?.[1],
      meetingMode: 'arranged' as const,
      meetingDays: 'to be arranged',
      timeText: 'to be arranged',
      daysSource: 'row' as const,
      timeSource: 'row' as const,
    };
  }

  if (timeMatch?.groups?.days && timeMatch.groups.time) {
    return {
      credits: creditMatch?.[1],
      meetingMode: 'scheduled' as const,
      meetingDays: timeMatch.groups.days,
      timeText: timeMatch.groups.time,
      daysSource: 'row' as const,
      timeSource: 'row' as const,
    };
  }

  return {
    credits: creditMatch?.[1],
    meetingMode: 'scheduled' as const,
    meetingDays: 'unknown',
    timeText: 'unknown',
    daysSource: 'row' as const,
    timeSource: 'row' as const,
  };
}

function parseExtraMeetings(noteLines: string[]) {
  return noteLines.flatMap((line) => {
    const match = line.match(/^(?<days>MTWThF|MTWTh|MTW|TTh|MWF|MW|WF|Th|T|W|F)\s+(?<time>\d{3,4}-\d{3,4}[A-Z]?)$/i);
    if (!match?.groups?.days || !match.groups.time) {
      return [];
    }
    const timeMatch = match.groups.time.match(/^(?<start>\d{3,4})-(?<end>\d{3,4}[A-Z]?)$/);
    return [
      {
        days: match.groups.days,
        rawTime: match.groups.time,
        startTime: timeMatch?.groups?.start,
        endTime: timeMatch?.groups?.end,
        daysSource: 'note' as const,
        timeSource: 'note' as const,
      },
    ];
  });
}

function inferLocation(noteLines: string[]) {
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

function extractMeetingFromNotes(noteLines: string[]) {
  for (const line of noteLines) {
    const directMatch = line.match(
      /^MEETS\s+(?<days>[A-Z]+(?:DAYS)?|MONDAYS|TUESDAYS|WEDNESDAYS|THURSDAYS|FRIDAYS|SATURDAYS|SUNDAYS)\s+(?<time>\d{1,2}:\d{2}-\d{1,2}:\d{2}(?:\s*[AP]M)?)/i,
    );
    if (directMatch?.groups?.days && directMatch.groups.time) {
      return {
        days: directMatch.groups.days,
        timeText: directMatch.groups.time,
      };
    }

    const alternateMatch = line.match(
      /^WILL MEET\s+(?<days>[A-Z]+(?:DAYS)?|MONDAYS|TUESDAYS|WEDNESDAYS|THURSDAYS|FRIDAYS|SATURDAYS|SUNDAYS)\s+(?<time>\d{1,2}(?::\d{2})?-\d{1,2}(?::\d{2})?(?:\s*[AP]M)?)/i,
    );
    if (alternateMatch?.groups?.days && alternateMatch.groups.time) {
      return {
        days: alternateMatch.groups.days,
        timeText: alternateMatch.groups.time,
      };
    }
  }

  return undefined;
}

function inferModality(noteLines: string[]) {
  const joined = noteLines.join(' ').toUpperCase();
  if (!joined) {
    return undefined;
  }
  if (joined.includes('REMOTE') && joined.includes('IN-PERSON')) {
    return 'hybrid' as const;
  }
  if (joined.includes('ONLINE')) {
    return 'online' as const;
  }
  if (joined.includes('ASYNCHRONOUS REMOTE')) {
    return 'remote_async' as const;
  }
  if (joined.includes('SYNCHRONOUS REMOTE')) {
    return 'remote_sync' as const;
  }
  return undefined;
}

function splitTimeRange(timeText: string) {
  const match = timeText.match(/^(?<start>\d{3,4})-(?<end>\d{3,4}[A-Z]?)$/);
  if (match?.groups?.start && match.groups.end) {
    return {
      startTime: match.groups.start,
      endTime: match.groups.end,
    };
  }

  const humanMatch = timeText.match(
    /^(?<start>\d{1,2}(?::\d{2})?)(?:\s*(?<startMeridiem>[AP]M))?\s*-\s*(?<end>\d{1,2}(?::\d{2})?)(?:\s*(?<endMeridiem>[AP]M))$/i,
  );
  if (humanMatch?.groups?.start && humanMatch.groups.end) {
    const startMeridiem = humanMatch.groups.startMeridiem?.toUpperCase();
    const endMeridiem = humanMatch.groups.endMeridiem?.toUpperCase();
    return {
      startTime: startMeridiem || endMeridiem ? `${humanMatch.groups.start} ${startMeridiem ?? endMeridiem}` : humanMatch.groups.start,
      endTime: endMeridiem || startMeridiem ? `${humanMatch.groups.end} ${endMeridiem ?? startMeridiem}` : humanMatch.groups.end,
    };
  }

  return {
    startTime: undefined,
    endTime: undefined,
  };
}

function parseSection(sectionHtml: string, courseKey: string, warnings: string[]) {
  const lineText = normalizeWhitespace(sectionHtml);
  const prefixMatch = lineText.match(/^(?:(?:Restr|IS)\s+)?(?<sln>\d{5})\s+(?<sectionId>[A-Z0-9]+)\s+(?<tail>.+)$/i);
  if (!prefixMatch?.groups?.sln || !prefixMatch.groups.sectionId || !prefixMatch.groups.tail) {
    return undefined;
  }

  const noteLines = parseNoteLines(sectionHtml);
  const locationText = inferLocation(noteLines);
  const modality = inferModality(noteLines);
  const rowMeeting = parseMeetingTokens(prefixMatch.groups.tail);
  const noteMeeting = extractMeetingFromNotes(noteLines);
  const primaryMeetingDays = noteMeeting?.days ?? rowMeeting.meetingDays;
  const primaryTimeText = noteMeeting?.timeText ?? rowMeeting.timeText;
  const primaryDaysSource = noteMeeting ? ('note' as const) : rowMeeting.daysSource;
  const primaryTimeSource = noteMeeting ? ('note' as const) : rowMeeting.timeSource;
  const primaryMeetingTime = splitTimeRange(primaryTimeText === 'to be arranged' ? '' : primaryTimeText);
  const meetings: PublicCourseOfferingMeeting[] = [
    {
      days: primaryMeetingDays,
      rawTime: primaryTimeText,
      startTime: primaryMeetingTime.startTime,
      endTime: primaryMeetingTime.endTime,
      daysSource: primaryDaysSource,
      timeSource: primaryTimeSource,
      modality,
    },
    ...parseExtraMeetings(noteLines),
  ];

  if (locationText) {
    warnings.push(`location_can_be_note_derived:${courseKey}:${prefixMatch.groups.sectionId}`);
  }
  if (modality) {
    warnings.push(`modality_is_note_derived:${courseKey}:${prefixMatch.groups.sectionId}`);
  }
  if (noteMeeting) {
    warnings.push(`meeting_pattern_is_note_derived:${courseKey}:${prefixMatch.groups.sectionId}`);
  }

  return {
    sectionIdentity: `${courseKey}:${prefixMatch.groups.sectionId}:${prefixMatch.groups.sln}`,
    sectionId: prefixMatch.groups.sectionId,
    sln: prefixMatch.groups.sln,
    credits: rowMeeting.credits,
    status: parseStatus(lineText),
    meetingMode: rowMeeting.meetingMode,
    meetingDays: primaryMeetingDays,
    timeText: primaryTimeText,
    daysSource: primaryDaysSource,
    timeSource: primaryTimeSource,
    locationText,
    locationSource: locationText ? ('note' as const) : undefined,
    modality,
    noteLines,
    meetings,
  } satisfies PublicCourseOfferingSection;
}

export function extractScheduleRootSnapshot(html: string): ScheduleRootSnapshot {
  const publicDisclosure = getFirstTextBlock(
    html,
    'p',
    (text) => text.includes('Course Offerings pages allow'),
  );

  const quarterLinks = collectElementBlocks(html, 'li').flatMap((item) => {
    const text = normalizeWhitespace(item.innerHtml);
    const quarterSeparatorIndex = text.indexOf(':');
    const quarter = quarterSeparatorIndex >= 0 ? text.slice(0, quarterSeparatorIndex).trim() : '';
    const links = collectElementBlocks(item.html, 'a');
    const netIdLink = links.find((link) => normalizeWhitespace(link.innerHtml).includes('Time Schedule View'));
    const publicLink = links.find((link) => normalizeWhitespace(link.innerHtml).includes('Course Offerings View'));
    const netIdHref = netIdLink?.openTag ? readHtmlAttribute(netIdLink.openTag, 'href') : undefined;
    const publicHref = publicLink?.openTag ? readHtmlAttribute(publicLink.openTag, 'href') : undefined;

    if (!quarter || !netIdHref || !publicHref) {
      return [];
    }

    return [
      {
        quarter,
        netIdTimeScheduleUrl: absoluteUrl(netIdHref),
        publicCourseOfferingsUrl: absoluteUrl(publicHref),
      },
    ];
  });

  return {
    publicDisclosure,
    quarterLinks,
  };
}

export function parseTimeScheduleBoundaryHtml(html: string, _sourceUrl: string): TimeScheduleBoundaryProof {
  const snapshot = extractScheduleRootSnapshot(html);
  return {
    fullScheduleRequiresNetId: /require a NetID to view/i.test(snapshot.publicDisclosure),
    publicCourseOfferingsAvailable: /limited view/i.test(snapshot.publicDisclosure),
    publicViewStatement: snapshot.publicDisclosure,
    quarterLinks: snapshot.quarterLinks.map((entry) => ({
      quarterLabel: entry.quarter,
      fullScheduleUrl: entry.netIdTimeScheduleUrl,
      publicOfferingsUrl: entry.publicCourseOfferingsUrl,
    })),
  };
}

export function extractPublicCourseOfferingsPage(html: string): PublicCourseOfferingsPage {
  const warnings: string[] = [];
  const courses = parseCourseHeaders(html).map((header) => {
    const sections: PublicCourseOfferingSection[] = [];
    const sectionTables = collectElementBlocks(header.blockHtml, 'table').filter(
      (table) => readHtmlAttribute(table.openTag, 'width') === '100%' && collectElementBlocks(table.html, 'pre').length > 0,
    );

    for (const table of sectionTables) {
      const preBlock = collectElementBlocks(table.html, 'pre')[0];
      const parsedSection = parseSection(preBlock?.innerHtml ?? '', header.courseKey, warnings);
      if (parsedSection) {
        sections.push(parsedSection);
      }
    }

    return {
      courseKey: header.courseKey,
      title: header.courseTitle,
      catalogUrl: header.catalogUrl,
      subject: header.courseKey.split(' ')[0],
      catalogNumber: header.courseKey.split(' ').slice(1).join(' '),
      tags: header.tags,
      sections,
      offerings: sections,
    } satisfies PublicCourseOfferingCourse;
  });

  const lastUpdatedBanner = getFirstTextBlock(
    html,
    'div',
    (text) => text.includes('but may have changed since then.'),
  );
  const lastUpdatedText = lastUpdatedBanner.match(HTML_TIMESTAMP_PATTERN)?.[0];

  return {
    carrier: 'public_course_offerings',
    quarter:
      getFirstTextBlock(html, 'h1', (text) => text.endsWith('Course Offerings')).replace(/ Course Offerings$/, '') ||
      '',
    department: getFirstTextBlock(html, 'h2') || undefined,
    lastUpdatedText,
    courses,
    warnings,
  };
}

export function extractPublicCourseOfferingsPrototype(input: {
  html: string;
  sourceUrl: string;
  quarterLabel: string;
}) {
  const page = extractPublicCourseOfferingsPage(input.html);
  const events = page.courses.flatMap((course) =>
    course.sections.map((section) => ({
      sectionIdentity: section.sectionIdentity,
      courseKey: course.courseKey,
      courseTitle: course.title,
      sectionCode: section.sectionId,
      sln: section.sln,
      meetingPatternText:
        section.meetingMode === 'arranged' && section.daysSource === 'row' && section.timeSource === 'row'
          ? 'to be arranged'
          : `${section.meetingDays} ${section.timeText}`.trim(),
      modality:
        section.modality === 'hybrid'
          ? 'mixed'
          : section.modality,
      location: section.locationText,
    })),
  );

  return {
    carrier: 'public-course-offerings-view',
    quarterLabel: input.quarterLabel,
    sourceUrl: input.sourceUrl,
    courses: page.courses.map((course) => ({
      courseKey: course.courseKey,
      courseTitle: course.title,
      tags: course.tags,
      offerings: course.sections.map((section) => ({
        sectionCode: section.sectionId,
        sln: section.sln,
        credits: section.credits,
        status: section.status,
        location: section.locationText,
        modality: section.modality === 'hybrid' ? 'mixed' : section.modality,
        meetings: section.meetings.map((meeting) => ({
          days: meeting.days,
          rawTime: meeting.rawTime,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          modality: meeting.modality === 'hybrid' ? 'mixed' : meeting.modality,
        })),
      })),
    })),
    events,
    warnings: page.warnings,
  };
}
