import type {
  Alert,
  Announcement,
  Assignment,
  Course,
  Event,
  FetchMode,
  FetchMetadata,
  Grade,
  HealthStatus,
  Message,
  Site,
} from '@campus-copilot/schema';

export const RESOURCE_NAMES = ['courses', 'assignments', 'announcements', 'grades', 'messages', 'events'] as const;
export type ResourceName = (typeof RESOURCE_NAMES)[number];

export interface RuntimeAuthState {
  status: 'unknown' | 'connected' | 'missing' | 'insufficient';
}

export interface AdapterContext {
  url: string;
  site: Site;
  tabId?: number;
  pageHtml?: string;
  pageState?: unknown;
  runtimeAuth?: RuntimeAuthState;
  now: string;
  debug?: boolean;
  allowFragileFallback?: boolean;
}

export interface ResourceCapability {
  supported: boolean;
  modes: FetchMode[];
  preferredMode?: FetchMode;
}

export interface AdapterCapabilities {
  officialApi?: boolean;
  privateApi?: boolean;
  pageState?: boolean;
  dom?: boolean;
  resources: Partial<Record<ResourceName, ResourceCapability>>;
}

export interface ResourceCollector<T> {
  name: string;
  resource: ResourceName;
  mode: FetchMode;
  priority: number;
  supports(ctx: AdapterContext): Promise<boolean>;
  collect(ctx: AdapterContext): Promise<T[]>;
}

export interface SiteAdapter {
  site: Site;
  canRun(ctx: AdapterContext): Promise<boolean>;
  getCapabilities(ctx: AdapterContext): Promise<AdapterCapabilities>;
  healthCheck?(ctx: AdapterContext): Promise<HealthStatus>;
  sync(ctx: AdapterContext): Promise<SiteSyncResult>;
}

export interface PipelineAttempt extends FetchMetadata {
  skipped?: boolean;
}

export interface PipelineSuccess<T> {
  ok: true;
  items: T[];
  attempts: PipelineAttempt[];
  winningMode: FetchMode;
  winningCollector: string;
}

export interface PipelineFailure {
  ok: false;
  attempts: PipelineAttempt[];
  errorReason: 'no_collectors_registered' | 'no_supported_collectors' | 'all_collectors_failed';
}

export type PipelineResult<T> = PipelineSuccess<T> | PipelineFailure;

export interface SiteSnapshot {
  courses?: Course[];
  assignments?: Assignment[];
  announcements?: Announcement[];
  grades?: Grade[];
  messages?: Message[];
  events?: Event[];
  alerts?: Alert[];
}

export const SITE_SYNC_OUTCOMES = [
  'success',
  'partial_success',
  'not_logged_in',
  'unsupported_context',
  'unauthorized',
  'request_failed',
  'normalize_failed',
  'collector_failed',
] as const;

export type SiteSyncOutcome =
  | 'success'
  | 'partial_success'
  | 'not_logged_in'
  | 'unsupported_context'
  | 'unauthorized'
  | 'request_failed'
  | 'normalize_failed'
  | 'collector_failed';

export type AttemptsByResource = Partial<Record<ResourceName, PipelineAttempt[]>>;

export interface SiteSyncSuccess {
  ok: true;
  site: Site;
  outcome: 'success' | 'partial_success';
  snapshot: SiteSnapshot;
  syncedAt: string;
  health: HealthStatus;
  attemptsByResource?: AttemptsByResource;
}

export interface SiteSyncFailure {
  ok: false;
  site: Site;
  outcome: Exclude<SiteSyncOutcome, 'success' | 'partial_success'>;
  errorReason: string;
  syncedAt: string;
  health: HealthStatus;
  attemptsByResource?: AttemptsByResource;
  snapshot?: SiteSnapshot;
}

export type SiteSyncResult = SiteSyncSuccess | SiteSyncFailure;

const MODE_ORDER: FetchMode[] = ['official_api', 'private_api', 'state', 'dom'];

function sortCollectors<T>(collectors: ResourceCollector<T>[]) {
  return [...collectors].sort((left, right) => {
    const modeOrder = MODE_ORDER.indexOf(left.mode) - MODE_ORDER.indexOf(right.mode);
    if (modeOrder !== 0) {
      return modeOrder;
    }

    return left.priority - right.priority;
  });
}

export async function runCollectorPipeline<T>(
  ctx: AdapterContext,
  collectors: ResourceCollector<T>[],
): Promise<PipelineResult<T>> {
  if (collectors.length === 0) {
    return {
      ok: false,
      attempts: [],
      errorReason: 'no_collectors_registered',
    };
  }

  const attempts: PipelineAttempt[] = [];
  const sortedCollectors = sortCollectors(collectors);

  for (const collector of sortedCollectors) {
    const supported = await collector.supports(ctx);
    if (!supported) {
      attempts.push({
        mode: collector.mode,
        collectorName: collector.name,
        attemptedAt: ctx.now,
        success: false,
        skipped: true,
        errorReason: 'supports_returned_false',
      });
      continue;
    }

    try {
      const items = await collector.collect(ctx);
      attempts.push({
        mode: collector.mode,
        collectorName: collector.name,
        attemptedAt: ctx.now,
        success: true,
      });

      return {
        ok: true,
        items,
        attempts,
        winningMode: collector.mode,
        winningCollector: collector.name,
      };
    } catch (error) {
      attempts.push({
        mode: collector.mode,
        collectorName: collector.name,
        attemptedAt: ctx.now,
        success: false,
        errorReason: error instanceof Error ? error.message : 'collector_failed',
      });
    }
  }

  const hasAttemptedCollector = attempts.some((attempt) => !attempt.skipped);
  return {
    ok: false,
    attempts,
    errorReason: hasAttemptedCollector ? 'all_collectors_failed' : 'no_supported_collectors',
  };
}
