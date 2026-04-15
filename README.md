# OpenCampus

> The local-first campus decision desk, with Campus Copilot as the current flagship academic workspace inside it.

> An academic decision workspace for students who want Canvas, Gradescope, EdStem, and MyUW in one structured place, then want clear answers to what changed, what matters first, and what to export or ask with cited AI.

[Docs](docs/README.md) · [Quickstart](#quickstart) · [Integrations](INTEGRATIONS.md) · [Distribution](DISTRIBUTION.md) · [Privacy](PRIVACY.md) · [Product Brief](docs/01-product-prd.md) · [Academic Safety](docs/17-academic-expansion-and-safety-contract.md) · [User Surfaces](docs/06-export-and-user-surfaces.md) · [Verification Matrix](docs/verification-matrix.md) · [Contributing](CONTRIBUTING.md) · [AI Collaboration](CLAUDE.md) · [Security](SECURITY.md) · [License](LICENSE)

![Campus Copilot hero overview](docs/assets/hero-workbench-overview.svg)

Real workbench proof, not concept art:

![Campus Copilot sidepanel overview](docs/assets/sidepanel-overview.png)

## Naming Today

- **OpenCampus** = the public-facing product and family name
- **Campus Copilot** = the current flagship student workbench inside OpenCampus
- **Campus Copilot for UW** = the browser-extension distribution name when the school-specific surface needs to be explicit

In plain language: **OpenCampus is the name above the door; Campus Copilot is the flagship desk you sit at today.**

## Start Here In 60 Seconds

Campus Copilot takes four campus sites and turns them into **one local workspace**.

1. Sync `Canvas`, `Gradescope`, `EdStem`, and `MyUW` into one workbench.
2. Open the decision layer to see **what changed**, **what is still open**, and **what to do first**.
3. Export the same structured view or ask **cited AI** to explain it.

This repo is not a blank chat shell. It is a **student-first desk**: structure first, export and AI second.

## Why This Exists

Students should not have to rebuild the same mental map across multiple campus sites before they can think.

Campus Copilot exists to:

- normalize site facts into one shared schema
- keep the workspace local-first and read-only by default
- let export and cited AI follow the same structured evidence
- keep academic safety explicit instead of hand-wavy

The product stays intentionally narrow:

- **Structured data first**
- **User-controlled workspace by default**
- **AI after structure**
- **Academic safety contract**
- **Export as a first-class path**

See:

- [`docs/01-product-prd.md`](docs/01-product-prd.md)
- [`docs/06-export-and-user-surfaces.md`](docs/06-export-and-user-surfaces.md)
- [`docs/17-academic-expansion-and-safety-contract.md`](docs/17-academic-expansion-and-safety-contract.md)

## What Changes After The First Sync

After a real sync, the product should feel simpler, not busier:

- `Focus Queue`, `Weekly Load`, and `Change Journal` tell you what changed and what should come first
- export presets carry the same structured evidence into Markdown, CSV, JSON, or ICS
- cited AI explains the workspace instead of inventing a second source of truth

## What To Do First

If you are new, follow this order:

1. Read this README as the student-facing front door.
2. Run the local workbench through [Quickstart](#quickstart).
3. Open the short docs router at [`docs/README.md`](docs/README.md).
4. Only then choose a second-layer route: proof if you want receipts, builder docs if you need integration seams.

## Current Product Shape

Today the repo already includes:

- a multi-site extension runtime for `Canvas`, `Gradescope`, `EdStem`, and `MyUW`
- a shared schema + Dexie-backed local read-model layer
- assistant-first extension surfaces for `sidepanel`, `popup`, and `options`
- a read-only web workbench over the same workspace contract
- export presets for current view, weekly assignments, recent updates, deadlines, focus queue, weekly load, and change journal
- cited AI over structured workbench outputs
- a thin local BFF for `OpenAI` and `Gemini` API-key flows
- optional builder-facing read-only surfaces through SDK / CLI / MCP packages

The honest split is:

- **student-facing workspace first**
- **repo-local proof second**
- **builder/public tooling third**
- **owner-side listing and launch later**

## Repo-Local Proof Path

Use this route when you want receipts after the product story is clear.

1. Start with [`docs/storefront-assets.md`](docs/storefront-assets.md).
2. Continue with [`docs/verification-matrix.md`](docs/verification-matrix.md).
3. Use [`DISTRIBUTION.md`](DISTRIBUTION.md) only for owner-side launch or listing truth, not as the main product explanation.

If you need the deeper appendix afterward, these receipts still exist without taking over the front door:

- [`docs/assets/weekly-assignments-example.md`](docs/assets/weekly-assignments-example.md)
- [`examples/current-view-triage-example.md`](examples/current-view-triage-example.md)
- [`examples/site-overview-audit-example.md`](examples/site-overview-audit-example.md)
- `pnpm proof:public`
- [`INTEGRATIONS.md`](INTEGRATIONS.md)
- [`examples/README.md`](examples/README.md)
- [`examples/toolbox-chooser.md`](examples/toolbox-chooser.md)
- [`examples/integrations/plugin-bundles.md`](examples/integrations/plugin-bundles.md)
- run a local Docker path with health checks through [`DISTRIBUTION.md`](DISTRIBUTION.md)

## Student Questions This Repo Tries To Answer

The product is designed around three recurring student questions:

- what is still open?
- what changed recently?
- what should I do first, and why?

Everything else on the public front door should support those questions instead of overshadowing them.

## Quickstart

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the local API and build the extension

```bash
pnpm start:api
pnpm build:extension
```

### 2b. Build the standalone web workbench

```bash
pnpm --filter @campus-copilot/web build
```

### 3. Load the unpacked extension

Load this directory in Chrome:

```text
apps/extension/dist/chrome-mv3
```

If you want AI responses from the sidepanel, Campus Copilot now first checks the usual local loopback addresses automatically:

```text
http://127.0.0.1:8787
http://localhost:8787
```

Only if autodiscovery fails do you need to open Settings and enter a manual `BFF base URL`.

## Builder Quick Paths

Use this section only after the student-facing workspace story already makes sense.

- Start with [`docs/10-builder-api-and-ecosystem-fit.md`](docs/10-builder-api-and-ecosystem-fit.md). That file is the builder appendix, not the product pitch.
- For routing, use [`docs/api/openapi.yaml`](docs/api/openapi.yaml), [`examples/README.md`](examples/README.md), [`examples/toolbox-chooser.md`](examples/toolbox-chooser.md), and [`examples/integrations/README.md`](examples/integrations/README.md) before opening package-level detail.
- For deeper local-consumer examples only, continue to [`examples/mcp/README.md`](examples/mcp/README.md), [`examples/integrations/codex-mcp-shell.example.json`](examples/integrations/codex-mcp-shell.example.json), [`examples/integrations/claude-code-mcp-shell.example.json`](examples/integrations/claude-code-mcp-shell.example.json), [`examples/integrations/plugin-bundles.md`](examples/integrations/plugin-bundles.md), [`examples/openclaw-readonly.md`](examples/openclaw-readonly.md), [`skills/openclaw-readonly-consumer/SKILL.md`](skills/openclaw-readonly-consumer/SKILL.md), [`packages/mcp-server/README.md`](packages/mcp-server/README.md), and [`skills/README.md`](skills/README.md).

## Boundaries

Formal product paths:

- read-only academic workflow
- shared schema + local read models
- local user-state overlay and derived decision views
- manual sync from supported sites
- export from normalized data
- cited AI over structured results
- thin BFF for `OpenAI` and `Gemini` API-key flows

Not formal product paths:

- `web_session`
- automatic multi-provider routing
- write-capable campus automation
- `Register.UW` / `Notify.UW` automation, seat watching, or registration-related polling
- default AI ingestion of raw course files, instructor-authored materials, exams, or other copyright-sensitive course content

For the detailed public-safe wording and current boundary split, continue with:

- [`PRIVACY.md`](PRIVACY.md)
- [`INTEGRATIONS.md`](INTEGRATIONS.md)
- [`DISTRIBUTION.md`](DISTRIBUTION.md)
- [`docs/17-academic-expansion-and-safety-contract.md`](docs/17-academic-expansion-and-safety-contract.md)
