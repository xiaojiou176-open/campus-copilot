# @opencampus/sdk

Read-only builder SDK for OpenCampus.

It wraps the local BFF and the imported-workbench snapshot contract without pretending this is already a hosted platform.

If you are still choosing between the all-in-one SDK, the finer-grained SDK slices, CLI, or MCP surfaces, start with [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md) first.

## Install

Current install status: repo-local preview from this monorepo. Do not assume hosted or registry-published SDK distribution from this README alone.

From the repo root:

```bash
pnpm install
pnpm --filter @opencampus/sdk test
```

Shared public-preview proof loop from the repo root:

```bash
pnpm proof:public
```

First file to try:

- [`../../examples/sdk-usage.ts`](../../examples/sdk-usage.ts)

## Current surface

- `OpenCampusApiClient` for `health`, `providerStatus`, and `chat`
- snapshot parsing and workspace summary helpers
- site-filtered snapshot helpers for `canvas`, `gradescope`, `edstem`, and `myuw`

## Current boundary

- local-first
- read-only
- compatible with the Campus consumer seam and the optional local Switchyard runtime path
- not a hosted multi-tenant API

## See also

- [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md)
- [`../../examples/sdk-usage.ts`](../../examples/sdk-usage.ts)
- [`../../examples/workspace-snapshot.sample.json`](../../examples/workspace-snapshot.sample.json)
- [`../../docs/10-builder-api-and-ecosystem-fit.md`](../../docs/10-builder-api-and-ecosystem-fit.md)
