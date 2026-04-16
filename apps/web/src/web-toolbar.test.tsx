import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WebSupportRail, WebToolbar } from './web-toolbar';

const toolbarProps: Parameters<typeof WebToolbar>[0] = {
  ready: true,
  now: '2026-04-10T09:00:00.000Z',
  feedback: 'Loaded the existing local web workspace snapshot.',
  exportFormat: 'markdown',
  exportFormats: ['markdown', 'json'],
  filters: { site: 'all', onlyUnseenUpdates: false },
  siteOrder: ['canvas', 'gradescope', 'edstem', 'myuw', 'time-schedule'],
  siteLabels: {
    canvas: 'Canvas',
    gradescope: 'Gradescope',
    edstem: 'EdStem',
    myuw: 'MyUW',
    'time-schedule': 'Time Schedule',
    'course-sites': 'Course Websites',
  },
  topSyncRun: {
    id: 'sync-1',
    site: 'canvas',
    status: 'success',
    outcome: 'success',
    completedAt: '2026-04-10T08:45:00.000Z',
    startedAt: '2026-04-10T08:40:00.000Z',
    changeCount: 5,
  },
  populatedSiteCount: 4,
  trackedEntityCount: 27,
  unseenUpdateCount: 3,
  onLoadDemo: async () => {},
  onImportFile: async () => {},
  onExportFormatChange: () => {},
  onSiteFilterChange: () => {},
  onOnlyUnseenChange: () => {},
  onExportCurrentView: () => {},
  onExportFocusQueue: () => {},
  onExportWeeklyLoad: () => {},
  onExportChangeJournal: () => {},
};

describe('web toolbar and support rail', () => {
  it('keeps the header focused on hero plus import/export controls', () => {
    const html = renderToStaticMarkup(
      createElement(WebToolbar, toolbarProps),
    );

    expect(html).toContain('Student decision workspace');
    expect(html).toContain('academic work, administrative signals, and the next decision');
    expect(html).toContain('Workspace truth');
    expect(html).toContain('Load / Import');
    expect(html).toContain('Filter / Export');
    expect(html).not.toContain('Trust summary');
    expect(html).not.toContain('Receipts and diagnostics');
  });

  it('renders a supporting trust summary and diagnostics receipts without overclaiming live state', () => {
    const html = renderToStaticMarkup(createElement(WebSupportRail, toolbarProps));

    expect(html).toContain('What this desk can prove');
    expect(html).toContain('Receipts and diagnostics');
    expect(html).toContain('Imported sites with data');
    expect(html).toContain('Tracked entities');
    expect(html).toContain('Unseen updates');
    expect(html).toContain('Latest stored receipt: Canvas');
    expect(html).toContain('Start with the facts already on the desk.');
    expect(html).toContain('Registration-related and red-zone routes stay outside this product surface.');
  });
});
