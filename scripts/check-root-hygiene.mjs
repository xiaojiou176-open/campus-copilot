import { existsSync, readFileSync, readdirSync } from 'node:fs';

const allowlistPath = 'policies/root-allowlist.txt';

function loadAllowlist(path) {
  if (!existsSync(path)) {
    throw new Error(`missing_root_allowlist:${path}`);
  }

  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function toPattern(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

const allowlistPatterns = loadAllowlist(allowlistPath).map(toPattern);
const rootEntries = readdirSync('.', { encoding: 'utf8' });
const failures = [];

for (const entry of rootEntries) {
  const allowed = allowlistPatterns.some((pattern) => pattern.test(entry));
  if (!allowed) {
    failures.push(`unexpected_root_entry:${entry}`);
  }
}

const nestedNoisePaths = [
  '.DS_Store',
  'apps/.DS_Store',
  'docs/.DS_Store',
  'packages/.DS_Store',
];

for (const path of nestedNoisePaths) {
  if (existsSync(path)) {
    failures.push(`forbidden_root_noise:${path}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('root_hygiene_ok');
