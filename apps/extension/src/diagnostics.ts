import type { ProviderId } from '@campus-copilot/ai';
import type { Site } from '@campus-copilot/schema';
import {
  buildDiagnosticsSummary,
  type DiagnosticsSummary,
  type OrderedSiteStatusLike,
} from './diagnostics-summary';
import type { ResolvedUiLanguage } from './i18n';
import type { ProviderStatusLike } from './provider-status-format';
export { buildDiagnosticsSummary } from './diagnostics-summary';
export {
  formatProviderReason,
  formatProviderStatusError,
  type ProviderStatusLike,
} from './provider-status-format';

export interface DiagnosticsReport extends DiagnosticsSummary {
  generatedAt: string;
  bffConfigured: boolean;
  providerStatus: ProviderStatusLike;
  orderedSiteStatus: OrderedSiteStatusLike[];
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
