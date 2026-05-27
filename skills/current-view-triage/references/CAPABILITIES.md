# OpenCampus Capability Map

This skill intentionally stays on the read-only OpenCampus surfaces.

## Core MCP tools

- `campus_health`
- `providers_status`
- `ask_opencampus`
- `canvas_snapshot_view`
- `gradescope_snapshot_view`
- `edstem_snapshot_view`
- `myuw_snapshot_view`
- `export_snapshot_artifact`

## Best default order

1. `campus_health`
2. one or more `*_snapshot_view` tools
3. `ask_opencampus` if a question exists
4. `export_snapshot_artifact` only if the operator needs a saved proof artifact
