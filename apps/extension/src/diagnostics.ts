import type { ProviderId } from '@campus-copilot/ai';
import type { SiteSyncOutcome } from '@campus-copilot/core';
import type { Site } from '@campus-copilot/schema';

export interface ProviderStatusLike {
  providers: Record<
    ProviderId,
    {
      ready: boolean;
      authMode: 'api_key';
      reason: string;
    }
  >;
  checkedAt?: string;
  error?: string;
}

export interface OrderedSiteStatusLike {
  site: Site;
  hint?: string;
  sync?: {
    lastOutcome?: SiteSyncOutcome;
  };
}

export interface DiagnosticsSummary {
  blockers: string[];
  nextActions: string[];
  healthy: boolean;
}

export interface DiagnosticsReport extends DiagnosticsSummary {
  generatedAt: string;
  bffConfigured: boolean;
  providerStatus: ProviderStatusLike;
  orderedSiteStatus: OrderedSiteStatusLike[];
}

export function formatProviderStatusError(error?: string) {
  if (!error) {
    return undefined;
  }

  if (error === 'missing_bff_base_url') {
    return '还没有配置 BFF 地址';
  }

  if (error === 'provider_status_fetch_failed') {
    return 'provider 状态拉取失败';
  }

  return error;
}

export function formatProviderReason(reason?: string) {
  if (!reason) {
    return 'unknown';
  }

  if (reason === 'configured') {
    return 'configured';
  }

  if (reason === 'missing_api_key') {
    return 'missing_api_key';
  }

  return reason;
}

export function buildDiagnosticsSummary(input: {
  bffBaseUrl?: string;
  providerStatus: ProviderStatusLike;
  orderedSiteStatus: OrderedSiteStatusLike[];
  providerOptions: Array<{ value: ProviderId; label: string }>;
  defaultProvider: ProviderId;
  siteLabels: Record<Site, string>;
}): DiagnosticsSummary {
  const blockers: string[] = [];
  const nextActions: string[] = [];

  if (!input.bffBaseUrl) {
    blockers.push('BFF 地址尚未配置');
    nextActions.push('先在 Options 中填写 BFF base URL，再刷新 provider 状态。');
  }

  const readyProviders = input.providerOptions.filter(
    (option) => input.providerStatus.providers[option.value]?.ready,
  );
  if (readyProviders.length === 0) {
    blockers.push(`Provider 未 ready：${input.providerOptions.map((option) => option.label).join(', ')}`);
    nextActions.push('如果要做真实 AI round-trip，请至少补一条正式 provider API key。');
  } else if (!input.providerStatus.providers[input.defaultProvider]?.ready) {
    const defaultProviderLabel =
      input.providerOptions.find((option) => option.value === input.defaultProvider)?.label ?? input.defaultProvider;
    blockers.push(`默认 Provider 未 ready：${defaultProviderLabel}`);
    nextActions.push('切换到已 ready 的 provider，或补齐当前默认 provider 的正式 API key。');
  }

  const siteIssues = input.orderedSiteStatus.filter(
    (entry) => entry.hint || entry.sync?.lastOutcome === 'unsupported_context',
  );
  if (siteIssues.length > 0) {
    blockers.push(
      `站点仍缺 live 条件：${siteIssues.map((entry) => input.siteLabels[entry.site]).join(', ')}`,
    );
    nextActions.push('先补真实登录态或在对应站点标签页中触发同步，再重试站点 live 验收。');
  }

  if (input.providerStatus.error === 'provider_status_fetch_failed') {
    blockers.push('BFF provider 状态拉取失败');
    nextActions.push('确认 BFF 服务在运行，随后点击“刷新 provider 状态”。');
  }

  return {
    blockers,
    nextActions,
    healthy: blockers.length === 0,
  };
}

export function buildDiagnosticsReport(input: {
  generatedAt: string;
  bffBaseUrl?: string;
  providerStatus: ProviderStatusLike;
  orderedSiteStatus: OrderedSiteStatusLike[];
  providerOptions: Array<{ value: ProviderId; label: string }>;
  defaultProvider: ProviderId;
  siteLabels: Record<Site, string>;
}): DiagnosticsReport {
  const summary = buildDiagnosticsSummary(input);
  return {
    generatedAt: input.generatedAt,
    bffConfigured: Boolean(input.bffBaseUrl),
    providerStatus: input.providerStatus,
    orderedSiteStatus: input.orderedSiteStatus,
    ...summary,
  };
}
