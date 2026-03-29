import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'AGENTS.md',
  'CLAUDE.md',
  'LICENSE',
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  '.env.example',
  'CODE_OF_CONDUCT.md',
  '.github/CODEOWNERS',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push(`missing_public_surface:${file}`);
  }
}

if (existsSync('SECURITY.md')) {
  const security = readFileSync('SECURITY.md', 'utf8');
  if (!security.includes('xiaojiou176-open')) {
    failures.push('security_contact_route_missing');
  }
}

if (existsSync('README.md')) {
  const readme = readFileSync('README.md', 'utf8');
  const forbidden = [/branch protection/i, /vulnerability alerts/i, /push protection/i, /code-scanning/i];
  for (const pattern of forbidden) {
    if (pattern.test(readme)) {
      failures.push(`readme_repo_external_assertion:${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('public_surface_ok');
