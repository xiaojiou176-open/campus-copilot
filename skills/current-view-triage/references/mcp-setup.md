# Current View Triage MCP Setup

## Fastest local setup

From the Campus Copilot repo root:

```bash
pnpm install
pnpm --filter @opencampus/mcp-server build
pnpm --filter @opencampus/mcp-server start
```

## If the host supports MCP Bundles

- registry name: `io.github.xiaojiou176-open/opencampus-mcp`
- release asset: `https://github.com/xiaojiou176-open/OpenCampus/releases/download/v0.1.0/opencampus-mcp-0.1.0.mcpb`

## Minimum handoff to the agent

- one imported snapshot or current-view export path
- whether Campus Copilot MCP is already connected
- optional student question
