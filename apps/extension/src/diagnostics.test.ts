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
    expect(formatProviderStatusError('missing_bff_base_url')).toBe('BFF base URL is not configured yet');
    expect(formatProviderStatusError('provider_status_fetch_failed')).toBe('provider status fetch failed');
    expect(formatProviderStatusError('missing_bff_base_url', 'zh-CN')).toBe('还没有配置 BFF 地址');
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
        { site: 'myuw', hint: 'Trigger sync from a MyUW page tab.' },
      ],
      providerOptions,
      defaultProvider: 'gemini',
      siteLabels,
      locale: 'en',
    });

    expect(summary.healthy).toBe(false);
    expect(summary.blockers).toContain('BFF base URL is not configured');
    expect(summary.blockers).toContain('Provider not ready: OpenAI, Gemini');
    expect(summary.blockers).toContain('Sites still missing live prerequisites: Canvas, MyUW');
    expect(summary.blockers).toContain('BFF provider status fetch failed');
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
      locale: 'en',
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
      locale: 'en',
    });

    expect(summary.blockers).not.toContain('Provider not ready: OpenAI, Gemini');
    expect(summary.blockers).not.toContain('Default provider not ready: Gemini');
  });
});
