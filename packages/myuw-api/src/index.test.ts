import { describe, expect, it } from 'vitest';
import { buildMyUwSnapshotView } from './index';

function parseImportedWorkbenchSnapshot(raw: string) {
  return JSON.parse(raw);
}

describe('@campus-copilot/myuw-api', () => {
  it('returns a read-only MyUW snapshot view', () => {
    const snapshot = parseImportedWorkbenchSnapshot(
      JSON.stringify({
        generatedAt: '2026-04-03T09:00:00-07:00',
        events: [
          {
            id: 'myuw:event:lecture',
            kind: 'event',
            site: 'myuw',
            source: { site: 'myuw', resourceId: 'lecture', resourceType: 'schedule_meeting' },
            eventKind: 'class',
            title: 'CSE 312 lecture'
          }
        ]
      }),
    );

    const view = buildMyUwSnapshotView(snapshot);
    expect(view.site).toBe('myuw');
    expect(view.counts.events).toBe(1);
  });
});
