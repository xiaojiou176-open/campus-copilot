import { describe, expect, it } from 'vitest';
import type { ImportedArtifactEnvelope } from './import-export-snapshot';
import { buildWebCurrentViewArtifact } from './App';

describe('buildWebCurrentViewArtifact', () => {
  it('keeps the imported envelope on actual current-view downloads', () => {
    const importedEnvelope: ImportedArtifactEnvelope = {
      title: 'Imported workspace packet',
      generatedAt: '2026-04-13T05:40:00.000Z',
      scope: {
        scopeType: 'current_view',
        preset: 'current_view',
        site: 'edstem',
        resourceFamily: 'workspace_snapshot',
      },
      packaging: {
        authorizationLevel: 'partial',
        aiAllowed: false,
        riskLabel: 'high',
        matchConfidence: 'low',
        provenance: [
          {
            sourceType: 'session_interface',
            label: 'Imported review packet',
            readOnly: true,
          },
        ],
      },
    };

    const artifact = buildWebCurrentViewArtifact({
      now: '2026-04-13T05:40:00.000Z',
      format: 'markdown',
      filters: { site: 'edstem', onlyUnseenUpdates: false },
      importedEnvelope,
      resources: [],
      assignments: [],
      announcements: [],
      messages: [],
      grades: [],
      events: [],
      alerts: [],
      recentUpdates: undefined,
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      changeEvents: [],
      courseClusters: [],
      workItemClusters: [],
      administrativeSummaries: [],
      mergeHealth: undefined,
    });

    expect(artifact.scope.site).toBe('edstem');
    expect(artifact.scope.scopeType).toBe('current_view');
    expect(artifact.scope.resourceFamily).toBe('workspace_snapshot');
    expect(artifact.packaging.authorizationLevel).toBe('partial');
    expect(artifact.packaging.aiAllowed).toBe(false);
    expect(artifact.packaging.riskLabel).toBe('high');
    expect(artifact.packaging.matchConfidence).toBe('low');
    expect(artifact.packaging.provenance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Imported review packet',
          sourceType: 'session_interface',
        }),
      ]),
    );
  });
});
