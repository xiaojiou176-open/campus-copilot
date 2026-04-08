---
name: current-view-triage
description: Turn one Campus Copilot snapshot or MCP-backed current view into a plain-language what-to-do-first answer for a student.
---

# Current View Triage

Use this skill when you want one plain-language answer to the question:

- what should the student do first right now

Treat it like a **read-only triage plugin card** over one imported workspace snapshot or one local BFF-backed current view, not a live-browser playbook.

## What this skill teaches

- how to prefer read-only Campus Copilot MCP or snapshot surfaces first
- how to turn Focus Queue and recent changes into one concrete next action
- how to answer with evidence and trust gaps instead of inventing missing facts

## Runtime you need

- one imported snapshot path or one current-view export
- or one connected Campus Copilot MCP server
- use `references/mcp-setup.md` if the MCP server still needs to be connected

## Exposed MCP abilities

- `campus_health`
- `providers_status`
- `ask_campus_copilot`
- the four `*_snapshot_view` tools
- `export_snapshot_artifact`

Use `references/capability-map.md` when you need the quick map.

## Inputs

- `SNAPSHOT_PATH` or one current-view export path
- optional `QUESTION`
- optional `MCP_STATUS`

## Steps

1. Decide whether MCP-backed current view is available; otherwise stay on the imported snapshot/current-view export.
2. Build a short workspace summary from the strongest available read-only surface.
3. Inspect the top Focus Queue items and recent updates.
4. If a question is provided, use the cited-answer path instead of guessing.
5. Return:
   - `top_action`
   - `why_now`
   - `evidence_used`
   - `trust_gaps`

## Good fit

- Codex or Claude-style first-pass triage over a snapshot
- OpenClaw-style local consumers that need one short "what now" brief
- repo-local verification that the decision layer is understandable before reopening live browser work

## Hard boundary

- stay on imported snapshots or the thin local BFF
- do not claim live browser/session truth from snapshot-only evidence
- do not mutate site state

## Companion references

- `references/mcp-setup.md`
- `references/capability-map.md`
- `references/example-output.md`
