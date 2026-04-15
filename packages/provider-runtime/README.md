# @campus-copilot/provider-runtime

Read-only seam helpers for the Campus Copilot provider/runtime contract.

This package exists to keep Campus-owned semantics stable while the runtime path moves toward `Switchyard-first`.

If you are still choosing between the runtime seam package, CLI, MCP, or SDK surfaces, start with [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md) first.

This README treats the package as the plain-language `Switchyard-first seam` entry, not as a consumer-facing plugin.

## Install

Current install status: `public-ready (repo-local)` from this monorepo. Do not assume hosted runtime infrastructure, official listing, or completed registry publication from this README alone.

From the repo root:

```bash
pnpm install
pnpm --filter @campus-copilot/provider-runtime build
pnpm --filter @campus-copilot/provider-runtime test
```

First file to try:

- [`../../examples/integrations/plugin-bundles.md`](../../examples/integrations/plugin-bundles.md)
- [`../../examples/provider-runtime-switchyard.ts`](../../examples/provider-runtime-switchyard.ts)

## Current surface

- direct provider payload schemas for `openai` and `gemini`
- `switchyard` proxy payload schemas
- provider status/readiness schemas
- shared response envelope schemas
- `buildSwitchyardInput(messages)`

## Boundary

- transport/runtime compat only
- public-ready repo-local package, not hosted infrastructure
- `Switchyard-first` seam, not a standalone consumer toolbox
- Campus still owns `messages[]`, `answerText`, `structuredAnswer`, citations, trust gaps, and next actions
- not a generic hosted runtime platform
- not a write-capable provider agent loop

## Minimal proof loop

1. Verify the package contract:

```bash
pnpm --filter @campus-copilot/provider-runtime build
pnpm --filter @campus-copilot/provider-runtime test
```

2. Verify the repo-owned thin-BFF seam still exposes the same runtime-facing routes:

```bash
pnpm proof:public
pnpm smoke:api
curl http://127.0.0.1:8787/api/providers/status
```

3. If you are explicitly validating the optional Switchyard lane, pair this package with:

- [`../../skills/switchyard-runtime-check/SKILL.md`](../../skills/switchyard-runtime-check/SKILL.md)
- [`../../examples/integrations/plugin-bundles.md`](../../examples/integrations/plugin-bundles.md)

## See also

- [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md)
- [`../../examples/integrations/plugin-bundles.md`](../../examples/integrations/plugin-bundles.md)
- [`../../examples/provider-runtime-switchyard.ts`](../../examples/provider-runtime-switchyard.ts)
- [`../../skills/switchyard-runtime-check/SKILL.md`](../../skills/switchyard-runtime-check/SKILL.md)
- [`../../docs/05-ai-provider-and-runtime.md`](../../docs/05-ai-provider-and-runtime.md)
- [`../../docs/10-builder-api-and-ecosystem-fit.md`](../../docs/10-builder-api-and-ecosystem-fit.md)
- [`../../DISTRIBUTION.md`](../../DISTRIBUTION.md)
