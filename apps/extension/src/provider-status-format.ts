import type { ProviderId } from '@campus-copilot/ai';
import { getUiText, type ResolvedUiLanguage } from './i18n';

export interface ProviderStatusLike {
  providers: Record<
    ProviderId,
    {
      ready: boolean;
      reason: string;
    }
  >;
  checkedAt?: string;
  error?: string;
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

  if (reason === 'configured_local_runtime') {
    return text.providerReasons.configuredLocalRuntime;
  }

  if (reason === 'missing_api_key') {
    return text.providerReasons.missingApiKey;
  }

  if (reason === 'missing_runtime_url') {
    return text.providerReasons.missingRuntimeUrl;
  }

  return reason;
}
