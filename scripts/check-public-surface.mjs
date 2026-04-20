import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const requiredFiles = [
  'AGENTS.md',
  'CLAUDE.md',
  'LICENSE',
  'README.md',
  'examples/README.md',
  'examples/toolbox-chooser.md',
  'examples/integrations/README.md',
  'examples/integrations/plugin-bundles.md',
  'examples/cli-usage.md',
  'examples/mcp-readonly.md',
  'examples/provider-runtime-switchyard.ts',
  'examples/sdk-usage.ts',
  'examples/current-view-triage-example.md',
  'examples/site-overview-audit-example.md',
  'examples/mcp/README.md',
  'examples/integrations/codex-mcp-shell.example.json',
  'examples/integrations/claude-code-mcp-shell.example.json',
  'examples/mcp/codex-repo-root.example.json',
  'examples/mcp/claude-desktop-repo-root.example.json',
  'examples/openclaw-readonly.md',
  'scripts/proof-public-surface.sh',
  'scripts/audit-public-distribution.mjs',
  'scripts/check-container-surface.mjs',
  'scripts/check-mcp-registry-preflight.mjs',
  'scripts/check-skill-catalog.mjs',
  'scripts/render-social-preview.sh',
  'scripts/consumer/campus-copilot-mcp.sh',
  'scripts/consumer/campus-copilot-site-sidecar.sh',
  'scripts/docker-api-smoke.sh',
  'skills/README.md',
  'skills/catalog.json',
  'skills/clawhub-submission.packet.json',
  'skills/current-view-triage/SKILL.md',
  'skills/openclaw-readonly-consumer/SKILL.md',
  'skills/site-overview-audit/SKILL.md',
  'packages/mcp-server/mcpb.manifest.json',
  'docs/assets/hero-workbench-overview.svg',
  'docs/assets/social-preview-source.svg',
  'docs/assets/social-preview.png',
  'apps/web/public/favicon.svg',
  'apps/web/public/web-workbench-share-card.svg',
  'apps/web/public/site.webmanifest',
  'compose.yaml',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  '.env.example',
  'CODE_OF_CONDUCT.md',
  '.github/CODEOWNERS',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
];

const publicPackageManifests = [
  'packages/sdk/package.json',
  'packages/workspace-sdk/package.json',
  'packages/site-sdk/package.json',
  'packages/cli/package.json',
  'packages/mcp/package.json',
  'packages/mcp-readonly/package.json',
  'packages/mcp-server/package.json',
  'packages/provider-runtime/package.json',
  'packages/gradescope-api/package.json',
  'packages/edstem-api/package.json',
  'packages/myuw-api/package.json',
];

const exampleJsonFiles = [
  'examples/integrations/codex-mcp.example.json',
  'examples/integrations/codex-mcp-shell.example.json',
  'examples/integrations/claude-code-mcp.example.json',
  'examples/integrations/claude-code-mcp-shell.example.json',
  'examples/mcp/codex.example.json',
  'examples/mcp/claude-desktop.example.json',
  'examples/mcp/codex-repo-root.example.json',
  'examples/mcp/claude-desktop-repo-root.example.json',
  'examples/codex/campus-copilot-mcp.json',
];

const publicSkillFiles = [
  'skills/read-only-workspace-analysis/SKILL.md',
  'skills/read-only-workspace-audit/SKILL.md',
  'skills/current-view-triage/SKILL.md',
  'skills/openclaw-readonly-consumer/SKILL.md',
  'skills/site-mcp-consumer/SKILL.md',
  'skills/site-overview-audit/SKILL.md',
  'skills/site-snapshot-review/SKILL.md',
  'skills/switchyard-runtime-check/SKILL.md',
];

const expectedRepositoryUrl = 'https://github.com/xiaojiou176-open/OpenCampus.git';
const expectedIssuesUrl = 'https://github.com/xiaojiou176-open/OpenCampus/issues';
const expectedRootHomepage = 'https://xiaojiou176-open.github.io/OpenCampus/';

const failures = [];

export function readPngDimensions(path) {
  const buffer = readFileSync(path);
  const pngSignature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== pngSignature) {
    throw new Error(`invalid_png_signature:${path}`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

export function collectSocialPreviewFailures(path) {
  if (!existsSync(path)) {
    return [`missing_public_surface:${path}`];
  }

  const failures = [];
  const { width, height } = readPngDimensions(path);
  const size = statSync(path).size;

  if (width !== 1280 || height !== 640) {
    failures.push(`social_preview_wrong_dimensions:${width}x${height}`);
  }

  if (size >= 1048576) {
    failures.push(`social_preview_file_too_large:${size}`);
  }

  return failures;
}

function normalizeRepositoryUrl(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/^git\+/, '');
}

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push(`missing_public_surface:${file}`);
  }
}

if (existsSync('SECURITY.md')) {
  const security = readFileSync('SECURITY.md', 'utf8');
  if (!security.includes('xiaojiou176')) {
    failures.push('security_contact_route_missing');
  }
}

if (existsSync('README.md')) {
  const readme = readFileSync('README.md', 'utf8');
  const forbidden = [/branch protection/i, /vulnerability alerts/i, /push protection/i, /code-scanning/i];
  for (const pattern of forbidden) {
    if (pattern.test(readme)) {
      failures.push(`readme_repo_external_assertion:${pattern}`);
    }
  }

  const requiredReadmeLinks = [
    'docs/storefront-assets.md',
    'examples/README.md',
    'examples/toolbox-chooser.md',
    'examples/integrations/README.md',
    'examples/integrations/plugin-bundles.md',
    'examples/mcp/README.md',
    'skills/README.md',
    'pnpm proof:public',
    'INTEGRATIONS.md',
    'DISTRIBUTION.md',
    'docs/07-security-privacy-compliance.md',
    'docs/10-builder-api-and-ecosystem-fit.md',
    'docs/api/openapi.yaml',
  ];
  for (const link of requiredReadmeLinks) {
    if (!readme.includes(link)) {
      failures.push(`readme_missing_public_link:${link}`);
    }
  }
}

if (existsSync('package.json')) {
  const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
  if (rootPackage.private !== true) {
    failures.push('root_package_must_stay_private');
  }
  if (rootPackage.version === '0.0.0') {
    failures.push('root_package_version_not_release_aligned');
  }
  if (rootPackage.type !== 'module') {
    failures.push('root_package_type_missing_module');
  }
  if (rootPackage.homepage !== expectedRootHomepage) {
    failures.push('root_package_homepage_not_pages');
  }
  if (
    typeof rootPackage.description !== 'string' ||
    !rootPackage.description.includes('Source-first public monorepo')
  ) {
    failures.push('root_package_description_not_source_first');
  }
  if (!Array.isArray(rootPackage.keywords) || !rootPackage.keywords.includes('campus-copilot')) {
    failures.push('root_package_keywords_missing_canonical_tag');
  }
  if (rootPackage.scripts?.['render:social-preview'] !== 'bash scripts/render-social-preview.sh') {
    failures.push('root_package_render_social_preview_script_missing');
  }
}

for (const skillPath of publicSkillFiles) {
  if (!existsSync(skillPath)) {
    failures.push(`missing_public_skill:${skillPath}`);
  }
}

if (existsSync('examples/openclaw-readonly.md')) {
  const openclawGuide = readFileSync('examples/openclaw-readonly.md', 'utf8');
  const requiredOpenClawLinks = ['skills/openclaw-readonly-consumer/SKILL.md'];
  for (const link of requiredOpenClawLinks) {
    if (!openclawGuide.includes(link)) {
      failures.push(`openclaw_guide_missing_link:${link}`);
    }
  }
}

if (existsSync('examples/README.md')) {
  const examplesReadme = readFileSync('examples/README.md', 'utf8');
  const requiredExampleLinks = [
    'integrations/README.md',
    '../skills/README.md',
    '../skills/current-view-triage/SKILL.md',
    '../skills/openclaw-readonly-consumer/SKILL.md',
    '../skills/site-overview-audit/SKILL.md',
    'current-view-triage-example.md',
    'site-overview-audit-example.md',
    'toolbox-chooser.md',
    'mcp/README.md',
    'integrations/codex-mcp.example.json',
    'integrations/codex-mcp-shell.example.json',
    'integrations/claude-code-mcp.example.json',
    'integrations/claude-code-mcp-shell.example.json',
  ];
  for (const link of requiredExampleLinks) {
    if (!examplesReadme.includes(link)) {
      failures.push(`examples_readme_missing_link:${link}`);
    }
  }
}

if (existsSync('skills/README.md')) {
  const skillsReadme = readFileSync('skills/README.md', 'utf8');
  const requiredSkillSnippets = [
    'current-view-triage',
    'openclaw-readonly-consumer',
    'site-overview-audit',
    'clawhub-submission.packet.json',
    'examples/toolbox-chooser.md',
    'examples/current-view-triage-example.md',
    'examples/site-overview-audit-example.md',
    'examples/openclaw-readonly.md',
    'examples/integrations/codex-mcp.example.json',
    'examples/integrations/claude-code-mcp.example.json',
  ];
  for (const snippet of requiredSkillSnippets) {
    if (!skillsReadme.includes(snippet)) {
      failures.push(`skills_readme_missing_reference:${snippet}`);
    }
  }
}

const rootContractExpectations = [
  ['PRIVACY.md', ['docs/07-security-privacy-compliance.md', '`Register.UW`', '`Notify.UW`']],
  ['INTEGRATIONS.md', ['docs/07-security-privacy-compliance.md', 'read-only', 'protected academic workflows']],
  ['DISTRIBUTION.md', ['docs/07-security-privacy-compliance.md', 'no registration automation']],
  ['SECURITY.md', ['`Register.UW`', '`Notify.UW`', 'raw course files']],
  ['CLAUDE.md', ['`Register.UW` / `Notify.UW`', 'raw course files']],
];

for (const [path, snippets] of rootContractExpectations) {
  if (!existsSync(path)) {
    failures.push(`missing_public_surface:${path}`);
    continue;
  }

  const body = readFileSync(path, 'utf8');
  for (const snippet of snippets) {
    if (!body.includes(snippet)) {
      failures.push(`root_contract_missing_snippet:${path}:${snippet}`);
    }
  }
}

if (existsSync('docs/07-security-privacy-compliance.md')) {
  const academicSafety = readFileSync('docs/07-security-privacy-compliance.md', 'utf8');
  const requiredAcademicSafetySnippets = [
    '`MyPlan`',
    '`DARS`',
    '`Time Schedule`',
    '`DawgPath`',
    'class-search-only `ctcLink`',
    '`Register.UW`',
    '`Notify.UW`',
    'default-disabled',
    'distribution-facing docs',
  ];

  for (const snippet of requiredAcademicSafetySnippets) {
    if (!academicSafety.includes(snippet)) {
      failures.push(`academic_safety_missing_snippet:${snippet}`);
    }
  }
}

if (existsSync('docs/10-builder-api-and-ecosystem-fit.md')) {
  const builderFit = readFileSync('docs/10-builder-api-and-ecosystem-fit.md', 'utf8');
  const requiredBuilderFitSnippets = ['../examples/toolbox-chooser.md', '../DISTRIBUTION.md'];
  for (const snippet of requiredBuilderFitSnippets) {
    if (!builderFit.includes(snippet)) {
      failures.push(`builder_fit_missing_reference:${snippet}`);
    }
  }
}

if (existsSync('apps/web/index.html')) {
  const webIndex = readFileSync('apps/web/index.html', 'utf8');
  const requiredMetaSnippets = [
    'name="description"',
    'name="application-name"',
    'name="theme-color"',
    'property="og:type"',
    'property="og:site_name"',
    'property="og:title"',
    'property="og:description"',
    'property="og:image"',
    'name="twitter:card"',
    'name="twitter:title"',
    'name="twitter:description"',
    'name="twitter:image"',
    'rel="icon"',
    'rel="manifest"',
  ];
  for (const snippet of requiredMetaSnippets) {
    if (!webIndex.includes(snippet)) {
      failures.push(`web_index_missing_meta:${snippet}`);
    }
  }
}

for (const failure of collectSocialPreviewFailures('docs/assets/social-preview.png')) {
  failures.push(failure);
}

for (const examplePath of exampleJsonFiles) {
  if (!existsSync(examplePath)) {
    failures.push(`missing_example_json:${examplePath}`);
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(examplePath, 'utf8'));
  } catch {
    failures.push(`invalid_example_json:${examplePath}`);
    continue;
  }

  if (!parsed || typeof parsed !== 'object' || typeof parsed.mcpServers !== 'object' || parsed.mcpServers === null) {
    failures.push(`example_json_missing_mcp_servers:${examplePath}`);
    continue;
  }

  if (Object.keys(parsed.mcpServers).length === 0) {
    failures.push(`example_json_empty_mcp_servers:${examplePath}`);
  }
}

for (const manifestPath of publicPackageManifests) {
  if (!existsSync(manifestPath)) {
    failures.push(`missing_public_package_manifest:${manifestPath}`);
    continue;
  }

  const pkg = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const repository = typeof pkg.repository === 'string' ? { url: pkg.repository } : pkg.repository;
  const normalizedRepositoryUrl = normalizeRepositoryUrl(repository?.url);
  if (pkg.private !== false) {
    failures.push(`public_package_private:${manifestPath}`);
  }
  if (pkg.license !== 'MIT') {
    failures.push(`public_package_license_missing:${manifestPath}`);
  }
  if (typeof pkg.description !== 'string' || pkg.description.trim().length === 0) {
    failures.push(`public_package_description_missing:${manifestPath}`);
  }
  if (typeof pkg.homepage !== 'string' || !pkg.homepage.includes('github.com/xiaojiou176-open/OpenCampus/tree/main/')) {
    failures.push(`public_package_homepage_missing:${manifestPath}`);
  }
  if (
    !repository ||
    repository.type !== 'git' ||
    normalizedRepositoryUrl !== expectedRepositoryUrl ||
    typeof repository.directory !== 'string' ||
    repository.directory.length === 0
  ) {
    failures.push(`public_package_repository_missing:${manifestPath}`);
  }
  if (!pkg.bugs || pkg.bugs.url !== expectedIssuesUrl) {
    failures.push(`public_package_bugs_missing:${manifestPath}`);
  }
  if (!Array.isArray(pkg.keywords) || pkg.keywords.length < 3) {
    failures.push(`public_package_keywords_missing:${manifestPath}`);
  } else if (!pkg.keywords.includes('campus-copilot')) {
    failures.push(`public_package_keywords_incomplete:${manifestPath}`);
  }
  if (typeof pkg.version !== 'string' || pkg.version === '0.0.0') {
    failures.push(`public_package_version_not_ready:${manifestPath}`);
  }
  if (!Array.isArray(pkg.files) || pkg.files.length === 0) {
    failures.push(`public_package_files_missing:${manifestPath}`);
  } else {
    if (!pkg.files.includes('README.md')) {
      failures.push(`public_package_files_missing_readme:${manifestPath}`);
    }
    if (!pkg.files.some((entry) => entry === 'src' || entry === 'bin' || entry === 'dist' || entry.startsWith('src/') || entry.startsWith('bin/') || entry.startsWith('dist/'))) {
      failures.push(`public_package_files_missing_runtime_surface:${manifestPath}`);
    }
  }
  if (!pkg.publishConfig || pkg.publishConfig.access !== 'public') {
    failures.push(`public_package_publish_config_missing:${manifestPath}`);
  }

  if (manifestPath === 'packages/mcp-server/package.json') {
    if (pkg.mcpName !== 'io.github.xiaojiou176-open/campus-copilot-mcp') {
      failures.push(`public_package_mcp_name_missing:${manifestPath}`);
    }

    const serverMetadataPath = 'packages/mcp-server/server.json';
    if (!existsSync(serverMetadataPath)) {
      failures.push(`public_package_server_metadata_missing:${serverMetadataPath}`);
    } else {
      const metadata = JSON.parse(readFileSync(serverMetadataPath, 'utf8'));
      const expectedBundleUrl = `https://github.com/xiaojiou176-open/OpenCampus/releases/download/v${pkg.version}/campus-copilot-mcp-${pkg.version}.mcpb`;
      if (metadata.name !== pkg.mcpName) {
        failures.push(`public_package_server_metadata_name_mismatch:${serverMetadataPath}`);
      }
      if (metadata.version !== pkg.version) {
        failures.push(`public_package_server_metadata_version_mismatch:${serverMetadataPath}`);
      }
      if (!Array.isArray(metadata.packages) || metadata.packages.length !== 1) {
        failures.push(`public_package_server_metadata_packages_invalid:${serverMetadataPath}`);
      } else {
        const [packageEntry] = metadata.packages;
        if (packageEntry.registryType !== 'mcpb') {
          failures.push(`public_package_server_metadata_registry_type_invalid:${serverMetadataPath}`);
        }
        if (packageEntry.identifier !== expectedBundleUrl) {
          failures.push(`public_package_server_metadata_identifier_mismatch:${serverMetadataPath}`);
        }
        if (packageEntry.version !== pkg.version) {
          failures.push(`public_package_server_metadata_package_version_mismatch:${serverMetadataPath}`);
        }
        if (typeof packageEntry.fileSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(packageEntry.fileSha256)) {
          failures.push(`public_package_server_metadata_bundle_hash_invalid:${serverMetadataPath}`);
        }
        if (packageEntry.transport?.type !== 'stdio') {
          failures.push(`public_package_server_metadata_transport_invalid:${serverMetadataPath}`);
        }
      }
    }
  }
}

if (existsSync('docs/README.md')) {
  const docsHub = readFileSync('docs/README.md', 'utf8');
  const requiredDocsHubLinks = [
    'api/openapi.yaml',
    '../examples/README.md',
    '../skills/README.md',
    '../DISTRIBUTION.md',
  ];
  for (const link of requiredDocsHubLinks) {
    if (!docsHub.includes(link)) {
      failures.push(`docs_hub_missing_public_link:${link}`);
    }
  }
}

if (existsSync('docs/storefront-assets.md')) {
  const storefrontAssets = readFileSync('docs/storefront-assets.md', 'utf8');
  const requiredStorefrontSnippets = [
    'pnpm render:social-preview',
    '1280x640',
    '<1MB',
  ];
  for (const snippet of requiredStorefrontSnippets) {
    if (!storefrontAssets.includes(snippet)) {
      failures.push(`storefront_assets_missing_snippet:${snippet}`);
    }
  }
}

function main() {
  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log('public_surface_ok');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
