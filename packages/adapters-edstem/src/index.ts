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
  HealthStatusSchema,
  MessageSchema,
  type HealthStatus,
  type Message,
} from '@campus-copilot/schema';
import { z } from 'zod';

type EdStemRequestPath = string;

type EdStemApiFailureCode =
  | 'unauthorized'
  | 'request_failed'
  | 'malformed_response'
  | 'unsupported_context';

export class EdStemApiError extends Error {
  constructor(
    public readonly code: EdStemApiFailureCode,
    message: string,
    public readonly details?: { status?: number },
  ) {
    super(message);
    this.name = 'EdStemApiError';
  }
}

type EdStemRequestResult =
  | {
      ok: true;
      status: number;
      responseUrl: string;
      bodyText: string;
      contentType?: string;
    }
  | {
      ok: false;
      code: EdStemApiFailureCode;
      message: string;
      status?: number;
    };

export type EdStemRequestExecutor = (path: EdStemRequestPath) => Promise<EdStemRequestResult>;

export interface EdStemPathConfig {
  threadsPath: string;
  unreadPath?: string;
  recentActivityPath?: string;
}

const EdStemRawThreadSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    course_id: z.union([z.number(), z.string()]).optional(),
    title: z.string().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    unread: z.boolean().optional(),
    instructor_authored: z.boolean().optional(),
    url: z.string().nullable().optional(),
  })
  .passthrough();

const EdStemRawActivitySchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    thread_id: z.union([z.number(), z.string()]).optional(),
    course_id: z.union([z.number(), z.string()]).optional(),
    title: z.string().optional(),
    updated_at: z.string().nullable().optional(),
    unread: z.boolean().optional(),
    instructor_authored: z.boolean().optional(),
    url: z.string().nullable().optional(),
  })
  .passthrough();

type EdStemRawThread = z.infer<typeof EdStemRawThreadSchema>;
type EdStemRawActivity = z.infer<typeof EdStemRawActivitySchema>;

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

function buildMessageId(remoteId: string | number) {
  return `edstem:message:${remoteId}`;
}

function toAbsoluteEdStemUrl(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value, 'https://edstem.org').toString();
  } catch {
    return undefined;
  }
}

function normalizeThread(rawThread: EdStemRawThread): Message {
  const resourceId = String(rawThread.id);
  const url = toAbsoluteEdStemUrl(rawThread.url);
  return MessageSchema.parse({
    id: buildMessageId(resourceId),
    kind: 'message',
    site: 'edstem',
    source: {
      site: 'edstem',
      resourceId,
      resourceType: 'thread',
      url,
    },
    url,
    courseId: rawThread.course_id ? `edstem:course:${rawThread.course_id}` : undefined,
    messageKind: 'thread',
    threadId: resourceId,
    title: rawThread.title ?? `EdStem thread ${resourceId}`,
    createdAt: rawThread.updated_at ?? rawThread.created_at ?? undefined,
    instructorAuthored: rawThread.instructor_authored ?? false,
    unread: rawThread.unread ?? false,
  });
}

function normalizeActivity(rawActivity: EdStemRawActivity, resourceType: 'unread_activity' | 'recent_activity'): Message {
  const resourceId = String(rawActivity.id);
  const threadId = rawActivity.thread_id ? String(rawActivity.thread_id) : resourceId;
  const url = toAbsoluteEdStemUrl(rawActivity.url);

  return MessageSchema.parse({
    id: buildMessageId(resourceId),
    kind: 'message',
    site: 'edstem',
    source: {
      site: 'edstem',
      resourceId,
      resourceType,
      url,
    },
    url,
    courseId: rawActivity.course_id ? `edstem:course:${rawActivity.course_id}` : undefined,
    messageKind: 'update',
    threadId,
    title: rawActivity.title ?? `EdStem activity ${resourceId}`,
    createdAt: rawActivity.updated_at ?? undefined,
    instructorAuthored: rawActivity.instructor_authored ?? false,
    unread: rawActivity.unread ?? resourceType === 'unread_activity',
  });
}

export class EdStemApiClient {
  constructor(
    private readonly executeRequest: EdStemRequestExecutor,
    private readonly paths: EdStemPathConfig,
  ) {}

  private async fetchJson(path: EdStemRequestPath): Promise<unknown> {
    const result = await this.executeRequest(path);
    if (!result.ok) {
      throw new EdStemApiError(result.code, result.message, { status: result.status });
    }

    if (result.status === 401 || result.status === 403) {
      throw new EdStemApiError('unauthorized', 'EdStem session is unauthorized.', { status: result.status });
    }

    if (result.status === 404) {
      throw new EdStemApiError('unsupported_context', 'EdStem session-backed request path is unavailable.', {
        status: result.status,
      });
    }

    if (result.status < 200 || result.status >= 300) {
      throw new EdStemApiError('request_failed', `EdStem request failed with status ${result.status}.`, {
        status: result.status,
      });
    }

    try {
      return JSON.parse(result.bodyText);
    } catch {
      throw new EdStemApiError('malformed_response', 'EdStem returned malformed JSON.', {
        status: result.status,
      });
    }
  }

  private async fetchArray<T>(
    path: string | undefined,
    schema: z.ZodArray<z.ZodType<T>>,
    label: string,
  ): Promise<T[]> {
    if (!path) {
      return [];
    }

    try {
      const payload = await this.fetchJson(path);
      const normalizedPayload =
        label === 'threads' &&
        payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as { threads?: unknown }).threads)
          ? (payload as { threads: unknown[] }).threads
          : payload;

      return schema.parse(normalizedPayload);
    } catch (error) {
      if (error instanceof EdStemApiError) {
        throw error;
      }

      throw new EdStemApiError('malformed_response', `EdStem ${label} payload is malformed.`);
    }
  }

  async getThreads() {
    return this.fetchArray(this.paths.threadsPath, z.array(EdStemRawThreadSchema), 'threads');
  }

  async getUnreadActivity() {
    return this.fetchArray(this.paths.unreadPath, z.array(EdStemRawActivitySchema), 'unread activity');
  }

  async getRecentActivity() {
    return this.fetchArray(this.paths.recentActivityPath, z.array(EdStemRawActivitySchema), 'recent activity');
  }

  getConfiguredPaths() {
    return this.paths;
  }
}

export type EdStemSyncOutcome = SiteSyncOutcome;
export interface EdStemSnapshot extends SiteSnapshot {
  messages?: Message[];
}
export type EdStemSyncResult =
  | (SiteSyncSuccess & {
      site: 'edstem';
      snapshot: EdStemSnapshot;
    })
  | (SiteSyncFailure & {
      site: 'edstem';
    });

type EdStemSyncFailure = Extract<EdStemSyncResult, { ok: false }>;

class EdStemMessagesPrivateCollector implements ResourceCollector<Message> {
  readonly name = 'EdStemMessagesPrivateCollector';
  readonly resource = 'messages';
  readonly mode = 'private_api' as const;
  readonly priority = 10;

  constructor(private readonly client: EdStemApiClient) {}

  async supports(ctx: AdapterContext) {
    return ctx.site === 'edstem';
  }

  async collect() {
    const [threads, unreadActivity, recentActivity] = await Promise.all([
      this.client.getThreads(),
      this.client.getUnreadActivity(),
      this.client.getRecentActivity(),
    ]);

    const messages = [
      ...threads.map(normalizeThread),
      ...unreadActivity.map((item) => normalizeActivity(item, 'unread_activity')),
      ...recentActivity.map((item) => normalizeActivity(item, 'recent_activity')),
    ];

    const deduped = new Map(messages.map((message) => [message.id, message]));
    return Array.from(deduped.values());
  }
}

class EdStemMessagesDomCollector implements ResourceCollector<Message> {
  readonly name = 'EdStemMessagesDomCollector';
  readonly resource = 'messages';
  readonly mode = 'dom' as const;
  readonly priority = 20;

  async supports(ctx: AdapterContext) {
    return ctx.site === 'edstem' && Boolean(ctx.pageHtml);
  }

  async collect(ctx: AdapterContext) {
    const html = ctx.pageHtml ?? '';
    const discussionMatches = Array.from(
      html.matchAll(
        /<a[^>]+href="\/us\/courses\/(?<courseId>\d+)\/discussion\/(?<threadId>\d+)"[^>]*>(?<content>[\s\S]*?)<\/a>/g,
      ),
    );

    const discussionMessages = discussionMatches
      .map((match) => {
        const courseId = match.groups?.courseId;
        const threadId = match.groups?.threadId;
        const content = stripDiscussionHtml(match.groups?.content);
        if (!courseId || !threadId || !content) {
          return undefined;
        }

        return MessageSchema.parse({
          id: buildMessageId(threadId),
          kind: 'message',
          site: 'edstem',
          source: {
            site: 'edstem',
            resourceId: threadId,
            resourceType: 'thread',
            url: `https://edstem.org/us/courses/${courseId}/discussion/${threadId}`,
          },
          url: `https://edstem.org/us/courses/${courseId}/discussion/${threadId}`,
          courseId: `edstem:course:${courseId}`,
          messageKind: 'thread',
          threadId,
          title: content,
          unread: /unread/i.test(content),
          instructorAuthored: /staff/i.test(content),
        });
      })
      .filter((message): message is Message => Boolean(message));

    if (discussionMessages.length > 0) {
      return discussionMessages;
    }

    const matches = Array.from(
      html.matchAll(
        /<a[^>]+href="\/us\/courses\/(?<courseId>\d+)"[^>]*class="[^"]*dash-course[^"]*"[\s\S]*?<div[^>]*class="dash-course-code"[^>]*>(?<courseCode>[\s\S]*?)<\/div>[\s\S]*?(?:<div[^>]*class="dash-course-unread-count"[^>]*>(?<unreadCount>[\s\S]*?)<\/div>)?[\s\S]*?<div[^>]*class="dash-course-name"[^>]*>(?<courseName>[\s\S]*?)<\/div>/g,
      ),
    );

    const messages = matches
      .map((match) => {
        const courseId = match.groups?.courseId;
        const courseCode = decodeHtmlText(match.groups?.courseCode);
        const courseName = decodeHtmlText(match.groups?.courseName);
        if (!courseId || !courseCode || !courseName) {
          return undefined;
        }

        const unreadCountText = decodeHtmlText(match.groups?.unreadCount);
        const unread = Boolean(unreadCountText && unreadCountText !== '0');

        return MessageSchema.parse({
          id: `edstem:message:dashboard-course:${courseId}`,
          kind: 'message',
          site: 'edstem',
          source: {
            site: 'edstem',
            resourceId: courseId,
            resourceType: 'dashboard_course',
            url: `https://edstem.org/us/courses/${courseId}`,
          },
          url: `https://edstem.org/us/courses/${courseId}`,
          courseId: `edstem:course:${courseId}`,
          messageKind: 'update',
          threadId: courseId,
          title: `${courseCode} ${courseName}`,
          unread,
          instructorAuthored: false,
        });
      })
      .filter((message): message is Message => Boolean(message));

    if (messages.length === 0) {
      throw new EdStemApiError('unsupported_context', 'EdStem DOM fallback found no dashboard course cards.');
    }

    return messages;
  }
}

function stripDiscussionHtml(value: string | undefined) {
  return decodeHtmlText(
    value
      ?.replace(/<svg[\s\S]*?<\/svg>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\b(STAFF|Pinned|Answered|General|Social|Final)\b/gi, ' $1 '),
  );
}

function buildEdStemFailure(
  outcome: Exclude<EdStemSyncOutcome, 'success' | 'partial_success'>,
  errorReason: string,
  syncedAt: string,
  code: HealthStatus['code'],
  attemptsByResource?: AttemptsByResource,
): EdStemSyncFailure {
  return {
    ok: false,
    site: 'edstem',
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

function mapEdStemFailureToSyncOutcome(
  error: unknown,
  syncedAt: string,
  attemptsByResource?: AttemptsByResource,
): EdStemSyncFailure {
  if (error instanceof EdStemApiError) {
    switch (error.code) {
      case 'unauthorized':
        return buildEdStemFailure('not_logged_in', error.message, syncedAt, 'logged_out', attemptsByResource);
      case 'unsupported_context':
        return buildEdStemFailure('unsupported_context', error.message, syncedAt, 'unsupported_context', attemptsByResource);
      case 'malformed_response':
        return buildEdStemFailure('normalize_failed', error.message, syncedAt, 'normalize_failed', attemptsByResource);
      case 'request_failed':
      default:
        return buildEdStemFailure('request_failed', error.message, syncedAt, 'collector_failed', attemptsByResource);
    }
  }

  return buildEdStemFailure(
    'request_failed',
    error instanceof Error ? error.message : 'EdStem sync failed.',
    syncedAt,
    'collector_failed',
    attemptsByResource,
  );
}

export class EdStemAdapter implements SiteAdapter {
  readonly site = 'edstem' as const;

  constructor(private readonly client?: EdStemApiClient) {}

  async canRun(ctx: AdapterContext): Promise<boolean> {
    return ctx.site === 'edstem';
  }

  async getCapabilities(ctx: AdapterContext): Promise<AdapterCapabilities> {
    const supportedModes = this.client ? (['private_api', 'dom'] as const) : (['dom'] as const);
    return {
      privateApi: Boolean(this.client),
      pageState: false,
      dom: true,
      resources: {
        messages: {
          supported: ctx.site === 'edstem',
          modes: [...supportedModes],
          preferredMode: this.client ? 'private_api' : 'dom',
        },
      },
    };
  }

  async healthCheck(ctx: AdapterContext): Promise<HealthStatus> {
    return HealthStatusSchema.parse({
      status: ctx.site === 'edstem' ? 'healthy' : 'unavailable',
      checkedAt: ctx.now,
      code: ctx.site === 'edstem' ? 'supported' : 'unsupported_context',
      reason: ctx.site === 'edstem' ? 'edstem_private_api_with_dom_fallback' : 'unsupported_context',
    });
  }

  async sync(ctx: AdapterContext): Promise<EdStemSyncResult> {
    const attemptsByResource: AttemptsByResource = {};
    const collectors: ResourceCollector<Message>[] = [];

    if (this.client) {
      collectors.push(new EdStemMessagesPrivateCollector(this.client));
    }
    collectors.push(new EdStemMessagesDomCollector());

    try {
      const messagesPipeline = await runCollectorPipeline(ctx, collectors);
      attemptsByResource.messages = messagesPipeline.attempts;

      if (!messagesPipeline.ok) {
        return buildEdStemFailure(
          'collector_failed',
          messagesPipeline.errorReason,
          ctx.now,
          'collector_failed',
          attemptsByResource,
        );
      }

      const usedDomFallback = messagesPipeline.winningMode === 'dom';
      return {
        ok: true,
        site: 'edstem',
        outcome: usedDomFallback ? 'partial_success' : 'success',
        snapshot: {
          messages: z.array(MessageSchema).parse(messagesPipeline.items),
        },
        syncedAt: ctx.now,
        health: HealthStatusSchema.parse({
          status: usedDomFallback ? 'degraded' : 'healthy',
          checkedAt: ctx.now,
          code: usedDomFallback ? 'partial_success' : 'supported',
          reason: usedDomFallback ? 'edstem_dashboard_dom_fallback' : 'edstem_sync_success',
        }),
        attemptsByResource,
      };
    } catch (error) {
      return mapEdStemFailureToSyncOutcome(error, ctx.now, attemptsByResource);
    }
  }
}

export function createEdStemAdapter(client?: EdStemApiClient) {
  return new EdStemAdapter(client);
}
