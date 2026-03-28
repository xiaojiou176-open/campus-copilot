import type { ProviderId } from '@campus-copilot/ai';
import type { SiteSyncOutcome } from '@campus-copilot/core';
import type { Site } from '@campus-copilot/schema';
import { getUiText, type ResolvedUiLanguage } from './i18n';

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

export function formatProviderStatusError(error: string | undefined, locale: ResolvedUiLanguage = 'en') {
  const text = getUiText(locale);
  if (!error) {
    return undefined;
  }

  if (error === 'missing_bff_base_url') {
    return text.diagnosticsMessages.missingBffBaseUrl;
  }

  if (error === 'provider_status_fetch_failed') {
    return text.diagnosticsMessages.providerStatusFetchFailed;
  }

  return error;
}

export function formatProviderReason(reason: string | undefined, locale: ResolvedUiLanguage = 'en') {
  const text = getUiText(locale);
  if (!reason) {
    return text.providerReasons.unknown;
  }

  if (reason === 'configured') {
    return text.providerReasons.configured;
  }

  if (reason === 'missing_api_key') {
    return text.providerReasons.missingApiKey;
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
  locale?: ResolvedUiLanguage;
}): DiagnosticsSummary {
  const locale = input.locale ?? 'en';
  const text = getUiText(locale);
  const blockers: string[] = [];
  const nextActions: string[] = [];

  if (!input.bffBaseUrl) {
    blockers.push(text.diagnosticsMessages.bffBaseUrlNotConfigured);
    nextActions.push(text.diagnosticsMessages.nextActionSetBff);
  }

  const readyProviders = input.providerOptions.filter(
    (option) => input.providerStatus.providers[option.value]?.ready,
  );
  if (readyProviders.length === 0) {
    blockers.push(text.diagnosticsMessages.providerNotReady(input.providerOptions.map((option) => option.label).join(', ')));
    nextActions.push(text.diagnosticsMessages.nextActionProviderKey);
  } else if (!input.providerStatus.providers[input.defaultProvider]?.ready) {
    const defaultProviderLabel =
      input.providerOptions.find((option) => option.value === input.defaultProvider)?.label ?? input.defaultProvider;
    blockers.push(text.diagnosticsMessages.defaultProviderNotReady(defaultProviderLabel));
    nextActions.push(text.diagnosticsMessages.nextActionSwitchProvider);
  }

  const siteIssues = input.orderedSiteStatus.filter(
    (entry) => entry.hint || entry.sync?.lastOutcome === 'unsupported_context',
  );
  if (siteIssues.length > 0) {
    blockers.push(text.diagnosticsMessages.sitesStillMissingLivePrerequisites(siteIssues.map((entry) => input.siteLabels[entry.site]).join(', ')));
    nextActions.push(text.diagnosticsMessages.nextActionRestoreSiteContext);
  }

  if (input.providerStatus.error === 'provider_status_fetch_failed') {
    blockers.push(text.diagnosticsMessages.bffProviderStatusFetchFailed);
    nextActions.push(text.diagnosticsMessages.nextActionRefreshProviderStatus);
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
  locale?: ResolvedUiLanguage;
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
