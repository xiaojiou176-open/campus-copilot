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
- version: `0.1.0`
- release asset URL: `https://github.com/xiaojiou176-open/campus-copilot/releases/download/v0.1.0/campus-copilot-mcp-0.1.0.mcpb`
- SHA-256: `24b45ad5883479df448b2d622d3a6e476272cb6782bbb29d518fbf3751aad461`
- transport: `stdio`
- repository subfolder: `packages/mcp-server`

## Submit Flow

1. build the bundled server entrypoint:

```bash
pnpm --filter @campus-copilot/mcp-server build
```

2. upload the `.mcpb` asset to the matching GitHub release tag
3. authenticate the publisher:

```bash
mcp-publisher login github
```

4. publish the registry metadata:

```bash
mcp-publisher publish packages/mcp-server/server.json
```

5. verify the discovery page after it appears upstream

## Current Verdict

- **Repo-side state**: `release-hosted .mcpb + registry metadata aligned`
- **Package truth**: `real local package + real .mcpb bundle + real server.json + real stdio install path`
- **Registry submit truth**: `accepted by the official MCP Registry on 2026-04-08`
- **Still separate proof**: fresh discovery-page read-back
