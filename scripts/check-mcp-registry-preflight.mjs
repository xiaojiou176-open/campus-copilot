import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fromRepoRoot(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(fromRepoRoot(relativePath), 'utf8'));
}

export function validateMcpRegistryPreflight() {
  const failures = [];

  const pkg = readJson('packages/mcp-server/package.json');
  const bundleManifest = readJson('packages/mcp-server/mcpb.manifest.json');
  const server = readJson('packages/mcp-server/server.json');
  const packet = readJson('packages/mcp-server/registry-submission.packet.json');
  const readme = readFileSync(fromRepoRoot('packages/mcp-server/README.md'), 'utf8');
  const distribution = readFileSync(fromRepoRoot('DISTRIBUTION.md'), 'utf8');
  const examples = readFileSync(fromRepoRoot('examples/integrations/README.md'), 'utf8');
  const expectedBundleUrl = `https://github.com/xiaojiou176-open/OpenCampus/releases/download/v${pkg.version}/campus-copilot-mcp-${pkg.version}.mcpb`;

  if (pkg.private !== false) {
    failures.push('mcp_registry_package_must_be_public');
  }
  if (pkg.publishConfig?.access !== 'public') {
    failures.push('mcp_registry_package_publish_access_drift');
  }
  if (typeof pkg.mcpName !== 'string' || !pkg.mcpName.startsWith('io.github.')) {
    failures.push('mcp_registry_package_mcp_name_missing_or_invalid');
  }
  if (pkg.repository?.directory !== 'packages/mcp-server') {
    failures.push('mcp_registry_package_repository_directory_drift');
  }
  if (bundleManifest.manifest_version !== '0.2') {
    failures.push('mcp_registry_bundle_manifest_version_drift');
  }
  if (bundleManifest.version !== pkg.version) {
    failures.push('mcp_registry_bundle_manifest_package_version_drift');
  }
  if (bundleManifest.server?.type !== 'node') {
    failures.push('mcp_registry_bundle_manifest_server_type_drift');
  }
  if (bundleManifest.server?.entry_point !== 'dist/bin.mjs') {
    failures.push('mcp_registry_bundle_manifest_entrypoint_drift');
  }

  if (server.$schema !== 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json') {
    failures.push('mcp_registry_server_schema_drift');
  }
  if (server.name !== pkg.mcpName) {
    failures.push('mcp_registry_server_name_drift');
  }
  if (server.version !== pkg.version) {
    failures.push('mcp_registry_server_version_drift');
  }
  if (server.repository?.url !== 'https://github.com/xiaojiou176-open/OpenCampus') {
    failures.push('mcp_registry_server_repository_url_drift');
  }
  if (server.repository?.source !== 'github') {
    failures.push('mcp_registry_server_repository_source_drift');
  }
  if (server.repository?.subfolder !== 'packages/mcp-server') {
    failures.push('mcp_registry_server_repository_subfolder_drift');
  }
  if (!Array.isArray(server.packages) || server.packages.length !== 1) {
    failures.push('mcp_registry_server_packages_shape_drift');
  } else {
    const [firstPackage] = server.packages;
    if (firstPackage.registryType !== 'mcpb') {
      failures.push('mcp_registry_server_registry_type_drift');
    }
    if (firstPackage.identifier !== expectedBundleUrl) {
      failures.push('mcp_registry_server_identifier_drift');
    }
    if (firstPackage.version !== pkg.version) {
      failures.push('mcp_registry_server_package_version_drift');
    }
    if (firstPackage.fileSha256 !== packet.package?.fileSha256) {
      failures.push('mcp_registry_server_bundle_hash_drift');
    }
    if (firstPackage.transport?.type !== 'stdio') {
      failures.push('mcp_registry_server_transport_drift');
    }
  }

  if (packet.kind !== 'repo-owned-mcp-registry-submission-packet') {
    failures.push('mcp_registry_packet_kind_drift');
  }
  if (packet.package?.name !== pkg.name) {
    failures.push('mcp_registry_packet_package_name_drift');
  }
  if (packet.package?.version !== pkg.version) {
    failures.push('mcp_registry_packet_package_version_drift');
  }
  if (packet.package?.mcpName !== pkg.mcpName) {
    failures.push('mcp_registry_packet_mcp_name_drift');
  }
  if (packet.package?.distributionType !== 'mcpb') {
    failures.push('mcp_registry_packet_distribution_type_drift');
  }
  if (packet.package?.releaseAssetUrl !== expectedBundleUrl) {
    failures.push('mcp_registry_packet_release_asset_url_drift');
  }
  if (packet.docs?.bundleManifest !== 'packages/mcp-server/mcpb.manifest.json') {
    failures.push('mcp_registry_packet_bundle_manifest_reference_drift');
  }
  if (packet.server?.name !== server.name) {
    failures.push('mcp_registry_packet_server_name_drift');
  }
  if (packet.server?.transport !== 'stdio') {
    failures.push('mcp_registry_packet_transport_drift');
  }
  if (packet.server?.repository?.subfolder !== 'packages/mcp-server') {
    failures.push('mcp_registry_packet_repository_subfolder_drift');
  }
  if (packet.docs?.packetDoc !== 'DISTRIBUTION.md') {
    failures.push('mcp_registry_packet_doc_reference_drift');
  }

  const readmeSnippets = [
    'registry-submission.packet.json',
    'server.json',
    'mcpName',
    'mcpb.manifest.json',
    'stdio',
    'release-hosted `.mcpb` bundle',
    'discovery-page read-back is still a separate upstream step',
    'pnpm start:mcp',
  ];
  for (const snippet of readmeSnippets) {
    if (!readme.includes(snippet)) {
      failures.push(`mcp_registry_readme_missing_snippet:${snippet}`);
    }
  }

  if (!distribution.includes('check:mcp-registry-preflight')) {
    failures.push('mcp_registry_distribution_missing_preflight');
  }
  if (!distribution.includes('registry-submission.packet.json')) {
    failures.push('mcp_registry_distribution_missing_packet_reference');
  }
  if (!examples.includes('codex-mcp.example.json') || !examples.includes('claude-code-mcp.example.json')) {
    failures.push('mcp_registry_examples_missing_config_routes');
  }

  return failures;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const failures = validateMcpRegistryPreflight();

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log('mcp_registry_preflight_ok');
}
