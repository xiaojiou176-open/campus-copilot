# Release Contract

This file defines the repository's current release discipline.

It exists so that `CHANGELOG.md`, tags, and any future release automation do not imply a stronger trust story than the repository can currently prove.

## Current Release Posture

Campus Copilot is currently a source-first public repository.

That means:

- the repository itself is the primary release artifact
- `CHANGELOG.md` is user-facing release narrative
- tags and GitHub Releases should only be created when the source state is reviewable and reproducible
- SBOM, provenance, and attestation are future enhancements, not current claims

## What A Release Must Include

Before creating a tag or GitHub Release:

1. `pnpm verify` must pass on the release candidate branch or commit
2. the release notes must match `CHANGELOG.md`
3. public-facing capability wording must stay consistent with:
   - `README.md`
   - `docs/09-implementation-decisions.md`
   - `policies/integration-boundaries.yaml`
4. no manual live-only success should be promoted into the release notes as deterministic proof

## What A Release Must Not Claim

Do not claim:

- full live site stability
- full provider availability
- official public integration where the registry marks a path as internal, session-backed, state-fallback, or dom-fallback
- supply-chain provenance that the repository does not actually generate

## Current Non-Goals

This repository does not yet treat these as required release gates:

- SBOM generation
- provenance or attestation signing
- multimodal/manual storefront review as a default release blocker
- provider-key-dependent smoke checks in required CI

## Future Upgrade Path

If the repository later introduces packaged artifacts or a stronger public release channel, upgrade this contract in this order:

1. keep `pnpm verify` deterministic and green
2. add a reproducible tag/release process
3. add SBOM/provenance only when they are real generated outputs
4. only then describe that stronger trust posture in public docs
