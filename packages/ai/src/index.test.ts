import { describe, expect, it } from 'vitest';
import {
  AiRuntimeModeSchema,
  AiCitationSchema,
  CampusAiAskRequestSchema,
  CampusAiAskResponseSchema,
  HealthPayloadSchema,
  ProviderStatusPayloadSchema,
  AiStructuredAnswerSchema,
  buildAiRuntimeMessages,
  createProviderProxyRequest,
  getToolDefinitions,
  parseAiStructuredAnswer,
  resolveAiAnswer,
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
        nextActions: ['先打开当前视图确认 Homework 5 的要求', '如果还没提交，今天先完成并上传'],
        trustGaps: ['Canvas 还没有提供最新提交状态'],
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
      nextActions: ['先打开当前视图确认 Homework 5 的要求', '如果还没提交，今天先完成并上传'],
      trustGaps: ['Canvas 还没有提供最新提交状态'],
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

  it('exports switchyard-first consumer route schemas without widening write scope', () => {
    expect(
      CampusAiAskRequestSchema.parse({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', content: 'What changed?' }],
      }),
    ).toEqual({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'What changed?' }],
      runtimeMode: 'switchyard_first',
    });

    expect(
      CampusAiAskResponseSchema.parse({
        ok: true,
        provider: 'switchyard',
        runtimePath: 'switchyard',
        runtimeProvider: 'chatgpt',
        lane: 'web',
        answerText: 'READY',
        requestId: 'req_123',
      }),
    ).toMatchObject({
      ok: true,
      provider: 'switchyard',
      runtimePath: 'switchyard',
      runtimeProvider: 'chatgpt',
      lane: 'web',
      answerText: 'READY',
      requestId: 'req_123',
    });
  });

  it('keeps health and provider status payloads on a minimal public contract', () => {
    expect(
      HealthPayloadSchema.parse({
        ok: true,
        service: 'campus-copilot-bff',
        mode: 'thin-bff',
      }),
    ).toEqual({
      ok: true,
      service: 'campus-copilot-bff',
      mode: 'thin-bff',
    });

    expect(
      ProviderStatusPayloadSchema.parse({
        ok: true,
        providers: {
          openai: { ready: false, reason: 'missing_api_key' },
          gemini: { ready: true, reason: 'configured' },
          switchyard: { ready: true, reason: 'configured_local_runtime' },
        },
      }),
    ).toMatchObject({
      providers: {
        gemini: { ready: true, reason: 'configured' },
      },
    });
    expect(AiRuntimeModeSchema.options).toEqual(['auto', 'switchyard_first', 'direct']);
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
    expect(messages.systemPrompt).toContain('"nextActions"');
    expect(messages.systemPrompt).toContain('"trustGaps"');
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
  "nextActions": ["先确认要求", "再完成并提交"],
  "trustGaps": ["Canvas 提交状态还没刷新"],
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
      nextActions: ['先确认要求', '再完成并提交'],
      trustGaps: ['Canvas 提交状态还没刷新'],
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

  it('resolves provider payloads into either cited or uncited display answers', () => {
    expect(
      resolveAiAnswer({
        answerText: '现在最该关注 Homework 5，明晚截止。',
      }),
    ).toEqual({
      answerText: '现在最该关注 Homework 5，明晚截止。',
      structuredAnswer: undefined,
      citationCoverage: 'uncited_fallback',
    });

    expect(
      resolveAiAnswer({
        answerText: JSON.stringify({
          summary: '先完成 Homework 5。',
          bullets: ['明晚截止'],
          nextActions: ['先确认要求'],
          trustGaps: [],
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
    ).toMatchObject({
      citationCoverage: 'structured_citations',
      structuredAnswer: {
        summary: '先完成 Homework 5。',
      },
    });

    expect(resolveAiAnswer({})).toEqual({
      answerText: undefined,
      structuredAnswer: undefined,
      citationCoverage: 'no_answer',
    });
  });

  it('keeps legacy structured answers compatible by defaulting action arrays to empty', () => {
    expect(
      AiStructuredAnswerSchema.parse({
        summary: '先完成 Homework 5。',
        bullets: ['明晚截止'],
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
      bullets: ['明晚截止'],
      nextActions: [],
      trustGaps: [],
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

  it('creates provider proxy requests without mixing in site scraping logic', () => {
    const request = createProviderProxyRequest({
      provider: 'gemini',
      model: 'gemini-test',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(request.route).toBe('/api/providers/gemini/chat');
    expect(request.body.messages).toHaveLength(1);
  });

  it('creates switchyard proxy requests on the same semantic contract', () => {
    const request = createProviderProxyRequest({
      provider: 'switchyard',
      switchyardProvider: 'claude',
      switchyardLane: 'byok',
      model: 'claude-sonnet-4',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(request.route).toBe('/api/providers/switchyard/chat');
    expect(request.body).toEqual({
      provider: 'claude',
      lane: 'byok',
      model: 'claude-sonnet-4',
      messages: [{ role: 'user', content: 'hello' }],
    });
  });
});
