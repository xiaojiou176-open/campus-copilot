import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import {
  CANONICAL_CHROME_PROFILE_DIRECTORY,
  CANONICAL_CHROME_PROFILE_DISPLAY_NAME,
  SOURCE_CHROME_PROFILE_DIRECTORY,
  classifyMissingTarget,
  classifyPage as classifyPageCore,
  parseAttachTimeoutMs,
  parseRemoteChromeProcesses,
  resolveChromeProfile,
  summarizeRemoteChromeProcesses,
} from './lib/live-probe-core.mjs';
import { getCacheGovernancePolicy, readBrowserInstanceState } from './lib/cache-governance.mjs';

export const DEFAULT_CHROME_EXECUTABLE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const DEFAULT_NAVIGATION_TIMEOUT_MS = 12000;
export const SUPPORTED_ATTACH_MODES = ['auto', 'browser', 'page', 'persistent'];
export const AUTH_BOUNDARIES = [
  'authenticated',
  'session_resumable',
  'mfa_required',
  'logged_out',
  'not_open',
  'profile_mismatch',
  'attach_failed',
];
export const SITE_TARGETS = [
  ['canvas', 'https://canvas.uw.edu'],
  ['gradescope', 'https://www.gradescope.com/auth/saml/uw'],
  ['edstem', 'https://edstem.org/us/dashboard'],
  ['myuw', 'https://my.uw.edu'],
  ['openai', 'https://platform.openai.com'],
  ['gemini', 'https://aistudio.google.com'],
];

function normalizeAttachMode(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'cdp') {
    return 'browser';
  }
  if (normalized === 'existing_tab' || normalized === 'persistent_context') {
    return 'page';
  }
  return SUPPORTED_ATTACH_MODES.includes(normalized) ? normalized : 'auto';
}

export function buildChromeProfileEnvHint(homeDir = '$HOME') {
  return {
    CHROME_USER_DATA_DIR: `${homeDir}/.cache/campus-copilot/browser/chrome-user-data`,
    CHROME_PROFILE_NAME: CANONICAL_CHROME_PROFILE_DIRECTORY,
  };
}

export function getChromeProfileRequirement(sessionConfig) {
  if (sessionConfig.browserRootRequirementStatus === 'ready') {
    return {
      ok: true,
      status: 'ready',
    };
  }

  const envHint = buildChromeProfileEnvHint();
  return {
    ok: false,
    status: sessionConfig.browserRootRequirementStatus,
    envHint,
    message: sessionConfig.browserRootRequirementMessage,
    nextActions: sessionConfig.browserRootNextActions,
  };
}

export function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function describeCdpHttpFailure(path, statusCode) {
  if (!Number.isFinite(statusCode)) {
    return undefined;
  }

  const normalizedPath = String(path || '').trim() || '/';
  if (
    statusCode === 404 &&
    ['/json/version', '/json/version/', '/json/list', '/json/list/'].includes(normalizedPath)
  ) {
    return 'cdp_http_404_no_targets';
  }

  const sanitizedPath = normalizedPath.replaceAll('/', '_').replaceAll(/[^a-zA-Z0-9_]/g, '');
  return `cdp_http_${statusCode}${sanitizedPath ? `_${sanitizedPath}` : ''}`;
}

export function describeCdpConnectError(error) {
  const message = String(error ?? '');
  if (/403 Forbidden/i.test(message) || /Connection rejected/i.test(message)) {
    return 'cdp_ws_forbidden';
  }

  return message;
}

export function normalizeCdpConnectUrl(value) {
  if (!value) {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return value;
  }
}

export function parseDevToolsActivePort(rawContents = '') {
  const [portLine = '', webSocketDebuggerPath = ''] = String(rawContents)
    .trim()
    .split(/\n+/);
  const port = Number.parseInt(portLine, 10);

  if (!Number.isFinite(port) || !webSocketDebuggerPath.startsWith('/devtools/')) {
    return undefined;
  }

  return {
    port,
    webSocketDebuggerPath,
    webSocketDebuggerUrl: `ws://127.0.0.1:${port}${webSocketDebuggerPath}`,
  };
}

export function readDevToolsActivePortHint(profileConfig, options = {}) {
  const requestedPort = Number.parseInt(String(options.requestedPort ?? ''), 10);
  const candidatePaths = Array.from(
    new Set(
      [
        profileConfig?.userDataDir ? join(profileConfig.userDataDir, 'DevToolsActivePort') : undefined,
      ].filter(Boolean),
    ),
  );

  let fallbackHint;

  for (const filePath of candidatePaths) {
    if (!existsSync(filePath)) {
      continue;
    }

    const parsed = parseDevToolsActivePort(readFileSync(filePath, 'utf8'));
    if (!parsed) {
      continue;
    }

    const hint = {
      ...parsed,
      userDataDirLabel: basename(dirname(filePath)),
    };

    if (Number.isFinite(requestedPort) && parsed.port !== requestedPort) {
      fallbackHint ??= hint;
      continue;
    }

    return hint;
  }

  return fallbackHint;
}

function toHostname(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return undefined;
  }
}

function isDuoPromptUrl(value) {
  const hostname = toHostname(value);
  return Boolean(hostname?.endsWith('.duosecurity.com'));
}

function normalizeUrlForMatch(value) {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return undefined;
  }
}

function isEdstemDashboardUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.hostname === 'edstem.org' && parsed.pathname === '/us/dashboard';
  } catch {
    return false;
  }
}

function isEdstemCourseUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.hostname === 'edstem.org' && /^\/us\/courses\//.test(parsed.pathname);
  } catch {
    return false;
  }
}

const RELATED_HOSTNAME_ALIASES = new Map([
  ['canvas.uw.edu', new Set(['idp.u.washington.edu'])],
  ['www.gradescope.com', new Set(['idp.u.washington.edu'])],
  ['my.uw.edu', new Set(['idp.u.washington.edu'])],
  ['platform.openai.com', new Set(['auth.openai.com'])],
  ['aistudio.google.com', new Set(['accounts.google.com'])],
]);

function isKnownDuoRedirectHost(requestedHostname, pageHostname) {
  if (!pageHostname.endsWith('.duosecurity.com')) {
    return false;
  }

  return ['canvas.uw.edu', 'www.gradescope.com', 'my.uw.edu'].includes(requestedHostname);
}

function isKnownRedirectHost(requestedHostname, pageHostname) {
  if (!requestedHostname || !pageHostname) {
    return false;
  }

  if (RELATED_HOSTNAME_ALIASES.get(requestedHostname)?.has(pageHostname) ?? false) {
    return true;
  }

  return isKnownDuoRedirectHost(requestedHostname, pageHostname);
}

function normalizeLaunchUrls(command) {
  return (command.match(/https?:\/\/\S+/g) ?? []).map((value) => {
    try {
      const parsed = new URL(value);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return value;
    }
  });
}

export function resolveChromeSessionConfig(env = process.env) {
  const policy = getCacheGovernancePolicy(env);
  const browserInstanceState = readBrowserInstanceState(policy.browserStateRoot);
  const requestedProfileDirectory =
    env.CHROME_PROFILE_DIRECTORY?.trim() ||
    env.CHROME_PROFILE_NAME?.trim() ||
    policy.browserProfileDirectory;
  const requestedProfilePath =
    env.CHROME_PROFILE_DIR?.trim() ||
    join(env.CHROME_USER_DATA_DIR?.trim() || policy.browserUserDataRoot, requestedProfileDirectory);
  const requestedUserDataDir = env.CHROME_USER_DATA_DIR?.trim() || policy.browserUserDataRoot;
  const profileConfig = resolveChromeProfile({
    homeDir: env.HOME ?? '',
    requestedProfilePath,
    requestedUserDataDir,
    requestedProfileDirectory,
  });
  const attachMode = normalizeAttachMode(env.CHROME_ATTACH_MODE);
  const explicitProfileConfigured = Boolean(
    env.CHROME_PROFILE_DIR?.trim() ||
      env.CHROME_USER_DATA_DIR?.trim() ||
      env.CHROME_PROFILE_NAME?.trim() ||
      env.CHROME_PROFILE_DIRECTORY?.trim(),
  );
  const browserRootBootstrapped =
    existsSync(join(policy.browserUserDataRoot, 'Local State')) &&
    existsSync(join(policy.browserUserDataRoot, policy.browserProfileDirectory));
  const browserRootRequirementStatus = browserRootBootstrapped ? 'ready' : 'browser_root_not_bootstrapped';
  const browserRootRequirementMessage = browserRootBootstrapped
    ? undefined
    : `Repo-owned browser root is not bootstrapped yet. Copy source root ${policy.sourceChromeRoot} / ${policy.sourceProfileDirectory} into ${policy.browserUserDataRoot} as Local State + ${policy.browserProfileDirectory} before running live/browser diagnostics.`;
  const browserRootNextActions = browserRootBootstrapped
    ? []
    : [
        `Close all Chrome processes that still use ${policy.sourceChromeRoot}.`,
        'Run `pnpm browser:bootstrap` for a dry run, then `pnpm browser:bootstrap -- --apply`.',
        'Run `pnpm browser:launch` once to start the repo-owned headed Chrome instance.',
        `After bootstrap, use CHROME_USER_DATA_DIR="${policy.browserUserDataRoot}" and CHROME_PROFILE_NAME="${policy.browserProfileDirectory}".`,
      ];

  return {
    executablePath: DEFAULT_CHROME_EXECUTABLE,
    explicitProfileConfigured,
    attachMode,
    attachModeSource: env.CHROME_ATTACH_MODE ? 'env' : 'default',
    cdpAttachTimeoutMs: parseAttachTimeoutMs(env.CHROME_CDP_ATTACH_TIMEOUT_MS),
    navigationTimeoutMs: parsePositiveInt(env.CHROME_NAVIGATION_TIMEOUT_MS, DEFAULT_NAVIGATION_TIMEOUT_MS),
    requestedProfilePath: profileConfig.requestedProfilePath,
    requestedProfileLabel: requestedProfileDirectory || basename(profileConfig.requestedProfilePath ?? 'unknown-profile'),
    canonicalProfileDirectory: CANONICAL_CHROME_PROFILE_DIRECTORY,
    canonicalProfileDisplayName: CANONICAL_CHROME_PROFILE_DISPLAY_NAME,
    sourceProfileDirectory: SOURCE_CHROME_PROFILE_DIRECTORY,
    profileSource: explicitProfileConfigured ? 'env' : 'repo_browser_default',
    userDataDir: profileConfig.userDataDir,
    userDataDirLabel: profileConfig.userDataDirLabel,
    userDataDirSource: env.CHROME_USER_DATA_DIR?.trim() ? 'env' : 'repo_browser_default',
    profileDirectory: requestedProfileDirectory || profileConfig.profileDirectory,
    profileDirectoryArg:
      requestedProfileDirectory || profileConfig.profileDirectory
        ? `--profile-directory=${requestedProfileDirectory || profileConfig.profileDirectory}`
        : undefined,
    profileRequirementStatus: 'configured',
    browserRootRequirementStatus,
    browserRootRequirementMessage,
    browserRootNextActions,
    browserRoot: policy.browserUserDataRoot,
    browserRootBootstrapped,
    browserCdpPort: policy.browserCdpPort,
    browserInstanceMetadataPath: policy.browserInstanceMetadataPath,
    browserInstanceState,
    missingEnvVars: [],
    missingEnvMessage: undefined,
    cdpCandidateUrls:
      attachMode === 'persistent'
        ? []
        : Array.from(
            new Set(
              [
                env.CHROME_CDP_URL?.trim(),
                browserInstanceState?.cdpUrl,
                `http://127.0.0.1:${policy.browserCdpPort}`,
                `http://localhost:${policy.browserCdpPort}`,
              ].filter(Boolean),
            ),
          ),
  };
}

export function extractJsonFromOutput(output) {
  const trimmed = output.trim();
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace === -1) {
    return undefined;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = firstBrace; index < trimmed.length; index += 1) {
    const character = trimmed[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === '{') {
      depth += 1;
      continue;
    }

    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        const candidate = trimmed.slice(firstBrace, index + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return undefined;
        }
      }
    }
  }

  return undefined;
}

export function extractJsonObjectsFromOutput(output) {
  const trimmed = output.trim();
  const objects = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let startIndex = -1;

  for (let index = 0; index < trimmed.length; index += 1) {
    const character = trimmed[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === '{') {
      if (depth === 0) {
        startIndex = index;
      }
      depth += 1;
      continue;
    }

    if (character === '}') {
      depth -= 1;
      if (depth === 0 && startIndex !== -1) {
        const candidate = trimmed.slice(startIndex, index + 1);
        try {
          objects.push(JSON.parse(candidate));
        } catch {}
        startIndex = -1;
      }
    }
  }

  return objects;
}

export function extractLastJsonFromOutput(output) {
  const objects = extractJsonObjectsFromOutput(output);
  return objects.length > 0 ? objects.at(-1) : undefined;
}

export function matchesRequestedUrl(pageUrl, requestedUrl) {
  return getRequestedUrlMatchScore(pageUrl, requestedUrl) > 0;
}

export function buildCdpTargetSummary(targetsResultParsed) {
  const previewLimit = 8;
  if (!Array.isArray(targetsResultParsed)) {
    return {
      ok: false,
      count: 0,
      pageCount: 0,
      titlesPreview: [],
      urlsPreview: [],
      titlesOmittedCount: 0,
      urlsOmittedCount: 0,
    };
  }

  const pageTargets = targetsResultParsed.filter((entry) => entry?.type === 'page');
  const titles = pageTargets.map((entry) => entry?.title ?? '');
  const urls = pageTargets.map((entry) => entry?.url ?? '');
  const summary = {
    ok: true,
    count: targetsResultParsed.length,
    pageCount: pageTargets.length,
    titlesPreview: titles.slice(0, previewLimit),
    urlsPreview: urls.slice(0, previewLimit),
    titlesOmittedCount: Math.max(0, titles.length - previewLimit),
    urlsOmittedCount: Math.max(0, urls.length - previewLimit),
  };

  Object.defineProperty(summary, 'titles', {
    value: titles,
    enumerable: false,
  });
  Object.defineProperty(summary, 'urls', {
    value: urls,
    enumerable: false,
  });

  return summary;
}

export function getRequestedUrlMatchScore(pageUrl, requestedUrl) {
  if (isEdstemDashboardUrl(requestedUrl) && isEdstemCourseUrl(pageUrl)) {
    return 4;
  }

  const normalizedPageUrl = normalizeUrlForMatch(pageUrl);
  const normalizedRequestedUrl = normalizeUrlForMatch(requestedUrl);
  if (normalizedPageUrl && normalizedRequestedUrl && normalizedPageUrl === normalizedRequestedUrl) {
    return 3;
  }

  const pageHostname = toHostname(pageUrl);
  const requestedHostname = toHostname(requestedUrl);
  if (pageHostname && requestedHostname && pageHostname === requestedHostname) {
    return 2;
  }

  return isKnownRedirectHost(requestedHostname, pageHostname) ? 1 : 0;
}

export function findBestRequestedUrlMatch(entries, requestedUrl, getUrl = (entry) => entry?.url) {
  let bestEntry;
  let bestScore = 0;

  for (const entry of entries) {
    const score = getRequestedUrlMatchScore(getUrl(entry), requestedUrl);
    if (score > bestScore) {
      bestEntry = entry;
      bestScore = score;
      if (score === 3) {
        break;
      }
    }
  }

  return bestEntry;
}

export function assignRequestedUrlMatches(entries, requestedUrls, getUrl = (entry) => entry?.url) {
  const unused = entries.map((entry, index) => ({ entry, index }));

  return requestedUrls.map((requestedUrl) => {
    let bestIndex = -1;
    let bestScore = 0;

    for (let index = 0; index < unused.length; index += 1) {
      const candidate = unused[index];
      const score = getRequestedUrlMatchScore(getUrl(candidate.entry), requestedUrl);
      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
        if (score === 3) {
          break;
        }
      }
    }

    if (bestIndex < 0) {
      return undefined;
    }

    const [{ entry }] = unused.splice(bestIndex, 1);
    return entry;
  });
}

export function classifyPage(finalUrl, title, bodyPreview) {
  return classifyPageCore(finalUrl, title, bodyPreview);
}

export function classifyFromExistingTab(finalUrl, title, input = {}) {
  return determineAuthState({
    site: input.site,
    classification: !finalUrl ? undefined : classifyPageCore(finalUrl, title, ''),
    finalUrl,
    title,
  });
}

function buildAuthState(authenticated, authBoundary) {
  return {
    authenticated,
    authBoundary,
  };
}

function pageLooksSessionExpired(finalUrl, title, bodyPreview = '') {
  const lowered = `${finalUrl} ${title} ${bodyPreview}`.toLowerCase();
  return (
    lowered.includes('session expired') ||
    lowered.includes('登录已过期') ||
    lowered.includes('login request has expired') ||
    lowered.includes('try to log in again')
  );
}

function pageLooksMfaRequired(finalUrl, title, bodyPreview = '') {
  const lowered = `${finalUrl} ${title} ${bodyPreview}`.toLowerCase();
  return (
    isDuoPromptUrl(finalUrl) ||
    lowered.includes('duo security') ||
    lowered.includes('touch id') ||
    lowered.includes('approve') ||
    lowered.includes('验证您的身份')
  );
}

function pageLooksSessionResumable(site, finalUrl, title, bodyPreview = '') {
  const lowered = `${finalUrl} ${title} ${bodyPreview}`.toLowerCase();
  const hostname = toHostname(finalUrl);
  return (
    hostname === 'idp.u.washington.edu' ||
    lowered.includes('uw netid') ||
    lowered.includes('single sign on') ||
    lowered.includes('saml') ||
    lowered.includes('redirect/sso') ||
    (site === 'gradescope' && lowered.includes('/auth/saml/uw')) ||
    pageLooksSessionExpired(finalUrl, title, bodyPreview)
  );
}

function pageLooksExplicitLoggedOut(finalUrl, title, bodyPreview = '') {
  const lowered = `${finalUrl} ${title} ${bodyPreview}`.toLowerCase();
  return (
    lowered.includes('sign in') ||
    lowered.includes('log in') ||
    lowered.includes('login') ||
    lowered.includes('email address') ||
    lowered.includes('password') ||
    lowered.includes('choose an account') ||
    lowered.includes('school credentials')
  );
}

export function determineAuthState({ site, classification, finalUrl, title, bodyPreview = '' }) {
  if (classification === 'profile_mismatch') {
    return buildAuthState(false, 'profile_mismatch');
  }
  if (classification === 'attach_failed') {
    return buildAuthState(false, 'attach_failed');
  }
  if (classification === 'not_open') {
    return buildAuthState(false, 'not_open');
  }
  if (classification === 'likely_authenticated') {
    return buildAuthState(true, 'authenticated');
  }
  if (classification === 'login_required') {
    if (pageLooksSessionExpired(finalUrl, title, bodyPreview)) {
      return buildAuthState(false, 'session_resumable');
    }
    if (pageLooksMfaRequired(finalUrl, title, bodyPreview)) {
      return buildAuthState(false, 'mfa_required');
    }
    if (pageLooksSessionResumable(site, finalUrl, title, bodyPreview)) {
      return buildAuthState(false, 'session_resumable');
    }
    return buildAuthState(false, 'logged_out');
  }
  if (pageLooksSessionExpired(finalUrl, title, bodyPreview)) {
    return buildAuthState(false, 'session_resumable');
  }
  if (pageLooksMfaRequired(finalUrl, title, bodyPreview)) {
    return buildAuthState(false, 'mfa_required');
  }
  if (pageLooksSessionResumable(site, finalUrl, title, bodyPreview)) {
    return buildAuthState(false, 'session_resumable');
  }
  if (pageLooksExplicitLoggedOut(finalUrl, title, bodyPreview)) {
    return buildAuthState(false, 'logged_out');
  }
  return buildAuthState(false, 'logged_out');
}

export function shouldSkipBrowserCdpAttach(cdpTargetSummary, options = {}) {
  if (!cdpTargetSummary?.ok) {
    return true;
  }

  const pageUrls = Array.isArray(cdpTargetSummary.urls) ? cdpTargetSummary.urls : [];
  if (pageUrls.length === 0) {
    return true;
  }

  const nonChromeUrls = pageUrls.filter((url) => typeof url === 'string' && /^https?:\/\//.test(url));
  if (nonChromeUrls.length > 0) {
    return false;
  }

  const chromeOnlyPages = pageUrls.every(
    (url) => typeof url === 'string' && (url.startsWith('chrome://') || url === 'about:blank'),
  );
  if (!chromeOnlyPages) {
    return false;
  }

  const debugProcesses = Array.isArray(options.debugProcesses) ? options.debugProcesses : [];
  const requestedUserDataDir = options.sessionConfig?.userDataDir;
  const requestedProfileDirectory = options.sessionConfig?.profileDirectory;
  const exactRequestedProfileMatches = debugProcesses.filter((processInfo) => {
    const sameUserDataDir = Boolean(requestedUserDataDir) && processInfo?.userDataDir === requestedUserDataDir;
    const sameProfileDirectory =
      !requestedProfileDirectory || processInfo?.profileDirectory === requestedProfileDirectory;
    return sameUserDataDir && sameProfileDirectory;
  });
  if (exactRequestedProfileMatches.length === 1) {
    return false;
  }

  return true;
}

export function parseChromeDebugProcessLine(line) {
  return parseRemoteChromeProcesses(line)[0];
}

export function collectChromeDebugProcesses(rawPsOutput, requestedPort = '9222') {
  const port = Number.parseInt(String(requestedPort), 10);
  return parseRemoteChromeProcesses(rawPsOutput)
    .filter((processInfo) => processInfo.port === port)
    .map((processInfo) => ({
      pid: processInfo.pid,
      userDataDirLabel: processInfo.userDataDirLabel,
      profileDirectory: processInfo.profileDirectory,
      launchUrls: normalizeLaunchUrls(processInfo.command),
      userDataDir: processInfo.userDataDir,
      port: processInfo.port,
    }));
}

export function collectChromeDebugCandidateUrls(rawPsOutput = '', profileConfig = undefined) {
  const processes = parseRemoteChromeProcesses(rawPsOutput).filter((processInfo) => Number.isFinite(processInfo.port));
  const matchingProcesses =
    profileConfig?.userDataDir
      ? processes.filter((processInfo) => {
          const sameUserDataDir = processInfo.userDataDir === profileConfig.userDataDir;
          const sameProfileDirectory =
            !profileConfig.profileDirectory || processInfo.profileDirectory === profileConfig.profileDirectory;
          return sameUserDataDir && sameProfileDirectory;
        })
      : processes;

  return Array.from(
    new Set(
      matchingProcesses.flatMap((processInfo) => [
        `http://127.0.0.1:${processInfo.port}`,
        `http://localhost:${processInfo.port}`,
      ]),
    ),
  );
}

export function collectListeningPids(rawLsofOutput = '') {
  return rawLsofOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('COMMAND'))
    .map((line) => {
      const parts = line.split(/\s+/);
      const pid = Number(parts[1]);
      return Number.isFinite(pid) ? pid : undefined;
    })
    .filter((pid) => pid !== undefined);
}

function shellEscape(value) {
  return JSON.stringify(String(value));
}

export function buildProfileAlignmentRecommendation(activeDebugListener, cdpUrl = 'http://localhost:9222') {
  if (!activeDebugListener || typeof activeDebugListener !== 'object') {
    return undefined;
  }

  const userDataDir = activeDebugListener.userDataDir;
  const profileName = activeDebugListener.profileDirectory;
  if (!userDataDir || !profileName) {
    return undefined;
  }

  const env = {
    CHROME_CDP_URL: cdpUrl,
    CHROME_USER_DATA_DIR: userDataDir,
    CHROME_PROFILE_NAME: profileName,
  };

  return {
    userDataDir,
    userDataDirLabel: activeDebugListener.userDataDirLabel,
    profileName,
    profileDirectory: profileName,
    listenerPid: activeDebugListener.pid,
    probeCommand: `CHROME_CDP_URL=${shellEscape(env.CHROME_CDP_URL)} CHROME_USER_DATA_DIR=${shellEscape(env.CHROME_USER_DATA_DIR)} CHROME_PROFILE_NAME=${shellEscape(env.CHROME_PROFILE_NAME)} pnpm probe:live`,
    diagnoseCommand: `CHROME_CDP_URL=${shellEscape(env.CHROME_CDP_URL)} CHROME_USER_DATA_DIR=${shellEscape(env.CHROME_USER_DATA_DIR)} CHROME_PROFILE_NAME=${shellEscape(env.CHROME_PROFILE_NAME)} pnpm diagnose:live`,
  };
}

export function buildRemoteDebugRelaunchRecommendation(processInfo, cdpUrl = 'http://localhost:9222') {
  if (!processInfo || typeof processInfo !== 'object') {
    return undefined;
  }

  const userDataDir = processInfo.userDataDir;
  const profileName = processInfo.profileDirectory;
  if (!userDataDir || !profileName) {
    return undefined;
  }

  let port = '9222';
  try {
    const parsed = new URL(cdpUrl);
    port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  } catch {}

  const launchUrls = Array.isArray(processInfo.launchUrls) ? processInfo.launchUrls.filter(Boolean) : [];
  const commandParts = [
    DEFAULT_CHROME_EXECUTABLE,
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${shellEscape(userDataDir)}`,
    `--profile-directory=${shellEscape(profileName)}`,
    ...launchUrls.map((url) => shellEscape(url)),
  ];

  return {
    userDataDir,
    userDataDirLabel: processInfo.userDataDirLabel,
    profileName,
    profileDirectory: profileName,
    listenerPid: processInfo.pid,
    relaunchCommand: commandParts.join(' '),
  };
}

export function detectProfileMismatch({
  attachModeResolved,
  sessionConfig,
  debugProcesses,
  observedTabResults,
  primaryResults,
}) {
  if (
    attachModeResolved === 'persistent_context' ||
    attachModeResolved?.includes('page_requested_profile')
  ) {
    return false;
  }

  const debugSummary = summarizeRemoteChromeProcesses(
    debugProcesses.map((processInfo) => ({
      port: processInfo.port,
      userDataDir: processInfo.userDataDir,
      userDataDirLabel: processInfo.userDataDirLabel,
      profileDirectory: processInfo.profileDirectory,
    })),
    debugProcesses[0]?.port,
    {
      userDataDir: sessionConfig.userDataDir,
      profileDirectory: sessionConfig.profileDirectory,
    },
  );

  const observedAuthenticated = observedTabResults.some((entry) => entry.authenticated === true);
  const primaryMismatchLike = primaryResults.some((entry) => entry.authenticated !== true);

  return Boolean(debugSummary.profileMismatch || debugSummary.ambiguous) && (observedAuthenticated || primaryMismatchLike);
}

export function reconcileObservedAuthState(primaryState, observedState) {
  if (observedState?.authenticated === true && primaryState?.authenticated !== true) {
    return buildAuthState(false, 'profile_mismatch');
  }
  if (primaryState?.authBoundary === 'attach_failed' && observedState?.authBoundary && observedState.authBoundary !== 'not_open') {
    return observedState;
  }
  if (primaryState?.authBoundary === 'not_open' && observedState?.authBoundary && observedState.authBoundary !== 'not_open') {
    return observedState;
  }
  if (primaryState?.authBoundary === 'logged_out' && observedState?.authBoundary && ['session_resumable', 'mfa_required'].includes(observedState.authBoundary)) {
    return observedState;
  }
  return primaryState;
}

export function reconcileObservedClassification(primaryClassification, observedClassification) {
  return reconcileObservedAuthState(
    determineAuthState({ classification: primaryClassification }),
    determineAuthState({ classification: observedClassification }),
  ).authBoundary === 'authenticated'
    ? 'likely_authenticated'
    : reconcileObservedAuthState(
        determineAuthState({ classification: primaryClassification }),
        determineAuthState({ classification: observedClassification }),
      ).authBoundary === 'profile_mismatch'
      ? 'profile_mismatch'
      : primaryClassification;
}

export function buildProbeNextStep({ site, authenticated, authBoundary, classification, finalUrl, title }) {
  if (typeof authenticated !== 'boolean' || !authBoundary) {
    const authState = determineAuthState({ site, classification, finalUrl, title });
    authenticated = authState.authenticated;
    authBoundary = authState.authBoundary;
  }
  if (!site && authBoundary === 'profile_mismatch') {
    return 'align_requested_profile_with_debug_browser';
  }
  if (authenticated) {
    return `${site}: ready for manual live sync verification`;
  }
  if (authBoundary === 'profile_mismatch') {
    return `${site}: align CHROME_USER_DATA_DIR / CHROME_PROFILE_NAME (or CHROME_PROFILE_DIRECTORY) with the authenticated Chrome session`;
  }
  if (authBoundary === 'attach_failed') {
    return `${site}: retry with CHROME_ATTACH_MODE=page or CHROME_ATTACH_MODE=persistent`;
  }
  if (authBoundary === 'mfa_required') {
    if (isDuoPromptUrl(finalUrl) || /duo security/i.test(String(title ?? ''))) {
      return `${site}: approve Duo MFA in the requested profile`;
    }
    return `${site}: complete the required human MFA confirmation in the requested profile`;
  }
  if (authBoundary === 'session_resumable') {
    if (site === 'gradescope') {
      return `${site}: continue via https://www.gradescope.com/auth/saml/uw and reuse the existing UW SSO session from Canvas / MyUW`;
    }
    return `${site}: continue the canonical school SSO re-entry in the requested profile`;
  }
  if (authBoundary === 'logged_out') {
    if (site === 'gradescope') {
      return `${site}: continue via https://www.gradescope.com/auth/saml/uw and reuse the existing UW SSO session from Canvas / MyUW`;
    }
    return `${site}: continue the current login or school SSO step in the requested profile`;
  }
  if (authBoundary === 'not_open') {
    return `${site}: open the site in the requested profile or rerun with CHROME_ATTACH_MODE=persistent`;
  }
  if (site === 'gradescope') {
    return `${site}: prefer the school or course entry page instead of the public homepage`;
  }
  if (site === 'gemini' || site === 'openai') {
    return `${site}: make sure the target provider surface is fully signed in before treating it as ready`;
  }
  return `${site}: inspect the current page because the site is still public or ambiguous`;
}

export function pickProbeFailureReason({ cdpAttachError, cdpProbe } = {}) {
  return cdpAttachError || cdpProbe?.error || 'live_probe_no_results';
}

export function determineAttachStatus({ attachModeResolved, cdpAttachError, results }) {
  const getBoundary = (entry) =>
    entry?.authBoundary ??
    determineAuthState({
      site: entry?.name,
      classification: entry?.classification,
      finalUrl: entry?.finalUrl,
      title: entry?.title,
      bodyPreview: entry?.bodyPreview,
    }).authBoundary;

  if (results.some((entry) => getBoundary(entry) === 'profile_mismatch')) {
    return 'profile_mismatch';
  }
  if (results.some((entry) => getBoundary(entry) === 'attach_failed')) {
    return 'attach_failed';
  }
  if (
    cdpAttachError &&
    ['page_requested_profile_after_attach_failure', 'page_existing_tabs_after_attach_failure', 'page_target_http_after_attach_failure'].includes(
      attachModeResolved,
    )
  ) {
    return 'page_fallback';
  }
  if (cdpAttachError) {
    return 'attach_failed';
  }
  if (attachModeResolved?.includes('existing_tabs')) {
    return 'page_fallback';
  }
  if (attachModeResolved?.includes('requested_profile') || attachModeResolved === 'persistent_context') {
    return 'persistent_context';
  }
  return 'attached';
}

export function shouldUseCdpTargetResults({ attachMode, cdpAttachError, cdpTargetResults }) {
  if (!Array.isArray(cdpTargetResults) || cdpTargetResults.length === 0) {
    return false;
  }

  const hasExistingTarget = cdpTargetResults.some((entry) => entry?.source === 'existing_tab_cdp_target');
  if (!hasExistingTarget) {
    return false;
  }

  if (attachMode === 'page') {
    return true;
  }

  return Boolean(cdpAttachError);
}

export function summarizeLiveProbe(parsedProbe) {
  const results = parsedProbe?.results;
  if (!Array.isArray(results)) {
    if (!parsedProbe?.attachStatus) {
      return undefined;
    }

    return {
      attachModeResolved: parsedProbe.attachModeResolved,
      attachStatus: parsedProbe.attachStatus,
      attachFailure: parsedProbe.cdpAttachError ?? parsedProbe.blocked,
      profileMismatchSites: [],
      campus: {},
      campusNextSteps: {},
      providersWeb: {},
      campusAuthenticatedAll: false,
      campusAuthenticatedSites: [],
      campusSessionResumableSites: [],
      campusMfaRequiredSites: [],
      campusLoggedOutSites: [],
      campusNotOpenSites: [],
      attachFailedSites: [],
      evidenceCoverage: {
        sitesWithEvidence: [],
        consoleEnabled: Boolean(parsedProbe?.evidenceCapture?.console),
        networkEnabled: Boolean(parsedProbe?.evidenceCapture?.network),
        traceStatus: parsedProbe?.evidenceCapture?.trace?.status ?? 'disabled',
      },
    };
  }

  const mapResult = (name) => {
    const match = results.find((entry) => entry?.name === name);
    const authState =
      match && ('authenticated' in match || 'authBoundary' in match)
        ? {
            authenticated: Boolean(match.authenticated),
            authBoundary: match.authBoundary ?? 'not_open',
          }
        : determineAuthState({
            site: name,
            classification: match?.classification,
            finalUrl: match?.finalUrl,
            title: match?.title,
            bodyPreview: match?.bodyPreview,
          });
    const authenticated = authState.authenticated;
    const authBoundary = authState.authBoundary;
    return {
      authenticated,
      authBoundary,
      finalUrl: match?.finalUrl,
      title: match?.title,
      source: match?.source,
      attachModeResolved: match?.attachModeResolved,
      nextStep:
        match?.nextStep ??
        (AUTH_BOUNDARIES.includes(authBoundary)
          ? buildProbeNextStep({
              site: name,
              authenticated,
              authBoundary,
              finalUrl: match?.finalUrl,
              title: match?.title,
            })
          : undefined),
    };
  };

  const campusSites = ['canvas', 'gradescope', 'edstem', 'myuw'];
  const providerSites = ['openai', 'gemini'];
  const campus = Object.fromEntries(campusSites.map((name) => [name, mapResult(name)]));
  const providersWeb = Object.fromEntries(providerSites.map((name) => [name, mapResult(name)]));
  const campusResults = results.filter((entry) => campusSites.includes(entry?.name));
  const evidenceResults = results.filter((entry) => entry?.evidence);
  const resolveAuthStateFromEntry = (entry) =>
    entry && ('authenticated' in entry || 'authBoundary' in entry)
      ? {
          authenticated: Boolean(entry.authenticated),
          authBoundary: entry.authBoundary ?? 'not_open',
        }
      : determineAuthState({
          site: entry?.name,
          classification: entry?.classification,
          finalUrl: entry?.finalUrl,
          title: entry?.title,
          bodyPreview: entry?.bodyPreview,
        });

  return {
    attachModeResolved: parsedProbe.attachModeResolved,
    attachStatus: parsedProbe.attachStatus,
    attachFailure: parsedProbe.cdpAttachError ?? parsedProbe.blocked,
    profileMismatchSites: results.filter((entry) => resolveAuthStateFromEntry(entry).authBoundary === 'profile_mismatch').map((entry) => entry.name),
    campus,
    campusNextSteps: Object.fromEntries(campusSites.map((name) => [name, campus[name].nextStep])),
    providersWeb,
    campusAuthenticatedAll: campusSites.every((name) => campus[name].authenticated === true),
    campusAuthenticatedSites: campusResults.filter((entry) => resolveAuthStateFromEntry(entry).authenticated === true).map((entry) => entry.name),
    campusSessionResumableSites: campusResults.filter((entry) => resolveAuthStateFromEntry(entry).authBoundary === 'session_resumable').map((entry) => entry.name),
    campusMfaRequiredSites: campusResults.filter((entry) => resolveAuthStateFromEntry(entry).authBoundary === 'mfa_required').map((entry) => entry.name),
    campusLoggedOutSites: campusResults.filter((entry) => resolveAuthStateFromEntry(entry).authBoundary === 'logged_out').map((entry) => entry.name),
    campusNotOpenSites: campusResults.filter((entry) => resolveAuthStateFromEntry(entry).authBoundary === 'not_open').map((entry) => entry.name),
    attachFailedSites: campusResults.filter((entry) => resolveAuthStateFromEntry(entry).authBoundary === 'attach_failed').map((entry) => entry.name),
    evidenceCoverage: {
      sitesWithEvidence: evidenceResults.map((entry) => entry.name),
      consoleEnabled: Boolean(parsedProbe?.evidenceCapture?.console),
      networkEnabled: Boolean(parsedProbe?.evidenceCapture?.network),
      traceStatus: parsedProbe?.evidenceCapture?.trace?.status ?? 'disabled',
    },
  };
}

export function describeRequestedProfileEvidence(diagnostics = {}) {
  const requestedLabel = diagnostics?.chromeProfile?.label ?? diagnostics?.requestedProfileLabel ?? 'unknown';
  const requestedUserDataDirLabel =
    diagnostics?.chromeProfile?.userDataDirLabel ?? diagnostics?.liveProbe?.parsed?.userDataDirLabel ?? 'unknown';
  const requestedProfileDirectory =
    diagnostics?.chromeProfile?.profileDirectory ?? diagnostics?.profileDirectory ?? requestedLabel;
  const liveSummary = diagnostics?.liveSummary;
  const attachModeResolved = liveSummary?.attachModeResolved ?? diagnostics?.liveProbe?.parsed?.attachModeResolved;
  const activeDebugListener = diagnostics?.activeDebugListener;
  const listenerMatchesRequested =
    Boolean(activeDebugListener?.profileDirectory) &&
    activeDebugListener.profileDirectory === requestedProfileDirectory &&
    (!requestedUserDataDirLabel || activeDebugListener?.userDataDirLabel === requestedUserDataDirLabel);

  if (liveSummary?.attachStatus === 'profile_mismatch') {
    return {
      label: requestedLabel,
      confirmed: false,
      status: 'profile_mismatch',
      evidence: 'observed_session_conflicts_with_requested_profile',
      observedProfileDirectory: activeDebugListener?.profileDirectory,
      highlight: `profile=${requestedLabel} (profile_mismatch)`,
    };
  }

  if (listenerMatchesRequested) {
    return {
      label: requestedLabel,
      confirmed: true,
      status: 'confirmed_debug_listener',
      evidence: 'matching_active_debug_listener',
      observedProfileDirectory: activeDebugListener?.profileDirectory,
      highlight: `profile=${requestedLabel} (confirmed_debug_listener)`,
    };
  }

  if (attachModeResolved === 'persistent_context' || attachModeResolved?.includes('requested_profile')) {
    return {
      label: requestedLabel,
      confirmed: true,
      status: 'confirmed_requested_profile_context',
      evidence: 'requested_profile_context',
      observedProfileDirectory: activeDebugListener?.profileDirectory,
      highlight: `profile=${requestedLabel} (confirmed_requested_profile_context)`,
    };
  }

  if (attachModeResolved === 'page_existing_tabs_after_attach_failure') {
    return {
      label: requestedLabel,
      confirmed: false,
      status: 'requested_profile_unconfirmed_existing_tabs',
      evidence: 'existing_tabs_without_profile_proof',
      observedProfileDirectory: activeDebugListener?.profileDirectory,
      highlight: `profile=${requestedLabel} (requested_only_existing_tabs_unconfirmed)`,
    };
  }

  return {
    label: requestedLabel,
    confirmed: false,
    status: 'requested_profile_unconfirmed',
    evidence: 'requested_profile_without_confirmation',
    observedProfileDirectory: activeDebugListener?.profileDirectory,
    highlight: `profile=${requestedLabel} (requested_only)`,
  };
}

export function buildSupportHighlights(bundle) {
  const diagnostics = bundle?.diagnose?.parsed;
  const liveSummary = diagnostics?.liveSummary;
  const profileRecommendation = diagnostics?.recommendedProfile;
  const coverage = bundle?.coverage;
  const profileEvidence = describeRequestedProfileEvidence(diagnostics);
  const campusStatuses = liveSummary?.campus
    ? Object.entries(liveSummary.campus).map(([site, entry]) => {
        const authState =
          entry && ('authenticated' in entry || 'authBoundary' in entry)
            ? {
                authenticated: Boolean(entry.authenticated),
                authBoundary: entry.authBoundary ?? 'not_open',
              }
            : determineAuthState({
                site,
                classification: entry?.classification,
                finalUrl: entry?.finalUrl,
                title: entry?.title,
              });
        return `${site}:${authState.authenticated ? 1 : 0}:${authState.authBoundary}`;
      })
    : [];
  const evidenceCoverage = liveSummary?.evidenceCoverage;

  const highlights = [
    `attach=${liveSummary?.attachModeResolved ?? diagnostics?.liveProbe?.parsed?.attachModeResolved ?? 'unknown'}`,
    `attachStatus=${liveSummary?.attachStatus ?? diagnostics?.liveProbe?.parsed?.attachStatus ?? 'unknown'}`,
    `attachFailure=${liveSummary?.attachFailure ?? diagnostics?.liveProbe?.parsed?.cdpAttachError ?? 'none'}`,
    `attachMode=${liveSummary?.attachModeResolved ?? diagnostics?.liveProbe?.parsed?.attachModeResolved ?? 'unknown'}`,
    profileEvidence.highlight,
    `userDataDir=${diagnostics?.chromeProfile?.userDataDirLabel ?? diagnostics?.liveProbe?.parsed?.userDataDirLabel ?? 'unknown'}`,
    `recommendedProfile=${profileRecommendation?.profileName ?? 'none'}`,
    `sites=${campusStatuses.join(', ') || 'none'}`,
  ];

  if (diagnostics?.chromeProfile?.profileRequirementStatus) {
    highlights.push(`profileConfig=${diagnostics.chromeProfile.profileRequirementStatus}`);
  }

  if (evidenceCoverage) {
    highlights.push(
      `evidence=console:${evidenceCoverage.consoleEnabled ? 'on' : 'off'} network:${evidenceCoverage.networkEnabled ? 'on' : 'off'} trace:${evidenceCoverage.traceStatus}`,
    );
    highlights.push(`evidenceSites=${evidenceCoverage.sitesWithEvidence.join(', ') || 'none'}`);
  }

  if (coverage?.total) {
    highlights.push(
      `coverage=lines:${coverage.total.lines?.pct ?? 'unknown'} statements:${coverage.total.statements?.pct ?? 'unknown'} functions:${coverage.total.functions?.pct ?? 'unknown'} branches:${coverage.total.branches?.pct ?? 'unknown'}`,
    );
  }

  if (coverage?.testPyramid) {
    highlights.push(
      `testPyramid=workspaceVitestPackages:${coverage.testPyramid.workspaceVitestPackages ?? 0}, workspaceVitestFiles:${coverage.testPyramid.workspaceVitestFiles ?? 0}, repoNodeTests:${coverage.testPyramid.repoNodeTestFiles ?? 0}, extensionPlaywrightSpecs:${coverage.testPyramid.extensionPlaywrightSmokeSpecs ?? 0}`,
    );
  }

  return highlights;
}

export function buildProbeHeader(sessionConfig, activeCdpUrl, overrides = {}) {
  return {
    explicitProfileConfigured: sessionConfig.explicitProfileConfigured,
    attachModeRequested: sessionConfig.attachMode,
    attachModeSource: sessionConfig.attachModeSource,
    cdpAttachTimeoutMs: sessionConfig.cdpAttachTimeoutMs,
    navigationTimeoutMs: sessionConfig.navigationTimeoutMs,
    requestedProfileLabel: sessionConfig.requestedProfileLabel,
    canonicalProfileDirectory: sessionConfig.canonicalProfileDirectory,
    canonicalProfileDisplayName: sessionConfig.canonicalProfileDisplayName,
    sourceProfileDirectory: sessionConfig.sourceProfileDirectory,
    profileSource: sessionConfig.profileSource,
    userDataDirLabel: sessionConfig.userDataDirLabel,
    userDataDirSource: sessionConfig.userDataDirSource,
    profileDirectory: sessionConfig.profileDirectory,
    profileRequirementStatus: sessionConfig.profileRequirementStatus,
    browserRootRequirementStatus: sessionConfig.browserRootRequirementStatus,
    browserRoot: sessionConfig.browserRoot,
    browserRootBootstrapped: sessionConfig.browserRootBootstrapped,
    browserCdpPort: sessionConfig.browserCdpPort,
    missingEnvVars: sessionConfig.missingEnvVars,
    cdpUrl: activeCdpUrl,
    cdpCandidates: sessionConfig.cdpCandidateUrls,
    ...overrides,
  };
}

export function withTimeout(factory, timeoutMs, label) {
  let timeoutHandle;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label}_timeout_after_${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve().then(factory), timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}
