# Adapter Contract Brief

Adapters are not one-off scraper scripts.

They are the collection, fallback, and normalization layer for each supported site.

## Supported Sites

- Canvas
- Gradescope
- EdStem
- MyUW

## Canonical Collection Order

Adapters should prefer:

```text
official/private API -> page state -> DOM -> last-resort heuristics
```

The exact boundary class for each site lives in [`integration-boundaries.md`](integration-boundaries.md).
The current public capability snapshot lives in [`site-capability-matrix.md`](site-capability-matrix.md).

## Adapter Responsibilities

- detect whether the site/surface can run
- choose the best collector path for the current context
- fall back in a controlled order
- normalize into canonical schema objects
- record attempts, failures, and outcome metadata

## Public Honesty Rules

- do not market internal or session-backed paths as stable public APIs
- do not let AI guess selectors or scrape raw pages directly
- do not treat DOM fallback as the primary happy path when a stronger surface exists
- do not promote heuristics into the formal contract when the repo has not yet proved a stronger API/state/DOM source for that resource family

## Current Resource Families vs Next-Phase Depth

The current formal adapter contract only covers the resource families already represented in the current capability map.

The following requests remain **next-phase depth**, not current shipped truth:

- broader EdStem grouped-material or richer download UX paths beyond the already-shipped course-resources `Resource` contract
- MyUW additional homepage card families plus registration / tuition-like signals
- textbook or course-material collection paths

The following depth is now **current shipped truth** because it already normalizes into existing entities:

- Canvas inbox messages on the current `Message` contract
- Gradescope graded submission question/rubric/evaluation-comment/annotation detail context on the current `Assignment` contract via the state-backed submission viewer carrier
- EdStem course resources on the current `Resource` contract through the authenticated `api/courses/:course_id/resources` carrier, including truthful read-only download hints
- MyUW notice text and class / exam location detail on existing `Announcement` / `Event` contracts

Those items may become broader later, but they should not be described as implemented until they are added to the canonical capability map and normalized into the shared schema/read-model chain. When a current shipped path still depends on an internal or session-backed carrier, keep the wording honest and avoid describing it as a stable public API.

## Canonical Cross-References

- Runtime chain: [`02-system-architecture.md`](02-system-architecture.md)
- Boundary classes: [`integration-boundaries.md`](integration-boundaries.md)
- Security posture: [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md)
- Capability buckets: [`site-capability-matrix.md`](site-capability-matrix.md)
- Repo-writing split: [`08-phase-plan-and-repo-writing-brief.md`](08-phase-plan-and-repo-writing-brief.md)
- Academic expansion contract: [`17-academic-expansion-and-safety-contract.md`](17-academic-expansion-and-safety-contract.md)
