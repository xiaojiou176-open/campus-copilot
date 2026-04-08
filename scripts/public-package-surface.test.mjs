import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';

const packages = [
  'packages/sdk',
  'packages/workspace-sdk',
  'packages/site-sdk',
  'packages/cli',
  'packages/mcp',
  'packages/mcp-readonly',
  'packages/mcp-server',
  'packages/provider-runtime',
  'packages/gradescope-api',
  'packages/edstem-api',
  'packages/myuw-api',
];

function resolvePackageManagerCommand(binaryName) {
  const entrypoint = process.env.npm_execpath;
  const entrypointBase = typeof entrypoint === 'string' ? basename(entrypoint).toLowerCase() : '';

  const matchesEntrypoint = binaryName === 'pnpm' && entrypointBase.startsWith('pnpm');

  if (typeof entrypoint === 'string' && matchesEntrypoint) {
    return { command: process.execPath, prefixArgs: [entrypoint] };
  }

  try {
    const resolved = execFileSync('which', [binaryName], {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();

    if (resolved) {
      const realEntrypoint = realpathSync(resolved);

      if (realEntrypoint.endsWith('.js') || realEntrypoint.endsWith('.cjs') || realEntrypoint.endsWith('.mjs')) {
        return { command: process.execPath, prefixArgs: [realEntrypoint] };
      }

      return { command: realEntrypoint, prefixArgs: [] };
    }
  } catch {
    // Fall back to PATH lookup below.
  }

  return { command: binaryName, prefixArgs: [] };
}

const pnpmCommand = resolvePackageManagerCommand('pnpm');
const npmCommand = resolvePackageManagerCommand('npm');

function execPnpm(args, options = {}) {
  return execFileSync(pnpmCommand.command, [...pnpmCommand.prefixArgs, ...args], {
    ...options,
    env: {
      ...process.env,
      ...options.env,
    },
  });
}

function execNpm(args, options = {}) {
  return execFileSync(npmCommand.command, [...npmCommand.prefixArgs, ...args], {
    ...options,
    env: {
      ...process.env,
      ...options.env,
    },
  });
}

function packDryRun(cwd) {
  const stdout = execNpm(['pack', '--dry-run', '--json'], {
    cwd,
    encoding: 'utf8',
  });

  for (let index = stdout.indexOf('['); index >= 0; index = stdout.indexOf('[', index + 1)) {
    try {
      return JSON.parse(stdout.slice(index));
    } catch {
      // Keep scanning until we find the actual npm JSON payload after any prepack logs.
    }
  }

  throw new Error(`Failed to parse npm pack JSON output for ${cwd}`);
}

function createTempWorkspace(prefix) {
  const workspaceDir = mkdtempSync(join(tmpdir(), prefix));
  writeFileSync(join(workspaceDir, 'package.json'), `${JSON.stringify({ name: prefix, private: true })}\n`);
  return workspaceDir;
}

function packTarball(cwd, packDir) {
  execPnpm(['pack', '--pack-destination', packDir], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  const tarballs = readdirSync(packDir).filter((file) => file.endsWith('.tgz'));
  assert.equal(tarballs.length, 1, `${cwd} must emit exactly one tarball`);
  return join(packDir, tarballs[0]);
}

function installTarball(workspaceDir, tarballPath) {
  execNpm(['install', tarballPath], {
    cwd: workspaceDir,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

function serialTest(name, fn) {
  return test(name, { concurrency: false }, fn);
}

serialTest('repo-public preview packages stay packable with explicit file inventories', () => {
  for (const dir of packages) {
    const manifest = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8'));
    const [result] = packDryRun(dir);
    const filePaths = result.files.map((file) => file.path);
    const manifestFiles = Array.isArray(manifest.files) ? manifest.files : [];
    const packHasRuntimeFiles = filePaths.some(
      (filePath) =>
        filePath.startsWith('src/') || filePath.startsWith('bin/') || filePath.startsWith('dist/'),
    );
    const manifestDeclaresRuntimeFiles = manifestFiles.some((filePath) =>
      filePath === 'dist' ||
      filePath === 'dist/' ||
      filePath.startsWith('src') ||
      filePath.startsWith('bin'),
    );

    assert.equal(manifest.private, false, `${dir} must remain public-facing`);
    assert.notEqual(manifest.version, '0.0.0', `${dir} must not advertise placeholder version`);
    assert.ok(filePaths.includes('README.md'), `${dir} pack output must include README.md`);
    assert.ok(filePaths.includes('package.json'), `${dir} pack output must include package.json`);
    assert.ok(
      packHasRuntimeFiles || manifestDeclaresRuntimeFiles,
      `${dir} pack output or explicit file inventory must include runtime files`,
    );
  }
});

serialTest('@campus-copilot/mcp tarball installs and imports in a fresh temp workspace', () => {
  const packDir = mkdtempSync(join(tmpdir(), 'campus-copilot-mcp-pack-'));
  const workspaceDir = createTempWorkspace('campus-copilot-mcp-proof-');

  try {
    const tarballPath = packTarball('packages/mcp', packDir);
    installTarball(workspaceDir, tarballPath);

    const stdout = execFileSync(
      'node',
      ['-e', "import('@campus-copilot/mcp').then((m)=>{console.log(Object.keys(m).sort().join(','))})"],
      {
        cwd: workspaceDir,
        encoding: 'utf8',
        stdio: 'pipe',
      },
    );

    assert.match(stdout, /createSnapshotEnv/);
    assert.match(stdout, /createSiteMcpConfig/);
    assert.match(stdout, /listSupportedSiteMcpServers/);
  } finally {
    rmSync(packDir, { force: true, recursive: true });
    rmSync(workspaceDir, { force: true, recursive: true });
  }
});

serialTest('@campus-copilot/mcp-readonly tarball installs and exposes a runnable help surface', () => {
  const packDir = mkdtempSync(join(tmpdir(), 'campus-copilot-mcp-readonly-pack-'));
  const workspaceDir = createTempWorkspace('campus-copilot-mcp-readonly-proof-');

  try {
    const tarballPath = packTarball('packages/mcp-readonly', packDir);
    installTarball(workspaceDir, tarballPath);

    const stdout = execPnpm(['exec', 'campus-copilot-mcp-canvas', '--help'], {
      cwd: workspaceDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    assert.match(stdout, /Usage: campus-copilot-mcp-canvas/);
    assert.match(stdout, /read-only/);
  } finally {
    rmSync(packDir, { force: true, recursive: true });
    rmSync(workspaceDir, { force: true, recursive: true });
  }
});

serialTest('@campus-copilot/mcp-server tarball installs and exposes a runnable help surface', () => {
  const packDir = mkdtempSync(join(tmpdir(), 'campus-copilot-mcp-server-pack-'));
  const workspaceDir = createTempWorkspace('campus-copilot-mcp-server-proof-');

  try {
    const tarballPath = packTarball('packages/mcp-server', packDir);
    installTarball(workspaceDir, tarballPath);

    const stdout = execPnpm(['exec', 'campus-copilot-mcp', '--help'], {
      cwd: workspaceDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    assert.match(stdout, /Usage: campus-copilot-mcp/);
    assert.match(stdout, /read-only/);
  } finally {
    rmSync(packDir, { force: true, recursive: true });
    rmSync(workspaceDir, { force: true, recursive: true });
  }
});

serialTest('mcp-server preregistry metadata stays aligned with package.json', () => {
  const pkg = JSON.parse(readFileSync('packages/mcp-server/package.json', 'utf8'));
  const bundleManifest = JSON.parse(readFileSync('packages/mcp-server/mcpb.manifest.json', 'utf8'));
  const metadata = JSON.parse(readFileSync('packages/mcp-server/server.json', 'utf8'));
  const packet = JSON.parse(readFileSync('packages/mcp-server/registry-submission.packet.json', 'utf8'));
  const expectedBundleUrl = `https://github.com/xiaojiou176-open/campus-copilot/releases/download/v${pkg.version}/campus-copilot-mcp-${pkg.version}.mcpb`;

  assert.equal(pkg.mcpName, 'io.github.xiaojiou176-open/campus-copilot-mcp');
  assert.equal(bundleManifest.version, pkg.version);
  assert.equal(bundleManifest.server.type, 'node');
  assert.equal(bundleManifest.server.entry_point, 'dist/bin.mjs');
  assert.equal(metadata.name, pkg.mcpName);
  assert.equal(metadata.version, pkg.version);
  assert.equal(metadata.repository.subfolder, 'packages/mcp-server');
  assert.equal(metadata.packages[0].registryType, 'mcpb');
  assert.equal(metadata.packages[0].identifier, expectedBundleUrl);
  assert.equal(metadata.packages[0].version, pkg.version);
  assert.match(metadata.packages[0].fileSha256, /^[a-f0-9]{64}$/);
  assert.equal(metadata.packages[0].transport.type, 'stdio');
  assert.equal(packet.package.name, pkg.name);
  assert.equal(packet.package.distributionType, 'mcpb');
  assert.equal(packet.package.releaseAssetUrl, expectedBundleUrl);
  assert.equal(packet.docs.bundleManifest, 'packages/mcp-server/mcpb.manifest.json');
  assert.equal(packet.package.mcpName, pkg.mcpName);
  assert.equal(packet.server.transport, 'stdio');
});

serialTest('OpenClaw audit treats the current repo as a compatible bundle when Claude-style roots exist', () => {
  const stdout = execFileSync('node', ['scripts/audit-public-distribution.mjs'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  assert.match(stdout, /OpenClaw route \| plugin-grade repo bundle/);
});

serialTest('audit promotes mcp-readonly to a registry candidate once no private deps remain', () => {
  const stdout = execFileSync('node', ['scripts/audit-public-distribution.mjs'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  assert.match(stdout, /@campus-copilot\/mcp-readonly \| public-ready \(repo-local\) \| registry candidate/);
});

serialTest('@campus-copilot/provider-runtime tarball installs and imports in a fresh temp workspace', () => {
  const packDir = mkdtempSync(join(tmpdir(), 'campus-copilot-provider-runtime-pack-'));
  const workspaceDir = createTempWorkspace('campus-copilot-provider-runtime-proof-');

  try {
    const tarballPath = packTarball('packages/provider-runtime', packDir);
    installTarball(workspaceDir, tarballPath);

    const stdout = execFileSync(
      'node',
      [
        '-e',
        "import('@campus-copilot/provider-runtime').then((m)=>{console.log([typeof m.ProviderStatusResponseSchema, typeof m.buildSwitchyardInput].join(','))})",
      ],
      {
        cwd: workspaceDir,
        encoding: 'utf8',
        stdio: 'pipe',
      },
    );

    assert.match(stdout, /object,function/);
  } finally {
    rmSync(packDir, { force: true, recursive: true });
    rmSync(workspaceDir, { force: true, recursive: true });
  }
});

serialTest('@campus-copilot/cli tarball installs and runs in a fresh temp workspace', () => {
  const packDir = mkdtempSync(join(tmpdir(), 'campus-copilot-cli-pack-'));
  const workspaceDir = createTempWorkspace('campus-copilot-cli-proof-');

  try {
    const tarballPath = packTarball('packages/cli', packDir);
    installTarball(workspaceDir, tarballPath);
    const installedManifest = JSON.parse(
      readFileSync(join(workspaceDir, 'node_modules', '@campus-copilot', 'cli', 'package.json'), 'utf8'),
    );
    const cliEntrypoint = join(
      workspaceDir,
      'node_modules',
      '@campus-copilot',
      'cli',
      installedManifest.bin['campus-copilot'],
    );

    const stdout = execFileSync(process.execPath, [cliEntrypoint, 'help'], {
      cwd: workspaceDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    assert.match(stdout, /campus-copilot <command> \[--flags\]/);
    assert.match(stdout, /snapshot export/);
  } finally {
    rmSync(packDir, { force: true, recursive: true });
    rmSync(workspaceDir, { force: true, recursive: true });
  }
});
