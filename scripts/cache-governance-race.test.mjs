import test from 'node:test';
import assert from 'node:assert/strict';
import fs, { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { syncBuiltinESMExports } from 'node:module';
import { getImmediateChildren } from './lib/cache-governance.mjs';

test('getImmediateChildren tolerates entries that disappear between readdir and stat', () => {
  const root = mkdtempSync(join(tmpdir(), 'campus-cache-race-'));
  const stablePath = join(root, 'stable.txt');
  const vanishedPath = join(root, 'vanished.txt');
  writeFileSync(stablePath, 'stable', 'utf8');
  writeFileSync(vanishedPath, 'vanished', 'utf8');

  const originalStatSync = fs.statSync;
  const originalLstatSync = fs.lstatSync;
  let raced = false;

  try {
    fs.statSync = ((targetPath, ...args) => {
      if (!raced && targetPath === vanishedPath) {
        raced = true;
        rmSync(vanishedPath, { force: true });
      }
      return originalStatSync.call(fs, targetPath, ...args);
    });
    fs.lstatSync = ((targetPath, ...args) => {
      return originalLstatSync.call(fs, targetPath, ...args);
    });
    syncBuiltinESMExports();

    const children = getImmediateChildren(root);

    assert.deepEqual(children, [stablePath]);
  } finally {
    fs.statSync = originalStatSync;
    fs.lstatSync = originalLstatSync;
    syncBuiltinESMExports();
    rmSync(root, { recursive: true, force: true });
  }
});
