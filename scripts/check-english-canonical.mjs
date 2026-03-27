import { readFileSync } from 'node:fs';

const files = [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md',
  'docs/README.md',
  'docs/09-implementation-decisions.md',
  'docs/live-validation-runbook.md',
  'docs/verification-matrix.md',
  'docs/github-surface-checklist.md',
  'docs/integration-boundaries.md',
  'docs/diagnostics-and-logging.md',
];

const cjkPattern = /[\u3400-\u9FFF]/;
const failures = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  if (cjkPattern.test(content)) {
    failures.push(`non_english_canonical_content:${file}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('english_canonical_ok');
