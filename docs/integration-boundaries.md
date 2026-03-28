# Integration Boundaries

This file is the explanation layer for external integration risk.

The machine-readable source of truth now lives in:

- [`../policies/integration-boundaries.yaml`](../policies/integration-boundaries.yaml)

Use this Markdown file when you need the human explanation.
Use the YAML file when a script, policy check, or future automation needs canonical boundary facts.

## Why This Registry Exists

“Supported” does not always mean:

- official
- stable
- low-risk

The repository must describe deep-water paths honestly so that public docs, README copy, changelog text, and future automation do not quietly over-claim them.

## Boundary Classes

| Class | Meaning |
| :-- | :-- |
| `official` | documented public contract or clearly supported API surface |
| `internal` | private/internal endpoint or undocumented request surface |
| `session-backed` | depends on authenticated browser session state or page-local token material |
| `state-fallback` | uses page bootstrap state or equivalent injected state |
| `dom-fallback` | uses DOM parsing as a fallback layer |

## Current Registry Summary

| Site | Primary path | Boundary classes | Validation expectation |
| :-- | :-- | :-- | :-- |
| Canvas | `/api/v1/*` | `official` | deterministic repo coverage plus manual live validation when needed |
| Gradescope | `/internal/*` plus DOM discovery | `internal`, `dom-fallback` | deterministic adapter tests plus manual live validation for current tenant behavior |
| EdStem | session-backed API requests plus DOM fallback | `internal`, `session-backed`, `dom-fallback` | deterministic adapter tests plus manual live validation for the current authenticated session |
| MyUW | page state / DOM bridge | `state-fallback`, `dom-fallback` | deterministic adapter tests plus manual live validation from a matching tab context |
| BFF provider status | local loopback API | `official` | deterministic repo gate |
| Provider round-trip | `OpenAI` / `Gemini` API-key flow | `official` | optional local smoke, not required CI |

## Public Honesty Rules

Use wording like:

- official path
- internal path
- session-backed
- state fallback
- DOM fallback
- manual live validation required

Avoid wording like:

- stable forever
- fully verified public integration
- official for private/internal/session-backed paths

## Review Rule

If README, changelog, or any public note mentions a site capability, it must stay consistent with the YAML registry.
