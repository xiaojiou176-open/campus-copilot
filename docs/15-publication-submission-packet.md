# Publication Submission Packet

Use this file after [`14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md).

For the skill-facing publication packet and current live-skill receipts, also read
[`skill-publication-prep.md`](skill-publication-prep.md).

The scoreboard says what is real.
This file says what still requires an owner-controlled publish, submit, or review step.

It is intentionally narrow:

- repo-local proof belongs in the scoreboard
- packet files belong in [`16-distribution-preflight-packets.md`](16-distribution-preflight-packets.md)
- this file is only the owner-side action queue
- the canonical MCP packet path remains `packages/mcp-server/registry-submission.packet.json`

## Current Owner Queue

| Priority | Surface | Current truthful state | Why it is next | Exact owner-side step |
| :-- | :-- | :-- | :-- | :-- |
| 1 | Thin BFF container image | `GHCR push completed`, but package visibility is still `internal` | the image push is already done, so the remaining gap is pure visibility/read-back | switch `ghcr.io/xiaojiou176-open/campus-copilot-api` to public and then re-read the package page |
| 2 | `@campus-copilot/cli` | `public-ready (repo-local)` + `registry candidate` | broad builder entrypoint now that the canonical MCP server story is already public and current | publish under owner credentials when you want a general builder install path |
| 3 | `@campus-copilot/mcp`, `@campus-copilot/mcp-readonly`, `@campus-copilot/provider-runtime`, `@campus-copilot/gradescope-api`, `@campus-copilot/edstem-api`, `@campus-copilot/myuw-api`, `@campus-copilot/sdk`, `@campus-copilot/workspace-sdk`, `@campus-copilot/site-sdk` | `public-ready (repo-local)` + `registry candidate` | real and packable, but still owner-side publication choices rather than repo-local blockers | publish only when the owner wants broader package distribution |
| 4 | Browser extension | `build-ready`, `asset-ready`, `packet-ready` | repo-side extension prep is done, but store submission is dashboard-only later | upload package and finalize listing details in Chrome Web Store |

## Publish Order

The recommended order stays:

1. Thin BFF container visibility
2. `@campus-copilot/cli`
3. the remaining builder packages as a later batch
4. browser-store lane when the owner wants platform-facing distribution

Why this order is the safest:

- the canonical `mcp-server` registry story is already live and current, so the next high-signal public face is container visibility
- `cli` is broad and attractive, so it is safer after the MCP story is already anchored
- the remaining packages are real, but they are easier to misread if they appear before the core story is clearly public

## Owner Action Cards

| Action | Why it is owner-only | Read this first |
| :-- | :-- | :-- |
| Publish the thin BFF image | requires registry auth and visibility choice | [`container-publication-prep.md`](container-publication-prep.md) |
| Submit the browser extension | requires Chrome Web Store dashboard actions | [`chrome-web-store-submission-packet.md`](chrome-web-store-submission-packet.md) |
| Claim official listing status | requires a real upstream page, review link, or receipt | [`14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md) |

## Rules

- Do not treat `registry candidate` as `already published`.
- Do not treat `registry submitted` as `officially listed` unless the upstream page has been freshly re-read.
- Do not treat package publication as `officially listed`.
- Do not skip the scoreboard before making a publish decision.
- Do not switch wording to `officially listed` or `marketplace listed` until the upstream page exists.
