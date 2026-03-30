import type { SiteSyncOutcome } from '@campus-copilot/core';
import { getUiText } from './i18n';

export type UiText = ReturnType<typeof getUiText>;

export function getSiteStatusTone(outcome?: SiteSyncOutcome, status?: 'idle' | 'syncing' | 'success' | 'error') {
  if (status === 'syncing') {
    return 'neutral';
  }

  if (outcome === 'success') {
    return 'success';
  }

  if (outcome === 'partial_success') {
    return 'warning';
  }

  if (outcome) {
    return 'danger';
  }

  return 'neutral';
}

export function getSiteStatusLabel(
  outcome: SiteSyncOutcome | undefined,
  status: 'idle' | 'syncing' | 'success' | 'error' | undefined,
  text: UiText,
) {
  const labels = text.siteStatus.labels;
  if (status === 'syncing') {
    return labels.syncing;
  }

  if (outcome) {
    switch (outcome) {
      case 'success':
        return labels.success;
      case 'partial_success':
        return labels.partialSuccess;
      case 'not_logged_in':
        return labels.notLoggedIn;
      case 'unsupported_context':
        return labels.unsupportedContext;
      case 'unauthorized':
        return labels.unauthorized;
      case 'request_failed':
        return labels.requestFailed;
      case 'normalize_failed':
        return labels.normalizeFailed;
      case 'collector_failed':
        return labels.collectorFailed;
      default:
        return outcome;
    }
  }

  if (status === 'success') {
    return labels.success;
  }

  if (status === 'error') {
    return labels.error;
  }

  return labels.idle;
}
