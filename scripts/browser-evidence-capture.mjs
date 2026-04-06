import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';
import { getCacheGovernancePolicy, getChromeProcessList, getRepoBrowserRootStatus } from './lib/cache-governance.mjs';
import {
  collectChromeDebugCandidateUrls,
  getChromeProfileRequirement,
  normalizeCdpConnectUrl,
  parsePositiveInt,
  resolveChromeSessionConfig,
} from './live-probe-shared.mjs';
import {
  buildHarLikeArchive,
  createBrowserEvidenceState,
  createNetworkEntry,
  recordConsoleMessage,
  recordPageError,
  settleNetworkEntryWithFailure,
  settleNetworkEntryWithResponse,
  summarizeBrowserEvidence,
} from './browser-evidence-utils.mjs';

const SITE_URLS = {
  canvas: 'https://canvas.uw.edu',
  gradescope: 'https://www.gradescope.com/auth/saml/uw',
  edstem: 'https://edstem.org/us/dashboard',
  myuw: 'https://my.uw.edu',
};

function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith('--')) {
      continue;
    }
    const key = entry.slice(2);
    const next = argv[index + 1];
    flags[key] = next && !next.startsWith('--') ? argv[++index] : 'true';
  }
  return flags;
}

function selectRequestedUrl(flags) {
  if (typeof flags.url === 'string' && flags.url.trim()) {
    return flags.url.trim();
  }

  const site = typeof flags.site === 'string' ? flags.site.trim() : 'canvas';
  return SITE_URLS[site] ?? SITE_URLS.canvas;
}

function resolveOutputDir(rootDir, runId) {
  const configured = process.env.BROWSER_EVIDENCE_OUTPUT_DIR?.trim();
  if (configured) {
    return configured;
  }
  return join(rootDir, '.runtime-cache', 'browser-evidence', runId);
}

function attachEvidenceListeners(page, state, pendingRequests) {
  page.on('console', (message) => {
    recordConsoleMessage(state, {
      level: message.type(),
      text: message.text(),
      location: message.location(),
    });
  });

  page.on('pageerror', (error) => {
    recordPageError(state, error);
  });

  page.on('request', (request) => {
    const entry = createNetworkEntry(
      {
        method: request.method(),
        url: request.url(),
        resourceType: request.resourceType(),
      },
      new Date().toISOString(),
    );
    pendingRequests.set(request, entry);
    state.networkEntries.push(entry);
  });

  page.on('response', async (response) => {
    const request = response.request();
    const entry = pendingRequests.get(request);
    if (!entry) {
      return;
    }

    settleNetworkEntryWithResponse(
      entry,
      {
        status: response.status(),
        ok: response.ok(),
        statusText: response.statusText(),
        url: response.url(),
      },
      new Date().toISOString(),
    );
    pendingRequests.delete(request);
  });

  page.on('requestfailed', (request) => {
    const entry = pendingRequests.get(request);
    if (!entry) {
      return;
    }

    settleNetworkEntryWithFailure(entry, request.failure()?.errorText, new Date().toISOString());
    pendingRequests.delete(request);
  });
}

async function resolveContext(sessionConfig) {
  const rawChromeProcessList = '';
  const candidateUrls = collectChromeDebugCandidateUrls(rawChromeProcessList, sessionConfig);
  const cdpCandidates = Array.from(new Set([...sessionConfig.cdpCandidateUrls, ...candidateUrls]));

  for (const candidate of cdpCandidates) {
    try {
      const browser = await chromium.connectOverCDP(normalizeCdpConnectUrl(candidate), {
        timeout: sessionConfig.cdpAttachTimeoutMs,
      });
      const context = browser.contexts()[0];
      if (context) {
        return {
          browser,
          context,
          mode: 'browser_cdp',
          cdpUrl: candidate,
        };
      }
      await browser.close().catch(() => {});
    } catch {
      continue;
    }
  }

  throw new Error('browser_attach_missing_repo_instance');
}

async function captureEvidence() {
  const flags = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const runId = randomUUID();
  const sessionConfig = resolveChromeSessionConfig(process.env);
  const cachePolicy = getCacheGovernancePolicy(process.env);
  const browserRootStatus = getRepoBrowserRootStatus(getChromeProcessList(), cachePolicy);
  const profileRequirement = getChromeProfileRequirement(sessionConfig);
  const requestedUrl = selectRequestedUrl(flags);
  const waitMs = parsePositiveInt(flags.waitMs, 1500);
  const outputDir = resolveOutputDir(rootDir, runId);
  mkdirSync(outputDir, { recursive: true });

  if (!profileRequirement.ok) {
    console.log(
      JSON.stringify(
        {
          status: 'blocked',
          runId,
          outputDir: relative(rootDir, outputDir),
          error: profileRequirement.message,
          requiredEnv: profileRequirement.envHint,
          nextActions: profileRequirement.nextActions,
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  if (sessionConfig.browserRootRequirementStatus !== 'ready') {
    console.log(
      JSON.stringify(
        {
          status: 'blocked',
          runId,
          outputDir: relative(rootDir, outputDir),
          error: sessionConfig.browserRootRequirementMessage,
          nextActions: sessionConfig.browserRootNextActions,
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  if (browserRootStatus.foreignOccupancy) {
    console.log(
      JSON.stringify(
        {
          status: 'blocked',
          runId,
          outputDir: relative(rootDir, outputDir),
          error: 'browser_root_in_use_by_foreign_process',
          browserRootStatus,
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  const state = createBrowserEvidenceState({
    startedAt: new Date().toISOString(),
    requestedUrl,
  });

  const { browser, context, mode, cdpUrl } = await resolveContext(sessionConfig);
  const tracePath = join(outputDir, 'trace.zip');
  const harPath = join(outputDir, 'network.har.json');
  const summaryPath = join(outputDir, 'summary.json');
  const pendingRequests = new Map();

  try {
    if (typeof context.tracing?.start === 'function') {
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
      });
    }

    let page =
      context.pages().find((entry) => entry.url().startsWith(new URL(requestedUrl).origin)) ??
      context.pages()[0];
    let createdFreshPage = false;

    if (!page) {
      page = await context.newPage();
      createdFreshPage = true;
    }

    attachEvidenceListeners(page, state, pendingRequests);

    if (createdFreshPage || flags.reload === 'true') {
      await page.goto(requestedUrl, {
        waitUntil: 'domcontentloaded',
        timeout: sessionConfig.navigationTimeoutMs,
      });
    } else {
      await page.waitForTimeout(waitMs);
    }

    await page.waitForTimeout(waitMs);
    state.finalUrl = page.url();
    state.title = await page.title();

    if (typeof context.tracing?.stop === 'function') {
      await context.tracing.stop({
        path: tracePath,
      });
    }

    const summary = summarizeBrowserEvidence(state);
    const har = buildHarLikeArchive(state);

    writeFileSync(harPath, JSON.stringify(har, null, 2), 'utf8');
    writeFileSync(
      summaryPath,
      JSON.stringify(
        {
          runId,
          mode,
          cdpUrl,
          session: {
            requestedProfileLabel: sessionConfig.requestedProfileLabel,
            userDataDirLabel: sessionConfig.userDataDirLabel,
            profileDirectory: sessionConfig.profileDirectory,
          },
          artifacts: {
            tracePath: relative(rootDir, tracePath),
            harPath: relative(rootDir, harPath),
          },
          summary,
        },
        null,
        2,
      ),
      'utf8',
    );

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          runId,
          mode,
          cdpUrl,
          outputDir: relative(rootDir, outputDir),
          artifacts: {
            tracePath: relative(rootDir, tracePath),
            harPath: relative(rootDir, harPath),
            summaryPath: relative(rootDir, summaryPath),
          },
          summary,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          status: 'blocked',
          runId,
          mode,
          cdpUrl,
          outputDir: relative(rootDir, outputDir),
          error: error instanceof Error ? error.message : String(error),
          summary: summarizeBrowserEvidence(state),
        },
        null,
        2,
      ),
    );
    process.exit(2);
  } finally {
    await context.close().catch(() => {});
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

await captureEvidence();
