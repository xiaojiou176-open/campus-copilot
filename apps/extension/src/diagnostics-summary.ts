import type { ProviderId } from '@campus-copilot/ai';
import type { SiteSyncOutcome } from '@campus-copilot/core';
import type { Site } from '@campus-copilot/schema';
import { getUiText, type ResolvedUiLanguage } from './i18n';
import type { ProviderStatusLike } from './provider-status-format';

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
  const directProviderOptions = input.providerOptions.filter((option) => option.value !== 'switchyard');

  if (!input.bffBaseUrl) {
    blockers.push(text.diagnosticsMessages.bffBaseUrlNotConfigured);
    nextActions.push(text.diagnosticsMessages.nextActionSetBff);
  }

  const readyProviders = directProviderOptions.filter(
    (option) => input.providerStatus.providers[option.value]?.ready,
  );
  if (readyProviders.length === 0) {
    blockers.push(
      text.diagnosticsMessages.providerNotReady(
        directProviderOptions.map((option) => option.label).join(', '),
      ),
    );
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
    blockers.push(
      text.diagnosticsMessages.sitesStillMissingLivePrerequisites(
        siteIssues.map((entry) => input.siteLabels[entry.site]).join(', '),
      ),
    );
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
