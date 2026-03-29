# Implementation Decisions

This document records the **currently locked implementation decisions** for the repository.

It is an addendum to the numbered design docs, not a live evidence ledger.

If you need manual live results, use [`live-validation-runbook.md`](live-validation-runbook.md).

## Locked Engineering Decisions

### Repository and runtime

- `pnpm workspace`
- `WXT`
- `React + TypeScript`
- `Zod`
- `Dexie + dexie-react-hooks`
- `Vitest`
- `Playwright`
- `MSW`
- `Papa Parse`
- `ical-generator`

### Architecture-level decisions

- **AI after structure**
- **Dexie = canonical local entities**
- **read models are derived from normalized site snapshots**
- **manual sync is the formal trigger**
- **no raw cookies in the formal product path**
- **product work deepens the learning decision layer instead of expanding formal boundaries**
- **site facts, local user-state overlay, and derived decision views are separate layers**
- **decision logic stays centralized in storage/read models, not in surface-level UI conditionals**
- **`Alert` is treated as a derived read model unless a later contract explicitly promotes it**

### Extension permission posture

The extension permission posture is intentionally constrained to:

- `activeTab`
- `scripting`
- `sidePanel`
- `downloads`
- `storage`

Host permissions are limited to the currently supported study surfaces plus local loopback BFF hosts.

## Current Formal Product Paths

The repository currently treats these as formal paths:

- normalized multi-site extension runtime
- local-first workbench views
- local user-state overlay
- derived decision views such as Focus Queue, Weekly Load, and Change Journal
- export presets from normalized data
- thin BFF for `OpenAI` and `Gemini` API-key flows
- citation-aware AI answers over structured results
- deterministic repository verification through `pnpm verify`

## Current Non-Formal Paths

These are still out of the formal path:

- new supported sites as a default next step
- `web_session`
- new provider/auth formal paths beyond the current `OpenAI` and `Gemini` API-key route
- a larger generic chat shell as the primary product surface
- automatic multi-provider routing
- Anthropic
- OAuth as the default runtime path
- automatic write operations
- `cookies` permission expansion

## Hard Cuts For The Current Direction

The current implementation direction must not:

- add new supported sites before the decision layer exists
- formalize additional provider/auth routes before the decision layer exists
- add automatic posting, submission, or other write paths
- widen extension permissions to include `cookies`
- move ranking or decision logic into surface-specific UI code

## Verification Policy

Use [`verification-matrix.md`](verification-matrix.md) as the canonical verification registry.

This file intentionally does **not** record:

- daily live site counts
- one-off browser-session evidence
- GitHub platform-side settings state
- temporary environment blockers

## Integration Policy

Use [`integration-boundaries.md`](integration-boundaries.md) as the canonical registry for:

- official vs internal site surfaces
- session-backed requests
- page-state and DOM fallbacks
- public-safe wording

## Decision Hygiene

If a change belongs to “current locked implementation choices,” it can live here.

If it belongs to:

- a product definition
- a stable architecture rule
- a manual validation procedure
- a temporary live result

then it belongs somewhere else.
