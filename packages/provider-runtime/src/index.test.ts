import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SWITCHYARD_RUNTIME,
  ProviderProxyPayloadSchema,
  ProviderStatusResponseSchema,
  SwitchyardChatResponseSchema,
  SwitchyardProxyPayloadSchema,
  buildSwitchyardInput,
} from './index';

describe('provider runtime seam', () => {
  it('keeps direct provider payloads narrow and validated', () => {
    const payload = ProviderProxyPayloadSchema.parse({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'What changed today?' }],
    });

    expect(payload.provider).toBe('gemini');
    expect(payload.messages).toHaveLength(1);
  });

  it('builds switchyard input from campus message arrays', () => {
    expect(
      buildSwitchyardInput([
        { role: 'system', content: 'Focus on cited evidence.' },
        { role: 'user', content: 'What should I do first?' },
      ]),
    ).toBe('SYSTEM: Focus on cited evidence.\n\nUSER: What should I do first?');
  });

  it('validates switchyard runtime envelopes without dropping campus semantics', () => {
    const payload = SwitchyardProxyPayloadSchema.parse({
      provider: 'chatgpt',
      model: 'gpt-5',
      lane: 'web',
      messages: [{ role: 'user', content: 'Summarize the current trust gaps.' }],
    });
    const response = SwitchyardChatResponseSchema.parse({
      requestId: 'req-switchyard',
      ok: true,
      provider: 'switchyard',
      runtimeProvider: 'chatgpt',
      lane: 'web',
      forwardedStatus: 200,
      answerText: 'Start with the earliest Canvas deadline.',
      structuredAnswer: {
        summary: 'Start with the earliest Canvas deadline.',
        bullets: ['Homework 5 is due tomorrow'],
        nextActions: ['Open Homework 5 and confirm the rubric'],
        trustGaps: ['Gradescope detail has not been refreshed yet'],
        citations: [],
      },
    });

    expect(payload.lane).toBe('web');
    expect(response.structuredAnswer?.nextActions[0]).toContain('Homework 5');
  });

  it('keeps provider status envelopes stable for direct and switchyard lanes', () => {
    const status = ProviderStatusResponseSchema.parse({
      requestId: 'req-status',
      ok: true,
      providers: {
        openai: { ready: false, reason: 'missing_api_key' },
        gemini: { ready: true, reason: 'configured' },
        switchyard: { ready: true, reason: 'configured_local_runtime' },
      },
    });

    expect(DEFAULT_SWITCHYARD_RUNTIME).toEqual({
      provider: 'chatgpt',
      lane: 'web',
    });
    expect(status.providers.switchyard.reason).toBe('configured_local_runtime');
  });
});
