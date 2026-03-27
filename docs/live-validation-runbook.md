# Live Validation Runbook

This runbook answers one question:

> When we need to validate real site sessions or real provider behavior, how do we do it without confusing manual evidence with deterministic repository gates?

## What This Runbook Is

This file is for:

- manual live validation procedure
- environment-dependent checks
- timestamped session notes
- interpreting live blockers honestly

This file is **not** for:

- repository landing-page copy
- canonical product status
- GitHub settings claims
- stable implementation decisions

For deterministic repository gates, see [`verification-matrix.md`](verification-matrix.md).

## Live Validation Principles

- A manual live success is useful evidence, but it does **not** replace repeatable automated coverage.
- A live blocker may be an environment problem, not a code regression.
- Repo-side deterministic verification and manual live validation must stay separate.
- Manual notes should always include a date and what was actually validated.

## Before You Start

### Required for manual live validation

- a machine with the supported browser installed
- authenticated sessions for the target sites
- enough temporary disk space
- the local BFF running when provider validation is required

### Not implied by this runbook

This runbook does not imply:

- permanent site stability
- CI-required coverage
- GitHub platform-side settings state
- provider availability outside the current validation session

## Validation Lanes

### Lane A — Repository gate

Use:

```bash
pnpm verify
```

What it proves:

- repository typecheck
- unit/integration tests in the repo
- local BFF health smoke
- extension build
- deterministic Playwright smoke

What it does **not** prove:

- live site synchronization
- authenticated browser-session success
- provider availability in the current local environment

### Lane B — Manual environment readiness

Use:

```bash
pnpm cleanup:runtime
pnpm preflight:live
pnpm diagnose:live
```

What it proves:

- whether the current machine is ready to attempt live validation
- whether the browser/profile/CDP prerequisites appear available

What it does **not** prove:

- that a site adapter is correct
- that a real sync path is permanently stable

### Lane C — Manual provider validation

Use:

```bash
pnpm smoke:provider
pnpm smoke:sidepanel
```

What it proves:

- whether the current environment can complete a provider round-trip
- whether the built sidepanel page can talk to the local BFF/provider path

What it does **not** prove:

- that the provider lane belongs in required CI
- that live site sync is covered

### Lane D — Manual live site validation

Use:

```bash
pnpm probe:live
```

plus the relevant extension/manual sync procedure.

What it proves:

- that a current authenticated browser session can be inspected
- that a specific live session may allow a sync attempt

What it does **not** prove:

- long-term stability
- a repeatable deterministic gate

## How To Record A Manual Live Result

When you record a manual live result, always include:

- date
- lane (`provider`, `probe`, `manual site sync`, etc.)
- site or surface
- environment dependency
- what actually succeeded
- what remains unknown

Use wording like:

- “manual live validation on `<date>` suggests …”
- “this result depends on the current authenticated browser session”
- “not promoted to deterministic gate”

Avoid wording like:

- “the repository now guarantees …”
- “CI proves …”
- “stable forever”

## Common Blocker Classes

### Environment blocker

Examples:

- browser not installed
- profile unavailable
- insufficient temporary disk space
- missing provider key

### Session blocker

Examples:

- logged out site session
- site only works from a course page or active tab
- provider account not authenticated

### Product-path blocker

Examples:

- a formal provider path is still missing a required API key
- a site path is still internal/session-backed and needs better disclosure or coverage

## What Must Never Move Back Into High-Authority Docs

Do **not** move these back into `README.md` or `09-implementation-decisions.md`:

- daily site counts
- `localhost:9222`-style operational notes
- one-off “READY” provider answers
- GitHub settings status
- platform alert visibility

Those belong in timestamped live validation notes, not in primary landing or decision docs.
