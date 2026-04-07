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

type SiteSyncResult = CanvasSyncResult | GradescopeSyncResult | EdStemSyncResult | MyUWSyncResult;

const GRADESCOPE_PATHS: GradescopePathConfig = {
  assignmentsPath: '/internal/assignments',
  gradesPath: '/internal/grades',
};

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
