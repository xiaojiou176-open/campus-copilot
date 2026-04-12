import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AskAiPanel } from './ask-ai-panel';
import { getDefaultExtensionConfig } from './config';
import { getUiText } from './i18n';

describe('ask ai panel guardrails', () => {
  it('renders manual-only red-zone copy and a default-disabled advanced material switch', () => {
    const html = renderToStaticMarkup(
      createElement(AskAiPanel, {
        text: getUiText('en'),
        uiLanguage: 'en',
        config: getDefaultExtensionConfig(),
        providerStatus: {
          providers: {
            openai: { ready: true, reason: 'configured' },
            gemini: { ready: true, reason: 'configured' },
            switchyard: { ready: false, reason: 'missing_runtime_url' },
          },
          checkedAt: '2026-04-09T12:00:00.000Z',
        },
        providerStatusPending: false,
        aiProvider: 'gemini',
        aiModel: 'gemini-2.5-flash',
        switchyardProvider: 'chatgpt',
        switchyardLane: 'web',
        aiQuestion: 'What should I do first?',
        aiPending: false,
        availableCourses: [{ id: 'canvas:course:1', label: 'Canvas · CSE 142' }],
        advancedMaterialEnabled: false,
        advancedMaterialCourseId: '',
        advancedMaterialExcerpt: '',
        advancedMaterialAcknowledged: false,
        structuredInputSummary: {
          totalAssignments: 2,
          dueSoonAssignments: 1,
          newGrades: 0,
          recentUpdatesCount: 2,
          priorityAlertsCount: 1,
          focusQueueCount: 1,
          weeklyLoadCount: 1,
          changeJournalCount: 1,
          currentViewFormat: 'markdown',
        },
        onProviderChange: () => {},
        onModelChange: () => {},
        onSwitchyardProviderChange: () => {},
        onSwitchyardLaneChange: () => {},
        onQuestionChange: () => {},
        onAdvancedMaterialEnabledChange: () => {},
        onAdvancedMaterialCourseChange: () => {},
        onAdvancedMaterialExcerptChange: () => {},
        onAdvancedMaterialAcknowledgedChange: () => {},
        onAskAi: async () => {},
        onRefreshProviderStatus: async () => {},
      }),
    );

    expect(html).toContain('Academic safety guardrails');
    expect(html).toContain('Register.UW, Notify.UW, seat watching, and registration-related polling stay outside the current product path.');
    expect(html).toContain('Registration automation stays off');
    expect(html).toContain('Advanced material analysis');
    expect(html).toContain('Default off');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('Enable excerpt analysis for one course');
    expect(html).toContain('Policy review');
    expect(html).toContain('Layer 1 read/export');
    expect(html).toContain('Layer 2 AI read');
    expect(html).toContain('Ask AI still re-checks the current view packaging before anything leaves the extension.');
    expect(html.indexOf('Academic safety guardrails')).toBeLessThan(html.indexOf('Question box'));
    expect(html.indexOf('Question box')).toBeLessThan(html.indexOf('Suggested prompts'));
    expect(html.indexOf('Suggested prompts')).toBeLessThan(html.indexOf('What AI can see'));
    expect(html.indexOf('What AI can see')).toBeLessThan(html.indexOf('Current runtime'));
    expect(html.indexOf('Current runtime')).toBeLessThan(html.indexOf('Advanced material analysis'));
  });
});
