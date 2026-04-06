import {
  buildAiRuntimeMessages,
  createProviderProxyRequest,
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
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
  const runtimeMessages = buildAiRuntimeMessages({
    provider: input.provider,
    model: input.model,
    switchyardProvider: input.switchyardProvider,
    switchyardLane: input.switchyardLane,
    question: input.question,
    toolResults: [
      {
        name: 'get_today_snapshot',
        payload: input.todaySnapshot,
      },
      {
        name: 'get_recent_updates',
        payload: input.recentUpdates.map((entry) => ({
          ...entry,
          summary: formatTimelineSummary(entry, input.uiLanguage) ?? entry.summary,
        })),
      },
      {
        name: 'get_priority_alerts',
        payload: input.alerts.map((alert) => ({
          ...alert,
          title: formatAlertTitle(alert, input.uiLanguage),
          summary: formatAlertSummary(alert, input.uiLanguage),
        })),
      },
      {
        name: 'export_current_view',
        payload: {
          filename: input.currentViewExport.filename,
          format: input.currentViewExport.format,
          content: input.currentViewExport.content,
          decisionContext: {
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
            syncRuns: input.syncRuns,
            recentChanges: input.recentChanges.map((event) => ({
              ...event,
              title: formatChangeEventTitle(event, input.uiLanguage),
              summary: formatChangeEventSummary(event, input.uiLanguage, text),
            })),
          },
        },
      },
    ],
  });

  return createProviderProxyRequest({
    provider: input.provider,
    model: input.model,
    switchyardProvider: input.switchyardProvider,
    switchyardLane: input.switchyardLane,
    messages: [
      {
        role: 'system',
        content: runtimeMessages.systemPrompt,
      },
      {
        role: 'user',
        content: runtimeMessages.userPrompt,
      },
    ],
  });
}
