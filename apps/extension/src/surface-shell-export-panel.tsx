import { browser } from 'wxt/browser';
import { useMemo, type Dispatch, type SetStateAction } from 'react';
import type { ExportFormat, ExportPreset, ExportProvenanceEntry } from '@campus-copilot/exporter';
import type { Alert, Announcement, Assignment, Event, Grade, Message, Resource, Site } from '@campus-copilot/schema';
import type {
  AdministrativeSummary,
  ChangeEvent,
  CourseCluster,
  FocusQueueItem,
  MergeHealthSummary,
  RecentUpdatesFeed,
  SyncRun,
  WeeklyLoadEntry,
  WorkItemCluster,
  WorkbenchFilter,
} from '@campus-copilot/storage';
import { useWorkbenchView } from '@campus-copilot/storage';
import type { ExtensionConfig } from './config';
import type { ResolvedUiLanguage } from './i18n';
import type { ExportFamilyKind } from './sidepanel-mode-copy';
import { buildSurfaceExportArtifact, type SurfaceCompositionState } from './surface-shell-composition';
import { buildDownloadPayload, EXPORT_FORMAT_OPTIONS, SITE_LABELS, type OrderedSiteStatusEntry } from './surface-shell-model';

type ExportScopeSite = Site | 'all';
type ExportFamilyCard = {
  family: ExportFamilyKind;
  status: 'available' | 'partial' | 'blocked';
  exportable: boolean;
};

type ExportModeCopy = {
  title: string;
  description: string;
  siteLabel: string;
  courseLabel: string;
  formatLabel: string;
  familyLabel: string;
  exportButton: string;
  allCourses: string;
  allSites: string;
  courseScopedHint: string;
  globalHint: string;
  badges: Record<ExportFamilyCard['status'], string>;
  families: Record<ExportFamilyKind, { label: string; description: string }>;
};

const COURSE_SCOPED_EXPORT_SITES = new Set<Site>(['canvas', 'gradescope', 'edstem']);

function isCourseScopedExportSite(site: ExportScopeSite) {
  return site !== 'all' && COURSE_SCOPED_EXPORT_SITES.has(site);
}

function filterSiteRecords<T extends { site: Site; courseId?: string }>(
  records: T[],
  site: ExportScopeSite,
  courseId?: string,
) {
  return records.filter((record) => {
    if (site !== 'all' && record.site !== site) {
      return false;
    }
    if (courseId && record.courseId !== courseId) {
      return false;
    }
    return true;
  });
}

function filterCourseResources(resources: Resource[], site: ExportScopeSite, courseId?: string) {
  return resources.filter((resource) => {
    if (site !== 'all' && resource.site !== site) {
      return false;
    }
    if (courseId && resource.courseId !== courseId) {
      return false;
    }
    return true;
  });
}

function formatAuthorizationStatusLabel(status: string | undefined, uiLanguage: ResolvedUiLanguage) {
  if (uiLanguage === 'zh-CN') {
    if (status === 'allowed') return '已允许';
    if (status === 'partial') return '部分';
    if (status === 'confirm_required') return '需确认';
    if (status === 'blocked') return '已阻止';
    return '未设置';
  }
  if (status === 'allowed') return 'Allowed';
  if (status === 'partial') return 'Partial';
  if (status === 'confirm_required') return 'Confirm required';
  if (status === 'blocked') return 'Blocked';
  return 'Unset';
}

function formatRiskLabel(riskLabel: 'low' | 'medium' | 'high', uiLanguage: ResolvedUiLanguage) {
  if (uiLanguage === 'zh-CN') {
    if (riskLabel === 'high') return '高风险';
    if (riskLabel === 'medium') return '中风险';
    return '低风险';
  }
  if (riskLabel === 'high') return 'High risk';
  if (riskLabel === 'medium') return 'Medium risk';
  return 'Low risk';
}

function formatMatchConfidenceLabel(matchConfidence: 'low' | 'medium' | 'high', uiLanguage: ResolvedUiLanguage) {
  if (uiLanguage === 'zh-CN') {
    if (matchConfidence === 'high') return '高匹配置信度';
    if (matchConfidence === 'medium') return '中匹配置信度';
    return '低匹配置信度';
  }
  if (matchConfidence === 'high') return 'High match confidence';
  if (matchConfidence === 'medium') return 'Medium match confidence';
  return 'Low match confidence';
}

function formatProvenanceSourceType(sourceType: ExportProvenanceEntry['sourceType'], uiLanguage: ResolvedUiLanguage) {
  if (uiLanguage === 'zh-CN') {
    if (sourceType === 'official_api') return '官方 API';
    if (sourceType === 'session_interface') return '会话载体';
    if (sourceType === 'page_state') return '页面状态';
    return '派生读模型';
  }
  if (sourceType === 'official_api') return 'official API';
  if (sourceType === 'session_interface') return 'session-backed carrier';
  if (sourceType === 'page_state') return 'page-state carrier';
  return 'derived read model';
}

function buildExportFamilyCards(input: {
  exportScopeSite: ExportScopeSite;
  courseClusters: CourseCluster[];
  workItemClusters: WorkItemCluster[];
  administrativeSummaries: AdministrativeSummary[];
}) {
  const { exportScopeSite, courseClusters, workItemClusters, administrativeSummaries } = input;

  const baseCards: ExportFamilyCard[] = [
    { family: 'current_view', status: 'available', exportable: true },
    { family: 'resources', status: 'available', exportable: true },
    { family: 'assignments', status: 'available', exportable: true },
    { family: 'announcements', status: 'available', exportable: true },
    { family: 'messages', status: 'available', exportable: true },
    { family: 'grades', status: 'partial', exportable: true },
    { family: 'deadlines', status: 'available', exportable: true },
    {
      family: 'course_panorama',
      status: courseClusters.length > 0 ? 'available' : 'partial',
      exportable: courseClusters.length > 0,
    },
    {
      family: 'administrative_snapshot',
      status: administrativeSummaries.length > 0 ? 'available' : 'partial',
      exportable: administrativeSummaries.length > 0,
    },
    {
      family: 'cluster_merge_review',
      status: workItemClusters.length > 0 ? 'available' : 'partial',
      exportable: workItemClusters.length > 0,
    },
  ];

  if (exportScopeSite !== 'canvas') {
    return baseCards;
  }

  const canvasOnlyCards: ExportFamilyCard[] = [
    { family: 'instructor_feedback', status: 'partial', exportable: false },
    { family: 'syllabus', status: 'blocked', exportable: false },
    { family: 'groups', status: 'blocked', exportable: false },
    { family: 'recordings', status: 'blocked', exportable: false },
  ];

  return [
    ...baseCards,
    ...canvasOnlyCards,
  ];
}

export function SurfaceShellExportPanel(props: {
  uiLanguage: ResolvedUiLanguage;
  modeCopy: ExportModeCopy;
  refreshKey: number;
  exportScopeSite: ExportScopeSite;
  setExportScopeSite: Dispatch<SetStateAction<ExportScopeSite>>;
  exportCourseId: string;
  setExportCourseId: Dispatch<SetStateAction<string>>;
  exportFamily: ExportFamilyKind;
  setExportFamily: Dispatch<SetStateAction<ExportFamilyKind>>;
  selectedFormat: ExportFormat;
  setSelectedFormat: Dispatch<SetStateAction<ExportFormat>>;
  exportFeedback?: string;
  setExportFeedback: Dispatch<SetStateAction<string | undefined>>;
  onBackToAssistant: () => void;
  onOpenSettings: () => void;
  orderedSiteStatus: OrderedSiteStatusEntry[];
  allCourses: Array<{ id: string; site: Site; label: string }>;
  authorization: ExtensionConfig['authorization'];
  now: string;
  latestSyncRuns: SyncRun[];
  focusQueue: FocusQueueItem[];
  weeklyLoad: WeeklyLoadEntry[];
  recentChangeEvents: ChangeEvent[];
  courseClusters: CourseCluster[];
  workItemClusters: WorkItemCluster[];
  administrativeSummaries: AdministrativeSummary[];
  mergeHealth?: MergeHealthSummary;
}) {
  const {
    uiLanguage,
    modeCopy,
    refreshKey,
    exportScopeSite,
    setExportScopeSite,
    exportCourseId,
    setExportCourseId,
    exportFamily,
    setExportFamily,
    selectedFormat,
    setSelectedFormat,
    exportFeedback,
    setExportFeedback,
    onBackToAssistant,
    onOpenSettings,
    orderedSiteStatus,
    allCourses,
    authorization,
    now,
    latestSyncRuns,
    focusQueue,
    weeklyLoad,
    recentChangeEvents,
    courseClusters,
    workItemClusters,
    administrativeSummaries,
    mergeHealth,
  } = props;

  const selectedFormatLabel =
    EXPORT_FORMAT_OPTIONS.find((option) => option.value === selectedFormat)?.label ?? selectedFormat;
  const exportScopedCourses = allCourses.filter((course) => exportScopeSite === 'all' || course.site === exportScopeSite);
  const exportScopeFilters: WorkbenchFilter = {
    site: exportScopeSite === 'all' ? 'all' : exportScopeSite,
    onlyUnseenUpdates: false,
  };
  const exportWorkbenchView = useWorkbenchView(now, exportScopeFilters, undefined, refreshKey);
  const resources = exportWorkbenchView?.resources ?? [];
  const assignments = exportWorkbenchView?.assignments ?? [];
  const announcements = exportWorkbenchView?.announcements ?? [];
  const messages = exportWorkbenchView?.messages ?? [];
  const grades = exportWorkbenchView?.grades ?? [];
  const events = exportWorkbenchView?.events ?? [];
  const alerts = exportWorkbenchView?.alerts ?? [];
  const recentUpdates = exportWorkbenchView?.recentUpdates;
  const exportFamilyCards: ExportFamilyCard[] = useMemo(
    () =>
      buildExportFamilyCards({
        exportScopeSite,
        courseClusters,
        workItemClusters,
        administrativeSummaries,
      }),
    [administrativeSummaries, courseClusters, exportScopeSite, workItemClusters],
  );
  const selectedExportFamilyCard = exportFamilyCards.find((card) => card.family === exportFamily);
  const exportScopeLabel = exportScopeSite === 'all' ? modeCopy.allSites : SITE_LABELS[exportScopeSite];
  const exportCourseLabel = exportCourseId
    ? exportScopedCourses.find((course) => course.id === exportCourseId)?.label
    : undefined;

  const exportReviewArtifactInput = useMemo(() => {
    const scopedAssignments = filterSiteRecords(assignments, exportScopeSite, exportCourseId);
    const scopedAnnouncements = filterSiteRecords(announcements, exportScopeSite, exportCourseId);
    const scopedMessages = filterSiteRecords(messages, exportScopeSite, exportCourseId);
    const scopedGrades = filterSiteRecords(grades, exportScopeSite, exportCourseId);
    const scopedEvents = filterSiteRecords(events, exportScopeSite, exportCourseId);
    const scopedResources = filterCourseResources(resources, exportScopeSite, exportCourseId);
    const scopedAlerts = exportCourseId ? [] : alerts.filter((alert) => exportScopeSite === 'all' || alert.site === exportScopeSite);
    const scopedRecentUpdates =
      exportScopeSite === 'all'
        ? recentUpdates
        : recentUpdates
          ? {
              ...recentUpdates,
              items: recentUpdates.items.filter((entry) => entry.site === exportScopeSite),
              unseenCount: recentUpdates.items.filter((entry) => entry.site === exportScopeSite).length,
            }
          : undefined;

    let preset: ExportPreset = 'current_view';
    let nextAssignments = scopedAssignments;
    let nextAnnouncements = scopedAnnouncements;
    let nextMessages = scopedMessages;
    let nextGrades = scopedGrades;
    let nextEvents = scopedEvents;
    let nextResources = scopedResources;
    let nextAlerts = scopedAlerts;
    let nextRecentUpdates = exportCourseId ? undefined : scopedRecentUpdates;
    let nextFocusQueue = exportCourseId ? [] : focusQueue.filter((item) => exportScopeSite === 'all' || item.site === exportScopeSite);
    let nextWeeklyLoad = exportCourseId ? [] : weeklyLoad;
    let nextChangeEvents = exportCourseId ? [] : recentChangeEvents.filter((event) => exportScopeSite === 'all' || event.site === exportScopeSite);

    switch (exportFamily) {
      case 'assignments':
      case 'resources':
        nextAnnouncements = [];
        if (exportFamily !== 'resources') nextResources = [];
        nextMessages = [];
        nextGrades = [];
        nextEvents = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'announcements':
        nextAssignments = [];
        nextMessages = [];
        nextGrades = [];
        nextEvents = [];
        nextResources = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'messages':
        nextAssignments = [];
        nextAnnouncements = [];
        nextGrades = [];
        nextEvents = [];
        nextResources = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'grades':
        nextAssignments = [];
        nextAnnouncements = [];
        nextMessages = [];
        nextEvents = [];
        nextResources = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'deadlines':
        preset = 'all_deadlines';
        nextAssignments = scopedAssignments.filter((assignment) => Boolean(assignment.dueAt));
        nextAnnouncements = [];
        nextMessages = [];
        nextGrades = [];
        nextEvents = scopedEvents.filter((event) => event.eventKind === 'deadline');
        nextResources = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'course_panorama':
        preset = 'course_panorama';
        nextAnnouncements = [];
        nextMessages = [];
        nextGrades = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'administrative_snapshot':
        preset = 'administrative_snapshot';
        nextAssignments = [];
        nextAnnouncements = [];
        nextMessages = [];
        nextGrades = [];
        nextEvents = [];
        nextResources = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      case 'cluster_merge_review':
        preset = 'cluster_merge_review';
        nextAssignments = [];
        nextAnnouncements = [];
        nextMessages = [];
        nextGrades = [];
        nextEvents = [];
        nextResources = [];
        nextAlerts = [];
        nextRecentUpdates = undefined;
        nextFocusQueue = [];
        nextWeeklyLoad = [];
        nextChangeEvents = [];
        break;
      default:
        break;
    }

    const state: SurfaceCompositionState = {
      now,
      uiLanguage,
      filters: {
        site: (exportScopeSite === 'all' ? 'all' : exportScopeSite) as WorkbenchFilter['site'],
        onlyUnseenUpdates: false,
      },
      currentResources: nextResources,
      currentAssignments: nextAssignments,
      currentAnnouncements: nextAnnouncements,
      currentMessages: nextMessages,
      currentGrades: nextGrades,
      currentEvents: nextEvents,
      currentAlerts: nextAlerts,
      currentRecentUpdates: nextRecentUpdates,
      workbenchResources: nextResources,
      workbenchAssignments: nextAssignments,
      workbenchAnnouncements: nextAnnouncements,
      workbenchMessages: nextMessages,
      workbenchGrades: nextGrades,
      workbenchEvents: nextEvents,
      priorityAlerts: nextAlerts,
      focusQueue: nextFocusQueue,
      planningSubstrates: [],
      weeklyLoad: nextWeeklyLoad,
      latestSyncRuns,
      recentChangeEvents: nextChangeEvents,
      courseClusters,
      workItemClusters,
      administrativeSummaries,
      mergeHealth,
    };

    return {
      preset,
      format: selectedFormat,
      viewTitleOverride: [
        exportScopeSite === 'all' ? modeCopy.allSites : SITE_LABELS[exportScopeSite],
        exportCourseId ? exportScopedCourses.find((course) => course.id === exportCourseId)?.label : undefined,
        modeCopy.families[exportFamily].label,
      ]
        .filter(Boolean)
        .join(' · '),
      exportScope: {
        site: exportScopeSite === 'all' ? undefined : exportScopeSite,
        courseIdOrKey: exportCourseId || undefined,
        resourceFamily: exportFamily === 'current_view' ? 'workspace_snapshot' : exportFamily,
      },
      authorization,
      state,
    };
  }, [
    alerts,
    announcements,
    assignments,
    authorization,
    courseClusters,
    events,
    exportCourseId,
    exportFamily,
    exportScopeSite,
    exportScopedCourses,
    focusQueue,
    grades,
    latestSyncRuns,
    mergeHealth,
    messages,
    modeCopy,
    now,
    recentChangeEvents,
    recentUpdates,
    resources,
    selectedFormat,
    uiLanguage,
    weeklyLoad,
    workItemClusters,
    administrativeSummaries,
  ]);

  const exportReviewArtifact = useMemo(
    () => buildSurfaceExportArtifact(exportReviewArtifactInput),
    [exportReviewArtifactInput],
  );
  const exportReviewPackaging = exportReviewArtifact.packaging;
  const exportReviewCount =
    exportFamily === 'resources'
      ? filterCourseResources(resources, exportScopeSite, exportCourseId).length
      : exportFamily === 'assignments'
        ? filterSiteRecords(assignments, exportScopeSite, exportCourseId).length
        : exportFamily === 'announcements'
          ? filterSiteRecords(announcements, exportScopeSite, exportCourseId).length
          : exportFamily === 'messages'
            ? filterSiteRecords(messages, exportScopeSite, exportCourseId).length
            : exportFamily === 'grades'
              ? filterSiteRecords(grades, exportScopeSite, exportCourseId).length
              : exportFamily === 'deadlines'
                ? filterSiteRecords(assignments, exportScopeSite, exportCourseId).filter((assignment) => Boolean(assignment.dueAt)).length +
                  filterSiteRecords(events, exportScopeSite, exportCourseId).filter((event) => event.eventKind === 'deadline').length
                : exportFamily === 'course_panorama'
                  ? courseClusters.length
                  : exportFamily === 'administrative_snapshot'
                    ? administrativeSummaries.length
                    : exportFamily === 'cluster_merge_review'
                      ? workItemClusters.length + courseClusters.length
                      : filterCourseResources(resources, exportScopeSite, exportCourseId).length +
                        filterSiteRecords(assignments, exportScopeSite, exportCourseId).length +
                        filterSiteRecords(announcements, exportScopeSite, exportCourseId).length +
                        filterSiteRecords(messages, exportScopeSite, exportCourseId).length +
                        filterSiteRecords(grades, exportScopeSite, exportCourseId).length +
                        filterSiteRecords(events, exportScopeSite, exportCourseId).length;
  const exportReviewStatus =
    selectedExportFamilyCard?.status === 'blocked'
      ? modeCopy.badges.blocked
      : selectedExportFamilyCard?.status === 'partial'
        ? modeCopy.badges.partial
        : modeCopy.badges.available;
  const exportReviewTitle = modeCopy.families[exportFamily].label;
  const exportReviewDescription = modeCopy.families[exportFamily].description;
  const exportTrustSummary =
    exportFamily === 'administrative_snapshot'
      ? 'Summary-first and review-first. AI stays more restrictive than read/export for this packet.'
      : exportFamily === 'cluster_merge_review'
        ? 'Review-first packet for authority and possible-match checks before anything leaves the extension.'
        : isCourseScopedExportSite(exportScopeSite)
          ? 'Course scope narrows the packet before export, so review stays tied to one course lane.'
          : 'Whole-site export stays truthful when the source does not map cleanly to one course lane.';

  const getWorkspaceAuthorizationRule = (
    layer: 'layer1_read_export' | 'layer2_ai_read_analysis',
    site?: ExportScopeSite,
  ) =>
    authorization.rules.find(
      (rule) =>
        rule.layer === layer &&
        rule.resourceFamily === 'workspace_snapshot' &&
        !rule.courseIdOrKey &&
        (site && site !== 'all' ? rule.site === site : !rule.site),
    );
  const exportLayer1Rule =
    getWorkspaceAuthorizationRule('layer1_read_export', exportScopeSite) ?? getWorkspaceAuthorizationRule('layer1_read_export');
  const exportLayer2Rule =
    getWorkspaceAuthorizationRule('layer2_ai_read_analysis', exportScopeSite) ?? getWorkspaceAuthorizationRule('layer2_ai_read_analysis');
  const highSensitivityLayer1Rules = authorization.rules.filter(
    (rule) => rule.layer === 'layer1_read_export' && rule.resourceFamily?.endsWith('_summary'),
  );
  const highSensitivityLayer2Rules = authorization.rules.filter(
    (rule) => rule.layer === 'layer2_ai_read_analysis' && rule.resourceFamily?.endsWith('_summary'),
  );

  const exportAuthorizationLead =
    exportFamily === 'administrative_snapshot'
      ? uiLanguage === 'zh-CN'
        ? `高敏摘要导出 ${highSensitivityLayer1Rules.filter((rule) => rule.status === 'confirm_required').length} 项需确认 · AI ${highSensitivityLayer2Rules.filter((rule) => rule.status === 'blocked').length} 项保持阻止`
        : `${highSensitivityLayer1Rules.filter((rule) => rule.status === 'confirm_required').length} high-sensitivity summaries require Layer 1 confirmation · ${highSensitivityLayer2Rules.filter((rule) => rule.status === 'blocked').length} stay AI-blocked`
      : `${formatAuthorizationStatusLabel(exportLayer1Rule?.status, uiLanguage)} · ${formatAuthorizationStatusLabel(exportLayer2Rule?.status, uiLanguage)}`;
  const exportAuthorizationDetail =
    exportFamily === 'administrative_snapshot'
      ? uiLanguage === 'zh-CN'
        ? '这组导出保持 summary-first / export-first；AI 不会因为能导出就自动获得读取权限。'
        : 'This packet stays summary-first and export-first; AI does not inherit access just because export is allowed.'
      : uiLanguage === 'zh-CN'
        ? `当前导出按 ${exportScopeLabel} 的 Layer 1 / Layer 2 工作区授权来解释边界。`
        : `This export follows the current Layer 1 / Layer 2 workspace authorization for ${exportScopeLabel}.`;
  const exportDepthDetail =
    selectedExportFamilyCard?.status === 'partial'
      ? uiLanguage === 'zh-CN'
        ? '这条资源族已经 landed，但仍是部分深度，不会伪装成 full parity。'
        : 'This family is landed but still partial depth; it should not be treated as full parity.'
      : selectedExportFamilyCard?.status === 'blocked'
        ? uiLanguage === 'zh-CN'
          ? '当前 carrier 还没到可导出产品面，这里只允许诚实地显示为 blocked。'
          : 'The carrier is not productized for export yet, so this stays honestly blocked.'
        : uiLanguage === 'zh-CN'
          ? '这条资源族当前已经处在可导出的 landed 路径上。'
          : 'This family is currently on the landed export path.';
  const exportPacketHonesty =
    exportFamily === 'administrative_snapshot'
      ? uiLanguage === 'zh-CN'
        ? '高敏摘要保持 summary-first；导出允许不等于 AI 自动继承读取。'
        : 'High-sensitivity summaries stay summary-first; export allowed does not mean AI automatically inherits read access.'
      : selectedExportFamilyCard?.status === 'blocked'
        ? uiLanguage === 'zh-CN'
          ? '当前只允许诚实地停在 review blocked，不把未产品化 carrier 包装成可导出。'
          : 'This stays honestly review-blocked instead of pretending an unproductized carrier is export-ready.'
        : uiLanguage === 'zh-CN'
          ? '先审 scope、授权和深度，再决定是否导出这个 packet。'
          : 'Review scope, authorization, and depth before deciding whether to export this packet.';
  const exportAiAllowedLead =
    uiLanguage === 'zh-CN'
      ? exportReviewPackaging.aiAllowed
        ? 'AI 分析已允许'
        : 'AI 分析保持阻止'
      : exportReviewPackaging.aiAllowed
        ? 'AI analysis allowed'
        : 'AI analysis blocked';
  const exportAiAllowedDetail =
    exportReviewPackaging.aiAllowed
      ? uiLanguage === 'zh-CN'
        ? 'Layer 2 当前允许 AI 在这个 packet 上做分析，但不改变导出或站外写边界。'
        : 'Layer 2 currently allows AI analysis for this packet without changing export or external-write boundaries.'
      : uiLanguage === 'zh-CN'
        ? 'Layer 2 仍然比导出更严格；就算能导出，这个 packet 也不会自动开放给 AI。'
        : 'Layer 2 stays stricter than export here; an exportable packet does not automatically become AI-readable.';
  const exportRiskLead = formatRiskLabel(exportReviewPackaging.riskLabel, uiLanguage);
  const exportRiskDetail =
    exportReviewPackaging.riskLabel === 'high'
      ? uiLanguage === 'zh-CN'
        ? '这个 packet 需要更高强度的 operator 判断，不应被当成低风险素材。'
        : 'This packet needs stronger operator judgment and should not be treated as low-risk material.'
      : exportReviewPackaging.riskLabel === 'medium'
        ? uiLanguage === 'zh-CN'
          ? '当前允许 review-first 地继续，但仍需要看清 carrier 和授权边界。'
          : 'This can proceed review-first, but the carrier and authorization boundary still need to stay visible.'
        : uiLanguage === 'zh-CN'
          ? '当前风险标签较低，但仍按 review-first desk 展示，不做静默导出假设。'
          : 'This currently carries a lower risk label, but it still stays on the review-first desk instead of assuming silent export.';
  const exportMatchLead = formatMatchConfidenceLabel(exportReviewPackaging.matchConfidence, uiLanguage);
  const exportMatchDetail =
    exportReviewPackaging.matchConfidence === 'high'
      ? uiLanguage === 'zh-CN'
        ? '当前 packet 的作用域和载体比较稳定，operator 只需要做常规核对。'
        : 'This packet currently maps through a more stable scope and carrier lane, so normal operator review is usually enough.'
      : exportReviewPackaging.matchConfidence === 'medium'
        ? uiLanguage === 'zh-CN'
          ? '当前仍有一定的合并或作用域不确定性，所以 review 不该被跳过。'
          : 'There is still some scope or merge uncertainty here, so the review step should stay visible.'
        : uiLanguage === 'zh-CN'
          ? '当前匹配把握较弱，适合先停在 review，而不是假装已经 fully resolved。'
          : 'Confidence is weaker here, so it is more honest to stop at review than to pretend the packet is fully resolved.';
  const exportProvenanceEntries: ExportProvenanceEntry[] = exportReviewPackaging.provenance ?? [];
  const exportProvenanceLead =
    exportProvenanceEntries[0]?.label ??
    (uiLanguage === 'zh-CN' ? '当前 packet 没有来源标签' : 'No provenance label on this packet');
  const exportProvenanceSourceSummary =
    exportProvenanceEntries.length > 0
      ? Array.from(new Set(exportProvenanceEntries.map((entry) => formatProvenanceSourceType(entry.sourceType, uiLanguage)))).join(' · ')
      : uiLanguage === 'zh-CN'
        ? '暂无来源类型'
        : 'No provenance types yet';
  const exportProvenanceDetail =
    exportProvenanceEntries.length > 0
      ? uiLanguage === 'zh-CN'
        ? `${exportProvenanceEntries.length} 条只读来源线索 · ${exportProvenanceSourceSummary}`
        : `${exportProvenanceEntries.length} read-only provenance lanes · ${exportProvenanceSourceSummary}`
      : uiLanguage === 'zh-CN'
        ? '当前 review 卡还没有拿到来源明细。'
        : 'This review card does not currently have provenance detail.';
  const exportProvenanceSecondary =
    exportProvenanceEntries.length > 1 ? exportProvenanceEntries.slice(1, 3).map((entry) => entry.label).join(' · ') : undefined;
  const exportScopeReceipt = [exportScopeLabel, exportCourseLabel ?? modeCopy.allCourses, selectedFormatLabel].join(' · ');

  async function handleExportSelection() {
    const artifact = exportReviewArtifact;
    const blob = buildDownloadPayload(artifact.format, artifact.content);
    const url = URL.createObjectURL(blob);

    try {
      await browser.downloads.download({
        url,
        filename: artifact.filename,
        saveAs: true,
      });
      setExportFeedback(
        uiLanguage === 'zh-CN'
          ? `已准备下载 ${artifact.filename}`
          : `Download ready: ${artifact.filename}`,
      );
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  return (
    <>
      <article className="surface__panel surface__panel--hero">
        <h2>{modeCopy.title}</h2>
        <p>{modeCopy.description}</p>
        <div className="surface__actions surface__actions--wrap surface__actions--tight">
          <span className="surface__badge surface__badge--neutral">1 · {modeCopy.siteLabel}</span>
          <span className="surface__badge surface__badge--neutral">2 · {modeCopy.familyLabel}</span>
          <span className="surface__badge surface__badge--neutral">3 · {modeCopy.formatLabel}</span>
          <span className="surface__badge surface__badge--neutral">
            4 · {uiLanguage === 'zh-CN' ? '审核并导出' : 'Review & export'}
          </span>
        </div>
      </article>
      <div className="surface__grid surface__grid--split">
        <article className="surface__panel">
          <p className="surface__meta-label">1 · {modeCopy.siteLabel}</p>
          <label className="surface__field">
            <span>{modeCopy.siteLabel}</span>
            <select value={exportScopeSite} onChange={(event) => setExportScopeSite(event.target.value as ExportScopeSite)}>
              <option value="all">{modeCopy.allSites}</option>
              {orderedSiteStatus.map((entry) => (
                <option key={entry.site} value={entry.site}>
                  {SITE_LABELS[entry.site]}
                </option>
              ))}
            </select>
          </label>
          {isCourseScopedExportSite(exportScopeSite) ? (
            <label className="surface__field">
              <span>{modeCopy.courseLabel}</span>
              <select value={exportCourseId} onChange={(event) => setExportCourseId(event.target.value)}>
                <option value="">{modeCopy.allCourses}</option>
                {exportScopedCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.label}
                  </option>
                ))}
              </select>
              <p className="surface__meta">{modeCopy.courseScopedHint}</p>
            </label>
          ) : (
            <p className="surface__meta">{modeCopy.globalHint}</p>
          )}
          <p className="surface__meta-label">3 · {modeCopy.formatLabel}</p>
          <label className="surface__field">
            <span>{modeCopy.formatLabel}</span>
            <select value={selectedFormat} onChange={(event) => setSelectedFormat(event.target.value as ExportFormat)}>
              {EXPORT_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="surface__actions surface__actions--wrap">
            <button className="surface__button surface__button--ghost" onClick={onBackToAssistant} type="button">
              {uiLanguage === 'zh-CN' ? '助手' : 'Assistant'}
            </button>
          </div>
          {exportFeedback ? <p className="surface__feedback">{exportFeedback}</p> : null}
        </article>

        <article className="surface__panel">
          <p className="surface__meta-label">2 · {modeCopy.familyLabel}</p>
          <div className="surface__grid">
            {exportFamilyCards.map((card: ExportFamilyCard) => (
              <button
                key={card.family}
                className={`surface__resource-card ${exportFamily === card.family ? 'surface__resource-card--active' : ''}`}
                disabled={!card.exportable}
                onClick={() => setExportFamily(card.family)}
                type="button"
              >
                <div className="surface__item-header">
                  <strong>{modeCopy.families[card.family].label}</strong>
                  <span className={`surface__badge surface__badge--${card.status === 'available' ? 'success' : card.status === 'partial' ? 'warning' : 'danger'}`}>
                    {modeCopy.badges[card.status]}
                  </span>
                </div>
                <p>{modeCopy.families[card.family].description}</p>
              </button>
            ))}
          </div>
        </article>
      </div>
      <article className="surface__panel surface__panel--trust">
        <p className="surface__meta-label">4 · {uiLanguage === 'zh-CN' ? '审核并导出' : 'Review & export'}</p>
        <div className="surface__item-header">
          <div>
            <strong>{exportReviewTitle}</strong>
            <p className="surface__meta">
              {exportReviewDescription} {uiLanguage === 'zh-CN' ? '先看 trust review，再点导出。' : 'Trust review comes before the export action.'}
            </p>
            <p className="surface__meta">
              {uiLanguage === 'zh-CN' ? '当前 packet receipt：' : 'Current packet receipt: '} {exportScopeReceipt}
            </p>
          </div>
          <span
            className={`surface__badge surface__badge--${
              selectedExportFamilyCard?.status === 'blocked'
                ? 'danger'
                : selectedExportFamilyCard?.status === 'partial'
                  ? 'warning'
                  : 'success'
            }`}
          >
            {exportReviewStatus}
          </span>
        </div>
        <div className="surface__evidence-grid surface__evidence-grid--compact">
          <article className="surface__evidence-card">
            <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? '授权摘要' : 'Authorization summary'}</p>
            <p className="surface__item-lead">{exportAuthorizationLead}</p>
            <p className="surface__meta">{exportAuthorizationDetail}</p>
          </article>
          <article className="surface__evidence-card">
            <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? '导出包诚实度' : 'Packet honesty'}</p>
            <p className="surface__item-lead">{selectedExportFamilyCard?.status === 'blocked' ? exportReviewStatus : exportReviewTitle}</p>
            <p className="surface__meta">{exportPacketHonesty}</p>
          </article>
          <article className="surface__evidence-card">
            <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? 'AI 可见性' : 'AI visibility'}</p>
            <p className="surface__item-lead">{exportAiAllowedLead}</p>
            <p className="surface__meta">{exportAiAllowedDetail}</p>
          </article>
          <article className="surface__evidence-card">
            <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? '来源线索' : 'Provenance'}</p>
            <p className="surface__item-lead">{exportProvenanceLead}</p>
            <p className="surface__meta">{exportProvenanceDetail}</p>
            {exportProvenanceSecondary ? <p className="surface__meta">{exportProvenanceSecondary}</p> : null}
          </article>
        </div>
        <details className="surface__advanced-settings surface__advanced-settings--supporting">
          <summary className="surface__advanced-settings-summary">
            <span>{uiLanguage === 'zh-CN' ? '打开更细的导出证据' : 'Open detailed packet evidence'}</span>
            <span className="surface__badge surface__badge--neutral">3 items</span>
          </summary>
          <div className="surface__advanced-settings-body">
            <div className="surface__evidence-grid surface__evidence-grid--compact">
              <article className="surface__evidence-card">
                <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? '深度状态' : 'Depth status'}</p>
                <p className="surface__item-lead">{exportReviewStatus}</p>
                <p className="surface__meta">{exportDepthDetail}</p>
              </article>
              <article className="surface__evidence-card">
                <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? '风险标签' : 'Risk label'}</p>
                <p className="surface__item-lead">{exportRiskLead}</p>
                <p className="surface__meta">{exportRiskDetail}</p>
              </article>
              <article className="surface__evidence-card">
                <p className="surface__meta-label">{uiLanguage === 'zh-CN' ? '匹配把握' : 'Match confidence'}</p>
                <p className="surface__item-lead">{exportMatchLead}</p>
                <p className="surface__meta">{exportMatchDetail}</p>
              </article>
            </div>
          </div>
        </details>
        <p className="surface__item-lead">
          {uiLanguage === 'zh-CN' ? '本次导出预计包含' : 'This export currently includes'} {exportReviewCount}{' '}
          {uiLanguage === 'zh-CN' ? '项结构化结果。' : 'structured items.'}
        </p>
        <p className="surface__meta">{exportTrustSummary}</p>
        <div className="surface__actions surface__actions--wrap">
          <button className="surface__button" disabled={!selectedExportFamilyCard?.exportable} onClick={() => void handleExportSelection()} type="button">
            {modeCopy.exportButton}
          </button>
          <button className="surface__button surface__button--secondary" onClick={onOpenSettings} type="button">
            {uiLanguage === 'zh-CN' ? '设置' : 'Settings'}
          </button>
        </div>
      </article>
    </>
  );
}
