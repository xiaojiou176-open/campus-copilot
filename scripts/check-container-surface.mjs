import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fromRepoRoot(relativePath) {
  return path.join(repoRoot, relativePath);
}

export function validateContainerSurface() {
  const failures = [];

  if (!existsSync(fromRepoRoot('Dockerfile'))) {
    failures.push('missing_dockerfile');
  }
  if (!existsSync(fromRepoRoot('.dockerignore'))) {
    failures.push('missing_dockerignore');
  }
  if (!existsSync(fromRepoRoot('compose.yaml'))) {
    failures.push('missing_compose_yaml');
  }
  if (!existsSync(fromRepoRoot('scripts/docker-api-smoke.sh'))) {
    failures.push('missing_docker_api_smoke');
  }

  const dockerfile = existsSync(fromRepoRoot('Dockerfile'))
    ? readFileSync(fromRepoRoot('Dockerfile'), 'utf8')
    : '';
  const compose = existsSync(fromRepoRoot('compose.yaml'))
    ? readFileSync(fromRepoRoot('compose.yaml'), 'utf8')
    : '';
  const mcpReadme = readFileSync(fromRepoRoot('packages/mcp-server/README.md'), 'utf8');
  const distribution = readFileSync(fromRepoRoot('DISTRIBUTION.md'), 'utf8');
  const readme = readFileSync(fromRepoRoot('README.md'), 'utf8');
  const smokeScript = existsSync(fromRepoRoot('scripts/docker-api-smoke.sh'))
    ? readFileSync(fromRepoRoot('scripts/docker-api-smoke.sh'), 'utf8')
    : '';

  const dockerfileSnippets = [
    'pnpm --filter @campus-copilot/api',
    'EXPOSE 8787',
    'HEALTHCHECK',
    'ARG CAMPUS_COPILOT_VERSION=0.1.0',
    'ARG VCS_REF=unknown',
    'ARG BUILD_DATE=unknown',
    'org.opencontainers.image.title=',
    'org.opencontainers.image.description=',
    'org.opencontainers.image.url=',
    'org.opencontainers.image.documentation=',
    'org.opencontainers.image.source=',
    'org.opencontainers.image.licenses=',
    'org.opencontainers.image.vendor=',
    'org.opencontainers.image.version=',
    'org.opencontainers.image.revision=',
    'org.opencontainers.image.created=',
  ];

  for (const snippet of dockerfileSnippets) {
    if (!dockerfile.includes(snippet)) {
      failures.push(`dockerfile_missing_snippet:${snippet}`);
    }
  }

  const readmeSnippets = [
    'docker compose up -d campus-copilot-api',
    'docker build -t campus-copilot-api:local .',
    'docker run --rm -p 8787:8787 campus-copilot-api:local',
    'not a hosted API',
    'pair it with the local stdio MCP server',
  ];

  for (const snippet of readmeSnippets) {
    if (!mcpReadme.includes(snippet)) {
      failures.push(`mcp_server_readme_missing_snippet:${snippet}`);
    }
  }

  if (!compose.includes('campus-copilot-api')) {
    failures.push('compose_missing_api_service');
  }
  if (!compose.includes('healthcheck')) {
    failures.push('compose_missing_healthcheck');
  }
  if (!smokeScript.includes('docker compose -f compose.yaml up -d --build campus-copilot-api')) {
    failures.push('docker_smoke_missing_compose_up');
  }
  if (!smokeScript.includes('/health')) {
    failures.push('docker_smoke_missing_health_probe');
  }

  if (!distribution.includes('Docker / container') && !distribution.includes('Docker / Container Path')) {
    failures.push('distribution_missing_container_matrix_row');
  }
  if (!distribution.includes('compose.yaml') || !distribution.includes('pnpm smoke:docker:api')) {
    failures.push('distribution_missing_compose_reference');
  }
  if (!distribution.includes('ghcr.io/xiaojiou176-open/campus-copilot-api')) {
    failures.push('distribution_missing_canonical_public_image');
  }
  if (!readme.includes('run a local Docker path with health checks')) {
    failures.push('root_readme_missing_container_entry');
  }
  if (!distribution.includes('campus-copilot-api:local')) {
    failures.push('distribution_missing_local_image_tag');
  }

  return failures;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const failures = validateContainerSurface();

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log('container_surface_ok');
}
