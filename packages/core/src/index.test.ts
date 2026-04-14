import { describe, expect, it, vi } from 'vitest';
import {
  buildWorkbenchAiProxyRequest,
  buildWorkbenchExportInput,
  CanvasSyncOutcomeSchema,
  createSurfaceSnapshot,
  normalizeLocalBffBaseUrl,
  resolveLocalBffBaseUrl,
} from './index';

describe('core contracts', () => {
  it('creates a surface snapshot from canonical storage results', () => {
    const snapshot = createSurfaceSnapshot('sidepanel', {
      courses: 1,
      resources: 0,
      assignments: 2,
      announcements: 3,
      messages: 0,
      events: 0,
    });

    expect(snapshot.surface).toBe('sidepanel');
    expect(snapshot.counts.assignments).toBe(2);
  });

  it('locks canvas sync outcomes to the allowed contract', () => {
    expect(CanvasSyncOutcomeSchema.parse('success')).toBe('success');
    expect(CanvasSyncOutcomeSchema.parse('unauthorized')).toBe('unauthorized');
    expect(() => CanvasSyncOutcomeSchema.parse('not_a_real_outcome')).toThrow();
  });

  it('builds shared workbench export input with presentation overrides', () => {
    const input = buildWorkbenchExportInput({
      preset: 'current_view',
      generatedAt: '2026-04-06T00:00:00.000Z',
      filters: { site: 'canvas', onlyUnseenUpdates: false },
      resources: [],
      assignments: [],
      announcements: [],
      messages: [],
      grades: [],
      events: [],
      alerts: [],
      recentUpdates: {
        items: [],
        unseenCount: 0,
      },
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      changeEvents: [],
      presentation: {
        viewTitle: 'Localized current view',
      },
    });

    expect(input.viewTitle).toBe('Localized current view');
    expect(input.timelineEntries).toEqual([]);
    expect(input.scope).toEqual({
      site: 'canvas',
    });
    expect(input.authorization).toBeUndefined();
  });

  it('builds a shared AI proxy request on the existing route/body contract', () => {
    const request = buildWorkbenchAiProxyRequest({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      question: 'What should I do first?',
      todaySnapshot: {
        totalAssignments: 2,
        dueSoonAssignments: 1,
        recentUpdates: 3,
        newGrades: 0,
        riskAlerts: 1,
        syncedSites: 4,
      },
      recentUpdates: [],
      alerts: [],
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      recentChanges: [],
      planningSubstrates: [
        {
          id: 'myplan:student-plan',
          source: 'myplan',
          fit: 'derived_planning_substrate',
          readOnly: true,
          capturedAt: '2026-04-10T08:00:00.000Z',
          planId: 'student-plan',
          planLabel: 'Student Plan',
          currentStage: 'partial_shared_landing',
          runtimePosture: 'comparison_oriented_planning_substrate',
          currentTruth: 'MyPlan is a real planning lane but still summary-first.',
          termCount: 2,
          plannedCourseCount: 6,
          backupCourseCount: 1,
          scheduleOptionCount: 3,
          requirementGroupCount: 0,
          programExplorationCount: 2,
          exactBlockers: [
            {
              id: 'shared_planning_substrate_contract',
              class: 'repo-owned blocker',
              summary: 'Shared planning promotion still needs a source-aware merge.',
              whyItStopsPromotion: 'The adapter proof exists, but shared storage/core promotion is not done yet.',
            },
          ],
          hardDeferredMoves: ['registration handoff'],
          terms: [],
        },
      ],
      currentViewExport: {
        preset: 'current_view',
        format: 'markdown',
        filename: 'current-view.md',
        mimeType: 'text/markdown',
        scope: {
          scopeType: 'current_view',
          preset: 'current_view',
          site: 'canvas',
          resourceFamily: 'workspace_snapshot',
        },
        packaging: {
          authorizationLevel: 'allowed',
          aiAllowed: false,
          riskLabel: 'medium',
          matchConfidence: 'medium',
          provenance: [
            {
              sourceType: 'derived_read_model',
              label: 'Unified local read model',
              readOnly: true,
            },
          ],
        },
        content: '# Current view',
      },
    });

    expect(request.route).toBe('/api/providers/gemini/chat');
    expect(request.body.messages).toHaveLength(2);
    expect(request.body.messages[0]?.role).toBe('system');
    expect(request.body.messages[0]?.content).toContain('Advanced material analysis stays default-disabled');
    expect(request.body.messages[0]?.content).toContain('Current site policy overlay: Canvas.');
    expect(request.body.messages[1]?.role).toBe('user');
    expect(request.body.messages[1]?.content).toContain('get_planning_substrates');
    expect(request.body.messages[1]?.content).toContain('"coverageStatus":"plan_only"');
    expect(request.body.messages[1]?.content).toContain('"currentStage":"partial_shared_landing"');
    expect(request.body.messages[1]?.content).toContain('shared_planning_substrate_contract');
    expect(request.body.messages[1]?.content).toContain('"scope"');
    expect(request.body.messages[1]?.content).toContain('"contentRedacted":true');
    expect(request.body.messages[1]?.content).not.toContain('# Current view');
  });

  it('accepts planning substrates from the shared workbench view contract', () => {
    const request = buildWorkbenchAiProxyRequest({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      question: 'What does my plan change in the shared workbench?',
      todaySnapshot: {
        totalAssignments: 2,
        dueSoonAssignments: 1,
        recentUpdates: 3,
        newGrades: 0,
        riskAlerts: 1,
        syncedSites: 4,
      },
      recentUpdates: [],
      alerts: [],
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      recentChanges: [],
      workbenchView: {
        planningSubstrates: [
          {
            id: 'myplan:student-plan',
            source: 'myplan',
            fit: 'derived_planning_substrate',
            readOnly: true,
            capturedAt: '2026-04-10T08:00:00.000Z',
            planId: 'student-plan',
            planLabel: 'Student Plan',
            termCount: 2,
            plannedCourseCount: 6,
            backupCourseCount: 1,
            scheduleOptionCount: 3,
            requirementGroupCount: 4,
            programExplorationCount: 2,
            exactBlockers: [],
            hardDeferredMoves: [],
            terms: [],
          },
        ],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [],
        mergeHealth: {
          mergedCount: 0,
          possibleMatchCount: 0,
          unresolvedCount: 0,
          authorityConflictCount: 0,
        },
      },
      currentViewExport: {
        preset: 'current_view',
        format: 'markdown',
        filename: 'current-view.md',
        mimeType: 'text/markdown',
        scope: {
          scopeType: 'current_view',
          preset: 'current_view',
          site: 'canvas',
          resourceFamily: 'workspace_snapshot',
        },
        packaging: {
          authorizationLevel: 'allowed',
          aiAllowed: false,
          riskLabel: 'medium',
          matchConfidence: 'medium',
          provenance: [
            {
              sourceType: 'derived_read_model',
              label: 'Unified local read model',
              readOnly: true,
            },
          ],
        },
        content: '# Current view',
      },
    });

    expect(request.body.messages[1]?.content).toContain('"lane":"summary_first_read_only_planning_lane"');
    expect(request.body.messages[1]?.content).toContain('"posture":"planning_only_not_registration_or_enrollment_proof"');
    expect(request.body.messages[1]?.content).toContain('Student Plan');
    expect(request.body.messages[1]?.content).toContain('get_planning_substrates');
  });

  it('marks Planning Pulse as plan-and-audit when both halves are present in the shared lane', () => {
    const request = buildWorkbenchAiProxyRequest({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      question: 'What is still missing from my planning lane?',
      todaySnapshot: {
        totalAssignments: 1,
        dueSoonAssignments: 0,
        recentUpdates: 1,
        newGrades: 0,
        riskAlerts: 0,
        syncedSites: 4,
      },
      recentUpdates: [],
      alerts: [],
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      recentChanges: [],
      planningSubstrates: [
        {
          id: 'myplan:student-plan',
          source: 'myplan',
          fit: 'derived_planning_substrate',
          readOnly: true,
          capturedAt: '2026-04-10T08:00:00.000Z',
          planId: 'student-plan',
          planLabel: 'Student Plan',
          termCount: 2,
          plannedCourseCount: 6,
          backupCourseCount: 1,
          scheduleOptionCount: 3,
          requirementGroupCount: 4,
          programExplorationCount: 2,
          degreeProgressSummary: 'Core requirements still need one systems elective.',
          transferPlanningSummary: 'Transfer equivalency review remains manual.',
          exactBlockers: [],
          hardDeferredMoves: [],
          terms: [],
        },
      ],
      currentViewExport: {
        preset: 'current_view',
        format: 'markdown',
        filename: 'current-view.md',
        mimeType: 'text/markdown',
        scope: {
          scopeType: 'current_view',
          preset: 'current_view',
          site: 'myplan',
          resourceFamily: 'workspace_snapshot',
        },
        packaging: {
          authorizationLevel: 'allowed',
          aiAllowed: false,
          riskLabel: 'medium',
          matchConfidence: 'medium',
          provenance: [
            {
              sourceType: 'derived_read_model',
              label: 'Unified local read model',
              readOnly: true,
            },
          ],
        },
        content: '# Planning pulse',
      },
    });

    expect(request.body.messages[0]?.content).toContain('Current site policy overlay: MyPlan.');
    expect(request.body.messages[1]?.content).toContain('"coverageStatus":"plan_and_audit"');
    expect(request.body.messages[1]?.content).toContain('still stays summary-first and read-only');
    expect(request.body.messages[1]?.content).toContain('Transfer equivalency review remains manual.');
  });

  it('passes a per-course opt-in excerpt through the shared workbench AI request', () => {
    const request = buildWorkbenchAiProxyRequest({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      question: 'Please summarize these lecture slides for the midterm.',
      advancedMaterialAnalysis: {
        enabled: true,
        policy: 'per_course_opt_in',
        courseId: 'canvas:course:1',
        courseLabel: 'Canvas · CSE 142',
        excerpt: 'The lecture focuses on asymptotic notation and binary search.',
        userAcknowledgedResponsibility: true,
      },
      todaySnapshot: {
        totalAssignments: 0,
        dueSoonAssignments: 0,
        recentUpdates: 0,
        newGrades: 0,
        riskAlerts: 0,
        syncedSites: 0,
      },
      recentUpdates: [],
      alerts: [],
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      recentChanges: [],
      currentViewExport: {
        preset: 'current_view',
        format: 'markdown',
        filename: 'current-view.md',
        mimeType: 'text/markdown',
        scope: {
          scopeType: 'current_view',
          preset: 'current_view',
          site: 'canvas',
          resourceFamily: 'workspace_snapshot',
        },
        packaging: {
          authorizationLevel: 'allowed',
          aiAllowed: false,
          riskLabel: 'medium',
          matchConfidence: 'medium',
          provenance: [
            {
              sourceType: 'derived_read_model',
              label: 'Unified local read model',
              readOnly: true,
            },
          ],
        },
        content: '# Current view',
      },
    });

    expect(request.body.messages[0]?.content).toContain('explicitly opted in to advanced material analysis');
    expect(request.body.messages[1]?.content).toContain('get_opted_in_course_material_excerpt');
    expect(request.body.messages[1]?.content).toContain('Canvas · CSE 142');
  });

  it('redacts export-first administrative detail from the AI request when the current view is not AI-allowed', () => {
    const request = buildWorkbenchAiProxyRequest({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      question: 'Can you explain the transcript issue?',
      todaySnapshot: {
        totalAssignments: 0,
        dueSoonAssignments: 0,
        recentUpdates: 0,
        newGrades: 0,
        riskAlerts: 1,
        syncedSites: 4,
      },
      recentUpdates: [],
      alerts: [],
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      recentChanges: [],
      workbenchView: {
        planningSubstrates: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [
          {
            id: 'admin:transcript:1',
            family: 'transcript',
            title: 'Transcript summary',
            summary: 'GPA detail and transcript standing stay export-first until a stronger lane is promoted.',
            importance: 'high',
            aiDefault: 'blocked',
            authoritySource: 'myuw summary lane',
            sourceSurface: 'myuw',
            updatedAt: '2026-04-12T08:00:00.000Z',
          },
        ],
        mergeHealth: {
          mergedCount: 0,
          possibleMatchCount: 0,
          unresolvedCount: 0,
          authorityConflictCount: 0,
        },
      },
      currentViewExport: {
        preset: 'current_view',
        format: 'markdown',
        filename: 'current-view.md',
        mimeType: 'text/markdown',
        scope: {
          scopeType: 'current_view',
          preset: 'current_view',
          site: 'myuw',
          resourceFamily: 'workspace_snapshot',
        },
        packaging: {
          authorizationLevel: 'confirm_required',
          aiAllowed: false,
          riskLabel: 'high',
          matchConfidence: 'medium',
          provenance: [
            {
              sourceType: 'derived_read_model',
              label: 'Administrative summary-first substrate',
              readOnly: true,
            },
          ],
        },
        content: '# Current view\nTranscript summary\nGPA detail and transcript standing stay export-first until a stronger lane is promoted.',
      },
    });

    expect(request.body.messages[1]?.content).toContain('"redactionReason":"ai_not_allowed_for_current_view_export"');
    expect(request.body.messages[1]?.content).toContain('"reviewRequiredAdministrativeFamilies":["transcript"]');
    expect(request.body.messages[1]?.content).toContain('"administrativeSummariesCount":1');
    expect(request.body.messages[1]?.content).not.toContain('GPA detail and transcript standing stay export-first');
  });

  it('keeps the AI request redacted when packaging claims aiAllowed but export authorization is still review-first', () => {
    const request = buildWorkbenchAiProxyRequest({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      question: 'Can you summarize the transcript lane?',
      todaySnapshot: {
        totalAssignments: 0,
        dueSoonAssignments: 0,
        recentUpdates: 0,
        newGrades: 0,
        riskAlerts: 1,
        syncedSites: 4,
      },
      recentUpdates: [],
      alerts: [],
      focusQueue: [],
      weeklyLoad: [],
      syncRuns: [],
      recentChanges: [],
      workbenchView: {
        planningSubstrates: [],
        courseClusters: [],
        workItemClusters: [],
        administrativeSummaries: [
          {
            id: 'admin:transcript:1',
            family: 'transcript',
            title: 'Transcript summary',
            summary: 'Transcript detail is still review-first until a stronger lawful lane lands.',
            importance: 'high',
            aiDefault: 'blocked',
            authoritySource: 'myuw candidate lane (carrier not landed)',
            sourceSurface: 'myuw',
            updatedAt: '2026-04-12T08:00:00.000Z',
          },
        ],
        mergeHealth: {
          mergedCount: 0,
          possibleMatchCount: 0,
          unresolvedCount: 0,
          authorityConflictCount: 0,
        },
      },
      currentViewExport: {
        preset: 'current_view',
        format: 'markdown',
        filename: 'current-view.md',
        mimeType: 'text/markdown',
        scope: {
          scopeType: 'current_view',
          preset: 'current_view',
          site: 'myuw',
          resourceFamily: 'workspace_snapshot',
        },
        packaging: {
          authorizationLevel: 'confirm_required',
          aiAllowed: true,
          riskLabel: 'high',
          matchConfidence: 'medium',
          provenance: [
            {
              sourceType: 'derived_read_model',
              label: 'Administrative summary-first substrate',
              readOnly: true,
            },
          ],
        },
        content: '# Current view\nTranscript summary\nTranscript detail is still review-first until a stronger lawful lane lands.',
      },
    });

    expect(request.body.messages[1]?.content).toContain('"contentRedacted":true');
    expect(request.body.messages[1]?.content).toContain('"reviewRequiredAdministrativeFamilies":["transcript"]');
    expect(request.body.messages[1]?.content).not.toContain(
      'Transcript detail is still review-first until a stronger lawful lane lands.',
    );
  });

  it('normalizes local BFF base URLs', () => {
    expect(normalizeLocalBffBaseUrl(' http://127.0.0.1:8787/ ')).toBe('http://127.0.0.1:8787');
    expect(normalizeLocalBffBaseUrl('notaurl')).toBeUndefined();
  });

  it('prefers a reachable manual local BFF URL', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      return {
        ok: url === 'http://127.0.0.1:8787/health',
      } as Response;
    });

    await expect(
      resolveLocalBffBaseUrl({
        configuredBaseUrl: 'http://127.0.0.1:8787',
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).resolves.toEqual({
      baseUrl: 'http://127.0.0.1:8787',
      source: 'manual',
      checkedUrls: ['http://127.0.0.1:8787'],
    });
  });

  it('autodiscovers a fallback local BFF URL when manual config is missing', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      return {
        ok: url === 'http://localhost:8787/health',
      } as Response;
    });

    await expect(
      resolveLocalBffBaseUrl({
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).resolves.toEqual({
      baseUrl: 'http://localhost:8787',
      source: 'autodiscovered',
      checkedUrls: ['http://127.0.0.1:8787', 'http://localhost:8787'],
    });
  });

  it('keeps a manual BFF override authoritative when it is unreachable', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      return {
        ok: url === 'http://127.0.0.1:8787/health',
      } as Response;
    });

    await expect(
      resolveLocalBffBaseUrl({
        configuredBaseUrl: 'http://localhost:9999',
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).resolves.toEqual({
      source: 'none',
      checkedUrls: ['http://localhost:9999'],
      error: 'manual_unreachable',
    });
  });
});
