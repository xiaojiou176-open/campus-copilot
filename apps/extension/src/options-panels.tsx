import type { Dispatch, SetStateAction } from 'react';
import type { ProviderId } from '@campus-copilot/ai';
import type { ExportFormat, ExportPreset } from '@campus-copilot/exporter';
import { buildNextConfig, type ExtensionConfig } from './config';
import { formatProviderReason, formatProviderStatusError, type ProviderStatusLike } from './diagnostics';
import { formatRelativeTime, type ResolvedUiLanguage } from './i18n';
import { EXPORT_FORMAT_OPTIONS, PROVIDER_OPTIONS } from './surface-shell-model';
import { type UiText } from './surface-shell-view-helpers';

export function OptionsPanels(props: {
  text: UiText;
  uiLanguage: ResolvedUiLanguage;
  optionsDraft: ExtensionConfig;
  setOptionsDraft: Dispatch<SetStateAction<ExtensionConfig>>;
  providerStatus: ProviderStatusLike;
  providerStatusPending: boolean;
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
    providerStatus,
    providerStatusPending,
    optionsFeedback,
    onRefreshProviderStatus,
    onSaveOptions,
    onExport,
  } = props;

  return (
    <div className="surface__grid surface__grid--split">
      <article className="surface__panel">
        <h2>{text.options.siteConfiguration}</h2>
        <p>{text.options.siteConfigurationDescription}</p>
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
            placeholder="/api/courses/90031/threads?limit=30&sort=new"
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
      </article>

      <article className="surface__panel">
        <h2>{text.options.aiBffConfiguration}</h2>
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
            placeholder="http://127.0.0.1:8787"
          />
        </label>
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
            {providerStatusPending ? text.options.refreshingBffStatus : text.options.refreshBffStatus}
          </button>
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
        <div className="surface__actions surface__actions--wrap">
          <button className="surface__button" onClick={() => void onSaveOptions()}>
            {text.options.saveConfiguration}
          </button>
          <button className="surface__button surface__button--secondary" onClick={() => void onExport('current_view')}>
            {text.options.exportCurrentView}
          </button>
        </div>
        {optionsFeedback ? <p className="surface__feedback">{optionsFeedback}</p> : null}
      </article>

      <article className="surface__panel">
        <h2>{text.boundaryDisclosure.title}</h2>
        <ul className="surface__list">
          {text.boundaryDisclosure.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </article>
    </div>
  );
}
