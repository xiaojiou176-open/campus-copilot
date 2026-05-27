import { basename, dirname, join } from 'node:path';

export const DEFAULT_CHROME_ATTACH_MODE = 'auto';
export const DEFAULT_CDP_ATTACH_TIMEOUT_MS = 5000;
export const DEFAULT_BROWSER_CDP_PORT = 9334;
export const DEFAULT_SOURCE_CHROME_ROOT_SUBPATH = 'Library/Application Support/Google/Chrome';
export const DEFAULT_REPO_OWNED_CHROME_USER_DATA_SUBPATH = 'browser/chrome-user-data';
export const CANONICAL_CHROME_PROFILE_DIRECTORY = 'Profile 1';
export const CANONICAL_CHROME_PROFILE_DISPLAY_NAME = 'campus-copilot';
export const SOURCE_CHROME_PROFILE_DIRECTORY = 'Profile 13';
export const DEFAULT_SOURCE_CHROME_PROFILE_DIRECTORY = SOURCE_CHROME_PROFILE_DIRECTORY;
export const AUTH_BOUNDARIES = [
  'authenticated',
  'session_resumable',
  'mfa_required',
  'logged_out',
  'not_open',
  'profile_mismatch',
  'attach_failed',
];

const SUPPORTED_ATTACH_MODES = new Set(['auto', 'cdp', 'existing_tab', 'persistent_context']);

function extractFlag(command, flag) {
  const marker = `--${flag}=`;
  const startIndex = command.indexOf(marker);
  if (startIndex === -1) {
    return undefined;
  }

  const valueStart = startIndex + marker.length;
  let valueEnd = command.length;
  const nextFlagIndex = command.indexOf(' --', valueStart);
  if (nextFlagIndex !== -1) {
    valueEnd = Math.min(valueEnd, nextFlagIndex);
  }

  const remainder = command.slice(valueStart);
  const nextUrlMatch = remainder.match(/\shttps?:\/\//);
  if (typeof nextUrlMatch?.index === 'number') {
    valueEnd = Math.min(valueEnd, valueStart + nextUrlMatch.index);
  }
  const nextSpecialPageMatch = remainder.match(/\s(?:about:|chrome:\/\/|file:\/\/|data:|devtools:\/\/|chrome-extension:\/\/)/);
  if (typeof nextSpecialPageMatch?.index === 'number') {
    valueEnd = Math.min(valueEnd, valueStart + nextSpecialPageMatch.index);
  }

  const value = command.slice(valueStart, valueEnd).trim();
  return value.length > 0 ? value : undefined;
}

function sanitizeChromeProcess(process) {
  return {
    pid: process.pid,
    port: process.port,
    userDataDirLabel: process.userDataDirLabel,
    profileDirectory: process.profileDirectory,
  };
}

export function parseAttachMode(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return SUPPORTED_ATTACH_MODES.has(normalized) ? normalized : DEFAULT_CHROME_ATTACH_MODE;
}

export function parseAttachTimeoutMs(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CDP_ATTACH_TIMEOUT_MS;
}

export function resolveChromeProfile({
  homeDir,
  requestedProfilePath,
  requestedUserDataDir,
  requestedProfileDirectory,
}) {
  const effectiveProfilePath =
    requestedProfilePath ||
    (requestedUserDataDir && requestedProfileDirectory
      ? join(requestedUserDataDir, requestedProfileDirectory)
      : requestedUserDataDir || null);
  const inferredProfileName = effectiveProfilePath ? basename(effectiveProfilePath) : undefined;
  const inferredProfileDirectory =
    requestedProfileDirectory ||
    (inferredProfileName === 'Default' || inferredProfileName?.startsWith('Profile ')
      ? inferredProfileName
      : undefined);
  const userDataDir =
    requestedUserDataDir || (effectiveProfilePath && inferredProfileDirectory ? dirname(effectiveProfilePath) : effectiveProfilePath);
  const missingEnv =
    !requestedProfilePath &&
    (!requestedUserDataDir || !requestedProfileDirectory);

  return {
    requestedProfilePath: effectiveProfilePath,
    requestedPathLabel: effectiveProfilePath ? basename(effectiveProfilePath) : undefined,
    requestedPathSource: requestedProfilePath
      ? 'profile_env'
      : requestedUserDataDir
        ? 'user_data_env'
        : 'missing',
    userDataDir,
    userDataDirLabel: userDataDir ? basename(userDataDir) : undefined,
    profileDirectory: inferredProfileDirectory,
    profileDirectoryArg: inferredProfileDirectory ? `--profile-directory=${inferredProfileDirectory}` : undefined,
    missingEnv,
  };
}

export function getRequiredChromeProfileEnvSummary(env = process.env) {
  const hasProfilePath = Boolean(env.CHROME_PROFILE_DIR?.trim());
  const hasUserDataDir = Boolean(env.CHROME_USER_DATA_DIR?.trim());
  const hasProfileDirectory = Boolean(
    env.CHROME_PROFILE_DIRECTORY?.trim() || env.CHROME_PROFILE_NAME?.trim(),
  );
  const missingEnvVars = [];

  if (!hasProfilePath) {
    if (!hasUserDataDir) {
      missingEnvVars.push('CHROME_USER_DATA_DIR');
    }
    if (!hasProfileDirectory) {
      missingEnvVars.push('CHROME_PROFILE_NAME');
    }
  }

  return {
    ok: missingEnvVars.length === 0,
    missingEnvVars,
    recommendedProfileDirectory: CANONICAL_CHROME_PROFILE_DIRECTORY,
    recommendedDisplayName: CANONICAL_CHROME_PROFILE_DISPLAY_NAME,
    sourceProfileDirectory: SOURCE_CHROME_PROFILE_DIRECTORY,
  };
}

export function getDefaultRepoOwnedChromeUserDataDir(homeDir) {
  return join(homeDir, DEFAULT_REPO_OWNED_CHROME_USER_DATA_SUBPATH);
}

export function parseRemoteChromeProcesses(rawPsOutput) {
  return rawPsOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.includes('/Contents/MacOS/Google Chrome --'))
    .map((line) => {
      const pidMatch = line.match(/^(\d+)\s+/);
      const pid = pidMatch ? Number(pidMatch[1]) : undefined;
      const command = pidMatch ? line.slice(pidMatch[0].length) : line;
      const port = extractFlag(command, 'remote-debugging-port');
      const userDataDir = extractFlag(command, 'user-data-dir');
      const profileDirectory = extractFlag(command, 'profile-directory');

      return {
        pid,
        command,
        port: port ? Number(port) : undefined,
        userDataDir,
        userDataDirLabel: userDataDir ? basename(userDataDir) : undefined,
        profileDirectory,
      };
    })
    .filter((entry) => Number.isFinite(entry.port));
}

export function summarizeRemoteChromeProcesses(processes, requestedPort, profileConfig) {
  const matchingPort = processes.filter((process) => process.port === requestedPort);
  const exactMatches = matchingPort.filter((process) => {
    const sameUserDataDir = process.userDataDir === profileConfig.userDataDir;
    const sameProfileDirectory =
      !profileConfig.profileDirectory || process.profileDirectory === profileConfig.profileDirectory;
    return sameUserDataDir && sameProfileDirectory;
  });

  const selected =
    exactMatches[0] ??
    (matchingPort.length === 1 ? matchingPort[0] : undefined);

  return {
    found: matchingPort.length > 0,
    requestedPort,
    processCount: matchingPort.length,
    ambiguous: matchingPort.length > 1,
    profileMismatch: matchingPort.length > 0 && exactMatches.length === 0,
    selected: selected ? sanitizeChromeProcess(selected) : undefined,
    candidates: matchingPort.slice(0, 4).map(sanitizeChromeProcess),
  };
}

export function classifyMissingTarget(input = {}) {
  if (input.profileMismatch) {
    return 'profile_mismatch';
  }

  if (input.attachFailed) {
    return 'attach_failed';
  }

  return 'not_open';
}

function isDuoHumanBoundary(hostname, pathname, lowered) {
  return (
    hostname.endsWith('.duosecurity.com') &&
    pathname.startsWith('/frame/v4/auth/')
  ) || lowered.includes('duo security') || lowered.includes('touch id');
}

function isSessionResumableBoundary(hostname, pathname, lowered) {
  if (hostname === 'idp.u.washington.edu') {
    return true;
  }

  if (hostname === 'www.gradescope.com' && pathname.startsWith('/auth/saml/')) {
    return true;
  }

  return (
    lowered.includes('single sign on') ||
    lowered.includes('sso') ||
    lowered.includes('uw netid') ||
    lowered.includes('university of washington') ||
    lowered.includes('session expired') ||
    lowered.includes('登录已过期') ||
    lowered.includes('login request has expired') ||
    lowered.includes('log in to the application again')
  );
}

export function buildAuthState(authBoundary) {
  const normalized = AUTH_BOUNDARIES.includes(authBoundary) ? authBoundary : 'logged_out';
  return {
    authenticated: normalized === 'authenticated',
    authBoundary: normalized,
  };
}

export function describeAuthState(finalUrl = '', title = '', bodyPreview = '', input = {}) {
  const classification = !finalUrl ? classifyMissingTarget(input) : classifyPage(finalUrl, title, bodyPreview);
  if (classification === 'profile_mismatch') {
    return buildAuthState('profile_mismatch');
  }
  if (classification === 'attach_failed') {
    return buildAuthState('attach_failed');
  }
  if (classification === 'not_open') {
    return buildAuthState('not_open');
  }
  if (classification === 'likely_authenticated') {
    return buildAuthState('authenticated');
  }

  let hostname = '';
  let pathname = '';
  try {
    const parsed = new URL(finalUrl);
    hostname = parsed.hostname.toLowerCase();
    pathname = parsed.pathname.toLowerCase();
  } catch {}

  const lowered = `${finalUrl} ${title} ${bodyPreview}`.toLowerCase();

  if (isDuoHumanBoundary(hostname, pathname, lowered)) {
    return buildAuthState('mfa_required');
  }

  if (isSessionResumableBoundary(hostname, pathname, lowered)) {
    return buildAuthState('session_resumable');
  }

  return buildAuthState('logged_out');
}

export function classifyPage(finalUrl = '', title = '', bodyPreview = '') {
  let urlForClassification = finalUrl;
  let parsedHostname = '';
  let parsedPathname = '';
  try {
    const parsed = new URL(finalUrl);
    urlForClassification = `${parsed.origin}${parsed.pathname}`;
    parsedHostname = parsed.hostname.toLowerCase();
    parsedPathname = parsed.pathname.toLowerCase();
  } catch {}

  const lowered = `${urlForClassification} ${title} ${bodyPreview}`.toLowerCase();
  if (lowered.includes('just a moment') || lowered.includes('checking your browser')) {
    return 'edge_protected_or_interstitial';
  }
  if (
    lowered.includes('dashboard') ||
    lowered.includes('course') ||
    lowered.includes('home - myuw') ||
    lowered.includes('accounts - myuw') ||
    lowered.includes('profile - myuw') ||
    lowered.includes('financial aid status') ||
    lowered.includes('tuition charge statement') ||
    lowered.includes('unofficial transcript') ||
    lowered.includes('audit your degree - myplan') ||
    (parsedHostname === 'myplan.uw.edu' && parsedPathname.startsWith('/plan') && lowered.includes('- myplan')) ||
    lowered.includes('myplan planning') ||
    lowered.includes('your courses') ||
    lowered.includes('sign out') ||
    lowered.includes('log out') ||
    lowered.includes('edit account') ||
    lowered.includes('account summaries') ||
    lowered.includes('date prepared:') ||
    lowered.includes('catalog year:') ||
    lowered.includes('amount due') ||
    lowered.includes('/dashboard') ||
    lowered.includes('/courses/') ||
    lowered.includes('/prompts/new_chat')
  ) {
    return 'likely_authenticated';
  }
  if (
    lowered.includes('sign in') ||
    lowered.includes('log in') ||
    lowered.includes('login') ||
    lowered.includes('single sign on') ||
    lowered.includes('sso') ||
    lowered.includes('uw netid') ||
    lowered.includes('university of washington') ||
    lowered.includes('password') ||
    lowered.includes('email address') ||
    lowered.includes('choose an account') ||
    lowered.includes('duo security') ||
    lowered.includes('session expired') ||
    lowered.includes('登录已过期') ||
    lowered.includes('touch id') ||
    (parsedHostname.endsWith('.duosecurity.com') && parsedPathname.startsWith('/frame/v4/auth/'))
  ) {
    return 'login_required';
  }
  return 'public_or_unknown';
}
