import { spawnSync } from 'node:child_process';

const commands = [
  { command: 'pnpm', args: ['check:skill-catalog'] },
  { command: 'pnpm', args: ['check:mcp-registry-preflight'] },
  { command: 'pnpm', args: ['check:container-surface'] },
  { command: 'pnpm', args: ['check:consumer-surfaces'] },
  { command: 'pnpm', args: ['check:public-surface'] },
  { command: 'node', args: ['--test', 'scripts/public-package-surface.test.mjs'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/sdk', 'test'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/workspace-sdk', 'test'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/site-sdk', 'test'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/cli', 'test'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/mcp', 'test'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/mcp-readonly', 'build'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/mcp-readonly', 'test'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/mcp-server', 'build'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/mcp-server', 'test'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/provider-runtime', 'build'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/provider-runtime', 'test'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/gradescope-api', 'build'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/gradescope-api', 'test'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/edstem-api', 'build'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/edstem-api', 'test'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/myuw-api', 'build'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/myuw-api', 'test'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/cli', 'start', 'help'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/mcp-server', 'start', '--help'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/mcp-readonly', 'start:canvas', '--', '--help'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/mcp-readonly', 'start:gradescope', '--', '--help'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/mcp-readonly', 'start:edstem', '--', '--help'] },
  { command: 'pnpm', args: ['--filter', '@campus-copilot/mcp-readonly', 'start:myuw', '--', '--help'] },
  {
    command: 'pnpm',
    args: [
      '--filter',
      '@campus-copilot/provider-runtime',
      'exec',
      'node',
      '--input-type=module',
      '-e',
      "import('@campus-copilot/provider-runtime').then((m)=>{console.log([typeof m.ProviderStatusResponseSchema, typeof m.buildSwitchyardInput].join(','))})",
    ],
  },
  { command: 'node', args: ['--experimental-strip-types', 'examples/gradescope-api-usage.ts'] },
  { command: 'node', args: ['--experimental-strip-types', 'examples/edstem-api-usage.ts'] },
  { command: 'node', args: ['--experimental-strip-types', 'examples/myuw-api-usage.ts'] },
  { command: 'pnpm', args: ['smoke:docker:api'], optionalFailureKind: 'container_runtime' },
];

function buildSanitizedChildEnv(overrides = {}) {
  const env = {
    ...process.env,
    ...overrides,
  };

  const noisyLifecycleKeys = [
    'npm_config_npm_globalconfig',
    'npm_config_verify_deps_before_run',
    'npm_config__jsr_registry',
    'npm_config_store_dir',
  ];

  for (const key of noisyLifecycleKeys) {
    delete env[key];
  }

  return env;
}

function writeCommandOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function classifyOptionalFailure(kind, result) {
  if (kind !== 'container_runtime') {
    return undefined;
  }

  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (/Cannot connect to the Docker daemon/i.test(combined)) {
    return {
      code: 'docker_daemon_unavailable',
      detail: 'docker daemon unavailable on this workstation',
    };
  }

  if (/permission denied.*docker daemon/i.test(combined)) {
    return {
      code: 'docker_daemon_permission_denied',
      detail: 'docker daemon requires extra workstation permission',
    };
  }

  return undefined;
}

let optionalRuntimeBlocker;

for (const { command, args, cwd, optionalFailureKind } of commands) {
  const result = spawnSync(command, args, {
    cwd: cwd ?? process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
    env: buildSanitizedChildEnv(),
  });

  writeCommandOutput(result);

  if (result.status !== 0) {
    const classified = classifyOptionalFailure(optionalFailureKind, result);
    if (classified) {
      optionalRuntimeBlocker = classified;
      console.warn(
        `public_distribution_proof_notice:${classified.code}:${classified.detail}`,
      );
      continue;
    }

    process.exit(result.status ?? 1);
  }
}

const auditEnv = buildSanitizedChildEnv(
  optionalRuntimeBlocker
    ? {
        CAMPUS_COPILOT_CONTAINER_RUNTIME_BLOCKER: optionalRuntimeBlocker.code,
        CAMPUS_COPILOT_CONTAINER_RUNTIME_BLOCKER_DETAIL: optionalRuntimeBlocker.detail,
      }
    : {},
);

const auditResult = spawnSync('node', ['scripts/audit-public-distribution.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: 'pipe',
  env: auditEnv,
});

writeCommandOutput(auditResult);

if (auditResult.status !== 0) {
  process.exit(auditResult.status ?? 1);
}

console.log('public_distribution_proof_ok');
