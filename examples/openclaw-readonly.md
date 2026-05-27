# OpenClaw-Style Read-Only Consumer

Use this path only when your local operator/runtime can launch a **stdio MCP server** or a **site-scoped MCP sidecar** and you want Campus Copilot to act as a **read-only academic context provider**.

This is the safe mental model:

- Campus Copilot supplies structured study context
- your local runtime decides how to consume that context
- Campus Copilot does **not** become a browser-control provider or write-capable operator plugin

## Choose the narrowest path first

| Path | Start with | Best when you want | Keep this boundary |
| :-- | :-- | :-- | :-- |
| Generic stdio MCP server | `pnpm --filter @opencampus/mcp-server start` | one read-only server that can answer health, provider, ask, snapshot-view, and export requests | keep it as a context surface, not an operator loop |
| Site-scoped sidecar | `pnpm --filter @opencampus/mcp-readonly start:<site>` | one narrow site view over one local snapshot | do not market it as a live-site plugin |
| Thin local BFF | `pnpm start:api` | local provider status or cited-AI chat on the Campus semantic contract | do not call it hosted infrastructure |

## Recommended path

### 1. Start with the generic read-only MCP server

```bash
pnpm --filter @opencampus/mcp-server start
```

Use this when you want:

- local BFF health
- provider readiness
- read-only `ask_opencampus`
- imported snapshot views
- export artifact generation

### 2. Use site-scoped sidecars when you only need one site's snapshot

```bash
export CAMPUS_COPILOT_SNAPSHOT="$PWD/examples/workspace-snapshot.sample.json"
pnpm --filter @opencampus/mcp-readonly start:canvas
```

### 3. Keep the contract read-only

Good fit:

- read current assignments
- inspect one site's records
- export snapshot artifacts
- summarize decision-layer state

Wrong fit:

- live browser takeover
- posting/replying/submitting on external sites
- write-capable operator loops
- hosted autonomy positioning

### 4. Reuse config examples only when the runtime shape really matches

If your local runtime explicitly supports the same `mcpServers` JSON shape used by Codex or Claude-style MCP setups, you can adapt:

- `examples/integrations/codex-mcp.example.json`
- `examples/integrations/claude-code-mcp.example.json`
- `examples/mcp/codex.example.json`
- `examples/mcp/claude-desktop.example.json`

If you need the shorter repo-bundle router first, use:

- `examples/integrations/plugin-bundles.md`

If it does **not** support that exact shape, stay with the command snippets in this file instead of inventing a fake “official OpenClaw plugin” format.

If you only need a safe public fixture, start with:

```bash
export CAMPUS_COPILOT_SNAPSHOT="$PWD/examples/workspace-snapshot.sample.json"
```

## Suggested first tools

1. `campus_health`
2. `providers_status`
3. `ask_opencampus`
4. one of the `*_snapshot_view` tools
5. `export_snapshot_artifact`

## Use with public skills

Start with:

- `skills/openclaw-readonly-consumer/SKILL.md`
- `skills/read-only-workspace-analysis`
- `skills/read-only-workspace-audit`
- `skills/site-mcp-consumer`

These are the safest starting points when you want OpenClaw-style consumers to stay on the snapshot/BFF/read-only path.

## What this path is good at

- reading the current decision layer from a local snapshot
- exporting artifacts for another local tool to inspect
- keeping Campus semantics inside Campus Copilot while your runtime stays outside it

## What this path still does not mean

- not an official OpenClaw plugin
- not live browser control
- not external-site posting, reply, or submission
- not a hosted autonomy runtime
