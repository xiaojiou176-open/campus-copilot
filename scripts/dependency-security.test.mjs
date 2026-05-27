import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const lockfile = readFileSync(join(repoRoot, 'pnpm-lock.yaml'), 'utf8');

function parseVersion(input) {
  return String(input)
    .trim()
    .replace(/^[^\d]*/, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
}

function assertVersionAtLeast(actual, minimum) {
  const actualParts = parseVersion(actual);
  const minimumParts = parseVersion(minimum);
  const length = Math.max(actualParts.length, minimumParts.length);

  for (let index = 0; index < length; index += 1) {
    const actualPart = actualParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;
    if (actualPart > minimumPart) {
      return;
    }
    if (actualPart < minimumPart) {
      assert.fail(`expected version ${actual} to be >= ${minimum}`);
    }
  }
}

test('root pnpm override keeps defu on a patched version', () => {
  const override = packageJson?.pnpm?.overrides?.defu;
  assert.ok(override, 'expected package.json to pin pnpm.overrides.defu');
  assertVersionAtLeast(override, '6.1.5');
});

test('lockfile no longer contains the vulnerable defu release', () => {
  assert.equal(
    /\bdefu@6\.1\.4\b/.test(lockfile),
    false,
    'expected pnpm-lock.yaml to stop resolving defu 6.1.4',
  );
});

test('wxt dependency chain resolves defu to a patched version in the lockfile', () => {
  const wxtSnapshot = lockfile.match(/wxt@0\.[\s\S]*?\n {4}dependencies:\n([\s\S]*?)\n {2}[^\s]/);
  assert.ok(wxtSnapshot, 'expected to find the wxt dependency snapshot in pnpm-lock.yaml');

  const defuLine = wxtSnapshot[1]
    .split('\n')
    .find((line) => line.trim().startsWith('defu:'));

  assert.ok(defuLine, 'expected the wxt snapshot to include defu');
  const resolvedVersion = defuLine.split(':').slice(1).join(':').trim();
  assertVersionAtLeast(resolvedVersion, '6.1.5');
});

test('lockfile no longer contains the vulnerable @eslint/plugin-kit release', () => {
  assert.equal(
    /@eslint\/plugin-kit@0\.2\.8/.test(lockfile),
    false,
    'expected pnpm-lock.yaml to stop resolving @eslint/plugin-kit 0.2.8',
  );
});

test('eslint dependency chains resolve @eslint/plugin-kit to a patched version in the lockfile', () => {
  const vulnerableSnapshots = Array.from(
    lockfile.matchAll(/eslint@9\.[\s\S]*?\n {4}dependencies:\n([\s\S]*?)\n {2}[^\s]/g),
  );
  assert.ok(vulnerableSnapshots.length > 0, 'expected to find eslint@9 dependency snapshots in pnpm-lock.yaml');

  for (const snapshot of vulnerableSnapshots) {
    const pluginKitLine = snapshot[1]
      .split('\n')
      .find((line) => line.trim().startsWith('@eslint/plugin-kit:'));

    if (!pluginKitLine) {
      continue;
    }

    const resolvedVersion = pluginKitLine.split(':').slice(1).join(':').trim();
    assertVersionAtLeast(resolvedVersion, '0.3.4');
  }
});
