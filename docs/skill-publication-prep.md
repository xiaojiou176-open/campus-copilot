# Skill Publication Prep

This file is the repo-side packet for public skill publication and directory preparation.

Use it when the question becomes:

> Which skill-facing facts are already packaged inside this repo, and which parts still require owner login, owner clicks, or a platform-specific upload later?

Read the status ledger first:

- [`14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md)

## Truth Boundary

- `skills/catalog.json` is the repo-owned machine-readable index
- it is **not** an upstream marketplace manifest
- the OpenClaw-compatible bundle path stays on a manifestless Claude-style bundle layout
- the current ClawHub lane is CLI-flag driven
- the current local-only surfaces do **not** justify inventing a Glama-specific manifest or an invented `manifest.yaml`

## Current Repo-Side SSOT

| Surface | Current repo-owned source | Validation |
| :-- | :-- | :-- |
| skill catalog | `skills/catalog.json` | `pnpm check:skill-catalog` |
| skill entrypoints | `skills/*/SKILL.md` | `pnpm check:skill-catalog` |
| packet doc | this file plus [`16-distribution-preflight-packets.md`](16-distribution-preflight-packets.md) | `pnpm check:skill-publication-surface` |

## Publication Packet

Recommended shared version for the current public pack: `0.1.0`

Recommended shared baseline tags for ClawHub skill publish: `latest,campus-copilot,read-only`

| Skill id | Skill path | Recommended display name | ClawHub-ready command template |
| :-- | :-- | :-- | :-- |
| `read-only-workspace-analysis` | `skills/read-only-workspace-analysis/SKILL.md` | `Read-Only Workspace Analysis` | `clawhub skill publish ./skills/read-only-workspace-analysis --slug read-only-workspace-analysis --name "Read-Only Workspace Analysis" --version 0.1.0 --tags latest,campus-copilot,read-only` |
| `read-only-workspace-audit` | `skills/read-only-workspace-audit/SKILL.md` | `Read-Only Workspace Audit` | `clawhub skill publish ./skills/read-only-workspace-audit --slug read-only-workspace-audit --name "Read-Only Workspace Audit" --version 0.1.0 --tags latest,campus-copilot,read-only` |
| `current-view-triage` | `skills/current-view-triage/SKILL.md` | `Current View Triage` | `clawhub skill publish ./skills/current-view-triage --slug current-view-triage --name "Current View Triage" --version 0.1.0 --tags latest,campus-copilot,read-only` |
| `openclaw-readonly-consumer` | `skills/openclaw-readonly-consumer/SKILL.md` | `OpenClaw Read-Only Consumer` | `clawhub skill publish ./skills/openclaw-readonly-consumer --slug openclaw-readonly-consumer --name "OpenClaw Read-Only Consumer" --version 0.1.0 --tags latest,campus-copilot,read-only` |
| `site-mcp-consumer` | `skills/site-mcp-consumer/SKILL.md` | `Site MCP Consumer` | `clawhub skill publish ./skills/site-mcp-consumer --slug site-mcp-consumer --name "Site MCP Consumer" --version 0.1.0 --tags latest,campus-copilot,read-only` |
| `site-overview-audit` | `skills/site-overview-audit/SKILL.md` | `Site Overview Audit` | `clawhub skill publish ./skills/site-overview-audit --slug site-overview-audit --name "Site Overview Audit" --version 0.1.0 --tags latest,campus-copilot,read-only` |
| `site-snapshot-review` | `skills/site-snapshot-review/SKILL.md` | `Site Snapshot Review` | `clawhub skill publish ./skills/site-snapshot-review --slug site-snapshot-review --name "Site Snapshot Review" --version 0.1.0 --tags latest,campus-copilot,read-only` |
| `switchyard-runtime-check` | `skills/switchyard-runtime-check/SKILL.md` | `Switchyard Runtime Check` | `clawhub skill publish ./skills/switchyard-runtime-check --slug switchyard-runtime-check --name "Switchyard Runtime Check" --version 0.1.0 --tags latest,campus-copilot,read-only` |

## Bundle And Directory Notes

- the repo does **not** ship `openclaw.plugin.json`, and that is intentional
- the bundle story stays on the manifestless Claude-style layout
- Glama stays on the generic-directory packet path until a real remote-surface manifest contract is needed

## Owner-Only Later Steps

1. wait for ClawHub's hourly new-skill rate limit to reset, then publish `site-snapshot-review` and `switchyard-runtime-check`
   - you can still use `clawhub sync --all` after the rate-limit window resets if you prefer the bulk path over one-by-one publish
2. re-read the remaining ClawHub listing pages after those two publishes succeed
3. if a future remote MCP server is deployed and Glama becomes relevant, publish the real `/.well-known/glama.json` file on that remote domain and claim the connector there

## Current Verdict

- **Repo-side state**: `skill publication packet ready`
- **OpenClaw bundle truth**: `compatible repo bundle on a manifestless Claude-style layout`
- **ClawHub truth**: `current-view-triage`, `openclaw-readonly-consumer`, `read-only-workspace-analysis`, `read-only-workspace-audit`, `site-mcp-consumer`, and `site-overview-audit` are live; `site-snapshot-review` and `switchyard-runtime-check` remain blocked by ClawHub's max-5-new-skills-per-hour limit
- **Glama truth**: `generic directory packet ready; no stable local-surface manifest path recovered`
