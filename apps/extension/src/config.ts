import { browser } from 'wxt/browser';
import { z } from 'zod';
import type { ProviderId, SwitchyardLane, SwitchyardRuntimeProvider } from '@campus-copilot/ai';
import type { EdStemPathConfig } from '@campus-copilot/adapters-edstem';
import {
  AUTHORIZATION_LAYERS,
  AUTHORIZATION_STATUSES,
  EXPORT_SCOPE_TYPES,
  type AuthorizationState,
  type ExportFormat,
} from '@campus-copilot/exporter';
import { UI_LANGUAGE_PREFERENCES, type UiLanguagePreference } from './i18n';

const EXTENSION_CONFIG_KEY = 'campusCopilotConfig';

const ExportFormatSchema = z.enum(['markdown', 'csv', 'json', 'ics']);
const ProviderConfigIdSchema = z.enum(['openai', 'gemini', 'switchyard']);
const SwitchyardRuntimeProviderSchema = z.enum(['chatgpt', 'gemini', 'claude', 'grok', 'qwen']);
const SwitchyardLaneSchema = z.enum(['web', 'byok']);
const UiLanguagePreferenceSchema = z.enum(UI_LANGUAGE_PREFERENCES);
const AuthorizationLayerSchema = z.enum(AUTHORIZATION_LAYERS);
const AuthorizationStatusSchema = z.enum(AUTHORIZATION_STATUSES);
const ExportScopeTypeSchema = z.enum(EXPORT_SCOPE_TYPES);
const AuthorizationRuleSchema = z
  .object({
    id: z.string().min(1),
    layer: AuthorizationLayerSchema,
    status: AuthorizationStatusSchema,
    site: z.string().min(1).optional(),
    courseIdOrKey: z.string().min(1).optional(),
    resourceFamily: z.string().min(1).optional(),
    scopeType: ExportScopeTypeSchema.optional(),
    label: z.string().min(1).optional(),
    reason: z.string().min(1).optional(),
    updatedAt: z.string().min(1).optional(),
  })
  .strict();
const AuthorizationStateSchema = z
  .object({
    policyVersion: z.string().min(1).default('wave2-deepwater-productization'),
    rules: z.array(AuthorizationRuleSchema).default([]),
    updatedAt: z.string().min(1).optional(),
  })
  .strict();

export const MANAGED_POLICY_SITES = [
  'canvas',
  'gradescope',
  'edstem',
  'myuw',
  'myplan',
  'time-schedule',
  'course-sites',
] as const;

export const ADMIN_HIGH_SENSITIVITY_FAMILY_DESCRIPTORS = [
  {
    resourceFamily: 'degree_audit_summary',
    label: 'Degree-audit / DARS summaries',
    note: 'DARS now appears as a review-first summary. It is real shared truth, but detail/runtime promotion still remains pending.',
  },
  {
    resourceFamily: 'transcript_summary',
    label: 'Transcript summaries',
    note: 'Transcript now appears as a review-first summary. Historical-record detail still stays outside a standalone runtime lane.',
  },
  {
    resourceFamily: 'financial_aid_summary',
    label: 'Financial-aid summaries',
    note: 'Financial aid now appears as a review-first summary. High-sensitivity detail still stays export-first and outside the AI-readable path.',
  },
  {
    resourceFamily: 'profile_summary',
    label: 'Profile summaries',
    note: 'Profile now appears as a review-first summary. Personal-profile detail remains export-first and outside the default AI-readable path.',
  },
  {
    resourceFamily: 'tuition_account_summary',
    label: 'Tuition / account summaries',
    note: 'Tuition/account now appears as a review-first summary. Billing detail is still not a standalone runtime lane.',
  },
] as const;

function buildDefaultAuthorizationRules(): AuthorizationState['rules'] {
  return [
    {
      id: 'global-layer1-workspace',
      layer: 'layer1_read_export',
      status: 'allowed',
      resourceFamily: 'workspace_snapshot',
      label: 'Structured workspace export',
    },
    {
      id: 'global-layer2-workspace',
      layer: 'layer2_ai_read_analysis',
      status: 'confirm_required',
      resourceFamily: 'workspace_snapshot',
      label: 'Structured workspace AI analysis',
    },
    {
      id: 'canvas-layer1-workspace',
      layer: 'layer1_read_export',
      status: 'allowed',
      site: 'canvas',
      resourceFamily: 'workspace_snapshot',
      label: 'Canvas structured workspace export',
    },
    {
      id: 'canvas-layer2-workspace',
      layer: 'layer2_ai_read_analysis',
      status: 'confirm_required',
      site: 'canvas',
      resourceFamily: 'workspace_snapshot',
      label: 'Canvas AI analysis stays separately gated',
    },
    {
      id: 'gradescope-layer1-workspace',
      layer: 'layer1_read_export',
      status: 'allowed',
      site: 'gradescope',
      resourceFamily: 'workspace_snapshot',
      label: 'Gradescope structured workspace export',
    },
    {
      id: 'gradescope-layer2-workspace',
      layer: 'layer2_ai_read_analysis',
      status: 'confirm_required',
      site: 'gradescope',
      resourceFamily: 'workspace_snapshot',
      label: 'Gradescope AI analysis stays separately gated',
    },
    {
      id: 'edstem-layer1-workspace',
      layer: 'layer1_read_export',
      status: 'allowed',
      site: 'edstem',
      resourceFamily: 'workspace_snapshot',
      label: 'EdStem structured workspace export',
    },
    {
      id: 'edstem-layer2-workspace',
      layer: 'layer2_ai_read_analysis',
      status: 'confirm_required',
      site: 'edstem',
      resourceFamily: 'workspace_snapshot',
      label: 'EdStem AI analysis stays separately gated',
    },
    {
      id: 'myuw-layer1-workspace',
      layer: 'layer1_read_export',
      status: 'allowed',
      site: 'myuw',
      resourceFamily: 'workspace_snapshot',
      label: 'MyUW structured workspace export',
    },
    {
      id: 'myuw-layer2-workspace',
      layer: 'layer2_ai_read_analysis',
      status: 'confirm_required',
      site: 'myuw',
      resourceFamily: 'workspace_snapshot',
      label: 'MyUW AI analysis stays separately gated',
    },
    {
      id: 'myplan-layer1-workspace',
      layer: 'layer1_read_export',
      status: 'allowed',
      site: 'myplan',
      resourceFamily: 'workspace_snapshot',
      label: 'MyPlan structured planning export',
    },
    {
      id: 'myplan-layer2-workspace',
      layer: 'layer2_ai_read_analysis',
      status: 'confirm_required',
      site: 'myplan',
      resourceFamily: 'workspace_snapshot',
      label: 'MyPlan AI analysis stays separately gated',
    },
    {
      id: 'time-schedule-layer1-workspace',
      layer: 'layer1_read_export',
      status: 'allowed',
      site: 'time-schedule',
      resourceFamily: 'workspace_snapshot',
      label: 'Time Schedule structured workspace export',
    },
    {
      id: 'time-schedule-layer2-workspace',
      layer: 'layer2_ai_read_analysis',
      status: 'confirm_required',
      site: 'time-schedule',
      resourceFamily: 'workspace_snapshot',
      label: 'Time Schedule AI analysis stays separately gated',
    },
    {
      id: 'course-sites-layer1-workspace',
      layer: 'layer1_read_export',
      status: 'allowed',
      site: 'course-sites',
      resourceFamily: 'workspace_snapshot',
      label: 'Course websites structured workspace export',
    },
    {
      id: 'course-sites-layer2-workspace',
      layer: 'layer2_ai_read_analysis',
      status: 'confirm_required',
      site: 'course-sites',
      resourceFamily: 'workspace_snapshot',
      label: 'Course websites AI analysis stays separately gated',
    },
    {
      id: 'course-material-ai',
      layer: 'layer2_ai_read_analysis',
      status: 'confirm_required',
      resourceFamily: 'course_material_excerpt',
      label: 'Course-material excerpts require explicit course-level confirmation',
    },
    {
      id: 'degree-audit-layer1-summary',
      layer: 'layer1_read_export',
      status: 'confirm_required',
      resourceFamily: 'degree_audit_summary',
      label: 'Degree-audit summaries require explicit export confirmation',
      reason:
        'The current DARS posture is a review-first summary on the shared planning/admin substrate. It is a real review/export lane, but not yet a detail/runtime lane.',
    },
    {
      id: 'degree-audit-layer2-summary',
      layer: 'layer2_ai_read_analysis',
      status: 'blocked',
      resourceFamily: 'degree_audit_summary',
      label: 'Degree-audit AI analysis stays blocked until a stronger DARS lane is promoted',
      reason: 'The current DARS posture is a review-first summary and export-first, not an AI-readable detail/runtime lane.',
    },
    {
      id: 'transcript-layer1-summary',
      layer: 'layer1_read_export',
      status: 'confirm_required',
      resourceFamily: 'transcript_summary',
      label: 'Transcript summaries require explicit export confirmation',
      reason:
        'Transcript already has a review-first summary and stays export-first. Historical-record detail still remains outside a detail/runtime lane.',
    },
    {
      id: 'transcript-layer2-summary',
      layer: 'layer2_ai_read_analysis',
      status: 'blocked',
      resourceFamily: 'transcript_summary',
      label: 'Transcript AI analysis stays blocked until a stronger transcript lane is promoted',
      reason: 'Historical-record detail is still outside the current AI-readable runtime path.',
    },
    {
      id: 'financial-aid-layer1-summary',
      layer: 'layer1_read_export',
      status: 'confirm_required',
      resourceFamily: 'financial_aid_summary',
      label: 'Financial-aid summaries require explicit export confirmation',
      reason:
        'Financial aid already has a review-first summary and stays export-first. High-sensitivity detail still remains outside a detail/runtime lane.',
    },
    {
      id: 'financial-aid-layer2-summary',
      layer: 'layer2_ai_read_analysis',
      status: 'blocked',
      resourceFamily: 'financial_aid_summary',
      label: 'Financial-aid AI analysis stays blocked until a stronger aid lane is promoted',
      reason: 'High-sensitivity aid detail is still outside the current AI-readable runtime path.',
    },
    {
      id: 'profile-layer1-summary',
      layer: 'layer1_read_export',
      status: 'confirm_required',
      resourceFamily: 'profile_summary',
      label: 'Profile summaries require explicit export confirmation',
      reason:
        'Profile already has a review-first summary and stays export-first. Personal-profile detail still stays outside the default AI-readable runtime path.',
    },
    {
      id: 'profile-layer2-summary',
      layer: 'layer2_ai_read_analysis',
      status: 'blocked',
      resourceFamily: 'profile_summary',
      label: 'Profile AI analysis stays blocked until a stronger profile lane is promoted',
      reason: 'Personal-profile detail and emergency contact detail remain outside the current AI-readable runtime path.',
    },
    {
      id: 'tuition-account-layer1-summary',
      layer: 'layer1_read_export',
      status: 'confirm_required',
      resourceFamily: 'tuition_account_summary',
      label: 'Tuition and account summaries require explicit export confirmation',
      reason:
        'Tuition/account now stays at the review-first summary level. Billing detail is still not a standalone runtime lane.',
    },
    {
      id: 'tuition-account-layer2-summary',
      layer: 'layer2_ai_read_analysis',
      status: 'blocked',
      resourceFamily: 'tuition_account_summary',
      label: 'Tuition/account AI analysis stays blocked until a stronger billing lane is promoted',
      reason: 'Billing detail is still outside the current AI-readable runtime path.',
    },
  ];
}

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
  authorization: {
    policyVersion: 'wave2-deepwater-productization',
    rules: buildDefaultAuthorizationRules(),
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
    authorization: AuthorizationStateSchema.partial().optional(),
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
    authorization: AuthorizationStateSchema.default(() =>
      AuthorizationStateSchema.parse(DEFAULT_EXTENSION_CONFIG.authorization),
    ),
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
    authorization: {
      ...DEFAULT_EXTENSION_CONFIG.authorization,
      ...parsed.authorization,
      rules: parsed.authorization?.rules ?? DEFAULT_EXTENSION_CONFIG.authorization.rules,
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
  authorization?: Partial<ExtensionConfig['authorization']>;
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
    ...(input.authorization
      ? {
          authorization: {
            ...input.current.authorization,
            ...input.authorization,
            rules: input.authorization.rules ?? input.current.authorization.rules,
          },
        }
      : {}),
  });
}

export function upsertAuthorizationRule(
  config: ExtensionConfig,
  rule: ExtensionConfig['authorization']['rules'][number],
) {
  const nextRules = config.authorization.rules.filter((entry) => entry.id !== rule.id);
  nextRules.push({
    ...rule,
    updatedAt: rule.updatedAt ?? new Date().toISOString(),
  });

  return buildNextConfig({
    current: config,
    authorization: {
      updatedAt: new Date().toISOString(),
      rules: nextRules,
    },
  });
}
