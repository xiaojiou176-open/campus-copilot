# Publication Submission Packet

Use this file after [`14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md).

The scoreboard says what is real.
This file says what still requires an owner-controlled publish, submit, or review step.

It is intentionally narrow:

- repo-local proof belongs in the scoreboard
- packet files belong in [`16-distribution-preflight-packets.md`](16-distribution-preflight-packets.md)
- this file is only the owner-side action queue

## Current Owner Queue

| Priority | Surface | Current truthful state | Why it is next | Exact owner-side step |
| :-- | :-- | :-- | :-- | :-- |
| 1 | Refresh the MCP Registry artifact for `@campus-copilot/mcp-server` | `public discovery hit exists for v0.1.0`, but current `main` is ahead of the listed artifact | the external listing now exists, so the remaining gap is no longer discovery; it is artifact freshness, and the repo packet still lives at `packages/mcp-server/registry-submission.packet.json` | rebuild the `.mcpb` bundle, upload the refreshed release asset, re-run `mcp-publisher publish packages/mcp-server/server.json`, then re-read the discovery page |
| 2 | `@campus-copilot/mcp` | `public-ready (repo-local)` + `registry candidate` | good helper package, but should not outrun the canonical server artifact | publish only after the stronger server story is already public |
| 3 | `@campus-copilot/cli` | `public-ready (repo-local)` + `registry candidate` | broad builder entrypoint once the MCP story is anchored | publish under owner credentials when you want a general builder install path |
| 4 | `@campus-copilot/mcp-readonly`, `@campus-copilot/provider-runtime`, `@campus-copilot/gradescope-api`, `@campus-copilot/edstem-api`, `@campus-copilot/myuw-api` | `public-ready (repo-local)` + `registry candidate` | real and packable, but easier to overclaim if they leave first | publish only after the earlier package story is already public |
| 5 | Public skill pack | `6 skills live on ClawHub`, `2 still unpublished` | the pack is no longer purely repo-local, but ClawHub now blocks the last 2 skills with an hourly new-skill rate limit | wait for the rate limit to reset, then publish `site-snapshot-review` and `switchyard-runtime-check` |
| 6 | Thin BFF container image | `GHCR push completed`, but package visibility is still `internal` | the registry push is done; the remaining gap is public visibility and public read-back | switch `ghcr.io/xiaojiou176-open/campus-copilot-api` to public and then re-read the package page |
| 7 | Browser extension | `build-ready`, `asset-ready`, `packet-ready` | repo-side extension prep is done, but store submission is dashboard-only later | upload package and finalize listing details in Chrome Web Store |
| 8 | Any `officially listed` wording | `not officially listed` until read-back exists | wording must trail proof, not lead it | only switch wording after an upstream page or review receipt exists |

## Publish Order

The recommended order stays:

1. `@campus-copilot/mcp-server`
2. `@campus-copilot/mcp`
3. `@campus-copilot/cli`
4. the remaining builder packages as a later batch
5. skill pack / container / browser-store lanes when the owner wants platform-facing distribution

Why this order is the safest:

- `mcp-server` is already the strongest official-registry-shaped artifact and now anchors the public MCP story
- `mcp` is useful, but it is still the helper package rather than the canonical server surface
- `cli` is broad and attractive, so it is safer after the MCP story is already anchored
- the remaining packages are real, but they are easier to misread if they appear before the core story is public

## Owner Action Cards

| Action | Why it is owner-only | Read this first |
| :-- | :-- | :-- |
| Refresh the first MCP artifact | requires a new release asset plus publisher auth because the public registry entry still points at the older v0.1.0 artifact | [`mcp-registry-submission-prep.md`](mcp-registry-submission-prep.md) |
| Publish the public skill pack | requires platform auth and publish flags | [`skill-publication-prep.md`](skill-publication-prep.md) |
| Publish the thin BFF image | requires registry auth and visibility choice | [`container-publication-prep.md`](container-publication-prep.md) |
| Submit the browser extension | requires Chrome Web Store dashboard actions | [`chrome-web-store-submission-packet.md`](chrome-web-store-submission-packet.md) |
| Claim official listing status | requires a real upstream page, review link, or receipt | [`14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md) |

## Rules

- Do not treat `registry candidate` as `already published`.
- Do not treat `registry submitted` as `officially listed`.
- Do not treat package publication as `officially listed`.
- Do not skip the scoreboard before making a publish decision.
- Do not switch wording to `officially listed` or `marketplace listed` until the upstream page exists.
