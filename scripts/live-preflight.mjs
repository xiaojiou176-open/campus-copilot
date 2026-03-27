import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';
import { randomUUID } from 'node:crypto';

function runCommand(command, args) {
  try {
    return {
      ok: true,
      stdout: execFileSync(command, args, {
        encoding: 'utf8',
        cwd: process.cwd(),
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

function parseDiskCheck(output) {
  const match = output.match(/available_kb=(\d+).*required_kb=(\d+)/);
  return {
    raw: output,
    availableKb: match ? Number(match[1]) : undefined,
    requiredKb: match ? Number(match[2]) : undefined,
  };
}

function extractJsonFromOutput(output) {
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

function summarizeLiveProbe(parsedProbe) {
  const results = parsedProbe?.results;
  if (!Array.isArray(results)) {
    return undefined;
  }

  const campusSites = ['canvas', 'gradescope', 'edstem', 'myuw'];
  const providerSites = ['openai', 'gemini'];

  const campus = Object.fromEntries(
    campusSites.map((name) => {
      const match = results.find((entry) => entry?.name === name);
      return [
        name,
        {
          classification: match?.classification ?? 'unknown',
          finalUrl: match?.finalUrl,
        },
      ];
    }),
  );

  const providersWeb = Object.fromEntries(
    providerSites.map((name) => {
      const match = results.find((entry) => entry?.name === name);
      return [
        name,
        {
          classification: match?.classification ?? 'unknown',
          finalUrl: match?.finalUrl,
        },
      ];
    }),
  );

  return {
    campus,
    providersWeb,
    campusReady: campusSites.every((name) => campus[name].classification === 'likely_authenticated'),
  };
}

function classifyCommand(result, options = {}) {
  if (result.ok) {
    return {
      status: 'ok',
      parsed: extractJsonFromOutput(result.stdout),
      output: result.stdout,
    };
  }

  return {
    status: result.status === 2 ? 'blocked' : 'failed',
    parsed: extractJsonFromOutput(result.stdout || result.stderr),
    output: result.stdout || result.stderr,
    ...options,
  };
}

const chromeExecutable = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profileDir = process.env.CHROME_PROFILE_DIR || `${process.env.HOME}/.chrome-debug-profile`;
const runId = randomUUID();

const diskCheck = runCommand('bash', ['scripts/check-disk-space.sh', '262144', '/tmp']);
const providerKeyStatus = {
  openai: Boolean(process.env.OPENAI_API_KEY),
  gemini: Boolean(process.env.GEMINI_API_KEY),
};

const apiSmokeResult = runCommand('pnpm', ['smoke:api']);
const probeResult = runCommand('pnpm', ['probe:live']);
const parsedApiSmoke = extractJsonFromOutput(apiSmokeResult.stdout || apiSmokeResult.stderr || '');
const parsedProbe = extractJsonFromOutput(probeResult.stdout || probeResult.stderr || '');
const liveSummary = summarizeLiveProbe(parsedProbe);

const blockers = [];
if (!diskCheck.ok) blockers.push('disk_space');
if (!providerKeyStatus.openai && !providerKeyStatus.gemini) blockers.push('provider_keys_missing');
if (!probeResult.ok) blockers.push('live_probe');
if (liveSummary && !liveSummary.campusReady) blockers.push('site_login_required');
if (liveSummary?.providersWeb.openai?.classification === 'edge_protected_or_interstitial') blockers.push('openai_web_interstitial');

const nextActions = [];
if (!diskCheck.ok) nextActions.push('Run `pnpm cleanup:runtime` or free temporary disk space, then retry `pnpm preflight:live`.');
if (!providerKeyStatus.openai && !providerKeyStatus.gemini) nextActions.push('Set `OPENAI_API_KEY` or `GEMINI_API_KEY`, then retry `pnpm smoke:provider`.');
if (!probeResult.ok) nextActions.push('Prepare a usable authenticated browser session, then retry `pnpm probe:live`.');
if (probeResult.ok && !providerKeyStatus.openai && !providerKeyStatus.gemini) nextActions.push('The local probe layer is ready; the next blocker is provider credentials.');
if (liveSummary && !liveSummary.campusReady) {
  const blockedSites = Object.entries(liveSummary.campus)
    .filter(([, value]) => value.classification !== 'likely_authenticated')
    .map(([name]) => name);
  nextActions.push(`Campus sites still missing a usable authenticated session: ${blockedSites.join(', ')}. Sign in on those sites, then retry \`pnpm probe:live\`.`);
}
if (liveSummary?.providersWeb.openai?.classification === 'edge_protected_or_interstitial') {
  nextActions.push('The OpenAI web surface currently looks protected or interstitial. Confirm the web challenge manually before treating it as a product-path regression.');
}

console.log(
  JSON.stringify(
    {
      runId,
      checkedAt: new Date().toISOString(),
      chromeExecutable: {
        label: basename(chromeExecutable),
        exists: existsSync(chromeExecutable),
      },
      chromeProfile: {
        label: basename(profileDir),
        source: process.env.CHROME_PROFILE_DIR ? 'env' : 'default',
        exists: existsSync(profileDir),
      },
      disk: diskCheck.ok
        ? {
            status: 'ok',
            ...parseDiskCheck(diskCheck.stdout),
          }
        : {
            status: 'blocked',
            ...parseDiskCheck(diskCheck.stderr || diskCheck.stdout),
          },
      providerKeys: providerKeyStatus,
      providerRoundtripReady: providerKeyStatus.openai || providerKeyStatus.gemini,
      apiSmoke: classifyCommand(apiSmokeResult),
      liveProbe: classifyCommand(probeResult),
      liveSummary,
      blockers,
      nextActions,
    },
    null,
    2,
  ),
);
