import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { type ProviderId } from '@campus-copilot/ai';
import type { ExportFormat, ExportPreset } from '@campus-copilot/exporter';
import { createExportArtifact } from '@campus-copilot/exporter';
import {
  GET_SITE_SYNC_STATUS_COMMAND,
  SYNC_SITE_COMMAND,
  type SiteSyncOutcome,
  type SyncSiteCommandResponse,
} from '@campus-copilot/core';
import type { Site } from '@campus-copilot/schema';
import {
  markEntitiesSeen,
  type WorkbenchFilter,
  useAllSiteEntityCounts,
  usePriorityAlerts,
  useSiteSyncStates,
  useTodaySnapshot,
  useWorkbenchView,
} from '@campus-copilot/storage';
import { buildSiteBlockingHint } from './background-runtime';
import {
  buildDiagnosticsReport,
  buildDiagnosticsSummary,
  formatProviderReason,
  formatProviderStatusError,
  type ProviderStatusLike,
} from './diagnostics';
import {
  buildNextConfig,
  getDefaultExtensionConfig,
  getProviderModel,
  loadExtensionConfig,
  saveExtensionConfig,
  subscribeExtensionConfig,
  type ExtensionConfig,
} from './config';
import './styles.css';
import { buildAiProxyRequest } from './ai-request';

type SurfaceKind = 'sidepanel' | 'popup' | 'options';

type AiResponsePayload = {
  ok?: boolean;
  answerText?: string;
  error?: string;
};

type ProviderStatusPayload = {
  ok: boolean;
  providers: Record<
    ProviderId,
    {
      ready: boolean;
      authMode: 'api_key';
      reason: string;
    }
  >;
};

type ProviderStatusState = {
  providers: ProviderStatusPayload['providers'];
  checkedAt?: string;
  error?: string;
};

const SITE_ORDER: Site[] = ['canvas', 'gradescope', 'edstem', 'myuw'];

const SITE_LABELS: Record<Site, string> = {
  canvas: 'Canvas',
  gradescope: 'Gradescope',
  edstem: 'EdStem',
  myuw: 'MyUW',
};

const EXPORT_PRESETS: Array<{ preset: ExportPreset; label: string }> = [
  { preset: 'weekly_assignments', label: '导出本周作业' },
  { preset: 'recent_updates', label: '导出最近更新' },
  { preset: 'all_deadlines', label: '导出全部 deadlines' },
  { preset: 'current_view', label: '导出当前视图' },
];

const EXPORT_FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
  { value: 'ics', label: 'ICS' },
];

const PROVIDER_OPTIONS: Array<{ value: ProviderId; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
];

const SURFACE_COPY: Record<
  SurfaceKind,
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  sidepanel: {
    eyebrow: 'Campus Copilot Sidepanel',
    title: 'Academic workbench',
    description:
      '这里不是空聊天框，而是先把四个站点整理成一张桌面：今天有什么、哪里卡住了、哪些变化还没看。',
  },
  popup: {
    eyebrow: 'Campus Copilot Popup',
    title: 'Quick pulse',
    description: 'Popup 保持轻量，负责给你一个很快的体温计：有没有同步、有没有高优先级数字、要不要立刻打开主工作台。',
  },
  options: {
    eyebrow: 'Campus Copilot Options',
    title: 'Connection and runtime controls',
    description:
      '这页像控制柜：站点配置、AI/BFF 入口、默认导出格式和边界披露，都应该在这里说真话。',
  },
};

function formatRelativeTime(iso?: string) {
  if (!iso) {
    return '还没有同步';
  }

  const deltaMs = Date.now() - new Date(iso).getTime();
  const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000));
  if (deltaMinutes < 60) {
    return `${deltaMinutes} 分钟前`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 48) {
    return `${deltaHours} 小时前`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays} 天前`;
}

function formatDateTime(iso?: string) {
  if (!iso) {
    return '未提供时间';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function buildDownloadPayload(format: ExportFormat, content: string) {
  return new Blob([content], {
    type: format === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8',
  });
}

function buildSyncMessage(site: Site, outcome: SiteSyncOutcome) {
  if (outcome === 'success') {
    return `${SITE_LABELS[site]} 同步成功，结构化数据已刷新。`;
  }

  if (outcome === 'partial_success') {
    return `${SITE_LABELS[site]} 已部分同步成功，仍有资源需要后续补齐。`;
  }

  return `${SITE_LABELS[site]} 同步结果为 ${outcome}，请查看站点状态面板。`;
}

function getSiteStatusTone(outcome?: SiteSyncOutcome, status?: 'idle' | 'syncing' | 'success' | 'error') {
  if (status === 'syncing') {
    return 'neutral';
  }

  if (outcome === 'success') {
    return 'success';
  }

  if (outcome === 'partial_success') {
    return 'warning';
  }

  if (outcome) {
    return 'danger';
  }

  return 'neutral';
}

function getSiteStatusLabel(outcome?: SiteSyncOutcome, status?: 'idle' | 'syncing' | 'success' | 'error') {
  if (status === 'syncing') {
    return 'syncing';
  }

  if (outcome) {
    return outcome;
  }

  return status ?? 'idle';
}

export function SurfaceShell({ surface }: { surface: SurfaceKind }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(() => new Date().toISOString());
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [filters, setFilters] = useState<WorkbenchFilter>({
    site: 'all',
    onlyUnseenUpdates: false,
  });
  const [config, setConfig] = useState<ExtensionConfig>(getDefaultExtensionConfig());
  const [optionsDraft, setOptionsDraft] = useState<ExtensionConfig>(getDefaultExtensionConfig());
  const [syncFeedback, setSyncFeedback] = useState<{
    inFlightSite?: Site;
    outcome?: SiteSyncOutcome;
    message?: string;
  }>({});
  const [exportFeedback, setExportFeedback] = useState<string>();
  const [optionsFeedback, setOptionsFeedback] = useState<string>();
  const [aiProvider, setAiProvider] = useState<ProviderId>('openai');
  const [aiModel, setAiModel] = useState('gpt-4.1-mini');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string>();
  const [aiError, setAiError] = useState<string>();
  const [aiPending, setAiPending] = useState(false);
  const [providerStatusPending, setProviderStatusPending] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusState>({
    providers: {
      openai: {
        ready: false,
        authMode: 'api_key',
        reason: 'missing_api_key',
      },
      gemini: {
        ready: false,
        authMode: 'api_key',
        reason: 'missing_api_key',
      },
    },
  });

  const copy = SURFACE_COPY[surface];
  const todaySnapshot = useTodaySnapshot(now, undefined, refreshKey);
  const priorityAlerts = usePriorityAlerts(now, undefined, refreshKey) ?? [];
  const siteCounts = useAllSiteEntityCounts(undefined, refreshKey) ?? [];
  const siteSyncStates = useSiteSyncStates(undefined, refreshKey) ?? [];
  const workbenchView = useWorkbenchView(now, filters, undefined, refreshKey);

  useEffect(() => {
    async function hydrateConfigAndStatus() {
      const loadedConfig = await loadExtensionConfig();
      setConfig(loadedConfig);
      setOptionsDraft(loadedConfig);
      setSelectedFormat(loadedConfig.defaultExportFormat);
      setAiProvider(loadedConfig.ai.defaultProvider);
      setAiModel(getProviderModel(loadedConfig, loadedConfig.ai.defaultProvider));

      await Promise.all(
        SITE_ORDER.map(async (site) => {
          await browser.runtime.sendMessage({
            type: GET_SITE_SYNC_STATUS_COMMAND,
            site,
          });
        }),
      );

      setRefreshKey((current) => current + 1);
      setNow(new Date().toISOString());
    }

    void hydrateConfigAndStatus();

    const unsubscribe = subscribeExtensionConfig((nextConfig) => {
      setConfig(nextConfig);
      setOptionsDraft(nextConfig);
      setSelectedFormat(nextConfig.defaultExportFormat);
      setAiProvider(nextConfig.ai.defaultProvider);
      setAiModel(getProviderModel(nextConfig, nextConfig.ai.defaultProvider));
    });

    return unsubscribe;
  }, []);

  const currentAssignments = workbenchView?.assignments ?? [];
  const currentAnnouncements = workbenchView?.announcements ?? [];
  const currentMessages = workbenchView?.messages ?? [];
  const currentGrades = workbenchView?.grades ?? [];
  const currentEvents = workbenchView?.events ?? [];
  const currentAlerts = workbenchView?.alerts ?? [];
  const currentRecentUpdates = workbenchView?.recentUpdates;

  async function refreshProviderStatus() {
    setProviderStatusPending(true);

    if (!config.ai.bffBaseUrl) {
      setProviderStatus({
        providers: {
          openai: {
            ready: false,
            authMode: 'api_key',
            reason: 'missing_api_key',
          },
          gemini: {
            ready: false,
            authMode: 'api_key',
            reason: 'missing_api_key',
          },
        },
        checkedAt: new Date().toISOString(),
        error: 'missing_bff_base_url',
      });
      setProviderStatusPending(false);
      return;
    }

    try {
      const response = await fetch(`${config.ai.bffBaseUrl}/api/providers/status`);
      const payload = (await response.json()) as ProviderStatusPayload;
      if (payload.ok) {
        setProviderStatus({
          providers: payload.providers,
          checkedAt: new Date().toISOString(),
        });
      }
    } catch {
      setProviderStatus({
        providers: {
          openai: {
            ready: false,
            authMode: 'api_key',
            reason: 'missing_api_key',
          },
          gemini: {
            ready: false,
            authMode: 'api_key',
            reason: 'missing_api_key',
          },
        },
        checkedAt: new Date().toISOString(),
        error: 'provider_status_fetch_failed',
      });
    } finally {
      setProviderStatusPending(false);
    }
  }

  useEffect(() => {
    void refreshProviderStatus();
  }, [config.ai.bffBaseUrl]);

  async function refreshStatus() {
    await Promise.all(
      SITE_ORDER.map(async (site) => {
        await browser.runtime.sendMessage({
          type: GET_SITE_SYNC_STATUS_COMMAND,
          site,
        });
      }),
    );
    setRefreshKey((current) => current + 1);
    setNow(new Date().toISOString());
  }

  async function handleSiteSync(site: Site) {
    setSyncFeedback({
      inFlightSite: site,
      outcome: undefined,
      message: undefined,
    });

    const response = (await browser.runtime.sendMessage({
      type: SYNC_SITE_COMMAND,
      site,
    })) as SyncSiteCommandResponse;

    await refreshStatus();
    setSyncFeedback({
      inFlightSite: undefined,
      outcome: response.outcome,
      message: buildSyncMessage(site, response.outcome),
    });
  }

  async function handleMarkVisibleUpdatesSeen() {
    const entityIds = Array.from(
      new Set(
        (currentRecentUpdates?.items ?? [])
          .flatMap((entry) => entry.relatedEntities.map((entity) => entity.id))
          .filter(Boolean),
      ),
    );

    if (entityIds.length === 0) {
      setExportFeedback('当前筛选下没有需要标记的更新。');
      return;
    }

    await markEntitiesSeen(entityIds, new Date().toISOString());
    setExportFeedback('当前视图里的最近更新已标记为已查看。');
    setRefreshKey((current) => current + 1);
  }

  async function handleExport(preset: ExportPreset) {
    const artifact = createExportArtifact({
      preset,
      format: selectedFormat,
      input: {
        generatedAt: now,
        viewTitle:
          preset === 'current_view'
            ? `${filters.site === 'all' ? 'All sites' : SITE_LABELS[filters.site]} current view`
            : 'Campus Copilot Home',
        assignments: preset === 'current_view' ? currentAssignments : workbenchView?.assignments ?? [],
        announcements: preset === 'current_view' ? currentAnnouncements : workbenchView?.announcements ?? [],
        messages: preset === 'current_view' ? currentMessages : workbenchView?.messages ?? [],
        grades: preset === 'current_view' ? currentGrades : workbenchView?.grades ?? [],
        events: preset === 'current_view' ? currentEvents : workbenchView?.events ?? [],
        alerts: preset === 'current_view' ? currentAlerts : priorityAlerts,
        timelineEntries: preset === 'current_view' ? currentRecentUpdates?.items ?? [] : currentRecentUpdates?.items ?? [],
      },
    });

    const blob = buildDownloadPayload(artifact.format, artifact.content);
    const url = URL.createObjectURL(blob);

    try {
      await browser.downloads.download({
        url,
        filename: artifact.filename,
        saveAs: surface === 'sidepanel' || surface === 'options',
      });
      setExportFeedback(`${artifact.filename} 已准备下载。`);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  async function handleSaveOptions() {
    const nextConfig = buildNextConfig({
      current: config,
      defaultExportFormat: optionsDraft.defaultExportFormat,
      ai: optionsDraft.ai,
      sites: optionsDraft.sites,
    });
    const saved = await saveExtensionConfig(nextConfig);
    setConfig(saved);
    setOptionsDraft(saved);
    setSelectedFormat(saved.defaultExportFormat);
    setOptionsFeedback('配置已保存。');
    await refreshProviderStatus();
  }

  async function handleAskAi() {
    if (!config.ai.bffBaseUrl) {
      setAiError('BFF base URL is not configured yet. Set it in Options first.');
      return;
    }

    if (!providerStatus.providers[aiProvider]?.ready) {
      setAiError(`${PROVIDER_OPTIONS.find((option) => option.value === aiProvider)?.label ?? aiProvider} is not ready in the BFF yet.`);
      await refreshProviderStatus();
      return;
    }

    if (!aiQuestion.trim()) {
      setAiError('先输入一个问题，AI 才知道要解释什么。');
      return;
    }

    setAiPending(true);
    setAiError(undefined);

    try {
      const exportArtifact = createExportArtifact({
        preset: 'current_view',
        format: 'markdown',
        input: {
          generatedAt: now,
          viewTitle: 'Current workbench view',
          assignments: currentAssignments,
          announcements: currentAnnouncements,
          messages: currentMessages,
          grades: currentGrades,
          events: currentEvents,
          alerts: currentAlerts,
          timelineEntries: currentRecentUpdates?.items ?? [],
        },
      });

      const proxyRequest = buildAiProxyRequest({
        provider: aiProvider,
        model: aiModel,
        question: aiQuestion,
        todaySnapshot: todaySnapshot ?? {
          totalAssignments: 0,
          dueSoonAssignments: 0,
          recentUpdates: 0,
          newGrades: 0,
          riskAlerts: 0,
          syncedSites: 0,
        },
        recentUpdates: currentRecentUpdates?.items ?? [],
        alerts: currentAlerts,
        currentViewExport: exportArtifact,
      });

      const response = await fetch(`${config.ai.bffBaseUrl}${proxyRequest.route}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(proxyRequest.body),
      });
      const payload = (await response.json()) as AiResponsePayload;

      if (!response.ok || payload.ok === false || !payload.answerText) {
        setAiAnswer(undefined);
        setAiError(payload.error ?? payload.answerText ?? 'BFF 已响应，但当前 provider 没有返回可展示的回答。');
        return;
      }

      setAiAnswer(payload.answerText);
    } catch (error) {
      setAiAnswer(undefined);
      setAiError(error instanceof Error ? error.message : 'AI 请求失败。');
    } finally {
      setAiPending(false);
    }
  }

  const orderedSiteStatus = SITE_ORDER.map((site) => {
    const sync = siteSyncStates.find((entry) => entry.site === site);
    const counts =
      siteCounts.find((entry) => entry.site === site) ?? {
        site,
        courses: 0,
        assignments: 0,
        announcements: 0,
        grades: 0,
        messages: 0,
        events: 0,
        alerts: 0,
      };

    return {
      site,
      counts,
      sync,
      hint: buildSiteBlockingHint(site, {
        outcome: sync?.lastOutcome,
        hasEdStemConfig: Boolean(config.sites.edstem.threadsPath),
      }),
    };
  });

  const criticalAlerts = priorityAlerts.filter((alert) => alert.importance === 'critical');
  const highAlerts = priorityAlerts.filter((alert) => alert.importance === 'high');
  const mediumAlerts = priorityAlerts.filter((alert) => !['critical', 'high'].includes(alert.importance));
  const lastSuccessfulSync = siteSyncStates.find((entry) => entry.status === 'success')?.lastSyncedAt;
  const currentSiteSelection = filters.site === 'all' ? undefined : filters.site;
  const diagnostics = buildDiagnosticsSummary({
    bffBaseUrl: config.ai.bffBaseUrl,
    providerStatus: providerStatus as ProviderStatusLike,
    orderedSiteStatus,
    providerOptions: PROVIDER_OPTIONS,
    defaultProvider: config.ai.defaultProvider,
    siteLabels: SITE_LABELS,
  });

  async function handleExportDiagnostics() {
    const report = buildDiagnosticsReport({
      generatedAt: new Date().toISOString(),
      bffBaseUrl: config.ai.bffBaseUrl,
      providerStatus: providerStatus as ProviderStatusLike,
      orderedSiteStatus,
      providerOptions: PROVIDER_OPTIONS,
      defaultProvider: config.ai.defaultProvider,
      siteLabels: SITE_LABELS,
    });

    const blob = buildDownloadPayload('json', JSON.stringify(report, null, 2));
    const url = URL.createObjectURL(blob);

    try {
      await browser.downloads.download({
        url,
        filename: 'campus-copilot-diagnostics.json',
        saveAs: surface !== 'popup',
      });
      setExportFeedback('campus-copilot-diagnostics.json is ready to download.');
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  return (
    <main className={`surface surface--${surface}`}>
      <section className="surface__card">
        <div className="surface__hero">
          <div>
            <p className="surface__eyebrow">{copy.eyebrow}</p>
            <h1 className="surface__title">{copy.title}</h1>
            <p className="surface__copy">{copy.description}</p>
          </div>
          <div className="surface__hero-meta">
            <span>上次刷新：{formatRelativeTime(lastSuccessfulSync)}</span>
            <span>默认导出：{EXPORT_FORMAT_OPTIONS.find((option) => option.value === selectedFormat)?.label}</span>
          </div>
        </div>

        <div className="surface__grid surface__grid--stats">
          <article className="surface__panel surface__metric">
            <span className="surface__metric-value">{todaySnapshot?.totalAssignments ?? 0}</span>
            <span className="surface__metric-label">待办作业</span>
          </article>
          <article className="surface__panel surface__metric">
            <span className="surface__metric-value">{todaySnapshot?.dueSoonAssignments ?? 0}</span>
            <span className="surface__metric-label">48 小时内截止</span>
          </article>
          <article className="surface__panel surface__metric">
            <span className="surface__metric-value">{currentRecentUpdates?.unseenCount ?? 0}</span>
            <span className="surface__metric-label">未查看更新</span>
          </article>
          <article className="surface__panel surface__metric">
            <span className="surface__metric-value">{todaySnapshot?.newGrades ?? 0}</span>
            <span className="surface__metric-label">新成绩</span>
          </article>
          <article className="surface__panel surface__metric">
            <span className="surface__metric-value">{todaySnapshot?.syncedSites ?? 0}</span>
            <span className="surface__metric-label">成功同步站点</span>
          </article>
        </div>

        {surface !== 'options' ? (
          <div className="surface__toolbar">
            <div className="surface__chips">
              <button
                className={`surface__chip ${filters.site === 'all' ? 'surface__chip--active' : ''}`}
                onClick={() => setFilters((current) => ({ ...current, site: 'all' }))}
              >
                全部站点
              </button>
              {SITE_ORDER.map((site) => (
                <button
                  key={site}
                  className={`surface__chip ${filters.site === site ? 'surface__chip--active' : ''}`}
                  onClick={() => setFilters((current) => ({ ...current, site }))}
                >
                  {SITE_LABELS[site]}
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
              <span>仅看未查看更新</span>
            </label>
          </div>
        ) : null}

        <div className="surface__grid surface__grid--split">
          <article className="surface__panel">
            <h2>Today Snapshot</h2>
            <p>这里像桌面上的今日便签。先告诉你今天有没有急事，再决定要不要继续钻进细节。</p>
            <ul className="surface__list">
              <li>当前待办：{todaySnapshot?.totalAssignments ?? 0}</li>
              <li>即将到期：{todaySnapshot?.dueSoonAssignments ?? 0}</li>
              <li>最近更新：{todaySnapshot?.recentUpdates ?? 0}</li>
              <li>当前视图未查看：{currentRecentUpdates?.unseenCount ?? 0}</li>
            </ul>
          </article>

          <article className="surface__panel">
            <h2>Quick Actions</h2>
            <p>这些按钮像办公桌最顺手的四个抽屉，让你不用绕路就能做高价值动作。</p>
            <div className="surface__actions surface__actions--wrap">
              <button
                className="surface__button"
                disabled={!currentSiteSelection || syncFeedback.inFlightSite === currentSiteSelection}
                onClick={() => (currentSiteSelection ? void handleSiteSync(currentSiteSelection) : undefined)}
              >
                {currentSiteSelection
                  ? syncFeedback.inFlightSite === currentSiteSelection
                    ? `Syncing ${SITE_LABELS[currentSiteSelection]}…`
                    : `同步 ${SITE_LABELS[currentSiteSelection]}`
                  : '先选择站点再同步'}
              </button>
              <button className="surface__button surface__button--secondary" onClick={() => void handleExport('current_view')}>
                打开导出
              </button>
              <button className="surface__button surface__button--secondary" onClick={() => void handleMarkVisibleUpdatesSeen()}>
                标记更新已查看
              </button>
              <button className="surface__button surface__button--ghost" onClick={() => void browser.runtime.openOptionsPage()}>
                跳到 Options
              </button>
            </div>
            {syncFeedback.message ? <p className="surface__feedback">{syncFeedback.message}</p> : null}
            {exportFeedback ? <p className="surface__feedback">{exportFeedback}</p> : null}
          </article>
        </div>

        {surface !== 'popup' ? (
          <article className="surface__panel">
            <h2>Diagnostics</h2>
            <p>这块像运行时控制塔，不是告诉你“系统很多功能”，而是告诉你“当前真正卡住哪些前置条件”。</p>
            <div className="surface__stack">
              <p className="surface__meta">
                Current status: {diagnostics.healthy ? 'ready_to_continue' : 'blocked_by_environment_or_runtime'}
              </p>
              {diagnostics.blockers.length > 0 ? (
                <ul className="surface__list">
                  {diagnostics.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              ) : (
                <p>No obvious runtime blockers are active right now, so deeper validation can continue.</p>
              )}
              {diagnostics.nextActions.length > 0 ? (
                <div className="surface__group">
                  <h3>Next Actions</h3>
                  <ul className="surface__list">
                    {diagnostics.nextActions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="surface__actions">
                <button className="surface__button surface__button--ghost" onClick={() => void handleExportDiagnostics()}>
                  Export diagnostics JSON
                </button>
              </div>
            </div>
          </article>
        ) : null}

        {surface !== 'popup' ? (
          <>
            <div className="surface__grid surface__grid--split">
              <article className="surface__panel">
                <h2>Priority Alerts</h2>
                <p>这块像值班表，重点不是“条目多”，而是“哪几条现在最该先看”。</p>
                <div className="surface__stack">
                  {criticalAlerts.length > 0 ? (
                    <section className="surface__group">
                      <h3>Critical</h3>
                      {criticalAlerts.map((alert) => (
                        <article className="surface__item" key={alert.id}>
                          <div className="surface__item-header">
                            <strong>{alert.title}</strong>
                            <span className={`surface__badge surface__badge--${alert.importance}`}>{alert.importance}</span>
                          </div>
                          <p>{alert.summary}</p>
                          <p className="surface__meta">
                            {SITE_LABELS[alert.site]} · {formatDateTime(alert.triggeredAt)}
                          </p>
                        </article>
                      ))}
                    </section>
                  ) : null}
                  {highAlerts.length > 0 ? (
                    <section className="surface__group">
                      <h3>High</h3>
                      {highAlerts.map((alert) => (
                        <article className="surface__item" key={alert.id}>
                          <div className="surface__item-header">
                            <strong>{alert.title}</strong>
                            <span className={`surface__badge surface__badge--${alert.importance}`}>{alert.importance}</span>
                          </div>
                          <p>{alert.summary}</p>
                          <p className="surface__meta">
                            {SITE_LABELS[alert.site]} · {formatDateTime(alert.triggeredAt)}
                          </p>
                        </article>
                      ))}
                    </section>
                  ) : null}
                  {mediumAlerts.length > 0 ? (
                    <section className="surface__group">
                      <h3>Medium</h3>
                      {mediumAlerts.map((alert) => (
                        <article className="surface__item" key={alert.id}>
                          <div className="surface__item-header">
                            <strong>{alert.title}</strong>
                            <span className={`surface__badge surface__badge--${alert.importance}`}>{alert.importance}</span>
                          </div>
                          <p>{alert.summary}</p>
                          <p className="surface__meta">
                            {SITE_LABELS[alert.site]} · {formatDateTime(alert.triggeredAt)}
                          </p>
                        </article>
                      ))}
                    </section>
                  ) : null}
                  {priorityAlerts.length === 0 ? <p>还没有生成提醒。先同步一个站点，系统才有事实可判断。</p> : null}
                </div>
              </article>

              <article className="surface__panel">
                <h2>Recent Updates</h2>
                <p>这块回答“最近发生了什么”，而且允许你只盯住还没处理过的变化。</p>
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
                          {SITE_LABELS[entry.site]} · {formatDateTime(entry.occurredAt)}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p>当前筛选下还没有可展示的更新流。</p>
                  )}
                </div>
              </article>
            </div>

            <div className="surface__grid surface__grid--split">
              <article className="surface__panel">
                <h2>Current Tasks</h2>
                <p>这里先把当前视图里的任务稳定露出来，先做到能看、能导、能继续问，再谈复杂详情页。</p>
                <div className="surface__stack">
                  {currentAssignments.length ? (
                    currentAssignments.slice(0, surface === 'sidepanel' ? 8 : 4).map((assignment) => (
                      <article className="surface__item" key={assignment.id}>
                        <div className="surface__item-header">
                          <strong>{assignment.title}</strong>
                          <span className="surface__badge surface__badge--neutral">{assignment.status}</span>
                        </div>
                        <p className="surface__meta">
                          {SITE_LABELS[assignment.site]} · {assignment.dueAt ? `截止 ${formatDateTime(assignment.dueAt)}` : '未提供截止时间'}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p>当前筛选下还没有结构化任务。先同步站点，任务列表才会长出来。</p>
                  )}
                </div>
              </article>

              <article className="surface__panel">
                <h2>Site Status</h2>
                <p>这里像控制塔，专门讲真话：哪站已经 live，哪站只是部分成功，哪站现在卡在配置或上下文。</p>
                <div className="surface__stack">
                  {orderedSiteStatus.map((entry) => (
                    <article className="surface__item" key={entry.site}>
                      <div className="surface__item-header">
                        <strong>{SITE_LABELS[entry.site]}</strong>
                        <span
                          className={`surface__badge surface__badge--${getSiteStatusTone(entry.sync?.lastOutcome, entry.sync?.status)}`}
                        >
                          {getSiteStatusLabel(entry.sync?.lastOutcome, entry.sync?.status)}
                        </span>
                      </div>
                      <p className="surface__meta">
                        作业 {entry.counts.assignments} · 公告 {entry.counts.announcements} · 成绩 {entry.counts.grades} · 消息 {entry.counts.messages}
                      </p>
                      <p className="surface__meta">最近同步：{formatRelativeTime(entry.sync?.lastSyncedAt)}</p>
                      {entry.sync?.resourceFailures?.length ? (
                        <p>仍有资源缺口：{entry.sync.resourceFailures.map((item) => item.resource).join(' / ')}</p>
                      ) : null}
                      {entry.sync?.errorReason ? <p>{entry.sync.errorReason}</p> : null}
                      {entry.hint ? <p>{entry.hint}</p> : null}
                      <div className="surface__actions">
                        <button
                          className="surface__button surface__button--ghost"
                          disabled={syncFeedback.inFlightSite === entry.site}
                          onClick={() => void handleSiteSync(entry.site)}
                        >
                          {syncFeedback.inFlightSite === entry.site ? '同步中…' : `同步 ${SITE_LABELS[entry.site]}`}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            </div>

            {surface === 'sidepanel' ? (
              <article className="surface__panel">
                <h2>Ask AI</h2>
                <p>AI 在这里不是主角，而是站在工作台结果后面做解释。它只吃结构化数据，不碰网页和 DOM。</p>
                <div className="surface__grid surface__grid--split">
                  <label className="surface__field">
                    <span>Provider</span>
                    <select
                      value={aiProvider}
                      onChange={(event) => {
                        const nextProvider = event.target.value as ProviderId;
                        setAiProvider(nextProvider);
                        setAiModel(getProviderModel(config, nextProvider));
                      }}
                    >
                      {PROVIDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="surface__field">
                    <span>Model</span>
                    <input value={aiModel} onChange={(event) => setAiModel(event.target.value)} />
                  </label>
                </div>
                <div className="surface__stack">
                  {PROVIDER_OPTIONS.map((option) => (
                    <p className="surface__meta" key={option.value}>
                      {option.label} · {providerStatus.providers[option.value]?.ready ? 'ready' : 'not ready'} · {formatProviderReason(providerStatus.providers[option.value]?.reason)}
                    </p>
                  ))}
                  <p className="surface__meta">
                    最近检查：{formatRelativeTime(providerStatus.checkedAt)}
                    {providerStatus.error ? ` · ${formatProviderStatusError(providerStatus.error)}` : ''}
                  </p>
                </div>
                <div className="surface__actions">
                  <button className="surface__button surface__button--ghost" disabled={providerStatusPending} onClick={() => void refreshProviderStatus()}>
                    {providerStatusPending ? '刷新中…' : '刷新 provider 状态'}
                  </button>
                </div>
                <label className="surface__field">
                  <span>问题</span>
                  <textarea
                    rows={4}
                    value={aiQuestion}
                    onChange={(event) => setAiQuestion(event.target.value)}
                    placeholder="例如：我现在最该关注什么？最近有什么变化？"
                  />
                </label>
                <div className="surface__actions surface__actions--wrap">
                  <button className="surface__button" disabled={aiPending} onClick={() => void handleAskAi()}>
                    {aiPending ? 'Asking…' : '问 AI'}
                  </button>
                  <button className="surface__button surface__button--ghost" onClick={() => void browser.runtime.openOptionsPage()}>
                    配置 BFF / Provider
                  </button>
                </div>
                {!config.ai.bffBaseUrl ? <p className="surface__feedback">BFF base URL is still missing, so the AI path should fail loudly instead of failing silently.</p> : null}
                {aiError ? <p className="surface__feedback surface__feedback--error">{aiError}</p> : null}
                {aiAnswer ? <div className="surface__answer">{aiAnswer}</div> : null}
              </article>
            ) : null}
          </>
        ) : null}

        {surface === 'popup' ? (
          <div className="surface__grid">
            <article className="surface__panel">
              <h2>Quick export</h2>
              <div className="surface__actions surface__actions--wrap">
                <button className="surface__button surface__button--secondary" onClick={() => void handleExport('weekly_assignments')}>
                  本周作业
                </button>
                <button className="surface__button surface__button--ghost" onClick={() => void handleExport('current_view')}>
                  当前视图
                </button>
              </div>
            </article>
          </div>
        ) : null}

        {surface === 'options' ? (
          <div className="surface__grid surface__grid--split">
            <article className="surface__panel">
              <h2>Site configuration</h2>
              <p>EdStem 会优先尝试从当前课程标签页自动推导 threads 路径；只有自动推导不够时，才需要你手动覆盖。unread / recent activity 路径都是可选项。</p>
              <label className="surface__field">
                <span>EdStem threads path</span>
                <input
                  value={optionsDraft.sites.edstem.threadsPath ?? ''}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        sites: {
                          edstem: {
                            ...current.sites.edstem,
                            threadsPath: event.target.value || undefined,
                          },
                        },
                      }),
                    )
                  }
                  placeholder="/api/courses/90031/threads?limit=30&sort=new"
                />
              </label>
              <label className="surface__field">
                <span>EdStem unread path</span>
                <input
                  value={optionsDraft.sites.edstem.unreadPath ?? ''}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        sites: {
                          edstem: {
                            ...current.sites.edstem,
                            unreadPath: event.target.value || undefined,
                          },
                        },
                      }),
                    )
                  }
                  placeholder="可选：留空表示不额外覆盖 unread 路径"
                />
              </label>
              <label className="surface__field">
                <span>EdStem recent activity path</span>
                <input
                  value={optionsDraft.sites.edstem.recentActivityPath ?? ''}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        sites: {
                          edstem: {
                            ...current.sites.edstem,
                            recentActivityPath: event.target.value || undefined,
                          },
                        },
                      }),
                    )
                  }
                  placeholder="可选：留空表示不额外覆盖 recent activity 路径"
                />
              </label>
            </article>

            <article className="surface__panel">
              <h2>AI / BFF configuration</h2>
              <label className="surface__field">
                <span>BFF base URL</span>
                <input
                  value={optionsDraft.ai.bffBaseUrl ?? ''}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        ai: {
                          ...current.ai,
                          bffBaseUrl: event.target.value || undefined,
                        },
                      }),
                    )
                  }
                  placeholder="http://127.0.0.1:8787"
                />
              </label>
              <label className="surface__field">
                <span>默认 Provider</span>
                <select
                  value={optionsDraft.ai.defaultProvider}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        ai: {
                          ...current.ai,
                          defaultProvider: event.target.value as ProviderId,
                        },
                      }),
                    )
                  }
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="surface__stack">
                {PROVIDER_OPTIONS.map((option) => (
                  <p className="surface__meta" key={option.value}>
                    {option.label} · {providerStatus.providers[option.value]?.ready ? 'BFF ready' : 'BFF not ready'} · {formatProviderReason(providerStatus.providers[option.value]?.reason)}
                  </p>
                ))}
                <p className="surface__meta">
                  最近检查：{formatRelativeTime(providerStatus.checkedAt)}
                  {providerStatus.error ? ` · ${formatProviderStatusError(providerStatus.error)}` : ''}
                </p>
              </div>
              <div className="surface__actions">
                <button className="surface__button surface__button--ghost" disabled={providerStatusPending} onClick={() => void refreshProviderStatus()}>
                  {providerStatusPending ? '刷新中…' : '刷新 BFF 状态'}
                </button>
              </div>
              <label className="surface__field">
                <span>OpenAI model</span>
                <input
                  value={optionsDraft.ai.models.openai}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        ai: {
                          ...current.ai,
                          models: {
                            ...current.ai.models,
                            openai: event.target.value,
                          },
                        },
                      }),
                    )
                  }
                />
              </label>
              <label className="surface__field">
                <span>Gemini model</span>
                <input
                  value={optionsDraft.ai.models.gemini}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        ai: {
                          ...current.ai,
                          models: {
                            ...current.ai.models,
                            gemini: event.target.value,
                          },
                        },
                      }),
                    )
                  }
                />
              </label>
              <label className="surface__field">
                <span>默认导出格式</span>
                <select
                  value={optionsDraft.defaultExportFormat}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      buildNextConfig({
                        current,
                        defaultExportFormat: event.target.value as ExportFormat,
                      }),
                    )
                  }
                >
                  {EXPORT_FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="surface__actions surface__actions--wrap">
                <button className="surface__button" onClick={() => void handleSaveOptions()}>
                  保存配置
                </button>
                <button className="surface__button surface__button--secondary" onClick={() => void handleExport('current_view')}>
                  导出当前视图
                </button>
              </div>
              {optionsFeedback ? <p className="surface__feedback">{optionsFeedback}</p> : null}
            </article>

            <article className="surface__panel">
              <h2>Boundary disclosure</h2>
              <ul className="surface__list">
                <li>当前产品仍以本地优先、手动同步、read-only 为主，不会静默后台扫站点。</li>
                <li>EdStem path 由你明确配置，不做偷偷摸摸的 endpoint 猜测。</li>
                <li>MyUW 依赖当前活动标签页里的 page state / DOM，上下文不对就应当诚实失败。</li>
                <li>本轮 AI 只走 OpenAI / Gemini 的 API key 路线；Gemini OAuth、web_session、多 provider 自动路由仍未纳入正式路径。</li>
                <li>AI 只消费统一 schema 和工作台读模型，不读取 raw DOM、cookie 或站点原始响应。</li>
              </ul>
            </article>
          </div>
        ) : null}
      </section>
    </main>
  );
}
