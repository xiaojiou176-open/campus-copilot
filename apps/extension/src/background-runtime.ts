import type { FetchMode, Site } from '@campus-copilot/schema';
import type { SiteSyncOutcome } from '@campus-copilot/core';
import { SyncResourceFailureSchema, type SyncResourceFailure } from '@campus-copilot/storage';

const RESOURCE_NAMES = ['courses', 'assignments', 'announcements', 'grades', 'messages', 'events'] as const;
type ResourceName = (typeof RESOURCE_NAMES)[number];
type PipelineAttempt = {
  mode: FetchMode;
  collectorName: string;
  success: boolean;
  skipped?: boolean;
  errorReason?: string;
};
type AttemptsByResource = Partial<Record<ResourceName, PipelineAttempt[]>>;
type SiteSyncResult =
  | {
      ok: true;
      outcome: 'success' | 'partial_success';
      attemptsByResource?: AttemptsByResource;
      health?: {
        code?: string;
      };
    }
  | {
      ok: false;
      outcome: Exclude<SiteSyncOutcome, 'success' | 'partial_success'>;
      attemptsByResource?: AttemptsByResource;
    };

export type MyUWPageContext = {
  pageState?: unknown;
  pageHtml?: string;
};

export function extractMyUWPageContextInPage(): MyUWPageContext {
  function findStateShape(candidate: unknown, depth = 0): unknown {
    if (!candidate || typeof candidate !== 'object' || depth > 4) {
      return undefined;
    }

    const record = candidate as Record<string, unknown>;
    if (Array.isArray(record.notices) || Array.isArray(record.events)) {
      return {
        notices: Array.isArray(record.notices) ? record.notices : undefined,
        events: Array.isArray(record.events) ? record.events : undefined,
      };
    }

    for (const value of Object.values(record)) {
      const nested = findStateShape(value, depth + 1);
      if (nested) {
        return nested;
      }
    }

    return undefined;
  }

  function parseScriptJson(selector: string) {
    const script = document.querySelector(selector);
    if (!script?.textContent?.trim()) {
      return undefined;
    }

    try {
      return JSON.parse(script.textContent);
    } catch {
      return undefined;
    }
  }

  const globalWindow = window as unknown as Record<string, unknown>;
  const candidates = [
    globalWindow.__MYUW_STATE__,
    globalWindow.__INITIAL_STATE__,
    globalWindow.__PRELOADED_STATE__,
    globalWindow.__NEXT_DATA__,
    parseScriptJson('script[data-myuw-state]'),
    parseScriptJson('script#__MYUW_STATE__'),
    parseScriptJson('script#__NEXT_DATA__'),
  ];

  const pageState = candidates
    .map((candidate) => findStateShape(candidate))
    .find((candidate) => Boolean(candidate));

  return {
    pageState,
    pageHtml: document.documentElement?.outerHTML,
  };
}

export function extractPageHtmlInPage() {
  return document.documentElement?.outerHTML;
}

export function buildResourceFailures(attemptsByResource?: AttemptsByResource): SyncResourceFailure[] {
  if (!attemptsByResource) {
    return [];
  }

  return RESOURCE_NAMES.flatMap((resource: ResourceName) => {
    const attempts: PipelineAttempt[] = attemptsByResource[resource] ?? [];
    if (!attempts || attempts.length === 0) {
      return [];
    }

    const hasSuccess = attempts.some((attempt) => attempt.success);
    if (hasSuccess) {
      return [];
    }

    const attempted = attempts.filter((attempt) => !attempt.skipped);
    if (attempted.length === 0) {
      return [];
    }

    const lastFailure = [...attempted]
      .reverse()
      .find((attempt) => !attempt.success && Boolean(attempt.errorReason));

    return [
      SyncResourceFailureSchema.parse({
        resource,
        errorReason: lastFailure?.errorReason ?? 'collector_failed',
        attemptedModes: attempted.map((attempt) => attempt.mode),
        attemptedCollectors: attempted.map((attempt) => attempt.collectorName),
      }),
    ];
  });
}

export function getSyncOutcomeForPersistence(result: SiteSyncResult): SiteSyncOutcome {
  if (!result.ok) {
    return result.outcome;
  }

  return result.outcome === 'partial_success' || result.health?.code === 'partial_success'
    ? 'partial_success'
    : 'success';
}

export function buildSiteBlockingHint(site: Site, input: {
  outcome?: SiteSyncOutcome;
  hasEdStemConfig?: boolean;
}) {
  if (site === 'edstem' && input.outcome === 'unsupported_context' && !input.hasEdStemConfig) {
    return 'EdStem private request paths are missing. Fill them in through Options first.';
  }

  if (site === 'myuw' && input.outcome === 'unsupported_context') {
    return 'Trigger sync from a MyUW page tab so the system can read page state or DOM context.';
  }

  if ((site === 'canvas' || site === 'gradescope' || site === 'edstem') && input.outcome === 'unsupported_context') {
    return 'Trigger sync manually from an active tab on the corresponding site.';
  }

  return undefined;
}
