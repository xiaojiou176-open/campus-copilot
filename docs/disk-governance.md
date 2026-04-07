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
| `pnpm audit:disk` | non-destructive footprint report | inventories repo-internal, repo-exclusive external cache, repo-owned browser root, legacy browser-state candidates, shared layers, and repo-named temp residues across the active temp roots |
| `pnpm cleanup:repo:safe` | low-risk repo cleanup lane | removes only explicit rebuildable repo-local intermediates |
| `pnpm cleanup:runtime` | runtime/diagnostics cleanup lane | removes repo-named temp residues, selected `.runtime-cache/` artifacts, and TTL/cap-managed repo-exclusive external cache; does not become the repo-wide cleanup command |
| `pnpm check:pnpm-store-health` | deep cleanup preflight | blocks `node_modules` cleanup when `pnpm` store truth is missing or drifting |

## Classification Matrix

| Class | Example paths | Repo exclusive | Rebuildability | Default cleanup lane | Needs confirmation | Notes |
| :-- | :-- | :-- | :-- | :-- | :--: | :-- |
| Formal outputs | `.runtime-cache/`, `apps/extension/dist/chrome-mv3`, `docs/assets/*` | Yes | Mixed | Not part of `cleanup:repo:safe` | Yes | These are documented outputs or tracked assets, not generic trash. |
| Rebuildable intermediates | `apps/extension/.output`, `apps/extension/.wxt`, `apps/extension/test-results`, `apps/extension/node_modules/.vite/vitest` | Yes | Immediate | `cleanup:repo:safe` | No | Safe local rebuildables. |
| Repo-exclusive external cache | `~/.cache/campus-copilot/cache` | Yes | Rebuildable / TTL-managed | `cleanup:runtime` GC | No | Canonical external cache root for repo-owned generic cache that does not belong inside the repo. |
| Repo-owned browser root | `~/.cache/campus-copilot/browser/chrome-user-data` | Yes | Stateful / session-preserving | Never auto-GC | Yes | Canonical single-instance browser state root for live/browser work. |
| Evidence / state | `.agents`, `.runtime-cache/temp/asset-audit`, support bundles, `~/.chrome-debug-profile`, `~/.campus-copilot-profile13-clone` | Mixed | Mixed / stateful | Candidate-only | Yes | Keep separate from ordinary cache language. |
| Shared layers | `~/Library/Caches/ms-playwright`, `~/Library/Caches/pnpm`, `~/Library/pnpm`, `~/.npm`, `~/.cache/pnpm/prooftrail`, current external `pnpm` install store | No | Usually rebuildable | Inventory-only | Yes | Shared machine-level layers; do not charge them to this repo by default. |

## Formal Outputs

These paths are explicitly allowed outputs and must not be silently folded into a generic cleanup lane:

- `.runtime-cache/`
- `apps/extension/dist/chrome-mv3`
- `docs/assets/*`

`cleanup:runtime` may remove selected runtime artifacts inside `.runtime-cache/`, but that does **not** mean the whole container is disposable.
It may also clear repo-named temp residues such as `campus-copilot-*` under the current temp roots, and it may run TTL/cap GC against the canonical repo-exclusive generic cache root.

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

## Runtime Temp Roots

Do not treat `/tmp` as the only runtime temp root on macOS.

Current rule:

- repo-named temp artifacts created through `mktemp -t campus-copilot-*` or equivalent belong to the **active temp roots**
- `pnpm audit:disk` must inventory:
  - `/tmp`
  - `$TMPDIR` when present
  - `DARWIN_USER_TEMP_DIR` when available
- `pnpm cleanup:runtime` may remove only `campus-copilot-*` residues from those roots

That means:

- a temp residue under `$TMPDIR` is still repo-related even if nothing exists under `/tmp`
- generic temp paths such as `chrome*`, `chrome-mcp-uploads`, or other tool-owned directories are **not** part of the repo cleanup lane by default

## Canonical Repo-Exclusive External Cache

The canonical repo-exclusive external cache root for ordinary cache entries is:

```text
${XDG_CACHE_HOME:-$HOME/.cache}/campus-copilot/cache
```

Override only when you have a strong local reason:

```text
CAMPUS_COPILOT_CACHE_HOME=/custom/path
```

This root is for **repo-owned generic cache only**, not for shared tooling layers and not for canonical browser session state.

Default governance:

- TTL: `168` hours
- total cap: `2048` MiB
- eviction order: delete expired entries first, then trim the oldest remaining entries until the root is back under the cap

Current intent:

- if a cache belongs to Campus Copilot but does not belong inside `.runtime-cache/`, it should move under `~/.cache/campus-copilot/cache/`
- if a cache is shared across repos or tools, it must stay in the shared-layer bucket
- if a path preserves login/session state, it is **not** ordinary cache and must not be silently migrated here

## Canonical Repo-Owned Browser Root

The canonical repo-owned browser root is:

```text
${XDG_CACHE_HOME:-$HOME/.cache}/campus-copilot/browser/chrome-user-data
```

Rules:

- this root contains the repo-owned Chrome `Local State` plus `Profile 1`
- this root is the only supported runtime browser root after bootstrap
- this root is permanent browser state and must never be included in generic TTL/cap cleanup
- the single repo-owned headed Chrome instance should attach here instead of second-launching a fresh root
- this root is not part of generic TTL/cap external cache GC
- this root must be used under a single-instance + CDP-attach contract

The old default Chrome root:

```text
$HOME/Library/Application Support/Google/Chrome
```

and its old `Profile 13` now act only as a one-time migration source.

## Runtime Cache Retention

The internal runtime cache stays in `.runtime-cache/`, but not every child should live forever.

Default retention:

- `.runtime-cache/temp`: `72` hours
- `.runtime-cache/browser-identity`: persistent repo-owned browser lane anchor; do not auto-prune while the canonical lane exists
- `.runtime-cache/browser-evidence`: `168` hours
- `.runtime-cache/live-traces`: `168` hours
- support bundles: keep the newest `3`
- coverage: keep the current readable output and let normal reruns overwrite it

## Local Tooling Workdirs

These repo-root directories are tolerated as local-only tooling state and must stay ignored:

- `.agent`
- `.codex`
- `.claude`

They are not product outputs and should not be committed, but their presence should also not make root hygiene fail.

## Guarded Deep Cleanup Lane

`node_modules` is the only materially large repo-internal object, but it is intentionally **blocked behind preflight**.

The required sequence is:

1. Run `pnpm check:pnpm-store-health`
2. If the check fails, repair store truth first
3. Delete `node_modules`
4. Re-run `pnpm install --frozen-lockfile`
5. Re-run the deterministic verification bundle:
   - `pnpm verify`
   - if you also need the GitHub-hosted browser contract on the same machine, install the managed Playwright browser and run `pnpm verify:hosted`

Current policy:

- `node_modules` never enters `cleanup:repo:safe`
- `node_modules` cleanup is manual and guarded
- missing or drifting `pnpm` store references are a blocker, not a warning

Current install truth note:

- the configured/effective/recorded `pnpm` store may live outside the repo
- when that happens, it must be recorded as a **shared install layer**
- it is still relevant to disk audits, but it must not be mislabeled as repo-exclusive waste

## Legacy Browser-State Candidates

These directories are relevant enough to appear in `pnpm audit:disk`, but they are **legacy state candidates**, not canonical cache roots, and they are never auto-deleted:

- `~/.campus-copilot-profile13-clone`
- `~/.chrome-debug-profile`

Rules:

- record size, mtime, and whether the current repo explicitly references the path
- record whether a current Chrome process is still using the path
- for clone-lane browser roots, also record the largest top-level children so operator review can see what actually grew
- label browser profiles and repo-name directories as **stateful**
- require confirmation before any deletion

Current default interpretation:

- `~/.campus-copilot-profile13-clone` is a **legacy clone-lane root**; it is no longer the default live lane, so future workers should inventory it as a migration candidate instead of treating it as the normal path
- `~/.chrome-debug-profile` is a **legacy debug sandbox**; it is no longer the canonical campus live default and should be treated as migration state rather than a normal working profile
- `$HOME/Library/Application Support/Google/Chrome/Profile 13` is the **one-time source profile for bootstrap**, not the runtime SSOT after migration
If one of these paths exists and no active Chrome process is using it, `pnpm audit:disk` should mark it as a **legacy cleanup candidate**.
That still does **not** authorize automatic deletion; it only shrinks the review tail.

## Shared Inventory Only

These paths are inventoried for truth, but they are not part of the repo’s default cleanup execution scope:

- `~/Library/Caches/ms-playwright`
- `~/Library/Caches/pnpm`
- `~/Library/pnpm`
- `~/.npm`
- `~/.cache/pnpm/prooftrail`
- the current external `pnpm` install store referenced by `configured / effective / recorded` store truth

They may materially affect machine disk usage, but they are shared layers and should not be mislabeled as repo-exclusive waste or silently migrated into `~/.cache/campus-copilot/cache`.

## Non-Attribution Guardrail

Current repo-local governance must stay careful about what it does **not** own.

Do not attribute these machine-wide names to Campus Copilot unless separate process or source evidence links them:

- `docker-ci`
- `clean-room`
- `runner-temp`
- `batch-auth-run-service`
- `code_sign_clone`
- `chrome-devtools-mcp`

They may matter during a full-machine incident review, but they are not part of the repo's default cleanup or ownership contract by name alone.

## Relation To Existing Hygiene Checks

- `check:runtime-artifacts` protects repo-root runtime output boundaries
- `check:root-hygiene` protects the allowed root entry set
- `audit:disk` explains **what currently exists and how it should be classified**, including repo-exclusive external cache policy and legacy browser-state candidates
- `cleanup:repo:safe` performs the low-risk local cleanup lane
- `cleanup:runtime` performs TTL/cap-managed runtime cleanup without crossing into repo build intermediates or shared caches
- `check:pnpm-store-health` protects the deep dependency rebuild lane

These commands complement each other; they do not replace one another.
