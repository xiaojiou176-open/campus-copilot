import { getAiSitePolicyOverlay, type AiStructuredAnswer, type ProviderId, type SwitchyardLane, type SwitchyardRuntimeProvider } from '@campus-copilot/ai';
import type { ExportArtifact } from '@campus-copilot/exporter';
import type { Site } from '@campus-copilot/schema';
import type {
  AdministrativeSummary,
  ChangeEvent,
  CourseCluster,
  FocusQueueItem,
  MergeHealthSummary,
  PlanningSubstrateOwner,
  RecentUpdatesFeed,
  SiteEntityCounts,
  SyncRun,
  TodaySnapshot,
  WeeklyLoadEntry,
  WorkItemCluster,
} from '@campus-copilot/storage';
import type { ImportedArtifactEnvelope } from './import-export-snapshot';
import { LoadingStatValue, ReadyStateBlock, formatDateTime, formatWeeklyLoadSummary, getResourceActionLabel } from './web-view-helpers';

const ADMINISTRATIVE_SITES = new Set<Site>(['myuw', 'time-schedule']);

function isAdministrativeSite(site: Site) {
  return ADMINISTRATIVE_SITES.has(site);
}

function getLaneLabel(site: Site) {
  return isAdministrativeSite(site) ? 'Administrative' : 'Academic';
}

function getLaneBadgeClass(site: Site) {
  return isAdministrativeSite(site) ? 'badge badge-warning' : 'badge badge-success';
}

export function WebWorkbenchPanels(props: {
  workbenchReady: boolean;
  todaySnapshot?: TodaySnapshot;
  recentUpdates?: RecentUpdatesFeed;
  currentViewExport?: ExportArtifact;
  importedEnvelope?: ImportedArtifactEnvelope;
  focusQueue: FocusQueueItem[];
  planningSubstrates: PlanningSubstrateOwner[];
  weeklyLoad: WeeklyLoadEntry[];
  courseClusters?: CourseCluster[];
  workItemClusters?: WorkItemCluster[];
  administrativeSummaries?: AdministrativeSummary[];
  mergeHealth?: MergeHealthSummary;
  currentAssignments: Array<{
    id: string;
    site: Site;
    title: string;
    status: string;
    summary?: string;
    detail?: string;
    dueAt?: string;
  }>;
  currentMessages: Array<{
    id: string;
    site: Site;
    title?: string;
    summary?: string;
    unread?: boolean;
    instructorAuthored?: boolean;
    updatedAt?: string;
    createdAt?: string;
  }>;
  currentResources: Array<{
    id: string;
    site: Site;
    title: string;
    resourceKind: 'file' | 'link' | 'embed' | 'other';
    summary?: string;
    detail?: string;
    releasedAt?: string;
    downloadUrl?: string;
  }>;
  currentAnnouncements: Array<{
    id: string;
    site: Site;
    title: string;
    summary?: string;
    postedAt?: string;
  }>;
  currentEvents: Array<{
    id: string;
    site: Site;
    title: string;
    eventKind: string;
    detail?: string;
    summary?: string;
    location?: string;
    startAt?: string;
  }>;
  recentChangeEvents: ChangeEvent[];
  countsBySite: Array<{
    site: Site;
    counts: SiteEntityCounts;
  }>;
  topSyncRun?: SyncRun;
  siteLabels: Record<Site, string>;
}) {
  const latestPlanningSubstrate = [...props.planningSubstrates].sort((left, right) => {
    const leftAt = Date.parse(left.lastUpdatedAt ?? left.capturedAt);
    const rightAt = Date.parse(right.lastUpdatedAt ?? right.capturedAt);
    return (Number.isNaN(rightAt) ? 0 : rightAt) - (Number.isNaN(leftAt) ? 0 : leftAt);
  })[0];
  const academicFocusCount = props.focusQueue.filter((item) => !isAdministrativeSite(item.site)).length;
  const administrativeFocusCount = props.focusQueue.filter((item) => isAdministrativeSite(item.site)).length;
  const academicUpdateCount = props.recentChangeEvents.filter((event) => !isAdministrativeSite(event.site)).length;
  const administrativeUpdateCount = props.recentChangeEvents.filter((event) => isAdministrativeSite(event.site)).length;
  const academicWeeklyDays = props.weeklyLoad.filter((entry) => entry.items.some((item) => !isAdministrativeSite(item.site))).length;
  const administrativeNoticeCount = props.currentAnnouncements.filter((announcement) => isAdministrativeSite(announcement.site)).length;
  const administrativeScheduleCount = props.currentEvents.filter((event) => isAdministrativeSite(event.site)).length;
  const courseClusters = props.courseClusters ?? [];
  const workItemClusters = props.workItemClusters ?? [];
  const administrativeSummaries = props.administrativeSummaries ?? [];
  const mergedCourseCount = courseClusters.length;
  const mergedWorkItemCount = workItemClusters.length;
  const currentScope = props.currentViewExport?.scope;
  const currentPackaging = props.currentViewExport?.packaging;
  const importedScope = props.importedEnvelope?.scope;
  const importedPackaging = props.importedEnvelope?.packaging;
  const currentOverlay = getAiSitePolicyOverlay(currentScope?.site);
  const summaryFamilies = [...new Set(administrativeSummaries.map((summary) => summary.family))];
  const exportFirstFamilies = [...new Set(currentOverlay?.exportOnlyFamilies ?? [])];

  function getSiteLabel(site?: string) {
    if (!site) {
      return 'All visible sites';
    }
    if (site === 'myplan') {
      return 'MyPlan';
    }
    return props.siteLabels[site as Site] ?? site;
  }

  function formatScopeLine(scope?: { site?: string; scopeType?: string; resourceFamily?: string; courseIdOrKey?: string }) {
    if (!scope) {
      return 'Waiting for a loaded workbench slice';
    }
    const courseLabel = scope.courseIdOrKey ? ` · ${scope.courseIdOrKey}` : '';
    return `${getSiteLabel(scope.site)} · ${scope.scopeType ?? 'unknown scope'} · ${scope.resourceFamily ?? 'unknown family'}${courseLabel}`;
  }

  function formatProvenance() {
    const labels = importedPackaging?.provenance ?? currentPackaging?.provenance;
    if (!labels?.length) {
      return 'No provenance chain is visible yet.';
    }
    return labels.map((entry) => entry.label).join(' · ');
  }

  return (
    <>
      {!props.workbenchReady ? (
        <section className="panel loading-panel" role="status" aria-live="polite" aria-atomic="true">
          <h2>Loading shared workbench</h2>
          <p>
            Preparing the shared schema, read-model, and imported snapshot so the sections below render
            real values instead of temporary zero states.
          </p>
        </section>
      ) : null}

      <section className="split-grid split-grid--primary">
        <article className="panel panel--decision">
          <h2>Focus Queue</h2>
          <p>Decision-first ranking on the shared read-model.</p>
          <div className="stack">
            <ReadyStateBlock
              ready={props.workbenchReady}
              hasItems={props.focusQueue.length > 0}
              emptyState={<p>No focus items are active yet.</p>}
            >
              {props.focusQueue.slice(0, 6).map((item) => (
                <article className="item" key={item.id}>
                  <div className="item-header">
                    <strong>{item.title}</strong>
                    <div className="badge-row">
                      <span className={getLaneBadgeClass(item.site)}>{getLaneLabel(item.site)}</span>
                      <span className="badge">score {item.score}</span>
                    </div>
                  </div>
                  {item.summary ? <p>{item.summary}</p> : null}
                  <p className="meta">
                    {props.siteLabels[item.site]}
                    {item.dueAt ? ` · due ${formatDateTime(item.dueAt)}` : ''}
                  </p>
                </article>
              ))}
            </ReadyStateBlock>
          </div>
        </article>

        <article className="panel panel--decision">
          <h2>Weekly Load</h2>
          <p>Planning view computed from the same normalized entities.</p>
          <div className="stack">
            <ReadyStateBlock
              ready={props.workbenchReady}
              hasItems={props.weeklyLoad.length > 0}
              emptyState={<p>No dated workload is visible yet.</p>}
            >
              {props.weeklyLoad.map((entry) => (
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

      <section className="stats-grid stats-grid--quiet">
        <article className="stat-card">
          <span>Open assignments</span>
          <LoadingStatValue ready={props.workbenchReady} value={props.todaySnapshot?.totalAssignments ?? 0} />
        </article>
        <article className="stat-card">
          <span>Due soon</span>
          <LoadingStatValue ready={props.workbenchReady} value={props.todaySnapshot?.dueSoonAssignments ?? 0} />
        </article>
        <article className="stat-card">
          <span>Unseen updates</span>
          <LoadingStatValue ready={props.workbenchReady} value={props.recentUpdates?.unseenCount ?? 0} />
        </article>
        <article className="stat-card">
          <span>New grades</span>
          <LoadingStatValue ready={props.workbenchReady} value={props.todaySnapshot?.newGrades ?? 0} />
        </article>
      </section>

      <section className="split-grid split-grid--secondary">
        <article className="panel">
          <p className="eyebrow">Grouped student view</p>
          <h2>Academic lane</h2>
          <p>Course work keeps the same priority sorter, but now reads as an explicit academic lane instead of a generic mixed list.</p>
          <div className="badge-row">
            <span className="badge">Unified priority</span>
            <span className="badge badge-success">Academic</span>
          </div>
          <p className="meta">
            {academicFocusCount} ranked item(s) · {academicWeeklyDays} active planning day(s) · {academicUpdateCount} change receipt(s)
          </p>
        </article>

        <article className="panel">
          <p className="eyebrow">Grouped student view</p>
          <h2>Administrative lane</h2>
          <p>MyUW signals and schedule context now read as one administrative line without splitting into a second product.</p>
          <div className="badge-row">
            <span className="badge">Unified priority</span>
            <span className="badge badge-warning">Administrative</span>
          </div>
          <p className="meta">
            {administrativeFocusCount} ranked item(s) · {administrativeUpdateCount} change receipt(s) · {administrativeNoticeCount} notice signal(s)
          </p>
          <p className="meta">{administrativeScheduleCount} schedule context item(s)</p>
        </article>
      </section>

      <section className="panel panel--supporting">
        <p className="eyebrow">Trust center</p>
        <h2>Auth &amp; Export Management</h2>
        <p>
          Review the current scope, policy envelope, provenance, and site overlay before exporting or asking AI.
          This lane stays read-only and works like a review desk, not a preset wall.
        </p>
        <div className="ai-explanation-strip" aria-label="Auth and export management">
          <article className="guidance-card">
            <p className="meta-title">Review scope</p>
            <strong>{formatScopeLine(currentScope)}</strong>
            <p>
              {props.importedEnvelope
                ? `Imported snapshot: ${props.importedEnvelope.title ?? 'Untitled artifact'} · ${formatScopeLine(importedScope)} · generated ${formatDateTime(
                    props.importedEnvelope.generatedAt,
                  )}.`
                : 'No imported envelope is overriding the current local read-model view, so this review lane is reading the live web workbench slice.'}
            </p>
          </article>
          <article className={`guidance-card ${currentPackaging?.aiAllowed ? '' : 'guidance-card--warning'}`}>
            <p className="meta-title">Current policy envelope</p>
            <strong>
              {currentPackaging
                ? `Read/export ${currentPackaging.authorizationLevel} · AI ${currentPackaging.aiAllowed ? 'allowed' : 'blocked'}`
                : 'No live export envelope yet'}
            </strong>
            <p>
              {currentPackaging
                ? `Risk ${currentPackaging.riskLabel} · match ${currentPackaging.matchConfidence} · provenance ${currentPackaging.provenance.length}. ${
                    currentPackaging.aiAllowed
                      ? 'Layer 2 is currently visible for this slice.'
                      : 'Layer 2 is still blocked, so AI must stay behind the trust desk.'
                  }`
                : 'Load a shared workbench slice before treating this web surface as export-ready.'}
            </p>
          </article>
          <article className="guidance-card">
            <p className="meta-title">Provenance and imported receipt</p>
            <strong>{importedPackaging ? 'Imported envelope retained' : 'Using current workbench packaging'}</strong>
            <p>
              {formatProvenance()}
            </p>
          </article>
          <article className="guidance-card">
            <p className="meta-title">Site policy overlay and review honesty</p>
            <strong>
              {currentOverlay ? currentOverlay.siteLabel : 'Multi-site or unloaded view'}
            </strong>
            <p>
              {currentOverlay
                ? `Allowed: ${currentOverlay.allowedFamilies.join(', ')}. Export-first: ${
                    currentOverlay.exportOnlyFamilies.join(', ') || 'none'
                  }. Forbidden AI objects: ${currentOverlay.forbiddenAiObjects.join(', ') || 'none'}. `
                : 'Choose a site-scoped slice to review the active site overlay and carrier honesty notes. '}
              {summaryFamilies.length > 0
                ? `Summary-first admin lanes: ${summaryFamilies.join(', ')}. `
                : 'No administrative summary families are visible in this slice. '}
              {summaryFamilies.length > 0
                ? ''
                : ''}
              {exportFirstFamilies.length > 0
                ? `Export-first families in this view: ${exportFirstFamilies.join(', ')}. `
                : 'No site-scoped export-first families are visible in this slice yet. '}
              {props.planningSubstrates.length > 0 ? `Planning substrate(s): ${props.planningSubstrates.length} read-only lane(s).` : 'No planning substrate is visible in this slice.'}
            </p>
          </article>
        </div>
        {importedPackaging ? (
          <p className="meta">
            Imported envelope keeps its own posture: read/export {importedPackaging.authorizationLevel} · AI{' '}
            {importedPackaging.aiAllowed ? 'allowed' : 'blocked'} · risk {importedPackaging.riskLabel} · match{' '}
            {importedPackaging.matchConfidence}.
          </p>
        ) : null}
      </section>

      <section className="split-grid split-grid--primary">
        <article className="panel">
          <h2>Merge Health</h2>
          <p>The shared ledger now keeps a separate course/work-item rollup instead of leaving every source as a loose receipt.</p>
          <div className="stack">
            <article className="item">
              <div className="item-header">
                <strong>Course clusters</strong>
                <span className="badge">{mergedCourseCount}</span>
              </div>
              <p className="meta">
                merged {props.mergeHealth?.mergedCount ?? 0} · possible match {props.mergeHealth?.possibleMatchCount ?? 0}
              </p>
            </article>
            <article className="item">
              <div className="item-header">
                <strong>Work-item clusters</strong>
                <span className="badge">{mergedWorkItemCount}</span>
              </div>
              <p className="meta">
                unresolved {props.mergeHealth?.unresolvedCount ?? 0} · authority conflicts {props.mergeHealth?.authorityConflictCount ?? 0}
              </p>
            </article>
          </div>
        </article>

      </section>

      <section className="split-grid split-grid--primary">
        <article className="panel">
          <h2>Course panorama</h2>
          <p>Course clusters keep the multi-site class picture together before deeper authority merge reasoning.</p>
          <div className="stack">
            <ReadyStateBlock
              ready={props.workbenchReady}
              hasItems={courseClusters.length > 0}
              emptyState={<p>No course clusters are visible yet.</p>}
            >
              {courseClusters.slice(0, 6).map((cluster) => (
                <article className="item" key={cluster.id}>
                  <div className="item-header">
                    <strong>{cluster.displayTitle}</strong>
                    <div className="badge-row">
                      <span className="badge">{cluster.confidenceBand}</span>
                      {cluster.needsReview ? <span className="badge badge-warning">Possible match</span> : <span className="badge badge-success">Merged</span>}
                    </div>
                  </div>
                  <p>{cluster.summary}</p>
                  <p className="meta">
                    {cluster.relatedSites.join(' · ')} · authority {cluster.authoritySurface}
                  </p>
                </article>
              ))}
            </ReadyStateBlock>
          </div>
        </article>

        <article className="panel">
          <h2>Merged work items</h2>
          <p>These are the higher-level task rollups that sit above any single site row.</p>
          <div className="stack">
            <ReadyStateBlock
              ready={props.workbenchReady}
              hasItems={workItemClusters.length > 0}
              emptyState={<p>No merged work items are visible yet.</p>}
            >
              {workItemClusters.slice(0, 6).map((cluster) => (
                <article className="item" key={cluster.id}>
                  <div className="item-header">
                    <strong>{cluster.title}</strong>
                    <div className="badge-row">
                      <span className="badge">{cluster.workType}</span>
                      <span className={cluster.needsReview ? 'badge badge-warning' : 'badge badge-success'}>{cluster.confidenceBand}</span>
                    </div>
                  </div>
                  <p>{cluster.summary}</p>
                  <p className="meta">
                    authority {cluster.authoritySurface}
                    {cluster.dueAt ? ` · due ${formatDateTime(cluster.dueAt)}` : ''}
                  </p>
                </article>
              ))}
            </ReadyStateBlock>
          </div>
        </article>
      </section>

      <section className="panel">
        <h2>Administrative snapshots</h2>
        <p>High-sensitivity administrative surfaces stay summary-first here and still prefer export/review before AI.</p>
        <div className="stack">
          <ReadyStateBlock
            ready={props.workbenchReady}
            hasItems={administrativeSummaries.length > 0}
            emptyState={<p>No administrative summaries are visible yet.</p>}
          >
            {administrativeSummaries.map((summary) => (
              <article className="item" key={summary.id}>
                <div className="item-header">
                  <strong>{summary.title}</strong>
                  <div className="badge-row">
                    <span className="badge badge-warning">{summary.family}</span>
                    <span className="badge">{summary.importance}</span>
                  </div>
                </div>
                <p>{summary.summary}</p>
                <p className="meta">
                  {summary.authoritySource}
                  {summary.nextAction ? ` · ${summary.nextAction}` : ''}
                </p>
              </article>
            ))}
          </ReadyStateBlock>
        </div>
      </section>

      <section className="panel panel--planning">
        <p className="eyebrow">Academic lane</p>
        <h2>Planning Pulse</h2>
        <p>
          A read-only summary of the shared MyPlan substrate, kept in the same decision lane as focus and load without
          pretending this workspace can register for you.
        </p>
        <div className="stack">
          <ReadyStateBlock
            ready={props.workbenchReady}
            hasItems={Boolean(latestPlanningSubstrate)}
            emptyState={<p>No shared MyPlan planning summary is visible yet.</p>}
          >
            {latestPlanningSubstrate ? (
              <article className="item">
                <div className="item-header">
                  <strong>{latestPlanningSubstrate.planLabel}</strong>
                  <div className="badge-row">
                    <span className="badge badge-success">Academic</span>
                    <span className="badge">MyPlan</span>
                    <span className="badge">Read-only</span>
                  </div>
                </div>
                <p>
                  {latestPlanningSubstrate.termCount} term(s) · {latestPlanningSubstrate.plannedCourseCount} planned
                  course(s) · {latestPlanningSubstrate.backupCourseCount} backup course(s) ·{' '}
                  {latestPlanningSubstrate.scheduleOptionCount} schedule option(s)
                </p>
                <p className="meta">
                  {latestPlanningSubstrate.requirementGroupCount} requirement group(s) ·{' '}
                  {latestPlanningSubstrate.programExplorationCount} exploration path(s)
                </p>
                <p className="meta">
                  Captured {formatDateTime(latestPlanningSubstrate.capturedAt)}
                  {latestPlanningSubstrate.lastUpdatedAt
                    ? ` · Updated ${formatDateTime(latestPlanningSubstrate.lastUpdatedAt)}`
                    : ''}
                </p>
                {latestPlanningSubstrate.degreeProgressSummary ? (
                  <p>Degree progress: {latestPlanningSubstrate.degreeProgressSummary}</p>
                ) : null}
                {latestPlanningSubstrate.transferPlanningSummary ? (
                  <p>Transfer planning: {latestPlanningSubstrate.transferPlanningSummary}</p>
                ) : null}
                {latestPlanningSubstrate.terms.length ? (
                  <div className="badge-row">
                    {latestPlanningSubstrate.terms.slice(0, 4).map((term) => (
                      <span className="badge" key={term.termCode}>
                        {term.termLabel}: {term.plannedCourseCount} planned · {term.backupCourseCount} backup ·{' '}
                        {term.scheduleOptionCount} option(s)
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ) : null}
          </ReadyStateBlock>
        </div>
      </section>

      <section className="split-grid split-grid--evidence">
        <article className="panel">
          <h2>Current Tasks</h2>
          <p>Wave 2 assignment detail now stays visible in the shared contract.</p>
          <div className="stack">
            <ReadyStateBlock
              ready={props.workbenchReady}
              hasItems={props.currentAssignments.length > 0}
              emptyState={<p>No structured tasks are visible in the current filter.</p>}
            >
              {props.currentAssignments.slice(0, 6).map((assignment) => (
                <article className="item" key={assignment.id}>
                  <div className="item-header">
                    <strong>{assignment.title}</strong>
                    <div className="badge-row">
                      <span className={getLaneBadgeClass(assignment.site)}>{getLaneLabel(assignment.site)}</span>
                      <span className="badge">{assignment.status}</span>
                    </div>
                  </div>
                  {assignment.summary ? <p>{assignment.summary}</p> : null}
                  {assignment.detail ? <p className="meta">{assignment.detail}</p> : null}
                  <p className="meta">
                    {props.siteLabels[assignment.site]}
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
              ready={props.workbenchReady}
              hasItems={props.currentMessages.length > 0}
              emptyState={<p>No discussion detail is visible in the current filter.</p>}
            >
              {props.currentMessages.slice(0, 6).map((message) => (
                <article className="item" key={message.id}>
                  <div className="item-header">
                    <strong>{message.title ?? 'Untitled discussion update'}</strong>
                    <div className="badge-row">
                      <span className={getLaneBadgeClass(message.site)}>{getLaneLabel(message.site)}</span>
                      {message.unread ? <span className="badge badge-warning">unread</span> : null}
                      {message.instructorAuthored ? <span className="badge badge-success">staff</span> : null}
                    </div>
                  </div>
                  {message.summary ? <p>{message.summary}</p> : null}
                  <p className="meta">
                    {props.siteLabels[message.site]} · {formatDateTime(message.updatedAt ?? message.createdAt)}
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
            ready={props.workbenchReady}
            hasItems={props.currentResources.length > 0}
            emptyState={<p>No study materials are visible in the current filter.</p>}
          >
            {props.currentResources.slice(0, 6).map((resource) => (
              <article className="item" key={resource.id}>
                <div className="item-header">
                  <strong>{resource.title}</strong>
                  <div className="badge-row">
                    <span className={getLaneBadgeClass(resource.site)}>{getLaneLabel(resource.site)}</span>
                    <span className="badge">{resource.resourceKind}</span>
                  </div>
                </div>
                {resource.summary ? <p>{resource.summary}</p> : null}
                {resource.detail ? <p className="meta">{resource.detail}</p> : null}
                <p className="meta">
                  {props.siteLabels[resource.site]}
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
        <p className="eyebrow">Administrative lane</p>
        <h2>Notice Signals</h2>
        <p>
          Existing announcement carriers stay visible here when they matter for planning, without inventing a standalone
          tuition or registration domain.
        </p>
        <div className="stack">
          <ReadyStateBlock
            ready={props.workbenchReady}
            hasItems={props.currentAnnouncements.length > 0}
            emptyState={<p>No current notice signals are visible in the current filter.</p>}
          >
            {props.currentAnnouncements.slice(0, 6).map((announcement) => (
              <article className="item" key={announcement.id}>
                <div className="item-header">
                  <strong>{announcement.title}</strong>
                  <div className="badge-row">
                    <span className={getLaneBadgeClass(announcement.site)}>{getLaneLabel(announcement.site)}</span>
                    <span className="badge">{announcement.site === 'myuw' ? 'MyUW notice' : 'announcement'}</span>
                  </div>
                </div>
                {announcement.summary ? <p>{announcement.summary}</p> : null}
                <p className="meta">
                  {props.siteLabels[announcement.site]}
                  {announcement.postedAt ? ` · ${formatDateTime(announcement.postedAt)}` : ''}
                </p>
              </article>
            ))}
          </ReadyStateBlock>
        </div>
      </section>

      <section className="split-grid split-grid--secondary">
        <article className="panel">
          <p className="eyebrow">Administrative lane</p>
          <h2>Schedule Outlook</h2>
          <p>MyUW class and exam location context stays tied to the same event entities.</p>
          <div className="stack">
            <ReadyStateBlock
              ready={props.workbenchReady}
              hasItems={props.currentEvents.length > 0}
              emptyState={<p>No upcoming class or exam detail is visible in the current filter.</p>}
            >
              {props.currentEvents.slice(0, 6).map((event) => (
                <article className="item" key={event.id}>
                  <div className="item-header">
                    <strong>{event.title}</strong>
                    <div className="badge-row">
                      <span className={getLaneBadgeClass(event.site)}>{getLaneLabel(event.site)}</span>
                      <span className="badge">{event.eventKind}</span>
                    </div>
                  </div>
                  {event.detail ?? event.summary ? <p>{event.detail ?? event.summary}</p> : null}
                  <p className="meta">
                    {props.siteLabels[event.site]}
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
          {props.topSyncRun ? (
            <p className="meta">
              Latest sync {props.siteLabels[props.topSyncRun.site]} · {formatDateTime(props.topSyncRun.completedAt)} · {props.topSyncRun.outcome}
            </p>
          ) : null}
          <div className="stack">
            <ReadyStateBlock
              ready={props.workbenchReady}
              hasItems={props.recentChangeEvents.length > 0}
              emptyState={<p>No change events are stored yet.</p>}
            >
              {props.recentChangeEvents.map((event) => (
                <article className="item" key={event.id}>
                  <div className="item-header">
                    <strong>{event.title}</strong>
                    <div className="badge-row">
                      <span className={getLaneBadgeClass(event.site)}>{getLaneLabel(event.site)}</span>
                      <span className="badge">{event.changeType}</span>
                    </div>
                  </div>
                  <p>{event.summary}</p>
                  <p className="meta">
                    {props.siteLabels[event.site]} · {formatDateTime(event.occurredAt)}
                  </p>
                </article>
              ))}
            </ReadyStateBlock>
          </div>
        </article>
      </section>

      <section className="panel panel--supporting panel--counts">
        <h2>Imported site counts</h2>
        <p>This surface stays honest about what the imported snapshot currently contains.</p>
        {props.workbenchReady ? (
          <div className="counts-grid">
            {props.countsBySite.map((entry) => (
              <article className="count-card" key={entry.site}>
                <strong>{props.siteLabels[entry.site]}</strong>
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
    </>
  );
}
