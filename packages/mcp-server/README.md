# @campus-copilot/mcp-server

Read-only MCP server for the local Campus Copilot BFF and imported workspace snapshots.

This is the generic MCP entry point used by the integration examples under `examples/integrations/`.

Use this package when you want the smallest single-server entry point for Codex / Claude Code-style local MCP workflows.

If you are still choosing between the generic MCP server, site sidecars, CLI, or SDK surfaces, start with [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md) first.

## Install

Current install status: repo-local public surface with a bundled JS server artifact. The official MCP Registry lane now uses a GitHub release-hosted `.mcpb` bundle for this server; discovery-page read-back is still a separate proof step.

From the repo root:

```bash
pnpm install
pnpm --filter @campus-copilot/mcp-server build
pnpm start:mcp
```

Shared public-preview proof loop from the repo root:

```bash
pnpm proof:public
```

First command to try:

```bash
pnpm --filter @campus-copilot/mcp-server start
```

Registry-unblock progress in this repo:

- the published bin now targets a bundled `dist/bin.mjs` artifact instead of a raw TypeScript entrypoint
- the registry path now ships a release-hosted `.mcpb` bundle instead of relying on a public npm scope that does not exist
- preregistry metadata now lives beside the package in [`server.json`](./server.json) and the package-level `mcpName`
- the bundle manifest now lives in [`mcpb.manifest.json`](./mcpb.manifest.json)
- repo-side submit-ready fields now also live in [`registry-submission.packet.json`](./registry-submission.packet.json)
- the public distribution router lives in [`../../DISTRIBUTION.md`](../../DISTRIBUTION.md)
- registry discovery-page read-back is still a separate upstream step; this README does not imply the listing UI has already been re-read

Registry preflight proof from the repo root:

```bash
pnpm check:mcp-registry-preflight
```

That preflight checks the late-stage alignment work that tends to drift:

- `package.json#mcpName`
- `server.json` release asset URL / SHA / transport alignment
- `mcpb.manifest.json` version and entry-point alignment
- the monorepo `subfolder` path
- example config plus truthful install wording
- the repo-owned submission packet that the owner can reuse later

Related public distribution doc:

- [`../../DISTRIBUTION.md`](../../DISTRIBUTION.md)

## Pair It With The Container Path

The current Docker surface is intentionally the **thin local BFF**, not this
stdio server itself.

That split is on purpose:

- the stdio MCP server stays the local read-only MCP entrypoint
- the Docker path gives the repo one truthful HTTP and health-check surface
- together they keep the product local-first instead of pretending Campus Copilot is a hosted MCP service

Build the containerized BFF from the repo root:

```bash
docker build -t campus-copilot-api:local .
docker compose up -d campus-copilot-api
```

Use the container path when you need a local HTTP surface or container-friendly
healthcheck.
Keep using this package when you need the local stdio MCP server.
If you want the shortest rule in one sentence: pair it with the local stdio MCP server, and treat the Docker route as a local HTTP helper, not a hosted API.

You can also launch the local container directly without Compose:

```bash
docker run --rm -p 8787:8787 campus-copilot-api:local
```

## Current tools

- `campus_health`
- `providers_status`
- `ask_campus_copilot`
- `canvas_snapshot_view`
- `gradescope_snapshot_view`
- `edstem_snapshot_view`
- `myuw_snapshot_view`
- `export_snapshot_artifact`

## Boundary

- local-first
- read-only
- stdio
- snapshot-first or thin-BFF-first
- not a hosted MCP service
- not a hosted API
- not a live-browser control plane
- not a campus-site mutation surface
- not a registration-automation surface
- not a raw course-file AI upload surface

Use the same academic safety contract here as everywhere else:

- [`../../docs/17-academic-expansion-and-safety-contract.md`](../../docs/17-academic-expansion-and-safety-contract.md)

## See also

- [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md)
- [`../../examples/integrations/README.md`](../../examples/integrations/README.md)
- [`../../examples/integrations/codex-mcp.example.json`](../../examples/integrations/codex-mcp.example.json)
- [`../../examples/integrations/codex-mcp-shell.example.json`](../../examples/integrations/codex-mcp-shell.example.json)
- [`../../examples/integrations/claude-code-mcp.example.json`](../../examples/integrations/claude-code-mcp.example.json)
- [`../../examples/integrations/claude-code-mcp-shell.example.json`](../../examples/integrations/claude-code-mcp-shell.example.json)
- [`../../examples/openclaw-readonly.md`](../../examples/openclaw-readonly.md)
