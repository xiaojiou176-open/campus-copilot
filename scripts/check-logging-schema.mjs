import { readFileSync } from 'node:fs';

const files = [
  'scripts/support-bundle.mjs',
  'scripts/live-preflight.mjs',
  'scripts/live-site-probe.mjs',
];

const failures = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  if (!content.includes('runId')) {
    failures.push(`missing_run_id:${file}`);
  }
}

const supportBundle = readFileSync('scripts/support-bundle.mjs', 'utf8');
if (!supportBundle.includes('relativeOutputPath')) {
  failures.push('support_bundle_outputs_absolute_path');
}

const preflight = readFileSync('scripts/live-preflight.mjs', 'utf8');
if (preflight.includes('path: profileDir')) {
  failures.push('live_preflight_exposes_absolute_profile_path');
}

const probe = readFileSync('scripts/live-site-probe.mjs', 'utf8');
if (probe.includes('profile: profileConfig.requestedProfilePath')) {
  failures.push('live_probe_exposes_absolute_profile_path');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('logging_schema_ok');
