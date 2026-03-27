# Verification Matrix

This file is the canonical registry for repository-facing verification.

Think of it like a building inspection board:

- some checks are required before the building opens
- some checks are manual specialist inspections
- some checks are useful local probes, but not merge blockers

## Verification Lanes

| Command / Lane | Type | Default owner | Required for PR gate | What it proves | What it does not prove |
| :-- | :-- | :-- | :--: | :-- | :-- |
| `pnpm typecheck` | deterministic repo gate | contributor / CI | Yes | workspace type validity | live site behavior |
| `pnpm test` | deterministic repo gate | contributor / CI | Yes | repository tests across packages | real authenticated browser sessions |
| `pnpm smoke:api` | deterministic local smoke | contributor / CI | Yes | local BFF health and provider status endpoint wiring | real provider round-trip |
| `pnpm --filter @campus-copilot/extension build` | deterministic repo gate | contributor / CI | Yes | extension can build | real extension install/use |
| `pnpm --filter @campus-copilot/extension exec playwright test` | deterministic repo smoke | contributor / CI | Yes | built extension UI contract under controlled mocks | real site sync or full extension E2E |
| `pnpm verify` | deterministic umbrella gate | contributor / CI | Yes | required repository gate bundle | manual live or provider proofs not included in `verify` |
| `pnpm smoke:provider` | environment-dependent smoke | local developer | No | current environment can complete a provider round-trip | stable provider coverage or required CI proof |
| `pnpm smoke:sidepanel` | environment-dependent smoke | local developer | No | built sidepanel page can talk to current BFF/provider path | full extension E2E |
| `pnpm smoke:support` | local diagnostics smoke | local developer | No | support bundle generation still works | product-path correctness |
| `pnpm preflight:live` | manual environment probe | local developer | No | current machine/session readiness for live validation | site adapter correctness |
| `pnpm diagnose:live` | manual environment probe | local developer | No | current environment blockers summary | stable product behavior |
| `pnpm probe:live` | manual live probe | local developer | No | current browser session can be inspected | stable live sync support |
| `pnpm check:docs:ssot` | deterministic governance check | contributor / CI | Yes | README/docs roles and forbidden live/platform drift are guarded | product runtime correctness |
| `pnpm check:verification-claims` | deterministic governance check | contributor / CI | Yes | docs do not overclaim what `verify` covers | live site correctness |
| `pnpm check:public-surface` | deterministic governance check | contributor / CI | Yes | public collaboration shell files exist and README avoids repo-external hard assertions | GitHub settings state |
| `pnpm check:actions-pinning` | deterministic governance check | contributor / CI | Yes | workflow actions are pinned by commit SHA | runtime code quality |
| `pnpm check:english-canonical` | deterministic governance check | contributor / CI | Yes | canonical collaboration docs stay in English | UI localization strategy |
| `pnpm check:logging-schema` | deterministic governance check | local developer | No | support/live scripts keep `runId` and avoid absolute-path style exposure | full runtime observability maturity |
| `pnpm check:runtime-artifacts` | deterministic hygiene check | local developer | No | top-level runtime artifact paths stay controlled | nested runtime output drift |
| `pnpm check:root-hygiene` | deterministic hygiene check | local developer | No | obvious root noise such as `.DS_Store` stays out of the worktree | full output-path governance |

## Command Classification Rules

### Required

Required means:

- deterministic
- repeatable on repository inputs
- safe for default `pull_request` / `push` CI

### Optional

Optional means:

- useful local smoke
- still deterministic enough to run manually
- not a merge blocker by default

### Manual

Manual means:

- depends on a real browser session, local credentials, or current environment state
- must never be confused with a default required CI lane

## Claims Policy

The repository must not claim that `pnpm verify` covers:

- `pnpm smoke:provider`
- `pnpm smoke:sidepanel`
- `pnpm smoke:support`
- `pnpm preflight:live`
- `pnpm diagnose:live`
- `pnpm probe:live`
- manual live site counts

Those belong to optional/manual lanes unless they are explicitly promoted and wired into the required gate.

## Required CI Topology

Default repository CI should prioritize:

- deterministic
- reproducible
- low-cost
- low-drift

That means:

- do keep `verify`
- do keep deterministic docs/governance checks
- do keep security scans that do not depend on local secrets or manual browser sessions
- do **not** add provider-key-dependent or Gemini/multimodal/manual live checks to required CI

## Evidence Language

Use these phrases consistently:

- “required repository gate”
- “optional local smoke”
- “manual live validation”
- “not part of `pnpm verify`”

Avoid these phrases unless you can prove them from the gate itself:

- “fully covered by CI”
- “repository-proven live success”
- “merge is blocked on live provider availability”
