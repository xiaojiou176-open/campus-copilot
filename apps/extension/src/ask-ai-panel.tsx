import {
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
import { getAcademicAiCallerGuardrails } from './academic-safety-guards';
import { AiStructuredAnswerSchema } from './ai-answer-resolution';
import { getAiSitePolicyOverlay } from './ai-site-policy';
import { formatProviderReason, type ProviderStatusLike } from './provider-status-format';
import { summarizeAuthorizationState } from './export-input';
import { formatAuthorizationStatusLabel, type ResolvedUiLanguage } from './i18n';
import { PROVIDER_OPTIONS } from './surface-shell-model';
import { type UiText } from './surface-shell-view-helpers';
import type { ExtensionConfig } from './config';

export function AskAiPanel(props: {
  text: UiText;
  uiLanguage: ResolvedUiLanguage;
  config: ExtensionConfig;
  activeBffBaseUrl?: string;
  providerStatus: ProviderStatusLike;
  providerStatusPending: boolean;
  aiProvider: ProviderId;
  aiModel: string;
  switchyardProvider: SwitchyardRuntimeProvider;
  switchyardLane: SwitchyardLane;
  aiQuestion: string;
  aiPending: boolean;
  aiAnswer?: string;
  aiStructuredAnswer?: unknown;
  aiNotice?: string;
  aiError?: string;
  currentPolicySite?: string;
  availableCourses: Array<{ id: string; label: string }>;
  advancedMaterialEnabled: boolean;
  advancedMaterialCourseId: string;
  advancedMaterialExcerpt: string;
  advancedMaterialAcknowledged: boolean;
  structuredInputSummary: {
    totalAssignments: number;
    dueSoonAssignments: number;
    newGrades: number;
    recentUpdatesCount: number;
    priorityAlertsCount: number;
    focusQueueCount: number;
    weeklyLoadCount: number;
    changeJournalCount: number;
    courseClusterCount: number;
    workItemClusterCount: number;
    administrativeSummaryCount: number;
    currentViewFormat: string;
  };
  onProviderChange: (provider: ProviderId) => void;
  onModelChange: (value: string) => void;
  onSwitchyardProviderChange: (value: SwitchyardRuntimeProvider) => void;
  onSwitchyardLaneChange: (value: SwitchyardLane) => void;
  onQuestionChange: (value: string) => void;
  onAdvancedMaterialEnabledChange: (value: boolean) => void;
  onAdvancedMaterialCourseChange: (value: string) => void;
  onAdvancedMaterialExcerptChange: (value: string) => void;
  onAdvancedMaterialAcknowledgedChange: (value: boolean) => void;
  onAskAi: () => Promise<void>;
  onRefreshProviderStatus: () => Promise<void>;
  onOpenConfiguration?: () => void;
}) {
  const {
    text,
    uiLanguage,
    config,
    activeBffBaseUrl,
    providerStatus,
    providerStatusPending,
    aiProvider,
    aiModel,
    switchyardProvider,
    switchyardLane,
    aiQuestion,
    aiPending,
    aiAnswer,
    aiStructuredAnswer,
    aiNotice,
    aiError,
    currentPolicySite,
    availableCourses,
    advancedMaterialEnabled,
    advancedMaterialCourseId,
    advancedMaterialExcerpt,
    advancedMaterialAcknowledged,
    structuredInputSummary,
    onProviderChange,
    onModelChange,
    onSwitchyardProviderChange,
    onSwitchyardLaneChange,
    onQuestionChange,
    onAdvancedMaterialEnabledChange,
    onAdvancedMaterialCourseChange,
    onAdvancedMaterialExcerptChange,
    onAdvancedMaterialAcknowledgedChange,
    onAskAi,
    onRefreshProviderStatus,
    onOpenConfiguration,
  } = props;
  const parsedStructuredAnswer = AiStructuredAnswerSchema.safeParse(aiStructuredAnswer);
  const selectedProviderLabel = PROVIDER_OPTIONS.find((option) => option.value === aiProvider)?.label ?? aiProvider;
  const selectedProviderStatus = providerStatus.providers[aiProvider];
  const selectedProviderReady = Boolean(selectedProviderStatus?.ready);
  const providerCards = PROVIDER_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value,
    ready: Boolean(providerStatus.providers[option.value]?.ready),
    reason: formatProviderReason(providerStatus.providers[option.value]?.reason, uiLanguage),
  }));
  const aiGuardrails = getAcademicAiCallerGuardrails();
  const redZoneHardStop = aiGuardrails.redZone.primaryHardStop;
  const advancedMaterialGuard = aiGuardrails.advancedMaterial;
  const currentPolicyOverlay = getAiSitePolicyOverlay(currentPolicySite);
  const [readExportSummary, aiReadSummary] = summarizeAuthorizationState(config.authorization);
  const selectedProviderReason = formatProviderReason(selectedProviderStatus?.reason, uiLanguage);
  const structuredInputs = [
    {
      label: text.askAi.structuredInputLabels.todaySnapshot,
      value: `${text.metrics.openAssignments} ${structuredInputSummary.totalAssignments} · ${text.metrics.dueWithin48Hours} ${structuredInputSummary.dueSoonAssignments} · ${text.metrics.newGrades} ${structuredInputSummary.newGrades}`,
    },
    {
      label: text.askAi.structuredInputLabels.recentUpdates,
      value: `${structuredInputSummary.recentUpdatesCount}`,
    },
    {
      label: text.askAi.structuredInputLabels.priorityAlerts,
      value: `${structuredInputSummary.priorityAlertsCount}`,
    },
    {
      label: text.askAi.structuredInputLabels.focusQueue,
      value: `${structuredInputSummary.focusQueueCount}`,
    },
    {
      label: text.askAi.structuredInputLabels.weeklyLoad,
      value: `${structuredInputSummary.weeklyLoadCount}`,
    },
    {
      label: text.askAi.structuredInputLabels.changeJournal,
      value: `${structuredInputSummary.changeJournalCount}`,
    },
    {
      label: 'Course clusters',
      value: `${structuredInputSummary.courseClusterCount}`,
    },
    {
      label: 'Work-item clusters',
      value: `${structuredInputSummary.workItemClusterCount}`,
    },
    {
      label: 'Administrative summaries',
      value: `${structuredInputSummary.administrativeSummaryCount}`,
    },
    {
      label: text.askAi.structuredInputLabels.currentView,
      value: structuredInputSummary.currentViewFormat.toUpperCase(),
    },
  ];
  const evidenceFirstLabel = uiLanguage === 'zh-CN' ? '先核对这张桌面的证据' : 'Check this desk first';
  const routeSummaryLabel = uiLanguage === 'zh-CN' ? 'AI 路线' : 'AI route';
  const evidenceSummary = structuredInputs[0].value;
  const evidenceMeta = `${structuredInputs[3].label} ${structuredInputs[3].value} · ${structuredInputs[9].label} ${structuredInputs[9].value}`;
  const routeStatusSummary = `${selectedProviderLabel} · ${selectedProviderReady ? text.meta.ready : text.meta.notReady}`;
  const policyReviewLabel = uiLanguage === 'zh-CN' ? '先核对这张桌面的证据' : 'Check the evidence first';
  const structuredLedgerLabel = uiLanguage === 'zh-CN' ? '这张桌面的输入' : 'Inputs on this desk';
  const currentSiteRulesLabel = uiLanguage === 'zh-CN' ? '当前站点规则' : 'Current site rules';
  const readAndExportLabel = uiLanguage === 'zh-CN' ? '读取与导出' : 'Read and export';
  const aiAccessLabel = uiLanguage === 'zh-CN' ? 'AI 可见性' : 'AI access';
  const currentQuestionLabel = uiLanguage === 'zh-CN' ? '当前提问门槛' : 'Current question';
  const aiSettingsLabel = uiLanguage === 'zh-CN' ? 'AI 设置与额外选项' : 'AI settings and opt-ins';
  const suggestedPromptsLabel = uiLanguage === 'zh-CN' ? '建议问题' : 'Suggested prompts';
  const totalChecksLabel = uiLanguage === 'zh-CN' ? '项检查' : 'total checks';

  return (
    <article className="surface__panel surface__panel--ask-ai">
      <div className="surface__section-head">
        <div>
          <h2>{text.askAi.title}</h2>
        </div>
      </div>

      <div className="surface__ask-ai-flow surface__ask-ai-flow--compact">
        <div className="surface__ask-ai-sidebar surface__ask-ai-sidebar--supporting">
          <aside aria-live="polite" className="surface__status-intro surface__status-intro--compact surface__status-intro--supporting">
            <div className="surface__item-header">
              <div className="surface__status-intro-copy">
                <p className="surface__meta-label">{evidenceFirstLabel}</p>
                <p className="surface__item-lead">{evidenceSummary}</p>
                <p className="surface__meta">{evidenceMeta}</p>
                <p className="surface__meta">
                  {routeSummaryLabel}: {routeStatusSummary} · {selectedProviderReason}
                </p>
              </div>
              <span className="surface__badge surface__badge--neutral">
                {structuredInputs.length} items
              </span>
            </div>
          </aside>

          <details className="surface__advanced-settings surface__advanced-settings--supporting">
            <summary className="surface__advanced-settings-summary">
              <span>{policyReviewLabel}</span>
              <span className="surface__badge surface__badge--neutral">{structuredInputs.length} items</span>
            </summary>
            <div className="surface__advanced-settings-body">
              <article className="surface__status-card surface__status-card--success">
                <div className="surface__item-header">
                  <h3>{text.askAi.whatAiCanSee}</h3>
                  <span className="surface__badge surface__badge--success">{text.meta.ready}</span>
                </div>
                <div className="surface__evidence-grid surface__evidence-grid--compact">
                  <article className="surface__evidence-card" key={structuredInputs[0].label}>
                    <p className="surface__meta-label">{structuredInputs[0].label}</p>
                    <p className="surface__item-lead">{structuredInputs[0].value}</p>
                  </article>
                  <article className="surface__evidence-card" key={structuredInputs[3].label}>
                    <p className="surface__meta-label">{structuredInputs[3].label}</p>
                    <p className="surface__item-lead">{structuredInputs[3].value}</p>
                  </article>
                  <article className="surface__evidence-card" key={structuredInputs[9].label}>
                    <p className="surface__meta-label">{structuredInputs[9].label}</p>
                    <p className="surface__item-lead">{structuredInputs[9].value}</p>
                  </article>
                </div>
                <p className="surface__meta">
                  {routeSummaryLabel}: {routeStatusSummary} · {selectedProviderReason}
                </p>
              </article>

              <article className="surface__status-card surface__status-card--warning">
                <div className="surface__item-header">
                  <h3>{text.askAi.guardrailsTitle}</h3>
                  <span className="surface__badge surface__badge--danger">{text.askAi.manualOnlyBadge}</span>
                </div>
                <p className="surface__item-lead">{text.askAi.whatAiCannotDo}</p>
                <p className="surface__meta">{text.askAi.redZoneDescription}</p>
                <p className="surface__meta">{aiGuardrails.redZone.summary}</p>
                <p className="surface__meta">{redZoneHardStop.manualOnlyNote}</p>
              </article>

              {currentPolicyOverlay ? (
                <article className="surface__status-card">
                  <div className="surface__item-header">
                    <h3>{currentSiteRulesLabel}</h3>
                    <span className="surface__badge surface__badge--neutral">{currentPolicyOverlay.siteLabel}</span>
                  </div>
                  <p className="surface__item-lead">
                    Allowed structured families: {currentPolicyOverlay.allowedFamilies.join(', ')}
                  </p>
                  <p className="surface__meta">
                    Export-first only: {currentPolicyOverlay.exportOnlyFamilies.join(', ') || 'none'}.
                  </p>
                  <p className="surface__meta">
                    Forbidden AI objects: {currentPolicyOverlay.forbiddenAiObjects.join(', ')}.
                  </p>
                </article>
              ) : null}
            </div>
          </details>
        </div>

        <div className="surface__ask-ai-shell">
          <div className="surface__question-card surface__question-card--primary">
            <div className="surface__section-head">
              <div>
                <h3>{text.askAi.questionBox}</h3>
              </div>
              <span className="surface__badge surface__badge--neutral">{selectedProviderLabel}</span>
            </div>
            <label className="surface__field">
              <span>{text.askAi.question}</span>
              <textarea
                rows={3}
                value={aiQuestion}
                onChange={(event) => onQuestionChange(event.target.value)}
                placeholder={text.askAi.placeholder}
              />
            </label>
            <div className="surface__actions surface__actions--wrap surface__actions--tight">
              <button className="surface__button" disabled={aiPending} onClick={() => void onAskAi()} type="button">
                {aiPending ? `${text.askAi.ask}…` : text.askAi.ask}
              </button>
              {onOpenConfiguration ? (
                <button className="surface__button surface__button--ghost" onClick={() => onOpenConfiguration()} type="button">
                  {text.askAi.configure}
                </button>
              ) : null}
            </div>
            <details className="surface__advanced-settings">
              <summary className="surface__advanced-settings-summary">
                <span>{suggestedPromptsLabel}</span>
                <span className="surface__badge surface__badge--neutral">{Object.values(text.askAi.suggestions).length}</span>
              </summary>
              <div className="surface__advanced-settings-body">
                <div className="surface__suggestion-strip" aria-label={text.askAi.suggestedPrompts}>
                  {Object.values(text.askAi.suggestions).map((suggestion) => (
                    <button
                      key={suggestion}
                      className="surface__button surface__button--ghost"
                      onClick={() => onQuestionChange(suggestion)}
                      type="button"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </details>

            {parsedStructuredAnswer.success ? (
              <div aria-live="polite" className="surface__answer">
                {parsedStructuredAnswer.data.citations.length ? (
                  <div className="surface__group">
                    <div className="surface__item-header">
                      <h3>{text.askAi.answerWithCitations}</h3>
                      <span className="surface__badge surface__badge--success">{text.askAi.citations}</span>
                    </div>
                    <ul className="surface__list">
                      {parsedStructuredAnswer.data.citations.map((citation) => (
                        <li key={`${citation.entityId}:${citation.title}`}>
                          {citation.url ? (
                            <a href={citation.url} target="_blank" rel="noreferrer">
                              {citation.title}
                            </a>
                          ) : (
                            citation.title
                          )}{' '}
                          · {citation.site} · {citation.kind}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p>{parsedStructuredAnswer.data.summary}</p>
                {parsedStructuredAnswer.data.bullets.length ? (
                  <div className="surface__group">
                    <h3>{text.askAi.keyPoints}</h3>
                    <ul className="surface__list">
                      {parsedStructuredAnswer.data.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {parsedStructuredAnswer.data.nextActions.length ? (
                  <div className="surface__group">
                    <h3>{text.askAi.nextActions}</h3>
                    <ul className="surface__list">
                      {parsedStructuredAnswer.data.nextActions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {parsedStructuredAnswer.data.trustGaps.length ? (
                  <div className="surface__group">
                    <h3>{text.askAi.trustGaps}</h3>
                    <ul className="surface__list">
                      {parsedStructuredAnswer.data.trustGaps.map((gap) => (
                        <li key={gap}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : aiAnswer ? (
              <div aria-live="polite" className="surface__answer">
                <div className="surface__item-header">
                  <h3>{text.askAi.answerWithCitations}</h3>
                  <span className="surface__badge surface__badge--warning">{text.askAi.uncitedAnswerWarning}</span>
                </div>
                <p>{aiAnswer}</p>
              </div>
            ) : null}
          </div>
        </div>

        <details className="surface__advanced-settings">
          <summary className="surface__advanced-settings-summary">
            <span>{structuredLedgerLabel}</span>
            <span className="surface__badge surface__badge--neutral">{structuredInputs.length} items</span>
          </summary>
          <div className="surface__advanced-settings-body">
            <div className="surface__evidence-grid">
              {structuredInputs.map((item) => (
                <article className="surface__evidence-card" key={item.label}>
                  <p className="surface__meta-label">{item.label}</p>
                  <p className="surface__item-lead">{item.value}</p>
                </article>
              ))}
            </div>
            <div className="surface__evidence-grid">
              <article className="surface__evidence-card">
                <p className="surface__meta-label">{readAndExportLabel}</p>
                <p className="surface__item-lead">
                  {readExportSummary.allowed} {formatAuthorizationStatusLabel('allowed', uiLanguage)} ·{' '}
                  {readExportSummary.partial} {formatAuthorizationStatusLabel('partial', uiLanguage)}
                </p>
                <p className="surface__meta">
                  {readExportSummary.confirmRequired} {formatAuthorizationStatusLabel('confirm_required', uiLanguage)} ·{' '}
                  {readExportSummary.blocked} {formatAuthorizationStatusLabel('blocked', uiLanguage)} · {readExportSummary.total}{' '}
                  {totalChecksLabel}
                </p>
              </article>
              <article className="surface__evidence-card">
                <p className="surface__meta-label">{aiAccessLabel}</p>
                <p className="surface__item-lead">
                  {aiReadSummary.allowed} {formatAuthorizationStatusLabel('allowed', uiLanguage)} ·{' '}
                  {aiReadSummary.confirmRequired} {formatAuthorizationStatusLabel('confirm_required', uiLanguage)}
                </p>
                <p className="surface__meta">
                  {aiReadSummary.partial} {formatAuthorizationStatusLabel('partial', uiLanguage)} ·{' '}
                  {aiReadSummary.blocked} {formatAuthorizationStatusLabel('blocked', uiLanguage)} · {aiReadSummary.total}{' '}
                  {totalChecksLabel}
                </p>
              </article>
              <article className="surface__evidence-card">
                <p className="surface__meta-label">{currentQuestionLabel}</p>
                <p className="surface__item-lead">
                  {uiLanguage === 'zh-CN' ? '当前桌面格式' : 'Current desk format'}: {structuredInputSummary.currentViewFormat.toUpperCase()}
                </p>
                <p className="surface__meta">
                  {uiLanguage === 'zh-CN'
                    ? 'Ask AI 在任何内容离开扩展前，仍会再次检查这张桌面的边界。'
                    : 'Ask AI still checks this desk before anything leaves the extension.'}
                </p>
              </article>
            </div>
          </div>
        </details>

        <details className="surface__advanced-settings" open={advancedMaterialEnabled}>
          <summary className="surface__advanced-settings-summary">
            <span>{text.askAi.advancedMaterialTitle}</span>
            <span className={`surface__badge surface__badge--${advancedMaterialEnabled ? 'warning' : 'danger'}`}>
              {advancedMaterialEnabled ? text.askAi.manualOnlyBadge : text.askAi.defaultDisabledBadge}
            </span>
          </summary>
          <div className="surface__advanced-settings-body">
            <p className="surface__item-lead">{text.askAi.advancedMaterialDescription}</p>
            <p className="surface__meta">{text.askAi.advancedMaterialOptInSummary}</p>
            <label className="surface__field surface__field--inline">
              <span>{text.askAi.advancedMaterialEnableLabel}</span>
              <input
                type="checkbox"
                checked={advancedMaterialEnabled}
                onChange={(event) => onAdvancedMaterialEnabledChange(event.target.checked)}
              />
            </label>
            {advancedMaterialEnabled ? (
              <div className="surface__stack">
                <label className="surface__field">
                  <span>{text.askAi.advancedMaterialCourseLabel}</span>
                  <select
                    value={advancedMaterialCourseId}
                    onChange={(event) => onAdvancedMaterialCourseChange(event.target.value)}
                  >
                    <option value="">{text.askAi.advancedMaterialCoursePlaceholder}</option>
                    {availableCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="surface__field">
                  <span>{text.askAi.advancedMaterialExcerptLabel}</span>
                  <textarea
                    rows={5}
                    value={advancedMaterialExcerpt}
                    onChange={(event) => onAdvancedMaterialExcerptChange(event.target.value)}
                    placeholder={text.askAi.advancedMaterialExcerptPlaceholder}
                  />
                </label>
                <label className="surface__field surface__field--inline">
                  <span>{text.askAi.advancedMaterialAcknowledgement}</span>
                  <input
                    type="checkbox"
                    checked={advancedMaterialAcknowledged}
                    onChange={(event) => onAdvancedMaterialAcknowledgedChange(event.target.checked)}
                  />
                </label>
              </div>
            ) : null}
            <p className="surface__meta">
              {advancedMaterialEnabled ? advancedMaterialGuard.requirements.join(' · ') : advancedMaterialGuard.note}
            </p>
          </div>
        </details>
      </div>

      <details className="surface__advanced-settings">
          <summary className="surface__advanced-settings-summary">
            <span>{aiSettingsLabel}</span>
            <span className="surface__badge surface__badge--neutral">{selectedProviderLabel}</span>
          </summary>
        <div className="surface__advanced-settings-body">
          <p className="surface__meta">{text.askAi.advancedRuntimeDescription}</p>
          <div className="surface__grid surface__grid--split">
            <label className="surface__field">
              <span>{text.askAi.provider}</span>
              <select value={aiProvider} onChange={(event) => onProviderChange(event.target.value as ProviderId)}>
                {PROVIDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="surface__field">
              <span>{text.askAi.model}</span>
              <input value={aiModel} onChange={(event) => onModelChange(event.target.value)} />
            </label>
          </div>
          {aiProvider === 'switchyard' ? (
            <div className="surface__grid surface__grid--split">
              <label className="surface__field">
                <span>{text.options.switchyardRuntimeProvider}</span>
                <select
                  value={switchyardProvider}
                  onChange={(event) => onSwitchyardProviderChange(event.target.value as SwitchyardRuntimeProvider)}
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
                  value={switchyardLane}
                  onChange={(event) => onSwitchyardLaneChange(event.target.value as SwitchyardLane)}
                >
                  <option value="web">web</option>
                  <option value="byok">byok</option>
                </select>
              </label>
            </div>
          ) : null}
          <div className="surface__status-grid">
            {providerCards.map((providerCard) => (
              <article
                className={`surface__status-card surface__status-card--${providerCard.ready ? 'success' : 'danger'}`}
                key={providerCard.value}
              >
                <div className="surface__item-header">
                  <strong>{providerCard.label}</strong>
                  <span className={`surface__badge surface__badge--${providerCard.ready ? 'success' : 'danger'}`}>
                    {providerCard.ready ? text.meta.ready : text.meta.notReady}
                  </span>
                </div>
                <p className="surface__meta">{providerCard.reason}</p>
              </article>
            ))}
          </div>
          <div className="surface__actions surface__actions--wrap">
            <button
              className="surface__button surface__button--ghost"
              disabled={providerStatusPending}
              onClick={() => void onRefreshProviderStatus()}
            >
              {providerStatusPending ? text.askAi.refreshingProviderStatus : text.askAi.refreshProviderStatus}
            </button>
          </div>
        </div>
      </details>
      {!activeBffBaseUrl ? <p aria-live="polite" className="surface__feedback">{text.askAi.missingBffFeedback}</p> : null}
      {aiNotice ? <p aria-live="polite" className="surface__feedback">{aiNotice}</p> : null}
      {aiError ? <p aria-live="polite" className="surface__feedback surface__feedback--error">{aiError}</p> : null}
    </article>
  );
}
