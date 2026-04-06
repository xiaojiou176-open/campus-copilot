import { browser } from 'wxt/browser';
import { z } from 'zod';
import type { ProviderId, SwitchyardLane, SwitchyardRuntimeProvider } from '@campus-copilot/ai';
import type { EdStemPathConfig } from '@campus-copilot/adapters-edstem';
import type { ExportFormat } from '@campus-copilot/exporter';
import { UI_LANGUAGE_PREFERENCES, type UiLanguagePreference } from './i18n';

const EXTENSION_CONFIG_KEY = 'campusCopilotConfig';

const ExportFormatSchema = z.enum(['markdown', 'csv', 'json', 'ics']);
const ProviderConfigIdSchema = z.enum(['openai', 'gemini', 'switchyard']);
const SwitchyardRuntimeProviderSchema = z.enum(['chatgpt', 'gemini', 'claude', 'grok', 'qwen']);
const SwitchyardLaneSchema = z.enum(['web', 'byok']);
const UiLanguagePreferenceSchema = z.enum(UI_LANGUAGE_PREFERENCES);
const DEFAULT_EXTENSION_CONFIG = {
  defaultExportFormat: 'markdown',
  uiLanguage: 'auto',
  ai: {
    defaultProvider: 'openai',
    models: {
      openai: 'gpt-4.1-mini',
      gemini: 'gemini-2.5-flash',
      switchyard: 'gpt-5',
    },
    switchyard: {
      provider: 'chatgpt',
      lane: 'web',
    },
  },
  sites: {
    edstem: {},
  },
} as const;

const StoredExtensionConfigSchema = z
  .object({
    defaultExportFormat: ExportFormatSchema.optional(),
    uiLanguage: UiLanguagePreferenceSchema.optional(),
    ai: z
      .object({
        bffBaseUrl: z.string().url().optional(),
        defaultProvider: ProviderConfigIdSchema.optional(),
        models: z
          .object({
            openai: z.string().min(1).optional(),
            gemini: z.string().min(1).optional(),
            switchyard: z.string().min(1).optional(),
          })
          .optional(),
        switchyard: z
          .object({
            provider: SwitchyardRuntimeProviderSchema.optional(),
            lane: SwitchyardLaneSchema.optional(),
          })
          .optional(),
      })
      .optional(),
    sites: z
      .object({
        edstem: z
          .object({
            threadsPath: z.string().min(1).optional(),
            unreadPath: z.string().min(1).optional(),
            recentActivityPath: z.string().min(1).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .strict();

const ExtensionConfigSchema = z
  .object({
    defaultExportFormat: ExportFormatSchema.default(DEFAULT_EXTENSION_CONFIG.defaultExportFormat),
    uiLanguage: UiLanguagePreferenceSchema.default(DEFAULT_EXTENSION_CONFIG.uiLanguage),
    ai: z
      .object({
        bffBaseUrl: z.string().url().optional(),
        defaultProvider: ProviderConfigIdSchema.default(DEFAULT_EXTENSION_CONFIG.ai.defaultProvider),
        models: z
          .object({
            openai: z.string().min(1).default(DEFAULT_EXTENSION_CONFIG.ai.models.openai),
            gemini: z.string().min(1).default(DEFAULT_EXTENSION_CONFIG.ai.models.gemini),
            switchyard: z.string().min(1).default(DEFAULT_EXTENSION_CONFIG.ai.models.switchyard),
          })
          .default(DEFAULT_EXTENSION_CONFIG.ai.models),
        switchyard: z
          .object({
            provider: SwitchyardRuntimeProviderSchema.default(DEFAULT_EXTENSION_CONFIG.ai.switchyard.provider),
            lane: SwitchyardLaneSchema.default(DEFAULT_EXTENSION_CONFIG.ai.switchyard.lane),
          })
          .default(DEFAULT_EXTENSION_CONFIG.ai.switchyard),
      })
      .default(DEFAULT_EXTENSION_CONFIG.ai),
    sites: z
      .object({
        edstem: z
          .object({
            threadsPath: z.string().min(1).optional(),
            unreadPath: z.string().min(1).optional(),
            recentActivityPath: z.string().min(1).optional(),
          })
          .default({}),
      })
      .default(DEFAULT_EXTENSION_CONFIG.sites),
  })
  .strict();

export type ExtensionConfig = z.infer<typeof ExtensionConfigSchema>;

type StorageAreaLike = {
  get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

function normalizeConfig(value: unknown): ExtensionConfig {
  const parsed = StoredExtensionConfigSchema.parse(value ?? {});
  return ExtensionConfigSchema.parse({
    defaultExportFormat: parsed.defaultExportFormat ?? DEFAULT_EXTENSION_CONFIG.defaultExportFormat,
    uiLanguage: parsed.uiLanguage ?? DEFAULT_EXTENSION_CONFIG.uiLanguage,
    ai: {
            ...DEFAULT_EXTENSION_CONFIG.ai,
            ...parsed.ai,
            models: {
              ...DEFAULT_EXTENSION_CONFIG.ai.models,
              ...parsed.ai?.models,
            },
            switchyard: {
              ...DEFAULT_EXTENSION_CONFIG.ai.switchyard,
              ...parsed.ai?.switchyard,
            },
          },
    sites: {
      ...DEFAULT_EXTENSION_CONFIG.sites,
      ...parsed.sites,
      edstem: {
        ...DEFAULT_EXTENSION_CONFIG.sites.edstem,
        ...parsed.sites?.edstem,
      },
    },
  });
}

export function getDefaultExtensionConfig(): ExtensionConfig {
  return normalizeConfig(undefined);
}

export async function loadExtensionConfig(storageArea: StorageAreaLike = browser.storage.local) {
  const stored = await storageArea.get(EXTENSION_CONFIG_KEY);
  return normalizeConfig(stored[EXTENSION_CONFIG_KEY]);
}

export async function saveExtensionConfig(
  nextConfig: ExtensionConfig,
  storageArea: StorageAreaLike = browser.storage.local,
) {
  const parsed = ExtensionConfigSchema.parse(nextConfig);
  await storageArea.set({
    [EXTENSION_CONFIG_KEY]: parsed,
  });
  return parsed;
}

export function subscribeExtensionConfig(listener: (config: ExtensionConfig) => void) {
  const handleChange = (
    changes: Record<string, { newValue?: unknown }>,
    areaName: string,
  ) => {
    if (areaName !== 'local' || !changes[EXTENSION_CONFIG_KEY]) {
      return;
    }

    listener(normalizeConfig(changes[EXTENSION_CONFIG_KEY]?.newValue));
  };

  browser.storage.onChanged.addListener(handleChange);
  return () => {
    browser.storage.onChanged.removeListener(handleChange);
  };
}

export function getProviderModel(config: ExtensionConfig, provider: ProviderId) {
  return config.ai.models[provider];
}

export function getSwitchyardRuntimeProvider(config: ExtensionConfig): SwitchyardRuntimeProvider {
  return config.ai.switchyard.provider;
}

export function getSwitchyardLane(config: ExtensionConfig): SwitchyardLane {
  return config.ai.switchyard.lane;
}

export function getEdStemPathConfig(config: ExtensionConfig): EdStemPathConfig | undefined {
  const { threadsPath, unreadPath, recentActivityPath } = config.sites.edstem;
  if (!threadsPath) {
    return undefined;
  }

  return {
    threadsPath,
    unreadPath,
    recentActivityPath,
  };
}

export function buildNextConfig(input: {
  current: ExtensionConfig;
  defaultExportFormat?: ExportFormat;
  uiLanguage?: UiLanguagePreference;
  ai?: Partial<ExtensionConfig['ai']>;
  sites?: Partial<ExtensionConfig['sites']>;
}) {
  return normalizeConfig({
    ...input.current,
    ...(input.defaultExportFormat ? { defaultExportFormat: input.defaultExportFormat } : {}),
    ...(input.uiLanguage ? { uiLanguage: input.uiLanguage } : {}),
    ...(input.ai
      ? {
          ai: {
            ...input.current.ai,
            ...input.ai,
            models: {
              ...input.current.ai.models,
              ...input.ai.models,
            },
          },
        }
      : {}),
    ...(input.sites
      ? {
          sites: {
            ...input.current.sites,
            ...input.sites,
            edstem: {
              ...input.current.sites.edstem,
              ...input.sites.edstem,
            },
          },
        }
      : {}),
  });
}
