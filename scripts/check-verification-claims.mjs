import { readFileSync } from 'node:fs';

const files = [
  'README.md',
  'CONTRIBUTING.md',
  'docs/09-implementation-decisions.md',
];

const forbiddenCommands = [
  'smoke:provider',
  'smoke:sidepanel',
  'smoke:support',
  'preflight:live',
  'diagnose:live',
  'probe:live',
];

const failures = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const command of forbiddenCommands) {
    if (content.includes(command)) {
      failures.push(`forbidden_verification_claim:${file}:${command}`);
    }
  }
}

const matrix = readFileSync('docs/verification-matrix.md', 'utf8');
if (!matrix.includes('pnpm verify')) {
  failures.push('verification_matrix_missing_verify');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('verification_claims_ok');
