import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { getCacheGovernancePolicy, getChromeProcessList, getRepoBrowserRootStatus } from './lib/cache-governance.mjs';
import {
  buildCdpTargetSummary,
  collectChromeDebugCandidateUrls,
  findBestRequestedUrlMatch,
  getRequestedUrlMatchScore,
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

function normalizeRequestedPageUrl(value) {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return undefined;
  }
}

export function shouldNavigateRequestedPage(input) {
  if (input.reload) {
    return true;
  }

  const current = normalizeRequestedPageUrl(input.currentUrl);
  const requested = normalizeRequestedPageUrl(input.requestedUrl);

  if (!current || !requested) {
    return true;
  }

  return current !== requested;
}

export function selectRequestedPageTarget(targets, requestedUrl) {
  if (!Array.isArray(targets)) {
    return undefined;
  }

  const pageTargets = targets.filter((entry) => entry?.type === 'page');
  return findBestRequestedUrlMatch(
    pageTargets,
    requestedUrl,
    (entry) => entry?.url ?? '',
    (entry) => entry?.title ?? '',
  );
}

export function shouldFinalizeFallbackMatch(input) {
  if (!input.matchedTarget?.url) {
    return false;
  }

  const score = getRequestedUrlMatchScore(input.matchedTarget.url, input.requestedUrl);
  if (score <= 0) {
    return false;
  }

  if (!input.navigationAttempted) {
    return true;
  }

  // After we explicitly ask Chrome to open a target page, a generic same-host
  // fallback is still too weak to count as evidence. Accept exact, redirect,
  // or special-path matches only.
  return score !== 2;
}

async function fetchJson(endpoint, init = undefined) {
  try {
    const response = await fetch(endpoint, init);
    const body = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = undefined;
    }

    return {
      ok: response.ok,
      statusCode: response.status,
      parsed,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function openRequestedPageTarget(cdpUrl, requestedUrl) {
  const endpoint = new URL(`/json/new?${encodeURIComponent(requestedUrl)}`, normalizeCdpConnectUrl(cdpUrl));
  return fetchJson(endpoint, { method: 'PUT' });
}

async function listPageTargets(cdpUrl) {
  const endpoint = new URL('/json/list', normalizeCdpConnectUrl(cdpUrl));
  return fetchJson(endpoint);
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
  const rawChromeProcessList = getChromeProcessList();
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

async function captureViaTargetSummaryFallback({
  cdpCandidates,
  requestedUrl,
  flags,
  waitMs,
  rootDir,
  runId,
  sessionConfig,
  outputDir,
  state,
}) {
  for (const candidate of cdpCandidates) {
    const initialTargets = await listPageTargets(candidate);
    if (!initialTargets.ok || !Array.isArray(initialTargets.parsed)) {
      continue;
    }

    let targets = initialTargets.parsed;
    let matchingTarget = selectRequestedPageTarget(targets, requestedUrl);
    const navigationAttempted =
      !matchingTarget ||
      shouldNavigateRequestedPage({
        currentUrl: matchingTarget.url,
        requestedUrl,
        reload: flags.reload === 'true',
      });
    let openedFreshTarget = false;

    if (navigationAttempted) {
      const openResult = await openRequestedPageTarget(candidate, requestedUrl);
      if (openResult.ok) {
        openedFreshTarget = true;
        await new Promise((resolve) => {
          setTimeout(resolve, waitMs);
        });
        const refreshedTargets = await listPageTargets(candidate);
        if (refreshedTargets.ok && Array.isArray(refreshedTargets.parsed)) {
          targets = refreshedTargets.parsed;
          matchingTarget = selectRequestedPageTarget(targets, requestedUrl);
        }
      }
    }

    if (
      !shouldFinalizeFallbackMatch({
        matchedTarget: matchingTarget,
        requestedUrl,
        navigationAttempted,
      })
    ) {
      continue;
    }

    state.finalUrl = matchingTarget?.url ?? '';
    state.title = matchingTarget?.title ?? '';

    const summary = summarizeBrowserEvidence(state);
    const har = buildHarLikeArchive(state);
    const harPath = join(outputDir, 'network.har.json');
    const summaryPath = join(outputDir, 'summary.json');
    const targetSummary = buildCdpTargetSummary(targets);

    writeFileSync(harPath, JSON.stringify(har, null, 2), 'utf8');
    writeFileSync(
      summaryPath,
      JSON.stringify(
        {
          runId,
          mode: 'page_target_http_after_attach_failure',
          cdpUrl: candidate,
          session: {
            requestedProfileLabel: sessionConfig.requestedProfileLabel,
            userDataDirLabel: sessionConfig.userDataDirLabel,
            profileDirectory: sessionConfig.profileDirectory,
          },
          artifacts: {
            tracePath: null,
            harPath: relative(rootDir, harPath),
          },
          openedFreshTarget,
          targetSummary,
          matchedTarget:
            matchingTarget && typeof matchingTarget === 'object'
              ? {
                  id: matchingTarget.id ?? null,
                  title: matchingTarget.title ?? '',
                  url: matchingTarget.url ?? '',
                }
              : null,
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
          mode: 'page_target_http_after_attach_failure',
          cdpUrl: candidate,
          outputDir: relative(rootDir, outputDir),
          artifacts: {
            tracePath: null,
            harPath: relative(rootDir, harPath),
            summaryPath: relative(rootDir, summaryPath),
          },
          openedFreshTarget,
          targetSummary,
          matchedTarget:
            matchingTarget && typeof matchingTarget === 'object'
              ? {
                  id: matchingTarget.id ?? null,
                  title: matchingTarget.title ?? '',
                  url: matchingTarget.url ?? '',
                }
              : null,
          summary,
        },
        null,
        2,
      ),
    );
    return true;
  }

  return false;
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

  const rawChromeProcessList = getChromeProcessList();
  const cdpCandidates = Array.from(
    new Set([
      ...sessionConfig.cdpCandidateUrls,
      ...collectChromeDebugCandidateUrls(rawChromeProcessList, sessionConfig),
    ]),
  );
  let browser;
  let context;
  let mode;
  let cdpUrl;
  const tracePath = join(outputDir, 'trace.zip');
  const harPath = join(outputDir, 'network.har.json');
  const summaryPath = join(outputDir, 'summary.json');
  const pendingRequests = new Map();

  try {
    try {
      ({ browser, context, mode, cdpUrl } = await resolveContext(sessionConfig));
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'browser_attach_missing_repo_instance' &&
        (await captureViaTargetSummaryFallback({
          cdpCandidates,
          requestedUrl,
          flags,
          waitMs,
          rootDir,
          runId,
          sessionConfig,
          outputDir,
          state,
        }))
      ) {
        return;
      }
      throw error;
    }

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

    if (
      createdFreshPage ||
      shouldNavigateRequestedPage({
        currentUrl: page.url(),
        requestedUrl,
        reload: flags.reload === 'true',
      })
    ) {
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
    await context?.close().catch(() => {});
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await captureEvidence();
}
