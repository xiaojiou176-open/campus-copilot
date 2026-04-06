import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { ensureDirectory, getCacheGovernancePolicy } from './lib/cache-governance.mjs';
import {
  buildProbeHeader,
  buildProfileAlignmentRecommendation,
  buildRemoteDebugRelaunchRecommendation,
  describeRequestedProfileEvidence,
  extractJsonFromOutput,
  parsePositiveInt,
  resolveChromeSessionConfig,
  summarizeLiveProbe,
} from './live-probe-shared.mjs';

const probeTimeoutMs = parsePositiveInt(process.env.LIVE_PROBE_TIMEOUT_MS, 30000);
const sessionConfig = resolveChromeSessionConfig(process.env);
const cachePolicy = getCacheGovernancePolicy(process.env);
ensureDirectory(cachePolicy.externalCacheHome);

function runCommand(command, args, options = {}) {
  try {
    return {
      ok: true,
      stdout: execFileSync(command, args, {
        encoding: 'utf8',
        cwd: process.cwd(),
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

function parseDiskCheck(output) {
  const match = output.match(/available_kb=(\d+).*required_kb=(\d+)/);
  return {
    raw: output,
    availableKb: match ? Number(match[1]) : undefined,
    requiredKb: match ? Number(match[2]) : undefined,
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

const runId = randomUUID();

const diskCheck = runCommand('bash', ['scripts/check-disk-space.sh', '262144', '/tmp']);
const providerKeyStatus = {
  openai: Boolean(process.env.OPENAI_API_KEY),
  gemini: Boolean(process.env.GEMINI_API_KEY),
};

const apiSmokeResult = runCommand('pnpm', ['smoke:api']);
const probeResult =
  sessionConfig.browserRootRequirementStatus === 'ready'
    ? runCommand('pnpm', ['probe:live'], { timeoutMs: probeTimeoutMs })
    : {
        ok: false,
        stdout: '',
        stderr: sessionConfig.browserRootRequirementMessage ?? 'browser_root_not_bootstrapped',
        status: 2,
      };
const parsedApiSmoke = extractJsonFromOutput(apiSmokeResult.stdout || apiSmokeResult.stderr || '');
const parsedProbe = extractJsonFromOutput(probeResult.stdout || probeResult.stderr || '');
const liveSummary = summarizeLiveProbe(parsedProbe);
const campusNextSteps = liveSummary?.campusNextSteps ?? {};
const debugChromeSummary = parsedProbe?.debugChrome;
const debugProcessPresentWithoutListener =
  Number(debugChromeSummary?.processCount ?? 0) > 0 && Number(debugChromeSummary?.listenerCount ?? 0) === 0;
const activeDebugListener = Array.isArray(parsedProbe?.debugChrome?.processes)
  ? parsedProbe.debugChrome.processes.find((processInfo) => processInfo?.listening) ??
    (parsedProbe.debugChrome.processes.length === 1 ? parsedProbe.debugChrome.processes[0] : undefined)
  : undefined;
const activeDebugListenerSummary = activeDebugListener
  ? {
      listenerPid: activeDebugListener.pid,
      userDataDirLabel: activeDebugListener.userDataDirLabel,
      profileDirectory: activeDebugListener.profileDirectory,
    }
  : undefined;
const recommendedProfile = buildProfileAlignmentRecommendation(activeDebugListener, parsedProbe?.cdpUrl);
const recommendedRelaunch = buildRemoteDebugRelaunchRecommendation(activeDebugListener, parsedProbe?.cdpUrl);
const requestedProfileMatchesActiveListener =
  Boolean(activeDebugListener?.userDataDir) &&
  Boolean(activeDebugListener?.profileDirectory) &&
  activeDebugListener?.userDataDir === sessionConfig.userDataDir &&
  activeDebugListener?.profileDirectory === sessionConfig.profileDirectory;
const persistentProfileInUse =
  typeof parsedProbe?.persistentFallbackError === 'string' &&
  parsedProbe.persistentFallbackError.includes('ProcessSingleton');
const profileConfirmation = describeRequestedProfileEvidence({
  requestedProfileLabel: sessionConfig.requestedProfileLabel,
  profileDirectory: sessionConfig.profileDirectory,
  chromeProfile: {
    label: sessionConfig.requestedProfileLabel,
    userDataDirLabel: sessionConfig.userDataDirLabel,
    profileDirectory: sessionConfig.profileDirectory,
  },
  liveProbe: {
    parsed: parsedProbe,
  },
  liveSummary,
  activeDebugListener: activeDebugListenerSummary,
});

const blockers = [];
if (!diskCheck.ok) blockers.push('disk_space');
if (!providerKeyStatus.openai && !providerKeyStatus.gemini) blockers.push('provider_keys_missing');
if (sessionConfig.browserRootRequirementStatus !== 'ready') blockers.push('browser_root_not_bootstrapped');
if (!probeResult.ok) blockers.push('live_probe');
if (liveSummary?.attachStatus?.includes('attach_failed')) blockers.push('attach_failed');
if (debugProcessPresentWithoutListener) blockers.push('debug_listener_not_ready');
if (liveSummary?.attachStatus === 'profile_mismatch' || liveSummary?.profileMismatchSites?.length) blockers.push('profile_mismatch');
if (liveSummary?.campusSessionResumableSites?.length) blockers.push('site_session_resumable');
if (liveSummary?.campusMfaRequiredSites?.length) blockers.push('site_mfa_required');
if (liveSummary?.campusLoggedOutSites?.length) blockers.push('site_logged_out');
if (liveSummary?.campusNotOpenSites?.length) blockers.push('site_not_open');

const nextActions = [];
if (!diskCheck.ok) nextActions.push('Run `pnpm cleanup:runtime` or free temporary disk space, then retry `pnpm preflight:live`.');
if (!providerKeyStatus.openai && !providerKeyStatus.gemini) nextActions.push('Set `OPENAI_API_KEY` or `GEMINI_API_KEY`, then retry `pnpm smoke:provider`.');
if (sessionConfig.browserRootRequirementStatus !== 'ready') {
  nextActions.push(
    sessionConfig.browserRootRequirementMessage ??
      'Bootstrap the repo-owned browser root before retrying live validation.',
  );
  nextActions.push(
    `Recommended repo-owned live root: \`CHROME_USER_DATA_DIR="${cachePolicy.browserUserDataRoot}"\` plus \`CHROME_PROFILE_NAME="${cachePolicy.browserProfileDirectory}"\`.`,
  );
  nextActions.push('Run `pnpm browser:bootstrap` and then `pnpm browser:bootstrap:apply`, after closing Chrome instances that still use the default source root.');
  nextActions.push('After bootstrap, run `pnpm browser:launch` once and reuse that single instance via CDP attach.');
}
if (!probeResult.ok && sessionConfig.browserRootRequirementStatus === 'ready') {
  nextActions.push('Prepare a usable authenticated browser session, then retry `pnpm probe:live`.');
}
if (probeResult.ok && !providerKeyStatus.openai && !providerKeyStatus.gemini) nextActions.push('The local probe layer is ready; the next blocker is provider credentials.');
if (liveSummary?.attachStatus?.includes('attach_failed')) {
  nextActions.push(`The browser attach step did not become usable. Retry with \`CHROME_ATTACH_MODE=page\` or \`CHROME_ATTACH_MODE=persistent\`, then rerun \`pnpm probe:live\`.`);
}
if (liveSummary?.attachFailure === 'cdp_http_404_no_targets') {
  nextActions.push('The repo-owned debug port responded with HTTP 404 and did not expose any Chrome targets. Check `pnpm browser:attach-check`, then relaunch the single repo-owned Chrome instance with `pnpm browser:launch`.');
}
if (liveSummary?.attachFailure === 'cdp_ws_forbidden') {
  nextActions.push('Chrome exposed a DevToolsActivePort websocket, but rejected the automation attach. Reuse the current signed-in profile manually or relaunch the intended profile with an automation-friendly debug listener before retrying `pnpm probe:live`.');
}
if (debugProcessPresentWithoutListener) {
  let requestedPort = '9222';
  try {
    const parsed = new URL(parsedProbe?.cdpUrl ?? sessionConfig.cdpCandidateUrls?.[0] ?? 'http://localhost:9222');
    requestedPort = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  } catch {}
  const debugProcessHint =
    activeDebugListener?.profileDirectory || activeDebugListener?.userDataDirLabel
      ? ` Detected Chrome process: ${activeDebugListener?.profileDirectory ?? 'unknown profile'} @ ${activeDebugListener?.userDataDirLabel ?? 'unknown user-data-dir label'}.`
      : '';
  nextActions.push(
    `A Chrome process was launched for the requested debug port, but no DevTools listener became reachable on port ${requestedPort}.${debugProcessHint} Close stale Chrome instances or relaunch the requested profile, then rerun \`pnpm diagnose:live\`.`,
  );
  if (recommendedRelaunch?.relaunchCommand) {
    nextActions.push(`Copy-ready relaunch command: \`${recommendedRelaunch.relaunchCommand}\``);
  }
}
if (requestedProfileMatchesActiveListener) {
  nextActions.push('The requested profile already matches the active debug listener, so the remaining blocker is no longer profile selection.');
}
if (persistentProfileInUse) {
  nextActions.push('The repo-owned profile is already in use, which is expected under the single-instance contract. Reuse the current listener instead of launching a second browser.');
}
if (liveSummary?.attachStatus === 'profile_mismatch' || liveSummary?.profileMismatchSites?.length) {
  const activeListenerHint =
    activeDebugListener?.profileDirectory || activeDebugListener?.userDataDirLabel
      ? ` Detected active debug listener: ${activeDebugListener?.profileDirectory ?? 'unknown profile'} @ ${activeDebugListener?.userDataDirLabel ?? 'unknown user-data-dir label'}.`
      : '';
  nextActions.push(
    `The attached session differs from the requested profile for: ${liveSummary?.profileMismatchSites?.join(', ') || 'the current probe'}.${activeListenerHint} Align \`CHROME_USER_DATA_DIR\` / \`CHROME_PROFILE_NAME\` (or \`CHROME_PROFILE_DIRECTORY\`) with that active debug browser, or relaunch the debug Chrome instance with the intended profile, then rerun \`pnpm probe:live\`.`,
  );
  if (recommendedProfile?.probeCommand) {
    nextActions.push(`Copy-ready probe command: \`${recommendedProfile.probeCommand}\``);
  }
  if (recommendedProfile?.diagnoseCommand) {
    nextActions.push(`Copy-ready diagnose command: \`${recommendedProfile.diagnoseCommand}\``);
  }
}
if (liveSummary?.campusSessionResumableSites?.length) {
  nextActions.push(`Campus sites still have resumable school SSO sessions: ${liveSummary.campusSessionResumableSites.join(', ')}. Continue the canonical SSO re-entry in the requested profile, then retry \`pnpm probe:live\`.`);
  for (const site of liveSummary.campusSessionResumableSites) {
    if (campusNextSteps[site]) {
      nextActions.push(campusNextSteps[site]);
    }
  }
}
if (liveSummary?.campusMfaRequiredSites?.length) {
  nextActions.push(`Campus sites still require human MFA approval: ${liveSummary.campusMfaRequiredSites.join(', ')}. Complete the Duo / Touch ID step in the requested profile, then retry \`pnpm probe:live\`.`);
  for (const site of liveSummary.campusMfaRequiredSites) {
    if (campusNextSteps[site]) {
      nextActions.push(campusNextSteps[site]);
    }
  }
}
if (liveSummary?.campusLoggedOutSites?.length) {
  nextActions.push(`Campus sites are currently logged out: ${liveSummary.campusLoggedOutSites.join(', ')}. Use the canonical sign-in path in the requested profile, then retry \`pnpm probe:live\`.`);
  for (const site of liveSummary.campusLoggedOutSites) {
    if (campusNextSteps[site]) {
      nextActions.push(campusNextSteps[site]);
    }
  }
}
if (liveSummary?.campusNotOpenSites?.length) {
  nextActions.push(`Some campus sites were not open in the current attached context: ${liveSummary.campusNotOpenSites.join(', ')}. Open them in the requested profile or rerun with \`CHROME_ATTACH_MODE=persistent\`.`);
  for (const site of liveSummary.campusNotOpenSites) {
    if (campusNextSteps[site]) {
      nextActions.push(campusNextSteps[site]);
    }
  }
}

console.log(
  JSON.stringify(
    {
      runId,
      checkedAt: new Date().toISOString(),
      ...buildProbeHeader(sessionConfig),
      chromeExecutable: {
        label: 'Google Chrome',
        exists: existsSync(sessionConfig.executablePath),
      },
      cachePolicy: {
        externalCacheHome: cachePolicy.externalCacheHome,
        managedExternalCacheRoot: cachePolicy.managedExternalCacheRoot,
        browserUserDataRoot: cachePolicy.browserUserDataRoot,
        browserProfileDirectory: cachePolicy.browserProfileDirectory,
        browserDisplayName: cachePolicy.browserProfileDisplayName,
        browserCdpPort: cachePolicy.browserCdpPort,
        sourceChromeRoot: cachePolicy.sourceChromeRoot,
        sourceProfileDirectory: cachePolicy.sourceProfileDirectory,
        externalCacheTtlHours: cachePolicy.externalCacheTtlHours,
        externalCacheMaxMb: cachePolicy.externalCacheMaxMb,
      },
      chromeProfile: {
        label: sessionConfig.requestedProfileLabel,
        source: sessionConfig.profileSource,
        userDataDirLabel: sessionConfig.userDataDirLabel,
        userDataDirSource: sessionConfig.userDataDirSource,
        profileDirectory: sessionConfig.profileDirectory,
        requirementStatus: sessionConfig.browserRootRequirementStatus,
        missingEnvVars: sessionConfig.missingEnvVars,
        exists: Boolean(sessionConfig.userDataDir) && existsSync(sessionConfig.userDataDir),
        bootstrapped: sessionConfig.browserRootBootstrapped,
        confirmationStatus: profileConfirmation.status,
        confirmationEvidence: profileConfirmation.evidence,
        confirmed: profileConfirmation.confirmed,
      },
      liveProbeTimeoutMs: probeTimeoutMs,
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
      activeDebugListener: activeDebugListenerSummary,
      profileConfirmation,
      recommendedProfile,
      recommendedRelaunch,
      blockers,
      nextActions,
    },
    null,
    2,
  ),
);
