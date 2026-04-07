import { chromium } from '@playwright/test';
import { execFileSync, execSync } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import {
  ensureDirectory,
  getCacheGovernancePolicy,
  getRepoBrowserRootStatus,
  writeBrowserSessionState,
} from './lib/cache-governance.mjs';
import {
  assignRequestedUrlMatches,
  buildCdpTargetSummary,
  collectChromeDebugCandidateUrls,
  SITE_TARGETS,
  determineAuthState,
  buildProbeHeader,
  buildProbeNextStep,
  classifyFromExistingTab,
  classifyPage,
  collectChromeDebugProcesses,
  collectListeningPids,
  describeCdpConnectError,
  describeCdpHttpFailure,
  detectProfileMismatch,
  determineAttachStatus,
  findBestRequestedUrlMatch,
  matchesRequestedUrl,
  normalizeCdpConnectUrl,
  pickProbeFailureReason,
  readDevToolsActivePortHint,
  reconcileObservedClassification,
  resolveChromeSessionConfig,
  shouldUseCdpTargetResults,
  shouldSkipBrowserCdpAttach,
  withTimeout,
} from './live-probe-shared.mjs';

const runId = randomUUID();
const sessionConfig = resolveChromeSessionConfig(process.env);
const cachePolicy = getCacheGovernancePolicy(process.env);
const browserRootStatus = getRepoBrowserRootStatus(readChromeProcessList(), cachePolicy);
ensureDirectory(cachePolicy.externalCacheHome);
const evidenceConfig = {
  captureConsole: process.env.LIVE_CAPTURE_CONSOLE === '1',
  captureNetwork: process.env.LIVE_CAPTURE_NETWORK === '1',
  captureTrace: process.env.LIVE_CAPTURE_TRACE === '1',
};
const rawChromeProcessList = readChromeProcessList();

if (sessionConfig.profileRequirementStatus !== 'configured') {
  console.error(
    JSON.stringify(
      {
        status: 'blocked',
        runId,
        blocked: 'browser_root_profile_config_invalid',
        nextActions: [
          sessionConfig.missingEnvMessage,
          'Use the repo-owned browser root and the dedicated `Profile 1` whose display name is `campus-copilot`.',
        ].filter(Boolean),
        cachePolicy: {
          externalCacheHome: cachePolicy.externalCacheHome,
          externalCacheTtlHours: cachePolicy.externalCacheTtlHours,
          externalCacheMaxMb: cachePolicy.externalCacheMaxMb,
        },
        ...buildProbeHeader(sessionConfig, undefined),
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

if (sessionConfig.browserRootRequirementStatus !== 'ready') {
  console.error(
    JSON.stringify(
      {
        status: 'blocked',
        runId,
        blocked: 'browser_root_not_bootstrapped',
        nextActions: sessionConfig.browserRootNextActions,
        cachePolicy: {
          browserUserDataRoot: cachePolicy.browserUserDataRoot,
          browserProfileDirectory: cachePolicy.browserProfileDirectory,
          browserDisplayName: cachePolicy.browserProfileDisplayName,
          browserCdpPort: cachePolicy.browserCdpPort,
          sourceChromeRoot: cachePolicy.sourceChromeRoot,
          sourceProfileDirectory: cachePolicy.sourceProfileDirectory,
        },
        ...buildProbeHeader(sessionConfig, undefined),
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

if (browserRootStatus.foreignOccupancy) {
  console.error(
    JSON.stringify(
      {
        status: 'blocked',
        runId,
        blocked: 'browser_root_in_use_by_foreign_process',
        browserRootStatus,
        ...buildProbeHeader(sessionConfig, undefined),
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

if (!browserRootStatus.repoOwnedInstanceRunning) {
  console.error(
    JSON.stringify(
      {
        status: 'blocked',
        runId,
        blocked: 'browser_attach_missing_repo_instance',
        browserRootStatus,
        nextActions: [
          'Launch the repo-owned Chrome instance with `pnpm browser:launch`.',
          'Do not reuse unrelated Chrome windows or second-launch the same browser root.',
        ],
        ...buildProbeHeader(sessionConfig, undefined),
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

if (!process.env.CHROME_CDP_URL?.trim()) {
  const discoveredCandidateUrls = collectChromeDebugCandidateUrls(rawChromeProcessList, sessionConfig);
  if (discoveredCandidateUrls.length > 0) {
    sessionConfig.cdpCandidateUrls = Array.from(
      new Set([...discoveredCandidateUrls, ...sessionConfig.cdpCandidateUrls]),
    );
  }
}

function toPort(url) {
  if (!url) {
    return '9222';
  }

  try {
    const parsed = new URL(url);
    return parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  } catch {
    return '9222';
  }
}

function readChromeProcessList() {
  try {
    return execFileSync('ps', ['-ax', '-o', 'pid=,command='], {
      encoding: 'utf8',
    });
  } catch {
    return '';
  }
}

function readChromeListeningPids(port) {
  try {
    return execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
    });
  } catch {
    return '';
  }
}

function probeJson(url, path) {
  return new Promise((resolve) => {
    try {
      const endpoint = new URL(path, url);
      const requestImpl = endpoint.protocol === 'https:' ? httpsRequest : httpRequest;
      const req = requestImpl(
        endpoint,
        {
          method: 'GET',
          timeout: 1500,
        },
        (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            let parsed;
            try {
              parsed = JSON.parse(body);
            } catch {
              parsed = undefined;
            }

            resolve({
              ok: res.statusCode === 200,
              statusCode: res.statusCode,
              body,
              parsed,
              error:
                res.statusCode === 200
                  ? undefined
                  : describeCdpHttpFailure(path, res.statusCode) ?? `http_${res.statusCode ?? 'unknown'}`,
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
        req.destroy(new Error(`probe_timeout:${path}`));
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

async function probeCdpVersion(url) {
  const versionResult = await probeJson(url, '/json/version');
  if (versionResult.ok && typeof versionResult.parsed?.webSocketDebuggerUrl === 'string') {
    return versionResult;
  }

  return probeJson(url, '/json/version/');
}

async function probeCdpTargets(url) {
  const targetsResult = await probeJson(url, '/json/list');
  if (!targetsResult.ok || !Array.isArray(targetsResult.parsed)) {
    return {
      ok: false,
      count: 0,
      pageCount: 0,
      titles: [],
      urls: [],
      titlesPreview: [],
      urlsPreview: [],
      error: targetsResult.error,
      statusCode: targetsResult.statusCode,
    };
  }

  return buildCdpTargetSummary(targetsResult.parsed);
}

function probeCdpTargetTabs(targets, cdpSummary, attachInput) {
  if (!cdpSummary?.ok) {
    return [];
  }

  const tabs = (cdpSummary.urls ?? []).map((url, index) => ({
    url,
    title: cdpSummary.titles?.[index] ?? '',
  }));
  const matchedTabs = assignRequestedUrlMatches(
    tabs,
    targets.map(([, requestedUrl]) => requestedUrl),
    (tab) => tab?.url,
  );

  return targets.map(([name, requestedUrl], index) => {
    const matchedTab = matchedTabs[index];
    const finalUrl = matchedTab?.url;
    const title = matchedTab?.title ?? '';
    const authState = classifyFromExistingTab(finalUrl, title, {
      ...attachInput,
      site: name,
    });

    return {
      name,
      requestedUrl,
      finalUrl,
      title,
      classification: !finalUrl ? 'not_open' : undefined,
      authenticated: authState.authenticated,
      authBoundary: authState.authBoundary,
      bodyPreview: '',
      source: matchedTab ? 'existing_tab_cdp_target' : 'not_open_in_cdp_targets',
    };
  });
}

async function probeSitesWithContext(context, attachModeResolved, allowExistingPages) {
  const results = [];

  function createPageEvidenceCollector() {
    const consoleSamples = [];
    const pageErrors = [];
    const originStats = new Map();
    const statusCounts = new Map();
    let totalRequests = 0;
    let totalResponses = 0;
    let failedRequests = 0;
    let listenersAttached = false;

    function summarizeOrigins() {
      return Array.from(originStats.entries())
        .map(([origin, counts]) => ({ origin, ...counts }))
        .sort((left, right) => {
          if (right.requests !== left.requests) {
            return right.requests - left.requests;
          }
          return left.origin.localeCompare(right.origin);
        })
        .slice(0, 5);
    }

    function summarizeStatuses() {
      return Object.fromEntries(
        Array.from(statusCounts.entries()).sort((left, right) => Number(left[0]) - Number(right[0])),
      );
    }

    function attach(page) {
      if (listenersAttached) {
        return;
      }

      listenersAttached = true;

      if (evidenceConfig.captureConsole) {
        page.on('console', (message) => {
          if (consoleSamples.length >= 10) {
            return;
          }

          consoleSamples.push({
            type: message.type(),
            messageText: message.text().replace(/\s+/g, ' ').slice(0, 180),
          });
        });

        page.on('pageerror', (error) => {
          if (pageErrors.length >= 10) {
            return;
          }

          pageErrors.push({
            errorText: String(error?.message ?? error ?? 'unknown_page_error').replace(/\s+/g, ' ').slice(0, 180),
          });
        });
      }

      if (evidenceConfig.captureNetwork) {
        page.on('request', (request) => {
          totalRequests += 1;
          try {
            const origin = new URL(request.url()).origin;
            const current =
              originStats.get(origin) ??
              {
                requests: 0,
                failedRequests: 0,
              };
            current.requests += 1;
            originStats.set(origin, current);
          } catch {}
        });

        page.on('response', (response) => {
          totalResponses += 1;
          const status = String(response.status());
          statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
        });

        page.on('requestfailed', (request) => {
          failedRequests += 1;
          try {
            const origin = new URL(request.url()).origin;
            const current =
              originStats.get(origin) ??
              {
                requests: 0,
                failedRequests: 0,
              };
            current.failedRequests += 1;
            originStats.set(origin, current);
          } catch {}
        });
      }
    }

    function buildSummary() {
      const summary = {
        consoleSummary: evidenceConfig.captureConsole
          ? {
              sampleCount: consoleSamples.length,
              samples: consoleSamples,
              pageErrorCount: pageErrors.length,
              pageErrors,
            }
          : undefined,
        networkSummary: evidenceConfig.captureNetwork
          ? {
              requestCount: totalRequests,
              responseCount: totalResponses,
              failedRequestCount: failedRequests,
              topOrigins: summarizeOrigins(),
              statusCounts: summarizeStatuses(),
            }
          : undefined,
      };

      if (!summary.consoleSummary && !summary.networkSummary) {
        return undefined;
      }

      return summary;
    }

    return {
      attach,
      buildSummary,
    };
  }

  async function readPageSnapshot(page) {
    try {
      const title = await page.title();
      const finalUrl = page.url();
      const bodyText = await page.locator('body').innerText().catch(() => '');
      return {
        title,
        finalUrl,
        bodyPreview: bodyText.replace(/\s+/g, ' ').slice(0, 260),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('Execution context was destroyed')) {
        throw error;
      }

      await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(750);
      const title = await page.title().catch(() => '');
      const finalUrl = page.url();
      const bodyText = await page.locator('body').innerText().catch(() => '');
      return {
        title,
        finalUrl,
        bodyPreview: bodyText.replace(/\s+/g, ' ').slice(0, 260),
      };
    }
  }

  for (const [name, url] of SITE_TARGETS) {
    const existingPage = allowExistingPages
      ? findBestRequestedUrlMatch(context.pages(), url, (candidate) => candidate.url())
      : undefined;
    const page = existingPage ?? (await context.newPage());
    const evidenceCollector = createPageEvidenceCollector();
    evidenceCollector.attach(page);

    try {
      if (!existingPage) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: sessionConfig.navigationTimeoutMs });
        await page.waitForTimeout(1000);
      }

      const { title, finalUrl, bodyPreview } = await readPageSnapshot(page);
      const rawClassification = classifyPage(finalUrl, title, bodyPreview);
      const authState = determineAuthState({
        site: name,
        classification: rawClassification,
        finalUrl,
        title,
        bodyPreview,
      });

      results.push({
        name,
        requestedUrl: url,
        finalUrl,
        title,
        classification: rawClassification,
        authenticated: authState.authenticated,
        authBoundary: authState.authBoundary,
        bodyPreview,
        source: existingPage ? 'existing_tab' : 'fresh_page',
        attachModeResolved,
        evidence: evidenceCollector.buildSummary(),
      });
    } catch (error) {
      results.push({
        name,
        requestedUrl: url,
        classification: 'attach_failed',
        authenticated: false,
        authBoundary: 'attach_failed',
        error: error instanceof Error ? error.message : String(error),
        source: existingPage ? 'existing_tab_failed' : 'fresh_page_failed',
        attachModeResolved,
        evidence: evidenceCollector.buildSummary(),
      });
    } finally {
      if (!existingPage) {
        await page.close().catch(() => {});
      }
    }
  }

  return results;
}

function createTraceCapturePlan() {
  if (!evidenceConfig.captureTrace) {
    return {
      enabled: false,
      status: 'disabled',
    };
  }

  const timestamp = new Date().toISOString().replaceAll(':', '-');
  mkdirSync('.runtime-cache/live-traces', { recursive: true });
  return {
    enabled: true,
    status: 'pending',
    outputPath: `.runtime-cache/live-traces/live-probe-${timestamp}.zip`,
  };
}

async function startTraceCapture(context, traceCapture) {
  if (!traceCapture?.enabled || typeof context?.tracing?.start !== 'function') {
    return {
      ...traceCapture,
      status: traceCapture?.enabled ? 'unsupported' : 'disabled',
    };
  }

  try {
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
    });
    return {
      ...traceCapture,
      status: 'running',
    };
  } catch (error) {
    return {
      ...traceCapture,
      status: 'failed_to_start',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function stopTraceCapture(context, traceCapture) {
  if (!traceCapture?.enabled || traceCapture.status !== 'running') {
    return traceCapture;
  }

  try {
    await context.tracing.stop({
      path: traceCapture.outputPath,
    });
    return {
      ...traceCapture,
      status: 'captured',
    };
  } catch (error) {
    return {
      ...traceCapture,
      status: 'failed_to_stop',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function finalizeResults(primaryResults, observedTabResults, attachModeResolved, profileMismatchDetected) {
  const observedMap = new Map(observedTabResults.map((entry) => [entry.name, entry]));

  return primaryResults.map((entry) => {
    const observed = observedMap.get(entry.name);
    const { classification: _classification, ...entryWithoutClassification } = entry;
    let authState =
      'authenticated' in entry || 'authBoundary' in entry
        ? {
            authenticated: Boolean(entry.authenticated),
            authBoundary: entry.authBoundary ?? 'logged_out',
          }
        : determineAuthState({
            site: entry.name,
            classification: entry.classification,
            finalUrl: entry.finalUrl,
            title: entry.title,
            bodyPreview: entry.bodyPreview,
          });
    const observedAuthState = observed
      ? 'authenticated' in observed || 'authBoundary' in observed
        ? {
            authenticated: Boolean(observed.authenticated),
            authBoundary: observed.authBoundary ?? 'logged_out',
          }
        : determineAuthState({
            site: observed.name,
            classification: observed.classification,
            finalUrl: observed.finalUrl,
            title: observed.title,
            bodyPreview: observed.bodyPreview,
          })
      : undefined;

    if (profileMismatchDetected && observedAuthState?.authenticated === true) {
      authState = {
        authenticated: false,
        authBoundary: 'profile_mismatch',
      };
    } else if (observedAuthState) {
      if (authState.authBoundary === 'not_open' && observedAuthState.authBoundary !== 'not_open') {
        authState = observedAuthState;
      } else if (authState.authBoundary === 'logged_out' && ['session_resumable', 'mfa_required'].includes(observedAuthState.authBoundary)) {
        authState = observedAuthState;
      } else if (authState.authBoundary === 'attach_failed' && observedAuthState.authBoundary !== 'not_open') {
        authState = observedAuthState;
      }
    }

    return {
      ...entryWithoutClassification,
      authenticated: authState.authenticated,
      authBoundary: authState.authBoundary,
      observedSource: observed?.source,
      attachModeResolved,
      nextStep: buildProbeNextStep({
        site: entry.name,
        authenticated: authState.authenticated,
        authBoundary: authState.authBoundary,
        finalUrl: entry.finalUrl,
        title: entry.title,
      }),
    };
  });
}

function buildBrowserSessionState(results) {
  const siteEntries = {};
  for (const entry of results) {
    siteEntries[entry.name] = {
      authenticated: entry.authenticated,
      authBoundary: entry.authBoundary,
      finalUrl: entry.finalUrl,
      title: entry.title,
      source: entry.source,
    };
  }

  const edstemCoursePage = results.find(
    (entry) =>
      entry.name === 'edstem' &&
      entry.authenticated === true &&
      typeof entry.finalUrl === 'string' &&
      /\/us\/courses\//.test(entry.finalUrl),
  );

  return {
    updatedAt: new Date().toISOString(),
    lastProbeRunId: runId,
    sites: siteEntries,
    edstemLastAuthenticatedCoursePage: edstemCoursePage
      ? {
          finalUrl: edstemCoursePage.finalUrl,
          title: edstemCoursePage.title,
        }
      : undefined,
  };
}

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
        ...buildProbeHeader(sessionConfig),
        checkedAt: new Date().toISOString(),
        blocked: stderr || 'disk_space_blocked',
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

const cdpAttempts = [];
let cdpProbe;
let cdpTargetSummary;
let activeCdpUrl;
let cdpAttachError;
let persistentFallbackError;
let cdpActivePortHint;
let traceCapturePlan = createTraceCapturePlan();

try {
  if (sessionConfig.attachMode !== 'persistent') {
    for (const candidateUrl of sessionConfig.cdpCandidateUrls) {
      const probe = await probeCdpVersion(candidateUrl);
      cdpAttempts.push({
        url: candidateUrl,
        ...probe,
      });

      if (probe.ok) {
        cdpProbe = probe;
        activeCdpUrl = candidateUrl;
        cdpTargetSummary = await probeCdpTargets(candidateUrl);
        break;
      }

      if (!cdpProbe) {
        cdpProbe = probe;
        activeCdpUrl = candidateUrl;
      }
    }
  }

  cdpActivePortHint = readDevToolsActivePortHint(sessionConfig, {
    requestedPort: toPort(activeCdpUrl ?? sessionConfig.cdpCandidateUrls?.[0]),
  });
  if (!activeCdpUrl && cdpActivePortHint) {
    activeCdpUrl = `http://127.0.0.1:${cdpActivePortHint.port}`;
  }

  // Host-safety rule: live probing may inspect only the repo-owned CDP lane or
  // the dedicated DevTools target surface. It must not scrape arbitrary desktop
  // Chrome windows via AppleScript/JXA/GUI fallback.
  const observedTabResults = [];
  let primaryResults = [];
  let attachModeResolved = 'attach_unresolved';
  let browser;
  let debugProcesses = [];
  let listeningDebugProcesses = [];

  debugProcesses = collectChromeDebugProcesses(rawChromeProcessList, toPort(activeCdpUrl));
  const listeningPidSet = new Set(collectListeningPids(readChromeListeningPids(toPort(activeCdpUrl))));
  if (listeningPidSet.size > 0) {
    debugProcesses = debugProcesses.map((processInfo) => ({
      ...processInfo,
      listening: listeningPidSet.has(processInfo.pid),
    }));
  }
  listeningDebugProcesses = debugProcesses.filter((processInfo) => processInfo.listening);
  const debugProcessPresentWithoutListener = debugProcesses.length > 0 && listeningDebugProcesses.length === 0;
  const cdpTargetsLookWrong = shouldSkipBrowserCdpAttach(cdpTargetSummary, {
    debugProcesses: listeningDebugProcesses.length > 0 ? listeningDebugProcesses : debugProcesses,
    sessionConfig,
  });
  const cdpBrowserIsAmbiguous = (listeningDebugProcesses.length || debugProcesses.length) > 1;
  const cdpTargetResults = probeCdpTargetTabs(SITE_TARGETS, cdpTargetSummary, {
    profileMismatch: cdpBrowserIsAmbiguous,
    attachFailed: cdpTargetsLookWrong,
  });

  if (!cdpProbe?.ok && debugProcessPresentWithoutListener) {
    cdpAttachError = 'debug_chrome_process_present_but_not_listening';
  }

  if (activeCdpUrl && cdpProbe?.ok && sessionConfig.attachMode === 'page' && !cdpTargetsLookWrong && !cdpBrowserIsAmbiguous) {
    try {
      browser = await withTimeout(
        () =>
          chromium.connectOverCDP(normalizeCdpConnectUrl(activeCdpUrl), {
            timeout: sessionConfig.cdpAttachTimeoutMs,
          }),
        sessionConfig.cdpAttachTimeoutMs + 500,
        'connect_over_cdp_page_mode',
      );
      const context = browser.contexts()[0];
      if (!context) {
        throw new Error('No browser context available from CHROME_CDP_URL.');
      }

      traceCapturePlan = await startTraceCapture(context, traceCapturePlan);
      try {
        primaryResults = await probeSitesWithContext(context, 'page_cdp_context', true);
      } finally {
        traceCapturePlan = await stopTraceCapture(context, traceCapturePlan);
      }
      attachModeResolved = 'page_cdp_context';
    } catch (error) {
      cdpAttachError = describeCdpConnectError(error);
    }
  } else if (activeCdpUrl && cdpProbe?.ok && sessionConfig.attachMode !== 'page' && sessionConfig.attachMode !== 'persistent' && !cdpTargetsLookWrong && !cdpBrowserIsAmbiguous) {
    try {
      browser = await withTimeout(
        () =>
          chromium.connectOverCDP(normalizeCdpConnectUrl(activeCdpUrl), {
            timeout: sessionConfig.cdpAttachTimeoutMs,
          }),
        sessionConfig.cdpAttachTimeoutMs + 500,
        'connect_over_cdp',
      );
      const context = browser.contexts()[0];
      if (!context) {
        throw new Error('No browser context available from CHROME_CDP_URL.');
      }

      traceCapturePlan = await startTraceCapture(context, traceCapturePlan);
      try {
        primaryResults = await probeSitesWithContext(context, 'browser_cdp', true);
      } finally {
        traceCapturePlan = await stopTraceCapture(context, traceCapturePlan);
      }
      attachModeResolved = 'browser_cdp';
    } catch (error) {
      cdpAttachError = error instanceof Error ? error.message : String(error);
    }
  } else if (
    cdpActivePortHint?.webSocketDebuggerUrl &&
    sessionConfig.attachMode !== 'page' &&
    sessionConfig.attachMode !== 'persistent' &&
    !cdpBrowserIsAmbiguous
  ) {
    try {
      browser = await withTimeout(
        () =>
          chromium.connectOverCDP(normalizeCdpConnectUrl(cdpActivePortHint.webSocketDebuggerUrl), {
            timeout: sessionConfig.cdpAttachTimeoutMs,
          }),
        sessionConfig.cdpAttachTimeoutMs + 500,
        'connect_over_cdp_ws',
      );
      const context = browser.contexts()[0];
      if (!context) {
        throw new Error('No browser context available from DevToolsActivePort.');
      }

      traceCapturePlan = await startTraceCapture(context, traceCapturePlan);
      try {
        primaryResults = await probeSitesWithContext(context, 'browser_cdp', true);
      } finally {
        traceCapturePlan = await stopTraceCapture(context, traceCapturePlan);
      }
      attachModeResolved = 'browser_cdp';
    } catch (error) {
      cdpAttachError = describeCdpConnectError(error);
    }
  } else if (cdpTargetsLookWrong || cdpBrowserIsAmbiguous) {
    if (!cdpAttachError) {
      cdpAttachError = cdpBrowserIsAmbiguous
        ? 'multiple_debug_browsers_detected'
        : (cdpProbe?.statusCode === 404 || cdpProbe?.error === 'cdp_http_404_no_targets') && !cdpTargetSummary?.ok
          ? 'cdp_http_404_no_targets'
          : 'cdp_target_profile_picker_or_wrong_context';
    }
  }

  const useCdpTargetResults =
    sessionConfig.attachMode !== 'persistent' &&
    shouldUseCdpTargetResults({
      attachMode: sessionConfig.attachMode,
      cdpAttachError,
      cdpTargetResults,
    });

  if (primaryResults.length === 0 && useCdpTargetResults) {
    attachModeResolved =
      sessionConfig.attachMode === 'page' ? 'page_cdp_targets' : 'page_target_http_after_attach_failure';
    primaryResults = cdpTargetResults.map((entry) => ({
      ...entry,
      attachModeResolved,
    }));
  }

  if (primaryResults.length === 0 && !useCdpTargetResults) {
    persistentFallbackError = pickProbeFailureReason({
      cdpAttachError,
      cdpProbe,
    });
  }

  if (
    primaryResults.length === 0 &&
    observedTabResults.some((entry) => String(entry.source ?? '').startsWith('existing_tab_'))
  ) {
    attachModeResolved = cdpAttachError
      ? 'page_existing_tabs_after_attach_failure'
      : 'page_existing_tabs';
    primaryResults = observedTabResults.map((entry) => ({
      ...entry,
      attachModeResolved,
    }));
  }

  if (primaryResults.length === 0) {
    throw new Error(
      persistentFallbackError ||
        pickProbeFailureReason({
          cdpAttachError,
          cdpProbe,
        }),
    );
  }

  const profileMismatchDetected = detectProfileMismatch({
    attachModeResolved,
    sessionConfig,
    debugProcesses: listeningDebugProcesses.length > 0 ? listeningDebugProcesses : debugProcesses,
    observedTabResults,
    primaryResults,
  });
  const results = finalizeResults(primaryResults, observedTabResults, attachModeResolved, profileMismatchDetected);
  writeBrowserSessionState(cachePolicy.browserStateRoot, buildBrowserSessionState(results));
  const attachStatus = profileMismatchDetected
    ? 'profile_mismatch'
    : determineAttachStatus({
        attachModeResolved,
        cdpAttachError,
        results,
      });

  console.log(
    JSON.stringify(
      {
        runId,
        ...buildProbeHeader(sessionConfig, activeCdpUrl, {
          mode: attachModeResolved,
          attachModeResolved,
          attachStatus,
        }),
        cdpProbe,
        cdpAttempts,
        cdpTargetSummary,
        ...(cdpActivePortHint ? { cdpActivePortHint } : {}),
        debugChrome: {
          processCount: debugProcesses.length,
          listenerCount: listeningDebugProcesses.length,
          processes: debugProcesses,
        },
        ...(cdpAttachError ? { cdpAttachError } : {}),
        ...(persistentFallbackError ? { persistentFallbackError } : {}),
        checkedAt: new Date().toISOString(),
        evidenceCapture: {
          console: evidenceConfig.captureConsole,
          network: evidenceConfig.captureNetwork,
          trace: traceCapturePlan,
        },
        results,
      },
      null,
      2,
    ),
  );

  if (browser) {
    await browser.close().catch(() => {});
  }
} catch (error) {
  console.log(
    JSON.stringify(
      {
        runId,
        ...buildProbeHeader(sessionConfig, activeCdpUrl, {
          attachStatus: 'attach_failed',
        }),
        cdpProbe,
        cdpAttempts,
        cdpTargetSummary,
        ...(cdpAttachError ? { cdpAttachError } : {}),
        ...(persistentFallbackError ? { persistentFallbackError } : {}),
        checkedAt: new Date().toISOString(),
        evidenceCapture: {
          console: evidenceConfig.captureConsole,
          network: evidenceConfig.captureNetwork,
          trace: traceCapturePlan,
        },
        blocked: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
