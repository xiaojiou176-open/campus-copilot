# Documentation Index

This file is the **documentation router**, not a second project manifesto.

Use it like a building directory:

- the product story belongs in [`../README.md`](../README.md)
- stable technical facts belong in the numbered docs below
- live manual validation belongs in the runbook
- collaboration rules belong in `CONTRIBUTING.md` and `SECURITY.md`

## Canonical Routing

| Need | Canonical file |
| :-- | :-- |
| What the product is | [`01-product-prd.md`](01-product-prd.md) |
| How the system is shaped | [`02-system-architecture.md`](02-system-architecture.md) |
| What the normalized data model looks like | [`03-domain-schema.md`](03-domain-schema.md) |
| How site adapters should behave | [`04-adapter-spec.md`](04-adapter-spec.md) |
| How AI fits after structure | [`05-ai-provider-and-runtime.md`](05-ai-provider-and-runtime.md) |
| What users can see and export | [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md) |
| Security / privacy / compliance boundaries | [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md) |
| Phase ordering and repo writing brief | [`08-phase-plan-and-repo-writing-brief.md`](08-phase-plan-and-repo-writing-brief.md) |
| Current locked implementation decisions | [`09-implementation-decisions.md`](09-implementation-decisions.md) |
| Manual live validation procedure | [`live-validation-runbook.md`](live-validation-runbook.md) |
| Deterministic vs manual verification lanes | [`verification-matrix.md`](verification-matrix.md) |
| Integration boundary registry | [`integration-boundaries.md`](integration-boundaries.md) |
| Diagnostics and logging policy | [`diagnostics-and-logging.md`](diagnostics-and-logging.md) |
| GitHub surface and manual settings checklist | [`github-surface-checklist.md`](github-surface-checklist.md) |

## Reading Order

If you are new to the repository, read in this order:

1. [`01-product-prd.md`](01-product-prd.md)
2. [`02-system-architecture.md`](02-system-architecture.md)
3. [`03-domain-schema.md`](03-domain-schema.md)
4. [`04-adapter-spec.md`](04-adapter-spec.md)
5. [`05-ai-provider-and-runtime.md`](05-ai-provider-and-runtime.md)
6. [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
7. [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md)
8. [`08-phase-plan-and-repo-writing-brief.md`](08-phase-plan-and-repo-writing-brief.md)
9. [`09-implementation-decisions.md`](09-implementation-decisions.md)

Read [`live-validation-runbook.md`](live-validation-runbook.md) only when you are doing manual live checks.

## Document Roles

| File type | Role | Must not do |
| :-- | :-- | :-- |
| Numbered design docs | stable product / architecture / contract facts | must not become daily status reports |
| `09-implementation-decisions.md` | current locked implementation choices | must not become a manual live evidence ledger |
| `live-validation-runbook.md` | manual procedure and timestamped live notes | must not become the main product landing page |
| `../README.md` | public-facing repository landing page | must not become a second runbook or GitHub settings diary |

## Documentation Rules

- One technical fact should be fully maintained in one canonical place.
- Other docs may summarize or point to that fact, but should not hand-sync the full content.
- If a document becomes stale, either update it or remove/redirect it.
- Do not create another “master README” under `docs/`.
