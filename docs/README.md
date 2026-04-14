# Documentation Router

This file is the docs front door.

Use it like airport signs instead of a filing cabinet:

- start with the route that matches your intent
- read the short canonical brief for that intent
- only then dive into ledgers, proof packets, or builder packaging

The public story stays the same here as it does in the main README:
**student decision workspace first, stable product contracts second, builder surfaces third**.

This router is for stable repository-facing docs.

It is **not** the right place to start from:

- internal wave orchestration
- owner-side release choreography
- marketplace or registry submission queues
- design handoff / implementation-ready UI specs

Those materials may still exist in the repo for maintainer use, but they should
not become the default public front door.

## Start Here By Intent

If you are new, pick one route and ignore the rest for now:

- **I want the student-facing product first**: start with [`../README.md`](../README.md), then [`01-product-prd.md`](01-product-prd.md), then [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
- **I want to understand the four-site substrate**: start with [`02-system-architecture.md`](02-system-architecture.md), then [`03-domain-schema.md`](03-domain-schema.md), then [`04-adapter-spec.md`](04-adapter-spec.md)
- **I want repo-local proof that the current story is real**: start with [`verification-matrix.md`](verification-matrix.md), then [`site-capability-matrix.md`](site-capability-matrix.md), then [`live-validation-runbook.md`](live-validation-runbook.md)
- **I want the exact current-vs-next boundary**: start with [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md), then [`18-v2-product-contract-freeze.md`](18-v2-product-contract-freeze.md), then [`17-academic-expansion-and-safety-contract.md`](17-academic-expansion-and-safety-contract.md)
- **I want the integration/API surface after the product shape is clear**: start with [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md), then [`api/openapi.yaml`](api/openapi.yaml), then [`../examples/README.md`](../examples/README.md)
- **I want distribution or store routes**: start with [`../DISTRIBUTION.md`](../DISTRIBUTION.md), then [`14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md), then [`chrome-web-store-submission-packet.md`](chrome-web-store-submission-packet.md)

## Default Newcomer Route

If you only want one sane reading path, use this order:

1. [`../README.md`](../README.md)
2. [`01-product-prd.md`](01-product-prd.md)
3. [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
4. [`verification-matrix.md`](verification-matrix.md)
5. [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md)
6. [`18-v2-product-contract-freeze.md`](18-v2-product-contract-freeze.md)

That gives you the product shape, the current surface, the scope boundary, and the proof boundary without dumping internal release choreography on your head.

## Proof And Launch Lane

Use this route when you need stable repo-local proof:

1. [`verification-matrix.md`](verification-matrix.md)
2. [`site-capability-matrix.md`](site-capability-matrix.md)
3. [`13-site-depth-exhaustive-ledger.md`](13-site-depth-exhaustive-ledger.md)
4. [`live-validation-runbook.md`](live-validation-runbook.md)

Keep the split honest:

- `verification-matrix.md`, `site-capability-matrix.md`, and `live-validation-runbook.md` are **stable repo-facing proof**
- release/storefront/registry packets are **maintainer or owner-only materials**, not the default docs front door
- the detailed owner-side queues for those lanes should live in local maintainer packets, not in committed public docs
- the current validation contract also splits cleanly into `pre-commit`, `pre-push`, `hosted`, `nightly`, and `manual`, with the exact boundaries living in [`verification-matrix.md`](verification-matrix.md)

## Builder Lane

Use this route only when you already understand the product and need the integration surface:

1. [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md)
2. [`api/openapi.yaml`](api/openapi.yaml)
3. [`../examples/README.md`](../examples/README.md)
4. [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md)
5. [`../skills/README.md`](../skills/README.md)

Integration truth stays intentionally narrow:

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
| [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md) | integration-fit brief | current API surface, ecosystem fit, and future MCP/API substrate direction |
| [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md) | contract-freeze brief | current formal scope vs next-phase vs later |
| [`12-wave4-7-omnibus-ledger.md`](12-wave4-7-omnibus-ledger.md) | maintainer-only omnibus ledger | back-half internal program truth; not the default public route |
| [`13-site-depth-exhaustive-ledger.md`](13-site-depth-exhaustive-ledger.md) | site-depth ledger | exhaustive per-site resource map, classifications, and next-action framing |
| [`14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md) | maintainer-only distribution summary | stable state words for repo-side distribution truth |
| [`15-publication-submission-packet.md`](15-publication-submission-packet.md) | maintainer-only owner boundary brief | where repo-local readiness stops and owner/platform action begins |
| [`17-academic-expansion-and-safety-contract.md`](17-academic-expansion-and-safety-contract.md) | academic expansion + safety contract | next read-only expansion targets, red-zone systems, AI/material boundaries, and cross-surface guardrails |
| [`18-v2-product-contract-freeze.md`](18-v2-product-contract-freeze.md) | latest product contract freeze | freezes the upgraded V2 student-product bar without overclaiming current shipped truth |

## Canonical Reading Order For Maintainers

If you are a maintainer or contributor, read in this order:

1. [`../README.md`](../README.md)
2. [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
3. [`../CLAUDE.md`](../CLAUDE.md) for the public AI collaborator contract
4. [`09-implementation-decisions.md`](09-implementation-decisions.md)
5. [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md)
6. [`18-v2-product-contract-freeze.md`](18-v2-product-contract-freeze.md)
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
| AI/runtime boundary and integration-facing path | [`05-ai-provider-and-runtime.md`](05-ai-provider-and-runtime.md) |
| Academic expansion and safety contract | [`17-academic-expansion-and-safety-contract.md`](17-academic-expansion-and-safety-contract.md) |
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
| Release execution summary | [`release-runbook.md`](release-runbook.md) |
| Release notes summary draft | [`release-notes-wave47-draft.md`](release-notes-wave47-draft.md) |
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
