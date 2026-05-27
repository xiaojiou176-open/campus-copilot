export const SITE_MCP_BINARIES = {
  canvas: 'opencampus-mcp-canvas',
  gradescope: 'opencampus-mcp-gradescope',
  edstem: 'opencampus-mcp-edstem',
  myuw: 'opencampus-mcp-myuw',
  'time-schedule': 'opencampus-mcp-time-schedule',
};

export const SITE_MCP_START_SCRIPTS = {
  canvas: 'start:canvas',
  gradescope: 'start:gradescope',
  edstem: 'start:edstem',
  myuw: 'start:myuw',
  'time-schedule': 'start:time-schedule',
};

export function listSupportedSiteMcpServers() {
  return Object.keys(SITE_MCP_BINARIES);
}

export function createSnapshotEnv(snapshotPath) {
  return {
    OPENCAMPUS_SNAPSHOT: snapshotPath,
  };
}

export function createSiteMcpConfig(site, snapshotPath) {
  const command = SITE_MCP_BINARIES[site];
  if (!command) {
    throw new Error(`Unsupported site MCP: ${site}`);
  }

  return {
    command,
    env: createSnapshotEnv(snapshotPath),
  };
}

export function createRepoRootSiteMcpConfig(site, snapshotPath, repoRoot) {
  const script = SITE_MCP_START_SCRIPTS[site];
  if (!script) {
    throw new Error(`Unsupported site MCP: ${site}`);
  }

  return {
    command: 'pnpm',
    args: ['--dir', repoRoot, '--filter', '@opencampus/mcp-readonly', script],
    env: createSnapshotEnv(snapshotPath),
  };
}

export function createRepoRootMcpServerConfig(repoRoot) {
  return {
    command: 'pnpm',
    args: ['--dir', repoRoot, '--filter', '@opencampus/mcp-server', 'start'],
  };
}
