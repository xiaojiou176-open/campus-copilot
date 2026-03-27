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
    path: 'docs/09-implementation-decisions.md',
    forbidden: [
      /localhost:9222/i,
      /code-scanning/i,
      /branch protection/i,
      /\b7\b.*courses/i,
      /\b118\b.*assignments/i,
      /\b69\b.*assignments/i,
      /\b30\b.*threads/i,
      /\b3\b.*announcements/i,
      /READY/,
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

if (existsSync('docs/🧩 校园学习平台 AI 插件方案与网页私有 API 逆向工作流.md')) {
  failures.push('orphan_doc_still_present:docs/🧩 校园学习平台 AI 插件方案与网页私有 API 逆向工作流.md');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('docs_ssot_ok');
