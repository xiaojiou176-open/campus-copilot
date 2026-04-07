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
  buildLocalizedAlertPresentation,
  buildLocalizedChangeEventPresentation,
  buildLocalizedFocusQueuePresentation,
  buildLocalizedRecentUpdatesPresentation,
  buildLocalizedWeeklyLoadPresentation,
} from './workbench-presentation';

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
      alerts: buildLocalizedAlertPresentation(args.alerts, args.uiLanguage),
      recentUpdates: buildLocalizedRecentUpdatesPresentation(args.recentUpdates?.items ?? [], args.uiLanguage),
      focusQueue: buildLocalizedFocusQueuePresentation(args.focusQueue, args.uiLanguage),
      weeklyLoad: buildLocalizedWeeklyLoadPresentation(args.weeklyLoad, args.uiLanguage),
      changeEvents: buildLocalizedChangeEventPresentation(args.changeEvents, args.uiLanguage),
    },
  });
}
