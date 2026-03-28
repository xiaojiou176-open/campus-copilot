# Product Brief

Campus Copilot is a local-first study workspace for students who need one structured place to understand work across:

- Canvas
- Gradescope
- EdStem
- MyUW

## What The Product Does

It consolidates multi-site academic information into normalized local entities, then supports:

- workbench-style reading in the extension
- export of structured results
- AI explanation after structure

## Primary User Questions

- What assignments are still open?
- What changed recently across my classes?
- What should I pay attention to first?

## Current Formal Product Shape

- read-only workflow
- manual sync
- local-first storage and workbench views
- export as a first-class path
- thin BFF for `OpenAI` and `Gemini` API-key flows

## Explicit Non-Goals

- generic web chatbot behavior
- automatic posting, submission, or other write operations
- raw-cookie product paths
- AI-first scraping that bypasses adapters and schema

## Canonical Cross-References

- Current locked choices: [`09-implementation-decisions.md`](09-implementation-decisions.md)
- Validation boundaries: [`verification-matrix.md`](verification-matrix.md)
- Integration risk classes: [`integration-boundaries.md`](integration-boundaries.md)
