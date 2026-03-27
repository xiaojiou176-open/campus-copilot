import { chromium } from '@playwright/test';
import { execFileSync, execSync } from 'node:child_process';
import { basename, dirname } from 'node:path';
import { request } from 'node:http';
import { randomUUID } from 'node:crypto';

const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const requestedProfilePath = process.env.CHROME_PROFILE_DIR || `${process.env.HOME}/.chrome-debug-profile`;
const requestedCdpUrl = process.env.CHROME_CDP_URL;
const runId = randomUUID();
const cdpCandidateUrls = Array.from(
  new Set(
    [requestedCdpUrl, 'http://localhost:9222', 'http://127.0.0.1:9222'].filter(Boolean),
  ),
);

function resolveChromeProfile(path) {
  const profileName = basename(path);
  if (profileName === 'Default' || profileName.startsWith('Profile ')) {
    return {
      requestedProfilePath: path,
      userDataDir: dirname(path),
      profileDirectoryArg: `--profile-directory=${profileName}`,
    };
  }

  return {
    requestedProfilePath: path,
    userDataDir: path,
    profileDirectoryArg: undefined,
  };
}

const profileConfig = resolveChromeProfile(requestedProfilePath);

try {
  execSync('bash scripts/check-disk-space.sh 262144 /tmp', {
    stdio: 'pipe',
  });
} catch (error) {
  const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr).trim() : 'disk_space_blocked';
  console.log(
    JSON.stringify(
      {
        runId,
        profileLabel: basename(profileConfig.requestedProfilePath),
        profileSource: process.env.CHROME_PROFILE_DIR ? 'env' : 'default',
        checkedAt: new Date().toISOString(),
        blocked: stderr || 'disk_space_blocked',
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

const urls = [
  ['canvas', 'https://canvas.uw.edu'],
  ['gradescope', 'https://www.gradescope.com'],
  ['edstem', 'https://edstem.org'],
  ['myuw', 'https://my.uw.edu'],
  ['openai', 'https://platform.openai.com'],
  ['gemini', 'https://aistudio.google.com'],
];

function toHostname(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return undefined;
  }
}

function matchesRequestedUrl(pageUrl, requestedUrl) {
  return toHostname(pageUrl) === toHostname(requestedUrl);
}

function classifyPage(finalUrl, title, bodyPreview) {
  const lowered = `${finalUrl} ${title} ${bodyPreview}`.toLowerCase();
  if (lowered.includes('sign in') || lowered.includes('log in') || lowered.includes('login')) {
    return 'login_required';
  }
  if (lowered.includes('just a moment')) {
    return 'edge_protected_or_interstitial';
  }
  if (
    lowered.includes('dashboard') ||
    lowered.includes('course') ||
    lowered.includes('discussion') ||
    lowered.includes('home - myuw') ||
    lowered.includes('your courses') ||
    lowered.includes('sign out') ||
    lowered.includes('account summaries')
  ) {
    return 'likely_authenticated';
  }
  return 'public_or_unknown';
}

function buildProbeHeader(activeCdpUrl) {
  return {
    runId,
    profileLabel: basename(profileConfig.requestedProfilePath),
    profileSource: process.env.CHROME_PROFILE_DIR ? 'env' : 'default',
    userDataDirLabel: basename(profileConfig.userDataDir),
    profileDirectory: profileConfig.profileDirectoryArg?.replace('--profile-directory=', ''),
    mode: cdpCandidateUrls.length > 0 ? 'cdp_attach' : 'persistent_context',
    cdpUrl: activeCdpUrl,
    cdpCandidates: cdpCandidateUrls,
  };
}

function classifyFromExistingTab(finalUrl, title) {
  if (!finalUrl) {
    return 'not_open';
  }

  return classifyPage(finalUrl, title, '');
}

function probeExistingChromeTabs(targets) {
  if (process.platform !== 'darwin') {
    return undefined;
  }

  try {
    const rawUrls = execFileSync(
      'osascript',
      [
        '-e',
        "set AppleScript's text item delimiters to linefeed",
        '-e',
        'tell application "Google Chrome" to return (URL of every tab of every window) as text',
      ],
      {
        encoding: 'utf8',
      },
    ).trim();
    const rawTitles = execFileSync(
      'osascript',
      [
        '-e',
        "set AppleScript's text item delimiters to linefeed",
        '-e',
        'tell application "Google Chrome" to return (title of every tab of every window) as text',
      ],
      {
        encoding: 'utf8',
      },
    ).trim();

    const urlsFromTabs = rawUrls ? rawUrls.split('\n') : [];
    const titlesFromTabs = rawTitles ? rawTitles.split('\n') : [];
    const tabs = urlsFromTabs.map((url, index) => ({
      url,
      title: titlesFromTabs[index] ?? '',
    }));

    if (tabs.length === 0) {
      return undefined;
    }

    return targets.map(([name, requestedUrl]) => {
      const matchedTab = tabs.find((tab) => matchesRequestedUrl(tab?.url, requestedUrl));
      const finalUrl = matchedTab?.url;
      const title = matchedTab?.title ?? '';

      return {
        name,
        requestedUrl,
        finalUrl,
        title,
        classification: classifyFromExistingTab(finalUrl, title),
        bodyPreview: '',
        source: matchedTab ? 'existing_tab_applescript' : 'not_open_in_current_chrome',
      };
    });
  } catch {
    return undefined;
  }
}

function probeCdp(url) {
  return new Promise((resolve) => {
    try {
      const versionUrl = new URL('/json/version/', url);
      const req = request(
        versionUrl,
        {
          method: 'GET',
          timeout: 1500,
        },
        (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            let webSocketDebuggerUrl;
            try {
              webSocketDebuggerUrl = JSON.parse(body).webSocketDebuggerUrl;
            } catch {
              webSocketDebuggerUrl = undefined;
            }

            resolve({
              ok: res.statusCode === 200 && typeof webSocketDebuggerUrl === 'string' && webSocketDebuggerUrl.length > 0,
              statusCode: res.statusCode,
              body,
            });
          });
        },
      );

      req.on('error', (error) => {
        resolve({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error('cdp_probe_timeout'));
      });

      req.end();
    } catch (error) {
      resolve({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

const cdpAttempts = [];
let cdpProbe;
let activeCdpUrl;
let cdpAttachError;

try {
  for (const candidateUrl of cdpCandidateUrls) {
    const probe = await probeCdp(candidateUrl);
    cdpAttempts.push({
      url: candidateUrl,
      ...probe,
    });
    if (!cdpProbe) {
      cdpProbe = probe;
      activeCdpUrl = candidateUrl;
    }
    if (probe.ok) {
      cdpProbe = probe;
      activeCdpUrl = candidateUrl;
      break;
    }
  }

  const existingTabResults = probeExistingChromeTabs(urls);
  if (!cdpProbe?.ok && existingTabResults?.some((entry) => entry.source === 'existing_tab_applescript')) {
    console.log(
      JSON.stringify(
        {
          ...buildProbeHeader(activeCdpUrl),
          cdpProbe,
          cdpAttempts,
          checkedAt: new Date().toISOString(),
          mode: cdpCandidateUrls.length > 0 ? 'cdp_probe_with_applescript_fallback' : 'applescript_existing_tabs',
          results: existingTabResults,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  let browser;
  let context;
  let ownsContext = false;

  if (activeCdpUrl && cdpProbe?.ok) {
    try {
      browser = await chromium.connectOverCDP(activeCdpUrl);
      context = browser.contexts()[0];
      if (!context) {
        throw new Error('No browser context available from CHROME_CDP_URL.');
      }
    } catch (error) {
      cdpAttachError = error instanceof Error ? error.message : String(error);
      if (existingTabResults?.some((entry) => entry.source === 'existing_tab_applescript')) {
        console.log(
          JSON.stringify(
            {
              ...buildProbeHeader(activeCdpUrl),
              cdpProbe,
              cdpAttempts,
              cdpAttachError,
              checkedAt: new Date().toISOString(),
              mode: 'cdp_attach_failed_with_applescript_fallback',
              results: existingTabResults,
            },
            null,
            2,
          ),
        );
        process.exit(0);
      }
      throw error;
    }
  } else {
    context = await chromium.launchPersistentContext(profileConfig.userDataDir, {
      executablePath,
      headless: true,
      viewport: { width: 1440, height: 960 },
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        ...(profileConfig.profileDirectoryArg ? [profileConfig.profileDirectoryArg] : []),
      ],
    });
    ownsContext = true;
  }

  const results = [];

  for (const [name, url] of urls) {
    const existingPage = activeCdpUrl && cdpProbe?.ok
      ? context.pages().find((candidate) => matchesRequestedUrl(candidate.url(), url))
      : undefined;
    const page = existingPage ?? (await context.newPage());
    try {
      if (!existingPage) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(1500);
      }
      const title = await page.title();
      const finalUrl = page.url();
      const bodyText = await page.locator('body').innerText().catch(() => '');
      const bodyPreview = bodyText.replace(/\s+/g, ' ').slice(0, 260);

      results.push({
        name,
        requestedUrl: url,
        finalUrl,
        title,
        classification: classifyPage(finalUrl, title, bodyPreview),
        bodyPreview,
        source: existingPage ? 'existing_tab' : 'fresh_page',
      });
    } catch (error) {
      results.push({
        name,
        requestedUrl: url,
        classification: 'probe_failed',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (!existingPage) {
        await page.close().catch(() => {});
      }
    }
  }

  console.log(JSON.stringify({
    ...buildProbeHeader(activeCdpUrl),
    cdpProbe,
    cdpAttempts,
    ...(cdpAttachError ? { cdpAttachError } : {}),
    checkedAt: new Date().toISOString(),
    results,
  }, null, 2));

  if (ownsContext) {
    await context.close();
  }
  if (browser) {
    await browser.close();
  }
} catch (error) {
  console.log(
    JSON.stringify(
      {
        ...buildProbeHeader(activeCdpUrl),
        cdpProbe,
        cdpAttempts,
        ...(cdpAttachError ? { cdpAttachError } : {}),
        checkedAt: new Date().toISOString(),
        blocked: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
