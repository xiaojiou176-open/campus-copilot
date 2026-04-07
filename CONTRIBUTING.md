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
2. [`CLAUDE.md`](CLAUDE.md) if you use an AI coding or review assistant
3. [`docs/09-implementation-decisions.md`](docs/09-implementation-decisions.md)
4. [`docs/verification-matrix.md`](docs/verification-matrix.md)
5. [`docs/integration-boundaries.md`](docs/integration-boundaries.md)
6. [`docs/diagnostics-and-logging.md`](docs/diagnostics-and-logging.md)
7. [`docs/disk-governance.md`](docs/disk-governance.md)
8. [`DISTRIBUTION.md`](DISTRIBUTION.md) and [`INTEGRATIONS.md`](INTEGRATIONS.md) if your change touches public routing, bundles, or package claims
9. [`PRIVACY.md`](PRIVACY.md) if your change touches permissions, uploads, or browser-store-facing posture
10. The relevant numbered brief in [`docs/README.md`](docs/README.md) for the subsystem you are touching

The numbered docs under `docs/01-08` are now concise English canonical briefs.
Do not treat them as free-form long essays, and do not create translated duplicates.

## Repository Rules

- Keep **AI after structure**. Do not send raw DOM, raw HTML, cookies, or site-specific raw payloads to AI.
- Keep the formal product path **read-only** unless the repository explicitly promotes a write capability.
- Do not describe private, internal, session-backed, page-state, or DOM fallback paths as stable public APIs.
- Do not silently expand extension permissions, especially around `cookies`.
- Do not add a second hand-maintained source of truth for the same technical fact.
- Do not add manual, provider-dependent, or multimodal checks to the default required CI lane.
- Do not add `self-hosted`, `shared-pool`, or equivalent repo-private runner assumptions back into the default public PR lane.
- Do not add repo-local or repo-external state/cache paths without documenting their cleanup class in [`docs/disk-governance.md`](docs/disk-governance.md).

## Required Verification

At minimum, repository-facing changes should satisfy:

```bash
pnpm verify
```

If you change docs, governance, or public collaboration surfaces, those checks are already part of the deterministic gate. Do not describe them as optional if `pnpm verify` now includes them.

If you need the same browser-contract bundle that the GitHub-hosted required lane runs, use:

```bash
pnpm verify:hosted
```

That hosted lane keeps the deterministic extension Playwright smoke on managed Chromium instead of forcing every local pre-push path to bootstrap browser binaries first.

## Repo-owned Browser Identity

`pnpm browser:launch` now opens or reuses the canonical Campus Copilot browser lane with a generated local identity tab under:

```text
.runtime-cache/browser-identity/index.html
```

That identity tab is the human-facing badge for this repo's browser window. It shows:

- repo label
- CDP URL / port
- repo root
- browser user-data-dir
- profile display name
- profile directory

Use it as the left-most anchor when possible, and pin it manually once if you want a stable visual marker in the tab strip.

You can override the displayed label and accent with:

```bash
CAMPUS_COPILOT_BROWSER_IDENTITY_LABEL=
CAMPUS_COPILOT_BROWSER_IDENTITY_ACCENT=
```

Do not automate Chrome-private avatar/theme/pinned-tab state as part of the normal repo bootstrap. Keep those as manual one-time polish only.

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
