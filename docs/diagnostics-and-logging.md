# Diagnostics and Logging

This file defines how runtime diagnostics should be recorded without turning ad-hoc console output into a fake logging system.

## Goals

- keep runtime artifacts in controlled paths
- make multi-step diagnosis traceable
- separate repository evidence from machine-private details

## Required Correlation Fields

Every structured diagnostic payload should include:

- `run_id`
- `request_id` when a request/response chain exists
- `site` when a site-specific surface is involved
- `surface`
- `step`
- `status`
- `timestamp`
- `evidence_kind`

## Approved Output Paths

| Path | Purpose | Notes |
| :-- | :-- | :-- |
| `.runtime-cache/` | temporary diagnostic artifacts and support bundles | not a source of truth |
| `apps/extension/dist/chrome-mv3` | unpacked extension build output | explicit exception for manual loading |

## Rules

- Do not create undocumented top-level runtime output paths.
- Do not store secrets or local absolute paths in diagnostics payloads.
- Support bundles may summarize environment state, but they must stay under `.runtime-cache/`.
- Repository docs should summarize the validation lane, not embed raw local machine traces.
