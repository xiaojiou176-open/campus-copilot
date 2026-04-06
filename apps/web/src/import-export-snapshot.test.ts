import { describe, expect, it } from 'vitest';
import { snapshotFromImportedJson } from './import-export-snapshot';

describe('snapshotFromImportedJson', () => {
  it('accepts exporter-style json artifacts with nested data payloads', () => {
    const snapshot = snapshotFromImportedJson(
      JSON.stringify({
        generatedAt: '2026-04-03T12:00:00-07:00',
        data: {
          resources: [
            {
              id: 'edstem:resource:1',
              kind: 'resource',
              site: 'edstem',
              source: {
                site: 'edstem',
                resourceId: '1',
                resourceType: 'resource'
              },
              title: 'Week 8 review sheet',
              resourceKind: 'file'
            }
          ],
          assignments: [
            {
              id: 'canvas:assignment:1',
              kind: 'assignment',
              site: 'canvas',
              source: {
                site: 'canvas',
                resourceId: '1',
                resourceType: 'assignment',
              },
              title: 'Homework 1',
              status: 'todo',
            },
          ],
        },
      }),
    );

    expect(snapshot.generatedAt).toBe('2026-04-03T12:00:00-07:00');
    expect(snapshot.resources?.[0]?.title).toBe('Week 8 review sheet');
    expect(snapshot.assignments?.[0]?.title).toBe('Homework 1');
  });
});
