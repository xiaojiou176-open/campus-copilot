# Integration Boundaries

This file is the canonical registry for external integration risk.

The point is simple:

> “Supported” does not always mean “official, stable, and low-risk.”

Each integration path should be described honestly so the repository does not market deep-water paths as if they were permanent public contracts.

## Boundary Classes

| Class | Meaning |
| :-- | :-- |
| `official` | documented public contract or clearly supported API surface |
| `internal` | private/internal endpoint or undocumented request surface |
| `session-backed` | depends on authenticated browser session state or page-local token material |
| `state-fallback` | uses page bootstrap state or equivalent injected state |
| `dom-fallback` | uses DOM parsing as a fallback layer |

## Site Registry

| Site | Primary path | Boundary class | Current sensitivity | Validation expectation | Public-safe wording |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Canvas | `/api/v1/*` | `official` | Medium | deterministic repo coverage + manual live validation when needed | “Canvas uses official API paths first, with filtering and fallbacks handled in the adapter.” |
| Gradescope | `/internal/*` plus DOM discovery | `internal`, `dom-fallback` | High | deterministic adapter tests + manual live validation for current tenant behavior | “Gradescope currently depends on internal and fallback collection paths and should not be described as an official public integration.” |
| EdStem | session-backed API requests plus DOM fallback | `internal`, `session-backed`, `dom-fallback` | High | deterministic adapter tests + manual live validation for current authenticated session | “EdStem uses authenticated session-backed requests and fallbacks; stability depends on the current site surface.” |
| MyUW | page state / DOM bridge | `state-fallback`, `dom-fallback` | Medium to High | deterministic adapter tests + manual live validation from a matching tab context | “MyUW currently depends on page-state or DOM-derived context and should be treated as context-sensitive.” |
| BFF provider status | local loopback API | `official` repo-local path | Low | deterministic repo gate | “The BFF exposes local status and proxy routes for formal API-key flows.” |
| Provider round-trip | `OpenAI` / `Gemini` API-key flow | `official` external provider, environment-dependent | Medium | optional local smoke, not required CI | “Provider round-trip is an environment-dependent validation lane, not a default merge gate.” |

## Wording Rules

Use wording like:

- “official path”
- “internal path”
- “session-backed”
- “state fallback”
- “DOM fallback”
- “manual live validation required”

Avoid wording like:

- “stable forever”
- “fully verified public integration”
- “official” for private/internal/session-backed paths

## Review Rules

If a README, changelog, or public note mentions a site capability, it must match the boundary class in this file.
