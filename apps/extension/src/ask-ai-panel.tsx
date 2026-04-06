import {
  AiStructuredAnswerSchema,
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
import { formatProviderReason, formatProviderStatusError, type ProviderStatusLike } from './diagnostics';
import { formatRelativeTime, type ResolvedUiLanguage } from './i18n';
import { PROVIDER_OPTIONS } from './surface-shell-model';
import { type UiText } from './surface-shell-view-helpers';
import type { ExtensionConfig } from './config';

export function AskAiPanel(props: {
  text: UiText;
  uiLanguage: ResolvedUiLanguage;
  config: ExtensionConfig;
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
  aiError?: string;
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
  onAskAi: () => Promise<void>;
  onRefreshProviderStatus: () => Promise<void>;
  onOpenConfiguration?: () => void;
}) {
  const {
    text,
    uiLanguage,
    config,
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
    aiError,
    structuredInputSummary,
    onProviderChange,
    onModelChange,
    onSwitchyardProviderChange,
    onSwitchyardLaneChange,
    onQuestionChange,
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
  const structuredInputs = [
    `${text.askAi.structuredInputLabels.todaySnapshot} · ${text.metrics.openAssignments} ${structuredInputSummary.totalAssignments} · ${text.metrics.dueWithin48Hours} ${structuredInputSummary.dueSoonAssignments} · ${text.metrics.newGrades} ${structuredInputSummary.newGrades}`,
    `${text.askAi.structuredInputLabels.recentUpdates} · ${structuredInputSummary.recentUpdatesCount}`,
    `${text.askAi.structuredInputLabels.priorityAlerts} · ${structuredInputSummary.priorityAlertsCount}`,
    `${text.askAi.structuredInputLabels.focusQueue} · ${structuredInputSummary.focusQueueCount}`,
    `${text.askAi.structuredInputLabels.weeklyLoad} · ${structuredInputSummary.weeklyLoadCount}`,
    `${text.askAi.structuredInputLabels.changeJournal} · ${structuredInputSummary.changeJournalCount}`,
    `${text.askAi.structuredInputLabels.currentView} · ${structuredInputSummary.currentViewFormat.toUpperCase()}`,
  ];

  return (
    <article className="surface__panel">
      <h2>{text.askAi.title}</h2>
      <p>{text.askAi.description}</p>
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
            <select value={switchyardLane} onChange={(event) => onSwitchyardLaneChange(event.target.value as SwitchyardLane)}>
              <option value="web">web</option>
              <option value="byok">byok</option>
            </select>
          </label>
        </div>
      ) : null}
      <div className="surface__stack">
        <div className="surface__status-intro">
          <div>
            <p className="surface__meta-label">{text.meta.currentStatus}</p>
            <p className="surface__item-lead">
              {selectedProviderLabel} · {selectedProviderReady ? text.meta.ready : text.meta.notReady}
            </p>
            <p className="surface__meta">
              {formatProviderReason(selectedProviderStatus?.reason, uiLanguage)} · {text.meta.lastChecked}:{' '}
              {formatRelativeTime(uiLanguage, providerStatus.checkedAt)}
              {providerStatus.error ? ` · ${formatProviderStatusError(providerStatus.error, uiLanguage)}` : ''}
            </p>
          </div>
          <span className={`surface__badge surface__badge--${selectedProviderReady ? 'success' : 'danger'}`}>
            {selectedProviderReady ? text.meta.ready : text.meta.notReady}
          </span>
        </div>
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
      </div>
      <div className="surface__actions">
        <button className="surface__button surface__button--ghost" disabled={providerStatusPending} onClick={() => void onRefreshProviderStatus()}>
          {providerStatusPending ? text.askAi.refreshingProviderStatus : text.askAi.refreshProviderStatus}
        </button>
      </div>
      <div className="surface__group">
        <h3>{text.askAi.structuredInputs}</h3>
        <p className="surface__meta">{text.askAi.structuredInputsDescription}</p>
        <ul className="surface__list">
          {structuredInputs.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <label className="surface__field">
        <span>{text.askAi.question}</span>
        <textarea
          rows={4}
          value={aiQuestion}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder={text.askAi.placeholder}
        />
      </label>
      <div className="surface__group">
        <h3>{text.askAi.suggestedPrompts}</h3>
        <div className="surface__actions surface__actions--wrap">
          {Object.values(text.askAi.suggestions).map((suggestion) => (
            <button
              key={suggestion}
              className="surface__button surface__button--ghost"
              onClick={() => onQuestionChange(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
      <div className="surface__actions surface__actions--wrap">
        <button className="surface__button" disabled={aiPending} onClick={() => void onAskAi()}>
          {aiPending ? `${text.askAi.ask}…` : text.askAi.ask}
        </button>
        {onOpenConfiguration ? (
          <button className="surface__button surface__button--ghost" onClick={() => onOpenConfiguration()}>
            {text.askAi.configure}
          </button>
        ) : null}
      </div>
      {!config.ai.bffBaseUrl ? <p className="surface__feedback">{text.askAi.missingBffFeedback}</p> : null}
      {aiError ? <p className="surface__feedback surface__feedback--error">{aiError}</p> : null}
      {parsedStructuredAnswer.success ? (
        <div className="surface__answer">
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
          {parsedStructuredAnswer.data.citations.length ? (
            <div className="surface__group">
              <h3>{text.askAi.citations}</h3>
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
        </div>
      ) : aiAnswer ? <div className="surface__answer">{aiAnswer}</div> : null}
    </article>
  );
}
