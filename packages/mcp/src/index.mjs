export const SITE_MCP_BINARIES = {
  canvas: 'campus-copilot-mcp-canvas',
  gradescope: 'campus-copilot-mcp-gradescope',
  edstem: 'campus-copilot-mcp-edstem',
  myuw: 'campus-copilot-mcp-myuw',
  'time-schedule': 'campus-copilot-mcp-time-schedule',
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
    CAMPUS_COPILOT_SNAPSHOT: snapshotPath,
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
    args: ['--dir', repoRoot, '--filter', '@campus-copilot/mcp-readonly', script],
    env: createSnapshotEnv(snapshotPath),
  };
}

export function createRepoRootMcpServerConfig(repoRoot) {
  return {
    command: 'pnpm',
    args: ['--dir', repoRoot, '--filter', '@campus-copilot/mcp-server', 'start'],
  };
}
