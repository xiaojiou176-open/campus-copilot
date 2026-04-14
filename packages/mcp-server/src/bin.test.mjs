import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('mcp-server bin exposes a help surface', () => {
  const result = spawnSync(process.execPath, ['./dist/bin.mjs', '--help'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: campus-copilot-mcp/);
  assert.match(result.stdout, /read-only/);
});

test('mcp-server bin exposes the package version', () => {
  const result = spawnSync(process.execPath, ['./dist/bin.mjs', '--version'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '0.1.1');
});
