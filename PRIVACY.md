# Privacy

Campus Copilot is designed to stay **local-first** and **read-only**.

This page exists so contributors, reviewers, and browser-store reviewers can quickly understand the privacy posture without reading the whole repository.

## Plain-English Summary

- your study context is meant to stay local by default
- the formal product path is read-only
- Campus Copilot does not require `cookies` permission
- AI runs **after structure** over normalized workspace results, not over raw campus pages or raw cookies

## Current Extension Permissions

The formal extension permissions are:

- `sidePanel`
- `activeTab`
- `scripting`
- `downloads`
- `storage`

Current host permissions are limited to:

- `https://canvas.uw.edu/*`
- `https://www.gradescope.com/*`
- `https://edstem.org/*`
- `https://us.edstem.org/*`
- `https://my.uw.edu/*`
- local loopback BFF hosts

## What The Product Does Not Claim

Campus Copilot does **not** currently claim:

- write-capable campus-site automation
- background cookie harvesting
- hosted autonomy
- public live-browser control

## Sensitive Data Rules

The repository and public docs must not expose:

- real `.env` values
- provider secrets or private keys
- local absolute paths
- unredacted sensitive logs
- raw session material

Ignored local-only materials may still exist on a maintainer machine.
They do **not** count as a repository leak unless they enter tracked files, reachable git history, screenshots, support bundles, workflow logs, or published documentation.

## Related Canonical Files

- [`SECURITY.md`](SECURITY.md)
- [`docs/07-security-privacy-compliance.md`](docs/07-security-privacy-compliance.md)
- [`docs/integration-boundaries.md`](docs/integration-boundaries.md)
- [`docs/live-validation-runbook.md`](docs/live-validation-runbook.md)
