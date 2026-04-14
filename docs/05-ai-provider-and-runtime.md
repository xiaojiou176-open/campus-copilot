# AI Provider And Runtime Brief

AI is a formal product path, but not the first runtime layer.

The repository's AI rule is:

> structure first, explanation second

## Current Formal AI Path

- thin BFF in `apps/api`
- `OpenAI` API-key flow
- `Gemini` API-key flow
- local `Switchyard` service-first bridge for user-owned runtime access on the same semantic contract
- provider-status responses use an `{ ok, providers, requestId }` envelope, where each provider entry only carries readiness plus reason
- provider proxy requests carry `provider`, `model`, and normalized `messages`
- BFF chat responses may carry `answerText`, optional `structuredAnswer` with summary / key points / next steps / trust gaps / citations, and `forwardedStatus`
- the formal path does not keep extra auth-mode branches in runtime payloads
- tool-result style prompts based on normalized local data

## AI Role In The Mainline

AI is already in the real product path, but as an **explainer layer**, not the source of truth.

In plain language:

- adapters collect the facts
- storage/read models shape the decision surface
- AI explains the structured result, cites it, and helps the user decide what to look at next

That means the current AI role is closest to:

- structured explanation
- operator next-step assistance
- evidence-aware decision support

It is **not** currently:

- autonomous browser control
- generic orchestration over raw pages
- an approval engine
- a write-capable agent loop

## Current API And Substrate Shape

Today the repository already has a real integration spine:

- `apps/api` is the public-facing thin HTTP layer for formal provider calls
- `apps/api` can bridge to a local `Switchyard` runtime without turning Campus Copilot into a generic orchestration shell
- extension and standalone web both speak the same `Switchyard` consumer seam while keeping Campus-owned explanation semantics
- `packages/schema` is the shared contract layer
- `packages/storage` is the decision/read-model layer
- `packages/exporter` is the structured output layer

This is best described as a **current read-only substrate plus repo-public preview tooling**, not a hosted SDK platform.

## Strategic Runtime Direction

The current shipped path still works through direct `OpenAI` / `Gemini` API-key requests.

But the endgame direction is now explicit:

- Wave 5 must make the runtime seam **Switchyard-first**
- Campus Copilot should stop growing its own long-term provider transport matrix
- Campus Copilot must still keep:
  - `messages[]`
  - `answerText` / `structuredAnswer`
  - citations
  - trust gaps
  - next actions
  - workspace truth
  - student-facing stop-rule logic

That means the future shape is not:

- delete the Campus consumer seam
- or move Campus product semantics into a generic runtime service

The future shape is:

- Campus keeps the thin consumer adapter and product semantics
- `Switchyard` owns provider transport, auth/remediation, and runtime substrate
- public integration packaging follows only after that seam is stable

## Next-Phase Builder Extraction vs Later Packaging

The next integration-facing move is still internal-first at the transport/runtime layer:

- stronger repo-owned read-side helpers
- internal private clients extracted from adapter logic
- Switchyard-first compat/cutover that preserves Campus semantic ownership

The following remain later-facing and must not be presented as current deliverables:

- external publishing / registry release of the current repo-public toolkit
- public plugin packaging
- hosted autonomy or write-capable surfaces

## Current MCP Position

Current honest status:

- the repository now includes a **repo-public read-only MCP preview** over imported workspaces and provider status
- the repo still is **not** a hosted public MCP platform
- write-capable MCP is **not** current scope

So the correct wording is:

> Campus Copilot now has a repo-public read-only MCP preview because it already has structured contracts, auditable read models, and a thin HTTP edge, but MCP is still not a hosted public platform surface.

## Ecosystem Fit

The repo is most honestly aligned with:

- **Codex**
- **Claude Code**
- **Switchyard** as a local provider-runtime bridge
- **MCP** as a future read-only builder path

Why:

- the repository produces structured, exportable, citation-aware context
- the AI layer is already formalized behind a thin BFF
- the runtime is auditable and repo-local

The repo is less appropriate to market today as:

- OpenHands-style autonomous general operator
- OpenClaw-style broad computer-use shell
- a generic hosted agent platform

## Current Non-Formal AI Paths

- OAuth as the default runtime path
- `web_session`
- Anthropic
- automatic multi-provider routing
- hosted/public-registry MCP as a default surface
- hosted/public-registry SDK as a current deliverable
- public plugin marketplace packaging as a current deliverable

## Runtime Rules

- AI does not read raw DOM, raw HTML, raw adapter payloads, or cookies
- AI consumes structured workbench outputs and export-ready data
- provider-specific transport logic stays behind the thin BFF boundary
- when `Switchyard` is used, Campus Copilot still talks to one local service boundary instead of owning provider transport itself
- `.env.example` exposes formal provider API-key env vars plus optional base-URL overrides
- `.env.example` also includes manual live-validation `CHROME_*` overrides, but those belong to the manual live lane and not to the formal AI runtime entry
- reserved OAuth-style env placeholders are not part of the default runtime entry
- future API/MCP/SDK work must stay read-oriented unless a later decision explicitly reopens write scope
- public plugin packaging must stay later than the current formal runtime path

## Why This Layer Exists

It decouples:

- site integration complexity
- normalized local data
- provider transport and auth differences

## Canonical Cross-References

- Locked choices: [`09-implementation-decisions.md`](09-implementation-decisions.md)
- Security and upload limits: [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md)
- Validation lanes: [`verification-matrix.md`](verification-matrix.md)
- Export and user surfaces: [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
- Wave 1B contract freeze ledger: [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md)
