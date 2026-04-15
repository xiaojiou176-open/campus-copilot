# Integration API And Ecosystem Fit

This brief is an integration-facing second-layer explainer, not the repository's
front-door identity.

Read it after the student-facing mainline is already clear in `README.md` and
the product docs.

This brief explains one narrow question:

> If you are an external builder, coding agent, or workflow maintainer, what is already real in Campus Copilot today, what is preview-only, and what still belongs to later Wave 6 packaging?

## How To Read This File

Use this file when you need the integration/tooling truth split:

- what integration surfaces are already real
- which ones are read-only or preview-grade
- which claims still require owner action, upstream listing, or later packaging

Do not use this file as the first product introduction. Campus Copilot is still
first a student-facing academic decision workspace.

All integration-facing surfaces in this file still inherit the academic safety contract in [`17-academic-expansion-and-safety-contract.md`](17-academic-expansion-and-safety-contract.md):

- no registration automation
- no `Register.UW` / `Notify.UW` product path
- no default AI ingestion of raw course files or instructor-authored materials
- no rebranding of internal/session-backed academic paths as official public APIs

## Current Integration Surface

Campus Copilot already has a real but secondary **read-side integration spine**:

- a thin local HTTP edge in `apps/api`
- a shared runtime compat seam in `packages/provider-runtime`
- shared domain contracts in `packages/schema`
- derived read models in `packages/storage`
- export-ready structured output in `packages/exporter`
- a standalone imported-workspace web surface in `apps/web` that reuses the same storage/export/AI contract

That makes the repository useful to integrators who arrive after the product story
is already grounded and want:

- structured academic context instead of raw browser noise
- cited AI answers over normalized data
- a narrow local BFF for formal model calls

It still does **not** make the repository a hosted MCP platform, hosted SDK platform, or hosted agent runtime.

Just as important:

- the current toolbox is **preview-grade but real**
- Wave 6 now has repo-local naming, examples, package metadata, and release-safe wording aligned in one place
- the repo-local public surfaces now keep explicit package file inventories plus fresh dry-run pack proof, so future publish decisions do not start from loose manifests
- the current repo must not pretend that preview surfaces already equal finished public distribution

## Current HTTP Surface

The current local API surface is intentionally small:

| Route | Role | Current status |
| :-- | :-- | :-- |
| `GET /health` | health check for the thin BFF | formal |
| `GET /api/providers/status` | provider readiness envelope for `openai`, `gemini`, and optional local `switchyard` | formal |
| `POST /api/ai/ask` | stable consumer seam that preserves Campus answer semantics while preferring `Switchyard` when configured | formal |
| `POST /api/providers/openai/chat` | proxy a formal OpenAI API-key request | formal |
| `POST /api/providers/gemini/chat` | proxy a formal Gemini API-key request | formal |
| `POST /api/providers/switchyard/chat` | proxy a local Switchyard runtime request through one service boundary | optional local bridge |

The envelope is intentionally simple:

- responses include `requestId`
- provider readiness exposes `ready` plus `reason`
- the consumer seam keeps `answerText` / `structuredAnswer` stable even when the runtime path moves behind `Switchyard`
- chat responses expose `answerText`, optional `structuredAnswer`, and `forwardedStatus`
- the current structured answer shape can carry a summary, key points, suggested next steps, trust gaps, and citations
- raw upstream payloads are not echoed back as the public client surface

If you want a machine-readable version of the same current local contract, read [`api/openapi.yaml`](api/openapi.yaml).

## Minimal Request Examples

These examples are intentionally small and repo-local.
They show the current real contract surface without pretending this is already a hosted public API.

### Health

```bash
curl http://127.0.0.1:8787/health
```

### Provider readiness

```bash
curl http://127.0.0.1:8787/api/providers/status
```

### Campus consumer seam

```bash
curl -X POST http://127.0.0.1:8787/api/ai/ask \
  -H 'content-type: application/json' \
  -d '{
    "provider": "gemini",
    "model": "gemini-2.5-flash",
    "runtimeMode": "switchyard_first",
    "messages": [
      { "role": "user", "content": "What should I do first today, and why?" }
    ]
  }'
```

### OpenAI or Gemini chat proxy

```bash
curl -X POST http://127.0.0.1:8787/api/providers/gemini/chat \
  -H 'content-type: application/json' \
  -d '{
    "provider": "gemini",
    "model": "gemini-2.5-flash",
    "messages": [
      { "role": "user", "content": "What should I do first today, and why?" }
    ]
  }'
```

### Optional local Switchyard bridge

Current thin-bridge runtime providers:
- `chatgpt`
- `gemini`
- `claude`
- `grok`
- `qwen`

```bash
curl -X POST http://127.0.0.1:8787/api/providers/switchyard/chat \
  -H 'content-type: application/json' \
  -d '{
    "provider": "chatgpt",
    "model": "gpt-5",
    "lane": "web",
    "messages": [
      { "role": "user", "content": "Summarize the current trust gaps." }
    ]
  }'
```

### Minimal TypeScript fetch example

This is a copy-paste local example for builders using **Codex** or **Claude Code** style workflows.
It is still just a repository-owned example, not a generated client or SDK surface.

```ts
const baseUrl = 'http://127.0.0.1:8787';

type ProviderStatusResponse = {
  requestId: string;
  ok: true;
  providers: Record<string, { ready: boolean; reason: string }>;
};

type ProviderChatResponse = {
  requestId: string;
  answerText: string;
  structuredAnswer?: {
    summary: string;
    bullets: string[];
    nextActions?: string[];
    trustGaps?: string[];
    citations: Array<{
      entityId: string;
      kind: string;
      site: string;
      title: string;
      url?: string;
    }>;
  };
  forwardedStatus: number;
};

export async function getProviderStatus() {
  const response = await fetch(`${baseUrl}/api/providers/status`);
  return (await response.json()) as ProviderStatusResponse;
}

export async function askCampusCopilot(question: string) {
  const response = await fetch(`${baseUrl}/api/providers/gemini/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: question }],
    }),
  });

  return (await response.json()) as ProviderChatResponse;
}
```

These examples are integration-facing convenience examples, not a promise that the repository already ships:

- hosted multi-tenant API access
- public auth flows
- hosted MCP infrastructure

## Current Shared Substrate

The repository already has real substrate pieces, and it now ships repo-public preview packaging:

- `packages/schema`: canonical entity and contract definitions
- `packages/storage`: derived read models, local overlay, and decision-layer selectors
- `packages/exporter`: JSON, CSV, Markdown, and ICS export artifacts
- `apps/web`: read-only second surface consuming imported workspace snapshots on the same substrate
- `packages/provider-runtime`: Switchyard compat seam that keeps Campus-owned answer semantics separate from runtime transport
- `packages/gradescope-api`, `packages/edstem-api`, `packages/myuw-api`: read-only site API preview libraries over the current adapter clients

The next academic integration lane still includes read-only planning/search surfaces such as `MyPlan`, `DARS`, `Time Schedule`, `DawgPath`, and class-search-only `ctcLink`, but they no longer all sit at the same maturity level:

- `MyPlan` now has a shared planning-substrate lane plus extension/web `Planning Pulse` adoption
- `Time Schedule` now has a limited shared runtime/site lane on the public course-offerings carrier
- `DARS` and `DawgPath` remain planned-only expansion lanes
- class-search-only `ctcLink` remains an isolated proof/discovery lane

Those lanes are still not the same thing as full shipped site parity, and should continue to be described with truthful partial/isolated wording rather than as current first-class site support.

This is the honest integration statement:

> Campus Copilot already has a reusable schema/storage/export spine, and it now
> exposes repo-public read-only SDK / CLI / MCP surfaces plus a public-ready
> repo-local provider-runtime seam package, but that integration layer is still
> not the repository's first identity and it is not a hosted SDK or autonomy
> product.

## Current Read-Only Toolbox Preview

The repo now ships a small read-only toolbox on top of the same substrate:

- `@campus-copilot/sdk`
  - `api`
  - `snapshot`
  - `sites`
- `@campus-copilot/workspace-sdk`
- `@campus-copilot/site-sdk`
- `@campus-copilot/cli`
- `@campus-copilot/mcp`
- `@campus-copilot/mcp-readonly`
- `@campus-copilot/mcp-server`
- `@campus-copilot/provider-runtime`
- `@campus-copilot/gradescope-api`
- `@campus-copilot/edstem-api`
- `@campus-copilot/myuw-api`
- repo-local public skills and integration examples

Package-level repo-public docs now exist for the current preview surfaces that are meant to be consumed directly from the repo:

- [`../packages/sdk/README.md`](../packages/sdk/README.md)
- [`../packages/workspace-sdk/README.md`](../packages/workspace-sdk/README.md)
- [`../packages/site-sdk/README.md`](../packages/site-sdk/README.md)
- [`../packages/cli/README.md`](../packages/cli/README.md)
- [`../packages/mcp/README.md`](../packages/mcp/README.md)
- [`../packages/mcp-readonly/README.md`](../packages/mcp-readonly/README.md)
- [`../packages/mcp-server/README.md`](../packages/mcp-server/README.md)
- [`../packages/provider-runtime/README.md`](../packages/provider-runtime/README.md)
- [`../packages/gradescope-api/README.md`](../packages/gradescope-api/README.md)
- [`../packages/edstem-api/README.md`](../packages/edstem-api/README.md)
- [`../packages/myuw-api/README.md`](../packages/myuw-api/README.md)

Those names are already real package names in this repository.
Wave 6 now has its repo-local docs, examples, and package metadata lined up cleanly.

If you want the fastest first-hop chooser before you commit to one of those surfaces, start with [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md).
If you want the current plugin-grade repo bundle router for Codex / Claude Code / OpenClaw-style consumers, start with [`../examples/integrations/plugin-bundles.md`](../examples/integrations/plugin-bundles.md).
If you want the current repo-side publication truth behind those same surfaces, read [`../DISTRIBUTION.md`](../DISTRIBUTION.md).

Current MCP tools stay narrow and truthful:

- workspace summary
- Canvas assignments
- Gradescope assignments
- EdStem messages
- MyUW events
- provider status

These tools operate on imported workspaces or the thin BFF. They do **not** claim live browser takeover or write capability.

## Ecosystem Fit

The current ecosystem fit is strongest where structured context matters more than raw browser control:

### Strong current fit

- **Codex**
- **Claude Code**

Why:

- the repo produces structured, citation-friendly context
- the AI layer already sits behind a thin BFF
- the product is centered on decision support, not a generic chat shell

### Honest current MCP fit

- **MCP**

Why:

- the repo already has structured contracts, read models, a narrow HTTP edge, and repo-public read-only MCP entrypoints
- the current MCP story is snapshot-first and thin-BFF-first instead of pretending to be live browser control or hosted autonomy

What is still future-facing:

- hosted/public-registry MCP distribution
- write-capable MCP is out of current scope

### Comparison-only ecosystems

- **OpenHands**
- **OpenCode**

These are useful comparison points, but they should stay secondary because Campus Copilot is not a broad autonomous operator runtime.

### Not appropriate for the main front door

- **OpenClaw**
- generic hosted autonomy
- write-capable operator bots

Those categories overstate the current product and reopen risk boundaries the repository has explicitly not accepted.

If a team still wants to consume Campus Copilot from an OpenClaw-style local operator/runtime, the safe path is:

- keep Campus Copilot on the snapshot/BFF/read-only side
- use the generic stdio MCP server or one site-scoped snapshot surface
- do not market that setup as live browser control or a write-capable plugin

## Current Scope vs Later

| Capability | Status |
| :-- | :-- |
| Thin local HTTP/API contract | current scope |
| Shared provider-runtime compat seam | current scope |
| Shared schema/storage/export substrate | current scope |
| Cited AI over structured outputs | current scope |
| Optional local Switchyard bridge | current scope, optional |
| Repo-public read-only site API preview libs | current scope |
| Internal private client extraction | later, internal-first |
| Repo-public read-only MCP preview | current scope |
| Repo-public read-only SDK preview | current scope |
| Repo-public read-only CLI preview | current scope |
| Wave 6 repo-local naming/examples/metadata alignment | materially landed in-repo |
| Public plugin packaging | later |
| Launch SEO / video packaging | later |
| Write-capable MCP | no-go for current scope |
| Hosted / SaaS autonomy layer | no-go for current scope |

## Consumer Start Files

If you are integrating Campus Copilot from a coding agent or local runtime, open the file that matches your control surface first instead of reverse-engineering the whole repo.

| Consumer shape | Open this first | What it proves today | What it still does not prove |
| :-- | :-- | :-- | :-- |
| Generic Codex-style MCP client | [`../examples/integrations/codex-mcp.example.json`](../examples/integrations/codex-mcp.example.json) | the combined read-only stdio server is real and repo-consumable | hosted/public MCP distribution |
| Claude Code / Claude Desktop | [`../examples/integrations/claude-code-mcp.example.json`](../examples/integrations/claude-code-mcp.example.json), [`../examples/mcp/claude-desktop.example.json`](../examples/mcp/claude-desktop.example.json) | combined server and site-scoped snapshot wiring are both real | live browser control or write capability |
| OpenClaw-style local operator/runtime | [`../examples/openclaw-readonly.md`](../examples/openclaw-readonly.md) | Campus Copilot can stay on the snapshot/BFF/read-only side of a local runtime | official plugin positioning, hosted autonomy, or write-capable operator loops |
| Skill-first integration workflow | [`../skills/README.md`](../skills/README.md) | repo-local public skills already exist for snapshot analysis and MCP consumption | hosted/public skill distribution |

## Integration Entry Path

If you want to integrate with the current repository shape, start here:

1. Run `pnpm start:api`
2. Read [`api/openapi.yaml`](api/openapi.yaml) for the machine-readable local HTTP contract
3. Read `apps/api/src/index.ts` for the live route contract implementation
4. Read `packages/schema/src/index.ts` for canonical entities
5. Read `packages/storage/src/derived-workbench.ts` and related read-model files for decision-layer truth
6. Use `packages/exporter` outputs as the structured handoff layer

## What Builders Should Not Assume Yet

Do not assume the current repository already provides:

- a hosted or multi-tenant public API surface
- a publicly versioned OpenAPI product contract beyond the repo-tracked local brief in [`api/openapi.yaml`](api/openapi.yaml)
- generated clients
- a public MCP server
- a versioned SDK package
- hosted multi-tenant builder surfaces

The repo-tracked local OpenAPI brief already exists, but those broader surfaces are still future-facing unless a later change promotes them into the formal public surface.

## What Wave 6 Still Leaves For Later

The current repo already has the core read-only toolbox pieces, and the repo-local packaging story is now materially aligned.

What still belongs to later execution instead of repo-local wording cleanup:

- registry publication and release-channel policy
- broader distribution outside the repository itself
- any packaging move that would outrun the still-pending Wave 5 `Switchyard-first` runtime cutover

## Repo-Local Public Proof Loop

Use this when you want a fresh, repeatable answer to "is the current
builder/package support layer still runnable and packable inside the repo?"

```bash
pnpm proof:public
```

What it currently proves:

- consumer routers and public-surface docs still line up
- public package tests still pass for the current repo-public scope
- CLI and MCP entrypoints expose a non-hanging help surface
- each public package can complete a dry-run pack step

What it does **not** prove:

- registry publication
- official listing
- marketplace listing
- hosted distribution

## Canonical Cross-References

- Public landing page: [`../README.md`](../README.md)
- Public capability snapshot: [`site-capability-matrix.md`](site-capability-matrix.md)
- AI/runtime boundary: [`05-ai-provider-and-runtime.md`](05-ai-provider-and-runtime.md)
- Export and product surfaces: [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
- Security and privacy brief: [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md)
