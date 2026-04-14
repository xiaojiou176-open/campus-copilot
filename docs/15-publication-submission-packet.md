# Publication Submission Boundary

Use this file after [`14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md).

Its job is intentionally small:

- remind maintainers that repo-local readiness is not the same thing as publication
- mark where owner-side action begins
- keep committed docs from turning into a mutable click-by-click queue

## Owner-Side Later Boundary

The following still require owner/platform action rather than repo-local work:

- package publication under owner credentials
- store dashboard submission
- registry visibility or listing management
- release-page publishing

For the canonical MCP Registry lane, the repo-owned submit packet is still:

- `packages/mcp-server/registry-submission.packet.json`

For the container lane, the committed publication packet is still:

- [`container-publication-prep.md`](container-publication-prep.md)

## Safe Publish Order

Keep the high-level order simple:

1. surfaces that are already strongest repo-side and easiest to explain truthfully
2. broader builder entrypoints such as CLI/package publication
3. later batches of preview packages
4. dashboard/store lanes

The exact click-order, credential flow, and mutable action queue now belong in
local maintainer packets rather than committed docs.

## Rules

- `registry candidate` does not mean published
- `registry submitted` does not mean every downstream page is current forever
- package publication does not equal official listing
- owner-side action queues should stay local, auditable, and easy to refresh

If the question is specifically about skill publication surfaces, keep using
[`skill-publication-prep.md`](skill-publication-prep.md) as the committed
skill-facing packet.
