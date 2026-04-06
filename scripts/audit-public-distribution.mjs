import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const outputDir = join(repoRoot, '.runtime-cache/public-distribution');
const latestJsonPath = join(outputDir, 'latest.json');
const latestMarkdownPath = join(outputDir, 'latest.md');

const publicPackageNames = [
  '@campus-copilot/cli',
  '@campus-copilot/mcp-server',
  '@campus-copilot/mcp',
  '@campus-copilot/mcp-readonly',
  '@campus-copilot/sdk',
  '@campus-copilot/workspace-sdk',
  '@campus-copilot/site-sdk',
  '@campus-copilot/provider-runtime',
  '@campus-copilot/gradescope-api',
  '@campus-copilot/edstem-api',
  '@campus-copilot/myuw-api',
];

const bundleSurfaces = [
  {
    surface: 'Codex bundle',
    installPath: 'scripts/consumer/campus-copilot-mcp.sh',
    proof: 'pnpm proof:public',
    docs: 'examples/integrations/plugin-bundles.md',
    sample: 'examples/integrations/codex-mcp-shell.example.json',
  },
  {
    surface: 'Claude Code bundle',
    installPath: 'scripts/consumer/campus-copilot-mcp.sh',
    proof: 'pnpm proof:public',
    docs: 'examples/integrations/plugin-bundles.md',
    sample: 'examples/integrations/claude-code-mcp-shell.example.json',
  },
  {
    surface: 'OpenClaw route',
    installPath: 'examples/openclaw-readonly.md',
    proof: 'pnpm proof:public',
    docs: 'examples/openclaw-readonly.md',
    sample: 'examples/integrations/plugin-bundles.md',
  },
];

const openClawCompatibleLayoutPaths = [
  'skills',
  'commands',
  'agents',
  'hooks/hooks.json',
  '.mcp.json',
  '.lsp.json',
  'settings.json',
];

const packageReadmeByName = {
  '@campus-copilot/sdk': 'packages/sdk/README.md',
  '@campus-copilot/workspace-sdk': 'packages/workspace-sdk/README.md',
  '@campus-copilot/site-sdk': 'packages/site-sdk/README.md',
  '@campus-copilot/cli': 'packages/cli/README.md',
  '@campus-copilot/mcp': 'packages/mcp/README.md',
  '@campus-copilot/mcp-readonly': 'packages/mcp-readonly/README.md',
  '@campus-copilot/mcp-server': 'packages/mcp-server/README.md',
  '@campus-copilot/provider-runtime': 'packages/provider-runtime/README.md',
  '@campus-copilot/gradescope-api': 'packages/gradescope-api/README.md',
  '@campus-copilot/edstem-api': 'packages/edstem-api/README.md',
  '@campus-copilot/myuw-api': 'packages/myuw-api/README.md',
};

const sampleByName = {
  '@campus-copilot/sdk': 'examples/sdk-usage.ts',
  '@campus-copilot/workspace-sdk': 'examples/sdk-usage.ts',
  '@campus-copilot/site-sdk': 'examples/sdk-usage.ts',
  '@campus-copilot/cli': 'examples/cli-usage.md',
  '@campus-copilot/mcp': 'examples/integrations/README.md',
  '@campus-copilot/mcp-readonly': 'examples/mcp/README.md',
  '@campus-copilot/mcp-server': 'examples/integrations/codex-mcp.example.json',
  '@campus-copilot/provider-runtime': 'examples/provider-runtime-switchyard.ts',
  '@campus-copilot/gradescope-api': 'examples/gradescope-api-usage.ts',
  '@campus-copilot/edstem-api': 'examples/edstem-api-usage.ts',
  '@campus-copilot/myuw-api': 'examples/myuw-api-usage.ts',
};

const proofByName = {
  '@campus-copilot/sdk': 'pnpm --filter @campus-copilot/sdk test',
  '@campus-copilot/workspace-sdk': 'pnpm --filter @campus-copilot/workspace-sdk test',
  '@campus-copilot/site-sdk': 'pnpm --filter @campus-copilot/site-sdk test',
  '@campus-copilot/cli': 'pnpm --filter @campus-copilot/cli test',
  '@campus-copilot/mcp': 'pnpm --filter @campus-copilot/mcp test',
  '@campus-copilot/mcp-readonly': 'pnpm --filter @campus-copilot/mcp-readonly build && pnpm --filter @campus-copilot/mcp-readonly test',
  '@campus-copilot/mcp-server': 'pnpm --filter @campus-copilot/mcp-server build && pnpm --filter @campus-copilot/mcp-server test',
  '@campus-copilot/provider-runtime': 'pnpm --filter @campus-copilot/provider-runtime build && pnpm --filter @campus-copilot/provider-runtime test',
  '@campus-copilot/gradescope-api': 'pnpm --filter @campus-copilot/gradescope-api build && pnpm --filter @campus-copilot/gradescope-api test',
  '@campus-copilot/edstem-api': 'pnpm --filter @campus-copilot/edstem-api build && pnpm --filter @campus-copilot/edstem-api test',
  '@campus-copilot/myuw-api': 'pnpm --filter @campus-copilot/myuw-api build && pnpm --filter @campus-copilot/myuw-api test',
};

const previewOnlyRepoLocalStates = new Set();
const publishedPackageNames = new Set(['@campus-copilot/mcp']);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function pathExists(path) {
  return existsSync(join(repoRoot, path));
}

const manifests = new Map();
for (const name of publicPackageNames) {
  const manifestPath = Object.keys(packageReadmeByName)
    .map((pkgName) => [pkgName, packageReadmeByName[pkgName].replace('/README.md', '/package.json')])
    .find(([pkgName]) => pkgName === name)?.[1];
  if (!manifestPath) {
    continue;
  }
  manifests.set(name, { manifestPath, manifest: readJson(manifestPath) });
}

function listRegistryIssues(packageName, seen = new Set()) {
  if (seen.has(packageName)) {
    return [];
  }
  seen.add(packageName);

  const entry = manifests.get(packageName);
  if (!entry) {
    return [];
  }

  const { manifest } = entry;
  const blockers = [];
  const deps = {
    ...(manifest.dependencies ?? {}),
    ...(manifest.peerDependencies ?? {}),
    ...(manifest.optionalDependencies ?? {}),
  };

  for (const dep of Object.keys(deps)) {
    if (!dep.startsWith('@campus-copilot/')) {
      continue;
    }

    const depEntry = manifests.get(dep);
    if (!depEntry) {
      blockers.push(`depends_on_internal_private_package:${dep}`);
      continue;
    }

    if (depEntry.manifest.private === true) {
      blockers.push(`depends_on_internal_private_package:${dep}`);
      continue;
    }

    blockers.push(...listRegistryIssues(dep, seen));
  }

  const exportedPaths = [
    ...Object.values(manifest.exports ?? {}),
    ...Object.values(manifest.bin ?? {}),
  ].filter((value) => typeof value === 'string');
  if (exportedPaths.some((value) => value.endsWith('.ts'))) {
    blockers.push('exports_raw_typescript_entrypoint');
  }

  if (manifest.version === '0.0.0') {
    blockers.push('version_not_ready_for_public_release');
  }

  return Array.from(new Set(blockers));
}

function buildPackageSurface(name) {
  const entry = manifests.get(name);
  const readmePath = packageReadmeByName[name];
  const samplePath = sampleByName[name];
  const proof = proofByName[name];
  const repoLocalIssues = [];

  if (!entry) {
    return {
      surface: name,
      currentState: 'missing manifest',
      registryReadiness: 'missing manifest',
      installPath: null,
      proofLoop: proof,
      docs: readmePath,
      sample: samplePath,
      publicReady: false,
      repoLocalPublicReady: false,
      blockers: ['missing_manifest'],
    };
  }

  const { manifestPath, manifest } = entry;
  if (manifest.private !== false) {
    repoLocalIssues.push('manifest_not_public');
  }
  if (!pathExists(readmePath)) {
    repoLocalIssues.push('missing_readme');
  } else {
    const readme = readFileSync(readmePath, 'utf8');
    if (!readme.includes('## Install')) {
      repoLocalIssues.push('missing_install_section');
    }
  }
  if (!pathExists(samplePath)) {
    repoLocalIssues.push('missing_reproducible_sample');
  }
  if (!proof) {
    repoLocalIssues.push('missing_proof_command');
  }

  const registryIssues = listRegistryIssues(name);
  const repoLocalPublicReady = repoLocalIssues.length === 0 && !previewOnlyRepoLocalStates.has(name);
  const publishedToRegistry = publishedPackageNames.has(name);
  const currentState = publishedToRegistry
    ? 'published (npm)'
    : repoLocalPublicReady
      ? 'public-ready (repo-local)'
      : 'repo-public preview';
  const registryReadiness = publishedToRegistry
    ? 'published (npm)'
    : registryIssues.length === 0
      ? 'registry candidate'
      : 'registry blocked';
  const blockers = [
    ...repoLocalIssues,
    ...(!publishedToRegistry ? registryIssues.map((issue) => `registry:${issue}`) : []),
  ];

  return {
    surface: name,
    manifestPath,
    currentState,
    registryReadiness,
    installPath: readmePath,
    proofLoop: proof,
    docs: readmePath,
    sample: samplePath,
    publicReady: repoLocalPublicReady,
    repoLocalPublicReady,
    blockers: Array.from(new Set(blockers)),
  };
}

function buildBundleSurface(surface) {
  const blockers = [];
  if (!pathExists(surface.installPath)) {
    blockers.push('missing_bundle_launcher');
  }
  if (!pathExists(surface.docs)) {
    blockers.push('missing_bundle_router');
  }
  if (!pathExists(surface.sample)) {
    blockers.push('missing_bundle_sample');
  }

  const hasOpenClawCompatibleLayout =
    surface.surface === 'OpenClaw route' &&
    openClawCompatibleLayoutPaths.some((path) => pathExists(path));

  return {
    surface: surface.surface,
    currentState:
      surface.surface === 'OpenClaw route'
        ? hasOpenClawCompatibleLayout
          ? 'plugin-grade repo bundle'
          : 'command-first repo route'
        : blockers.length === 0
          ? 'plugin-grade repo bundle'
          : 'bundle missing required artifacts',
    registryReadiness: 'official listing not completed',
    installPath: surface.installPath,
    proofLoop: surface.proof,
    docs: surface.docs,
    sample: surface.sample,
    publicReady: blockers.length === 0,
    repoLocalPublicReady: blockers.length === 0,
    blockers,
  };
}

const packageSurfaces = publicPackageNames.map(buildPackageSurface);
const bundleResults = bundleSurfaces.map(buildBundleSurface);
const results = [...packageSurfaces, ...bundleResults];

const markdown = [
  '# Public Distribution Audit',
  '',
  '| Surface | Current state | Package registry readiness | Install path | Proof loop | Docs | Sample | Blockers |',
  '| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |',
  ...results.map((item) =>
    `| ${item.surface} | ${item.currentState} | ${item.registryReadiness ?? '-'} | ${item.installPath ?? '-'} | ${item.proofLoop ?? '-'} | ${item.docs ?? '-'} | ${item.sample ?? '-'} | ${
      item.blockers.length > 0 ? item.blockers.join(', ') : 'none'
    } |`,
  ),
  '',
];

mkdirSync(outputDir, { recursive: true });
writeFileSync(latestJsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), surfaces: results }, null, 2)}\n`);
writeFileSync(latestMarkdownPath, `${markdown.join('\n')}\n`);
process.stdout.write(`${markdown.join('\n')}\n`);
