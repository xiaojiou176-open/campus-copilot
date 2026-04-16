# Integrations

Use this page when the question is:

> How do I plug Campus Copilot into local builder workflows without overclaiming hosted or marketplace status?

## Start Here

| Need | Best first stop |
| :-- | :-- |
| Codex / Claude / Claude Desktop MCP config | [`examples/integrations/README.md`](examples/integrations/README.md) |
| Plugin-grade bundle overview | [`examples/integrations/plugin-bundles.md`](examples/integrations/plugin-bundles.md) |
| Public skills | [`skills/README.md`](skills/README.md), [`skills/catalog.json`](skills/catalog.json) |
| OpenClaw-style local runtime route | [`examples/openclaw-readonly.md`](examples/openclaw-readonly.md) |
| Local containerized HTTP edge | [`DISTRIBUTION.md`](DISTRIBUTION.md) |
| Browser-extension store last mile | [`DISTRIBUTION.md`](DISTRIBUTION.md) |
| Package/public publication truth | [`DISTRIBUTION.md`](DISTRIBUTION.md) |

## Current Truth

- all current integration surfaces are **local-first**
- all current public builder paths are **read-only**
- current bundle wording is **repo bundle / repo router / repo packet**

They are **not**:

- official marketplace listings
- hosted multi-tenant runtimes
- write-capable browser automation plugins
- permission to automate protected academic workflows

## Short Routing

- **Codex**: [`examples/integrations/codex-mcp.example.json`](examples/integrations/codex-mcp.example.json)
- **Claude Code / Desktop**: [`examples/integrations/claude-code-mcp.example.json`](examples/integrations/claude-code-mcp.example.json)
- **OpenClaw**: [`examples/openclaw-readonly.md`](examples/openclaw-readonly.md)
- **Skills**: [`skills/catalog.json`](skills/catalog.json)
- **Skill publication packet**: [`skills/clawhub-submission.packet.json`](skills/clawhub-submission.packet.json)
- **Container lane**: [`DISTRIBUTION.md`](DISTRIBUTION.md)

## Boundary Reminder

Campus Copilot stays:

- a local-first academic decision workspace
- a read-only context provider
- a repo-public bundle/router for integrations

Every integration surface also inherits the same public safety boundary summarized in [`docs/07-security-privacy-compliance.md`](docs/07-security-privacy-compliance.md):

- no `Register.UW` / `Notify.UW` automation
- no registration-related polling or seat watching
- no use of another person's credentials or records
- no default AI ingestion of raw course files or instructor-authored materials

It does **not** become a hosted plugin platform just because these routes exist.
