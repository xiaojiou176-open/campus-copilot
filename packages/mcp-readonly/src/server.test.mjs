import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSiteServer } from './server.mjs';

test('site MCP overview reflects site-filtered snapshot counts', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'campus-mcp-'));
  const file = join(dir, 'snapshot.json');
  writeFileSync(
    file,
    JSON.stringify({
      generatedAt: '2026-04-03T12:00:00-07:00',
      assignments: [
        {
          id: 'canvas:assignment:1',
          kind: 'assignment',
          site: 'canvas',
          source: { site: 'canvas', resourceId: '1', resourceType: 'assignment' },
          title: 'Homework',
          status: 'todo',
        },
      ],
      messages: [
        {
          id: 'canvas:message:1',
          kind: 'message',
          site: 'canvas',
          source: { site: 'canvas', resourceId: '1', resourceType: 'message' },
          messageKind: 'thread',
          title: 'Inbox',
        },
      ],
    }),
    'utf8',
  );

  const server = createSiteServer('canvas', file);
  const toolList = await server.request(
    {
      method: 'tools/list',
      params: {},
    },
    undefined,
  );
  const overview = await server.request(
    {
      method: 'tools/call',
      params: {
        name: 'get_site_overview',
        arguments: {},
      },
    },
    undefined,
  );

  rmSync(dir, { recursive: true, force: true });
  assert.equal(toolList.tools.length, 4);
  const parsed = JSON.parse(overview.content[0].text);
  assert.equal(parsed.counts.assignments, 1);
  assert.equal(parsed.counts.messages, 1);
});
