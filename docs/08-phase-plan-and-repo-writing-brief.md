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
- use [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md) for the current public safety and boundary summary
- use [`site-capability-matrix.md`](site-capability-matrix.md) when you need the public capability snapshot
- use [`verification-matrix.md`](verification-matrix.md) for verification lanes
- use [`integration-boundaries.md`](integration-boundaries.md) for external boundary honesty

## Current Reality

The repository is no longer empty.

So future work should treat this document as:

- an execution-order constraint
- not a daily implementation diary
- not a second source of truth for current runtime evidence

## Current Scope Split

Keep the repo-writing split simple and public-safe:

- current formal scope
- next-phase engineering
- later / platform ambition
- explicit no-go

Use these guardrails for later work:

1. deepen product-serving capabilities on the existing workbench contract before inventing new product shells
2. keep any standalone web evolution on the same schema/read-model/export/AI truth instead of building a second sync engine
3. treat surface polish, public naming, and launch-facing assets as later convergence work, not proof that unfinished substrate work is done
4. keep internal runtime-seam or browser diagnostics work in internal maintainership lanes instead of public product docs
5. treat repo-public builder packaging and launch/publication work as later or owner/platform-facing unless the repo explicitly promotes them into stable public contract

Detailed owner-side release queues, submission packets, and mutable publication
choreography should live in local maintainership packets such as
`.agents/Plans/`, not in the committed docs front door.
