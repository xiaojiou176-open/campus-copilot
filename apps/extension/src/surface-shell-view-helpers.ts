import type { SiteSyncOutcome } from '@campus-copilot/core';
import type { Alert, ImportanceLevel, PriorityReason, PriorityReasonCode, TimelineKind } from '@campus-copilot/schema';
import type { ChangeEvent, FocusQueueItem, SyncRun, WeeklyLoadEntry } from '@campus-copilot/storage';
import { formatDateTime, formatRelativeTime, getUiText, type ResolvedUiLanguage } from './i18n';
import { SITE_LABELS, type OrderedSiteStatusEntry } from './surface-shell-model';

export type UiText = ReturnType<typeof getUiText>;
export type SiteTrustState = 'ready' | 'partial' | 'blocked' | 'stale' | 'idle';

const STALE_SYNC_HOURS = 24 * 3;

function containsCjk(value: string | undefined) {
  return Boolean(value && /[\u3400-\u9FFF]/.test(value));
}

function isProbablyMachineCode(value: string | undefined) {
  return Boolean(value && /^[a-z0-9]+(?:_[a-z0-9]+)+$/i.test(value));
}

function localizeResourceName(resource: string, locale: ResolvedUiLanguage) {
  const text = getUiText(locale);
  const normalized = resource
    .replace(text.viewHelpers.legacyParsing.missingResourcePrefix, '')
    .trim()
    .toLowerCase();
  const match = text.viewHelpers.resourceLabels[normalized];
  if (match) {
    return match;
  }

  return normalized;
}

export function localizeResourceList(resources: string[] | undefined, locale: ResolvedUiLanguage) {
  return (resources ?? []).map((resource) => localizeResourceName(resource, locale));
}

function formatResourceList(resources: string[] | undefined, locale: ResolvedUiLanguage) {
  return localizeResourceList(resources, locale).join(' / ');
}

export function formatBlockedByList(blockedBy: string[] | undefined, locale: ResolvedUiLanguage) {
  return formatResourceList(blockedBy, locale);
}

export function formatResourceGapList(resources: string[] | undefined, locale: ResolvedUiLanguage) {
  return formatResourceList(resources, locale);
}

function stripKnownSuffix(title: string, suffixes: string[]) {
  for (const suffix of suffixes) {
    if (title.endsWith(suffix)) {
      return title.slice(0, -suffix.length);
    }
  }

  return title;
}

function getFallbackReasonLabel(code: PriorityReasonCode, locale: ResolvedUiLanguage) {
  return getUiText(locale).viewHelpers.fallbackReasons[code];
}

function looksLikeFortyEightHourReason(value: string | undefined) {
  return /48/.test(value ?? '');
}

function humanizeMachineCode(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function humanizeUiSummary(value: string | undefined, locale: ResolvedUiLanguage) {
  if (!value) {
    return value;
  }

  let next = value;

  if (locale === 'en') {
    next = next.replace(
      /Latest transcript lane currently appears as a review-first summary and stays export-first\./gi,
      'Transcript is currently available as a review summary.',
    );
    next = next.replace(
      /Review-ready summary stays export-first until a stronger transcript detail lane is promoted\./gi,
      'This stays a review summary for now.',
    );
    next = next.replace(/No truthful transcript runtime carrier is landed yet\./gi, 'Transcript details are not available yet.');
    next = next.replace(/No truthful financial-aid runtime carrier is landed yet\./gi, 'Financial aid details are not available yet.');
    next = next.replace(/No truthful accounts runtime carrier is landed yet\./gi, 'Account details are not available yet.');
    next = next.replace(/No truthful tuition-detail runtime carrier is landed yet\./gi, 'Billing details are not available yet.');
    next = next.replace(/No truthful profile runtime carrier is landed yet\./gi, 'Profile details are not available yet.');
    next = next.replace(/Historical-record detail remains blocked until a lawful summary carrier is proven\./gi, 'You can review the current summary for now.');
    next = next.replace(/Aid detail remains blocked pending a lawful summary-first carrier\./gi, 'You can review the current summary for now.');
    next = next.replace(/Account-state detail remains blocked pending a lawful summary-first carrier\./gi, 'You can review the current summary for now.');
    next = next.replace(/Billing-statement detail remains blocked until a lawful summary-first carrier is proven\./gi, 'You can review the current summary for now.');
    next = next.replace(/Personal-profile detail remains blocked until a lawful summary-first carrier is proven\./gi, 'You can review the current summary for now.');
    next = next.replace(/lawful summary(?:-first)? carrier/gi, 'trusted summary');
    next = next.replace(/runtime carrier/gi, 'details');
    next = next.replace(/shared planning substrate/gi, 'planning snapshot');
    next = next.replace(/\blanded\b/gi, 'available');
  }

  return next;
}

function isStale(lastSyncedAt: string | undefined, nowIso: string) {
  if (!lastSyncedAt) {
    return false;
  }

  const ageMs = new Date(nowIso).getTime() - new Date(lastSyncedAt).getTime();
  return ageMs > STALE_SYNC_HOURS * 60 * 60 * 1000;
}

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

export function formatSyncOutcomeLabel(outcome: SiteSyncOutcome | undefined, text: UiText) {
  return getSiteStatusLabel(outcome, undefined, text);
}

export function getSiteTrustState(entry: OrderedSiteStatusEntry, nowIso: string): SiteTrustState {
  if (entry.sync?.lastOutcome === 'partial_success') {
    return 'partial';
  }

  if (
    entry.sync?.status === 'error' ||
    (entry.sync?.lastOutcome && entry.sync.lastOutcome !== 'success') ||
    entry.hint
  ) {
    return 'blocked';
  }

  if (entry.sync?.lastSyncedAt && isStale(entry.sync.lastSyncedAt, nowIso)) {
    return 'stale';
  }

  if (entry.sync?.lastOutcome === 'success' || entry.sync?.status === 'success') {
    return 'ready';
  }

  return 'idle';
}

export function formatSiteTrustDetail(
  entry: OrderedSiteStatusEntry,
  locale: ResolvedUiLanguage,
  nowIso: string,
) {
  const text = getUiText(locale);
  const resources = entry.sync?.resourceFailures?.map((item) => item.resource) ?? [];
  const localizedResources = formatResourceList(resources, locale);
  const trustState = getSiteTrustState(entry, nowIso);

  if (trustState === 'partial') {
    return text.viewHelpers.trustDetail.partialMissing(
      localizedResources || text.viewHelpers.trustDetail.partialMissingFallback,
    );
  }

  if (trustState === 'blocked') {
    if (entry.hint) {
      return entry.hint;
    }

    if (entry.sync?.lastOutcome && entry.sync.lastOutcome !== 'success') {
      return text.viewHelpers.trustDetail.blockedByStatus(
        getSiteStatusLabel(entry.sync.lastOutcome, entry.sync.status, text),
      );
    }

    return text.viewHelpers.trustDetail.noSyncContext;
  }

  if (trustState === 'stale') {
    return text.viewHelpers.trustDetail.stale(formatRelativeTime(locale, entry.sync?.lastSyncedAt));
  }

  if (trustState === 'ready') {
    return text.viewHelpers.trustDetail.ready;
  }

  return text.viewHelpers.trustDetail.noSuccess;
}

export function formatSiteErrorReason(
  errorReason: string | undefined,
  locale: ResolvedUiLanguage,
) {
  if (!errorReason || isProbablyMachineCode(errorReason)) {
    return undefined;
  }

  if (locale === 'en' && containsCjk(errorReason)) {
    return undefined;
  }

  return errorReason;
}

export function formatFocusReason(
  reason: PriorityReason,
  item: FocusQueueItem,
  locale: ResolvedUiLanguage,
) {
  const fallback = getFallbackReasonLabel(reason.code, locale);

  switch (reason.code) {
    case 'manual':
      return fallback;
    case 'overdue':
      return item.dueAt
        ? getUiText(locale).viewHelpers.focusReasons.overdueSince(formatDateTime(locale, item.dueAt))
        : fallback;
    case 'due_soon':
      if (looksLikeFortyEightHourReason(reason.detail)) {
        return item.dueAt
          ? getUiText(locale).viewHelpers.focusReasons.dueWithin48Hours(formatDateTime(locale, item.dueAt))
          : fallback;
      }

      return item.dueAt
        ? getUiText(locale).viewHelpers.focusReasons.dueThisWeek(formatDateTime(locale, item.dueAt))
        : fallback;
    case 'recently_updated':
      return getUiText(locale).viewHelpers.focusReasons.changedLatestSync;
    case 'unread_activity':
      return fallback;
    case 'new_grade':
      return fallback;
    case 'important_announcement':
      return fallback;
    case 'sync_stale': {
      const blockedBy = formatResourceList(item.blockedBy, locale);
      return blockedBy
        ? getUiText(locale).viewHelpers.focusReasons.syncGaps(blockedBy)
        : fallback;
    }
    default:
      return locale === 'en' && containsCjk(reason.label) ? fallback : reason.label;
  }
}

export function formatAlertTitle(alert: Alert, locale: ResolvedUiLanguage) {
  const text = getUiText(locale);
  switch (alert.alertKind) {
    case 'overdue': {
      const base = stripKnownSuffix(alert.title, [text.viewHelpers.legacyParsing.titleSuffixes.overdue]);
      return text.viewHelpers.alertTitles.overdue(base);
    }
    case 'due_soon': {
      const base = stripKnownSuffix(alert.title, [text.viewHelpers.legacyParsing.titleSuffixes.dueSoon]);
      return text.viewHelpers.alertTitles.dueSoon(base);
    }
    case 'new_grade': {
      const base = stripKnownSuffix(alert.title, [text.viewHelpers.legacyParsing.titleSuffixes.newGrade]);
      return text.viewHelpers.alertTitles.newGrade(base);
    }
    case 'attention_needed':
      return text.viewHelpers.alertTitles.attentionNeeded(SITE_LABELS[alert.site]);
    default:
      return locale === 'en' && containsCjk(alert.title)
        ? text.viewHelpers.alertTitles.updateFromSite(SITE_LABELS[alert.site])
        : alert.title;
  }
}

export function formatAlertSummary(alert: Alert, locale: ResolvedUiLanguage) {
  const text = getUiText(locale);
  switch (alert.alertKind) {
    case 'overdue':
      return text.viewHelpers.alertSummaries.overdue;
    case 'due_soon':
      return text.viewHelpers.alertSummaries.dueSoon;
    case 'new_grade':
      return text.viewHelpers.alertSummaries.newGrade;
    case 'important_announcement':
      return text.viewHelpers.alertSummaries.importantAnnouncement;
    case 'instructor_activity':
      return text.viewHelpers.alertSummaries.instructorActivity;
    case 'unread_mention':
      return text.viewHelpers.alertSummaries.unreadMention;
    case 'attention_needed':
      return text.viewHelpers.alertSummaries.attentionNeeded;
    default:
      return locale === 'en' && containsCjk(alert.summary)
        ? text.viewHelpers.alertSummaries.structuredUpdateNeedsAttention
        : alert.summary;
  }
}

export function formatAlertImportanceLabel(importance: ImportanceLevel, locale: ResolvedUiLanguage) {
  return getUiText(locale).viewHelpers.importanceLabels[importance];
}

export function formatTimelineTitle(
  entry: { title: string; timelineKind: string },
  locale: ResolvedUiLanguage,
) {
  if (locale !== 'en' || !containsCjk(entry.title)) {
    return entry.title;
  }

  return getUiText(locale).viewHelpers.timelineTitles?.[entry.timelineKind] ?? entry.title;
}

export function formatTimelineKindLabel(timelineKind: TimelineKind, locale: ResolvedUiLanguage) {
  return getUiText(locale).viewHelpers.timelineKindLabels[timelineKind] ?? humanizeMachineCode(timelineKind);
}

export function formatTimelineSummary(entry: { summary?: string; timelineKind: string }, locale: ResolvedUiLanguage) {
  if (!entry.summary) {
    return undefined;
  }

  if (locale !== 'en' || !containsCjk(entry.summary)) {
    return entry.summary;
  }

  return getUiText(locale).viewHelpers.timelineSummaries[entry.timelineKind] ?? entry.summary;
}

export function formatWeeklyLoadHighlights(entry: WeeklyLoadEntry, locale: ResolvedUiLanguage) {
  const text = getUiText(locale);
  const parts: string[] = [];

  if (entry.overdueCount > 0) {
    parts.push(text.viewHelpers.weeklyLoadHighlights.overdue(entry.overdueCount));
  }

  if (entry.dueSoonCount > 0) {
    parts.push(text.viewHelpers.weeklyLoadHighlights.dueSoon(entry.dueSoonCount));
  }

  if (entry.pinnedCount > 0) {
    parts.push(text.viewHelpers.weeklyLoadHighlights.pinned(entry.pinnedCount));
  }

  if (entry.eventCount && entry.eventCount > 0) {
    parts.push(text.viewHelpers.weeklyLoadHighlights.eventNodes(entry.eventCount));
  }

  return parts;
}

export function formatWeeklyLoadSummary(entry: WeeklyLoadEntry, locale: ResolvedUiLanguage) {
  return getUiText(locale).weeklyLoad.summary({
    assignmentCount: entry.assignmentCount,
    eventCount: entry.eventCount ?? 0,
    overdueCount: entry.overdueCount ?? 0,
    dueSoonCount: entry.dueSoonCount ?? 0,
    pinnedCount: entry.pinnedCount ?? 0,
  });
}

export function formatLatestSyncReceipt(run: SyncRun | undefined, text: UiText) {
  if (!run) {
    return undefined;
  }

  const outcome = formatSyncOutcomeLabel(run.outcome, text);
  return text.changeJournal.receipt(run.changeCount, outcome);
}

export function formatAssignmentStatus(status: string | undefined, locale: ResolvedUiLanguage) {
  if (!status) {
    return undefined;
  }

  return getUiText(locale).viewHelpers.assignmentStatuses[status] ?? humanizeMachineCode(status);
}

export function formatChangeValue(value: string | undefined, locale: ResolvedUiLanguage, text: UiText) {
  if (!value) {
    return text.changeJournal.emptyValue;
  }

  if (value === 'read') {
    return text.viewHelpers.changeValues.read;
  }

  if (value === 'unread') {
    return text.viewHelpers.changeValues.unread;
  }

  return formatAssignmentStatus(value, locale) ?? value;
}

export function formatChangeEventTitle(event: ChangeEvent, locale: ResolvedUiLanguage) {
  const text = getUiText(locale);
  switch (event.changeType) {
    case 'created': {
      const base = stripKnownSuffix(event.title, [text.viewHelpers.legacyParsing.titleSuffixes.created]);
      return text.viewHelpers.changeTitles.created(base);
    }
    case 'removed': {
      const base = stripKnownSuffix(event.title, [text.viewHelpers.legacyParsing.titleSuffixes.removed]);
      return text.viewHelpers.changeTitles.removed(base);
    }
    case 'status_changed': {
      const base = stripKnownSuffix(event.title, [text.viewHelpers.legacyParsing.titleSuffixes.statusChanged]);
      return text.viewHelpers.changeTitles.statusChanged(base);
    }
    case 'due_changed': {
      const base = stripKnownSuffix(event.title, [text.viewHelpers.legacyParsing.titleSuffixes.dueChanged]);
      return text.viewHelpers.changeTitles.dueChanged(base);
    }
    case 'grade_released': {
      const base = stripKnownSuffix(event.title, [text.viewHelpers.legacyParsing.titleSuffixes.gradeReleased]);
      return text.viewHelpers.changeTitles.gradeReleased(base);
    }
    case 'message_unread':
      return locale === 'zh-CN' && containsCjk(event.title)
        ? event.title
        : text.viewHelpers.changeTitles.unreadDiscussion;
    case 'sync_partial':
      return text.viewHelpers.changeTitles.syncPartial(SITE_LABELS[event.site]);
    default:
      return locale === 'en' && containsCjk(event.title)
        ? text.viewHelpers.changeTitles.updateFromSite(SITE_LABELS[event.site])
        : event.title;
  }
}

export function formatChangeTypeLabel(changeType: ChangeEvent['changeType'], locale: ResolvedUiLanguage) {
  return getUiText(locale).viewHelpers.changeTypeLabels[changeType] ?? humanizeMachineCode(changeType);
}

export function formatChangeEventSummary(event: ChangeEvent, locale: ResolvedUiLanguage, text: UiText) {
  switch (event.changeType) {
    case 'created':
      return text.viewHelpers.changeSummaries.created;
    case 'removed':
      return text.viewHelpers.changeSummaries.removed;
    case 'status_changed':
      return text.viewHelpers.changeSummaries.statusChanged(
        formatChangeValue(event.previousValue, locale, text),
        formatChangeValue(event.nextValue, locale, text),
      );
    case 'due_changed':
      return text.viewHelpers.changeSummaries.dueChanged(
        formatChangeValue(event.previousValue, locale, text),
        formatChangeValue(event.nextValue, locale, text),
      );
    case 'grade_released':
      return text.viewHelpers.changeSummaries.gradeReleased(
        formatChangeValue(event.nextValue, locale, text),
      );
    case 'message_unread':
      return event.previousValue
        ? text.viewHelpers.changeSummaries.unreadAgain
        : text.viewHelpers.changeSummaries.unreadNew;
    case 'sync_partial':
      return text.viewHelpers.changeSummaries.syncPartial(
        formatResourceList((event.nextValue ?? '').split('/'), locale),
      );
    default:
      return locale === 'en' && containsCjk(event.summary)
        ? text.viewHelpers.changeSummaries.structuredChangeRecorded
        : event.summary;
  }
}
