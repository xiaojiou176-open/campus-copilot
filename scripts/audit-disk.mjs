import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const home = process.env.HOME ?? homedir();

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

function resolveTarget(targetPath) {
  if (targetPath.startsWith('~/')) {
    return join(home, targetPath.slice(2));
  }
  if (targetPath.startsWith('/')) {
    return targetPath;
  }
  return resolve(repoRoot, targetPath);
}

function duKilobytes(targetPath) {
  if (!existsSync(targetPath)) {
    return 0;
  }

  const stdout = run('du', ['-sk', targetPath]);
  const [value] = stdout.split(/\s+/);
  return Number.parseInt(value ?? '0', 10);
}

function formatSize(kilobytes) {
  if (kilobytes >= 1024 * 1024) {
    return `${(kilobytes / 1024 / 1024).toFixed(2)} GiB`;
  }
  if (kilobytes >= 1024) {
    return `${(kilobytes / 1024).toFixed(1)} MiB`;
  }
  return `${kilobytes} KiB`;
}

function getMtime(targetPath) {
  if (!existsSync(targetPath)) {
    return null;
  }
  return statSync(targetPath).mtime.toISOString();
}

function makeRecord({
  label,
  path,
  repoExclusive,
  rebuildability,
  defaultCleanupLane,
  needsConfirmation,
  notes,
}) {
  const resolvedPath = resolveTarget(path);
  const exists = existsSync(resolvedPath);
  const sizeKb = duKilobytes(resolvedPath);

  return {
    label,
    path: resolvedPath,
    exists,
    sizeKb,
    size: formatSize(sizeKb),
    mtime: getMtime(resolvedPath),
    repoExclusive,
    rebuildability,
    defaultCleanupLane,
    needsConfirmation,
    notes,
  };
}

function getSupportBundleSummary() {
  const runtimeCache = join(repoRoot, '.runtime-cache');
  if (!existsSync(runtimeCache)) {
    return {
      label: 'support_bundles',
      pathPattern: join(runtimeCache, 'campus-copilot-support-bundle-*.json'),
      exists: false,
      count: 0,
      sizeKb: 0,
      size: formatSize(0),
      latestPath: null,
      latestMtime: null,
      repoExclusive: 'yes',
      rebuildability: 'rebuildable_with_support_bundle_command',
      defaultCleanupLane: 'keep_latest_snapshot_only',
      needsConfirmation: true,
      notes: 'Support bundles are evidence snapshots and should not enter default cleanup lanes.',
    };
  }

  const bundlePaths = readdirSync(runtimeCache)
    .filter((entry) => entry.startsWith('campus-copilot-support-bundle-') && entry.endsWith('.json'))
    .map((entry) => join(runtimeCache, entry))
    .sort();

  const latestPath = bundlePaths.length > 0 ? bundlePaths[bundlePaths.length - 1] : null;
  const sizeKb = bundlePaths.reduce((sum, bundlePath) => sum + duKilobytes(bundlePath), 0);

  return {
    label: 'support_bundles',
    pathPattern: join(runtimeCache, 'campus-copilot-support-bundle-*.json'),
    exists: bundlePaths.length > 0,
    count: bundlePaths.length,
    sizeKb,
    size: formatSize(sizeKb),
    latestPath,
    latestMtime: latestPath ? getMtime(latestPath) : null,
    repoExclusive: 'yes',
    rebuildability: 'rebuildable_with_support_bundle_command',
    defaultCleanupLane: 'keep_latest_snapshot_only',
    needsConfirmation: true,
    notes: 'Support bundles are evidence snapshots and should not enter default cleanup lanes.',
  };
}

function getTmpResidues() {
  const stdout = run('find', ['/tmp', '-maxdepth', '1', '-name', 'campus-copilot-*', '-print']);
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((path) => {
      const sizeKb = duKilobytes(path);
      return {
        path,
        sizeKb,
        size: formatSize(sizeKb),
        mtime: getMtime(path),
      };
    });
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

  const configuredExists = configuredRoot && configuredRoot !== 'undefined' ? existsSync(configuredRoot) : false;
  const effectiveExists = effectiveStorePath ? existsSync(effectiveStorePath) : false;
  const recordedExists = recordedInstallStoreDir ? existsSync(recordedInstallStoreDir) : false;

  return {
    configuredStoreDir: {
      path: configuredRoot && configuredRoot !== 'undefined' ? configuredRoot : null,
      exists: configuredExists,
    },
    effectiveStoreDir: {
      path: effectiveStorePath || null,
      exists: effectiveExists,
    },
    recordedInstallStoreDir: {
      path: recordedInstallStoreDir,
      exists: recordedExists,
    },
    driftDetected:
      Boolean(effectiveStorePath) &&
      Boolean(recordedInstallStoreDir) &&
      effectiveStorePath !== recordedInstallStoreDir,
  };
}

const repoInternalHotspots = [
  makeRecord({
    label: 'repo_root',
    path: '.',
    repoExclusive: 'yes',
    rebuildability: 'not_applicable',
    defaultCleanupLane: 'inventory_only',
    needsConfirmation: false,
    notes: 'Overall repository footprint.',
  }),
  makeRecord({
    label: 'node_modules',
    path: 'node_modules',
    repoExclusive: 'yes',
    rebuildability: 'rebuildable_with_pnpm_install',
    defaultCleanupLane: 'guarded_deep_lane_only',
    needsConfirmation: true,
    notes: 'Primary repo-internal hotspot; never part of cleanup:repo:safe.',
  }),
  makeRecord({
    label: '.git',
    path: '.git',
    repoExclusive: 'yes',
    rebuildability: 'not_a_cleanup_target',
    defaultCleanupLane: 'never',
    needsConfirmation: false,
    notes: 'Git metadata and history.',
  }),
  makeRecord({
    label: '.agents',
    path: '.agents',
    repoExclusive: 'yes',
    rebuildability: 'not_losslessly_rebuildable',
    defaultCleanupLane: 'candidate_confirmation_only',
    needsConfirmation: true,
    notes: 'Local planning and conversation archive state.',
  }),
  makeRecord({
    label: '.runtime-cache',
    path: '.runtime-cache',
    repoExclusive: 'yes',
    rebuildability: 'mixed_runtime_cache_and_evidence',
    defaultCleanupLane: 'runtime_only',
    needsConfirmation: true,
    notes: 'Approved diagnostics container; not a source of truth.',
  }),
];

const formalOutputs = [
  makeRecord({
    label: 'runtime_cache_container',
    path: '.runtime-cache',
    repoExclusive: 'yes',
    rebuildability: 'mixed_runtime_cache_and_evidence',
    defaultCleanupLane: 'runtime_only',
    needsConfirmation: true,
    notes: 'Approved runtime artifact container.',
  }),
  makeRecord({
    label: 'extension_dist',
    path: 'apps/extension/dist/chrome-mv3',
    repoExclusive: 'yes',
    rebuildability: 'rebuildable_with_extension_build',
    defaultCleanupLane: 'never_default_cleanup',
    needsConfirmation: true,
    notes: 'Approved unpacked extension build output.',
  }),
  makeRecord({
    label: 'docs_assets',
    path: 'docs/assets',
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
    path: 'apps/extension/.output',
    repoExclusive: 'yes',
    rebuildability: 'immediate',
    defaultCleanupLane: 'cleanup:repo:safe',
    needsConfirmation: false,
    notes: 'WXT build intermediary copied into dist/chrome-mv3.',
  }),
  makeRecord({
    label: 'extension_wxt',
    path: 'apps/extension/.wxt',
    repoExclusive: 'yes',
    rebuildability: 'immediate',
    defaultCleanupLane: 'cleanup:repo:safe',
    needsConfirmation: false,
    notes: 'WXT working directory.',
  }),
  makeRecord({
    label: 'extension_test_results',
    path: 'apps/extension/test-results',
    repoExclusive: 'yes',
    rebuildability: 'immediate',
    defaultCleanupLane: 'cleanup:repo:safe',
    needsConfirmation: false,
    notes: 'Playwright run metadata only.',
  }),
  makeRecord({
    label: 'extension_vitest_cache',
    path: 'apps/extension/node_modules/.vite/vitest',
    repoExclusive: 'yes',
    rebuildability: 'immediate',
    defaultCleanupLane: 'cleanup:repo:safe',
    needsConfirmation: false,
    notes: 'Low-risk local Vitest cache.',
  }),
];

const evidenceAndState = [
  makeRecord({
    label: '.agents',
    path: '.agents',
    repoExclusive: 'yes',
    rebuildability: 'not_losslessly_rebuildable',
    defaultCleanupLane: 'candidate_confirmation_only',
    needsConfirmation: true,
    notes: 'Local conversation and plan state.',
  }),
  makeRecord({
    label: 'asset_audit_temp',
    path: '.runtime-cache/temp/asset-audit',
    repoExclusive: 'yes',
    rebuildability: 'rebuildable_but_recent_evidence_may_be_lost',
    defaultCleanupLane: 'candidate_confirmation_only',
    needsConfirmation: true,
    notes: 'Recent asset comparison and screenshot audit outputs.',
  }),
  getSupportBundleSummary(),
];

const highRelatedExternal = [
  makeRecord({
    label: 'chrome_debug_profile',
    path: '~/.chrome-debug-profile',
    repoExclusive: 'high_related_stateful',
    rebuildability: 'stateful_recreation_with_login_loss',
    defaultCleanupLane: 'candidate_confirmation_only',
    needsConfirmation: true,
    notes: 'Default browser profile path used by live preflight and live probe.',
  }),
  makeRecord({
    label: 'campus_copilot_live_gui',
    path: '~/.campus-copilot-live-gui',
    repoExclusive: 'high_related_stateful',
    rebuildability: 'unknown_stateful_directory',
    defaultCleanupLane: 'candidate_confirmation_only',
    needsConfirmation: true,
    notes: 'Repo-name-specific external directory; current source does not declare an owner.',
  }),
  makeRecord({
    label: 'campus_copilot_live_profile',
    path: '~/.campus-copilot-live-profile',
    repoExclusive: 'high_related_stateful',
    rebuildability: 'unknown_stateful_directory',
    defaultCleanupLane: 'candidate_confirmation_only',
    needsConfirmation: true,
    notes: 'Repo-name-specific external profile directory; current source does not declare an owner.',
  }),
  makeRecord({
    label: 'cursor_workspace_state',
    path: '~/Library/Application Support/Cursor/User/workspaceStorage/90fb631c2959f41ab74e26aebdb4d75c',
    repoExclusive: 'yes',
    rebuildability: 'editor_rebuildable',
    defaultCleanupLane: 'manual_only_low_yield',
    needsConfirmation: true,
    notes: 'Repo-specific Cursor workspace state.',
  }),
];

const sharedInventoryOnly = [
  makeRecord({
    label: 'playwright_cache',
    path: '~/Library/Caches/ms-playwright',
    repoExclusive: 'shared',
    rebuildability: 'rebuildable_with_download',
    defaultCleanupLane: 'shared_inventory_only',
    needsConfirmation: true,
    notes: 'Machine-level Playwright browser cache.',
  }),
  makeRecord({
    label: 'pnpm_cache_metadata',
    path: '~/Library/Caches/pnpm',
    repoExclusive: 'shared',
    rebuildability: 'rebuildable_with_network',
    defaultCleanupLane: 'shared_inventory_only',
    needsConfirmation: true,
    notes: 'Machine-level pnpm metadata and dlx cache.',
  }),
  makeRecord({
    label: 'pnpm_global_tools',
    path: '~/Library/pnpm',
    repoExclusive: 'shared',
    rebuildability: 'rebuildable_with_global_tool_reinstall',
    defaultCleanupLane: 'shared_inventory_only',
    needsConfirmation: true,
    notes: 'Machine-level pnpm global tools directory.',
  }),
  makeRecord({
    label: 'npm_cache',
    path: '~/.npm',
    repoExclusive: 'shared',
    rebuildability: 'rebuildable_with_network',
    defaultCleanupLane: 'shared_inventory_only',
    needsConfirmation: true,
    notes: 'Machine-level npm cache; not charged to this repo by default.',
  }),
  makeRecord({
    label: 'pnpm_prooftrail_cache',
    path: '~/.cache/pnpm/prooftrail',
    repoExclusive: 'shared_or_other_project_primary',
    rebuildability: 'rebuildable_with_network',
    defaultCleanupLane: 'shared_inventory_only',
    needsConfirmation: true,
    notes: 'Shared pnpm virtual store currently referenced by Playwright cache links.',
  }),
];

const repoInternalKb = repoInternalHotspots.find((record) => record.label === 'repo_root')?.sizeKb ?? 0;
const highRelatedExternalKb = highRelatedExternal.reduce((sum, record) => sum + record.sizeKb, 0);
const sharedLayerKb = sharedInventoryOnly.reduce((sum, record) => sum + record.sizeKb, 0);
const combinedRelevantKb = repoInternalKb + highRelatedExternalKb + sharedLayerKb;

const payload = {
  status: 'ok',
  repoRoot,
  summary: {
    repoInternalKb,
    repoInternalSize: formatSize(repoInternalKb),
    highRelatedExternalKb,
    highRelatedExternalSize: formatSize(highRelatedExternalKb),
    sharedLayerKb,
    sharedLayerSize: formatSize(sharedLayerKb),
    combinedRelevantKb,
    combinedRelevantSize: formatSize(combinedRelevantKb),
  },
  pnpmStoreReferences: getPnpmStoreReferences(),
  repoInternalHotspots,
  formalOutputs,
  rebuildableIntermediates,
  evidenceAndState,
  highRelatedExternal,
  sharedInventoryOnly,
  tmpResidues: {
    pattern: '/tmp/campus-copilot-*',
    matches: getTmpResidues(),
  },
};

console.log(JSON.stringify(payload, null, 2));
