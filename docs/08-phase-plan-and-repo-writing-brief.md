# Execution-Order Brief

This file no longer acts as a long-form “how to start from an empty repo” essay.

Its canonical role is to preserve the repository's build order rules for future extension work.

## Build Order Rules

When extending the repo, keep this order:

1. schema and contracts
2. adapters and normalization
3. storage and read models
4. workbench surfaces and export
5. AI explanation after structure
6. optional/manual live validation only after deterministic gates are stable

## What To Avoid

- starting with UI polish before data truth exists
- adding AI-first shortcuts that bypass adapters and schema
- mixing manual live evidence back into canonical product docs
- adding heavy external checks to the default required CI lane

## How To Use This Brief

- use it as an extension-order guardrail
- use [`09-implementation-decisions.md`](09-implementation-decisions.md) for current locked choices
- use [`verification-matrix.md`](verification-matrix.md) for verification lanes
- use [`integration-boundaries.md`](integration-boundaries.md) for external boundary honesty

## Current Reality

The repository is no longer empty.

So future work should treat this document as:

- an execution-order constraint
- not a daily implementation diary
- not a second source of truth for current runtime evidence
