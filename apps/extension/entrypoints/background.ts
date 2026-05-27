import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import {
  CAPTURE_PLANNING_SUBSTRATE_COMMAND,
  GET_SITE_SYNC_STATUS_COMMAND,
  GET_CANVAS_SYNC_STATUS_COMMAND,
  SYNC_SITE_COMMAND,
  SYNC_CANVAS_COMMAND,
  type CapturePlanningSubstrateCommandResponse,
  type GetCanvasSyncStatusResponse,
  type SyncCanvasCommandResponse,
} from '@campus-copilot/core';
import { asCanvasSyncStatusView, handleGetSiteSyncStatus, handleSyncSite, SITE_SYNC_HANDLERS } from '../src/background-site-sync';
import { capturePlanningSubstrateFromActiveTab } from '../src/background-planning-substrate';

export { SITE_SYNC_HANDLERS } from '../src/background-site-sync';

function respondAsync<T>(promise: Promise<T>, sendResponse: (response: T) => void) {
  void promise.then((response) => {
    sendResponse(response);
  });
  return true;
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === SYNC_SITE_COMMAND && message?.site) {
      return respondAsync(
        handleSyncSite(message.site, {
          tabId: typeof message.tabId === 'number' ? message.tabId : undefined,
          url: typeof message.url === 'string' ? message.url : undefined,
        }),
        sendResponse,
      );
    }

    if (message?.type === GET_SITE_SYNC_STATUS_COMMAND && message?.site) {
      return respondAsync(handleGetSiteSyncStatus(message.site), sendResponse);
    }

    if (message?.type === CAPTURE_PLANNING_SUBSTRATE_COMMAND) {
      return respondAsync(
        capturePlanningSubstrateFromActiveTab(new Date().toISOString(), {
          tabId: typeof message.tabId === 'number' ? message.tabId : undefined,
          url: typeof message.url === 'string' ? message.url : undefined,
        }).then(
          (response): CapturePlanningSubstrateCommandResponse => ({
            type: CAPTURE_PLANNING_SUBSTRATE_COMMAND,
            source: 'myplan',
            outcome: response.outcome,
            capturedAt: response.capturedAt,
            planLabel: response.planLabel,
            message: response.message,
          }),
        ),
        sendResponse,
      );
    }

    if (message?.type === SYNC_CANVAS_COMMAND) {
      return respondAsync(
        handleSyncSite('canvas').then(
          (response): SyncCanvasCommandResponse => ({
            type: SYNC_CANVAS_COMMAND,
            site: 'canvas',
            outcome: response.outcome,
            status: asCanvasSyncStatusView(response.status),
          }),
        ),
        sendResponse,
      );
    }

    if (message?.type === GET_CANVAS_SYNC_STATUS_COMMAND) {
      return respondAsync(
        handleGetSiteSyncStatus('canvas').then(
          (response): GetCanvasSyncStatusResponse => ({
            type: GET_CANVAS_SYNC_STATUS_COMMAND,
            site: 'canvas',
            status: asCanvasSyncStatusView(response.status),
          }),
        ),
        sendResponse,
      );
    }

    return false;
  });
});
