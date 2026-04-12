import type { ProviderId } from '@campus-copilot/ai';
import type { ExportFormat } from '@campus-copilot/exporter';
import type { SiteSyncOutcome } from '@campus-copilot/core';
import type { Alert, Site } from '@campus-copilot/schema';
import type { SiteEntityCounts, SyncRun, SyncState, WorkbenchFilter } from '@campus-copilot/storage';
import { buildSiteBlockingHint } from './background-runtime';
import type { ExtensionConfig } from './config';
import { buildDiagnosticsSummary, type DiagnosticsSummary, type ProviderStatusLike } from './diagnostics';
import type { ResolvedUiLanguage } from './i18n';

export type SurfaceKind = 'sidepanel' | 'popup' | 'options';
export type SidepanelMode = 'assistant' | 'export' | 'settings';

export const SIDEPANEL_MODE_ORDER: SidepanelMode[] = ['assistant', 'export', 'settings'];

export type AiResponsePayload = {
  ok?: boolean;
  answerText?: string;
  structuredAnswer?: unknown;
  citationCoverage?: 'structured_citations' | 'uncited_fallback' | 'no_answer';
  error?: string;
};

export type ProviderStatusPayload = {
  ok: boolean;
  providers: Record<
    ProviderId,
    {
      ready: boolean;
      reason: string;
    }
  >;
};

export type ProviderStatusState = {
  providers: ProviderStatusPayload['providers'];
  checkedAt?: string;
  error?: string;
};

export const SITE_ORDER: Site[] = ['canvas', 'gradescope', 'edstem', 'myuw', 'time-schedule'];

export const SITE_LABELS: Record<Site, string> = {
  canvas: 'Canvas',
  gradescope: 'Gradescope',
  edstem: 'EdStem',
  myuw: 'MyUW',
  'time-schedule': 'Time Schedule',
};

export const EXPORT_FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
  { value: 'ics', label: 'ICS' },
];

export const PROVIDER_OPTIONS: Array<{ value: ProviderId; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'switchyard', label: 'Switchyard' },
];

export function buildDownloadPayload(format: ExportFormat, content: string) {
  return new Blob([content], {
    type: format === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8',
  });
}

export interface OrderedSiteStatusEntry {
  site: Site;
  counts: SiteEntityCounts;
  sync?: SyncState;
  hint?: string;
}

export interface SurfaceViewModel {
  orderedSiteStatus: OrderedSiteStatusEntry[];
  criticalAlerts: Alert[];
  highAlerts: Alert[];
  mediumAlerts: Alert[];
  lastSuccessfulSync?: string;
  currentSiteSelection?: Site;
  latestSyncRun?: SyncRun;
  diagnostics: DiagnosticsSummary;
}

export function buildEmptyProviderStatus(error?: string): ProviderStatusState {
  return {
    providers: {
      openai: {
        ready: false,
        reason: 'missing_api_key',
      },
      gemini: {
        ready: false,
        reason: 'missing_api_key',
      },
      switchyard: {
        ready: false,
        reason: 'missing_runtime_url',
      },
    },
    checkedAt: error ? new Date().toISOString() : undefined,
    error,
  };
}

export function buildSurfaceViewModel(input: {
  alerts: Alert[];
  filters: WorkbenchFilter;
  config: ExtensionConfig;
  siteCounts: SiteEntityCounts[];
  siteSyncStates: SyncState[];
  latestSyncRuns: SyncRun[];
  providerStatus: ProviderStatusLike;
  uiLanguage: ResolvedUiLanguage;
}) : SurfaceViewModel {
  const orderedSiteStatus = SITE_ORDER.map((site) => {
    const sync = input.siteSyncStates.find((entry) => entry.site === site);
    const counts =
      input.siteCounts.find((entry) => entry.site === site) ?? {
        site,
        courses: 0,
        resources: 0,
        assignments: 0,
        announcements: 0,
        grades: 0,
        messages: 0,
        events: 0,
      };

    return {
      site,
      counts,
      sync,
      hint: buildSiteBlockingHint(site, {
        outcome: sync?.lastOutcome as SiteSyncOutcome | undefined,
        hasEdStemConfig: Boolean(input.config.sites.edstem.threadsPath),
        locale: input.uiLanguage,
      }),
    };
  });

  const criticalAlerts = input.alerts.filter((alert) => alert.importance === 'critical');
  const highAlerts = input.alerts.filter((alert) => alert.importance === 'high');
  const mediumAlerts = input.alerts.filter((alert) => !['critical', 'high'].includes(alert.importance));
  const lastSuccessfulSync = input.siteSyncStates.find((entry) => entry.status === 'success')?.lastSyncedAt;
  const currentSiteSelection = input.filters.site === 'all' ? undefined : input.filters.site;
  const latestSyncRun = input.latestSyncRuns[0];
  const diagnostics = buildDiagnosticsSummary({
    bffBaseUrl: input.config.ai.bffBaseUrl,
    providerStatus: input.providerStatus,
    orderedSiteStatus,
    providerOptions: PROVIDER_OPTIONS,
    defaultProvider: input.config.ai.defaultProvider,
    siteLabels: SITE_LABELS,
    locale: input.uiLanguage,
  });

  return {
    orderedSiteStatus,
    criticalAlerts,
    highAlerts,
    mediumAlerts,
    lastSuccessfulSync,
    currentSiteSelection,
    latestSyncRun,
    diagnostics,
  };
}
