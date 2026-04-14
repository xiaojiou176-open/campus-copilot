# Product Brief

Campus Copilot is a local-first study workspace for students who need one structured place to understand work across:

- Canvas
- Gradescope
- EdStem
- MyUW

## What The Product Does

It consolidates multi-site academic information into normalized local entities, then supports:

- workbench-style reading in the extension
- local user judgment on top of structured facts
- decision views that answer what to do first and what changed
- export of structured results
- AI explanation after structure with citations

## Primary User Questions

- What assignments are still open?
- What changed recently across my classes?
- What should I pay attention to first?

## Current Formal Product Direction

The repository is no longer optimizing for “more integration breadth first.”

The current formal product direction is:

- preserve canonical site facts from supported sites
- add a separate local user-state overlay for personal judgment
- derive decision views that answer what to do first and why
- keep export and AI aligned with those structured decision views

This remains a hard cut against the wrong narrative:

- do not treat new sites as the current formal product milestone
- do not treat new provider or auth paths as the current formal product milestone
- do not treat a larger chat shell as the current formal product milestone

## Current Formal Product Shape

This section is a **product contract target**, not a claim that every surface
already meets the final product-quality bar today.

In plain language:

- these are the shapes the repository is intentionally building toward now
- they are real repo-side directions and partially landed surfaces
- they should not be paraphrased as “every first fold is already perfect”

- read-only workflow
- manual sync
- local-first storage and workbench views
- extension default assistant-first companion mode with explicit export/settings entry
- site-scoped export mode instead of a preset-only sidebar story
- local user-state overlay for personal judgment
- Focus Queue, Weekly Load, and Change Journal as decision-facing surfaces
- richer assignment submission context, discussion highlights, and class/exam location context when they normalize into existing canonical entities
- a standalone read-only web workbench that consumes imported workspace snapshots on the same storage/export/AI contract
- export as a first-class path
- thin BFF for `OpenAI` and `Gemini` API-key flows
- citation-aware AI answers over structured results

## Current Phase Boundary

The Wave 1 contract split needs four buckets, not one blurred promise:

- **current formal scope**: the existing four-site decision workspace, cited AI over structured results, the thin BFF for `OpenAI` / `Gemini`, and the optional local `Switchyard` bridge on the same consumer seam
- **next-phase engineering**: product-serving depth that strengthens the same workspace, such as richer `Gradescope` page / image rendering beyond the current graded-submission question/rubric/evaluation-comment/annotation detail path, selective `registration / tuition / textbook` promotion on the same contract, and read-only academic planning/search expansion for `MyPlan`, `DARS`, `Time Schedule`, `DawgPath`, and class-search-only `ctcLink`
- **current repo-side expansion progress**: `Time Schedule` has now crossed from isolated prototype into the shared runtime path on the public course-offerings carrier, and `MyPlan` now has a shared planning substrate plus read-only planning-summary surfaces in the extension and the web workbench; both still need narrow, truthful wording and must not be described as registration automation or as full upstream-site parity
- **current preview scope**: repo-public, read-only builder surfaces such as `MCP / SDK / CLI / Skills / site API preview packages` and plugin-grade repo bundles that remain local-first, bundle-grade, and non-hosted
- **later ambition**: official listing, hosted distribution, broader launch-facing `SEO / video`, and any packaging or release-channel step that outruns the current repo-local proof surface

Selective new academic domains such as textbook/material or tuition-like signals only graduate into the contract through the same next-phase engineering lane; they are not implied current scope.
Current preview scope is also not the same thing as current formal student-facing scope: it is real repo-local builder packaging, but it is still read-only, non-hosted, and secondary to the student workbench.

The academic expansion lane has an extra safety rule:

- it may add read-only observation surfaces
- it may not promote `Register.UW` / `Notify.UW` automation into current scope
- it may not turn class search into registration automation
- it may not send raw course materials or instructor-authored files into AI by default

## Explicit Non-Goals

- generic web chatbot behavior
- expanding supported sites before the decision layer exists
- expanding provider/auth formal paths beyond `OpenAI` and `Gemini` API-key flows
- automatic posting, submission, or other write operations
- `Register.UW` / `Notify.UW` automation, seat-watcher flows, or registration-related polling
- raw-cookie product paths
- AI-first scraping that bypasses adapters and schema
- default AI analysis of raw course files, instructor-authored slides, exams, or other copyright-sensitive course materials
- public write-capable `MCP`
- hosted autonomy repositioning

## Canonical Cross-References

- Current locked choices: [`09-implementation-decisions.md`](09-implementation-decisions.md)
- Wave 1B contract freeze ledger: [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md)
- Validation boundaries: [`verification-matrix.md`](verification-matrix.md)
- Integration risk classes: [`integration-boundaries.md`](integration-boundaries.md)
- Academic expansion and safety contract: [`17-academic-expansion-and-safety-contract.md`](17-academic-expansion-and-safety-contract.md)
