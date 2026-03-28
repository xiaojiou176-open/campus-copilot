import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname } from 'node:path';

const rootDir = process.cwd();
const requestedBffPort = Number(process.env.SIDEPANEL_SMOKE_BFF_PORT ?? '8787');
const requestedSidepanelPort = Number(process.env.SIDEPANEL_SMOKE_PORT ?? '4173');
const defaultProvider = process.env.GEMINI_API_KEY
  ? 'gemini'
  : process.env.OPENAI_API_KEY
    ? 'openai'
    : undefined;
const defaultModel = defaultProvider === 'gemini'
  ? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
  : process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
const screenshotPath = process.env.CAPTURE_SCREENSHOT_PATH;
const uiLanguage = process.env.SIDEPANEL_UI_LANGUAGE ?? (screenshotPath ? 'en' : 'auto');
const browserLanguage = process.env.SIDEPANEL_BROWSER_LANGUAGE ?? 'en-US';
const effectiveUiLanguage =
  uiLanguage === 'auto'
    ? browserLanguage.toLowerCase().startsWith('zh')
      ? 'zh-CN'
      : 'en'
    : uiLanguage;
const questionLabel = effectiveUiLanguage === 'zh-CN' ? '问题' : 'Question';
const askAiLabel = effectiveUiLanguage === 'zh-CN' ? '问 AI' : 'Ask AI';
const refreshProviderLabel = effectiveUiLanguage === 'zh-CN' ? '刷新 provider 状态' : 'Refresh provider status';

if (!defaultProvider) {
  console.error(
    JSON.stringify(
      {
        status: 'blocked',
        reason: 'missing_provider_api_key',
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

const startedProcesses = [];
let browser;
let page;
let activeBffBaseUrl;
let activeSidepanelUrl;

function startProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'pipe',
    ...options,
  });
  child.stdout.on('data', (chunk) => process.stderr.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  startedProcesses.push(child);
  return child;
}

function buildUrl(port, path) {
  return `http://127.0.0.1:${port}${path}`;
}

async function waitForHealthy(url, attempts = 40, validate) {
  for (let remaining = attempts; remaining > 0; remaining -= 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        if (!validate) {
          return;
        }

        const body = await response.text();
        if (validate({ response, body })) {
          return;
        }
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`timeout_waiting_for_${url}`);
}

async function canListenOnPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
  });
}

async function findEphemeralPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : undefined;
      server.close(() => {
        if (!port) {
          reject(new Error('unable_to_resolve_ephemeral_port'));
          return;
        }
        resolve(port);
      });
    });
  });
}

async function resolvePreferredPort(preferredPort, healthPath, label) {
  const preferredUrl = buildUrl(preferredPort, healthPath);
  try {
    await waitForHealthy(preferredUrl, 2, label === 'sidepanel_smoke' ? validateSidepanelHealth : undefined);
    return preferredPort;
  } catch {}

  if (await canListenOnPort(preferredPort)) {
    return preferredPort;
  }

  const fallbackPort = await findEphemeralPort();
  console.error(`${label}_port_remapped:${preferredPort}->${fallbackPort}`);
  return fallbackPort;
}

function validateSidepanelHealth({ body }) {
  return body.includes('Campus Copilot Sidepanel') && body.includes('surface-shell');
}

function validateProviderStatusHealth({ body }) {
  try {
    const payload = JSON.parse(body);
    return payload?.ok === true && payload?.providers && typeof payload.providers === 'object';
  } catch {
    return false;
  }
}

async function ensureServer(url, start, validate) {
  try {
    await waitForHealthy(url, 2, validate);
    return false;
  } catch {
    start();
    await waitForHealthy(url, 40, validate);
    return true;
  }
}

async function cleanup() {
  for (const child of startedProcesses.reverse()) {
    if (child.exitCode !== null) {
      continue;
    }
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
  }
}

async function collectFailureEvidence() {
  const evidence = {};

  if (page) {
    try {
      const pageText = ((await page.textContent('body')) ?? '').replace(/\s+/g, ' ').trim();
      if (pageText) {
        evidence.pageTextPreview = pageText.slice(0, 1600);
      }
    } catch (error) {
      evidence.pageTextPreviewError = error instanceof Error ? error.message : String(error);
    }
  }

  if (activeBffBaseUrl) {
    try {
      const response = await fetch(`${activeBffBaseUrl}/api/providers/status`);
      evidence.providerStatusHttp = {
        status: response.status,
        body: await response.text(),
      };
    } catch (error) {
      evidence.providerStatusHttpError = error instanceof Error ? error.message : String(error);
    }
  }

  if (activeSidepanelUrl) {
    evidence.sidepanelUrl = activeSidepanelUrl;
  }

  if (activeBffBaseUrl) {
    evidence.bffBaseUrl = activeBffBaseUrl;
  }

  return evidence;
}

function buildChromeMocks() {
  return ({ baseUrl, bffBaseUrl, defaultProvider, defaultModel, uiLanguage, browserLanguage }) => {
    const CONFIG_KEY = 'campusCopilotConfig';
    const defaultConfig = {
        [CONFIG_KEY]: {
          defaultExportFormat: 'markdown',
          uiLanguage,
          ai: {
            bffBaseUrl,
            defaultProvider,
          models: {
            openai: defaultProvider === 'openai' ? defaultModel : 'gpt-4.1-mini',
            gemini: defaultProvider === 'gemini' ? defaultModel : 'gemini-2.5-flash',
          },
        },
        sites: {
          edstem: {},
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

    const getStorageState = () => readJson('__extension_storage__', defaultConfig);
    const setStorageState = (nextState) => writeJson('__extension_storage__', nextState);
    const emitChange = (changes) => listeners.forEach((listener) => listener(changes, 'local'));
    const buildIdleCounts = (site) => ({
      site,
      courses: 0,
      assignments: 0,
      announcements: 0,
      grades: 0,
      messages: 0,
      events: 0,
      alerts: 0,
    });

    const chrome = {
      storage: {
        local: {
          async get(keys) {
            const state = getStorageState();
            if (!keys) {
              return state;
            }
            if (typeof keys === 'string') {
              return { [keys]: state[keys] };
            }
            if (Array.isArray(keys)) {
              return Object.fromEntries(keys.map((key) => [key, state[key]]));
            }
            return { ...keys, ...state };
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
      },
      runtime: {
        async sendMessage(message) {
          if (message?.type === 'getSiteSyncStatus') {
            return {
              type: 'getSiteSyncStatus',
              site: message.site,
              status: {
                site: message.site,
                status: 'idle',
                counts: buildIdleCounts(message.site),
              },
            };
          }
          if (message?.type === 'syncSite') {
            return {
              type: 'syncSite',
              site: message.site,
              outcome: 'success',
              status: {
                site: message.site,
                status: 'success',
                lastOutcome: 'success',
                lastSyncedAt: new Date().toISOString(),
                counts: buildIdleCounts(message.site),
              },
            };
          }
          return undefined;
        },
        onMessage: {
          addListener() {},
        },
        async openOptionsPage() {},
      },
      downloads: {
        async download() {
          return 1;
        },
      },
      tabs: {
        async query() {
          return [{ id: 1, url: baseUrl }];
        },
      },
      scripting: {
        async executeScript() {
          return [{ result: { pageHtml: '<main></main>', pageState: { notices: [], events: [] } } }];
        },
      },
    };

    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      get: () => browserLanguage,
    });
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      get: () => [browserLanguage],
    });

    Object.assign(window, { chrome, browser: chrome });
  };
}

try {
  const bffPort = await resolvePreferredPort(requestedBffPort, '/health', 'sidepanel_smoke_bff');
  const sidepanelPort = await resolvePreferredPort(requestedSidepanelPort, '/sidepanel.html', 'sidepanel_smoke');
  const bffBaseUrl = buildUrl(bffPort, '');
  const sidepanelUrl = buildUrl(sidepanelPort, '/sidepanel.html');
  activeBffBaseUrl = bffBaseUrl;
  activeSidepanelUrl = sidepanelUrl;

  await ensureServer(`${bffBaseUrl}/health`, () => {
    startProcess('pnpm', ['start:api'], {
      cwd: rootDir,
      env: {
        ...process.env,
        PORT: String(bffPort),
      },
    });
  });
  await waitForHealthy(`${bffBaseUrl}/api/providers/status`, 40, validateProviderStatusHealth);
  await ensureServer(sidepanelUrl, () => {
    startProcess('node', ['tests/smoke-server.mjs'], {
      cwd: `${rootDir}/apps/extension`,
      env: {
        ...process.env,
        EXTENSION_SMOKE_PORT: String(sidepanelPort),
      },
    });
  }, validateSidepanelHealth);

  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  await page.addInitScript(buildChromeMocks(), {
    baseUrl: 'https://canvas.uw.edu/',
    bffBaseUrl,
    defaultProvider,
    defaultModel,
    uiLanguage,
    browserLanguage,
  });

  await page.goto(sidepanelUrl);
  const providerLabel = defaultProvider === 'gemini' ? 'Gemini' : 'OpenAI';
  const providerReadyLabel = page.getByText(`${providerLabel} · ready · configured`);
  if (!(await providerReadyLabel.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: refreshProviderLabel }).click().catch(() => {});
  }
  await providerReadyLabel.waitFor({ timeout: 20000 });
  if (screenshotPath) {
    mkdirSync(dirname(screenshotPath), { recursive: true });
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
  }
  await page.getByLabel(questionLabel).fill('Reply with the single word READY.');
  await page.getByRole('button', { name: askAiLabel }).click();
  await page.locator('.surface__answer').waitFor({ timeout: 20000 });

  const answerText = (await page.locator('.surface__answer').textContent())?.trim() ?? '';
  if (!answerText.toUpperCase().includes('READY')) {
    throw new Error(`answer_text_missing_ready:${answerText}`);
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        provider: defaultProvider,
        model: defaultModel,
        answerText,
        sidepanelUrl,
        bffBaseUrl,
        ...(screenshotPath ? { screenshotPath } : {}),
      },
      null,
      2,
    ),
  );

  await browser.close();
  browser = undefined;
  page = undefined;
  await cleanup();
} catch (error) {
  const failureEvidence = await collectFailureEvidence().catch(() => ({}));
  if (browser) {
    await browser.close().catch(() => {});
    browser = undefined;
    page = undefined;
  }
  await cleanup().catch(() => {});
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        reason: error instanceof Error ? error.message : String(error),
        ...failureEvidence,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
