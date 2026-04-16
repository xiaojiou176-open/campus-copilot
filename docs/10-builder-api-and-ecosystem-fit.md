# Integration API And Ecosystem Fit

This brief is the integration appendix, not the product front door.

Read it after [`../README.md`](../README.md) and the product docs are already clear.

It answers one narrow question:

> What can a builder honestly use today, what is still preview-grade, and what still belongs to later packaging or owner-side distribution?

## Current Truth

Campus Copilot already has a real but secondary read-side integration spine:

- a thin local HTTP edge in `apps/api`
- shared contracts in `packages/schema`
- local read models in `packages/storage`
- export-ready outputs in `packages/exporter`
- a repo-local provider-runtime seam in `packages/provider-runtime`
- read-only preview packages for `SDK / CLI / MCP / site APIs`

That makes the repo useful for builders who want structured academic context instead of raw browser noise.

It does **not** make the repo:

- a hosted API platform
- a hosted MCP platform
- a hosted SDK platform
- a write-capable campus operator runtime

All integration-facing surfaces here still inherit the same public safety boundary summarized in [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md):

- no registration automation
- no `Register.UW` / `Notify.UW` product path
- no default AI ingestion of raw course files or instructor-authored materials
- no rebranding of internal/session-backed academic paths as official public APIs

## What Is Real Today

| Surface | Truthful current status | Read next |
| :-- | :-- | :-- |
| local HTTP edge | current, repo-local, read-only consumer seam | [`api/openapi.yaml`](api/openapi.yaml) |
| shared schema/storage/export substrate | current | [`03-domain-schema.md`](03-domain-schema.md), [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md) |
| provider-runtime seam | current, optional local bridge | [`05-ai-provider-and-runtime.md`](05-ai-provider-and-runtime.md) |
| SDK / CLI / MCP / site API preview packages | real, but still preview-grade and repo-local | [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md) |
| repo-side publication truth | repo-local only | [`../DISTRIBUTION.md`](../DISTRIBUTION.md) |

If you want the shortest contract read-back, use [`api/openapi.yaml`](api/openapi.yaml).

## Fast Consumer Routes

Open the first router that matches your control surface instead of reverse-engineering the whole repo:

| Need | Open this first |
| :-- | :-- |
| general builder router | [`../examples/README.md`](../examples/README.md) |
| toolbox chooser | [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md) |
| API contract | [`api/openapi.yaml`](api/openapi.yaml) |
| Codex / Claude MCP setup | [`../examples/integrations/README.md`](../examples/integrations/README.md) |
| stdio MCP examples | [`../examples/mcp/README.md`](../examples/mcp/README.md) |
| repo-side publication truth | [`../DISTRIBUTION.md`](../DISTRIBUTION.md) |

Deeper preview packets still exist, but they stay behind those routers:
[`../examples/integrations/plugin-bundles.md`](../examples/integrations/plugin-bundles.md) and [`../skills/README.md`](../skills/README.md).

## Scope Split

| Capability | Status |
| :-- | :-- |
| thin local HTTP/API contract | current |
| shared schema/storage/export substrate | current |
| cited AI over structured outputs | current |
| optional local `Switchyard` bridge | current, optional |
| repo-public read-only SDK / CLI / MCP / site API preview packages | current, preview-grade |
| public plugin packaging | later |
| registry publication / official listing | later |
| hosted / SaaS autonomy layer | no-go for current scope |
| write-capable MCP | no-go for current scope |

## Planning/Admin Expansion Reminder

The integration layer can mention read-only expansion, but it must keep maturity honest:

- `MyPlan` and `Time Schedule` now have partial repo-side read-only lanes
- `DARS`, `DawgPath`, and class-search-only `ctcLink` are still narrower and must not be described as first-class shipped site support
- none of those lanes imply registration automation or full upstream-site parity

## What Builders Should Not Assume Yet

Do not assume the current repo already provides:

- a hosted or multi-tenant public API
- a public MCP server or official registry listing
- generated clients
- a versioned hosted SDK surface
- write-capable campus-site automation

## Repo-Local Proof Loop

Use this when the question is:

> Is the current builder/package support layer still runnable and packable inside the repo?

```bash
pnpm proof:public
```

It proves repo-local packaging and router alignment.
It does **not** prove hosted distribution, registry publication, or marketplace listing.

## Canonical Cross-References

- Public landing page: [`../README.md`](../README.md)
- Public capability snapshot: [`site-capability-matrix.md`](site-capability-matrix.md)
- AI/runtime boundary: [`05-ai-provider-and-runtime.md`](05-ai-provider-and-runtime.md)
- Export and product surfaces: [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
- Distribution truth: [`../DISTRIBUTION.md`](../DISTRIBUTION.md)
- Security and privacy brief: [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md)
