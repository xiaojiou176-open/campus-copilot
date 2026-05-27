import { readFileSync } from 'node:fs';

function normalizeImportedSnapshot(data) {
  return {
    generatedAt:
      typeof data?.generatedAt === 'string' && data.generatedAt.length > 0
        ? data.generatedAt
        : new Date().toISOString(),
    assignments: Array.isArray(data?.assignments) ? data.assignments : [],
    announcements: Array.isArray(data?.announcements) ? data.announcements : [],
    messages: Array.isArray(data?.messages) ? data.messages : [],
    grades: Array.isArray(data?.grades) ? data.grades : [],
    events: Array.isArray(data?.events) ? data.events : [],
  };
}

export function parseImportedSnapshot(raw) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const snapshotData =
    parsed && typeof parsed === 'object' && parsed.data && typeof parsed.data === 'object'
      ? {
          ...parsed.data,
          generatedAt:
            typeof parsed.generatedAt === 'string' && parsed.generatedAt.length > 0
              ? parsed.generatedAt
              : parsed.data.generatedAt,
        }
      : parsed;

  return normalizeImportedSnapshot(snapshotData);
}

function getSiteRecords(snapshot, site) {
  const bySite = (entry) => entry.site === site;
  return {
    assignments: (snapshot.assignments ?? []).filter(bySite),
    announcements: (snapshot.announcements ?? []).filter(bySite),
    messages: (snapshot.messages ?? []).filter(bySite),
    grades: (snapshot.grades ?? []).filter(bySite),
    events: (snapshot.events ?? []).filter(bySite),
  };
}

function content(payload) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function createToolDefinitions(site) {
  return [
    {
      name: 'get_site_overview',
      description: `Return a read-only overview for ${site} from an exported CampusCopilot workspace snapshot.`,
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {},
      },
    },
    {
      name: 'list_assignments',
      description: `List read-only ${site} assignments from the snapshot.`,
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          limit: { type: 'number' },
        },
      },
    },
    {
      name: 'list_messages',
      description: `List read-only ${site} messages from the snapshot.`,
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          limit: { type: 'number' },
        },
      },
    },
    {
      name: 'list_events',
      description: `List read-only ${site} events from the snapshot.`,
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          limit: { type: 'number' },
        },
      },
    },
  ];
}

function createSiteDataset(snapshot, site) {
  const dataset = getSiteRecords(snapshot, site);
  return {
    site,
    generatedAt: snapshot.generatedAt,
    counts: {
      assignments: dataset.assignments.length,
      announcements: dataset.announcements.length,
      messages: dataset.messages.length,
      grades: dataset.grades.length,
      events: dataset.events.length,
    },
    ...dataset,
  };
}

async function handleRequest(site, dataset, message) {
  const id = message?.id ?? null;
  const method = message?.method;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: `campus-copilot-mcp-${site}`,
          version: '0.1.0',
        },
      },
    };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: createToolDefinitions(site),
      },
    };
  }

  if (method === 'tools/call') {
    const toolName = message?.params?.name;
    const limit = Number(message?.params?.arguments?.limit ?? 10);

    if (toolName === 'get_site_overview') {
      return {
        jsonrpc: '2.0',
        id,
        result: content({
          site,
          generatedAt: dataset.generatedAt,
          counts: {
            assignments: dataset.assignments.length,
            announcements: dataset.announcements.length,
            messages: dataset.messages.length,
            grades: dataset.grades.length,
            events: dataset.events.length,
          },
        }),
      };
    }

    if (toolName === 'list_assignments') {
      return {
        jsonrpc: '2.0',
        id,
        result: content(dataset.assignments.slice(0, limit)),
      };
    }

    if (toolName === 'list_messages') {
      return {
        jsonrpc: '2.0',
        id,
        result: content(dataset.messages.slice(0, limit)),
      };
    }

    if (toolName === 'list_events') {
      return {
        jsonrpc: '2.0',
        id,
        result: content(dataset.events.slice(0, limit)),
      };
    }

    throw new Error(`Unknown tool: ${toolName}`);
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`,
    },
  };
}

export function createSiteServer(site, snapshotPath) {
  const snapshot = parseImportedSnapshot(readFileSync(snapshotPath, 'utf8'));
  const dataset = createSiteDataset(snapshot, site);

  return {
    async request(message) {
      const response = await handleRequest(site, dataset, message);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.result;
    },
    async handleMessage(message) {
      return handleRequest(site, dataset, message);
    },
  };
}

function createContentLengthFrame(message) {
  const payload = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`;
}

export async function runSiteServer(site, snapshotPath) {
  const server = createSiteServer(site, snapshotPath);
  let buffer = '';

  process.stdin.setEncoding('utf8');

  process.stdin.on('data', async (chunk) => {
    buffer += chunk;

    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) {
        break;
      }

      const header = buffer.slice(0, headerEnd);
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        buffer = '';
        break;
      }

      const contentLength = Number(match[1]);
      const frameStart = headerEnd + 4;
      const frameEnd = frameStart + contentLength;
      if (buffer.length < frameEnd) {
        break;
      }

      const rawMessage = buffer.slice(frameStart, frameEnd);
      buffer = buffer.slice(frameEnd);

      const parsedMessage = JSON.parse(rawMessage);
      const response = await server.handleMessage(parsedMessage);
      process.stdout.write(createContentLengthFrame(response));
    }
  });
}
