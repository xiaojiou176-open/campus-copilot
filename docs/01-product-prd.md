# Product Brief

Campus Copilot is a local-first study workspace for students who need one structured place to understand work across:

- Canvas
- Gradescope
- EdStem
- MyUW

## What The Product Does

It consolidates multi-site academic information into normalized local entities, then supports:

- workbench-style reading in the extension
- local user judgment on top of structured facts
- decision views that answer what to do first and what changed
- export of structured results
- AI explanation after structure with citations

## Primary User Questions

- What assignments are still open?
- What changed recently across my classes?
- What should I pay attention to first?

## Current Formal Product Direction

The repository is no longer optimizing for “more integration breadth first.”

The current formal product direction is:

- preserve canonical site facts from supported sites
- add a separate local user-state overlay for personal judgment
- derive decision views that answer what to do first and why
- keep export and AI aligned with those structured decision views

This remains a hard cut against the wrong narrative:

- do not treat new sites as the current formal product milestone
- do not treat new provider or auth paths as the current formal product milestone
- do not treat a larger chat shell as the current formal product milestone

## Current Formal Product Shape

- read-only workflow
- manual sync
- local-first storage and workbench views
- local user-state overlay for personal judgment
- Focus Queue, Weekly Load, and Change Journal as decision-facing surfaces
- export as a first-class path
- thin BFF for `OpenAI` and `Gemini` API-key flows
- citation-aware AI answers over structured results

## Explicit Non-Goals

- generic web chatbot behavior
- expanding supported sites before the decision layer exists
- expanding provider/auth formal paths beyond `OpenAI` and `Gemini` API-key flows
- automatic posting, submission, or other write operations
- raw-cookie product paths
- AI-first scraping that bypasses adapters and schema

## Canonical Cross-References

- Current locked choices: [`09-implementation-decisions.md`](09-implementation-decisions.md)
- Validation boundaries: [`verification-matrix.md`](verification-matrix.md)
- Integration risk classes: [`integration-boundaries.md`](integration-boundaries.md)
