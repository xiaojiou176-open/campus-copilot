import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function stripOuterQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseDotenvEntries(content) {
  const entries = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    let value = match[2] ?? '';

    if (!value.startsWith('"') && !value.startsWith("'")) {
      const inlineCommentIndex = value.indexOf(' #');
      if (inlineCommentIndex >= 0) {
        value = value.slice(0, inlineCommentIndex);
      }
    }

    value = stripOuterQuotes(value.trim())
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');

    entries.push([key, value]);
  }

  return entries;
}

export function loadRepoEnv(envPath = resolve(process.cwd(), '.env')) {
  if (!existsSync(envPath)) {
    return [];
  }

  const entries = parseDotenvEntries(readFileSync(envPath, 'utf8'));
  for (const [key, value] of entries) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
  return entries;
}

async function main() {
  const [targetScript, ...forwardArgs] = process.argv.slice(2);

  if (!targetScript) {
    console.error('Usage: node scripts/run-node-with-env.mjs <script> [args...]');
    process.exit(1);
  }

  loadRepoEnv();

  const resolvedScript = resolve(process.cwd(), targetScript);
  process.argv = [process.argv0, resolvedScript, ...forwardArgs];

  await import(pathToFileURL(resolvedScript).href);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
