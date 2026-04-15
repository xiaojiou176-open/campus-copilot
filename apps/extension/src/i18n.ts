import type { ImportanceLevel, PriorityReasonCode } from '@campus-copilot/schema';

export const UI_LANGUAGE_PREFERENCES = ['auto', 'en', 'zh-CN'] as const;
export type UiLanguagePreference = (typeof UI_LANGUAGE_PREFERENCES)[number];

export const RESOLVED_UI_LANGUAGES = ['en', 'zh-CN'] as const;
export type ResolvedUiLanguage = (typeof RESOLVED_UI_LANGUAGES)[number];

function normalizeBrowserLanguage(value: string | readonly string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function resolveUiLanguage(
  preference: UiLanguagePreference = 'auto',
  browserLanguage?: string | readonly string[],
): ResolvedUiLanguage {
  if (preference === 'en' || preference === 'zh-CN') {
    return preference;
  }

  const candidate = normalizeBrowserLanguage(browserLanguage)?.toLowerCase() ?? 'en';
  return candidate.startsWith('zh') ? 'zh-CN' : 'en';
}

export function readBrowserLanguage(): string {
  if (typeof navigator === 'undefined') {
    return 'en-US';
  }

  return navigator.languages?.[0] ?? navigator.language ?? 'en-US';
}

type UiText = {
  exportPresets: {
    weeklyAssignments: string;
    recentUpdates: string;
    allDeadlines: string;
    currentView: string;
    focusQueue: string;
    weeklyLoad: string;
    changeJournal: string;
  };
  exportTitles: {
    home: string;
    currentView: (site: string) => string;
    changeJournal: (site: string) => string;
    focusQueue: (site: string) => string;
    weeklyLoad: (site: string) => string;
  };
  hero: {
    sidepanelEyebrow: string;
    sidepanelTitle: string;
    sidepanelDescription: string;
    popupEyebrow: string;
    popupTitle: string;
    popupDescription: string;
    optionsEyebrow: string;
    optionsTitle: string;
    optionsDescription: string;
  };
  meta: {
    noSyncYet: string;
    lastRefresh: string;
    defaultExport: string;
    noTimeProvided: string;
    emptyValue: string;
    ready: string;
    notReady: string;
    currentStatus: string;
    lastChecked: string;
    lastSync: string;
    missingFromView: string;
  };
  providerReasons: {
    unknown: string;
    configured: string;
    configuredLocalRuntime: string;
    missingApiKey: string;
    missingRuntimeUrl: string;
  };
  priorityReasonLabels: Record<PriorityReasonCode, string>;
  metrics: {
    openAssignments: string;
    dueWithin48Hours: string;
    unseenUpdates: string;
    newGrades: string;
    syncedSites: string;
  };
  toolbar: {
    allSites: string;
    onlyUnseen: string;
  };
  todaySnapshot: {
    title: string;
    description: string;
    currentTodo: string;
    dueSoon: string;
    recentUpdates: string;
    unseenInView: string;
  };
  quickActions: {
    title: string;
    description: string;
    syncCurrentSite: (site: string) => string;
    capturePlanningSubstrate: (surface: string) => string;
    selectSiteBeforeSync: string;
    syncInProgress: (site: string) => string;
    openExport: string;
    exportCurrentView: string;
    markUpdatesSeen: string;
    openOptions: string;
    openMainWorkbench: string;
  };
  nextUp: {
    title: string;
    description: string;
    none: string;
    whyFirst: string;
    dueLabel: string;
    noteLabel: string;
    blockedByLabel: string;
    otherSignals: string;
  };
  planningPulse: {
    title: string;
    description: string;
    none: string;
    readOnlyBadge: string;
    summary: (entry: {
      termCount: number;
      plannedCourseCount: number;
      backupCourseCount: number;
      scheduleOptionCount: number;
    }) => string;
    requirementGroups: (count: number) => string;
    programExploration: (count: number) => string;
    capturedAt: (value: string) => string;
    updatedAt: (value: string) => string;
    degreeProgressLabel: string;
    transferPlanningLabel: string;
    termSummary: (entry: {
      termLabel: string;
      plannedCourseCount: number;
      backupCourseCount: number;
      scheduleOptionCount: number;
    }) => string;
  };
  groupedView: {
    title: string;
    heading: string;
    description: string;
    unifiedBadge: string;
    academicBadge: string;
    administrativeBadge: string;
    academicSummary: (entry: {
      focusCount: number;
      weeklyDays: number;
      alertCount: number;
      updateCount: number;
    }) => string;
    administrativeSummary: (entry: {
      focusCount: number;
      alertCount: number;
      updateCount: number;
      planningVisible: boolean;
    }) => string;
    administrativeLaneTitle: string;
    administrativeLaneDescription: string;
    administrativeLaneMeta: (entry: {
      noticeCount: number;
      scheduleCount: number;
      planningVisible: boolean;
    }) => string;
  };
  trustSummary: {
    title: string;
    description: string;
    freshSites: string;
    partialSites: string;
    staleSites: string;
    blockedSites: string;
    notSyncedSites: string;
    unseenUpdates: string;
    latestReceipt: string;
    noRecentReceipt: string;
    topBlocker: string;
    nextAction: string;
  };
  focusQueue: {
    title: string;
    description: string;
    none: string;
    pin: string;
    unpin: string;
    pinnedBadge: string;
    snoozeUntilTomorrow: string;
    dismissUntilTomorrow: string;
    addNote: string;
    editNote: string;
    notePrompt: (title: string) => string;
  };
  weeklyLoad: {
    title: string;
    description: string;
    none: string;
    assignments: string;
    events: string;
    items: string;
    overdue: string;
    dueSoon: string;
    pinned: string;
    score: string;
    summary: (entry: {
      assignmentCount: number;
      eventCount?: number;
      overdueCount?: number;
      dueSoonCount?: number;
      pinnedCount?: number;
    }) => string;
  };
  changeJournal: {
    title: string;
    description: string;
    none: string;
    receipt: (changeCount: number, outcome: string) => string;
    resourceGaps: (value: string) => string;
    emptyValue: string;
  };
  diagnostics: {
    title: string;
    description: string;
    nextActions: string;
    readyToContinue: string;
    blockedByEnvironmentOrRuntime: string;
    noBlockers: string;
    exportJson: string;
    reportReady: string;
  };
  priorityAlerts: {
    title: string;
    description: string;
    low: string;
    critical: string;
    high: string;
    medium: string;
    none: string;
  };
  recentUpdates: {
    title: string;
    description: string;
    none: string;
  };
  currentTasks: {
    title: string;
    description: string;
    none: string;
    dueAt: (value: string) => string;
    assignmentStatuses: Record<string, string>;
  };
  currentResources: {
    title: string;
    description: string;
    none: string;
    releasedAt: (value: string) => string;
    openDownload: string;
    openRegradeHub: string;
    downloadFile: string;
    openLink: string;
    openLesson: string;
    openSlide: string;
    openMaterial: string;
  };
  discussionHighlights: {
    title: string;
    description: string;
    none: string;
    unread: string;
    staffReply: string;
    untitled: string;
  };
  scheduleOutlook: {
    title: string;
    description: string;
    none: string;
  };
  siteStatus: {
    title: string;
    description: string;
    trustStates: {
      fresh: string;
      partial: string;
      stale: string;
      blocked: string;
      notSynced: string;
    };
    labels: {
      idle: string;
      syncing: string;
      success: string;
      partialSuccess: string;
      notLoggedIn: string;
      unsupportedContext: string;
      unauthorized: string;
      requestFailed: string;
      normalizeFailed: string;
      collectorFailed: string;
      error: string;
    };
    resourceGaps: (value: string) => string;
    syncButton: (site: string) => string;
    syncing: string;
    counts: (input: {
      courses: number;
      resources: number;
      assignments: number;
      announcements: number;
      grades: number;
      messages: number;
      events: number;
    }) => string;
  };
  askAi: {
    title: string;
    description: string;
    runtimeSummary: string;
    whatAiCanSee: string;
    whatAiCannotDo: string;
    guardrailsTitle: string;
    manualOnlyBadge: string;
    defaultDisabledBadge: string;
    redZoneDescription: string;
    advancedMaterialTitle: string;
    advancedMaterialDescription: string;
    advancedMaterialOptInSummary: string;
    advancedMaterialEnableLabel: string;
    advancedMaterialCourseLabel: string;
    advancedMaterialCoursePlaceholder: string;
    advancedMaterialExcerptLabel: string;
    advancedMaterialExcerptPlaceholder: string;
    advancedMaterialAcknowledgement: string;
    structuredInputs: string;
    structuredInputsDescription: string;
    structuredInputLabels: {
      todaySnapshot: string;
      recentUpdates: string;
      priorityAlerts: string;
      focusQueue: string;
      weeklyLoad: string;
      changeJournal: string;
      currentView: string;
    };
    provider: string;
    model: string;
    question: string;
    questionBox: string;
    suggestedPrompts: string;
    answerWithCitations: string;
    advancedRuntimeSettings: string;
    advancedRuntimeDescription: string;
    uncitedAnswerWarning: string;
    suggestions: {
      nextStep: string;
      recentChanges: string;
      trustGaps: string;
    };
    placeholder: string;
    ask: string;
    configure: string;
    missingBffFeedback: string;
    refreshProviderStatus: string;
    refreshingProviderStatus: string;
    keyPoints: string;
    nextActions: string;
    trustGaps: string;
    citations: string;
  };
  popup: {
    pulseSummaryTitle: string;
    pulseSummaryDescription: string;
    fastActionsTitle: string;
    fastActionsDescription: string;
    latestReceipt: string;
    noRecentReceipt: string;
    quickPulse: string;
    quickPulseDescription: string;
    readOnlyBadge: string;
    weeklyAssignments: string;
    weeklyAssignmentsDescription: string;
    recentUpdates: string;
    recentUpdatesDescription: string;
    allDeadlines: string;
    allDeadlinesDescription: string;
    focusQueue: string;
    focusQueueDescription: string;
    weeklyLoad: string;
    weeklyLoadDescription: string;
    changeJournal: string;
    changeJournalDescription: string;
    currentView: string;
    currentViewDescription: string;
  };
  options: {
    configurationTitle: string;
    configurationDescription: string;
    siteConfiguration: string;
    siteConfigurationDescription: string;
    authorizationCenter: string;
    authorizationCenterDescription: string;
    readyProviders: string;
    confirmRequired: string;
    blockedFamilies: string;
    highSensitivityFamilies: string;
    threadsPath: string;
    threadsPathPlaceholder: string;
    unreadPath: string;
    unreadPathPlaceholder: string;
    recentActivityPath: string;
    recentActivityPathPlaceholder: string;
    aiBffConfiguration: string;
    bffBaseUrl: string;
    bffBaseUrlPlaceholder: string;
    defaultProvider: string;
    refreshBffStatus: string;
    refreshingBffStatus: string;
    openAiModel: string;
    geminiModel: string;
    switchyardModel: string;
    switchyardRuntimeProvider: string;
    switchyardLane: string;
    advancedRuntimeSettings: string;
    advancedRuntimeDescription: string;
    manualFallbackOnly: string;
    defaultExportFormat: string;
    saveConfiguration: string;
    configurationSaved: string;
    exportChangeJournal: string;
    exportCurrentView: string;
    interfaceLanguage: string;
    followBrowser: string;
    english: string;
    chinese: string;
  };
  boundaryDisclosure: {
    title: string;
    bullets: string[];
  };
  feedback: {
    noVisibleUpdatesToMark: string;
    visibleUpdatesMarkedSeen: string;
    downloadReady: (filename: string) => string;
    capturingPlanningSubstrate: string;
    planningCaptureSuccess: (label: string) => string;
    planningCapturePartial: (label: string) => string;
    syncSuccess: (site: string) => string;
    syncPartial: (site: string) => string;
    syncOutcome: (site: string, outcome: string) => string;
    questionRequired: string;
    noDisplayableAnswer: string;
    aiRequestFailed: string;
    aiFallbackWithoutCitations: string;
    bffMissingForAi: string;
    providerNotReadyInBff: (provider: string) => string;
    partialSuccess: (site: string) => string;
    overlayPinned: string;
    overlayUnpinned: string;
    overlaySnoozed: string;
    overlayDismissed: string;
    overlayNoteSaved: string;
    overlayNoteCleared: string;
  };
  diagnosticsMessages: {
    missingBffBaseUrl: string;
    providerStatusFetchFailed: string;
    bffBaseUrlNotConfigured: string;
    providerNotReady: (providers: string) => string;
    defaultProviderNotReady: (provider: string) => string;
    sitesStillMissingLivePrerequisites: (sites: string) => string;
    bffProviderStatusFetchFailed: string;
    nextActionSetBff: string;
    nextActionProviderKey: string;
    nextActionSwitchProvider: string;
    nextActionRestoreSiteContext: string;
    nextActionRefreshProviderStatus: string;
  };
  blockingHints: {
    edstemMissingPaths: string;
    myuwTabRequired: string;
    activeTabRequired: string;
  };
  viewHelpers: {
    legacyParsing: {
      missingResourcePrefix: string;
      titleSuffixes: {
        overdue: string;
        dueSoon: string;
        newGrade: string;
        created: string;
        removed: string;
        statusChanged: string;
        dueChanged: string;
        gradeReleased: string;
      };
    };
    resourceLabels: Record<string, string>;
    importanceLabels: Record<ImportanceLevel, string>;
    fallbackReasons: Record<PriorityReasonCode, string>;
    trustDetail: {
      partialMissing: (value: string) => string;
      partialMissingFallback: string;
      blockedByStatus: (status: string) => string;
      noSyncContext: string;
      stale: (value: string) => string;
      ready: string;
      noSuccess: string;
    };
    focusReasons: {
      overdueSince: (value: string) => string;
      dueWithin48Hours: (value: string) => string;
      dueThisWeek: (value: string) => string;
      changedLatestSync: string;
      syncGaps: (value: string) => string;
    };
    alertTitles: {
      overdue: (base: string) => string;
      dueSoon: (base: string) => string;
      newGrade: (base: string) => string;
      attentionNeeded: (site: string) => string;
      updateFromSite: (site: string) => string;
    };
    alertSummaries: {
      overdue: string;
      dueSoon: string;
      newGrade: string;
      importantAnnouncement: string;
      instructorActivity: string;
      unreadMention: string;
      attentionNeeded: string;
      structuredUpdateNeedsAttention: string;
    };
    assignmentStatuses: Record<string, string>;
    timelineKindLabels: Record<string, string>;
    changeTypeLabels: Record<string, string>;
    timelineTitles?: Record<string, string>;
    timelineSummaries: Record<string, string>;
    weeklyLoadHighlights: {
      overdue: (count: number) => string;
      dueSoon: (count: number) => string;
      pinned: (count: number) => string;
      eventNodes: (count: number) => string;
    };
    changeValues: {
      read: string;
      unread: string;
    };
    changeTitles: {
      created: (base: string) => string;
      removed: (base: string) => string;
      statusChanged: (base: string) => string;
      dueChanged: (base: string) => string;
      gradeReleased: (base: string) => string;
      unreadDiscussion: string;
      syncPartial: (site: string) => string;
      updateFromSite: (site: string) => string;
    };
    changeSummaries: {
      created: string;
      removed: string;
      statusChanged: (previousValue: string, nextValue: string) => string;
      dueChanged: (previousValue: string, nextValue: string) => string;
      gradeReleased: (value: string) => string;
      unreadAgain: string;
      unreadNew: string;
      syncPartial: (value: string) => string;
      structuredChangeRecorded: string;
    };
  };
};

const TEXT: Record<ResolvedUiLanguage, UiText> = {
  en: {
    exportPresets: {
      weeklyAssignments: 'Export weekly assignments',
      recentUpdates: 'Export recent updates',
      allDeadlines: 'Export all deadlines',
      currentView: 'Export current view',
      focusQueue: 'Export focus queue',
      weeklyLoad: 'Export weekly load',
      changeJournal: 'Export change journal',
    },
    exportTitles: {
      home: 'Campus Copilot Home',
      currentView: (site) => `${site} current view`,
      changeJournal: (site) => `${site} change journal`,
      focusQueue: (site) => `${site} focus queue`,
      weeklyLoad: (site) => `${site} weekly load`,
    },
    hero: {
      sidepanelEyebrow: 'Campus Copilot Sidepanel',
      sidepanelTitle: 'Academic workbench',
      sidepanelDescription:
        'This is not an empty chat box. It keeps academic work and administrative signals on one desk first, then helps you see what is happening today, what is blocked, and what changed recently.',
      popupEyebrow: 'Campus Copilot Popup',
      popupTitle: 'Quick pulse',
      popupDescription:
        'Popup stays lightweight and acts like a quick pulse check: sync status, priority counts, and the fastest way into the main workbench.',
      optionsEyebrow: 'Campus Copilot Options',
      optionsTitle: 'Settings and trust center',
      optionsDescription:
        'This page should explain what the product can read, what AI may analyze, and which local runtime is active without turning into a mini workbench.',
    },
    meta: {
      noSyncYet: 'No sync yet',
      lastRefresh: 'Last refresh',
      defaultExport: 'Default export',
      noTimeProvided: 'No time provided',
      emptyValue: 'empty',
      ready: 'ready',
      notReady: 'not ready',
      currentStatus: 'Current status',
      lastChecked: 'Last checked',
      lastSync: 'Last sync',
      missingFromView: 'Unseen in current view',
    },
    providerReasons: {
      unknown: 'unknown',
      configured: 'configured',
      configuredLocalRuntime: 'configured local runtime',
      missingApiKey: 'missing API key',
      missingRuntimeUrl: 'missing runtime url',
    },
    priorityReasonLabels: {
      due_soon: 'Due soon',
      overdue: 'Overdue',
      recently_updated: 'Recently updated',
      unread_activity: 'Unread activity',
      new_grade: 'New grade',
      important_announcement: 'Important announcement',
      sync_stale: 'Sync needs attention',
      manual: 'Manually pinned',
    },
    metrics: {
      openAssignments: 'Open assignments',
      dueWithin48Hours: 'Due within 48 hours',
      unseenUpdates: 'Unseen updates',
      newGrades: 'New grades',
      syncedSites: 'Synced sites',
    },
    toolbar: {
      allSites: 'All sites',
      onlyUnseen: 'Only unseen updates',
    },
    todaySnapshot: {
      title: 'Today Snapshot',
      description: 'This acts like a sticky note for today. It tells you whether anything is urgent before you dive into details.',
      currentTodo: 'Current tasks',
      dueSoon: 'Due soon',
      recentUpdates: 'Recent updates',
      unseenInView: 'Unseen in current view',
    },
    quickActions: {
      title: 'Quick Actions',
      description: 'These buttons act like the most useful desk drawers, so you can do high-value actions without detouring.',
      syncCurrentSite: (site) => `Sync ${site}`,
      capturePlanningSubstrate: (surface) => `Capture ${surface}`,
      selectSiteBeforeSync: 'Select a site before syncing',
      syncInProgress: (site) => `Syncing ${site}...`,
      openExport: 'Open export',
      exportCurrentView: 'Export current view',
      markUpdatesSeen: 'Mark updates as seen',
      openOptions: 'Open Options',
      openMainWorkbench: 'Open full workbench',
    },
    nextUp: {
      title: 'Next Up',
      description: 'This turns the top-ranked focus item into a plain-English answer before you scroll into the full queue.',
      none: 'No focus item is ranked first yet. Sync a site or pin something important to create a next step.',
      whyFirst: 'Why this is first',
      dueLabel: 'Due',
      noteLabel: 'Local note',
      blockedByLabel: 'Trust gaps',
      otherSignals: 'Other ranking signals',
    },
    planningPulse: {
      title: 'Planning Pulse',
      description:
        'This keeps the latest shared planning snapshot in the decision workspace so term load, backups, and planning gaps stay visible without implying registration automation.',
      none: 'No shared planning snapshot is visible yet.',
      readOnlyBadge: 'Read-only',
      summary: ({ termCount, plannedCourseCount, backupCourseCount, scheduleOptionCount }) =>
        `${termCount} term(s) · ${plannedCourseCount} planned course(s) · ${backupCourseCount} backup course(s) · ${scheduleOptionCount} schedule option(s)`,
      requirementGroups: (count) => `${count} requirement group(s)`,
      programExploration: (count) => `${count} exploration path(s)`,
      capturedAt: (value) => `Captured ${value}`,
      updatedAt: (value) => `Updated ${value}`,
      degreeProgressLabel: 'Degree progress',
      transferPlanningLabel: 'Transfer planning',
      termSummary: ({ termLabel, plannedCourseCount, backupCourseCount, scheduleOptionCount }) =>
        `${termLabel}: ${plannedCourseCount} planned · ${backupCourseCount} backup · ${scheduleOptionCount} option(s)`,
    },
    groupedView: {
      title: 'Grouped student view',
      heading: 'One sorter, two ways to read it',
      description:
        'The same decision desk now starts to separate academic work and planning from administrative signals without splitting them into two different products.',
      unifiedBadge: 'Unified priority',
      academicBadge: 'Academic',
      administrativeBadge: 'Administrative',
      academicSummary: ({ focusCount, weeklyDays, alertCount, updateCount }) =>
        `${focusCount} ranked item(s), ${weeklyDays} active planning day(s), ${alertCount} alert(s), and ${updateCount} recent update(s) are currently reading as academic work.`,
      administrativeSummary: ({ focusCount, alertCount, updateCount, planningVisible }) =>
        `${focusCount} ranked admin item(s), ${alertCount} alert(s), and ${updateCount} recent update(s) are currently reading as administrative signals.${planningVisible ? ' Planning Pulse is tracked separately in the academic/planning lane.' : ''}`,
      administrativeLaneTitle: 'Administrative lane',
      administrativeLaneDescription:
        'This keeps MyUW notice signals and schedule context visible as one real administrative line instead of burying them as side notes.',
      administrativeLaneMeta: ({ noticeCount, scheduleCount, planningVisible }) =>
        `${noticeCount} notice signal(s) · ${scheduleCount} schedule context item(s)${planningVisible ? ' · Planning Pulse stays in the academic/planning lane' : ''}`,
    },
    trustSummary: {
      title: 'Trust Summary',
      description: 'This compresses sync health into one glance: what looks solid, what needs caution, and what is still blocked.',
      freshSites: 'Fresh sites',
      partialSites: 'Partial sites',
      staleSites: 'Stale sites',
      blockedSites: 'Blocked sites',
      notSyncedSites: 'Not synced sites',
      unseenUpdates: 'Unseen updates',
      latestReceipt: 'Latest receipt',
      noRecentReceipt: 'No sync receipt is recorded yet.',
      topBlocker: 'Top blocker',
      nextAction: 'Next action',
    },
    focusQueue: {
      title: 'Focus Queue',
      description: 'This is the first formal answer to “what should I do first?” It combines structure with your own local judgment.',
      none: 'No focus items are active right now. Sync a site or pin an item to build the queue.',
      pin: 'Pin',
      unpin: 'Unpin',
      pinnedBadge: 'Pinned',
      snoozeUntilTomorrow: 'Snooze 24h',
      dismissUntilTomorrow: 'Dismiss 24h',
      addNote: 'Add note',
      editNote: 'Edit note',
      notePrompt: (title) => `Add or edit a local note for "${title}". Leave it blank to clear the note.`,
    },
    weeklyLoad: {
      title: 'Weekly Load',
      description: 'This behaves like a short-range workload forecast for the next seven days.',
      none: 'No dated workload is visible yet.',
      assignments: 'Assignments',
      events: 'Events',
      items: 'Items',
      overdue: 'Overdue',
      dueSoon: 'Due soon',
      pinned: 'Pinned',
      score: 'Load score',
      summary: ({ assignmentCount, eventCount = 0, overdueCount = 0, dueSoonCount = 0, pinnedCount = 0 }) =>
        overdueCount > 0
          ? `${overdueCount} overdue item(s) need recovery, with ${dueSoonCount} more due soon.`
          : dueSoonCount > 0
            ? `${assignmentCount} assignment(s) and ${eventCount} event(s) make this an active planning day.`
            : pinnedCount > 0
              ? `${pinnedCount} pinned item(s) keep this day intentionally in focus.`
              : `${assignmentCount} assignment(s) and ${eventCount} event(s) are currently scheduled.`,
    },
    changeJournal: {
      title: 'Change Journal',
      description: 'This acts like a sync receipt: what changed, not just whether sync finished.',
      none: 'No recorded sync changes exist yet.',
      receipt: (changeCount, outcome) => `${changeCount} change event(s) were recorded in the latest ${outcome} run.`,
      resourceGaps: (value) => `Resource gaps: ${value}`,
      emptyValue: 'empty',
    },
    diagnostics: {
      title: 'Diagnostics',
      description: 'This area acts like a runtime control tower. It tells you what is actually blocked, not how many features exist.',
      nextActions: 'Next Actions',
      readyToContinue: 'Ready to continue',
      blockedByEnvironmentOrRuntime: 'Blocked by environment or runtime',
      noBlockers: 'No obvious runtime blockers are active right now, so deeper validation can continue.',
      exportJson: 'Export diagnostics JSON',
      reportReady: 'campus-copilot-diagnostics.json is ready to download.',
    },
    priorityAlerts: {
      title: 'Priority Alerts',
      description: 'This behaves like an on-call board. The point is not volume, but which items need attention first.',
      low: 'Low',
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      none: 'No alerts exist yet. Sync at least one site so the system has real facts to rank.',
    },
    recentUpdates: {
      title: 'Recent Updates',
      description: 'This answers what changed recently while letting you focus on updates you have not processed yet.',
      none: 'No updates are visible in the current filter.',
    },
    currentTasks: {
      title: 'Current Tasks',
      description: 'This keeps structured tasks visible before deeper detail views exist.',
      none: 'No structured tasks are visible in the current filter. Sync a site first.',
      dueAt: (value) => `Due ${value}`,
      assignmentStatuses: {
        todo: 'To do',
        submitted: 'Submitted',
        graded: 'Graded',
        missing: 'Missing',
        overdue: 'Overdue',
        unknown: 'Unknown',
      },
    },
    currentResources: {
      title: 'Study Materials',
      description: 'This keeps course files and released study materials visible inside the same workspace instead of leaving them buried on a site resources page.',
      none: 'No study materials are visible in the current filter.',
      releasedAt: (value) => `Released ${value}`,
      openDownload: 'Open download',
      openRegradeHub: 'Open regrade hub',
      downloadFile: 'Download file',
      openLink: 'Open link',
      openLesson: 'Open lesson',
      openSlide: 'Open slide',
      openMaterial: 'Open material',
    },
    discussionHighlights: {
      title: 'Discussion Highlights',
      description: 'This keeps recent discussion context visible, so thread updates stay inside the workbench instead of disappearing into site-specific inboxes.',
      none: 'No discussion highlights are visible in the current filter.',
      unread: 'Unread',
      staffReply: 'Staff',
      untitled: 'Untitled discussion',
    },
    scheduleOutlook: {
      title: 'Schedule Outlook',
      description: 'This keeps upcoming classes, notices, and exams visible with any location or timing detail already present in the shared workbench truth.',
      none: 'No upcoming schedule details are visible in the current filter.',
    },
    siteStatus: {
      title: 'Site Status',
      description: 'This area tells the truth about runtime state: which site is live, which is partial, and which one is blocked by context or configuration.',
      trustStates: {
        fresh: 'fresh',
        partial: 'partial',
        stale: 'stale',
        blocked: 'blocked',
        notSynced: 'not synced',
      },
      labels: {
        idle: 'idle',
        syncing: 'syncing',
        success: 'success',
        partialSuccess: 'partial success',
        notLoggedIn: 'not logged in',
        unsupportedContext: 'unsupported context',
        unauthorized: 'unauthorized',
        requestFailed: 'request failed',
        normalizeFailed: 'normalize failed',
        collectorFailed: 'collector failed',
        error: 'error',
      },
      resourceGaps: (value) => `Remaining resource gaps: ${value}`,
      syncButton: (site) => `Sync ${site}`,
      syncing: 'Syncing...',
      counts: ({ courses, resources, assignments, announcements, grades, messages, events }) =>
        `Courses ${courses} · Resources ${resources} · Assignments ${assignments} · Announcements ${announcements} · Grades ${grades} · Messages ${messages} · Events ${events}`,
    },
    askAi: {
      title: 'Ask AI about this workspace',
      description:
        'AI acts like a study copilot here. It explains the current Focus Queue, Weekly Load, Change Journal, and recent updates after structure instead of reading raw pages or DOM.',
      runtimeSummary: 'Current runtime',
      whatAiCanSee: 'What AI can see',
      whatAiCannotDo: 'What AI cannot do',
      guardrailsTitle: 'Academic safety guardrails',
      manualOnlyBadge: 'Manual only',
      defaultDisabledBadge: 'Default off',
      redZoneDescription:
        'Register.UW, Notify.UW, seat watching, and registration-related polling stay outside the current product path. Use the original site if you need to continue manually.',
      advancedMaterialTitle: 'Advanced material analysis',
      advancedMaterialDescription:
        'Raw course files, lecture slides, instructor-authored notes, exams, quizzes, assignment PDFs, and solution documents stay outside the default AI path unless a later per-course opt-in contract explicitly promotes them.',
      advancedMaterialOptInSummary:
        'The only supported advanced path is a course-scoped opt-in with a user-pasted excerpt. Campus Copilot still does not fetch or upload raw files for you.',
      advancedMaterialEnableLabel: 'Enable excerpt analysis for one course',
      advancedMaterialCourseLabel: 'Opt-in course',
      advancedMaterialCoursePlaceholder: 'Select one visible course',
      advancedMaterialExcerptLabel: 'Paste the excerpt you want analyzed',
      advancedMaterialExcerptPlaceholder:
        'Paste only the passage you want help with. Do not rely on hidden files, raw downloads, or content you do not have the right to use.',
      advancedMaterialAcknowledgement:
        'I confirm this excerpt is for my own course context, I am choosing this one course explicitly, and rights/policy compliance remain my responsibility.',
      structuredInputs: 'Structured inputs',
      structuredInputsDescription:
        'Every answer is grounded in the visible workbench state below, so the model is explaining this study desk rather than inventing context from raw pages, cookies, or hidden browser state.',
      structuredInputLabels: {
        todaySnapshot: 'Today snapshot',
        recentUpdates: 'Recent updates',
        priorityAlerts: 'Priority alerts',
        focusQueue: 'Focus queue',
        weeklyLoad: 'Weekly load',
        changeJournal: 'Change journal',
        currentView: 'Current workbench view',
      },
      provider: 'Provider',
      model: 'Model',
      question: 'Question',
      questionBox: 'Question box',
      suggestedPrompts: 'Suggested prompts',
      answerWithCitations: 'Answer with citations',
      advancedRuntimeSettings: 'Advanced runtime settings',
      advancedRuntimeDescription:
        'Provider, model, and Switchyard controls stay here as runtime details. The workspace should stay the main character on the first screen.',
      uncitedAnswerWarning: 'Needs citations',
      suggestions: {
        nextStep: 'What should I do first today, and why?',
        recentChanges: 'What changed since the latest sync that I should care about?',
        trustGaps: 'Which trust gaps or sync blockers should I verify before acting?',
      },
      placeholder: 'For example: What should I pay attention to right now? What changed recently?',
      ask: 'Ask AI',
      configure: 'Configure BFF / Provider',
      missingBffFeedback: 'BFF base URL is still missing, so the AI path should fail loudly instead of silently.',
      refreshProviderStatus: 'Refresh provider status',
      refreshingProviderStatus: 'Refreshing...',
      keyPoints: 'Key points',
      nextActions: 'Suggested next steps',
      trustGaps: 'Trust gaps to verify',
      citations: 'Citations',
    },
    popup: {
      pulseSummaryTitle: 'Pulse summary',
      pulseSummaryDescription:
        'Use this like a thermometer, not a second dashboard. Check the smallest useful facts here, then move into the full workbench when you need detail.',
      fastActionsTitle: 'Fast actions',
      fastActionsDescription:
        'Keep the popup honest: open the full workbench, sync the current site, or export the current slice without pretending this is the whole product.',
      latestReceipt: 'Latest receipt',
      noRecentReceipt: 'No sync receipt is recorded yet.',
      quickPulse: 'Quick pulse exports',
      quickPulseDescription:
        'Use this lightweight panel like a temperature check. Take one small export slice, then move into the sidepanel for the full workbench.',
      readOnlyBadge: 'Read-only',
      weeklyAssignments: 'Weekly assignments',
      weeklyAssignmentsDescription: 'Carry this week’s assignment pulse into notes or a planner.',
      recentUpdates: 'Recent updates',
      recentUpdatesDescription: 'Grab the newest deltas before you open the full workspace.',
      allDeadlines: 'All deadlines',
      allDeadlinesDescription: 'Pull a complete deadline sweep when you need the whole horizon.',
      focusQueue: 'Focus queue',
      focusQueueDescription: 'Export the next-up sequence that deserves attention first.',
      weeklyLoad: 'Weekly load',
      weeklyLoadDescription: 'Take the current load snapshot without opening the full desk.',
      changeJournal: 'Change journal',
      changeJournalDescription: 'Export what changed recently so you can scan it offline.',
      currentView: 'Current view',
      currentViewDescription: 'Capture the exact workbench slice that is already in front of you.',
    },
    options: {
      configurationTitle: 'Settings and authorization',
      configurationDescription:
        'Start with trust and connection status. Expand the runtime and site overrides only when the default path is not enough.',
      siteConfiguration: 'Site configuration',
      siteConfigurationDescription:
        'EdStem first tries to infer the threads path from the active course tab. Only override it manually when auto-inference is not enough. Unread and recent activity paths are optional.',
      authorizationCenter: 'Trust center',
      authorizationCenterDescription:
        'Keep read/export separate from AI analysis, show the current site boundaries, and record course-level confirmations so the product stays structured-before-AI.',
      readyProviders: 'Ready AI routes',
      confirmRequired: 'Confirm required',
      blockedFamilies: 'Sensitive families blocked',
      highSensitivityFamilies: 'High-sensitivity summary families',
      threadsPath: 'EdStem threads path',
      threadsPathPlaceholder: 'For example: /api/courses/90031/threads?limit=30&sort=new',
      unreadPath: 'EdStem unread path',
      unreadPathPlaceholder: 'Optional: leave empty to avoid overriding the unread path',
      recentActivityPath: 'EdStem recent activity path',
      recentActivityPathPlaceholder: 'Optional: leave empty to avoid overriding the recent activity path',
      aiBffConfiguration: 'Local AI connection',
      bffBaseUrl: 'Local AI service URL',
      bffBaseUrlPlaceholder: 'For example: http://127.0.0.1:8787',
      defaultProvider: 'Default provider',
      refreshBffStatus: 'Refresh BFF status',
      refreshingBffStatus: 'Refreshing...',
      openAiModel: 'OpenAI model',
      geminiModel: 'Gemini model',
      switchyardModel: 'Switchyard model',
      switchyardRuntimeProvider: 'Switchyard runtime provider',
      switchyardLane: 'Switchyard lane',
      advancedRuntimeSettings: 'Advanced connection overrides',
      advancedRuntimeDescription:
        'Manual service overrides, model strings, and site-specific paths stay here so the first screen can stay summary-first.',
      manualFallbackOnly: 'Manual override only',
      defaultExportFormat: 'Default export format',
      saveConfiguration: 'Save configuration',
      configurationSaved: 'Configuration saved.',
      exportChangeJournal: 'Export change journal',
      exportCurrentView: 'Export current view',
      interfaceLanguage: 'Interface language',
      followBrowser: 'Follow browser',
      english: 'English',
      chinese: '中文',
    },
    boundaryDisclosure: {
      title: 'Boundary disclosure',
      bullets: [
        'The current product path remains local-first, manual-sync, and read-only. It should not silently scrape in the background.',
        'EdStem paths are explicitly configured instead of guessed behind the scenes.',
        'MyUW depends on the active tab for page-state or DOM context and should fail honestly when that context is missing.',
        'The current AI path only covers formal OpenAI and Gemini API-key flows. Gemini OAuth, web_session, and automatic multi-provider routing are still outside the formal path.',
        'AI consumes normalized schema and read-model results rather than raw DOM, cookies, or raw site payloads.',
      ],
    },
    feedback: {
      noVisibleUpdatesToMark: 'No visible updates need to be marked as seen in the current filter.',
      visibleUpdatesMarkedSeen: 'Recent updates in the current view are now marked as seen.',
      downloadReady: (filename) => `${filename} is ready to download.`,
      capturingPlanningSubstrate: 'Capturing the current MyPlan / DARS page into Planning Pulse…',
      planningCaptureSuccess: (label) => `${label} was captured into Planning Pulse.`,
      planningCapturePartial: (label) => `${label} was captured, but the other MyPlan / DARS half is still missing.`,
      syncSuccess: (site) => `${site} sync succeeded and refreshed structured data.`,
      syncPartial: (site) => `${site} sync partially succeeded and still has resources to fill in.`,
      syncOutcome: (site, outcome) => `${site} sync finished with ${outcome}. Review the site status panel.`,
      questionRequired: 'Enter a question so AI knows what to explain.',
      noDisplayableAnswer: 'The BFF responded, but the current provider did not return a displayable answer.',
      aiRequestFailed: 'AI request failed.',
      aiFallbackWithoutCitations:
        'The current provider returned a displayable answer, but it did not include the structured citation block yet. Treat this as uncited fallback.',
      bffMissingForAi: 'BFF base URL is not configured yet. Set it in Options first.',
      providerNotReadyInBff: (provider) => `${provider} is not ready in the BFF yet.`,
      partialSuccess: (site) => `${site} partially succeeded.`,
      overlayPinned: 'Pinned for focus.',
      overlayUnpinned: 'Removed from pinned focus.',
      overlaySnoozed: 'Snoozed for the next 24 hours.',
      overlayDismissed: 'Dismissed for the next 24 hours.',
      overlayNoteSaved: 'Local note saved.',
      overlayNoteCleared: 'Local note cleared.',
    },
    diagnosticsMessages: {
      missingBffBaseUrl: 'BFF base URL is not configured yet',
      providerStatusFetchFailed: 'provider status fetch failed',
      bffBaseUrlNotConfigured: 'BFF base URL is not configured',
      providerNotReady: (providers) => `Provider not ready: ${providers}`,
      defaultProviderNotReady: (provider) => `Default provider not ready: ${provider}`,
      sitesStillMissingLivePrerequisites: (sites) => `Sites still missing live prerequisites: ${sites}`,
      bffProviderStatusFetchFailed: 'BFF provider status fetch failed',
      nextActionSetBff: 'Set the BFF base URL in Options, then refresh provider status.',
      nextActionProviderKey: 'Add at least one formal provider API key before attempting a real AI round-trip.',
      nextActionSwitchProvider: 'Switch to a ready provider or configure the current default provider API key.',
      nextActionRestoreSiteContext: 'Restore the real logged-in context or trigger sync from the correct site tab, then retry live validation.',
      nextActionRefreshProviderStatus: 'Confirm that the BFF service is running, then refresh provider status.',
    },
    blockingHints: {
      edstemMissingPaths: 'EdStem private request paths are missing. Fill them in through Options first.',
      myuwTabRequired: 'Trigger sync from a MyUW page tab so the system can read page state or DOM context.',
      activeTabRequired: 'Trigger sync manually from an active tab on the corresponding site.',
    },
    viewHelpers: {
      legacyParsing: {
        missingResourcePrefix: '未同步 ',
        titleSuffixes: {
          overdue: ' 已逾期',
          dueSoon: ' 48 小时内截止',
          newGrade: ' 出了新成绩',
          created: ' 新增',
          removed: ' 已移除',
          statusChanged: ' 状态变化',
          dueChanged: ' 截止时间变化',
          gradeReleased: ' 有新的成绩信息',
        },
      },
      resourceLabels: {
        assignments: 'Assignments',
        announcements: 'Announcements',
        courses: 'Courses',
        events: 'Events',
        grades: 'Grades',
        messages: 'Messages',
      },
      importanceLabels: {
        critical: 'Critical',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
      },
      fallbackReasons: {
        due_soon: 'Due within 48 hours',
        overdue: 'Already overdue',
        recently_updated: 'Changed in the latest sync',
        unread_activity: 'Unread activity needs review',
        new_grade: 'A new grade is available',
        important_announcement: 'A recent update may affect your plan',
        sync_stale: 'Site sync is incomplete or stale',
        manual: 'Pinned manually',
      },
      trustDetail: {
        partialMissing: (value) => `Partial: missing ${value}.`,
        partialMissingFallback: 'some resources',
        blockedByStatus: (status) => `Blocked by ${status}.`,
        noSyncContext: 'No usable sync context is available yet.',
        stale: (value) => `Stale: last successful sync was ${value}.`,
        ready: 'Fresh enough to keep working from the current workbench view.',
        noSuccess: 'No successful sync has been recorded yet.',
      },
      focusReasons: {
        overdueSince: (value) => `Overdue since ${value}`,
        dueWithin48Hours: (value) => `Due within 48 hours (${value})`,
        dueThisWeek: (value) => `Due this week (${value})`,
        changedLatestSync: 'Changed in the latest sync',
        syncGaps: (value) => `Sync still has gaps: ${value}`,
      },
      alertTitles: {
        overdue: (base) => `${base} is overdue`,
        dueSoon: (base) => `${base} is due soon`,
        newGrade: (base) => `New grade posted for ${base}`,
        attentionNeeded: (site) => `${site} sync needs attention`,
        updateFromSite: (site) => `Update from ${site}`,
      },
      alertSummaries: {
        overdue: 'This work is already past due and should move to the front.',
        dueSoon: 'This work is approaching its deadline and should stay near the top.',
        newGrade: 'A new grade landed recently.',
        importantAnnouncement: 'A recent course announcement may change your plan.',
        instructorActivity: 'Instructor activity showed up recently.',
        unreadMention: 'There is unread discussion activity to review.',
        attentionNeeded: 'The latest sync was not fully clean, so some results may still be incomplete.',
        structuredUpdateNeedsAttention: 'A structured update needs your attention.',
      },
      assignmentStatuses: {
        todo: 'To do',
        submitted: 'Submitted',
        graded: 'Graded',
        missing: 'Missing',
        overdue: 'Overdue',
        unknown: 'Unknown',
      },
      timelineKindLabels: {
        announcement_posted: 'Announcement',
        assignment_created: 'New assignment',
        assignment_due: 'Due date',
        grade_released: 'Grade released',
        discussion_replied: 'Discussion reply',
        schedule_updated: 'Schedule update',
        alert_triggered: 'Alert',
      },
      changeTypeLabels: {
        created: 'Created',
        removed: 'Removed',
        status_changed: 'Status changed',
        due_changed: 'Due date changed',
        grade_released: 'Grade released',
        message_unread: 'Unread discussion',
        sync_partial: 'Partial sync',
      },
      timelineTitles: {
        announcement_posted: 'Recent announcement',
        assignment_created: 'New assignment',
        assignment_due: 'Due date update',
        grade_released: 'New grade result',
        discussion_replied: 'Recent discussion update',
        schedule_updated: 'Schedule update',
        alert_triggered: 'Recent alert',
      },
      timelineSummaries: {
        announcement_posted: 'A recent course announcement was posted.',
        assignment_created: 'A new assignment appeared in the latest sync.',
        grade_released: 'A new grading result was released recently.',
        discussion_replied: 'Recent discussion activity landed here.',
        schedule_updated: 'A time-related event or schedule item changed recently.',
        alert_triggered: 'A new alert was triggered in the latest sync.',
      },
      weeklyLoadHighlights: {
        overdue: (count) => `${count} overdue`,
        dueSoon: (count) => `${count} due soon`,
        pinned: (count) => `${count} pinned`,
        eventNodes: (count) => `${count} event nodes`,
      },
      changeValues: {
        read: 'read',
        unread: 'unread',
      },
      changeTitles: {
        created: (base) => `${base} was added`,
        removed: (base) => `${base} was removed`,
        statusChanged: (base) => `${base} status changed`,
        dueChanged: (base) => `${base} due date changed`,
        gradeReleased: (base) => `${base} has a new grade`,
        unreadDiscussion: 'Unread discussion activity',
        syncPartial: (site) => `${site} synced partially`,
        updateFromSite: (site) => `Update from ${site}`,
      },
      changeSummaries: {
        created: 'This structured record just entered the local snapshot.',
        removed: 'This structured record no longer appears in the latest snapshot.',
        statusChanged: (previousValue, nextValue) => `Status changed from ${previousValue} to ${nextValue}.`,
        dueChanged: (previousValue, nextValue) => `Due date changed from ${previousValue} to ${nextValue}.`,
        gradeReleased: (value) => `The latest grade is ${value}.`,
        unreadAgain: 'This discussion moved from read back to unread.',
        unreadNew: 'A new unread discussion appeared.',
        syncPartial: (value) => `Structured data was updated, but resource gaps remain: ${value}.`,
        structuredChangeRecorded: 'A structured change was recorded.',
      },
    },
  },
  'zh-CN': {
    exportPresets: {
      weeklyAssignments: '导出本周作业',
      recentUpdates: '导出最近更新',
      allDeadlines: '导出全部截止日期',
      currentView: '导出当前视图',
      focusQueue: '导出专注队列',
      weeklyLoad: '导出本周负荷',
      changeJournal: '导出变化账本',
    },
    exportTitles: {
      home: 'Campus Copilot 首页',
      currentView: (site) => `${site} 当前视图`,
      changeJournal: (site) => `${site} 变化账本`,
      focusQueue: (site) => `${site} 专注队列`,
      weeklyLoad: (site) => `${site} 本周负荷`,
    },
    hero: {
      sidepanelEyebrow: 'Campus Copilot 侧边栏',
      sidepanelTitle: '学习工作台',
      sidepanelDescription: '这里不是空聊天框，而是先把学业任务和行政信号放到同一张桌面上，再帮你看清今天有什么、哪里卡住了、哪些变化还没看。',
      popupEyebrow: 'Campus Copilot 弹窗',
      popupTitle: '快速体温计',
      popupDescription: 'Popup 保持轻量，负责给你一个很快的体温计：有没有同步、有没有高优先级数字、要不要立刻打开主工作台。',
      optionsEyebrow: 'Campus Copilot 设置',
      optionsTitle: '设置与信任中心',
      optionsDescription: '这页要讲清产品能读什么、AI 能分析什么、当前连的是哪条本地 runtime，而不是再变成一块迷你工作台。',
    },
    meta: {
      noSyncYet: '还没有同步',
      lastRefresh: '上次刷新',
      defaultExport: '默认导出',
      noTimeProvided: '未提供时间',
      emptyValue: '空值',
      ready: '已就绪',
      notReady: '未就绪',
      currentStatus: '当前状态',
      lastChecked: '最近检查',
      lastSync: '最近同步',
      missingFromView: '当前视图未查看',
    },
    providerReasons: {
      unknown: '未知',
      configured: '已配置',
      configuredLocalRuntime: '本地运行时已配置',
      missingApiKey: '缺少 API key',
      missingRuntimeUrl: '缺少运行时地址',
    },
    priorityReasonLabels: {
      due_soon: '即将到期',
      overdue: '已逾期',
      recently_updated: '最近有变化',
      unread_activity: '有未读动态',
      new_grade: '有新成绩',
      important_announcement: '重要公告',
      sync_stale: '同步需留意',
      manual: '你已手动置顶',
    },
    metrics: {
      openAssignments: '待办作业',
      dueWithin48Hours: '48 小时内截止',
      unseenUpdates: '未查看更新',
      newGrades: '新成绩',
      syncedSites: '成功同步站点',
    },
    toolbar: {
      allSites: '全部站点',
      onlyUnseen: '仅看未查看更新',
    },
    todaySnapshot: {
      title: '今日快照',
      description: '这里像桌面上的今日便签。先告诉你今天有没有急事，再决定要不要继续钻进细节。',
      currentTodo: '当前待办',
      dueSoon: '即将到期',
      recentUpdates: '最近更新',
      unseenInView: '当前视图未查看',
    },
    quickActions: {
      title: '快捷动作',
      description: '这些按钮像办公桌最顺手的四个抽屉，让你不用绕路就能做高价值动作。',
      syncCurrentSite: (site) => `同步 ${site}`,
      capturePlanningSubstrate: (surface) => `抓取 ${surface}`,
      selectSiteBeforeSync: '先选择站点再同步',
      syncInProgress: (site) => `同步 ${site} 中…`,
      openExport: '打开导出',
      exportCurrentView: '导出当前视图',
      markUpdatesSeen: '标记更新已查看',
      openOptions: '打开设置',
      openMainWorkbench: '打开完整工作台',
    },
    nextUp: {
      title: '现在先做什么',
      description: '这里把排名第一的专注项翻译成人话，让你不用先读完整个队列才知道下一步。',
      none: '目前还没有排在第一位的专注项。先同步站点，或先手动置顶一条重要事项。',
      whyFirst: '为什么它排第一',
      dueLabel: '截止时间',
      noteLabel: '本地备注',
      blockedByLabel: '可信度缺口',
      otherSignals: '其他排序信号',
    },
    planningPulse: {
      title: '计划脉冲',
      description:
        '这里把最新的共享规划快照放进决策工作台，让学期负荷、备选课和规划缺口持续可见，但不把它包装成注册自动化。',
      none: '当前还没有可见的共享规划快照。',
      readOnlyBadge: '只读',
      summary: ({ termCount, plannedCourseCount, backupCourseCount, scheduleOptionCount }) =>
        `${termCount} 个学期 · ${plannedCourseCount} 门计划课程 · ${backupCourseCount} 门备选课程 · ${scheduleOptionCount} 个排课选项`,
      requirementGroups: (count) => `${count} 个要求分组`,
      programExploration: (count) => `${count} 条项目探索线`,
      capturedAt: (value) => `抓取于 ${value}`,
      updatedAt: (value) => `更新于 ${value}`,
      degreeProgressLabel: '学位进度',
      transferPlanningLabel: '转学规划',
      termSummary: ({ termLabel, plannedCourseCount, backupCourseCount, scheduleOptionCount }) =>
        `${termLabel}：${plannedCourseCount} 门计划 · ${backupCourseCount} 门备选 · ${scheduleOptionCount} 个排课选项`,
    },
    groupedView: {
      title: '学生分组视图',
      heading: '同一个排序器，两种阅读方式',
      description:
        '同一张决策桌面现在开始把学业与规划事项和行政信号分开给你看，但它们仍然属于同一个统一优先级系统。',
      unifiedBadge: '统一优先级',
      academicBadge: '学业',
      administrativeBadge: '行政',
      academicSummary: ({ focusCount, weeklyDays, alertCount, updateCount }) =>
        `当前有 ${focusCount} 条学业排序项、${weeklyDays} 个活跃规划日、${alertCount} 条提醒和 ${updateCount} 条最近更新正在以学业线的方式显示。`,
      administrativeSummary: ({ focusCount, alertCount, updateCount, planningVisible }) =>
        `当前有 ${focusCount} 条行政排序项、${alertCount} 条提醒和 ${updateCount} 条最近更新正在以行政线的方式显示。${planningVisible ? ' 计划脉冲会单独保留在学业/规划线里。' : ''}`,
      administrativeLaneTitle: '行政线',
      administrativeLaneDescription:
        '这里把 MyUW 提醒信号和时间表上下文收成一条真实行政线，而不是继续把它们埋在角落里。',
      administrativeLaneMeta: ({ noticeCount, scheduleCount, planningVisible }) =>
        `${noticeCount} 条提醒信号 · ${scheduleCount} 条时间上下文${planningVisible ? ' · 计划脉冲留在学业/规划线' : ''}`,
    },
    trustSummary: {
      title: '可信度摘要',
      description: '这里把同步健康状况压缩成一眼能懂的摘要：哪些比较稳，哪些要谨慎，哪些还卡着。',
      freshSites: '新鲜站点',
      partialSites: '部分站点',
      staleSites: '陈旧站点',
      blockedSites: '受阻站点',
      notSyncedSites: '未同步站点',
      unseenUpdates: '未查看更新',
      latestReceipt: '最近收据',
      noRecentReceipt: '还没有同步收据。',
      topBlocker: '当前主要阻塞',
      nextAction: '建议下一步',
    },
    focusQueue: {
      title: '专注队列',
      description: '这里是“我现在先做什么”的正式答案，会把结构化事实和你的本地判断放在一起排序。',
      none: '当前还没有激活的专注项。先同步站点，或者先 pin 一条事项。',
      pin: '置顶',
      unpin: '取消置顶',
      pinnedBadge: '已置顶',
      snoozeUntilTomorrow: '延后 24 小时',
      dismissUntilTomorrow: '忽略 24 小时',
      addNote: '添加备注',
      editNote: '编辑备注',
      notePrompt: (title) => `给“${title}”添加或编辑本地备注。留空表示清除备注。`,
    },
    weeklyLoad: {
      title: '本周负荷',
      description: '这里像未来 7 天的短期负荷预报，不是单纯的任务列表。',
      none: '当前还没有可见的日期负荷。',
      assignments: '作业',
      events: '事件',
      items: '条目',
      overdue: '逾期',
      dueSoon: '即将到期',
      pinned: '置顶',
      score: '负荷分数',
      summary: ({ assignmentCount, eventCount = 0, overdueCount = 0, dueSoonCount = 0, pinnedCount = 0 }) =>
        overdueCount > 0
          ? `有 ${overdueCount} 个逾期事项要回补，另有 ${dueSoonCount} 个事项即将到期。`
          : dueSoonCount > 0
            ? `这一天有 ${assignmentCount} 个作业和 ${eventCount} 个事件，需要提前规划。`
            : pinnedCount > 0
              ? `你手动置顶了 ${pinnedCount} 个事项，所以这一天会持续留在前排。`
              : `这一天目前安排了 ${assignmentCount} 个作业和 ${eventCount} 个事件。`,
    },
    changeJournal: {
      title: '变化账本',
      description: '这里像同步收据，重点不是“有没有同步”，而是“这次到底变了什么”。',
      none: '当前还没有记录到同步变化。',
      receipt: (changeCount, outcome) => `最近一次 ${outcome} 同步共记录了 ${changeCount} 条变化。`,
      resourceGaps: (value) => `仍有资源缺口：${value}`,
      emptyValue: '空值',
    },
    diagnostics: {
      title: '诊断',
      description: '这块像运行时控制塔，不是告诉你“系统很多功能”，而是告诉你“当前真正卡住哪些前置条件”。',
      nextActions: '下一步动作',
      readyToContinue: '可继续验证',
      blockedByEnvironmentOrRuntime: '被环境或运行时阻塞',
      noBlockers: '当前没有明显运行时阻塞，可以继续做更深一层的真实验收。',
      exportJson: '导出诊断 JSON',
      reportReady: 'campus-copilot-diagnostics.json 已准备下载。',
    },
    priorityAlerts: {
      title: '优先提醒',
      description: '这块像值班表，重点不是“条目多”，而是“哪几条现在最该先看”。',
      low: '低',
      critical: '严重',
      high: '高',
      medium: '中',
      none: '还没有生成提醒。先同步一个站点，系统才有事实可判断。',
    },
    recentUpdates: {
      title: '最近更新',
      description: '这块回答“最近发生了什么”，而且允许你只盯住还没处理过的变化。',
      none: '当前筛选下还没有可展示的更新流。',
    },
    currentTasks: {
      title: '当前任务',
      description: '这里先把当前视图里的任务稳定露出来，先做到能看、能导、能继续问，再谈复杂详情页。',
      none: '当前筛选下还没有结构化任务。先同步站点，任务列表才会长出来。',
      dueAt: (value) => `截止 ${value}`,
      assignmentStatuses: {
        todo: '待处理',
        submitted: '已提交',
        graded: '已评分',
        missing: '缺失',
        overdue: '已逾期',
        unknown: '未知',
      },
    },
    currentResources: {
      title: '学习资料',
      description: '这里把课程文件和已发布资料留在同一个工作台里，不再让它们埋在站点自己的 resources 页面里。',
      none: '当前筛选下还没有可见的学习资料。',
      releasedAt: (value) => `发布于 ${value}`,
      openDownload: '打开下载链接',
      openRegradeHub: '打开复议队列',
      downloadFile: '下载文件',
      openLink: '打开链接',
      openLesson: '打开课程页',
      openSlide: '打开课件页',
      openMaterial: '打开资料',
    },
    discussionHighlights: {
      title: '讨论摘要',
      description: '这里把最近的课程讨论上下文留在工作台里，避免它们重新散回各站点的收件箱。',
      none: '当前筛选下没有可见的讨论摘要。',
      unread: '未读',
      staffReply: '教师',
      untitled: '未命名讨论',
    },
    scheduleOutlook: {
      title: '日程展望',
      description: '这里把即将到来的课程、考试和时间细节留在工作台里，并优先展示已经进入共享真相的地点或说明。',
      none: '当前筛选下没有可见的日程细节。',
    },
    siteStatus: {
      title: '站点状态',
      description: '这里像控制塔，专门讲真话：哪站已经 live，哪站只是部分成功，哪站现在卡在配置或上下文。',
      trustStates: {
        fresh: '新鲜',
        partial: '部分',
        stale: '陈旧',
        blocked: '受阻',
        notSynced: '未同步',
      },
      labels: {
        idle: '空闲',
        syncing: '同步中',
        success: '成功',
        partialSuccess: '部分成功',
        notLoggedIn: '未登录',
        unsupportedContext: '上下文不支持',
        unauthorized: '未授权',
        requestFailed: '请求失败',
        normalizeFailed: '标准化失败',
        collectorFailed: '采集失败',
        error: '错误',
      },
      resourceGaps: (value) => `仍有资源缺口：${value}`,
      syncButton: (site) => `同步 ${site}`,
      syncing: '同步中…',
      counts: ({ courses, resources, assignments, announcements, grades, messages, events }) =>
        `课程 ${courses} · 资料 ${resources} · 作业 ${assignments} · 公告 ${announcements} · 成绩 ${grades} · 消息 ${messages} · 事件 ${events}`,
    },
    askAi: {
      title: '围绕这张工作台来问 AI',
      description:
        'AI 在这里更像学习副驾驶，专门解释当前的专注队列、本周负荷、变化账本和最近更新。它只吃结构化工作台结果，不碰网页和 DOM。',
      runtimeSummary: '当前运行时',
      whatAiCanSee: 'AI 当前能看见什么',
      whatAiCannotDo: 'AI 当前不能做什么',
      guardrailsTitle: '学业安全护栏',
      manualOnlyBadge: '仅手动',
      defaultDisabledBadge: '默认关闭',
      redZoneDescription:
        'Register.UW、Notify.UW、抢位监控和与注册相关的自动轮询都不在当前产品路径里。如果你真要继续，只能手动回到原站点。',
      advancedMaterialTitle: '高级课程材料分析',
      advancedMaterialDescription:
        'raw course files、lecture slides、instructor-authored notes、exams、quizzes、assignment PDFs 和 solution documents 默认都不会进入 AI 路径；除非后续合同把它们提升成按课程显式 opt-in 的独立能力。',
      advancedMaterialOptInSummary:
        '当前唯一允许的高级路径，是你自己按课程显式开启，并手工粘贴一段摘录给 AI。Campus Copilot 仍然不会替你抓原始文件或上传 raw materials。',
      advancedMaterialEnableLabel: '为单门课程开启摘录分析',
      advancedMaterialCourseLabel: '选择要 opt-in 的课程',
      advancedMaterialCoursePlaceholder: '先选择一门当前可见课程',
      advancedMaterialExcerptLabel: '粘贴你要分析的摘录',
      advancedMaterialExcerptPlaceholder:
        '只粘贴你明确想分析的那一段，不要依赖隐藏文件、原始下载内容，或你无权使用的课程材料。',
      advancedMaterialAcknowledgement:
        '我确认这段摘录只对应我自己的课程上下文，而且是我为这门课主动开启；版权、课程政策和使用责任由我自己承担。',
      structuredInputs: '结构化输入',
      structuredInputsDescription:
        '每次回答都会明确建立在下面这张学习桌面的事实之上，不会偷偷读取网页、cookie 或隐藏浏览器上下文。',
      structuredInputLabels: {
        todaySnapshot: '今日快照',
        recentUpdates: '最近更新',
        priorityAlerts: '优先提醒',
        focusQueue: '专注队列',
        weeklyLoad: '本周负荷',
        changeJournal: '变化账本',
        currentView: '当前工作台视图',
      },
      provider: '服务商',
      model: '模型',
      question: '问题',
      questionBox: '提问框',
      suggestedPrompts: '建议问题',
      answerWithCitations: '带引用的回答',
      advancedRuntimeSettings: '高级运行时设置',
      advancedRuntimeDescription:
        '服务商、模型和 Switchyard 控件都下沉到这里，作为运行时细节存在。第一屏主角应该始终是学习工作台，不是调参面板。',
      uncitedAnswerWarning: '需要引用',
      suggestions: {
        nextStep: '我今天现在最该先做什么，为什么？',
        recentChanges: '最近一次同步之后，有哪些变化值得我优先注意？',
        trustGaps: '在我开始行动之前，哪些可信度缺口或同步阻塞最该先确认？',
      },
      placeholder: '例如：我现在最该关注什么？最近有什么变化？',
      ask: '问 AI',
      configure: '配置 BFF / 服务商',
      missingBffFeedback: '当前还没配置 BFF 地址，所以 AI 入口只会诚实提示，不会静默失败。',
      refreshProviderStatus: '刷新服务商状态',
      refreshingProviderStatus: '刷新中…',
      keyPoints: '要点',
      nextActions: '建议下一步',
      trustGaps: '需要先确认的可信度缺口',
      citations: '引用',
    },
    popup: {
      pulseSummaryTitle: '脉冲摘要',
      pulseSummaryDescription: '把它当体温计，不当第二块仪表盘。先看最小但有用的事实，再决定要不要进完整工作台。',
      fastActionsTitle: '快速动作',
      fastActionsDescription: 'Popup 里只保留三步诚实路径：打开完整工作台、同步当前站点、导出当前切片。',
      latestReceipt: '最近收据',
      noRecentReceipt: '还没有同步收据。',
      quickPulse: '快速脉冲导出',
      quickPulseDescription: '把它当成体温计用。先拿走一小片工作台结果，再进入侧边栏看完整学习桌面。',
      readOnlyBadge: '只读',
      weeklyAssignments: '本周作业',
      weeklyAssignmentsDescription: '把本周作业这条短脉冲带走，方便记到笔记或计划里。',
      recentUpdates: '最近更新',
      recentUpdatesDescription: '先抓最近变化，再决定要不要打开完整工作台。',
      allDeadlines: '全部截止日期',
      allDeadlinesDescription: '当你需要完整时间线时，拉一份全量截止日期清单。',
      focusQueue: '专注队列',
      focusQueueDescription: '导出最该先处理的顺序，而不是整张桌面。',
      weeklyLoad: '本周负荷',
      weeklyLoadDescription: '快速带走这一周的负荷快照，不必展开完整工作台。',
      changeJournal: '变化账本',
      changeJournalDescription: '把最近发生的变化导出来，方便离线扫一眼。',
      currentView: '当前视图',
      currentViewDescription: '直接导出你眼前这块工作台切片。',
    },
    options: {
      configurationTitle: '设置与授权中心',
      configurationDescription:
        '先看连接、语言和授权状态；只有默认路径不够时，再展开更深的运行时与站点覆盖设置。',
      siteConfiguration: '站点配置',
      siteConfigurationDescription:
        'EdStem 会优先尝试从当前课程标签页自动推导 threads 路径；只有自动推导不够时，才需要你手动覆盖。unread / recent activity 路径都是可选项。',
      authorizationCenter: '信任中心',
      authorizationCenterDescription:
        '把读取与导出、AI 分析分开讲清楚，同时显式展示站点边界与课程级确认，让产品继续保持“先结构、后 AI”。',
      readyProviders: '已就绪 AI 路线',
      confirmRequired: '需要确认',
      blockedFamilies: '被拦住的高敏家族',
      highSensitivityFamilies: '高敏摘要家族',
      threadsPath: 'EdStem 讨论串路径',
      threadsPathPlaceholder: '例如：/api/courses/90031/threads?limit=30&sort=new',
      unreadPath: 'EdStem 未读路径',
      unreadPathPlaceholder: '可选：留空表示不额外覆盖 unread 路径',
      recentActivityPath: 'EdStem 最近活动路径',
      recentActivityPathPlaceholder: '可选：留空表示不额外覆盖 recent activity 路径',
      aiBffConfiguration: '本地 AI 连接',
      bffBaseUrl: '本地 AI 服务地址',
      bffBaseUrlPlaceholder: '例如：http://127.0.0.1:8787',
      defaultProvider: '默认服务商',
      refreshBffStatus: '刷新 BFF 状态',
      refreshingBffStatus: '刷新中…',
      openAiModel: 'OpenAI 模型',
      geminiModel: 'Gemini 模型',
      switchyardModel: 'Switchyard 模型',
      switchyardRuntimeProvider: 'Switchyard 运行时提供方',
      switchyardLane: 'Switchyard 通道',
      advancedRuntimeSettings: '高级连接覆盖设置',
      advancedRuntimeDescription:
        '手动服务覆盖、模型字符串和站点级路径覆盖都下沉到这里，让第一屏继续保持 summary-first。',
      manualFallbackOnly: '仅手动覆盖',
      defaultExportFormat: '默认导出格式',
      saveConfiguration: '保存配置',
      configurationSaved: '配置已保存。',
      exportChangeJournal: '导出变化账本',
      exportCurrentView: '导出当前视图',
      interfaceLanguage: '界面语言',
      followBrowser: '跟随浏览器',
      english: 'English',
      chinese: '中文',
    },
    boundaryDisclosure: {
      title: '边界披露',
      bullets: [
        '当前产品仍以本地优先、手动同步、read-only 为主，不会静默后台扫站点。',
        'EdStem path 由你明确配置，不做偷偷摸摸的 endpoint 猜测。',
        'MyUW 依赖当前活动标签页里的 page state / DOM，上下文不对就应当诚实失败。',
        '本轮 AI 只走 OpenAI / Gemini 的 API key 路线；Gemini OAuth、web_session、多 provider 自动路由仍未纳入正式路径。',
        'AI 只消费统一 schema 和工作台读模型，不读取 raw DOM、cookie 或站点原始响应。',
      ],
    },
    feedback: {
      noVisibleUpdatesToMark: '当前筛选下没有需要标记的更新。',
      visibleUpdatesMarkedSeen: '当前视图里的最近更新已标记为已查看。',
      downloadReady: (filename) => `${filename} 已准备下载。`,
      capturingPlanningSubstrate: '正在把当前 MyPlan / DARS 页面写入计划脉冲…',
      planningCaptureSuccess: (label) => `${label} 已写入计划脉冲。`,
      planningCapturePartial: (label) => `${label} 已写入，但 MyPlan / DARS 另一半信息还没补齐。`,
      syncSuccess: (site) => `${site} 同步成功，结构化数据已刷新。`,
      syncPartial: (site) => `${site} 已部分同步成功，仍有资源需要后续补齐。`,
      syncOutcome: (site, outcome) => `${site} 同步结果为 ${outcome}，请查看站点状态面板。`,
      questionRequired: '先输入一个问题，AI 才知道要解释什么。',
      noDisplayableAnswer: 'BFF 已响应，但当前 provider 没有返回可展示的回答。',
      aiRequestFailed: 'AI 请求失败。',
      aiFallbackWithoutCitations: '当前 provider 返回了可展示的回答，但还没有带上结构化引用块。请把它视为无引用的退化回答。',
      bffMissingForAi: '当前还没配置 BFF 地址，所以 AI 入口只会诚实提示，不会静默失败。',
      providerNotReadyInBff: (provider) => `${provider} 当前在 BFF 中还没有 ready。`,
      partialSuccess: (site) => `${site} 已部分同步成功。`,
      overlayPinned: '已加入专注置顶。',
      overlayUnpinned: '已取消专注置顶。',
      overlaySnoozed: '已延后 24 小时。',
      overlayDismissed: '已忽略 24 小时。',
      overlayNoteSaved: '本地备注已保存。',
      overlayNoteCleared: '本地备注已清除。',
    },
    diagnosticsMessages: {
      missingBffBaseUrl: '还没有配置 BFF 地址',
      providerStatusFetchFailed: 'provider 状态拉取失败',
      bffBaseUrlNotConfigured: 'BFF 地址尚未配置',
      providerNotReady: (providers) => `服务商未就绪：${providers}`,
      defaultProviderNotReady: (provider) => `默认服务商未就绪：${provider}`,
      sitesStillMissingLivePrerequisites: (sites) => `站点仍缺 live 条件：${sites}`,
      bffProviderStatusFetchFailed: 'BFF provider 状态拉取失败',
      nextActionSetBff: '先在设置中填写 BFF 地址，再刷新服务商状态。',
      nextActionProviderKey: '如果要做真实 AI round-trip，请至少补一条正式 provider API key。',
      nextActionSwitchProvider: '切换到已 ready 的 provider，或补齐当前默认 provider 的正式 API key。',
      nextActionRestoreSiteContext: '先补真实登录态或在对应站点标签页中触发同步，再重试站点 live 验收。',
      nextActionRefreshProviderStatus: '确认 BFF 服务在运行，随后点击“刷新服务商状态”。',
    },
    blockingHints: {
      edstemMissingPaths: '缺少 EdStem 私有请求路径，请先在 Options 里填写。',
      myuwTabRequired: '需要在 MyUW 页面标签页里触发，系统才能读取 page state 或 DOM。',
      activeTabRequired: '需要在对应站点的活动标签页里手动触发同步。',
    },
    viewHelpers: {
      legacyParsing: {
        missingResourcePrefix: '未同步 ',
        titleSuffixes: {
          overdue: ' 已逾期',
          dueSoon: ' 48 小时内截止',
          newGrade: ' 出了新成绩',
          created: ' 新增',
          removed: ' 已移除',
          statusChanged: ' 状态变化',
          dueChanged: ' 截止时间变化',
          gradeReleased: ' 有新的成绩信息',
        },
      },
      resourceLabels: {
        assignments: '作业',
        announcements: '公告',
        courses: '课程',
        events: '事件',
        grades: '成绩',
        messages: '消息',
      },
      importanceLabels: {
        critical: '严重',
        high: '高',
        medium: '中',
        low: '低',
      },
      fallbackReasons: {
        due_soon: '48 小时内到期',
        overdue: '已经逾期',
        recently_updated: '最近同步里有变化',
        unread_activity: '有未读动态需要处理',
        new_grade: '有新的成绩信息',
        important_announcement: '最近更新可能影响安排',
        sync_stale: '站点同步不完整或已过旧',
        manual: '你手动置顶了它',
      },
      trustDetail: {
        partialMissing: (value) => `部分：仍缺 ${value}。`,
        partialMissingFallback: '部分资源',
        blockedByStatus: (status) => `当前被 ${status} 阻塞。`,
        noSyncContext: '当前还没有可用的同步上下文。',
        stale: (value) => `结果偏旧：最近成功同步是 ${value}。`,
        ready: '当前结果足够新，可以继续在工作台里判断。',
        noSuccess: '还没有成功同步记录。',
      },
      focusReasons: {
        overdueSince: (value) => `已经逾期，原截止时间是 ${value}`,
        dueWithin48Hours: (value) => `48 小时内到期，截止时间是 ${value}`,
        dueThisWeek: (value) => `本周内到期，截止时间是 ${value}`,
        changedLatestSync: '最近一次同步里有变化',
        syncGaps: (value) => `同步仍有缺口：${value}`,
      },
      alertTitles: {
        overdue: (base) => `${base} 已逾期`,
        dueSoon: (base) => `${base} 48 小时内截止`,
        newGrade: (base) => `${base} 有新的成绩信息`,
        attentionNeeded: (site) => `${site} 同步需要关注`,
        updateFromSite: (site) => `${site} 的更新`,
      },
      alertSummaries: {
        overdue: '这个任务已经过了截止时间，应该被放到最前面处理。',
        dueSoon: '这个任务正在逼近截止时间，应该继续留在高优先级。',
        newGrade: '最近出现了新的成绩结果。',
        importantAnnouncement: '最近的课程公告可能会改变你的安排。',
        instructorActivity: '最近有老师参与的新动态。',
        unreadMention: '这里有未读讨论动态需要回看。',
        attentionNeeded: '最近一次同步不是完全成功，所以部分结果可能仍然不完整。',
        structuredUpdateNeedsAttention: '有一条结构化更新需要你注意。',
      },
      assignmentStatuses: {
        todo: '待处理',
        submitted: '已提交',
        graded: '已评分',
        missing: '缺失',
        overdue: '已逾期',
        unknown: '未知',
      },
      timelineKindLabels: {
        announcement_posted: '课程公告',
        assignment_created: '新增作业',
        assignment_due: '截止变化',
        grade_released: '成绩发布',
        discussion_replied: '讨论动态',
        schedule_updated: '日程变化',
        alert_triggered: '提醒',
      },
      changeTypeLabels: {
        created: '新增',
        removed: '已移除',
        status_changed: '状态变化',
        due_changed: '截止时间变化',
        grade_released: '成绩发布',
        message_unread: '未读讨论',
        sync_partial: '部分同步',
      },
      timelineTitles: {
        announcement_posted: '最近公告',
        assignment_created: '新作业',
        assignment_due: '截止更新',
        grade_released: '新成绩结果',
        discussion_replied: '最近讨论更新',
        schedule_updated: '日程更新',
        alert_triggered: '最近提醒',
      },
      timelineSummaries: {
        announcement_posted: '最近发布了一条课程公告。',
        assignment_created: '最近一次同步里出现了新的作业。',
        grade_released: '最近发布了一条新的成绩结果。',
        discussion_replied: '最近这里出现了讨论动态。',
        schedule_updated: '最近有时间相关的事件或安排发生变化。',
        alert_triggered: '最近一次同步触发了一条新提醒。',
      },
      weeklyLoadHighlights: {
        overdue: (count) => `${count} 个逾期待回补`,
        dueSoon: (count) => `${count} 个即将到期`,
        pinned: (count) => `${count} 个已置顶`,
        eventNodes: (count) => `${count} 个事件节点`,
      },
      changeValues: {
        read: '已读',
        unread: '未读',
      },
      changeTitles: {
        created: (base) => `${base} 新增`,
        removed: (base) => `${base} 已移除`,
        statusChanged: (base) => `${base} 状态变化`,
        dueChanged: (base) => `${base} 截止时间变化`,
        gradeReleased: (base) => `${base} 有新的成绩信息`,
        unreadDiscussion: '新的未读讨论',
        syncPartial: (site) => `${site} 同步部分成功`,
        updateFromSite: (site) => `${site} 的更新`,
      },
      changeSummaries: {
        created: '这条结构化记录刚进入本地快照。',
        removed: '这条结构化记录不再出现在最新快照里。',
        statusChanged: (previousValue, nextValue) => `状态从 ${previousValue} 变为 ${nextValue}。`,
        dueChanged: (previousValue, nextValue) => `截止时间从 ${previousValue} 变为 ${nextValue}。`,
        gradeReleased: (value) => `当前成绩是 ${value}。`,
        unreadAgain: '这条讨论从已读变回未读。',
        unreadNew: '这里出现了一条新的未读讨论。',
        syncPartial: (value) => `成功写入的内容已经更新，但仍有资源缺口：${value}。`,
        structuredChangeRecorded: '记录到了一条新的结构化变化。',
      },
    },
  },
};

export function getUiText(locale: ResolvedUiLanguage) {
  return TEXT[locale];
}

export function formatRelativeTime(locale: ResolvedUiLanguage, iso?: string) {
  const text = getUiText(locale);

  if (!iso) {
    return text.meta.noSyncYet;
  }

  const deltaMs = Date.now() - new Date(iso).getTime();
  const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000));
  if (deltaMinutes < 60) {
    return locale === 'zh-CN' ? `${deltaMinutes} 分钟前` : `${deltaMinutes} min ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 48) {
    return locale === 'zh-CN' ? `${deltaHours} 小时前` : `${deltaHours} hr ago`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  return locale === 'zh-CN' ? `${deltaDays} 天前` : `${deltaDays} day${deltaDays === 1 ? '' : 's'} ago`;
}

export function formatDateTime(locale: ResolvedUiLanguage, iso?: string) {
  const text = getUiText(locale);
  if (!iso) {
    return text.meta.noTimeProvided;
  }

  return new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
