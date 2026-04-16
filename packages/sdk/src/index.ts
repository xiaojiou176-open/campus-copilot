import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  AiCitationCoverageSchema,
  AiStructuredAnswerSchema,
  ProviderIdSchema,
  SwitchyardLaneSchema,
  SwitchyardRuntimeProviderSchema,
  type AiStructuredAnswer,
  type ChatMessage,
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
import {
  createExportArtifact,
  type ExportArtifact,
  type ExportFormat,
  type ExportInput,
  type ExportPreset,
} from '@campus-copilot/exporter';
import {
  AnnouncementSchema,
  AssignmentSchema,
  EventSchema,
  GradeSchema,
  IsoDateTimeSchema,
  MessageSchema,
  ResourceSchema,
  type Announcement,
  type Assignment,
  type Event,
  type Grade,
  type Message,
  type Resource,
  type Site,
} from '@campus-copilot/schema';
import {
  PlanningSubstrateOwnerSchema,
  type ChangeEvent,
  type ImportedWorkbenchSnapshot,
  type SyncRun,
} from '@campus-copilot/storage';
export type { ImportedWorkbenchSnapshot } from '@campus-copilot/storage';

export const SnapshotSiteSchema = z.enum(['all', 'canvas', 'gradescope', 'edstem', 'myuw', 'time-schedule', 'course-sites']);
export type SnapshotSite = z.infer<typeof SnapshotSiteSchema>;

export const CampusClientProviderSchema = z.union([ProviderIdSchema, z.literal('auto')]);
export type CampusClientProvider = z.infer<typeof CampusClientProviderSchema>;

export const DefaultDirectModels = {
  openai: 'gpt-4.1-mini',
  gemini: 'gemini-2.5-flash',
} as const satisfies Record<Exclude<ProviderId, 'switchyard'>, string>;

export const DefaultSwitchyardConfig = {
  model: 'gpt-5',
  provider: 'chatgpt',
  lane: 'web',
} as const satisfies {
  model: string;
  provider: SwitchyardRuntimeProvider;
  lane: SwitchyardLane;
};

export const CAMPUS_PROVIDER_PRIORITY = ['switchyard', 'gemini', 'openai'] as const satisfies readonly ProviderId[];

const CampusHealthResponseSchema = z
  .object({
    requestId: z.string().min(1),
    ok: z.boolean(),
    service: z.string().min(1),
    mode: z.string().min(1),
  })
  .strict();

const CampusProviderReadinessSchema = z
  .object({
    ready: z.boolean(),
    reason: z.string().min(1),
  })
  .strict();

export const CampusProviderStatusResponseSchema = z
  .object({
    requestId: z.string().min(1),
    ok: z.boolean(),
    providers: z
      .object({
        openai: CampusProviderReadinessSchema,
        gemini: CampusProviderReadinessSchema,
        switchyard: CampusProviderReadinessSchema,
      })
      .strict(),
  })
  .strict();

export const CampusChatResponseSchema = z
  .object({
    requestId: z.string().min(1).optional(),
    ok: z.boolean().optional(),
    provider: z.enum(['openai', 'gemini', 'switchyard']).optional(),
    runtimeProvider: SwitchyardRuntimeProviderSchema.optional(),
    lane: SwitchyardLaneSchema.optional(),
    forwardedStatus: z.number().int().optional(),
    answerText: z.string().optional(),
    structuredAnswer: AiStructuredAnswerSchema.optional(),
    citationCoverage: AiCitationCoverageSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

type CampusHealthResponse = z.infer<typeof CampusHealthResponseSchema>;
export type CampusProviderStatusResponse = z.infer<typeof CampusProviderStatusResponseSchema>;
export type CampusProviderStatusMap = CampusProviderStatusResponse['providers'];
export type CampusChatResponse = z.infer<typeof CampusChatResponseSchema> & {
  resolvedProvider?: ProviderId;
};

const ImportedWorkbenchSnapshotSchema = z
  .object({
    generatedAt: IsoDateTimeSchema,
    planningSubstrates: z.array(PlanningSubstrateOwnerSchema).optional(),
    resources: z.array(ResourceSchema).optional(),
    assignments: z.array(AssignmentSchema).optional(),
    announcements: z.array(AnnouncementSchema).optional(),
    messages: z.array(MessageSchema).optional(),
    grades: z.array(GradeSchema).optional(),
    events: z.array(EventSchema).optional(),
    syncRuns: z.array(z.unknown()).optional(),
    changeEvents: z.array(z.unknown()).optional(),
  })
  .strict();

export interface CampusSnapshotSiteView {
  site: Site;
  generatedAt: string;
  counts: {
    resources: number;
    assignments: number;
    announcements: number;
    messages: number;
    grades: number;
    events: number;
  };
  resources: Resource[];
  assignments: Assignment[];
  announcements: Announcement[];
  messages: Message[];
  grades: Grade[];
  events: Event[];
}

export interface CampusChatRequestInput {
  provider?: CampusClientProvider;
  model?: string;
  messages: ChatMessage[];
  switchyardProvider?: SwitchyardRuntimeProvider;
  switchyardLane?: SwitchyardLane;
}

function normalizeImportedWorkbenchSnapshot(
  input: Partial<ImportedWorkbenchSnapshot> & { generatedAt?: string },
): ImportedWorkbenchSnapshot {
  return ImportedWorkbenchSnapshotSchema.parse({
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    planningSubstrates: input.planningSubstrates ?? [],
    resources: input.resources ?? [],
    assignments: input.assignments ?? [],
    announcements: input.announcements ?? [],
    messages: input.messages ?? [],
    grades: input.grades ?? [],
    events: input.events ?? [],
    syncRuns: input.syncRuns ?? [],
    changeEvents: input.changeEvents ?? [],
  }) as ImportedWorkbenchSnapshot;
}

function filterBySite<T extends { site: Site }>(items: T[] | undefined, site: SnapshotSite) {
  if (site === 'all') {
    return [...(items ?? [])];
  }
  return (items ?? []).filter((item) => item.site === site);
}

export function parseImportedWorkbenchSnapshot(raw: string): ImportedWorkbenchSnapshot {
  const parsed = JSON.parse(raw) as {
    generatedAt?: string;
    data?: Partial<ImportedWorkbenchSnapshot>;
  } & Partial<ImportedWorkbenchSnapshot>;

  if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
    return normalizeImportedWorkbenchSnapshot({
      generatedAt: parsed.generatedAt ?? parsed.data.generatedAt,
      planningSubstrates: parsed.data.planningSubstrates,
      resources: parsed.data.resources,
      assignments: parsed.data.assignments,
      announcements: parsed.data.announcements,
      messages: parsed.data.messages,
      grades: parsed.data.grades,
      events: parsed.data.events,
      syncRuns: parsed.data.syncRuns,
      changeEvents: parsed.data.changeEvents,
    });
  }

  return normalizeImportedWorkbenchSnapshot({
    generatedAt: parsed.generatedAt,
    planningSubstrates: parsed.planningSubstrates,
    resources: parsed.resources,
    assignments: parsed.assignments,
    announcements: parsed.announcements,
    messages: parsed.messages,
    grades: parsed.grades,
    events: parsed.events,
    syncRuns: parsed.syncRuns,
    changeEvents: parsed.changeEvents,
  });
}

export async function readImportedWorkbenchSnapshot(snapshotPath: string) {
  const raw = await readFile(resolve(snapshotPath), 'utf8');
  return parseImportedWorkbenchSnapshot(raw);
}

export function resolveSwitchyardFirstProvider(providers: CampusProviderStatusMap): ProviderId | undefined {
  return CAMPUS_PROVIDER_PRIORITY.find((provider) => providers[provider].ready);
}

export function buildSnapshotSiteView(
  snapshot: ImportedWorkbenchSnapshot,
  site: Site,
  limit = 50,
): CampusSnapshotSiteView {
  return {
    site,
    generatedAt: snapshot.generatedAt,
    counts: {
      resources: filterBySite(snapshot.resources, site).length,
      assignments: filterBySite(snapshot.assignments, site).length,
      announcements: filterBySite(snapshot.announcements, site).length,
      messages: filterBySite(snapshot.messages, site).length,
      grades: filterBySite(snapshot.grades, site).length,
      events: filterBySite(snapshot.events, site).length,
    },
    resources: filterBySite(snapshot.resources, site).slice(0, limit),
    assignments: filterBySite(snapshot.assignments, site).slice(0, limit),
    announcements: filterBySite(snapshot.announcements, site).slice(0, limit),
    messages: filterBySite(snapshot.messages, site).slice(0, limit),
    grades: filterBySite(snapshot.grades, site).slice(0, limit),
    events: filterBySite(snapshot.events, site).slice(0, limit),
  };
}

export function buildExportInputFromSnapshot(
  snapshot: ImportedWorkbenchSnapshot,
  site: SnapshotSite = 'all',
): ExportInput {
  const siteLabel = site === 'all' ? 'All sites' : site;
  return {
    generatedAt: snapshot.generatedAt,
    viewTitle: `Campus Copilot snapshot (${siteLabel})`,
    planningSubstrates: snapshot.planningSubstrates ?? [],
    resources: filterBySite(snapshot.resources, site),
    assignments: filterBySite(snapshot.assignments, site),
    announcements: filterBySite(snapshot.announcements, site),
    messages: filterBySite(snapshot.messages, site),
    grades: filterBySite(snapshot.grades, site),
    events: filterBySite(snapshot.events, site),
    syncRuns: (snapshot.syncRuns ?? []) as SyncRun[],
    changeEvents: (snapshot.changeEvents ?? []) as ChangeEvent[],
  };
}

export function createExportArtifactFromSnapshot(input: {
  snapshot: ImportedWorkbenchSnapshot;
  preset: ExportPreset;
  format: ExportFormat;
  site?: SnapshotSite;
}): ExportArtifact {
  return createExportArtifact({
    preset: input.preset,
    format: input.format,
    input: buildExportInputFromSnapshot(input.snapshot, input.site ?? 'all'),
  });
}

export class CampusCopilotClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(input?: { baseUrl?: string; fetchImpl?: typeof fetch }) {
    this.baseUrl = (input?.baseUrl ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
    this.fetchImpl = input?.fetchImpl ?? fetch;
  }

  private async requestJson(path: string, init?: RequestInit) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    const raw = (await response.json()) as unknown;
    return {
      ok: response.ok,
      status: response.status,
      raw,
    };
  }

  async getHealth(): Promise<CampusHealthResponse> {
    const result = await this.requestJson('/health');
    return CampusHealthResponseSchema.parse(result.raw);
  }

  async getProviderStatus(): Promise<CampusProviderStatusResponse> {
    const result = await this.requestJson('/api/providers/status');
    return CampusProviderStatusResponseSchema.parse(result.raw);
  }

  async chat(input: CampusChatRequestInput): Promise<CampusChatResponse> {
    const provider = input.provider ?? 'auto';
    const resolvedProvider =
      provider === 'auto'
        ? resolveSwitchyardFirstProvider((await this.getProviderStatus()).providers)
        : provider;

    if (!resolvedProvider) {
      return {
        ok: false,
        error: 'no_provider_ready',
      };
    }

    if (resolvedProvider === 'switchyard') {
      const result = await this.requestJson('/api/providers/switchyard/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          provider: input.switchyardProvider ?? DefaultSwitchyardConfig.provider,
          model: input.model ?? DefaultSwitchyardConfig.model,
          messages: input.messages,
          lane: input.switchyardLane ?? DefaultSwitchyardConfig.lane,
        }),
      });

      return {
        ...CampusChatResponseSchema.parse(result.raw),
        resolvedProvider,
      };
    }

    const route =
      resolvedProvider === 'openai' ? '/api/providers/openai/chat' : '/api/providers/gemini/chat';
    const model =
      input.model ??
      (resolvedProvider === 'openai' ? DefaultDirectModels.openai : DefaultDirectModels.gemini);
    const result = await this.requestJson(route, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        provider: resolvedProvider,
        model,
        messages: input.messages,
      }),
    });

    return {
      ...CampusChatResponseSchema.parse(result.raw),
      resolvedProvider,
    };
  }
}

export { CampusCopilotApiClient } from './api.ts';
export { buildWorkspaceSummary, loadImportedSnapshotFile, parseImportedSnapshot } from './snapshot.ts';
export {
  getCanvasAssignments,
  getEdStemMessages,
  getGradescopeAssignments,
  getMyUwEvents,
  getSiteRecords,
} from './sites.ts';
