FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/ai/package.json packages/ai/package.json

RUN pnpm install --frozen-lockfile --filter @campus-copilot/api...

FROM base AS runtime

ARG CAMPUS_COPILOT_VERSION=0.1.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0

LABEL org.opencontainers.image.title="Campus Copilot API" \
      org.opencontainers.image.description="Thin local HTTP BFF for Campus Copilot provider status, ask flows, and health checks." \
      org.opencontainers.image.url="https://xiaojiou176-open.github.io/OpenCampus/" \
      org.opencontainers.image.documentation="https://github.com/xiaojiou176-open/OpenCampus/blob/main/DISTRIBUTION.md" \
      org.opencontainers.image.source="https://github.com/xiaojiou176-open/OpenCampus" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="Yifeng (Terry) Yu" \
      org.opencontainers.image.version="${CAMPUS_COPILOT_VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

COPY --from=deps /app /app
COPY . .

EXPOSE 8787

USER node

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=5 CMD node -e "fetch('http://127.0.0.1:8787/health').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"

# Runtime entry: pnpm --filter @campus-copilot/api start
CMD ["pnpm", "--filter", "@campus-copilot/api", "start"]
