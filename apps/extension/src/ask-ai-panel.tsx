import { browser } from 'wxt/browser';
import { AiStructuredAnswerSchema, type ProviderId } from '@campus-copilot/ai';
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
  aiQuestion: string;
  aiPending: boolean;
  aiAnswer?: string;
  aiStructuredAnswer?: unknown;
  aiError?: string;
  onProviderChange: (provider: ProviderId) => void;
  onModelChange: (value: string) => void;
  onQuestionChange: (value: string) => void;
  onAskAi: () => Promise<void>;
  onRefreshProviderStatus: () => Promise<void>;
}) {
  const {
    text,
    uiLanguage,
    config,
    providerStatus,
    providerStatusPending,
    aiProvider,
    aiModel,
    aiQuestion,
    aiPending,
    aiAnswer,
    aiStructuredAnswer,
    aiError,
    onProviderChange,
    onModelChange,
    onQuestionChange,
    onAskAi,
    onRefreshProviderStatus,
  } = props;
  const parsedStructuredAnswer = AiStructuredAnswerSchema.safeParse(aiStructuredAnswer);

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
      <div className="surface__stack">
        {PROVIDER_OPTIONS.map((option) => (
          <p className="surface__meta" key={option.value}>
            {option.label} · {providerStatus.providers[option.value]?.ready ? text.meta.ready : text.meta.notReady} · {formatProviderReason(providerStatus.providers[option.value]?.reason, uiLanguage)}
          </p>
        ))}
        <p className="surface__meta">
          {text.meta.lastChecked}: {formatRelativeTime(uiLanguage, providerStatus.checkedAt)}
          {providerStatus.error ? ` · ${formatProviderStatusError(providerStatus.error, uiLanguage)}` : ''}
        </p>
      </div>
      <div className="surface__actions">
        <button className="surface__button surface__button--ghost" disabled={providerStatusPending} onClick={() => void onRefreshProviderStatus()}>
          {providerStatusPending ? text.askAi.refreshingProviderStatus : text.askAi.refreshProviderStatus}
        </button>
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
      <div className="surface__actions surface__actions--wrap">
        <button className="surface__button" disabled={aiPending} onClick={() => void onAskAi()}>
          {aiPending ? `${text.askAi.ask}…` : text.askAi.ask}
        </button>
        <button className="surface__button surface__button--ghost" onClick={() => void browser.runtime.openOptionsPage()}>
          {text.askAi.configure}
        </button>
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
