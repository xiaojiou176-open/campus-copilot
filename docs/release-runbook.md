# Release Runbook

This runbook turns the remaining release work into a sequence of explicit owner actions.

Use it after the repository side is already landed on `main` and the worktree is clean.

## Goal

Make the final release step feel like checking off a boarding checklist, not reinventing the trip plan.

This runbook covers:

- release notes preparation
- package publishing decisions
- GitHub release page preparation
- demo/video preparation handoff

It does **not** cover:

- additional product implementation
- live campus-site automation beyond current read-only scope
- hosted platform rollout

## Preconditions

- `main...origin/main`
- clean worktree
- latest required PRs merged
- fresh repository gates already passed

Recommended proof set:

```bash
pnpm verify
pnpm proof:public
pnpm audit:public-distribution
pnpm smoke:provider
pnpm smoke:sidepanel
pnpm test:coverage
bash scripts/support-bundle-smoke.sh
```

Run those serially in that order.
Also confirm the latest GitHub-hosted `Verify` and `Nightly` workflows are green when you want hosted evidence for the browser smoke, coverage, public-distribution proof, and web interaction lanes.
`bash scripts/support-bundle-smoke.sh` expects the fresh coverage summary produced by `pnpm test:coverage`.
`pnpm proof:public` is the repo-local proof loop for public package readiness: it proves public routing, help entrypoints, and dry-run pack behavior, not registry publication or marketplace listing.

## Step 1 — Freeze the release story

Read these before writing any public release text:

1. [`README.md`](../README.md)
2. [`docs/12-wave4-7-omnibus-ledger.md`](12-wave4-7-omnibus-ledger.md)
3. [`docs/10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md)
4. [`docs/14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md)
5. [`docs/github-surface-checklist.md`](github-surface-checklist.md)
6. [`CHANGELOG.md`](../CHANGELOG.md)

When official listing or registry work is in scope, read the `Official Listing / Registry Ledger` section inside [`docs/14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md) before you ask the owner to click anything.

## Step 2 — Reuse the draft release notes

Base all public release text on:

- [`docs/release-notes-wave47-draft.md`](release-notes-wave47-draft.md)

Do not improvise broader claims such as:

- hosted MCP
- write-capable automation
- live browser control product
- generic autonomy platform

## Step 3 — Decide package publication scope

Current repo-tracked preview surfaces:

- `@campus-copilot/sdk`
- `@campus-copilot/workspace-sdk`
- `@campus-copilot/site-sdk`
- `@campus-copilot/cli`
- `@campus-copilot/mcp`
- `@campus-copilot/mcp-readonly`
- `@campus-copilot/mcp-server`
- `@campus-copilot/provider-runtime`
- `@campus-copilot/gradescope-api`
- `@campus-copilot/edstem-api`
- `@campus-copilot/myuw-api`

Owner decisions still needed:

| Decision | Why it matters |
| :-- | :-- |
| publish now or stay repo-public only | affects public claims and changelog wording |
| package names and versioning | affects registry compatibility and long-term maintenance |
| which packages stay preview-only | preserves truthful scope and avoids overclaim |

## Step 4 — Prepare the GitHub release page

Suggested ingredients:

- title based on the release notes draft
- short summary paragraph from the draft
- verification block
- link block for README, docs hub, Wave 4-7 ledger, SDK, CLI, MCP, examples

## Step 5 — Prepare demo/video execution

Use:

- [`examples/demo-video-script.md`](../examples/demo-video-script.md)

That script is intentionally short and truthful. It walks through:

- product identity
- extension + web as one product
- cited AI after structure
- read-only builder toolbox preview
- remaining live/browser boundary honesty

## Step 6 — Post-release recheck

After publishing anything public-facing, recheck:

1. README still matches the release page
2. GitHub description/topics/social preview still match the current product truth
3. Video/script still match the actual repo surface
4. package names in docs still match what was actually published
