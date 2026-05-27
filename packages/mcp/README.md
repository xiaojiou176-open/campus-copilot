# @campus-copilot/mcp

Snapshot-first config helpers for the CampusCopilot read-only MCP preview.

This package does **not** run the MCP server by itself.  
It exists to make the repo-public MCP wiring explicit and truthful.

If you are still choosing between the generic MCP server, site sidecars, CLI, or SDK surfaces, start with [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md) first.

## Install

Current install status: repo-local preview from this monorepo. Do not assume hosted MCP infrastructure or registry publication from this README alone.

From the repo root:

```bash
pnpm install
pnpm --filter @campus-copilot/mcp test
```

Shared public-preview proof loop from the repo root:

```bash
pnpm proof:public
```

First file to try:

- [`../../examples/integrations/README.md`](../../examples/integrations/README.md)

## Current surface

- `SITE_MCP_BINARIES`
- `SITE_MCP_START_SCRIPTS`
- `listSupportedSiteMcpServers()`
- `createSnapshotEnv(snapshotPath)`
- `createSiteMcpConfig(site, snapshotPath)`
- `createRepoRootSiteMcpConfig(site, snapshotPath, repoRoot)`
- `createRepoRootMcpServerConfig(repoRoot)`

## What it is for

- building Codex / Claude-style MCP config files
- wiring one site-scoped read-only sidecar to an exported workspace snapshot
- keeping binary names and snapshot env keys in one place

## What it does not claim

- hosted MCP infrastructure
- live browser/session control
- write-capable tools

## See also

- [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md)
- [`../../examples/integrations/codex-mcp.example.json`](../../examples/integrations/codex-mcp.example.json)
- [`../../examples/integrations/codex-mcp-shell.example.json`](../../examples/integrations/codex-mcp-shell.example.json)
- [`../../examples/integrations/claude-code-mcp.example.json`](../../examples/integrations/claude-code-mcp.example.json)
- [`../../examples/integrations/claude-code-mcp-shell.example.json`](../../examples/integrations/claude-code-mcp-shell.example.json)
- [`../../examples/openclaw-readonly.md`](../../examples/openclaw-readonly.md)
- [`../../skills/openclaw-readonly-consumer/SKILL.md`](../../skills/openclaw-readonly-consumer/SKILL.md)
- [`../mcp-readonly/README.md`](../mcp-readonly/README.md)
