# Domain Schema Brief

The schema layer defines the repository's common data language.

It exists so that adapters, storage, export, diagnostics, and AI do not each invent their own shape.

## Canonical Entity Families

- `Course`
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

## Current Truth Boundary

- schema definitions live in `packages/schema`
- canonical local entities and read models live in `packages/storage`
- adapter outputs must normalize into schema objects before storage
- local overlay must remain separate from canonical site entities
- decision logic must continue to consume schema + storage truth instead of site-specific payloads

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
- Locked implementation choices: [`09-implementation-decisions.md`](09-implementation-decisions.md)
