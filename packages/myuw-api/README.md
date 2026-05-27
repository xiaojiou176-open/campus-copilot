# @opencampus/myuw-api

Read-only MyUW helpers over the current OpenCampus snapshot contract.

If you are still choosing between this package, `@opencampus/site-sdk`, or the site-sidecar path, start with [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md) first.

## Install

Current install status: repo-local public-ready package candidate with prepack-built `dist/` output. Do not assume registry publication or official listing from this README alone.

From the repo root:

```bash
pnpm install
pnpm --filter @opencampus/myuw-api build
pnpm --filter @opencampus/myuw-api test
```

Shared public-preview proof loop from the repo root:

```bash
pnpm proof:public
```

## Current surface

- `buildMyUwSnapshotView(snapshot, limit?)`

## Minimal usage

See [`../../examples/myuw-api-usage.ts`](../../examples/myuw-api-usage.ts).

## Boundary

- public-ready repo-local packaging over the shared snapshot contract
- not an official MyUW public API claim
- not a live authenticated session helper

## Repo-local public proof

From the repo root, run:

```bash
pnpm proof:public
```

## See also

- [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md)
- [`../../examples/workspace-snapshot.sample.json`](../../examples/workspace-snapshot.sample.json)
- [`../../examples/myuw-api-usage.ts`](../../examples/myuw-api-usage.ts)
- [`../../skills/site-snapshot-review/SKILL.md`](../../skills/site-snapshot-review/SKILL.md)
- [`../../skills/site-mcp-consumer/SKILL.md`](../../skills/site-mcp-consumer/SKILL.md)
