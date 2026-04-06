import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readJson,
  runChecks,
  validateGenericConfig,
  validatePackageReadmes,
  validateSidecarConfig,
} from './check-consumer-surfaces.mjs';

test('generic consumer examples stay on the unified read-only MCP server path', () => {
  const json = readJson('examples/integrations/codex-mcp.example.json');
  assert.deepEqual(validateGenericConfig('examples/integrations/codex-mcp.example.json', json), []);
});

test('shell-wrapped generic consumer examples stay on the same read-only MCP server path', () => {
  const json = readJson('examples/integrations/codex-mcp-shell.example.json');
  assert.deepEqual(validateGenericConfig('examples/integrations/codex-mcp-shell.example.json', json), []);
});

test('sidecar consumer examples keep snapshot env placeholders and known commands', () => {
  const json = readJson('examples/mcp/codex.example.json');
  assert.deepEqual(validateSidecarConfig('examples/mcp/codex.example.json', json), []);
});

test('repo-root sidecar consumer examples stay runnable without globally installed sidecar bins', () => {
  const json = readJson('examples/mcp/codex-repo-root.example.json');
  assert.deepEqual(validateSidecarConfig('examples/mcp/codex-repo-root.example.json', json), []);
});

test('package readmes keep the promised consumer entrypoint hints', () => {
  assert.deepEqual(validatePackageReadmes(), []);
});

test('toolbox chooser stays wired into the consumer routing surface', () => {
  const failures = runChecks().filter((entry) => entry.includes('toolbox-chooser.md'));
  assert.deepEqual(failures, []);
});

test('consumer surface inventory remains consistent', () => {
  assert.deepEqual(runChecks(), []);
});
