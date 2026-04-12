import {
  AiStructuredAnswerSchema,
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
import { getAcademicAiCallerGuardrails } from './academic-safety-guards';
import { formatProviderReason, formatProviderStatusError, type ProviderStatusLike } from './diagnostics';
import { summarizeAuthorizationState } from './export-input';
import { formatRelativeTime, type ResolvedUiLanguage } from './i18n';
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
  const [readExportSummary, aiReadSummary] = summarizeAuthorizationState(config.authorization);
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
      label: text.askAi.structuredInputLabels.currentView,
      value: structuredInputSummary.currentViewFormat.toUpperCase(),
    },
  ];

  return (
    <article className="surface__panel">
      <div className="surface__section-head">
        <div>
          <h2>{text.askAi.title}</h2>
          <p>{text.askAi.description}</p>
        </div>
        <span className={`surface__badge surface__badge--${selectedProviderReady ? 'success' : 'danger'}`}>
          {selectedProviderReady ? text.meta.ready : text.meta.notReady}
        </span>
      </div>

      <div className="surface__ask-ai-flow">
        <article className="surface__callout surface__callout--danger">
          <div className="surface__section-head">
            <div>
              <h3>{text.askAi.guardrailsTitle}</h3>
              <p className="surface__item-lead">{text.askAi.whatAiCannotDo}</p>
              <p className="surface__meta">{text.askAi.redZoneDescription}</p>
            </div>
            <span className="surface__badge surface__badge--danger">{text.askAi.manualOnlyBadge}</span>
          </div>
          <article className="surface__status-card surface__status-card--danger">
            <div className="surface__item-header">
              <strong>{redZoneHardStop.title}</strong>
              <span className="surface__badge surface__badge--danger">{text.askAi.manualOnlyBadge}</span>
            </div>
            <p className="surface__meta">{aiGuardrails.redZone.summary}</p>
            <button
              className="surface__button surface__button--ghost"
              type="button"
              disabled={redZoneHardStop.ctaDisabled}
            >
              {redZoneHardStop.actionLabel}
            </button>
            <p className="surface__meta">{redZoneHardStop.manualOnlyNote}</p>
          </article>
        </article>

        <div className="surface__composer surface__composer--primary">
          <div className="surface__question-card surface__question-card--primary">
            <h3>{text.askAi.questionBox}</h3>
            <label className="surface__field">
              <span>{text.askAi.question}</span>
              <textarea
                rows={4}
                value={aiQuestion}
                onChange={(event) => onQuestionChange(event.target.value)}
                placeholder={text.askAi.placeholder}
              />
            </label>
            <div className="surface__actions surface__actions--wrap surface__actions--tight">
              <button className="surface__button" disabled={aiPending} onClick={() => void onAskAi()} type="button">
                {aiPending ? `${text.askAi.ask}…` : text.askAi.ask}
              </button>
            </div>
          </div>
          <div className="surface__group surface__group--supporting">
            <h3>{text.askAi.suggestedPrompts}</h3>
            <div className="surface__actions surface__actions--wrap">
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
        </div>

        <div className="surface__group">
          <div className="surface__section-head">
            <div>
              <h3>{text.askAi.whatAiCanSee}</h3>
              <p className="surface__meta">{text.askAi.structuredInputsDescription}</p>
            </div>
          </div>
          <div className="surface__evidence-grid">
            {structuredInputs.map((item) => (
              <article className="surface__evidence-card" key={item.label}>
                <p className="surface__meta-label">{item.label}</p>
                <p className="surface__item-lead">{item.value}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="surface__group">
          <div className="surface__section-head">
            <div>
              <h3>Policy review</h3>
              <p className="surface__meta">The AI lane stays downstream from the shared export/auth skeleton, not a separate shadow rulebook.</p>
            </div>
          </div>
          <div className="surface__evidence-grid">
            <article className="surface__evidence-card">
              <p className="surface__meta-label">Layer 1 read/export</p>
              <p className="surface__item-lead">
                {readExportSummary.allowed} allowed · {readExportSummary.partial} partial
              </p>
              <p className="surface__meta">
                {readExportSummary.confirmRequired} confirm-required · {readExportSummary.blocked} blocked · {readExportSummary.total} total rules
              </p>
            </article>
            <article className="surface__evidence-card">
              <p className="surface__meta-label">Layer 2 AI read</p>
              <p className="surface__item-lead">
                {aiReadSummary.allowed} allowed · {aiReadSummary.confirmRequired} confirm-required
              </p>
              <p className="surface__meta">
                {aiReadSummary.partial} partial · {aiReadSummary.blocked} blocked · {aiReadSummary.total} total rules
              </p>
            </article>
            <article className="surface__evidence-card">
              <p className="surface__meta-label">Request gate</p>
              <p className="surface__item-lead">Current view export: {structuredInputSummary.currentViewFormat.toUpperCase()}</p>
              <p className="surface__meta">
                Ask AI still re-checks the current view packaging before anything leaves the extension.
              </p>
            </article>
          </div>
        </div>

        <aside aria-live="polite" className="surface__status-intro surface__status-intro--compact surface__status-intro--supporting">
          <div className="surface__item-header">
            <div className="surface__status-intro-copy">
              <p className="surface__meta-label">{text.askAi.runtimeSummary}</p>
              <p className="surface__meta">
                {selectedProviderLabel} · {selectedProviderReady ? text.meta.ready : text.meta.notReady} ·{' '}
                {formatProviderReason(selectedProviderStatus?.reason, uiLanguage)} · {text.meta.lastChecked}:{' '}
                {formatRelativeTime(uiLanguage, providerStatus.checkedAt)}
                {providerStatus.error ? ` · ${formatProviderStatusError(providerStatus.error, uiLanguage)}` : ''}
              </p>
            </div>
            <span className="surface__badge surface__badge--neutral">{selectedProviderLabel}</span>
          </div>
        </aside>

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
          <span>{text.askAi.advancedRuntimeSettings}</span>
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
            {onOpenConfiguration ? (
              <button className="surface__button surface__button--secondary" onClick={() => onOpenConfiguration()}>
                {text.askAi.configure}
              </button>
            ) : null}
          </div>
        </div>
      </details>
      {!activeBffBaseUrl ? <p aria-live="polite" className="surface__feedback">{text.askAi.missingBffFeedback}</p> : null}
      {aiNotice ? <p aria-live="polite" className="surface__feedback">{aiNotice}</p> : null}
      {aiError ? <p aria-live="polite" className="surface__feedback surface__feedback--error">{aiError}</p> : null}
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
    </article>
  );
}
