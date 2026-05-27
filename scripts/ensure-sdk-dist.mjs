import { spawnSync } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import {
  accessSync,
  closeSync,
  mkdirSync,
  openSync,
  rmSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);
const sdkDistDir = join(repoRoot, 'packages', 'sdk', 'dist');
const expectedArtifacts = [
  join(sdkDistDir, 'index.js'),
  join(sdkDistDir, 'api.js'),
  join(sdkDistDir, 'snapshot.js'),
  join(sdkDistDir, 'sites.js'),
];
const lockDir = join(repoRoot, '.runtime-cache', 'temp');
const lockPath = join(lockDir, 'ensure-sdk-dist.lock');
const waitTimeoutMs = 30_000;
const waitStepMs = 100;

function sdkDistReady() {
  try {
    for (const artifact of expectedArtifacts) {
      accessSync(artifact, fsConstants.R_OK);
    }
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForExistingBuild() {
  const deadline = Date.now() + waitTimeoutMs;
  while (Date.now() < deadline) {
    if (sdkDistReady()) {
      return;
    }
    sleep(waitStepMs);
  }
  throw new Error('sdk_dist_wait_timeout');
}

function buildSdkDist() {
  const result = spawnSync('pnpm', ['--filter', '@campus-copilot/sdk', 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  if (!sdkDistReady()) {
    throw new Error('sdk_dist_missing_after_build');
  }
}

if (sdkDistReady()) {
  process.exit(0);
}

mkdirSync(lockDir, { recursive: true });

let lockFd;
try {
  lockFd = openSync(lockPath, 'wx');
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
    waitForExistingBuild();
    process.exit(0);
  }
  throw error;
}

try {
  buildSdkDist();
} finally {
  if (lockFd !== undefined) {
    closeSync(lockFd);
  }
  rmSync(lockPath, { force: true });
}
