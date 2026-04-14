# Release Runbook

This runbook is now the **public-safe maintainer summary** for release work.

Use it after the repository side is already landed on `main` and the worktree is
clean.

It should help you remember the order of operations without turning committed
docs into a mutable owner-action notebook.

## Preconditions

- `main...origin/main`
- clean worktree
- latest required repo-side gates already passed

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

## Release Sequence

1. freeze the release story from current committed docs
2. rerun the current repo-side proof set
3. prepare the release page summary and links
4. decide which publication actions are still later or owner-only
5. reread the public-facing surfaces after anything external changes

## Keep The Boundary Honest

- repo-side release proof is not the same thing as a public release page
- repo-side package readiness is not the same thing as publication
- mutable click-order, credentials, and dashboard steps now belong in local maintainer packets rather than committed docs

## Read First

1. [`../README.md`](../README.md)
2. [`docs/12-wave4-7-omnibus-ledger.md`](12-wave4-7-omnibus-ledger.md)
3. [`docs/14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md)
4. [`docs/github-surface-checklist.md`](github-surface-checklist.md)
5. [`CHANGELOG.md`](../CHANGELOG.md)
