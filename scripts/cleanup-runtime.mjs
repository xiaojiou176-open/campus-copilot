import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  cleanupExternalCache,
  cleanupRepoNamedTempResidues,
  cleanupRuntimeArtifacts,
  detectLegacyBrowserRootUsage,
  getCacheGovernancePolicy,
  summarizeCachePolicy,
} from './lib/cache-governance.mjs';

const repoRoot = process.env.CAMPUS_COPILOT_REPO_ROOT ?? process.cwd();
process.chdir(repoRoot);

function collectChromeProcessList() {
  try {
    return execFileSync('ps', ['-ax', '-o', 'pid=,command='], {
      encoding: 'utf8',
    });
  } catch {
    return '';
  }
}

function deleteDsStoreFiles(rootPath, removed) {
  if (!existsSync(rootPath)) {
    return;
  }

  for (const entry of execFileSync('find', [rootPath, '-name', '.DS_Store', '-print'], {
    encoding: 'utf8',
  })
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean)) {
    execFileSync('rm', ['-f', entry]);
    removed.push({
      path: entry,
      reason: 'ds_store',
    });
  }
}

const policy = getCacheGovernancePolicy(process.env, { repoRoot });
const tempResiduesRemoved = cleanupRepoNamedTempResidues(policy);
const runtimeArtifactsRemoved = cleanupRuntimeArtifacts(policy);
const externalCache = cleanupExternalCache(policy);
const dsStoreRemoved = [];
deleteDsStoreFiles(repoRoot, dsStoreRemoved);
const legacyBrowserRoots = detectLegacyBrowserRootUsage(collectChromeProcessList(), process.env).map((entry) => ({
  ...entry,
  cleanupCandidate: entry.exists && !entry.inUseByChrome,
}));

console.log(
  JSON.stringify(
    {
      status: 'ok',
      policy: summarizeCachePolicy(policy),
      tempResiduesRemoved,
      runtimeArtifactsRemoved,
      externalCache,
      dsStoreRemoved,
      legacyBrowserRoots,
      notes: {
        runtimeLane:
          'cleanup:runtime only removes repo-named temp residues, selected .runtime-cache artifacts, and generic managed external cache entries.',
        repoSafeLane:
          'cleanup:repo:safe remains the only default lane for extension build/test intermediates.',
        legacyBrowserRoots:
          'Legacy browser roots are reported for migration hygiene only. They are never auto-deleted by cleanup:runtime.',
        browserRoot:
          'The repo-owned browser root is permanent browser state under ~/.cache/campus-copilot/browser/chrome-user-data and is excluded from generic external cache GC.',
      },
    },
    null,
    2,
  ),
);
