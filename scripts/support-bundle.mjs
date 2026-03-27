import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

function run(command, args) {
  try {
    return {
      ok: true,
      stdout: execFileSync(command, args, {
        cwd: process.cwd(),
        encoding: 'utf8',
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

function extractJson(output) {
  const trimmed = output.trim();
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace === -1) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed.slice(firstBrace));
  } catch {
    return undefined;
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

  if (typeof value === 'string') {
    if (key === 'requestedUrl' || key === 'finalUrl' || key === 'cdpUrl') {
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

const runId = randomUUID();
const diagnose = run('pnpm', ['diagnose:live']);
const gitStatus = run('git', ['status', '--short']);
const gitBranch = run('git', ['branch', '--show-current']);
const gitHead = run('git', ['rev-parse', 'HEAD']);
const gitHeadShort = run('git', ['log', '-1', '--oneline']);
const nodeVersion = run('node', ['-v']);
const pnpmVersion = run('pnpm', ['-v']);
const statusShort = gitStatus.stdout;
const worktreeClean = statusShort.length === 0;
const diagnoseParsed = extractJson(diagnose.stdout || diagnose.stderr || '');

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
  },
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
  },
};

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
