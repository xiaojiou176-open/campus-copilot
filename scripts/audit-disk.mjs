import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import {
  detectLegacyBrowserRootUsage,
  formatSize,
  getCacheGovernancePolicy,
  getEntrySizeKb,
  getMtime,
  getTopChildren,
  summarizeCachePolicy,
} from './lib/cache-governance.mjs';

const repoRoot = process.cwd();
const policy = getCacheGovernancePolicy(process.env, { repoRoot });

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`${command} ${args.join(' ')} failed: ${stderr || 'unknown_error'}`);
  }

  return (result.stdout || '').trim();
}

function runOptional(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  return result.status === 0 ? (result.stdout || '').trim() : '';
}

function makeRecord({
  label,
  path,
  repoExclusive,
  rebuildability,
  defaultCleanupLane,
  needsConfirmation,
  notes,
  topChildrenLimit,
  extra = {},
}) {
  const exists = existsSync(path);
  const sizeKb = getEntrySizeKb(path);

  return {
    label,
    path,
    exists,
    sizeKb,
    size: formatSize(sizeKb),
    mtime: getMtime(path),
    repoExclusive,
    rebuildability,
    defaultCleanupLane,
    needsConfirmation,
    notes,
    ...(topChildrenLimit ? { topChildren: getTopChildren(path, topChildrenLimit) } : {}),
    ...extra,
  };
}

function getSupportBundleSummary() {
  const runtimeCacheRoot = policy.runtimeCacheRoot;
  const bundles = existsSync(runtimeCacheRoot)
    ? readdirSync(runtimeCacheRoot)
        .filter((entry) => entry.startsWith('campus-copilot-support-bundle-') && entry.endsWith('.json'))
        .map((entry) => join(runtimeCacheRoot, entry))
        .sort()
    : [];
  const latestPath = bundles.length > 0 ? bundles[bundles.length - 1] : null;
  const sizeKb = bundles.reduce((sum, bundlePath) => sum + getEntrySizeKb(bundlePath), 0);

  return {
    label: 'support_bundles',
    pathPattern: join(runtimeCacheRoot, 'campus-copilot-support-bundle-*.json'),
    exists: bundles.length > 0,
    count: bundles.length,
    sizeKb,
    size: formatSize(sizeKb),
    latestPath,
    latestMtime: latestPath ? getMtime(latestPath) : null,
    repoExclusive: 'yes',
    rebuildability: 'rebuildable_with_support_bundle_command',
    defaultCleanupLane: `keep_latest_${policy.supportBundleRetentionCount}`,
    needsConfirmation: true,
    notes:
      'Support bundles are evidence snapshots under .runtime-cache/. cleanup:runtime keeps the newest snapshots and should not auto-delete everything.',
  };
}

function getPnpmStoreReferences() {
  const configuredRoot = run('pnpm', ['config', 'get', 'store-dir', '--location', 'project']);
  const effectiveStorePath = run('pnpm', ['store', 'path']);
  const modulesYamlPath = join(repoRoot, 'node_modules/.modules.yaml');
  let recordedInstallStoreDir = null;

  if (existsSync(modulesYamlPath)) {
    const fileText = readFileSync(modulesYamlPath, 'utf8');
    const match = fileText.match(/^\s*storeDir:\s*(.+)$/m);
    recordedInstallStoreDir = match ? match[1].trim() : null;
  }

  return {
    configuredStoreDir: {
      path: configuredRoot && configuredRoot !== 'undefined' ? configuredRoot : null,
      exists: Boolean(configuredRoot && configuredRoot !== 'undefined' && existsSync(configuredRoot)),
    },
    effectiveStoreDir: {
      path: effectiveStorePath || null,
      exists: Boolean(effectiveStorePath && existsSync(effectiveStorePath)),
    },
    recordedInstallStoreDir: {
      path: recordedInstallStoreDir,
      exists: Boolean(recordedInstallStoreDir && existsSync(recordedInstallStoreDir)),
    },
    driftDetected:
      Boolean(effectiveStorePath) &&
      Boolean(recordedInstallStoreDir) &&
      effectiveStorePath !== recordedInstallStoreDir,
    classification: {
      classification: 'shared_layer',
      repoExclusive: 'no',
      defaultCleanupLane: 'shared_inventory_only',
      notes:
        'The current pnpm install store may live outside the repo. It is relevant to disk truth, but it is a shared install layer rather than repo-exclusive waste.',
    },
  };
}

function getTmpResidues() {
  const matches = [];

  for (const root of policy.tempRoots) {
    if (!root.exists) {
      continue;
    }

    const stdout = runOptional('find', [root.path, '-maxdepth', '1', '-name', 'campus-copilot-*', '-print']);
    for (const line of stdout.split('\n').map((value) => value.trim()).filter(Boolean)) {
      const sizeKb = getEntrySizeKb(line);
      matches.push({
        path: line,
        tempRoot: root.path,
        tempRootSource: root.source,
        sizeKb,
        size: formatSize(sizeKb),
        mtime: getMtime(line),
      });
    }
  }

  return {
    pattern: 'campus-copilot-*',
    roots: policy.tempRoots,
    matches,
  };
}

function collectChromeProcessList() {
  try {
    return execFileSync('ps', ['-ax', '-o', 'pid=,command='], {
      encoding: 'utf8',
    });
  } catch {
    return '';
  }
}

const pnpmStoreReferences = getPnpmStoreReferences();

const repoInternalHotspots = [
  makeRecord({
    label: 'repo_root',
    path: repoRoot,
    repoExclusive: 'yes',
    rebuildability: 'not_applicable',
    defaultCleanupLane: 'inventory_only',
    needsConfirmation: false,
    notes: 'Overall repository footprint.',
  }),
  makeRecord({
    label: 'node_modules',
    path: join(repoRoot, 'node_modules'),
    repoExclusive: 'yes',
    rebuildability: 'rebuildable_with_pnpm_install',
    defaultCleanupLane: 'guarded_manual_cleanup_only',
    needsConfirmation: true,
    notes: 'Primary repo-internal hotspot; never part of cleanup:runtime.',
  }),
  makeRecord({
    label: '.agents',
    path: join(repoRoot, '.agents'),
    repoExclusive: 'yes',
    rebuildability: 'not_losslessly_rebuildable',
    defaultCleanupLane: 'never',
    needsConfirmation: true,
    notes: 'Planning and archive state.',
  }),
  makeRecord({
    label: '.runtime-cache',
    path: policy.runtimeCacheRoot,
    repoExclusive: 'yes',
    rebuildability: 'mixed_runtime_cache_and_evidence',
    defaultCleanupLane: 'cleanup:runtime',
    needsConfirmation: true,
    notes: 'Approved repo-local runtime container.',
  }),
];

const formalOutputs = [
  makeRecord({
    label: 'runtime_cache_container',
    path: policy.runtimeCacheRoot,
    repoExclusive: 'yes',
    rebuildability: 'mixed_runtime_cache_and_evidence',
    defaultCleanupLane: 'cleanup:runtime',
    needsConfirmation: true,
    notes: 'Approved runtime artifact container.',
  }),
  makeRecord({
    label: 'extension_dist',
    path: join(repoRoot, 'apps/extension/dist/chrome-mv3'),
    repoExclusive: 'yes',
    rebuildability: 'rebuildable_with_extension_build',
    defaultCleanupLane: 'never_default_cleanup',
    needsConfirmation: true,
    notes: 'Approved unpacked extension build output.',
  }),
  makeRecord({
    label: 'docs_assets',
    path: join(repoRoot, 'docs/assets'),
    repoExclusive: 'yes',
    rebuildability: 'not_a_cache',
    defaultCleanupLane: 'never',
    needsConfirmation: false,
    notes: 'Tracked public-facing assets.',
  }),
];

const rebuildableIntermediates = [
  makeRecord({
    label: 'extension_output',
    path: join(repoRoot, 'apps/extension/.output'),
    repoExclusive: 'yes',
    rebuildability: 'immediate',
    defaultCleanupLane: 'cleanup:repo:safe',
    needsConfirmation: false,
    notes: 'WXT build intermediary copied into dist/chrome-mv3.',
  }),
  makeRecord({
    label: 'extension_wxt',
    path: join(repoRoot, 'apps/extension/.wxt'),
    repoExclusive: 'yes',
    rebuildability: 'immediate',
    defaultCleanupLane: 'cleanup:repo:safe',
    needsConfirmation: false,
    notes: 'WXT working directory.',
  }),
  makeRecord({
    label: 'extension_test_results',
    path: join(repoRoot, 'apps/extension/test-results'),
    repoExclusive: 'yes',
    rebuildability: 'immediate',
    defaultCleanupLane: 'cleanup:repo:safe',
    needsConfirmation: false,
    notes: 'Playwright run metadata only.',
  }),
  makeRecord({
    label: 'extension_vitest_cache',
    path: join(repoRoot, 'apps/extension/node_modules/.vite/vitest'),
    repoExclusive: 'yes',
    rebuildability: 'immediate',
    defaultCleanupLane: 'cleanup:repo:safe',
    needsConfirmation: false,
    notes: 'Low-risk local Vitest cache.',
  }),
];

const evidenceAndState = [
  makeRecord({
    label: 'asset_audit_temp',
    path: join(repoRoot, '.runtime-cache/temp/asset-audit'),
    repoExclusive: 'yes',
    rebuildability: 'rebuildable_but_recent_evidence_may_be_lost',
    defaultCleanupLane: 'manual_confirmation_only',
    needsConfirmation: true,
    notes: 'Recent asset comparison and screenshot audit outputs.',
  }),
  getSupportBundleSummary(),
];

const repoExternalCaches = [
  makeRecord({
    label: 'managed_external_cache_home',
    path: policy.managedExternalCacheRoot,
    repoExclusive: 'yes',
    rebuildability: 'rebuildable_repo_owned_external_cache',
    defaultCleanupLane: 'managed_auto_gc',
    needsConfirmation: false,
    notes:
      'Canonical repo-owned external cache root for generic cache entries only. The repo-owned browser root is excluded from TTL/cap GC and tracked separately.',
    topChildrenLimit: 10,
    extra: {
      ttlHours: policy.externalCacheTtlHours,
      maxMb: policy.externalCacheMaxMb,
      currentAboveMax:
        getEntrySizeKb(policy.managedExternalCacheRoot) > policy.externalCacheMaxMb * 1024,
    },
  }),
];

const repoOwnedBrowserRoot = [
  makeRecord({
    label: 'repo_owned_browser_root',
    path: policy.browserUserDataRoot,
    repoExclusive: 'yes',
    rebuildability: 'stateful_browser_session_root',
    defaultCleanupLane: 'never_auto_gc',
    needsConfirmation: true,
    notes:
      'Repo-owned permanent Chrome user-data-dir. This browser root is excluded from generic external cache TTL/cap cleanup.',
    topChildrenLimit: 5,
    extra: {
      browserProfileDirectory: policy.browserProfileDirectory,
      browserProfileDisplayName: policy.browserProfileDisplayName,
      browserCdpPort: policy.browserCdpPort,
      bootstrapped: existsSync(policy.browserLocalStatePath) && existsSync(policy.browserProfilePath),
    },
  }),
];

const legacyBrowserRoots = detectLegacyBrowserRootUsage(collectChromeProcessList(), process.env).map((entry) => ({
  ...entry,
  repoExclusive: 'legacy_stateful_browser_root',
  rebuildability: 'stateful_recreation_with_login_loss',
  defaultCleanupLane: entry.inUseByChrome ? 'report_only_in_use' : 'legacy_candidate_confirmation_only',
  needsConfirmation: true,
  cleanupCandidate: entry.exists && !entry.inUseByChrome,
  topChildren: entry.label === 'clone_profile13' ? getTopChildren(entry.path, 5) : undefined,
}));

const sharedInventoryOnly = [
  ...(pnpmStoreReferences.effectiveStoreDir.path
    ? [
        makeRecord({
          label: 'pnpm_store_current_install_truth',
          path: pnpmStoreReferences.effectiveStoreDir.path,
          repoExclusive: 'shared',
          rebuildability: 'rebuildable_with_network',
          defaultCleanupLane: 'shared_inventory_only',
          needsConfirmation: true,
          notes:
            'Current configured/effective install store. Shared download/install layer, not repo-exclusive waste.',
        }),
      ]
    : []),
  makeRecord({
    label: 'playwright_cache',
    path: join(policy.homeDir, 'Library/Caches/ms-playwright'),
    repoExclusive: 'shared',
    rebuildability: 'rebuildable_with_download',
    defaultCleanupLane: 'shared_inventory_only',
    needsConfirmation: true,
    notes: 'Machine-level Playwright browser cache.',
  }),
  makeRecord({
    label: 'pnpm_cache_metadata',
    path: join(policy.homeDir, 'Library/Caches/pnpm'),
    repoExclusive: 'shared',
    rebuildability: 'rebuildable_with_network',
    defaultCleanupLane: 'shared_inventory_only',
    needsConfirmation: true,
    notes: 'Machine-level pnpm metadata and dlx cache.',
  }),
  makeRecord({
    label: 'pnpm_global_tools',
    path: join(policy.homeDir, 'Library/pnpm'),
    repoExclusive: 'shared',
    rebuildability: 'rebuildable_with_global_tool_reinstall',
    defaultCleanupLane: 'shared_inventory_only',
    needsConfirmation: true,
    notes: 'Machine-level pnpm global tools directory.',
  }),
  makeRecord({
    label: 'npm_cache',
    path: join(policy.homeDir, '.npm'),
    repoExclusive: 'shared',
    rebuildability: 'rebuildable_with_network',
    defaultCleanupLane: 'shared_inventory_only',
    needsConfirmation: true,
    notes: 'Machine-level npm cache; not charged to this repo by default.',
  }),
];

const repoInternalKb = repoInternalHotspots.find((record) => record.label === 'repo_root')?.sizeKb ?? 0;
const repoExternalKb = repoExternalCaches.reduce((sum, record) => sum + record.sizeKb, 0);
const repoOwnedBrowserKb = repoOwnedBrowserRoot.reduce((sum, record) => sum + record.sizeKb, 0);
const legacyBrowserKb = legacyBrowserRoots.reduce((sum, record) => sum + record.sizeKb, 0);
const sharedLayerKb = sharedInventoryOnly.reduce((sum, record) => sum + record.sizeKb, 0);

const payload = {
  status: 'ok',
  repoRoot,
  cachePolicy: summarizeCachePolicy(policy),
  summary: {
    repoInternalKb,
    repoInternalSize: formatSize(repoInternalKb),
    repoExternalKb,
    repoExternalSize: formatSize(repoExternalKb),
    repoOwnedBrowserKb,
    repoOwnedBrowserSize: formatSize(repoOwnedBrowserKb),
    legacyBrowserKb,
    legacyBrowserSize: formatSize(legacyBrowserKb),
    sharedLayerKb,
    sharedLayerSize: formatSize(sharedLayerKb),
    combinedRelevantKb: repoInternalKb + repoExternalKb + repoOwnedBrowserKb + legacyBrowserKb + sharedLayerKb,
    combinedRelevantSize: formatSize(repoInternalKb + repoExternalKb + repoOwnedBrowserKb + legacyBrowserKb + sharedLayerKb),
  },
  pnpmStoreReferences,
  repoInternalHotspots,
  formalOutputs,
  rebuildableIntermediates,
  evidenceAndState,
  repoExternalCaches,
  repoOwnedBrowserRoot,
  legacyBrowserRoots,
  highRelatedExternal: legacyBrowserRoots,
  sharedInventoryOnly,
  tmpResidues: getTmpResidues(),
  nonAttributionGuidance: [
    {
      label: 'machine_wide_heavy_runtime_names',
      patterns: ['docker-ci', 'clean-room', 'runner-temp', 'batch-auth-run-service'],
      currentRepoDeclared: false,
      notes:
        'Do not attribute machine-wide temp residues with these names to Campus Copilot unless separate process or source evidence links them.',
    },
    {
      label: 'chrome_code_sign_clone',
      patterns: ['com.google.Chrome.code_sign_clone'],
      currentRepoDeclared: false,
      notes:
        'Google Chrome app-clone residues may exist machine-wide during browser automation, but they are not repo-named or repo-exclusive by default.',
    },
    {
      label: 'external_browser_sidecars',
      patterns: ['chrome-devtools-mcp', 'docker', 'container-runs'],
      currentRepoDeclared: false,
      notes:
        'Treat these as external machine-wide surfaces unless current repo source or process evidence explicitly links them.',
    },
  ],
};

console.log(JSON.stringify(payload, null, 2));
