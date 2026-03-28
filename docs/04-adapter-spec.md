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
official/private API -> page state -> DOM
```

The exact boundary class for each site lives in [`integration-boundaries.md`](integration-boundaries.md).

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

## Canonical Cross-References

- Runtime chain: [`02-system-architecture.md`](02-system-architecture.md)
- Boundary classes: [`integration-boundaries.md`](integration-boundaries.md)
- Security posture: [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md)
