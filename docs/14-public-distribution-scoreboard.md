# Public Distribution Scoreboard

This file is the **committed summary ledger** for distribution-facing truth.

Use it to answer one narrow question:

> Which distribution lanes are already real repo-side, and which ones still stop at owner/platform actions?

This file is not the detailed submit queue.
Detailed owner choreography now belongs in local maintainer packets instead of
the committed docs lane.

## State Legend

| State | Meaning |
| :-- | :-- |
| `public-ready (repo-local)` | install path, proof loop, and docs/router exist inside the repo |
| `registry candidate` | packaging looks good enough for later publication |
| `registry submitted` | upstream accepted a submit, but future lifecycle still belongs to owner/platform management |
| `plugin-grade repo bundle` | real repo bundle, not an official listing claim |
| `container-ready (repo-local)` | image path is real repo-side, but platform visibility remains separate |
| `build-ready product surface` | build/package prep is real, but store/dashboard action remains later |

## Current Summary Matrix

| Surface lane | Current truthful state | Where the boundary changes |
| :-- | :-- | :-- |
| read-only packages such as SDK / CLI / MCP helpers | `public-ready (repo-local)` and mostly `registry candidate` | publication under owner credentials is later |
| canonical MCP registry lane | `registry submitted` with a current public listing already observed in prior repo evidence, backed by `packages/mcp-server/registry-submission.packet.json` | future listing lifecycle is platform/owner-side, not a repo-local blocker |
| public skill catalog | repo-side proof exists and live listing evidence has been observed previously | future catalog lifecycle is owner/platform-side |
| Containerized API integration surface | `container-ready (repo-local)` with a repo-owned container path and `docs/container-publication.packet.json` | registry visibility and page reread are later |
| browser extension | `build-ready product surface` | store dashboard submission is later |
| generic bundles/integration examples | `plugin-grade repo bundle` | official marketplace/listing is not implied |

## Current Truth

- repo-local preview packaging is real
- not every real repo-side lane is already officially published
- package publication and official listing are different stages
- committed docs should only preserve stable status words, not mutable owner task queues

## Rules

- do not turn `registry candidate` into `already published`
- do not turn repo-side bundle proof into marketplace-listing proof
- do not treat owner/platform later work as a repo-local blocker unless the repo itself is missing a packet or proof loop
- keep the wording narrow enough that a new reader cannot confuse local readiness with public availability

## Read Next

- owner/publication boundary: [`15-publication-submission-packet.md`](15-publication-submission-packet.md)
- packet inventory: [`16-distribution-preflight-packets.md`](16-distribution-preflight-packets.md)
- skill-facing publication packet: [`skill-publication-prep.md`](skill-publication-prep.md)
- GitHub/platform-side settings boundary: [`github-surface-checklist.md`](github-surface-checklist.md)
