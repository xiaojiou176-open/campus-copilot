# OpenCampus Video

This app holds the first-party Remotion walkthrough for the repo's public
surface.

Current goal:

- keep the public narrative aligned with `OpenCampus` first
- show `Campus Copilot` as the first shipped workspace
- use real repo proof assets instead of generic motion filler

## Commands

Install workspace dependencies from the repo root:

```console
pnpm install
```

Start Remotion Studio:

```console
pnpm --filter @campus-copilot/opencampus-video dev
```

Render a still for quick review:

```console
pnpm --filter @campus-copilot/opencampus-video render:still
```

Render the walkthrough video:

```console
pnpm --filter @campus-copilot/opencampus-video render:video
```

Lint and type-check the app:

```console
pnpm --filter @campus-copilot/opencampus-video lint
```

## Current Composition

- `OpenCampusWalkthrough`
- `1280x720`
- `30 fps`
- `24 seconds`

The current cut is a truthful walkthrough shell, not a final cinematic launch
asset. It is designed to stay editable while the repo's public surface keeps
evolving.
