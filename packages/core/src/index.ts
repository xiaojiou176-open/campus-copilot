import type { Site } from '@campus-copilot/schema';
import {
  SITE_SYNC_OUTCOMES,
  type AdapterCapabilities,
  type SiteAdapter,
  type SiteSyncOutcome,
} from '@campus-copilot/adapters-base';
import type { EntityCounts, SiteEntityCounts, SyncResourceFailure, SyncState } from '@campus-copilot/storage';
import { z } from 'zod';

export type SurfaceName = 'sidepanel' | 'popup' | 'options';

export interface SurfaceSnapshot {
  surface: SurfaceName;
  counts: EntityCounts;
  latestSyncState?: SyncState;
}

export interface StorageReadPort {
  getEntityCounts(): Promise<EntityCounts>;
  getLatestSyncState(): Promise<SyncState | undefined>;
}

export interface AdapterRegistryPort {
  getAdapter(site: Site): SiteAdapter | undefined;
  getCapabilities(site: Site): Promise<AdapterCapabilities | undefined>;
}

export interface CampusCopilotCommandMap {
  loadSurface: {
    surface: SurfaceName;
  };
  inspectAdapterCapabilities: {
    site: Site;
  };
}

export const SiteSyncOutcomeSchema = z.enum(SITE_SYNC_OUTCOMES);
export type { SiteSyncOutcome } from '@campus-copilot/adapters-base';
export const CanvasSyncOutcomeSchema = SiteSyncOutcomeSchema;

export const SYNC_SITE_COMMAND = 'syncSite';
export const GET_SITE_SYNC_STATUS_COMMAND = 'getSiteSyncStatus';

export const SYNC_CANVAS_COMMAND = 'syncCanvas';
export const GET_CANVAS_SYNC_STATUS_COMMAND = 'getCanvasSyncStatus';

export interface SiteSyncStatusView {
  site: Site;
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncedAt?: string;
  lastOutcome?: SiteSyncOutcome;
  errorReason?: string;
  resourceFailures?: SyncResourceFailure[];
  counts: SiteEntityCounts;
}

export interface SyncSiteCommandRequest {
  type: typeof SYNC_SITE_COMMAND;
  site: Site;
}

export interface GetSiteSyncStatusRequest {
  type: typeof GET_SITE_SYNC_STATUS_COMMAND;
  site: Site;
}

export interface SyncSiteCommandResponse {
  type: typeof SYNC_SITE_COMMAND;
  site: Site;
  outcome: SiteSyncOutcome;
  status: SiteSyncStatusView;
}

export interface GetSiteSyncStatusResponse {
  type: typeof GET_SITE_SYNC_STATUS_COMMAND;
  site: Site;
  status: SiteSyncStatusView;
}

export type CanvasSyncOutcome = SiteSyncOutcome;
export type CanvasSyncStatusView = SiteSyncStatusView & { site: 'canvas' };

export interface SyncCanvasCommandResponse {
  type: typeof SYNC_CANVAS_COMMAND;
  site: 'canvas';
  outcome: CanvasSyncOutcome;
  status: CanvasSyncStatusView;
}

export interface GetCanvasSyncStatusResponse {
  type: typeof GET_CANVAS_SYNC_STATUS_COMMAND;
  site: 'canvas';
  status: CanvasSyncStatusView;
}

export function createSurfaceSnapshot(
  surface: SurfaceName,
  counts: EntityCounts,
  latestSyncState?: SyncState,
): SurfaceSnapshot {
  return {
    surface,
    counts,
    latestSyncState,
  };
}

export {
  buildWorkbenchAiProxyRequest,
  buildWorkbenchExportInput,
  type BuildWorkbenchAiProxyRequestArgs,
  type BuildWorkbenchExportInputArgs,
  type WorkbenchPresentationOverrides,
} from './workbench-composition';
