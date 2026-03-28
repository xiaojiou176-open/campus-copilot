import { describe, expect, it } from 'vitest';
import { resolveUiLanguage } from './i18n';

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
});
