# Toolbox Chooser

Use this page when you already know you want a **builder-facing Campus Copilot surface**, but you do not yet know **which one to pick**.

Think of it like the sign at a train station:

- the tracks all belong to the same system
- but you still need the right platform before you board

## Fast chooser

| If your real goal is... | Choose this surface first | Start here | Why this is the right first hop | Not this when... |
| :-- | :-- | :-- | :-- | :-- |
| one all-in-one builder SDK over the local BFF plus snapshot helpers | `@opencampus/sdk` | [`../packages/sdk/README.md`](../packages/sdk/README.md) | best when you want one package that spans API, snapshot, and site helpers without choosing finer-grained SDK slices first | you already know you only need the whole-workbench SDK or one-site SDK specifically |
| one generic MCP server for Codex / Claude Code style local workflows | `@opencampus/mcp-server` | [`integrations/codex-mcp.example.json`](integrations/codex-mcp.example.json) or [`integrations/claude-code-mcp.example.json`](integrations/claude-code-mcp.example.json) | one read-only stdio entry point over the local BFF plus imported snapshots | you only need one site's records and do not want the larger cross-site tool surface |
| snapshot-first MCP config helpers without running a server directly | `@opencampus/mcp` | [`../packages/mcp/README.md`](../packages/mcp/README.md) | best when you want repo-owned config builders for Codex / Claude style MCP wiring instead of the server process itself | you want the actual MCP server or a site-scoped sidecar, not just config helpers |
| one site's records through a smaller MCP sidecar | `@opencampus/mcp-readonly` | [`mcp/README.md`](mcp/README.md) | smallest site-scoped MCP path over imported snapshots | you need provider status, cross-site tools, or cited AI through one generic server |
| terminal-first inspection, export, or provider readiness | `@opencampus/cli` | [`cli-usage.md`](cli-usage.md) | quickest path when you want local commands instead of an MCP host | you need MCP wiring or code-level reuse first |
| the Campus-to-runtime seam before you package a consumer surface | `@opencampus/provider-runtime` | [`../packages/provider-runtime/README.md`](../packages/provider-runtime/README.md) | best when you are wiring the `Switchyard-first` transport seam without giving away Campus-owned answer semantics | you need a builder-facing CLI/MCP/SDK entrypoint first |
| code-level reuse of the whole derived workspace state | `@opencampus/workspace-sdk` | [`sdk-usage.ts`](sdk-usage.ts) | best when your code wants the same whole-workbench decision layer the product uses | you only need one site's overview helpers |
| code-level reuse of one site's snapshot view | `@opencampus/site-sdk` | [`../packages/site-sdk/README.md`](../packages/site-sdk/README.md) | best when your code only needs one supported site's overview | you need the full workbench state or export/AI-ready derivations |
| one Gradescope-only preview helper over the shared snapshot contract | `@opencampus/gradescope-api` | [`../packages/gradescope-api/README.md`](../packages/gradescope-api/README.md) | smallest code-first preview when only Gradescope snapshot records matter | you want a generic site abstraction, sidecar, or public API promise |
| one EdStem-only preview helper over the shared snapshot contract | `@opencampus/edstem-api` | [`../packages/edstem-api/README.md`](../packages/edstem-api/README.md) | smallest code-first preview when only EdStem snapshot records matter | you want a generic site abstraction, sidecar, or public API promise |
| one MyUW-only preview helper over the shared snapshot contract | `@opencampus/myuw-api` | [`../packages/myuw-api/README.md`](../packages/myuw-api/README.md) | smallest code-first preview when only MyUW snapshot records matter | you want a generic site abstraction, sidecar, or public API promise |
| the shortest prompt-first route for a local operator shell | public skills + examples | [`../skills/README.md`](../skills/README.md) and [`openclaw-readonly.md`](openclaw-readonly.md) | fastest way to stay read-only and local-first without inventing a plugin platform | you need write-capable automation or browser control |

## Two simple rules

1. Start with the **generic MCP server** when you want one entry point and cross-site tools.
2. Start with the **site sidecars** when you only need one site's snapshot records.

## Truthful guardrails

- All of these surfaces are still **local-first** and **read-only**.
- They are builder-facing repo surfaces, not hosted infrastructure.
- They do **not** prove live browser control, write-capable automation, or official marketplace plugins.
- The repo-local public proof loop is `pnpm proof:public`. It proves install paths, dry-run packing, and public router consistency, not official listing.
