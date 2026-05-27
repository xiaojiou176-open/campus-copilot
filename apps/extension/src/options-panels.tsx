import { useState, type Dispatch, type SetStateAction } from 'react';
import { type ProviderId } from '@campus-copilot/ai';
import type { ExportFormat, ExportPreset } from '@campus-copilot/exporter';
import { getAiSitePolicyOverlay } from './ai-site-policy';
import {
  ADMIN_HIGH_SENSITIVITY_FAMILY_DESCRIPTORS,
  MANAGED_POLICY_SITES,
  buildNextConfig,
  upsertAuthorizationRule,
  type ExtensionConfig,
} from './config';
import { formatProviderReason, formatProviderStatusError, type ProviderStatusLike } from './provider-status-format';
import { formatAuthorizationStatusLabel, formatRelativeTime, type ResolvedUiLanguage } from './i18n';
import { EXPORT_FORMAT_OPTIONS, PROVIDER_OPTIONS, SITE_LABELS } from './surface-shell-model';
import { type UiText } from './surface-shell-view-helpers';

const AUTHORIZATION_STATUS_OPTIONS: Array<ExtensionConfig['authorization']['rules'][number]['status']> = [
  'allowed',
  'partial',
  'confirm_required',
  'blocked',
];

function getAuthorizationStatusTone(status: ExtensionConfig['authorization']['rules'][number]['status']) {
  if (status === 'allowed') {
    return 'success';
  }
  if (status === 'blocked') {
    return 'danger';
  }
  return 'warning';
}

function getManagedPolicySiteLabel(site: (typeof MANAGED_POLICY_SITES)[number]) {
  if (site === 'myplan') {
    return 'MyPlan';
  }
  return SITE_LABELS[site];
}

function formatSiteOverlaySummary(
  overlay: ReturnType<typeof getAiSitePolicyOverlay>,
  uiLanguage: ResolvedUiLanguage,
) {
  if (!overlay) {
    return uiLanguage === 'zh-CN' ? '当前没有额外的站点 AI 覆盖摘要。' : 'No additional site-level AI overlay summary is available yet.';
  }

  if (uiLanguage === 'zh-CN') {
    return `允许 ${overlay.allowedFamilies.length} 类 · 仅导出 ${overlay.exportOnlyFamilies.length} 类 · AI 禁止 ${overlay.forbiddenAiObjects.length} 类`;
  }

  return `Allowed ${overlay.allowedFamilies.length} families · Export-first ${overlay.exportOnlyFamilies.length} · AI-blocked ${overlay.forbiddenAiObjects.length}`;
}

function getSiteAuthorizationStatus(
  config: ExtensionConfig,
  site: (typeof MANAGED_POLICY_SITES)[number],
  layer: ExtensionConfig['authorization']['rules'][number]['layer'],
) {
  return (
    config.authorization.rules.find(
      (rule) => rule.site === site && rule.layer === layer && rule.resourceFamily === 'workspace_snapshot',
    )?.status ?? (layer === 'layer1_read_export' ? 'partial' : 'confirm_required')
  );
}

function getWorkspaceAuthorizationStatus(
  config: ExtensionConfig,
  layer: ExtensionConfig['authorization']['rules'][number]['layer'],
) {
  return (
    config.authorization.rules.find(
      (rule) =>
        !rule.site &&
        !rule.courseIdOrKey &&
        rule.layer === layer &&
        rule.resourceFamily === 'workspace_snapshot',
    )?.status ?? (layer === 'layer1_read_export' ? 'allowed' : 'confirm_required')
  );
}

function getResourceFamilyAuthorizationStatus(
  config: ExtensionConfig,
  resourceFamily: (typeof ADMIN_HIGH_SENSITIVITY_FAMILY_DESCRIPTORS)[number]['resourceFamily'],
  layer: ExtensionConfig['authorization']['rules'][number]['layer'],
) {
  return (
    config.authorization.rules.find(
      (rule) =>
        !rule.site &&
        !rule.courseIdOrKey &&
        rule.layer === layer &&
        rule.resourceFamily === resourceFamily,
    )?.status ?? (layer === 'layer1_read_export' ? 'confirm_required' : 'blocked')
  );
}

function updateWorkspaceAuthorizationStatus(
  config: ExtensionConfig,
  layer: ExtensionConfig['authorization']['rules'][number]['layer'],
  status: ExtensionConfig['authorization']['rules'][number]['status'],
) {
  const nextRules = config.authorization.rules.filter(
    (rule) =>
      !(
        !rule.site &&
        !rule.courseIdOrKey &&
        rule.layer === layer &&
        rule.resourceFamily === 'workspace_snapshot'
      ),
  );
  nextRules.push({
    id: `global-${layer}-workspace`,
    layer,
    status,
    resourceFamily: 'workspace_snapshot',
    label:
      layer === 'layer1_read_export'
        ? 'All sites structured read/export'
        : 'All sites AI read/analysis status',
  });

  return buildNextConfig({
    current: config,
    authorization: {
      updatedAt: new Date().toISOString(),
      rules: nextRules,
    },
  });
}

function updateSiteAuthorizationStatus(
  config: ExtensionConfig,
  site: (typeof MANAGED_POLICY_SITES)[number],
  layer: ExtensionConfig['authorization']['rules'][number]['layer'],
  status: ExtensionConfig['authorization']['rules'][number]['status'],
) {
  const nextRules = config.authorization.rules.filter(
    (rule) =>
      !(
        rule.site === site &&
        rule.layer === layer &&
        rule.resourceFamily === 'workspace_snapshot' &&
        !rule.courseIdOrKey
      ),
  );
  nextRules.push({
    id: `${site}-${layer}-workspace`,
    layer,
    status,
    site,
    resourceFamily: 'workspace_snapshot',
    label:
      layer === 'layer1_read_export'
        ? `${site} structured read/export`
        : `${site} AI read/analysis status`,
  });

  return buildNextConfig({
    current: config,
    authorization: {
      updatedAt: new Date().toISOString(),
      rules: nextRules,
    },
  });
}

function updateAuthorizationRuleStatus(
  config: ExtensionConfig,
  ruleId: string,
  status: ExtensionConfig['authorization']['rules'][number]['status'],
) {
  return buildNextConfig({
    current: config,
    authorization: {
      updatedAt: new Date().toISOString(),
      rules: config.authorization.rules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              status,
              updatedAt: new Date().toISOString(),
            }
          : rule,
      ),
    },
  });
}

export function OptionsPanels(props: {
  text: UiText;
  uiLanguage: ResolvedUiLanguage;
  optionsDraft: ExtensionConfig;
  setOptionsDraft: Dispatch<SetStateAction<ExtensionConfig>>;
  activeBffBaseUrl?: string;
  providerStatus: ProviderStatusLike;
  providerStatusPending: boolean;
  availableCourses: Array<{ id: string; site: string; label: string; title?: string }>;
  optionsFeedback?: string;
  onRefreshProviderStatus: () => Promise<void>;
  onSaveOptions: () => Promise<void>;
  onExport: (preset: ExportPreset) => Promise<void>;
}) {
  const {
    text,
    uiLanguage,
    optionsDraft,
    setOptionsDraft,
    activeBffBaseUrl,
    providerStatus,
    providerStatusPending,
    availableCourses,
    optionsFeedback,
    onRefreshProviderStatus,
    onSaveOptions,
    onExport,
  } = props;

  const readyProviderCount = PROVIDER_OPTIONS.filter((option) => providerStatus.providers[option.value]?.ready).length;
  const effectiveBffBaseUrl = activeBffBaseUrl || optionsDraft.ai.bffBaseUrl;
  const blockedResourceFamilyCount = ADMIN_HIGH_SENSITIVITY_FAMILY_DESCRIPTORS.filter(
    (family) => getResourceFamilyAuthorizationStatus(optionsDraft, family.resourceFamily, 'layer2_ai_read_analysis') === 'blocked',
  ).length;
  const globalLayer1Status = getWorkspaceAuthorizationStatus(optionsDraft, 'layer1_read_export');
  const globalLayer2Status = getWorkspaceAuthorizationStatus(optionsDraft, 'layer2_ai_read_analysis');
  const detailedAuthorizationControlsLabel =
    uiLanguage === 'zh-CN' ? '更深信任审查' : 'Deeper trust reviews';
  const siteBoundaryReviewsLabel =
    uiLanguage === 'zh-CN' ? '站点信任审查' : 'Site trust reviews';
  const protectedFamiliesReviewLabel =
    uiLanguage === 'zh-CN' ? '高敏资源与课程确认' : 'Protected families and course AI confirmations';
  const courseLevelAuthorizationLabel =
    uiLanguage === 'zh-CN' ? '课程级 AI 确认' : 'Course-level AI confirmations';
  const noCourseLevelAuthorizationLabel =
    uiLanguage === 'zh-CN'
      ? '当前还没有记录任何课程级 AI opt-in。'
      : 'No course-level AI opt-ins have been captured yet.';
  const connectionSummaryTitle =
    uiLanguage === 'zh-CN' ? '桌面连接与信任摘要' : 'Desk connection and trust';
  const connectionSummaryDescription =
    uiLanguage === 'zh-CN'
      ? '先确认当前状态、两层授权和高敏边界，再决定要不要往下改配置或导出。'
      : 'Confirm the current status, the two-layer authorization posture, and high-sensitivity boundaries before changing settings or exporting.';
  const configurationActionsTitle =
    uiLanguage === 'zh-CN' ? '下一步动作' : 'Next steps';
  const configurationActionsDescription =
    uiLanguage === 'zh-CN'
      ? '保存、刷新和导出放到 trust/boundary 摘要之后，避免首屏先变成控制台。'
      : 'Save, refresh, and export stay after the trust and boundary summary so the first screen does not read like a control console.';
  const readExportLabel = uiLanguage === 'zh-CN' ? '读取与导出' : 'Read & export';
  const aiAnalysisLabel = uiLanguage === 'zh-CN' ? 'AI 权限' : 'AI permission';
  const localAiConnectionLabel = uiLanguage === 'zh-CN' ? '本地 AI 连接' : 'Local AI connection';
  const trustPostureLabel = uiLanguage === 'zh-CN' ? '当前信任摘要' : 'Current trust summary';
  const managedSiteAuthorizationSnapshot = MANAGED_POLICY_SITES.map((site) => ({
    site,
    layer1: getSiteAuthorizationStatus(optionsDraft, site, 'layer1_read_export'),
    layer2: getSiteAuthorizationStatus(optionsDraft, site, 'layer2_ai_read_analysis'),
  }));
  const courseScopedAuthorizationRules = optionsDraft.authorization.rules.filter((rule) => rule.courseIdOrKey);
  const [courseAuthorizationDraftId, setCourseAuthorizationDraftId] = useState('');
  const [courseAuthorizationDraftStatus, setCourseAuthorizationDraftStatus] = useState<
    ExtensionConfig['authorization']['rules'][number]['status']
  >('confirm_required');
  const selectedCourseAuthorizationDraft = availableCourses.find((course) => course.id === courseAuthorizationDraftId);
  const edStemOverrideCount = [
    optionsDraft.sites.edstem.threadsPath,
    optionsDraft.sites.edstem.unreadPath,
    optionsDraft.sites.edstem.recentActivityPath,
  ].filter(Boolean).length;
  const defaultProviderLabel =
    PROVIDER_OPTIONS.find((option) => option.value === optionsDraft.ai.defaultProvider)?.label ?? optionsDraft.ai.defaultProvider;

  return (
    <div className="surface__stack">
      <div className="surface__grid surface__grid--split">
        <article className="surface__panel">
          <h2>{connectionSummaryTitle}</h2>
          <p>{connectionSummaryDescription}</p>
          <div className="surface__summary-grid surface__summary-grid--compact surface__summary-grid--slim">
            <div className="surface__summary-cell surface__summary-cell--slim">
              <strong className="surface__summary-value">{readyProviderCount}</strong>
              <span className="surface__summary-label">{text.options.readyProviders}</span>
            </div>
            <div className="surface__summary-cell surface__summary-cell--slim">
              <strong className="surface__summary-value">{confirmRequiredCount(optionsDraft)}</strong>
              <span className="surface__summary-label">{text.options.confirmRequired}</span>
            </div>
            <div className="surface__summary-cell surface__summary-cell--slim">
              <strong className="surface__summary-value">{blockedResourceFamilyCount}</strong>
              <span className="surface__summary-label">{text.options.blockedFamilies}</span>
            </div>
          </div>
          <div className="surface__stack">
            <p className="surface__meta">
              {readExportLabel}: {formatAuthorizationStatusLabel(globalLayer1Status, uiLanguage)}
              {' · '}
              {aiAnalysisLabel}: {formatAuthorizationStatusLabel(globalLayer2Status, uiLanguage)}
            </p>
            <p className="surface__meta">
              {text.options.defaultProvider}: {defaultProviderLabel}
              {' · '}
              {text.options.defaultExportFormat}: {optionsDraft.defaultExportFormat.toUpperCase()}
            </p>
            <p className="surface__meta">
              {text.meta.lastChecked}: {formatRelativeTime(uiLanguage, providerStatus.checkedAt)}
              {providerStatus.error ? ` · ${formatProviderStatusError(providerStatus.error, uiLanguage)}` : ''}
            </p>
          </div>
        </article>

        <article className="surface__panel">
          <h2>{uiLanguage === 'zh-CN' ? '语言与 AI 基础设置' : 'Language and AI basics'}</h2>
          <p>
            {uiLanguage === 'zh-CN'
                  ? '先确认界面语言、AI 是否已连接，以及当前可用的模型路线。只有默认路径不够时，才需要进入更深设置。'
                  : 'Confirm the interface language, whether AI is connected, and which model routes are ready. Only drop into deeper settings when the default path is not enough.'}
          </p>
          <label className="surface__field">
            <span>{text.options.interfaceLanguage}</span>
            <select
              value={optionsDraft.uiLanguage}
              onChange={(event) =>
                setOptionsDraft((current) =>
                  buildNextConfig({
                    current,
                    uiLanguage: event.target.value as ExtensionConfig['uiLanguage'],
                  }),
                )
              }
            >
              <option value="auto">{text.options.followBrowser}</option>
              <option value="en">{text.options.english}</option>
              <option value="zh-CN">{text.options.chinese}</option>
            </select>
          </label>
          <div className="surface__stack">
            <p className="surface__meta">
              {localAiConnectionLabel}: {effectiveBffBaseUrl || text.options.manualFallbackOnly}
            </p>
            <p className="surface__meta">
              {text.meta.lastChecked}: {formatRelativeTime(uiLanguage, providerStatus.checkedAt)}
              {providerStatus.error ? ` · ${formatProviderStatusError(providerStatus.error, uiLanguage)}` : ''}
            </p>
          </div>
          <details className="surface__advanced-settings surface__advanced-settings--supporting">
            <summary className="surface__advanced-settings-summary">
              <span>{uiLanguage === 'zh-CN' ? '打开 AI 可用性说明' : 'Open AI readiness notes'}</span>
              <span className="surface__badge surface__badge--neutral">
                {uiLanguage === 'zh-CN' ? `${PROVIDER_OPTIONS.length} 条路线` : `${PROVIDER_OPTIONS.length} providers`}
              </span>
            </summary>
            <div className="surface__advanced-settings-body">
              <div className="surface__evidence-grid surface__evidence-grid--compact">
                {PROVIDER_OPTIONS.map((option) => (
                  <article className="surface__evidence-card" key={option.value}>
                    <div className="surface__item-header">
                      <strong>{option.label}</strong>
                      <span
                        className={`surface__badge surface__badge--${
                          providerStatus.providers[option.value]?.ready ? 'success' : 'warning'
                        }`}
                      >
                        {providerStatus.providers[option.value]?.ready ? text.meta.ready : text.meta.notReady}
                      </span>
                    </div>
                    <p className="surface__meta">
                      {formatProviderReason(providerStatus.providers[option.value]?.reason, uiLanguage)}
                    </p>
                  </article>
                ))}
              </div>
              <p className="surface__meta">
                {uiLanguage === 'zh-CN'
                  ? '只有自动发现失败，或你真的需要自定义本地地址时，才继续改更深的连接设置。'
                  : 'Only keep drilling into deeper connection settings when autodiscovery fails or you truly need a custom local address.'}
              </p>
            </div>
          </details>
        </article>
      </div>

      <div className="surface__grid surface__grid--split">
      <article className="surface__panel">
        <h2>{text.options.authorizationCenter}</h2>
        <p>
          {uiLanguage === 'zh-CN'
            ? '先看全局姿态摘要，只有当你真的要改站点或课程规则时，再打开更深控制。'
            : 'Start with the global posture summary, then open deeper controls only when you actually need to change site or course rules.'}
        </p>
        <div className="surface__summary-grid surface__summary-grid--compact surface__summary-grid--slim">
          <div className="surface__summary-cell surface__summary-cell--slim">
            <strong className="surface__summary-value">{allowedCount(optionsDraft)}</strong>
            <span className="surface__summary-label">{text.meta.ready}</span>
          </div>
          <div className="surface__summary-cell surface__summary-cell--slim">
            <strong className="surface__summary-value">{confirmRequiredCount(optionsDraft)}</strong>
            <span className="surface__summary-label">{text.options.confirmRequired}</span>
          </div>
          <div className="surface__summary-cell surface__summary-cell--slim">
            <strong className="surface__summary-value">{blockedResourceFamilyCount}</strong>
            <span className="surface__summary-label">{text.options.blockedFamilies}</span>
          </div>
        </div>
        <div className="surface__pill-row">
          <span className={`surface__pill surface__pill--${getAuthorizationStatusTone(globalLayer1Status)}`}>
            {readExportLabel} {formatAuthorizationStatusLabel(globalLayer1Status, uiLanguage)}
          </span>
          <span className={`surface__pill surface__pill--${getAuthorizationStatusTone(globalLayer2Status)}`}>
            {aiAnalysisLabel} {formatAuthorizationStatusLabel(globalLayer2Status, uiLanguage)}
          </span>
          <span className="surface__pill surface__pill--neutral">
            {text.meta.lastChecked}: {formatRelativeTime(uiLanguage, providerStatus.checkedAt)}
          </span>
        </div>
        <p className="surface__meta">
          {uiLanguage === 'zh-CN'
            ? '保持读取与导出、AI 分析分层，不把“能读”误写成“能让 AI 看”。'
            : 'Keep read/export separate from AI permissions so “readable” never silently becomes “AI-readable”.'}
        </p>
        <p className="surface__meta">
          {uiLanguage === 'zh-CN'
            ? '如果需要更保守的姿态，优先先收紧 AI 分析；真正的站点审查和规则编辑留在下一层。'
            : 'If you need a safer posture, tighten AI permissions first; site-by-site reviews and rule editing stay one layer deeper.'}
        </p>
        <details className="surface__advanced-settings" open={false}>
          <summary className="surface__advanced-settings-summary">
            <span>{uiLanguage === 'zh-CN' ? '展开更深信任审查' : 'Open deeper trust reviews'}</span>
            <span className="surface__badge surface__badge--neutral">{uiLanguage === 'zh-CN' ? '3 组' : '3 groups'}</span>
          </summary>
          <div className="surface__advanced-settings-body">
            <div className="surface__status-intro surface__status-intro--supporting">
              <div className="surface__status-intro-copy">
                <div className="surface__item-header">
                  <strong>{trustPostureLabel}</strong>
                  <span className="surface__badge surface__badge--neutral">
                    {uiLanguage === 'zh-CN' ? '摘要先行' : 'Summary first'}
                  </span>
                </div>
                <p className="surface__meta">
                  {uiLanguage === 'zh-CN'
                    ? '只有在你真的需要审站点、看高敏边界或改规则时，才继续展开下面的审查层。'
                    : 'Only expand the deeper review layer when you truly need a site audit, a protected-family check, or a rule change.'}
                </p>
              </div>
            </div>
            <details className="surface__advanced-settings surface__advanced-settings--supporting" open={false}>
              <summary className="surface__advanced-settings-summary">
                <span>{siteBoundaryReviewsLabel}</span>
                <span className="surface__badge surface__badge--neutral">{MANAGED_POLICY_SITES.length} sites</span>
              </summary>
              <div className="surface__advanced-settings-body">
                <p className="surface__meta">
                  {uiLanguage === 'zh-CN'
                    ? '这里把“这个站能读什么”和“这个站哪些东西仍然不能让 AI 看”合并成同一张审查卡。'
                    : 'Each card combines what the site can export with the current AI boundary, so you do not have to cross-read two separate sections.'}
                </p>
                <div className="surface__grid">
                  {managedSiteAuthorizationSnapshot.map((entry) => (
                    <article className="surface__evidence-card" key={entry.site}>
                      <div className="surface__item-header">
                        <strong>{getManagedPolicySiteLabel(entry.site)}</strong>
                        <span className={`surface__badge surface__badge--${getAuthorizationStatusTone(entry.layer2)}`}>
                          {formatAuthorizationStatusLabel(entry.layer2, uiLanguage)}
                        </span>
                      </div>
                      <p className="surface__meta">
                        {readExportLabel} {formatAuthorizationStatusLabel(entry.layer1, uiLanguage)}
                        {' · '}
                        {aiAnalysisLabel} {formatAuthorizationStatusLabel(entry.layer2, uiLanguage)}
                      </p>
                      <p className="surface__meta">{formatSiteOverlaySummary(getAiSitePolicyOverlay(entry.site), uiLanguage)}</p>
                    </article>
                  ))}
                </div>
              </div>
            </details>
            <details className="surface__advanced-settings surface__advanced-settings--supporting" open={false}>
              <summary className="surface__advanced-settings-summary">
                <span>{protectedFamiliesReviewLabel}</span>
                <span className="surface__badge surface__badge--neutral">
                  {ADMIN_HIGH_SENSITIVITY_FAMILY_DESCRIPTORS.length + courseScopedAuthorizationRules.length} checks
                </span>
              </summary>
              <div className="surface__advanced-settings-body">
                <p className="surface__meta">
                  {uiLanguage === 'zh-CN'
                    ? '这些高敏内容仍然保持 review-first / export-first；AI 边界默认比读取与导出更严格。'
                    : 'These high-sensitivity entries stay review-first and export-first, with AI remaining stricter than read/export by default.'}
                </p>
                <div className="surface__grid">
                  {ADMIN_HIGH_SENSITIVITY_FAMILY_DESCRIPTORS.map((family) => (
                    <article className="surface__evidence-card" key={family.resourceFamily}>
                      <div className="surface__item-header">
                        <strong>{family.label}</strong>
                        <span
                          className={`surface__badge surface__badge--${getAuthorizationStatusTone(
                            getResourceFamilyAuthorizationStatus(optionsDraft, family.resourceFamily, 'layer2_ai_read_analysis'),
                          )}`}
                        >
                          {formatAuthorizationStatusLabel(
                            getResourceFamilyAuthorizationStatus(optionsDraft, family.resourceFamily, 'layer2_ai_read_analysis'),
                            uiLanguage,
                          )}
                        </span>
                      </div>
                      <p className="surface__meta">
                        {readExportLabel} {formatAuthorizationStatusLabel(getResourceFamilyAuthorizationStatus(optionsDraft, family.resourceFamily, 'layer1_read_export'), uiLanguage)} · {aiAnalysisLabel}{' '}
                        {formatAuthorizationStatusLabel(getResourceFamilyAuthorizationStatus(optionsDraft, family.resourceFamily, 'layer2_ai_read_analysis'), uiLanguage)}
                      </p>
                      <p className="surface__meta">{family.note}</p>
                    </article>
                  ))}
                </div>
                <details className="surface__advanced-settings" open={false}>
                  <summary className="surface__advanced-settings-summary">
                    <span>{courseLevelAuthorizationLabel}</span>
                    <span className="surface__badge surface__badge--neutral">{courseScopedAuthorizationRules.length || 0} records</span>
                  </summary>
                  <div className="surface__advanced-settings-body">
                    <div className="surface__grid surface__grid--split">
                      <label className="surface__field">
                        <span>{courseLevelAuthorizationLabel}</span>
                        <select value={courseAuthorizationDraftId} onChange={(event) => setCourseAuthorizationDraftId(event.target.value)}>
                          <option value="">
                            {uiLanguage === 'zh-CN' ? '选择一门课来添加或更新 AI 确认' : 'Choose a course to add or update an AI confirmation'}
                          </option>
                          {availableCourses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="surface__field">
                        <span>{uiLanguage === 'zh-CN' ? 'AI 权限状态' : 'AI permission status'}</span>
                        <select
                          value={courseAuthorizationDraftStatus}
                          onChange={(event) =>
                            setCourseAuthorizationDraftStatus(
                              event.target.value as ExtensionConfig['authorization']['rules'][number]['status'],
                            )
                          }
                        >
                          {AUTHORIZATION_STATUS_OPTIONS.map((option) => (
                            <option key={`course-draft-${option}`} value={option}>
                              {formatAuthorizationStatusLabel(option, uiLanguage)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="surface__actions surface__actions--wrap">
                      <button
                        className="surface__button surface__button--secondary"
                        disabled={!selectedCourseAuthorizationDraft}
                        onClick={() =>
                          selectedCourseAuthorizationDraft
                            ? setOptionsDraft((current) =>
                                upsertAuthorizationRule(current, {
                                  id: `course-material-ai:${selectedCourseAuthorizationDraft.id}`,
                                  layer: 'layer2_ai_read_analysis',
                                  status: courseAuthorizationDraftStatus,
                                  site: selectedCourseAuthorizationDraft.site as ExtensionConfig['authorization']['rules'][number]['site'],
                                  courseIdOrKey: selectedCourseAuthorizationDraft.id,
                                  resourceFamily: 'course_material_excerpt',
                                  label: `${selectedCourseAuthorizationDraft.label} course-material AI analysis`,
                                  reason: 'Course-level advanced material analysis confirmation.',
                                }),
                              )
                            : undefined
                        }
                        type="button"
                      >
                        {uiLanguage === 'zh-CN' ? '保存课程级 AI 确认' : 'Save course-level AI confirmation'}
                      </button>
                    </div>
                    {courseScopedAuthorizationRules.length ? (
                      courseScopedAuthorizationRules.map((rule) => (
                        <div className="surface__grid surface__grid--split" key={rule.id}>
                          <label className="surface__field">
                            <span>{rule.label ?? rule.courseIdOrKey ?? rule.id}</span>
                            <input readOnly value={rule.courseIdOrKey ?? ''} />
                          </label>
                          <label className="surface__field">
                            <span>{rule.layer === 'layer2_ai_read_analysis' ? aiAnalysisLabel : readExportLabel}</span>
                            <select
                              value={rule.status}
                              onChange={(event) =>
                                setOptionsDraft((current) =>
                                  updateAuthorizationRuleStatus(
                                    current,
                                    rule.id,
                                    event.target.value as ExtensionConfig['authorization']['rules'][number]['status'],
                                  ),
                                )
                              }
                            >
                              {AUTHORIZATION_STATUS_OPTIONS.map((option) => (
                                <option key={`${rule.id}-${option}`} value={option}>
                                  {formatAuthorizationStatusLabel(option, uiLanguage)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="surface__meta">{noCourseLevelAuthorizationLabel}</p>
                    )}
                  </div>
                </details>
              </div>
            </details>
            <details className="surface__advanced-settings">
              <summary className="surface__advanced-settings-summary">
                <span>{detailedAuthorizationControlsLabel}</span>
                <span className="surface__badge surface__badge--neutral">{MANAGED_POLICY_SITES.length + 2} rows</span>
              </summary>
              <div className="surface__advanced-settings-body">
            <div className="surface__grid surface__grid--split">
              <label className="surface__field">
                <span>{uiLanguage === 'zh-CN' ? '全部站点 · 读取与导出' : 'All sites · Read & export'}</span>
                <select
                  value={globalLayer1Status}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      updateWorkspaceAuthorizationStatus(
                        current,
                        'layer1_read_export',
                        event.target.value as ExtensionConfig['authorization']['rules'][number]['status'],
                      ),
                    )
                  }
                >
                  {AUTHORIZATION_STATUS_OPTIONS.map((option) => (
                    <option key={`global-layer1-${option}`} value={option}>
                      {formatAuthorizationStatusLabel(option, uiLanguage)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="surface__field">
                <span>{uiLanguage === 'zh-CN' ? '全部站点 · AI 权限' : 'All sites · AI permission'}</span>
                <select
                  value={globalLayer2Status}
                  onChange={(event) =>
                    setOptionsDraft((current) =>
                      updateWorkspaceAuthorizationStatus(
                        current,
                        'layer2_ai_read_analysis',
                        event.target.value as ExtensionConfig['authorization']['rules'][number]['status'],
                      ),
                    )
                  }
                >
                  {AUTHORIZATION_STATUS_OPTIONS.map((option) => (
                    <option key={`global-layer2-${option}`} value={option}>
                      {formatAuthorizationStatusLabel(option, uiLanguage)}
                    </option>
                  ))}
                </select>
                </label>
              </div>
            {MANAGED_POLICY_SITES.map((site) => (
              <div className="surface__grid surface__grid--split" key={site}>
                <label className="surface__field">
                  <span>{getManagedPolicySiteLabel(site)} · {readExportLabel}</span>
                  <select
                    value={getSiteAuthorizationStatus(optionsDraft, site, 'layer1_read_export')}
                    onChange={(event) =>
                      setOptionsDraft((current) =>
                        updateSiteAuthorizationStatus(
                          current,
                          site,
                          'layer1_read_export',
                          event.target.value as ExtensionConfig['authorization']['rules'][number]['status'],
                        ),
                      )
                    }
                  >
                    {AUTHORIZATION_STATUS_OPTIONS.map((option) => (
                      <option key={`${site}-layer1-${option}`} value={option}>
                        {formatAuthorizationStatusLabel(option, uiLanguage)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="surface__field">
                  <span>{getManagedPolicySiteLabel(site)} · {aiAnalysisLabel}</span>
                  <select
                    value={getSiteAuthorizationStatus(optionsDraft, site, 'layer2_ai_read_analysis')}
                    onChange={(event) =>
                      setOptionsDraft((current) =>
                        updateSiteAuthorizationStatus(
                          current,
                          site,
                          'layer2_ai_read_analysis',
                          event.target.value as ExtensionConfig['authorization']['rules'][number]['status'],
                        ),
                      )
                    }
                  >
                    {AUTHORIZATION_STATUS_OPTIONS.map((option) => (
                      <option key={`${site}-layer2-${option}`} value={option}>
                        {formatAuthorizationStatusLabel(option, uiLanguage)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
              </div>
            </details>
          </div>
        </details>
      </article>

      <article className="surface__panel surface__panel--actions">
        <h2>{configurationActionsTitle}</h2>
        <p>{configurationActionsDescription}</p>
        <div className="surface__pill-row">
          <span className="surface__pill surface__pill--neutral">
            {uiLanguage === 'zh-CN' ? '保存当前桌面姿态' : 'Save current desk posture'}
          </span>
          <span className="surface__pill surface__pill--neutral">
            {uiLanguage === 'zh-CN' ? '刷新本地证明' : 'Refresh local proof'}
          </span>
          <span className="surface__pill surface__pill--neutral">
            {uiLanguage === 'zh-CN' ? '导出当前视图' : 'Export current view'}
          </span>
        </div>
        <div className="surface__actions surface__actions--wrap">
          <button className="surface__button" onClick={() => void onSaveOptions()}>
            {text.options.saveConfiguration}
          </button>
          <button
            className="surface__button surface__button--ghost"
            disabled={providerStatusPending}
            onClick={() => void onRefreshProviderStatus()}
          >
            {providerStatusPending ? text.options.refreshingBffStatus : text.options.refreshBffStatus}
          </button>
          <button className="surface__button surface__button--secondary" onClick={() => void onExport('current_view')}>
            {text.options.exportCurrentView}
          </button>
        </div>
        {optionsFeedback ? <p className="surface__feedback">{optionsFeedback}</p> : null}
      </article>
      </div>

      <details className="surface__advanced-settings" open={false}>
        <summary className="surface__advanced-settings-summary">
            <span>{uiLanguage === 'zh-CN' ? '连接工具' : 'Connection tools'}</span>
          <span className="surface__badge surface__badge--neutral">
            {uiLanguage === 'zh-CN' ? '4 组' : '4 groups'}
          </span>
        </summary>
        <div className="surface__advanced-settings-body">
          <details className="surface__advanced-settings surface__advanced-settings--supporting" open={false}>
            <summary className="surface__advanced-settings-summary">
              <span>{text.boundaryDisclosure.title}</span>
              <span className="surface__badge surface__badge--neutral">{text.boundaryDisclosure.bullets.length} notes</span>
            </summary>
            <div className="surface__advanced-settings-body">
              <ul className="surface__list">
                {text.boundaryDisclosure.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          </details>

          <details className="surface__advanced-settings surface__advanced-settings--supporting" open={false}>
            <summary className="surface__advanced-settings-summary">
              <span>{text.options.siteConfiguration}</span>
              <span className="surface__badge surface__badge--neutral">
                {edStemOverrideCount === 0
                  ? uiLanguage === 'zh-CN'
                    ? '0 个 override'
                    : '0 overrides'
                  : uiLanguage === 'zh-CN'
                    ? `${edStemOverrideCount} 个 override`
                    : `${edStemOverrideCount} overrides`}
              </span>
            </summary>
            <div className="surface__advanced-settings-body">
              <p className="surface__meta">{text.options.siteConfigurationDescription}</p>
              <label className="surface__field">
                <span>{text.options.threadsPath}</span>
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
                  placeholder={text.options.threadsPathPlaceholder}
                />
              </label>
              <label className="surface__field">
                <span>{text.options.unreadPath}</span>
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
                  placeholder={text.options.unreadPathPlaceholder}
                />
              </label>
              <label className="surface__field">
                <span>{text.options.recentActivityPath}</span>
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
                  placeholder={text.options.recentActivityPathPlaceholder}
                />
              </label>
            </div>
          </details>

          <details className="surface__advanced-settings" open={false}>
            <summary className="surface__advanced-settings-summary">
              <span>{text.options.advancedRuntimeSettings}</span>
              <span className="surface__badge surface__badge--neutral">{text.options.manualFallbackOnly}</span>
            </summary>
            <div className="surface__advanced-settings-body">
              <article className="surface__panel">
                <h2>{text.options.aiBffConfiguration}</h2>
                <p className="surface__meta">{text.options.advancedRuntimeDescription}</p>
                <label className="surface__field">
                  <span>{text.options.bffBaseUrl}</span>
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
                    placeholder={text.options.bffBaseUrlPlaceholder}
                  />
                </label>
                <label className="surface__field">
                  <span>{text.options.defaultProvider}</span>
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
                <details className="surface__advanced-settings surface__advanced-settings--supporting" open={false}>
                  <summary className="surface__advanced-settings-summary">
                    <span>{uiLanguage === 'zh-CN' ? '打开 provider / model overrides' : 'Open provider / model overrides'}</span>
                    <span className="surface__badge surface__badge--neutral">
                      {uiLanguage === 'zh-CN' ? `${PROVIDER_OPTIONS.length} 条路线` : `${PROVIDER_OPTIONS.length} providers`}
                    </span>
                  </summary>
                  <div className="surface__advanced-settings-body">
                    <div className="surface__stack">
                      {PROVIDER_OPTIONS.map((option) => (
                        <p className="surface__meta" key={option.value}>
                          {option.label} · {providerStatus.providers[option.value]?.ready ? text.meta.ready : text.meta.notReady} · {formatProviderReason(providerStatus.providers[option.value]?.reason, uiLanguage)}
                        </p>
                      ))}
                    </div>
                    <label className="surface__field">
                      <span>{text.options.openAiModel}</span>
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
                      <span>{text.options.geminiModel}</span>
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
                      <span>{text.options.switchyardModel}</span>
                      <input
                        value={optionsDraft.ai.models.switchyard}
                        onChange={(event) =>
                          setOptionsDraft((current) =>
                            buildNextConfig({
                              current,
                              ai: {
                                ...current.ai,
                                models: {
                                  ...current.ai.models,
                                  switchyard: event.target.value,
                                },
                              },
                            }),
                          )
                        }
                      />
                    </label>
                    <label className="surface__field">
                      <span>{text.options.switchyardRuntimeProvider}</span>
                      <select
                        value={optionsDraft.ai.switchyard.provider}
                        onChange={(event) =>
                          setOptionsDraft((current) =>
                            buildNextConfig({
                              current,
                              ai: {
                                ...current.ai,
                                switchyard: {
                                  ...current.ai.switchyard,
                                  provider: event.target.value as ExtensionConfig['ai']['switchyard']['provider'],
                                },
                              },
                            }),
                          )
                        }
                      >
                        <option value="chatgpt">ChatGPT</option>
                        <option value="gemini">Gemini</option>
                        <option value="claude">Claude</option>
                        <option value="grok">Grok</option>
                        <option value="qwen">Qwen</option>
                      </select>
                    </label>
                    <label className="surface__field">
                      <span>{text.options.switchyardLane}</span>
                      <select
                        value={optionsDraft.ai.switchyard.lane}
                        onChange={(event) =>
                          setOptionsDraft((current) =>
                            buildNextConfig({
                              current,
                              ai: {
                                ...current.ai,
                                switchyard: {
                                  ...current.ai.switchyard,
                                  lane: event.target.value as ExtensionConfig['ai']['switchyard']['lane'],
                                },
                              },
                            }),
                          )
                        }
                      >
                        <option value="web">web</option>
                        <option value="byok">byok</option>
                      </select>
                    </label>
                  </div>
                </details>
              </article>
            </div>
          </details>

          <details className="surface__advanced-settings" open={false}>
            <summary className="surface__advanced-settings-summary">
              <span>{uiLanguage === 'zh-CN' ? '导出默认值' : 'Export defaults'}</span>
              <span className="surface__badge surface__badge--neutral">{optionsDraft.defaultExportFormat.toUpperCase()}</span>
            </summary>
            <div className="surface__advanced-settings-body">
              <p className="surface__meta">
                {uiLanguage === 'zh-CN'
                  ? '默认导出格式放在这里，因为它是工作台偏好，不是第一屏的 trust blocker。'
                  : 'Default export format stays here because it is a workspace preference, not a first-screen trust blocker.'}
              </p>
              <label className="surface__field">
                <span>{text.options.defaultExportFormat}</span>
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
            </div>
          </details>
        </div>
      </details>
    </div>
  );
}

function confirmRequiredCount(optionsDraft: ExtensionConfig) {
  return optionsDraft.authorization.rules.filter((rule) => rule.status === 'confirm_required').length;
}

function allowedCount(optionsDraft: ExtensionConfig) {
  return optionsDraft.authorization.rules.filter((rule) => rule.status === 'allowed').length;
}
