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
| 1 | MCP Registry read-back for `@campus-copilot/mcp-server` | `public-ready (repo-local)` + `registry submitted` | the registry accepted the release-hosted `.mcpb` route, but the discovery page still needs a fresh read-back before anyone says `officially listed` | search and re-read the registry discovery page for `io.github.xiaojiou176-open/campus-copilot-mcp` after propagation |
| 2 | `@campus-copilot/mcp` | `public-ready (repo-local)` + `registry candidate` | good helper package, but should not outrun the canonical server artifact | publish only after the stronger server story is already public |
| 3 | `@campus-copilot/cli` | `public-ready (repo-local)` + `registry candidate` | broad builder entrypoint once the MCP story is anchored | publish under owner credentials when you want a general builder install path |
| 4 | `@campus-copilot/mcp-readonly`, `@campus-copilot/provider-runtime`, `@campus-copilot/gradescope-api`, `@campus-copilot/edstem-api`, `@campus-copilot/myuw-api` | `public-ready (repo-local)` + `registry candidate` | real and packable, but easier to overclaim if they leave first | publish only after the earlier package story is already public |
| 5 | Public skill pack | `public-ready (repo-local)` + generic packet ready | repo packet is ready, but platform submission still needs owner auth | publish skill-by-skill with the target platform's real upload flow |
| 6 | Thin BFF container image | `container-ready (repo-local)` | local build/smoke path is real, but registry push is still owner-controlled | push the image to GHCR or the chosen registry under owner credentials |
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
| Re-read the first MCP artifact | requires a fresh registry discovery-page check, not just the submit receipt; the repo packet lives at `packages/mcp-server/registry-submission.packet.json` | [`mcp-registry-submission-prep.md`](mcp-registry-submission-prep.md) |
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
