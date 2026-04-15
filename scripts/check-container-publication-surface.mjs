import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fromRepoRoot = (relativePath) => path.join(repoRoot, relativePath);

export function validateContainerPublicationSurface() {
  const failures = [];

  for (const requiredPath of ['Dockerfile', 'DISTRIBUTION.md', 'README.md', 'packages/mcp-server/README.md']) {
    if (!existsSync(fromRepoRoot(requiredPath))) {
      failures.push(`missing_container_publication_path:${requiredPath}`);
    }
  }

  if (failures.length > 0) {
    return failures;
  }

  const dockerfile = readFileSync(fromRepoRoot('Dockerfile'), 'utf8');
  const distribution = readFileSync(fromRepoRoot('DISTRIBUTION.md'), 'utf8');
  const readme = readFileSync(fromRepoRoot('README.md'), 'utf8');
  const mcpReadme = readFileSync(fromRepoRoot('packages/mcp-server/README.md'), 'utf8');

  const requiredLabels = [
    'org.opencontainers.image.title=',
    'org.opencontainers.image.description=',
    'org.opencontainers.image.licenses=',
    'org.opencontainers.image.url=',
    'org.opencontainers.image.source=',
    'org.opencontainers.image.documentation=',
    'org.opencontainers.image.version=',
    'org.opencontainers.image.revision=',
  ];

  for (const label of requiredLabels) {
    if (!dockerfile.includes(label)) {
      failures.push(`container_publication_missing_label:${label}`);
    }
  }

  if (!distribution.includes('ghcr.io/xiaojiou176-open/campus-copilot-api')) {
    failures.push('container_publication_distribution_missing_public_image');
  }
  if (!distribution.includes('pnpm smoke:docker:api')) {
    failures.push('container_publication_distribution_missing_smoke');
  }
  if (!distribution.includes('container-ready (repo-local)')) {
    failures.push('container_publication_distribution_missing_packet_link');
  }
  if (!readme.includes('DISTRIBUTION.md')) {
    failures.push('container_publication_readme_missing_distribution_link');
  }
  if (!mcpReadme.includes('../../DISTRIBUTION.md')) {
    failures.push('container_publication_mcp_readme_missing_distribution_link');
  }

  return failures;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const failures = validateContainerPublicationSurface();

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log('container_publication_surface_ok');
}
