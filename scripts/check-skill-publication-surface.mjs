import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readSkillCatalog } from './check-skill-catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fromRepoRoot = (relativePath) => path.join(repoRoot, relativePath);
const packetPath = 'skills/clawhub-submission.packet.json';

const linkedFiles = new Map([
  ['README.md', 'skills/README.md'],
  ['DISTRIBUTION.md', 'skills/clawhub-submission.packet.json'],
  ['INTEGRATIONS.md', 'skills/catalog.json'],
  ['skills/README.md', 'clawhub-submission.packet.json'],
]);

export function validateSkillPublicationSurface(catalog = readSkillCatalog()) {
  const failures = [];

  if (!existsSync(fromRepoRoot(packetPath))) {
    failures.push(`missing_skill_publication_packet:${packetPath}`);
    return failures;
  }

  const packet = readFileSync(fromRepoRoot(packetPath), 'utf8');

  const packetSnippets = [
    'manifestless-claude-layout',
    'not an upstream marketplace manifest',
    'repo-owned-clawhub-skill-submission-packet',
    '"scope": "read-only"',
  ];

  for (const snippet of packetSnippets) {
    if (!packet.includes(snippet)) {
      failures.push(`skill_publication_packet_missing_snippet:${snippet}`);
    }
  }

  if (!packet.includes(catalog.pack.version)) {
    failures.push('skill_publication_packet_missing_pack_version');
  }

  for (const skill of catalog.skills ?? []) {
    if (!packet.includes(skill.id)) {
      failures.push(`skill_publication_packet_missing_skill_id:${skill.id}`);
    }
    const skillPath = `skills/${skill.entrypoint}`;
    if (!packet.includes(skillPath)) {
      failures.push(`skill_publication_packet_missing_skill_path:${skill.id}`);
    }
  }

  for (const [relativePath, expectedLink] of linkedFiles.entries()) {
    const file = readFileSync(fromRepoRoot(relativePath), 'utf8');
    if (!file.includes(expectedLink)) {
      failures.push(`skill_publication_missing_link:${relativePath}`);
    }
  }

  return failures;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const failures = validateSkillPublicationSurface();

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log('skill_publication_surface_ok');
}
