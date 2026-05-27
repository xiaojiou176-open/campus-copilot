import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CAMPUS_MCP_SERVER_TOOL_NAMES, createCampusCopilotMcpServer } from '../dist/server.mjs';

test('mcp-server registers the expected read-only tool surface', async () => {
  const server = createCampusCopilotMcpServer();
  const client = new Client({
    name: 'campus-copilot-mcp-server-test-client',
    version: '0.1.1',
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const listedTools = await client.listTools();

  assert.deepEqual(listedTools.tools.map((tool) => tool.name).sort(), [...CAMPUS_MCP_SERVER_TOOL_NAMES].sort());
  assert.equal(CAMPUS_MCP_SERVER_TOOL_NAMES.length, 9);

  await client.close();
  await server.close();
});
