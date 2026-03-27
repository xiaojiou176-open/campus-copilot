import {
  buildAiRuntimeMessages,
  createProviderProxyRequest,
  type ProviderId,
} from '@campus-copilot/ai';
import type { ExportArtifact } from '@campus-copilot/exporter';
import type { Alert, TimelineEntry } from '@campus-copilot/schema';
import type { TodaySnapshot } from '@campus-copilot/storage';

export function buildAiProxyRequest(input: {
  provider: ProviderId;
  model: string;
  question: string;
  todaySnapshot: TodaySnapshot;
  recentUpdates: TimelineEntry[];
  alerts: Alert[];
  currentViewExport: ExportArtifact;
}) {
  const runtimeMessages = buildAiRuntimeMessages({
    provider: input.provider,
    authMode: 'api_key',
    model: input.model,
    question: input.question,
    toolResults: [
      {
        name: 'get_today_snapshot',
        payload: input.todaySnapshot,
      },
      {
        name: 'get_recent_updates',
        payload: input.recentUpdates,
      },
      {
        name: 'get_priority_alerts',
        payload: input.alerts,
      },
      {
        name: 'export_current_view',
        payload: {
          filename: input.currentViewExport.filename,
          format: input.currentViewExport.format,
          content: input.currentViewExport.content,
        },
      },
    ],
  });

  return createProviderProxyRequest({
    provider: input.provider,
    authMode: 'api_key',
    model: input.model,
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
