# Builder Surface Examples

These examples are the repo-local proof pack for the Wave 6 read-only toolbox.

If you are still deciding which surface to use before you copy any JSON or code, start with [`toolbox-chooser.md`](toolbox-chooser.md).
If you want the shortest router for the current plugin-grade repo bundles, jump to [`integrations/plugin-bundles.md`](integrations/plugin-bundles.md).
If you want the exact repo-side publication truth behind those same surfaces, pair it with [`../DISTRIBUTION.md`](../DISTRIBUTION.md).

## Quick routing matrix

| If you are using | Start with | Then open | Why this is the right first hop | Fast proof that you are on the right path |
| :-- | :-- | :-- | :-- | :-- |
| Codex | [`integrations/codex-mcp.example.json`](integrations/codex-mcp.example.json) | [`codex/campus-copilot-mcp.json`](codex/campus-copilot-mcp.json) | generic stdio MCP path over the local BFF plus imported snapshots when repo-root launch or `cwd` is available | [`current-view-triage-example.md`](current-view-triage-example.md) |
| Codex without `cwd` support | [`integrations/codex-mcp-shell.example.json`](integrations/codex-mcp-shell.example.json) | [`integrations/README.md`](integrations/README.md) | safest copy-paste wrapper when your client needs an explicit repo-root shell hop | [`current-view-triage-example.md`](current-view-triage-example.md) |
| Claude Code / Claude Desktop | [`integrations/claude-code-mcp.example.json`](integrations/claude-code-mcp.example.json) | [`mcp/claude-desktop.example.json`](mcp/claude-desktop.example.json) | same read-only MCP surface, with either the generic server or site sidecars | [`site-overview-audit-example.md`](site-overview-audit-example.md) |
| Claude Code without `cwd` support | [`integrations/claude-code-mcp-shell.example.json`](integrations/claude-code-mcp-shell.example.json) | [`integrations/README.md`](integrations/README.md) | same repo-root wrapper path for a client that cannot set `cwd` | [`site-overview-audit-example.md`](site-overview-audit-example.md) |
| OpenClaw-style local runtimes | [`openclaw-readonly.md`](openclaw-readonly.md) | `mcp/*.json` only if your runtime explicitly accepts the same `mcpServers` shape | command-first, inference-safe onboarding without pretending Campus Copilot is an official plugin | [`current-view-triage-example.md`](current-view-triage-example.md) |
| CLI consumers | [`cli-usage.md`](cli-usage.md) | [`workspace-snapshot.sample.json`](workspace-snapshot.sample.json) | quickest local-first status/export path with no live browser dependency | [`workspace-snapshot.sample.json`](workspace-snapshot.sample.json) |
| SDK consumers | [`sdk-usage.ts`](sdk-usage.ts) | [`workspace-snapshot.sample.json`](workspace-snapshot.sample.json) | fastest way to reuse the shared read-side contract in code | [`workspace-snapshot.sample.json`](workspace-snapshot.sample.json) |
| Runtime seam consumers | [`../packages/provider-runtime/README.md`](../packages/provider-runtime/README.md) | [`integrations/plugin-bundles.md`](integrations/plugin-bundles.md) | smallest public-ready repo-local surface for the Campus-to-provider contract and optional Switchyard bridge | [`workspace-snapshot.sample.json`](workspace-snapshot.sample.json) |

## Snapshot fixture

- `imported-workspace.snapshot.json`
  - A deterministic imported workspace snapshot that can drive the SDK, CLI, and MCP snapshot tools without a live browser session.
- `workspace-snapshot.sample.json`
  - A smaller public sample used by SDK, CLI, and MCP preview docs.
- `toolbox/demo-workspace-snapshot.json`
  - A second snapshot fixture for builder-facing demo flows.

## Example commands

```bash
node packages/cli/bin/campus-copilot.mjs --help
node packages/cli/bin/campus-copilot.mjs status
node packages/cli/bin/campus-copilot.mjs provider-status
node packages/cli/bin/campus-copilot.mjs summary --snapshot examples/imported-workspace.snapshot.json
node packages/cli/bin/campus-copilot.mjs site --snapshot examples/imported-workspace.snapshot.json --site canvas
node packages/cli/bin/campus-copilot.mjs ask --provider auto --question "What should I do first?"
```

## MCP preview

Use the stdio server from:

```bash
node --experimental-strip-types packages/mcp-server/src/bin.ts
```

The server exposes:

- `campus_health`
- `providers_status`
- `ask_campus_copilot`
- `canvas_snapshot_view`
- `gradescope_snapshot_view`
- `edstem_snapshot_view`
- `myuw_snapshot_view`
- `export_snapshot_artifact`

## Integration examples

- [`integrations/README.md`](integrations/README.md)
- [`integrations/plugin-bundles.md`](integrations/plugin-bundles.md)
- [`toolbox-chooser.md`](toolbox-chooser.md)
- [`integrations/codex-mcp.example.json`](integrations/codex-mcp.example.json)
- [`integrations/codex-mcp-shell.example.json`](integrations/codex-mcp-shell.example.json)
- [`integrations/claude-code-mcp.example.json`](integrations/claude-code-mcp.example.json)
- [`integrations/claude-code-mcp-shell.example.json`](integrations/claude-code-mcp-shell.example.json)
- [`mcp/codex.example.json`](mcp/codex.example.json)
- [`mcp/codex-repo-root.example.json`](mcp/codex-repo-root.example.json)
- [`mcp/claude-desktop.example.json`](mcp/claude-desktop.example.json)
- [`mcp/claude-desktop-repo-root.example.json`](mcp/claude-desktop-repo-root.example.json)
- [`codex/campus-copilot-mcp.json`](codex/campus-copilot-mcp.json)
- [`openclaw-readonly.md`](openclaw-readonly.md)
- [`../skills/README.md`](../skills/README.md) for the matching read-only skills
- [`../skills/openclaw-readonly-consumer/SKILL.md`](../skills/openclaw-readonly-consumer/SKILL.md) for the most direct OpenClaw-style local-runtime route

Use `workspace-snapshot.sample.json` when you want a copy-paste public sample.
Use `imported-workspace.snapshot.json` when you want a fuller deterministic fixture that still stays repo-local and read-only.
Use `toolbox-chooser.md` when you first need to choose between the generic MCP server, site sidecars, CLI, the workspace SDK, the site SDK, or one site preview package.
Use `integrations/README.md` when you need the shortest truthful prerequisite list before you paste JSON into an external consumer.

## Directory roles

- `integrations/`
  - generic stdio MCP examples for Codex / Claude Code style consumers
  - `plugin-bundles.md` is the higher-level router for Codex / Claude plugin-grade repo bundles plus the current OpenClaw-compatible repo bundle route
  - `README.md` explains prerequisites, repo-root working-directory assumptions, and when to wrap commands in a shell
- `toolbox-chooser.md`
  - the quickest chooser before you decide between generic MCP, site sidecars, CLI, workspace SDK, site SDK, or site preview libs
- `mcp/`
  - site-scoped sidecar examples when you only need one or two snapshot views
  - `README.md` explains bare-command vs repo-root runnable sidecar examples
- `codex/`
  - a Codex-friendly generic server config that mirrors the same truthful read-only path
- root example docs
  - `openclaw-readonly.md` is the safest command-first local-runtime guide
  - `cli-usage.md` and `sdk-usage.ts` cover terminal-first and code-first consumption
  - `current-view-triage-example.md` and `site-overview-audit-example.md` show the expected plain-language output shape for the new public skills

## Consumer quick paths

- **Codex**: start with `integrations/codex-mcp.example.json` if your client can launch from the repo root or supports `cwd`; otherwise use `integrations/codex-mcp-shell.example.json`. Pair it with `../skills/read-only-workspace-audit/SKILL.md`.
- **Claude Code / Claude Desktop**: start with `integrations/claude-code-mcp.example.json` or `mcp/claude-desktop.example.json`; if your Claude-style client cannot set `cwd`, use `integrations/claude-code-mcp-shell.example.json`. Pair it with `../skills/site-mcp-consumer/SKILL.md`.
- **OpenClaw-style local operator runtimes**: start with `openclaw-readonly.md`, then pair it with `../skills/openclaw-readonly-consumer/SKILL.md`. Keep the integration snapshot-first / read-only / local-first instead of treating Campus Copilot as a browser-control plugin. If your runtime explicitly understands the same `mcpServers` JSON shape, adapt the Codex/Claude examples; otherwise use the command snippets directly.
- **Need the current plugin-grade repo bundle router first?** Start with `integrations/plugin-bundles.md`.
- **Need the fastest “which surface should I pick?” answer before you touch a package?** Start with `toolbox-chooser.md`.
- **Need site-scoped sidecars that still run from the repo root?** Start with `mcp/README.md`, then choose `codex-repo-root.example.json` or `claude-desktop-repo-root.example.json`.

## Skill-first jobs

- **Need one plain-language \"what should I do first\" answer?** Start with `../skills/current-view-triage/SKILL.md`.
- **Need one site-only audit before you wire a sidecar?** Start with `../skills/site-overview-audit/SKILL.md`.

## Example outputs

- `current-view-triage-example.md`
- `site-overview-audit-example.md`

Use these two files as the fastest plain-language “did I wire the right surface?” check before you widen into live validation.

## What each path proves

| Path | What it proves | What it does not prove |
| :-- | :-- | :-- |
| Generic MCP server | the local BFF + snapshot toolbox can expose read-only health, provider status, cited answers, and export tools | live browser control, hosted MCP infrastructure, or write-capable automation |
| Site sidecars | one site's imported snapshot can be inspected through a smaller MCP surface | that the live site is currently authenticated or fully synced |
| CLI | local snapshot summaries and export commands stay usable without an MCP host | release-channel packaging or remote service behavior |
| SDK | the shared snapshot contract is consumable from code | a public hosted SDK platform |
| Provider runtime seam | the Campus-to-provider contract is reusable as a local preview package | a hosted runtime platform or public Switchyard service |
| OpenClaw-style Markdown guide | there is a truthful local operator-style integration path | that Campus Copilot ships an official OpenClaw plugin or config standard |

## Guardrails

- Prefer `workspace-snapshot.sample.json` before you involve live campus sessions.
- Prefer the generic MCP server when you need cross-site tools or provider status.
- Prefer site sidecars when you only need one site's snapshot records.
- Do not present any of these examples as write-capable plugins, hosted infrastructure, or browser-control automation.

## What This Directory Does Not Claim

- It does not claim official marketplace plugins.
- It does not claim hosted MCP distribution.
- It does not claim write-capable external-site automation.
- It does not claim that snapshot examples replace live validation.

## Release/demo support

- `demo-video-script.md`
  - truthful short demo outline for the current repo-local launch surface
