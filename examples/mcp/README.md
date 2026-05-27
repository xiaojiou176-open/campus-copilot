# Site Sidecar Config Notes

These files show the **site-scoped** read-only MCP path.

Use them when you only need one site's snapshot records and do not need the generic cross-site tools from `@campus-copilot/mcp-server`.

## Two safe ways to launch sidecars

### 1. Bare command examples

These are the shortest configs:

- [`codex.example.json`](codex.example.json)
- [`claude-desktop.example.json`](claude-desktop.example.json)

They assume the `campus-copilot-mcp-*` binaries are already available in your `PATH`.

### 2. Repo-root runnable examples

These are the safer first-run configs:

- [`codex-repo-root.example.json`](codex-repo-root.example.json)
- [`claude-desktop-repo-root.example.json`](claude-desktop-repo-root.example.json)

They call the repo-owned wrapper or the matching `start:<site>` script, so the command stays runnable even when the sidecar binary is not globally installed.

## Which file should you click first?

| If you are using... | Start here | Why |
| :-- | :-- | :-- |
| Codex with sidecars already in `PATH` | [`codex.example.json`](codex.example.json) | shortest site-scoped config |
| Codex without globally installed sidecars | [`codex-repo-root.example.json`](codex-repo-root.example.json) | safest repo-root runnable sidecar path |
| Claude Desktop with sidecars already in `PATH` | [`claude-desktop.example.json`](claude-desktop.example.json) | shortest Claude Desktop sidecar path |
| Claude Desktop without globally installed sidecars | [`claude-desktop-repo-root.example.json`](claude-desktop-repo-root.example.json) | safest repo-root runnable Claude Desktop sidecar path |

If you are still deciding between the **generic MCP server** and **site sidecars**, start with [`../toolbox-chooser.md`](../toolbox-chooser.md).

## Snapshot rule

All sidecar examples still require:

- one absolute `CAMPUS_COPILOT_SNAPSHOT` path
- one imported snapshot or current exported workspace artifact

## What this path proves

- one site's records can be exposed through a smaller read-only MCP surface

## What it does not prove

- live browser control
- current authenticated session state
- write-capable automation
