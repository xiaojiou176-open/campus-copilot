# Documentation Index

This file is the canonical docs router.

Use it like a building directory:

- `README.md` is the public landing page
- `CONTRIBUTING.md` is the contributor entry point
- the numbered docs below are concise canonical briefs
- `09-implementation-decisions.md` records current locked choices
- `verification-matrix.md` records required vs optional vs manual validation lanes
- `live-validation-runbook.md` records manual live procedure only

## Canonical Reading Order

If you are a maintainer or contributor, read in this order:

1. [`../README.md`](../README.md)
2. [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
3. [`../CLAUDE.md`](../CLAUDE.md) for the public AI collaborator contract
4. [`09-implementation-decisions.md`](09-implementation-decisions.md)
5. [`verification-matrix.md`](verification-matrix.md)
6. [`integration-boundaries.md`](integration-boundaries.md)
7. [`diagnostics-and-logging.md`](diagnostics-and-logging.md)
8. [`disk-governance.md`](disk-governance.md)
9. The relevant numbered brief below for the subsystem you are changing

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

## Supporting Governance Docs

| Need | Canonical file |
| :-- | :-- |
| Public AI collaborator contract | [`../CLAUDE.md`](../CLAUDE.md) |
| Deterministic vs manual validation | [`verification-matrix.md`](verification-matrix.md) |
| Manual live procedure | [`live-validation-runbook.md`](live-validation-runbook.md) |
| External boundary classes | [`integration-boundaries.md`](integration-boundaries.md) |
| Diagnostics contract and output rules | [`diagnostics-and-logging.md`](diagnostics-and-logging.md) |
| Disk footprint governance and cleanup lanes | [`disk-governance.md`](disk-governance.md) |
| GitHub settings-only checklist | [`github-surface-checklist.md`](github-surface-checklist.md) |
| Public asset inventory | [`storefront-assets.md`](storefront-assets.md) |

## Rules

- One technical fact must be fully maintained in one canonical place.
- The numbered briefs are intentionally short. They are canonical summaries, not long historical essays.
- Do not create parallel `*-en.md` or `README` clones under `docs/`.
- If a fact belongs to runtime verification, move it to [`verification-matrix.md`](verification-matrix.md) or [`live-validation-runbook.md`](live-validation-runbook.md), not back into the numbered briefs.
