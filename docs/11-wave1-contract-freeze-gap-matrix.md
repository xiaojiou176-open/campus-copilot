# Wave 1B Contract Freeze Gap Matrix

This file is the canonical **Wave 1B contract freeze ledger**.

For the current second-half program truth, also read [`12-wave4-7-omnibus-ledger.md`](12-wave4-7-omnibus-ledger.md).
For the post-Planner-6 upgraded product bar, read [`18-v2-product-contract-freeze.md`](18-v2-product-contract-freeze.md).

Its job is simple:

- freeze what Campus Copilot formally commits to today
- separate that formal scope from next-phase engineering
- separate both from later/platform ambition
- keep future launch and ecosystem ideas from drifting back into today's contract

This file is a contract ledger, not a live-proof ledger.
For manual browser/session truth, use [`live-validation-runbook.md`](live-validation-runbook.md).

## Wave 1B Contract Freeze Ledger

### Formal Baseline Vision

Campus Copilot is an **academic decision workspace with local storage and read-only operation**.

The current formal path is:

```text
Canvas / Gradescope / EdStem / MyUW
-> adapters
-> schema
-> Dexie / storage read-model
-> Focus Queue / Weekly Load / Change Journal / derived alerts
-> sidepanel / popup / options / web
-> export
-> cited AI explanation
-> thin BFF for OpenAI / Gemini API-key
```

The current formal contract is not:

- a generic chatbot shell
- a hosted autonomy platform
- a public MCP platform
- a public SDK product
- a CLI / Skills / plugin ecosystem launch
- a launch-first / SEO-first / video-first public growth push

### Stretch Vision, Frozen Separately

The following directions matter, but they are not current formal scope:

- internal private clients for deeper site-specific substrate work
- public read-only MCP / API / SDK / CLI / Skills / plugin packaging
- larger launch surfaces such as SEO, public examples, and video

Those ideas stay visible in this ledger so they do not disappear.
They are kept separate here so they do not silently masquerade as already-promised current deliverables.

## Formal Scope Matrix

| Capability | Wave 1B bucket | Current state | Contract note |
| :-- | :-- | :-- | :-- |
| Academic decision workspace identity | current formal scope | formal | This is the public product identity. |
| `Canvas / Gradescope / EdStem / MyUW` support | current formal scope | formal | These are the only formal supported study surfaces today. |
| Shared schema + Dexie/read-model truth | current formal scope | formal | Storage/read-model remains the canonical product truth. |
| Focus Queue / Weekly Load / Change Journal / derived alerts | current formal scope | formal | The decision layer is already part of today's contract. |
| `sidepanel / popup / options` workbench surfaces | current formal scope | formal | The current formal UI surface is extension-first. |
| Export presets over structured results | current formal scope | formal | Export stays first-class. |
| Cited AI over structured results | current formal scope | formal | AI stays after structure. |
| Thin BFF for `OpenAI` / `Gemini` API-key flows | current formal scope | formal | The provider path remains narrow and explicit. |
| Optional local `Switchyard` bridge | current formal scope, optional | formal | Optional local runtime bridge, not a public platform claim. |
| Canvas richer assignment submission context | current formal scope | formal | Current assignment entities already carry submitted/graded summary on the shared contract. |
| Gradescope deeper submission / score context | current formal scope | formal | Current assignment entities already expose score/summary context without inventing a new entity family. |
| EdStem thread summary / category context | current formal scope | formal | Current message entities already carry richer discussion summary/category detail. |
| MyUW richer class / exam location context | current formal scope | formal | Current event entities already carry location/detail for class and exam context. |
| Canvas messages | current formal scope | formal | Current Canvas inbox data now lands on the shared `Message` contract, including attachment-aware latest-message summaries, and feeds workbench/export/AI surfaces. |
| Canvas richer reply-body / attachment context | next-phase engineering, selective | not yet formal | Attachment-aware latest-message summary is now current, but deeper per-thread reply detail is still selective and must not overclaim Canvas inbox internals as a stable public contract. |
| Gradescope richer page / image rendering beyond current annotation summaries | next-phase engineering | partial direction only | Question/rubric/evaluation-comment/annotation detail now fits the current `Assignment` contract; richer rendering or viewer semantics remain valuable only as an extension of the same academic workbench, not as platform work. |
| EdStem resources / download carriers | current formal scope | formal | Session-backed `api/courses/:course_id/resources` now lands on the current `Resource` contract with truthful read-only download hints. |
| MyUW additional homepage card families | next-phase engineering, selective | not yet formal | Promote only when a stable session-backed/state-backed path can normalize into existing `Announcement` / `Event` contracts. |
| MyUW registration / tuition-like signals | next-phase engineering, selective | not yet formal as a standalone domain | Current reminder text may promote through existing `Announcement` / `Event` decision surfaces, but broader billing/enrollment entities remain out of formal scope. |
| Textbook / course-material signals | next-phase engineering, selective | not yet formal | Only promote after a stable source and schema contract exist. |
| Standalone WebUI | current formal scope | formal | Current standalone web surface is read-only and import-based on the same storage/export/AI contract. |
| Internal private clients | later / internal substrate ambition | not current | Valuable future internal extraction, not a current external deliverable. |
| Repo-public read-only SDK / CLI / MCP / skill example packaging | current repo-public preview | formal preview | Read-only, snapshot-first, and thin-BFF-first only; not hosted and not write-capable. |
| `docs/13-site-depth-exhaustive-ledger.md` | current canonical support doc | formal | This is the per-site exhaustive map for current/direct/selective/later/owner-only classification. |
| Public plugin packaging | later / platform ambition | not current | Future packaging layer, not today's formal commitment. |
| Launch surface / SEO / video | later / launch ambition | not current | Public growth surface follows truthful product maturity, not the other way around. |
| `web_session` / OAuth-default / Anthropic / automatic multi-provider routing | explicit not-do for current direction | not current | These do not reopen just because they were discussed before. |
| Hosted autonomy / write-capable MCP / write automation / `cookies` expansion | no-go for current direction | not current | These conflict with the current product boundary. |

## Mainline / Sideline / Later Map

| Lane | Included work | Why it belongs here |
| :-- | :-- | :-- |
| mainline | the current formal path plus deeper site work that directly strengthens the academic decision workspace | This is the work that improves what students see and use first. |
| sideline | internal substrate extraction, builder-fit tightening, and repo-owned structural cleanup that support the mainline without redefining it | This work matters, but it cannot replace the student-facing contract as the main story. |
| later | public builder packaging, public ecosystem fit expansion, launch surfaces, and growth assets | These are meaningful ambitions, but they depend on mainline maturity and truthful public packaging. |
| no-go current direction | hosted autonomy, write-capable operator paths, `cookies` expansion, new-site expansion before current depth, provider-web detours that displace campus-site work | These are the lines that would actively distort the current contract. |

## Current State / Completion / Next Wave Owner

| Workstream | Contract bucket | Current state | Completion / truth layer | Next wave owner |
| :-- | :-- | :-- | :-- | :-- |
| Formal current product shape | current formal scope | established | repo/docs already describe this clearly; Wave 1B freezes wording | Wave 2 only deepens it |
| Current site capability baseline | current formal scope | established | current matrix exists for formal resource families | Wave 2 |
| Deeper site depth directly serving decision surfaces | current formal scope, with selective remaining gaps | materially landed | assignment submission, discussion summary, study-material resources, and schedule location context are landed; deeper inline annotations and selective new domains remain | Wave 2 follow-through |
| Standalone WebUI | current formal scope | landed as read-only import surface | same schema/storage/export/AI contract, no second sync engine | Wave 3 follow-through |
| Surface convergence / i18n / front-door polish | next-phase engineering | partial | valuable, but not the same as current scope expansion | Wave 4 |
| Internal private clients | later / internal substrate ambition | not started as contract | keep internal until mainline depth is stable | Wave 5 |
| Repo-public read-only SDK / CLI / MCP / skill examples | current repo-public preview | materially landed | repo-local toolbox preview, still not hosted or write-capable | Wave 6 |
| Public plugin packaging | later / platform ambition | not started as contract | future public packaging, not current deliverable | Wave 6 |
| Launch surface / SEO / video | later / launch ambition | not started as contract | public packaging follows product truth | Wave 7 |

## Wave Ownership Table

| Wave | Contract focus | Must not do |
| :-- | :-- | :-- |
| Wave 2 | mainline site-depth execution: keep strengthening assignment submission, Canvas inbox messages, discussion summary, and schedule location context while holding selective academic signals behind explicit promotion | Do not reopen public platform packaging or provider-web detours. |
| Wave 3 | dual-surface contract work: keep the standalone WebUI aligned with the shared schema/read-model/export/AI contract and avoid inventing a second sync path | Do not turn the web surface into a generic chat shell or site-syncing clone. |
| Wave 4 | surface convergence: workbench polish, i18n cleanup, front-door clarity, export / AI / decision-surface alignment | Do not let presentation work outrun contract truth. |
| Wave 5 | internal substrate extraction: internal private clients, browser evidence substrate, and the Campus ↔ Switchyard seam | Do not let Campus lose student-facing semantics. |
| Wave 6 | public builder packaging evaluation and repo-public read-only tooling: MCP / API / SDK / CLI / Skills only if the substrate is stable and truthful | Do not promote write-capable or hosted-autonomy claims. |
| Wave 7 | launch and public growth surfaces: SEO, public examples, and video after the prior waves hold | Do not turn launch packaging into a substitute for unfinished product truth. |

## Rules

- If a capability is not listed as `current formal scope`, it must not be described elsewhere as a current formal deliverable.
- If a capability is listed as `next-phase engineering`, it is important backlog, not current shipped truth.
- If a capability is listed as `later / platform ambition`, it may be worth planning, but it must not steer the current product identity.
- If a capability is listed as `explicit not-do` or `no-go`, do not smuggle it back through wording drift.

## Canonical Cross-References

- Product boundary: [`01-product-prd.md`](01-product-prd.md)
- Export and formal user surfaces: [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
- Current locked implementation choices: [`09-implementation-decisions.md`](09-implementation-decisions.md)
- Builder-facing current scope vs later: [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md)
- Per-site current capability baseline: [`site-capability-matrix.md`](site-capability-matrix.md)
- Latest V2 contract freeze: [`18-v2-product-contract-freeze.md`](18-v2-product-contract-freeze.md)
