# @opencampus/mcp-readonly

Read-only MCP sidecars for OpenCampus snapshot workflows.

Use this package when you only need one site's records and do not want the larger generic MCP server surface.

If you are still choosing between site sidecars, the generic MCP server, CLI, or SDK surfaces, start with [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md) first.

## Install

Current install status: repo-local public-ready sidecar candidate with bundled `dist/*.js` artifacts. Do not assume hosted MCP distribution or marketplace-style plugin publication from this README alone.

From the repo root:

```bash
pnpm install
pnpm --filter @opencampus/mcp-readonly build
pnpm --filter @opencampus/mcp-readonly test
```

Shared public-preview proof loop from the repo root:

```bash
pnpm proof:public
```

First file to try:

- [`../../examples/mcp/README.md`](../../examples/mcp/README.md)

Repo-root runnable sidecar:

```bash
export OPENCAMPUS_SNAPSHOT="$PWD/examples/workspace-snapshot.sample.json"
pnpm --filter @opencampus/mcp-readonly start:canvas
```

Registry-unblock progress in this repo:

- the published sidecar bins now target bundled `dist/*.js` artifacts instead of raw source entrypoints
- this package no longer depends on private workspace packages at runtime
- official listing is still a separate upstream step; this README does not imply it has already happened

Each binary exposes site-filtered tools over an exported OpenCampus workspace snapshot:

- `opencampus-mcp-canvas`
- `opencampus-mcp-gradescope`
- `opencampus-mcp-edstem`
- `opencampus-mcp-myuw`

The MCP surface is intentionally narrow:

- `get_site_overview`
- `list_assignments`
- `list_messages`
- `list_events`

These sidecars do not open browser sessions, do not mutate site state, and do not pretend private/session-backed site collectors are public APIs.

## See also

- [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md)
- [`../../examples/mcp/codex.example.json`](../../examples/mcp/codex.example.json)
- [`../../examples/mcp/claude-desktop.example.json`](../../examples/mcp/claude-desktop.example.json)
- [`../../examples/mcp/codex-repo-root.example.json`](../../examples/mcp/codex-repo-root.example.json)
- [`../../examples/mcp/claude-desktop-repo-root.example.json`](../../examples/mcp/claude-desktop-repo-root.example.json)
- [`../../examples/openclaw-readonly.md`](../../examples/openclaw-readonly.md)
- [`../../examples/integrations/README.md`](../../examples/integrations/README.md)
- [`../../skills/openclaw-readonly-consumer/SKILL.md`](../../skills/openclaw-readonly-consumer/SKILL.md)
- [`../../skills/site-mcp-consumer/SKILL.md`](../../skills/site-mcp-consumer/SKILL.md)
