# Wave 4-7 Release Notes Draft

## Title

`Campus Copilot: truthful dual-surface workbench, Switchyard seam, and read-only builder preview`

## One-paragraph summary

Campus Copilot is now a more coherent local-first academic decision workspace across both the extension and the standalone read-only web surface. This release lands a clearer Campus ↔ Switchyard seam, strengthens internal browser evidence tooling, and turns the repo's read-only builder direction into real preview surfaces across SDK, CLI, MCP, and site-level API preview packages.

## Highlights

### Product surface

- unified front door and docs story for extension + standalone web
- clearer Wave 4-7 SSOT in the repository docs
- continued `AI after structure` positioning
- EdStem course resources now land on the canonical `Resource` contract across storage, export, extension, and standalone web

### Runtime and semantics

- stronger Campus-owned answer semantics above the runtime seam
- more explicit `Switchyard-first` transport/runtime direction
- internal browser evidence/control-plane substrate improved without turning it into a student-facing feature
- post-closeout hardening now includes deterministic lockfile-security guards and runtime-cleanup race guards in the repo-owned gate
- remaining deeper `Gradescope` depth, plus any future beyond-current `EdStem` resource work, now has a proof-first capture path instead of guess-first adapter work

### Read-only builder preview

- `@campus-copilot/sdk`
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

The repo-local preview packaging story is also stricter now:

- public package manifests carry explicit package file inventories
- `pnpm proof:public` proves dry-run pack behavior instead of relying on loose preview manifests

### Verification

Fresh repository gates passed:

- `pnpm typecheck`
- `pnpm test`
- `pnpm verify`
- `pnpm verify:hosted`
- `pnpm smoke:provider`
- `pnpm smoke:sidepanel`
- `pnpm test:coverage`
- `bash scripts/support-bundle-smoke.sh`
- `pnpm --filter @campus-copilot/web test:interaction`

Recent deterministic hardening now also covers:

- lockfile-level dependency guards for patched transitive dependencies such as `defu`
- direct runtime-cleanup race regression coverage for repo-owned support-bundle artifacts

## What this release still does not claim

- hosted MCP
- write-capable automation
- live browser/session control as a public product feature
- hosted autonomy or operator-bot behavior

## Remaining honest tail

- live/browser control-plane still depends on real session availability and current Chrome attach conditions
- `Gradescope` graded submission annotation detail now joins the current `Assignment` contract through the state-backed submission viewer carrier, alongside the already-landed question/rubric/evaluation-comment detail; `EdStem reply-body` now lands through direct thread-detail DOM normalization with committed redacted fixtures, and `EdStem` course resources now land through the authenticated course-resources API on the current `Resource` contract
- package publishing is still a release-policy decision, not an implied default
- demo/video publishing still requires owner execution
