# Container Publication Prep

This is the repo-side publication packet for the Campus Copilot container path.

Use it when the question becomes:

> If the owner wants to publish a public image later, what exact metadata and tag strategy are already prepared inside the repo today?

## Truth Boundary

- the containerized surface is `apps/api`, the thin local BFF
- it is **not** the stdio MCP transport
- the local proof image tag stays `campus-copilot-api:local`
- the recommended future public image reference is `ghcr.io/xiaojiou176-open/campus-copilot-api`
- that reference started as a repo-side recommendation, but this wave has now pushed the image to GHCR
- the current GHCR package still uses non-public visibility, so external anonymous read-back is not complete yet

## Naming And Tag Strategy

Recommended tags:

- local proof tag: `campus-copilot-api:local`
- recommended public semver tag: `ghcr.io/xiaojiou176-open/campus-copilot-api:0.1.0`
- recommended minor line tag: `ghcr.io/xiaojiou176-open/campus-copilot-api:0.1`
- recommended floating tag: `ghcr.io/xiaojiou176-open/campus-copilot-api:latest`
- optional immutable trace tag: `ghcr.io/xiaojiou176-open/campus-copilot-api:<git-sha>`

If the owner later mirrors the image to Docker Hub, keep the same tag scheme under the owner-controlled namespace instead of inventing a second versioning policy.

## Repo-Side Proof

| Item | Current repo-side truth | Local proof |
| :-- | :-- | :-- |
| Docker build path | Dockerfile builds the thin local BFF image | `pnpm smoke:docker:api` |
| Compose path | `compose.yaml` runs the same API image with health checks | `pnpm smoke:docker:api` |
| publication metadata | OCI labels now describe the image surface and documentation route | `pnpm check:container-publication-surface` |
| boundary docs | container docs explain that this is not the stdio MCP transport | `pnpm check:container-publication-surface` |

## OCI Metadata

The Dockerfile carries the expected OCI label set:

- `org.opencontainers.image.title`
- `org.opencontainers.image.description`
- `org.opencontainers.image.licenses`
- `org.opencontainers.image.url`
- `org.opencontainers.image.source`
- `org.opencontainers.image.documentation`
- `org.opencontainers.image.version`
- `org.opencontainers.image.revision`

## Owner-Only Later Steps

1. keep the current build command and tag set as the canonical publication recipe:

```bash
docker build \
  --build-arg CAMPUS_COPILOT_IMAGE_VERSION=0.1.0 \
  --build-arg CAMPUS_COPILOT_IMAGE_REVISION="$(git rev-parse HEAD)" \
  -t ghcr.io/xiaojiou176-open/campus-copilot-api:0.1.0 .
```

2. ensure the GHCR package visibility becomes public
3. verify the live package page after the visibility change succeeds

## Current Verdict

- **Repo-side state**: `container publication prep ready`
- **Runtime truth**: thin local BFF plus a pushed GHCR image at `ghcr.io/xiaojiou176-open/campus-copilot-api`
- **Owner-only later**: package visibility/public read-back and any further registry-side listing work
