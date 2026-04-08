# Public Distribution Scoreboard

This file is the **status ledger** for repo-side distribution truth.

## State Legend

| State | Meaning |
| :-- | :-- |
| `public-ready (repo-local)` | public install path + fresh proof loop + public doc/router + sample all exist inside the repo |
| `registry candidate` | the package shape is good enough for real publication later |
| `registry submitted` | the upstream registry accepted the submission, but the discovery page has not been freshly re-read yet |
| `registry blocked` | repo-side proof exists, but packaging/export blockers still remain |
| `plugin-grade repo bundle` | the route is real as a repo bundle, but not officially listed |
| `container-ready (repo-local)` | the image path is real locally, but not yet pushed/listed |

## Package Surfaces

| Surface | State | First proof | Main blocker before official listing |
| :-- | :-- | :-- | :-- |
| `@campus-copilot/cli` | `public-ready (repo-local)`, `registry candidate` | `pnpm --filter @campus-copilot/cli test` | no upstream publication page exists yet |
| `@campus-copilot/mcp-server` | `public-ready (repo-local)`, `registry submitted` | `pnpm --filter @campus-copilot/mcp-server build && pnpm --filter @campus-copilot/mcp-server test` | fresh registry discovery-page read-back is still pending; packet lives in `packages/mcp-server/registry-submission.packet.json` |
| `@campus-copilot/mcp` | `public-ready (repo-local)`, `registry candidate` | `pnpm --filter @campus-copilot/mcp test` | helper package is still not an official listing |
| `@campus-copilot/mcp-readonly` | `public-ready (repo-local)`, `registry candidate` | `pnpm --filter @campus-copilot/mcp-readonly build && pnpm --filter @campus-copilot/mcp-readonly test` | sidecar package is still not an official MCP Registry listing |
| `@campus-copilot/provider-runtime` | `public-ready (repo-local)`, `registry candidate` | `pnpm --filter @campus-copilot/provider-runtime test` | no upstream package publication yet |
| `@campus-copilot/gradescope-api` | `public-ready (repo-local)`, `registry candidate` | `pnpm --filter @campus-copilot/gradescope-api build && pnpm --filter @campus-copilot/gradescope-api test` | no upstream package publication yet |
| `@campus-copilot/edstem-api` | `public-ready (repo-local)`, `registry candidate` | `pnpm --filter @campus-copilot/edstem-api build && pnpm --filter @campus-copilot/edstem-api test` | no upstream package publication yet |
| `@campus-copilot/myuw-api` | `public-ready (repo-local)`, `registry candidate` | `pnpm --filter @campus-copilot/myuw-api build && pnpm --filter @campus-copilot/myuw-api test` | no upstream package publication yet |
| `@campus-copilot/sdk` | `public-ready (repo-local)`, `registry blocked` | `pnpm --filter @campus-copilot/sdk test` | private workspace dependencies + raw TS export surface |
| `@campus-copilot/workspace-sdk` | `public-ready (repo-local)`, `registry blocked` | `pnpm --filter @campus-copilot/workspace-sdk test` | private workspace dependencies + raw TS export surface |
| `@campus-copilot/site-sdk` | `public-ready (repo-local)`, `registry blocked` | `pnpm --filter @campus-copilot/site-sdk test` | private workspace dependencies + raw TS export surface |

## Bundle / Surface Lanes

| Surface | State | First proof | Main blocker before official listing |
| :-- | :-- | :-- | :-- |
| Codex generic MCP bundle | `plugin-grade repo bundle` | `pnpm proof:public` | no official Codex listing path has been completed from this repo |
| Claude Code / Desktop bundles | `plugin-grade repo bundle` | `pnpm proof:public` | no official Anthropic listing path has been completed from this repo |
| OpenClaw local runtime bundle | `plugin-grade repo bundle` | `pnpm proof:public` | compatible bundle exists, but no official publication completed |
| Public skill pack catalog | `public-ready (repo-local)` | `pnpm check:skill-catalog` | generic packet is ready, but no upstream publish completed |
| Containerized API sidecar | `container-ready (repo-local)` | `pnpm smoke:docker:api` | no public registry push or directory listing completed; packet lives in `docs/container-publication.packet.json` |
| Browser extension | `build-ready product surface` | `pnpm --filter @campus-copilot/extension build` | Chrome Web Store dashboard submission still owner-only |

## Official Face Ledger

Latest checked against official sources on `2026-04-07 PDT`.

| Surface | Official public face exists? | Exact official URL | Current repo-local status | Remaining blocker |
| :-- | :-- | :-- | :-- | :-- |
| MCP Registry | Yes | [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/) | release-hosted `.mcpb` bundle + accepted submit for `io.github.xiaojiou176-open/campus-copilot-mcp` | fresh discovery-page read-back still pending |
| Codex ecosystem | Yes | [developers.openai.com/codex/ide](https://developers.openai.com/codex/ide) | repo ships a truthful local bundle route | no verified third-party listing lane recorded here |
| Claude Code ecosystem | Yes | [docs.anthropic.com/en/docs/claude-code/ide-integrations](https://docs.anthropic.com/en/docs/claude-code/ide-integrations) | repo ships truthful Claude bundle routes | no verified marketplace/listing lane recorded here |
| OpenClaw / ClawHub | Yes | [docs.openclaw.ai/tools/clawhub](https://docs.openclaw.ai/tools/clawhub) | repo ships a compatible bundle + packet | no official publication completed |
| Glama directory | Yes | [glama.ai/mcp/servers](https://glama.ai/mcp/servers) | generic packet set is ready | no stable vendor manifest/schema recovered in this wave |

## Current Truth

- package surfaces can already be discussed as `public-ready (repo-local)`, `registry candidate`, or `registry submitted`
- bundle surfaces should stay at `plugin-grade repo bundle`
- browser extension should stay at `build-ready product surface`
- only the MCP Registry lane has an accepted submit; none of these routes should be described as `officially listed` until a discovery-page read-back exists

For the skill-facing publish packet and owner-later commands, read
[`skill-publication-prep.md`](skill-publication-prep.md).
