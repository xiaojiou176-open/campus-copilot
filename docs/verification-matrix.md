# Verification Matrix

This file is the canonical registry for repository-facing verification.

Think of it like a building inspection board:

- some checks are required before the building opens
- some checks are manual specialist inspections
- some checks are useful local probes, but not merge blockers

## Five-Layer Contract

Use this split before you decide where a new check belongs:

| Layer | Default entry | Purpose |
| :-- | :-- | :-- |
| `pre-commit` | `pnpm verify:governance` + `actionlint` | keep docs/governance/workflow drift out of local commits |
| `pre-push` | `pnpm verify` + `pnpm scan:git-history:secrets` | keep the default local path deterministic and lighter than hosted CI |
| `hosted` | GitHub `Verify`, `Security Hygiene`, `Dependency Review`, and PR `CodeQL` | required GitHub-hosted re-checks for pull requests |
| `nightly` | `pnpm verify:nightly` plus scheduled `CodeQL` | recurring deep analysis without bloating every PR lane |
| `manual` | `pnpm smoke:*`, live/browser lanes, storefront audit | environment-dependent, operator-dependent, or owner-side proof |

## Verification Lanes

| Command / Lane | Type | Default owner | Required for PR gate | What it proves | What it does not prove |
| :-- | :-- | :-- | :--: | :-- | :-- |
| `pnpm typecheck` | deterministic repo gate | contributor / CI | Yes | workspace type validity | live site behavior |
| `pnpm test` | deterministic repo gate | contributor / CI | Yes | repository tests across packages, including local overlay, decision read models, citation-aware AI contract, structured export behavior, repo-public package pack-readiness smoke, lockfile-level dependency security guards such as patched `defu` resolution, and runtime-cleanup race guards around repo-owned support-bundle artifacts | real authenticated browser sessions |
| `pnpm test:coverage` | optional local coverage audit | local developer | No | aggregated workspace Vitest coverage summary for repo-local code paths, plus automated test-pyramid context counts for workspace Vitest, repo `node:test`, and extension Playwright smoke | live site behavior or a guaranteed full-system coverage percentage |
| `pnpm smoke:api` | deterministic local smoke | contributor / CI | Yes | local BFF health and provider status endpoint wiring | real provider round-trip |
| `pnpm --filter @campus-copilot/extension build` | deterministic repo gate | contributor / CI | Yes | extension can build | real extension install/use |
| `pnpm --filter @campus-copilot/extension exec playwright test` | deterministic hosted browser smoke | contributor / CI | Yes | built extension UI contract under controlled mocks, including decision surfaces and citation-aware answer rendering on the repo-owned headless Chromium lane | real site sync, the maintainer's real Chrome profile, or full extension E2E |
| `pnpm verify` | deterministic local default gate | contributor | No | governance, typecheck, repository tests, local BFF health smoke, web build, and extension build on the current machine | hosted-only browser smoke, manual live proofs, or provider-dependent smoke |
| `pnpm verify:hosted` | deterministic hosted gate | CI | Yes | the full required PR gate on GitHub-hosted runners, including the default local gate plus extension Playwright smoke after managed browser install | manual live or provider proofs not explicitly promoted into hosted CI |
| `pnpm verify:nightly` | deterministic scheduled gate | CI | No | hosted verify plus coverage audit, repo-public proof, and standalone web interaction smoke on managed Chromium | live/browser/provider/manual evidence or owner-only publication steps |
| `pnpm smoke:provider` | environment-dependent smoke | local developer | No | current environment can complete a provider round-trip | stable provider coverage or required CI proof |
| `pnpm smoke:sidepanel` | environment-dependent smoke | local developer | No | built sidepanel page can talk to current BFF/provider path | full extension E2E |
| `pnpm --filter @campus-copilot/web build` | deterministic repo gate | contributor / CI | Yes | standalone web surface bundles on the same workspace contract | real user interaction or live browser/session behavior |
| `pnpm --filter @campus-copilot/web test` | deterministic local test | local developer | No | standalone web helper and import logic stay parseable | full browser interaction |
| `pnpm --filter @campus-copilot/web test:interaction` | deterministic local interaction smoke | local developer | No | standalone web surface can render the read-only workbench and perform a basic interaction on local demo/imported data | live campus-site sync or required CI proof |
| `pnpm --filter @campus-copilot/sdk test` | deterministic local test | contributor / CI | No | repo-public SDK helpers stay parseable | live BFF or published package behavior |
| `pnpm --filter @campus-copilot/cli test` | deterministic local test | contributor / CI | No | repo-public CLI snapshot tooling stays working | release-channel packaging |
| `pnpm --filter @campus-copilot/mcp test` | deterministic local test | contributor / CI | No | repo-public MCP preview keeps its tool contract | hosted/public MCP service behavior |
| `pnpm proof:public` | optional local distribution proof | local developer | No | repo-public builder/package surfaces still line up, public entrypoints still expose help, and each public package can complete a dry-run pack step | registry publication, official listing, marketplace listing, or hosted distribution |
| `pnpm smoke:support` | local diagnostics smoke | local developer | No | support bundle generation still works on the repo-owned browser-root contract | product-path correctness |
| `pnpm preflight:live` | manual environment probe | local developer | No | current machine/session readiness for live validation, including repo-owned browser root bootstrap, single-instance attach requirements, and deterministic auth-boundary blockers | site adapter correctness |
| `pnpm diagnose:live` | manual environment probe | local developer | No | current environment blockers summary for the repo-owned single-instance browser lane, including deterministic `authenticated` plus `authBoundary` site state | stable product behavior |
| `pnpm probe:live` | manual live probe | local developer | No | current browser session can be inspected through the repo-owned single-instance browser contract with deterministic `authenticated` plus `authBoundary` outputs, using repo-owned CDP / DevTools target surfaces only | stable live sync support, arbitrary desktop Chrome windows, or GUI automation fallback |
| `pnpm capture:browser-evidence` | manual browser evidence lane | local developer | No | current console/network/HAR-like/trace artifacts can be captured for the current session | deterministic CI proof or stable live support by itself |
| `pnpm redact:live-fixture -- --kind <json\|html> --input <raw-path> --output <redacted-path>` | manual fixture-prep lane | local developer | No | converts a raw manually captured site sample into a redacted candidate fixture for adapter regression work | prove a stable authenticated session by itself or bypass maintainer review before commit |
| `pnpm check:docs:ssot` | deterministic governance check | contributor / CI | Yes | README/docs roles and forbidden live/platform drift are guarded | product runtime correctness |
| `pnpm check:consumer-surfaces` | deterministic governance check | contributor / CI | Yes | public examples, public skills, and read-only consumer routing for Codex / Claude Code / OpenClaw-style local runtimes stay internally consistent | live site correctness or hosted plugin distribution |
| `pnpm check:verification-claims` | deterministic governance check | contributor / CI | Yes | docs do not overclaim what `verify` covers | live site correctness |
| `pnpm check:public-surface` | deterministic governance check | contributor / CI | Yes | public collaboration shell files exist and README avoids repo-external hard assertions | GitHub settings state |
| `pnpm check:actions-pinning` | deterministic governance check | contributor / CI | Yes | workflow actions are pinned by commit SHA | runtime code quality |
| `pnpm check:english-canonical` | deterministic governance check | contributor / CI | Yes | canonical collaboration docs stay in English | UI localization strategy |
| `pnpm check:logging-schema` | deterministic governance check | contributor / CI | Yes | support/live scripts keep `runId` and avoid absolute-path style exposure | full runtime observability maturity |
| `pnpm check:host-safety` | deterministic governance check | contributor / CI | Yes | host-facing code does not reintroduce AppleScript, System Events, loginwindow/Force Quit paths, broad process-kill helpers, or arbitrary desktop Chrome fallback in the live probe lane | prove that the current repo-owned browser lane is attachable or that manual live validation will succeed |
| `pnpm check:sensitive-surface` | deterministic governance check | contributor / CI | Yes | tracked files do not reintroduce absolute local user-home paths, common live token/key patterns, private key markers, tracked `.env` / `.runtime-cache` style artifacts, or local-only `.agents` archives outside the committed skill lane | secrets hidden only in ignored local files or current GitHub settings state |
| `pnpm check:sensitive-history` | deterministic governance check | contributor / CI | Yes | the reachable Git history in the CI clone does not retain forbidden tracked paths, absolute local user-home paths, common live token/key patterns, or private key markers | unreachable objects retained by GitHub after a prior history rewrite, external caches, or ignored local files |
| `pnpm check:runtime-artifacts` | deterministic hygiene check | contributor / CI | Yes | top-level runtime artifact paths stay controlled | nested runtime output drift |
| `pnpm check:root-hygiene` | deterministic hygiene check | contributor / CI | Yes | repo-root entries stay inside the declared allowlist and obvious root noise stays out of the worktree | deep nested output-path governance |

## Local Maintenance Commands

These commands are part of the repository's local disk-governance surface.
They are **not** verification lanes and they do **not** belong in the default PR gate.

| Command | Type | Default owner | Required for PR gate | What it does | What it intentionally does not do |
| :-- | :-- | :-- | :--: | :-- | :-- |
| `pnpm audit:disk` | local audit | local developer | No | reports repo-internal, repo-exclusive external cache policy, repo-owned browser-root state, legacy browser-state candidates, shared-layer footprint categories, current `pnpm` store truth, and repo-named temp residues across active temp roots | delete anything |
| `pnpm browser:launch` | local browser helper | local developer | No | launches or reuses the canonical repo-owned Chrome lane, keeps the browser identity anchor alive, and warm-starts the canonical campus tabs | prove current site authentication by itself |
| `pnpm cleanup:repo:safe` | local cleanup | local developer | No | removes explicit low-risk repo-local intermediates | touch formal outputs, evidence/state directories, or external paths |
| `pnpm cleanup:runtime` | local cleanup | local developer | No | removes repo-named temp residues, selected `.runtime-cache/` artifacts, and TTL/cap-managed repo-exclusive generic external cache while preserving the latest support bundle snapshots | touch repo build intermediates, repo-owned browser roots, legacy browser-state roots, shared caches, or generic temp directories |
| `pnpm check:pnpm-store-health` | local preflight | local developer | No | validates configured, effective, and recorded `pnpm` store references before deep dependency cleanup | repair drift automatically or imply `node_modules` cleanup is safe |

## Command Classification Rules

### Required

Required means:

- deterministic
- repeatable on repository inputs
- GitHub-hosted by default for public `pull_request` lanes and repo-owned `push` lanes such as `main` or `codex/*`
- safe for default `pull_request` / `push` CI

### Optional

Optional means:

- useful local smoke
- still deterministic enough to run manually
- not a merge blocker by default

### Manual

Manual means:

- depends on a real browser session, local credentials, or current environment state
- must never be confused with a default required CI lane
- may produce a redacted candidate fixture or manual evidence artifact that still needs review before it becomes repo truth

## Claims Policy

The repository must not claim that `pnpm verify` covers:

- `pnpm --filter @campus-copilot/extension exec playwright test`
- `pnpm smoke:provider`
- `pnpm smoke:sidepanel`
- `pnpm smoke:support`
- `pnpm check:consumer-surfaces`
- `pnpm --filter @campus-copilot/sdk test`
- `pnpm --filter @campus-copilot/cli test`
- `pnpm --filter @campus-copilot/mcp test`
- `pnpm test:coverage`
- `pnpm preflight:live`
- `pnpm diagnose:live`
- `pnpm probe:live`
- `pnpm capture:browser-evidence`
- `pnpm redact:live-fixture`
- manual live site counts

Those belong to optional/manual lanes unless they are explicitly promoted and wired into the required gate.

## Required CI Topology

Default repository CI should prioritize:

- deterministic
- reproducible
- low-cost
- low-drift

That means:

- do keep a lighter local `pnpm verify` as the default pre-push gate
- do keep `pnpm verify:hosted` as the GitHub-hosted required lane
- do keep `pnpm verify:nightly` for scheduled deterministic drift checks that are worth running, but not worth blocking every PR
- do keep default required lanes on GitHub-hosted infrastructure
- do keep deterministic docs/governance checks
- do keep deterministic hygiene checks that protect repo-root and runtime artifact boundaries
- do keep security scans that do not depend on local secrets or manual browser sessions
- do keep deterministic Playwright smoke on the repo-owned headless Chromium lane instead of a maintainer-only real Chrome profile
- do **not** add `self-hosted`, `shared-pool`, or equivalent private-runner lanes to default public CI
- do **not** add provider-key-dependent or Gemini/multimodal/manual live checks to required CI

## Evidence Language

Use these phrases consistently:

- “required repository gate”
- “optional local smoke”
- “manual live validation”
- “not part of `pnpm verify`”

Avoid these phrases unless you can prove them from the gate itself:

- “fully covered by CI”
- “repository-proven live success”
- “merge is blocked on live provider availability”
