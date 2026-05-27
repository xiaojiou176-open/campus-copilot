import { beforeEach, describe, expect, it, vi } from 'vitest';

const addListener = vi.fn();
const handleSyncSite = vi.fn();
const handleGetSiteSyncStatus = vi.fn();
const capturePlanningSubstrateFromActiveTab = vi.fn();

vi.mock('wxt/utils/define-background', () => ({
  defineBackground: (init: () => unknown) => {
    init();
    return init;
  },
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      onMessage: {
        addListener,
      },
    },
  },
}));

vi.mock('../src/background-site-sync', () => ({
  SITE_SYNC_HANDLERS: {},
  asCanvasSyncStatusView: (value: unknown) => value,
  handleGetSiteSyncStatus,
  handleSyncSite,
}));

vi.mock('../src/background-planning-substrate', () => ({
  capturePlanningSubstrateFromActiveTab,
}));

async function registerBackgroundListener() {
  await import('../entrypoints/background');
  const listener = addListener.mock.calls.at(-1)?.[0];
  if (typeof listener !== 'function') {
    throw new Error('background_listener_not_registered');
  }
  return listener as (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean;
}

async function flushAsyncResponse() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('background message routing', () => {
  beforeEach(() => {
    vi.resetModules();
    addListener.mockReset();
    handleSyncSite.mockReset();
    handleGetSiteSyncStatus.mockReset();
    capturePlanningSubstrateFromActiveTab.mockReset();
  });

  it('responds asynchronously to syncSite with the explicit tab override', async () => {
    handleSyncSite.mockResolvedValue({
      outcome: 'success',
      status: {
        site: 'canvas',
        status: 'success',
        counts: {
          site: 'canvas',
          courses: 1,
          assignments: 0,
          announcements: 0,
          grades: 0,
          messages: 0,
          events: 0,
        },
      },
    });

    const listener = await registerBackgroundListener();
    const sendResponse = vi.fn();

    const keepChannelOpen = listener(
      {
        type: 'syncSite',
        site: 'canvas',
        tabId: 17,
        url: 'https://canvas.uw.edu/courses/123',
      },
      {},
      sendResponse,
    );

    expect(keepChannelOpen).toBe(true);
    await flushAsyncResponse();

    expect(handleSyncSite).toHaveBeenCalledWith('canvas', {
      tabId: 17,
      url: 'https://canvas.uw.edu/courses/123',
    });
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'success',
      }),
    );
  });

  it('responds asynchronously to getSiteSyncStatus from the background listener', async () => {
    handleGetSiteSyncStatus.mockResolvedValue({
      site: 'canvas',
      status: 'success',
      counts: {
        site: 'canvas',
        courses: 1,
        assignments: 2,
        announcements: 0,
        grades: 0,
        messages: 0,
        events: 0,
      },
    });

    const listener = await registerBackgroundListener();
    const sendResponse = vi.fn();

    const keepChannelOpen = listener(
      {
        type: 'getSiteSyncStatus',
        site: 'canvas',
      },
      {},
      sendResponse,
    );

    expect(keepChannelOpen).toBe(true);
    await flushAsyncResponse();

    expect(handleGetSiteSyncStatus).toHaveBeenCalledWith('canvas');
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        site: 'canvas',
        status: 'success',
      }),
    );
  });

  it('responds asynchronously to capturePlanningSubstrate with an explicit tab override', async () => {
    capturePlanningSubstrateFromActiveTab.mockResolvedValue({
      outcome: 'success',
      capturedAt: '2026-04-11T23:50:00.000Z',
      planLabel: 'Spring 2026',
      message: 'Captured Spring 2026 into Planning Pulse.',
    });

    const listener = await registerBackgroundListener();
    const sendResponse = vi.fn();

    const keepChannelOpen = listener(
      {
        type: 'capturePlanningSubstrate',
        tabId: 22,
        url: 'https://myplan.uw.edu/plan/#/sp26',
      },
      {},
      sendResponse,
    );

    expect(keepChannelOpen).toBe(true);
    await flushAsyncResponse();

    expect(capturePlanningSubstrateFromActiveTab).toHaveBeenCalledWith(expect.any(String), {
      tabId: 22,
      url: 'https://myplan.uw.edu/plan/#/sp26',
    });
    expect(sendResponse).toHaveBeenCalledWith({
      type: 'capturePlanningSubstrate',
      source: 'myplan',
      outcome: 'success',
      capturedAt: '2026-04-11T23:50:00.000Z',
      planLabel: 'Spring 2026',
      message: 'Captured Spring 2026 into Planning Pulse.',
    });
  });
});
