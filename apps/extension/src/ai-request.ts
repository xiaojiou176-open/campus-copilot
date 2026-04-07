import {
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
import { buildWorkbenchAiProxyRequest as buildSharedWorkbenchAiProxyRequest } from '@campus-copilot/core';
import type { ExportArtifact } from '@campus-copilot/exporter';
import type { Alert, TimelineEntry } from '@campus-copilot/schema';
import type {
  ChangeEvent,
  FocusQueueItem,
  SyncRun,
  TodaySnapshot,
  WeeklyLoadEntry,
} from '@campus-copilot/storage';
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

export function buildAiProxyRequest(input: {
  provider: ProviderId;
  model: string;
  switchyardProvider?: SwitchyardRuntimeProvider;
  switchyardLane?: SwitchyardLane;
  uiLanguage: ResolvedUiLanguage;
  question: string;
  todaySnapshot: TodaySnapshot;
  recentUpdates: TimelineEntry[];
  alerts: Alert[];
  focusQueue: FocusQueueItem[];
  weeklyLoad: WeeklyLoadEntry[];
  syncRuns: SyncRun[];
  recentChanges: ChangeEvent[];
  currentViewExport: ExportArtifact;
}) {
  const text = getUiText(input.uiLanguage);
  return buildSharedWorkbenchAiProxyRequest({
    provider: input.provider,
    model: input.model,
    switchyardProvider: input.switchyardProvider,
    switchyardLane: input.switchyardLane,
    question: input.question,
    todaySnapshot: input.todaySnapshot,
    recentUpdates: input.recentUpdates,
    alerts: input.alerts,
    focusQueue: input.focusQueue,
    weeklyLoad: input.weeklyLoad,
    syncRuns: input.syncRuns,
    recentChanges: input.recentChanges,
    currentViewExport: input.currentViewExport,
    presentation: {
      recentUpdates: input.recentUpdates.map((entry) => ({
        ...entry,
        summary: formatTimelineSummary(entry, input.uiLanguage) ?? entry.summary,
      })),
      alerts: input.alerts.map((alert) => ({
        ...alert,
        title: formatAlertTitle(alert, input.uiLanguage),
        summary: formatAlertSummary(alert, input.uiLanguage),
      })),
      focusQueue: input.focusQueue.map((item) => ({
        ...item,
        reasons: item.reasons.map((reason) => ({
          ...reason,
          label: text.priorityReasonLabels[reason.code],
          detail: formatFocusReason(reason, item, input.uiLanguage),
        })),
        blockedBy: localizeResourceList(item.blockedBy, input.uiLanguage),
      })),
      weeklyLoad: input.weeklyLoad.map((entry) => ({
        ...entry,
        highlights: formatWeeklyLoadHighlights(entry, input.uiLanguage),
        summary: formatWeeklyLoadSummary(entry, input.uiLanguage),
      })),
      changeEvents: input.recentChanges.map((event) => ({
        ...event,
        title: formatChangeEventTitle(event, input.uiLanguage),
        summary: formatChangeEventSummary(event, input.uiLanguage, text),
      })),
    },
  });
}
