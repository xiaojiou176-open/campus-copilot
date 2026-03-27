import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AuthModeSchema, ChatMessageSchema } from '@campus-copilot/ai';

const ApiEnvSchema = z.object({
  PORT: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_ACCESS_TOKEN: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  GEMINI_BASE_URL: z.string().url().optional(),
});

const ProviderProxyPayloadSchema = z.object({
  provider: z.enum(['openai', 'gemini']),
  authMode: AuthModeSchema,
  model: z.string().min(1),
  messages: z.array(ChatMessageSchema).min(1),
});

type ApiEnv = z.infer<typeof ApiEnvSchema>;
type ProviderProxyPayload = z.infer<typeof ProviderProxyPayloadSchema>;
type ProviderEndpoint = {
  url: string;
  token?: string;
  headers: Record<string, string>;
  body: unknown;
};
type FetchLike = (input: string, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;
type RequestLike = AsyncIterable<Uint8Array | string> & {
  url?: string;
  method?: string;
};

function normalizeOptionalEnvValue(value: string | undefined) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function loadApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  return ApiEnvSchema.parse({
    ...source,
    OPENAI_API_KEY: normalizeOptionalEnvValue(source.OPENAI_API_KEY),
    GEMINI_API_KEY: normalizeOptionalEnvValue(source.GEMINI_API_KEY),
    GEMINI_ACCESS_TOKEN: normalizeOptionalEnvValue(source.GEMINI_ACCESS_TOKEN),
    OPENAI_BASE_URL: normalizeOptionalEnvValue(source.OPENAI_BASE_URL),
    GEMINI_BASE_URL: normalizeOptionalEnvValue(source.GEMINI_BASE_URL),
  });
}

export function createHealthPayload() {
  return {
    ok: true,
    service: 'campus-copilot-bff',
    mode: 'thin-bff',
  };
}

export function createProviderStatusPayload(env: ApiEnv) {
  return {
    ok: true,
    providers: {
      openai: {
        ready: Boolean(env.OPENAI_API_KEY),
        authMode: 'api_key',
        reason: env.OPENAI_API_KEY ? 'configured' : 'missing_api_key',
      },
      gemini: {
        ready: Boolean(env.GEMINI_API_KEY),
        authMode: 'api_key',
        reason: env.GEMINI_API_KEY ? 'configured' : 'missing_api_key',
      },
    },
  };
}

function withRequestId(body: unknown, requestId: string) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }

  return {
    requestId,
    ...body,
  };
}

function jsonResponse(status: number, body: unknown, requestId: string = randomUUID()) {
  return {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
      'x-campus-copilot-request-id': requestId,
    },
    body: JSON.stringify(withRequestId(body, requestId)),
  };
}

function extractProviderAnswer(provider: ProviderProxyPayload['provider'], payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  if (provider === 'openai') {
    const content = (payload as {
      choices?: Array<{
        message?: {
          content?: string | Array<{ text?: string }>;
        };
      }>;
    }).choices?.[0]?.message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .filter(Boolean)
        .join('\n');
    }

    return undefined;
  }

  const parts = (payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  }).candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return undefined;
  }

  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n');
}

function buildProviderEndpoint(payload: ProviderProxyPayload, env: ApiEnv): ProviderEndpoint {
  if (payload.provider === 'openai') {
    const baseUrl = env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
    return {
      url: `${baseUrl}/chat/completions`,
      token: env.OPENAI_API_KEY,
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY ?? ''}`,
      },
      body: {
        model: payload.model,
        messages: payload.messages,
      },
    };
  }

  if (payload.authMode === 'oauth') {
    return {
      url: `${env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com'}/v1beta/models/${payload.model}:generateContent`,
      token: env.GEMINI_ACCESS_TOKEN,
      headers: {
        Authorization: `Bearer ${env.GEMINI_ACCESS_TOKEN ?? ''}`,
      },
      body: {
        contents: payload.messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
      },
    };
  }

  return {
    url: `${env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com'}/v1beta/models/${payload.model}:generateContent?key=${env.GEMINI_API_KEY ?? ''}`,
    token: env.GEMINI_API_KEY,
    headers: {},
    body: {
      contents: payload.messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
    },
  };
}

async function readJsonBody(req: RequestLike) {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function parseJsonSafely(raw: string) {
  if (!raw.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function handleProviderProxy(
  payload: ProviderProxyPayload,
  env: ApiEnv,
  fetchImpl: FetchLike = fetch,
) {
  const endpoint = buildProviderEndpoint(payload, env);
  if (!endpoint.token) {
    return jsonResponse(400, {
      ok: false,
      error: 'provider_not_configured',
    });
  }

  try {
    const headers = new Headers({
      'content-type': 'application/json',
    });
    for (const [name, value] of Object.entries(endpoint.headers)) {
      headers.set(name, value);
    }

    const response = await fetchImpl(endpoint.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(endpoint.body),
    });

    const responseText = await response.text();
    const responseJson = parseJsonSafely(responseText);
    if (responseText && responseJson === undefined) {
      return jsonResponse(502, {
        ok: false,
        provider: payload.provider,
        error: 'provider_response_invalid',
        forwardedStatus: response.status,
      });
    }

    const answerText = extractProviderAnswer(payload.provider, responseJson);

    return jsonResponse(response.status, {
      ok: response.ok,
      provider: payload.provider,
      forwardedStatus: response.status,
      answerText,
      error: response.ok ? undefined : 'provider_upstream_error',
    });
  } catch (error) {
    return jsonResponse(502, {
      ok: false,
      provider: payload.provider,
      error: 'provider_request_failed',
      message: error instanceof Error ? error.message : 'provider_request_failed',
    });
  }
}

export async function handleApiRequest(
  req: RequestLike,
  env: ApiEnv = loadApiEnv(),
  fetchImpl: FetchLike = fetch,
) {
  const path = req.url ?? '/';

  if (req.method === 'GET' && path === '/health') {
    return jsonResponse(200, createHealthPayload());
  }

  if (req.method === 'GET' && path === '/api/providers/status') {
    return jsonResponse(200, createProviderStatusPayload(env));
  }

  if (req.method === 'OPTIONS') {
    return jsonResponse(204, {
      ok: true,
    });
  }

  if (
    req.method === 'POST' &&
    (path === '/api/providers/openai/chat' || path === '/api/providers/gemini/chat')
  ) {
    const payload = ProviderProxyPayloadSchema.parse(await readJsonBody(req));
    return handleProviderProxy(payload, env, fetchImpl);
  }

  return jsonResponse(404, {
    ok: false,
    error: 'not_found',
  });
}

export function createCampusCopilotApiServer(env: ApiEnv = loadApiEnv(), fetchImpl: FetchLike = fetch) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const response = await handleApiRequest(req, env, fetchImpl);
      res.writeHead(response.status, response.headers);
      res.end(response.body);
    } catch (error) {
      res.writeHead(500, {
        'content-type': 'application/json',
      });
      res.end(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : 'internal_error',
        }),
      );
    }
  });
}
