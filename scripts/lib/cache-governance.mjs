import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  CANONICAL_CHROME_PROFILE_DIRECTORY,
  CANONICAL_CHROME_PROFILE_DISPLAY_NAME,
  DEFAULT_BROWSER_CDP_PORT,
  DEFAULT_REPO_OWNED_CHROME_USER_DATA_SUBPATH,
  DEFAULT_SOURCE_CHROME_PROFILE_DIRECTORY,
  DEFAULT_SOURCE_CHROME_ROOT_SUBPATH,
  parseRemoteChromeProcesses,
} from './live-probe-core.mjs';

export const DEFAULT_EXTERNAL_CACHE_TTL_HOURS = 168;
export const DEFAULT_EXTERNAL_CACHE_MAX_MB = 2048;
export const DEFAULT_RUNTIME_TEMP_TTL_HOURS = 72;
export const DEFAULT_RUNTIME_EVIDENCE_TTL_HOURS = 168;
export const DEFAULT_SUPPORT_BUNDLE_RETENTION_COUNT = 3;

export const LEGACY_BROWSER_ROOTS = [
  {
    label: 'clone_profile13',
    pathSuffix: '.campus-copilot-profile13-clone',
    notes:
      'Legacy clone-lane Chrome user-data-dir. Keep it as a migration candidate only; do not treat it as the default live lane.',
  },
  {
    label: 'chrome_debug_profile',
    pathSuffix: '.chrome-debug-profile',
    notes:
      'Legacy debug sandbox. Keep it as a migration candidate only; do not treat it as the default student session truth source.',
  },
];

const MANAGED_EXTERNAL_CACHE_EXCLUDED_NAMES = new Set(['browser']);
const BROWSER_LOCK_FILENAMES = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'DevToolsActivePort'];

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeDirectoryPath(targetPath) {
  const trimmed = String(targetPath || '').trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed === '/') {
    return trimmed;
  }
  return trimmed.replace(/\/+$/, '');
}

export function getHomeDir(env = process.env) {
  return env.HOME ?? homedir();
}

export function ensureDirectory(targetPath) {
  if (!targetPath) {
    return;
  }
  mkdirSync(targetPath, { recursive: true });
}

function removePath(targetPath) {
  rmSync(targetPath, { recursive: true, force: true });
}

export function getManagedCacheHome(env = process.env, options = {}) {
  const homeDir = options.homeDir ?? getHomeDir(env);
  const xdgCacheHome = env.XDG_CACHE_HOME?.trim()
    ? normalizeDirectoryPath(env.XDG_CACHE_HOME)
    : join(homeDir, '.cache');

  return normalizeDirectoryPath(
    env.CAMPUS_COPILOT_CACHE_HOME?.trim() || join(xdgCacheHome, 'campus-copilot'),
  );
}

export function getBrowserBootstrapPlan(env = process.env, options = {}) {
  const homeDir = options.homeDir ?? getHomeDir(env);
  const cacheHome = getManagedCacheHome(env, { homeDir });
  const managedExternalCacheRoot = normalizeDirectoryPath(
    env.CAMPUS_COPILOT_MANAGED_EXTERNAL_CACHE_ROOT?.trim() || join(cacheHome, 'cache'),
  );
  const browserStateRoot = normalizeDirectoryPath(
    env.CAMPUS_COPILOT_BROWSER_STATE_ROOT?.trim() || join(cacheHome, 'browser'),
  );
  const targetUserDataRoot = normalizeDirectoryPath(
    env.CAMPUS_COPILOT_BROWSER_ROOT?.trim() ||
      join(cacheHome, DEFAULT_REPO_OWNED_CHROME_USER_DATA_SUBPATH),
  );
  const sourceChromeRoot = normalizeDirectoryPath(
    env.CAMPUS_COPILOT_SOURCE_CHROME_ROOT?.trim() || join(homeDir, DEFAULT_SOURCE_CHROME_ROOT_SUBPATH),
  );
  const sourceProfileDirectory =
    env.CAMPUS_COPILOT_SOURCE_PROFILE_DIRECTORY?.trim() || DEFAULT_SOURCE_CHROME_PROFILE_DIRECTORY;
  const targetProfileDirectory =
    env.CAMPUS_COPILOT_BROWSER_PROFILE_DIRECTORY?.trim() || CANONICAL_CHROME_PROFILE_DIRECTORY;
  const profileDisplayName =
    env.CAMPUS_COPILOT_BROWSER_PROFILE_DISPLAY_NAME?.trim() || CANONICAL_CHROME_PROFILE_DISPLAY_NAME;
  const browserCdpPort = parsePositiveInt(
    env.CAMPUS_COPILOT_BROWSER_CDP_PORT,
    DEFAULT_BROWSER_CDP_PORT,
  );

  return {
    cacheHome,
    managedExternalCacheRoot,
    browserStateRoot,
    targetUserDataRoot,
    targetLocalStatePath: join(targetUserDataRoot, 'Local State'),
    targetProfileDirectory,
    targetProfilePath: join(targetUserDataRoot, targetProfileDirectory),
    targetBrowserRoot: browserStateRoot,
    profileDisplayName,
    browserCdpPort,
    browserInstanceStatePath: join(browserStateRoot, 'instance.json'),
    browserSessionStatePath: join(browserStateRoot, 'session-state.json'),
    sourceChromeRoot,
    sourceLocalStatePath: join(sourceChromeRoot, 'Local State'),
    sourceProfileDirectory,
    sourceProfilePath: join(sourceChromeRoot, sourceProfileDirectory),
  };
}

export function getBrowserRootState(policyOrEnv = process.env, options = {}) {
  const plan =
    policyOrEnv && typeof policyOrEnv === 'object' && 'browserUserDataRoot' in policyOrEnv
      ? {
          targetBrowserRoot: policyOrEnv.browserStateRoot ?? policyOrEnv.browserRoot,
          targetUserDataRoot: policyOrEnv.browserUserDataRoot,
          targetLocalStatePath: policyOrEnv.browserLocalStatePath,
          targetProfileDirectory: policyOrEnv.browserProfileDirectory,
          targetProfilePath: policyOrEnv.browserProfilePath,
          profileDisplayName: policyOrEnv.browserProfileDisplayName,
          browserCdpPort: policyOrEnv.browserCdpPort,
          browserInstanceStatePath: policyOrEnv.browserInstanceStatePath,
          browserSessionStatePath: policyOrEnv.browserSessionStatePath,
        }
      : getBrowserBootstrapPlan(policyOrEnv, options);

  const localStateExists = existsSync(plan.targetLocalStatePath);
  const profileExists = existsSync(plan.targetProfilePath);

  return {
    browserRoot: plan.targetBrowserRoot,
    userDataRoot: plan.targetUserDataRoot,
    localStatePath: plan.targetLocalStatePath,
    profileDirectory: plan.targetProfileDirectory,
    profilePath: plan.targetProfilePath,
    profileDisplayName: plan.profileDisplayName,
    browserCdpPort: plan.browserCdpPort,
    browserInstanceStatePath: plan.browserInstanceStatePath,
    browserSessionStatePath: plan.browserSessionStatePath,
    bootstrapped: localStateExists && profileExists,
    localStateExists,
    profileExists,
  };
}

function getEntrySizeBytes(targetPath) {
  let stats;
  try {
    stats = lstatSync(targetPath);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return 0;
    }
    throw error;
  }

  if (stats.isSymbolicLink()) {
    return 0;
  }

  if (!stats.isDirectory()) {
    return stats.size;
  }

  let total = 0;
  for (const entry of readdirSync(targetPath)) {
    total += getEntrySizeBytes(join(targetPath, entry));
  }
  return total;
}

export function getEntrySizeKb(targetPath) {
  let stats;
  try {
    stats = lstatSync(targetPath);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return 0;
    }
    throw error;
  }

  if (stats.isSymbolicLink()) {
    return 0;
  }

  if (stats.isDirectory()) {
    const duResult = spawnSync('du', ['-sk', targetPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (duResult.status === 0) {
      const firstField = (duResult.stdout || '').trim().split(/\s+/)[0];
      const parsed = Number.parseInt(firstField ?? '', 10);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  return Math.ceil(getEntrySizeBytes(targetPath) / 1024);
}

export function formatSize(kilobytes) {
  if (kilobytes >= 1024 * 1024) {
    return `${(kilobytes / 1024 / 1024).toFixed(2)} GiB`;
  }
  if (kilobytes >= 1024) {
    return `${(kilobytes / 1024).toFixed(1)} MiB`;
  }
  return `${kilobytes} KiB`;
}

export function getMtime(targetPath) {
  let stats;
  try {
    stats = lstatSync(targetPath);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  return stats.mtime.toISOString();
}

export function getImmediateChildren(rootPath, options = {}) {
  return listManagedEntries(rootPath, options).map((entry) => entry.path);
}

function listManagedEntries(rootPath, options = {}) {
  const excludedNames = new Set(options.excludedNames ?? []);
  if (!existsSync(rootPath) || !statSync(rootPath).isDirectory()) {
    return [];
  }

  return readdirSync(rootPath)
    .filter((entry) => !excludedNames.has(entry))
    .map((entry) => {
      const path = join(rootPath, entry);
      let stats;
      try {
        stats = statSync(path);
      } catch (error) {
        if (error && typeof error === 'object' && error.code === 'ENOENT') {
          // Runtime cleanup and browser helpers can delete an entry after readdir()
          // but before we inspect it. Try lstatSync() once more for broken symlink
          // cases, then skip the entry if it is truly gone.
          try {
            stats = lstatSync(path);
          } catch (retryError) {
            if (retryError && typeof retryError === 'object' && retryError.code === 'ENOENT') {
              return undefined;
            }
            throw retryError;
          }
        } else {
          throw error;
        }
      }
      return {
        name: entry,
        path,
        isDirectory: stats.isDirectory(),
        mtimeMs: stats.mtimeMs,
        sizeKb: getEntrySizeKb(path),
      };
    })
    .filter((entry) => Boolean(entry));
}

export function getTopChildren(targetPath, limit = 5, options = {}) {
  return listManagedEntries(targetPath, options)
    .map((entry) => ({
      path: entry.path,
      sizeKb: entry.sizeKb,
      size: formatSize(entry.sizeKb),
      mtime: getMtime(entry.path),
    }))
    .sort((left, right) => right.sizeKb - left.sizeKb)
    .slice(0, limit);
}

export function trimSupportBundles(runtimeCacheRoot, keepLatestCount) {
  const removed = [];
  if (!existsSync(runtimeCacheRoot) || !statSync(runtimeCacheRoot).isDirectory()) {
    return removed;
  }

  const supportBundles = readdirSync(runtimeCacheRoot)
    .filter((entry) => entry.startsWith('campus-copilot-support-bundle-') && entry.endsWith('.json'))
    .sort();

  for (const entry of supportBundles.slice(0, Math.max(0, supportBundles.length - keepLatestCount))) {
    const path = join(runtimeCacheRoot, entry);
    if (!existsSync(path)) {
      continue;
    }
    removed.push({ path, sizeKb: getEntrySizeKb(path) });
    removePath(path);
  }

  return removed;
}

function removeTopLevelRuntimeDebugFiles(runtimeCacheRoot) {
  const removed = [];
  for (const path of getImmediateChildren(runtimeCacheRoot)) {
    if (!existsSync(path)) {
      continue;
    }
    const entry = path.split('/').at(-1) ?? '';
    let stats;
    try {
      stats = statSync(path);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
    if (!stats.isFile()) {
      continue;
    }
    if (entry.endsWith('.ts') || entry.includes('-debug.') || entry.includes('-probe.')) {
      removed.push({ path, sizeKb: getEntrySizeKb(path) });
      removePath(path);
    }
  }
  return removed;
}

function trimCoverageArtifacts(runtimeCoverageRoot) {
  const removed = [];
  for (const path of getImmediateChildren(runtimeCoverageRoot)) {
    if (!existsSync(path)) {
      continue;
    }
    if ((path.split('/').at(-1) ?? '') === 'coverage-summary.json') {
      continue;
    }
    removed.push({ path, sizeKb: getEntrySizeKb(path) });
    removePath(path);
  }
  return removed;
}

function removeDirectoryChildren(rootPath, options = {}) {
  const removed = [];
  for (const entry of listManagedEntries(rootPath, options)) {
    removed.push({ path: entry.path, sizeKb: entry.sizeKb });
    removePath(entry.path);
  }
  return removed;
}

function pruneDirectoryChildrenByAge(rootPath, ttlHours, nowMs = Date.now(), options = {}) {
  const removed = [];
  const ttlMs = ttlHours * 60 * 60 * 1000;
  for (const entry of listManagedEntries(rootPath, options)) {
    if (nowMs - entry.mtimeMs < ttlMs) {
      continue;
    }
    removed.push({ path: entry.path, sizeKb: entry.sizeKb });
    removePath(entry.path);
  }
  return removed;
}

function enforceSizeCap(rootPath, maxMb, options = {}) {
  const removed = [];
  const maxKb = maxMb * 1024;
  const entries = listManagedEntries(rootPath, options).sort((left, right) => left.mtimeMs - right.mtimeMs);
  let totalKb = entries.reduce((sum, entry) => sum + entry.sizeKb, 0);
  for (const entry of entries) {
    if (totalKb <= maxKb) {
      break;
    }
    removed.push({ path: entry.path, sizeKb: entry.sizeKb });
    removePath(entry.path);
    totalKb -= entry.sizeKb;
  }
  return removed;
}

function collectTempRoots(env = process.env) {
  const roots = [];
  const seen = new Set();

  function push(candidate, source) {
    const normalizedPath = normalizeDirectoryPath(candidate);
    if (!normalizedPath || seen.has(normalizedPath)) {
      return;
    }
    seen.add(normalizedPath);
    roots.push({
      path: normalizedPath,
      source,
      exists: existsSync(normalizedPath),
    });
  }

  if (env.CAMPUS_COPILOT_TEMP_ROOTS?.trim()) {
    for (const value of env.CAMPUS_COPILOT_TEMP_ROOTS.split(':')) {
      push(value, 'env_override');
    }
    return roots;
  }

  push('/tmp', 'system_tmp');
  push(env.TMPDIR, 'env_tmpdir');
  const darwinTempRoot = spawnSync('getconf', ['DARWIN_USER_TEMP_DIR'], { encoding: 'utf8' });
  if (darwinTempRoot.status === 0) {
    push(darwinTempRoot.stdout, 'darwin_user_temp_dir');
  }
  return roots;
}

export function resolveCacheGovernancePolicy(env = process.env, options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const homeDir = options.homeDir ?? getHomeDir(env);
  const bootstrapPlan = getBrowserBootstrapPlan(env, { homeDir });
  const browserRootState = getBrowserRootState(bootstrapPlan);

  return {
    repoRoot,
    homeDir,
    cacheHome: bootstrapPlan.cacheHome,
    externalCacheHome: bootstrapPlan.cacheHome,
    managedExternalCacheRoot: bootstrapPlan.managedExternalCacheRoot,
    managedExternalCacheExcludedNames: [...MANAGED_EXTERNAL_CACHE_EXCLUDED_NAMES],
    browserStateRoot: bootstrapPlan.targetBrowserRoot,
    browserRoot: bootstrapPlan.targetBrowserRoot,
    browserHome: bootstrapPlan.targetBrowserRoot,
    browserUserDataRoot: bootstrapPlan.targetUserDataRoot,
    browserLocalStatePath: bootstrapPlan.targetLocalStatePath,
    browserProfileDirectory: bootstrapPlan.targetProfileDirectory,
    browserProfilePath: bootstrapPlan.targetProfilePath,
    browserProfileDisplayName: bootstrapPlan.profileDisplayName,
    browserDisplayName: bootstrapPlan.profileDisplayName,
    browserCdpPort: bootstrapPlan.browserCdpPort,
    browserInstanceStatePath: bootstrapPlan.browserInstanceStatePath,
    browserSessionStatePath: bootstrapPlan.browserSessionStatePath,
    browserInstanceMetadataPath: bootstrapPlan.browserInstanceStatePath,
    browserRootBootstrapped: browserRootState.bootstrapped,
    sourceChromeRoot: bootstrapPlan.sourceChromeRoot,
    sourceLocalStatePath: bootstrapPlan.sourceLocalStatePath,
    sourceProfileDirectory: bootstrapPlan.sourceProfileDirectory,
    sourceProfilePath: bootstrapPlan.sourceProfilePath,
    runtimeCacheRoot: join(repoRoot, '.runtime-cache'),
    runtimeTempRoot: join(repoRoot, '.runtime-cache', 'temp'),
    runtimeBrowserEvidenceRoot: join(repoRoot, '.runtime-cache', 'browser-evidence'),
    runtimeLiveTraceRoot: join(repoRoot, '.runtime-cache', 'live-traces'),
    runtimeLiveFixturesRoot: join(repoRoot, '.runtime-cache', 'live-fixtures'),
    runtimeBrowserIdentityRoot: join(repoRoot, '.runtime-cache', 'browser-identity'),
    runtimeCoverageRoot: join(repoRoot, '.runtime-cache', 'coverage'),
    runtimeRawRoot: join(repoRoot, '.runtime-cache', 'raw'),
    runtimeCleanupMode: env.CAMPUS_COPILOT_RUNTIME_CLEAN_LEVEL?.trim().toLowerCase() === 'closeout' ? 'closeout' : 'standard',
    externalCacheTtlHours: parsePositiveInt(env.CAMPUS_COPILOT_CACHE_TTL_HOURS, DEFAULT_EXTERNAL_CACHE_TTL_HOURS),
    externalCacheMaxMb: parsePositiveInt(env.CAMPUS_COPILOT_CACHE_MAX_MB, DEFAULT_EXTERNAL_CACHE_MAX_MB),
    runtimeTempTtlHours: parsePositiveInt(env.CAMPUS_COPILOT_RUNTIME_TEMP_TTL_HOURS, DEFAULT_RUNTIME_TEMP_TTL_HOURS),
    runtimeEvidenceTtlHours: parsePositiveInt(env.CAMPUS_COPILOT_RUNTIME_EVIDENCE_TTL_HOURS, DEFAULT_RUNTIME_EVIDENCE_TTL_HOURS),
    supportBundleRetentionCount: parsePositiveInt(env.CAMPUS_COPILOT_SUPPORT_BUNDLE_KEEP, DEFAULT_SUPPORT_BUNDLE_RETENTION_COUNT),
    tempRoots: collectTempRoots(env),
  };
}

export const getCacheGovernancePolicy = resolveCacheGovernancePolicy;

export function summarizeCachePolicy(policy) {
  return {
    cacheHome: policy.cacheHome,
    externalCacheHome: policy.externalCacheHome,
    managedExternalCacheRoot: policy.managedExternalCacheRoot,
    browserStateRoot: policy.browserStateRoot,
    browserUserDataRoot: policy.browserUserDataRoot,
    browserProfileDirectory: policy.browserProfileDirectory,
    browserProfileDisplayName: policy.browserProfileDisplayName,
    browserCdpPort: policy.browserCdpPort,
    runtimeCleanupMode: policy.runtimeCleanupMode,
    browserInstanceStatePath: policy.browserInstanceStatePath,
    browserSessionStatePath: policy.browserSessionStatePath,
    sourceChromeRoot: policy.sourceChromeRoot,
    sourceProfileDirectory: policy.sourceProfileDirectory,
    externalCacheTtlHours: policy.externalCacheTtlHours,
    externalCacheMaxMb: policy.externalCacheMaxMb,
    runtimeTempTtlHours: policy.runtimeTempTtlHours,
    runtimeEvidenceTtlHours: policy.runtimeEvidenceTtlHours,
    supportBundleRetentionCount: policy.supportBundleRetentionCount,
    runtimeLiveFixturesRoot: policy.runtimeLiveFixturesRoot,
    runtimeBrowserIdentityRoot: policy.runtimeBrowserIdentityRoot,
  };
}

export function cleanupRepoNamedTempResidues(policy) {
  const removed = [];
  for (const tempRoot of policy.tempRoots) {
    if (!tempRoot.exists || !existsSync(tempRoot.path) || !statSync(tempRoot.path).isDirectory()) {
      continue;
    }
    for (const entry of readdirSync(tempRoot.path)) {
      if (!entry.startsWith('campus-copilot-')) {
        continue;
      }
      const path = join(tempRoot.path, entry);
      removed.push({
        path,
        sizeKb: getEntrySizeKb(path),
        tempRoot: tempRoot.path,
        source: tempRoot.source,
      });
      removePath(path);
    }
  }
  return removed;
}

export function cleanupRuntimeArtifacts(policy) {
  const closeoutMode = policy.runtimeCleanupMode === 'closeout';
  if (closeoutMode) {
    return {
      removedTopLevelDebugFiles: [],
      removedSupportBundles: [],
      removedRawEntries: [],
      removedTempEntries: [],
      removedBrowserEvidenceEntries: [],
      removedLiveTraceEntries: [],
      removedLiveFixtureEntries: [],
      removedBrowserIdentityEntries: [],
      removedCoverageArtifacts: [],
      removedCloseoutEntries: removeDirectoryChildren(policy.runtimeCacheRoot),
    };
  }

  return {
    removedTopLevelDebugFiles: removeTopLevelRuntimeDebugFiles(policy.runtimeCacheRoot),
    removedSupportBundles: trimSupportBundles(policy.runtimeCacheRoot, policy.supportBundleRetentionCount),
    removedRawEntries: removeDirectoryChildren(policy.runtimeRawRoot),
    removedTempEntries: pruneDirectoryChildrenByAge(policy.runtimeTempRoot, policy.runtimeTempTtlHours),
    removedBrowserEvidenceEntries: pruneDirectoryChildrenByAge(policy.runtimeBrowserEvidenceRoot, policy.runtimeEvidenceTtlHours),
    removedLiveTraceEntries: pruneDirectoryChildrenByAge(policy.runtimeLiveTraceRoot, policy.runtimeEvidenceTtlHours),
    removedLiveFixtureEntries: [],
    removedBrowserIdentityEntries: [],
    removedCoverageArtifacts: trimCoverageArtifacts(policy.runtimeCoverageRoot),
    removedCloseoutEntries: [],
  };
}

export function cleanupExternalCache(policy) {
  ensureDirectory(policy.managedExternalCacheRoot);
  return {
    removedExpiredEntries: pruneDirectoryChildrenByAge(
      policy.managedExternalCacheRoot,
      policy.externalCacheTtlHours,
      Date.now(),
      { excludedNames: policy.managedExternalCacheExcludedNames },
    ),
    removedCapEntries: enforceSizeCap(
      policy.managedExternalCacheRoot,
      policy.externalCacheMaxMb,
      { excludedNames: policy.managedExternalCacheExcludedNames },
    ),
  };
}

export const enforceExternalCachePolicy = cleanupExternalCache;

function findChromeProcessesByUserDataDir(rawChromeProcessList, targetUserDataDir) {
  const target = normalizeDirectoryPath(targetUserDataDir);
  if (!target) {
    return [];
  }

  return parseRemoteChromeProcesses(rawChromeProcessList).flatMap((processInfo) => {
    const userDataDir = normalizeDirectoryPath(processInfo.userDataDir);
    if (userDataDir !== target) {
      return [];
    }
    return [
      {
        pid: processInfo.pid,
        profileDirectory: processInfo.profileDirectory,
        remoteDebuggingPort: processInfo.port,
        userDataDir: processInfo.userDataDir,
      },
    ];
  });
}

export function detectProcessesUsingPath(rawChromeProcessList, targetUserDataDir) {
  return findChromeProcessesByUserDataDir(rawChromeProcessList, targetUserDataDir);
}

export function detectLegacyBrowserRootUsage(rawChromeProcessList = '', env = process.env, options = {}) {
  const homeDir = options.homeDir ?? getHomeDir(env);
  return LEGACY_BROWSER_ROOTS.map((entry) => {
    const path = join(homeDir, entry.pathSuffix);
    const sizeKb = getEntrySizeKb(path);
    return {
      label: entry.label,
      path,
      exists: existsSync(path),
      inUseByChrome: findChromeProcessesByUserDataDir(rawChromeProcessList, path).length > 0,
      sizeKb,
      size: formatSize(sizeKb),
      mtime: getMtime(path),
      notes: entry.notes,
    };
  });
}

export function getRepoBrowserRootStatus(rawChromeProcessList = '', policy) {
  const processes = findChromeProcessesByUserDataDir(rawChromeProcessList, policy.browserUserDataRoot);
  const repoOwnedInstance = processes.find(
    (entry) =>
      entry.profileDirectory === policy.browserProfileDirectory &&
      entry.remoteDebuggingPort === policy.browserCdpPort,
  );
  return {
    browserUserDataRoot: policy.browserUserDataRoot,
    browserProfileDirectory: policy.browserProfileDirectory,
    browserCdpPort: policy.browserCdpPort,
    localStateExists: existsSync(policy.browserLocalStatePath),
    profileExists: existsSync(policy.browserProfilePath),
    bootstrapped: existsSync(policy.browserLocalStatePath) && existsSync(policy.browserProfilePath),
    processCount: processes.length,
    repoOwnedInstanceRunning: Boolean(repoOwnedInstance),
    foreignOccupancy: processes.length > 0 && !repoOwnedInstance,
    processes,
  };
}

export function removeBrowserSingletonArtifacts(browserUserDataRoot) {
  const removed = [];
  for (const filename of BROWSER_LOCK_FILENAMES) {
    const target = join(browserUserDataRoot, filename);
    if (!existsSync(target)) {
      continue;
    }
    removed.push(target);
    removePath(target);
  }
  return removed;
}

export const clearBrowserLockArtifacts = removeBrowserSingletonArtifacts;

export function readJsonIfPresent(path) {
  if (!existsSync(path)) {
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

export const readJsonFile = readJsonIfPresent;

export function writeJson(path, payload) {
  ensureDirectory(dirname(path));
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export const writeJsonFile = writeJson;

export function writeBrowserInstanceState(browserHome, payload) {
  const path = join(browserHome, 'instance.json');
  writeJson(path, payload);
  return path;
}

export function readBrowserInstanceState(browserHome) {
  return readJsonIfPresent(join(browserHome, 'instance.json'));
}

export function writeBrowserSessionState(browserHome, payload) {
  const path = join(browserHome, 'session-state.json');
  writeJson(path, payload);
  return path;
}

export function readBrowserSessionState(browserHome) {
  return readJsonIfPresent(join(browserHome, 'session-state.json'));
}

export function isBrowserRootBootstrapped(policy) {
  return {
    ok: existsSync(policy.browserLocalStatePath) && existsSync(policy.browserProfilePath),
    localStatePath: policy.browserLocalStatePath,
    profilePath: policy.browserProfilePath,
    hasLocalState: existsSync(policy.browserLocalStatePath),
    hasProfileDirectory: existsSync(policy.browserProfilePath),
  };
}

export function isPidRunning(pid) {
  const parsed = Number.parseInt(String(pid ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return false;
  }
  const result = spawnSync('kill', ['-0', String(parsed)], { stdio: 'ignore' });
  return result.status === 0;
}

export function readBrowserInstanceMetadata(browserHome) {
  return readJsonIfPresent(join(browserHome, 'instance.json'));
}

export function buildBootstrappedLocalState(sourceLocalState, targetProfileDirectory, targetDisplayName, sourceProfileDirectory) {
  const nextState = structuredClone(sourceLocalState);
  const sourceInfo = nextState?.profile?.info_cache?.[sourceProfileDirectory] ?? {};

  nextState.profile ??= {};
  nextState.profile.info_cache = {
    [targetProfileDirectory]: {
      ...sourceInfo,
      name: targetDisplayName,
    },
  };
  nextState.profile.last_used = targetProfileDirectory;
  nextState.profile.last_active_profiles = [targetProfileDirectory];
  nextState.profile.profiles_order = [targetProfileDirectory];
  return nextState;
}

export function copyChromeProfileDirectory(sourceProfilePath, targetProfilePath) {
  cpSync(sourceProfilePath, targetProfilePath, {
    recursive: true,
    errorOnExist: false,
    filter: (source) => !BROWSER_LOCK_FILENAMES.includes(source.split('/').at(-1) ?? ''),
  });
}

export function collectChromeProcessList() {
  const result = spawnSync('ps', ['-ax', '-o', 'pid=,command='], {
    encoding: 'utf8',
  });
  return result.status === 0 ? result.stdout : '';
}

export const getChromeProcessList = collectChromeProcessList;
