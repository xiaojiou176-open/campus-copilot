import { describe, expect, it } from 'vitest';
import { buildGradescopeSnapshotView } from './index';

function parseImportedWorkbenchSnapshot(raw: string) {
  return JSON.parse(raw);
}

describe('@campus-copilot/gradescope-api', () => {
  it('returns a read-only Gradescope snapshot view', () => {
    const snapshot = parseImportedWorkbenchSnapshot(
      JSON.stringify({
        generatedAt: '2026-04-03T09:00:00-07:00',
        assignments: [
          {
            id: 'gradescope:assignment:ps3',
            kind: 'assignment',
            site: 'gradescope',
            source: { site: 'gradescope', resourceId: 'ps3', resourceType: 'assignment' },
            title: 'Problem Set 3',
            status: 'graded'
          }
        ]
      }),
    );

    const view = buildGradescopeSnapshotView(snapshot);
    expect(view.site).toBe('gradescope');
    expect(view.counts.assignments).toBe(1);
  });
});
