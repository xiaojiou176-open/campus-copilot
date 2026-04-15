# Site Capability Matrix

This file is the current capability map for the four supported study surfaces.

Use it when you need a fast answer to:

- what each site currently syncs
- which collection path is in use
- which boundary class applies
- which gaps are still deeper-next-wave work

This file is not a live-proof ledger.
For manual browser/session evidence, use [`live-validation-runbook.md`](live-validation-runbook.md).
For the exhaustive current-vs-selective-vs-later map, use [`13-site-depth-exhaustive-ledger.md`](13-site-depth-exhaustive-ledger.md).

Current shipped truth is still the four-site workspace.
The read-only expansion registry below tracks partial repo-side adoption separately so it does not get confused with full shipped support.

## Current Matrix

| Site | Resource family | Current path | Boundary type | Current code status | Current live-proof expectation | Next deep gap |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| Canvas | `courses` | `/api/v1/courses` | `official` | Implemented | Manual live validation still required for current session truth | None at this layer |
| Canvas | `resources` | `/api/v1/courses/:course_id/files` plus `include[]=syllabus_body` on `/api/v1/courses`, with landed-on-main enrichment from `modules / groups / media_objects` on the same `Resource` contract | `official` | Implemented on the shared `Resource` contract with file metadata, visible download links when available, syllabus-summary resources, and landed-on-main module/group/media carriers | Manual live validation still required for current session truth | full module-tree parity, deeper group-scoped carriers, richer recording parity, and instructor-feedback carriers remain selective next-phase work |
| Canvas | `assignments` | `/api/v1/courses/:course_id/assignments?include[]=submission` | `official` | Implemented | Manual live validation still required for current session truth | `summary / submittedAt / score` are current |
| Canvas | `announcements` | `/api/v1/announcements?context_codes[]=course_*` | `official` | Implemented | Manual live validation still required for current session truth | None at this layer |
| Canvas | `messages` | `/api/v1/conversations?scope=inbox` plus detail enrichment from `/api/v1/conversations/:id` when available | `official` | Implemented with attachment-aware latest-message summaries on the shared `Message` contract | Manual live validation still required for current session truth | deeper per-thread reply-body / attachment context if later needed |
| Canvas | `grades` | assignment submission fields from official assignment payloads | `official` | Implemented | Manual live validation still required for current session truth | Deeper gradebook-only surfaces are still out of scope |
| Canvas | `events` | `/api/v1/calendar_events?context_codes[]=course_*` | `official` | Implemented | Manual live validation still required for current session truth | Better event classification if later needed |
| Gradescope | `courses` | internal assignment payload-derived course ids and names when available, otherwise internal path or course/dashboard DOM | `internal`, `dom-fallback` | Implemented | Manual live validation required for current tenant/session | Better internal path selection across dashboard vs course context |
| Gradescope | `assignments` | `/internal/assignments`, fallback course DOM rows with assignment/submission drilldown links, plus graded submission enrichment from `/courses/:course_id/assignments/:assignment_id/submissions/:submission_id` with state-first parsing and DOM fallback when available in the current course/submission context | `internal`, `dom-fallback` | Implemented | Manual live validation now includes a reviewed state-backed annotation fixture from a real submission page in the repo-owned lane | submission summary/score plus question/rubric/evaluation-comment/annotation detail are current, the shared `Assignment` contract now preserves question-level review summaries, and landed-on-main graded submission pages still surface graded-copy/history/regrade action availability as generic detail; richer page/image rendering semantics remain beyond the current contract |
| Gradescope | `grades` | `/internal/grades`, fallback course DOM score cells with exact submission URL capture when present, plus direct submission-page DOM parsing for total score continuity | `internal`, `dom-fallback` | Implemented | Manual live validation required for current tenant/session | richer page/image rendering semantics remain next-phase without creating a fake new entity |
| EdStem | `courses` | session-backed `https://us.edstem.org/api/user` course memberships, fallback dashboard/course-page DOM metadata | `internal`, `session-backed`, `dom-fallback` | Implemented | Manual live validation required for current authenticated session | Course-role / lab metadata if later promoted into a stable read model |
| EdStem | `messages` | session-backed `https://us.edstem.org/api/courses/:course_id/threads` plus inferred `/internal/unread` and `/internal/recent-activity` defaults when a course URL is available; missing optional paths degrade to empty activity lists instead of failing the private collector, plus direct thread-detail DOM fallback for thread body and replies | `internal`, `session-backed`, `dom-fallback` | Implemented | Manual live validation required for current authenticated session | thread summary/category plus direct thread/reply DOM context are current; any richer attachment/thread-relationship semantics remain selective |
| EdStem | `resources` | session-backed `https://us.edstem.org/api/courses/:course_id/resources` with API-first normalization of file metadata and optional course-scoped download URLs, landed-on-main `/us/courses/:course_id/lessons` DOM normalization for summary-first lesson links, plus current local `https://us.edstem.org/api/lessons/:lesson_id?view=1` lesson-detail enrichment that now promotes lesson slides into grouped `Resource` items on the same shared contract | `internal`, `session-backed`, `dom-fallback` | Implemented on the shared `Resource` contract | Manual live validation now has a reviewed redacted resources API fixture, authenticated raw capture corroboration for the current resource carrier, fresh authenticated DOM proof that `/lessons` rows can normalize into summary-first lesson resources, and current local proof that lesson-detail pages expose a session-backed `api/lessons/:lesson_id?view=1` carrier with grouped lesson-slide materials | broader grouped-material semantics beyond lesson-detail slides or richer download UX remain selective if a later contract needs them |
| MyUW | `courses` | session-backed `https://my.uw.edu/api/v1/schedule/current` primary-section schedule records | `session-backed` | Implemented | Manual live validation required from a matching MyUW tab | Additional authenticated homepage card families from `/api/v1/*` surfaces |
| MyUW | `announcements` | session-backed `https://my.uw.edu/api/v1/notices/`, fallback page state, then DOM | `session-backed`, `state-fallback`, `dom-fallback` | Implemented with notice-detail and selective reminder promotion on the current `Announcement` contract | Manual live validation required from a matching MyUW tab | Additional authenticated homepage card families from `/api/v1/*` surfaces plus any future standalone billing/enrollment domain |
| MyUW | `events` | session-backed `https://my.uw.edu/api/v1/visual_schedule/current` for next class/final-exam projections plus `https://my.uw.edu/api/v1/deptcal/`, fallback page state, then DOM, including `my.uw.edu/academic_calendar/` event parsing on the current `Event` contract | `session-backed`, `state-fallback`, `dom-fallback` | Implemented with class/exam location/detail, academic-calendar event parsing, plus reminder promotion for registration deadline-like signals on the current `Event` contract | Manual live validation required from a matching MyUW tab | additional authenticated homepage card families remain selective next-phase; broader registration/tuition domains are still not standalone shipped truth |

## Planned Read-Only Expansion Candidates

| Site | Planned surface | Expected posture | Current truth |
| :-- | :-- | :-- | :-- |
| MyPlan | planning / transfer-planning context | read-only only; prefer stronger official/public surfaces before session-backed or DOM fallback | shared planning substrate now lands in storage and surfaces as a read-only `Planning Pulse` summary in the extension/web workbench plus AI/export context. The repo now also carries a scoped `myplan.uw.edu/*` host lane and a capture path for `myplan.uw.edu/plan` plus `.../audit` pages, and fresh canonical repo-owned browser proof confirms that both live surfaces still open in the current `Profile 1` lane. This is a landed summary lane, not full MyPlan parity or automatic runtime capture parity. |
| DARS | degree-audit visibility | read-only only; current-user-only interpretation | a landed summary lane now flows through the existing `MyPlan` planning substrate. Current repo-side truth is `Planning Pulse` / export / AI-caution summary, not a standalone DARS runtime site. |
| Transcript | historical academic record summary | read-only only; landed summary lane and export-first | a landed summary lane now exists on the admin high-sensitivity substrate using the current transcript page carrier. It is still not a standalone student-record domain or AI-readable detail lane. |
| Financial aid | aid status summary | read-only only; landed summary lane and export-first | a landed summary lane now exists on the admin high-sensitivity substrate using the current financial-aid status page carrier. It is still not a full aid-detail or document-ingestion lane. |
| Profile | current-user profile visibility | read-only only; landed summary lane and export-first | a landed summary lane now exists on the admin high-sensitivity substrate using the current MyUW profile page carrier. It is still not a standalone personal-record domain or AI-readable detail lane. |
| Accounts | account-state summary | read-only only; landed summary lane and export-first | a landed summary lane now exists on the admin high-sensitivity substrate using the current MyUW accounts page carrier. It is still not a full billing/account-management domain. |
| Tuition detail | tuition statement summary | read-only only; landed summary lane and export-first | a landed summary lane now exists on the admin high-sensitivity substrate using the current tuition statement page carrier. Current truth is stronger than a page-open placeholder: the lane can summarize quarter, due/balance posture, tuition classification, credit hours, charges/payments totals, aid-to-account, and whether a mandatory-fee breakdown table is visible. It is still not a standalone billing-detail or AI-readable document lane. |
| Time Schedule | catalog/schedule lookup | read-only only; must not turn into registration automation | shared runtime landing now exists on the public course-offerings carrier with shared site labels/runtime fan-out, and main now also supports an active-tab SLN detail fallback on `sdb.admin.washington.edu/timeschd/uwnetid/sln.asp?...`. This is a landed summary lane with deeper runtime proof, not registration support or full upstream-site parity. |
| Course websites | `courses.cs.washington.edu` family (`Home / Syllabus / Schedule / Assignments`) | read-only only; scope-limited and authority-aware | repo-side shared runtime lane now exists on the existing `Course / Assignment / Event / Resource` contracts for the current CS course-website family. It is real current scope for that family, but still not a canonical merge truth for all course websites. |
| DawgPath | major/program path visibility | read-only only; must not be marketed as an official advising product | planned next-lane candidate, not current shipped support |
| ctcLink class search | class-search-only discovery | read-only only; validate school-by-school and do not overclaim stable anonymous JSON APIs | planned next-lane candidate, not current shipped support |

## Red-Zone Exclusions

| Surface | Current status | Why |
| :-- | :-- | :-- |
| `Register.UW` | `no-go` | registration automation and registration-related polling are out of scope |
| `Notify.UW` | `no-go` | seat watching, seat-swap flows, and registration-related polling are out of scope |
| seat-watcher / waitlist polling | `no-go` | repeated registration-availability checks are red-zone behavior, not read-only observation |
| add/drop submission | `no-go` | the current contract never submits registration-state changes |
| hold-seat / seat-swap helpers | `no-go` | those are operator actions and stay outside the product path |

## Exhaustive Disposition Snapshot

This section answers the question the shorter matrix intentionally does not: which deep gaps are still direct enhancement candidates, and which ones must stay selective, internal, later, or owner-only.

| Site | Deep gap or adjacent path | Current disposition | Why |
| :-- | :-- | :-- | :-- |
| Canvas | richer inbox reply-body / full thread parity beyond the current latest-message body / attachment hint | selective gap | Useful only if it keeps strengthening the current `Message` contract without overclaiming inbox internals as a stable public API. |
| Canvas | separate gradebook-only surfaces | later / no-go for current contract | The current decision workspace already carries assignment submission summary, score, and max score without reopening a new gradebook domain. |
| Gradescope | richer page/image rendering semantics beyond the current annotation summary/detail contract | internal substrate | The repo now ships state-backed annotation detail plus graded-copy/history/regrade action hints on the current `Assignment` contract, but it still does not claim a full annotated document viewer or a full regrade workflow. |
| Gradescope | dashboard/course discovery hardening | internal substrate | This is collector hardening, not a new student-facing product claim by itself. |
| EdStem | grouped resource bundles or richer download UX beyond the current `Resource` contract | selective gap | The current API-backed `Resource` path is shipped, landed-on-main lesson links from `/lessons` feed the same summary-first contract, and current local lesson-detail proof now promotes lesson slides into grouped `Resource` items through `api/lessons/:lesson_id?view=1`; but broader grouped-material semantics beyond those lesson slides or richer download affordances are still not formal current scope. |
| EdStem | tenant/account recovery | owner-only / external | The repo can diagnose the boundary, but cannot manufacture a valid tenant account. |
| MyUW | homepage card expansion | selective gap | Candidate only if it normalizes into the existing `Announcement` / `Event` decision layer. |
| MyUW | registration / tuition-like reminders | selective gap | Existing reminder-like text now promotes through the current `Announcement` / `Event` carriers, but the repo still does not ship a standalone billing/enrollment domain. |
| All sites | browser evidence capture | internal substrate | Useful for diagnostics and fixture prep, but still not a student-facing feature claim. |

## Wave 1B Request Buckets

This section maps frequently requested deeper capabilities into contract buckets.

| Requested capability | Current state | Contract bucket | Why it belongs there |
| :-- | :-- | :-- | :-- |
| Canvas file resources and syllabus summary resources | current shipped matrix | current formal scope | official course files now land on the shared `Resource` contract, and course-level `syllabus_body` now contributes a truthful summary resource without overclaiming full module/page parity |
| Canvas richer assignment submission context | current shipped matrix | current formal scope | current assignment entities already surface summary / submittedAt / score context |
| Canvas messages | current shipped matrix | current formal scope | current message entities already carry normalized inbox title/summary context |
| Gradescope deeper submission / score context | current shipped matrix | current formal scope | current assignment rows already carry summary / score context |
| Gradescope question/rubric/evaluation-comment detail context | current shipped matrix | current formal scope | current assignment rows can now carry graded submission question/rubric/evaluation-comment detail on `summary` + `detail` without inventing a new entity family |
| Gradescope deeper inline / drawn annotation context | current shipped matrix | current formal scope | current assignment rows now carry state-backed annotation count and preview detail from the submission viewer carrier without inventing a new entity family |
| Gradescope graded-copy / history / regrade action signals | current shipped matrix | current formal scope | current graded submission detail can now surface action-level availability for `Download graded copy`, `Submission history`, and `Request regrade` without inventing a fake standalone workflow domain |
| EdStem thread summary / category context | current shipped matrix | current formal scope | current message rows already carry summary/category detail |
| EdStem reply-body | current shipped matrix | current formal scope | direct thread-detail DOM parsing now normalizes thread body and reply bodies into the shared `Message` contract |
| EdStem resources | current shipped matrix | current formal scope | authenticated `api/courses/:course_id/resources` responses now normalize into canonical `Resource` entities with file metadata and optional session-backed download URLs, and landed-on-main lesson links from `/lessons` now feed the same summary-first contract |
| MyUW richer class / exam context | current shipped matrix | current formal scope | current event rows already carry class/exam summary, location, and detail |
| MyUW registration / tuition-like signals | not in the current shipped matrix | next-phase engineering, selective promotion only | only if the signals can be normalized into the same decision layer |
| Textbook / course-material signals | not in the current shipped matrix | next-phase engineering, selective promotion only | only if a stable source can be normalized into the same contract |
| Standalone WebUI | current read-only second surface | current formal scope | same product contract via imported workspace snapshots, not a second sync engine |
| Internal private clients | not a site-capability claim | later internal substrate | useful internal extraction, not a current product claim |
| Repo-public read-only site API preview libs | not a site-capability claim | current preview scope | wrapper exports now exist for `Gradescope / EdStem / MyUW`, but they remain preview packaging |
| Repo-public read-only MCP preview | not a site-capability claim | current preview scope | snapshot-backed tooling now exists, but it is not live-site proof or hosted infrastructure |
| Launch surface / SEO / video | not a site-capability claim | later launch direction | must not be described as current shipped capability |

## Current Round Disposition

This table freezes the current “what do we do with the deeper asks?” answer.

| Site | Deeper ask | Current disposition | Why |
| :-- | :-- | :-- | :-- |
| Course websites | shared course-site runtime on `Home / Syllabus / Schedule / Assignments / Tasks` | `partial shared landing` | the repo now has a truthful `course-sites` runtime lane on the shared schema/storage contract, but canonical authority merge still belongs to the cluster substrate and broader live/browser corroboration remains manual |
| Canvas | module-driven resource routing / groups / recordings | `selective gap` | landed-on-main partial module/group/media carriers already exist on the current `Resource` contract, including module references for `Page / ExternalUrl / File / Assignment / Discussion / Quiz / SubHeader`, but full module trees, deeper group-scoped carriers, and durable recording parity still need a stronger truthful contract |
| Canvas | richer message reply-body / attachment context | `selective gap` | valuable only if it directly strengthens the current decision workspace |
| Canvas | gradebook-only or broader grading surfaces | `later / internal substrate` | outside the current shared read-only workbench contract |
| Gradescope | richer page/image rendering beyond current annotation summaries | `internal substrate` | current assignment rows now ship annotation detail plus graded-copy/history/regrade action hints, but the repo still does not claim a full annotated document viewer or a full regrade workflow |
| EdStem | grouped resource bundles / richer download UX beyond the current `Resource` contract | `selective gap` | current API-backed resources are shipped, landed-on-main lesson links from `/lessons` now also feed the same summary-first contract, and current local lesson-detail proof now promotes lesson slides into grouped `Resource` items through `api/lessons/:lesson_id?view=1`; but broader grouped-material semantics beyond those lesson slides are still not formal current truth |
| MyUW | registration / tuition-like signals | `selective gap` | may travel through existing announcement/event carriers, but not yet as a new canonical domain |
| Transcript / finaid / tuition/accounts detail | `landed summary lane + deeper detail blocker` | current repo truth now has landed summary lanes on the admin high-sensitivity substrate plus AI-deny rules, but there is still no truthful standalone detail/runtime carrier for the full records domain |
| Any site | new standalone tuition / registration / textbook domain | `later / platform ambition` | changes the schema contract instead of deepening the current one |
| Any site | write-capable automation | `no-go` | violates the current read-only boundary |

## Rules

- Do not describe `internal`, `session-backed`, `state-fallback`, or `dom-fallback` rows as official public APIs.
- If code changes materially alter a row above, update this file in the same change.
- If a claim depends on a real logged-in browser session, keep that claim in the manual live lane and not in required CI wording.
- Treat the `Next deep gap` column as **next-phase engineering only**, not as evidence that the deeper capability is already in current shipped scope.
- Treat [`13-site-depth-exhaustive-ledger.md`](13-site-depth-exhaustive-ledger.md) as the detailed ledger when a short row here is not enough.
