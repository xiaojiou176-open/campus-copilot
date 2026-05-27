# @opencampus/cli

Read-only CLI for Campus Copilot builder workflows.

Use this package when you want one terminal-first entry point for snapshot summaries, provider readiness, export, or cited-AI checks without starting from MCP first.

If you are still choosing between the CLI, MCP, or SDK surfaces, start with [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md) first.

## Install

Current install status: repo-local public-ready CLI candidate with a bundled JS entrypoint. Do not assume npm registry publication or official listing from this README alone.

From the repo root:

```bash
pnpm install
pnpm --filter @opencampus/cli start help
```

First command to try:

```bash
pnpm --filter @opencampus/cli start status
```

Shared public-preview proof loop from the repo root:

```bash
pnpm proof:public
```

## Commands

- `help` / `--help`
- `status [--base-url <url>]`
- `provider-status [--base-url <url>]`
- `ask --provider <auto|openai|gemini|switchyard> [--model <model>] --question <text> [--base-url <url>]`
- `summary --snapshot <path>`
- `site --snapshot <path> --site <site>`
- `snapshot-summary <path> [--site <site>]`
- `site-summary <path> --site <site>`
- `snapshot site --snapshot <path> --site <site>`
- `snapshot export --snapshot <path> [--preset <current_view|focus_queue|weekly_load|change_journal>] [--format <markdown|json|csv|ics>] [--site <all|canvas|gradescope|edstem|myuw>]`

The CLI is local-first and truthful: it works on exported snapshots or the local BFF. It does not perform site writes.

## See also

- [`../../examples/toolbox-chooser.md`](../../examples/toolbox-chooser.md)
- [`../../examples/cli-usage.md`](../../examples/cli-usage.md)
- [`../../examples/workspace-snapshot.sample.json`](../../examples/workspace-snapshot.sample.json)
- [`../../examples/openclaw-readonly.md`](../../examples/openclaw-readonly.md)
- [`../../skills/read-only-workspace-audit/SKILL.md`](../../skills/read-only-workspace-audit/SKILL.md)
