import { describe, expect, it } from 'vitest';
import {
  AiCitationSchema,
  AiStructuredAnswerSchema,
  buildAiRuntimeMessages,
  createProviderProxyRequest,
  getDefaultAuthMode,
  getOfficialAuthModes,
  getToolDefinitions,
  parseAiStructuredAnswer,
} from './index';

describe('ai runtime contracts', () => {
  it('exports strict citation-aware structured answer schemas', () => {
    expect(
      AiCitationSchema.parse({
        entityId: 'assignment:hw5',
        kind: 'assignment',
        site: 'canvas',
        title: 'Homework 5',
        url: 'https://canvas.example.com/courses/1/assignments/5',
      }),
    ).toEqual({
      entityId: 'assignment:hw5',
      kind: 'assignment',
      site: 'canvas',
      title: 'Homework 5',
      url: 'https://canvas.example.com/courses/1/assignments/5',
    });

    expect(
      AiStructuredAnswerSchema.parse({
        summary: '先完成 Homework 5。',
        bullets: ['明晚截止', '目前还没有提交记录'],
        citations: [
          {
            entityId: 'assignment:hw5',
            kind: 'assignment',
            site: 'canvas',
            title: 'Homework 5',
          },
        ],
      }),
    ).toEqual({
      summary: '先完成 Homework 5。',
      bullets: ['明晚截止', '目前还没有提交记录'],
      citations: [
        {
          entityId: 'assignment:hw5',
          kind: 'assignment',
          site: 'canvas',
          title: 'Homework 5',
        },
      ],
    });
  });

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
    expect(messages.systemPrompt).toContain('"summary"');
    expect(messages.systemPrompt).toContain('"citations"');
    expect(messages.userPrompt).toContain('Homework 5 明晚截止');
  });

  it('parses structured answers from fenced json blocks', () => {
    const parsed = parseAiStructuredAnswer(`
Here is the structured answer:

\`\`\`json
{
  "summary": "先完成 Homework 5。",
  "bullets": ["明晚截止", "目前还没有提交记录"],
  "citations": [
    {
      "entityId": "assignment:hw5",
      "kind": "assignment",
      "site": "canvas",
      "title": "Homework 5",
      "url": "https://canvas.example.com/courses/1/assignments/5"
    }
  ]
}
\`\`\`
`);

    expect(parsed).toEqual({
      summary: '先完成 Homework 5。',
      bullets: ['明晚截止', '目前还没有提交记录'],
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
  });

  it('returns undefined for plain text answers that do not match the contract', () => {
    expect(parseAiStructuredAnswer('现在最该关注 Homework 5，明晚截止。')).toBeUndefined();
    expect(
      parseAiStructuredAnswer(
        JSON.stringify({
          summary: '缺少 bullets 和 citations',
        }),
      ),
    ).toBeUndefined();
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
