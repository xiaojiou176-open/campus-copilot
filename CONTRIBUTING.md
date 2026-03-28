# Contributing

Campus Copilot is a local-first study workspace, not a generic chatbot demo.

That means contributions must protect this ordering:

1. schema before UI convenience
2. adapters before AI shortcuts
3. normalized data before explanation
4. deterministic gates before manual claims
5. read-only safety before automation

## Canonical Contributor Path

Read these first:

1. [`README.md`](README.md)
2. [`docs/09-implementation-decisions.md`](docs/09-implementation-decisions.md)
3. [`docs/verification-matrix.md`](docs/verification-matrix.md)
4. [`docs/integration-boundaries.md`](docs/integration-boundaries.md)
5. [`docs/diagnostics-and-logging.md`](docs/diagnostics-and-logging.md)
6. The relevant numbered brief in [`docs/README.md`](docs/README.md) for the subsystem you are touching

The numbered docs under `docs/01-08` are now concise English canonical briefs.
Do not treat them as free-form long essays, and do not create translated duplicates.

## Repository Rules

- Keep **AI after structure**. Do not send raw DOM, raw HTML, cookies, or site-specific raw payloads to AI.
- Keep the formal product path **read-only** unless the repository explicitly promotes a write capability.
- Do not describe private, internal, session-backed, page-state, or DOM fallback paths as stable public APIs.
- Do not silently expand extension permissions, especially around `cookies`.
- Do not add a second hand-maintained source of truth for the same technical fact.
- Do not add manual, provider-dependent, or multimodal checks to the default required CI lane.

## Required Verification

At minimum, repository-facing changes should satisfy:

```bash
pnpm verify
```

If you change docs, governance, or public collaboration surfaces, those checks are already part of the deterministic gate. Do not describe them as optional if `pnpm verify` now includes them.

## Review Expectations

Pull requests should explain:

- what repository capability actually changes
- what boundary or contract was touched
- how the change was verified
- whether any compatibility bridge was introduced
- when that bridge must be removed

## What Not To Do

- Do not turn `README.md` into a live operations diary.
- Do not move manual browser-session evidence back into high-authority docs.
- Do not reintroduce Chinese-only maintainer-critical truth into the default contributor path.
- Do not add undocumented root outputs, cache paths, or runtime artifacts.
