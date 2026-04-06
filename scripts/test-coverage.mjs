import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = process.cwd();
const outputDir = resolve(rootDir, '.runtime-cache/coverage');

export function shouldRetryVitestCoverageRun({ status, combinedOutput, coverageDir, aggregateOutputDir = outputDir }) {
  if (status === 0) {
    return false;
  }

  if (!combinedOutput.includes('ENOENT')) {
    return false;
  }

  const normalizedCoverageDir = coverageDir.replaceAll('\\', '/');
  const normalizedAggregateOutputDir = aggregateOutputDir.replaceAll('\\', '/');
  const normalizedOutput = combinedOutput.replaceAll('\\', '/');
  return normalizedOutput.includes(normalizedCoverageDir) || normalizedOutput.includes(normalizedAggregateOutputDir);
}

function findWorkspacePackageJsons(baseDir) {
  const absBaseDir = resolve(rootDir, baseDir);
  return readdirSync(absBaseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(absBaseDir, entry.name, 'package.json'))
    .filter((packageJsonPath) => existsSync(packageJsonPath));
}

function collectFiles(baseDir, matcher, results = []) {
  for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
    const absolutePath = join(baseDir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(absolutePath, matcher, results);
      continue;
    }
    if (matcher(absolutePath)) {
      results.push(absolutePath);
    }
  }
  return results;
}

function parseVitestArgs(testScript) {
  const tokens = testScript.trim().split(/\s+/);
  if (tokens[0] !== 'vitest') {
    return null;
  }
  return tokens.slice(1);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function addMetricTotals(target, incoming) {
  for (const key of ['lines', 'statements', 'functions', 'branches']) {
    target[key].total += incoming[key].total;
    target[key].covered += incoming[key].covered;
    target[key].skipped += incoming[key].skipped;
  }
}

function finalizeMetricPcts(target) {
  for (const key of ['lines', 'statements', 'functions', 'branches']) {
    const metric = target[key];
    metric.pct = metric.total === 0 ? 100 : Number(((metric.covered / metric.total) * 100).toFixed(2));
  }
}

function runVitestCoverage(packageDir, vitestArgs, coverageDir) {
  const run = () =>
    spawnSync(
      'pnpm',
      [
        '--dir',
        packageDir,
        'exec',
        'vitest',
        ...vitestArgs,
        '--coverage.enabled=true',
        '--coverage.clean=false',
        '--coverage.provider=v8',
        '--coverage.reporter=json-summary',
        '--coverage.reporter=text-summary',
        `--coverage.reportsDirectory=${coverageDir}`,
      ],
      {
        cwd: rootDir,
        encoding: 'utf8',
        env: process.env,
      },
    );

  let result = run();
  const combinedOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const isCoverageTempFlake = shouldRetryVitestCoverageRun({
    status: result.status ?? 1,
    combinedOutput,
    coverageDir,
  });

  if (isCoverageTempFlake) {
    mkdirSync(coverageDir, { recursive: true });
    mkdirSync(join(coverageDir, '.tmp'), { recursive: true });
    result = run();
  }

  return result;
}

export function main() {
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  const packageJsonPaths = [...findWorkspacePackageJsons('apps'), ...findWorkspacePackageJsons('packages')];
  const coverageAggregate = {
    generatedAt: new Date().toISOString(),
    scope:
      'Aggregated workspace vitest coverage only. This does not include repo node:test lanes or Playwright smoke lanes.',
    testPyramid: {
      workspaceVitestPackages: 0,
      workspaceVitestFiles: 0,
      repoNodeTestFiles: 0,
      extensionPlaywrightSmokeSpecs: 0,
      manualLiveCommands: [
        'pnpm preflight:live',
        'pnpm diagnose:live',
        'pnpm probe:live',
        'pnpm redact:live-fixture',
      ],
    },
    packages: [],
    total: {
      lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
      statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
      functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
      branches: { total: 0, covered: 0, skipped: 0, pct: 0 },
    },
  };

  for (const packageJsonPath of packageJsonPaths) {
    const manifest = readJson(packageJsonPath);
    const testScript = manifest?.scripts?.test;
    const vitestArgs = typeof testScript === 'string' ? parseVitestArgs(testScript) : null;

    if (!vitestArgs) {
      continue;
    }

    const packageDir = dirname(packageJsonPath);
    const relativePackageDir = packageDir.replace(`${rootDir}/`, '');
    const coverageDir = join(outputDir, relativePackageDir);
    mkdirSync(coverageDir, { recursive: true });
    mkdirSync(join(coverageDir, '.tmp'), { recursive: true });

    const result = runVitestCoverage(packageDir, vitestArgs, coverageDir);

    if (result.status !== 0) {
      process.stdout.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
      process.exit(result.status ?? 1);
    }

    const summaryPath = join(coverageDir, 'coverage-summary.json');
    const summary = readJson(summaryPath);
    const total = summary.total;

    coverageAggregate.packages.push({
      name: manifest.name,
      dir: relativePackageDir,
      summaryPath: summaryPath.replace(`${rootDir}/`, ''),
      total,
    });
    coverageAggregate.testPyramid.workspaceVitestPackages += 1;
    coverageAggregate.testPyramid.workspaceVitestFiles += collectFiles(
      packageDir,
      (filePath) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(filePath),
    ).length;
    addMetricTotals(coverageAggregate.total, total);
  }

  coverageAggregate.testPyramid.repoNodeTestFiles = collectFiles(
    join(rootDir, 'scripts'),
    (filePath) => filePath.endsWith('.test.mjs'),
  ).length;
  coverageAggregate.testPyramid.extensionPlaywrightSmokeSpecs = collectFiles(
    join(rootDir, 'apps/extension/tests'),
    (filePath) => filePath.endsWith('.spec.ts'),
  ).length;

  finalizeMetricPcts(coverageAggregate.total);

  const aggregatePath = join(outputDir, 'coverage-summary.json');
  writeFileSync(aggregatePath, `${JSON.stringify(coverageAggregate, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        outputPath: relative(rootDir, aggregatePath),
        packageCount: coverageAggregate.packages.length,
        total: coverageAggregate.total,
        scope: coverageAggregate.scope,
        testPyramid: coverageAggregate.testPyramid,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
