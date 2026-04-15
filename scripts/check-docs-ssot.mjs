import { readFileSync, existsSync } from 'node:fs';

const docRules = [
  {
    path: 'README.md',
    forbidden: [
      /localhost:9222/i,
      /127\.0\.0\.1:9222/i,
      /vulnerability alerts/i,
      /push protection/i,
      /branch protection/i,
      /code-scanning/i,
      /ghost course/i,
      /\b7\b.*courses/i,
      /\b118\b.*assignments/i,
      /\b69\b.*assignments/i,
      /\b30\b.*threads/i,
      /\b3\b.*announcements/i,
      /no analysis found/i,
    ],
  },
  {
    path: 'docs/README.md',
    forbidden: [
      /chrome:\/\/extensions/i,
      /localhost:9222/i,
      /no analysis found/i,
      /branch protection/i,
      /vulnerability alerts/i,
    ],
  },
  {
    path: 'docs/live-validation-runbook.md',
    forbidden: [
      /vulnerability alerts/i,
      /push protection/i,
      /branch protection/i,
      /canonical owner/i,
      /public repo/i,
      /code-scanning/i,
    ],
  },
];

const failures = [];

for (const rule of docRules) {
  if (!existsSync(rule.path)) {
    failures.push(`missing_required_doc:${rule.path}`);
    continue;
  }

  const content = readFileSync(rule.path, 'utf8');
  for (const pattern of rule.forbidden) {
    if (pattern.test(content)) {
      failures.push(`forbidden_pattern:${rule.path}:${pattern}`);
    }
  }
}

const requiredMentions = [
  ['README.md', 'docs/api/openapi.yaml'],
  ['README.md', 'docs/17-academic-expansion-and-safety-contract.md'],
  ['docs/README.md', 'api/openapi.yaml'],
  ['docs/README.md', '17-academic-expansion-and-safety-contract.md'],
  ['docs/10-builder-api-and-ecosystem-fit.md', 'api/openapi.yaml'],
  ['PRIVACY.md', 'docs/17-academic-expansion-and-safety-contract.md'],
  ['INTEGRATIONS.md', 'docs/17-academic-expansion-and-safety-contract.md'],
  ['DISTRIBUTION.md', 'docs/17-academic-expansion-and-safety-contract.md'],
  ['SECURITY.md', 'docs/17-academic-expansion-and-safety-contract.md'],
  ['CLAUDE.md', 'docs/17-academic-expansion-and-safety-contract.md'],
];

const requiredContractSnippets = [
  ['PRIVACY.md', '`Register.UW`'],
  ['PRIVACY.md', '`Notify.UW`'],
  ['PRIVACY.md', 'class-search-only `ctcLink`'],
  ['INTEGRATIONS.md', 'protected academic workflows'],
  ['DISTRIBUTION.md', 'no registration automation'],
  ['SECURITY.md', '`Register.UW`'],
  ['CLAUDE.md', '`Register.UW` / `Notify.UW`'],
];

for (const [path, snippet] of requiredMentions) {
  if (!existsSync(path)) {
    failures.push(`missing_required_doc:${path}`);
    continue;
  }

  const content = readFileSync(path, 'utf8');
  if (!content.includes(snippet)) {
    failures.push(`missing_required_snippet:${path}:${snippet}`);
  }
}

for (const [path, snippet] of requiredContractSnippets) {
  if (!existsSync(path)) {
    failures.push(`missing_required_doc:${path}`);
    continue;
  }

  const content = readFileSync(path, 'utf8');
  if (!content.includes(snippet)) {
    failures.push(`missing_required_snippet:${path}:${snippet}`);
  }
}

const orderedHeadingGroups = [
  {
    path: 'README.md',
    headings: [
      '## Start Here In 60 Seconds',
      '## Why This Exists',
      '## What Changes After The First Sync',
      '## What To Do First',
      '## Current Product Shape',
      '## Repo-Local Proof Path',
      '## Student Questions This Repo Tries To Answer',
      '## Quickstart',
      '## Builder Quick Paths',
    ],
  },
  {
    path: 'docs/README.md',
    headings: [
      '## Start Here By Intent',
      '## Default Newcomer Route',
      '## Proof And Launch Lane',
      '## Builder Lane',
    ],
  },
];

for (const group of orderedHeadingGroups) {
  if (!existsSync(group.path)) {
    failures.push(`missing_required_doc:${group.path}`);
    continue;
  }

  const content = readFileSync(group.path, 'utf8');
  let lastIndex = -1;
  for (const heading of group.headings) {
    const index = content.indexOf(heading);
    if (index < 0) {
      failures.push(`missing_required_heading:${group.path}:${heading}`);
      continue;
    }

    if (index <= lastIndex) {
      failures.push(`heading_order_drift:${group.path}:${heading}`);
    }

    lastIndex = Math.max(lastIndex, index);
  }
}

if (existsSync('docs/🧩 校园学习平台 AI 插件方案与网页私有 API 逆向工作流.md')) {
  failures.push('orphan_doc_still_present:docs/🧩 校园学习平台 AI 插件方案与网页私有 API 逆向工作流.md');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('docs_ssot_ok');
