import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getUiText, resolveUiLanguage } from './i18n';

describe('ui language resolution', () => {
  it('falls back to English for non-Chinese browser languages when auto is selected', () => {
    expect(resolveUiLanguage('auto', 'en-US')).toBe('en');
    expect(resolveUiLanguage('auto', 'fr-FR')).toBe('en');
  });

  it('collapses zh variants into zh-CN when auto is selected', () => {
    expect(resolveUiLanguage('auto', 'zh-CN')).toBe('zh-CN');
    expect(resolveUiLanguage('auto', 'zh-TW')).toBe('zh-CN');
  });

  it('prefers an explicit manual override over browser language', () => {
    expect(resolveUiLanguage('en', 'zh-CN')).toBe('en');
    expect(resolveUiLanguage('zh-CN', 'en-US')).toBe('zh-CN');
  });

  it('includes courses and events in site status counts copy', () => {
    const en = getUiText('en');
    const zh = getUiText('zh-CN');

    expect(
      en.siteStatus.counts({
        courses: 1,
        resources: 0,
        assignments: 2,
        announcements: 3,
        grades: 4,
        messages: 5,
        events: 6,
      }),
    ).toBe('Courses 1 · Resources 0 · Assignments 2 · Announcements 3 · Grades 4 · Messages 5 · Events 6');

    expect(
      zh.siteStatus.counts({
        courses: 1,
        resources: 0,
        assignments: 2,
        announcements: 3,
        grades: 4,
        messages: 5,
        events: 6,
      }),
    ).toBe('课程 1 · 资料 0 · 作业 2 · 公告 3 · 成绩 4 · 消息 5 · 事件 6');
  });

  it('localizes options placeholders instead of hardcoding them in the component', () => {
    const en = getUiText('en');
    const zh = getUiText('zh-CN');
    const optionsPanelSource = readFileSync(new URL('./options-panels.tsx', import.meta.url), 'utf8');

    expect(en.options.threadsPathPlaceholder).toBe('For example: /api/courses/90031/threads?limit=30&sort=new');
    expect(en.options.bffBaseUrlPlaceholder).toBe('For example: http://127.0.0.1:8787');
    expect(zh.options.threadsPathPlaceholder).toBe('例如：/api/courses/90031/threads?limit=30&sort=new');
    expect(zh.options.bffBaseUrlPlaceholder).toBe('例如：http://127.0.0.1:8787');
    expect(optionsPanelSource).toContain('placeholder={text.options.threadsPathPlaceholder}');
    expect(optionsPanelSource).toContain('placeholder={text.options.bffBaseUrlPlaceholder}');
  });

  it('keeps workbench decision panels on localized helper paths instead of raw machine codes', () => {
    const workbenchPanelSource = readFileSync(new URL('./workbench-panel-sections.tsx', import.meta.url), 'utf8');

    expect(workbenchPanelSource).toContain('formatAlertTitle(alert, uiLanguage)');
    expect(workbenchPanelSource).toContain('formatAlertSummary(alert, uiLanguage)');
    expect(workbenchPanelSource).toContain('formatAlertImportanceLabel(alert.importance, uiLanguage)');
    expect(workbenchPanelSource).toContain('formatTimelineKindLabel(entry.timelineKind, uiLanguage)');
    expect(workbenchPanelSource).toContain('formatTimelineSummary(entry, uiLanguage)');
    expect(workbenchPanelSource).toContain('formatChangeTypeLabel(event.changeType, uiLanguage)');
    expect(workbenchPanelSource).not.toContain('{entry.timelineKind}');
    expect(workbenchPanelSource).not.toContain('{event.changeType.replace(/_/g, \' \')}');
  });
});
