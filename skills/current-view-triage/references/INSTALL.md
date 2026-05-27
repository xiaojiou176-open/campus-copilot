# OpenCampus MCP Setup

Use this when the host runtime does not already have OpenCampus MCP
connected.

## Quickest local setup

1. Clone the public repo:

```bash
git clone https://github.com/xiaojiou176-open/OpenCampus.git
cd opencampus
pnpm install
```

2. Build the read-only MCP server:

```bash
pnpm --filter @opencampus/mcp-server build
```

3. Start the MCP server directly:

```bash
pnpm --filter @opencampus/mcp-server start
```

4. Before loading the host config snippets in this folder, replace
   `/ABSOLUTE/PATH/TO/opencampus` with the real path to your local clone.

## If your host supports MCP Bundles

OpenCampus also ships a release-hosted MCP bundle:

- registry name: `io.github.xiaojiou176-open/opencampus-mcp`
- release asset: `https://github.com/xiaojiou176-open/OpenCampus/releases/download/v0.1.0/opencampus-mcp-0.1.0.mcpb`
