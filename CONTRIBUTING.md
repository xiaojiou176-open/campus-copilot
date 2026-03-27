# Contributing

Campus Copilot is a local-first study workspace, not a generic chatbot demo.

That means contributions must protect the repository’s core ordering:

1. schema before UI convenience
2. adapters before AI shortcuts
3. normalized data before explanation
4. read-only safety before automation

## Canonical Collaboration Surface

This file is part of the repository’s **English canonical collaboration surface**.

Public collaboration rules should be updated here first. If localized summaries exist in the future, they must link back to this file instead of becoming a second source of truth.

## Read This First

Before proposing changes, read:

1. [`docs/01-product-prd.md`](docs/01-product-prd.md)
2. [`docs/02-system-architecture.md`](docs/02-system-architecture.md)
3. [`docs/03-domain-schema.md`](docs/03-domain-schema.md)
4. [`docs/04-adapter-spec.md`](docs/04-adapter-spec.md)
5. [`docs/09-implementation-decisions.md`](docs/09-implementation-decisions.md)
6. [`docs/verification-matrix.md`](docs/verification-matrix.md)
7. [`docs/integration-boundaries.md`](docs/integration-boundaries.md)

## Repository Rules

- Keep **AI after structure**. Do not bypass schema/read-model layers by sending raw DOM, raw HTML, or cookies to AI.
- Keep the workflow **read-only** unless the repository explicitly promotes a write capability into the formal product path.
- Do not describe private/internal paths as stable official capabilities.
- Do not silently expand extension permissions, especially around `cookies`.
- Do not add a second hand-maintained source of truth for the same technical fact.
- Do not add manual or third-party-API-dependent checks to the default required CI lane.

## Required Verification

Use [`docs/verification-matrix.md`](docs/verification-matrix.md) as the single source of truth.

At minimum, repository-facing changes should satisfy:

```bash
pnpm verify
```

If you touch documentation / governance surfaces, also run the deterministic repository checks that back those rules:

```bash
pnpm check:docs:ssot
pnpm check:verification-claims
pnpm check:public-surface
pnpm check:actions-pinning
pnpm check:english-canonical
```

## Review Expectations

Pull requests should explain:

- what real repository capability changes
- what boundary or contract was touched
- how the change was verified
- whether any compatibility bridge was introduced
- when that bridge must be removed

## What Not To Do

- Do not treat mock smoke results as live end-to-end proof.
- Do not grow README into a second runbook.
- Do not keep stale operational facts in `docs/09-implementation-decisions.md`.
- Do not hide uncertainty about external integrations.
- Do not add undocumented top-level output paths, cache paths, or runtime artifacts.
