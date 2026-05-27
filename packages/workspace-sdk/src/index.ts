import 'fake-indexeddb/auto';

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  buildAiRuntimeMessages,
  type AiRuntimeRequest,
  type ChatMessage,
  type ProviderId,
} from '@campus-copilot/ai';
import {
  createExportArtifact,
  type ExportArtifact,
  type ExportFormat,
  type ExportPreset,
} from '@campus-copilot/exporter';
import type { Site } from '@campus-copilot/schema';
import {
  createCampusCopilotDb,
  getAllSiteEntityCounts,
  getFocusQueue,
  getLatestSyncRuns,
  getPriorityAlerts,
  getRecentChangeEvents,
  getRecentUpdates,
  getTodaySnapshot,
  getWeeklyLoad,
  getWorkbenchView,
  replaceImportedWorkbenchSnapshot,
  type ImportedWorkbenchSnapshot,
  type WorkbenchFilter,
} from '@campus-copilot/storage';

export interface WorkspaceDeriveOptions {
  now?: string;
  filters?: WorkbenchFilter;
}

export interface WorkspaceDerivedState {
  now: string;
  filters: WorkbenchFilter;
  snapshot: ImportedWorkbenchSnapshot;
  todaySnapshot: Awaited<ReturnType<typeof getTodaySnapshot>>;
  focusQueue: Awaited<ReturnType<typeof getFocusQueue>>;
  weeklyLoad: Awaited<ReturnType<typeof getWeeklyLoad>>;
  recentUpdates: Awaited<ReturnType<typeof getRecentUpdates>>;
  priorityAlerts: Awaited<ReturnType<typeof getPriorityAlerts>>;
  changeEvents: Awaited<ReturnType<typeof getRecentChangeEvents>>;
  syncRuns: Awaited<ReturnType<typeof getLatestSyncRuns>>;
  workbenchView: Awaited<ReturnType<typeof getWorkbenchView>>;
  siteCounts: Awaited<ReturnType<typeof getAllSiteEntityCounts>>;
}

export interface WorkspaceSummary {
  generatedAt: string;
  now: string;
  totals: WorkspaceDerivedState['todaySnapshot'];
  focusQueueTop: Array<{
    id: string;
    title: string;
    site: Site;
    score: number;
    summary?: string;
  }>;
  recentUpdateCount: number;
  siteCounts: WorkspaceDerivedState['siteCounts'];
  latestSyncRuns: WorkspaceDerivedState['syncRuns'];
}

export interface SiteOverview {
  site: Site;
  counts: WorkspaceDerivedState['siteCounts'][number];
  resources: WorkspaceDerivedState['workbenchView']['resources'];
  assignments: WorkspaceDerivedState['workbenchView']['assignments'];
  announcements: WorkspaceDerivedState['workbenchView']['announcements'];
  messages: WorkspaceDerivedState['workbenchView']['messages'];
  grades: WorkspaceDerivedState['workbenchView']['grades'];
  events: WorkspaceDerivedState['workbenchView']['events'];
  alerts: WorkspaceDerivedState['workbenchView']['alerts'];
  recentUpdates: WorkspaceDerivedState['workbenchView']['recentUpdates'];
}

export interface BuildWorkspaceExportInput extends WorkspaceDeriveOptions {
  preset: ExportPreset;
  format: ExportFormat;
}

const DEFAULT_FILTERS: WorkbenchFilter = {
  site: 'all',
  onlyUnseenUpdates: false,
};

function normalizeImportedSnapshot(candidate: unknown): ImportedWorkbenchSnapshot {
  const parsed = candidate as {
    generatedAt?: string;
    data?: Partial<ImportedWorkbenchSnapshot>;
  } & Partial<ImportedWorkbenchSnapshot>;

  if (parsed.data && typeof parsed.data === 'object') {
    return {
      generatedAt: parsed.generatedAt ?? parsed.data.generatedAt ?? new Date().toISOString(),
      planningSubstrates: parsed.data.planningSubstrates ?? [],
      resources: parsed.data.resources,
      assignments: parsed.data.assignments,
      announcements: parsed.data.announcements,
      messages: parsed.data.messages,
      grades: parsed.data.grades,
      events: parsed.data.events,
      syncRuns: parsed.data.syncRuns,
      changeEvents: parsed.data.changeEvents,
    };
  }

  return {
    generatedAt: parsed.generatedAt ?? new Date().toISOString(),
    planningSubstrates: parsed.planningSubstrates ?? [],
    resources: parsed.resources,
    assignments: parsed.assignments,
    announcements: parsed.announcements,
    messages: parsed.messages,
    grades: parsed.grades,
    events: parsed.events,
    syncRuns: parsed.syncRuns,
    changeEvents: parsed.changeEvents,
  };
}

async function withLoadedSnapshot<T>(
  snapshot: ImportedWorkbenchSnapshot,
  options: WorkspaceDeriveOptions,
  callback: (db: ReturnType<typeof createCampusCopilotDb>, now: string, filters: WorkbenchFilter) => Promise<T>,
) {
  const db = createCampusCopilotDb(`campus-copilot-workspace-sdk-${randomUUID()}`);
  const now = options.now ?? snapshot.generatedAt;
  const filters = options.filters ?? DEFAULT_FILTERS;

  try {
    await replaceImportedWorkbenchSnapshot(snapshot, db);
    return await callback(db, now, filters);
  } finally {
    db.close();
    await db.delete();
  }
}

export function parseWorkspaceSnapshot(raw: string): ImportedWorkbenchSnapshot {
  return normalizeImportedSnapshot(JSON.parse(raw));
}

export async function readWorkspaceSnapshotFile(path: string): Promise<ImportedWorkbenchSnapshot> {
  return parseWorkspaceSnapshot(await readFile(path, 'utf8'));
}

export async function deriveWorkspaceState(
  snapshot: ImportedWorkbenchSnapshot,
  options: WorkspaceDeriveOptions = {},
): Promise<WorkspaceDerivedState> {
  return withLoadedSnapshot(snapshot, options, async (db, now, filters) => {
    const [
      todaySnapshot,
      focusQueue,
      weeklyLoad,
      recentUpdates,
      priorityAlerts,
      changeEvents,
      syncRuns,
      workbenchView,
      siteCounts,
    ] = await Promise.all([
      getTodaySnapshot(now, db),
      getFocusQueue(now, db),
      getWeeklyLoad(now, db),
      getRecentUpdates(now, 8, db),
      getPriorityAlerts(now, db),
      getRecentChangeEvents(8, db),
      getLatestSyncRuns(4, db),
      getWorkbenchView(now, filters, db),
      getAllSiteEntityCounts(db),
    ]);

    return {
      now,
      filters,
      snapshot,
      todaySnapshot,
      focusQueue,
      weeklyLoad,
      recentUpdates,
      priorityAlerts,
      changeEvents,
      syncRuns,
      workbenchView,
      siteCounts,
    };
  });
}

export async function buildWorkspaceSummary(
  snapshot: ImportedWorkbenchSnapshot,
  options: WorkspaceDeriveOptions = {},
): Promise<WorkspaceSummary> {
  const derived = await deriveWorkspaceState(snapshot, options);

  return {
    generatedAt: snapshot.generatedAt,
    now: derived.now,
    totals: derived.todaySnapshot,
    focusQueueTop: derived.focusQueue.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      site: item.site,
      score: item.score,
      summary: item.summary,
    })),
    recentUpdateCount: derived.recentUpdates.items.length,
    siteCounts: derived.siteCounts,
    latestSyncRuns: derived.syncRuns,
  };
}

export async function buildSiteOverview(
  snapshot: ImportedWorkbenchSnapshot,
  site: Site,
  options: Omit<WorkspaceDeriveOptions, 'filters'> = {},
): Promise<SiteOverview> {
  const derived = await deriveWorkspaceState(snapshot, {
    ...options,
    filters: {
      site,
      onlyUnseenUpdates: false,
    },
  });

  return {
    site,
    counts:
      derived.siteCounts.find((entry) => entry.site === site) ?? {
        site,
        courses: 0,
        resources: 0,
        assignments: 0,
        announcements: 0,
        grades: 0,
        messages: 0,
        events: 0,
      },
    resources: derived.workbenchView.resources,
    assignments: derived.workbenchView.assignments,
    announcements: derived.workbenchView.announcements,
    messages: derived.workbenchView.messages,
    grades: derived.workbenchView.grades,
    events: derived.workbenchView.events,
    alerts: derived.workbenchView.alerts,
    recentUpdates: derived.workbenchView.recentUpdates,
  };
}

export async function createWorkspaceExport(
  snapshot: ImportedWorkbenchSnapshot,
  input: BuildWorkspaceExportInput,
): Promise<ExportArtifact> {
  const derived = await deriveWorkspaceState(snapshot, input);

  return createExportArtifact({
    preset: input.preset,
    format: input.format,
    input: {
      generatedAt: derived.now,
      viewTitle: `Workspace export (${derived.filters.site})`,
      planningSubstrates: derived.workbenchView.planningSubstrates,
      resources: derived.workbenchView.resources,
      assignments: derived.workbenchView.assignments,
      announcements: derived.workbenchView.announcements,
      messages: derived.workbenchView.messages,
      grades: derived.workbenchView.grades,
      events: derived.workbenchView.events,
      alerts: derived.workbenchView.alerts,
      timelineEntries: derived.recentUpdates.items,
      focusQueue: derived.focusQueue,
      weeklyLoad: derived.weeklyLoad,
      syncRuns: derived.syncRuns,
      changeEvents: derived.changeEvents,
    },
  });
}

export async function buildAiMessagesFromSnapshot(
  snapshot: ImportedWorkbenchSnapshot,
  input: Pick<AiRuntimeRequest, 'provider' | 'model' | 'question'> & WorkspaceDeriveOptions,
): Promise<ChatMessage[]> {
  const derived = await deriveWorkspaceState(snapshot, input);
  const currentViewExport = await createWorkspaceExport(snapshot, {
    preset: 'current_view',
    format: 'markdown',
    now: derived.now,
    filters: derived.filters,
  });

  const runtime = buildAiRuntimeMessages({
    provider: input.provider,
    model: input.model,
    question: input.question,
    toolResults: [
      { name: 'get_today_snapshot', payload: derived.todaySnapshot },
      { name: 'get_recent_updates', payload: derived.recentUpdates.items },
      { name: 'get_priority_alerts', payload: derived.priorityAlerts },
      {
        name: 'export_current_view',
        payload: {
          filename: currentViewExport.filename,
          format: currentViewExport.format,
          content: currentViewExport.content,
          decisionContext: {
            focusQueue: derived.focusQueue,
            weeklyLoad: derived.weeklyLoad,
            syncRuns: derived.syncRuns,
            recentChanges: derived.changeEvents,
          },
        },
      },
    ],
  });

  return [
    { role: 'system', content: runtime.systemPrompt },
    { role: 'user', content: runtime.userPrompt },
  ];
}

export const DEFAULT_WORKSPACE_PROVIDER: ProviderId = 'gemini';
