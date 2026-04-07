import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { createHealthPayload, createProviderStatusPayload, handleApiRequest, loadApiEnv } from './index';

function createRequest(path: string, method: string, body?: unknown) {
  const stream = Readable.from(body ? [JSON.stringify(body)] : []);
  return Object.assign(stream, {
    url: path,
    method,
  });
}

describe('api thin bff', () => {
  it('loads provider secrets only from env input', () => {
    const env = loadApiEnv({
      OPENAI_API_KEY: 'openai-key',
      GEMINI_API_KEY: 'gemini-key',
    });

    expect(env.OPENAI_API_KEY).toBe('openai-key');
    expect(env.GEMINI_API_KEY).toBe('gemini-key');
  });

  it('treats blank optional provider env values as unset', () => {
    const env = loadApiEnv({
      OPENAI_API_KEY: '',
      GEMINI_API_KEY: 'gemini-key',
      OPENAI_BASE_URL: '',
      GEMINI_BASE_URL: '   ',
    });

    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.GEMINI_API_KEY).toBe('gemini-key');
    expect(env.OPENAI_BASE_URL).toBeUndefined();
    expect(env.GEMINI_BASE_URL).toBeUndefined();
  });

  it('returns a health payload without touching providers', () => {
    expect(createHealthPayload()).toEqual({
      ok: true,
      service: 'campus-copilot-bff',
      mode: 'thin-bff',
    });
  });

  it('returns provider readiness without exposing secret values', () => {
    const payload = createProviderStatusPayload(
      loadApiEnv({
        OPENAI_API_KEY: 'openai-key',
      }),
    );

    expect(payload).toEqual({
      ok: true,
      providers: {
        openai: {
          ready: true,
          reason: 'configured',
        },
        gemini: {
          ready: false,
          reason: 'missing_api_key',
        },
        switchyard: {
          ready: false,
          reason: 'missing_runtime_url',
        },
      },
    });
  });

  it('marks switchyard local runtime as ready when the base url exists', () => {
    const payload = createProviderStatusPayload(
      loadApiEnv({
        SWITCHYARD_BASE_URL: 'http://127.0.0.1:4010',
      }),
    );

    expect(payload.providers.switchyard).toEqual({
      ready: true,
      reason: 'configured_local_runtime',
    });
  });

  it('responds to OPTIONS with CORS-friendly headers', async () => {
    const response = await handleApiRequest(createRequest('/api/providers/openai/chat', 'OPTIONS'));

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-methods']).toContain('OPTIONS');
    expect(response.headers['x-campus-copilot-request-id']).toBeTruthy();
  });

  it('serves provider readiness over HTTP', async () => {
    const response = await handleApiRequest(
      createRequest('/api/providers/status', 'GET'),
      loadApiEnv({
        GEMINI_API_KEY: 'gemini-key',
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toContain('"ready":true');
    expect(response.body).toContain('"reason":"configured"');
    expect(response.body).toContain('"requestId"');
  });

  it('keeps the repo-tracked OpenAPI contract aligned with the current local HTTP edge', () => {
    const openApi = readFileSync(new URL('../../../docs/api/openapi.yaml', import.meta.url), 'utf8');

    expect(openApi).toContain('/health:');
    expect(openApi).toContain('/api/providers/status:');
    expect(openApi).toContain('/api/ai/ask:');
    expect(openApi).toContain('/api/providers/openai/chat:');
    expect(openApi).toContain('/api/providers/gemini/chat:');
    expect(openApi).toContain('/api/providers/switchyard/chat:');
    expect(openApi).toContain('http://127.0.0.1:8787');
    expect(openApi).toContain('It does not imply a hosted public API');
    expect(openApi).toContain('public MCP surface');
    expect(openApi).toContain('public SDK product');
  });

  it('proxies openai requests through the thin bff', async () => {
    const fetchSpy = vi.fn(async (_input: string) => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: '先完成 Homework 5。',
                  bullets: ['明晚截止', 'Canvas 显示仍未提交'],
                  nextActions: ['先打开当前视图确认要求', '如果还没提交，今天先完成并上传'],
                  trustGaps: ['Canvas 还没有提供最新提交状态'],
                  citations: [
                    {
                      entityId: 'assignment:hw5',
                      kind: 'assignment',
                      site: 'canvas',
                      title: 'Homework 5',
                      url: 'https://canvas.example.com/courses/1/assignments/5',
                    },
                  ],
                }),
              },
            },
          ],
        }),
    }));

    const response = await handleApiRequest(
      createRequest('/api/providers/openai/chat', 'POST', {
        provider: 'openai',
        model: 'gpt-test',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      loadApiEnv({
        OPENAI_API_KEY: 'openai-key',
      }),
      fetchSpy,
    );

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.answerText).toContain('"summary":"先完成 Homework 5。"');
    expect(body.runtimePath).toBe('direct');
    expect(body.structuredAnswer).toEqual({
      summary: '先完成 Homework 5。',
      bullets: ['明晚截止', 'Canvas 显示仍未提交'],
      nextActions: ['先打开当前视图确认要求', '如果还没提交，今天先完成并上传'],
      trustGaps: ['Canvas 还没有提供最新提交状态'],
      citations: [
        {
          entityId: 'assignment:hw5',
          kind: 'assignment',
          site: 'canvas',
          title: 'Homework 5',
          url: 'https://canvas.example.com/courses/1/assignments/5',
        },
      ],
    });
    expect(body.citationCoverage).toBe('structured_citations');
    expect(response.body).not.toContain('providerPayload');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toContain('/chat/completions');
  });

  it('returns provider_not_configured when gemini api key is missing', async () => {
    const response = await handleApiRequest(
      createRequest('/api/providers/gemini/chat', 'POST', {
        provider: 'gemini',
        model: 'gemini-test',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      loadApiEnv({}),
    );

    expect(response.status).toBe(400);
    expect(response.body).toContain('provider_not_configured');
  });

  it('maps upstream non-json provider responses to provider_response_invalid', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: false,
      status: 502,
      text: async () => '<html>bad gateway</html>',
    }));

    const response = await handleApiRequest(
      createRequest('/api/providers/openai/chat', 'POST', {
        provider: 'openai',
        model: 'gpt-test',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      loadApiEnv({
        OPENAI_API_KEY: 'openai-key',
      }),
      fetchSpy,
    );

    expect(response.status).toBe(502);
    expect(response.body).toContain('provider_response_invalid');
  });

  it('maps provider transport failures to provider_request_failed', async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error('network down');
    });

    const response = await handleApiRequest(
      createRequest('/api/providers/gemini/chat', 'POST', {
        provider: 'gemini',
        model: 'gemini-test',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      loadApiEnv({
        GEMINI_API_KEY: 'gemini-key',
      }),
      fetchSpy,
    );

    expect(response.status).toBe(502);
    expect(response.body).toContain('provider_request_failed');
    expect(response.body).toContain('network down');
  });

  it('does not echo upstream provider payloads back to the client body', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: 'READY' }],
              },
            },
          ],
        }),
    }));

    const response = await handleApiRequest(
      createRequest('/api/providers/gemini/chat', 'POST', {
        provider: 'gemini',
        model: 'gemini-test',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      loadApiEnv({
        GEMINI_API_KEY: 'gemini-key',
      }),
      fetchSpy,
    );

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body).runtimePath).toBe('direct');
    expect(response.body).not.toContain('providerPayload');
    expect(response.body).toContain('READY');
  });

  it('keeps plain text answers compatible when no structured answer can be parsed', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '先看 Homework 5，它明晚截止。' }],
              },
            },
          ],
        }),
    }));

    const response = await handleApiRequest(
      createRequest('/api/providers/gemini/chat', 'POST', {
        provider: 'gemini',
        model: 'gemini-test',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      loadApiEnv({
        GEMINI_API_KEY: 'gemini-key',
      }),
      fetchSpy,
    );

    const body = JSON.parse(response.body);

    expect(response.status).toBe(200);
    expect(body.answerText).toBe('先看 Homework 5，它明晚截止。');
    expect(body.structuredAnswer).toBeUndefined();
    expect(body.citationCoverage).toBe('uncited_fallback');
    expect(response.body).not.toContain('candidates');
  });

  it('proxies switchyard runtime requests through the thin bff', async () => {
    const fetchSpy = vi.fn(async (_input: string, init?: RequestInit) => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          outputText: JSON.stringify({
            summary: '先看这周 Canvas 的截止项。',
            bullets: ['ChatGPT Web 路径已由 Switchyard 提供', 'Campus Copilot 只消费结构化答案'],
            nextActions: ['先按 Focus Queue 处理最早到期项'],
            trustGaps: ['如果还没 live sync，需要先确认最新 Canvas 标签页状态'],
            citations: [
              {
                entityId: 'assignment:lab-2',
                kind: 'assignment',
                site: 'canvas',
                title: 'Lab 2',
                url: 'https://canvas.example.com/courses/1/assignments/2',
              },
            ],
          }),
        }),
    }));

    const response = await handleApiRequest(
      createRequest('/api/providers/switchyard/chat', 'POST', {
        provider: 'chatgpt',
        model: 'gpt-4o',
        lane: 'web',
        messages: [{ role: 'user', content: 'summarize my current priorities' }],
      }),
      loadApiEnv({
        SWITCHYARD_BASE_URL: 'http://127.0.0.1:4010',
      }),
      fetchSpy,
    );

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.provider).toBe('switchyard');
    expect(body.runtimePath).toBe('switchyard');
    expect(body.runtimeProvider).toBe('chatgpt');
    expect(body.lane).toBe('web');
    expect(body.structuredAnswer.summary).toBe('先看这周 Canvas 的截止项。');
    expect(body.structuredAnswer.nextActions).toEqual(['先按 Focus Queue 处理最早到期项']);
    expect(body.structuredAnswer.trustGaps).toEqual([
      '如果还没 live sync，需要先确认最新 Canvas 标签页状态',
    ]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toContain('/v1/runtime/invoke');
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toContain('"provider":"chatgpt"');
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toContain('"lane":"web"');
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toContain('USER: summarize my current priorities');
  });

  it('accepts long-tail switchyard runtime providers without changing the local bff contract', async () => {
    const fetchSpy = vi.fn(async (_input: string, init?: RequestInit) => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          outputText: 'Qwen 路径已通过 Switchyard 薄桥返回。',
        }),
    }));

    const response = await handleApiRequest(
      createRequest('/api/providers/switchyard/chat', 'POST', {
        provider: 'qwen',
        model: 'qwen3.5-plus',
        messages: [{ role: 'user', content: 'what changed today?' }],
      }),
      loadApiEnv({
        SWITCHYARD_BASE_URL: 'http://127.0.0.1:4010',
        SWITCHYARD_AUTH_TOKEN: 'switchyard-token',
      }),
      fetchSpy,
    );

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.provider).toBe('switchyard');
    expect(body.runtimePath).toBe('switchyard');
    expect(body.runtimeProvider).toBe('qwen');
    expect(body.lane).toBe('web');
    expect(body.answerText).toBe('Qwen 路径已通过 Switchyard 薄桥返回。');
    expect(body.citationCoverage).toBe('uncited_fallback');
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toContain('"provider":"qwen"');
    expect(fetchSpy.mock.calls[0]?.[1]?.headers).toBeInstanceOf(Headers);
    expect((fetchSpy.mock.calls[0]?.[1]?.headers as Headers).get('authorization')).toBe(
      'Bearer switchyard-token',
    );
  });

  it('returns provider_not_configured when switchyard base url is missing', async () => {
    const response = await handleApiRequest(
      createRequest('/api/providers/switchyard/chat', 'POST', {
        provider: 'gemini',
        model: 'gemini-2.5-pro',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      loadApiEnv({}),
    );

    expect(response.status).toBe(400);
    expect(response.body).toContain('provider_not_configured');
  });

  it('uses the switchyard-first consumer seam when the local runtime exists', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          outputText: JSON.stringify({
            summary: 'Switchyard-first seam is active.',
            bullets: ['Campus keeps the student-facing structured answer contract.'],
            citations: [
              {
                entityId: 'assignment:hw5',
                kind: 'assignment',
                site: 'canvas',
                title: 'Homework 5',
              },
            ],
          }),
        }),
    }));

    const response = await handleApiRequest(
      createRequest('/api/ai/ask', 'POST', {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', content: 'What should I do first?' }],
      }),
      loadApiEnv({
        SWITCHYARD_BASE_URL: 'http://127.0.0.1:4010',
      }),
      fetchSpy,
    );

    const body = JSON.parse(response.body);
    expect(response.status).toBe(200);
    expect(body.provider).toBe('switchyard');
    expect(body.runtimePath).toBe('switchyard');
    expect(body.runtimeProvider).toBe('gemini');
    expect(body.citationCoverage).toBe('structured_citations');
    const firstSwitchyardCall = fetchSpy.mock.calls.at(0) as [string, RequestInit] | undefined;
    const firstSwitchyardUrl = firstSwitchyardCall?.[0];
    expect(firstSwitchyardUrl).toContain('/v1/runtime/invoke');
  });

  it('falls back to the direct provider seam when switchyard-first is requested without a runtime url', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: 'Direct Gemini fallback is active.' }],
              },
            },
          ],
        }),
    }));

    const response = await handleApiRequest(
      createRequest('/api/ai/ask', 'POST', {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        runtimeMode: 'switchyard_first',
        messages: [{ role: 'user', content: 'What changed?' }],
      }),
      loadApiEnv({
        GEMINI_API_KEY: 'gemini-key',
      }),
      fetchSpy,
    );

    const body = JSON.parse(response.body);
    expect(response.status).toBe(200);
    expect(body.provider).toBe('gemini');
    expect(body.runtimePath).toBe('direct');
    const firstDirectCall = fetchSpy.mock.calls.at(0) as [string, RequestInit] | undefined;
    const firstDirectUrl = firstDirectCall?.[0];
    expect(firstDirectUrl).toContain(':generateContent');
  });
});
