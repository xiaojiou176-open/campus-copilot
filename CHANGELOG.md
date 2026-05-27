# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog.

## [Unreleased]

### Added

- Added a repo-owned `skills/catalog.json` plus `pnpm check:skill-catalog` so the public read-only skill pack now has machine-readable inventory, pack-level semver, and deterministic validation without pretending to be an upstream marketplace manifest.
- Added a real local container path for the thin BFF with `Dockerfile`, `compose.yaml`, and `pnpm smoke:docker:api`.
- Added short root-level routing pages for distribution, integrations, and privacy so release/distribution readiness stays discoverable without turning the docs tree into a second README maze.
- Added `pnpm check:secret-leaks` as the truthful local convenience gate for tracked/reachable leak checks without misreporting ignored local-only materials as repo leaks.
- Added the Wave 4-7 omnibus ledger for the post-Wave23 back-half SSOT.
- Added a repo-public read-only builder preview across `sdk`, `workspace-sdk`, `site-sdk`, `cli`, `mcp`, `mcp-readonly`, `mcp-server`, and site API preview packages.
- Added browser evidence capture helpers plus HAR-like/network/console support for the internal diagnostics side-lane.
- Added release materials for the owner-side tail: a release runbook, a Wave 4-7 release notes draft, and a truthful demo/video script.
- Added a canonical verification matrix that separates required repository gates from manual live validation.
- Added a GitHub surface checklist for settings and other repository-adjacent checks that cannot be proven from repo files alone.
- Added an integration-boundary registry for official, internal, session-backed, and DOM/state fallback surfaces.
- Added public collaboration scaffolding with `CODEOWNERS`, issue templates, a PR template, and a code of conduct.
- Added `CLAUDE.md` as the public AI collaborator contract for repository-safe assistant work.
- Added a manual live-fixture preparation lane plus redaction tooling and committed redacted adapter regression fixtures for `EdStem`, `Gradescope`, and `MyUW`.
- Added a local user-state overlay for `pin`, `snooze`, `note`, and `dismiss` without polluting canonical site facts.
- Added derived decision views for `Focus Queue`, `Weekly Load`, and `Change Journal`.
- Added citation-aware AI answer contracts plus thin-BFF compatibility for structured answers.

### Changed

- Reworked distribution and publication wording so repo-local proof no longer overclaims a live npm publication for `@campus-copilot/mcp`, and so stdio MCP, container HTTP, browser extension, skill pack, and plugin-grade bundle paths are split more explicitly.
- Reworked the root package metadata so it reads as an intentional source-first public monorepo entry instead of an accidental publish target.
- Reworked the README and builder-fit docs so the builder/toolbox story is no longer only future-facing; it is now described as a truthful read-only preview.
- Reworked the Campus ↔ Switchyard runtime language so Campus keeps student-facing explanation semantics while Switchyard remains behind the runtime seam.
- Reworked the repository landing page to focus on product shape, quickstart, and trust signals instead of manual live-session status.
- Reworked docs routing so `docs/README.md` becomes a lightweight index instead of a second master README.
- Reworked implementation decisions and live validation docs so locked decisions, repository gates, and manual evidence no longer share the same document role.
- Tightened public-collaboration governance checks so `CLAUDE.md`, `.env.example`, and `CHANGELOG.md` stay present and English-canonical.
- Updated the GitHub surface checklist to track branch protection, workflow-permission, and fork-approval posture for public collaboration safety.
- Promoted the formal product shape from an information workbench to a learning decision workspace while preserving the existing local-first, read-only, AI-after-structure boundary.
- Expanded export and extension smoke contracts so decision-layer outputs and citation-aware AI rendering are covered by the existing deterministic gate.

### Security

- Planned GitHub Actions hardening around commit-SHA pinning and public collaboration checks.

### Removed

- Removed the old pattern of using high-authority docs as a hand-synced live evidence ledger.
