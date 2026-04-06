import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const auditDiskScript = join(repoRoot, 'scripts/audit-disk.mjs');
const cleanupRuntimeScript = join(repoRoot, 'scripts/cleanup-runtime.sh');

function writeExecutable(filePath, body) {
  writeFileSync(filePath, body, { encoding: 'utf8' });
  chmodSync(filePath, 0o755);
}

function createSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'campus-disk-governance-'));
  const repo = join(root, 'repo');
  const home = join(root, 'home');
  const bin = join(root, 'bin');

  mkdirSync(repo, { recursive: true });
  mkdirSync(home, { recursive: true });
  mkdirSync(bin, { recursive: true });

  return {
    root,
    repo,
    home,
    bin,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function createFakePnpm(binDir) {
  const fakePnpmPath = join(binDir, 'pnpm');
  writeExecutable(
    fakePnpmPath,
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'if [[ "$1" == "config" && "$2" == "get" && "$3" == "store-dir" ]]; then',
      "  printf '%s\\n' \"\${FAKE_PNPM_STORE_DIR:-}\"",
      '  exit 0',
      'fi',
      'if [[ "$1" == "store" && "$2" == "path" ]]; then',
      "  printf '%s\\n' \"\${FAKE_PNPM_STORE_PATH:-}\"",
      '  exit 0',
      'fi',
      'echo "unexpected fake pnpm args: $*" >&2',
      'exit 1',
      '',
    ].join('\n'),
  );
}

function runAuditDisk({ cwd, env }) {
  const result = spawnSync(process.execPath, [auditDiskScript], {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function runCleanupRuntime({ cwd, env }) {
  const result = spawnSync('bash', [cleanupRuntimeScript], {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test('audit:disk inventories the explicit clone lane, temp roots, and shared pnpm store truth', () => {
  const sandbox = createSandbox();

  try {
    createFakePnpm(sandbox.bin);

    const storeRoot = join(sandbox.home, '.cache/shared-pnpm-store');
    const storePath = join(storeRoot, 'v10');
    mkdirSync(storePath, { recursive: true });

    mkdirSync(join(sandbox.repo, 'node_modules'), { recursive: true });
    writeFileSync(join(sandbox.repo, 'node_modules/.modules.yaml'), `storeDir: ${storePath}\n`, { encoding: 'utf8' });
    mkdirSync(join(sandbox.repo, '.runtime-cache'), { recursive: true });
    writeFileSync(join(sandbox.repo, '.runtime-cache/campus-copilot-support-bundle-test.json'), '{}', { encoding: 'utf8' });
    const externalCacheHome = join(sandbox.home, '.cache/campus-copilot');
    const managedExternalCacheRoot = join(externalCacheHome, 'cache');
    mkdirSync(join(managedExternalCacheRoot, 'recent-cache'), { recursive: true });
    mkdirSync(join(externalCacheHome, 'browser/chrome-user-data/Profile 1'), { recursive: true });
    writeFileSync(join(externalCacheHome, 'browser/chrome-user-data/Local State'), '{}', { encoding: 'utf8' });
    symlinkSync('146.0.7680.178:1', join(externalCacheHome, 'browser/chrome-user-data/RunningChromeVersion'));

    const cloneRoot = join(sandbox.home, '.campus-copilot-profile13-clone');
    mkdirSync(join(cloneRoot, 'OptGuideOnDeviceModel'), { recursive: true });
    mkdirSync(join(cloneRoot, 'Profile 13'), { recursive: true });
    writeFileSync(join(cloneRoot, 'OptGuideOnDeviceModel/model.bin'), 'x'.repeat(4096), { encoding: 'utf8' });

    const tmpOne = join(sandbox.root, 'tmp-one');
    const tmpTwo = join(sandbox.root, 'tmp-two');
    mkdirSync(join(tmpOne, 'campus-copilot-support-bundle-smoke.123'), { recursive: true });
    mkdirSync(join(tmpTwo, 'campus-copilot-provider-roundtrip.456'), { recursive: true });
    mkdirSync(join(managedExternalCacheRoot, 'fresh-entry'), { recursive: true });

    const payload = runAuditDisk({
      cwd: sandbox.repo,
      env: {
        HOME: sandbox.home,
        PATH: `${sandbox.bin}:${process.env.PATH}`,
        FAKE_PNPM_STORE_DIR: storeRoot,
        FAKE_PNPM_STORE_PATH: storePath,
        CAMPUS_COPILOT_TEMP_ROOTS: `${tmpOne}:${tmpTwo}`,
      },
    });

    const repoExternalCacheRecord = payload.repoExternalCaches.find(
      (entry) => entry.label === 'managed_external_cache_home',
    );
    assert.equal(repoExternalCacheRecord?.path, managedExternalCacheRoot);
    const browserRootRecord = payload.repoOwnedBrowserRoot.find(
      (entry) => entry.label === 'repo_owned_browser_root',
    );
    assert.equal(browserRootRecord?.path, join(externalCacheHome, 'browser/chrome-user-data'));
    assert.equal(browserRootRecord?.bootstrapped, true);
    assert.ok(
      browserRootRecord?.topChildren.some((entry) => entry.path.endsWith('/RunningChromeVersion')),
      'expected audit:disk to tolerate and inventory broken browser-root symlinks',
    );
    assert.equal(payload.cachePolicy.externalCacheTtlHours, 168);
    assert.equal(payload.cachePolicy.externalCacheMaxMb, 2048);

    const cloneRecord = payload.highRelatedExternal.find((entry) => entry.label === 'clone_profile13');
    assert.equal(cloneRecord?.exists, true);
    assert.equal(cloneRecord?.cleanupCandidate, true);
    assert.ok(Array.isArray(cloneRecord?.topChildren));
    assert.ok(cloneRecord.topChildren.some((entry) => entry.path.includes('OptGuideOnDeviceModel')));

    const sharedStoreRecord = payload.sharedInventoryOnly.find(
      (entry) => entry.label === 'pnpm_store_current_install_truth',
    );
    assert.equal(sharedStoreRecord?.path, storePath);
    assert.match(payload.pnpmStoreReferences.classification.classification, /^shared/);
    assert.equal(payload.pnpmStoreReferences.classification.repoExclusive, 'no');

    assert.equal(payload.tmpResidues.pattern, 'campus-copilot-*');
    assert.deepEqual(
      payload.tmpResidues.roots.map((entry) => entry.path),
      [tmpOne, tmpTwo],
    );
    assert.equal(payload.tmpResidues.matches.length, 2);
  } finally {
    sandbox.cleanup();
  }
});

test('audit:disk keeps clone lane output stable when the clone directory is absent', () => {
  const sandbox = createSandbox();

  try {
    createFakePnpm(sandbox.bin);

    const storeRoot = join(sandbox.home, '.cache/shared-pnpm-store');
    const storePath = join(storeRoot, 'v10');
    mkdirSync(storePath, { recursive: true });

    mkdirSync(join(sandbox.repo, 'node_modules'), { recursive: true });
    writeFileSync(join(sandbox.repo, 'node_modules/.modules.yaml'), `storeDir: ${storePath}\n`, { encoding: 'utf8' });

    const payload = runAuditDisk({
      cwd: sandbox.repo,
      env: {
        HOME: sandbox.home,
        PATH: `${sandbox.bin}:${process.env.PATH}`,
        FAKE_PNPM_STORE_DIR: storeRoot,
        FAKE_PNPM_STORE_PATH: storePath,
        CAMPUS_COPILOT_TEMP_ROOTS: join(sandbox.root, 'tmp-only'),
      },
    });

    const cloneRecord = payload.highRelatedExternal.find((entry) => entry.label === 'clone_profile13');
    assert.equal(cloneRecord?.exists, false);
    assert.equal(cloneRecord?.sizeKb, 0);
    assert.equal(cloneRecord?.mtime, null);
  } finally {
    sandbox.cleanup();
  }
});

test('cleanup:runtime removes repo-named temp residues across configured temp roots without touching non-campus paths', () => {
  const sandbox = createSandbox();

  try {
    mkdirSync(join(sandbox.repo, '.runtime-cache'), { recursive: true });
    writeFileSync(join(sandbox.repo, '.runtime-cache/test-probe.json'), '{}', { encoding: 'utf8' });
    writeFileSync(join(sandbox.repo, '.runtime-cache/test-debug.log'), 'debug', { encoding: 'utf8' });
    writeFileSync(join(sandbox.repo, '.runtime-cache/keep.txt'), 'keep', { encoding: 'utf8' });
    writeFileSync(join(sandbox.repo, '.runtime-cache/campus-copilot-support-bundle-2026-03-30T00-00-00.000Z.json'), '{}', { encoding: 'utf8' });
    writeFileSync(join(sandbox.repo, '.runtime-cache/campus-copilot-support-bundle-2026-03-31T00-00-00.000Z.json'), '{}', { encoding: 'utf8' });
    writeFileSync(join(sandbox.repo, '.runtime-cache/campus-copilot-support-bundle-2026-04-01T00-00-00.000Z.json'), '{}', { encoding: 'utf8' });
    writeFileSync(join(sandbox.repo, '.runtime-cache/campus-copilot-support-bundle-2026-04-02T00-00-00.000Z.json'), '{}', { encoding: 'utf8' });

    mkdirSync(join(sandbox.repo, 'apps/extension/.output'), { recursive: true });
    mkdirSync(join(sandbox.repo, 'apps/extension/.wxt'), { recursive: true });
    mkdirSync(join(sandbox.repo, 'apps/extension/test-results'), { recursive: true });
    mkdirSync(join(sandbox.repo, '.runtime-cache/temp/fresh-temp'), { recursive: true });
    mkdirSync(join(sandbox.repo, '.runtime-cache/temp/stale-temp'), { recursive: true });
    mkdirSync(join(sandbox.repo, '.runtime-cache/browser-evidence/fresh-evidence'), { recursive: true });
    mkdirSync(join(sandbox.repo, '.runtime-cache/browser-evidence/stale-evidence'), { recursive: true });
    mkdirSync(join(sandbox.repo, '.runtime-cache/live-traces/fresh-trace'), { recursive: true });
    mkdirSync(join(sandbox.repo, '.runtime-cache/live-traces/stale-trace'), { recursive: true });

    const tmpOne = join(sandbox.root, 'tmp-one');
    const tmpTwo = join(sandbox.root, 'tmp-two');
    mkdirSync(tmpOne, { recursive: true });
    mkdirSync(tmpTwo, { recursive: true });
    mkdirSync(join(tmpOne, 'campus-copilot-provider-roundtrip.123'), { recursive: true });
    mkdirSync(join(tmpTwo, 'campus-copilot-support-bundle-smoke.456'), { recursive: true });
    mkdirSync(join(tmpTwo, 'support-bundle-smoke.789'), { recursive: true });
    mkdirSync(join(tmpTwo, 'chrome-mcp-uploads'), { recursive: true });

    const externalCacheHome = join(sandbox.home, '.cache/campus-copilot');
    const managedExternalCacheRoot = join(externalCacheHome, 'cache');
    mkdirSync(join(managedExternalCacheRoot, 'fresh-cache'), { recursive: true });
    mkdirSync(join(managedExternalCacheRoot, 'stale-cache'), { recursive: true });
    mkdirSync(join(externalCacheHome, 'browser/chrome-user-data/Profile 1'), { recursive: true });
    writeFileSync(join(externalCacheHome, 'browser/chrome-user-data/Local State'), '{}', { encoding: 'utf8' });
    mkdirSync(join(externalCacheHome, 'browser/browser-cache-kept'), { recursive: true });

    const staleTime = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const freshTime = new Date();
    for (const target of [
      join(sandbox.repo, '.runtime-cache/temp/stale-temp'),
      join(sandbox.repo, '.runtime-cache/browser-evidence/stale-evidence'),
      join(sandbox.repo, '.runtime-cache/live-traces/stale-trace'),
      join(managedExternalCacheRoot, 'stale-cache'),
    ]) {
      utimesSync(target, staleTime, staleTime);
    }
    for (const target of [
      join(sandbox.repo, '.runtime-cache/temp/fresh-temp'),
      join(sandbox.repo, '.runtime-cache/browser-evidence/fresh-evidence'),
      join(sandbox.repo, '.runtime-cache/live-traces/fresh-trace'),
      join(managedExternalCacheRoot, 'fresh-cache'),
      join(externalCacheHome, 'browser/browser-cache-kept'),
    ]) {
      utimesSync(target, freshTime, freshTime);
    }

    const payload = runCleanupRuntime({
      cwd: sandbox.repo,
      env: {
        HOME: sandbox.home,
        CAMPUS_COPILOT_REPO_ROOT: sandbox.repo,
        CAMPUS_COPILOT_TEMP_ROOTS: `${tmpOne}:${tmpTwo}`,
        CAMPUS_COPILOT_CACHE_HOME: externalCacheHome,
        CAMPUS_COPILOT_MANAGED_EXTERNAL_CACHE_ROOT: managedExternalCacheRoot,
      },
    });

    assert.equal(existsSync(join(tmpOne, 'campus-copilot-provider-roundtrip.123')), false);
    assert.equal(existsSync(join(tmpTwo, 'campus-copilot-support-bundle-smoke.456')), false);
    assert.equal(existsSync(join(tmpTwo, 'support-bundle-smoke.789')), true);
    assert.equal(existsSync(join(tmpTwo, 'chrome-mcp-uploads')), true);
    assert.equal(existsSync(join(sandbox.repo, 'apps/extension/.output')), true);
    assert.equal(existsSync(join(sandbox.repo, 'apps/extension/.wxt')), true);
    assert.equal(existsSync(join(sandbox.repo, 'apps/extension/test-results')), true);
    assert.equal(existsSync(join(sandbox.repo, '.runtime-cache/test-probe.json')), false);
    assert.equal(existsSync(join(sandbox.repo, '.runtime-cache/test-debug.log')), false);
    assert.equal(existsSync(join(sandbox.repo, '.runtime-cache/keep.txt')), true);
    assert.equal(existsSync(join(sandbox.repo, '.runtime-cache/temp/stale-temp')), false);
    assert.equal(existsSync(join(sandbox.repo, '.runtime-cache/temp/fresh-temp')), true);
    assert.equal(existsSync(join(sandbox.repo, '.runtime-cache/browser-evidence/stale-evidence')), false);
    assert.equal(existsSync(join(sandbox.repo, '.runtime-cache/browser-evidence/fresh-evidence')), true);
    assert.equal(existsSync(join(sandbox.repo, '.runtime-cache/live-traces/stale-trace')), false);
    assert.equal(existsSync(join(sandbox.repo, '.runtime-cache/live-traces/fresh-trace')), true);
    assert.equal(
      existsSync(join(sandbox.repo, '.runtime-cache/campus-copilot-support-bundle-2026-03-30T00-00-00.000Z.json')),
      false,
    );
    assert.equal(
      existsSync(join(sandbox.repo, '.runtime-cache/campus-copilot-support-bundle-2026-04-01T00-00-00.000Z.json')),
      true,
    );
    assert.equal(
      existsSync(join(sandbox.repo, '.runtime-cache/campus-copilot-support-bundle-2026-04-02T00-00-00.000Z.json')),
      true,
    );
    assert.equal(existsSync(join(managedExternalCacheRoot, 'stale-cache')), false);
    assert.equal(existsSync(join(managedExternalCacheRoot, 'fresh-cache')), true);
    assert.equal(existsSync(join(externalCacheHome, 'browser/browser-cache-kept')), true);
    const legacyClone = payload.legacyBrowserRoots.find((entry) => entry.label === 'clone_profile13');
    assert.equal(legacyClone?.cleanupCandidate, false);
  } finally {
    sandbox.cleanup();
  }
});
