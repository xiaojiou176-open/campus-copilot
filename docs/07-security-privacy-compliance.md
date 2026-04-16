# Security, Privacy, And Compliance Brief

Campus Copilot should remain a reviewable study workspace, not a high-permission black-box collector.

## Core Security Rules

- reviewable local workflow by default
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
That now includes the read-only `myplan.uw.edu` planning/audit host lane for manual `MyPlan / DARS` capture work, but still excludes red-zone registration hosts and keeps the extension cookie-free.
It also now includes a read-only `courses.cs.washington.edu` course-website lane for structured `Home / Syllabus / Schedule / Assignments` extraction without broadening the cookie boundary.

## Sensitive Boundary Rules

- internal and session-backed paths must be described honestly
- DOM and page-state fallbacks must not be marketed as low-risk public APIs
- provider uploads must stay bounded to structured results
- public course websites may supply structured metadata and schedule/task summaries, but that still does not make raw syllabus bodies, raw course files, or past exams AI-readable by default
- automatic write operations are out of the formal path

## Academic-System Guardrails

Future academic-system expansion must stay inside this order:

1. official public API
2. institution-recognized stable session-backed interface or standard integration
3. page-state, internal endpoint, reverse-engineered path, or DOM fallback

Allowed next-lane targets are:

- `MyPlan`
- `DARS`
- `Time Schedule`
- `DawgPath`
- class-search-only `ctcLink`
- `ctcLink class search`

Red-zone surfaces remain:

- `Register.UW`
- `Notify.UW`
- registration-related resources
- seat watching or waitlist polling
- add/drop submission flows
- seat-swap or hold-seat helpers

The product must not:

- access someone else's files, records, or account
- use credentials that do not belong to the current user
- run high-frequency campus-system polling
- present itself as an official UW or SBCTC service
- broaden a convenient hidden endpoint into a stable public-API claim

## AI And Course-Material Rules

The default AI path may consume:

- normalized entities
- structured summaries
- local decision views
- file names, metadata, and jump links

The default AI path must not consume:

- raw course files
- instructor-authored slides or notes
- exams, quizzes, or solution documents
- other course materials whose copyright or sharing status is unclear
- raw DARS / transcript / financial-aid / tuition / account detail

Any future advanced file-analysis lane would require separate opt-in, separate UX, and separate review before it could be promoted into formal scope.

That lane must stay `default-disabled` until a narrower promotion contract explicitly raises it.

High-sensitivity administrative records stay even tighter:

- summary-first if and only if a truthful carrier is landed
- export/review-first before AI
- stronger confirmation for any future transcript / financial-aid / tuition / account detail lane

## Cross-Surface Inheritance

The same safety boundary applies across:

- browser extension
- standalone web workbench
- MCP servers
- public skills
- SDK / CLI / site API preview packages
- plugin-grade repo bundles
- distribution-facing docs and routers

Changing the delivery surface does not create permission to automate a protected academic workflow.

## Repo Hygiene Rules

The repository must not commit:

- real `.env` values
- provider secrets
- private keys
- absolute local paths
- unredacted sensitive logs

## Canonical Cross-References

- Site boundary classes: [`integration-boundaries.md`](integration-boundaries.md)
- Manual live procedure: [`live-validation-runbook.md`](live-validation-runbook.md)
- Repo-writing split: [`08-phase-plan-and-repo-writing-brief.md`](08-phase-plan-and-repo-writing-brief.md)
