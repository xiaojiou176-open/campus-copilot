import { expect, test } from '@playwright/test';

const CONFIG_KEY = 'campusCopilotConfig';
const SITE_STATE_KEY = '__campus_copilot_mock_site_states__';
const DOWNLOAD_KEY = '__campus_copilot_last_download__';

async function installExtensionMocks(page: import('@playwright/test').Page) {
  await page.addInitScript(
    ({ configKey, siteStateKey, downloadKey }) => {
      const defaultConfig = {
        [configKey]: {
          defaultExportFormat: 'markdown',
          uiLanguage: 'auto',
          ai: {
            defaultProvider: 'openai',
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

      if (!window.localStorage.getItem('__extension_storage__')) {
        writeJson('__extension_storage__', defaultConfig);
      }
      if (!window.localStorage.getItem(siteStateKey)) {
        writeJson(siteStateKey, defaultStates);
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
        if (url.includes('/api/providers/status')) {
          const config = getStorageState()[configKey];
          return new Response(
            JSON.stringify({
              ok: true,
              providers: {
                openai: {
                  ready: Boolean(config?.ai?.bffBaseUrl),
                  reason: config?.ai?.bffBaseUrl ? 'configured' : 'missing_api_key',
                },
                gemini: {
                  ready: false,
                  reason: 'missing_api_key',
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

test('opens the built sidepanel and shows four site status cards', async ({ page }) => {
  await page.goto('/sidepanel.html');

  await expect(page.getByRole('heading', { name: 'Diagnostics' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Focus Queue' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weekly Load' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Change Journal' })).toBeVisible();
  await expect(page.getByText('Provider not ready: OpenAI, Gemini')).toBeVisible();
  await page.getByRole('button', { name: 'Export diagnostics JSON' }).click();
  const diagnosticsPayload = await page.evaluate((downloadKey) => localStorage.getItem(downloadKey), DOWNLOAD_KEY);
  expect(diagnosticsPayload).toContain('campus-copilot-diagnostics.json');
  await expect(page.getByRole('heading', { name: 'Site Status' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sync Canvas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sync Gradescope' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sync EdStem' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sync MyUW' })).toBeVisible();
  await expect(page.getByText('BFF base URL is still missing')).toBeVisible();
});

test('saves options config, syncs edstem, and records export downloads', async ({ page }) => {
  await page.goto('/options.html');

  await page.getByLabel('EdStem threads path').fill('/api/courses/90031/threads?limit=30&sort=new');
  await page.getByLabel('BFF base URL').fill('http://127.0.0.1:8787');
  await page.getByRole('button', { name: 'Save configuration' }).click();
  await expect(page.getByText('Configuration saved.')).toBeVisible();

  await page.goto('/sidepanel.html');
  await page.getByRole('button', { name: 'Sync EdStem' }).click();
  await expect(page.getByText('EdStem sync succeeded')).toBeVisible();

  await page.getByRole('button', { name: 'Open export' }).click();
  const downloadPayload = await page.evaluate((downloadKey) => localStorage.getItem(downloadKey), DOWNLOAD_KEY);
  expect(downloadPayload).toContain('current-view');
});

test('asks ai after provider config exists', async ({ page }) => {
  await page.goto('/options.html');
  await page.getByLabel('BFF base URL').fill('http://127.0.0.1:8787');
  await page.getByRole('button', { name: 'Save configuration' }).click();

  await page.goto('/sidepanel.html');
  await page.getByLabel('Question').fill('What should I pay attention to right now?');
  await page.getByRole('button', { name: 'Ask AI' }).click();

  await expect(page.getByText('Campus Copilot AI answer')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Key points' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Citations' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Homework 5' })).toBeVisible();
});

test('shows provider not ready when selected provider is unavailable in bff status', async ({ page }) => {
  await page.goto('/options.html');
  await page.getByLabel('BFF base URL').fill('http://127.0.0.1:8787');
  await page.getByRole('button', { name: 'Save configuration' }).click();

  await page.goto('/sidepanel.html');
  await page.getByLabel('Provider').selectOption('gemini');
  await page.getByLabel('Question').fill('What changed recently?');
  await page.getByRole('button', { name: 'Ask AI' }).click();

  await expect(page.getByText('Gemini is not ready in the BFF yet.')).toBeVisible();
  await expect(page.getByText('Gemini · not ready · missing API key')).toBeVisible();
});

test('switches to Chinese UI and shows partial-success plus site-filter behavior', async ({ page }) => {
  await page.goto('/options.html');
  await page.getByLabel('Interface language').selectOption('zh-CN');
  await page.getByRole('button', { name: '保存配置' }).click();
  await expect(page.getByText('配置已保存。')).toBeVisible();
  await page.goto('/sidepanel.html');

  await expect(page.getByText('当前状态: 被环境或运行时阻塞')).toBeVisible();
  await expect(page.getByRole('heading', { name: '专注队列' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '本周负荷' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '变化账本' })).toBeVisible();
  await expect(page.getByText('OpenAI · 未就绪 · 缺少 API key')).toBeVisible();
  await page.getByRole('button', { name: 'MyUW', exact: true }).click();
  const myUwStatusCard = page
    .locator('article.surface__item')
    .filter({ has: page.locator('strong', { hasText: /^MyUW$/ }) });
  const syncMyUwButton = myUwStatusCard.getByRole('button', { name: '同步 MyUW' });
  await expect(syncMyUwButton).toBeVisible();
  await syncMyUwButton.click();

  await expect(page.getByText('MyUW 已部分同步成功')).toBeVisible();
  await expect(page.getByText('当前筛选下还没有结构化任务。')).toBeVisible();
});
