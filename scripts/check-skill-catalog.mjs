import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_PATH = path.join(repoRoot, 'skills/catalog.json');
const SUBMISSION_PACKET_PATH = path.join(repoRoot, 'skills/clawhub-submission.packet.json');
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const SCHEMA_VERSION_RE = /^1(\.0\.0)?$/;
const ALLOWED_CONSUMER_ROUTES = new Set([
  'claude-code',
  'claude-desktop',
  'codex',
  'openclaw-style-local-runtime',
]);

export function readSkillCatalog(catalogPath = CATALOG_PATH) {
  return JSON.parse(readFileSync(catalogPath, 'utf8'));
}

function resolveFromCatalog(relativePath) {
  return path.resolve(path.dirname(CATALOG_PATH), relativePath);
}

function toTitleCase(id) {
  return id
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    return null;
  }

  const metadata = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex <= 0) {
      return null;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    metadata[key] = value;
  }

  return metadata;
}

export function validateSkillCatalog(catalog = readSkillCatalog()) {
  const failures = [];
  const seenIds = new Set();

  if (!SCHEMA_VERSION_RE.test(catalog?.schemaVersion ?? '')) {
    failures.push('skill_catalog_invalid_schema_version');
  }

  const pack = catalog?.pack;
  if (!pack || typeof pack !== 'object') {
    failures.push('skill_catalog_missing_pack');
  } else {
    if (pack.name !== 'campus-copilot-public-skills') {
      failures.push('skill_catalog_pack_name_drift');
    }
    if (!SEMVER_RE.test(pack.version ?? '')) {
      failures.push('skill_catalog_invalid_pack_version');
    }
    if (pack.visibility !== 'repo-public') {
      failures.push('skill_catalog_visibility_drift');
    }
    if (pack.distribution !== 'local-bundle') {
      failures.push('skill_catalog_distribution_drift');
    }
    if (pack.officialListing !== 'not_listed') {
      failures.push('skill_catalog_listing_state_drift');
    }
    if (pack.scope !== 'read-only') {
      failures.push('skill_catalog_scope_drift');
    }
    if (pack.readme !== 'README.md') {
      failures.push('skill_catalog_readme_drift');
    }
    if (typeof pack.description !== 'string' || !pack.description.includes('local bundle surface')) {
      failures.push('skill_catalog_missing_truthful_description');
    }
  }

  const skills = Array.isArray(catalog?.skills) ? catalog.skills : [];
  if (skills.length === 0) {
    failures.push('skill_catalog_missing_skills');
  }

  for (const skill of skills) {
    if (typeof skill?.id !== 'string' || skill.id.length === 0) {
      failures.push('skill_catalog_skill_missing_id');
      continue;
    }
    if (seenIds.has(skill.id)) {
      failures.push(`skill_catalog_duplicate_id:${skill.id}`);
    }
    seenIds.add(skill.id);

    const expectedEntrypoint = `${skill.id}/SKILL.md`;
    if (skill.entrypoint !== expectedEntrypoint) {
      failures.push(`skill_catalog_entrypoint_drift:${skill.id}`);
    }
    const entrypointPath = resolveFromCatalog(skill.entrypoint);
    if (!existsSync(entrypointPath)) {
      failures.push(`skill_catalog_missing_entrypoint:${skill.id}`);
    } else {
      const frontmatter = parseFrontmatter(readFileSync(entrypointPath, 'utf8'));
      if (!frontmatter) {
        failures.push(`skill_catalog_missing_frontmatter:${skill.id}`);
      } else {
        if (frontmatter.name !== skill.id) {
          failures.push(`skill_catalog_frontmatter_name_drift:${skill.id}`);
        }
        if (typeof frontmatter.description !== 'string' || frontmatter.description.length === 0) {
          failures.push(`skill_catalog_frontmatter_description_missing:${skill.id}`);
        }
      }
    }
    if (skill.scope !== 'read-only') {
      failures.push(`skill_catalog_non_readonly_skill:${skill.id}`);
    }
    if (typeof skill.summary !== 'string' || skill.summary.trim().length < 24) {
      failures.push(`skill_catalog_missing_summary:${skill.id}`);
    }

    if (!Array.isArray(skill.consumerRoutes) || skill.consumerRoutes.length === 0) {
      failures.push(`skill_catalog_missing_consumer_routes:${skill.id}`);
    } else {
      for (const route of skill.consumerRoutes) {
        if (!ALLOWED_CONSUMER_ROUTES.has(route)) {
          failures.push(`skill_catalog_unknown_consumer_route:${skill.id}:${route}`);
        }
      }
    }

    if (!Array.isArray(skill.companionFiles) || skill.companionFiles.length === 0) {
      failures.push(`skill_catalog_missing_companion_files:${skill.id}`);
    } else {
      for (const companionFile of skill.companionFiles) {
        if (typeof companionFile !== 'string' || companionFile.length === 0) {
          failures.push(`skill_catalog_invalid_companion_file:${skill.id}`);
          continue;
        }
        if (!existsSync(resolveFromCatalog(companionFile))) {
          failures.push(`skill_catalog_missing_pair_target:${skill.id}:${companionFile}`);
        }
      }
    }
  }

  if (!existsSync(SUBMISSION_PACKET_PATH)) {
    failures.push('skill_catalog_missing_submission_packet');
  } else {
    const packet = JSON.parse(readFileSync(SUBMISSION_PACKET_PATH, 'utf8'));

    if (packet.kind !== 'repo-owned-clawhub-skill-submission-packet') {
      failures.push('skill_catalog_submission_packet_kind_drift');
    }
    if (!SCHEMA_VERSION_RE.test(packet?.schemaVersion ?? '')) {
      failures.push('skill_catalog_submission_packet_schema_drift');
    }
    if (
      typeof packet.truthBoundary !== 'string' ||
      !packet.truthBoundary.includes('not an upstream marketplace manifest')
    ) {
      failures.push('skill_catalog_submission_packet_boundary_missing');
    }

    const officialSources = packet.officialSources ?? {};
    for (const key of ['clawhub', 'skills', 'bundles']) {
      if (typeof officialSources[key] !== 'string' || officialSources[key].length === 0) {
        failures.push(`skill_catalog_submission_packet_missing_source:${key}`);
      }
    }

    if (packet?.pack?.name !== pack?.name) {
      failures.push('skill_catalog_submission_packet_pack_name_drift');
    }
    if (packet?.pack?.version !== pack?.version) {
      failures.push('skill_catalog_submission_packet_pack_version_drift');
    }
    if (packet?.pack?.scope !== 'read-only') {
      failures.push('skill_catalog_submission_packet_scope_drift');
    }
    if (packet?.pack?.sourceRoot !== 'skills') {
      failures.push('skill_catalog_submission_packet_source_root_drift');
    }
    if (
      packet?.pack?.bundleCompatibility?.openclawBundleFormat !== 'manifestless-claude-layout'
    ) {
      failures.push('skill_catalog_submission_packet_bundle_format_drift');
    }

    const packetSkills = Array.isArray(packet?.skills) ? packet.skills : [];
    if (packetSkills.length !== skills.length) {
      failures.push('skill_catalog_submission_packet_skill_count_drift');
    }

    for (const skill of skills) {
      const packetSkill = packetSkills.find((entry) => entry.id === skill.id);
      if (!packetSkill) {
        failures.push(`skill_catalog_submission_packet_missing_skill:${skill.id}`);
        continue;
      }

      if (packetSkill.slug !== skill.id) {
        failures.push(`skill_catalog_submission_packet_slug_drift:${skill.id}`);
      }
      if (packetSkill.displayName !== toTitleCase(skill.id)) {
        failures.push(`skill_catalog_submission_packet_display_name_drift:${skill.id}`);
      }
      if (packetSkill.version !== pack?.version) {
        failures.push(`skill_catalog_submission_packet_version_drift:${skill.id}`);
      }
      if (packetSkill.path !== `skills/${skill.entrypoint}`) {
        failures.push(`skill_catalog_submission_packet_path_drift:${skill.id}`);
      }
      if (packetSkill.summary !== skill.summary) {
        failures.push(`skill_catalog_submission_packet_summary_drift:${skill.id}`);
      }
      if (!Array.isArray(packetSkill.tags) || !packetSkill.tags.includes('latest')) {
        failures.push(`skill_catalog_submission_packet_tags_drift:${skill.id}`);
      }
    }
  }

  const readme = readFileSync(path.join(repoRoot, 'skills/README.md'), 'utf8');
  const distribution = readFileSync(path.join(repoRoot, 'DISTRIBUTION.md'), 'utf8');
  const integrations = readFileSync(path.join(repoRoot, 'INTEGRATIONS.md'), 'utf8');
  const preflightDoc = readFileSync(path.join(repoRoot, 'DISTRIBUTION.md'), 'utf8');

  if (!readme.includes('skills/catalog.json')) {
    failures.push('skill_catalog_readme_missing_catalog_link');
  }
  if (!readme.includes('not an upstream marketplace manifest')) {
    failures.push('skill_catalog_readme_missing_boundary');
  }
  if (!readme.includes('clawhub-submission.packet.json')) {
    failures.push('skill_catalog_readme_missing_submission_packet_link');
  }
  if (!distribution.includes('skills/catalog.json')) {
    failures.push('skill_catalog_distribution_missing_reference');
  }
  if (!distribution.includes('clawhub-submission.packet.json')) {
    failures.push('skill_catalog_distribution_missing_submission_packet_link');
  }
  if (!integrations.includes('skills/catalog.json')) {
    failures.push('skill_catalog_integrations_missing_reference');
  }
  if (!integrations.includes('clawhub-submission.packet.json')) {
    failures.push('skill_catalog_integrations_missing_submission_packet_link');
  }
  if (!preflightDoc.includes('clawhub-submission.packet.json')) {
    failures.push('skill_catalog_preflight_doc_missing_packet_link');
  }

  return failures;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const failures = validateSkillCatalog();

  if (failures.length > 0) {
    process.stderr.write(`${failures.join('\n')}\n`);
    process.exit(1);
  }

  process.stdout.write('skill_catalog_ok\n');
}
