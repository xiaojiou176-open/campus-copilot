import { describe, expect, it } from 'vitest';
import {
  ADMIN_HIGH_SENSITIVITY_FAMILY_DESCRIPTORS,
  buildNextConfig,
  getDefaultExtensionConfig,
  getEdStemPathConfig,
  getProviderModel,
  getSwitchyardLane,
  getSwitchyardRuntimeProvider,
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
    expect(config.ai.models.switchyard).toBe('gpt-5');
    expect(config.authorization.policyVersion).toBe('wave2-deepwater-productization');
    expect(config.authorization.rules.some((rule) => rule.site === 'canvas' && rule.layer === 'layer1_read_export')).toBe(true);
    expect(config.authorization.rules.some((rule) => rule.site === 'myplan' && rule.layer === 'layer1_read_export')).toBe(true);
    expect(config.authorization.rules.some((rule) => rule.site === 'time-schedule' && rule.layer === 'layer1_read_export')).toBe(true);
    expect(
      config.authorization.rules.some(
        (rule) => rule.resourceFamily === 'degree_audit_summary' && rule.layer === 'layer2_ai_read_analysis' && rule.status === 'blocked',
      ),
    ).toBe(true);
    expect(
      config.authorization.rules.some(
        (rule) => rule.resourceFamily === 'transcript_summary' && rule.layer === 'layer1_read_export' && rule.status === 'confirm_required',
      ),
    ).toBe(true);
    expect(
      ADMIN_HIGH_SENSITIVITY_FAMILY_DESCRIPTORS.find((family) => family.resourceFamily === 'degree_audit_summary')?.note,
    ).toContain('review-first summary');
    expect(
      config.authorization.rules.find((rule) => rule.id === 'tuition-account-layer1-summary')?.reason,
    ).toContain('review-first summary');
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
      authorization: {
        updatedAt: '2026-04-11T10:00:00.000Z',
        rules: [
          ...current.authorization.rules,
          {
            id: 'canvas-course-opt-in',
            layer: 'layer2_ai_read_analysis',
            status: 'allowed',
            site: 'canvas',
            courseIdOrKey: 'canvas:course:1',
            resourceFamily: 'course_material_excerpt',
          },
        ],
      },
    });

    expect(next.ai.bffBaseUrl).toBe('http://127.0.0.1:8787');
    expect(next.ai.models.openai).toBe('gpt-4.1');
    expect(next.ai.models.gemini).toBe('gemini-2.5-flash');
    expect(next.ai.models.switchyard).toBe('gpt-5');
    expect(next.uiLanguage).toBe('zh-CN');
    expect(next.sites.edstem.threadsPath).toBe('/api/courses/90031/threads?limit=30&sort=new');
    expect(next.authorization.updatedAt).toBe('2026-04-11T10:00:00.000Z');
    expect(next.authorization.rules.some((rule) => rule.id === 'canvas-course-opt-in')).toBe(true);
  });

  it('persists config and exposes derived helpers', async () => {
    const storage = createStorageMock();
    const saved = await saveExtensionConfig(
      buildNextConfig({
        current: getDefaultExtensionConfig(),
        defaultExportFormat: 'json',
        uiLanguage: 'en',
        ai: {
          defaultProvider: 'switchyard',
          bffBaseUrl: 'http://127.0.0.1:8787',
          models: {
            openai: 'gpt-4.1-mini',
            gemini: 'gemini-2.5-pro',
            switchyard: 'gpt-5',
          },
          switchyard: {
            provider: 'claude',
            lane: 'byok',
          },
        },
        sites: {
          edstem: {
            threadsPath: '/api/courses/90031/threads?limit=30&sort=new',
          },
        },
        authorization: {
          updatedAt: '2026-04-11T12:00:00.000Z',
          rules: [
            {
              id: 'myuw-layer2-tightened',
              layer: 'layer2_ai_read_analysis',
              status: 'blocked',
              site: 'myuw',
              resourceFamily: 'workspace_snapshot',
            },
          ],
        },
      }),
      storage,
    );

    expect(getProviderModel(saved, 'gemini')).toBe('gemini-2.5-pro');
    expect(getProviderModel(saved, 'switchyard')).toBe('gpt-5');
    expect(getSwitchyardRuntimeProvider(saved)).toBe('claude');
    expect(getSwitchyardLane(saved)).toBe('byok');
    expect(saved.uiLanguage).toBe('en');
    expect(getEdStemPathConfig(saved)).toEqual({
      threadsPath: '/api/courses/90031/threads?limit=30&sort=new',
      unreadPath: undefined,
      recentActivityPath: undefined,
    });
    expect(saved.authorization.updatedAt).toBe('2026-04-11T12:00:00.000Z');
    expect(saved.authorization.rules).toEqual([
      {
        id: 'myuw-layer2-tightened',
        layer: 'layer2_ai_read_analysis',
        status: 'blocked',
        site: 'myuw',
        resourceFamily: 'workspace_snapshot',
      },
    ]);
  });
});
