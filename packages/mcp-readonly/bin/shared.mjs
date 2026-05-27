import { readFileSync } from 'node:fs';
import { runSiteServer } from '../src/server.mjs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

function usage(binaryName, site) {
  return [
    `${binaryName} starts the read-only CampusCopilot ${site} MCP sidecar.`,
    '',
    `Usage: ${binaryName} [--snapshot <path>] [--help] [--version]`,
    '',
    'Snapshot selection order:',
    '1. --snapshot <path>',
    '2. CAMPUS_COPILOT_SNAPSHOT',
    '',
    'This sidecar stays snapshot-first, local-first, and read-only.',
  ].join('\n');
}

function getOptionValue(args, optionName) {
  const optionIndex = args.indexOf(optionName);
  if (optionIndex < 0) {
    return undefined;
  }

  return args[optionIndex + 1];
}

export async function runSiteMcpBin(site) {
  const args = process.argv[2] === '--' ? process.argv.slice(3) : process.argv.slice(2);
  const binaryName = `campus-copilot-mcp-${site}`;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage(binaryName, site));
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(packageJson.version);
    process.exit(0);
  }

  const snapshotPath = getOptionValue(args, '--snapshot') ?? process.env.CAMPUS_COPILOT_SNAPSHOT;
  if (!snapshotPath) {
    console.error(`CAMPUS_COPILOT_SNAPSHOT or --snapshot is required for ${binaryName}`);
    process.exit(1);
  }

  await runSiteServer(site, snapshotPath);
}
