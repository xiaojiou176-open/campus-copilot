# Domain Schema Brief

The schema layer defines the repository's common data language.

It exists so that adapters, storage, export, diagnostics, and AI do not each invent their own shape.

## Canonical Entity Families

- `Course`
- `Resource`
- `Assignment`
- `Announcement`
- `Message`
- `Grade`
- `Event`
- `Alert`
- `TimelineEntry`

## Modeling Rules

- normalize semantics, not raw site field names
- separate fact entities from local user-state overlays and derived decision views
- keep stable user-facing fields in canonical objects
- keep site/raw details in source references and adapter-level evidence
- use ISO datetime strings with offsets

## Three-Layer Contract

The current decision layer depends on a strict three-layer model:

- **site facts**: canonical entities synced from supported sites
- **local user-state overlay**: local-only user judgment such as pin, snooze, note, or dismiss
- **derived decision views**: read models built from site facts plus local overlay

The layers must not collapse into each other:

- site facts stay canonical and read-only with respect to the formal product path
- local user-state does not mutate canonical site facts
- decision views are derived outputs, not a backdoor for raw site payloads
- `Alert` is treated as a derived decision view unless a later contract explicitly promotes it
- current repository implementation derives `Alert` at read time from canonical entities plus sync state; it is not a separate durable Dexie fact table

## Current Depth Carriers

Wave 2 read-only depth should prefer already-promoted optional fields before inventing new entity families:

- `Resource.summary`, `Resource.detail`, `Resource.downloadUrl`, `Resource.releasedAt`
- `Assignment.summary`, `Assignment.submittedAt`, `Assignment.score`, `Assignment.maxScore`
- `Message.summary`, `Message.category`, `Message.subcategory`
- `Event.summary`, `Event.location`, `Event.detail`

Those fields let the repo carry richer assignment, discussion, study-material, and schedule context without breaking the current entity family contract.

On the current shipped path, `Assignment.detail` now carries graded submission question, rubric, evaluation-comment, and state-backed annotation detail when the Gradescope submission viewer proves that carrier.

## Current Truth Boundary

- schema definitions live in `packages/schema`
- canonical local entities and read models live in `packages/storage`
- adapter outputs must normalize into schema objects before storage
- local overlay must remain separate from canonical site entities
- decision logic must continue to consume schema + storage truth instead of site-specific payloads

## Not Yet Promoted Domains

The following are **not** canonical entity families today:

- tuition / billing
- registration / enrollment
- textbook / course-material signals

Selective promotion still has one allowed path:

- decision-relevant registration / tuition-like reminders may travel through existing `Announcement` or `Event` summaries when they can be normalized into the current workbench contract
- site-specific course files or study-material carriers may travel through the existing `Resource` entity when the repo has already proved a stable read-only source
- that does **not** automatically promote tuition / registration into standalone canonical entity families

Deeper site-specific requests such as inline annotation detail, richer inbox reply context, or broader class-context fields only become current schema truth if a later contract explicitly promotes them into:

- existing canonical entities
- new canonical entity families
- or a clearly defined derived read model

## Why This Matters

Without schema-first design, the repo would collapse into:

- per-site field sprawl
- user judgment mixed into canonical facts
- UI consuming raw site detail
- exporter duplication
- AI prompts coupled to site payload shape

## Canonical Cross-References

- Runtime chain: [`02-system-architecture.md`](02-system-architecture.md)
- Adapter contract: [`04-adapter-spec.md`](04-adapter-spec.md)
- Product boundary: [`01-product-prd.md`](01-product-prd.md)
- Current capability snapshot: [`site-capability-matrix.md`](site-capability-matrix.md)
