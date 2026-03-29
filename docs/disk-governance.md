# Disk Governance

This file is the canonical source of truth for repository-local disk footprint governance.

Use it like a storage map:

- some paths are **formal outputs**
- some paths are **rebuildable intermediates**
- some paths are **evidence or state**
- some paths are **shared machine-level layers**

The important rule is simple:

> large does not mean disposable, and rebuildable does not mean default-cleanup eligible.

## Command Surface

| Command | Role | Default behavior |
| :-- | :-- | :-- |
| `pnpm audit:disk` | non-destructive footprint report | inventories repo-internal, high-related external, and shared layers |
| `pnpm cleanup:repo:safe` | low-risk repo cleanup lane | removes only explicit rebuildable repo-local intermediates |
| `pnpm cleanup:runtime` | runtime/diagnostics cleanup lane | keeps runtime semantics only; does not become the repo-wide cleanup command |
| `pnpm check:pnpm-store-health` | deep cleanup preflight | blocks `node_modules` cleanup when `pnpm` store truth is missing or drifting |

## Classification Matrix

| Class | Example paths | Repo exclusive | Rebuildability | Default cleanup lane | Needs confirmation | Notes |
| :-- | :-- | :-- | :-- | :-- | :--: | :-- |
| Formal outputs | `.runtime-cache/`, `apps/extension/dist/chrome-mv3`, `docs/assets/*` | Yes | Mixed | Not part of `cleanup:repo:safe` | Yes | These are documented outputs or tracked assets, not generic trash. |
| Rebuildable intermediates | `apps/extension/.output`, `apps/extension/.wxt`, `apps/extension/test-results`, `apps/extension/node_modules/.vite/vitest` | Yes | Immediate | `cleanup:repo:safe` | No | Safe local rebuildables. |
| Evidence / state | `.agents`, `.runtime-cache/temp/asset-audit`, support bundles, `~/.chrome-debug-profile`, `~/.campus-copilot-live-*` | Mixed | Mixed / stateful | Candidate-only | Yes | Keep separate from ordinary cache language. |
| Shared layers | `~/Library/Caches/ms-playwright`, `~/Library/Caches/pnpm`, `~/Library/pnpm`, `~/.npm`, `~/.cache/pnpm/prooftrail` | No | Usually rebuildable | Inventory-only | Yes | Shared machine-level layers; do not charge them to this repo by default. |

## Formal Outputs

These paths are explicitly allowed outputs and must not be silently folded into a generic cleanup lane:

- `.runtime-cache/`
- `apps/extension/dist/chrome-mv3`
- `docs/assets/*`

`cleanup:runtime` may remove selected runtime artifacts inside `.runtime-cache/`, but that does **not** mean the whole container is disposable.

For the narrower runtime artifact contract, see [`diagnostics-and-logging.md`](diagnostics-and-logging.md).

## Safe Repo Cleanup Lane

`pnpm cleanup:repo:safe` may delete only these paths:

- `apps/extension/node_modules/.vite/vitest`
- `apps/extension/.wxt`
- `apps/extension/test-results`
- `apps/extension/.output`

It must **not** delete:

- `apps/extension/dist/chrome-mv3`
- `.agents`
- `.runtime-cache/temp/asset-audit`
- the latest support bundle snapshot
- any external directory

This keeps the command honest: it is a low-risk repo-maintenance lane, not a general “make space somehow” button.

## Guarded Deep Cleanup Lane

`node_modules` is the only materially large repo-internal object, but it is intentionally **blocked behind preflight**.

The required sequence is:

1. Run `pnpm check:pnpm-store-health`
2. If the check fails, repair store truth first
3. Delete `node_modules`
4. Re-run `pnpm install --frozen-lockfile`
5. Re-run the deterministic verification bundle:
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm --filter @campus-copilot/extension build`
   - `pnpm --filter @campus-copilot/extension exec playwright test`

Current policy:

- `node_modules` never enters `cleanup:repo:safe`
- `node_modules` cleanup is manual and guarded
- missing or drifting `pnpm` store references are a blocker, not a warning

## High-Related External Candidates

These directories are relevant enough to appear in `pnpm audit:disk`, but they are **candidate-only** and are never auto-deleted:

- `~/.chrome-debug-profile`
- `~/.campus-copilot-live-gui`
- `~/.campus-copilot-live-profile`

Rules:

- record size, mtime, and whether the current repo explicitly references the path
- label browser profiles and repo-name directories as **stateful**
- require confirmation before any deletion

Current default interpretation:

- `~/.chrome-debug-profile` is a high-risk state directory because live scripts default to it
- `~/.campus-copilot-live-gui` and `~/.campus-copilot-live-profile` are high-related candidates, but their ownership/lifecycle still needs explicit confirmation before cleanup

## Shared Inventory Only

These paths are inventoried for truth, but they are not part of the repo’s default cleanup execution scope:

- `~/Library/Caches/ms-playwright`
- `~/Library/Caches/pnpm`
- `~/Library/pnpm`
- `~/.npm`
- `~/.cache/pnpm/prooftrail`

They may materially affect machine disk usage, but they are shared layers and should not be mislabeled as repo-exclusive waste.

## Relation To Existing Hygiene Checks

- `check:runtime-artifacts` protects repo-root runtime output boundaries
- `check:root-hygiene` protects the allowed root entry set
- `audit:disk` explains **what currently exists and how it should be classified**
- `cleanup:repo:safe` performs the low-risk local cleanup lane
- `check:pnpm-store-health` protects the deep dependency rebuild lane

These commands complement each other; they do not replace one another.
