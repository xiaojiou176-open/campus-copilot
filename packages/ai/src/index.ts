import { z } from 'zod';

export const ProviderIdSchema = z.enum(['openai', 'gemini']);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const AuthModeSchema = z.enum(['api_key', 'oauth', 'web_session']);
export type AuthMode = z.infer<typeof AuthModeSchema>;

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
    citations: z.array(AiCitationSchema),
  })
  .strict();
export type AiStructuredAnswer = z.infer<typeof AiStructuredAnswerSchema>;

export const AiRuntimeRequestSchema = z.object({
  provider: ProviderIdSchema,
  authMode: AuthModeSchema,
  model: z.string().min(1),
  question: z.string().min(1),
  toolResults: z.array(ToolResultSchema).default([]),
});
export type AiRuntimeRequest = z.infer<typeof AiRuntimeRequestSchema>;

export interface ToolDefinition {
  name: ToolName;
  description: string;
}

export interface AiRuntimeMessages {
  systemPrompt: string;
  userPrompt: string;
}

export interface ProviderProxyRequest {
  route: '/api/providers/openai/chat' | '/api/providers/gemini/chat';
  body: {
    provider: ProviderId;
    authMode: AuthMode;
    model: string;
    messages: ChatMessage[];
  };
}

function extractCodeFenceBody(raw: string) {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match?.[1];
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

export function getOfficialAuthModes(provider: ProviderId): AuthMode[] {
  return provider === 'openai' ? ['api_key'] : ['api_key'];
}

export function getDefaultAuthMode(provider: ProviderId): AuthMode {
  return provider === 'openai' ? 'api_key' : 'api_key';
}

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
      'Return a JSON object with keys "summary", "bullets", and "citations".',
      'Each citation must include "entityId", "kind", "site", "title", and optional "url".',
      'Do not expose raw provider metadata or raw tool payloads in the answer.',
      'When information is missing, say so clearly instead of inventing facts.',
    ].join(' '),
    userPrompt: [`Question: ${request.question}`, 'Structured tool results:', toolSummary].join('\n'),
  };
}

export function createProviderProxyRequest(input: {
  provider: ProviderId;
  authMode?: AuthMode;
  model: string;
  messages: ChatMessage[];
}): ProviderProxyRequest {
  const authMode = input.authMode ?? getDefaultAuthMode(input.provider);
  const messages = z.array(ChatMessageSchema).parse(input.messages);

  return {
    route: input.provider === 'openai' ? '/api/providers/openai/chat' : '/api/providers/gemini/chat',
    body: {
      provider: input.provider,
      authMode,
      model: input.model,
      messages,
    },
  };
}
