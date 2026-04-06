import type { PriorityReason } from '@campus-copilot/schema';
import { formatDateTime, formatRelativeTime } from './i18n';
import { SITE_LABELS } from './surface-shell-model';
import {
  formatAlertImportanceLabel,
  formatAlertSummary,
  formatAlertTitle,
  formatAssignmentStatus,
  formatBlockedByList,
  formatChangeTypeLabel,
  formatChangeEventSummary,
  formatChangeEventTitle,
  formatChangeValue,
  formatFocusReason,
  formatLatestSyncReceipt,
  formatResourceGapList,
  formatSiteErrorReason,
  formatSiteTrustDetail,
  formatSyncOutcomeLabel,
  formatTimelineKindLabel,
  formatTimelineSummary,
  formatTimelineTitle,
  formatWeeklyLoadHighlights,
  getSiteStatusLabel,
  getSiteStatusTone,
} from './surface-shell-view-helpers';
import type { WorkbenchPanelsProps } from './workbench-panels-props';

type OverviewSectionProps = Pick<
  WorkbenchPanelsProps,
  | 'copy'
  | 'text'
  | 'uiLanguage'
  | 'selectedFormatLabel'
  | 'lastSuccessfulSync'
  | 'surface'
  | 'filters'
  | 'setFilters'
  | 'orderedSiteStatus'
  | 'todaySnapshot'
  | 'currentRecentUpdates'
  | 'syncFeedback'
  | 'exportFeedback'
  | 'currentSiteSelection'
  | 'onSyncSite'
  | 'onExport'
  | 'onOpenConfiguration'
  | 'onMarkVisibleUpdatesSeen'
  | 'diagnostics'
  | 'onExportDiagnostics'
  | 'focusQueue'
  | 'latestSyncRun'
>;

type DecisionSectionProps = Pick<
  WorkbenchPanelsProps,
  | 'text'
  | 'uiLanguage'
  | 'surface'
  | 'focusQueue'
  | 'weeklyLoad'
  | 'priorityAlerts'
  | 'criticalAlerts'
  | 'highAlerts'
  | 'mediumAlerts'
  | 'currentRecentUpdates'
  | 'onExport'
  | 'onTogglePin'
  | 'onSnooze'
  | 'onDismiss'
  | 'onNote'
>;

type OperationsSectionProps = Pick<
  WorkbenchPanelsProps,
  | 'text'
  | 'uiLanguage'
  | 'surface'
  | 'currentResources'
  | 'currentAnnouncements'
  | 'currentAssignments'
  | 'currentMessages'
  | 'currentEvents'
  | 'orderedSiteStatus'
  | 'syncFeedback'
  | 'onSyncSite'
  | 'onExport'
  | 'latestSyncRun'
  | 'recentChangeEvents'
>;

function getWeeklyLoadTone(entry: DecisionSectionProps['weeklyLoad'][number]) {
  if ((entry.overdueCount ?? 0) > 0 || entry.totalScore >= 200) {
    return 'critical';
  }

  if ((entry.dueSoonCount ?? 0) > 0 || entry.totalScore >= 120) {
    return 'warning';
  }

  return 'neutral';
}

function getResourceActionLabel(
  resource: OperationsSectionProps['currentResources'][number],
  text: OperationsSectionProps['text'],
) {
  switch (resource.resourceKind) {
    case 'link':
      return text.currentResources.openLink;
    case 'embed':
      return text.currentResources.openMaterial;
    default:
      return text.currentResources.openDownload;
  }
}

function renderAlertGroup(
  title: string,
  alerts: DecisionSectionProps['priorityAlerts'],
  uiLanguage: DecisionSectionProps['uiLanguage'],
) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <section className="surface__group">
      <h3>{title}</h3>
      {alerts.map((alert) => (
        <article className="surface__item" key={alert.id}>
          <div className="surface__item-header">
            <strong>{formatAlertTitle(alert, uiLanguage)}</strong>
            <span className={`surface__badge surface__badge--${alert.importance}`}>
              {formatAlertImportanceLabel(alert.importance, uiLanguage)}
            </span>
          </div>
          <p>{formatAlertSummary(alert, uiLanguage)}</p>
          <p className="surface__meta">
            {SITE_LABELS[alert.site]} · {formatDateTime(uiLanguage, alert.triggeredAt)}
          </p>
        </article>
      ))}
    </section>
  );
}

function getSiteTrustState(entry: OverviewSectionProps['orderedSiteStatus'][number]) {
  if (!entry.sync?.lastSyncedAt) {
    return 'notSynced';
  }

  if (entry.sync.status === 'error') {
    return 'blocked';
  }

  if (entry.sync.lastOutcome === 'partial_success') {
    return 'partial';
  }

  const lastSyncedAt = Date.parse(entry.sync.lastSyncedAt);
  if (!Number.isNaN(lastSyncedAt) && Date.now() - lastSyncedAt > 72 * 60 * 60 * 1000) {
    return 'stale';
  }

  return 'fresh';
}

function getSiteTrustTone(state: ReturnType<typeof getSiteTrustState>) {
  switch (state) {
    case 'fresh':
      return 'success';
    case 'partial':
    case 'stale':
      return 'warning';
    case 'blocked':
      return 'danger';
    default:
      return 'neutral';
  }
}

function getLocalizedReasonLabel(reason: PriorityReason | undefined, text: WorkbenchPanelsProps['text']) {
  if (!reason) {
    return undefined;
  }

  return text.priorityReasonLabels[reason.code];
}

export function WorkbenchOverviewSections({
  copy,
  text,
  uiLanguage,
  selectedFormatLabel,
  lastSuccessfulSync,
  surface,
  filters,
  setFilters,
  orderedSiteStatus,
  todaySnapshot,
  currentRecentUpdates,
  syncFeedback,
  exportFeedback,
  currentSiteSelection,
  onSyncSite,
  onExport,
  onOpenConfiguration,
  onMarkVisibleUpdatesSeen,
  diagnostics,
  onExportDiagnostics,
  focusQueue,
  latestSyncRun,
}: OverviewSectionProps) {
  const primaryFocusItem = focusQueue[0];
  const primaryReason = primaryFocusItem?.reasons[0];
  const additionalReasons = primaryFocusItem?.reasons.slice(1, 4) ?? [];
  const freshSiteCount = orderedSiteStatus.filter((entry) => getSiteTrustState(entry) === 'fresh').length;
  const partialSiteCount = orderedSiteStatus.filter((entry) => getSiteTrustState(entry) === 'partial').length;
  const staleSiteCount = orderedSiteStatus.filter((entry) => getSiteTrustState(entry) === 'stale').length;
  const blockedSiteCount = orderedSiteStatus.filter((entry) => getSiteTrustState(entry) === 'blocked').length;
  const notSyncedSiteCount = orderedSiteStatus.filter((entry) => getSiteTrustState(entry) === 'notSynced').length;

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

      {surface === 'sidepanel' ? (
        <div className="surface__grid surface__grid--split">
          <article className="surface__panel">
            <h2>{text.nextUp.title}</h2>
            <p>{text.nextUp.description}</p>
            <div className="surface__actions">
              <button className="surface__button surface__button--ghost" onClick={() => void onExport('focus_queue')}>
                {text.exportPresets.focusQueue}
              </button>
            </div>
            {primaryFocusItem ? (
              <div className="surface__stack">
                <article className="surface__item">
                  <div className="surface__item-header">
                    <strong>{primaryFocusItem.title}</strong>
                    <div className="surface__pill-row">
                      <span className="surface__badge surface__badge--neutral">{primaryFocusItem.score}</span>
                      {primaryReason ? (
                        <span className={`surface__badge surface__badge--${primaryReason.importance}`}>
                          {getLocalizedReasonLabel(primaryReason, text)}
                        </span>
                      ) : null}
                      {primaryFocusItem.pinned ? (
                        <span className="surface__badge surface__badge--neutral">{text.focusQueue.pinnedBadge}</span>
                      ) : null}
                    </div>
                  </div>
                  {primaryReason ? (
                    <div className="surface__group">
                      <p className="surface__meta surface__meta-label">{text.nextUp.whyFirst}</p>
                      <p className="surface__item-lead">{formatFocusReason(primaryReason, primaryFocusItem, uiLanguage)}</p>
                    </div>
                  ) : null}
                  <p className="surface__meta">
                    {SITE_LABELS[primaryFocusItem.site]}
                    {primaryFocusItem.dueAt ? ` · ${text.nextUp.dueLabel}: ${formatDateTime(uiLanguage, primaryFocusItem.dueAt)}` : ''}
                  </p>
                  {primaryFocusItem.note ? (
                    <p className="surface__meta">
                      {text.nextUp.noteLabel}: {primaryFocusItem.note}
                    </p>
                  ) : null}
                  {primaryFocusItem.summary ? <p>{primaryFocusItem.summary}</p> : null}
                  {primaryFocusItem.blockedBy.length ? (
                    <p className="surface__meta">
                      {text.nextUp.blockedByLabel}: {primaryFocusItem.blockedBy.join(' / ')}
                    </p>
                  ) : null}
                  {additionalReasons.length ? (
                    <div className="surface__group">
                      <p className="surface__meta surface__meta-label">{text.nextUp.otherSignals}</p>
                      <div className="surface__pill-row">
                        {additionalReasons.map((reason, index) => (
                          <span className="surface__pill" key={`${reason.code}:${index}`}>
                            {formatFocusReason(reason, primaryFocusItem, uiLanguage)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              </div>
            ) : (
              <p>{text.nextUp.none}</p>
            )}
          </article>

          <article className="surface__panel">
            <h2>{text.trustSummary.title}</h2>
            <p>{text.trustSummary.description}</p>
            <div className="surface__summary-grid">
              <div className="surface__summary-cell">
                <span className="surface__summary-value">{freshSiteCount}</span>
                <span className="surface__summary-label">{text.trustSummary.freshSites}</span>
              </div>
              <div className="surface__summary-cell">
                <span className="surface__summary-value">{partialSiteCount}</span>
                <span className="surface__summary-label">{text.trustSummary.partialSites}</span>
              </div>
              <div className="surface__summary-cell">
                <span className="surface__summary-value">{staleSiteCount}</span>
                <span className="surface__summary-label">{text.trustSummary.staleSites}</span>
              </div>
              <div className="surface__summary-cell">
                <span className="surface__summary-value">{blockedSiteCount}</span>
                <span className="surface__summary-label">{text.trustSummary.blockedSites}</span>
              </div>
              <div className="surface__summary-cell">
                <span className="surface__summary-value">{notSyncedSiteCount}</span>
                <span className="surface__summary-label">{text.trustSummary.notSyncedSites}</span>
              </div>
            </div>
            <div className="surface__stack">
              <p className="surface__meta">
                {text.trustSummary.unseenUpdates}: {currentRecentUpdates?.unseenCount ?? 0}
              </p>
              {latestSyncRun ? (
                <p className="surface__meta">
                  {text.trustSummary.latestReceipt}: {SITE_LABELS[latestSyncRun.site]} ·{' '}
                  {text.changeJournal.receipt(
                    latestSyncRun.changeCount,
                    formatSyncOutcomeLabel(latestSyncRun.outcome, text),
                  )}
                </p>
              ) : (
                <p className="surface__meta">{text.trustSummary.noRecentReceipt}</p>
              )}
              {diagnostics.blockers[0] ? (
                <p className="surface__meta">
                  {text.trustSummary.topBlocker}: {diagnostics.blockers[0]}
                </p>
              ) : null}
              {diagnostics.nextActions[0] ? (
                <p className="surface__meta">
                  {text.trustSummary.nextAction}: {diagnostics.nextActions[0]}
                </p>
              ) : null}
              <div className="surface__pill-row">
                {orderedSiteStatus.map((entry) => (
                  <span
                    className={`surface__pill surface__pill--${getSiteTrustTone(getSiteTrustState(entry))}`}
                    key={entry.site}
                  >
                    {SITE_LABELS[entry.site]} · {text.siteStatus.trustStates[getSiteTrustState(entry)]}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </div>
      ) : null}

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
            <button className="surface__button surface__button--ghost" onClick={() => void onOpenConfiguration()}>
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
    </>
  );
}

export function WorkbenchDecisionSections({
  text,
  uiLanguage,
  surface,
  focusQueue,
  weeklyLoad,
  priorityAlerts,
  criticalAlerts,
  highAlerts,
  mediumAlerts,
  currentRecentUpdates,
  onExport,
  onTogglePin,
  onSnooze,
  onDismiss,
  onNote,
}: DecisionSectionProps) {
  if (surface === 'popup') {
    return null;
  }

  return (
    <>
      <div className="surface__grid surface__grid--split">
        <article className="surface__panel">
          <h2>{text.focusQueue.title}</h2>
          <p>{text.focusQueue.description}</p>
          <div className="surface__actions">
            <button className="surface__button surface__button--ghost" onClick={() => void onExport('focus_queue')}>
              {text.exportPresets.focusQueue}
            </button>
          </div>
          <div className="surface__stack">
            {focusQueue.length ? (
              focusQueue.slice(0, 6).map((item) => (
                <article className="surface__item" key={item.id}>
                  <div className="surface__item-header">
                    <strong>{item.title}</strong>
                    <div className="surface__pill-row">
                      <span className="surface__badge surface__badge--neutral">{item.score}</span>
                      {item.reasons[0] ? (
                        <span className={`surface__badge surface__badge--${item.reasons[0].importance}`}>
                          {getLocalizedReasonLabel(item.reasons[0], text)}
                        </span>
                      ) : null}
                      {item.pinned ? (
                        <span className="surface__badge surface__badge--neutral">{text.focusQueue.pinnedBadge}</span>
                      ) : null}
                    </div>
                  </div>
                  {item.reasons[0] ? (
                    <p className="surface__item-lead">{formatFocusReason(item.reasons[0], item, uiLanguage)}</p>
                  ) : null}
                  {item.reasons.length > 1 ? (
                    <div className="surface__pill-row">
                      {item.reasons.slice(1, 4).map((reason, index) => (
                        <span className="surface__pill" key={`${reason.code}:${index}`}>
                          {formatFocusReason(reason, item, uiLanguage)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {item.summary ? <p>{item.summary}</p> : null}
                  {item.note ? <p className="surface__meta">{text.focusQueue.editNote}: {item.note}</p> : null}
                  <p className="surface__meta">
                    {SITE_LABELS[item.site]}
                    {item.dueAt ? ` · ${text.currentTasks.dueAt(formatDateTime(uiLanguage, item.dueAt))}` : ''}
                  </p>
                  {item.blockedBy.length ? (
                    <p className="surface__meta">{text.siteStatus.resourceGaps(formatBlockedByList(item.blockedBy, uiLanguage))}</p>
                  ) : null}
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
          <div className="surface__actions">
            <button className="surface__button surface__button--ghost" onClick={() => void onExport('weekly_load')}>
              {text.exportPresets.weeklyLoad}
            </button>
          </div>
          <div className="surface__stack">
            {weeklyLoad.length ? (
              weeklyLoad.map((entry) => (
                <article className="surface__item" key={entry.dateKey}>
                  <div className="surface__item-header">
                    <strong>{entry.dateKey}</strong>
                    <span className={`surface__badge surface__badge--${getWeeklyLoadTone(entry)}`}>
                      {text.weeklyLoad.score}: {entry.totalScore}
                    </span>
                  </div>
                  <p>{text.weeklyLoad.summary(entry)}</p>
                  <p className="surface__meta">
                    {text.weeklyLoad.assignments} {entry.assignmentCount} · {text.weeklyLoad.events} {entry.eventCount ?? 0} · {text.weeklyLoad.dueSoon} {entry.dueSoonCount} · {text.weeklyLoad.overdue} {entry.overdueCount} · {text.weeklyLoad.pinned} {entry.pinnedCount}
                  </p>
                  {formatWeeklyLoadHighlights(entry, uiLanguage).length ? (
                    <p className="surface__meta">{formatWeeklyLoadHighlights(entry, uiLanguage).join(' / ')}</p>
                  ) : null}
                  <p className="surface__meta">{text.weeklyLoad.items} {entry.items.length}</p>
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
            {renderAlertGroup(text.priorityAlerts.critical, criticalAlerts, uiLanguage)}
            {renderAlertGroup(text.priorityAlerts.high, highAlerts, uiLanguage)}
            {renderAlertGroup(text.priorityAlerts.medium, mediumAlerts, uiLanguage)}
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
                    <strong>{formatTimelineTitle(entry, uiLanguage)}</strong>
                    <span className="surface__badge surface__badge--neutral">
                      {formatTimelineKindLabel(entry.timelineKind, uiLanguage)}
                    </span>
                  </div>
                  {formatTimelineSummary(entry, uiLanguage) ? <p>{formatTimelineSummary(entry, uiLanguage)}</p> : null}
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
    </>
  );
}

export function WorkbenchOperationsSections({
  text,
  uiLanguage,
  surface,
  currentResources,
  currentAnnouncements,
  currentAssignments,
  currentMessages,
  currentEvents,
  orderedSiteStatus,
  syncFeedback,
  onSyncSite,
  onExport,
  latestSyncRun,
  recentChangeEvents,
}: OperationsSectionProps) {
  if (surface === 'popup') {
    return null;
  }

  const noticeSignalsCopy =
    uiLanguage === 'en'
      ? {
          title: 'Notice Signals',
          description:
            'Existing notice and announcement carriers stay visible here without inventing a standalone tuition or registration domain.',
          none: 'No current notice signals are visible in the current filter.',
          myuwBadge: 'MyUW notice',
          defaultBadge: 'Announcement',
        }
      : {
          title: '提醒信号',
          description: '这里展示现有的 notice / announcement 载体，不把它包装成独立的学费或注册新域。',
          none: '当前筛选下还没有可见的提醒信号。',
          myuwBadge: 'MyUW 提醒',
          defaultBadge: '公告',
        };

  return (
    <>
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
                    <span className="surface__badge surface__badge--neutral">
                      {formatAssignmentStatus(assignment.status, uiLanguage)}
                    </span>
                  </div>
                  <p className="surface__meta">
                    {SITE_LABELS[assignment.site]} · {assignment.dueAt ? text.currentTasks.dueAt(formatDateTime(uiLanguage, assignment.dueAt)) : text.meta.noTimeProvided}
                  </p>
                  {assignment.summary ? <p>{assignment.summary}</p> : null}
                  {assignment.detail ? <p className="surface__meta">{assignment.detail}</p> : null}
                  {assignment.score !== undefined || assignment.maxScore !== undefined ? (
                    <p className="surface__meta">
                      {assignment.score ?? '-'} / {assignment.maxScore ?? '-'}
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <p>{text.currentTasks.none}</p>
            )}
          </div>
        </article>

        <article className="surface__panel">
          <h2>{text.currentResources.title}</h2>
          <p>{text.currentResources.description}</p>
          <div className="surface__stack">
            {currentResources.length ? (
              currentResources.slice(0, surface === 'sidepanel' ? 8 : 4).map((resource) => (
                <article className="surface__item" key={resource.id}>
                  <div className="surface__item-header">
                    <strong>{resource.title}</strong>
                    <span className="surface__badge surface__badge--neutral">{resource.resourceKind}</span>
                  </div>
                  {resource.summary ? <p>{resource.summary}</p> : null}
                  {resource.detail ? <p className="surface__meta">{resource.detail}</p> : null}
                  <p className="surface__meta">
                    {SITE_LABELS[resource.site]}
                    {resource.releasedAt ? ` · ${text.currentResources.releasedAt(formatDateTime(uiLanguage, resource.releasedAt))}` : ''}
                  </p>
                  {resource.downloadUrl ? (
                    <p className="surface__meta">
                      <a
                        className="surface__resource-link"
                        href={resource.downloadUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {getResourceActionLabel(resource, text)}
                      </a>
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <p>{text.currentResources.none}</p>
            )}
          </div>
        </article>

        <article className="surface__panel">
          <h2>{text.discussionHighlights.title}</h2>
          <p>{text.discussionHighlights.description}</p>
          <div className="surface__stack">
            {currentMessages.length ? (
              currentMessages.slice(0, surface === 'sidepanel' ? 6 : 4).map((message) => (
                <article className="surface__item" key={message.id}>
                  <div className="surface__item-header">
                    <strong>{message.title ?? text.discussionHighlights.untitled}</strong>
                    <div className="surface__pill-row">
                      {message.unread ? (
                        <span className="surface__badge surface__badge--warning">{text.discussionHighlights.unread}</span>
                      ) : null}
                      {message.instructorAuthored ? (
                        <span className="surface__badge surface__badge--success">{text.discussionHighlights.staffReply}</span>
                      ) : null}
                    </div>
                  </div>
                  {message.summary ? <p>{message.summary}</p> : null}
                  <p className="surface__meta">
                    {SITE_LABELS[message.site]} · {formatDateTime(uiLanguage, message.updatedAt ?? message.createdAt)}
                  </p>
                </article>
              ))
            ) : (
              <p>{text.discussionHighlights.none}</p>
            )}
          </div>
        </article>
      </div>

      <article className="surface__panel">
        <h2>{noticeSignalsCopy.title}</h2>
        <p>{noticeSignalsCopy.description}</p>
        <div className="surface__stack">
          {currentAnnouncements.length ? (
            currentAnnouncements.slice(0, surface === 'sidepanel' ? 6 : 4).map((announcement) => (
              <article className="surface__item" key={announcement.id}>
                <div className="surface__item-header">
                  <strong>{announcement.title}</strong>
                  <span className="surface__badge surface__badge--neutral">
                    {announcement.site === 'myuw' ? noticeSignalsCopy.myuwBadge : noticeSignalsCopy.defaultBadge}
                  </span>
                </div>
                {announcement.summary ? <p>{announcement.summary}</p> : null}
                <p className="surface__meta">
                  {SITE_LABELS[announcement.site]}
                  {announcement.postedAt ? ` · ${formatDateTime(uiLanguage, announcement.postedAt)}` : ''}
                </p>
              </article>
            ))
          ) : (
            <p>{noticeSignalsCopy.none}</p>
          )}
        </div>
      </article>

      <div className="surface__grid surface__grid--split">
        <article className="surface__panel">
          <h2>{text.scheduleOutlook.title}</h2>
          <p>{text.scheduleOutlook.description}</p>
          <div className="surface__stack">
            {currentEvents.length ? (
              currentEvents.slice(0, surface === 'sidepanel' ? 6 : 4).map((event) => (
                <article className="surface__item" key={event.id}>
                  <div className="surface__item-header">
                    <strong>{event.title}</strong>
                    <span className="surface__badge surface__badge--neutral">{event.eventKind}</span>
                  </div>
                  {event.detail ?? event.summary ? <p>{event.detail ?? event.summary}</p> : null}
                  <p className="surface__meta">
                    {SITE_LABELS[event.site]}
                    {event.location ? ` · ${event.location}` : ''}
                    {event.startAt
                      ? ` · ${formatDateTime(uiLanguage, event.startAt)}`
                      : event.endAt
                        ? ` · ${formatDateTime(uiLanguage, event.endAt)}`
                        : ''}
                  </p>
                </article>
              ))
            ) : (
              <p>{text.scheduleOutlook.none}</p>
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
                  <p>{text.siteStatus.resourceGaps(formatResourceGapList(entry.sync.resourceFailures.map((item) => item.resource), uiLanguage))}</p>
                ) : null}
                <p className="surface__meta">{formatSiteTrustDetail(entry, uiLanguage, new Date().toISOString())}</p>
                {formatSiteErrorReason(entry.sync?.errorReason, uiLanguage) ? (
                  <p>{formatSiteErrorReason(entry.sync?.errorReason, uiLanguage)}</p>
                ) : null}
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
        <div className="surface__actions">
          <button className="surface__button surface__button--ghost" onClick={() => void onExport('change_journal')}>
            {text.exportPresets.changeJournal}
          </button>
        </div>
        {latestSyncRun ? (
          <>
            <p className="surface__meta">
              {SITE_LABELS[latestSyncRun.site]} · {formatDateTime(uiLanguage, latestSyncRun.completedAt)} · {formatSyncOutcomeLabel(latestSyncRun.outcome, text)}
            </p>
            <p>{formatLatestSyncReceipt(latestSyncRun, text)}</p>
          </>
        ) : null}
        {latestSyncRun?.resourceFailures?.length ? (
          <p className="surface__meta">{text.changeJournal.resourceGaps(formatResourceGapList(latestSyncRun.resourceFailures.map((item) => item.resource), uiLanguage))}</p>
        ) : null}
        {formatSiteErrorReason(latestSyncRun?.errorReason, uiLanguage) ? (
          <p className="surface__meta">{formatSiteErrorReason(latestSyncRun?.errorReason, uiLanguage)}</p>
        ) : null}
        <div className="surface__stack">
          {recentChangeEvents.length ? (
            recentChangeEvents.map((event) => (
              <article className="surface__item" key={event.id}>
                <div className="surface__item-header">
                  <strong>{formatChangeEventTitle(event, uiLanguage)}</strong>
                  <span className="surface__badge surface__badge--neutral">
                    {formatChangeTypeLabel(event.changeType, uiLanguage)}
                  </span>
                </div>
                <p>{formatChangeEventSummary(event, uiLanguage, text)}</p>
                {event.previousValue || event.nextValue ? (
                  <p className="surface__meta">
                    {formatChangeValue(event.previousValue, uiLanguage, text)} → {formatChangeValue(event.nextValue, uiLanguage, text)}
                  </p>
                ) : null}
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
  );
}
