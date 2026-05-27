import { readFileSync } from 'node:fs';
import { z } from 'zod';
import {
  AnnouncementSchema,
  AssignmentSchema,
  EntityKindSchema,
  EventSchema,
  GradeSchema,
  IsoDateTimeSchema,
  MessageSchema,
  ResourceSchema,
  SiteSchema,
  type Announcement,
  type Assignment,
  type Event,
  type Grade,
  type Message,
  type Resource,
  type Site,
} from '@campus-copilot/schema';
import { PlanningSubstrateOwnerSchema } from '@campus-copilot/storage/contracts';

const SyncRunSchema = z
  .object({
    id: z.string().min(1),
    site: SiteSchema,
    status: z.string().min(1),
    outcome: z.string().min(1),
    startedAt: IsoDateTimeSchema,
    completedAt: IsoDateTimeSchema,
    changeCount: z.number().int().nonnegative(),
    errorReason: z.string().min(1).optional(),
  })
  .strict();

const ChangeEventSchema = z
  .object({
    id: z.string().min(1),
    runId: z.string().min(1),
    site: SiteSchema,
    changeType: z.string().min(1),
    occurredAt: IsoDateTimeSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    entityId: z.string().min(1).optional(),
    entityKind: EntityKindSchema.optional(),
  })
  .strict();

export const ImportedWorkbenchSnapshotSchema = z
  .object({
    generatedAt: IsoDateTimeSchema,
    planningSubstrates: z.array(PlanningSubstrateOwnerSchema).default([]),
    resources: z.array(ResourceSchema).default([]),
    assignments: z.array(AssignmentSchema).default([]),
    announcements: z.array(AnnouncementSchema).default([]),
    messages: z.array(MessageSchema).default([]),
    grades: z.array(GradeSchema).default([]),
    events: z.array(EventSchema).default([]),
    syncRuns: z.array(SyncRunSchema).default([]),
    changeEvents: z.array(ChangeEventSchema).default([]),
  })
  .strict();

export type ImportedWorkbenchSnapshot = z.infer<typeof ImportedWorkbenchSnapshotSchema>;

export interface WorkspaceSummary {
  generatedAt: string;
  totals: {
    resources: number;
    assignments: number;
    announcements: number;
    messages: number;
    grades: number;
    events: number;
    syncRuns: number;
    changeEvents: number;
  };
  bySite: Record<
    Site,
    {
      resources: number;
      assignments: number;
      announcements: number;
      messages: number;
      grades: number;
      events: number;
    }
  >;
}

export interface SiteSnapshotView {
  site: Site;
  resources: Resource[];
  assignments: Assignment[];
  announcements: Announcement[];
  messages: Message[];
  grades: Grade[];
  events: Event[];
}

function emptySiteCounts() {
  return {
    resources: 0,
    assignments: 0,
    announcements: 0,
    messages: 0,
    grades: 0,
    events: 0,
  };
}

export function parseImportedSnapshot(raw: string | unknown): ImportedWorkbenchSnapshot {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (parsed && typeof parsed === 'object' && 'data' in parsed && parsed.data && typeof parsed.data === 'object') {
    const envelope = parsed as {
      generatedAt?: string;
      data: Partial<ImportedWorkbenchSnapshot>;
    };

    return ImportedWorkbenchSnapshotSchema.parse({
      generatedAt: envelope.generatedAt ?? envelope.data.generatedAt ?? new Date().toISOString(),
      ...envelope.data,
    });
  }

  return ImportedWorkbenchSnapshotSchema.parse(parsed);
}

export function loadImportedSnapshotFile(snapshotPath: string): ImportedWorkbenchSnapshot {
  return parseImportedSnapshot(readFileSync(snapshotPath, 'utf8'));
}

export function buildWorkspaceSummary(snapshot: ImportedWorkbenchSnapshot): WorkspaceSummary {
  const bySite: WorkspaceSummary['bySite'] = {
    canvas: emptySiteCounts(),
    gradescope: emptySiteCounts(),
    edstem: emptySiteCounts(),
    myuw: emptySiteCounts(),
    'time-schedule': emptySiteCounts(),
    'course-sites': emptySiteCounts(),
  };

  for (const assignment of snapshot.assignments) bySite[assignment.site].assignments += 1;
  for (const resource of snapshot.resources) bySite[resource.site].resources += 1;
  for (const announcement of snapshot.announcements) bySite[announcement.site].announcements += 1;
  for (const message of snapshot.messages) bySite[message.site].messages += 1;
  for (const grade of snapshot.grades) bySite[grade.site].grades += 1;
  for (const event of snapshot.events) bySite[event.site].events += 1;

  return {
    generatedAt: snapshot.generatedAt,
    totals: {
      resources: snapshot.resources.length,
      assignments: snapshot.assignments.length,
      announcements: snapshot.announcements.length,
      messages: snapshot.messages.length,
      grades: snapshot.grades.length,
      events: snapshot.events.length,
      syncRuns: snapshot.syncRuns.length,
      changeEvents: snapshot.changeEvents.length,
    },
    bySite,
  };
}

export function selectSiteSnapshot(snapshot: ImportedWorkbenchSnapshot, site: Site): SiteSnapshotView {
  return {
    site,
    resources: snapshot.resources.filter((item) => item.site === site),
    assignments: snapshot.assignments.filter((item) => item.site === site),
    announcements: snapshot.announcements.filter((item) => item.site === site),
    messages: snapshot.messages.filter((item) => item.site === site),
    grades: snapshot.grades.filter((item) => item.site === site),
    events: snapshot.events.filter((item) => item.site === site),
  };
}
