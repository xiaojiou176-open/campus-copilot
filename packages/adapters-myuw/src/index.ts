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
  AnnouncementSchema,
  EventSchema,
  HealthStatusSchema,
  type Announcement,
  type Event,
  type HealthStatus,
} from '@campus-copilot/schema';
import { z } from 'zod';

type MyUWFailureCode = 'unsupported_context' | 'malformed_response' | 'request_failed';

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
    postedAt: z.string().optional(),
    url: z.url().optional(),
  })
  .passthrough();

const MyUWRawEventSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    title: z.string().min(1),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
    eventKind: z.enum(['deadline', 'class', 'exam', 'notice', 'other']).optional(),
    url: z.url().optional(),
  })
  .passthrough();

type MyUWRawNotice = z.infer<typeof MyUWRawNoticeSchema>;
type MyUWRawEvent = z.infer<typeof MyUWRawEventSchema>;

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
      /noticeCard-[^"]+-collapse-(?<id>[^"]+)[\s\S]*?<span class="notice-title">(?<title>[\s\S]*?)<\/span>/g,
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
    postedAt: rawNotice.postedAt,
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
    startAt: rawEvent.startAt,
    endAt: rawEvent.endAt,
  });
}

export type MyUWSyncOutcome = SiteSyncOutcome;
export interface MyUWSnapshot extends SiteSnapshot {
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
    try {
      rawEvents = parseJsonFromHtml<MyUWRawEvent>(ctx.pageHtml, 'myuw-events');
    } catch (error) {
      if (!(error instanceof MyUWAdapterError) || error.code !== 'unsupported_context') {
        throw error;
      }
      rawEvents = parseVisibleEventsFromHtml(ctx.pageHtml);
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

function mapPipelineFailure(
  errorReason: 'no_collectors_registered' | 'no_supported_collectors' | 'all_collectors_failed',
  attemptsByResource: AttemptsByResource,
  resource: 'announcements' | 'events',
  syncedAt: string,
): MyUWSyncFailure {
  if (errorReason === 'no_supported_collectors') {
    return buildMyUWFailure('unsupported_context', errorReason, syncedAt, 'unsupported_context', attemptsByResource);
  }

  const hasNormalizeLikeFailure = (attemptsByResource[resource] ?? []).some((attempt) =>
    attempt.errorReason?.includes('malformed'),
  );

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

  async canRun(ctx: AdapterContext): Promise<boolean> {
    return ctx.site === 'myuw';
  }

  async getCapabilities(ctx: AdapterContext): Promise<AdapterCapabilities> {
    return {
      pageState: true,
      dom: true,
      resources: {
        announcements: {
          supported: ctx.site === 'myuw',
          modes: ['state', 'dom'],
          preferredMode: 'state',
        },
        events: {
          supported: ctx.site === 'myuw',
          modes: ['dom', 'state'],
          preferredMode: 'dom',
        },
      },
    };
  }

  async healthCheck(ctx: AdapterContext): Promise<HealthStatus> {
    const hasContext = Boolean(ctx.pageState || ctx.pageHtml);
    return HealthStatusSchema.parse({
      status: ctx.site === 'myuw' && hasContext ? 'healthy' : 'unavailable',
      checkedAt: ctx.now,
      code: ctx.site === 'myuw' && hasContext ? 'supported' : 'unsupported_context',
      reason: ctx.site === 'myuw' && hasContext ? 'myuw_state_dom_phase' : 'unsupported_context',
    });
  }

  async sync(ctx: AdapterContext): Promise<MyUWSyncResult> {
    const attemptsByResource: AttemptsByResource = {};

    try {
      const noticesPipeline = await runCollectorPipeline(ctx, [
        new MyUWNoticesStateCollector(),
        new MyUWNoticesDomCollector(),
      ]);
      attemptsByResource.announcements = noticesPipeline.attempts;

      const eventsPipeline = await runCollectorPipeline(ctx, [
        new MyUWEventsDomCollector(),
        new MyUWEventsStateCollector(),
      ]);
      attemptsByResource.events = eventsPipeline.attempts;

      const announcements = noticesPipeline.ok
        ? z.array(AnnouncementSchema).parse(noticesPipeline.items)
        : undefined;
      const events = eventsPipeline.ok ? z.array(EventSchema).parse(eventsPipeline.items) : undefined;

      if (!announcements && !events) {
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

      const outcome: MyUWSyncResult['outcome'] =
        noticesPipeline.ok && eventsPipeline.ok ? 'success' : 'partial_success';

      return {
        ok: true,
        site: 'myuw',
        outcome,
        snapshot: {
          announcements,
          events,
        },
        syncedAt: ctx.now,
        health: HealthStatusSchema.parse({
          status: outcome === 'success' ? 'healthy' : 'degraded',
          checkedAt: ctx.now,
          code: outcome === 'success' ? 'supported' : 'partial_success',
          reason: outcome === 'success' ? 'myuw_state_dom_sync_success' : 'myuw_state_dom_partial_success',
        }),
        attemptsByResource,
      };
    } catch (error) {
      return mapMyUWFailure(error, ctx.now, attemptsByResource);
    }
  }
}

export function createMyUWAdapter() {
  return new MyUWAdapter();
}
