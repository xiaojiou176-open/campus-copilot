# Distribution Readiness

Use this page as the shortest truthful router for publication questions.

This is not the product README.
It is the shipping counter:

- what is already real inside the repo
- what is only repo-local proof today
- what is still owner-only later

All distribution surfaces still inherit the same academic safety contract:

- local-first
- read-only
- not official campus-system automation
- no registration automation
- no default AI ingestion of raw course files or instructor-authored materials

## Start Here

| If you need... | Open this | Why |
| :-- | :-- | :-- |
| the product front door | [`README.md`](README.md) | start with the product story, not the shipping ledger |
| the canonical state ledger | [`docs/14-public-distribution-scoreboard.md`](docs/14-public-distribution-scoreboard.md) | this is the SSOT for `public-ready`, `registry candidate`, `registry submitted`, `registry blocked`, and `not officially listed` |
| the owner-only action queue | [`docs/15-publication-submission-packet.md`](docs/15-publication-submission-packet.md) | use this only when the question becomes "what does the owner click next?" |
| the packet inventory | [`docs/16-distribution-preflight-packets.md`](docs/16-distribution-preflight-packets.md) | use this when you want the exact repo-owned packet files and validation commands |
| the academic safety contract | [`docs/17-academic-expansion-and-safety-contract.md`](docs/17-academic-expansion-and-safety-contract.md) | use this before describing any integration or distribution surface as broader than a read-only study/workspace path |
| browser store last mile | [`docs/chrome-web-store-submission-packet.md`](docs/chrome-web-store-submission-packet.md) | the Chrome lane has its own packet and owner-only dashboard work |
| the skill catalog and submit packet | [`skills/README.md`](skills/README.md), [`skills/catalog.json`](skills/catalog.json), [`skills/clawhub-submission.packet.json`](skills/clawhub-submission.packet.json) | use these when the question becomes "which public skill surfaces are already machine-readable and what exact publish packet leaves the repo later?" |
| skill / container / MCP packet details | [`docs/skill-publication-prep.md`](docs/skill-publication-prep.md), [`docs/container-publication-prep.md`](docs/container-publication-prep.md), [`docs/mcp-registry-submission-prep.md`](docs/mcp-registry-submission-prep.md) | keep each surface-specific packet narrow |

## Current Truthful Labels

These labels are the vocabulary for the rest of the distribution docs:

| Label | Meaning |
| :-- | :-- |
| `public-ready (repo-local)` | the repo already has a public install path, fresh proof loop, public docs, and a reproducible sample |
| `registry candidate` | the artifact looks publishable, but no upstream package or listing page has been proven yet |
| `registry submitted` | the upstream registry accepted the submission, but the discovery page has not been freshly re-read yet |
| `registry blocked` | the surface is public and useful, but packaging or dependency shape still blocks standalone publication |
| `owner-only later` | the repo-side packet is ready, but the remaining step is account-side submission, publish, or review |
| `not officially listed` | no upstream marketplace, registry, or directory page has been freshly confirmed |

## Surface Router

| Surface | Current truthful state | First proof | Read next |
| :-- | :-- | :-- | :-- |
| Main repository + Pages | public and GitHub Pages-backed | open the repo and homepage | [`README.md`](README.md) |
| `@campus-copilot/mcp-server` stdio route | `public-ready (repo-local)` + `registry listed for v0.1.0` + `current main ahead of the published artifact` | `pnpm --filter @campus-copilot/mcp-server start --help` | [`docs/mcp-registry-submission-prep.md`](docs/mcp-registry-submission-prep.md) |
| Docker / container path | `container-ready (repo-local)` + `GHCR pushed` + `visibility still internal` | `docker build -t campus-copilot-api:local .`, `docker compose -f compose.yaml up -d campus-copilot-api`, then `pnpm smoke:docker:api` | [`docs/container-publication-prep.md`](docs/container-publication-prep.md) |
| Browser extension | `build-ready product surface` | `pnpm --filter @campus-copilot/extension build` | [`docs/chrome-web-store-submission-packet.md`](docs/chrome-web-store-submission-packet.md) |
| CLI / sidecars / provider-runtime / site APIs | `public-ready (repo-local)` or `registry candidate` | `pnpm proof:public` | [`docs/14-public-distribution-scoreboard.md`](docs/14-public-distribution-scoreboard.md) |
| SDK / workspace-sdk / site-sdk | `public-ready (repo-local)` + `registry candidate` | `pnpm proof:public` | [`docs/14-public-distribution-scoreboard.md`](docs/14-public-distribution-scoreboard.md) |
| Public skill pack | `public-ready (repo-local)` + `6 live ClawHub listings` + `2 rate-limited remainder` | `pnpm check:skill-catalog` | [`docs/skill-publication-prep.md`](docs/skill-publication-prep.md) |
| Codex / Claude / OpenClaw bundles | `plugin-grade repo bundle` + `not officially listed` | `pnpm proof:public` | [`INTEGRATIONS.md`](INTEGRATIONS.md) |

## Chrome Web Store Lane

Use the extension lane like a stage-gate, not like a vague "maybe ready" claim:

- `build-ready`: `pnpm --filter @campus-copilot/extension build`
- `asset-ready`: icons, screenshots, and privacy/support assets are already tracked in the repo
- `packet-ready`: [`docs/chrome-web-store-submission-packet.md`](docs/chrome-web-store-submission-packet.md) exists and stays truthful
- `owner-only later`: the final Chrome Web Store dashboard upload, metadata fields, and submit click

## Owner-Only Later Bucket

These do **not** block repo-side readiness:

- future package publication under owner credentials for the non-registry package lanes
- refreshed MCP Registry `.mcpb` bundle + metadata publish so the public listing matches current `main`
- official marketplace or directory submission
- Chrome Web Store dashboard submission
- container visibility/public read-back for `ghcr.io/xiaojiou176-open/campus-copilot-api`
- promo video, launch post, or off-repo distribution

Keep these repo-side gates green before any owner-side step:

- `pnpm verify`
- `pnpm proof:public`
- `pnpm check:skill-catalog`
- `pnpm check:mcp-registry-preflight`
- `pnpm check:container-surface`

## Rules

- Do not call `public-ready (repo-local)` the same thing as `published`.
- Do not call `registry candidate` the same thing as `officially listed`.
- Do not call `registry submitted` the same thing as `fresh discovery-page read-back`.
- Do not call `container-ready (repo-local)` the same thing as hosted SaaS.
- Do not call plugin-grade repo bundles official marketplace plugins.
- Keep this page narrower than the product story on the front door.
