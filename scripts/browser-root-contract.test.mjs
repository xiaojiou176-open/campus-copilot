import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildBootstrappedLocalState,
  cleanupExternalCache,
  copyChromeProfileDirectory,
  getBrowserBootstrapPlan,
  getCacheGovernancePolicy,
} from './lib/cache-governance.mjs';

function createSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'campus-browser-root-'));
  const home = join(root, 'home');
  mkdirSync(home, { recursive: true });
  return {
    root,
    home,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test('getBrowserBootstrapPlan points at repo-owned browser root and source Profile 13 by default', () => {
  const sandbox = createSandbox();

  try {
    const plan = getBrowserBootstrapPlan({
      HOME: sandbox.home,
    });

    assert.equal(plan.sourceChromeRoot, join(sandbox.home, 'Library/Application Support/Google/Chrome'));
    assert.equal(plan.sourceProfileDirectory, 'Profile 13');
    assert.equal(plan.targetUserDataRoot, join(sandbox.home, '.cache/campus-copilot/browser/chrome-user-data'));
    assert.equal(plan.targetProfileDirectory, 'Profile 1');
    assert.equal(plan.profileDisplayName, 'campus-copilot');
    assert.equal(plan.browserCdpPort, 9334);
  } finally {
    sandbox.cleanup();
  }
});

test('buildBootstrappedLocalState rewrites source profile metadata into Profile 1 with the repo display name', () => {
  const sourceState = {
    profile: {
      info_cache: {
        'Profile 13': {
          name: 'Campus Copilot',
          avatar_icon: 'foo',
        },
      },
      last_used: 'Profile 13',
      last_active_profiles: ['Profile 13'],
      profiles_order: ['Profile 13'],
    },
  };

  const nextState = buildBootstrappedLocalState(
    sourceState,
    'Profile 1',
    'campus-copilot',
    'Profile 13',
  );

  assert.deepEqual(Object.keys(nextState.profile.info_cache), ['Profile 1']);
  assert.equal(nextState.profile.info_cache['Profile 1'].name, 'campus-copilot');
  assert.equal(nextState.profile.last_used, 'Profile 1');
  assert.deepEqual(nextState.profile.last_active_profiles, ['Profile 1']);
});

test('copyChromeProfileDirectory skips Singleton artifacts and DevToolsActivePort', () => {
  const sandbox = createSandbox();

  try {
    const source = join(sandbox.root, 'source-profile');
    const target = join(sandbox.root, 'target-profile');
    mkdirSync(source, { recursive: true });
    writeFileSync(join(source, 'Preferences'), '{}', 'utf8');
    writeFileSync(join(source, 'SingletonLock'), 'lock', 'utf8');
    writeFileSync(join(source, 'SingletonCookie'), 'cookie', 'utf8');
    writeFileSync(join(source, 'SingletonSocket'), 'socket', 'utf8');
    writeFileSync(join(source, 'DevToolsActivePort'), '9334', 'utf8');

    copyChromeProfileDirectory(source, target);

    assert.equal(existsSync(join(target, 'Preferences')), true);
    assert.equal(existsSync(join(target, 'SingletonLock')), false);
    assert.equal(existsSync(join(target, 'SingletonCookie')), false);
    assert.equal(existsSync(join(target, 'SingletonSocket')), false);
    assert.equal(existsSync(join(target, 'DevToolsActivePort')), false);
  } finally {
    sandbox.cleanup();
  }
});

test('cleanupExternalCache trims managed cache but never touches the browser subtree', () => {
  const sandbox = createSandbox();

  try {
    const policy = getCacheGovernancePolicy(
      {
        HOME: sandbox.home,
        CAMPUS_COPILOT_CACHE_HOME: join(sandbox.home, '.cache/campus-copilot'),
      },
      { homeDir: sandbox.home },
    );

    mkdirSync(join(policy.managedExternalCacheRoot, 'stale-cache'), { recursive: true });
    mkdirSync(join(policy.browserUserDataRoot, 'Profile 1'), { recursive: true });
    writeFileSync(join(policy.browserUserDataRoot, 'Local State'), '{}', 'utf8');

    const staleTime = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    utimesSync(join(policy.managedExternalCacheRoot, 'stale-cache'), staleTime, staleTime);
    utimesSync(join(policy.browserStateRoot), staleTime, staleTime);

    const cleanup = cleanupExternalCache(policy);

    assert.equal(existsSync(join(policy.managedExternalCacheRoot, 'stale-cache')), false);
    assert.equal(existsSync(policy.browserUserDataRoot), true);
    assert.ok(cleanup.removedExpiredEntries.some((entry) => entry.path.endsWith('stale-cache')));
    assert.equal(cleanup.removedExpiredEntries.some((entry) => entry.path.includes('/browser/')), false);
  } finally {
    sandbox.cleanup();
  }
});
