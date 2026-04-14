# Academic Expansion And Safety Contract

This file exists for one narrow reason:

> If Campus Copilot expands beyond the current four-site workspace, what kinds of academic surfaces are in-bounds, what kinds are red-zone, and which safety rules must survive across every distribution surface?

Use this file when the question is:

- which new academic surfaces are worth pursuing next
- how read-only expansion differs from registration automation
- what the repo must never do even if a site is technically scriptable
- how browser extension, MCP, skills, SDK, CLI, and plugin-grade bundles inherit the same boundary

## Current Truth vs Next Expansion Lane

Current shipped product truth is still:

- `Canvas`
- `Gradescope`
- `EdStem`
- `MyUW`

That remains the current formal shipped workbench.

The next explicit academic expansion lane is narrower than “support more sites.”
It is:

- read-only academic planning surfaces for `MyPlan`, `DARS`, `Time Schedule`, and `DawgPath`
- class-search-only intake for `ctcLink`

It is **not**:

- `Register.UW` automation
- `Notify.UW` automation
- registration-related polling, seat watching, or submission flows
- broad student-record extraction
- identity, finance, or account-management automation on `ctcLink`

Think of it like adding new windows to observe the campus map, not new robot hands to press campus buttons.

## Expansion Order

Any future academic expansion must follow this source order:

1. **official public API**
2. **institution-recognized stable session-backed interface or standard integration**
3. **page-state, internal endpoint, reverse-engineered path, or DOM fallback**

Rules:

- do not skip directly to DOM fallback when a stronger official path already exists
- do not market internal/session-backed/DOM-derived paths as official APIs
- do not let a convenient hidden endpoint outrun the policy boundary

## Planned Read-Only Expansion Targets

| Target | Why it is valuable | Allowed posture | Current hard boundary |
| :-- | :-- | :-- | :-- |
| `MyPlan` | planning, degree path, transfer planning context | repo-local, read-only, user-session-bound interpretation only | do not treat historical Kuali lineage as proof of a current public API or current public source repo |
| `DARS` | degree-audit visibility | repo-local, read-only, current-user-only interpretation | do not treat internal reports or protected audit content as a public data surface |
| `Time Schedule` | catalog/schedule lookup and course timing context | prefer official/public schedule surfaces first, then read-only page interpretation | do not turn schedule lookup into registration automation |
| `DawgPath` | major/program path visibility | repo-local, read-only interpretation only | do not market it as an official advising product or export other students' records |
| `ctcLink class search` | Washington community-college course discovery | class-search-only, institution-by-institution validation, read-only | do not overclaim stable anonymous JSON APIs; do not expand this lane into registration, identity, finance, or records automation without a separate contract |

## Red-Zone Academic Surfaces

These are explicit red-zone areas for the current product and the next expansion lane:

- `Register.UW`
- `Notify.UW`
- registration-related resources
- seat-watcher or waitlist polling
- add/drop submission flows
- seat-swap or hold-seat helpers
- any registration-related automated query loop

If a future feature touches those surfaces, the default answer is **no** unless a new, higher-authority contract explicitly authorizes a narrower path.

## Lower-Risk Operating Posture

The intended lower-risk posture is:

- the user is operating on their own account
- the product stays repo-local
- the product provides read-only interpretation and organization
- sync is manual, not silent background scanning
- the product does not submit forms, press site buttons, or send campus-site mutations
- the product does not bulk-collect data or share education records outward
- the product does not present itself as an official UW or SBCTC product

That posture is safer than broad automation, but it is still not the same thing as institutional approval.

Use these words carefully:

- say `lower-risk read-only posture`
- do **not** say `approved`, `officially allowed`, or `risk-free`

## Explicit No-Go List

Campus Copilot must not:

- access someone else's files, account, or records
- use credentials that do not belong to the current user
- run registration automation
- perform high-frequency polling against registration-related resources
- scrape at a scale that risks platform or campus-system stability
- expose or share real student education records
- present private/internal/session-backed paths as stable public APIs
- present the product as an official UW or SBCTC service
- create unfair academic advantage where course or instructor rules prohibit the tool
- upload raw campus pages, cookies, or session material to AI

## AI And Course-Material Boundary

The default AI boundary is intentionally conservative.

AI may work over:

- normalized workspace entities
- structured summaries
- local decision views
- titles, metadata, and user-visible file names
- user-opened URLs or jump links

AI must **not** default to consuming:

- raw course files
- lecture slides
- instructor-authored notes
- exams or quizzes
- assignment PDFs or solution documents
- other course materials whose copyright or sharing status is unclear

Why this rule exists:

- many course materials are instructor-authored and copyright-sensitive
- many institutions or instructors prohibit AI ingestion or redistribution
- “the browser can see it” is not the same thing as “the repo may send it to a model”

The current product now has one **narrow, default-disabled advanced lane**:

1. the user explicitly opts in on a per-course basis
2. the user manually pastes the excerpt they want analyzed
3. the flow stays repo-local and clearly separated from the default path
4. the UI states that rights and policy compliance remain the user's responsibility
5. the repo does not fetch, upload, or infer additional raw course files for that lane

That is the current truthful boundary.

It is **current repo/product truth** only in this narrow form:

- default-disabled
- per-course explicit opt-in
- user-pasted excerpt only
- user-responsibility language

What is **still not** current shipped truth:

- direct raw-file / PDF / slide ingestion
- automatic reading of downloaded course materials
- any broader raw-material carrier that outruns the current `Resource` metadata / jump-link contract

So the later-review question has narrowed:

- the excerpt-only lane is already real
- any broader raw-material ingestion lane still requires separate contract promotion

## Distribution Surfaces Inherit The Same Boundary

The same academic safety contract must apply across:

- browser extension
- standalone web workbench
- MCP servers
- public skills
- SDK / CLI / site API preview packages
- plugin-grade repo bundles
- containerized local BFF routes
- distribution-facing docs

In plain language:

- shipping through another surface does not grant broader rights
- MCP does not turn Campus Copilot into a campus-site operator
- skills do not become permission to automate protected campus workflows
- plugin-grade repo bundles do not become official academic-system integrations
- distribution-facing docs do not become license to overclaim official support or broader automation rights

## Engineering Guardrails

The contract must live in four layers at once:

1. **docs and public wording**
   - say `repo-local`
   - say `read-only`
   - say `not official`
   - say `user must follow school and platform policies`
2. **UI/product behavior**
   - do not surface dangerous automation buttons
   - keep red-zone pages on static explanation or manual jump-link paths only
3. **implementation**
   - site-facing collectors stay read-only
   - no campus-site mutation verbs
   - no registration automation
4. **tests and checks**
   - permission drift should fail
   - host-safety drift should fail
   - campus-site write drift should fail

## Current Enforcement Snapshot

The contract above is the rulebook.  
This section answers a narrower question:

> which parts are already enforced today, and which parts are still governance/spec work for the next wave?

| Layer | What is already real | What is still missing |
| :-- | :-- | :-- |
| docs and public wording | root docs, distribution routers, privacy/security pages, and collaborator contracts already repeat the same red-zone and AI/material boundary | some leaf package/example surfaces still inherit only `read-only / not hosted` wording instead of the full contract |
| extension/runtime permission boundary | the extension manifest stays cookie-free, does not request `Register.UW` / `Notify.UW` hosts, and now includes a scoped read-only `myplan.uw.edu/*` host lane so `MyPlan / DARS` capture can run through the same manual, repo-local extension path; the current extension surface also exposes reusable red-zone wrapper helpers for single-surface and multi-surface disabled/manual-only handling | this is still not the same thing as repo-wide UI adoption across every future surface |
| static governance gate | `check:campus-readonly-boundary`, `check:docs:ssot`, `check:consumer-surfaces`, `check:public-surface`, and `check:host-safety` already guard major drift paths, and the campus-readonly lane now partially consumes `policies/integration-boundaries.yaml` for red-zone uniqueness, AI forbidden-input snippets, the shared default-disabled advanced-material deny wording, and current caller-wrapper adoption snippets | `policies/integration-boundaries.yaml` is still not the single generated registry behind every gate or every public table |
| AI default runtime seam | current AI callers already route through structured workbench/export inputs, explicitly reject raw DOM / raw HTML / cookies / raw site payloads **and** raw course-material classes in the shared prompt contract, carry an explicit `advancedMaterialAnalysis` contract through the shared seam, fail fast on obvious raw-material questions by default, and now support a narrow default-off per-course excerpt-only lane across the current extension/web AI panels | direct raw-file ingestion still has no lawful canonical carrier, and there is still no universal proof that every future caller must inherit the same narrow opt-in scaffold |
| product-layer hard-stop behavior | the contract already says red-zone pages should stop at static explanation or manual paths, the extension plus standalone web AI surfaces now render explicit manual-only red-zone notices and a disabled red-zone CTA scaffold through the shared caller guard wrapper, and the extension operations surface now carries a manual-only campus-boundary panel for `Register.UW` / `Notify.UW` through a reusable local red-zone helper | a repo-wide runtime/UI hard-stop for every future red-zone route, button, or polling loop is still a next-wave implementation/gate task |

## Canonical Cross-References

- Product scope: [`01-product-prd.md`](01-product-prd.md)
- Latest V2 product contract freeze: [`18-v2-product-contract-freeze.md`](18-v2-product-contract-freeze.md)
- Security/privacy brief: [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md)
- Integration boundary registry: [`integration-boundaries.md`](integration-boundaries.md)
- Verification matrix: [`verification-matrix.md`](verification-matrix.md)
- Public AI collaborator contract: [`../CLAUDE.md`](../CLAUDE.md)
- Privacy page: [`../PRIVACY.md`](../PRIVACY.md)
