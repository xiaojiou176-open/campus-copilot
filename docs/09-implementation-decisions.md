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
- export presets from normalized data
- thin BFF for `OpenAI` and `Gemini` API-key flows
- deterministic repository verification through `pnpm verify`

## Current Non-Formal Paths

These are still out of the formal path:

- `web_session`
- automatic multi-provider routing
- Anthropic
- OAuth as the default runtime path
- automatic write operations

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
