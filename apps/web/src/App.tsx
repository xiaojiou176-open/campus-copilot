import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  resolveAiAnswer,
  type AiStructuredAnswer,
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
import { buildWorkbenchAiProxyRequest, buildWorkbenchExportInput } from '@campus-copilot/core';
import {
  createExportArtifact,
  type ExportArtifact,
  type ExportFormat,
  type ExportPreset,
} from '@campus-copilot/exporter';
import type { Site } from '@campus-copilot/schema';
import {
  campusCopilotDb,
  replaceImportedWorkbenchSnapshot,
  useAllSiteEntityCounts,
  useFocusQueue,
  useLatestSyncRuns,
  usePriorityAlerts,
  useRecentChangeEvents,
  useRecentUpdates,
  useTodaySnapshot,
  useWeeklyLoad,
  useWorkbenchView,
  type WorkbenchFilter,
  type WeeklyLoadEntry,
} from '@campus-copilot/storage';
import { DEMO_IMPORTED_SNAPSHOT, snapshotFromImportedJson } from './import-export-snapshot';

const SITE_ORDER: Site[] = ['canvas', 'gradescope', 'edstem', 'myuw'];

const SITE_LABELS: Record<Site, string> = {
  canvas: 'Canvas',
  gradescope: 'Gradescope',
  edstem: 'EdStem',
  myuw: 'MyUW',
};

const PROVIDERS: Array<{ value: ProviderId; label: string; model: string }> = [
  { value: 'openai', label: 'OpenAI', model: 'gpt-4.1-mini' },
  { value: 'gemini', label: 'Gemini', model: 'gemini-2.5-flash' },
  { value: 'switchyard', label: 'Switchyard', model: 'gpt-5' },
];

const EXPORT_FORMATS: ExportFormat[] = ['markdown', 'json', 'csv', 'ics'];

function formatDateTime(value: string | undefined) {
  if (!value) {
    return 'No time provided';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatRelativeTime(value: string | undefined) {
  if (!value) {
    return 'Not synced yet';
  }

  const deltaMinutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(deltaMinutes) < 60) {
    return formatter.format(deltaMinutes, 'minute');
  }
  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 48) {
    return formatter.format(deltaHours, 'hour');
  }
  return formatter.format(Math.round(deltaHours / 24), 'day');
}

function formatCountLabel(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function getResourceActionLabel(resourceKind: 'file' | 'link' | 'embed' | 'other') {
  switch (resourceKind) {
    case 'link':
      return 'Open link';
    case 'embed':
      return 'Open material';
    default:
      return 'Open download';
  }
}

function formatWeeklyLoadSummary(entry: WeeklyLoadEntry) {
  const highlights: string[] = [];
  if (entry.overdueCount > 0) {
    highlights.push(formatCountLabel(entry.overdueCount, 'overdue item', 'overdue items'));
  }
  if (entry.dueSoonCount > 0) {
    highlights.push(formatCountLabel(entry.dueSoonCount, 'item due within 48 hours', 'items due within 48 hours'));
  }
  if (entry.pinnedCount > 0) {
    highlights.push(formatCountLabel(entry.pinnedCount, 'pinned item', 'pinned items'));
  }
  if ((entry.eventCount ?? 0) > 0) {
    highlights.push(formatCountLabel(entry.eventCount ?? 0, 'calendar item', 'calendar items'));
  }

  const loadBand =
    entry.totalScore >= 200 ? 'High load' : entry.totalScore >= 120 ? 'Moderate load' : entry.totalScore > 0 ? 'Light load' : 'Clear lane';

  return highlights.length > 0 ? `${loadBand}: ${highlights.join(' · ')}.` : `${loadBand}: no new scheduling pressure right now.`;
}

const LOADING_INLINE_COPY = 'Loading shared workbench data...';

function LoadingInlineState() {
  return <p>{LOADING_INLINE_COPY}</p>;
}

function ReadyStateBlock({
  ready,
  hasItems,
  children,
  emptyState,
}: {
  ready: boolean;
  hasItems: boolean;
  children: ReactNode;
  emptyState: ReactNode;
}) {
  if (!ready) {
    return <LoadingInlineState />;
  }

  return hasItems ? <>{children}</> : <>{emptyState}</>;
}

function LoadingStatValue({ ready, value }: { ready: boolean; value: ReactNode }) {
  return ready ? (
    <strong>{value}</strong>
  ) : (
    <strong aria-busy="true">
      <span aria-hidden="true">—</span>
      <span className="sr-only">Loading</span>
    </strong>
  );
}

function downloadArtifact(artifact: ExportArtifact) {
  const blob = new Blob([artifact.content], {
    type: artifact.format === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = artifact.filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function App() {
  const [ready, setReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(() => new Date().toISOString());
  const [filters, setFilters] = useState<WorkbenchFilter>({ site: 'all', onlyUnseenUpdates: false });
  const [exportFormat, setExportFormat] = useState<ExportFormat>('markdown');
  const [feedback, setFeedback] = useState<string>('Loading shared workspace snapshot...');
  const [aiBaseUrl, setAiBaseUrl] = useState('http://127.0.0.1:8787');
  const [provider, setProvider] = useState<ProviderId>('gemini');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [switchyardProvider, setSwitchyardProvider] = useState<SwitchyardRuntimeProvider>('chatgpt');
  const [switchyardLane, setSwitchyardLane] = useState<SwitchyardLane>('web');
  const [question, setQuestion] = useState('What should I do first this week, and why?');
  const [aiPending, setAiPending] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string>();
  const [aiStructured, setAiStructured] = useState<AiStructuredAnswer>();
  const [aiNotice, setAiNotice] = useState<string>();
  const [aiError, setAiError] = useState<string>();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date().toISOString()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const bootstrapDelayMs =
        globalThis.navigator.webdriver
          ? Number(
              (
                globalThis as typeof globalThis & {
                  __CAMPUS_WEB_BOOTSTRAP_DELAY_MS__?: number;
                }
              ).__CAMPUS_WEB_BOOTSTRAP_DELAY_MS__ ?? 0,
            )
          : 0;

      if (Number.isFinite(bootstrapDelayMs) && bootstrapDelayMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, bootstrapDelayMs));
      }

      const existingCount =
        (await campusCopilotDb.assignments.count()) +
        (await campusCopilotDb.messages.count()) +
        (await campusCopilotDb.events.count());

      if (existingCount === 0) {
        await replaceImportedWorkbenchSnapshot(DEMO_IMPORTED_SNAPSHOT);
        setFeedback('Loaded demo workspace data on the shared schema/storage contract.');
      } else {
        setFeedback('Loaded the existing local web workspace snapshot.');
      }

      setReady(true);
      setRefreshKey((current) => current + 1);
    }

    void bootstrap();
  }, []);

  const todaySnapshot = useTodaySnapshot(now, undefined, refreshKey);
  const focusQueueResult = useFocusQueue(now, undefined, refreshKey);
  const weeklyLoadResult = useWeeklyLoad(now, undefined, refreshKey);
  const recentUpdates = useRecentUpdates(now, 8, undefined, refreshKey);
  const recentChangeEventsResult = useRecentChangeEvents(8, undefined, refreshKey);
  const priorityAlertsResult = usePriorityAlerts(now, undefined, refreshKey);
  const latestSyncRunsResult = useLatestSyncRuns(4, undefined, refreshKey);
  const siteCountsResult = useAllSiteEntityCounts(undefined, refreshKey);
  const workbenchView = useWorkbenchView(now, filters, undefined, refreshKey);

  const workbenchReady =
    ready &&
    todaySnapshot != null &&
    focusQueueResult != null &&
    weeklyLoadResult != null &&
    recentUpdates != null &&
    recentChangeEventsResult != null &&
    priorityAlertsResult != null &&
    latestSyncRunsResult != null &&
    siteCountsResult != null &&
    workbenchView != null;

  const focusQueue = focusQueueResult ?? [];
  const weeklyLoad = weeklyLoadResult ?? [];
  const recentChangeEvents = recentChangeEventsResult ?? [];
  const priorityAlerts = priorityAlertsResult ?? [];
  const latestSyncRuns = latestSyncRunsResult ?? [];
  const siteCounts = siteCountsResult ?? [];

  const currentResources = workbenchView?.resources ?? [];
  const currentAssignments = workbenchView?.assignments ?? [];
  const currentAnnouncements = workbenchView?.announcements ?? [];
  const currentMessages = workbenchView?.messages ?? [];
  const currentGrades = workbenchView?.grades ?? [];
  const currentEvents = workbenchView?.events ?? [];
  const currentAlerts = workbenchView?.alerts ?? [];

  const topSyncRun = latestSyncRuns[0];

  function handleExport(preset: ExportPreset) {
    const siteLabel = filters.site === 'all' ? 'All sites' : SITE_LABELS[filters.site];
    const artifact = createExportArtifact({
      preset,
      format: exportFormat,
      input: buildWorkbenchExportInput({
        preset,
        generatedAt: now,
        filters,
        resources: currentResources,
        assignments: currentAssignments,
        announcements: currentAnnouncements,
        messages: currentMessages,
        grades: currentGrades,
        events: currentEvents,
        alerts: currentAlerts,
        recentUpdates,
        focusQueue,
        weeklyLoad,
        syncRuns: latestSyncRuns,
        changeEvents: recentChangeEvents,
        presentation: {
          viewTitle: `Web workbench (${siteLabel})`,
        },
      }),
    });
    downloadArtifact(artifact);
    setFeedback(`Downloaded ${artifact.filename} from the same exporter contract used by the extension.`);
  }

  async function handleImportFile(file: File) {
    const raw = await file.text();
    const snapshot = snapshotFromImportedJson(raw);
    await replaceImportedWorkbenchSnapshot(snapshot);
    setRefreshKey((current) => current + 1);
    setFeedback('Imported a read-only workspace snapshot into the shared storage/read-model.');
  }

  async function handleResetDemo() {
    await replaceImportedWorkbenchSnapshot(DEMO_IMPORTED_SNAPSHOT);
    setRefreshKey((current) => current + 1);
    setFeedback('Reset the web workbench to the bundled demo snapshot.');
  }

  async function handleAskAi() {
    if (!question.trim()) {
      setAiError('Enter a question before asking for a cited answer.');
      return;
    }

    setAiPending(true);
    setAiError(undefined);
    setAiNotice(undefined);

    try {
      const siteLabel = filters.site === 'all' ? 'All sites' : SITE_LABELS[filters.site];
      const currentViewExport = createExportArtifact({
        preset: 'current_view',
        format: 'markdown',
        input: buildWorkbenchExportInput({
          preset: 'current_view',
          generatedAt: now,
          filters,
          resources: currentResources,
          assignments: currentAssignments,
          announcements: currentAnnouncements,
          messages: currentMessages,
          grades: currentGrades,
          events: currentEvents,
          alerts: currentAlerts,
          recentUpdates,
          focusQueue,
          weeklyLoad,
          syncRuns: latestSyncRuns,
          changeEvents: recentChangeEvents,
          presentation: {
            viewTitle: `Web workbench (${siteLabel})`,
          },
        }),
      });

      const request = buildWorkbenchAiProxyRequest({
        provider,
        model,
        switchyardProvider,
        switchyardLane,
        question,
        todaySnapshot:
          todaySnapshot ?? {
            totalAssignments: 0,
            dueSoonAssignments: 0,
            recentUpdates: 0,
            newGrades: 0,
            riskAlerts: 0,
            syncedSites: 0,
          },
        recentUpdates: recentUpdates?.items ?? [],
        alerts: priorityAlerts,
        focusQueue,
        weeklyLoad,
        syncRuns: latestSyncRuns,
        recentChanges: recentChangeEvents,
        currentViewExport,
      });

      const response = await fetch(`${aiBaseUrl}${request.route}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(request.body),
      });

      const payload = (await response.json()) as {
        answerText?: string;
        error?: string;
        structuredAnswer?: AiStructuredAnswer;
        citationCoverage?: 'structured_citations' | 'uncited_fallback' | 'no_answer';
      };
      const resolvedAnswer = resolveAiAnswer({
        answerText: payload.answerText,
        structuredAnswer: payload.structuredAnswer,
        citationCoverage: payload.citationCoverage,
      });

      if (!response.ok || payload.error || !resolvedAnswer.answerText) {
        throw new Error(payload.error ?? 'The provider did not return a displayable answer.');
      }

      setAiAnswer(resolvedAnswer.answerText);
      setAiStructured(resolvedAnswer.structuredAnswer);
      setAiNotice(
        resolvedAnswer.citationCoverage === 'uncited_fallback'
          ? 'The provider returned a displayable answer, but it did not include the structured citation block yet. Treat this as uncited fallback.'
          : undefined,
      );
      setFeedback(
        resolvedAnswer.citationCoverage === 'structured_citations'
          ? 'Fetched a cited AI answer through the same thin BFF contract.'
          : 'Fetched an AI answer through the same thin BFF contract, but it is still missing the structured citation block.',
      );
    } catch (error) {
      setAiStructured(undefined);
      setAiAnswer(undefined);
      setAiNotice(undefined);
      setAiError(error instanceof Error ? error.message : 'AI request failed.');
    } finally {
      setAiPending(false);
    }
  }

  const countsBySite = useMemo(
    () =>
      SITE_ORDER.map((site) => ({
        site,
        counts:
          siteCounts.find((entry) => entry.site === site) ?? {
            site,
            courses: 0,
            resources: 0,
            assignments: 0,
            announcements: 0,
            grades: 0,
            messages: 0,
            events: 0,
          },
      })),
    [siteCounts],
  );

  return (
    <main className="web-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Campus Copilot Web Workbench</p>
          <h1>Academic workbench</h1>
          <p className="lede">
            This standalone second surface stays on the same local-first, read-only contract as the
            extension workbench: one schema, one read-model, one exporter, and one cited-AI seam.
          </p>
        </div>
        <div className="hero-card">
          <p>State source</p>
          <strong>{ready ? 'Shared storage/read-model loaded' : 'Bootstrapping local workspace'}</strong>
          <span>Last refresh {formatRelativeTime(now)}</span>
        </div>
      </section>

      <section className="toolbar-card">
        <div className="toolbar-row">
          <button type="button" onClick={handleResetDemo}>
            Load demo workspace
          </button>
          <label className="file-button">
            Import current-view JSON
            <input
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImportFile(file);
                }
              }}
            />
          </label>
          <label>
            Export format
            <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
              {EXPORT_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Site filter
            <select
              value={filters.site}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  site: event.target.value as WorkbenchFilter['site'],
                }))
              }
            >
              <option value="all">All sites</option>
              {SITE_ORDER.map((site) => (
                <option key={site} value={site}>
                  {SITE_LABELS[site]}
                </option>
              ))}
            </select>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={filters.onlyUnseenUpdates}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  onlyUnseenUpdates: event.target.checked,
                }))
              }
            />
            <span className="toggle-label">Only unseen updates</span>
          </label>
        </div>
        <div className="toolbar-row">
          <button type="button" onClick={() => handleExport('current_view')}>
            Export current view
          </button>
          <button type="button" onClick={() => handleExport('focus_queue')}>
            Export focus queue
          </button>
          <button type="button" onClick={() => handleExport('weekly_load')}>
            Export weekly load
          </button>
          <button type="button" onClick={() => handleExport('change_journal')}>
            Export change journal
          </button>
        </div>
        <p className="feedback" role="status">
          {feedback}
        </p>
      </section>

      {!workbenchReady ? (
        <section className="panel loading-panel" role="status" aria-live="polite" aria-atomic="true">
          <h2>Loading shared workbench</h2>
          <p>
            Preparing the shared schema, read-model, and imported snapshot so the sections below render
            real values instead of temporary zero states.
          </p>
        </section>
      ) : null}

        <section className="stats-grid">
          <article className="stat-card">
            <span>Open assignments</span>
            <LoadingStatValue ready={workbenchReady} value={todaySnapshot?.totalAssignments ?? 0} />
          </article>
          <article className="stat-card">
            <span>Due soon</span>
            <LoadingStatValue ready={workbenchReady} value={todaySnapshot?.dueSoonAssignments ?? 0} />
          </article>
          <article className="stat-card">
            <span>Unseen updates</span>
            <LoadingStatValue ready={workbenchReady} value={recentUpdates?.unseenCount ?? 0} />
          </article>
          <article className="stat-card">
            <span>New grades</span>
            <LoadingStatValue ready={workbenchReady} value={todaySnapshot?.newGrades ?? 0} />
          </article>
        </section>

      <section className="split-grid">
        <article className="panel">
          <h2>Focus Queue</h2>
          <p>Decision-first ranking on the shared read-model.</p>
          <div className="stack">
            <ReadyStateBlock
              ready={workbenchReady}
              hasItems={focusQueue.length > 0}
              emptyState={<p>No focus items are active yet.</p>}
            >
              {focusQueue.slice(0, 6).map((item) => (
                <article className="item" key={item.id}>
                  <div className="item-header">
                    <strong>{item.title}</strong>
                    <span className="badge">score {item.score}</span>
                  </div>
                  {item.summary ? <p>{item.summary}</p> : null}
                  <p className="meta">
                    {SITE_LABELS[item.site]}
                    {item.dueAt ? ` · due ${formatDateTime(item.dueAt)}` : ''}
                  </p>
                </article>
              ))}
            </ReadyStateBlock>
          </div>
        </article>

        <article className="panel">
          <h2>Weekly Load</h2>
          <p>Planning view computed from the same normalized entities.</p>
          <div className="stack">
            <ReadyStateBlock
              ready={workbenchReady}
              hasItems={weeklyLoad.length > 0}
              emptyState={<p>No dated workload is visible yet.</p>}
            >
              {weeklyLoad.map((entry) => (
                <article className="item" key={entry.dateKey}>
                  <div className="item-header">
                    <strong>{entry.dateKey}</strong>
                    <span className="badge">score {entry.totalScore}</span>
                  </div>
                  <p>{formatWeeklyLoadSummary(entry)}</p>
                  <p className="meta">
                    assignments {entry.assignmentCount} · events {entry.eventCount ?? 0} · due soon {entry.dueSoonCount}
                  </p>
                </article>
              ))}
            </ReadyStateBlock>
          </div>
        </article>
      </section>

      <section className="split-grid">
        <article className="panel">
          <h2>Current Tasks</h2>
          <p>Wave 2 assignment detail now stays visible in the shared contract.</p>
          <div className="stack">
            <ReadyStateBlock
              ready={workbenchReady}
              hasItems={currentAssignments.length > 0}
              emptyState={<p>No structured tasks are visible in the current filter.</p>}
            >
              {currentAssignments.slice(0, 6).map((assignment) => (
                <article className="item" key={assignment.id}>
                  <div className="item-header">
                    <strong>{assignment.title}</strong>
                    <span className="badge">{assignment.status}</span>
                  </div>
                  {assignment.summary ? <p>{assignment.summary}</p> : null}
                  {assignment.detail ? <p className="meta">{assignment.detail}</p> : null}
                  <p className="meta">
                    {SITE_LABELS[assignment.site]}
                    {assignment.dueAt ? ` · due ${formatDateTime(assignment.dueAt)}` : ''}
                  </p>
                </article>
              ))}
            </ReadyStateBlock>
          </div>
        </article>

        <article className="panel">
          <h2>Discussion Highlights</h2>
          <p>EdStem thread depth stays on the same message entity contract.</p>
          <div className="stack">
            <ReadyStateBlock
              ready={workbenchReady}
              hasItems={currentMessages.length > 0}
              emptyState={<p>No discussion detail is visible in the current filter.</p>}
            >
              {currentMessages.slice(0, 6).map((message) => (
                <article className="item" key={message.id}>
                  <div className="item-header">
                    <strong>{message.title ?? 'Untitled discussion update'}</strong>
                    <div className="badge-row">
                      {message.unread ? <span className="badge badge-warning">unread</span> : null}
                      {message.instructorAuthored ? <span className="badge badge-success">staff</span> : null}
                    </div>
                  </div>
                  {message.summary ? <p>{message.summary}</p> : null}
                  <p className="meta">
                    {SITE_LABELS[message.site]} · {formatDateTime(message.updatedAt ?? message.createdAt)}
                  </p>
                </article>
              ))}
            </ReadyStateBlock>
          </div>
        </article>
      </section>

      <section className="panel">
        <h2>Study Materials</h2>
        <p>EdStem resources now land as first-class study materials on the same read-only workspace contract.</p>
        <div className="stack">
          <ReadyStateBlock
            ready={workbenchReady}
            hasItems={currentResources.length > 0}
            emptyState={<p>No study materials are visible in the current filter.</p>}
          >
            {currentResources.slice(0, 6).map((resource) => (
              <article className="item" key={resource.id}>
                <div className="item-header">
                  <strong>{resource.title}</strong>
                  <span className="badge">{resource.resourceKind}</span>
                </div>
                {resource.summary ? <p>{resource.summary}</p> : null}
                {resource.detail ? <p className="meta">{resource.detail}</p> : null}
                <p className="meta">
                  {SITE_LABELS[resource.site]}
                  {resource.releasedAt ? ` · released ${formatDateTime(resource.releasedAt)}` : ''}
                </p>
                {resource.downloadUrl ? (
                  <p className="meta">
                    <a className="resource-link" href={resource.downloadUrl} rel="noreferrer" target="_blank">
                      {getResourceActionLabel(resource.resourceKind)}
                    </a>
                  </p>
                ) : null}
              </article>
            ))}
          </ReadyStateBlock>
        </div>
      </section>

      <section className="panel">
        <h2>Notice Signals</h2>
        <p>
          Existing announcement carriers stay visible here when they matter for planning, without inventing a standalone
          tuition or registration domain.
        </p>
        <div className="stack">
          <ReadyStateBlock
            ready={workbenchReady}
            hasItems={currentAnnouncements.length > 0}
            emptyState={<p>No current notice signals are visible in the current filter.</p>}
          >
            {currentAnnouncements.slice(0, 6).map((announcement) => (
              <article className="item" key={announcement.id}>
                <div className="item-header">
                  <strong>{announcement.title}</strong>
                  <span className="badge">{announcement.site === 'myuw' ? 'MyUW notice' : 'announcement'}</span>
                </div>
                {announcement.summary ? <p>{announcement.summary}</p> : null}
                <p className="meta">
                  {SITE_LABELS[announcement.site]}
                  {announcement.postedAt ? ` · ${formatDateTime(announcement.postedAt)}` : ''}
                </p>
              </article>
            ))}
          </ReadyStateBlock>
        </div>
      </section>

      <section className="split-grid">
        <article className="panel">
          <h2>Schedule Outlook</h2>
          <p>MyUW class and exam location context stays tied to the same event entities.</p>
          <div className="stack">
            <ReadyStateBlock
              ready={workbenchReady}
              hasItems={currentEvents.length > 0}
              emptyState={<p>No upcoming class or exam detail is visible in the current filter.</p>}
            >
              {currentEvents.slice(0, 6).map((event) => (
                <article className="item" key={event.id}>
                  <div className="item-header">
                    <strong>{event.title}</strong>
                    <span className="badge">{event.eventKind}</span>
                  </div>
                  {event.detail ?? event.summary ? <p>{event.detail ?? event.summary}</p> : null}
                  <p className="meta">
                    {SITE_LABELS[event.site]}
                    {event.location ? ` · ${event.location}` : ''}
                    {event.startAt ? ` · ${formatDateTime(event.startAt)}` : ''}
                  </p>
                </article>
              ))}
            </ReadyStateBlock>
          </div>
        </article>

        <article className="panel">
          <h2>Change Journal</h2>
          <p>Recent receipts stay derived from sync runs plus change events, not from raw site pages.</p>
          {topSyncRun ? (
            <p className="meta">
              Latest sync {SITE_LABELS[topSyncRun.site]} · {formatDateTime(topSyncRun.completedAt)} · {topSyncRun.outcome}
            </p>
          ) : null}
          <div className="stack">
            <ReadyStateBlock
              ready={workbenchReady}
              hasItems={recentChangeEvents.length > 0}
              emptyState={<p>No change events are stored yet.</p>}
            >
              {recentChangeEvents.map((event) => (
                <article className="item" key={event.id}>
                  <div className="item-header">
                    <strong>{event.title}</strong>
                    <span className="badge">{event.changeType}</span>
                  </div>
                  <p>{event.summary}</p>
                  <p className="meta">
                    {SITE_LABELS[event.site]} · {formatDateTime(event.occurredAt)}
                  </p>
                </article>
              ))}
            </ReadyStateBlock>
          </div>
        </article>
      </section>

      <section className="panel">
        <h2>Imported site counts</h2>
        <p>This surface stays honest about what the imported snapshot currently contains.</p>
        {workbenchReady ? (
          <div className="counts-grid">
            {countsBySite.map((entry) => (
              <article className="count-card" key={entry.site}>
                <strong>{SITE_LABELS[entry.site]}</strong>
                <p>Resources {entry.counts.resources}</p>
                <p>Assignments {entry.counts.assignments}</p>
                <p>Messages {entry.counts.messages}</p>
                <p>Events {entry.counts.events}</p>
                <p>Grades {entry.counts.grades}</p>
              </article>
            ))}
          </div>
        ) : (
          <p>Loading site counts from the shared read-model...</p>
        )}
      </section>

      <section className="panel ai-panel">
        <div className="item-header">
          <h2>Cited AI</h2>
          <span className="badge">same thin BFF</span>
        </div>
        <p>
          The web surface keeps the same AI-after-structure rule: export the current workbench, then
          ask for an explanation over structured data.
        </p>
        <div className="ai-controls">
          <label>
            BFF base URL
            <input value={aiBaseUrl} onChange={(event) => setAiBaseUrl(event.target.value)} />
          </label>
          <label>
            Provider
            <select
              value={provider}
              onChange={(event) => {
                const nextProvider = event.target.value as ProviderId;
                setProvider(nextProvider);
                setModel(PROVIDERS.find((item) => item.value === nextProvider)?.model ?? model);
              }}
            >
              {PROVIDERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model
            <input value={model} onChange={(event) => setModel(event.target.value)} />
          </label>
          {provider === 'switchyard' ? (
            <>
              <label>
                Switchyard runtime provider
                <select
                  value={switchyardProvider}
                  onChange={(event) => setSwitchyardProvider(event.target.value as SwitchyardRuntimeProvider)}
                >
                  <option value="chatgpt">ChatGPT</option>
                  <option value="gemini">Gemini</option>
                  <option value="claude">Claude</option>
                  <option value="grok">Grok</option>
                  <option value="qwen">Qwen</option>
                </select>
              </label>
              <label>
                Switchyard lane
                <select
                  value={switchyardLane}
                  onChange={(event) => setSwitchyardLane(event.target.value as SwitchyardLane)}
                >
                  <option value="web">web</option>
                  <option value="byok">byok</option>
                </select>
              </label>
            </>
          ) : null}
        </div>
        <label className="question-field">
          Question
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={4} />
        </label>
        <div className="toolbar-row">
          <button type="button" onClick={() => void handleAskAi()} disabled={aiPending}>
            {aiPending ? 'Asking AI…' : 'Ask AI'}
          </button>
        </div>
        {aiError ? <p className="error">{aiError}</p> : null}
        {aiNotice ? <p className="feedback">{aiNotice}</p> : null}
        {aiAnswer ? <p className="answer">{aiAnswer}</p> : null}
        {aiStructured ? (
          <div className="ai-structured">
            <p className="meta-title">Summary</p>
            <p>{aiStructured.summary}</p>
            <p className="meta-title">Key points</p>
            <ul>
              {aiStructured.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            {aiStructured.nextActions.length ? (
              <>
                <p className="meta-title">Suggested next actions</p>
                <ul>
                  {aiStructured.nextActions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {aiStructured.citations.length ? (
              <>
                <p className="meta-title">Citations</p>
                <ul>
                  {aiStructured.citations.map((citation) => (
                    <li key={`${citation.entityId}:${citation.kind}`}>
                      {citation.site} · {citation.title}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
