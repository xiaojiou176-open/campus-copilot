import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import {
  CanvasApiClient,
  createCanvasAdapter,
  type CanvasRequestExecutor,
  type CanvasSyncResult,
} from '@campus-copilot/adapters-canvas';
import {
  createEdStemAdapter,
  EdStemApiClient,
  type EdStemPathConfig,
  type EdStemRequestExecutor,
  type EdStemSyncResult,
} from '@campus-copilot/adapters-edstem';
import {
  GradescopeApiClient,
  createGradescopeAdapter,
  type GradescopePathConfig,
  type GradescopeRequestExecutor,
  type GradescopeSyncResult,
} from '@campus-copilot/adapters-gradescope';
import { createMyUWAdapter, type MyUWSyncResult } from '@campus-copilot/adapters-myuw';
import {
  GET_SITE_SYNC_STATUS_COMMAND,
  GET_CANVAS_SYNC_STATUS_COMMAND,
  SYNC_SITE_COMMAND,
  SYNC_CANVAS_COMMAND,
  type GetSiteSyncStatusResponse,
  type SyncSiteCommandResponse,
  type SiteSyncStatusView,
  type CanvasSyncStatusView,
  type GetCanvasSyncStatusResponse,
  type SyncCanvasCommandResponse,
} from '@campus-copilot/core';
import {
  buildResourceFailures,
  extractPageHtmlInPage,
  extractMyUWPageContextInPage,
  getSyncOutcomeForPersistence,
} from '../src/background-runtime';
import { getEdStemPathConfig, loadExtensionConfig, type ExtensionConfig } from '../src/config';
import {
  campusCopilotDb,
  getSiteEntityCounts,
  getSyncStateBySite,
  putSyncState,
  recordSiteSyncError,
  replaceSiteSnapshot,
} from '@campus-copilot/storage';
import { HealthStatusSchema, type Site } from '@campus-copilot/schema';

type InjectedRequestResponse =
  | {
      ok: true;
      status: number;
      responseUrl: string;
      bodyText: string;
      linkHeader?: string;
      contentType?: string;
    }
  | {
      ok: false;
      code: 'request_failed' | 'unsupported_context';
      message: string;
      status?: number;
    };

type ActiveTabContext = {
  tabId: number;
  url: string;
};
type SyncTargetOverride = {
  tabId?: number;
  url?: string;
};

type SiteSyncDependencies = {
  activeTab: ActiveTabContext;
  now: string;
  config: ExtensionConfig;
  pageHtml?: string;
};

type SiteSyncResult = CanvasSyncResult | GradescopeSyncResult | EdStemSyncResult | MyUWSyncResult;

const GRADESCOPE_PATHS: GradescopePathConfig = {
  assignmentsPath: '/internal/assignments',
  gradesPath: '/internal/grades',
};

function executeSiteRequestInPage(path: string): Promise<InjectedRequestResponse> {
  const expectsHtml = path.startsWith('__html__:');
  const normalizedPath = expectsHtml ? path.replace(/^__html__:/, '') : path;
  const targetUrl = new URL(normalizedPath, window.location.origin);
  return fetch(targetUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: expectsHtml
      ? undefined
      : {
          Accept: 'application/json',
        },
  })
    .then(async (response) => {
      return {
        ok: true as const,
        status: response.status,
        responseUrl: response.url,
        bodyText: await response.text(),
        linkHeader: response.headers.get('link') ?? undefined,
        contentType: response.headers.get('content-type') ?? undefined,
      };
    })
    .catch((error) => {
      return {
        ok: false as const,
        code: 'request_failed',
        message: error instanceof Error ? error.message : 'Page request failed in the active tab.',
      };
    });
}

function readEdStemAuthTokenInPage() {
  return window.localStorage.getItem('authToken:us') || window.localStorage.getItem('authToken');
}

function createTabRequestExecutor(tabId: number) {
  return async (path: string): Promise<InjectedRequestResponse> => {
    try {
      const results = await browser.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: executeSiteRequestInPage,
        args: [path],
      });
      const result = results[0]?.result;
      if (!result) {
        return {
          ok: false as const,
          code: 'request_failed',
          message: 'Page request returned no result from the active tab.',
        };
      }

      if (!result.ok) {
        return {
          ok: false as const,
          code: result.code ?? 'request_failed',
          message: result.message ?? 'Page request failed.',
          status: result.status,
        };
      }

      return {
        ok: true as const,
        status: result.status ?? 0,
        responseUrl: result.responseUrl ?? '',
        bodyText: result.bodyText ?? '',
        linkHeader: result.linkHeader,
        contentType: result.contentType,
      };
    } catch (error) {
      return {
        ok: false as const,
        code: 'unsupported_context',
        message: error instanceof Error ? error.message : 'Unable to execute a request in the active tab.',
      };
    }
  };
}

function createCanvasTabRequestExecutor(tabId: number): CanvasRequestExecutor {
  const execute = createTabRequestExecutor(tabId);
  return async (path) => execute(path);
}

function createGradescopeTabRequestExecutor(tabId: number): GradescopeRequestExecutor {
  const execute = createTabRequestExecutor(tabId);
  return async (path) => execute(path);
}

function createEdStemTabRequestExecutor(tabId: number): EdStemRequestExecutor {
  return async (path) => {
    try {
      const results = await browser.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: readEdStemAuthTokenInPage,
      });
      const authToken = results[0]?.result;
      const targetUrl = new URL(path, 'https://us.edstem.org');
      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(authToken ? { 'x-token': authToken } : {}),
        },
      });

      return {
        ok: true as const,
        status: response.status,
        responseUrl: response.url,
        bodyText: await response.text(),
        contentType: response.headers.get('content-type') ?? undefined,
      };
    } catch (error) {
      return {
        ok: false as const,
        code: 'request_failed',
        message: error instanceof Error ? error.message : 'Unable to execute the EdStem request.',
      };
    }
  };
}

function buildDefaultEdStemPathConfig(url: string): EdStemPathConfig | undefined {
  const match = url.match(/\/us\/courses\/(?<courseId>\d+)/);
  const courseId = match?.groups?.courseId;
  if (!courseId) {
    return undefined;
  }

  return {
    threadsPath: `/api/courses/${courseId}/threads?limit=30&sort=new`,
  };
}

async function extractMyUWContext(tabId: number) {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: extractMyUWPageContextInPage,
    });
    return results[0]?.result;
  } catch {
    return undefined;
  }
}

async function extractPageHtml(tabId: number) {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: extractPageHtmlInPage,
    });
    return results[0]?.result;
  } catch {
    return undefined;
  }
}

async function getActiveTabContext(input?: SyncTargetOverride): Promise<ActiveTabContext | undefined> {
  if (input?.tabId && input.url) {
    return {
      tabId: input.tabId,
      url: input.url,
    };
  }

  const [activeTab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab?.id || !activeTab.url || !activeTab.url.startsWith('http')) {
    return undefined;
  }

  return {
    tabId: activeTab.id,
    url: activeTab.url,
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

function buildUnsupportedSyncResult(site: Site, now: string, reason: string): SiteSyncResult {
  return {
    ok: false,
    site,
    outcome: 'unsupported_context',
    errorReason: reason,
    syncedAt: now,
    health: HealthStatusSchema.parse({
      status: 'unavailable',
      checkedAt: now,
      code: 'unsupported_context',
      reason,
    }),
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
    return createMyUWAdapter().sync({
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
};

async function handleSyncSite(site: Site, targetOverride?: SyncTargetOverride): Promise<SyncSiteCommandResponse> {
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

async function handleGetSiteSyncStatus(site: Site): Promise<GetSiteSyncStatusResponse> {
  return {
    type: GET_SITE_SYNC_STATUS_COMMAND,
    site,
    status: await buildSiteStatusView(site),
  };
}

function asCanvasSyncStatusView(status: SiteSyncStatusView): CanvasSyncStatusView {
  return {
    ...status,
    site: 'canvas',
  };
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === SYNC_SITE_COMMAND && message?.site) {
      return handleSyncSite(message.site, {
        tabId: typeof message.tabId === 'number' ? message.tabId : undefined,
        url: typeof message.url === 'string' ? message.url : undefined,
      });
    }

    if (message?.type === GET_SITE_SYNC_STATUS_COMMAND && message?.site) {
      return handleGetSiteSyncStatus(message.site);
    }

    if (message?.type === SYNC_CANVAS_COMMAND) {
      return handleSyncSite('canvas').then(
        (response): SyncCanvasCommandResponse => ({
          type: SYNC_CANVAS_COMMAND,
          site: 'canvas',
          outcome: response.outcome,
          status: asCanvasSyncStatusView(response.status),
        }),
      );
    }

    if (message?.type === GET_CANVAS_SYNC_STATUS_COMMAND) {
      return handleGetSiteSyncStatus('canvas').then(
        (response): GetCanvasSyncStatusResponse => ({
          type: GET_CANVAS_SYNC_STATUS_COMMAND,
          site: 'canvas',
          status: asCanvasSyncStatusView(response.status),
        }),
      );
    }

    return undefined;
  });
});
