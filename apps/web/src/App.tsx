import { useEffect, useMemo, useState } from 'react';
import {
  type AdvancedMaterialAnalysisRequest,
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
import type { Course, Site } from '@campus-copilot/schema';
import {
  campusCopilotDb,
  replaceImportedWorkbenchSnapshot,
  setClusterReviewDecision,
  type ClusterReviewDecision,
  type ClusterReviewTargetKind,
  useAllCourses,
  useAllPlanningSubstrates,
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
} from '@campus-copilot/storage';
import {
  applyImportedEnvelopeToArtifact,
  DEMO_IMPORTED_SNAPSHOT,
  parseImportedSnapshotArtifact,
  type ImportedArtifactEnvelope,
} from './import-export-snapshot';
import { WebAiPanel } from './web-ai-panel';
import { WebOrientationHeader, WebSupportRail, WebToolbarControls } from './web-toolbar';
import { WebWorkbenchPanels } from './web-workbench-panels';
import { formatRelativeTime } from './web-view-helpers';

const SITE_ORDER: Site[] = ['canvas', 'gradescope', 'edstem', 'myuw', 'time-schedule', 'course-sites'];

const SITE_LABELS: Record<Site, string> = {
  canvas: 'Canvas',
  gradescope: 'Gradescope',
  edstem: 'EdStem',
  myuw: 'MyUW',
  'time-schedule': 'Time Schedule',
  'course-sites': 'Course Websites',
};

const PROVIDERS: Array<{ value: ProviderId; label: string; model: string }> = [
  { value: 'openai', label: 'OpenAI', model: 'gpt-4.1-mini' },
  { value: 'gemini', label: 'Gemini', model: 'gemini-2.5-flash' },
  { value: 'switchyard', label: 'Switchyard', model: 'gpt-5' },
];

const EXPORT_FORMATS: ExportFormat[] = ['markdown', 'json', 'csv', 'ics'];

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

type BuildWebCurrentViewArtifactArgs = Omit<
  Parameters<typeof buildWorkbenchExportInput>[0],
  'preset' | 'generatedAt' | 'presentation' | 'exportScope' | 'packaging'
> & {
  now: string;
  format: ExportFormat;
  importedEnvelope?: ImportedArtifactEnvelope;
};

export function buildWebCurrentViewArtifact(args: BuildWebCurrentViewArtifactArgs) {
  const siteLabel = args.filters.site === 'all' ? 'All sites' : SITE_LABELS[args.filters.site];

  return applyImportedEnvelopeToArtifact(
    createExportArtifact({
      preset: 'current_view',
      format: args.format,
      input: buildWorkbenchExportInput({
        preset: 'current_view',
        generatedAt: args.now,
        filters: args.filters,
        exportScope: args.importedEnvelope?.scope,
        packaging: args.importedEnvelope?.packaging,
        resources: args.resources,
        assignments: args.assignments,
        announcements: args.announcements,
        messages: args.messages,
        grades: args.grades,
        events: args.events,
        alerts: args.alerts,
        recentUpdates: args.recentUpdates,
        planningSubstrates: args.planningSubstrates,
        focusQueue: args.focusQueue,
        weeklyLoad: args.weeklyLoad,
        syncRuns: args.syncRuns,
        changeEvents: args.changeEvents,
        courseClusters: args.courseClusters,
        workItemClusters: args.workItemClusters,
        administrativeSummaries: args.administrativeSummaries,
        mergeHealth: args.mergeHealth,
        presentation: {
          viewTitle: `Web workbench (${siteLabel})`,
        },
      }),
    }),
    args.importedEnvelope,
  );
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
  const [importedEnvelope, setImportedEnvelope] = useState<ImportedArtifactEnvelope>();
  const [advancedMaterialEnabled, setAdvancedMaterialEnabled] = useState(false);
  const [advancedMaterialCourseId, setAdvancedMaterialCourseId] = useState('');
  const [advancedMaterialExcerpt, setAdvancedMaterialExcerpt] = useState('');
  const [advancedMaterialAcknowledged, setAdvancedMaterialAcknowledged] = useState(false);

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
        setImportedEnvelope(undefined);
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
  const allCoursesResult = useAllCourses(undefined, refreshKey);
  const focusQueueResult = useFocusQueue(now, undefined, refreshKey);
  const planningSubstratesResult = useAllPlanningSubstrates(undefined, refreshKey);
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
    planningSubstratesResult != null &&
    weeklyLoadResult != null &&
    recentUpdates != null &&
    recentChangeEventsResult != null &&
    priorityAlertsResult != null &&
    latestSyncRunsResult != null &&
    siteCountsResult != null &&
    workbenchView != null;

  const focusQueue = focusQueueResult ?? [];
  const allCourses = allCoursesResult ?? [];
  const planningSubstrates = planningSubstratesResult ?? [];
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
  const courseClusters = workbenchView?.courseClusters ?? [];
  const workItemClusters = workbenchView?.workItemClusters ?? [];
  const administrativeSummaries = workbenchView?.administrativeSummaries ?? [];
  const mergeHealth = workbenchView?.mergeHealth;

  const topSyncRun = latestSyncRuns[0];
  const availableCourses = useMemo(
    () =>
      allCourses
        .filter((course) => filters.site === 'all' || course.site === filters.site)
        .map((course: Course) => ({
          id: course.id,
          label: `${SITE_LABELS[course.site]} · ${course.title}`,
        })),
    [allCourses, filters.site],
  );

  const currentViewExport = useMemo(() => {
    if (!workbenchReady) {
      return undefined;
    }
    return buildWebCurrentViewArtifact({
      now,
      format: 'markdown',
      filters,
      importedEnvelope,
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
      courseClusters,
      workItemClusters,
      administrativeSummaries,
      mergeHealth,
    });
  }, [
    workbenchReady,
    filters,
    now,
    currentResources,
    currentAssignments,
    currentAnnouncements,
    currentMessages,
    currentGrades,
    currentEvents,
    currentAlerts,
    recentUpdates,
    focusQueue,
    weeklyLoad,
    latestSyncRuns,
    recentChangeEvents,
    importedEnvelope,
  ]);

  function handleExport(preset: ExportPreset) {
    const siteLabel = filters.site === 'all' ? 'All sites' : SITE_LABELS[filters.site];
    const artifact =
      preset === 'current_view'
        ? buildWebCurrentViewArtifact({
            now,
            format: exportFormat,
            filters,
            importedEnvelope,
            resources: currentResources,
            assignments: currentAssignments,
            announcements: currentAnnouncements,
            messages: currentMessages,
            grades: currentGrades,
            events: currentEvents,
            alerts: currentAlerts,
            recentUpdates,
            planningSubstrates,
            focusQueue,
            weeklyLoad,
            syncRuns: latestSyncRuns,
            changeEvents: recentChangeEvents,
            courseClusters,
            workItemClusters,
            administrativeSummaries,
            mergeHealth,
          })
        : createExportArtifact({
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
              planningSubstrates,
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
    const { snapshot, envelope } = parseImportedSnapshotArtifact(raw);
    await replaceImportedWorkbenchSnapshot(snapshot);
    setImportedEnvelope(envelope);
    setRefreshKey((current) => current + 1);
    setFeedback(
      envelope
        ? 'Imported a read-only workspace snapshot and kept its export/policy envelope visible in the web surface.'
        : 'Imported a read-only workspace snapshot into the shared storage/read-model.',
    );
  }

  async function handleResetDemo() {
    await replaceImportedWorkbenchSnapshot(DEMO_IMPORTED_SNAPSHOT);
    setImportedEnvelope(undefined);
    setRefreshKey((current) => current + 1);
    setFeedback('Reset the web workbench to the bundled demo snapshot.');
  }

  async function handleSetClusterReviewDecision(input: {
    targetKind: ClusterReviewTargetKind;
    targetId: string;
    decision: ClusterReviewDecision;
  }) {
    await setClusterReviewDecision(input);
    setRefreshKey((current) => current + 1);
    setFeedback(`Saved a local ${input.targetKind.replace(/_/g, ' ')} review decision in the shared workspace.`);
  }

  async function handleAskAi() {
    if (!question.trim()) {
      setAiError('Enter a question before asking for a cited answer.');
      return;
    }

    const selectedCourse = allCourses.find((course) => course.id === advancedMaterialCourseId);

    if (advancedMaterialEnabled) {
      if (!selectedCourse) {
        setAiError('Select one course before turning on advanced material analysis.');
        return;
      }

      if (!advancedMaterialExcerpt.trim()) {
        setAiError('Paste a course excerpt before asking for advanced material analysis.');
        return;
      }

      if (!advancedMaterialAcknowledged) {
        setAiError('Confirm the course-material responsibility notice before continuing.');
        return;
      }
    }

    const advancedMaterialAnalysis: AdvancedMaterialAnalysisRequest =
      advancedMaterialEnabled && selectedCourse
        ? {
            enabled: true,
            policy: 'per_course_opt_in',
            courseId: selectedCourse.id,
            courseLabel: `${SITE_LABELS[selectedCourse.site]} · ${selectedCourse.title}`,
            excerpt: advancedMaterialExcerpt.trim(),
            userAcknowledgedResponsibility: true,
          }
        : {
            enabled: false,
            policy: 'default_disabled',
          };

    setAiPending(true);
    setAiError(undefined);
    setAiNotice(undefined);

    try {
      if (!currentViewExport) {
        throw new Error('Load a workspace snapshot before asking for a cited answer.');
      }

      if (!currentViewExport.packaging.aiAllowed) {
        throw new Error(
          importedEnvelope?.packaging
            ? 'This imported workspace carries review metadata, but the current web scope still does not have Layer 2 AI approval. Review the policy envelope before continuing.'
            : 'The current web scope does not carry Layer 2 AI approval yet. Review the current policy envelope before asking AI.',
        );
      }

      const request = buildWorkbenchAiProxyRequest({
        provider,
        model,
        switchyardProvider,
        switchyardLane,
        question,
        advancedMaterialAnalysis,
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
        planningSubstrates,
        weeklyLoad,
        syncRuns: latestSyncRuns,
        recentChanges: recentChangeEvents,
        workbenchView: {
          planningSubstrates,
          courseClusters,
          workItemClusters,
          administrativeSummaries,
          mergeHealth,
        },
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
        advancedMaterialAnalysis.enabled
          ? `Advanced material analysis used only the pasted excerpt for ${advancedMaterialAnalysis.courseLabel}.`
          : resolvedAnswer.citationCoverage === 'uncited_fallback'
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

  const populatedSiteCount = useMemo(
    () =>
      countsBySite.filter((entry) =>
        [
          entry.counts.courses,
          entry.counts.resources,
          entry.counts.assignments,
          entry.counts.announcements,
          entry.counts.grades,
          entry.counts.messages,
          entry.counts.events,
        ].some((count) => count > 0),
      ).length,
    [countsBySite],
  );

  const trackedEntityCount = useMemo(
    () =>
      countsBySite.reduce(
        (total, entry) =>
          total +
          entry.counts.courses +
          entry.counts.resources +
          entry.counts.assignments +
          entry.counts.announcements +
          entry.counts.grades +
          entry.counts.messages +
          entry.counts.events,
        0,
      ),
    [countsBySite],
  );

  return (
    <>
      <a className="skip-link" href="#workbench-content">
        Skip to workbench content
      </a>
      <main id="workbench-content" className="web-shell" tabIndex={-1}>
        <div className="web-shell__header">
          <WebOrientationHeader
            ready={ready}
            now={now}
            populatedSiteCount={populatedSiteCount}
            unseenUpdateCount={recentUpdates?.unseenCount ?? 0}
            topSyncRun={topSyncRun}
          />
        </div>

        <div className="web-shell__decision-lane" aria-label="Decision workspace">
            <WebWorkbenchPanels
            workbenchReady={workbenchReady}
            todaySnapshot={todaySnapshot ?? undefined}
            recentUpdates={recentUpdates ?? undefined}
            currentViewExport={currentViewExport}
            importedEnvelope={importedEnvelope}
            focusQueue={focusQueue}
            planningSubstrates={planningSubstrates}
            weeklyLoad={weeklyLoad}
            courseClusters={courseClusters}
            workItemClusters={workItemClusters}
            administrativeSummaries={administrativeSummaries}
            mergeHealth={mergeHealth}
            currentAssignments={currentAssignments}
            currentMessages={currentMessages}
            currentResources={currentResources}
            currentAnnouncements={currentAnnouncements}
            currentEvents={currentEvents}
              recentChangeEvents={recentChangeEvents}
              countsBySite={countsBySite}
              topSyncRun={topSyncRun}
              siteLabels={SITE_LABELS}
              onSetClusterReviewDecision={handleSetClusterReviewDecision}
            />
        </div>

        <section className="web-shell__overview-band" aria-label="Trust, AI, and export review">
          <div className="web-shell__toolbar-lane web-shell__toolbar-lane--supporting">
            <WebToolbarControls
              feedback={feedback}
              exportFormat={exportFormat}
              exportFormats={EXPORT_FORMATS}
              filters={filters}
              siteOrder={SITE_ORDER}
              siteLabels={SITE_LABELS}
              onLoadDemo={handleResetDemo}
              onImportFile={handleImportFile}
              onExportFormatChange={setExportFormat}
              onSiteFilterChange={(site) =>
                setFilters((current) => ({
                  ...current,
                  site,
                }))
              }
              onOnlyUnseenChange={(onlyUnseenUpdates) =>
                setFilters((current) => ({
                  ...current,
                  onlyUnseenUpdates,
                }))
              }
              onExportCurrentView={() => handleExport('current_view')}
              onExportFocusQueue={() => handleExport('focus_queue')}
              onExportWeeklyLoad={() => handleExport('weekly_load')}
              onExportChangeJournal={() => handleExport('change_journal')}
            />
          </div>

          <div className="web-shell__overview-lanes">
            <div className="web-shell__support-lane">
              <WebSupportRail
                topSyncRun={topSyncRun}
                populatedSiteCount={populatedSiteCount}
                trackedEntityCount={trackedEntityCount}
                unseenUpdateCount={recentUpdates?.unseenCount ?? 0}
                siteLabels={SITE_LABELS}
              />
            </div>
            <div className="web-shell__explanation-lane">
              <WebAiPanel
                provider={provider}
                model={model}
                switchyardProvider={switchyardProvider}
                switchyardLane={switchyardLane}
                providers={PROVIDERS}
                aiBaseUrl={aiBaseUrl}
                question={question}
                aiPending={aiPending}
                aiError={aiError}
                aiNotice={aiNotice}
                aiAnswer={aiAnswer}
                aiStructured={aiStructured}
                currentViewExport={currentViewExport}
                importedEnvelope={importedEnvelope}
                availableCourses={availableCourses}
                advancedMaterialEnabled={advancedMaterialEnabled}
                advancedMaterialCourseId={advancedMaterialCourseId}
                advancedMaterialExcerpt={advancedMaterialExcerpt}
                advancedMaterialAcknowledged={advancedMaterialAcknowledged}
                onAiBaseUrlChange={setAiBaseUrl}
                onProviderChange={(nextProvider) => {
                  setProvider(nextProvider);
                  setModel(PROVIDERS.find((item) => item.value === nextProvider)?.model ?? model);
                }}
                onModelChange={setModel}
                onSwitchyardProviderChange={setSwitchyardProvider}
                onSwitchyardLaneChange={setSwitchyardLane}
                onQuestionChange={setQuestion}
                onAdvancedMaterialEnabledChange={(value) => {
                  setAdvancedMaterialEnabled(value);
                  if (!value) {
                    setAdvancedMaterialCourseId('');
                    setAdvancedMaterialExcerpt('');
                    setAdvancedMaterialAcknowledged(false);
                  }
                }}
                onAdvancedMaterialCourseChange={setAdvancedMaterialCourseId}
                onAdvancedMaterialExcerptChange={setAdvancedMaterialExcerpt}
                onAdvancedMaterialAcknowledgedChange={setAdvancedMaterialAcknowledged}
                onAskAi={handleAskAi}
              />
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
