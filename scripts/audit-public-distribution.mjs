import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const outputDir = join(repoRoot, '.runtime-cache/public-distribution');
const latestJsonPath = join(outputDir, 'latest.json');
const latestMarkdownPath = join(outputDir, 'latest.md');

const publicPackageNames = [
  '@opencampus/cli',
  '@opencampus/mcp-server',
  '@opencampus/mcp',
  '@opencampus/mcp-readonly',
  '@opencampus/sdk',
  '@opencampus/workspace-sdk',
  '@opencampus/site-sdk',
  '@opencampus/provider-runtime',
  '@opencampus/gradescope-api',
  '@opencampus/edstem-api',
  '@opencampus/myuw-api',
];

const bundleSurfaces = [
  {
    surface: 'Codex bundle',
    installPath: 'scripts/consumer/opencampus-mcp.sh',
    proof: 'pnpm proof:public',
    docs: 'examples/integrations/plugin-bundles.md',
    sample: 'examples/integrations/codex-mcp-shell.example.json',
  },
  {
    surface: 'Claude Code bundle',
    installPath: 'scripts/consumer/opencampus-mcp.sh',
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

const supportingSurfaces = [
  {
    surface: 'MCP Registry packet',
    currentStateWhenReady: 'registry-preflight ready',
    registryReadiness: 'owner-side submit later',
    installPath: 'packages/mcp-server/registry-submission.packet.json',
    proof: 'pnpm check:mcp-registry-preflight',
    docs: 'DISTRIBUTION.md',
    sample: 'packages/mcp-server/registry-submission.packet.json',
    requiredPaths: [
      'DISTRIBUTION.md',
      'packages/mcp-server/package.json',
      'packages/mcp-server/server.json',
      'packages/mcp-server/registry-submission.packet.json',
      'scripts/check-mcp-registry-preflight.mjs',
    ],
  },
  {
    surface: 'Skill pack',
    currentStateWhenReady: 'public-ready (repo-local)',
    registryReadiness: 'owner-side publish later',
    installPath: 'skills/catalog.json',
    proof: 'pnpm check:skill-catalog',
    docs: 'skills/README.md',
    sample: 'examples/current-view-triage-example.md',
    requiredPaths: [
      'skills/catalog.json',
      'skills/README.md',
      'skills/clawhub-submission.packet.json',
      'DISTRIBUTION.md',
      'scripts/check-skill-catalog.mjs',
    ],
  },
  {
    surface: 'API container',
    currentStateWhenReady: 'container-ready (repo-local)',
    registryReadiness: 'owner-side publish later',
    installPath: 'docker compose up -d opencampus-api',
    proof: 'pnpm check:container-surface && pnpm smoke:docker:api',
    docs: 'DISTRIBUTION.md',
    sample: 'Dockerfile',
    requiredPaths: [
      'Dockerfile',
      '.dockerignore',
      'compose.yaml',
      'DISTRIBUTION.md',
      'scripts/docker-api-smoke.sh',
      'scripts/check-container-surface.mjs',
    ],
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

const containerRuntimeBlocker = process.env.OPENCAMPUS_CONTAINER_RUNTIME_BLOCKER;
const containerRuntimeBlockerDetail = process.env.OPENCAMPUS_CONTAINER_RUNTIME_BLOCKER_DETAIL;

const packageReadmeByName = {
  '@opencampus/sdk': 'packages/sdk/README.md',
  '@opencampus/workspace-sdk': 'packages/workspace-sdk/README.md',
  '@opencampus/site-sdk': 'packages/site-sdk/README.md',
  '@opencampus/cli': 'packages/cli/README.md',
  '@opencampus/mcp': 'packages/mcp/README.md',
  '@opencampus/mcp-readonly': 'packages/mcp-readonly/README.md',
  '@opencampus/mcp-server': 'packages/mcp-server/README.md',
  '@opencampus/provider-runtime': 'packages/provider-runtime/README.md',
  '@opencampus/gradescope-api': 'packages/gradescope-api/README.md',
  '@opencampus/edstem-api': 'packages/edstem-api/README.md',
  '@opencampus/myuw-api': 'packages/myuw-api/README.md',
};

const sampleByName = {
  '@opencampus/sdk': 'examples/sdk-usage.ts',
  '@opencampus/workspace-sdk': 'examples/sdk-usage.ts',
  '@opencampus/site-sdk': 'examples/sdk-usage.ts',
  '@opencampus/cli': 'examples/cli-usage.md',
  '@opencampus/mcp': 'examples/integrations/README.md',
  '@opencampus/mcp-readonly': 'examples/mcp/README.md',
  '@opencampus/mcp-server': 'examples/integrations/codex-mcp.example.json',
  '@opencampus/provider-runtime': 'examples/provider-runtime-switchyard.ts',
  '@opencampus/gradescope-api': 'examples/gradescope-api-usage.ts',
  '@opencampus/edstem-api': 'examples/edstem-api-usage.ts',
  '@opencampus/myuw-api': 'examples/myuw-api-usage.ts',
};

const proofByName = {
  '@opencampus/sdk': 'pnpm --filter @opencampus/sdk test',
  '@opencampus/workspace-sdk': 'pnpm --filter @opencampus/workspace-sdk test',
  '@opencampus/site-sdk': 'pnpm --filter @opencampus/site-sdk test',
  '@opencampus/cli': 'pnpm --filter @opencampus/cli test',
  '@opencampus/mcp': 'pnpm --filter @opencampus/mcp test',
  '@opencampus/mcp-readonly': 'pnpm --filter @opencampus/mcp-readonly build && pnpm --filter @opencampus/mcp-readonly test',
  '@opencampus/mcp-server': 'pnpm --filter @opencampus/mcp-server build && pnpm --filter @opencampus/mcp-server test',
  '@opencampus/provider-runtime': 'pnpm --filter @opencampus/provider-runtime build && pnpm --filter @opencampus/provider-runtime test',
  '@opencampus/gradescope-api': 'pnpm --filter @opencampus/gradescope-api build && pnpm --filter @opencampus/gradescope-api test',
  '@opencampus/edstem-api': 'pnpm --filter @opencampus/edstem-api build && pnpm --filter @opencampus/edstem-api test',
  '@opencampus/myuw-api': 'pnpm --filter @opencampus/myuw-api build && pnpm --filter @opencampus/myuw-api test',
};

const previewOnlyRepoLocalStates = new Set();

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

function readRegistrySubmissionStatus(packageName) {
  if (packageName !== '@opencampus/mcp-server') {
    return undefined;
  }

  const packetPath = 'packages/mcp-server/registry-submission.packet.json';
  if (!pathExists(packetPath)) {
    return undefined;
  }

  const packet = readJson(packetPath);
  const status = packet?.currentRegistrySubmit?.status;
  return typeof status === 'string' ? status : undefined;
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
    if (!dep.startsWith('@opencampus/')) {
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
  const currentState = repoLocalPublicReady ? 'public-ready (repo-local)' : 'repo-public preview';
  const registrySubmissionStatus = readRegistrySubmissionStatus(name);
  const registryReadiness =
    registryIssues.length > 0
      ? 'registry blocked'
      : registrySubmissionStatus === 'accepted_by_registry'
        ? 'registry submitted'
        : 'registry candidate';
  const blockers = [
    ...repoLocalIssues,
    ...registryIssues.map((issue) => `registry:${issue}`),
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

function buildSupportingSurface(surface) {
  const requiredArtifactBlockers = surface.requiredPaths
    .filter((path) => !pathExists(path))
    .map((path) => `missing:${path}`);
  const blockers = [...requiredArtifactBlockers];

  if (surface.surface === 'API container' && containerRuntimeBlocker) {
    blockers.push(`local_runtime:${containerRuntimeBlocker}`);
    if (containerRuntimeBlockerDetail) {
      blockers.push(`runtime_note:${containerRuntimeBlockerDetail}`);
    }
  }

  return {
    surface: surface.surface,
    currentState: requiredArtifactBlockers.length === 0 ? surface.currentStateWhenReady : 'missing required artifacts',
    registryReadiness: surface.registryReadiness,
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
const supportingResults = supportingSurfaces.map(buildSupportingSurface);
const results = [...packageSurfaces, ...bundleResults, ...supportingResults];

const markdown = [
  '# Public Distribution Audit',
  '',
  '| Surface | Current state | Publication / registry readiness | Install path | Proof loop | Docs | Sample | Blockers |',
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
