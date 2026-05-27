import { describe, expect, it } from 'vitest';
import { buildResourceFailures, buildSiteBlockingHint, extractMyUWPageContextInPage } from './background-runtime';

describe('background runtime helpers', () => {
  it('extracts myuw state from globals before falling back to html', () => {
    const documentStub = {
      documentElement: {
        outerHTML: '<html><body><main>MyUW</main></body></html>',
      },
      querySelector: () => null,
    };
    const windowStub = {
      __INITIAL_STATE__: {
        props: {
          pageProps: {
            notices: [{ id: 'notice-1', title: 'Registration' }],
            events: [{ id: 'event-1', title: 'Exam review' }],
          },
        },
      },
    };
    Object.assign(globalThis, {
      document: documentStub,
      window: windowStub,
    });

    const result = extractMyUWPageContextInPage();

    expect(result.pageState).toEqual({
      notices: [{ id: 'notice-1', title: 'Registration' }],
      events: [{ id: 'event-1', title: 'Exam review' }],
    });
    expect(result.pageHtml).toContain('<main>MyUW</main>');
  });

  it('stays serializable when scripting injects the helper into the page without module-scope closures', () => {
    const documentStub = {
      documentElement: {
        outerHTML: '<html><body><main>MyUW</main></body></html>',
      },
      querySelector: () => null,
    };
    const windowStub = {
      __INITIAL_STATE__: {
        props: {
          pageProps: {
            notices: [{ id: 'notice-1', title: 'Registration' }],
            events: [{ id: 'event-1', title: 'Exam review' }],
          },
        },
      },
    };
    const isolated = new Function(
      'window',
      'document',
      `globalThis.window = window; globalThis.document = document; return (${extractMyUWPageContextInPage.toString()})();`,
    );

    const result = isolated(windowStub, documentStub) as ReturnType<typeof extractMyUWPageContextInPage>;

    expect(result.pageState).toEqual({
      notices: [{ id: 'notice-1', title: 'Registration' }],
      events: [{ id: 'event-1', title: 'Exam review' }],
    });
    expect(result.pageHtml).toContain('<main>MyUW</main>');
  });

  it('summarizes only unresolved resource failures', () => {
    const failures = buildResourceFailures({
      resources: [
        {
          mode: 'private_api',
          collectorName: 'EdStemResourcesPrivateCollector',
          success: false,
          errorReason: 'collector_failed',
        },
      ],
      announcements: [
        {
          mode: 'state',
          collectorName: 'StateCollector',
          success: false,
          errorReason: 'missing_state',
        },
        {
          mode: 'dom',
          collectorName: 'DomCollector',
          success: true,
        },
      ],
      events: [
        {
          mode: 'dom',
          collectorName: 'DomEventsCollector',
          success: false,
          errorReason: 'dom_missing',
        },
      ],
    });

    expect(failures).toEqual([
      {
        resource: 'resources',
        errorReason: 'collector_failed',
        attemptedModes: ['private_api'],
        attemptedCollectors: ['EdStemResourcesPrivateCollector'],
      },
      {
        resource: 'events',
        errorReason: 'dom_missing',
        attemptedModes: ['dom'],
        attemptedCollectors: ['DomEventsCollector'],
      },
    ]);
  });

  it('does not mark edstem as blocked before an actual unsupported-context result exists', () => {
    expect(
      buildSiteBlockingHint('edstem', {
        hasEdStemConfig: false,
      }),
    ).toBeUndefined();

    expect(
      buildSiteBlockingHint('edstem', {
        outcome: 'unsupported_context',
        hasEdStemConfig: false,
      }),
    ).toBe('EdStem private request paths are missing. Fill them in through Options first.');

    expect(
      buildSiteBlockingHint('edstem', {
        outcome: 'unsupported_context',
        hasEdStemConfig: false,
        locale: 'zh-CN',
      }),
    ).toBe('缺少 EdStem 私有请求路径，请先在 Options 里填写。');
  });
});
