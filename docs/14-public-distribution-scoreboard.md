# Public Distribution Scoreboard

This file is the canonical public-distribution truth board for Campus Copilot's
supporting publication layer.

It is not a front-door overview of the product.

Read it after the product identity, workbench proof, or builder surface is
already understood.

Think of it like the label on a shipping dock:

- it tells you which surfaces are already packed with a real repo-local install path
- which ones are still only preview-grade inside this repository
- and which claims would require an external carrier before anyone can say they are delivered

In other words:

- repo-local proof lives here
- owner-only publication and official-listing boundaries live here
- this file should reduce overclaiming, not become the main story visitors see first

## Threshold Rules

Use these rules before any outward-facing wording:

| Term | Required threshold |
| :-- | :-- |
| `public-ready` | all four pieces exist: public install path, fresh proof loop, public doc/router, and one reproducible sample |
| `officially listed` | the surface is actually present in an upstream official public listing |
| `marketplace listed` | the surface is actually present in an upstream marketplace or plugin directory |

Current rules:

- repo-local `public-ready` is allowed when the four-piece threshold is satisfied
- `officially listed` and `marketplace listed` are never implied by repo docs alone
- until external publication happens, the truthful state is either `repo-public preview` or `public-ready (repo-local)`

## Package Surfaces

| Surface | Package registry readiness | Public install path | Fresh proof loop | Public doc/router | Repro sample | Current state | What blocks official listing |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `@campus-copilot/cli` | `registry candidate` | `pnpm install` then `pnpm --filter @campus-copilot/cli build && pnpm --filter @campus-copilot/cli start help` | `pnpm --filter @campus-copilot/cli test` | [`../packages/cli/README.md`](../packages/cli/README.md), [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md) | [`../examples/cli-usage.md`](../examples/cli-usage.md) | `public-ready (repo-local)` | no repo-local packaging blocker remains for package publication, but no upstream official listing has been completed from this repo |
| `@campus-copilot/mcp-server` | `registry candidate` | `pnpm install` then `pnpm start:mcp` | `pnpm --filter @campus-copilot/mcp-server build && pnpm --filter @campus-copilot/mcp-server test` | [`../packages/mcp-server/README.md`](../packages/mcp-server/README.md), [`../examples/integrations/README.md`](../examples/integrations/README.md) | [`../examples/integrations/codex-mcp.example.json`](../examples/integrations/codex-mcp.example.json) | `public-ready (repo-local)` | no repo-local packaging blocker remains, but this bundled server is still not the same thing as an official MCP Registry listing |
| `@campus-copilot/mcp` | `published (npm)` | `npm install @campus-copilot/mcp` then `node -e "import('@campus-copilot/mcp').then(console.log)"` | `pnpm --filter @campus-copilot/mcp test` plus fresh npm install/import smoke | [`../packages/mcp/README.md`](../packages/mcp/README.md), [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md) | [`../examples/integrations/claude-code-mcp.example.json`](../examples/integrations/claude-code-mcp.example.json) | `published (npm)` | npm publication is now real, but this config-helper package is still not itself an official MCP Registry server artifact or an official listing |
| `@campus-copilot/mcp-readonly` | `registry candidate` | `pnpm install` then `pnpm --filter @campus-copilot/mcp-readonly start:canvas -- --help` | `pnpm --filter @campus-copilot/mcp-readonly build && pnpm --filter @campus-copilot/mcp-readonly test` | [`../packages/mcp-readonly/README.md`](../packages/mcp-readonly/README.md), [`../examples/mcp/README.md`](../examples/mcp/README.md) | [`../examples/mcp/codex-repo-root.example.json`](../examples/mcp/codex-repo-root.example.json) | `public-ready (repo-local)` | no repo-local packaging blocker remains, but the sidecar package is still not the same thing as an official MCP Registry listing |
| `@campus-copilot/sdk` | `registry blocked` | `pnpm install` then `pnpm --filter @campus-copilot/sdk test` | `pnpm --filter @campus-copilot/sdk test` | [`../packages/sdk/README.md`](../packages/sdk/README.md), [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md) | [`../examples/sdk-usage.ts`](../examples/sdk-usage.ts) | `public-ready (repo-local)` | private workspace package dependencies plus raw TypeScript export surface still block standalone registry publication |
| `@campus-copilot/workspace-sdk` | `registry blocked` | `pnpm install` then `pnpm --filter @campus-copilot/workspace-sdk test` | `pnpm --filter @campus-copilot/workspace-sdk test` | [`../packages/workspace-sdk/README.md`](../packages/workspace-sdk/README.md), [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md) | [`../examples/sdk-usage.ts`](../examples/sdk-usage.ts) | `public-ready (repo-local)` | private workspace package dependencies plus raw TypeScript export surface still block standalone registry publication |
| `@campus-copilot/site-sdk` | `registry blocked` | `pnpm install` then `pnpm --filter @campus-copilot/site-sdk test` | `pnpm --filter @campus-copilot/site-sdk test` | [`../packages/site-sdk/README.md`](../packages/site-sdk/README.md), [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md) | [`../examples/sdk-usage.ts`](../examples/sdk-usage.ts) | `public-ready (repo-local)` | private workspace package dependencies plus raw TypeScript export surface still block standalone registry publication |
| `@campus-copilot/provider-runtime` | `registry candidate` | `pnpm install` then `pnpm --filter @campus-copilot/provider-runtime build && pnpm --filter @campus-copilot/provider-runtime test` | `pnpm --filter @campus-copilot/provider-runtime test` | [`../packages/provider-runtime/README.md`](../packages/provider-runtime/README.md), [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md) | [`../examples/provider-runtime-switchyard.ts`](../examples/provider-runtime-switchyard.ts) | `public-ready (repo-local)` | no repo-local packaging blocker remains for package publication, but no upstream official listing has been completed from this repo |
| `@campus-copilot/gradescope-api` | `registry candidate` | `pnpm install` then `pnpm --filter @campus-copilot/gradescope-api build && pnpm --filter @campus-copilot/gradescope-api test` | `pnpm --filter @campus-copilot/gradescope-api build && pnpm --filter @campus-copilot/gradescope-api test` | [`../packages/gradescope-api/README.md`](../packages/gradescope-api/README.md), [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md) | [`../examples/gradescope-api-usage.ts`](../examples/gradescope-api-usage.ts) | `public-ready (repo-local)` | no repo-local packaging blocker remains for package publication, but no upstream official listing has been completed from this repo |
| `@campus-copilot/edstem-api` | `registry candidate` | `pnpm install` then `pnpm --filter @campus-copilot/edstem-api build && pnpm --filter @campus-copilot/edstem-api test` | `pnpm --filter @campus-copilot/edstem-api build && pnpm --filter @campus-copilot/edstem-api test` | [`../packages/edstem-api/README.md`](../packages/edstem-api/README.md), [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md) | [`../examples/edstem-api-usage.ts`](../examples/edstem-api-usage.ts) | `public-ready (repo-local)` | no repo-local packaging blocker remains for package publication, but no upstream official listing has been completed from this repo |
| `@campus-copilot/myuw-api` | `registry candidate` | `pnpm install` then `pnpm --filter @campus-copilot/myuw-api build && pnpm --filter @campus-copilot/myuw-api test` | `pnpm --filter @campus-copilot/myuw-api build && pnpm --filter @campus-copilot/myuw-api test` | [`../packages/myuw-api/README.md`](../packages/myuw-api/README.md), [`../examples/toolbox-chooser.md`](../examples/toolbox-chooser.md) | [`../examples/myuw-api-usage.ts`](../examples/myuw-api-usage.ts) | `public-ready (repo-local)` | no repo-local packaging blocker remains for package publication, but no upstream official listing has been completed from this repo |

## Consumer Bundles

| Surface | Official-listing readiness | Public install path | Fresh proof loop | Public doc/router | Repro sample | Current state | What blocks official listing |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| Codex generic MCP bundle | `official listing not completed` | `pnpm install` then launch from the repo root or use the shell-wrapped config | `pnpm proof:public` | [`../examples/integrations/README.md`](../examples/integrations/README.md), [`../examples/README.md`](../examples/README.md) | [`../examples/integrations/codex-mcp.example.json`](../examples/integrations/codex-mcp.example.json) | `plugin-grade repo bundle` | no official Codex plugin directory claim is made from this repo |
| Claude Code generic MCP bundle | `official listing not completed` | `pnpm install` then launch from the repo root or use the shell-wrapped config | `pnpm proof:public` | [`../examples/integrations/README.md`](../examples/integrations/README.md), [`../examples/README.md`](../examples/README.md) | [`../examples/integrations/claude-code-mcp.example.json`](../examples/integrations/claude-code-mcp.example.json) | `plugin-grade repo bundle` | no official Claude Code marketplace listing is claimed from this repo |
| Claude Desktop sidecar bundle | `official listing not completed` | `pnpm install` then use the repo-root sidecar configs or installed sidecar binaries | `pnpm proof:public` | [`../examples/mcp/README.md`](../examples/mcp/README.md), [`../examples/README.md`](../examples/README.md) | [`../examples/mcp/claude-desktop-repo-root.example.json`](../examples/mcp/claude-desktop-repo-root.example.json) | `plugin-grade repo bundle` | no upstream marketplace listing has been completed from this repo |
| OpenClaw local runtime bundle | `official listing not completed` | `pnpm install` then follow the local runtime guide or reuse the compatible Claude-style repo layout | `pnpm proof:public` plus one local MCP or CLI proof loop | [`../examples/openclaw-readonly.md`](../examples/openclaw-readonly.md), [`../skills/openclaw-readonly-consumer/SKILL.md`](../skills/openclaw-readonly-consumer/SKILL.md) | [`../examples/openclaw-readonly.md`](../examples/openclaw-readonly.md) | `plugin-grade repo bundle` | the repo now qualifies as a compatible bundle through its existing Claude-style layout, but no official OpenClaw / ClawHub publication has been completed |

## Current Truth Summary

- most package surfaces are already `public-ready (repo-local)` under the four-piece threshold, while only a smaller set has advanced to package-level registry readiness
- `@campus-copilot/mcp` is now published to the public npm registry, while `@campus-copilot/cli`, `@campus-copilot/mcp-server`, `@campus-copilot/mcp-readonly`, `@campus-copilot/provider-runtime`, `@campus-copilot/gradescope-api`, `@campus-copilot/edstem-api`, and `@campus-copilot/myuw-api` remain `registry candidate`
- Codex / Claude Code / Claude Desktop routes are currently best described as `plugin-grade repo bundles`
- the OpenClaw route is now best described as a `plugin-grade repo bundle` through the existing compatible Claude-style layout, while still not being officially listed
- the repo still does **not** have evidence for `officially listed` or `marketplace listed`
- one package-level external publication has now been executed (`@campus-copilot/mcp` on npm), but registry release, marketplace/discovery work, and the remaining package publishes still remain owner-controlled until they are actually executed

## Official Listing / Registry Ledger

Latest checked against official sources on `2026-04-05 PDT`.

| Surface | Official public face exists? | Exact official URL | Current repo-local status | What still blocks the official path |
| :-- | :-- | :-- | :-- | :-- |
| MCP Registry | Yes | [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/) and [registry quickstart](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx) | `@campus-copilot/mcp` is now a real public npm package for the config-helper route, while `@campus-copilot/mcp-server` remains the strongest bundled server artifact candidate for an official registry submission. | An official MCP Registry submission still has to be executed; npm publication of the config-helper package does not equal official listing. |
| Codex official IDE/public face | Yes | [developers.openai.com/codex/ide](https://developers.openai.com/codex/ide) | The repo already ships a strong generic local MCP bundle for Codex-style workflows. | I did not confirm an official third-party Codex listing/submission lane for this repo surface from OpenAI's current official docs. |
| Claude Code official IDE/public face | Yes | [docs.anthropic.com/en/docs/claude-code/ide-integrations](https://docs.anthropic.com/en/docs/claude-code/ide-integrations) | The repo already ships strong generic MCP and sidecar bundles for Claude Code / Claude Desktop style workflows. | I did not confirm an official third-party marketplace/listing lane for this generic repo bundle from Anthropic's current official docs. |
| OpenClaw ClawHub / bundle face | Yes | [docs.openclaw.ai/tools/clawhub](https://docs.openclaw.ai/tools/clawhub) and [Plugin Manifest](https://docs.openclaw.ai/plugins/manifest) | The repo already ships a compatible Claude-style bundle layout via its existing `skills/` root and read-only OpenClaw route. | No official OpenClaw / ClawHub publication has been completed yet, so the truthful state is still repo bundle rather than officially listed. |

If the question is no longer "which surfaces are real?" but "which one should
leave the repository first, and what exact owner step remains?", continue with
[`15-publication-submission-packet.md`](15-publication-submission-packet.md).
