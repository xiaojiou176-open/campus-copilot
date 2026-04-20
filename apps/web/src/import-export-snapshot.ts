import type { ExportArtifact, ExportPackagingMetadata, ExportScopeMetadata } from '@campus-copilot/exporter';
import type { ImportedWorkbenchSnapshot } from '@campus-copilot/storage';

export interface ImportedArtifactEnvelope {
  title?: string;
  generatedAt: string;
  scope?: ExportScopeMetadata;
  packaging?: ExportPackagingMetadata;
}

type ImportedPackagingRecord = Partial<ExportPackagingMetadata> & {
  authorization_level?: ExportPackagingMetadata['authorizationLevel'];
  ai_allowed?: ExportPackagingMetadata['aiAllowed'];
  risk_label?: ExportPackagingMetadata['riskLabel'];
  match_confidence?: ExportPackagingMetadata['matchConfidence'];
  provenance?: ExportPackagingMetadata['provenance'];
};

export const DEMO_IMPORTED_SNAPSHOT: ImportedWorkbenchSnapshot = {
  generatedAt: '2026-04-17T09:00:00-07:00',
  planningSubstrates: [
    {
      id: 'planning-substrate:myplan:cse312',
      source: 'myplan',
      fit: 'derived_planning_substrate',
      readOnly: true,
      capturedAt: '2026-04-17T08:58:00-07:00',
      planId: 'myplan:cse312',
      planLabel: 'MyPlan · CSE 312 path',
      lastUpdatedAt: '2026-04-17T08:58:00-07:00',
      termCount: 3,
      plannedCourseCount: 4,
      backupCourseCount: 1,
      scheduleOptionCount: 2,
      requirementGroupCount: 6,
      programExplorationCount: 1,
      degreeProgressSummary: 'Degree requirements are visible in this desk as a review summary with planned next-quarter context.',
      transferPlanningSummary: 'Transfer and prerequisite notes stay visible without opening a separate planning tool.',
      currentStage: 'Spring planning review',
      runtimePosture: 'read-only planning summary',
      currentTruth: 'MyPlan planning and audit context are already visible in the same local workspace.',
      exactBlockers: [],
      hardDeferredMoves: [],
      terms: [
        {
          termCode: '2026-sp',
          termLabel: 'Spring 2026',
          plannedCourseCount: 2,
          backupCourseCount: 0,
          scheduleOptionCount: 1,
          summary: 'Current-quarter plan with one alternate section still under review.',
        },
        {
          termCode: '2026-su',
          termLabel: 'Summer 2026',
          plannedCourseCount: 1,
          backupCourseCount: 1,
          scheduleOptionCount: 0,
          summary: 'One planned summer course plus one backup path.',
        },
        {
          termCode: '2026-au',
          termLabel: 'Autumn 2026',
          plannedCourseCount: 1,
          backupCourseCount: 0,
          scheduleOptionCount: 1,
          summary: 'Early autumn planning stays visible with a fallback option.',
        },
      ],
    },
  ],
  resources: [
    {
      id: 'edstem:resource:guide-1',
      kind: 'resource',
      site: 'edstem',
      source: {
        site: 'edstem',
        resourceId: 'guide-1',
        resourceType: 'resource',
        url: 'https://edstem.org/us/courses/11/resources',
      },
      url: 'https://edstem.org/us/courses/11/resources',
      courseId: 'edstem:course:cse312',
      resourceKind: 'file',
      title: 'Week 8 review sheet',
      summary: 'Homework',
      detail: 'PDF · 452 KB',
      fileExtension: '.pdf',
      sizeBytes: 452000,
      releasedAt: '2026-04-02T09:00:00-07:00'
    }
  ],
  assignments: [
    {
      id: 'canvas:assignment:hw5',
      kind: 'assignment',
      site: 'canvas',
      source: {
        site: 'canvas',
        resourceId: 'hw5',
        resourceType: 'assignment',
        url: 'https://canvas.example.edu/courses/42/assignments/hw5',
      },
      url: 'https://canvas.example.edu/courses/42/assignments/hw5',
      courseId: 'canvas:course:cse142',
      title: 'Homework 5',
      summary: 'Submitted · 92 / 100',
      dueAt: '2026-04-18T23:59:00-07:00',
      submittedAt: '2026-04-17T18:22:00-07:00',
      status: 'submitted',
      score: 92,
      maxScore: 100,
    },
    {
      id: 'gradescope:assignment:ps3',
      kind: 'assignment',
      site: 'gradescope',
      source: {
        site: 'gradescope',
        resourceId: 'ps3',
        resourceType: 'assignment',
        url: 'https://www.gradescope.com/courses/17/assignments/ps3',
      },
      url: 'https://www.gradescope.com/courses/17/assignments/ps3',
      courseId: 'gradescope:course:cse312',
      title: 'Problem Set 3',
      summary: 'CSE 312 · Graded 18 / 20',
      detail: 'Q1 8 / 10 · Logic proof; Q2 10 / 10 · Correct',
      dueAt: '2026-04-19T17:00:00-07:00',
      status: 'graded',
      score: 18,
      maxScore: 20,
    }
  ],
  announcements: [
    {
      id: 'canvas:announcement:milestone',
      kind: 'announcement',
      site: 'canvas',
      source: {
        site: 'canvas',
        resourceId: 'milestone',
        resourceType: 'announcement',
        url: 'https://canvas.example.edu/courses/42/discussion_topics/77',
      },
      url: 'https://canvas.example.edu/courses/42/discussion_topics/77',
      courseId: 'canvas:course:cse142',
      title: 'Milestone update',
      summary: 'Milestones and acceptance criteria were updated this week.',
      postedAt: '2026-04-17T08:15:00-07:00',
    }
  ],
  messages: [
    {
      id: 'edstem:message:office-hours',
      kind: 'message',
      site: 'edstem',
      source: {
        site: 'edstem',
        resourceId: 'office-hours',
        resourceType: 'thread',
        url: 'https://edstem.org/us/courses/11/discussion/office-hours',
      },
      url: 'https://edstem.org/us/courses/11/discussion/office-hours',
      courseId: 'edstem:course:cse312',
      messageKind: 'thread',
      threadId: 'office-hours',
      title: 'Office hours follow-up',
      summary: 'General / Logistics · Staff posted the updated review checklist.',
      category: 'General',
      subcategory: 'Logistics',
      createdAt: '2026-04-17T07:40:00-07:00',
      updatedAt: '2026-04-17T08:10:00-07:00',
      instructorAuthored: true,
      unread: true,
    }
  ],
  grades: [
    {
      id: 'gradescope:grade:ps3',
      kind: 'grade',
      site: 'gradescope',
      source: {
        site: 'gradescope',
        resourceId: 'ps3',
        resourceType: 'grade',
        url: 'https://www.gradescope.com/courses/17/assignments/ps3/submissions/99',
      },
      url: 'https://www.gradescope.com/courses/17/assignments/ps3/submissions/99',
      courseId: 'gradescope:course:cse312',
      assignmentId: 'gradescope:assignment:ps3',
      title: 'Problem Set 3',
      score: 18,
      maxScore: 20,
      gradedAt: '2026-04-17T08:35:00-07:00',
      releasedAt: '2026-04-17T08:35:00-07:00',
    }
  ],
  events: [
    {
      id: 'myuw:event:cse312-lecture',
      kind: 'event',
      site: 'myuw',
      source: {
        site: 'myuw',
        resourceId: 'cse312-lecture',
        resourceType: 'schedule_meeting',
        url: 'https://canvas.uw.edu/courses/1883261',
      },
      url: 'https://canvas.uw.edu/courses/1883261',
      courseId: 'myuw:course:cse312a',
      eventKind: 'class',
      title: 'CSE 312 A lecture',
      summary: 'FOUNDATIONS COMP II',
      location: 'Kane Hall · KNE · 110',
      startAt: '2026-04-18T09:30:00-07:00',
      endAt: '2026-04-18T10:20:00-07:00',
      detail: 'lecture · Kane Hall · KNE · 110',
    },
    {
      id: 'myuw:event:cse312-final',
      kind: 'event',
      site: 'myuw',
      source: {
        site: 'myuw',
        resourceId: 'cse312-final',
        resourceType: 'schedule_final_exam',
        url: 'https://canvas.uw.edu/courses/1883261',
      },
      url: 'https://canvas.uw.edu/courses/1883261',
      courseId: 'myuw:course:cse312a',
      eventKind: 'exam',
      title: 'CSE 312 A final exam',
      summary: 'FOUNDATIONS COMP II',
      location: 'Kane Hall · KNE · 110',
      startAt: '2026-06-12T08:30:00-07:00',
      endAt: '2026-06-12T10:20:00-07:00',
      detail: 'final exam · Kane Hall · KNE · 110',
    }
  ],
  syncRuns: [
    {
      id: 'sync-run:canvas:1',
      site: 'canvas',
      status: 'success',
      outcome: 'success',
      startedAt: '2026-04-17T08:00:00-07:00',
      completedAt: '2026-04-17T08:02:00-07:00',
      changeCount: 3,
    },
    {
      id: 'sync-run:gradescope:1',
      site: 'gradescope',
      status: 'success',
      outcome: 'success',
      startedAt: '2026-04-17T08:05:00-07:00',
      completedAt: '2026-04-17T08:06:00-07:00',
      changeCount: 2,
    },
    {
      id: 'sync-run:edstem:1',
      site: 'edstem',
      status: 'success',
      outcome: 'success',
      startedAt: '2026-04-17T08:08:00-07:00',
      completedAt: '2026-04-17T08:09:00-07:00',
      changeCount: 1,
    },
    {
      id: 'sync-run:myuw:1',
      site: 'myuw',
      status: 'success',
      outcome: 'success',
      startedAt: '2026-04-17T08:10:00-07:00',
      completedAt: '2026-04-17T08:12:00-07:00',
      changeCount: 2,
    }
  ],
  changeEvents: [
    {
      id: 'change-event:canvas:hw5',
      runId: 'sync-run:canvas:1',
      site: 'canvas',
      changeType: 'status_changed',
      occurredAt: '2026-04-17T08:02:00-07:00',
      title: 'Homework 5 status changed',
      summary: 'Submitted draft is already in Canvas.',
      entityId: 'canvas:assignment:hw5',
    },
    {
      id: 'change-event:edstem:office-hours',
      runId: 'sync-run:edstem:1',
      site: 'edstem',
      changeType: 'message_unread',
      occurredAt: '2026-04-17T08:09:00-07:00',
      title: 'New EdStem update',
      summary: 'Staff posted the updated review checklist.',
      entityId: 'edstem:message:office-hours',
    }
  ],
};

function toImportedWorkbenchSnapshot(
  generatedAt: string,
  snapshot: Partial<ImportedWorkbenchSnapshot>,
): ImportedWorkbenchSnapshot {
  return {
    generatedAt,
    resources: snapshot.resources,
    assignments: snapshot.assignments,
    announcements: snapshot.announcements,
    messages: snapshot.messages,
    grades: snapshot.grades,
    events: snapshot.events,
    syncRuns: snapshot.syncRuns,
    changeEvents: snapshot.changeEvents,
  };
}

function normalizeImportedPackaging(packaging: ImportedPackagingRecord | undefined): ExportPackagingMetadata | undefined {
  if (!packaging) {
    return undefined;
  }

  const authorizationLevel = packaging.authorizationLevel ?? packaging.authorization_level;
  const aiAllowed = packaging.aiAllowed ?? packaging.ai_allowed;
  const riskLabel = packaging.riskLabel ?? packaging.risk_label;
  const matchConfidence = packaging.matchConfidence ?? packaging.match_confidence;
  const provenance = packaging.provenance;

  if (
    authorizationLevel == null ||
    aiAllowed == null ||
    riskLabel == null ||
    matchConfidence == null ||
    provenance == null
  ) {
    return undefined;
  }

  return {
    authorizationLevel,
    aiAllowed,
    riskLabel,
    matchConfidence,
    provenance,
  };
}

export function parseImportedSnapshotArtifact(raw: string): {
  snapshot: ImportedWorkbenchSnapshot;
  envelope?: ImportedArtifactEnvelope;
} {
  const parsed = JSON.parse(raw) as {
    generatedAt?: string;
    title?: string;
    scope?: ExportScopeMetadata;
    packaging?: ImportedPackagingRecord;
    data?: Partial<ImportedWorkbenchSnapshot>;
  } & Partial<ImportedWorkbenchSnapshot>;

  if (parsed.data && typeof parsed.data === 'object') {
    const generatedAt = parsed.generatedAt ?? parsed.data.generatedAt ?? new Date().toISOString();
    const packaging = normalizeImportedPackaging(parsed.packaging);
    return {
      snapshot: toImportedWorkbenchSnapshot(generatedAt, parsed.data),
      envelope:
        parsed.scope || packaging
          ? {
              title: parsed.title,
              generatedAt,
              scope: parsed.scope,
              packaging,
            }
          : undefined,
    };
  }

  return {
    snapshot: toImportedWorkbenchSnapshot(parsed.generatedAt ?? new Date().toISOString(), parsed),
  };
}

export function snapshotFromImportedJson(raw: string): ImportedWorkbenchSnapshot {
  return parseImportedSnapshotArtifact(raw).snapshot;
}

export function applyImportedEnvelopeToArtifact(
  artifact: ExportArtifact,
  envelope: ImportedArtifactEnvelope | undefined,
): ExportArtifact {
  if (!envelope) {
    return artifact;
  }

  return {
    ...artifact,
    scope: envelope.scope ?? artifact.scope,
    packaging: envelope.packaging ?? artifact.packaging,
  };
}
