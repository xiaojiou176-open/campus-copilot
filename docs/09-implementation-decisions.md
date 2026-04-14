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
- **cross-site course/work-item clusters and administrative summaries live in storage/read-model space, not in the base site-fact schema**
- **decision logic stays centralized in storage/read models, not in surface-level UI conditionals**
- **`Alert` is treated as a derived read model unless a later contract explicitly promotes it**
- **`Alert` is derived at read time and is not stored as a separate canonical Dexie table in the current repo-local path**
- **formal provider runtime keeps only API-key routes and does not preserve dormant auth-mode branches or reserved OAuth env placeholders**
- **Campus-owned explanation semantics stay above the provider/runtime seam, even when `Switchyard` is used**
- **repo-public read-only SDK / CLI / MCP preview is allowed as long as it stays snapshot-first, thin-BFF-first, and non-hosted**

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
- repo-local workbench views
- course-website family as a read-only repo-side expansion lane on the existing `Course / Assignment / Event / Resource` contracts
- cluster/admin deepwater summaries on the storage/read-model layer
- standalone read-only web workbench over imported workspace snapshots
- Canvas inbox messages and MyUW notice / schedule detail on existing message / announcement / event contracts
- local user-state overlay
- derived decision views such as Focus Queue, Weekly Load, and Change Journal
- export presets from normalized data
- thin BFF for `OpenAI` and `Gemini` API-key flows
- thin BFF / shared consumer seam for a local `Switchyard` runtime
- citation-aware AI answers over structured results
- repo-public read-only SDK / CLI / MCP preview over imported snapshots and the thin BFF
- deterministic repository verification through local `pnpm verify`, plus the GitHub-hosted `Verify` lane / `pnpm verify:hosted` when the managed headless Chromium smoke is required

## Current Non-Formal Paths

These are still out of the formal path:

- new supported sites as a default next step
- standalone transcript / finaid / tuition / accounts runtime domains
- `web_session`
- new provider/auth formal paths beyond the current `OpenAI` and `Gemini` API-key route
- a larger generic chat shell as the primary product surface
- direct site sync from a standalone web surface
- automatic multi-provider routing
- Anthropic
- OAuth as the default runtime path
- automatic write operations
- `cookies` permission expansion
- unpromoted tuition / registration / textbook domains
- internal private client extraction as an externally claimed product deliverable
- hosted or registry-published `MCP / SDK / CLI / Skills / plugin` packaging
- launch-facing `SEO / video` as proof of current product completeness

## Hard Cuts For The Current Direction

The current implementation direction must not:

- add new supported sites before the decision layer exists
- formalize additional provider/auth routes before the decision layer exists
- add automatic posting, submission, or other write paths
- widen extension permissions to include `cookies`
- move ranking or decision logic into surface-specific UI code
- smuggle hosted/public-registry packaging into current builder claims
- smuggle launch ambitions into current shipped scope

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

If a change is only:

- next-phase engineering
- later platform direction
- or launch-facing ambition

then it belongs in [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md), not here.
