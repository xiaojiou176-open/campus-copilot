import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { chromium } from '@playwright/test';
import {
  ensureDirectory,
  getBrowserRootState,
  getCacheGovernancePolicy,
  getChromeProcessList,
  getRepoBrowserRootStatus,
  readBrowserSessionState,
  removeBrowserSingletonArtifacts,
  writeJson,
} from './lib/cache-governance.mjs';
import { DEFAULT_CHROME_EXECUTABLE } from './live-probe-shared.mjs';
import { disconnectCdpBrowser } from './shared/disconnect-cdp-browser.mjs';
import { writeBrowserIdentityPage } from './shared/browser-instance-identity.mjs';
import { buildBrowserLaunchPayload } from './shared/browser-launch-payload.mjs';

const CANONICAL_CAMPUS_URLS = {
  canvas: 'https://canvas.uw.edu/',
  gradescope: 'https://www.gradescope.com/auth/saml/uw',
  edstem: 'https://edstem.org/us/dashboard',
  myuw: 'https://my.uw.edu/',
};
const BROWSER_LAUNCH_MODE_ENV = 'CAMPUS_COPILOT_BROWSER_LAUNCH_MODE';
const BROWSER_LAUNCH_REASON_ENV = 'CAMPUS_COPILOT_BROWSER_LAUNCH_REASON';
const OPERATOR_MANUAL_LAUNCH_MODE = 'operator-manual';

function getDetachedLaunchGuard() {
  const mode = process.env[BROWSER_LAUNCH_MODE_ENV]?.trim().toLowerCase();
  const reason = process.env[BROWSER_LAUNCH_REASON_ENV]?.trim();
  if (mode === OPERATOR_MANUAL_LAUNCH_MODE && reason) {
    return { ok: true };
  }
  return {
    ok: false,
    detail:
      'browser-launch will only create a detached repo-owned Chrome lane in operator-manual mode. ' +
      `Set ${BROWSER_LAUNCH_MODE_ENV}=${OPERATOR_MANUAL_LAUNCH_MODE} ` +
      `and ${BROWSER_LAUNCH_REASON_ENV}=<auditable reason> to continue.`,
  };
}

function isIdentityUrl(url, identityUrl) {
  return Boolean(identityUrl) && url === identityUrl;
}

function getWarmStartUrls(sessionState, requestedUrl, identityPage) {
  const urls = [];
  if (identityPage?.identityUrl) {
    urls.push(identityPage.identityUrl);
  }
  if (requestedUrl && requestedUrl !== 'about:blank') {
    urls.push(requestedUrl);
    return urls;
  }

  const edstemPreferredUrl =
    sessionState?.edstemLastAuthenticatedCoursePage?.finalUrl &&
    isEdstemCoursePage(sessionState.edstemLastAuthenticatedCoursePage.finalUrl)
      ? sessionState.edstemLastAuthenticatedCoursePage.finalUrl
      : CANONICAL_CAMPUS_URLS.edstem;

  urls.push(
    CANONICAL_CAMPUS_URLS.canvas,
    CANONICAL_CAMPUS_URLS.gradescope,
    edstemPreferredUrl,
    CANONICAL_CAMPUS_URLS.myuw,
  );
  return urls;
}

function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) {
      continue;
    }
    const key = value.slice(2);
    const next = argv[index + 1];
    flags[key] = next && !next.startsWith('--') ? argv[++index] : 'true';
  }
  return flags;
}

function waitForCdp(port, timeoutMs = 12000) {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    function probe() {
      const req = httpRequest(
        {
          hostname: '127.0.0.1',
          port,
          path: '/json/version',
          method: 'GET',
          timeout: 1000,
        },
        (res) => {
          if (res.statusCode === 200) {
            resolve(true);
            res.resume();
            return;
          }
          res.resume();
          if (Date.now() - startedAt >= timeoutMs) {
            resolve(false);
            return;
          }
          setTimeout(probe, 250);
        },
      );

      req.on('error', () => {
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(probe, 250);
      });
      req.on('timeout', () => req.destroy());
      req.end();
    }

    probe();
  });
}

function isEdstemCoursePage(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'edstem.org' && /^\/us\/courses\//.test(parsed.pathname);
  } catch {
    return false;
  }
}

function classifyCampusCoverage(url) {
  try {
    const parsed = new URL(url);
    const normalized = `${parsed.origin}${parsed.pathname}`;
    if (normalized.startsWith('https://canvas.uw.edu/')) {
      return 'canvas';
    }
    if (parsed.hostname === 'www.gradescope.com') {
      return 'gradescope';
    }
    if (parsed.hostname === 'edstem.org' && (parsed.pathname === '/us/dashboard' || isEdstemCoursePage(url))) {
      return 'edstem';
    }
    if (normalized.startsWith('https://my.uw.edu/')) {
      return 'myuw';
    }
  } catch {}
  return undefined;
}

async function listCurrentTabs(context) {
  const tabs = [];
  for (const page of context.pages()) {
    tabs.push({
      title: await page.title().catch(() => ''),
      url: page.url(),
      campusSite: classifyCampusCoverage(page.url()),
    });
  }
  return tabs;
}

async function ensureWarmStartPages(context, requestedUrl, identityPage) {
  const initialPages = [...context.pages()];
  const currentTabs = (await listCurrentTabs(context)).map((entry) => ({
    ...entry,
    identityAnchor: isIdentityUrl(entry.url, identityPage?.identityUrl),
  }));
  const existingCoverage = new Set(currentTabs.map((entry) => entry.campusSite).filter(Boolean));
  const identityPresent = currentTabs.some((entry) => entry.identityAnchor);
  const desiredUrls = getWarmStartUrls(sessionState, requestedUrl, identityPage).filter((url) => {
    if (isIdentityUrl(url, identityPage?.identityUrl)) {
      return !identityPresent;
    }
    if (requestedUrl && requestedUrl !== 'about:blank') {
      return !currentTabs.some((entry) => entry.url === url);
    }
    const site = classifyCampusCoverage(url);
    return !site || !existingCoverage.has(site);
  });

  for (const url of desiredUrls) {
    const page = await context.newPage();
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    }).catch(() => {});
    await page.waitForTimeout(800);
  }

  if (!requestedUrl) {
    for (const page of initialPages) {
      const url = page.url();
      if (url === 'about:blank' || url === 'chrome://newtab/' || url === 'chrome://new-tab-page/') {
        await page.close().catch(() => {});
      }
    }
  }

  return (await listCurrentTabs(context)).map((entry) => ({
    ...entry,
    identityAnchor: isIdentityUrl(entry.url, identityPage?.identityUrl),
  }));
}

const flags = parseArgs(process.argv.slice(2));
const policy = getCacheGovernancePolicy(process.env);
const browserRootState = getBrowserRootState(policy);
const chromeProcessList = getChromeProcessList();
const browserStatus = getRepoBrowserRootStatus(chromeProcessList, policy);
const explicitUrl = typeof flags.url === 'string' && flags.url.trim() ? flags.url.trim() : undefined;
const targetUrl = explicitUrl ?? 'about:blank';
const sessionState = readBrowserSessionState(policy.browserStateRoot);
const cdpUrl = `http://127.0.0.1:${policy.browserCdpPort}`;
const identityPage = writeBrowserIdentityPage({
  repoRoot: process.cwd(),
  env: process.env,
  cdpPort: policy.browserCdpPort,
  cdpUrl,
  browserProfile: {
    userDataDir: policy.browserUserDataRoot,
    profileDisplayName: policy.browserProfileDisplayName,
    profileDirectory: policy.browserProfileDirectory,
  },
  primarySiteUrl: CANONICAL_CAMPUS_URLS.canvas,
});

if (!browserRootState.bootstrapped) {
  console.log(
    JSON.stringify(
      {
        status: 'blocked',
        blocked: 'browser_root_not_bootstrapped',
        browserRootState,
        nextActions: [
          'Run `pnpm browser:bootstrap` first to inspect the migration plan.',
          'Then run `pnpm browser:bootstrap:apply` after the source Chrome root is fully closed.',
        ],
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

if (browserStatus.foreignOccupancy) {
  console.log(
    JSON.stringify(
      {
        status: 'blocked',
        blocked: 'browser_root_in_use_by_foreign_process',
        browserStatus,
        nextActions: [
          'Close the process that currently owns the repo browser root.',
          'Do not second-launch the same root from another process tree.',
        ],
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

if (browserStatus.repoOwnedInstanceRunning) {
  let currentTabs = [];
  try {
    const browser = await chromium.connectOverCDP(cdpUrl, { timeout: 5000 });
    const context = browser.contexts()[0];
    if (context) {
      currentTabs = await ensureWarmStartPages(context, explicitUrl, identityPage);
    }
    await disconnectCdpBrowser(browser).catch(() => {});
  } catch {}
  writeJson(policy.browserInstanceMetadataPath, {
    updatedAt: new Date().toISOString(),
    browserUserDataRoot: policy.browserUserDataRoot,
    browserProfileDirectory: policy.browserProfileDirectory,
    browserProfileDisplayName: policy.browserProfileDisplayName,
    cdpUrl,
    pid: browserStatus.processes.find((entry) => entry.remoteDebuggingPort === policy.browserCdpPort)?.pid,
    identityPage,
    status: 'already_running',
  });
  console.log(
    JSON.stringify(
      buildBrowserLaunchPayload({
        status: 'ok',
        mode: 'already_running',
        cdpUrl,
        identityPage,
        browserStatus,
        sessionState,
        currentTabs,
      }),
      null,
      2,
    ),
  );
  process.exit(0);
}

ensureDirectory(policy.browserStateRoot);
ensureDirectory(policy.browserUserDataRoot);
removeBrowserSingletonArtifacts(policy.browserUserDataRoot);

const launchGuard = getDetachedLaunchGuard();
if (!launchGuard.ok) {
  console.error(`[browser:launch] ${launchGuard.detail}`);
  process.exit(1);
}

const child = spawn(
  DEFAULT_CHROME_EXECUTABLE,
  [
    `--remote-debugging-port=${policy.browserCdpPort}`,
    `--user-data-dir=${policy.browserUserDataRoot}`,
    `--profile-directory=${policy.browserProfileDirectory}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--new-window',
    ...getWarmStartUrls(sessionState, explicitUrl, identityPage),
  ],
  {
    detached: true,
    stdio: 'ignore',
  },
);
child.unref();

const ready = await waitForCdp(policy.browserCdpPort, 12000);
let currentTabs = [];

if (ready) {
  try {
    const browser = await chromium.connectOverCDP(cdpUrl, { timeout: 5000 });
    const context = browser.contexts()[0];
    if (context) {
      currentTabs = await ensureWarmStartPages(context, explicitUrl, identityPage);
    }
    await disconnectCdpBrowser(browser).catch(() => {});
  } catch {}
}

writeJson(policy.browserInstanceMetadataPath, {
  updatedAt: new Date().toISOString(),
  browserUserDataRoot: policy.browserUserDataRoot,
  browserProfileDirectory: policy.browserProfileDirectory,
  browserProfileDisplayName: policy.browserProfileDisplayName,
  cdpUrl,
  pid: child.pid,
  targetUrl,
  launchUrls: getWarmStartUrls(sessionState, explicitUrl, identityPage),
  identityPage,
  status: ready ? 'ready' : 'launch_requested',
});

console.log(
  JSON.stringify(
    buildBrowserLaunchPayload({
      status: ready ? 'ok' : 'blocked',
      mode: ready ? 'launched' : 'launch_requested_but_listener_not_ready',
      browserUserDataRoot: policy.browserUserDataRoot,
      browserProfileDirectory: policy.browserProfileDirectory,
      browserProfileDisplayName: policy.browserProfileDisplayName,
      cdpUrl,
      pid: child.pid,
      targetUrl,
      identityPage,
      sessionState,
      currentTabs,
      nextActions: ready
        ? ['Attach future live/browser diagnostics to this single instance instead of launching a second one.']
        : ['Wait for the browser to finish opening, then rerun `pnpm browser:launch` or `pnpm diagnose:live`.'],
    }),
    null,
    2,
  ),
);
process.exit(ready ? 0 : 2);
