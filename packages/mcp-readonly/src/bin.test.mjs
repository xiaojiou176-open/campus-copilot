import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const execArgs = ['--no-warnings'];

test('site sidecar bins expose a help surface without requiring a snapshot', () => {
  const result = spawnSync(
    process.execPath,
    [...execArgs, './bin/canvas.mjs', '--help'],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: campus-copilot-mcp-canvas/);
  assert.match(result.stdout, /--snapshot <path>/);
});

test('site sidecar bins expose the package version', () => {
  const result = spawnSync(
    process.execPath,
    [...execArgs, './bin/canvas.mjs', '--version'],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '0.1.0');
});
