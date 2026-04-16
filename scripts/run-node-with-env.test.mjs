import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { loadRepoEnv, parseDotenvEntries } from './run-node-with-env.mjs';

test('parseDotenvEntries parses basic key/value pairs', () => {
  const entries = parseDotenvEntries(`
# comment
FOO=bar
BAR="baz qux"
BAZ='zip zap'
QUX=value # trailing comment
`);

  assert.deepEqual(entries, [
    ['FOO', 'bar'],
    ['BAR', 'baz qux'],
    ['BAZ', 'zip zap'],
    ['QUX', 'value'],
  ]);
});

test('loadRepoEnv does not overwrite existing process env values', () => {
  const cwd = process.cwd();
  const tempDir = mkdtempSync(join(tmpdir(), 'cc-env-loader-'));
  const envPath = join(tempDir, '.env');
  const original = process.env.TEST_RUN_NODE_WITH_ENV;

  try {
    writeFileSync(envPath, 'TEST_RUN_NODE_WITH_ENV=from-file\n', 'utf8');
    process.chdir(tempDir);
    process.env.TEST_RUN_NODE_WITH_ENV = 'from-process';
    loadRepoEnv(envPath);
    assert.equal(process.env.TEST_RUN_NODE_WITH_ENV, 'from-process');
  } finally {
    process.chdir(cwd);
    if (original === undefined) {
      delete process.env.TEST_RUN_NODE_WITH_ENV;
    } else {
      process.env.TEST_RUN_NODE_WITH_ENV = original;
    }
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('run-node-with-env loads .env and forwards argv to the target script', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'cc-env-runner-'));
  const envPath = join(tempDir, '.env');
  const targetPath = join(tempDir, 'echo-env.mjs');
  const runnerPath = resolve(process.cwd(), 'scripts/run-node-with-env.mjs');

  try {
    writeFileSync(envPath, 'TEST_RUN_NODE_WITH_ENV=from-file\n', 'utf8');
    writeFileSync(
      targetPath,
      `
console.log(JSON.stringify({
  envValue: process.env.TEST_RUN_NODE_WITH_ENV,
  argv: process.argv.slice(2),
}));
`,
      'utf8',
    );

    const result = spawnSync(process.execPath, [runnerPath, 'echo-env.mjs', '--flag', 'value'], {
      cwd: tempDir,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout.trim()), {
      envValue: 'from-file',
      argv: ['--flag', 'value'],
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
