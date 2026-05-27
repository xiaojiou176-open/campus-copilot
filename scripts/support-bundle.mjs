import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { ensureDirectory, getCacheGovernancePolicy } from './lib/cache-governance.mjs';
import { buildSupportHighlights, extractLastJsonFromOutput, parsePositiveInt } from './live-probe-shared.mjs';

const diagnoseTimeoutMs = parsePositiveInt(process.env.SUPPORT_BUNDLE_DIAGNOSE_TIMEOUT_MS, 45000);
const cachePolicy = getCacheGovernancePolicy(process.env);
ensureDirectory(cachePolicy.externalCacheHome);

function run(command, args, options = {}) {
  try {
    return {
      ok: true,
      stdout: execFileSync(command, args, {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: options.timeoutMs,
      }).trim(),
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error instanceof Error && 'stdout' in error ? String(error.stdout).trim() : '',
      stderr: error instanceof Error && 'stderr' in error ? String(error.stderr).trim() : String(error),
      status: error instanceof Error && 'status' in error ? error.status : undefined,
    };
  }
}

function sanitizeString(value) {
  return value
    .replaceAll(process.cwd(), '<repo-root>')
    .replaceAll(process.env.HOME ?? '', '<home>');
}

function sanitizeUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return sanitizeString(value);
  }
}

function sanitizeForBundle(value, key) {
  if (key === 'output') {
    return undefined;
  }

  if (key === 'bodyPreview') {
    return '<redacted-body-preview>';
  }

  if (key === 'title') {
    return '<redacted-title>';
  }

  if (key === 'messageText') {
    return '<redacted-console-message>';
  }

  if (key === 'errorText') {
    return '<redacted-page-error>';
  }

  if (typeof value === 'string') {
    if (key === 'requestedUrl' || key === 'finalUrl' || key === 'cdpUrl' || value.startsWith('http://') || value.startsWith('https://')) {
      return sanitizeUrl(value);
    }
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeForBundle(entry))
      .filter((entry) => entry !== undefined);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([childKey, childValue]) => [childKey, sanitizeForBundle(childValue, childKey)])
        .filter(([, childValue]) => childValue !== undefined),
    );
  }

  return value;
}

function readCoverageSummary(rootDir) {
  const coveragePath = join(rootDir, '.runtime-cache', 'coverage', 'coverage-summary.json');
  try {
    const raw = readFileSync(coveragePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      outputPath: relative(rootDir, coveragePath),
      generatedAt: parsed.generatedAt,
      scope: parsed.scope,
      total: parsed.total,
      testPyramid: parsed.testPyramid,
    };
  } catch {
    return undefined;
  }
}

const runId = randomUUID();
const coverageSummary = readCoverageSummary(process.cwd());
const diagnose = run('pnpm', ['diagnose:live'], { timeoutMs: diagnoseTimeoutMs });
const gitStatus = run('git', ['status', '--short']);
const gitBranch = run('git', ['branch', '--show-current']);
const gitHead = run('git', ['rev-parse', 'HEAD']);
const gitHeadShort = run('git', ['log', '-1', '--oneline']);
const nodeVersion = run('node', ['-v']);
const pnpmVersion = run('pnpm', ['-v']);
const statusShort = gitStatus.stdout;
const worktreeClean = statusShort.length === 0;
const diagnoseParsed = extractLastJsonFromOutput(diagnose.stdout || diagnose.stderr || '');
const liveSummary = diagnoseParsed?.liveSummary;
const debugProcesses = diagnoseParsed?.liveProbe?.parsed?.debugChrome?.processes ?? [];
const observedDebugUserDataDirLabels = Array.from(
  new Set(debugProcesses.map((processInfo) => processInfo?.userDataDirLabel).filter(Boolean)),
);
const observedDebugProfileDirectories = Array.from(
  new Set(debugProcesses.map((processInfo) => processInfo?.profileDirectory).filter(Boolean)),
);

const supportBundle = {
  runId,
  generatedAt: new Date().toISOString(),
  summary: {
    head: gitHead.stdout || 'unknown',
    headShort: gitHeadShort.stdout || 'unknown',
    branch: gitBranch.stdout || 'unknown',
    worktreeClean,
    diagnoseStatus: diagnose.ok ? 'ok' : diagnose.status === 2 ? 'blocked' : 'failed',
    blockerCount: Array.isArray(diagnoseParsed?.blockers) ? diagnoseParsed.blockers.length : 0,
    attachStatus: liveSummary?.attachStatus,
    attachMode: liveSummary?.attachModeResolved,
    requestedProfileLabel: diagnoseParsed?.requestedProfileLabel,
    requestedUserDataDirLabel: diagnoseParsed?.chromeProfile?.userDataDirLabel,
    profileConfirmationStatus: diagnoseParsed?.profileConfirmation?.status,
    profileConfirmationEvidence: diagnoseParsed?.profileConfirmation?.evidence,
    profileConfirmed: diagnoseParsed?.profileConfirmation?.confirmed,
    observedDebugUserDataDirLabels,
    observedDebugProfileDirectories,
    profileMismatch:
      liveSummary?.attachStatus === 'profile_mismatch' ||
      (Array.isArray(liveSummary?.profileMismatchSites) && liveSummary.profileMismatchSites.length > 0),
  },
  readableSummary: [],
  diagnose: {
    status: diagnose.ok ? 'ok' : diagnose.status === 2 ? 'blocked' : 'failed',
    parsed: sanitizeForBundle(diagnoseParsed),
  },
  git: {
    branch: gitBranch.stdout || 'unknown',
    head: gitHead.stdout || 'unknown',
    headShort: gitHeadShort.stdout || 'unknown',
    statusShort,
    worktreeClean,
  },
  runtime: {
    nodeVersion: nodeVersion.stdout,
    pnpmVersion: pnpmVersion.stdout,
    diagnoseTimeoutMs,
    cachePolicy: {
      externalCacheHome: cachePolicy.externalCacheHome,
      externalCacheTtlHours: cachePolicy.externalCacheTtlHours,
      externalCacheMaxMb: cachePolicy.externalCacheMaxMb,
    },
  },
  ...(coverageSummary
    ? {
        coverage: coverageSummary,
      }
    : {}),
};

supportBundle.readableSummary = buildSupportHighlights(supportBundle);

const outputDir = join(process.cwd(), '.runtime-cache');
mkdirSync(outputDir, { recursive: true });

const filename = `campus-copilot-support-bundle-${new Date().toISOString().replace(/[:]/g, '-')}.json`;
const outputPath = join(outputDir, filename);
const relativeOutputPath = relative(process.cwd(), outputPath) || `.runtime-cache/${filename}`;
writeFileSync(outputPath, JSON.stringify(supportBundle, null, 2), 'utf8');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      runId,
      outputPath: relativeOutputPath,
      bundle: supportBundle,
    },
    null,
    2,
  ),
);
