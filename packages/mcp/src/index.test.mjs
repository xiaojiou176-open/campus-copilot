import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SITE_MCP_BINARIES,
  SITE_MCP_START_SCRIPTS,
  createRepoRootMcpServerConfig,
  createRepoRootSiteMcpConfig,
  createSiteMcpConfig,
  listSupportedSiteMcpServers,
} from './index.mjs';

test('lists the five supported site MCP entrypoints', () => {
  assert.deepEqual(listSupportedSiteMcpServers(), ['canvas', 'gradescope', 'edstem', 'myuw', 'time-schedule']);
  assert.equal(SITE_MCP_BINARIES.canvas, 'campus-copilot-mcp-canvas');
});

test('builds a snapshot-backed MCP config for one site', () => {
  const config = createSiteMcpConfig('canvas', '/tmp/workspace-snapshot.json');

  assert.deepEqual(config, {
    command: 'campus-copilot-mcp-canvas',
    env: {
      CAMPUS_COPILOT_SNAPSHOT: '/tmp/workspace-snapshot.json',
    },
  });
});

test('builds a repo-root runnable site MCP config for one site', () => {
  const config = createRepoRootSiteMcpConfig('canvas', '/tmp/workspace-snapshot.json', '/repo/campus-copilot');

  assert.equal(SITE_MCP_START_SCRIPTS.canvas, 'start:canvas');
  assert.deepEqual(config, {
    command: 'pnpm',
    args: ['--dir', '/repo/campus-copilot', '--filter', '@campus-copilot/mcp-readonly', 'start:canvas'],
    env: {
      CAMPUS_COPILOT_SNAPSHOT: '/tmp/workspace-snapshot.json',
    },
  });
});

test('builds a repo-root runnable combined MCP server config', () => {
  const config = createRepoRootMcpServerConfig('/repo/campus-copilot');

  assert.deepEqual(config, {
    command: 'pnpm',
    args: ['--dir', '/repo/campus-copilot', '--filter', '@campus-copilot/mcp-server', 'start'],
  });
});
