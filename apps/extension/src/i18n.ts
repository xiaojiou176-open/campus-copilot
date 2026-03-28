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
    ready: string;
    notReady: string;
    currentStatus: string;
    lastChecked: string;
    lastSync: string;
    missingFromView: string;
  };
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
    selectSiteBeforeSync: string;
    syncInProgress: (site: string) => string;
    openExport: string;
    markUpdatesSeen: string;
    openOptions: string;
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
  };
  siteStatus: {
    title: string;
    description: string;
    resourceGaps: (value: string) => string;
    syncButton: (site: string) => string;
    syncing: string;
    counts: (input: { assignments: number; announcements: number; grades: number; messages: number }) => string;
  };
  askAi: {
    title: string;
    description: string;
    provider: string;
    model: string;
    question: string;
    placeholder: string;
    ask: string;
    configure: string;
    missingBffFeedback: string;
    refreshProviderStatus: string;
    refreshingProviderStatus: string;
  };
  popup: {
    quickExport: string;
    weeklyAssignments: string;
    currentView: string;
  };
  options: {
    siteConfiguration: string;
    siteConfigurationDescription: string;
    threadsPath: string;
    unreadPath: string;
    unreadPathPlaceholder: string;
    recentActivityPath: string;
    recentActivityPathPlaceholder: string;
    aiBffConfiguration: string;
    bffBaseUrl: string;
    defaultProvider: string;
    refreshBffStatus: string;
    refreshingBffStatus: string;
    openAiModel: string;
    geminiModel: string;
    defaultExportFormat: string;
    saveConfiguration: string;
    configurationSaved: string;
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
    syncSuccess: (site: string) => string;
    syncPartial: (site: string) => string;
    syncOutcome: (site: string, outcome: string) => string;
    questionRequired: string;
    noDisplayableAnswer: string;
    aiRequestFailed: string;
    bffMissingForAi: string;
    providerNotReadyInBff: (provider: string) => string;
    partialSuccess: (site: string) => string;
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
};

const TEXT: Record<ResolvedUiLanguage, UiText> = {
  en: {
    exportPresets: {
      weeklyAssignments: 'Export weekly assignments',
      recentUpdates: 'Export recent updates',
      allDeadlines: 'Export all deadlines',
      currentView: 'Export current view',
    },
    hero: {
      sidepanelEyebrow: 'Campus Copilot Sidepanel',
      sidepanelTitle: 'Academic workbench',
      sidepanelDescription:
        'This is not an empty chat box. It first turns four sites into one desk: what is happening today, what is blocked, and what changed recently.',
      popupEyebrow: 'Campus Copilot Popup',
      popupTitle: 'Quick pulse',
      popupDescription:
        'Popup stays lightweight and acts like a quick pulse check: sync status, priority counts, and the fastest way into the main workbench.',
      optionsEyebrow: 'Campus Copilot Options',
      optionsTitle: 'Connection and runtime controls',
      optionsDescription:
        'This page acts like a control cabinet: site configuration, the AI/BFF entry point, default export format, and boundary disclosure should all stay honest here.',
    },
    meta: {
      noSyncYet: 'No sync yet',
      lastRefresh: 'Last refresh',
      defaultExport: 'Default export',
      noTimeProvided: 'No time provided',
      ready: 'ready',
      notReady: 'not ready',
      currentStatus: 'Current status',
      lastChecked: 'Last checked',
      lastSync: 'Last sync',
      missingFromView: 'Unseen in current view',
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
      selectSiteBeforeSync: 'Select a site before syncing',
      syncInProgress: (site) => `Syncing ${site}...`,
      openExport: 'Open export',
      markUpdatesSeen: 'Mark updates as seen',
      openOptions: 'Open Options',
    },
    diagnostics: {
      title: 'Diagnostics',
      description: 'This area acts like a runtime control tower. It tells you what is actually blocked, not how many features exist.',
      nextActions: 'Next Actions',
      readyToContinue: 'ready_to_continue',
      blockedByEnvironmentOrRuntime: 'blocked_by_environment_or_runtime',
      noBlockers: 'No obvious runtime blockers are active right now, so deeper validation can continue.',
      exportJson: 'Export diagnostics JSON',
      reportReady: 'campus-copilot-diagnostics.json is ready to download.',
    },
    priorityAlerts: {
      title: 'Priority Alerts',
      description: 'This behaves like an on-call board. The point is not volume, but which items need attention first.',
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
    },
    siteStatus: {
      title: 'Site Status',
      description: 'This area tells the truth about runtime state: which site is live, which is partial, and which one is blocked by context or configuration.',
      resourceGaps: (value) => `Remaining resource gaps: ${value}`,
      syncButton: (site) => `Sync ${site}`,
      syncing: 'Syncing...',
      counts: ({ assignments, announcements, grades, messages }) =>
        `Assignments ${assignments} · Announcements ${announcements} · Grades ${grades} · Messages ${messages}`,
    },
    askAi: {
      title: 'Ask AI',
      description: 'AI is not the protagonist here. It explains workbench results after structure and does not read raw pages or DOM.',
      provider: 'Provider',
      model: 'Model',
      question: 'Question',
      placeholder: 'For example: What should I pay attention to right now? What changed recently?',
      ask: 'Ask AI',
      configure: 'Configure BFF / Provider',
      missingBffFeedback: 'BFF base URL is still missing, so the AI path should fail loudly instead of silently.',
      refreshProviderStatus: 'Refresh provider status',
      refreshingProviderStatus: 'Refreshing...',
    },
    popup: {
      quickExport: 'Quick export',
      weeklyAssignments: 'Weekly assignments',
      currentView: 'Current view',
    },
    options: {
      siteConfiguration: 'Site configuration',
      siteConfigurationDescription:
        'EdStem first tries to infer the threads path from the active course tab. Only override it manually when auto-inference is not enough. Unread and recent activity paths are optional.',
      threadsPath: 'EdStem threads path',
      unreadPath: 'EdStem unread path',
      unreadPathPlaceholder: 'Optional: leave empty to avoid overriding the unread path',
      recentActivityPath: 'EdStem recent activity path',
      recentActivityPathPlaceholder: 'Optional: leave empty to avoid overriding the recent activity path',
      aiBffConfiguration: 'AI / BFF configuration',
      bffBaseUrl: 'BFF base URL',
      defaultProvider: 'Default provider',
      refreshBffStatus: 'Refresh BFF status',
      refreshingBffStatus: 'Refreshing...',
      openAiModel: 'OpenAI model',
      geminiModel: 'Gemini model',
      defaultExportFormat: 'Default export format',
      saveConfiguration: 'Save configuration',
      configurationSaved: 'Configuration saved.',
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
      syncSuccess: (site) => `${site} sync succeeded and refreshed structured data.`,
      syncPartial: (site) => `${site} sync partially succeeded and still has resources to fill in.`,
      syncOutcome: (site, outcome) => `${site} sync finished with ${outcome}. Review the site status panel.`,
      questionRequired: 'Enter a question so AI knows what to explain.',
      noDisplayableAnswer: 'The BFF responded, but the current provider did not return a displayable answer.',
      aiRequestFailed: 'AI request failed.',
      bffMissingForAi: 'BFF base URL is not configured yet. Set it in Options first.',
      providerNotReadyInBff: (provider) => `${provider} is not ready in the BFF yet.`,
      partialSuccess: (site) => `${site} partially succeeded.`,
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
  },
  'zh-CN': {
    exportPresets: {
      weeklyAssignments: '导出本周作业',
      recentUpdates: '导出最近更新',
      allDeadlines: '导出全部 deadlines',
      currentView: '导出当前视图',
    },
    hero: {
      sidepanelEyebrow: 'Campus Copilot 侧边栏',
      sidepanelTitle: '学习工作台',
      sidepanelDescription: '这里不是空聊天框，而是先把四个站点整理成一张桌面：今天有什么、哪里卡住了、哪些变化还没看。',
      popupEyebrow: 'Campus Copilot 弹窗',
      popupTitle: '快速体温计',
      popupDescription: 'Popup 保持轻量，负责给你一个很快的体温计：有没有同步、有没有高优先级数字、要不要立刻打开主工作台。',
      optionsEyebrow: 'Campus Copilot 设置',
      optionsTitle: '连接与运行时控制',
      optionsDescription: '这页像控制柜：站点配置、AI/BFF 入口、默认导出格式和边界披露，都应该在这里说真话。',
    },
    meta: {
      noSyncYet: '还没有同步',
      lastRefresh: '上次刷新',
      defaultExport: '默认导出',
      noTimeProvided: '未提供时间',
      ready: 'ready',
      notReady: 'not ready',
      currentStatus: '当前状态',
      lastChecked: '最近检查',
      lastSync: '最近同步',
      missingFromView: '当前视图未查看',
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
      selectSiteBeforeSync: '先选择站点再同步',
      syncInProgress: (site) => `同步 ${site} 中…`,
      openExport: '打开导出',
      markUpdatesSeen: '标记更新已查看',
      openOptions: '跳到 Options',
    },
    diagnostics: {
      title: 'Diagnostics',
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
      title: 'Current Tasks',
      description: '这里先把当前视图里的任务稳定露出来，先做到能看、能导、能继续问，再谈复杂详情页。',
      none: '当前筛选下还没有结构化任务。先同步站点，任务列表才会长出来。',
      dueAt: (value) => `截止 ${value}`,
    },
    siteStatus: {
      title: '站点状态',
      description: '这里像控制塔，专门讲真话：哪站已经 live，哪站只是部分成功，哪站现在卡在配置或上下文。',
      resourceGaps: (value) => `仍有资源缺口：${value}`,
      syncButton: (site) => `同步 ${site}`,
      syncing: '同步中…',
      counts: ({ assignments, announcements, grades, messages }) =>
        `作业 ${assignments} · 公告 ${announcements} · 成绩 ${grades} · 消息 ${messages}`,
    },
    askAi: {
      title: '问 AI',
      description: 'AI 在这里不是主角，而是站在工作台结果后面做解释。它只吃结构化数据，不碰网页和 DOM。',
      provider: '服务商',
      model: '模型',
      question: '问题',
      placeholder: '例如：我现在最该关注什么？最近有什么变化？',
      ask: '问 AI',
      configure: '配置 BFF / Provider',
      missingBffFeedback: '当前还没配置 BFF 地址，所以 AI 入口只会诚实提示，不会静默失败。',
      refreshProviderStatus: '刷新 provider 状态',
      refreshingProviderStatus: '刷新中…',
    },
    popup: {
      quickExport: '快速导出',
      weeklyAssignments: '本周作业',
      currentView: '当前视图',
    },
    options: {
      siteConfiguration: '站点配置',
      siteConfigurationDescription:
        'EdStem 会优先尝试从当前课程标签页自动推导 threads 路径；只有自动推导不够时，才需要你手动覆盖。unread / recent activity 路径都是可选项。',
      threadsPath: 'EdStem threads path',
      unreadPath: 'EdStem unread path',
      unreadPathPlaceholder: '可选：留空表示不额外覆盖 unread 路径',
      recentActivityPath: 'EdStem recent activity path',
      recentActivityPathPlaceholder: '可选：留空表示不额外覆盖 recent activity 路径',
      aiBffConfiguration: 'AI / BFF 配置',
      bffBaseUrl: 'BFF 地址',
      defaultProvider: '默认 Provider',
      refreshBffStatus: '刷新 BFF 状态',
      refreshingBffStatus: '刷新中…',
      openAiModel: 'OpenAI 模型',
      geminiModel: 'Gemini 模型',
      defaultExportFormat: '默认导出格式',
      saveConfiguration: '保存配置',
      configurationSaved: '配置已保存。',
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
      syncSuccess: (site) => `${site} 同步成功，结构化数据已刷新。`,
      syncPartial: (site) => `${site} 已部分同步成功，仍有资源需要后续补齐。`,
      syncOutcome: (site, outcome) => `${site} 同步结果为 ${outcome}，请查看站点状态面板。`,
      questionRequired: '先输入一个问题，AI 才知道要解释什么。',
      noDisplayableAnswer: 'BFF 已响应，但当前 provider 没有返回可展示的回答。',
      aiRequestFailed: 'AI 请求失败。',
      bffMissingForAi: '当前还没配置 BFF 地址，所以 AI 入口只会诚实提示，不会静默失败。',
      providerNotReadyInBff: (provider) => `${provider} 当前在 BFF 中还没有 ready。`,
      partialSuccess: (site) => `${site} 已部分同步成功。`,
    },
    diagnosticsMessages: {
      missingBffBaseUrl: '还没有配置 BFF 地址',
      providerStatusFetchFailed: 'provider 状态拉取失败',
      bffBaseUrlNotConfigured: 'BFF 地址尚未配置',
      providerNotReady: (providers) => `Provider 未 ready：${providers}`,
      defaultProviderNotReady: (provider) => `默认 Provider 未 ready：${provider}`,
      sitesStillMissingLivePrerequisites: (sites) => `站点仍缺 live 条件：${sites}`,
      bffProviderStatusFetchFailed: 'BFF provider 状态拉取失败',
      nextActionSetBff: '先在 Options 中填写 BFF base URL，再刷新 provider 状态。',
      nextActionProviderKey: '如果要做真实 AI round-trip，请至少补一条正式 provider API key。',
      nextActionSwitchProvider: '切换到已 ready 的 provider，或补齐当前默认 provider 的正式 API key。',
      nextActionRestoreSiteContext: '先补真实登录态或在对应站点标签页中触发同步，再重试站点 live 验收。',
      nextActionRefreshProviderStatus: '确认 BFF 服务在运行，随后点击“刷新 provider 状态”。',
    },
    blockingHints: {
      edstemMissingPaths: '缺少 EdStem 私有请求路径，请先在 Options 里填写。',
      myuwTabRequired: '需要在 MyUW 页面标签页里触发，系统才能读取 page state 或 DOM。',
      activeTabRequired: '需要在对应站点的活动标签页里手动触发同步。',
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
