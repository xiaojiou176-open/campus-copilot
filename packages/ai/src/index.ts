import { z } from 'zod';

export const ProviderIdSchema = z.enum(['openai', 'gemini', 'switchyard']);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const SwitchyardRuntimeProviderSchema = z.enum([
  'chatgpt',
  'gemini',
  'claude',
  'grok',
  'qwen',
]);
export type SwitchyardRuntimeProvider = z.infer<typeof SwitchyardRuntimeProviderSchema>;

export const SwitchyardLaneSchema = z.enum(['web', 'byok']);
export type SwitchyardLane = z.infer<typeof SwitchyardLaneSchema>;

export const AiRuntimeModeSchema = z.enum(['auto', 'switchyard_first', 'direct']);
export type AiRuntimeMode = z.infer<typeof AiRuntimeModeSchema>;

export const AiRuntimePathSchema = z.enum(['direct', 'switchyard']);
export type AiRuntimePath = z.infer<typeof AiRuntimePathSchema>;

export const ToolNameSchema = z.enum([
  'get_today_snapshot',
  'get_recent_updates',
  'get_priority_alerts',
  'export_current_view',
]);
export type ToolName = z.infer<typeof ToolNameSchema>;

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string().min(1),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ToolResultSchema = z.object({
  name: ToolNameSchema,
  payload: z.unknown(),
});
export type ToolResult = z.infer<typeof ToolResultSchema>;

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
export const AiCitationCoverageSchema = z.enum(['structured_citations', 'uncited_fallback', 'no_answer']);
export type AiCitationCoverage = z.infer<typeof AiCitationCoverageSchema>;

export const HealthPayloadSchema = z
  .object({
    ok: z.literal(true),
    service: z.literal('campus-copilot-bff'),
    mode: z.literal('thin-bff'),
    requestId: z.string().optional(),
  })
  .strict();
export type HealthPayload = z.infer<typeof HealthPayloadSchema>;

export const ProviderReadinessSchema = z
  .object({
    ready: z.boolean(),
    reason: z.string().min(1),
  })
  .strict();
export type ProviderReadiness = z.infer<typeof ProviderReadinessSchema>;

export const ProviderStatusPayloadSchema = z
  .object({
    ok: z.literal(true),
    providers: z.object({
      openai: ProviderReadinessSchema,
      gemini: ProviderReadinessSchema,
      switchyard: ProviderReadinessSchema,
    }),
    requestId: z.string().optional(),
  })
  .strict();
export type ProviderStatusPayload = z.infer<typeof ProviderStatusPayloadSchema>;

export const AiRuntimeRequestSchema = z.object({
  provider: ProviderIdSchema,
  model: z.string().min(1),
  question: z.string().min(1),
  switchyardProvider: SwitchyardRuntimeProviderSchema.optional(),
  switchyardLane: SwitchyardLaneSchema.optional(),
  toolResults: z.array(ToolResultSchema).default([]),
});
export type AiRuntimeRequest = z.infer<typeof AiRuntimeRequestSchema>;

export const CampusAiAskRequestSchema = z
  .object({
    provider: z.enum(['openai', 'gemini']).default('gemini'),
    model: z.string().min(1),
    messages: z.array(ChatMessageSchema).min(1),
    runtimeMode: AiRuntimeModeSchema.default('switchyard_first'),
    switchyardProvider: SwitchyardRuntimeProviderSchema.optional(),
    lane: SwitchyardLaneSchema.optional(),
  })
  .strict();
export type CampusAiAskRequest = z.infer<typeof CampusAiAskRequestSchema>;

export const CampusAiAskResponseSchema = z
  .object({
    ok: z.boolean(),
    provider: ProviderIdSchema,
    runtimePath: AiRuntimePathSchema,
    runtimeProvider: SwitchyardRuntimeProviderSchema.optional(),
    lane: SwitchyardLaneSchema.optional(),
    forwardedStatus: z.number().int().optional(),
    answerText: z.string().optional(),
    structuredAnswer: AiStructuredAnswerSchema.optional(),
    citationCoverage: AiCitationCoverageSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    requestId: z.string().optional(),
  })
  .strict();
export type CampusAiAskResponse = z.infer<typeof CampusAiAskResponseSchema>;

export interface ToolDefinition {
  name: ToolName;
  description: string;
}

export interface AiRuntimeMessages {
  systemPrompt: string;
  userPrompt: string;
}

export interface ProviderProxyRequest {
  route: '/api/providers/openai/chat' | '/api/providers/gemini/chat' | '/api/providers/switchyard/chat';
  body:
    | {
        provider: 'openai' | 'gemini';
        model: string;
        messages: ChatMessage[];
      }
    | {
        provider: SwitchyardRuntimeProvider;
        model: string;
        messages: ChatMessage[];
        lane?: SwitchyardLane;
      };
}

export interface ResolvedAiAnswer {
  answerText?: string;
  structuredAnswer?: AiStructuredAnswer;
  citationCoverage: AiCitationCoverage;
}

function extractCodeFenceBody(raw: string) {
  const openingFenceIndex = raw.indexOf('```');
  if (openingFenceIndex < 0) {
    return undefined;
  }

  const afterOpeningFence = raw.slice(openingFenceIndex + 3);
  const closingFenceIndex = afterOpeningFence.indexOf('```');
  if (closingFenceIndex < 0) {
    return undefined;
  }

  let body = afterOpeningFence.slice(0, closingFenceIndex);
  const trimmedLeading = body.trimStart();
  if (trimmedLeading.toLowerCase().startsWith('json')) {
    body = trimmedLeading.slice(4);
  }

  return body.trim();
}

function extractFirstJsonObject(raw: string) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (start === -1) {
      if (char === '{') {
        start = index;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, index + 1);
      }
    }
  }

  return undefined;
}

function parseStructuredAnswerCandidate(candidate: string | undefined) {
  if (!candidate) {
    return undefined;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

export function parseAiStructuredAnswer(raw: string): AiStructuredAnswer | undefined {
  const directValue = parseStructuredAnswerCandidate(raw);
  const fencedBody = extractCodeFenceBody(raw);
  const fencedValue = parseStructuredAnswerCandidate(fencedBody);
  const extractedValue =
    parseStructuredAnswerCandidate(extractFirstJsonObject(raw)) ??
    parseStructuredAnswerCandidate(extractFirstJsonObject(fencedBody ?? ''));

  for (const value of [directValue, fencedValue, extractedValue]) {
    const result = AiStructuredAnswerSchema.safeParse(value);
    if (result.success) {
      return result.data;
    }
  }

  return undefined;
}

export function resolveAiAnswer(input: {
  answerText?: string;
  structuredAnswer?: unknown;
  citationCoverage?: unknown;
}): ResolvedAiAnswer {
  const answerText = typeof input.answerText === 'string' && input.answerText.trim() ? input.answerText : undefined;
  const explicitStructured = AiStructuredAnswerSchema.safeParse(input.structuredAnswer);
  const structuredAnswer = explicitStructured.success
    ? explicitStructured.data
    : answerText
      ? parseAiStructuredAnswer(answerText)
      : undefined;
  const explicitCoverage = AiCitationCoverageSchema.safeParse(input.citationCoverage);

  return {
    answerText,
    structuredAnswer,
    citationCoverage: explicitCoverage.success
      ? explicitCoverage.data
      : structuredAnswer
        ? 'structured_citations'
        : answerText
          ? 'uncited_fallback'
          : 'no_answer',
  };
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_today_snapshot',
    description: 'Return the latest structured today snapshot from the local-first workbench.',
  },
  {
    name: 'get_recent_updates',
    description: 'Return recent timeline-like updates from structured storage, not raw web pages.',
  },
  {
    name: 'get_priority_alerts',
    description: 'Return the current derived alerts that explain what needs attention first.',
  },
  {
    name: 'export_current_view',
    description: 'Return an export artifact for the current structured workbench view.',
  },
];

export function getToolDefinitions() {
  return [...TOOL_DEFINITIONS];
}

export function buildAiRuntimeMessages(input: AiRuntimeRequest): AiRuntimeMessages {
  const request = AiRuntimeRequestSchema.parse(input);
  const toolSummary =
    request.toolResults.length === 0
      ? 'No tool results have been provided yet.'
      : request.toolResults.map((result) => `- ${result.name}: ${JSON.stringify(result.payload)}`).join('\n');

  return {
    systemPrompt: [
      'You are Campus Copilot AI.',
      'You operate strictly after structure: use only unified schema, read-model, and export results.',
      'Never request raw DOM, raw HTML, cookies, or site-specific payloads.',
      'Return a JSON object with keys "summary", "bullets", "nextActions", "trustGaps", and "citations".',
      'Use "nextActions" for concrete operator next steps and "trustGaps" for uncertainty, blockers, or evidence gaps. Use empty arrays when there is nothing to list.',
      'Each citation must include "entityId", "kind", "site", "title", and optional "url".',
      'Do not expose raw provider metadata or raw tool payloads in the answer.',
      'When information is missing, say so clearly instead of inventing facts.',
    ].join(' '),
    userPrompt: [`Question: ${request.question}`, 'Structured tool results:', toolSummary].join('\n'),
  };
}

export function createProviderProxyRequest(input: {
  provider: ProviderId;
  model: string;
  messages: ChatMessage[];
  switchyardProvider?: SwitchyardRuntimeProvider;
  switchyardLane?: SwitchyardLane;
}): ProviderProxyRequest {
  const messages = z.array(ChatMessageSchema).parse(input.messages);

  if (input.provider === 'switchyard') {
    return {
      route: '/api/providers/switchyard/chat',
      body: {
        provider: input.switchyardProvider ?? 'chatgpt',
        model: input.model,
        messages,
        lane: input.switchyardLane ?? 'web',
      },
    };
  }

  return {
    route: input.provider === 'openai' ? '/api/providers/openai/chat' : '/api/providers/gemini/chat',
    body: {
      provider: input.provider,
      model: input.model,
      messages,
    },
  };
}
