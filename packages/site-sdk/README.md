# @campus-copilot/site-sdk

Read-only per-site overview helpers on top of the imported-workspace contract.

Use this package when your code only needs one supported site's snapshot view instead of the full derived workspace state.

If you are still choosing between the one-site SDK, whole-workbench SDK, CLI, or MCP surfaces, start with [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md) first.

## Install

Current install status: repo-local preview from this monorepo. Do not assume registry publication from this README alone.

From the repo root:

```bash
pnpm install
pnpm --filter @campus-copilot/site-sdk test
```

Shared public-preview proof loop from the repo root:

```bash
pnpm proof:public
```

First file to try:

- [`../../examples/sdk-usage.ts`](../../examples/sdk-usage.ts)

## Current surface

- `getCanvasOverview`
- `getGradescopeOverview`
- `getEdstemOverview`
- `getMyUwOverview`
- `getSiteOverview`

## Boundary

- snapshot-first
- read-only
- built on `@campus-copilot/workspace-sdk`
- not a live collector and not a public API promise for site internals

## See also

- [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md)
- [`../../examples/workspace-snapshot.sample.json`](../../examples/workspace-snapshot.sample.json)
- [`../../skills/site-snapshot-review/SKILL.md`](../../skills/site-snapshot-review/SKILL.md)
- [`../../skills/site-mcp-consumer/SKILL.md`](../../skills/site-mcp-consumer/SKILL.md)
- [`../../skills/site-overview-audit/SKILL.md`](../../skills/site-overview-audit/SKILL.md)
