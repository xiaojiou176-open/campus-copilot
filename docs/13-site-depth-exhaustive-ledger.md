# Site Depth Exhaustive Ledger

This ledger exists to answer one stricter question than the short capability matrix:

> For each supported campus site, which read-only resource families are already real, which deeper paths are still only selective gaps, and where should the remaining work be classified?

Use this file when you need the exhaustive current-vs-selective-vs-later map.  
Use [`site-capability-matrix.md`](site-capability-matrix.md) when you only need the short capability snapshot.

## Current Classification Summary

| Bucket | Meaning | Current items |
| :-- | :-- | :-- |
| `current direct enhancement` | Already landed on the current academic decision workspace contract | Canvas inbox messages; richer assignment submission/score context; Gradescope graded submission annotation detail plus graded-copy/history/regrade action hints; EdStem thread summary/category context; EdStem course resources plus summary-first lesson links; MyUW notice/class-exam detail |
| `selective gap` | Still valuable, but only if promoted through the same read-only workbench contract | Canvas richer reply/attachment context; MyUW registration/tuition-like signals; textbook/material signals |
| `planned read-only expansion` | Future academic-observation lanes that may join the contract later if they stay read-only and policy-safe | DawgPath |
| `partial shared landing` | Read-only expansion work that now has some real shared adoption, but still is not full shipped parity | MyPlan; Time Schedule |
| `deepwater runtime landing` | Repo-local deepwater work that now has a real shared runtime lane or summary substrate, but still is not full current shipped scope | course websites; DARS summary lane; transcript/finaid/accounts summary lanes; cluster/admin read-model substrate |
| `isolated proof lane` | Narrow proof/discovery packages that should stay outside shared current support until carrier honesty improves | ctcLink class search |
| `internal substrate` | Helpful internal support or builder substrate, not student-facing scope by itself | browser evidence/control-plane tooling; site API preview libs; site-scoped read-only MCPs; redacted fixture capture path |
| `later / platform ambition` | Public distribution/launch work that follows stable substrate and truthful packaging | public registry publishing; plugin packaging; off-repo launch/SEO/video |
| `owner-only / external` | Human-controlled browser/session or publishing decisions outside repo-owned code paths | live campus sessions when the requested browser context is not attachable or the needed site is not currently open there; release-channel/package publishing decisions |
| `no-go` | Explicitly outside the current product boundary | write-capable automation; cookies expansion; hosted autonomy framing |

## Historical Live Corroboration Note

The current site-depth contract is still primarily code-and-doc driven, not daily live-proof driven.

The note below is historical corroboration from **April 4, 2026 PDT**. It explains why older evidence artifacts mention a clone lane, but it is **not** the current operator-facing live-validation default:

```bash
CHROME_CDP_URL=http://127.0.0.1:9333 \
CHROME_USER_DATA_DIR="$HOME/.campus-copilot-profile13-clone" \
CHROME_PROFILE_NAME="Profile 13" \
CHROME_ATTACH_MODE=page \
pnpm probe:live
```

That shared `9333` lane was later shown to be contested by an unrelated browser automation process. A temporary clean-port recovery briefly surfaced stronger page-level evidence, but that alternate lane did not become the new default truth surface.

Treat this note as a two-layer historical explanation:

- **historical clone-lane corroboration**: useful for understanding why older evidence bundles reference `Profile 13` and `9333`
- **current live contract**: see [`verification-matrix.md`](verification-matrix.md) and the repo-local browser-lane rules in `AGENTS.md` for the current single-instance, repo-owned browser expectation

In plain language: the site-depth contract is still intact, but this section should not be read as “the latest current live lane” for Wave 1C or later governance work.

## Exhaustive Per-Site Map

| Site | Resource family | Current path | Boundary type | Current code status | Current live proof status | Next deep gap | Action this round | Final classification |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| Canvas | `courses` | `/api/v1/courses` | `official` | Implemented on the shared schema/storage chain | Manual live validation still required for current session truth | none at this layer | keep as shipped scope | `current direct enhancement` |
| Canvas | `resources` | `/api/v1/courses/:course_id/files` plus `include[]=syllabus_body` on `/api/v1/courses`, with current worktree enrichment from `modules / groups / media_objects` | `official` | Implemented on the shared `Resource` contract with file metadata, visible download links when available, syllabus-summary resources, and current worktree partial landing for module/group/media carriers, including module references for `Page / ExternalUrl / File / Assignment / Discussion / Quiz / SubHeader` | Manual live validation still required for current session truth | full module-tree parity, deeper group-scoped carriers, richer recording parity, and instructor-feedback carriers are still deeper-next-wave work | keep file resources and current module/group/media carriers truthful on the existing `Resource` contract; do not overclaim full module tree parity or durable recording support | `current direct enhancement` |
| Canvas | `assignments` | `/api/v1/courses/:course_id/assignments?include[]=submission` | `official` | Implemented with `summary`, `submittedAt`, `score`, and `maxScore` on current entities | Manual live validation still required for current session truth | richer gradebook-only views if a later contract promotes them | keep current fields; do not invent a new domain | `current direct enhancement` |
| Canvas | `announcements` | `/api/v1/announcements?context_codes[]=course_*` | `official` | Implemented | Manual live validation still required for current session truth | none at this layer | keep as shipped scope | `current direct enhancement` |
| Canvas | `messages` | `/api/v1/conversations?scope=inbox` plus detail enrichment from `/api/v1/conversations/:id` when available | `official` | Implemented on the shared `Message` contract with attachment-aware latest-message summaries | Manual live validation still required for current session truth | deeper per-thread reply detail beyond the current latest-message body / attachment hint | keep landed inbox path and current detail-first summary enrich; classify fuller thread parity as selective | `current direct enhancement` |
| Canvas | `grades` | assignment submission fields from official assignment payloads | `official` | Implemented | Manual live validation still required for current session truth | deeper gradebook-only surfaces | keep current summary/score contract; do not overclaim a full gradebook product | `current direct enhancement` |
| Canvas | `events` | `/api/v1/calendar_events?context_codes[]=course_*` | `official` | Implemented | Manual live validation still required for current session truth | better event classification if later needed | keep as shipped scope | `current direct enhancement` |
| Gradescope | `courses` | internal assignment payload-derived course ids/names, fallback internal path or course/dashboard DOM | `internal`, `dom-fallback` | Implemented | Manual live validation required for current tenant/session | better internal-path selection across dashboard vs course context | keep current course discovery; do not widen product claim | `current direct enhancement` |
| Gradescope | `assignments` | `/internal/assignments`, fallback course DOM rows with submission drilldown links, plus graded submission enrichment from `/courses/:course_id/assignments/:assignment_id/submissions/:submission_id` with state-first parsing and DOM fallback in current course/submission context | `internal`, `dom-fallback` | Implemented with submission summary/score context plus question/rubric/evaluation-comment/annotation detail on current `Assignment.summary` + `Assignment.detail`, and current-worktree graded-copy/history/regrade action hints on graded submission pages | Manual live validation now has a reviewed redacted annotation fixture plus authenticated raw submission proof on the current carrier | richer page/image rendering semantics beyond the current annotation summary/detail contract | keep current assignment detail truthful; do not market a full annotated PDF viewer as shipped or a full regrade workflow as landed | `current direct enhancement` |
| Gradescope | `grades` | `/internal/grades`, fallback course DOM score cells with exact submission URL capture when present, plus direct submission-page DOM parsing for total score continuity | `internal`, `dom-fallback` | Implemented with current score context | Manual live validation required for current tenant/session | richer page/image rendering semantics beyond the current assignment-detail contract | keep current score contract; question/rubric/evaluation-comment/annotation detail promotes through `Assignment.summary` + `Assignment.detail`, not a new grade sub-entity | `current direct enhancement` |
| EdStem | `courses` | session-backed `api/user` memberships, fallback dashboard/course DOM metadata | `internal`, `session-backed`, `dom-fallback` | Implemented | Manual live validation required for current authenticated session | course-role / lab metadata if later promoted | keep current membership truth; defer extra metadata | `current direct enhancement` |
| EdStem | `messages` | session-backed `api/courses/:course_id/threads` plus inferred unread/recent-activity defaults, plus direct thread-detail DOM parsing for thread body and replies | `internal`, `session-backed`, `dom-fallback` | Implemented with thread summary/category context plus direct thread/reply DOM normalization on the shared `Message` contract | Manual live validation required for current authenticated session | richer attachment or cross-thread context only if a later contract needs it | keep landed thread summary + reply-body path truthful on the shared `Message` contract | `current direct enhancement` |
| EdStem | `resources` | session-backed `api/courses/:course_id/resources` with authenticated course-scoped download URL normalization, plus current-worktree `/lessons` DOM normalization for summary-first lesson links | `internal`, `session-backed`, `dom-fallback` | Implemented with canonical `Resource` entities, file metadata, optional session-backed download URLs, and summary-first lesson links on the shared schema/storage/export chain | Manual live validation now has a reviewed redacted resources API fixture, authenticated raw capture corroboration for the current resource carrier, and fresh authenticated DOM proof for `/lessons` rows | broader grouped-material semantics or richer download UX beyond the current `Resource` contract | keep the current API-first resource carrier on the shared `Resource` contract, and treat lesson links as summary-first lesson resources; do not overclaim grouped-material parity or stable public APIs | `current direct enhancement` |
| MyUW | `courses` | session-backed `/api/v1/schedule/current` primary-section records | `session-backed` | Implemented | Manual live validation required from a matching MyUW tab | additional authenticated homepage card families | keep as shipped scope | `current direct enhancement` |
| MyUW | `announcements` | session-backed `/api/v1/notices/`, fallback page state, then DOM | `session-backed`, `state-fallback`, `dom-fallback` | Implemented with current notice detail plus decision-layer promotion for registration / tuition-like reminders on the existing `Announcement` contract | Manual live validation required from a matching MyUW tab | broader homepage card expansion and standalone billing/enrollment domains | keep landed notice detail + reminder promotion; do not invent standalone billing/enrollment entities | `current direct enhancement` |
| MyUW | `events` | session-backed `/api/v1/visual_schedule/current` plus `/api/v1/deptcal/`, fallback page state, then DOM, including `my.uw.edu/academic_calendar/` event parsing | `session-backed`, `state-fallback`, `dom-fallback` | Implemented with class/exam `location` and `detail`, academic-calendar timeline events, plus decision-layer promotion for registration deadline-like reminders on the existing `Event` contract | Manual live validation required from a matching MyUW tab | additional homepage cards beyond the current schedule/reminder carrier | keep current schedule detail + academic-calendar timeline events + reminder promotion; defer broader homepage/reg/tuition expansion | `current direct enhancement` |

## Selective Gaps That Are Still Worth Tracking

| Gap | Why it still matters | Why it is not current shipped truth yet | Classification |
| :-- | :-- | :-- | :-- |
| Canvas module-driven resource routing / groups / recordings | Could deepen course-material discovery beyond direct file metadata and syllabus summary | Current worktree already carries partial module/group/media landing on the existing `Resource` contract, including module references for `Page / ExternalUrl / File / Assignment / Discussion / Quiz / SubHeader`, but module trees, groups, and durable recording carriers still need a stronger truthful contract | `selective gap` |
| Canvas richer reply-body / attachment context | Could improve discussion and decision context beyond the current latest-message body / attachment hint | Full per-thread reply detail still needs a stronger formal contract on how deeper inbox content should normalize | `selective gap` |
| MyUW registration / tuition-like signals | Current notice/event reminders now reach the decision layer when they naturally arrive on existing carriers | A broader standalone billing/enrollment domain is still unstable and must not be over-promoted | `selective gap` |
| Textbook / course-material signals | Could matter for planning and workload | Stable source and current canonical contract are not locked yet | `selective gap` |

## Planned Read-Only Expansion Ledger

| Surface | Current disposition | Why |
| :-- | :-- | :-- |
| MyPlan | `partial shared landing` | shared planning substrate plus extension/web `Planning Pulse` adoption are real, and the current working tree now adds a repo-side capture path for `plan / audit` pages into that same substrate. Fresh canonical repo-owned browser proof now confirms that both `plan` and `audit` still open on the live `Profile 1` lane, but this is still not full shipped site/runtime parity, automatic shared capture parity, or a public API claim |
| DARS | `deepwater runtime landing` | summary-first partial landing now exists through the shared planning substrate and administrative summary lane, but it is still not a standalone DARS site/runtime contract |
| Transcript / finaid / accounts / tuition_detail | `deepwater runtime landing` | summary-first runtime carriers now exist on the admin high-sensitivity substrate. `tuition_detail` is now stronger than a page-open placeholder because the current statement carrier can summarize quarter, due/balance posture, classification, credit hours, totals, and fee-breakdown visibility, but these lanes are still export-first and do not yet grant truthful full-detail/runtime parity or AI-readable records |
| Profile | `deepwater runtime landing` | summary-first runtime carrier now exists on the admin high-sensitivity substrate using the current MyUW profile page, but it is still not a standalone personal-record domain and remains export-first / AI-blocked |
| Course websites | `deepwater runtime landing` | the repo now carries a `course-sites` runtime lane for the current CS course-website family on the shared `Course / Assignment / Event / Resource` contracts, but canonical authority merge and broader live corroboration still remain separate concerns |
| Time Schedule | `partial shared landing` | valuable catalog/schedule context is landed on the public course-offerings carrier, and the current working tree now supports an active-tab SLN detail fallback for richer section proof. It is still clearly separate from registration automation and full upstream parity |
| DawgPath | `planned read-only expansion` | valuable program-path context, but it must stay read-only and non-official |
| ctcLink class search | `isolated proof lane` | valuable Washington community-college discovery lane, but only for search/discovery, school-by-school validation, and narrow proof/discovery use until carrier honesty improves |

## Explicit Red-Zone Exclusions

| Surface | Current disposition | Why |
| :-- | :-- | :-- |
| `Register.UW` | `no-go` | registration automation, submission flows, and registration-related polling are explicitly outside the contract |
| `Notify.UW` | `no-go` | seat watching, seat-swap helpers, and registration-related polling are explicitly outside the contract |
| registration-related resources | `no-go` | protected registration resources must not become automation or polling targets |
| seat-watcher / waitlist polling | `no-go` | repeated seat-availability checks are red-zone behavior, not read-only observation |
| add/drop submission flows | `no-go` | add/drop submission is a site mutation, not a read-only academic-observation surface |
| hold-seat / seat-swap helpers | `no-go` | hold-seat and seat-swap helpers are operator actions outside the current contract |

## Internal Substrate vs Later Packaging

| Surface | Current truth | Why it is not a student-facing scope claim |
| :-- | :-- | :-- |
| `@campus-copilot/gradescope-api`, `@campus-copilot/edstem-api`, `@campus-copilot/myuw-api` | Real repo-public preview libs over the current snapshot/shared-contract path | They are builder-facing preview packaging, not site-proof by themselves |
| site-scoped read-only MCPs | Real repo-public preview tooling over imported snapshots | They stay snapshot-first and do not prove live site collection or browser control |
| browser evidence / control-plane tooling | Real internal diagnostics substrate (`probe`, `diagnose`, `support-bundle`, evidence capture) | Internal/manual/live support lane, not formal student product scope |
| public registry publishing / plugin distribution | Still later | Requires release policy and packaging decisions beyond repo-local truth |

## Rules

- Do not describe `internal`, `session-backed`, `state-fallback`, or `dom-fallback` rows as official public APIs.
- Do not describe a `selective gap` as current shipped truth just because the current entity family could plausibly hold it.
- If a deeper capability becomes real, update this ledger and [`site-capability-matrix.md`](site-capability-matrix.md) in the same change.
- Keep live/browser corroboration in the manual lane; do not rewrite daily browser state into the formal product contract.
