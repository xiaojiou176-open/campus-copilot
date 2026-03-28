import { describe, expect, it } from 'vitest';
import {
  buildNextConfig,
  getDefaultExtensionConfig,
  getEdStemPathConfig,
  getProviderModel,
  loadExtensionConfig,
  saveExtensionConfig,
} from './config';

function createStorageMock(initial: Record<string, unknown> = {}) {
  const state = { ...initial };
  return {
    get: async (key?: string | string[] | Record<string, unknown> | null) => {
      if (!key || typeof key !== 'string') {
        return state;
      }

      return {
        [key]: state[key],
      };
    },
    set: async (items: Record<string, unknown>) => {
      Object.assign(state, items);
    },
  };
}

describe('extension config', () => {
  it('loads default config when storage is empty', async () => {
    const config = await loadExtensionConfig(createStorageMock());

    expect(config.defaultExportFormat).toBe('markdown');
    expect(config.uiLanguage).toBe('auto');
    expect(config.ai.defaultProvider).toBe('openai');
    expect(config.ai.models.gemini).toBe('gemini-2.5-flash');
  });

  it('merges partial updates without dropping nested models or site config', async () => {
    const current = getDefaultExtensionConfig();
    const next = buildNextConfig({
      current,
      ai: {
        bffBaseUrl: 'http://127.0.0.1:8787',
        models: {
          ...current.ai.models,
          openai: 'gpt-4.1',
        },
      },
      uiLanguage: 'zh-CN',
      sites: {
        edstem: {
          threadsPath: '/api/courses/90031/threads?limit=30&sort=new',
        },
      },
    });

    expect(next.ai.bffBaseUrl).toBe('http://127.0.0.1:8787');
    expect(next.ai.models.openai).toBe('gpt-4.1');
    expect(next.ai.models.gemini).toBe('gemini-2.5-flash');
    expect(next.uiLanguage).toBe('zh-CN');
    expect(next.sites.edstem.threadsPath).toBe('/api/courses/90031/threads?limit=30&sort=new');
  });

  it('persists config and exposes derived helpers', async () => {
    const storage = createStorageMock();
    const saved = await saveExtensionConfig(
      buildNextConfig({
        current: getDefaultExtensionConfig(),
        defaultExportFormat: 'json',
        uiLanguage: 'en',
        ai: {
          defaultProvider: 'gemini',
          bffBaseUrl: 'http://127.0.0.1:8787',
          models: {
            openai: 'gpt-4.1-mini',
            gemini: 'gemini-2.5-pro',
          },
        },
        sites: {
          edstem: {
            threadsPath: '/api/courses/90031/threads?limit=30&sort=new',
          },
        },
      }),
      storage,
    );

    expect(getProviderModel(saved, 'gemini')).toBe('gemini-2.5-pro');
    expect(saved.uiLanguage).toBe('en');
    expect(getEdStemPathConfig(saved)).toEqual({
      threadsPath: '/api/courses/90031/threads?limit=30&sort=new',
      unreadPath: undefined,
      recentActivityPath: undefined,
    });
  });
});
