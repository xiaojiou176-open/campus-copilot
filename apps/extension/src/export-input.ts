import { buildWorkbenchExportInput as buildSharedWorkbenchExportInput } from '@campus-copilot/core';
import type { ExportInput, ExportPreset } from '@campus-copilot/exporter';
import type { Alert, Announcement, Assignment, Event, Grade, Message, Resource } from '@campus-copilot/schema';
import type {
  ChangeEvent,
  FocusQueueItem,
  RecentUpdatesFeed,
  SyncRun,
  WeeklyLoadEntry,
  WorkbenchFilter,
} from '@campus-copilot/storage';
import { getUiText, type ResolvedUiLanguage } from './i18n';
import { SITE_LABELS } from './surface-shell-model';
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

type BuildWorkbenchExportInputArgs = {
  preset: ExportPreset;
  generatedAt: string;
  uiLanguage: ResolvedUiLanguage;
  filters: WorkbenchFilter;
  resources: Resource[];
  assignments: Assignment[];
  announcements: Announcement[];
  messages: Message[];
  grades: Grade[];
  events: Event[];
  alerts: Alert[];
  recentUpdates?: RecentUpdatesFeed;
  focusQueue: FocusQueueItem[];
  weeklyLoad: WeeklyLoadEntry[];
  syncRuns: SyncRun[];
  changeEvents: ChangeEvent[];
};

function buildViewTitle(
  preset: ExportPreset,
  filters: WorkbenchFilter,
  text: ReturnType<typeof getUiText>,
) {
  const siteLabel = filters.site === 'all' ? text.toolbar.allSites : SITE_LABELS[filters.site];

  switch (preset) {
    case 'current_view':
      return text.exportTitles.currentView(siteLabel);
    case 'change_journal':
      return text.exportTitles.changeJournal(siteLabel);
    case 'focus_queue':
      return text.exportTitles.focusQueue(siteLabel);
    case 'weekly_load':
      return text.exportTitles.weeklyLoad(siteLabel);
    default:
      return text.exportTitles.home;
  }
}

export function buildWorkbenchExportInput(args: BuildWorkbenchExportInputArgs): ExportInput {
  const text = getUiText(args.uiLanguage);

  return buildSharedWorkbenchExportInput({
    preset: args.preset,
    generatedAt: args.generatedAt,
    filters: args.filters,
    resources: args.resources,
    assignments: args.assignments,
    announcements: args.announcements,
    messages: args.messages,
    grades: args.grades,
    events: args.events,
    alerts: args.alerts,
    recentUpdates: args.recentUpdates,
    focusQueue: args.focusQueue,
    weeklyLoad: args.weeklyLoad,
    syncRuns: args.syncRuns,
    changeEvents: args.changeEvents,
    presentation: {
      viewTitle: buildViewTitle(args.preset, args.filters, text),
      alerts: args.alerts.map((alert) => ({
        ...alert,
        title: formatAlertTitle(alert, args.uiLanguage),
        summary: formatAlertSummary(alert, args.uiLanguage),
      })),
      recentUpdates: (args.recentUpdates?.items ?? []).map((entry) => ({
        ...entry,
        summary: formatTimelineSummary(entry, args.uiLanguage) ?? entry.summary,
      })),
      focusQueue: args.focusQueue.map((item) => ({
        ...item,
        reasons: item.reasons.map((reason) => ({
          ...reason,
          label: text.priorityReasonLabels[reason.code],
          detail: formatFocusReason(reason, item, args.uiLanguage),
        })),
        blockedBy: localizeResourceList(item.blockedBy, args.uiLanguage),
      })),
      weeklyLoad: args.weeklyLoad.map((entry) => ({
        ...entry,
        highlights: formatWeeklyLoadHighlights(entry, args.uiLanguage),
        summary: formatWeeklyLoadSummary(entry, args.uiLanguage),
      })),
      changeEvents: args.changeEvents.map((event) => ({
        ...event,
        title: formatChangeEventTitle(event, args.uiLanguage),
        summary: formatChangeEventSummary(event, args.uiLanguage, text),
      })),
    },
  });
}
