# Security, Privacy, And Compliance Brief

Campus Copilot should remain a local-first study workspace, not a high-permission black-box collector.

## Core Security Rules

- local-first by default
- minimal necessary upload
- manual sync, not silent background scanning
- read-only formal product path
- no raw-cookie formal path
- no raw page upload to AI

## Extension Permission Posture

Current formal permissions are intentionally narrow:

- `sidePanel`
- `activeTab`
- `scripting`
- `downloads`
- `storage`

Host permissions are limited to supported study surfaces plus local loopback BFF hosts.

## Sensitive Boundary Rules

- internal and session-backed paths must be described honestly
- DOM and page-state fallbacks must not be marketed as low-risk public APIs
- provider uploads must stay bounded to structured results
- automatic write operations are out of the formal path

## Repo Hygiene Rules

The repository must not commit:

- real `.env` values
- provider secrets
- private keys
- absolute local paths
- unredacted sensitive logs

## Canonical Cross-References

- Site boundary classes: [`integration-boundaries.md`](integration-boundaries.md)
- Diagnostics rules: [`diagnostics-and-logging.md`](diagnostics-and-logging.md)
- Locked implementation choices: [`09-implementation-decisions.md`](09-implementation-decisions.md)
