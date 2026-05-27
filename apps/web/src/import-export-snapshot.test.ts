import { describe, expect, it } from 'vitest';
import { applyImportedEnvelopeToArtifact, parseImportedSnapshotArtifact, snapshotFromImportedJson } from './import-export-snapshot';

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

  it('keeps exporter scope and packaging metadata available for the web review surface', () => {
    const imported = parseImportedSnapshotArtifact(
      JSON.stringify({
        title: 'Current view',
        generatedAt: '2026-04-03T12:00:00-07:00',
        scope: {
          scopeType: 'current_view',
          preset: 'current_view',
          site: 'canvas',
          resourceFamily: 'workspace_snapshot',
        },
        packaging: {
          authorization_level: 'allowed',
          ai_allowed: false,
          risk_label: 'medium',
          match_confidence: 'medium',
          provenance: [
            {
              sourceType: 'derived_read_model',
              label: 'Unified local read model',
              readOnly: true,
            },
          ],
        },
        data: {
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

    expect(imported.envelope?.title).toBe('Current view');
    expect(imported.envelope?.scope?.site).toBe('canvas');
    expect(imported.envelope?.packaging?.authorizationLevel).toBe('allowed');
    expect(imported.envelope?.packaging?.aiAllowed).toBe(false);
    expect(imported.snapshot.assignments?.[0]?.title).toBe('Homework 1');
  });

  it('reuses an imported envelope when rebuilding the current view artifact for web ai gating', () => {
    const imported = parseImportedSnapshotArtifact(
      JSON.stringify({
        title: 'Current view',
        generatedAt: '2026-04-03T12:00:00-07:00',
        scope: {
          scopeType: 'current_view',
          preset: 'current_view',
          site: 'canvas',
          resourceFamily: 'workspace_snapshot',
        },
        packaging: {
          authorization_level: 'allowed',
          ai_allowed: true,
          risk_label: 'medium',
          match_confidence: 'medium',
          provenance: [
            {
              sourceType: 'derived_read_model',
              label: 'Imported local read model',
              readOnly: true,
            },
          ],
        },
        data: {},
      }),
    );

    const merged = applyImportedEnvelopeToArtifact(
      {
        preset: 'current_view',
        format: 'markdown',
        filename: 'current-view.md',
        mimeType: 'text/markdown',
        scope: {
          scopeType: 'current_view',
          preset: 'current_view',
          site: 'all' as never,
          resourceFamily: 'workspace_snapshot',
        },
        packaging: {
          authorizationLevel: 'partial',
          aiAllowed: false,
          riskLabel: 'medium',
          matchConfidence: 'low',
          provenance: [],
        },
        content: '# Current view',
      },
      imported.envelope,
    );

    expect(merged.scope.site).toBe('canvas');
    expect(merged.packaging.aiAllowed).toBe(true);
    expect(merged.packaging.authorizationLevel).toBe('allowed');
  });
});
