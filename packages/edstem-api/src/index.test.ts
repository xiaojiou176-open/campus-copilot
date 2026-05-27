import { describe, expect, it } from 'vitest';
import { buildEdStemSnapshotView } from './index';

function parseImportedWorkbenchSnapshot(raw: string) {
  return JSON.parse(raw);
}

describe('@campus-copilot/edstem-api', () => {
  it('returns a read-only EdStem snapshot view', () => {
    const snapshot = parseImportedWorkbenchSnapshot(
      JSON.stringify({
        generatedAt: '2026-04-03T09:00:00-07:00',
        messages: [
          {
            id: 'edstem:message:office-hours',
            kind: 'message',
            site: 'edstem',
            source: { site: 'edstem', resourceId: 'office-hours', resourceType: 'thread' },
            messageKind: 'thread',
            title: 'Office hours'
          }
        ]
      }),
    );

    const view = buildEdStemSnapshotView(snapshot);
    expect(view.site).toBe('edstem');
    expect(view.counts.messages).toBe(1);
  });
});
