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
        currentPolicySite: 'canvas',
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
          courseClusterCount: 0,
          workItemClusterCount: 0,
          administrativeSummaryCount: 0,
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
    expect(html).toContain('Check this desk first');
    expect(html).toContain('Start with what changed, what matters first, or what needs a closer look.');
    expect(html).toContain('Advanced material analysis');
    expect(html).toContain('Default off');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('Enable excerpt analysis for one course');
    expect(html).toContain('See what AI can use');
    expect(html).toContain('Current site rules');
    expect(html).toContain('Allowed structured families: assignments, announcements, grades, calendar');
    expect(html).toContain('Read and export');
    expect(html).toContain('AI access');
    expect(html).toContain('Ask AI still checks this desk before anything leaves the extension.');
    expect(html.indexOf('Check this desk first')).toBeLessThan(html.indexOf('Ask from this desk'));
    expect(html.indexOf('See what AI can use')).toBeLessThan(html.indexOf('What AI can see'));
    expect(html.indexOf('What AI can see')).toBeLessThan(html.indexOf('Academic safety guardrails'));
    expect(html.indexOf('Check this desk first')).toBeLessThan(html.indexOf('Advanced material analysis'));
  });

  it('routes an evidence-light desk into workspace/export actions before showing the prompt box', () => {
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
        aiQuestion: '',
        aiPending: false,
        currentPolicySite: 'canvas',
        availableCourses: [{ id: 'canvas:course:1', label: 'Canvas · CSE 142' }],
        advancedMaterialEnabled: false,
        advancedMaterialCourseId: '',
        advancedMaterialExcerpt: '',
        advancedMaterialAcknowledged: false,
        structuredInputSummary: {
          totalAssignments: 0,
          dueSoonAssignments: 0,
          newGrades: 0,
          recentUpdatesCount: 0,
          priorityAlertsCount: 0,
          focusQueueCount: 0,
          weeklyLoadCount: 0,
          changeJournalCount: 0,
          courseClusterCount: 0,
          workItemClusterCount: 0,
          administrativeSummaryCount: 0,
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
        onOpenWorkspace: () => {},
        onOpenExport: () => {},
      }),
    );

    expect(html).toContain('This desk needs facts first');
    expect(html).toContain('Check the full workspace');
    expect(html).toContain('Open export');
    expect(html).not.toContain('Question">');
    expect(html).not.toContain('Suggested prompts');
  });

  it('keeps the Ask AI question path open when non-assignment evidence is already present', () => {
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
        aiQuestion: '',
        aiPending: false,
        currentPolicySite: 'canvas',
        availableCourses: [{ id: 'canvas:course:1', label: 'Canvas · CSE 142' }],
        advancedMaterialEnabled: false,
        advancedMaterialCourseId: '',
        advancedMaterialExcerpt: '',
        advancedMaterialAcknowledged: false,
        structuredInputSummary: {
          totalAssignments: 0,
          dueSoonAssignments: 0,
          newGrades: 0,
          recentUpdatesCount: 0,
          priorityAlertsCount: 0,
          focusQueueCount: 0,
          weeklyLoadCount: 7,
          changeJournalCount: 0,
          courseClusterCount: 0,
          workItemClusterCount: 0,
          administrativeSummaryCount: 0,
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

    expect(html).not.toContain('This desk needs facts first');
    expect(html).toContain('Ask from this desk');
    expect(html).toContain('Weekly load 7');
  });

  it('shows a blocked state instead of the full question form when the selected provider is not ready', () => {
    const html = renderToStaticMarkup(
      createElement(AskAiPanel, {
        text: getUiText('en'),
        uiLanguage: 'en',
        config: getDefaultExtensionConfig(),
        activeBffBaseUrl: 'http://127.0.0.1:8787',
        providerStatus: {
          providers: {
            openai: { ready: false, reason: 'missing_api_key' },
            gemini: { ready: false, reason: 'missing_api_key' },
            switchyard: { ready: false, reason: 'missing_runtime_url' },
          },
          checkedAt: '2026-04-21T12:00:00.000Z',
        },
        providerStatusPending: false,
        aiProvider: 'gemini',
        aiModel: 'gemini-2.5-flash',
        switchyardProvider: 'chatgpt',
        switchyardLane: 'web',
        aiQuestion: '',
        aiPending: false,
        currentPolicySite: 'canvas',
        availableCourses: [{ id: 'canvas:course:1', label: 'Canvas · CSE 142' }],
        advancedMaterialEnabled: false,
        advancedMaterialCourseId: '',
        advancedMaterialExcerpt: '',
        advancedMaterialAcknowledged: false,
        structuredInputSummary: {
          totalAssignments: 0,
          dueSoonAssignments: 0,
          newGrades: 0,
          recentUpdatesCount: 0,
          priorityAlertsCount: 0,
          focusQueueCount: 0,
          weeklyLoadCount: 7,
          changeJournalCount: 0,
          courseClusterCount: 0,
          workItemClusterCount: 0,
          administrativeSummaryCount: 0,
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
        onOpenConfiguration: () => {},
      }),
    );

    expect(html).toContain('AI route');
    expect(html).toContain('Not ready yet');
    expect(html).toContain('Fix the provider setup first, then ask a question.');
    expect(html).toContain('Refresh provider status or open AI settings to fix the provider setup.');
    expect(html).toContain('Open AI settings');
    expect(html).toContain('Refresh provider status');
    expect(html).not.toContain('Finish the local route first');
    expect(html).not.toContain('Question</span>');
    expect(html).not.toContain('Suggested prompts');
  });
});
