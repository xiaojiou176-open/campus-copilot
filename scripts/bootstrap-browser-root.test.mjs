import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const bootstrapScript = join(repoRoot, 'scripts/bootstrap-browser-root.mjs');

function createSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'campus-browser-bootstrap-'));
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

test('browser bootstrap dry-run reports source and target without mutating target root', () => {
  const sandbox = createSandbox();

  try {
    const sourceRoot = join(sandbox.home, 'Library/Application Support/Google/Chrome');
    mkdirSync(join(sourceRoot, 'Profile 13'), { recursive: true });
    writeFileSync(join(sourceRoot, 'Local State'), JSON.stringify({
      profile: {
        info_cache: {
          'Profile 13': {
            name: 'Campus Copilot',
          },
        },
      },
    }), 'utf8');

    const result = spawnSync(process.execPath, [bootstrapScript], {
      cwd: repoRoot,
      env: {
        ...process.env,
        HOME: sandbox.home,
      },
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'dry_run');
    assert.equal(payload.summary.sourceProfileDirectory, 'Profile 13');
    assert.equal(payload.summary.targetProfileDirectory, 'Profile 1');
    assert.equal(payload.summary.profileDisplayName, 'campus-copilot');
    assert.equal(existsSync(join(sandbox.home, '.cache/campus-copilot/browser/chrome-user-data/Local State')), false);
  } finally {
    sandbox.cleanup();
  }
});

test('browser bootstrap apply copies only Local State and one profile into Profile 1', () => {
  const sandbox = createSandbox();

  try {
    const sourceRoot = join(sandbox.home, 'Library/Application Support/Google/Chrome');
    const sourceProfile = join(sourceRoot, 'Profile 13');
    mkdirSync(sourceProfile, { recursive: true });
    writeFileSync(join(sourceRoot, 'Local State'), JSON.stringify({
      profile: {
        info_cache: {
          'Profile 13': {
            name: 'Campus Copilot',
            shortcut_name: 'Campus Copilot',
          },
        },
      },
    }), 'utf8');
    writeFileSync(join(sourceProfile, 'Preferences'), '{}', 'utf8');
    writeFileSync(join(sourceProfile, 'SingletonCookie'), 'lock', 'utf8');

    const result = spawnSync(process.execPath, [bootstrapScript, '--apply'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        HOME: sandbox.home,
      },
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'ok');

    const targetRoot = join(sandbox.home, '.cache/campus-copilot/browser/chrome-user-data');
    const targetProfile = join(targetRoot, 'Profile 1');
    assert.equal(existsSync(join(targetRoot, 'Local State')), true);
    assert.equal(existsSync(join(targetProfile, 'Preferences')), true);
    assert.equal(existsSync(join(targetProfile, 'SingletonCookie')), false);

    const localState = JSON.parse(readFileSync(join(targetRoot, 'Local State'), 'utf8'));
    assert.equal(localState.profile.last_used, 'Profile 1');
    assert.equal(localState.profile.info_cache['Profile 1'].name, 'campus-copilot');
  } finally {
    sandbox.cleanup();
  }
});
