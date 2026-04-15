# Live Validation Runbook

This file answers one public-safe question:

> When we need real-site or real-provider evidence, how do we keep that evidence separate from deterministic repository gates?

For the stable automated contract, see [`verification-matrix.md`](verification-matrix.md).

## What This File Covers

- manual live validation lanes
- environment-dependent checks
- how to record live evidence honestly
- how to move from a live receipt to a reviewed redacted fixture

## What This File Does Not Cover

- private operator notes
- browser-profile internals
- machine-specific paths
- internal skill routing
- GitHub settings state

Those details are intentionally kept out of the public docs surface.

## Core Rule

Manual live evidence is useful, but it is **not** the same thing as a deterministic repository gate.

In plain language:

- `pnpm verify` tells you the repo still holds together
- live validation tells you what happened in one real session on one real machine

Both matter. They are not interchangeable.

## Validation Lanes

### Lane A — Repository gate

Use:

```bash
pnpm verify
pnpm verify:hosted
```

What it proves:

- typecheck
- repository tests
- build surfaces
- hosted deterministic smoke on the hosted lane

What it does **not** prove:

- current authenticated campus sessions
- current provider login state
- environment-specific browser readiness

### Lane B — Manual environment readiness

Use:

```bash
pnpm cleanup:runtime
pnpm preflight:live
pnpm diagnose:live
```

Use this lane before claiming anything about real browser/session validation.

What it proves:

- the local machine is ready to attempt live validation
- the repo-owned browser lane can be inspected
- the current environment is not obviously blocked by missing prerequisites

What it does **not** prove:

- that any supported site is already authenticated
- that a real sync path is correct

### Lane C — Manual provider validation

Use:

```bash
pnpm smoke:provider
pnpm smoke:sidepanel
```

What it proves:

- the current environment can complete a provider round-trip
- the current sidepanel build can talk to the local provider path

What it does **not** prove:

- that provider behavior belongs in required CI
- that live campus-site sync is covered

### Lane D — Manual live site validation

Use:

```bash
pnpm probe:live
```

What it proves:

- a real authenticated browser session can be inspected
- the current machine can reach the requested site lane
- the current manual session is usable enough for a live receipt

What it does **not** prove:

- permanent adapter correctness
- long-term stability
- deterministic CI coverage

### Lane E — Manual evidence capture and fixture preparation

Use:

```bash
pnpm probe:live
pnpm capture:browser-evidence -- --site <site>
pnpm redact:live-fixture -- --kind <json|html> --input <raw-capture-path> --output <redacted-output-path>
```

What it proves:

- a live session produced a raw sample
- the raw sample can be turned into a redacted candidate fixture
- the repo has a repeatable path from live proof to regression input material

What it does **not** prove:

- that the raw sample is safe to commit without review
- that the resulting fixture belongs in CI automatically
- that a future unsupported depth path is now landed just because the schema could hold it

## How To Treat Live Blockers

Keep blocker classes separate:

- **environment blocker**: browser missing, disk pressure, local BFF not ready
- **session blocker**: logged out, expired session, owner-only MFA or challenge
- **product-path blocker**: the repo does not yet prove a stronger carrier, so implementation would become guesswork

Do not let a single live blocker silently rewrite repository truth.

## How To Record A Manual Live Result

Every manual result should say:

1. date
2. lane
3. site or surface
4. what actually succeeded
5. what remains unknown
6. whether a redacted candidate fixture was produced

Good wording:

- “manual live validation on `<date>` suggests …”
- “this result depends on the current authenticated session”
- “not promoted to deterministic gate”

Bad wording:

- “the repository now guarantees …”
- “CI proves …”
- “stable forever”

## Public-Safe Fixture Discipline

If a live session is good enough to produce adapter evidence:

1. capture the raw sample outside tracked docs
2. redact it into a candidate fixture
3. review it for secrets, personal data, and unnecessary page text
4. only then promote it into the relevant tracked fixture directory

Working rule:

- raw capture is evidence
- redacted reviewed fixture is regression input
- neither one should be confused with a public product claim
