import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BROWSER_IDENTITY_RUNTIME_DIRNAME,
  buildBrowserIdentityPageHtml,
  writeBrowserIdentityPage,
} from './shared/browser-instance-identity.mjs';

const tempRoots = new Set();

function makeTempRoot() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'campus-copilot-browser-identity-'));
  tempRoots.add(tempRoot);
  return tempRoot;
}

test.afterEach(() => {
  for (const tempRoot of tempRoots) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  tempRoots.clear();
});

test('browser identity html renders the core repo identity fields', () => {
  const html = buildBrowserIdentityPageHtml({
    repoLabel: 'campus-copilot',
    repoRoot: '/tmp/campus-copilot',
    cdpUrl: 'http://127.0.0.1:9334',
    cdpPort: 9334,
    userDataDir: '/tmp/browser-root',
    profileDisplayName: 'campus-copilot',
    profileDirectory: 'Profile 1',
    accent: '#0f766e',
    monogram: 'CC',
    primarySiteUrl: 'https://canvas.uw.edu/',
    attachSummary: 'repo-owned Chrome single-instance attach lane',
  });

  assert.match(html, /campus-copilot/);
  assert.match(html, /http:\/\/127\.0\.0\.1:9334/);
  assert.match(html, /\/tmp\/browser-root/);
  assert.match(html, /Profile 1/);
  assert.match(html, /repo-owned browser lane identity tab/);
  assert.match(html, /Primary site/);
});

test('browser identity helper writes under .runtime-cache/browser-identity and returns a file URL', () => {
  const repoRoot = makeTempRoot();
  const result = writeBrowserIdentityPage({
    repoRoot,
    env: {
      CAMPUS_COPILOT_BROWSER_IDENTITY_LABEL: 'Campus Copilot Browser',
      CAMPUS_COPILOT_BROWSER_IDENTITY_ACCENT: '#2563eb',
    },
    cdpPort: 9334,
    cdpUrl: 'http://127.0.0.1:9334',
    browserProfile: {
      userDataDir: '/tmp/browser-root',
      profileDisplayName: 'campus-copilot',
      profileDirectory: 'Profile 1',
    },
    primarySiteUrl: 'https://canvas.uw.edu/',
  });

  assert.equal(
    result.identityPath,
    path.join(repoRoot, '.runtime-cache', BROWSER_IDENTITY_RUNTIME_DIRNAME, 'index.html'),
  );
  assert.equal(fs.existsSync(result.identityPath), true);
  assert.equal(fileURLToPath(result.identityUrl), result.identityPath);
  assert.equal(result.repoLabel, 'Campus Copilot Browser');
  assert.equal(result.accent, '#2563eb');
});
