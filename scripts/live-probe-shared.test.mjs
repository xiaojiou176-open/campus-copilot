import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  assignRequestedUrlMatches,
  buildCdpTargetSummary,
  buildSupportHighlights,
  buildProfileAlignmentRecommendation,
  buildRemoteDebugRelaunchRecommendation,
  classifyPage,
  classifyFromExistingTab,
  describeRequestedProfileEvidence,
  describeCdpConnectError,
  collectChromeDebugCandidateUrls,
  collectChromeDebugProcesses,
  collectListeningPids,
  describeCdpHttpFailure,
  detectProfileMismatch,
  determineAttachStatus,
  extractJsonFromOutput,
  findBestRequestedUrlMatch,
  matchesRequestedUrl,
  normalizeCdpConnectUrl,
  parseDevToolsActivePort,
  parsePositiveInt,
  pickProbeFailureReason,
  readDevToolsActivePortHint,
  reconcileObservedClassification,
  resolveChromeSessionConfig,
  shouldSkipBrowserCdpAttach,
  summarizeLiveProbe,
  shouldUseCdpTargetResults,
} from './live-probe-shared.mjs';

const MOCK_HOME = '/mock-home';
const MOCK_CHROME_ROOT = `${MOCK_HOME}/Library/Application Support/Google/Chrome`;
const MOCK_REPO_BROWSER_ROOT = `${MOCK_HOME}/.cache/campus-copilot/browser/chrome-user-data`;
const MOCK_CLONE_ROOT = `${MOCK_HOME}/.campus-copilot-profile13-clone`;
const MOCK_DEBUG_ROOT = `${MOCK_HOME}/.chrome-debug-profile`;
const MOCK_SWITCHYARD_BROWSER_ROOT = `${MOCK_HOME}/Documents/VS Code/1_Personal_Project/开源/Switchyard/.runtime-cache/switchyard-web-auth-browser`;
const MOCK_OTHER_PROFILE_ROOT = `${MOCK_HOME}/some-other-profile`;

test('resolveChromeSessionConfig supports explicit user-data-dir and profile name', () => {
  const config = resolveChromeSessionConfig({
    HOME: MOCK_HOME,
    CHROME_USER_DATA_DIR: MOCK_CHROME_ROOT,
    CHROME_PROFILE_NAME: 'Profile 13',
    CHROME_ATTACH_MODE: 'page',
    CHROME_CDP_ATTACH_TIMEOUT_MS: '4100',
  });

  assert.equal(config.attachMode, 'page');
  assert.equal(config.attachModeSource, 'env');
  assert.equal(config.profileDirectory, 'Profile 13');
  assert.equal(config.userDataDir, MOCK_CHROME_ROOT);
  assert.equal(config.requestedProfileLabel, 'Profile 13');
  assert.equal(config.cdpAttachTimeoutMs, 4100);
});

test('resolveChromeSessionConfig falls back when timeout env values are invalid', () => {
  const config = resolveChromeSessionConfig({
    HOME: MOCK_HOME,
    CHROME_CDP_ATTACH_TIMEOUT_MS: 'not-a-number',
    CHROME_NAVIGATION_TIMEOUT_MS: '-1',
  });

  assert.equal(config.cdpAttachTimeoutMs, 5000);
  assert.equal(config.navigationTimeoutMs, 12000);
  assert.equal(parsePositiveInt('also-bad', 45000), 45000);
  assert.equal(config.profileRequirementStatus, 'configured');
  assert.equal(config.userDataDir, MOCK_REPO_BROWSER_ROOT);
  assert.equal(config.profileDirectory, 'Profile 1');
  assert.equal(config.browserRootRequirementStatus, 'browser_root_not_bootstrapped');
});

test('resolveChromeSessionConfig defaults to the repo-owned browser root when env is omitted', () => {
  const config = resolveChromeSessionConfig({
    HOME: MOCK_HOME,
  });

  assert.equal(config.profileRequirementStatus, 'configured');
  assert.equal(config.userDataDir, MOCK_REPO_BROWSER_ROOT);
  assert.equal(config.profileDirectory, 'Profile 1');
  assert.match(config.browserRootRequirementMessage ?? '', /Profile 13/);
});

test('extractJsonFromOutput keeps parsing the first JSON object when pnpm appends lifecycle noise', () => {
  const parsed = extractJsonFromOutput('{"status":"failed","persistentFallbackError":"ProcessSingleton"}\nELIFECYCLE Command failed with exit code 1.');
  assert.equal(parsed?.status, 'failed');
  assert.equal(parsed?.persistentFallbackError, 'ProcessSingleton');
});

test('describeCdpHttpFailure classifies missing DevTools target endpoints', () => {
  assert.equal(describeCdpHttpFailure('/json/version', 404), 'cdp_http_404_no_targets');
  assert.equal(describeCdpHttpFailure('/json/list', 404), 'cdp_http_404_no_targets');
  assert.equal(describeCdpHttpFailure('/json/version', 502), 'cdp_http_502__json_version');
});

test('describeCdpConnectError classifies websocket rejection', () => {
  assert.equal(
    describeCdpConnectError('Error: browserType.connectOverCDP: WebSocket error: ws://127.0.0.1:9222/devtools/browser/test 403 Forbidden\nConnection rejected'),
    'cdp_ws_forbidden',
  );
});

test('pickProbeFailureReason prefers attach-level truth over generic no-results fallback', () => {
  assert.equal(
    pickProbeFailureReason({
      cdpAttachError: 'debug_chrome_process_present_but_not_listening',
      cdpProbe: {
        error: 'connect ECONNREFUSED 127.0.0.1:9334',
      },
    }),
    'debug_chrome_process_present_but_not_listening',
  );

  assert.equal(
    pickProbeFailureReason({
      cdpProbe: {
        error: 'connect ECONNREFUSED 127.0.0.1:9334',
      },
    }),
    'connect ECONNREFUSED 127.0.0.1:9334',
  );

  assert.equal(pickProbeFailureReason({}), 'live_probe_no_results');
});

test('parseDevToolsActivePort parses websocket metadata', () => {
  assert.deepEqual(parseDevToolsActivePort('9222\n/devtools/browser/example\n'), {
    port: 9222,
    webSocketDebuggerPath: '/devtools/browser/example',
    webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/browser/example',
  });
});

test('readDevToolsActivePortHint only inspects the configured repo-owned browser root', () => {
  const homeDir = mkdtempSync(join(tmpdir(), 'campus-live-probe-'));
  const chromeUserDataDir = join(homeDir, '.cache/campus-copilot/browser/chrome-user-data');
  const activePortFile = join(chromeUserDataDir, 'DevToolsActivePort');
  mkdirSync(chromeUserDataDir, { recursive: true });
  writeFileSync(activePortFile, '9222\n/devtools/browser/example\n', { encoding: 'utf8' });

  assert.deepEqual(
    readDevToolsActivePortHint(
      {
        userDataDir: chromeUserDataDir,
      },
      {
        requestedPort: '9222',
      },
    ),
    {
      port: 9222,
      webSocketDebuggerPath: '/devtools/browser/example',
      webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/browser/example',
      userDataDirLabel: 'chrome-user-data',
    },
  );
});

test('readDevToolsActivePortHint keeps the first real hint when requested port misses on the repo-owned root', () => {
  const homeDir = mkdtempSync(join(tmpdir(), 'campus-live-probe-'));
  const chromeUserDataDir = join(homeDir, '.cache/campus-copilot/browser/chrome-user-data');
  const activePortFile = join(chromeUserDataDir, 'DevToolsActivePort');
  mkdirSync(chromeUserDataDir, { recursive: true });
  writeFileSync(activePortFile, '9222\n/devtools/browser/example\n', { encoding: 'utf8' });

  assert.deepEqual(
    readDevToolsActivePortHint(
      {
        userDataDir: chromeUserDataDir,
      },
      {
        requestedPort: '9334',
      },
    ),
    {
      port: 9222,
      webSocketDebuggerPath: '/devtools/browser/example',
      webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/browser/example',
      userDataDirLabel: 'chrome-user-data',
    },
  );
});

test('matchesRequestedUrl treats known login redirects as the same target family', () => {
  assert.equal(matchesRequestedUrl('https://idp.u.washington.edu/idp/profile/SAML2/Redirect/SSO', 'https://canvas.uw.edu'), true);
  assert.equal(matchesRequestedUrl('https://idp.u.washington.edu/idp/profile/SAML2/Redirect/SSO', 'https://www.gradescope.com'), true);
  assert.equal(matchesRequestedUrl('https://idp.u.washington.edu/idp/profile/SAML2/Redirect/SSO', 'https://my.uw.edu'), true);
  assert.equal(matchesRequestedUrl('https://api-57f2a007.duosecurity.com/frame/v4/auth/prompt', 'https://canvas.uw.edu'), true);
  assert.equal(matchesRequestedUrl('https://api-57f2a007.duosecurity.com/frame/v4/auth/prompt', 'https://www.gradescope.com'), true);
  assert.equal(matchesRequestedUrl('https://api-57f2a007.duosecurity.com/frame/v4/auth/prompt', 'https://my.uw.edu'), true);
  assert.equal(matchesRequestedUrl('https://auth.openai.com/log-in', 'https://platform.openai.com'), true);
  assert.equal(matchesRequestedUrl('https://accounts.google.com/signin/v2/identifier', 'https://aistudio.google.com'), true);
  assert.equal(matchesRequestedUrl('https://example.com/login', 'https://canvas.uw.edu'), false);
});

test('findBestRequestedUrlMatch prefers an exact site tab over a generic login redirect alias', () => {
  const tabs = [
    { url: 'https://idp.u.washington.edu/idp/profile/SAML2/Redirect/SSO?execution=e2s1', title: 'UW NetID sign-in' },
    { url: 'https://www.gradescope.com/', title: 'Gradescope' },
  ];

  assert.deepEqual(
    findBestRequestedUrlMatch(tabs, 'https://www.gradescope.com', (entry) => entry.url),
    tabs[1],
  );
});

test('findBestRequestedUrlMatch prefers the stronger authenticated Gradescope tab over a timeout tab when URL scores tie', () => {
  const tabs = [
    { url: 'https://www.gradescope.com/?reason=timeout', title: 'Gradescope' },
    { url: 'https://www.gradescope.com/', title: 'Your Courses | Gradescope' },
  ];

  assert.deepEqual(
    findBestRequestedUrlMatch(tabs, 'https://www.gradescope.com/auth/saml/uw', (entry) => entry.url, (entry) => entry.title),
    tabs[1],
  );
});

test('buildCdpTargetSummary keeps full page targets for matching and truncates preview fields only', () => {
  const targets = Array.from({ length: 10 }, (_, index) => ({
    type: 'page',
    title: `Tab ${index + 1}`,
    url: `https://example-${index + 1}.uw.edu/`,
  }));

  const summary = buildCdpTargetSummary(targets);

  assert.equal(summary.ok, true);
  assert.equal(summary.pageCount, 10);
  assert.equal(summary.urls.length, 10);
  assert.equal(summary.titles.length, 10);
  assert.equal(summary.urlsPreview.length, 8);
  assert.equal(summary.titlesPreview.length, 8);
  assert.equal(summary.urlsOmittedCount, 2);
  assert.equal(summary.titlesOmittedCount, 2);
  assert.equal(summary.urls[8], 'https://example-9.uw.edu/');
  assert.equal(summary.urlsPreview.at(-1), 'https://example-8.uw.edu/');
  assert.equal(JSON.parse(JSON.stringify(summary)).urls, undefined);
});

test('assignRequestedUrlMatches does not reuse the same redirect tab across multiple requested sites', () => {
  const tabs = [
    { url: 'https://idp.u.washington.edu/idp/profile/SAML2/Redirect/SSO?execution=e1s1', title: 'UW NetID sign-in - first' },
    { url: 'https://idp.u.washington.edu/idp/profile/SAML2/Redirect/SSO?execution=e2s1', title: 'UW NetID sign-in - second' },
    { url: 'https://api-57f2a007.duosecurity.com/frame/v4/auth/prompt?sid=test', title: 'Duo Security' },
  ];

  const matches = assignRequestedUrlMatches(
    tabs,
    ['https://canvas.uw.edu', 'https://www.gradescope.com', 'https://my.uw.edu'],
    (entry) => entry.url,
  );

  assert.equal(matches.length, 3);
  assert.equal(new Set(matches.map((entry) => entry?.url)).size, 3);
  assert.equal(matches[2]?.title, 'Duo Security');
});

test('assignRequestedUrlMatches prefers the stronger authenticated Gradescope tab over a timeout tab on the same host', () => {
  const tabs = [
    { url: 'https://www.gradescope.com/?reason=timeout', title: 'Gradescope' },
    { url: 'https://www.gradescope.com/', title: 'Your Courses | Gradescope' },
  ];

  const matches = assignRequestedUrlMatches(
    tabs,
    ['https://www.gradescope.com/auth/saml/uw'],
    (entry) => entry.url,
    (entry) => entry.title,
  );

  assert.equal(matches[0], tabs[1]);
});

test('classifyFromExistingTab maps known login redirect hosts into deterministic auth boundaries', () => {
  assert.deepEqual(
    classifyFromExistingTab('https://idp.u.washington.edu/idp/profile/SAML2/Redirect/SSO', 'UW NetID sign-in'),
    { authenticated: false, authBoundary: 'session_resumable' },
  );
  assert.deepEqual(
    classifyFromExistingTab('https://api-57f2a007.duosecurity.com/frame/v4/auth/prompt', 'Duo Security'),
    { authenticated: false, authBoundary: 'mfa_required' },
  );
  assert.deepEqual(classifyFromExistingTab('https://auth.openai.com/log-in', 'OpenAI'), {
    authenticated: false,
    authBoundary: 'logged_out',
  });
  assert.deepEqual(
    classifyFromExistingTab('https://accounts.google.com/signin/v2/identifier', 'Sign in - Google Accounts'),
    { authenticated: false, authBoundary: 'logged_out' },
  );
  assert.deepEqual(
    classifyFromExistingTab(
      'https://www.washington.edu/students/timeschd/pub/SPR2026/cse.html',
      'COMPUTER SCIENCE & ENGINEERING',
      { site: 'timeschedule_cse' },
    ),
    { authenticated: true, authBoundary: 'authenticated' },
  );
});

test('buildProbeNextStep emits Duo-specific guidance for login_required pages at Duo', async () => {
  const { buildProbeNextStep } = await import('./live-probe-shared.mjs');
  assert.equal(
    buildProbeNextStep({
      site: 'canvas',
      classification: 'login_required',
      finalUrl: 'https://api-57f2a007.duosecurity.com/frame/v4/auth/prompt?sid=test',
      title: 'Duo Security',
    }),
    'canvas: approve Duo MFA in the requested profile',
  );
});

test('buildProbeNextStep routes Gradescope login_required pages to the UW SSO entrypoint', async () => {
  const { buildProbeNextStep } = await import('./live-probe-shared.mjs');
  assert.equal(
    buildProbeNextStep({
      site: 'gradescope',
      classification: 'login_required',
      finalUrl: 'https://www.gradescope.com/login',
      title: 'Log In | Gradescope',
    }),
    'gradescope: continue via https://www.gradescope.com/auth/saml/uw and reuse the existing UW SSO session from Canvas / MyUW',
  );
});

test('classifyPage prefers authenticated course surfaces over generic school-login phrases', () => {
  assert.equal(
    classifyPage(
      'https://www.gradescope.com/',
      'Your Courses | Gradescope',
      'Hello Example Student Log Out You have already linked this University of Washington NetID to Gradescope. Course Dashboard',
    ),
    'likely_authenticated',
  );
});

test('classifyPage does not treat the public Ed Discussion marketing page as authenticated', () => {
  assert.equal(
    classifyPage(
      'https://edstem.org/',
      'Ed Discussion',
      'Skip to main content SIGN UP LOGIN Ed Discussion Next gen class Q&A Ed Discussion helps scale class communication in a beautiful and intuitive interface.',
    ),
    'login_required',
  );
});

test('classifyPage ignores redirect query noise when the page itself is still a login surface', () => {
  assert.equal(
    classifyPage(
      'https://edstem.org/us/login?redirect=/us/dashboard&auth=1',
      'Ed Discussion',
      'SIGN UP LOGIN Continue',
    ),
    'login_required',
  );
});

test('classifyPage treats Duo prompt and session expiry pages as login_required instead of ambiguous', () => {
  assert.equal(
    classifyPage(
      'https://api-57f2a007.duosecurity.com/frame/v4/auth/prompt?sid=test',
      'Duo Security',
      'Duo two-factor login prompt',
    ),
    'login_required',
  );

  assert.equal(
    classifyPage(
      'https://api-57f2a007.duosecurity.com/frame/v4/auth/session_expired',
      'Duo Security',
      '登录已过期 您的登录请求已过期。尝试重新登录应用。 需要帮助？ 由 Duo 保护',
    ),
    'login_required',
  );

  assert.equal(
    classifyPage(
      'https://login.example.edu/retry',
      'Sign in again',
      'Your login request has expired. Try to log in to the application again.',
    ),
    'login_required',
  );
});

test('classifyPage recognizes review-first planning/admin detail pages as authenticated surfaces', () => {
  assert.equal(
    classifyPage(
      'https://myplan.uw.edu/plan/#/sp26',
      'Spring 2026 - MyPlan',
      '',
    ),
    'likely_authenticated',
  );
  assert.equal(
    classifyPage(
      'https://myplan.uw.edu/audit/#/degree',
      'Audit Your Degree - MyPlan',
      'Sign Out Audit Degree (DARS) Date Prepared: 04/06/26 Catalog Year: AU 25',
    ),
    'likely_authenticated',
  );
  assert.equal(
    classifyPage(
      'https://sdb.admin.uw.edu/sisStudents/uwnetid/untranscript.aspx',
      'Unofficial Transcript',
      'CUM GPA Academic Standing Date Prepared',
    ),
    'likely_authenticated',
  );
  assert.equal(
    classifyPage(
      'https://sdb.admin.uw.edu/sisStudents/uwnetid/tuition.aspx',
      'Tuition Charge Statement',
      'Official Tuition Charge Statement Amount Due Spring 2026',
    ),
    'likely_authenticated',
  );
});

test('looksLikeMyPlanLoadingShell recognizes the generic MyPlan loading shell and ignores real planning views', async () => {
  const { looksLikeMyPlanLoadingShell } = await import('./live-probe-shared.mjs');

  assert.equal(
    looksLikeMyPlanLoadingShell(
      'https://myplan.uw.edu/plan/#/sp26',
      'MyPlan',
      'Navigate to MyPlan Loading Navigation Loading... MyPlan HelpContactTermsPrivacy',
    ),
    true,
  );

  assert.equal(
    looksLikeMyPlanLoadingShell(
      'https://myplan.uw.edu/plan/#/sp26',
      'Spring 2026 - MyPlan',
      'Navigate to Spring 2026 - MyPlan Manage My Spring 2026 Schedule Builder',
    ),
    false,
  );
});

test('summarizeLiveProbe reports evidence coverage when probe output includes browser evidence', () => {
  const summary = summarizeLiveProbe({
    attachModeResolved: 'page_requested_profile',
    attachStatus: 'attached',
    evidenceCapture: {
      console: true,
      network: true,
      trace: {
        status: 'captured',
      },
    },
    results: [
      {
        name: 'canvas',
        classification: 'likely_authenticated',
        evidence: {
          consoleSummary: {
            sampleCount: 1,
          },
        },
      },
      {
        name: 'gradescope',
        classification: 'public_or_unknown',
      },
    ],
  });

  assert.deepEqual(summary?.evidenceCoverage, {
    sitesWithEvidence: ['canvas'],
    consoleEnabled: true,
    networkEnabled: true,
    traceStatus: 'captured',
  });
});

test('buildSupportHighlights surfaces evidence capture status in readable summary', () => {
  const highlights = buildSupportHighlights({
    diagnose: {
      parsed: {
        liveSummary: {
          attachModeResolved: 'page_requested_profile',
          attachStatus: 'attached',
          campus: {
            canvas: { classification: 'likely_authenticated' },
            gradescope: { classification: 'public_or_unknown' },
            edstem: { classification: 'likely_authenticated' },
            myuw: { classification: 'login_required' },
          },
          evidenceCoverage: {
            consoleEnabled: true,
            networkEnabled: false,
            traceStatus: 'captured',
            sitesWithEvidence: ['canvas', 'myuw'],
          },
        },
        chromeProfile: {
          userDataDirLabel: 'Chrome',
        },
      },
    },
  });

  assert.ok(highlights.includes('evidence=console:on network:off trace:captured'));
  assert.ok(highlights.includes('evidenceSites=canvas, myuw'));
});

test('collectChromeDebugProcesses preserves profile names and paths containing spaces', () => {
  const processes = collectChromeDebugProcesses(
    `76255 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=9222 --user-data-dir=${MOCK_CHROME_ROOT} --profile-directory=Profile 13 https://canvas.uw.edu\n`,
    '9222',
  );

  assert.equal(processes[0]?.userDataDirLabel, 'Chrome');
  assert.equal(processes[0]?.profileDirectory, 'Profile 13');
});

test('collectChromeDebugProcesses stops profile parsing before about:blank launch args', () => {
  const processes = collectChromeDebugProcesses(
    `81175 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=9334 --user-data-dir=${MOCK_CLONE_ROOT} --profile-directory=Profile 13 about:blank\n`,
    '9334',
  );

  assert.equal(processes[0]?.profileDirectory, 'Profile 13');
});

test('collectChromeDebugProcesses stops profile parsing before chrome://settings launch args', () => {
  const processes = collectChromeDebugProcesses(
    `81176 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=9444 --user-data-dir=${MOCK_CLONE_ROOT} --profile-directory=Profile 13 chrome://settings\n`,
    '9444',
  );

  assert.equal(processes[0]?.profileDirectory, 'Profile 13');
});

test('collectChromeDebugProcesses stops profile parsing before data: launch args', () => {
  const processes = collectChromeDebugProcesses(
    `81177 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=9555 --user-data-dir=${MOCK_CLONE_ROOT} --profile-directory=Profile 13 data:text/html,<!doctype html><title>Test</title>\n`,
    '9555',
  );

  assert.equal(processes[0]?.profileDirectory, 'Profile 13');
});

test('collectChromeDebugCandidateUrls discovers active remote debugging ports', () => {
  assert.deepEqual(
    collectChromeDebugCandidateUrls(
      [
        `76255 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=9334 --user-data-dir=${MOCK_CLONE_ROOT} --profile-directory=Profile 13 https://canvas.uw.edu`,
        `76256 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=9222 --user-data-dir=${MOCK_DEBUG_ROOT} about:blank`,
      ].join('\n'),
    ),
    [
      'http://127.0.0.1:9334',
      'http://localhost:9334',
      'http://127.0.0.1:9222',
      'http://localhost:9222',
    ],
  );
});

test('normalizeCdpConnectUrl rewrites localhost to 127.0.0.1 for local CDP listeners', () => {
  assert.equal(
    normalizeCdpConnectUrl('http://localhost:9334'),
    'http://127.0.0.1:9334/',
  );
  assert.equal(
    normalizeCdpConnectUrl('ws://localhost:9334/devtools/browser/test'),
    'ws://127.0.0.1:9334/devtools/browser/test',
  );
  assert.equal(
    normalizeCdpConnectUrl('http://127.0.0.1:9334'),
    'http://127.0.0.1:9334/',
  );
});

test('collectChromeDebugCandidateUrls keeps only requested-profile listeners when a profile is supplied', () => {
  assert.deepEqual(
    collectChromeDebugCandidateUrls(
      [
        `76255 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=9334 --user-data-dir=${MOCK_CLONE_ROOT} --profile-directory=Profile 13 https://canvas.uw.edu`,
        `76256 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=39222 --user-data-dir=${MOCK_SWITCHYARD_BROWSER_ROOT} https://grok.com`,
      ].join('\n'),
      {
        userDataDir: MOCK_CLONE_ROOT,
        profileDirectory: 'Profile 13',
      },
    ),
    ['http://127.0.0.1:9334', 'http://localhost:9334'],
  );

  assert.deepEqual(
    collectChromeDebugCandidateUrls(
      [
        `76256 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=39222 --user-data-dir=${MOCK_SWITCHYARD_BROWSER_ROOT} https://grok.com`,
      ].join('\n'),
      {
        userDataDir: MOCK_DEBUG_ROOT,
      },
    ),
    [],
  );
});

test('collectListeningPids extracts active listener process ids from lsof output', () => {
  assert.deepEqual(
    collectListeningPids(
      'COMMAND    PID     USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nGoogle    9617 tester   49u  IPv4 0x1 0t0 TCP 127.0.0.1:9222 (LISTEN)\n',
    ),
    [9617],
  );
});

test('buildProfileAlignmentRecommendation emits copy-ready commands for the active listener', () => {
  const recommendation = buildProfileAlignmentRecommendation({
    pid: 9617,
    userDataDir: MOCK_CLONE_ROOT,
    userDataDirLabel: '.campus-copilot-profile13-clone',
    profileDirectory: 'Profile 13',
  });

  assert.equal(recommendation?.profileName, 'Profile 13');
  assert.match(recommendation?.probeCommand ?? '', /CHROME_USER_DATA_DIR="\/mock-home\/\.campus-copilot-profile13-clone"/);
  assert.match(recommendation?.probeCommand ?? '', /CHROME_PROFILE_NAME="Profile 13"/);
  assert.match(recommendation?.diagnoseCommand ?? '', /pnpm diagnose:live$/);
});

test('buildRemoteDebugRelaunchRecommendation emits a copy-ready Chrome launch command', () => {
  const recommendation = buildRemoteDebugRelaunchRecommendation(
    {
      pid: 9617,
      userDataDir: MOCK_CHROME_ROOT,
      userDataDirLabel: 'Chrome',
      profileDirectory: 'Profile 13',
      launchUrls: ['https://canvas.uw.edu/', 'https://www.gradescope.com/'],
    },
    'http://localhost:9222',
  );

  assert.equal(recommendation?.profileName, 'Profile 13');
  assert.match(recommendation?.relaunchCommand ?? '', /--remote-debugging-port=9222/);
  assert.match(recommendation?.relaunchCommand ?? '', /--user-data-dir="\/mock-home\/Library\/Application Support\/Google\/Chrome"/);
  assert.match(recommendation?.relaunchCommand ?? '', /--profile-directory="Profile 13"/);
  assert.match(recommendation?.relaunchCommand ?? '', /"https:\/\/canvas\.uw\.edu\/"/);
});

test('reconcileObservedClassification flags profile mismatch when visible tab is authenticated', () => {
  assert.equal(reconcileObservedClassification('login_required', 'likely_authenticated'), 'profile_mismatch');
  assert.equal(reconcileObservedClassification('likely_authenticated', 'likely_authenticated'), 'likely_authenticated');
});

test('detectProfileMismatch trusts requested-profile contexts over unrelated observed listeners', () => {
  assert.equal(
    detectProfileMismatch({
      attachModeResolved: 'persistent_context',
      sessionConfig: {
        userDataDir: MOCK_CLONE_ROOT,
        profileDirectory: 'Profile 13',
      },
      debugProcesses: [
        {
          port: 9222,
          userDataDir: MOCK_CHROME_ROOT,
          userDataDirLabel: 'Chrome',
          profileDirectory: 'Profile 13',
        },
      ],
      observedTabResults: [{ classification: 'likely_authenticated' }],
      primaryResults: [{ classification: 'login_required' }],
    }),
    false,
  );
});

test('shouldSkipBrowserCdpAttach allows browser attach when profile picker exists beside real tabs', () => {
  assert.equal(
    shouldSkipBrowserCdpAttach({
      ok: true,
      pageCount: 3,
      urls: ['chrome://profile-picker/', 'https://edstem.org/us/dashboard', 'https://platform.openai.com/login'],
    }),
    false,
  );

  assert.equal(
    shouldSkipBrowserCdpAttach({
      ok: true,
      pageCount: 1,
      urls: ['chrome://profile-picker/'],
    }),
    true,
  );
});

test('shouldSkipBrowserCdpAttach allows chrome-only targets when the requested profile matches the active listener', () => {
  assert.equal(
    shouldSkipBrowserCdpAttach(
      {
        ok: true,
        pageCount: 1,
        urls: ['chrome://newtab/'],
      },
      {
        debugProcesses: [
          {
            pid: 123,
            userDataDir: MOCK_CLONE_ROOT,
            profileDirectory: 'Profile 13',
          },
        ],
        sessionConfig: {
          userDataDir: MOCK_CLONE_ROOT,
          profileDirectory: 'Profile 13',
        },
      },
    ),
    false,
  );

  assert.equal(
    shouldSkipBrowserCdpAttach(
      {
        ok: true,
        pageCount: 1,
        urls: ['chrome://newtab/'],
      },
      {
        debugProcesses: [
          {
            pid: 123,
            userDataDir: MOCK_OTHER_PROFILE_ROOT,
            profileDirectory: 'Profile 9',
          },
        ],
        sessionConfig: {
          userDataDir: MOCK_CLONE_ROOT,
          profileDirectory: 'Profile 13',
        },
      },
    ),
    true,
  );
});

test('determineAttachStatus reports page_fallback when page probing succeeds after attach issues', () => {
  assert.equal(
    determineAttachStatus({
      attachModeResolved: 'page_requested_profile_after_attach_failure',
      cdpAttachError: 'cdp_target_profile_picker_or_wrong_context',
      results: [
        { name: 'canvas', classification: 'login_required' },
        { name: 'edstem', classification: 'likely_authenticated' },
      ],
    }),
    'page_fallback',
  );
});

test('determineAttachStatus keeps attach_failed when site results themselves failed to attach', () => {
  assert.equal(
    determineAttachStatus({
      attachModeResolved: 'page_requested_profile_after_attach_failure',
      cdpAttachError: 'cdp_target_profile_picker_or_wrong_context',
      results: [{ name: 'canvas', classification: 'attach_failed' }],
    }),
    'attach_failed',
  );
});

test('shouldUseCdpTargetResults prefers live CDP page targets in explicit page mode', () => {
  assert.equal(
    shouldUseCdpTargetResults({
      attachMode: 'page',
      cdpAttachError: undefined,
      cdpTargetResults: [
        {
          name: 'canvas',
          source: 'existing_tab_cdp_target',
        },
      ],
    }),
    true,
  );
});

test('determineAttachStatus treats page_cdp_targets as an attached surface', () => {
  assert.equal(
    determineAttachStatus({
      attachModeResolved: 'page_cdp_targets',
      cdpAttachError: undefined,
      results: [
        { name: 'canvas', classification: 'likely_authenticated' },
        { name: 'gradescope', classification: 'likely_authenticated' },
      ],
    }),
    'attached',
  );
});

test('summarizeLiveProbe separates campus login and provider login states', () => {
  const summary = summarizeLiveProbe({
    attachModeResolved: 'page_target_fallback',
    attachStatus: 'profile_mismatch',
    cdpAttachError: 'cdp_attach_timeout_after_8000ms',
    results: [
      { name: 'canvas', classification: 'not_open', source: 'not_open_in_current_chrome' },
      { name: 'gradescope', classification: 'public_or_unknown', source: 'fresh_page' },
      { name: 'edstem', classification: 'profile_mismatch', source: 'profile_mismatch_detected' },
      {
        name: 'myuw',
        classification: 'login_required',
        finalUrl: 'https://idp.u.washington.edu/idp/profile/SAML2/Redirect/SSO?execution=e1s1',
        title: 'UW NetID sign-in',
        source: 'fresh_page',
        nextStep: 'myuw: continue the canonical school SSO re-entry in the requested profile',
      },
      {
        name: 'myplan_plan',
        classification: 'likely_authenticated',
        finalUrl: 'https://myplan.uw.edu/plan/#/sp26',
        title: 'Spring 2026 - MyPlan',
        source: 'fresh_page',
      },
      {
        name: 'transcript',
        classification: 'login_required',
        finalUrl: 'https://idp.u.washington.edu/idp/profile/SAML2/Redirect/SSO?execution=e2s2',
        title: 'UW NetID sign-in',
        source: 'fresh_page',
      },
      { name: 'openai', classification: 'login_required', source: 'fresh_page' },
      { name: 'gemini', classification: 'likely_authenticated', source: 'fresh_page' },
    ],
  });

  assert.deepEqual(summary.profileMismatchSites, ['edstem']);
  assert.deepEqual(summary.campusSessionResumableSites, ['myuw']);
  assert.deepEqual(summary.campusNotOpenSites, ['canvas']);
  assert.deepEqual(summary.campusLoggedOutSites, ['gradescope']);
  assert.deepEqual(summary.campusAuthenticatedSites, []);
  assert.equal(summary.campusAuthenticatedAll, false);
  assert.equal(summary.campusNextSteps.myuw, 'myuw: continue the canonical school SSO re-entry in the requested profile');
  assert.deepEqual(summary.planningAdminAuthenticatedSites, ['myplan_plan']);
  assert.deepEqual(summary.planningAdminSessionResumableSites, ['transcript']);
  assert.equal(summary.planningAdminNextSteps.transcript, 'transcript: continue the canonical school SSO re-entry in the requested profile');
});

test('describeRequestedProfileEvidence marks existing-tab fallback as unconfirmed without listener proof', () => {
  const profileEvidence = describeRequestedProfileEvidence({
    chromeProfile: {
      label: 'Profile 13',
      userDataDirLabel: 'Chrome',
      profileDirectory: 'Profile 13',
    },
    liveSummary: {
      attachModeResolved: 'page_existing_tabs_after_attach_failure',
      attachStatus: 'page_fallback',
    },
  });

  assert.equal(profileEvidence.confirmed, false);
  assert.equal(profileEvidence.status, 'requested_profile_unconfirmed_existing_tabs');
  assert.equal(profileEvidence.evidence, 'existing_tabs_without_profile_proof');
  assert.equal(profileEvidence.highlight, 'profile=Profile 13 (requested_only_existing_tabs_unconfirmed)');
});

test('buildSupportHighlights emits a readable summary block', () => {
  const highlights = buildSupportHighlights({
    coverage: {
      total: {
        lines: { pct: 72.76 },
        statements: { pct: 72.22 },
        functions: { pct: 67.82 },
        branches: { pct: 55.26 },
      },
      testPyramid: {
        workspaceVitestPackages: 12,
        workspaceVitestFiles: 22,
        repoNodeTestFiles: 1,
        extensionPlaywrightSmokeSpecs: 1,
      },
    },
    diagnose: {
      parsed: {
        chromeProfile: {
          label: 'Profile 13',
          userDataDirLabel: 'Chrome',
        },
        cdpActivePortHint: {
          port: 9222,
          userDataDirLabel: 'Chrome',
        },
        liveSummary: {
          attachModeResolved: 'page_existing_tabs_after_attach_failure',
          attachStatus: 'attach_failed',
          campus: {
            canvas: { classification: 'not_open' },
            gradescope: { classification: 'public_or_unknown' },
          },
        },
      },
    },
  });

  assert.ok(highlights.some((line) => line.includes('attachStatus=attach_failed')));
  assert.ok(highlights.some((line) => line.includes('attachMode=page_existing_tabs_after_attach_failure')));
  assert.ok(highlights.some((line) => line.includes('profile=Profile 13 (requested_only_existing_tabs_unconfirmed)')));
  assert.ok(highlights.some((line) => line.includes('recommendedProfile=none')));
  assert.ok(highlights.some((line) => line.includes('sites=canvas:0:not_open')));
  assert.ok(highlights.some((line) => line.includes('coverage=lines:72.76')));
  assert.ok(highlights.some((line) => line.includes('testPyramid=workspaceVitestPackages:12')));
});
