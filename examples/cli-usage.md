# CLI Usage

```bash
node packages/cli/bin/opencampus.mjs --help
node packages/cli/bin/opencampus.mjs status
node packages/cli/bin/opencampus.mjs provider-status
node packages/cli/bin/opencampus.mjs site --snapshot examples/workspace-snapshot.sample.json --site canvas
node packages/cli/bin/opencampus.mjs snapshot export --snapshot examples/workspace-snapshot.sample.json --preset current_view --format markdown
node packages/cli/bin/opencampus.mjs ask --provider auto --question "What should I do first?"
```
