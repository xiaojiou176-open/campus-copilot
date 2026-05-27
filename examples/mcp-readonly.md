# Read-Only MCP Preview

Use one of the site-scoped MCP binaries with a snapshot:

```bash
export CAMPUS_COPILOT_SNAPSHOT="$PWD/examples/workspace-snapshot.sample.json"
pnpm --filter @campus-copilot/mcp-readonly start:canvas
```

Use the generic BFF + snapshot MCP server via the integration examples under:

- `examples/integrations/codex-mcp.example.json`
- `examples/integrations/claude-code-mcp.example.json`

The preview remains:

- snapshot-first
- read-only
- local-first
- not a live browser-control surface
