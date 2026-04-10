# MCP Registry Submission Prep

This is the focused repo-side packet for the official MCP Registry lane.

Use it when the question becomes:

> Is the canonical Campus Copilot MCP artifact aligned for the official MCP Registry lane, and what exactly is still left after the release-hosted `.mcpb` submit?

## Truth Boundary

- the MCP Registry entry now points at a release-hosted `.mcpb` bundle, not a public npm scope
- the repo-side goal here is narrower:
  - keep `package.json`, `mcpb.manifest.json`, `server.json`, README, and example configs aligned
  - keep the monorepo subfolder truth explicit
  - keep the transport truth explicit: `stdio`
  - keep the boundary explicit: accepted submit does **not** mean freshly re-read discovery page
  - keep the artifact boundary explicit: a discovery hit does **not** mean the listing already reflects the latest merged bundle

## Current Repo-Side SSOT

| Surface | Current repo-owned source | Validation |
| :-- | :-- | :-- |
| canonical package | `packages/mcp-server/package.json` | `pnpm check:mcp-registry-preflight` |
| canonical bundle manifest | `packages/mcp-server/mcpb.manifest.json` | `pnpm check:mcp-registry-preflight` |
| canonical registry metadata | `packages/mcp-server/server.json` | `pnpm check:mcp-registry-preflight` |
| reusable packet | `packages/mcp-server/registry-submission.packet.json` | `pnpm check:mcp-registry-preflight` |

## Current Distribution Shape

- local workspace package name: `@campus-copilot/mcp-server`
- registry name: `io.github.xiaojiou176-open/campus-copilot-mcp`
- registry package type: `mcpb`
- version: `0.1.1`
- release asset URL: `https://github.com/xiaojiou176-open/campus-copilot/releases/download/v0.1.1/campus-copilot-mcp-0.1.1.mcpb`
- currently targeted SHA-256: `381a1bdf42cf83cd832039b6e1df7fa20f08f8ea2a6eb92329f64cde7bb61814`
- transport: `stdio`
- repository subfolder: `packages/mcp-server`
- fresh discovery read-back on `2026-04-10` shows the registry entry is publicly searchable as `active`
- current status: the `0.1.1` bundle and metadata publish have completed, and the registry now shows `0.1.1` as the latest active version

## Submit Flow

1. build the bundled server entrypoint:

```bash
pnpm --filter @campus-copilot/mcp-server build
```

2. package a fresh deterministic `.mcpb` bundle from the current `dist/bin.mjs` plus `packages/mcp-server/mcpb.manifest.json` (renamed to `manifest.json` inside the archive), then upload that artifact to the matching GitHub release tag:

```bash
node scripts/build-mcpb-bundle.mjs
```
3. authenticate the publisher:

```bash
mcp-publisher login github
```

4. publish the registry metadata:

```bash
mcp-publisher publish packages/mcp-server/server.json
```

5. verify that the discovery page still resolves and now reflects the refreshed asset metadata

## Current Verdict

- **Repo-side state**: `current main now has a release-backed deterministic .mcpb path`
- **Package truth**: `real local package + real .mcpb bundle + real server.json + real stdio install path`
- **Registry submit truth**: `accepted by the official MCP Registry on 2026-04-10 for version 0.1.1`
- **Fresh read-back**: official API search on `2026-04-10` returns `io.github.xiaojiou176-open/campus-copilot-mcp` with `0.1.1` as the latest active version
- **Still separate blocker**: none on the registry-freshness lane
