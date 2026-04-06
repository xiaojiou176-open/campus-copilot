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
if (!supportBundle.includes('readableSummary')) {
  failures.push('support_bundle_missing_readable_summary');
}
if (!supportBundle.includes('attachStatus')) {
  failures.push('support_bundle_missing_attach_status');
}

const preflight = readFileSync('scripts/live-preflight.mjs', 'utf8');
if (preflight.includes('path: profileDir')) {
  failures.push('live_preflight_exposes_absolute_profile_path');
}
if (!preflight.includes('site_session_resumable')) {
  failures.push('live_preflight_missing_session_resumable_blocker');
}
if (!preflight.includes('site_mfa_required')) {
  failures.push('live_preflight_missing_mfa_required_blocker');
}

const probe = readFileSync('scripts/live-site-probe.mjs', 'utf8');
if (probe.includes('profile: profileConfig.requestedProfilePath')) {
  failures.push('live_probe_exposes_absolute_profile_path');
}
if (!probe.includes('attachModeResolved')) {
  failures.push('live_probe_missing_attach_mode_resolved');
}
if (!probe.includes('debugChrome')) {
  failures.push('live_probe_missing_debug_process_evidence');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('logging_schema_ok');
