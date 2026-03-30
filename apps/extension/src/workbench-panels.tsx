import type { Dispatch, SetStateAction } from 'react';
import { browser } from 'wxt/browser';
import type { ExportPreset } from '@campus-copilot/exporter';
import type { SiteSyncOutcome } from '@campus-copilot/core';
import type { Alert, Assignment, EntityKind, Site } from '@campus-copilot/schema';
import type {
  ChangeEvent,
  FocusQueueItem,
  RecentUpdatesFeed,
  SyncRun,
  TodaySnapshot,
  WeeklyLoadEntry,
  WorkbenchFilter,
} from '@campus-copilot/storage';
import { formatDateTime, formatRelativeTime, type ResolvedUiLanguage } from './i18n';
import {
  type OrderedSiteStatusEntry,
  type SurfaceKind,
  SITE_LABELS,
} from './surface-shell-model';
import { getSiteStatusLabel, getSiteStatusTone, type UiText } from './surface-shell-view-helpers';
import type { DiagnosticsSummary } from './diagnostics';

export function WorkbenchPanels(props: {
  surface: SurfaceKind;
  copy: {
    eyebrow: string;
    title: string;
    description: string;
  };
  text: UiText;
  uiLanguage: ResolvedUiLanguage;
  selectedFormatLabel?: string;
  filters: WorkbenchFilter;
  setFilters: Dispatch<SetStateAction<WorkbenchFilter>>;
  todaySnapshot?: TodaySnapshot;
  currentRecentUpdates?: RecentUpdatesFeed;
  syncFeedback: {
    inFlightSite?: Site;
    outcome?: SiteSyncOutcome;
    message?: string;
  };
  exportFeedback?: string;
  currentSiteSelection?: Site;
  onSyncSite: (site: Site) => Promise<void>;
  onExport: (preset: ExportPreset) => Promise<void>;
  onMarkVisibleUpdatesSeen: () => Promise<void>;
  onExportDiagnostics: () => Promise<void>;
  diagnostics: DiagnosticsSummary;
  focusQueue: FocusQueueItem[];
  weeklyLoad: WeeklyLoadEntry[];
  priorityAlerts: Alert[];
  criticalAlerts: Alert[];
  highAlerts: Alert[];
  mediumAlerts: Alert[];
  currentAssignments: Assignment[];
  orderedSiteStatus: OrderedSiteStatusEntry[];
  recentChangeEvents: ChangeEvent[];
  latestSyncRun?: SyncRun;
  lastSuccessfulSync?: string;
  onTogglePin: (input: { entityId: string; site: Site; kind: EntityKind; pinned: boolean }) => Promise<void>;
  onSnooze: (input: { entityId: string; site: Site; kind: EntityKind }) => Promise<void>;
  onDismiss: (input: { entityId: string; site: Site; kind: EntityKind }) => Promise<void>;
  onNote: (input: { entityId: string; site: Site; kind: EntityKind; title: string; note?: string }) => Promise<void>;
}) {
  const {
    surface,
    copy,
    text,
    uiLanguage,
    selectedFormatLabel,
    filters,
    setFilters,
    todaySnapshot,
    currentRecentUpdates,
    syncFeedback,
    exportFeedback,
    currentSiteSelection,
    onSyncSite,
    onExport,
    onMarkVisibleUpdatesSeen,
    onExportDiagnostics,
    diagnostics,
    focusQueue,
    weeklyLoad,
    priorityAlerts,
    criticalAlerts,
    highAlerts,
    mediumAlerts,
    currentAssignments,
    orderedSiteStatus,
    recentChangeEvents,
    latestSyncRun,
    lastSuccessfulSync,
    onTogglePin,
    onSnooze,
    onDismiss,
    onNote,
  } = props;

  return (
    <>
      <div className="surface__hero">
        <div>
          <p className="surface__eyebrow">{copy.eyebrow}</p>
          <h1 className="surface__title">{copy.title}</h1>
          <p className="surface__copy">{copy.description}</p>
        </div>
        <div className="surface__hero-meta">
          <span>{text.meta.lastRefresh}: {formatRelativeTime(uiLanguage, lastSuccessfulSync)}</span>
          <span>{text.meta.defaultExport}: {selectedFormatLabel}</span>
        </div>
      </div>

      <div className="surface__grid surface__grid--stats">
        <article className="surface__panel surface__metric">
          <span className="surface__metric-value">{todaySnapshot?.totalAssignments ?? 0}</span>
          <span className="surface__metric-label">{text.metrics.openAssignments}</span>
        </article>
        <article className="surface__panel surface__metric">
          <span className="surface__metric-value">{todaySnapshot?.dueSoonAssignments ?? 0}</span>
          <span className="surface__metric-label">{text.metrics.dueWithin48Hours}</span>
        </article>
        <article className="surface__panel surface__metric">
          <span className="surface__metric-value">{currentRecentUpdates?.unseenCount ?? 0}</span>
          <span className="surface__metric-label">{text.metrics.unseenUpdates}</span>
        </article>
        <article className="surface__panel surface__metric">
          <span className="surface__metric-value">{todaySnapshot?.newGrades ?? 0}</span>
          <span className="surface__metric-label">{text.metrics.newGrades}</span>
        </article>
        <article className="surface__panel surface__metric">
          <span className="surface__metric-value">{todaySnapshot?.syncedSites ?? 0}</span>
          <span className="surface__metric-label">{text.metrics.syncedSites}</span>
        </article>
      </div>

      {surface !== 'options' ? (
        <div className="surface__toolbar">
          <div className="surface__chips">
            <button
              className={`surface__chip ${filters.site === 'all' ? 'surface__chip--active' : ''}`}
              onClick={() => setFilters((current) => ({ ...current, site: 'all' }))}
            >
              {text.toolbar.allSites}
            </button>
            {orderedSiteStatus.map((entry) => (
              <button
                key={entry.site}
                className={`surface__chip ${filters.site === entry.site ? 'surface__chip--active' : ''}`}
                onClick={() => setFilters((current) => ({ ...current, site: entry.site }))}
              >
                {SITE_LABELS[entry.site]}
              </button>
            ))}
          </div>

          <label className="surface__toggle">
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
            <span>{text.toolbar.onlyUnseen}</span>
          </label>
        </div>
      ) : null}

      <div className="surface__grid surface__grid--split">
        <article className="surface__panel">
          <h2>{text.todaySnapshot.title}</h2>
          <p>{text.todaySnapshot.description}</p>
          <ul className="surface__list">
            <li>{text.todaySnapshot.currentTodo}: {todaySnapshot?.totalAssignments ?? 0}</li>
            <li>{text.todaySnapshot.dueSoon}: {todaySnapshot?.dueSoonAssignments ?? 0}</li>
            <li>{text.todaySnapshot.recentUpdates}: {todaySnapshot?.recentUpdates ?? 0}</li>
            <li>{text.todaySnapshot.unseenInView}: {currentRecentUpdates?.unseenCount ?? 0}</li>
          </ul>
        </article>

        <article className="surface__panel">
          <h2>{text.quickActions.title}</h2>
          <p>{text.quickActions.description}</p>
          <div className="surface__actions surface__actions--wrap">
            <button
              className="surface__button"
              disabled={!currentSiteSelection || syncFeedback.inFlightSite === currentSiteSelection}
              onClick={() => (currentSiteSelection ? void onSyncSite(currentSiteSelection) : undefined)}
            >
              {currentSiteSelection
                ? syncFeedback.inFlightSite === currentSiteSelection
                  ? text.quickActions.syncInProgress(SITE_LABELS[currentSiteSelection])
                  : text.quickActions.syncCurrentSite(SITE_LABELS[currentSiteSelection])
                : text.quickActions.selectSiteBeforeSync}
            </button>
            <button className="surface__button surface__button--secondary" onClick={() => void onExport('current_view')}>
              {text.quickActions.openExport}
            </button>
            <button className="surface__button surface__button--secondary" onClick={() => void onMarkVisibleUpdatesSeen()}>
              {text.quickActions.markUpdatesSeen}
            </button>
            <button className="surface__button surface__button--ghost" onClick={() => void browser.runtime.openOptionsPage()}>
              {text.quickActions.openOptions}
            </button>
          </div>
          {syncFeedback.message ? <p className="surface__feedback">{syncFeedback.message}</p> : null}
          {exportFeedback ? <p className="surface__feedback">{exportFeedback}</p> : null}
        </article>
      </div>

      {surface !== 'popup' ? (
        <article className="surface__panel">
          <h2>{text.diagnostics.title}</h2>
          <p>{text.diagnostics.description}</p>
          <div className="surface__stack">
            <p className="surface__meta">
              {text.meta.currentStatus}: {diagnostics.healthy ? text.diagnostics.readyToContinue : text.diagnostics.blockedByEnvironmentOrRuntime}
            </p>
            {diagnostics.blockers.length > 0 ? (
              <ul className="surface__list">
                {diagnostics.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : (
              <p>{text.diagnostics.noBlockers}</p>
            )}
            {diagnostics.nextActions.length > 0 ? (
              <div className="surface__group">
                <h3>{text.diagnostics.nextActions}</h3>
                <ul className="surface__list">
                  {diagnostics.nextActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="surface__actions">
              <button className="surface__button surface__button--ghost" onClick={() => void onExportDiagnostics()}>
                {text.diagnostics.exportJson}
              </button>
            </div>
          </div>
        </article>
      ) : null}

      {surface !== 'popup' ? (
        <>
          <div className="surface__grid surface__grid--split">
            <article className="surface__panel">
              <h2>{text.focusQueue.title}</h2>
              <p>{text.focusQueue.description}</p>
              <div className="surface__stack">
                {focusQueue.length ? (
                  focusQueue.slice(0, 6).map((item) => (
                    <article className="surface__item" key={item.id}>
                      <div className="surface__item-header">
                        <strong>{item.title}</strong>
                        <span className="surface__badge surface__badge--neutral">{item.score}</span>
                      </div>
                      <p>{item.reasons.map((reason) => reason.label).join(' · ')}</p>
                      {item.note ? <p className="surface__meta">{text.focusQueue.editNote}: {item.note}</p> : null}
                      <p className="surface__meta">
                        {SITE_LABELS[item.site]}
                        {item.dueAt ? ` · ${text.currentTasks.dueAt(formatDateTime(uiLanguage, item.dueAt))}` : ''}
                      </p>
                      {item.blockedBy.length ? <p className="surface__meta">{item.blockedBy.join(' / ')}</p> : null}
                      {item.entityId && item.entityRef ? (
                        <div className="surface__actions surface__actions--wrap">
                          <button
                            className="surface__button surface__button--ghost"
                            onClick={() =>
                              void onTogglePin({
                                entityId: item.entityId!,
                                site: item.site,
                                kind: item.entityRef!.kind,
                                pinned: item.pinned,
                              })
                            }
                          >
                            {item.pinned ? text.focusQueue.unpin : text.focusQueue.pin}
                          </button>
                          <button
                            className="surface__button surface__button--ghost"
                            onClick={() =>
                              void onSnooze({
                                entityId: item.entityId!,
                                site: item.site,
                                kind: item.entityRef!.kind,
                              })
                            }
                          >
                            {text.focusQueue.snoozeUntilTomorrow}
                          </button>
                          <button
                            className="surface__button surface__button--ghost"
                            onClick={() =>
                              void onDismiss({
                                entityId: item.entityId!,
                                site: item.site,
                                kind: item.entityRef!.kind,
                              })
                            }
                          >
                            {text.focusQueue.dismissUntilTomorrow}
                          </button>
                          <button
                            className="surface__button surface__button--ghost"
                            onClick={() =>
                              void onNote({
                                entityId: item.entityId!,
                                site: item.site,
                                kind: item.entityRef!.kind,
                                title: item.title,
                                note: item.note,
                              })
                            }
                          >
                            {item.note ? text.focusQueue.editNote : text.focusQueue.addNote}
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p>{text.focusQueue.none}</p>
                )}
              </div>
            </article>

            <article className="surface__panel">
              <h2>{text.weeklyLoad.title}</h2>
              <p>{text.weeklyLoad.description}</p>
              <div className="surface__stack">
                {weeklyLoad.length ? (
                  weeklyLoad.map((entry) => (
                    <article className="surface__item" key={entry.dateKey}>
                      <div className="surface__item-header">
                        <strong>{entry.dateKey}</strong>
                        <span className={`surface__badge surface__badge--${entry.totalScore >= 200 ? 'critical' : entry.totalScore >= 120 ? 'warning' : 'neutral'}`}>
                          {text.weeklyLoad.score}: {entry.totalScore}
                        </span>
                      </div>
                      <p className="surface__meta">
                        {text.weeklyLoad.assignments} {entry.assignmentCount} · {text.weeklyLoad.dueSoon} {entry.dueSoonCount} · {text.weeklyLoad.overdue} {entry.overdueCount} · {text.weeklyLoad.pinned} {entry.pinnedCount}
                      </p>
                    </article>
                  ))
                ) : (
                  <p>{text.weeklyLoad.none}</p>
                )}
              </div>
            </article>
          </div>

          <div className="surface__grid surface__grid--split">
            <article className="surface__panel">
              <h2>{text.priorityAlerts.title}</h2>
              <p>{text.priorityAlerts.description}</p>
              <div className="surface__stack">
                {criticalAlerts.length > 0 ? (
                  <section className="surface__group">
                    <h3>{text.priorityAlerts.critical}</h3>
                    {criticalAlerts.map((alert) => (
                      <article className="surface__item" key={alert.id}>
                        <div className="surface__item-header">
                          <strong>{alert.title}</strong>
                          <span className={`surface__badge surface__badge--${alert.importance}`}>{alert.importance}</span>
                        </div>
                        <p>{alert.summary}</p>
                        <p className="surface__meta">
                          {SITE_LABELS[alert.site]} · {formatDateTime(uiLanguage, alert.triggeredAt)}
                        </p>
                      </article>
                    ))}
                  </section>
                ) : null}
                {highAlerts.length > 0 ? (
                  <section className="surface__group">
                    <h3>{text.priorityAlerts.high}</h3>
                    {highAlerts.map((alert) => (
                      <article className="surface__item" key={alert.id}>
                        <div className="surface__item-header">
                          <strong>{alert.title}</strong>
                          <span className={`surface__badge surface__badge--${alert.importance}`}>{alert.importance}</span>
                        </div>
                        <p>{alert.summary}</p>
                        <p className="surface__meta">
                          {SITE_LABELS[alert.site]} · {formatDateTime(uiLanguage, alert.triggeredAt)}
                        </p>
                      </article>
                    ))}
                  </section>
                ) : null}
                {mediumAlerts.length > 0 ? (
                  <section className="surface__group">
                    <h3>{text.priorityAlerts.medium}</h3>
                    {mediumAlerts.map((alert) => (
                      <article className="surface__item" key={alert.id}>
                        <div className="surface__item-header">
                          <strong>{alert.title}</strong>
                          <span className={`surface__badge surface__badge--${alert.importance}`}>{alert.importance}</span>
                        </div>
                        <p>{alert.summary}</p>
                        <p className="surface__meta">
                          {SITE_LABELS[alert.site]} · {formatDateTime(uiLanguage, alert.triggeredAt)}
                        </p>
                      </article>
                    ))}
                  </section>
                ) : null}
                {priorityAlerts.length === 0 ? <p>{text.priorityAlerts.none}</p> : null}
              </div>
            </article>

            <article className="surface__panel">
              <h2>{text.recentUpdates.title}</h2>
              <p>{text.recentUpdates.description}</p>
              <div className="surface__stack">
                {currentRecentUpdates?.items.length ? (
                  currentRecentUpdates.items.map((entry) => (
                    <article className="surface__item" key={entry.id}>
                      <div className="surface__item-header">
                        <strong>{entry.title}</strong>
                        <span className="surface__badge surface__badge--neutral">{entry.timelineKind}</span>
                      </div>
                      {entry.summary ? <p>{entry.summary}</p> : null}
                      <p className="surface__meta">
                        {SITE_LABELS[entry.site]} · {formatDateTime(uiLanguage, entry.occurredAt)}
                      </p>
                    </article>
                  ))
                ) : (
                  <p>{text.recentUpdates.none}</p>
                )}
              </div>
            </article>
          </div>

          <div className="surface__grid surface__grid--split">
            <article className="surface__panel">
              <h2>{text.currentTasks.title}</h2>
              <p>{text.currentTasks.description}</p>
              <div className="surface__stack">
                {currentAssignments.length ? (
                  currentAssignments.slice(0, surface === 'sidepanel' ? 8 : 4).map((assignment) => (
                    <article className="surface__item" key={assignment.id}>
                      <div className="surface__item-header">
                        <strong>{assignment.title}</strong>
                        <span className="surface__badge surface__badge--neutral">{assignment.status}</span>
                      </div>
                      <p className="surface__meta">
                        {SITE_LABELS[assignment.site]} · {assignment.dueAt ? text.currentTasks.dueAt(formatDateTime(uiLanguage, assignment.dueAt)) : text.meta.noTimeProvided}
                      </p>
                    </article>
                  ))
                ) : (
                  <p>{text.currentTasks.none}</p>
                )}
              </div>
            </article>

            <article className="surface__panel">
              <h2>{text.siteStatus.title}</h2>
              <p>{text.siteStatus.description}</p>
              <div className="surface__stack">
                {orderedSiteStatus.map((entry) => (
                  <article className="surface__item" key={entry.site} aria-label={SITE_LABELS[entry.site]}>
                    <div className="surface__item-header">
                      <strong>{SITE_LABELS[entry.site]}</strong>
                      <span className={`surface__badge surface__badge--${getSiteStatusTone(entry.sync?.lastOutcome, entry.sync?.status)}`}>
                        {getSiteStatusLabel(entry.sync?.lastOutcome, entry.sync?.status, text)}
                      </span>
                    </div>
                    <p className="surface__meta">{text.siteStatus.counts(entry.counts)}</p>
                    <p className="surface__meta">{text.meta.lastSync}: {formatRelativeTime(uiLanguage, entry.sync?.lastSyncedAt)}</p>
                    {entry.sync?.resourceFailures?.length ? (
                      <p>{text.siteStatus.resourceGaps(entry.sync.resourceFailures.map((item) => item.resource).join(' / '))}</p>
                    ) : null}
                    {entry.sync?.errorReason ? <p>{entry.sync.errorReason}</p> : null}
                    {entry.hint ? <p>{entry.hint}</p> : null}
                    <div className="surface__actions">
                      <button
                        className="surface__button surface__button--ghost"
                        disabled={syncFeedback.inFlightSite === entry.site}
                        onClick={() => void onSyncSite(entry.site)}
                      >
                        {syncFeedback.inFlightSite === entry.site ? text.siteStatus.syncing : text.siteStatus.syncButton(SITE_LABELS[entry.site])}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </div>

          <article className="surface__panel">
            <h2>{text.changeJournal.title}</h2>
            <p>{text.changeJournal.description}</p>
            {latestSyncRun ? (
              <p className="surface__meta">
                {SITE_LABELS[latestSyncRun.site]} · {formatDateTime(uiLanguage, latestSyncRun.completedAt)} · {latestSyncRun.outcome}
              </p>
            ) : null}
            <div className="surface__stack">
              {recentChangeEvents.length ? (
                recentChangeEvents.map((event) => (
                  <article className="surface__item" key={event.id}>
                    <div className="surface__item-header">
                      <strong>{event.title}</strong>
                      <span className="surface__badge surface__badge--neutral">{event.changeType}</span>
                    </div>
                    <p>{event.summary}</p>
                    <p className="surface__meta">
                      {SITE_LABELS[event.site]} · {formatDateTime(uiLanguage, event.occurredAt)}
                    </p>
                  </article>
                ))
              ) : (
                <p>{text.changeJournal.none}</p>
              )}
            </div>
          </article>
        </>
      ) : null}
    </>
  );
}
