import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildBootstrappedLocalState,
  copyChromeProfileDirectory,
  ensureDirectory,
  getBrowserBootstrapPlan,
  getChromeProcessList,
  getRepoBrowserRootStatus,
  removeBrowserSingletonArtifacts,
} from './lib/cache-governance.mjs';

function parseArgs(argv) {
  const flags = new Set();
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      flags.add(arg);
    }
  }
  return {
    apply: flags.has('--apply'),
    force: flags.has('--force'),
    dryRun: flags.has('--dry-run'),
  };
}

function listSingletonArtifacts(rootPath) {
  if (!existsSync(rootPath) || !statSync(rootPath).isDirectory()) {
    return [];
  }
  return readdirSync(rootPath)
    .filter((entry) => entry.startsWith('Singleton') || entry === 'DevToolsActivePort')
    .map((entry) => join(rootPath, entry));
}

const args = parseArgs(process.argv.slice(2));
const plan = getBrowserBootstrapPlan(process.env);
const chromeProcessList = getChromeProcessList();
const sourceRootStatus = getRepoBrowserRootStatus(chromeProcessList, {
  browserUserDataRoot: plan.sourceChromeRoot,
  browserProfileDirectory: plan.sourceProfileDirectory,
  browserCdpPort: undefined,
  browserLocalStatePath: plan.sourceLocalStatePath,
  browserProfilePath: plan.sourceProfilePath,
});
const sourceSingletonArtifacts = listSingletonArtifacts(plan.sourceChromeRoot);
const targetExists =
  existsSync(plan.targetLocalStatePath) || existsSync(plan.targetProfilePath);

const summary = {
  sourceChromeRoot: plan.sourceChromeRoot,
  sourceProfileDirectory: plan.sourceProfileDirectory,
  sourceLocalStatePath: plan.sourceLocalStatePath,
  sourceProfilePath: plan.sourceProfilePath,
  targetBrowserRoot: plan.targetBrowserRoot,
  targetUserDataRoot: plan.targetUserDataRoot,
  targetLocalStatePath: plan.targetLocalStatePath,
  targetProfileDirectory: plan.targetProfileDirectory,
  targetProfilePath: plan.targetProfilePath,
  profileDisplayName: plan.profileDisplayName,
  browserCdpPort: plan.browserCdpPort,
  sourceLocalStateExists: existsSync(plan.sourceLocalStatePath),
  sourceProfileExists: existsSync(plan.sourceProfilePath),
  sourceSingletonArtifacts,
  sourceRootStatus,
  targetExists,
  applyRequested: args.apply,
  forceRequested: args.force,
};

if (!args.apply || args.dryRun) {
  console.log(
    JSON.stringify(
      {
        status: 'dry_run',
        summary,
        notes: [
          'This script only copies Local State plus one source profile directory.',
          'It will rewrite the copied profile to Profile 1 and remove Singleton*/DevToolsActivePort in the target root.',
          'Re-run with --apply to perform the migration.',
        ],
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (!existsSync(plan.sourceLocalStatePath) || !existsSync(plan.sourceProfilePath)) {
  console.log(
    JSON.stringify(
      {
        status: 'blocked',
        blocked: 'source_profile_missing',
        summary,
        nextActions: [
          'Confirm the source Chrome root and source profile directory exist before bootstrapping.',
        ],
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

if (sourceRootStatus.processCount > 0) {
  console.log(
    JSON.stringify(
      {
        status: 'blocked',
        blocked: 'source_chrome_root_still_active',
        summary,
        nextActions: [
          'Close all Chrome instances that still use the default Chrome root before bootstrapping.',
          'Stale source-side Singleton*/DevToolsActivePort markers may remain after shutdown; they are reported but do not block bootstrap once no Chrome process is using the source root.',
        ],
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

if (targetExists && !args.force) {
  console.log(
    JSON.stringify(
      {
        status: 'blocked',
        blocked: 'target_browser_root_already_exists',
        summary,
        nextActions: [
          'Inspect the existing repo-owned browser root before overwriting it.',
          'Re-run with --force only if you intentionally want to replace the current target root.',
        ],
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

if (args.force && existsSync(plan.targetUserDataRoot)) {
  rmSync(plan.targetUserDataRoot, { recursive: true, force: true });
}

ensureDirectory(plan.targetUserDataRoot);

const sourceLocalState = JSON.parse(readFileSync(plan.sourceLocalStatePath, 'utf8'));
const targetLocalState = buildBootstrappedLocalState(
  sourceLocalState,
  plan.targetProfileDirectory,
  plan.profileDisplayName,
  plan.sourceProfileDirectory,
);

writeFileSync(plan.targetLocalStatePath, JSON.stringify(targetLocalState, null, 2), 'utf8');
copyChromeProfileDirectory(plan.sourceProfilePath, plan.targetProfilePath);
const removedArtifacts = removeBrowserSingletonArtifacts(plan.targetUserDataRoot);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      migrated: {
        targetUserDataRoot: plan.targetUserDataRoot,
        targetProfileDirectory: plan.targetProfileDirectory,
        targetProfilePath: plan.targetProfilePath,
        profileDisplayName: plan.profileDisplayName,
      },
      copied: {
        localState: plan.targetLocalStatePath,
        profileDirectory: plan.targetProfilePath,
      },
      removedArtifacts,
    },
    null,
    2,
  ),
);
