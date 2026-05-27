import {
  CampusCopilotClient,
  buildWorkspaceSummary,
  parseImportedSnapshot,
  loadImportedSnapshotFile,
} from '@campus-copilot/sdk';
import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

function getSiteRecords(snapshot, site) {
  const bySite = (entry) => entry.site === site;
  return {
    generatedAt: snapshot.generatedAt,
    site,
    counts: {
      assignments: (snapshot.assignments ?? []).filter(bySite).length,
      announcements: (snapshot.announcements ?? []).filter(bySite).length,
      messages: (snapshot.messages ?? []).filter(bySite).length,
      grades: (snapshot.grades ?? []).filter(bySite).length,
      events: (snapshot.events ?? []).filter(bySite).length,
    },
    assignments: (snapshot.assignments ?? []).filter(bySite),
    announcements: (snapshot.announcements ?? []).filter(bySite),
    messages: (snapshot.messages ?? []).filter(bySite),
    grades: (snapshot.grades ?? []).filter(bySite),
    events: (snapshot.events ?? []).filter(bySite),
  };
}

function createExportArtifactFromSnapshot({ snapshot, preset, format, site = 'all' }) {
  const scoped = site === 'all'
    ? snapshot
    : {
        ...snapshot,
        assignments: (snapshot.assignments ?? []).filter((item) => item.site === site),
        announcements: (snapshot.announcements ?? []).filter((item) => item.site === site),
        messages: (snapshot.messages ?? []).filter((item) => item.site === site),
        grades: (snapshot.grades ?? []).filter((item) => item.site === site),
        events: (snapshot.events ?? []).filter((item) => item.site === site),
      };

  const sections = [
    `# CampusCopilot snapshot export`,
    ``,
    `generatedAt: ${scoped.generatedAt}`,
    `preset: ${preset}`,
    `format: ${format}`,
    `site: ${site}`,
    ``,
    `assignments: ${(scoped.assignments ?? []).length}`,
    `announcements: ${(scoped.announcements ?? []).length}`,
    `messages: ${(scoped.messages ?? []).length}`,
    `grades: ${(scoped.grades ?? []).length}`,
    `events: ${(scoped.events ?? []).length}`,
  ];

  return {
    format,
    filename: `campus-copilot-${preset}.${format === 'markdown' ? 'md' : format}`,
    content: format === 'json' ? JSON.stringify(scoped, null, 2) : sections.join('\n'),
  };
}

function parseArgs(argv) {
  const [command = 'help', ...rest] = argv;
  if (command === '--help' || command === '-h') {
    return { command: 'help', flags: {}, positionals: [] };
  }
  const flags = {};
  const positionals = [];

  for (let index = 0; index < rest.length; index += 1) {
    const entry = rest[index];
    if (!entry.startsWith('--')) {
      positionals.push(entry);
      continue;
    }

    const key = entry.slice(2);
    const value = rest[index + 1] && !rest[index + 1].startsWith('--') ? rest[++index] : 'true';
    flags[key] = value;
  }

  return { command, flags, positionals };
}

function renderHelp() {
  return [
    'campus-copilot <command> [--flags]',
    '',
    'Commands:',
    '  help | --help',
    '  status [--base-url <url>]',
    '  provider-status [--base-url <url>]',
    '  summary --snapshot <path>',
    '  snapshot-summary <path> [--site <canvas|gradescope|edstem|myuw|time-schedule>]',
    '  site --snapshot <path> --site <canvas|gradescope|edstem|myuw|time-schedule>',
    '  site-summary <path> --site <canvas|gradescope|edstem|myuw|time-schedule>',
    '  snapshot site --snapshot <path> --site <canvas|gradescope|edstem|myuw|time-schedule>',
    '  snapshot export --snapshot <path> [--preset <current_view|focus_queue|weekly_load|change_journal>] [--format <markdown|json|csv|ics>] [--site <all|canvas|gradescope|edstem|myuw|time-schedule>]',
    '  ask --provider <auto|openai|gemini|switchyard> [--model <model>] --question <text> [--base-url <url>] [--switchyard-provider <name>] [--switchyard-lane <web|byok>]',
    '',
  ].join('\n');
}

function requireFlag(flags, name) {
  const value = flags[name];
  if (!value || value === 'true') {
    throw new Error(`Missing required flag --${name}`);
  }
  return value;
}

function resolveSnapshotPath(snapshotPath) {
  if (isAbsolute(snapshotPath)) {
    return snapshotPath;
  }

  const cwdResolved = resolve(process.cwd(), snapshotPath);
  if (existsSync(cwdResolved)) {
    return cwdResolved;
  }

  const repoResolved = resolve(REPO_ROOT, snapshotPath);
  if (existsSync(repoResolved)) {
    return repoResolved;
  }

  return snapshotPath;
}

export async function runCli(argv, io, fetchImpl = fetch) {
  const { command, flags, positionals } = parseArgs(argv);

  if (command === 'help') {
    io.write(`${renderHelp()}\n`);
    return 0;
  }

  if (command === 'summary' || command === 'snapshot-summary') {
    const snapshotPath =
      flags.snapshot && flags.snapshot !== 'true' ? flags.snapshot : positionals[0];
    if (!snapshotPath) {
      throw new Error('Missing required flag --snapshot or positional snapshot path');
    }
    const snapshot = loadImportedSnapshotFile(resolveSnapshotPath(snapshotPath));
    if (flags.site && flags.site !== 'true') {
      io.write(`${JSON.stringify(getSiteRecords(snapshot, flags.site), null, 2)}\n`);
      return 0;
    }
    io.write(`${JSON.stringify(buildWorkspaceSummary(snapshot), null, 2)}\n`);
    return 0;
  }

  if (command === 'site' || command === 'site-summary') {
    const snapshotPath =
      flags.snapshot && flags.snapshot !== 'true' ? flags.snapshot : positionals[0];
    if (!snapshotPath) {
      throw new Error('Missing required flag --snapshot or positional snapshot path');
    }
    const snapshot = loadImportedSnapshotFile(resolveSnapshotPath(snapshotPath));
    const site = requireFlag(flags, 'site');
    io.write(`${JSON.stringify(getSiteRecords(snapshot, site), null, 2)}\n`);
    return 0;
  }

  if (command === 'snapshot') {
    const subcommand = positionals[0];
    const snapshot = loadImportedSnapshotFile(resolveSnapshotPath(requireFlag(flags, 'snapshot')));

    if (subcommand === 'site') {
      const site = requireFlag(flags, 'site');
      io.write(`${JSON.stringify(getSiteRecords(snapshot, site), null, 2)}\n`);
      return 0;
    }

    if (subcommand === 'export') {
      const artifact = createExportArtifactFromSnapshot({
        snapshot: parseImportedSnapshot(JSON.stringify(snapshot)),
        preset: flags.preset ?? 'current_view',
        format: flags.format ?? 'markdown',
        site: flags.site ?? 'all',
      });
      io.write(`${artifact.content}\n`);
      return 0;
    }

    throw new Error(`Unknown snapshot subcommand: ${subcommand}`);
  }

  const client = new CampusCopilotClient({
    baseUrl: flags['base-url'] ?? 'http://127.0.0.1:8787',
    fetchImpl,
  });

  if (command === 'provider-status' || command === 'status') {
    io.write(`${JSON.stringify(await client.getProviderStatus(), null, 2)}\n`);
    return 0;
  }

  if (command === 'ask') {
    const response = await client.chat({
      provider: requireFlag(flags, 'provider'),
      model: flags.model && flags.model !== 'true' ? flags.model : undefined,
      messages: [{ role: 'user', content: requireFlag(flags, 'question') }],
      switchyardProvider: flags['switchyard-provider'],
      switchyardLane: flags['switchyard-lane'],
    });
    io.write(`${JSON.stringify(response, null, 2)}\n`);
    return 0;
  }

  throw new Error(`Unknown command: ${command}`);
}
