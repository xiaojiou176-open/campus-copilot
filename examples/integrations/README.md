# Integration Config Notes

These JSON files are the smallest truthful configs for local Codex / Claude Code / Claude Desktop style consumers.

If you want the higher-level router for the current plugin-grade repo bundles, start with [`plugin-bundles.md`](plugin-bundles.md).

Think of them like socket adapters, not installers:

- they show the right command shape
- they do not install dependencies for you
- they do not turn Campus Copilot into a hosted plugin platform

## Before You Copy A JSON File

1. Run `pnpm install` in this repository.
2. Decide whether you want the generic read-only MCP server or a site-scoped sidecar.
3. If you use a snapshot sidecar, replace `CAMPUS_COPILOT_SNAPSHOT` with an absolute snapshot path.
4. Keep the whole setup local-first and read-only.

## Working Directory Rule

The generic `pnpm --filter ... exec ...` examples assume one of these is true:

- your consumer launches the command from the Campus Copilot repo root
- your consumer supports an explicit working-directory field such as `cwd`

If neither is true, use the repo-owned shell wrapper instead of rewriting the command yourself.

Repo-owned wrapper path:

```bash
bash /absolute/path/to/opencampus/scripts/consumer/opencampus-mcp.sh
```

Use the same wrapper pattern for Codex/Claude-style generic-server consumers when `cwd` is unavailable.

## Which Config To Start With

| Consumer | Start with | Use when |
| :-- | :-- | :-- |
| Codex | `codex-mcp.example.json` | your client launches from the repo root or supports an explicit `cwd` |
| Codex without `cwd` support | `codex-mcp-shell.example.json` | you need a copy-paste wrapper that changes into the repo root first |
| Claude Code | `claude-code-mcp.example.json` | your client launches from the repo root or supports an explicit `cwd` |
| Claude Code without `cwd` support | `claude-code-mcp-shell.example.json` | you need the same repo-root shell wrapper pattern |
| Claude Desktop | `../mcp/claude-desktop.example.json` | you want site-scoped sidecars with snapshot env wiring |
| OpenClaw-style local runtimes | `../openclaw-readonly.md` | you want the truthful command-first local-runtime path |

## What These Configs Prove

- the command names are real
- the repo-owned read-only MCP entrypoints are real
- the config shapes and wrapper script are repo-local onboarding aids
- the shell-wrapped variants are available when a consumer cannot set `cwd`

## What They Do Not Prove

- hosted MCP distribution
- official marketplace plugins
- live browser control
- write-capable automation
