# Wave 4-7 Omnibus Ledger

This file is the **back-half summary ledger** for Wave 4 through Wave 7.

Use it when you need the shortest truthful answer to:

- what the repo already landed in the back half
- what still counts as repo-local work
- what is already only owner-side or platform-side later

This file is **not** the owner action queue.
Detailed release choreography, registry submission sequencing, and dashboard-only
checklists belong in local maintainer packets, not in the committed docs front
door.

## Product Identity Still Does Not Drift

Campus Copilot remains a **local-first academic decision workspace**.

It still does **not** become:

- a generic chatbot shell
- a hosted autonomy platform
- a write-capable operator bot
- a write-capable MCP server

The two formal user surfaces still share one product truth:

- extension workbench
- standalone read-only web workbench

They still share the same:

- schema
- storage/read-model truth
- export contract
- cited AI contract

## Wave Snapshot

| Wave | Current truthful summary | What still remains |
| :-- | :-- | :-- |
| `Wave 4` | extension + web already read much more like one product, with student-first and AI-after-structure wording preserved | final convergence cleanup so docs/assets do not drift back apart |
| `Wave 5` | Campus-vs-Switchyard seam is real repo-side: Campus owns semantics, Switchyard can own transport/runtime through the same consumer seam | fully freezing `Switchyard-first` as the only back-half runtime story |
| `Wave 6` | read-only builder preview is real repo-side across SDK / CLI / MCP / site API preview packages | keeping preview wording, package naming, and examples aligned without overclaiming publication |
| `Wave 7` | release-facing assets and summaries exist repo-side | off-repo publication, release-page execution, and media remain later or owner-only |

## Internal Diagnostics Boundary

Browser diagnostics remain an **internal control-plane lane**, not a student
feature.

Stable repo-side truth:

- live probe / diagnose / support-bundle commands exist
- repo-owned browser lane discipline exists
- console / network / trace capture is part of internal diagnostics

What this does **not** mean:

- it is not a public product feature
- it is not a public builder surface
- it is not proof of hosted or operator-bot behavior

## Read-Only Builder Preview Baseline

The repo already has a real read-only builder preview lane.

Current truthful preview categories:

- SDK surfaces over imported snapshots
- workspace/site helper packages
- read-only CLI commands
- read-only MCP surfaces
- provider-runtime seam packaging
- public skill and integration examples

What the committed docs should say about this lane:

- preview is real
- read-only is real
- local-first is real
- hosted/public-registry completion is **not** implied

## Remaining Repo-Local Work

| Area | Current honest tail |
| :-- | :-- |
| `Wave 4` | final dual-surface wording, IA, and asset convergence |
| `Wave 5` | freezing the Switchyard-first cutover contract without losing Campus-owned semantics |
| `Wave 6` | keeping preview packages/examples/public wording truthful and in sync |
| `Wave 7` | keeping release-facing docs/assets aligned so only owner/platform steps remain |

## Owner-Only / Platform-Only Later Boundary

These are still not repo-local completion work:

- release-page publishing
- package publication under owner credentials
- store dashboard submission
- registry visibility and platform settings
- recorded demo/video publication

Think of this like packing a suitcase versus boarding the plane:

- repo-local work can pack the suitcase
- owner/platform actions are the actual boarding gate

They are related, but they are not the same step.

## What Moved Out Of The Committed Docs Front Door

Detailed versions of these now belong in local maintainer packets instead of
the committed product docs:

- exact publication sequencing
- dashboard-only action cards
- registry visibility queues
- owner-side release execution choreography
- mutable release drafting notes that are not stable product truth

## Canonical Cross-References

- Product boundary: [`01-product-prd.md`](01-product-prd.md)
- Surface contract: [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
- Locked implementation choices: [`09-implementation-decisions.md`](09-implementation-decisions.md)
- Current-vs-next-vs-later contract: [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md)
- V2 product contract freeze: [`18-v2-product-contract-freeze.md`](18-v2-product-contract-freeze.md)
- Public distribution summary: [`14-public-distribution-scoreboard.md`](14-public-distribution-scoreboard.md)
