import type { Alert, TimelineEntry } from '@campus-copilot/schema';
import type { ChangeEvent, FocusQueueItem, WeeklyLoadEntry } from '@campus-copilot/storage';
import { getUiText, type ResolvedUiLanguage } from './i18n';
import {
  formatAlertSummary,
  formatAlertTitle,
  formatChangeEventSummary,
  formatChangeEventTitle,
  formatFocusReason,
  formatTimelineSummary,
  formatWeeklyLoadHighlights,
  formatWeeklyLoadSummary,
  localizeResourceList,
} from './surface-shell-view-helpers';

export function buildLocalizedAlertPresentation(alerts: Alert[], uiLanguage: ResolvedUiLanguage) {
  return alerts.map((alert) => ({
    ...alert,
    title: formatAlertTitle(alert, uiLanguage),
    summary: formatAlertSummary(alert, uiLanguage),
  }));
}

export function buildLocalizedRecentUpdatesPresentation(entries: TimelineEntry[], uiLanguage: ResolvedUiLanguage) {
  return entries.map((entry) => ({
    ...entry,
    summary: formatTimelineSummary(entry, uiLanguage) ?? entry.summary,
  }));
}

export function buildLocalizedFocusQueuePresentation(items: FocusQueueItem[], uiLanguage: ResolvedUiLanguage) {
  const text = getUiText(uiLanguage);
  return items.map((item) => ({
    ...item,
    reasons: item.reasons.map((reason) => ({
      ...reason,
      label: text.priorityReasonLabels[reason.code],
      detail: formatFocusReason(reason, item, uiLanguage),
    })),
    blockedBy: localizeResourceList(item.blockedBy, uiLanguage),
  }));
}

export function buildLocalizedWeeklyLoadPresentation(entries: WeeklyLoadEntry[], uiLanguage: ResolvedUiLanguage) {
  return entries.map((entry) => ({
    ...entry,
    highlights: formatWeeklyLoadHighlights(entry, uiLanguage),
    summary: formatWeeklyLoadSummary(entry, uiLanguage),
  }));
}

export function buildLocalizedChangeEventPresentation(events: ChangeEvent[], uiLanguage: ResolvedUiLanguage) {
  const text = getUiText(uiLanguage);
  return events.map((event) => ({
    ...event,
    title: formatChangeEventTitle(event, uiLanguage),
    summary: formatChangeEventSummary(event, uiLanguage, text),
  }));
}
