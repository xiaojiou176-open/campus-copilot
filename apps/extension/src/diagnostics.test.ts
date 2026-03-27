import { describe, expect, it } from 'vitest';
import { buildDiagnosticsReport, buildDiagnosticsSummary, formatProviderReason, formatProviderStatusError } from './diagnostics';

const providerOptions = [
  { value: 'openai' as const, label: 'OpenAI' },
  { value: 'gemini' as const, label: 'Gemini' },
];

const siteLabels = {
  canvas: 'Canvas',
  gradescope: 'Gradescope',
  edstem: 'EdStem',
  myuw: 'MyUW',
} as const;

describe('diagnostics helpers', () => {
  it('formats provider-specific reasons and UI errors', () => {
    expect(formatProviderReason('configured')).toBe('configured');
    expect(formatProviderReason('missing_api_key')).toBe('missing_api_key');
    expect(formatProviderStatusError('missing_bff_base_url')).toBe('还没有配置 BFF 地址');
    expect(formatProviderStatusError('provider_status_fetch_failed')).toBe('provider 状态拉取失败');
  });

  it('builds blockers and next actions from runtime state', () => {
    const summary = buildDiagnosticsSummary({
      bffBaseUrl: undefined,
      providerStatus: {
        providers: {
          openai: { ready: false, authMode: 'api_key', reason: 'missing_api_key' },
          gemini: { ready: false, authMode: 'api_key', reason: 'missing_api_key' },
        },
        error: 'provider_status_fetch_failed',
      },
      orderedSiteStatus: [
        { site: 'canvas', sync: { lastOutcome: 'unsupported_context' } },
        { site: 'myuw', hint: '需要在 MyUW 页面标签页里触发' },
      ],
      providerOptions,
      defaultProvider: 'gemini',
      siteLabels,
    });

    expect(summary.healthy).toBe(false);
    expect(summary.blockers).toContain('BFF 地址尚未配置');
    expect(summary.blockers).toContain('Provider 未 ready：OpenAI, Gemini');
    expect(summary.blockers).toContain('站点仍缺 live 条件：Canvas, MyUW');
    expect(summary.blockers).toContain('BFF provider 状态拉取失败');
    expect(summary.nextActions.some((item) => item.includes('API key'))).toBe(true);
  });

  it('builds an exportable diagnostics report with raw runtime inputs', () => {
    const report = buildDiagnosticsReport({
      generatedAt: '2026-03-25T12:45:00Z',
      bffBaseUrl: 'http://127.0.0.1:8787',
      providerStatus: {
        providers: {
          openai: { ready: true, authMode: 'api_key', reason: 'configured' },
          gemini: { ready: false, authMode: 'api_key', reason: 'missing_api_key' },
        },
      },
      orderedSiteStatus: [{ site: 'canvas', sync: { lastOutcome: 'success' } }],
      providerOptions,
      defaultProvider: 'openai',
      siteLabels,
    });

    expect(report.generatedAt).toBe('2026-03-25T12:45:00Z');
    expect(report.bffConfigured).toBe(true);
    expect(report.providerStatus.providers.gemini.reason).toBe('missing_api_key');
    expect(report.orderedSiteStatus).toHaveLength(1);
  });

  it('does not block diagnostics when the selected provider is ready', () => {
    const summary = buildDiagnosticsSummary({
      bffBaseUrl: 'http://127.0.0.1:8787',
      providerStatus: {
        providers: {
          openai: { ready: false, authMode: 'api_key', reason: 'missing_api_key' },
          gemini: { ready: true, authMode: 'api_key', reason: 'configured' },
        },
      },
      orderedSiteStatus: [],
      providerOptions,
      defaultProvider: 'gemini',
      siteLabels,
    });

    expect(summary.blockers).not.toContain('Provider 未 ready：OpenAI, Gemini');
    expect(summary.blockers).not.toContain('默认 Provider 未 ready：Gemini');
  });
});
