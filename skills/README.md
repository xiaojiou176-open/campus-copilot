# Public Skills

These are public, read-only helper skills for builder workflows around Campus Copilot.

Treat them like prompt recipes for local consumers, not installed plugins or browser operators.

Machine-readable pack index:

- [`skills/catalog.json`](catalog.json)
- [`clawhub-submission.packet.json`](clawhub-submission.packet.json)
- [`../DISTRIBUTION.md`](../DISTRIBUTION.md)

Version semantics:

- this repo currently uses one **skill-pack semver** at the catalog level
- current pack version: `0.1.0`
- individual skills are versioned together as one read-only public pack until they need separate release cadence

Validation:

```bash
pnpm check:skill-catalog
```

That validation now checks three linked layers together:

- `skills/catalog.json` as the repo-owned pack index
- `skills/*/SKILL.md` as the real skill entrypoints
- `clawhub-submission.packet.json` as the generic upstream-ready packet for later owner-side publish flow

File-based skill ecosystem note:

- OpenHands and OpenCode style consumers usually discover `SKILL.md` files from their own skill roots.
- This repo keeps the public pack under `skills/` plus `skills/catalog.json`, so the truthful state is still a repo-owned bundle index instead of a hosted registry claim.
- The repo also ships `clawhub-submission.packet.json` plus [`../DISTRIBUTION.md`](../DISTRIBUTION.md) so owner-side ClawHub submission later does not need a fake marketplace manifest.
- The ClawHub/OpenClaw-facing repo artifact is [`clawhub-submission.packet.json`](clawhub-submission.packet.json), which mirrors official publish inputs without pretending to be an upstream marketplace manifest.

- `read-only-workspace-analysis`: inspect an exported workspace snapshot and summarize the current decision surface
- `read-only-workspace-audit`: audit a local snapshot or local BFF surface without reopening live browser automation
- `current-view-triage`: answer what the current workspace says the student should do first
- `openclaw-readonly-consumer`: guide OpenClaw-style local runtimes onto the read-only MCP/CLI/snapshot path
- `site-mcp-consumer`: wire a site-scoped MCP sidecar against a local snapshot
- `site-overview-audit`: inspect one supported site's current snapshot records
- `site-snapshot-review`: inspect an exported workspace snapshot without reopening live browser automation
- `switchyard-runtime-check`: verify the local Campus consumer seam and optional Switchyard runtime path

They are examples of builder-facing workflow assets, not a write-capable automation system.

They also inherit the same academic safety contract as the rest of the repo:

- no `Register.UW` / `Notify.UW` automation
- no registration-related polling or seat watching
- no use of another person's credentials or records
- no default AI ingestion of raw course files or instructor-authored materials

See [`../docs/17-academic-expansion-and-safety-contract.md`](../docs/17-academic-expansion-and-safety-contract.md).

## Consumer routing

| Consumer | Best first skill | Pair it with | Why |
| :-- | :-- | :-- | :-- |
| Codex | `read-only-workspace-audit` or `current-view-triage` | `examples/integrations/codex-mcp.example.json` | quickest generic MCP entry over the local BFF and imported snapshots, plus one-step triage when you want a plain-language first answer |
| Claude Code / Claude Desktop | `site-mcp-consumer` | `examples/integrations/claude-code-mcp.example.json` or `examples/mcp/claude-desktop.example.json` | best when you want site-scoped sidecars or a generic stdio MCP server |
| OpenClaw-style local consumers | `openclaw-readonly-consumer` | `examples/openclaw-readonly.md` | safest path when Campus Copilot should stay a read-only context provider instead of a browser plugin |
| SDK/CLI builders | `site-snapshot-review` or `site-overview-audit` | `examples/sdk-usage.ts` or `examples/cli-usage.md` | good when you want the same decision-layer data without MCP first, or one site-specific audit card |

## Start Here By Consumer

- **Codex**: start with `read-only-workspace-audit`, then pair it with `examples/integrations/codex-mcp.example.json`.
- **Claude Code**: start with `site-mcp-consumer`, then pair it with `examples/integrations/claude-code-mcp.example.json` or `examples/mcp/claude-desktop.example.json`.
- **OpenClaw-style local consumers**: start with `openclaw-readonly-consumer`, then pair it with `examples/openclaw-readonly.md` and keep Campus Copilot on the snapshot/BFF/read-only side instead of treating it as a browser-control plugin.
- **Need the fastest chooser before you even pick a package or skill?** Start with `examples/toolbox-chooser.md`.

## Start Here By Job

- `read-only-workspace-analysis`: answer what is open, what changed, and what is due soon from one snapshot
- `read-only-workspace-audit`: audit whether one snapshot is rich enough for cited AI, export, or MCP consumption
- `current-view-triage`: decide what the current workspace says the student should do first
- `openclaw-readonly-consumer`: choose the safest read-only path for a local operator shell that can launch MCP or CLI commands
- `site-mcp-consumer`: wire the narrowest site-scoped MCP sidecar for Codex/Claude-style workflows
- `site-overview-audit`: inspect one supported site's current snapshot records without reopening live automation
- `site-snapshot-review`: inspect one site's records without reopening live automation
- `switchyard-runtime-check`: verify the optional local runtime seam without changing Campus-owned answer semantics

## Example outputs

- `examples/current-view-triage-example.md`
- `examples/site-overview-audit-example.md`

Use these when you want the fastest plain-language proof of what a successful public-skill result should look like before you wire a runtime.

## Guardrails

- Keep the workflow on imported snapshots or the thin local BFF unless a task explicitly requires live validation.
- Pair these skills with files under `examples/` instead of inventing a new integration shape when a public sample already exists.
- Do not present these skills as official marketplace plugins or write-capable automations.
- Do not use these skills as a wrapper for protected academic workflows such as registration automation.
- Do not confuse `skills/catalog.json` with OpenClaw's native `openclaw.plugin.json`; the catalog is a repo-owned bundle index, not an upstream marketplace manifest or native plugin manifest.
- Keep the current bundle story on the manifestless Claude-style layout described in [`../DISTRIBUTION.md`](../DISTRIBUTION.md) instead of inventing a vendor-only manifest.
- Do not confuse `clawhub-submission.packet.json` with a vendor-required manifest either; it is a repo-owned packet because the official docs in this wave did not expose a stable marketplace manifest schema for plain skill uploads.

## What These Skills Are Not

- not official marketplace plugins
- not live browser-control playbooks
- not write-capable external-site automations
