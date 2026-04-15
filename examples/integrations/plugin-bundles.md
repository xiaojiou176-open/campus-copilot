# Plugin-Grade Bundle Router

This page is the shortest truthful router for the current plugin-grade repo bundles.

Think of it like a travel wallet:

- one place holds the config file
- one place holds the shell wrapper when `cwd` support is missing
- one place holds the proof loop that tells you whether the bundle is actually alive

These bundles are **repo-public preview surfaces**.
They are **not** official marketplace listings, hosted plugin directories, or write-capable browser-control plugins.

If you need the exact repo-side publication truth behind these bundles, pair this router with [`../../DISTRIBUTION.md`](../../DISTRIBUTION.md).

## Bundle matrix

| Bundle | Start here | Includes | Fresh proof loop | Current truthful claim |
| :-- | :-- | :-- | :-- | :-- |
| Codex generic MCP bundle | [`codex-mcp.example.json`](codex-mcp.example.json) or [`codex-mcp-shell.example.json`](codex-mcp-shell.example.json) | generic stdio MCP config, optional repo-root wrapper, current-view proof example | `pnpm proof:public`, `pnpm smoke:api` | plugin-grade repo bundle, not officially listed |
| Claude Code / Claude Desktop bundle | [`claude-code-mcp.example.json`](claude-code-mcp.example.json), [`claude-code-mcp-shell.example.json`](claude-code-mcp-shell.example.json), or [`../mcp/claude-desktop.example.json`](../mcp/claude-desktop.example.json) | generic stdio MCP config, optional repo-root wrapper, site-sidecar option, site-overview proof example | `pnpm proof:public`, `pnpm smoke:api` | plugin-grade repo bundle, not officially listed |
| OpenClaw-style local runtime route | [`../openclaw-readonly.md`](../openclaw-readonly.md) | read-only guide, compatible Claude-style bundle layout, public skill router, snapshot fixture | `pnpm proof:public`, `pnpm smoke:api` | plugin-grade repo bundle, not an official OpenClaw plugin or ClawHub bundle |

## Shared shell wrapper

If your client cannot set `cwd`, use the repo-owned wrapper:

- [`../../scripts/consumer/campus-copilot-mcp.sh`](../../scripts/consumer/campus-copilot-mcp.sh)

It keeps the launch command short and lets Codex/Claude-style consumers point at one stable script instead of an inline shell one-liner.

## Codex bundle

### Install path

1. Run `pnpm install`.
2. Choose one config:
   - [`codex-mcp.example.json`](codex-mcp.example.json) when the client can launch from repo root or supports `cwd`
   - [`codex-mcp-shell.example.json`](codex-mcp-shell.example.json) when you need the wrapper script
3. Pair it with:
   - [`../current-view-triage-example.md`](../current-view-triage-example.md)
   - [`../../skills/read-only-workspace-audit/SKILL.md`](../../skills/read-only-workspace-audit/SKILL.md)

## Claude Code / Claude Desktop bundle

### Install path

1. Run `pnpm install`.
2. Choose one config:
   - [`claude-code-mcp.example.json`](claude-code-mcp.example.json)
   - [`claude-code-mcp-shell.example.json`](claude-code-mcp-shell.example.json)
   - [`../mcp/claude-desktop.example.json`](../mcp/claude-desktop.example.json) for site sidecars
3. Pair it with:
   - [`../site-overview-audit-example.md`](../site-overview-audit-example.md)
   - [`../../skills/site-mcp-consumer/SKILL.md`](../../skills/site-mcp-consumer/SKILL.md)

## OpenClaw-style route

### Install path

1. Start with [`../openclaw-readonly.md`](../openclaw-readonly.md).
2. If the runtime accepts the same `mcpServers` shape, adapt the Codex/Claude bundle JSON.
3. If it does not, stay with the command snippets and pair them with:
   - [`../../skills/openclaw-readonly-consumer/SKILL.md`](../../skills/openclaw-readonly-consumer/SKILL.md)
   - [`../../skills/switchyard-runtime-check/SKILL.md`](../../skills/switchyard-runtime-check/SKILL.md)

This repository does **not** currently ship a native `openclaw.plugin.json`.
It does, however, already qualify as a compatible OpenClaw bundle through the existing Claude-style layout rooted at [`../../skills`](../../skills), so the current truthful state is a `plugin-grade repo bundle`.
The repo-owned [`../../skills/catalog.json`](../../skills/catalog.json) is only a local bundle index for this repository; it is not the native OpenClaw plugin manifest.
Use [`../../DISTRIBUTION.md`](../../DISTRIBUTION.md) for the remaining official-listing/publication ledger.

## Public-ready threshold

Use this wording carefully:

- **plugin-grade repo bundle** means:
  - public install path exists
  - fresh proof loop exists
  - public doc/router exists
  - copyable sample exists
- **officially listed** or **marketplace listed** means:
  - the upstream platform really published the bundle in an official public directory

Current truthful state:

- Codex bundle: plugin-grade repo bundle
- Claude Code / Claude Desktop bundle: plugin-grade repo bundle
- OpenClaw-style route: plugin-grade repo bundle for local runtime consumption

None of the above should currently be described as officially listed or marketplace listed from this repository alone.
