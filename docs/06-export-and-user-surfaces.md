# Export And User Surfaces Brief

This repository is not built around an empty chat box.

Its user-facing shape is a workbench with export and AI as parallel formal paths.

## Current Formal Surfaces

- `sidepanel`
- `popup`
- `options`
- export presets
- AI explanation after structure
- `Focus Queue`
- `Weekly Load`
- `Change Journal`
- cited AI explanation

## Current Formal Surface Direction

The current formal surface goal is a **learning decision layer**, not a broader chat shell.

That direction should materialize as:

- `sidepanel` as the primary home for decision views
- `Focus Queue` as the first-class “what should I do first?” surface
- `Weekly Load` as the first-class planning surface
- `Change Journal` as the first-class “what changed?” surface
- cited AI explanations that point back to structured entities

These are part of the current formal surface shape.

## Surface Rules

- show structured state before asking users to type
- keep popup lightweight
- use sidepanel as the main workbench surface
- keep export first-class, not hidden behind AI
- keep diagnostics honest about missing prerequisites
- derive decision surfaces from storage read models and local overlay, not from raw site responses
- do not expand the formal surface area by adding new sites, provider/auth paths, or write operations first

## Current Export Presets

- current view
- weekly assignments
- recent updates
- all deadlines
- focus queue
- weekly load

## Why This Matters

The repository's value is:

- one local structured view
- one local layer for user judgment
- one derived layer for decision-making
- lower switching cost
- lower noise
- easier export
- easier explanation

not “another generic sidebar assistant.”

## Canonical Cross-References

- Product boundary: [`01-product-prd.md`](01-product-prd.md)
- Runtime chain: [`02-system-architecture.md`](02-system-architecture.md)
- Locked implementation choices: [`09-implementation-decisions.md`](09-implementation-decisions.md)
