import { describe, expect, it } from 'vitest';
import {
  buildAiRuntimeMessages,
  createProviderProxyRequest,
  getDefaultAuthMode,
  getOfficialAuthModes,
  getToolDefinitions,
} from './index';

describe('ai runtime contracts', () => {
  it('locks official auth modes by provider', () => {
    expect(getOfficialAuthModes('openai')).toEqual(['api_key']);
    expect(getOfficialAuthModes('gemini')).toEqual(['api_key']);
    expect(getDefaultAuthMode('gemini')).toBe('api_key');
  });

  it('exposes the minimal structured tool registry', () => {
    const toolNames = getToolDefinitions().map((tool) => tool.name);
    expect(toolNames).toEqual([
      'get_today_snapshot',
      'get_recent_updates',
      'get_priority_alerts',
      'export_current_view',
    ]);
  });

  it('builds prompts that enforce AI-after-structure boundaries', () => {
    const messages = buildAiRuntimeMessages({
      provider: 'openai',
      authMode: 'api_key',
      model: 'gpt-test',
      question: '我现在最该关注什么？',
      toolResults: [
        {
          name: 'get_priority_alerts',
          payload: [{ title: 'Homework 5 明晚截止' }],
        },
      ],
    });

    expect(messages.systemPrompt).toContain('Never request raw DOM');
    expect(messages.userPrompt).toContain('Homework 5 明晚截止');
  });

  it('creates provider proxy requests without mixing in site scraping logic', () => {
    const request = createProviderProxyRequest({
      provider: 'gemini',
      model: 'gemini-test',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(request.route).toBe('/api/providers/gemini/chat');
    expect(request.body.authMode).toBe('api_key');
    expect(request.body.messages).toHaveLength(1);
  });
});
