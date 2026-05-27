# @campus-copilot/workspace-sdk

Read-only workspace derivation helpers for imported CampusCopilot snapshots.

Use this package when you want the same decision-layer state the product uses, without opening the extension UI.

It is the right entry point when your code wants the whole workbench's derived state, not just one site's overview.

If you are still choosing between the whole-workbench SDK, one-site SDK, CLI, or MCP surfaces, start with [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md) first.

## Install

Current install status: repo-local preview from this monorepo. Do not assume registry publication from this README alone.

From the repo root:

```bash
pnpm install
pnpm --filter @campus-copilot/workspace-sdk test
```

Shared public-preview proof loop from the repo root:

```bash
pnpm proof:public
```

First file to try:

- [`../../examples/sdk-usage.ts`](../../examples/sdk-usage.ts)

## Current surface

- `parseWorkspaceSnapshot`
- `readWorkspaceSnapshotFile`
- `deriveWorkspaceState`
- `buildWorkspaceSummary`
- `buildSiteOverview`
- `buildWorkspaceExportArtifact`
- `buildAiRuntimeRequest`

## Boundary

- imported snapshots only
- shared schema/storage/export/AI contract
- no live site sync
- no write-capable automation

## See also

- [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md)
- [`../../examples/workspace-snapshot.sample.json`](../../examples/workspace-snapshot.sample.json)
- [`../../examples/sdk-usage.ts`](../../examples/sdk-usage.ts)
- [`../../skills/read-only-workspace-analysis/SKILL.md`](../../skills/read-only-workspace-analysis/SKILL.md)
- [`../../skills/current-view-triage/SKILL.md`](../../skills/current-view-triage/SKILL.md)
