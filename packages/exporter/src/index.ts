import {
  AlertSchema,
  AnnouncementSchema,
  AssignmentSchema,
  EventSchema,
  GradeSchema,
  IsoDateTimeSchema,
  MessageSchema,
  TimelineEntrySchema,
  type Alert,
  type Announcement,
  type Assignment,
  type Event,
  type Grade,
  type Message,
  type TimelineEntry,
} from '@campus-copilot/schema';

export type ExportPreset = 'weekly_assignments' | 'recent_updates' | 'all_deadlines' | 'current_view';
export type ExportFormat = 'json' | 'csv' | 'markdown' | 'ics';

export interface ExportInput {
  generatedAt: string;
  viewTitle?: string;
  assignments?: Assignment[];
  announcements?: Announcement[];
  messages?: Message[];
  grades?: Grade[];
  events?: Event[];
  alerts?: Alert[];
  timelineEntries?: TimelineEntry[];
}

export interface ExportArtifact {
  preset: ExportPreset;
  format: ExportFormat;
  filename: string;
  mimeType: string;
  content: string;
}

interface NormalizedExportInput {
  generatedAt: string;
  viewTitle?: string;
  assignments: Assignment[];
  announcements: Announcement[];
  messages: Message[];
  grades: Grade[];
  events: Event[];
  alerts: Alert[];
  timelineEntries: TimelineEntry[];
}

interface ExportDataset extends NormalizedExportInput {
  title: string;
}

interface CsvRow {
  kind: string;
  site: string;
  title: string;
  courseId: string;
  assignmentId: string;
  status: string;
  occurredAt: string;
  dueAt: string;
  startAt: string;
  endAt: string;
  score: string;
  maxScore: string;
  importance: string;
  summary: string;
  url: string;
}

const MIME_TYPES: Record<ExportFormat, string> = {
  json: 'application/json',
  csv: 'text/csv',
  markdown: 'text/markdown',
  ics: 'text/calendar',
};

const PRESET_LABELS: Record<ExportPreset, string> = {
  weekly_assignments: 'weekly-assignments',
  recent_updates: 'recent-updates',
  all_deadlines: 'all-deadlines',
  current_view: 'current-view',
};

function normalizeInput(input: ExportInput): NormalizedExportInput {
  const generatedAt = IsoDateTimeSchema.parse(input.generatedAt);
  return {
    generatedAt,
    viewTitle: input.viewTitle,
    assignments: (input.assignments ?? []).map((record) => AssignmentSchema.parse(record)),
    announcements: (input.announcements ?? []).map((record) => AnnouncementSchema.parse(record)),
    messages: (input.messages ?? []).map((record) => MessageSchema.parse(record)),
    grades: (input.grades ?? []).map((record) => GradeSchema.parse(record)),
    events: (input.events ?? []).map((record) => EventSchema.parse(record)),
    alerts: (input.alerts ?? []).map((record) => AlertSchema.parse(record)),
    timelineEntries: (input.timelineEntries ?? []).map((record) => TimelineEntrySchema.parse(record)),
  };
}

function addDays(isoString: string, days: number) {
  const date = new Date(isoString);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function isWithinWindow(target: string | undefined, start: string, end: string) {
  if (!target) {
    return false;
  }
  const value = new Date(target).getTime();
  return value >= new Date(start).getTime() && value <= new Date(end).getTime();
}

function buildPresetDataset(preset: ExportPreset, input: NormalizedExportInput): ExportDataset {
  const weekEnd = addDays(input.generatedAt, 7);
  const recentStart = addDays(input.generatedAt, -7);

  switch (preset) {
    case 'weekly_assignments':
      return {
        ...input,
        title: 'Weekly assignments',
        assignments: input.assignments.filter((assignment) => {
          return (
            isWithinWindow(assignment.dueAt, input.generatedAt, weekEnd) ||
            assignment.status === 'missing' ||
            assignment.status === 'overdue'
          );
        }),
        announcements: [],
        messages: [],
        grades: [],
        events: [],
        alerts: [],
        timelineEntries: [],
      };
    case 'recent_updates':
      return {
        ...input,
        title: 'Recent updates',
        assignments: [],
        announcements: input.announcements.filter((item) => isWithinWindow(item.postedAt, recentStart, input.generatedAt)),
        messages: input.messages.filter((item) => isWithinWindow(item.createdAt, recentStart, input.generatedAt)),
        grades: input.grades.filter((item) => isWithinWindow(item.releasedAt ?? item.gradedAt, recentStart, input.generatedAt)),
        events: [],
        alerts: input.alerts.filter((item) => isWithinWindow(item.triggeredAt, recentStart, input.generatedAt)),
        timelineEntries: input.timelineEntries.filter((item) => isWithinWindow(item.occurredAt, recentStart, input.generatedAt)),
      };
    case 'all_deadlines':
      return {
        ...input,
        title: 'All deadlines',
        assignments: input.assignments.filter((item) => Boolean(item.dueAt)),
        announcements: [],
        messages: [],
        grades: [],
        events: input.events.filter((item) => item.eventKind === 'deadline' || Boolean(item.startAt) || Boolean(item.endAt)),
        alerts: [],
        timelineEntries: [],
      };
    case 'current_view':
    default:
      return {
        ...input,
        title: input.viewTitle ?? 'Current view',
      };
  }
}

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function formatOptionalNumber(value: number | undefined) {
  return value === undefined ? '' : String(value);
}

function formatOptionalString(value: string | undefined) {
  return value ?? '';
}

function buildCsvRows(dataset: ExportDataset): CsvRow[] {
  const rows: CsvRow[] = [];

  for (const assignment of dataset.assignments) {
    rows.push({
      kind: assignment.kind,
      site: assignment.site,
      title: assignment.title,
      courseId: formatOptionalString(assignment.courseId),
      assignmentId: assignment.id,
      status: assignment.status,
      occurredAt: '',
      dueAt: formatOptionalString(assignment.dueAt),
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
      importance: '',
      summary: '',
      url: formatOptionalString(assignment.url),
    });
  }

  for (const announcement of dataset.announcements) {
    rows.push({
      kind: announcement.kind,
      site: announcement.site,
      title: announcement.title,
      courseId: formatOptionalString(announcement.courseId),
      assignmentId: '',
      status: '',
      occurredAt: formatOptionalString(announcement.postedAt),
      dueAt: '',
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
      importance: '',
      summary: '',
      url: formatOptionalString(announcement.url),
    });
  }

  for (const message of dataset.messages) {
    rows.push({
      kind: message.kind,
      site: message.site,
      title: formatOptionalString(message.title),
      courseId: formatOptionalString(message.courseId),
      assignmentId: '',
      status: message.unread ? 'unread' : '',
      occurredAt: formatOptionalString(message.createdAt),
      dueAt: '',
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
      importance: '',
      summary: message.messageKind,
      url: formatOptionalString(message.url),
    });
  }

  for (const grade of dataset.grades) {
    rows.push({
      kind: grade.kind,
      site: grade.site,
      title: grade.title,
      courseId: formatOptionalString(grade.courseId),
      assignmentId: formatOptionalString(grade.assignmentId),
      status: '',
      occurredAt: formatOptionalString(grade.releasedAt ?? grade.gradedAt),
      dueAt: '',
      startAt: '',
      endAt: '',
      score: formatOptionalNumber(grade.score),
      maxScore: formatOptionalNumber(grade.maxScore),
      importance: '',
      summary: '',
      url: formatOptionalString(grade.url),
    });
  }

  for (const event of dataset.events) {
    rows.push({
      kind: event.kind,
      site: event.site,
      title: event.title,
      courseId: '',
      assignmentId: formatOptionalString(event.relatedAssignmentId),
      status: event.eventKind,
      occurredAt: '',
      dueAt: '',
      startAt: formatOptionalString(event.startAt),
      endAt: formatOptionalString(event.endAt),
      score: '',
      maxScore: '',
      importance: '',
      summary: '',
      url: formatOptionalString(event.url),
    });
  }

  for (const alert of dataset.alerts) {
    rows.push({
      kind: alert.kind,
      site: alert.site,
      title: alert.title,
      courseId: '',
      assignmentId: '',
      status: alert.alertKind,
      occurredAt: formatOptionalString(alert.triggeredAt),
      dueAt: '',
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
      importance: alert.importance,
      summary: alert.summary,
      url: formatOptionalString(alert.url),
    });
  }

  for (const entry of dataset.timelineEntries) {
    rows.push({
      kind: entry.kind,
      site: entry.site,
      title: entry.title,
      courseId: '',
      assignmentId: '',
      status: entry.timelineKind,
      occurredAt: entry.occurredAt,
      dueAt: '',
      startAt: '',
      endAt: '',
      score: '',
      maxScore: '',
      importance: '',
      summary: formatOptionalString(entry.summary),
      url: formatOptionalString(entry.url),
    });
  }

  return rows;
}

function renderJson(dataset: ExportDataset) {
  return JSON.stringify(
    {
      title: dataset.title,
      generatedAt: dataset.generatedAt,
      counts: {
        assignments: dataset.assignments.length,
        announcements: dataset.announcements.length,
        messages: dataset.messages.length,
        grades: dataset.grades.length,
        events: dataset.events.length,
        alerts: dataset.alerts.length,
        timelineEntries: dataset.timelineEntries.length,
      },
      data: dataset,
    },
    null,
    2,
  );
}

function renderCsv(dataset: ExportDataset) {
  const rows = buildCsvRows(dataset);
  const headers: (keyof CsvRow)[] = [
    'kind',
    'site',
    'title',
    'courseId',
    'assignmentId',
    'status',
    'occurredAt',
    'dueAt',
    'startAt',
    'endAt',
    'score',
    'maxScore',
    'importance',
    'summary',
    'url',
  ];
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvCell(row[header])).join(','));
  }

  return lines.join('\n');
}

function renderMarkdownSection(title: string, lines: string[]) {
  if (lines.length === 0) {
    return '';
  }
  return `## ${title}\n${lines.join('\n')}\n`;
}

function renderMarkdown(dataset: ExportDataset) {
  const sections: string[] = [];

  sections.push(`# ${dataset.title}`);
  sections.push('');
  sections.push(`Generated at: ${dataset.generatedAt}`);
  sections.push('');

  sections.push(
    renderMarkdownSection(
      'Assignments',
      dataset.assignments.map((assignment) => {
        const detail = assignment.dueAt ? ` - due ${assignment.dueAt}` : '';
        return `- ${assignment.title} (${assignment.site}, ${assignment.status})${detail}`;
      }),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Recent Updates',
      [
        ...dataset.announcements.map((item) => `- Announcement: ${item.title} (${item.site})`),
        ...dataset.messages.map((item) => `- Message: ${item.title ?? item.messageKind} (${item.site})`),
        ...dataset.grades.map((item) => `- Grade: ${item.title} (${item.score ?? '-'} / ${item.maxScore ?? '-'})`),
      ],
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Events',
      dataset.events.map((event) => `- ${event.title} (${event.eventKind}) ${event.startAt ?? event.endAt ?? ''}`.trim()),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Alerts',
      dataset.alerts.map((alert) => `- ${alert.title} [${alert.importance}] - ${alert.summary}`),
    ),
  );

  sections.push(
    renderMarkdownSection(
      'Timeline',
      dataset.timelineEntries.map((entry) => `- ${entry.occurredAt}: ${entry.title} (${entry.timelineKind})`),
    ),
  );

  return sections.filter(Boolean).join('\n').trimEnd();
}

function escapeIcsText(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
}

function formatIcsDate(isoString: string) {
  return new Date(isoString).toISOString().replaceAll('-', '').replaceAll(':', '').replace('.000', '');
}

function buildDeadlineEvents(dataset: ExportDataset) {
  const lines: string[] = [];

  for (const assignment of dataset.assignments) {
    if (!assignment.dueAt) {
      continue;
    }
    const due = formatIcsDate(assignment.dueAt);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeIcsText(assignment.id)}`);
    lines.push(`DTSTAMP:${formatIcsDate(dataset.generatedAt)}`);
    lines.push(`DTSTART:${due}`);
    lines.push(`DTEND:${due}`);
    lines.push(`SUMMARY:${escapeIcsText(assignment.title)}`);
    if (assignment.url) {
      lines.push(`URL:${escapeIcsText(assignment.url)}`);
    }
    lines.push('END:VEVENT');
  }

  for (const event of dataset.events) {
    const start = event.startAt ?? event.endAt;
    const end = event.endAt ?? event.startAt;
    if (!start || !end) {
      continue;
    }
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeIcsText(event.id)}`);
    lines.push(`DTSTAMP:${formatIcsDate(dataset.generatedAt)}`);
    lines.push(`DTSTART:${formatIcsDate(start)}`);
    lines.push(`DTEND:${formatIcsDate(end)}`);
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    if (event.url) {
      lines.push(`URL:${escapeIcsText(event.url)}`);
    }
    lines.push('END:VEVENT');
  }

  return lines;
}

function renderIcs(dataset: ExportDataset) {
  const events = buildDeadlineEvents(dataset);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Campus Copilot//Exporter//EN',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

function buildFilename(preset: ExportPreset, format: ExportFormat, generatedAt: string) {
  const datePart = generatedAt.slice(0, 10);
  return `campus-copilot-${PRESET_LABELS[preset]}-${datePart}.${format}`;
}

export function createExportArtifact(request: {
  preset: ExportPreset;
  format: ExportFormat;
  input: ExportInput;
}): ExportArtifact {
  const normalized = normalizeInput(request.input);
  const dataset = buildPresetDataset(request.preset, normalized);

  const content =
    request.format === 'json'
      ? renderJson(dataset)
      : request.format === 'csv'
        ? renderCsv(dataset)
        : request.format === 'markdown'
          ? renderMarkdown(dataset)
          : renderIcs(dataset);

  return {
    preset: request.preset,
    format: request.format,
    filename: buildFilename(request.preset, request.format, normalized.generatedAt),
    mimeType: MIME_TYPES[request.format],
    content,
  };
}
