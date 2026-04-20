import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const CONFIG_KEY = 'campusCopilotConfig';
const SITE_STATE_KEY = '__campus_copilot_mock_site_states__';
const DOWNLOAD_KEY = '__campus_copilot_last_download__';
const SMOKE_CAPTURE_DIR = process.env.EXTENSION_SMOKE_CAPTURE_DIR;

function resolveSmokeBaseUrl(baseURL?: string) {
  return baseURL ?? process.env.EXTENSION_SMOKE_BASE_URL ?? 'http://127.0.0.1:4174';
}

async function gotoSmokePage(
  page: import('@playwright/test').Page,
  baseURL: string | undefined,
  pathname: string,
) {
  const url = new URL(pathname, `${resolveSmokeBaseUrl(baseURL)}/`).toString();
  const deadline = Date.now() + 30_000;
  let lastError: unknown;
  let lastStatus = 0;

  while (Date.now() < deadline) {
    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 5_000,
      });
      lastStatus = response?.status() ?? 0;
      if (lastStatus === 200) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await page.waitForTimeout(500);
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error(`smoke_page_unavailable:${url}:status_${lastStatus}`);
}

async function maybeCaptureSmokeScreenshot(page: Page, filename: string) {
  if (!SMOKE_CAPTURE_DIR) {
    return;
  }

  mkdirSync(SMOKE_CAPTURE_DIR, { recursive: true });
  await page.screenshot({
    path: join(SMOKE_CAPTURE_DIR, `${filename}.png`),
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  });
}

async function installExtensionMocks(page: import('@playwright/test').Page) {
  await page.addInitScript(
    ({ configKey, siteStateKey, downloadKey }) => {
      const defaultConfig = {
        [configKey]: {
          defaultExportFormat: 'markdown',
          uiLanguage: 'auto',
          ai: {
            defaultProvider: 'gemini',
            models: {
              openai: 'gpt-4.1-mini',
              gemini: 'gemini-2.5-flash',
            },
          },
          sites: {
            edstem: {},
          },
        },
      };

      const defaultStates = {
        canvas: {
          site: 'canvas',
          status: 'success',
          lastSyncedAt: '2026-03-25T09:00:00Z',
          lastOutcome: 'success',
          counts: {
            site: 'canvas',
            courses: 1,
            assignments: 3,
            announcements: 1,
            grades: 1,
            messages: 0,
            events: 0,
          },
        },
        gradescope: {
          site: 'gradescope',
          status: 'success',
          lastSyncedAt: '2026-03-25T08:30:00Z',
          lastOutcome: 'partial_success',
          errorReason: 'gradescope_courses_optional_collector_failed',
          resourceFailures: [
            {
              resource: 'courses',
              errorReason: 'gradescope_courses_optional_collector_failed',
              attemptedModes: ['private_api'],
              attemptedCollectors: ['GradescopeCoursesCollector'],
            },
          ],
          counts: {
            site: 'gradescope',
            courses: 0,
            assignments: 2,
            announcements: 0,
            grades: 2,
            messages: 0,
            events: 0,
          },
        },
        edstem: {
          site: 'edstem',
          status: 'error',
          lastSyncedAt: '2026-03-25T08:00:00Z',
          lastOutcome: 'unsupported_context',
          errorReason: 'missing_edstem_path_config',
          counts: {
            site: 'edstem',
            courses: 0,
            assignments: 0,
            announcements: 0,
            grades: 0,
            messages: 0,
            events: 0,
          },
        },
        myuw: {
          site: 'myuw',
          status: 'idle',
          counts: {
            site: 'myuw',
            courses: 0,
            assignments: 0,
            announcements: 0,
            grades: 0,
            messages: 0,
            events: 0,
          },
        },
      };

      const listeners = [];

      const readJson = (key, fallback) => {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      };

      const writeJson = (key, value) => {
        window.localStorage.setItem(key, JSON.stringify(value));
      };

      const seededKey = '__campus_copilot_smoke_seeded__';
      if (!window.sessionStorage.getItem(seededKey)) {
        // Reset the fixture once per test context, while preserving state across in-test navigations.
        writeJson('__extension_storage__', defaultConfig);
        writeJson(siteStateKey, defaultStates);
        window.localStorage.removeItem(downloadKey);
        window.localStorage.removeItem('__campus_copilot_opened_options__');
        window.sessionStorage.setItem(seededKey, '1');
      }

      const getStorageState = () => readJson('__extension_storage__', defaultConfig);
      const setStorageState = (nextState) => writeJson('__extension_storage__', nextState);
      const getSiteStates = () => readJson(siteStateKey, defaultStates);
      const setSiteStates = (nextState) => writeJson(siteStateKey, nextState);

      const emitChange = (changes) => {
        for (const listener of listeners) {
          listener(changes, 'local');
        }
      };

      const storage = {
        local: {
          async get(keys) {
            const state = getStorageState();
            if (!keys) {
              return state;
            }
            if (typeof keys === 'string') {
              return {
                [keys]: state[keys],
              };
            }
            return state;
          },
          async set(items) {
            const state = getStorageState();
            const changes = {};
            for (const [key, value] of Object.entries(items)) {
              changes[key] = {
                oldValue: state[key],
                newValue: value,
              };
              state[key] = value;
            }
            setStorageState(state);
            emitChange(changes);
          },
        },
        onChanged: {
          addListener(listener) {
            listeners.push(listener);
          },
          removeListener(listener) {
            const index = listeners.indexOf(listener);
            if (index >= 0) {
              listeners.splice(index, 1);
            }
          },
        },
      };

      const runtime = {
        async sendMessage(message) {
          const siteStates = getSiteStates();
          if (message.type === 'getSiteSyncStatus') {
            return {
              type: 'getSiteSyncStatus',
              site: message.site,
              status: siteStates[message.site],
            };
          }

          if (message.type === 'syncSite') {
            const config = getStorageState()[configKey];
            if (message.site === 'edstem' && !config?.sites?.edstem?.threadsPath) {
              siteStates.edstem = {
                ...siteStates.edstem,
                status: 'error',
                lastOutcome: 'unsupported_context',
                errorReason: 'missing_edstem_path_config',
              };
            } else {
              siteStates[message.site] = {
                ...siteStates[message.site],
                status: 'success',
                lastSyncedAt: new Date().toISOString(),
                lastOutcome: message.site === 'myuw' ? 'partial_success' : 'success',
                counts:
                  message.site === 'edstem'
                    ? {
                        site: 'edstem',
                        courses: 1,
                        assignments: 0,
                        announcements: 0,
                        grades: 0,
                        messages: 1,
                        events: 0,
                      }
                    : siteStates[message.site].counts,
                errorReason:
                  message.site === 'myuw' ? 'myuw_state_dom_partial_mock' : undefined,
                resourceFailures:
                  message.site === 'myuw'
                    ? [
                        {
                          resource: 'events',
                          errorReason: 'myuw_state_dom_partial_mock',
                          attemptedModes: ['dom'],
                          attemptedCollectors: ['MyUWEventsDomCollector'],
                        },
                      ]
                    : undefined,
              };
            }
            setSiteStates(siteStates);
            return {
              type: 'syncSite',
              site: message.site,
              outcome: siteStates[message.site].lastOutcome,
              status: siteStates[message.site],
            };
          }

          return undefined;
        },
        onMessage: {
          addListener() {},
        },
        async openOptionsPage() {
          window.localStorage.setItem('__campus_copilot_opened_options__', 'true');
        },
      };

      const downloads = {
        async download(input) {
          window.localStorage.setItem(downloadKey, JSON.stringify(input));
          return 1;
        },
      };

      const tabs = {
        async query() {
          return [{ id: 1, url: 'https://canvas.example.edu' }];
        },
      };

      const scripting = {
        async executeScript() {
          return [{ result: { pageHtml: '<main>MyUW</main>', pageState: { notices: [], events: [] } } }];
        },
      };

      const chrome = {
        runtime,
        downloads,
        tabs,
        scripting,
        storage,
      };

      Object.defineProperty(window.navigator, 'language', {
        configurable: true,
        get: () => 'en-US',
      });
      Object.defineProperty(window.navigator, 'languages', {
        configurable: true,
        get: () => ['en-US'],
      });

      Object.assign(window, { chrome, browser: chrome });

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.endsWith('/health')) {
          const config = getStorageState()[configKey];
          return new Response(null, {
            status: config?.ai?.bffBaseUrl && url.startsWith(config.ai.bffBaseUrl) ? 200 : 503,
          });
        }
        if (url.includes('/api/providers/status')) {
          const config = getStorageState()[configKey];
          const defaultProvider = config?.ai?.defaultProvider ?? 'gemini';
          return new Response(
            JSON.stringify({
              ok: true,
              providers: {
                openai: {
                  ready: Boolean(config?.ai?.bffBaseUrl) && defaultProvider === 'openai',
                  reason:
                    Boolean(config?.ai?.bffBaseUrl) && defaultProvider === 'openai' ? 'configured' : 'missing_api_key',
                },
                gemini: {
                  ready: Boolean(config?.ai?.bffBaseUrl) && defaultProvider === 'gemini',
                  reason:
                    Boolean(config?.ai?.bffBaseUrl) && defaultProvider === 'gemini' ? 'configured' : 'missing_api_key',
                },
              },
            }),
            {
              status: 200,
              headers: {
                'content-type': 'application/json',
              },
            },
          );
        }
        if (url.includes('/api/providers/')) {
          return new Response(
            JSON.stringify({
              ok: true,
              answerText: JSON.stringify({
                summary: 'Campus Copilot AI answer',
                bullets: ['Homework 5 is still due soon', 'Canvas still shows it as open'],
                citations: [
                  {
                    entityId: 'canvas:assignment:1',
                    kind: 'assignment',
                    site: 'canvas',
                    title: 'Homework 5',
                    url: 'https://canvas.example.edu/courses/1/assignments/1',
                  },
                ],
              }),
              structuredAnswer: {
                summary: 'Campus Copilot AI answer',
                bullets: ['Homework 5 is still due soon', 'Canvas still shows it as open'],
                citations: [
                  {
                    entityId: 'canvas:assignment:1',
                    kind: 'assignment',
                    site: 'canvas',
                    title: 'Homework 5',
                    url: 'https://canvas.example.edu/courses/1/assignments/1',
                  },
                ],
              },
            }),
            {
              status: 200,
              headers: {
                'content-type': 'application/json',
              },
            },
          );
        }
        return originalFetch(input, init);
      };
    },
    {
      configKey: CONFIG_KEY,
      siteStateKey: SITE_STATE_KEY,
      downloadKey: DOWNLOAD_KEY,
    },
  );
}

test.beforeEach(async ({ page }) => {
  await installExtensionMocks(page);
});

async function expandDetailedWorkspace(page: Page, label: string) {
  const details = page.locator('.surface__workspace-detail');
  if ((await details.getAttribute('open')) !== null) {
    return;
  }

  const trigger = details.locator('summary').filter({ hasText: label });
  if (await trigger.isVisible()) {
    await trigger.click();
  }
}

async function expandDiagnosticsWorkspace(page: Page, title: string) {
  const details = page.locator('.surface__diagnostics-detail');
  if ((await details.getAttribute('open')) !== null) {
    return;
  }

  const trigger = details.locator('summary').filter({ hasText: title });
  if (await trigger.isVisible()) {
    await trigger.click();
  }
}

async function assertOptionsTrustCenter(page: Page) {
  await expect(page.getByRole('heading', { name: 'Desk connection and trust' })).toBeVisible();
  const authorizationHeading = page.getByRole('heading', { name: 'Trust center' }).last();
  const authorizationPanel = authorizationHeading.locator('xpath=ancestor::article[1]');
  const configurationActionsHeading = page.getByRole('heading', { name: 'Next steps' });
  await expect(
    authorizationPanel.getByText('Keep read/export separate from AI analysis so “readable” never silently becomes “AI-readable”.'),
  ).toBeVisible();
  await authorizationPanel.locator('summary').filter({ hasText: 'Open deeper trust reviews' }).first().click();
  await expect(authorizationPanel.getByText('Current trust summary')).toBeVisible();
  await expect(authorizationPanel.locator('summary').filter({ hasText: 'Site trust reviews' })).toBeVisible();
  await expect(
    authorizationPanel.locator('summary').filter({ hasText: 'Protected families and course AI confirmations' }),
  ).toBeVisible();
  await expect(authorizationPanel).not.toContainText('confirm_required');
  await expect(configurationActionsHeading).toBeVisible();
}

async function expandOptionsRuleEditor(page: Page) {
  const authorizationHeading = page.getByRole('heading', { name: 'Trust center' }).last();
  const authorizationPanel = authorizationHeading.locator('xpath=ancestor::article[1]');
  await page.evaluate(() => {
    for (const details of document.querySelectorAll('details')) {
      details.open = true;
    }
  });
  return authorizationPanel;
}

async function seedTechnicalConfig(
  page: Page,
  input: {
    bffBaseUrl?: string;
    edStemThreadsPath?: string;
    globalLayer2Status?: string;
    canvasLayer2Status?: string;
    allowAllLayer2ReadAnalysis?: boolean;
    allowWorkspaceEnvelope?: boolean;
  },
) {
  await page.evaluate(
    ({
      configKey,
      bffBaseUrl,
      edStemThreadsPath,
      globalLayer2Status,
      canvasLayer2Status,
      allowAllLayer2ReadAnalysis,
      allowWorkspaceEnvelope,
    }) => {
      const storageKey = '__extension_storage__';
      const raw = window.localStorage.getItem(storageKey);
      const state = raw ? JSON.parse(raw) : {};
      const currentConfig = state[configKey] ?? {};
      const currentAuthorization = currentConfig.authorization ?? { policyVersion: 'wave1-skeleton', rules: [] };
      let nextRules = (currentAuthorization.rules ?? []).filter(
        (rule: { id?: string; layer?: string; resourceFamily?: string; site?: string; courseIdOrKey?: string }) =>
          !(
            !rule.site &&
            !rule.courseIdOrKey &&
            rule.layer === 'layer2_ai_read_analysis' &&
            rule.resourceFamily === 'workspace_snapshot'
          ) &&
          !(
            !rule.site &&
            !rule.courseIdOrKey &&
            rule.layer === 'layer1_read_export' &&
            rule.resourceFamily === 'workspace_snapshot'
          ) &&
          !(
            rule.site === 'canvas' &&
            !rule.courseIdOrKey &&
            rule.layer === 'layer1_read_export' &&
            rule.resourceFamily === 'workspace_snapshot'
          ) &&
          !(
            rule.site === 'canvas' &&
            !rule.courseIdOrKey &&
            rule.layer === 'layer2_ai_read_analysis' &&
            rule.resourceFamily === 'workspace_snapshot'
          ),
      );

      if (allowAllLayer2ReadAnalysis) {
        nextRules = nextRules.map((rule: { layer?: string; status?: string }) =>
          rule.layer === 'layer2_ai_read_analysis'
            ? {
                ...rule,
                status: 'allowed',
              }
            : rule,
        );
      }

      if (globalLayer2Status) {
        nextRules.push({
          id: 'global-layer2_ai_read_analysis-workspace',
          layer: 'layer2_ai_read_analysis',
          status: globalLayer2Status,
          resourceFamily: 'workspace_snapshot',
          label: 'All sites AI read/analysis status',
        });
      }

      if (canvasLayer2Status) {
        nextRules.push({
          id: 'canvas-layer2_ai_read_analysis-workspace',
          layer: 'layer2_ai_read_analysis',
          status: canvasLayer2Status,
          site: 'canvas',
          resourceFamily: 'workspace_snapshot',
          label: 'Canvas AI read/analysis status',
        });
      }

      if (allowWorkspaceEnvelope) {
        nextRules.push(
          {
            id: 'global-layer1_read_export-workspace',
            layer: 'layer1_read_export',
            status: 'allowed',
            resourceFamily: 'workspace_snapshot',
            label: 'All sites read/export status',
          },
          {
            id: 'global-layer2_ai_read_analysis-workspace',
            layer: 'layer2_ai_read_analysis',
            status: 'allowed',
            resourceFamily: 'workspace_snapshot',
            label: 'All sites AI read/analysis status',
          },
          {
            id: 'canvas-layer1_read_export-workspace',
            layer: 'layer1_read_export',
            status: 'allowed',
            site: 'canvas',
            resourceFamily: 'workspace_snapshot',
            label: 'Canvas read/export status',
          },
          {
            id: 'canvas-layer2_ai_read_analysis-workspace',
            layer: 'layer2_ai_read_analysis',
            status: 'allowed',
            site: 'canvas',
            resourceFamily: 'workspace_snapshot',
            label: 'Canvas AI read/analysis status',
          },
        );
      }

      state[configKey] = {
        ...currentConfig,
        ai: {
          ...currentConfig.ai,
          ...(bffBaseUrl ? { bffBaseUrl } : {}),
        },
        sites: {
          ...currentConfig.sites,
          edstem: {
            ...currentConfig.sites?.edstem,
            ...(edStemThreadsPath ? { threadsPath: edStemThreadsPath } : {}),
          },
        },
        authorization: {
          ...currentAuthorization,
          rules: nextRules,
        },
      };

      window.localStorage.setItem(storageKey, JSON.stringify(state));
    },
    {
      configKey: CONFIG_KEY,
      bffBaseUrl: input.bffBaseUrl,
      edStemThreadsPath: input.edStemThreadsPath,
      globalLayer2Status: input.globalLayer2Status,
      canvasLayer2Status: input.canvasLayer2Status,
      allowAllLayer2ReadAnalysis: input.allowAllLayer2ReadAnalysis,
      allowWorkspaceEnvelope: input.allowWorkspaceEnvelope,
    },
  );
}

test('opens the built sidepanel and shows four site status cards', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/sidepanel.html');

  await expect(page.getByRole('heading', { name: 'Your campus desk' }).first()).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole('tab', { name: 'Assistant' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Export' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Trust center' })).toBeVisible();
  await expect(page.getByText('Assistant route').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ask AI about this workspace' })).toBeVisible();
  await expect(page.getByText("AI connection isn't ready yet.").first()).toBeVisible();
  await expandDetailedWorkspace(page, 'Open full workspace');
  await expandDiagnosticsWorkspace(page, 'System check');
  await expect(page.locator('.surface__diagnostics-detail').getByText('System check').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Next up' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Workspace status' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Focus Queue' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weekly Load' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Change Journal' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Discussion Highlights' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Schedule Outlook' })).toBeVisible();
  await expect(page.getByText('Fresh sites')).toBeVisible();
  await expect(page.getByText('Stale sites')).toBeVisible();
  await expect(page.getByText('Not synced sites')).toBeVisible();
  await page.getByRole('button', { name: 'Export diagnostics JSON' }).click();
  await page.waitForFunction((downloadKey) => Boolean(localStorage.getItem(downloadKey)), DOWNLOAD_KEY);
  const diagnosticsPayload = await page.evaluate((downloadKey) => localStorage.getItem(downloadKey), DOWNLOAD_KEY);
  expect(diagnosticsPayload).toContain('campus-copilot-diagnostics.json');
  await expect(page.getByRole('heading', { name: 'Site Status' })).toBeVisible();
  await maybeCaptureSmokeScreenshot(page, 'extension-sidepanel-overview');
  await expect(page.getByRole('button', { name: 'Sync Canvas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sync Gradescope' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sync EdStem' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sync MyUW' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('gradescope_courses_optional_collector_failed');
  await page.getByRole('tab', { name: 'Trust center' }).click();
  await expect(page.getByRole('heading', { name: 'Connection and trust summary' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Trust center' }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Allowed rules');
  await expect(page.locator('body')).not.toContainText('Policy version');
  await expect(page.locator('body')).not.toContainText('confirm_required');
});

test('saves settings/auth center changes, syncs edstem, and records export downloads', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/options.html');
  await assertOptionsTrustCenter(page);
  await maybeCaptureSmokeScreenshot(page, 'extension-options-trust-center');
  const authorizationPanel = await expandOptionsRuleEditor(page);
  await authorizationPanel.getByLabel('All sites · AI analysis').selectOption('allowed');
  await page.getByRole('button', { name: 'Save configuration' }).click();
  await expect(page.getByText('Configuration saved.')).toBeVisible();

  await gotoSmokePage(page, baseURL, '/options.html');
  await assertOptionsTrustCenter(page);
  const savedAuthorizationPanel = await expandOptionsRuleEditor(page);
  await expect(savedAuthorizationPanel.getByLabel('All sites · AI analysis')).toHaveValue('allowed');

  await seedTechnicalConfig(page, {
    bffBaseUrl: 'http://127.0.0.1:8787',
    edStemThreadsPath: '/api/courses/90031/threads?limit=30&sort=new',
    globalLayer2Status: 'allowed',
  });

  await gotoSmokePage(page, baseURL, '/sidepanel.html');
  await expandDetailedWorkspace(page, 'Open full workspace');
  await page.getByRole('button', { name: 'Sync EdStem' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'EdStem sync succeeded' })).toBeVisible();
  await page.evaluate(async () => {
    const openCampusCopilotDb = () =>
      new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('campus-copilot');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

    const db = await openCampusCopilotDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['courses', 'messages', 'sync_state'], 'readwrite');
      tx.objectStore('courses').put({
        id: 'edstem:course:90031',
        kind: 'course',
        site: 'edstem',
        source: {
          site: 'edstem',
          resourceId: '90031',
          resourceType: 'course',
          url: 'https://edstem.org/us/courses/90031',
        },
        url: 'https://edstem.org/us/courses/90031',
        title: 'Foundations of Computing II',
        code: 'CSE 312 - 26wi',
      });
      tx.objectStore('messages').put({
        id: 'edstem:message:7850092',
        kind: 'message',
        site: 'edstem',
        source: {
          site: 'edstem',
          resourceId: '7850092',
          resourceType: 'thread',
          url: 'https://edstem.org/us/courses/90031/discussion/7850092',
        },
        url: 'https://edstem.org/us/courses/90031/discussion/7850092',
        courseId: 'edstem:course:90031',
        messageKind: 'thread',
        threadId: '7850092',
        title: 'Wrapping up the quarter',
        createdAt: '2026-03-26T20:22:29.739841+11:00',
        unread: false,
        instructorAuthored: false,
      });
      tx.objectStore('sync_state').put({
        key: 'edstem',
        site: 'edstem',
        status: 'success',
        lastSyncedAt: new Date().toISOString(),
        lastOutcome: 'success',
      });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });
  await page.reload();
  await expandDetailedWorkspace(page, 'Open full workspace');
  const siteStatusPanel = page.locator('article.surface__panel').filter({
    has: page.getByRole('heading', { name: 'Site Status' }),
  });
  const edStemStatusCard = siteStatusPanel
    .locator('article.surface__item')
    .filter({ has: page.locator('strong', { hasText: /^EdStem$/ }) });
  await expect(
    edStemStatusCard
      .locator('p.surface__meta')
      .filter({ hasText: 'Courses 1 · Resources 0 · Assignments 0 · Announcements 0 · Grades 0 · Messages 1 · Events 0' })
      .first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'EdStem', exact: true }).first().click();
  await page.getByRole('button', { name: 'Open export' }).first().click();
  const exportReviewPanel = page.locator('article.surface__panel').filter({
    has: page.getByText('Review & export'),
  });
  await expect(exportReviewPanel.getByText('Review the trust and scope notes before exporting.')).toBeVisible();
  await expect(exportReviewPanel.getByRole('button', { name: 'Export selection' }).first()).toBeEnabled();
  const aiVisibilityCard = exportReviewPanel.locator('article.surface__evidence-card').nth(2);
  await expect(aiVisibilityCard.locator('p.surface__meta-label')).toContainText('AI visibility');
  await expect(aiVisibilityCard.locator('p.surface__item-lead')).toContainText(
    /AI analysis (ready now|kept off)/i,
  );
  const provenanceCard = exportReviewPanel.locator('article.surface__evidence-card').nth(3);
  await expect(provenanceCard.locator('p.surface__meta-label')).toContainText('Provenance');
  await expect(provenanceCard.locator('p.surface__item-lead')).toContainText('Unified local read model');
  const packetEvidenceSummary = page.locator('summary').filter({ hasText: 'Open detailed export evidence' }).first();
  await expect(packetEvidenceSummary).toBeVisible();
  await packetEvidenceSummary.click();
  const packetEvidenceCards = exportReviewPanel.locator('details article.surface__evidence-card');
  const riskCard = packetEvidenceCards.nth(1);
  await expect(riskCard.locator('p.surface__meta-label')).toContainText('Risk label');
  await expect(riskCard.locator('p.surface__item-lead')).toContainText(/(High|Medium|Low) risk/);
  const matchConfidenceCard = packetEvidenceCards.nth(2);
  await expect(matchConfidenceCard.locator('p.surface__meta-label')).toContainText('Match confidence');
  await expect(matchConfidenceCard.locator('p.surface__item-lead')).toContainText(/(High|Medium|Low) match confidence/);
  await exportReviewPanel.getByRole('button', { name: 'Export selection' }).first().click();
  const downloadPayload = JSON.parse(
    (await page.evaluate((downloadKey) => localStorage.getItem(downloadKey), DOWNLOAD_KEY)) ?? '{}',
  );
  const exportedText = await page.evaluate(async (downloadUrl) => fetch(downloadUrl).then((response) => response.text()), downloadPayload.url);
  expect(downloadPayload.filename).toContain('current-view');
  expect(exportedText).toContain('Wrapping up the quarter');
  expect(exportedText).not.toContain('Homework 5');
});

test('keeps ai gated until the current scope is explicitly allowed', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/options.html');
  await seedTechnicalConfig(page, {
    bffBaseUrl: 'http://127.0.0.1:8787',
    globalLayer2Status: 'allowed',
    canvasLayer2Status: 'allowed',
  });

  await gotoSmokePage(page, baseURL, '/sidepanel.html');
  const askAiPanel = page.locator('article.surface__panel').filter({
    has: page.getByRole('heading', { name: 'Ask AI about this workspace' }),
  });
  const visibleEvidenceCard = askAiPanel
    .locator('article.surface__status-card--success article.surface__evidence-card')
    .first();
  await askAiPanel.locator('summary').filter({ hasText: 'Check the evidence first' }).click();
  await expect(askAiPanel.getByRole('heading', { name: 'What AI can see' })).toBeVisible();
  await expect(visibleEvidenceCard.getByText('Today snapshot', { exact: true })).toBeVisible();
  await expect(visibleEvidenceCard.getByText(/Open assignments \d+ · Due within 48 hours \d+ · New grades \d+/)).toBeVisible();
  await expect(
    askAiPanel.locator('article.surface__status-card--success article.surface__evidence-card').nth(1).getByText('Focus queue', { exact: true }),
  ).toBeVisible();
  await expect(
    askAiPanel.locator('article.surface__status-card--success article.surface__evidence-card').nth(2).getByText('Current workbench view', { exact: true }),
  ).toBeVisible();
  await expect(
    askAiPanel.locator('article.surface__status-card--success article.surface__evidence-card').nth(2).getByText('MARKDOWN', { exact: true }),
  ).toBeVisible();
  const questionField = page.getByLabel('Question');
  await expect(page.locator('.surface__workspace-detail summary').filter({ hasText: 'Check this workspace first' })).toBeVisible();
  await expandDetailedWorkspace(page, 'Open full workspace');
  const canvasFilterChip = page.locator('.surface__toolbar').getByRole('button', { name: 'Canvas', exact: true });
  await canvasFilterChip.click();
  await expect(canvasFilterChip).toHaveClass(/surface__chip--active/);
  await questionField.fill('What should I pay attention to right now?');
  await page.getByRole('button', { name: 'Ask AI' }).click();

  await expect(page.getByText('AI access for this desk still needs to be allowed in Trust Center.')).toBeVisible();
  await expect(askAiPanel.getByRole('heading', { name: 'Current site rules' })).toBeVisible();
  await expect(askAiPanel.getByText('Canvas', { exact: true })).toBeVisible();
});

test('asks ai after the current workspace envelope is explicitly allowed', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/options.html');
  await seedTechnicalConfig(page, {
    bffBaseUrl: 'http://127.0.0.1:8787',
    allowAllLayer2ReadAnalysis: true,
    allowWorkspaceEnvelope: true,
    globalLayer2Status: 'allowed',
    canvasLayer2Status: 'allowed',
  });

  await gotoSmokePage(page, baseURL, '/sidepanel.html');
  await expandDetailedWorkspace(page, 'Check this workspace first');
  const canvasFilterChip = page.locator('.surface__toolbar').getByRole('button', { name: 'Canvas', exact: true });
  await canvasFilterChip.click();
  await page.getByLabel('Question').fill('What should I pay attention to right now?');
  await page.getByRole('button', { name: 'Ask AI' }).click();

  await expect(page.getByText('Campus Copilot AI answer')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Key points' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Citations' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Homework 5' })).toBeVisible();
  await maybeCaptureSmokeScreenshot(page, 'extension-sidepanel-ai-answer');
});

test('keeps advanced-material guardrails localized in Chinese UI', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/options.html');
  await page.getByLabel('Interface language').selectOption('zh-CN');
  await page.getByRole('button', { name: /Save configuration|保存配置/ }).click();
  await expect(page.getByText(/Configuration saved\.|配置已保存。/)).toBeVisible();
  await seedTechnicalConfig(page, {
    bffBaseUrl: 'http://127.0.0.1:8787',
    allowAllLayer2ReadAnalysis: true,
    allowWorkspaceEnvelope: true,
    globalLayer2Status: 'allowed',
    canvasLayer2Status: 'allowed',
  });

  await gotoSmokePage(page, baseURL, '/sidepanel.html');
  const chineseAskAiPanel = page.locator('article.surface__panel').filter({
    has: page.getByRole('heading', { name: '围绕这张工作台来问 AI' }),
  });
  await chineseAskAiPanel.locator('summary').filter({ hasText: '高级课程材料分析' }).click();
  await chineseAskAiPanel.getByLabel('为单门课程开启摘录分析').check();
  await chineseAskAiPanel.getByRole('textbox', { name: '问题' }).fill('请解释这段课程摘录和当前工作台之间的关系。');
  await chineseAskAiPanel.getByRole('button', { name: '问 AI' }).click();

  await expect(page.getByText('先选择一门课程，再开启高级课程材料分析。')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Select one course before turning on advanced material analysis.');
});

test('popup stays launcher-first and keeps extra export presets behind disclosure', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/popup.html');

  await expect(page.getByRole('button', { name: 'Open assistant' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Quick export' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trust center' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Current view' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Recent updates' })).toHaveCount(0);
  await expect(page.getByText('More export shortcuts')).toHaveCount(0);
  await maybeCaptureSmokeScreenshot(page, 'extension-popup-launcher');
});

test('shows provider not ready when selected provider is unavailable in bff status', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/options.html');
  await seedTechnicalConfig(page, {
    bffBaseUrl: 'http://127.0.0.1:8787',
    globalLayer2Status: 'allowed',
  });

  await gotoSmokePage(page, baseURL, '/sidepanel.html');
  await page.locator('summary').filter({ hasText: 'AI settings and opt-ins' }).click();
  await expect(page.getByLabel('Provider')).toBeVisible();
  await page.getByLabel('Provider').selectOption('openai');
  await page.getByLabel('Question').fill('What changed recently?');
  await page.getByRole('button', { name: 'Ask AI' }).click();

  await expect(page.getByText("OpenAI is not ready in the local AI route yet.")).toBeVisible();
  const openAiStatusCard = page
    .locator('article.surface__status-card')
    .filter({ has: page.locator('strong', { hasText: /^OpenAI$/ }) });
  await expect(openAiStatusCard.getByText('not ready', { exact: true })).toBeVisible();
  await expect(openAiStatusCard.getByText('missing API key')).toBeVisible();
});

test('switches to Chinese UI and shows partial-success plus site-filter behavior', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/options.html');
  await page.getByLabel('Interface language').selectOption('zh-CN');
  await page.locator('summary').filter({ hasText: '连接工具' }).first().click();
  await page.locator('summary').filter({ hasText: '更深连接工具' }).first().click();
  await page.getByLabel('手动填写本地 AI 地址').fill('');
  await page.getByRole('button', { name: '保存配置' }).click();
  await expect(page.getByText('配置已保存。')).toBeVisible();
  await gotoSmokePage(page, baseURL, '/sidepanel.html');
  const chineseAskAiPanel = page.locator('article.surface__panel').filter({
    has: page.getByRole('heading', { name: '围绕这张工作台来问 AI' }),
  });
  const chineseVisibleEvidenceCard = chineseAskAiPanel
    .locator('article.surface__status-card--success article.surface__evidence-card')
    .first();

  await expect(page.getByRole('heading', { name: '你的校园桌面' }).first()).toBeVisible();
  await chineseAskAiPanel.locator('summary').filter({ hasText: '先核对这张桌面的证据' }).click();
  await expect(chineseAskAiPanel.getByRole('heading', { name: 'AI 当前能看见什么' })).toBeVisible();
  await expect(chineseVisibleEvidenceCard.getByText('今日快照', { exact: true })).toBeVisible();
  await expect(chineseVisibleEvidenceCard.getByText(/待办作业 \d+ · 48 小时内截止 \d+ · 新成绩 \d+/)).toBeVisible();
  await expandDetailedWorkspace(page, '打开完整工作台');
  await expandDiagnosticsWorkspace(page, '诊断');
  await expect(page.locator('.surface__diagnostics-detail').getByText('诊断').first()).toBeVisible();
  await expect(page.locator('.surface__diagnostics-detail').getByText('被环境或运行时阻塞').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '下一步' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '工作台状态' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '专注队列' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '本周负荷' })).toBeVisible();
  await expect(
    chineseAskAiPanel.locator('article.surface__status-card--success article.surface__evidence-card').nth(2).getByText('当前工作台视图', { exact: true }),
  ).toBeVisible();
  await expect(
    chineseAskAiPanel.locator('article.surface__status-card--success article.surface__evidence-card').nth(2).getByText('MARKDOWN', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: '变化账本' })).toBeVisible();
  const chineseRuntimeSummary = chineseAskAiPanel.locator('aside.surface__status-intro');
  await expect(chineseRuntimeSummary.getByText('伴随可信快照')).toBeVisible();
  await expect(chineseRuntimeSummary.getByText(/未就绪 · 缺少 API key/)).toBeVisible();
  await expect(page.getByText('新鲜站点')).toBeVisible();
  await expect(page.getByText('陈旧站点')).toBeVisible();
  await expect(page.getByText('未同步站点')).toBeVisible();
  await page.getByRole('button', { name: 'MyUW', exact: true }).first().click();
  const myUwStatusCard = page
    .locator('article.surface__item')
    .filter({ has: page.locator('strong', { hasText: /^MyUW$/ }) });
  const syncMyUwButton = myUwStatusCard.getByRole('button', { name: '同步 MyUW' });
  await expect(syncMyUwButton).toBeVisible();
  await syncMyUwButton.click();

  await expect(page.getByRole('status').filter({ hasText: 'MyUW 已部分同步成功' })).toBeVisible();
  await expect(page.getByText('当前筛选下还没有结构化任务。')).toBeVisible();
});
