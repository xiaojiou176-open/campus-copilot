import { describe, expect, it } from 'vitest';
import { buildDiagnosticsReport, buildDiagnosticsSummary, formatProviderReason, formatProviderStatusError } from './diagnostics';

const providerOptions = [
  { value: 'openai' as const, label: 'OpenAI' },
  { value: 'gemini' as const, label: 'Gemini' },
  { value: 'switchyard' as const, label: 'Switchyard' },
];

const siteLabels = {
  canvas: 'Canvas',
  gradescope: 'Gradescope',
  edstem: 'EdStem',
  myuw: 'MyUW',
  'time-schedule': 'Time Schedule',
  'course-sites': 'Course Websites',
} as const;

describe('diagnostics helpers', () => {
  it('formats provider-specific reasons and UI errors', () => {
    expect(formatProviderReason('configured')).toBe('configured');
    expect(formatProviderReason('configured_local_runtime')).toBe('local route ready');
    expect(formatProviderReason('missing_api_key')).toBe('missing API key');
    expect(formatProviderReason('missing_runtime_url')).toBe('missing local route URL');
    expect(formatProviderReason('configured', 'zh-CN')).toBe('已配置');
    expect(formatProviderReason('configured_local_runtime', 'zh-CN')).toBe('本地 AI 路线已就绪');
    expect(formatProviderReason('missing_api_key', 'zh-CN')).toBe('缺少 API key');
    expect(formatProviderReason('missing_runtime_url', 'zh-CN')).toBe('缺少本地路线地址');
    expect(formatProviderStatusError('missing_bff_base_url')).toBe('Local AI route is not configured yet');
    expect(formatProviderStatusError('provider_status_fetch_failed')).toBe('AI route status fetch failed');
    expect(formatProviderStatusError('missing_bff_base_url', 'zh-CN')).toBe('还没有配置本地 AI 路线');
  });

  it('builds blockers and next actions from runtime state', () => {
    const summary = buildDiagnosticsSummary({
      bffBaseUrl: undefined,
      providerStatus: {
        providers: {
          openai: { ready: false, reason: 'missing_api_key' },
          gemini: { ready: false, reason: 'missing_api_key' },
          switchyard: { ready: false, reason: 'missing_runtime_url' },
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
    expect(summary.blockers).toContain('Local AI route is not configured');
    expect(summary.blockers).toContain('Provider not ready: OpenAI, Gemini');
    expect(summary.blockers).toContain('Sites still missing live prerequisites: Canvas, MyUW');
    expect(summary.blockers).toContain('Local AI route status fetch failed');
    expect(summary.nextActions.some((item) => item.includes('API key'))).toBe(true);
  });

  it('builds an exportable diagnostics report with raw runtime inputs', () => {
    const report = buildDiagnosticsReport({
      generatedAt: '2026-03-25T12:45:00Z',
      bffBaseUrl: 'http://127.0.0.1:8787',
      providerStatus: {
        providers: {
          openai: { ready: true, reason: 'configured' },
          gemini: { ready: false, reason: 'missing_api_key' },
          switchyard: { ready: true, reason: 'configured_local_runtime' },
        },
      },
      orderedSiteStatus: [{ site: 'canvas', sync: { lastOutcome: 'success' } }],
      providerOptions,
      defaultProvider: 'gemini',
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
          openai: { ready: false, reason: 'missing_api_key' },
          gemini: { ready: true, reason: 'configured' },
          switchyard: { ready: false, reason: 'missing_runtime_url' },
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
