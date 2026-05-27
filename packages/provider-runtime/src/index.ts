import { z } from 'zod';

export const ChatMessageRoleSchema = z.enum(['system', 'user', 'assistant', 'tool']);
export type ChatMessageRole = z.infer<typeof ChatMessageRoleSchema>;

export const ChatMessageSchema = z
  .object({
    role: ChatMessageRoleSchema,
    content: z.string().min(1),
  })
  .strict();
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const AiCitationSchema = z
  .object({
    entityId: z.string().trim().min(1),
    kind: z.string().trim().min(1),
    site: z.string().trim().min(1),
    title: z.string().trim().min(1),
    url: z.string().trim().min(1).optional(),
  })
  .strict();
export type AiCitation = z.infer<typeof AiCitationSchema>;

export const AiStructuredAnswerSchema = z
  .object({
    summary: z.string().trim().min(1),
    bullets: z.array(z.string().trim().min(1)),
    nextActions: z.array(z.string().trim().min(1)).default([]),
    trustGaps: z.array(z.string().trim().min(1)).default([]),
    citations: z.array(AiCitationSchema),
  })
  .strict();
export type AiStructuredAnswer = z.infer<typeof AiStructuredAnswerSchema>;

export const CampusDirectProviderSchema = z.enum(['openai', 'gemini']);
export type CampusDirectProvider = z.infer<typeof CampusDirectProviderSchema>;

export const SwitchyardRuntimeProviderSchema = z.enum(['chatgpt', 'gemini', 'claude', 'grok', 'qwen']);
export type SwitchyardRuntimeProvider = z.infer<typeof SwitchyardRuntimeProviderSchema>;

export const SwitchyardLaneSchema = z.enum(['web', 'byok']);
export type SwitchyardLane = z.infer<typeof SwitchyardLaneSchema>;

export const ProviderReadinessSchema = z
  .object({
    ready: z.boolean(),
    reason: z.string().min(1),
  })
  .strict();
export type ProviderReadiness = z.infer<typeof ProviderReadinessSchema>;

export const ProviderStatusResponseSchema = z
  .object({
    requestId: z.string().min(1),
    ok: z.boolean(),
    providers: z
      .object({
        openai: ProviderReadinessSchema,
        gemini: ProviderReadinessSchema,
        switchyard: ProviderReadinessSchema,
      })
      .strict(),
  })
  .strict();
export type ProviderStatusResponse = z.infer<typeof ProviderStatusResponseSchema>;

export const ProviderProxyPayloadSchema = z
  .object({
    provider: CampusDirectProviderSchema,
    model: z.string().min(1),
    messages: z.array(ChatMessageSchema).min(1),
  })
  .strict();
export type ProviderProxyPayload = z.infer<typeof ProviderProxyPayloadSchema>;

export const SwitchyardProxyPayloadSchema = z
  .object({
    provider: SwitchyardRuntimeProviderSchema,
    model: z.string().min(1),
    messages: z.array(ChatMessageSchema).min(1),
    lane: SwitchyardLaneSchema.optional(),
  })
  .strict();
export type SwitchyardProxyPayload = z.infer<typeof SwitchyardProxyPayloadSchema>;

export const ProviderChatResponseSchema = z
  .object({
    requestId: z.string().min(1),
    ok: z.boolean(),
    provider: z.string().min(1),
    forwardedStatus: z.number().int(),
    answerText: z.string().optional(),
    structuredAnswer: AiStructuredAnswerSchema.optional(),
    error: z.string().optional(),
  })
  .strict();
export type ProviderChatResponse = z.infer<typeof ProviderChatResponseSchema>;

export const SwitchyardChatResponseSchema = ProviderChatResponseSchema.extend({
  provider: z.literal('switchyard'),
  runtimeProvider: SwitchyardRuntimeProviderSchema,
  lane: SwitchyardLaneSchema,
}).strict();
export type SwitchyardChatResponse = z.infer<typeof SwitchyardChatResponseSchema>;

export const HealthResponseSchema = z
  .object({
    requestId: z.string().min(1),
    ok: z.literal(true),
    service: z.literal('campus-copilot-bff'),
    mode: z.literal('thin-bff'),
  })
  .strict();
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const DEFAULT_SWITCHYARD_RUNTIME = {
  provider: 'chatgpt',
  lane: 'web',
} as const satisfies {
  provider: SwitchyardRuntimeProvider;
  lane: SwitchyardLane;
};

export function buildSwitchyardInput(messages: Array<{ role: string; content: string }>) {
  return messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n');
}
