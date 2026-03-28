# Campus Copilot

> A local-first study workspace that consolidates Canvas, Gradescope, EdStem, and MyUW into one structured view, then lets AI explain the results instead of scraping the web directly.

[Docs](docs/README.md) · [Quickstart](#quickstart) · [Verification Matrix](docs/verification-matrix.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [License](LICENSE)

## Why This Exists

Campus Copilot is not a generic sidebar chatbot.

It is a focused browser-extension workflow for students who want one place to answer questions like:

- What assignments are still open?
- What changed recently across my classes?
- What should I pay attention to first?

The product strategy is intentionally narrow:

- **Structured data first**: adapters normalize site-specific data into one shared schema.
- **Local-first by default**: storage, workbench views, filtering, and export live locally.
- **AI after structure**: AI can summarize or explain the workbench result, but it does not read raw DOM, raw HTML, or cookies.
- **Export is a first-class feature**: Markdown, CSV, JSON, and ICS are part of the core product, not an afterthought.

## Current Product Shape

Today the repository already includes:

- A multi-site extension runtime for `Canvas`, `Gradescope`, `EdStem`, and `MyUW`
- A local canonical data layer backed by shared schema + Dexie read models
- A workbench surface for sidepanel / popup / options
- Export presets for current view, weekly assignments, recent updates, and deadlines
- A thin BFF for `OpenAI` and `Gemini` API-key flows
- Deterministic repository verification through `pnpm verify`

![Campus Copilot hero overview](docs/assets/hero-workbench-overview.svg)

Public-facing evidence you can inspect in-repo:

- [Hero/storefront asset inventory](docs/storefront-assets.md)
- [Workbench screenshot inventory](docs/storefront-assets.md)
- [Sample weekly assignments export](docs/assets/weekly-assignments-example.md)

What it does **not** claim:

- It does not claim that every site path is an official public API.
- It does not claim that private/internal paths are stable forever.
- It does not claim that mocked smoke coverage equals full live end-to-end coverage.
- It does not treat OAuth, `web_session`, Anthropic, or automatic multi-provider routing as formal product paths.

## Quickstart

You can think of Quickstart like the “front desk” of a hotel: it should tell you only what you need to enter the building, not every internal operating detail.

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the local API and build the extension

```bash
pnpm start:api
pnpm build:extension
```

### 3. Load the unpacked extension

Load this directory in Chrome:

```text
apps/extension/dist/chrome-mv3
```

If you want AI responses from the sidepanel, set `BFF base URL` in Options to:

```text
http://127.0.0.1:8787
```

## Verification

Not every validation lane means the same thing. Some checks are deterministic repository gates, while others are manual or environment-dependent probes.

Use [docs/verification-matrix.md](docs/verification-matrix.md) as the single source of truth for:

- required repository gates
- optional local smoke checks
- manual live validation
- governance-only deterministic checks
- what each lane can and cannot prove

The deterministic repository gate is:

```bash
pnpm verify
```

## Supported Boundaries

### Formal product paths

- Local-first read-only workflow
- Shared schema + Dexie read models
- Manual sync from supported sites
- Export from normalized data
- Thin BFF for `OpenAI` and `Gemini` API-key flows

### Not formal product paths

- `web_session`
- automatic multi-provider routing
- Anthropic
- uncontrolled raw-page ingestion by AI
- automatic write operations such as posting, submitting, or mutating site state

## Integration Boundaries

Not every integration surface has the same stability or sensitivity level.

See [docs/integration-boundaries.md](docs/integration-boundaries.md) for the canonical registry of:

- official vs internal surfaces
- session-backed and DOM/state fallbacks
- privacy sensitivity
- validation level
- public-safe wording

## Documentation Map

Use [docs/README.md](docs/README.md) as the docs router.

Recommended order:

1. [Product requirements](docs/01-product-prd.md)
2. [System architecture](docs/02-system-architecture.md)
3. [Domain schema](docs/03-domain-schema.md)
4. [Adapter specification](docs/04-adapter-spec.md)
5. [AI provider and runtime](docs/05-ai-provider-and-runtime.md)
6. [Export and user surfaces](docs/06-export-and-user-surfaces.md)
7. [Security / privacy / compliance](docs/07-security-privacy-compliance.md)
8. [Phase plan and repo writing brief](docs/08-phase-plan-and-repo-writing-brief.md)
9. [Implementation decisions](docs/09-implementation-decisions.md)
10. [Live validation runbook](docs/live-validation-runbook.md)

## Trust Signals

This repository already contains some real governance anchors:

- [MIT License](LICENSE)
- [Security policy](SECURITY.md)
- [Contribution guide](CONTRIBUTING.md)
- [Verification workflow](.github/workflows/verify.yml)
- [CodeQL workflow](.github/workflows/codeql.yml)
- [Dependabot configuration](.github/dependabot.yml)

Those files exist in the repository and can be verified directly.

What this README does **not** treat as repository-proven facts:

- GitHub settings that live outside git-tracked files
- live site counts from a specific manual browser session
- platform-side alert visibility

Those belong in manual checklists or runbooks, not in the repository’s primary product landing page.

## Project Status

**Status: Active development**

The strongest parts of the repository today are:

- architecture boundaries
- local-first data flow
- failure modeling
- deterministic repository verification

The weakest parts are:

- fully repeatable non-mock live validation
- public storefront assets
- GitHub settings alignment, which must be checked outside the repository

## Roadmap Focus

The current top priorities are:

1. keep one technical source of truth instead of hand-syncing the same facts across multiple docs
2. separate deterministic gates from manual live evidence
3. harden the public collaboration shell and supply-chain posture

## Security and Collaboration

- Start with [Contributing](CONTRIBUTING.md)
- Report sensitive issues through [Security](SECURITY.md)
- Review the repository surface checklist in [docs/github-surface-checklist.md](docs/github-surface-checklist.md)

## Why Star This Now

If this project is useful to you, the best reason to star it is not “it already does everything.”

The reason to star it now is:

> it already has the hard part — a real local-first data model and multi-site integration skeleton — and the next stage is about turning that strong engineering core into a cleaner public collaboration surface.
