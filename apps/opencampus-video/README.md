# OpenCampus Video

This app holds the first-party Remotion walkthrough for the repo's public
surface.

Current goal:

- keep the public narrative aligned with `OpenCampus` first
- show `OpenCampus` as the first shipped workspace
- use real repo proof assets instead of generic motion filler
- keep the Ask AI lane visibly evidence-first, not chat-shell-first

## Commands

Install workspace dependencies from the repo root:

```console
pnpm install
```

Start Remotion Studio:

```console
pnpm --filter @opencampus/opencampus-video dev
```

Render a still for quick review:

```console
pnpm --filter @opencampus/opencampus-video render:still
```

Render the walkthrough video:

```console
pnpm --filter @opencampus/opencampus-video render:video
```

Lint and type-check the app:

```console
pnpm --filter @opencampus/opencampus-video lint
```

## Current Composition

- `OpenCampusWalkthrough`
- `1280x720`
- `30 fps`
- `29 seconds`

The current cut is a truthful walkthrough shell, not a final cinematic launch
asset. It is designed to stay editable while the repo's public surface keeps
evolving.
