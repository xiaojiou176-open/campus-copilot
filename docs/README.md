# Documentation Router

This file is the docs front door.

Use it like airport signs instead of a filing cabinet:

- start with the route that matches your intent
- read the short canonical brief for that intent
- only then dive into ledgers, proof packets, or builder packaging

The public story stays the same here as it does in the main README:
**student decision workspace first, repo-local proof second, builder surfaces third**.

## Start Here By Intent

If you are new, pick one route and ignore the rest for now:

- **I want the student-facing product first**: start with [`../README.md`](../README.md), then [`01-product-prd.md`](01-product-prd.md), then [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
- **I want to understand the four-site substrate**: start with [`02-system-architecture.md`](02-system-architecture.md), then [`03-domain-schema.md`](03-domain-schema.md), then [`04-adapter-spec.md`](04-adapter-spec.md)
- **I want repo-local proof that the current story is real**: start with [`verification-matrix.md`](verification-matrix.md), then [`launch-packet.md`](launch-packet.md), then [`12-wave4-7-omnibus-ledger.md`](12-wave4-7-omnibus-ledger.md)
- **I want the exact current-vs-next boundary**: start with [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md), then [`13-site-depth-exhaustive-ledger.md`](13-site-depth-exhaustive-ledger.md), then [`08-phase-plan-and-repo-writing-brief.md`](08-phase-plan-and-repo-writing-brief.md)
- **I want the builder/API surface after the product shape is clear**: start with [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md), then [`api/openapi.yaml`](api/openapi.yaml), then [`05-ai-provider-and-runtime.md`](05-ai-provider-and-runtime.md)
- **I want builder-facing examples and public skills**: start with [`../examples/README.md`](../examples/README.md), then [`../skills/README.md`](../skills/README.md), then [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md)
- **I want exact public distribution blockers or publish order**: start with [`14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md), then [`15-publication-submission-packet.md`](15-publication-submission-packet.md)
- **I want the shortest public-ready distribution or integration router**: start with [`../DISTRIBUTION.md`](../DISTRIBUTION.md), [`../INTEGRATIONS.md`](../INTEGRATIONS.md), and [`../PRIVACY.md`](../PRIVACY.md)
- **I want the live/manual validation lane**: start with [`verification-matrix.md`](verification-matrix.md), then [`live-validation-runbook.md`](live-validation-runbook.md), then [`site-capability-matrix.md`](site-capability-matrix.md)

## Default Newcomer Route

If you only want one sane reading path, use this order:

1. [`../README.md`](../README.md)
2. [`01-product-prd.md`](01-product-prd.md)
3. [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
4. [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md)
5. [`verification-matrix.md`](verification-matrix.md)

That gives you the product shape, the current surface, the scope boundary, and the proof boundary without dumping the full internal ledger on your head.

## Proof And Launch Lane

Use this route when you need repo-local evidence, closeout truth, or launch packaging:

1. [`verification-matrix.md`](verification-matrix.md)
2. [`launch-packet.md`](launch-packet.md)
3. [`12-wave4-7-omnibus-ledger.md`](12-wave4-7-omnibus-ledger.md)
4. [`14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md)
5. [`15-publication-submission-packet.md`](15-publication-submission-packet.md)

Keep the split honest:

- `verification-matrix.md` and `launch-packet.md` are **repo-local proof**
- `14-public-distribution-scoreboard.md` and `15-publication-submission-packet.md` include **official listing / owner-only publication** concerns that do not belong on the default student path
- the current validation contract also splits cleanly into `pre-commit`, `pre-push`, `hosted`, `nightly`, and `manual`, with the exact boundaries living in [`verification-matrix.md`](verification-matrix.md)

## Builder Lane

Use this route only when you already understand the product and need the integration surface:

1. [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md)
2. [`api/openapi.yaml`](api/openapi.yaml)
3. [`../examples/README.md`](../examples/README.md)
4. [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md)
5. [`../skills/README.md`](../skills/README.md)

Builder truth stays intentionally narrow:

- read-only preview surfaces are real
- repo-local examples and package docs are real
- official listing, marketplace placement, or owner-managed platform setup are separate questions
- this repo is still not a hosted autonomy platform, a public MCP platform, or a generic AI shell

## Numbered Briefs

| File | Role | Current use |
| :-- | :-- | :-- |
| [`01-product-prd.md`](01-product-prd.md) | product boundary brief | what the repo is and is not |
| [`02-system-architecture.md`](02-system-architecture.md) | architecture brief | runtime chain and truth layers |
| [`03-domain-schema.md`](03-domain-schema.md) | schema brief | canonical entities and modeling rules |
| [`04-adapter-spec.md`](04-adapter-spec.md) | adapter brief | site collection contract and fallback order |
| [`05-ai-provider-and-runtime.md`](05-ai-provider-and-runtime.md) | AI/runtime brief | thin BFF and AI-after-structure rules |
| [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md) | UX/export brief | sidepanel/popup/options/export surfaces |
| [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md) | boundary brief | permissions, privacy, upload limits |
| [`08-phase-plan-and-repo-writing-brief.md`](08-phase-plan-and-repo-writing-brief.md) | execution-order brief | how to extend the repo without breaking its ordering |
| [`09-implementation-decisions.md`](09-implementation-decisions.md) | locked choices | current formal implementation choices |
| [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md) | builder-fit brief | current API surface, ecosystem fit, and future MCP/API substrate direction |
| [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md) | contract-freeze brief | current formal scope vs next-phase vs later |
| [`12-wave4-7-omnibus-ledger.md`](12-wave4-7-omnibus-ledger.md) | omnibus ledger | Wave 4-7 product, browser side-lane, Switchyard seam, builder packaging, and launch truth |
| [`13-site-depth-exhaustive-ledger.md`](13-site-depth-exhaustive-ledger.md) | site-depth ledger | exhaustive per-site resource map, classifications, and next-action framing |
| [`14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md) | distribution ledger | bundle-grade, repo-public, and registry-blocked truth for current builder surfaces |
| [`15-publication-submission-packet.md`](15-publication-submission-packet.md) | submission packet | exact publish order, official URLs, and owner-only next actions for current candidates |

## Canonical Reading Order For Maintainers

If you are a maintainer or contributor, read in this order:

1. [`../README.md`](../README.md)
2. [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
3. [`../CLAUDE.md`](../CLAUDE.md) for the public AI collaborator contract
4. [`09-implementation-decisions.md`](09-implementation-decisions.md)
5. [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md)
6. [`12-wave4-7-omnibus-ledger.md`](12-wave4-7-omnibus-ledger.md)
7. [`13-site-depth-exhaustive-ledger.md`](13-site-depth-exhaustive-ledger.md)
8. [`verification-matrix.md`](verification-matrix.md)
9. [`integration-boundaries.md`](integration-boundaries.md)
10. [`diagnostics-and-logging.md`](diagnostics-and-logging.md)
11. [`disk-governance.md`](disk-governance.md)
12. the relevant numbered brief below for the subsystem you are changing

## Supporting Governance Docs

| Need | Canonical file |
| :-- | :-- |
| Public AI collaborator contract | [`../CLAUDE.md`](../CLAUDE.md) |
| Short truthful distribution router | [`../DISTRIBUTION.md`](../DISTRIBUTION.md) |
| Short truthful integrations router | [`../INTEGRATIONS.md`](../INTEGRATIONS.md) |
| Short privacy posture page | [`../PRIVACY.md`](../PRIVACY.md) |
| AI/runtime boundary and builder-facing path | [`05-ai-provider-and-runtime.md`](05-ai-provider-and-runtime.md) |
| Machine-readable current HTTP contract | [`api/openapi.yaml`](api/openapi.yaml) |
| Builder example router | [`../examples/README.md`](../examples/README.md) |
| Plugin-grade bundle router | [`../examples/integrations/plugin-bundles.md`](../examples/integrations/plugin-bundles.md) |
| Fast package/toolbox chooser | [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md) |
| Public skills router | [`../skills/README.md`](../skills/README.md) |
| Deterministic vs manual validation, including the five-layer CI split | [`verification-matrix.md`](verification-matrix.md) |
| Optional local coverage audit and test-pyramid context | [`verification-matrix.md`](verification-matrix.md) |
| Manual live procedure | [`live-validation-runbook.md`](live-validation-runbook.md) |
| Launch/closeout packet | [`launch-packet.md`](launch-packet.md) |
| Per-site capability snapshot | [`site-capability-matrix.md`](site-capability-matrix.md) |
| Exhaustive per-site depth and classification ledger | [`13-site-depth-exhaustive-ledger.md`](13-site-depth-exhaustive-ledger.md) |
| External boundary classes | [`integration-boundaries.md`](integration-boundaries.md) |
| Diagnostics contract and output rules | [`diagnostics-and-logging.md`](diagnostics-and-logging.md) |
| Disk footprint governance and cleanup lanes | [`disk-governance.md`](disk-governance.md) |
| GitHub settings-only checklist | [`github-surface-checklist.md`](github-surface-checklist.md) |
| Public asset inventory | [`storefront-assets.md`](storefront-assets.md) |
| Release execution checklist | [`release-runbook.md`](release-runbook.md) |
| Release notes draft | [`release-notes-wave47-draft.md`](release-notes-wave47-draft.md) |
| Frozen current-vs-next-vs-later contract | [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md) |

## Rules

- One technical fact must be fully maintained in one canonical place.
- The numbered briefs are intentionally short. They are canonical summaries, not long historical essays.
- Do not create parallel `*-en.md` or `README` clones under `docs/`.
- If a fact belongs to runtime verification, move it to [`verification-matrix.md`](verification-matrix.md) or [`live-validation-runbook.md`](live-validation-runbook.md), not back into the numbered briefs.
- If a fact belongs to AI/agent/MCP fit, put it in a short canonical brief instead of scattering marketing copy across unrelated docs.
- If a fact belongs to the now-vs-next-vs-later boundary, put it in [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md).
- If a fact belongs to longer per-site depth classification, keep it in [`13-site-depth-exhaustive-ledger.md`](13-site-depth-exhaustive-ledger.md) and only keep the short current snapshot in [`site-capability-matrix.md`](site-capability-matrix.md).
- If a fact belongs to the standalone Web workbench's import-based second-surface contract, keep it aligned with [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md) and [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md).
