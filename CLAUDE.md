# CLAUDE.md

This file is the public AI collaborator contract for Campus Copilot.

Use it together with:

- [`README.md`](README.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`SECURITY.md`](SECURITY.md)
- [`docs/07-security-privacy-compliance.md`](docs/07-security-privacy-compliance.md)
- [`docs/verification-matrix.md`](docs/verification-matrix.md)
- [`docs/integration-boundaries.md`](docs/integration-boundaries.md)

## Repository Identity

Campus Copilot is a local-first study workspace for `Canvas`, `Gradescope`, `EdStem`, and `MyUW`.

Its order of operations is fixed:

1. schema and contracts
2. adapters and normalization
3. storage and read models
4. workbench and export
5. AI explanation after structure

It is not a generic chatbot shell, and it is not a high-permission automation product.

## Public Collaboration Guardrails

- Keep the default public PR lane GitHub-hosted, deterministic, and low-cost.
- Do not reintroduce `self-hosted`, `shared-pool`, or equivalent private runner assumptions as the current default for public CI.
- Keep provider-dependent, live-session, manual, or external-system checks out of the default required PR gate.
- Treat any secrets, live, or external lane as manual-only and environment-dependent unless the repository formally promotes it.
- Do not claim that platform-side GitHub settings are repo-proven facts unless they are fresh-checked in the current turn.

## Product And Data Boundaries

- Keep AI after structure.
- Do not send raw DOM, raw HTML, cookies, or raw adapter payloads to AI.
- Do not send raw course files, instructor-authored materials, or exams into the default AI path.
- Keep the formal product path read-only.
- Do not present private, internal, session-backed, page-state, or DOM fallback paths as stable public APIs.
- Do not silently expand extension permissions, especially around `cookies`.
- Do not introduce `Register.UW` / `Notify.UW` automation or registration-related polling into the formal product path.

## Verification Contract

The default repository gate is:

```bash
pnpm verify
```

Use [`docs/verification-matrix.md`](docs/verification-matrix.md) for the canonical distinction between:

- required repository gates
- optional local smoke
- manual live validation
- manual fixture-preparation lanes

Do not describe manual or environment-dependent lanes as if they are part of the required public PR contract.

## Live Evidence And Fixture Promotion

When manual live work is needed:

1. probe the current environment honestly
2. capture raw evidence outside canonical docs
3. run `pnpm redact:live-fixture -- --kind ...`
4. review the redacted candidate for secrets, personal data, and unnecessary text
5. only then promote the reviewed fixture into tracked regression coverage

Do not commit unreviewed browser dumps.

## Completion Rules

Before claiming a repository-facing change is done:

- run the required deterministic gate
- keep docs and scripts in sync
- keep runtime-artifact and root-hygiene rules satisfied
- separate repo facts from platform-only facts

If something still exists only in a local branch or dirty worktree, it is not fully closed out.
