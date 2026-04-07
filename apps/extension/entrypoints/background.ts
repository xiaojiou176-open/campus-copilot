import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import {
  GET_SITE_SYNC_STATUS_COMMAND,
  GET_CANVAS_SYNC_STATUS_COMMAND,
  SYNC_SITE_COMMAND,
  SYNC_CANVAS_COMMAND,
  type GetCanvasSyncStatusResponse,
  type SyncCanvasCommandResponse,
} from '@campus-copilot/core';
import { asCanvasSyncStatusView, handleGetSiteSyncStatus, handleSyncSite, SITE_SYNC_HANDLERS } from '../src/background-site-sync';

export { SITE_SYNC_HANDLERS } from '../src/background-site-sync';

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
