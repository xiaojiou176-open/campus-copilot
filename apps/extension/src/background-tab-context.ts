import { browser } from 'wxt/browser';
import type { CanvasRequestExecutor } from '@campus-copilot/adapters-canvas';
import type { EdStemPathConfig, EdStemRequestExecutor } from '@campus-copilot/adapters-edstem';
import type { GradescopeRequestExecutor } from '@campus-copilot/adapters-gradescope';
import type { MyUWRequestExecutor } from '@campus-copilot/adapters-myuw';
import { extractPageHtmlInPage, extractMyUWPageContextInPage, type MyUWPageContext } from './background-runtime';

export type InjectedRequestResponse =
  | {
      ok: true;
      status: number;
      responseUrl: string;
      bodyText: string;
      linkHeader?: string;
      contentType?: string;
    }
  | {
      ok: false;
      code: 'request_failed' | 'unsupported_context';
      message: string;
      status?: number;
    };

export type ActiveTabContext = {
  tabId: number;
  url: string;
};

export type SyncTargetOverride = {
  tabId?: number;
  url?: string;
};

function executeSiteRequestInPage(path: string): Promise<InjectedRequestResponse> {
  const expectsHtml = path.startsWith('__html__:');
  const normalizedPath = expectsHtml ? path.replace(/^__html__:/, '') : path;
  const targetUrl = new URL(normalizedPath, window.location.origin);
  return fetch(targetUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: expectsHtml
      ? undefined
      : {
          Accept: 'application/json',
        },
  })
    .then(async (response) => {
      return {
        ok: true as const,
        status: response.status,
        responseUrl: response.url,
        bodyText: await response.text(),
        linkHeader: response.headers.get('link') ?? undefined,
        contentType: response.headers.get('content-type') ?? undefined,
      };
    })
    .catch((error) => {
      return {
        ok: false as const,
        code: 'request_failed',
        message: error instanceof Error ? error.message : 'Page request failed in the active tab.',
      };
    });
}

function readEdStemAuthTokenInPage() {
  return window.localStorage.getItem('authToken:us') || window.localStorage.getItem('authToken');
}

function createTabRequestExecutor(tabId: number) {
  return async (path: string): Promise<InjectedRequestResponse> => {
    try {
      const results = await browser.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: executeSiteRequestInPage,
        args: [path],
      });
      const result = results[0]?.result;
      if (!result) {
        return {
          ok: false as const,
          code: 'request_failed',
          message: 'Page request returned no result from the active tab.',
        };
      }

      if (!result.ok) {
        return {
          ok: false as const,
          code: result.code ?? 'request_failed',
          message: result.message ?? 'Page request failed.',
          status: result.status,
        };
      }

      return {
        ok: true as const,
        status: result.status ?? 0,
        responseUrl: result.responseUrl ?? '',
        bodyText: result.bodyText ?? '',
        linkHeader: result.linkHeader,
        contentType: result.contentType,
      };
    } catch (error) {
      return {
        ok: false as const,
        code: 'unsupported_context',
        message: error instanceof Error ? error.message : 'Unable to execute a request in the active tab.',
      };
    }
  };
}

export function createCanvasTabRequestExecutor(tabId: number): CanvasRequestExecutor {
  const execute = createTabRequestExecutor(tabId);
  return async (path) => execute(path);
}

export function createGradescopeTabRequestExecutor(tabId: number): GradescopeRequestExecutor {
  const execute = createTabRequestExecutor(tabId);
  return async (path) => execute(path);
}

export function createEdStemTabRequestExecutor(tabId: number): EdStemRequestExecutor {
  return async (path) => {
    try {
      const results = await browser.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: readEdStemAuthTokenInPage,
      });
      const authToken = results[0]?.result;
      const targetUrl = new URL(path, 'https://us.edstem.org');
      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(authToken ? { 'x-token': authToken } : {}),
        },
      });

      return {
        ok: true as const,
        status: response.status,
        responseUrl: response.url,
        bodyText: await response.text(),
        contentType: response.headers.get('content-type') ?? undefined,
      };
    } catch (error) {
      return {
        ok: false as const,
        code: 'request_failed',
        message: error instanceof Error ? error.message : 'Unable to execute the EdStem request.',
      };
    }
  };
}

export function createMyUWTabRequestExecutor(tabId: number): MyUWRequestExecutor {
  const execute = createTabRequestExecutor(tabId);
  return async (path) => execute(path);
}

export function buildDefaultEdStemPathConfig(url: string): EdStemPathConfig | undefined {
  const match = url.match(/\/us\/courses\/(?<courseId>\d+)/);
  const courseId = match?.groups?.courseId;
  if (!courseId) {
    return undefined;
  }

  return {
    threadsPath: `/api/courses/${courseId}/threads?limit=30&sort=new`,
    unreadPath: '/internal/unread',
    recentActivityPath: '/internal/recent-activity',
  };
}

export async function extractMyUWContext(tabId: number): Promise<MyUWPageContext | undefined> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: extractMyUWPageContextInPage,
    });
    return results[0]?.result;
  } catch {
    return undefined;
  }
}

export async function extractPageHtml(tabId: number): Promise<string | undefined> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: extractPageHtmlInPage,
    });
    return results[0]?.result;
  } catch {
    return undefined;
  }
}

export async function getActiveTabContext(input?: SyncTargetOverride): Promise<ActiveTabContext | undefined> {
  if (input?.tabId && input.url) {
    return {
      tabId: input.tabId,
      url: input.url,
    };
  }

  const [activeTab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab?.id || !activeTab.url || !activeTab.url.startsWith('http')) {
    return undefined;
  }

  return {
    tabId: activeTab.id,
    url: activeTab.url,
  };
}

export async function getTabContextsByUrlPatterns(urlPatterns: string[]): Promise<ActiveTabContext[]> {
  if (urlPatterns.length === 0) {
    return [];
  }

  const tabs = await browser.tabs.query({
    url: urlPatterns,
  });

  return tabs
    .filter((tab): tab is typeof tab & { id: number; url: string } => Boolean(tab.id && tab.url && tab.url.startsWith('http')))
    .map((tab) => ({
      tabId: tab.id,
      url: tab.url,
    }));
}
