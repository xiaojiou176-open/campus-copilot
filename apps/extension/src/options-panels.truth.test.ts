import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { getDefaultExtensionConfig } from './config';
import { getUiText } from './i18n';
import { OptionsPanels } from './options-panels';
import { getSidepanelModeCopy } from './sidepanel-mode-copy';

describe('options panels connection truth', () => {
  it('shows the active autodiscovered local route instead of the manual-only fallback', () => {
    const optionsDraft = {
      ...getDefaultExtensionConfig(),
      ai: {
        ...getDefaultExtensionConfig().ai,
        bffBaseUrl: undefined,
      },
    };

    const html = renderToStaticMarkup(
      createElement(OptionsPanels, {
        text: getUiText('en'),
        uiLanguage: 'en',
        optionsDraft,
        setOptionsDraft: () => {},
        providerStatus: {
          providers: {
            openai: { ready: false, reason: 'missing_api_key' },
            gemini: { ready: false, reason: 'missing_api_key' },
            switchyard: { ready: false, reason: 'missing_runtime_url' },
          },
          checkedAt: '2026-04-22T06:22:01.034Z',
        },
        providerStatusPending: false,
        availableCourses: [],
        activeBffBaseUrl: 'http://127.0.0.1:8787',
        onRefreshProviderStatus: async () => {},
        onSaveOptions: async () => {},
        onExport: async () => {},
      } as any),
    );

    expect(html).toContain('Local AI connection: http://127.0.0.1:8787');
    expect(html).not.toContain('Local AI connection: Manual address only');
    expect(html.match(/Local AI connection:/g)?.length).toBe(1);
    expect(html).toContain('Read &amp; export: Ready now · AI permission: Needs confirmation');
    expect(html).not.toContain('Read & export: Ready now · AI analysis: Needs confirmation');
  });
});

describe('surface copy truth', () => {
  it('uses desk-scoped popup wording for the connected workspace summary', () => {
    const copy = getSidepanelModeCopy('en');

    expect(copy.popup.launchTitle).toBe('Quick snapshot from your desk');
    expect(copy.popup.launchTitle).not.toBe('Quick snapshot from this page');
    expect(copy.connection.autodiscovered).toBe('Local connection active');
  });
});
