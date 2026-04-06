import { readFileSync } from 'node:fs';

const files = [
  'CLAUDE.md',
  'CHANGELOG.md',
  'README.md',
  'CONTRIBUTING.md',
  '.env.example',
  'docs/01-product-prd.md',
  'docs/02-system-architecture.md',
  'docs/03-domain-schema.md',
  'docs/04-adapter-spec.md',
  'docs/05-ai-provider-and-runtime.md',
  'docs/06-export-and-user-surfaces.md',
  'docs/07-security-privacy-compliance.md',
  'docs/08-phase-plan-and-repo-writing-brief.md',
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
