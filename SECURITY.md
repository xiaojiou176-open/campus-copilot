# Security Policy

Security here is part of the product boundary, not a late-stage decoration.

## Canonical Security Surface

This file is part of the repository’s **English canonical collaboration surface**.

If security guidance appears anywhere else, this file wins.

## Supported Security Posture

Current formal boundaries:

- local-first by default
- manual sync, not silent background scraping
- read-only product flow
- AI, export, and UI consume normalized schema + read models
- no raw cookies in the formal path
- extension permissions stay constrained to `sidePanel`, `activeTab`, `scripting`, `downloads`, and `storage`
- `web_session`, automatic multi-provider routing, and Anthropic are not formal product paths

## Sensitive Integration Surfaces

Some supported capabilities still rely on deeper integration surfaces such as:

- private/internal site paths
- session-backed requests
- page-state extraction
- DOM fallback

Those surfaces may be necessary, but they must never be described as low-risk or permanently stable just because they currently work.

Use [`docs/integration-boundaries.md`](docs/integration-boundaries.md) for the canonical registry of those boundaries.

## How To Report A Security Issue

Please **do not** post secrets, private/internal request details, or exploitable payloads in a public issue.

Preferred reporting path:

1. Use GitHub private vulnerability reporting if it is available for this repository.
2. If private reporting is unavailable, contact the maintainer through the repository owner profile before public disclosure:
   - <https://github.com/xiaojiou176-open>

When reporting, include:

- impacted surface (`extension`, `storage`, `adapter`, `api`, or workflow)
- whether credentials, cookies, provider secrets, host permissions, or uploaded data are involved
- minimum reproduction steps
- expected behavior vs actual behavior

## Especially Sensitive Risks

- permission drift, especially anything that introduces `cookies`
- raw site responses or sensitive session context being stored directly
- AI/BFF uploads that exceed the minimum necessary structured result
- private/internal site paths being marketed as stable public capabilities
- automatic write operations sneaking into the formal read-only path

## Repository Hygiene

This repository should never commit:

- `.env` values
- access tokens or provider secrets
- private keys
- local absolute paths
- unredacted sensitive logs

Use `.env.example` for variable names only, and keep runtime artifacts under controlled output paths.
