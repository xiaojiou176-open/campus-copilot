import { expect, test } from '@playwright/test';

const CONFIG_KEY = 'campusCopilotConfig';
const SITE_STATE_KEY = '__campus_copilot_mock_site_states__';
const DOWNLOAD_KEY = '__campus_copilot_last_download__';

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

test('opens the built sidepanel and shows four site status cards', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/sidepanel.html');

  await expect(page.getByRole('heading', { name: 'Academic workbench' })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole('heading', { name: 'Diagnostics' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Next Up' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Trust Summary' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Focus Queue' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weekly Load' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Change Journal' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Discussion Highlights' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Schedule Outlook' })).toBeVisible();
  await expect(page.getByText('Provider not ready: OpenAI, Gemini')).toBeVisible();
  await expect(page.getByText('Fresh sites')).toBeVisible();
  await expect(page.getByText('Stale sites')).toBeVisible();
  await expect(page.getByText('Not synced sites')).toBeVisible();
  await page.getByRole('button', { name: 'Export diagnostics JSON' }).click();
  const diagnosticsPayload = await page.evaluate((downloadKey) => localStorage.getItem(downloadKey), DOWNLOAD_KEY);
  expect(diagnosticsPayload).toContain('campus-copilot-diagnostics.json');
  await expect(page.getByRole('heading', { name: 'Site Status' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sync Canvas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sync Gradescope' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sync EdStem' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sync MyUW' })).toBeVisible();
  await expect(page.getByText('BFF base URL is still missing')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('gradescope_courses_optional_collector_failed');
});

test('saves options config, syncs edstem, and records export downloads', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/options.html');

  await page.getByLabel('EdStem threads path').fill('/api/courses/90031/threads?limit=30&sort=new');
  await page.getByLabel('BFF base URL').fill('http://127.0.0.1:8787');
  await page.getByRole('button', { name: 'Save configuration' }).click();
  await expect(page.getByText('Configuration saved.')).toBeVisible();

  await gotoSmokePage(page, baseURL, '/sidepanel.html');
  await page.getByRole('button', { name: 'Sync EdStem' }).click();
  await expect(page.getByText('EdStem sync succeeded')).toBeVisible();
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
  const edStemStatusCard = page
    .locator('article.surface__item')
    .filter({ has: page.locator('strong', { hasText: /^EdStem$/ }) });
  await expect(
    edStemStatusCard.getByText(
      'Courses 1 · Resources 0 · Assignments 0 · Announcements 0 · Grades 0 · Messages 1 · Events 0',
    ),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Open export' }).click();
  const downloadPayload = await page.evaluate((downloadKey) => localStorage.getItem(downloadKey), DOWNLOAD_KEY);
  expect(downloadPayload).toContain('current-view');
});

test('asks ai after provider config exists', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/options.html');
  await page.getByLabel('BFF base URL').fill('http://127.0.0.1:8787');
  await page.getByRole('button', { name: 'Save configuration' }).click();

  await gotoSmokePage(page, baseURL, '/sidepanel.html');
  const askAiPanel = page.locator('article.surface__panel').filter({
    has: page.getByRole('heading', { name: 'Ask AI about this workspace' }),
  });
  await expect(askAiPanel.getByRole('heading', { name: 'What AI can see' })).toBeVisible();
  await expect(askAiPanel.getByText('Today snapshot', { exact: true })).toBeVisible();
  await expect(askAiPanel.getByText(/Open assignments \d+ · Due within 48 hours \d+ · New grades \d+/)).toBeVisible();
  await expect(askAiPanel.getByText('Focus queue', { exact: true })).toBeVisible();
  await expect(askAiPanel.getByText('Current workbench view', { exact: true })).toBeVisible();
  await expect(askAiPanel.getByText('MARKDOWN', { exact: true })).toBeVisible();
  await page.getByLabel('Question').fill('What should I pay attention to right now?');
  await page.getByRole('button', { name: 'Ask AI' }).click();

  await expect(page.getByText('Campus Copilot AI answer')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Key points' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Citations' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Homework 5' })).toBeVisible();
});

test('popup exposes all formal export presets, including recent updates and all deadlines', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/popup.html');
  const quickPulsePanel = page.locator('article.surface__panel').filter({
    has: page.getByRole('heading', { name: 'Quick pulse exports' }),
  });

  await expect(page.getByRole('button', { name: 'Weekly assignments' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recent updates' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'All deadlines' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Focus queue' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Weekly load' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change journal' })).toBeVisible();
  await expect(quickPulsePanel.getByRole('button', { name: /^Current view/ })).toBeVisible();

  await page.getByRole('button', { name: 'Recent updates' }).click();
  let downloadPayload = await page.evaluate((downloadKey) => localStorage.getItem(downloadKey), DOWNLOAD_KEY);
  expect(downloadPayload).toContain('recent-updates');

  await page.getByRole('button', { name: 'All deadlines' }).click();
  downloadPayload = await page.evaluate((downloadKey) => localStorage.getItem(downloadKey), DOWNLOAD_KEY);
  expect(downloadPayload).toContain('all-deadlines');
});

test('shows provider not ready when selected provider is unavailable in bff status', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/options.html');
  await page.getByLabel('BFF base URL').fill('http://127.0.0.1:8787');
  await page.getByRole('button', { name: 'Save configuration' }).click();

  await gotoSmokePage(page, baseURL, '/sidepanel.html');
  await page.locator('summary').filter({ hasText: 'Advanced runtime settings' }).click();
  await expect(page.getByLabel('Provider')).toBeVisible();
  await page.getByLabel('Provider').selectOption('gemini');
  await page.getByLabel('Question').fill('What changed recently?');
  await page.getByRole('button', { name: 'Ask AI' }).click();

  await expect(page.getByText('Gemini is not ready in the BFF yet.')).toBeVisible();
  await expect(page.getByText('Gemini · not ready')).toBeVisible();
  const geminiStatusCard = page
    .locator('article.surface__status-card')
    .filter({ has: page.locator('strong', { hasText: /^Gemini$/ }) });
  await expect(geminiStatusCard.getByText('missing API key')).toBeVisible();
});

test('switches to Chinese UI and shows partial-success plus site-filter behavior', async ({ page, baseURL }) => {
  await gotoSmokePage(page, baseURL, '/options.html');
  await page.getByLabel('Interface language').selectOption('zh-CN');
  await page.getByLabel('BFF 地址').fill('');
  await page.getByRole('button', { name: '保存配置' }).click();
  await expect(page.getByText('配置已保存。')).toBeVisible();
  await gotoSmokePage(page, baseURL, '/sidepanel.html');
  const chineseAskAiPanel = page.locator('article.surface__panel').filter({
    has: page.getByRole('heading', { name: '围绕这张工作台来问 AI' }),
  });

  await expect(page.getByText('当前状态: 被环境或运行时阻塞')).toBeVisible();
  await expect(page.getByRole('heading', { name: '现在先做什么' })).toBeVisible();
  await expect(chineseAskAiPanel.getByRole('heading', { name: 'AI 当前能看见什么' })).toBeVisible();
  await expect(chineseAskAiPanel.getByText('今日快照', { exact: true })).toBeVisible();
  await expect(chineseAskAiPanel.getByText(/待办作业 \d+ · 48 小时内截止 \d+ · 新成绩 \d+/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '可信度摘要' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '专注队列' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '本周负荷' })).toBeVisible();
  await expect(chineseAskAiPanel.getByText('当前工作台视图', { exact: true })).toBeVisible();
  await expect(chineseAskAiPanel.getByText('MARKDOWN', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '变化账本' })).toBeVisible();
  await expect(page.getByText('OpenAI · 未就绪')).toBeVisible();
  await expect(chineseAskAiPanel.getByText(/缺少 API key · 最近检查:/)).toBeVisible();
  await expect(page.getByText('新鲜站点')).toBeVisible();
  await expect(page.getByText('陈旧站点')).toBeVisible();
  await expect(page.getByText('未同步站点')).toBeVisible();
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
