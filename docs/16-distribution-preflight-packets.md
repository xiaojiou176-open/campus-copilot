# Distribution Preflight Packet Index

This file is the **stable packet index** for distribution-facing surfaces.

Use it when the question is:

> Which repo-owned packet exists, and which repo-side check proves that packet is real?

This file should stay inventory-shaped.
It should not become a moving owner-action diary.

## Packet Inventory

| Surface | Repo-owned packet or source | Validation command | Current truthful state |
| :-- | :-- | :-- | :-- |
| MCP Registry | `packages/mcp-server/registry-submission.packet.json`, `packages/mcp-server/mcpb.manifest.json` | `pnpm check:mcp-registry-preflight` | repo-owned registry packet exists |
| public skill publish | `skills/clawhub-submission.packet.json` | `pnpm check:skill-catalog` | repo-owned skill packet exists |
| thin BFF container image | `docs/container-publication.packet.json` | `pnpm check:container-surface` | repo-owned container packet exists for `campus-copilot-api:local` and the canonical public coordinate `ghcr.io/xiaojiou176-open/campus-copilot-api` |
| Chrome Web Store | extension build output + `docs/chrome-web-store-submission-packet.md` | `pnpm --filter @campus-copilot/extension build` | repo-owned submission packet exists |
| generic directory reuse | reuse MCP/container packet plus docs summary ledgers | cross-check against `docs/14-public-distribution-scoreboard.md` | generic reuse inputs exist repo-side |

## MCP Registry Submit Surface

The stable MCP Registry packet still centers on:

- `packages/mcp-server/registry-submission.packet.json`
- `packages/mcp-server/mcpb.manifest.json`
- `packages/mcp-server/server.json`

The stable repo-side check remains:

- `pnpm check:mcp-registry-preflight`

The owner-side submit command pair remains:

- `mcp-publisher login github`
- `mcp-publisher publish packages/mcp-server/server.json`

## What This File Is For

- stable packet/source location
- stable validation command
- stable repo-side state word

## What This File Is Not For

- mutable owner click-queue
- dashboard instructions
- registry lifecycle management
- invented vendor manifests just to make the table look fuller

## Read Next

- summary state words: [`14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md)
- owner boundary: [`15-publication-submission-packet.md`](15-publication-submission-packet.md)
