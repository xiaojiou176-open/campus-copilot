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
      GEMINI_ACCESS_TOKEN: '   ',
      OPENAI_BASE_URL: '',
      GEMINI_BASE_URL: '   ',
    });

    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.GEMINI_API_KEY).toBe('gemini-key');
    expect(env.GEMINI_ACCESS_TOKEN).toBeUndefined();
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
          authMode: 'api_key',
          reason: 'configured',
        },
        gemini: {
          ready: false,
          authMode: 'api_key',
          reason: 'missing_api_key',
        },
      },
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
    expect(response.body).toContain('"authMode":"api_key"');
    expect(response.body).toContain('"reason":"configured"');
    expect(response.body).toContain('"requestId"');
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
                content: 'Structured answer',
              },
            },
          ],
        }),
    }));

    const response = await handleApiRequest(
      createRequest('/api/providers/openai/chat', 'POST', {
        provider: 'openai',
        authMode: 'api_key',
        model: 'gpt-test',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      loadApiEnv({
        OPENAI_API_KEY: 'openai-key',
      }),
      fetchSpy,
    );

    expect(response.status).toBe(200);
    expect(response.body).toContain('Structured answer');
    expect(response.body).not.toContain('providerPayload');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toContain('/chat/completions');
  });

  it('returns provider_not_configured when gemini api key is missing', async () => {
    const response = await handleApiRequest(
      createRequest('/api/providers/gemini/chat', 'POST', {
        provider: 'gemini',
        authMode: 'api_key',
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
        authMode: 'api_key',
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
        authMode: 'api_key',
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
        authMode: 'api_key',
        model: 'gemini-test',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      loadApiEnv({
        GEMINI_API_KEY: 'gemini-key',
      }),
      fetchSpy,
    );

    expect(response.status).toBe(200);
    expect(response.body).not.toContain('providerPayload');
    expect(response.body).toContain('READY');
  });
});
