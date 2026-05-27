import { existsSync } from 'node:fs';

const forbiddenRootArtifacts = [
  '.output',
  '.wxt',
  'dist',
  'test-results',
  'playwright-report',
];

const failures = [];

for (const artifact of forbiddenRootArtifacts) {
  if (existsSync(artifact)) {
    failures.push(`forbidden_root_artifact:${artifact}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('runtime_artifacts_ok');
