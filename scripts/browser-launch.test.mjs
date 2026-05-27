import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildBrowserLaunchPayload } from './shared/browser-launch-payload.mjs';
import { disconnectCdpBrowser } from './shared/disconnect-cdp-browser.mjs';
import { readBrowserInstanceState } from './lib/cache-governance.mjs';

test('browser launch payload includes identity page information for the canonical lane', () => {
  const payload = buildBrowserLaunchPayload({
    status: 'ok',
    mode: 'already_running',
    cdpUrl: 'http://127.0.0.1:9334',
    identityPage: {
      identityPath: '/repo/.runtime-cache/browser-identity/index.html',
      identityUrl: 'file:///repo/.runtime-cache/browser-identity/index.html',
      title: 'campus-copilot · 9334 · browser lane',
    },
    currentTabs: [
      {
        title: 'campus-copilot · 9334 · browser lane',
        url: 'file:///repo/.runtime-cache/browser-identity/index.html',
        identityAnchor: true,
      },
    ],
  });

  assert.equal(payload.identityPage.identityPath, '/repo/.runtime-cache/browser-identity/index.html');
  assert.equal(payload.identityPage.identityUrl, 'file:///repo/.runtime-cache/browser-identity/index.html');
  assert.equal(payload.currentTabs[0].identityAnchor, true);
});

test('disconnectCdpBrowser prefers dropping the CDP connection without closing the remote browser', async () => {
  const calls = [];
  const fakeBrowser = {
    _connection: {
      close() {
        calls.push('disconnect');
      },
    },
    async close() {
      calls.push('close');
    },
  };

  await disconnectCdpBrowser(fakeBrowser);

  assert.deepEqual(calls, ['disconnect']);
});

test('disconnectCdpBrowser tolerates empty input', async () => {
  await disconnectCdpBrowser(undefined);
  await disconnectCdpBrowser({});
});

test('readBrowserInstanceState marks stale metadata when the recorded pid is dead', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'cc-browser-instance-'));

  try {
    writeFileSync(
      join(tempDir, 'instance.json'),
      JSON.stringify(
        {
          pid: 999999,
          status: 'ready',
          cdpUrl: 'http://127.0.0.1:9334',
        },
        null,
        2,
      ),
      'utf8',
    );

    const state = readBrowserInstanceState(tempDir);
    assert.equal(state?.status, 'stale_dead_process');
    assert.equal(state?.pidAlive, false);
    assert.equal(state?.cdpUrl, 'http://127.0.0.1:9334');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
