import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  CAMPUS_PROVIDER_PRIORITY,
  CampusClientProviderSchema,
  CampusCopilotClient,
  SnapshotSiteSchema,
  buildSnapshotSiteView,
  createExportArtifactFromSnapshot,
  readImportedWorkbenchSnapshot,
} from '@opencampus/sdk';

const SNAPSHOT_SITES = ['canvas', 'gradescope', 'edstem', 'myuw', 'time-schedule'] as const;

export const CAMPUS_MCP_SERVER_TOOL_NAMES = [
  'campus_health',
  'providers_status',
  'ask_opencampus',
  ...SNAPSHOT_SITES.map((site) => `${site}_snapshot_view`),
  'export_snapshot_artifact',
] as const;

export function createCampusCopilotMcpServer() {
  const server = new McpServer({
    name: 'opencampus-mcp',
    version: '0.1.1',
  });

  server.registerTool(
    'campus_health',
    {
      title: 'Campus health',
      description: 'Read the local Campus Copilot BFF health status.',
      inputSchema: {
        baseUrl: z.string().url().optional(),
      },
    },
    async ({ baseUrl }) => {
      const client = new CampusCopilotClient({ baseUrl });
      const health = await client.getHealth();
      return {
        content: [{ type: 'text', text: JSON.stringify(health, null, 2) }],
        structuredContent: health as Record<string, unknown>,
      };
    },
  );

  server.registerTool(
    'providers_status',
    {
      title: 'Providers status',
      description: 'Read provider readiness and the Switchyard-first priority order.',
      inputSchema: {
        baseUrl: z.string().url().optional(),
      },
    },
    async ({ baseUrl }) => {
      const client = new CampusCopilotClient({ baseUrl });
      const status = await client.getProviderStatus();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...status,
                priorityOrder: CAMPUS_PROVIDER_PRIORITY,
              },
              null,
              2,
            ),
          },
        ],
        structuredContent: {
          ...status,
          priorityOrder: CAMPUS_PROVIDER_PRIORITY,
        } as Record<string, unknown>,
      };
    },
  );

  server.registerTool(
    'ask_opencampus',
    {
      title: 'Ask Campus Copilot',
      description:
        'Send a read-only question to the local Campus Copilot BFF. Provider defaults to auto and resolves Switchyard-first when available.',
      inputSchema: {
        baseUrl: z.string().url().optional(),
        question: z.string().min(1),
        provider: CampusClientProviderSchema.optional(),
        model: z.string().min(1).optional(),
        switchyardProvider: z.enum(['chatgpt', 'gemini', 'claude', 'grok', 'qwen']).optional(),
        switchyardLane: z.enum(['web', 'byok']).optional(),
      },
    },
    async ({ baseUrl, question, provider, model, switchyardProvider, switchyardLane }) => {
      const client = new CampusCopilotClient({ baseUrl });
      const answer = await client.chat({
        provider,
        model,
        messages: [{ role: 'user', content: question }],
        switchyardProvider,
        switchyardLane,
      });
      return {
        content: [{ type: 'text', text: answer.answerText ?? JSON.stringify(answer, null, 2) }],
        structuredContent: answer as Record<string, unknown>,
      };
    },
  );

  for (const site of SNAPSHOT_SITES) {
    server.registerTool(
      `${site}_snapshot_view`,
      {
        title: `${site} snapshot view`,
        description: `Read the ${site} slice from an imported workspace snapshot without mutating local storage.`,
        inputSchema: {
          snapshotPath: z.string().min(1),
          limit: z.number().int().positive().max(100).optional(),
        },
      },
      async ({ snapshotPath, limit }) => {
        const snapshot = await readImportedWorkbenchSnapshot(snapshotPath);
        const view = buildSnapshotSiteView(snapshot, site, limit ?? 20);
        return {
          content: [{ type: 'text', text: JSON.stringify(view, null, 2) }],
          structuredContent: view as unknown as Record<string, unknown>,
        };
      },
    );
  }

  server.registerTool(
    'export_snapshot_artifact',
    {
      title: 'Export snapshot artifact',
      description: 'Build a read-only export artifact from an imported workspace snapshot.',
      inputSchema: {
        snapshotPath: z.string().min(1),
        preset: z.enum([
          'weekly_assignments',
          'recent_updates',
          'all_deadlines',
          'current_view',
          'focus_queue',
          'weekly_load',
          'change_journal',
        ]),
        format: z.enum(['json', 'csv', 'markdown', 'ics']),
        site: SnapshotSiteSchema.optional(),
      },
    },
    async ({ snapshotPath, preset, format, site }) => {
      const snapshot = await readImportedWorkbenchSnapshot(snapshotPath);
      const artifact = createExportArtifactFromSnapshot({
        snapshot,
        preset,
        format,
        site,
      });

      return {
        content: [{ type: 'text', text: artifact.content }],
        structuredContent: {
          filename: artifact.filename,
          mimeType: artifact.mimeType,
          preset: artifact.preset,
          format: artifact.format,
        } as Record<string, unknown>,
      };
    },
  );

  return server;
}
