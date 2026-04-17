# Documentation Router

This file is the docs front door.

Treat it like airport signs, not a second maintainer dashboard:

- start with the route that matches your intent
- read the shortest stable brief first
- only then go into proof, builder, or owner-side distribution routes

The public story stays the same as the main README:
**Campus Copilot is the flagship decision workspace, and OpenCampus is the family name above it.**

## Start Here By Intent

- **I want the student-facing product first**: [`../README.md`](../README.md), then [`01-product-prd.md`](01-product-prd.md), then [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
- **I want to understand how the four-site desk is built**: [`02-system-architecture.md`](02-system-architecture.md), then [`03-domain-schema.md`](03-domain-schema.md), then [`04-adapter-spec.md`](04-adapter-spec.md)
- **I want repo-local proof that the story is real**: [`site-capability-matrix.md`](site-capability-matrix.md), then [`verification-matrix.md`](verification-matrix.md) if I need the deeper maintainer-facing verification registry, then [`storefront-assets.md`](storefront-assets.md) only if I need the narrower proof appendix
- **I want the exact safety and boundary posture**: [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md), then [`integration-boundaries.md`](integration-boundaries.md), then [`../PRIVACY.md`](../PRIVACY.md)
- **I want the integration/API surface after the product shape is clear**: [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md), then [`api/openapi.yaml`](api/openapi.yaml), then [`../examples/README.md`](../examples/README.md)
- **I want distribution or store routes**: [`../DISTRIBUTION.md`](../DISTRIBUTION.md)

## Default Newcomer Route

If you only want one sane reading path, use this order:

1. [`../README.md`](../README.md)
2. [`01-product-prd.md`](01-product-prd.md)
3. [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
4. [`site-capability-matrix.md`](site-capability-matrix.md)
5. [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md)
6. [`verification-matrix.md`](verification-matrix.md) only after the public product/boundary story is already clear

## Proof And Launch Lane

Use this route when you need stable repo-local proof without turning the docs hub into a launch control room:

1. [`site-capability-matrix.md`](site-capability-matrix.md)
2. [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md)
3. [`verification-matrix.md`](verification-matrix.md) for the deeper maintainer/operator verification registry
4. [`storefront-assets.md`](storefront-assets.md) as the narrower proof appendix
5. [`../DISTRIBUTION.md`](../DISTRIBUTION.md)

Keep the split honest:

- proof docs explain what the repo can show
- owner-side launch or listing steps still belong in [`../DISTRIBUTION.md`](../DISTRIBUTION.md)
- builder/public routes still belong in package READMEs and [`../examples/README.md`](../examples/README.md)

## Builder Lane

Use this route only when you already understand the product and need the integration surface:

1. [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md)
2. [`api/openapi.yaml`](api/openapi.yaml)
3. [`../examples/README.md`](../examples/README.md)
4. [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md)
5. [`../skills/README.md`](../skills/README.md)

## Public Docs Snapshot

The shortest public-safe docs set is built around:

- [`01-product-prd.md`](01-product-prd.md)
- [`02-system-architecture.md`](02-system-architecture.md)
- [`03-domain-schema.md`](03-domain-schema.md)
- [`04-adapter-spec.md`](04-adapter-spec.md)
- [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
- [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md)
- [`api/openapi.yaml`](api/openapi.yaml)

Supporting routes that stay useful but clearly secondary:

- [`05-ai-provider-and-runtime.md`](05-ai-provider-and-runtime.md)
- [`verification-matrix.md`](verification-matrix.md)
- [`site-capability-matrix.md`](site-capability-matrix.md)
- [`integration-boundaries.md`](integration-boundaries.md)
- [`storefront-assets.md`](storefront-assets.md)
- [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md)

## Rules

- One technical fact must be fully maintained in one canonical place.
- The numbered briefs are summaries, not long historical diaries.
- Public docs should route people into the product, proof, and builder surfaces without turning the docs hub into a maintainer control room.
- If a fact belongs to runtime verification, keep it with [`verification-matrix.md`](verification-matrix.md) or [`live-validation-runbook.md`](live-validation-runbook.md).
- If a fact belongs to API/integration fit, keep it with [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md) or [`api/openapi.yaml`](api/openapi.yaml).
- Use [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md) plus [`../examples/README.md`](../examples/README.md) as the second-layer builder router instead of expanding this hub with every MCP or plugin packet.
- If a fact belongs to owner-side launch or publication, route to [`../DISTRIBUTION.md`](../DISTRIBUTION.md) instead of expanding the docs front door.
