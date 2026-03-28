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
    return 'BFF base URL is not configured yet';
  }

  if (error === 'provider_status_fetch_failed') {
    return 'provider status fetch failed';
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
    blockers.push('BFF base URL is not configured');
    nextActions.push('Set the BFF base URL in Options, then refresh provider status.');
  }

  const readyProviders = input.providerOptions.filter(
    (option) => input.providerStatus.providers[option.value]?.ready,
  );
  if (readyProviders.length === 0) {
    blockers.push(`Provider not ready: ${input.providerOptions.map((option) => option.label).join(', ')}`);
    nextActions.push('Add at least one formal provider API key before attempting a real AI round-trip.');
  } else if (!input.providerStatus.providers[input.defaultProvider]?.ready) {
    const defaultProviderLabel =
      input.providerOptions.find((option) => option.value === input.defaultProvider)?.label ?? input.defaultProvider;
    blockers.push(`Default provider not ready: ${defaultProviderLabel}`);
    nextActions.push('Switch to a ready provider or configure the current default provider API key.');
  }

  const siteIssues = input.orderedSiteStatus.filter(
    (entry) => entry.hint || entry.sync?.lastOutcome === 'unsupported_context',
  );
  if (siteIssues.length > 0) {
    blockers.push(
      `Sites still missing live prerequisites: ${siteIssues.map((entry) => input.siteLabels[entry.site]).join(', ')}`,
    );
    nextActions.push('Restore the real logged-in context or trigger sync from the correct site tab, then retry live validation.');
  }

  if (input.providerStatus.error === 'provider_status_fetch_failed') {
    blockers.push('BFF provider status fetch failed');
    nextActions.push('Confirm that the BFF service is running, then refresh provider status.');
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
