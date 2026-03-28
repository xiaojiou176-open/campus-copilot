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
- separate fact entities from derived entities
- keep stable user-facing fields in canonical objects
- keep site/raw details in source references and adapter-level evidence
- use ISO datetime strings with offsets

## Current Truth Boundary

- schema definitions live in `packages/schema`
- canonical local entities and read models live in `packages/storage`
- adapter outputs must normalize into schema objects before storage

## Why This Matters

Without schema-first design, the repo would collapse into:

- per-site field sprawl
- UI consuming raw site detail
- exporter duplication
- AI prompts coupled to site payload shape

## Canonical Cross-References

- Runtime chain: [`02-system-architecture.md`](02-system-architecture.md)
- Adapter contract: [`04-adapter-spec.md`](04-adapter-spec.md)
- Locked implementation choices: [`09-implementation-decisions.md`](09-implementation-decisions.md)
