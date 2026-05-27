import { readFileSync } from 'node:fs';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createOpenCampusMcpServer } from './server.ts';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = process.argv[2] === '--' ? process.argv.slice(3) : process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(
    [
      'opencampus-mcp starts the unified read-only OpenCampus MCP server.',
      '',
      'Usage: opencampus-mcp [--help] [--version]',
      '',
      'This server stays local-first, snapshot-first or thin-BFF-first, and read-only.',
    ].join('\n'),
  );
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log(packageJson.version);
  process.exit(0);
}

const server = createOpenCampusMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
