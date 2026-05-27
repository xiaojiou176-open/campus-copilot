import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();

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

function isPathUnder(rootPath, candidatePath) {
  return candidatePath === rootPath || candidatePath.startsWith(`${rootPath}/`);
}

const modulesYamlPath = join(repoRoot, 'node_modules/.modules.yaml');
const configuredStoreDir = run('pnpm', ['config', 'get', 'store-dir', '--location', 'project']);
const effectiveStoreDir = run('pnpm', ['store', 'path']);
const recordedInstallStoreDir = existsSync(modulesYamlPath)
  ? (readFileSync(modulesYamlPath, 'utf8').match(/^\s*storeDir:\s*(.+)$/m)?.[1]?.trim() ?? null)
  : null;

const failures = [];

if (!configuredStoreDir || configuredStoreDir === 'undefined') {
  failures.push('configured_store_dir_unset');
} else if (!existsSync(configuredStoreDir)) {
  failures.push(`configured_store_dir_missing:${configuredStoreDir}`);
}

if (!effectiveStoreDir) {
  failures.push('effective_store_dir_missing');
} else if (!existsSync(effectiveStoreDir)) {
  failures.push(`effective_store_dir_missing:${effectiveStoreDir}`);
}

if (!recordedInstallStoreDir) {
  failures.push(`recorded_install_store_dir_missing:${modulesYamlPath}`);
} else if (!existsSync(recordedInstallStoreDir)) {
  failures.push(`recorded_install_store_dir_missing:${recordedInstallStoreDir}`);
}

if (
  configuredStoreDir &&
  configuredStoreDir !== 'undefined' &&
  effectiveStoreDir &&
  !isPathUnder(configuredStoreDir, effectiveStoreDir)
) {
  failures.push(`configured_root_mismatch:configured=${configuredStoreDir}:effective=${effectiveStoreDir}`);
}

if (effectiveStoreDir && recordedInstallStoreDir && effectiveStoreDir !== recordedInstallStoreDir) {
  failures.push(`store_dir_drift:effective=${effectiveStoreDir}:recorded=${recordedInstallStoreDir}`);
}

const payload = {
  status: failures.length > 0 ? 'blocked' : 'ok',
  configuredStoreDir: configuredStoreDir && configuredStoreDir !== 'undefined' ? configuredStoreDir : null,
  configuredStoreDirExists:
    Boolean(configuredStoreDir) && configuredStoreDir !== 'undefined' && existsSync(configuredStoreDir),
  effectiveStoreDir: effectiveStoreDir || null,
  effectiveStoreDirExists: Boolean(effectiveStoreDir) && existsSync(effectiveStoreDir),
  recordedInstallStoreDir,
  recordedInstallStoreDirExists: Boolean(recordedInstallStoreDir) && existsSync(recordedInstallStoreDir),
  failures,
  nextStep:
    failures.length > 0
      ? 'Fix pnpm store truth before deleting node_modules or relying on a deep dependency rebuild lane.'
      : 'pnpm store truth is aligned; deep node_modules cleanup lane is unblocked.',
};

console.log(JSON.stringify(payload, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
