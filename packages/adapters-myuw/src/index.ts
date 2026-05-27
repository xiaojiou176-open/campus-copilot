import {
  type AdapterCapabilities,
  type AdapterContext,
  type AttemptsByResource,
  type PipelineAttempt,
  type ResourceCollector,
  type SiteAdapter,
  type SiteSyncFailure,
  type SiteSyncOutcome,
  type SiteSyncSuccess,
  type SiteSnapshot,
  runCollectorPipeline,
} from '@campus-copilot/adapters-base';
import {
  AnnouncementSchema,
  CourseSchema,
  EventSchema,
  HealthStatusSchema,
  IsoDateTimeSchema,
  type Announcement,
  type Course,
  type Event,
  type HealthStatus,
} from '@campus-copilot/schema';
import { z } from 'zod';

type MyUWFailureCode = 'unauthorized' | 'unsupported_context' | 'malformed_response' | 'request_failed';

export class MyUWAdapterError extends Error {
  constructor(
    public readonly code: MyUWFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'MyUWAdapterError';
  }
}

const MyUWRawNoticeSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    title: z.string().min(1),
    summary: z.string().optional(),
    postedAt: z.string().optional(),
    url: z.url().optional(),
  })
  .passthrough();

const MyUWRawEventSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    title: z.string().min(1),
    summary: z.string().optional(),
    location: z.string().optional(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
    eventKind: z.enum(['deadline', 'class', 'exam', 'notice', 'other']).optional(),
    url: z.url().optional(),
  })
  .passthrough();

type MyUWRawNotice = z.infer<typeof MyUWRawNoticeSchema>;
type MyUWRawEvent = z.infer<typeof MyUWRawEventSchema>;

type MyUWRequestPath = string;

type MyUWRequestResult =
  | {
      ok: true;
      status: number;
      responseUrl: string;
      bodyText: string;
      contentType?: string;
    }
  | {
      ok: false;
      code: MyUWFailureCode;
      message: string;
      status?: number;
    };

export type MyUWRequestExecutor = (path: MyUWRequestPath) => Promise<MyUWRequestResult>;

const MyUWApiNoticeAttributeSchema = z
  .object({
    name: z.string(),
    value: z.string().nullable().optional(),
  })
  .passthrough();

const MyUWApiNoticeSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    title: z.string().optional(),
    notice_content: z.string().optional(),
    url: z.url().optional(),
    attributes: z.array(MyUWApiNoticeAttributeSchema).optional(),
  })
  .passthrough();

const MyUWApiDeptCalEventSchema = z
  .object({
    summary: z.string().min(1),
    start: z.string().optional(),
    end: z.string().optional(),
    event_url: z.url().optional(),
  })
  .passthrough();

const MyUWApiDeptCalPayloadSchema = z
  .object({
    events: z.array(MyUWApiDeptCalEventSchema).default([]),
  })
  .passthrough();

const MyUWMeetingDaysSchema = z
  .object({
    monday: z.boolean().nullable().optional(),
    tuesday: z.boolean().nullable().optional(),
    wednesday: z.boolean().nullable().optional(),
    thursday: z.boolean().nullable().optional(),
    friday: z.boolean().nullable().optional(),
    saturday: z.boolean().nullable().optional(),
    sunday: z.boolean().nullable().optional(),
  })
  .passthrough();

const MyUWScheduleMeetingSchema = z
  .object({
    index: z.union([z.number(), z.string()]).optional(),
    type: z.string().optional(),
    days_tbd: z.boolean().optional(),
    wont_meet: z.boolean().optional(),
    no_meeting: z.boolean().optional(),
    meeting_days: MyUWMeetingDaysSchema.optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    building: z.string().optional(),
    room: z.string().optional(),
    building_name: z.string().optional(),
  })
  .passthrough();

const MyUWFinalExamSchema = z
  .object({
    is_confirmed: z.boolean().optional(),
    no_exam_or_nontraditional: z.boolean().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    building: z.string().optional(),
    room_number: z.string().optional(),
    room: z.string().optional(),
    building_name: z.string().optional(),
  })
  .passthrough();

type MyUWApiNotice = z.infer<typeof MyUWApiNoticeSchema>;
type MyUWApiDeptCalEvent = z.infer<typeof MyUWApiDeptCalEventSchema>;

const MyUWScheduleSectionSchema = z
  .object({
    curriculum_abbr: z.string().min(1),
    course_number: z.string().min(1),
    section_id: z.string().min(1),
    course_title: z.string().min(1),
    canvas_url: z.url().nullable().optional(),
    sln: z.union([z.number(), z.string()]).optional(),
    is_primary_section: z.boolean().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    meetings: z.array(MyUWScheduleMeetingSchema).default([]),
    final_exam: MyUWFinalExamSchema.optional(),
  })
  .passthrough();

const MyUWScheduleTermSchema = z
  .object({
    first_day_quarter: z.string().optional(),
    last_day_instruction: z.string().optional(),
  })
  .passthrough();

const MyUWSchedulePayloadSchema = z
  .object({
    sections: z.array(MyUWScheduleSectionSchema).default([]),
    term: MyUWScheduleTermSchema.optional(),
  })
  .passthrough();

const MyUWVisualSchedulePeriodSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    sections: z.array(MyUWScheduleSectionSchema).default([]),
  })
  .passthrough();

const MyUWVisualSchedulePayloadSchema = z
  .object({
    periods: z.array(MyUWVisualSchedulePeriodSchema).default([]),
    term: MyUWScheduleTermSchema.optional(),
  })
  .passthrough();

type MyUWMeetingDays = z.infer<typeof MyUWMeetingDaysSchema>;
type MyUWScheduleMeeting = z.infer<typeof MyUWScheduleMeetingSchema>;
type MyUWFinalExam = z.infer<typeof MyUWFinalExamSchema>;
type MyUWScheduleSection = z.infer<typeof MyUWScheduleSectionSchema>;
type MyUWScheduleTerm = z.infer<typeof MyUWScheduleTermSchema>;
type MyUWVisualSchedulePeriod = z.infer<typeof MyUWVisualSchedulePeriodSchema>;
type MyUWVisualSchedulePayload = z.infer<typeof MyUWVisualSchedulePayloadSchema>;

function stripHtml(value: string | undefined) {
  return decodeHtmlText(value?.replace(/<[^>]+>/g, ' '));
}

function extractNoticeTitleFromHtml(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/<span[^>]*class="notice-title"[^>]*>(?<title>[\s\S]*?)<\/span>/i);
  return stripHtml(match?.groups?.title ?? value);
}

function extractNoticeSummaryFromHtml(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const bodyMatch = value.match(/<span[^>]*class="notice-body-with-title"[^>]*>(?<body>[\s\S]*?)<\/span>/i);
  const body = stripHtml(bodyMatch?.groups?.body);
  if (body) {
    return body;
  }

  const stripped = stripHtml(value);
  const title = extractNoticeTitleFromHtml(value);
  if (!stripped || stripped === title) {
    return undefined;
  }

  if (title && stripped.startsWith(title)) {
    const remainder = stripped
      .slice(title.length)
      .replace(/^[:\-–]\s*/, '')
      .trim();
    return remainder || undefined;
  }

  return stripped;
}

function buildLocation(parts: Array<string | undefined>) {
  const normalized = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return normalized.length > 0 ? normalized.join(' · ') : undefined;
}

function buildScheduleSummary(input: {
  sectionCode: string;
  courseTitle: string;
  label: string;
  location?: string;
}) {
  const base = `${input.sectionCode} ${input.label} for ${input.courseTitle}`;
  return input.location ? `${base} at ${input.location}.` : `${base}.`;
}

function buildMyUWNoticeResourceId(rawNotice: MyUWApiNotice) {
  if (rawNotice.id != null) {
    return String(rawNotice.id);
  }

  const title = rawNotice.title ?? extractNoticeTitleFromHtml(rawNotice.notice_content) ?? 'notice';
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'notice';
}

function getNoticeAttribute(rawNotice: MyUWApiNotice, name: string) {
  return rawNotice.attributes?.find((attribute) => attribute.name === name)?.value ?? undefined;
}

export class MyUWApiClient {
  constructor(private readonly executeRequest: MyUWRequestExecutor) {}

  private async fetchJson(path: MyUWRequestPath): Promise<unknown> {
    const result = await this.executeRequest(path);
    if (!result.ok) {
      throw new MyUWAdapterError(result.code, result.message);
    }

    if (result.status === 401 || result.status === 403) {
      throw new MyUWAdapterError('unauthorized', 'MyUW session is unauthorized.');
    }

    if (result.status === 404) {
      throw new MyUWAdapterError('unsupported_context', 'MyUW request path is unavailable.');
    }

    if (result.status < 200 || result.status >= 300) {
      throw new MyUWAdapterError('request_failed', `MyUW request failed with status ${result.status}.`);
    }

    try {
      return JSON.parse(result.bodyText);
    } catch {
      throw new MyUWAdapterError('malformed_response', 'MyUW returned malformed JSON.');
    }
  }

  async getNotices(): Promise<MyUWApiNotice[]> {
    return z.array(MyUWApiNoticeSchema).parse(await this.fetchJson('/api/v1/notices/'));
  }

  async getDeptCalEvents(): Promise<MyUWApiDeptCalEvent[]> {
    return MyUWApiDeptCalPayloadSchema.parse(await this.fetchJson('/api/v1/deptcal/')).events;
  }

  async getCurrentScheduleSections(): Promise<MyUWScheduleSection[]> {
    return MyUWSchedulePayloadSchema.parse(await this.fetchJson('/api/v1/schedule/current')).sections;
  }

  async getCurrentVisualSchedule(): Promise<MyUWVisualSchedulePayload> {
    return MyUWVisualSchedulePayloadSchema.parse(await this.fetchJson('/api/v1/visual_schedule/current'));
  }
}

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

function parseJsonFromHtml<T>(pageHtml: string | undefined, marker: string): T[] {
  if (!pageHtml) {
    throw new MyUWAdapterError('unsupported_context', 'MyUW page HTML is unavailable for DOM parsing.');
  }

  const regex = new RegExp(`<script[^>]*data-${marker}[^>]*>([\\s\\S]*?)<\\/script>`, 'i');
  const match = pageHtml.match(regex);
  if (!match?.[1]) {
    throw new MyUWAdapterError('unsupported_context', `MyUW ${marker} DOM data is unavailable.`);
  }

  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) {
      throw new Error('not_array');
    }
    return parsed as T[];
  } catch {
    throw new MyUWAdapterError('malformed_response', `MyUW ${marker} DOM data is malformed.`);
  }
}

function parseVisibleNoticesFromHtml(pageHtml: string | undefined): MyUWRawNotice[] {
  if (!pageHtml) {
    throw new MyUWAdapterError('unsupported_context', 'MyUW page HTML is unavailable for notice parsing.');
  }

  const matches = Array.from(
    pageHtml.matchAll(
      /noticeCard-[^"]+-collapse-(?<id>[^"]+)[\s\S]*?<span class="notice-title">(?<title>[\s\S]*?)<\/span>(?:[\s\S]*?<span class="notice-body-with-title">(?<summary>[\s\S]*?)<\/span>)?/g,
    ),
  );

  const notices: MyUWRawNotice[] = [];
  for (const match of matches) {
    const id = match.groups?.id;
    const title = decodeHtmlText(match.groups?.title);
    if (!id || !title) {
      continue;
    }

    notices.push({
      id,
      title,
      summary: decodeHtmlText(match.groups?.summary),
    });
  }

  if (notices.length === 0) {
    throw new MyUWAdapterError('unsupported_context', 'MyUW visible notices DOM is unavailable.');
  }

  return notices;
}

function parseVisibleEventsFromHtml(pageHtml: string | undefined): MyUWRawEvent[] {
  if (!pageHtml) {
    throw new MyUWAdapterError('unsupported_context', 'MyUW page HTML is unavailable for event parsing.');
  }

  const matches = Array.from(
    pageHtml.matchAll(
      /id="myuw-events"[\s\S]*?<li[^>]*class="mb-2"[^>]*>[\s\S]*?<strong>\s*(?<date>[\s\S]*?)\s*<\/strong>[\s\S]*?<a[^>]+href="(?<url>[^"]+)"[^>]*>[\s\S]*?<span class="text-dark fw-light d-inline-block me-1">\s*(?<time>[\s\S]*?)\s*<\/span>[\s\S]*?<span>(?<title>[\s\S]*?)<\/span>/g,
    ),
  );

  const events: MyUWRawEvent[] = [];
  for (const [index, match] of matches.entries()) {
    const title = decodeHtmlText(match.groups?.title);
    if (!title) {
      continue;
    }

    events.push({
      id: `${index + 1}`,
      title,
      url: match.groups?.url,
      eventKind: 'other',
    });
  }

  if (events.length === 0) {
    throw new MyUWAdapterError('unsupported_context', 'MyUW visible events DOM is unavailable.');
  }

  return events;
}

const MONTH_INDEX_BY_LABEL: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

function toMyUWAllDayDate(dateLabel: string, year: string, offset: string) {
  const match = dateLabel.trim().match(/^(?<month>[A-Za-z]{3})\s+(?<day>\d{1,2})$/);
  const monthLabel = match?.groups?.month?.slice(0, 3).toLowerCase();
  const day = match?.groups?.day?.padStart(2, '0');
  const month = monthLabel ? MONTH_INDEX_BY_LABEL[monthLabel] : undefined;
  if (!month || !day) {
    return undefined;
  }

  const iso = `${year}-${month}-${day}T00:00:00${offset}`;
  return IsoDateTimeSchema.safeParse(iso).success ? iso : undefined;
}

function toMyUWAcademicCalendarEventRange(dateLabel: string, year: string, offset: string) {
  const normalized = dateLabel.replace(/\s+/g, ' ').trim();
  const rangeMatch = normalized.match(
    /^(?<month>[A-Za-z]{3})\s+(?<start>\d{1,2})\s*-\s*(?:(?<endMonth>[A-Za-z]{3})\s+)?(?<end>\d{1,2})$/,
  );
  if (rangeMatch?.groups) {
    const startMonth = MONTH_INDEX_BY_LABEL[rangeMatch.groups.month.slice(0, 3).toLowerCase()];
    const endMonthLabel = rangeMatch.groups.endMonth?.slice(0, 3).toLowerCase() ?? rangeMatch.groups.month.slice(0, 3).toLowerCase();
    const endMonth = MONTH_INDEX_BY_LABEL[endMonthLabel];
    const startDay = rangeMatch.groups.start.padStart(2, '0');
    const endDay = rangeMatch.groups.end.padStart(2, '0');
    if (!startMonth || !endMonth) {
      return {};
    }
    const startAt = IsoDateTimeSchema.safeParse(`${year}-${startMonth}-${startDay}T00:00:00${offset}`).success
      ? `${year}-${startMonth}-${startDay}T00:00:00${offset}`
      : undefined;
    const endAt = IsoDateTimeSchema.safeParse(`${year}-${endMonth}-${endDay}T23:59:59${offset}`).success
      ? `${year}-${endMonth}-${endDay}T23:59:59${offset}`
      : undefined;
    return { startAt, endAt };
  }

  const startAt = toMyUWAllDayDate(normalized, year, offset);
  const endAt = startAt ? startAt.replace('T00:00:00', 'T23:59:59') : undefined;
  return { startAt, endAt };
}

function parseAcademicCalendarEventsFromHtml(pageHtml: string | undefined, now: string): MyUWRawEvent[] {
  if (!pageHtml) {
    throw new MyUWAdapterError('unsupported_context', 'MyUW academic calendar HTML is unavailable.');
  }

  const offset = getOffsetFromNow(now);
  const cards = Array.from(
    pageHtml.matchAll(
      /<h2[^>]*class="[^"]*myuw-font-encode-sans[^"]*"[^>]*>\s*(?<quarter>[^<]+?)\s*<\/h2>[\s\S]*?<ul[^>]*class="[^"]*list-unstyled[^"]*"[^>]*>(?<items>[\s\S]*?)<\/ul>/gi,
    ),
  );

  const events: MyUWRawEvent[] = [];
  for (const card of cards) {
    const quarter = decodeHtmlText(card.groups?.quarter)?.replace(/\s+/g, ' ').trim();
    const yearMatch = quarter?.match(/(?<year>\d{4})$/);
    const year = yearMatch?.groups?.year;
    if (!quarter || !year) {
      continue;
    }

    const itemsHtml = card.groups?.items ?? '';
    const items = Array.from(
      itemsHtml.matchAll(
        /<li[^>]*class="[^"]*mb-2[^"]*"[^>]*>\s*<div[^>]*class="[^"]*fw-bold[^"]*"[^>]*>\s*(?<date>[^<]+?)\s*<\/div>[\s\S]*?<a[^>]+href="(?<href>[^"]+)"[^>]*>\s*(?<title>[\s\S]*?)\s*<\/a>/gi,
      ),
    );

    for (const [index, item] of items.entries()) {
      const dateLabel = decodeHtmlText(item.groups?.date)?.replace(/\s+/g, ' ').trim();
      const title = decodeHtmlText(item.groups?.title)?.replace(/\s+/g, ' ').trim();
      const href = item.groups?.href;
      if (!dateLabel || !title) {
        continue;
      }

      const { startAt, endAt } = toMyUWAcademicCalendarEventRange(dateLabel, year, offset);
      events.push({
        id: `academic-calendar:${quarter}:${index + 1}`,
        title,
        summary: `${quarter} academic calendar`,
        url: href,
        eventKind: 'other',
        startAt,
        endAt,
      });
    }
  }

  if (events.length === 0) {
    throw new MyUWAdapterError('unsupported_context', 'MyUW academic calendar DOM is unavailable.');
  }

  return events;
}

function parseStateCollection<T>(pageState: unknown, key: 'notices' | 'events'): T[] {
  const parsedState = z
    .object({
      notices: z.array(z.unknown()).optional(),
      events: z.array(z.unknown()).optional(),
    })
    .passthrough()
    .parse(pageState);

  const collection = parsedState[key];
  if (!collection) {
    throw new MyUWAdapterError('unsupported_context', `MyUW page state does not expose ${key}.`);
  }

  return collection as T[];
}

function normalizeNotice(rawNotice: MyUWRawNotice): Announcement {
  return AnnouncementSchema.parse({
    id: `myuw:notice:${rawNotice.id}`,
    kind: 'announcement',
    site: 'myuw',
    source: {
      site: 'myuw',
      resourceId: String(rawNotice.id),
      resourceType: 'notice',
      url: rawNotice.url,
    },
    url: rawNotice.url,
    title: rawNotice.title,
    summary: rawNotice.summary,
    postedAt: rawNotice.postedAt,
  });
}

function normalizeApiNotice(rawNotice: MyUWApiNotice): Announcement {
  const title = rawNotice.title ?? extractNoticeTitleFromHtml(rawNotice.notice_content);
  if (!title) {
    throw new MyUWAdapterError('malformed_response', 'MyUW notices API omitted a title.');
  }

  const resourceId = buildMyUWNoticeResourceId(rawNotice);
  return AnnouncementSchema.parse({
    id: `myuw:notice:${resourceId}`,
    kind: 'announcement',
    site: 'myuw',
    source: {
      site: 'myuw',
      resourceId,
      resourceType: 'notice',
      url: rawNotice.url,
    },
    url: rawNotice.url,
    title,
    summary: extractNoticeSummaryFromHtml(rawNotice.notice_content),
    postedAt: getNoticeAttribute(rawNotice, 'DisplayBegin'),
  });
}

function normalizeEvent(rawEvent: MyUWRawEvent): Event {
  return EventSchema.parse({
    id: `myuw:event:${rawEvent.id}`,
    kind: 'event',
    site: 'myuw',
    source: {
      site: 'myuw',
      resourceId: String(rawEvent.id),
      resourceType: 'event',
      url: rawEvent.url,
    },
    url: rawEvent.url,
    eventKind: rawEvent.eventKind ?? 'notice',
    title: rawEvent.title,
    summary: rawEvent.summary,
    location: rawEvent.location,
    startAt: rawEvent.startAt,
    endAt: rawEvent.endAt,
    detail: rawEvent.location ? `${rawEvent.title} · ${rawEvent.location}` : rawEvent.summary,
  });
}

function normalizeApiDeptCalEvent(rawEvent: MyUWApiDeptCalEvent): Event {
  const resourceId = rawEvent.event_url ?? `${rawEvent.summary}:${rawEvent.start ?? ''}`;
  return EventSchema.parse({
    id: `myuw:event:${resourceId}`,
    kind: 'event',
    site: 'myuw',
    source: {
      site: 'myuw',
      resourceId,
      resourceType: 'event',
      url: rawEvent.event_url,
    },
    url: rawEvent.event_url,
    eventKind: 'other',
    title: rawEvent.summary,
    summary: rawEvent.summary,
    startAt: rawEvent.start,
    endAt: rawEvent.end,
    detail: rawEvent.summary,
  });
}

function normalizeScheduleCourse(rawSection: MyUWScheduleSection): Course {
  const resourceId = rawSection.sln != null
    ? String(rawSection.sln)
    : `${rawSection.curriculum_abbr}-${rawSection.course_number}-${rawSection.section_id}`;
  const title = `${rawSection.curriculum_abbr} ${rawSection.course_number} ${rawSection.section_id}: ${rawSection.course_title}`;

  return CourseSchema.parse({
    id: `myuw:course:${resourceId}`,
    kind: 'course',
    site: 'myuw',
    source: {
      site: 'myuw',
      resourceId,
      resourceType: 'course',
      url: rawSection.canvas_url ?? undefined,
    },
    url: rawSection.canvas_url ?? undefined,
    title,
    code: `${rawSection.curriculum_abbr} ${rawSection.course_number} ${rawSection.section_id}`,
  });
}

const MYUW_WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function buildMyUWSectionCode(rawSection: Pick<MyUWScheduleSection, 'curriculum_abbr' | 'course_number' | 'section_id'>) {
  return `${rawSection.curriculum_abbr} ${rawSection.course_number} ${rawSection.section_id}`;
}

function buildMyUWScheduleResourceId(
  rawSection: Pick<MyUWScheduleSection, 'curriculum_abbr' | 'course_number' | 'section_id' | 'sln'>,
  suffix: string,
) {
  const sectionId = rawSection.sln != null
    ? String(rawSection.sln)
    : buildMyUWSectionCode(rawSection).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${sectionId}:${suffix}`;
}

function getOffsetFromNow(now: string) {
  const match = now.match(/([+-]\d{2}:\d{2}|Z)$/);
  return match?.[1] ?? 'Z';
}

function normalizeMyUWDateTime(value: string | undefined, offset: string) {
  if (!value) {
    return undefined;
  }

  if (IsoDateTimeSchema.safeParse(value).success) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
    const normalized = `${value}${offset}`;
    return IsoDateTimeSchema.safeParse(normalized).success ? normalized : undefined;
  }

  return undefined;
}

function nextDateString(dateString: string) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getWeekdayKey(dateString: string): keyof MyUWMeetingDays {
  return MYUW_WEEKDAY_KEYS[new Date(`${dateString}T00:00:00Z`).getUTCDay()];
}

function buildLocalIsoDateTime(dateString: string, timeString: string, offset: string) {
  const normalized = `${dateString}T${timeString}:00${offset}`;
  return IsoDateTimeSchema.safeParse(normalized).success ? normalized : undefined;
}

function findNextMeetingOccurrence(input: {
  meeting: MyUWScheduleMeeting;
  section: MyUWScheduleSection;
  period: MyUWVisualSchedulePeriod;
  term?: MyUWScheduleTerm;
  now: string;
}) {
  const { meeting, section, period, term, now } = input;
  if (meeting.days_tbd || meeting.no_meeting || meeting.wont_meet || !meeting.start_time || !meeting.end_time) {
    return undefined;
  }

  const startDate = section.start_date ?? period.start_date ?? term?.first_day_quarter;
  const endDate = section.end_date ?? period.end_date ?? term?.last_day_instruction;
  if (!startDate || !endDate) {
    return undefined;
  }

  const nowDate = now.slice(0, 10);
  const nowTime = new Date(now).getTime();
  const offset = getOffsetFromNow(now);
  let cursor = startDate > nowDate ? startDate : nowDate;

  while (cursor <= endDate) {
    const weekday = getWeekdayKey(cursor);
    if (meeting.meeting_days?.[weekday] === true) {
      const startAt = buildLocalIsoDateTime(cursor, meeting.start_time, offset);
      const endAt = buildLocalIsoDateTime(cursor, meeting.end_time, offset);
      if (startAt && endAt && new Date(startAt).getTime() >= nowTime) {
        return { startAt, endAt };
      }
    }

    cursor = nextDateString(cursor);
  }

  return undefined;
}

function normalizeVisualScheduleClassEvent(
  rawSection: MyUWScheduleSection,
  meeting: MyUWScheduleMeeting,
  occurrence: { startAt: string; endAt: string },
): Event {
  const label = meeting.type?.trim() || 'class';
  const sectionCode = buildMyUWSectionCode(rawSection);
  const resourceId = buildMyUWScheduleResourceId(rawSection, `meeting:${meeting.index ?? label}`);
  const courseResourceId =
    rawSection.sln != null
      ? String(rawSection.sln)
      : `${rawSection.curriculum_abbr}-${rawSection.course_number}-${rawSection.section_id}`;
  const location = buildLocation([meeting.building_name, meeting.building, meeting.room]);
  return EventSchema.parse({
    id: `myuw:event:${resourceId}`,
    kind: 'event',
    site: 'myuw',
    source: {
      site: 'myuw',
      resourceId,
      resourceType: 'schedule_meeting',
      url: rawSection.canvas_url ?? undefined,
    },
    url: rawSection.canvas_url ?? undefined,
    courseId: `myuw:course:${courseResourceId}`,
    eventKind: 'class',
    title: `${sectionCode} ${label}`,
    summary: buildScheduleSummary({
      sectionCode,
      courseTitle: rawSection.course_title,
      label,
      location,
    }),
    location,
    startAt: occurrence.startAt,
    endAt: occurrence.endAt,
    detail: location ? `${label} · ${location}` : label,
  });
}

function normalizeVisualScheduleExamEvent(rawSection: MyUWScheduleSection, rawExam: MyUWFinalExam, now: string): Event | undefined {
  if (rawExam.no_exam_or_nontraditional || !rawExam.start_date || !rawExam.end_date) {
    return undefined;
  }

  const offset = getOffsetFromNow(now);
  const startAt = normalizeMyUWDateTime(rawExam.start_date, offset);
  const endAt = normalizeMyUWDateTime(rawExam.end_date, offset);
  if (!startAt || !endAt) {
    return undefined;
  }

  const resourceId = buildMyUWScheduleResourceId(rawSection, 'final-exam');
  const courseResourceId =
    rawSection.sln != null
      ? String(rawSection.sln)
      : `${rawSection.curriculum_abbr}-${rawSection.course_number}-${rawSection.section_id}`;
  const location = buildLocation([rawExam.building_name, rawExam.building, rawExam.room_number, rawExam.room]);
  const sectionCode = buildMyUWSectionCode(rawSection);
  return EventSchema.parse({
    id: `myuw:event:${resourceId}`,
    kind: 'event',
    site: 'myuw',
    source: {
      site: 'myuw',
      resourceId,
      resourceType: 'schedule_final_exam',
      url: rawSection.canvas_url ?? undefined,
    },
    url: rawSection.canvas_url ?? undefined,
    courseId: `myuw:course:${courseResourceId}`,
    eventKind: 'exam',
    title: `${sectionCode} final exam`,
    summary: buildScheduleSummary({
      sectionCode,
      courseTitle: rawSection.course_title,
      label: 'final exam',
      location,
    }),
    location,
    startAt,
    endAt,
    detail: location ? `final exam · ${location}` : 'final exam',
  });
}

function dedupeEventsById(events: Event[]) {
  return Array.from(new Map(events.map((event) => [event.id, event])).values());
}

function collectVisualScheduleEvents(payload: MyUWVisualSchedulePayload, now: string) {
  const regularPeriod =
    payload.periods.find((period) => period.id === 0 || period.id === '0') ??
    payload.periods.find((period) => period.id !== 'finals');
  const finalsPeriod = payload.periods.find((period) => period.id === 'finals');
  const regularSections = regularPeriod?.sections.filter((section) => section.is_primary_section !== false) ?? [];

  const classEvents = regularPeriod
    ? regularSections.flatMap((section) =>
        section.meetings.flatMap((meeting) => {
          const occurrence = findNextMeetingOccurrence({
            meeting,
            section,
            period: regularPeriod,
            term: payload.term,
            now,
          });
          return occurrence ? [normalizeVisualScheduleClassEvent(section, meeting, occurrence)] : [];
        }),
      )
    : [];

  const examSections =
    finalsPeriod?.sections.filter((section) => section.is_primary_section !== false) ??
    regularSections ??
    [];
  const examEvents = examSections.flatMap((section) => {
    const exam = normalizeVisualScheduleExamEvent(section, section.final_exam ?? {}, now);
    return exam ? [exam] : [];
  });

  return dedupeEventsById([...classEvents, ...examEvents]);
}

class MyUWCoursesApiCollector implements ResourceCollector<Course> {
  readonly name = 'MyUWCoursesApiCollector';
  readonly resource = 'courses';
  readonly mode = 'private_api' as const;
  readonly priority = 5;

  constructor(private readonly client: MyUWApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'myuw';
  }

  async collect() {
    const sections = await this.client.getCurrentScheduleSections();
    return sections
      .filter((section) => section.is_primary_section !== false)
      .map(normalizeScheduleCourse);
  }
}

class MyUWNoticesApiCollector implements ResourceCollector<Announcement> {
  readonly name = 'MyUWNoticesApiCollector';
  readonly resource = 'announcements';
  readonly mode = 'private_api' as const;
  readonly priority = 5;

  constructor(private readonly client: MyUWApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'myuw';
  }

  async collect() {
    return this.client.getNotices().then((items) => items.map(normalizeApiNotice));
  }
}

export type MyUWSyncOutcome = SiteSyncOutcome;
export interface MyUWSnapshot extends SiteSnapshot {
  courses?: Course[];
  announcements?: Announcement[];
  events?: Event[];
}
export type MyUWSyncResult =
  | (SiteSyncSuccess & {
      site: 'myuw';
      snapshot: MyUWSnapshot;
    })
  | (SiteSyncFailure & {
      site: 'myuw';
    });

type MyUWSyncFailure = Extract<MyUWSyncResult, { ok: false }>;

class MyUWNoticesStateCollector implements ResourceCollector<Announcement> {
  readonly name = 'MyUWNoticesStateCollector';
  readonly resource = 'announcements';
  readonly mode = 'state' as const;
  readonly priority = 10;

  async supports(ctx: AdapterContext) {
    return ctx.site === 'myuw' && Boolean(ctx.pageState);
  }

  async collect(ctx: AdapterContext) {
    const rawNotices = parseStateCollection<MyUWRawNotice>(ctx.pageState, 'notices');
    return z.array(MyUWRawNoticeSchema).parse(rawNotices).map(normalizeNotice);
  }
}

class MyUWNoticesDomCollector implements ResourceCollector<Announcement> {
  readonly name = 'MyUWNoticesDomCollector';
  readonly resource = 'announcements';
  readonly mode = 'dom' as const;
  readonly priority = 20;

  async supports(ctx: AdapterContext) {
    return ctx.site === 'myuw' && Boolean(ctx.pageHtml);
  }

  async collect(ctx: AdapterContext) {
    let rawNotices: MyUWRawNotice[];
    try {
      rawNotices = parseJsonFromHtml<MyUWRawNotice>(ctx.pageHtml, 'myuw-notices');
    } catch (error) {
      if (!(error instanceof MyUWAdapterError) || error.code !== 'unsupported_context') {
        throw error;
      }
      rawNotices = parseVisibleNoticesFromHtml(ctx.pageHtml);
    }
    return z.array(MyUWRawNoticeSchema).parse(rawNotices).map(normalizeNotice);
  }
}

class MyUWEventsApiCollector implements ResourceCollector<Event> {
  readonly name = 'MyUWEventsApiCollector';
  readonly resource = 'events';
  readonly mode = 'private_api' as const;
  readonly priority = 5;

  constructor(private readonly client: MyUWApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'myuw';
  }

  async collect(ctx: AdapterContext) {
    const events: Event[] = [];
    let lastError: unknown;

    try {
      const visualSchedule = await this.client.getCurrentVisualSchedule();
      events.push(...collectVisualScheduleEvents(visualSchedule, ctx.now));
    } catch (error) {
      lastError = error;
    }

    try {
      const deptCalEvents = await this.client.getDeptCalEvents();
      events.push(...deptCalEvents.map(normalizeApiDeptCalEvent));
    } catch (error) {
      lastError = error;
    }

    const normalizedEvents = dedupeEventsById(events);
    if (normalizedEvents.length > 0) {
      return normalizedEvents;
    }

    if (lastError) {
      throw lastError;
    }

    throw new MyUWAdapterError('unsupported_context', 'MyUW events API returned no usable events.');
  }
}

class MyUWEventsDomCollector implements ResourceCollector<Event> {
  readonly name = 'MyUWEventsDomCollector';
  readonly resource = 'events';
  readonly mode = 'dom' as const;
  readonly priority = 10;

  async supports(ctx: AdapterContext) {
    return ctx.site === 'myuw' && Boolean(ctx.pageHtml);
  }

  async collect(ctx: AdapterContext) {
    let rawEvents: MyUWRawEvent[];
    if (ctx.url.includes('/academic_calendar/')) {
      rawEvents = parseAcademicCalendarEventsFromHtml(ctx.pageHtml, ctx.now);
    } else {
      try {
        rawEvents = parseJsonFromHtml<MyUWRawEvent>(ctx.pageHtml, 'myuw-events');
      } catch (error) {
        if (!(error instanceof MyUWAdapterError) || error.code !== 'unsupported_context') {
          throw error;
        }
        rawEvents = parseVisibleEventsFromHtml(ctx.pageHtml);
      }
    }
    return z.array(MyUWRawEventSchema).parse(rawEvents).map(normalizeEvent);
  }
}

class MyUWEventsStateCollector implements ResourceCollector<Event> {
  readonly name = 'MyUWEventsStateCollector';
  readonly resource = 'events';
  readonly mode = 'state' as const;
  readonly priority = 20;

  async supports(ctx: AdapterContext) {
    return ctx.site === 'myuw' && Boolean(ctx.pageState);
  }

  async collect(ctx: AdapterContext) {
    const rawEvents = parseStateCollection<MyUWRawEvent>(ctx.pageState, 'events');
    return z.array(MyUWRawEventSchema).parse(rawEvents).map(normalizeEvent);
  }
}

function buildMyUWFailure(
  outcome: Exclude<MyUWSyncOutcome, 'success' | 'partial_success'>,
  errorReason: string,
  syncedAt: string,
  code: HealthStatus['code'],
  attemptsByResource?: AttemptsByResource,
): MyUWSyncFailure {
  return {
    ok: false,
    site: 'myuw',
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

function mapMyUWFailure(
  error: unknown,
  syncedAt: string,
  attemptsByResource?: AttemptsByResource,
): MyUWSyncFailure {
  if (error instanceof MyUWAdapterError) {
    switch (error.code) {
      case 'unauthorized':
        return buildMyUWFailure('not_logged_in', error.message, syncedAt, 'logged_out', attemptsByResource);
      case 'unsupported_context':
        return buildMyUWFailure('unsupported_context', error.message, syncedAt, 'unsupported_context', attemptsByResource);
      case 'malformed_response':
        return buildMyUWFailure('normalize_failed', error.message, syncedAt, 'normalize_failed', attemptsByResource);
      case 'request_failed':
      default:
        return buildMyUWFailure('request_failed', error.message, syncedAt, 'collector_failed', attemptsByResource);
    }
  }

  return buildMyUWFailure(
    'request_failed',
    error instanceof Error ? error.message : 'MyUW sync failed.',
    syncedAt,
    'collector_failed',
    attemptsByResource,
  );
}

function classifyMyUWAttemptFailure(attempts: PipelineAttempt[] | undefined) {
  const reasons = (attempts ?? [])
    .map((attempt) => attempt.errorReason?.toLowerCase())
    .filter((reason): reason is string => Boolean(reason));

  if (reasons.some((reason) => reason.includes('unauthorized'))) {
    return 'unauthorized' as const;
  }

  if (reasons.some((reason) => reason.includes('malformed'))) {
    return 'normalize_failed' as const;
  }

  return 'collector_failed' as const;
}

function buildMyUWPartialReason(failedResources: Array<{ resource: 'courses' | 'announcements' | 'events'; attempts: PipelineAttempt[] }>) {
  const labels = failedResources
    .map(({ resource, attempts }) => `${resource}_${classifyMyUWAttemptFailure(attempts)}`)
    .sort();
  return `myuw_${labels.join('_and_')}`;
}

function mapPipelineFailure(
  errorReason: 'no_collectors_registered' | 'no_supported_collectors' | 'all_collectors_failed',
  attemptsByResource: AttemptsByResource,
  resource: 'courses' | 'announcements' | 'events',
  syncedAt: string,
): MyUWSyncFailure {
  if (errorReason === 'no_supported_collectors') {
    return buildMyUWFailure('unsupported_context', errorReason, syncedAt, 'unsupported_context', attemptsByResource);
  }

  const resourceAttempts = attemptsByResource[resource] ?? [];
  if (classifyMyUWAttemptFailure(resourceAttempts) === 'unauthorized') {
    return buildMyUWFailure('not_logged_in', 'MyUW session is unauthorized.', syncedAt, 'logged_out', attemptsByResource);
  }

  const hasNormalizeLikeFailure = resourceAttempts.some((attempt) => attempt.errorReason?.includes('malformed'));

  return buildMyUWFailure(
    hasNormalizeLikeFailure ? 'normalize_failed' : 'collector_failed',
    errorReason,
    syncedAt,
    hasNormalizeLikeFailure ? 'normalize_failed' : 'collector_failed',
    attemptsByResource,
  );
}

export class MyUWAdapter implements SiteAdapter {
  readonly site = 'myuw' as const;

  constructor(private readonly client?: MyUWApiClient) {}

  async canRun(ctx: AdapterContext): Promise<boolean> {
    return ctx.site === 'myuw';
  }

  async getCapabilities(ctx: AdapterContext): Promise<AdapterCapabilities> {
    return {
      privateApi: Boolean(this.client),
      pageState: true,
      dom: true,
      resources: {
        courses: {
          supported: ctx.site === 'myuw' && Boolean(this.client),
          modes: this.client ? ['private_api'] : [],
          preferredMode: this.client ? 'private_api' : undefined,
        },
        announcements: {
          supported: ctx.site === 'myuw',
          modes: this.client ? ['private_api', 'state', 'dom'] : ['state', 'dom'],
          preferredMode: this.client ? 'private_api' : 'state',
        },
        events: {
          supported: ctx.site === 'myuw',
          modes: this.client ? ['private_api', 'state', 'dom'] : ['state', 'dom'],
          preferredMode: this.client ? 'private_api' : 'state',
        },
      },
    };
  }

  async healthCheck(ctx: AdapterContext): Promise<HealthStatus> {
    const hasContext = Boolean(this.client || ctx.pageState || ctx.pageHtml);
    return HealthStatusSchema.parse({
      status: ctx.site === 'myuw' && hasContext ? 'healthy' : 'unavailable',
      checkedAt: ctx.now,
      code: ctx.site === 'myuw' && hasContext ? 'supported' : 'unsupported_context',
      reason: ctx.site === 'myuw' && hasContext ? 'myuw_api_state_dom_phase' : 'unsupported_context',
    });
  }

  async sync(ctx: AdapterContext): Promise<MyUWSyncResult> {
    const attemptsByResource: AttemptsByResource = {};

    try {
      const courseCollectors: ResourceCollector<Course>[] = [];
      const noticeCollectors: ResourceCollector<Announcement>[] = [];
      const eventCollectors: ResourceCollector<Event>[] = [];
      if (this.client) {
        courseCollectors.push(new MyUWCoursesApiCollector(this.client));
        noticeCollectors.push(new MyUWNoticesApiCollector(this.client));
        eventCollectors.push(new MyUWEventsApiCollector(this.client));
      }
      noticeCollectors.push(new MyUWNoticesStateCollector(), new MyUWNoticesDomCollector());
      eventCollectors.push(new MyUWEventsStateCollector(), new MyUWEventsDomCollector());

      const coursesPipeline =
        courseCollectors.length > 0
          ? await runCollectorPipeline(ctx, courseCollectors)
          : {
              ok: false as const,
              errorReason: 'no_supported_collectors' as const,
              attempts: [],
            };
      attemptsByResource.courses = coursesPipeline.attempts;

      const noticesPipeline = await runCollectorPipeline(ctx, noticeCollectors);
      attemptsByResource.announcements = noticesPipeline.attempts;

      const eventsPipeline = await runCollectorPipeline(ctx, eventCollectors);
      attemptsByResource.events = eventsPipeline.attempts;

      const courses = coursesPipeline.ok ? z.array(CourseSchema).parse(coursesPipeline.items) : undefined;
      const announcements = noticesPipeline.ok
        ? z.array(AnnouncementSchema).parse(noticesPipeline.items)
        : undefined;
      const events = eventsPipeline.ok ? z.array(EventSchema).parse(eventsPipeline.items) : undefined;

      if (!announcements && !events) {
        if (!coursesPipeline.ok && courseCollectors.length > 0) {
          return mapPipelineFailure(coursesPipeline.errorReason, attemptsByResource, 'courses', ctx.now);
        }
        if (!noticesPipeline.ok) {
          return mapPipelineFailure(noticesPipeline.errorReason, attemptsByResource, 'announcements', ctx.now);
        }
        return mapPipelineFailure(
          eventsPipeline.ok ? 'all_collectors_failed' : eventsPipeline.errorReason,
          attemptsByResource,
          'events',
          ctx.now,
        );
      }

      const partialFailures: Array<{ resource: 'courses' | 'announcements' | 'events'; attempts: PipelineAttempt[] }> = [];
      if (!coursesPipeline.ok && courseCollectors.length > 0) {
        partialFailures.push({ resource: 'courses', attempts: coursesPipeline.attempts });
      }
      if (!noticesPipeline.ok) {
        partialFailures.push({ resource: 'announcements', attempts: noticesPipeline.attempts });
      }
      if (!eventsPipeline.ok) {
        partialFailures.push({ resource: 'events', attempts: eventsPipeline.attempts });
      }

      const outcome: MyUWSyncResult['outcome'] = partialFailures.length === 0 ? 'success' : 'partial_success';
      const healthReason =
        outcome === 'success' ? 'myuw_api_state_dom_sync_success' : buildMyUWPartialReason(partialFailures);

      return {
        ok: true,
        site: 'myuw',
        outcome,
        snapshot: {
          courses,
          announcements,
          events,
        },
        syncedAt: ctx.now,
        health: HealthStatusSchema.parse({
          status: outcome === 'success' ? 'healthy' : 'degraded',
          checkedAt: ctx.now,
          code: outcome === 'success' ? 'supported' : 'partial_success',
          reason: healthReason,
        }),
        attemptsByResource,
      };
    } catch (error) {
      return mapMyUWFailure(error, ctx.now, attemptsByResource);
    }
  }
}

export function createMyUWAdapter(client?: MyUWApiClient) {
  return new MyUWAdapter(client);
}
