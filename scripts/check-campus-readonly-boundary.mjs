import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const POLICY_PATH = join(ROOT, 'policies/integration-boundaries.yaml');
const IGNORED_DIRS = new Set(['.git', '.next', '.runtime-cache', 'build', 'coverage', 'dist', 'node_modules']);
const ALLOWED_EXTENSIONS = new Set(['.js', '.mjs', '.ts', '.tsx']);
const WRITE_GUARD_TARGET_ROOTS = [
  'apps/extension/entrypoints',
  'packages/adapters-base/src',
  'packages/adapters-canvas/src',
  'packages/adapters-edstem/src',
  'packages/adapters-gradescope/src',
  'packages/adapters-myuw/src',
  'packages/gradescope-api/src',
  'packages/edstem-api/src',
  'packages/myuw-api/src',
];
const RED_ZONE_HOST_TARGET_ROOTS = [
  'apps/extension/entrypoints',
  'apps/web/src',
  'packages/ai/src',
  'packages/cli/src',
  'packages/core/src',
  'packages/mcp/src',
  'packages/mcp-readonly/src',
  'packages/mcp-server/src',
  'packages/provider-runtime/src',
  'packages/sdk/src',
  'packages/site-sdk/src',
  'packages/workspace-sdk/src',
];

const FORBIDDEN_RULES = [
  {
    id: 'site_write_http_verb',
    pattern: /method:\s*['"](POST|PUT|PATCH|DELETE)['"]/i,
    description: 'site-facing collectors must not introduce campus-site mutation verbs',
  },
  {
    id: 'site_form_submit',
    pattern: /\.(requestSubmit|submit)\(/,
    description: 'site-facing collectors must not submit campus-site forms',
  },
];

const SOURCE_RED_ZONE_HOST_RULES = [
  {
    id: 'source_register_uw_red_zone',
    pattern: /register\.uw\.edu/i,
    description: 'runtime/source code must not hardcode Register.UW surfaces into the current product path',
  },
  {
    id: 'source_notify_uw_red_zone',
    pattern: /notify\.uw\.edu/i,
    description: 'runtime/source code must not hardcode Notify.UW surfaces into the current product path',
  },
];

function isImplementationFile(filePath) {
  return !/\.(test|spec)\.[^.]+$/.test(filePath);
}

const MANIFEST_RED_ZONE_RULES = [
  {
    id: 'manifest_register_uw_red_zone',
    pattern: /register\.uw\.edu/i,
    description: 'extension host permissions must not silently expand into Register.UW',
  },
  {
    id: 'manifest_notify_uw_red_zone',
    pattern: /notify\.uw\.edu/i,
    description: 'extension host permissions must not silently expand into Notify.UW',
  },
];

const AI_RUNTIME_BOUNDARY_EXPECTATIONS = [
  {
    path: 'packages/ai/src/index.ts',
    snippets: [
      'Never request raw DOM, raw HTML, cookies, or site-specific payloads.',
      'Advanced material analysis stays default-disabled',
      'Registration automation stays off',
    ],
  },
  {
    path: 'packages/ai/src/index.test.ts',
    snippets: ['raw course files', 'assignment PDFs', 'default-disabled'],
  },
  {
    path: 'apps/extension/src/ai-request.test.ts',
    snippets: ['raw course files', 'default-disabled'],
  },
  {
    path: 'packages/core/src/index.test.ts',
    snippets: ['Advanced material analysis stays default-disabled'],
  },
];

const SHARED_RED_ZONE_HARD_STOP_EXPECTATIONS = [
  {
    path: 'packages/ai/src/index.ts',
    snippets: [
      'Not supported in the current product path',
      'This surface crosses the current read-only academic safety boundary.',
      'Open the original site if you need to continue manually.',
      'Academic Safety Contract',
    ],
  },
];

const EXTENSION_RED_ZONE_HARD_STOP_EXPECTATIONS = [
  {
    path: 'apps/extension/src/academic-safety-guards.ts',
    snippets: [
      'getAcademicAiCallerGuardrails as getSharedAcademicAiCallerGuardrails',
      'getAcademicRedZoneUiGuard as getSharedAcademicRedZoneUiGuard',
      'getAcademicRedZoneUiGuards as getSharedAcademicRedZoneUiGuards',
      "manualUrl: RED_ZONE_MANUAL_URLS[surface]",
      "manualUrl: RED_ZONE_MANUAL_URLS[surface.surface]",
      'manualNote: sharedGuard.manualOnlyNote',
    ],
  },
];

const AI_CALLER_GUARDRAIL_WRAPPER_EXPECTATIONS = [
  {
    path: 'apps/extension/src/ask-ai-panel.tsx',
    snippets: [
      'getAcademicAiCallerGuardrails',
      'const aiGuardrails = getAcademicAiCallerGuardrails()',
      'aiGuardrails.redZone.summary',
      'aiGuardrails.advancedMaterial',
    ],
  },
  {
    path: 'apps/web/src/web-ai-panel.tsx',
    snippets: [
      'getAcademicAiCallerGuardrails',
      'const aiGuardrails = getAcademicAiCallerGuardrails()',
      'aiGuardrails.redZone.summary',
      'aiGuardrails.advancedMaterial',
    ],
  },
  {
    path: 'apps/extension/src/workbench-panel-sections.tsx',
    snippets: ["getAcademicRedZoneHardStops(['register-uw', 'notify-uw'])"],
  },
];

function readPolicyLines() {
  return readFileSync(POLICY_PATH, 'utf8').split('\n');
}

function getIndent(line) {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function collectNestedListItems(lines, heading, headingIndent, itemIndent) {
  const start = lines.findIndex((line) => line.trimEnd() === heading);
  if (start < 0) {
    return [];
  }

  const items = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }

    const indent = getIndent(line);
    if (indent <= headingIndent) {
      break;
    }

    if (indent === itemIndent && line.trimStart().startsWith('- ')) {
      items.push(line.trimStart().slice(2));
    }
  }

  return items;
}

function collectRedZoneSites(lines) {
  const start = lines.findIndex((line) => line.trimEnd() === 'red_zone_registry:');
  if (start < 0) {
    return [];
  }

  const sites = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }

    const indent = getIndent(line);
    if (indent === 0) {
      break;
    }

    const trimmed = line.trimStart();
    if (trimmed.startsWith('- site:')) {
      sites.push(trimmed.slice('- site:'.length).trim());
    }
  }

  return sites;
}

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(entryPath);
      continue;
    }

    if (!entry.isFile() || !ALLOWED_EXTENSIONS.has(extname(entry.name))) {
      continue;
    }

    yield entryPath;
  }
}

const violations = [];
const policyLines = readPolicyLines();
const policyAiForbiddenInputs = collectNestedListItems(policyLines, '  forbidden_default_inputs:', 2, 4);
const policyRedZoneSites = collectRedZoneSites(policyLines);
const seenRedZoneSites = new Set();

for (const site of policyRedZoneSites) {
  if (seenRedZoneSites.has(site)) {
    violations.push({
      file: relative(ROOT, POLICY_PATH),
      line: 1,
      rule: 'duplicate_red_zone_registry_site',
      description: `red_zone_registry contains a duplicate site entry: ${site}`,
      snippet: site,
    });
  }
  seenRedZoneSites.add(site);
}

for (const target of WRITE_GUARD_TARGET_ROOTS) {
  const rootPath = join(ROOT, target);
  try {
    if (!statSync(rootPath).isDirectory()) {
      continue;
    }
  } catch {
    continue;
  }

  for (const filePath of walk(rootPath)) {
    const source = readFileSync(filePath, 'utf8');
    const lines = source.split('\n');
    for (const rule of FORBIDDEN_RULES) {
      lines.forEach((line, index) => {
        if (!rule.pattern.test(line)) {
          return;
        }

        violations.push({
          file: relative(ROOT, filePath),
          line: index + 1,
          rule: rule.id,
          description: rule.description,
          snippet: line.trim(),
        });
      });
    }
  }
}

for (const target of RED_ZONE_HOST_TARGET_ROOTS) {
  const rootPath = join(ROOT, target);
  try {
    if (!statSync(rootPath).isDirectory()) {
      continue;
    }
  } catch {
    continue;
  }

  for (const filePath of walk(rootPath)) {
    if (!isImplementationFile(filePath)) {
      continue;
    }

    const source = readFileSync(filePath, 'utf8');
    const lines = source.split('\n');
    for (const rule of SOURCE_RED_ZONE_HOST_RULES) {
      lines.forEach((line, index) => {
        if (!rule.pattern.test(line)) {
          return;
        }

        violations.push({
          file: relative(ROOT, filePath),
          line: index + 1,
          rule: rule.id,
          description: rule.description,
          snippet: line.trim(),
        });
      });
    }
  }
}

const manifestPath = join(ROOT, 'apps/extension/wxt.config.ts');
const manifestSource = readFileSync(manifestPath, 'utf8');
const manifestLines = manifestSource.split('\n');
for (const rule of MANIFEST_RED_ZONE_RULES) {
  manifestLines.forEach((line, index) => {
    if (!rule.pattern.test(line)) {
      return;
    }

    violations.push({
      file: relative(ROOT, manifestPath),
      line: index + 1,
      rule: rule.id,
      description: rule.description,
      snippet: line.trim(),
    });
  });
}

for (const expectation of AI_RUNTIME_BOUNDARY_EXPECTATIONS) {
  const filePath = join(ROOT, expectation.path);
  const source = readFileSync(filePath, 'utf8');
  const snippets =
    expectation.path === 'packages/ai/src/index.ts'
      ? [...expectation.snippets, ...policyAiForbiddenInputs]
      : expectation.snippets;

  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      violations.push({
        file: expectation.path,
        line: 1,
        rule: 'ai_runtime_boundary_missing_snippet',
        description: `AI/material runtime guard is missing required snippet: ${snippet}`,
        snippet,
      });
    }
  }
}

for (const expectation of SHARED_RED_ZONE_HARD_STOP_EXPECTATIONS) {
  const filePath = join(ROOT, expectation.path);
  const source = readFileSync(filePath, 'utf8');

  for (const snippet of expectation.snippets) {
    if (!source.includes(snippet)) {
      violations.push({
        file: expectation.path,
        line: 1,
        rule: 'red_zone_hard_stop_missing_snippet',
        description: `red-zone hard-stop contract is missing required snippet: ${snippet}`,
        snippet,
      });
    }
  }

  for (const site of policyRedZoneSites) {
    if (!source.includes(`'${site}'`)) {
      violations.push({
        file: expectation.path,
        line: 1,
        rule: 'red_zone_hard_stop_missing_site',
        description: `red-zone hard-stop contract is missing a policy-backed site: ${site}`,
        snippet: site,
      });
    }
  }
}

for (const expectation of EXTENSION_RED_ZONE_HARD_STOP_EXPECTATIONS) {
  const filePath = join(ROOT, expectation.path);
  const source = readFileSync(filePath, 'utf8');

  for (const snippet of expectation.snippets) {
    if (!source.includes(snippet)) {
      violations.push({
        file: expectation.path,
        line: 1,
        rule: 'extension_red_zone_hard_stop_missing_snippet',
        description: `extension red-zone hard-stop wrapper is missing required snippet: ${snippet}`,
        snippet,
      });
    }
  }
}

for (const expectation of AI_CALLER_GUARDRAIL_WRAPPER_EXPECTATIONS) {
  const filePath = join(ROOT, expectation.path);
  const source = readFileSync(filePath, 'utf8');

  for (const snippet of expectation.snippets) {
    if (!source.includes(snippet)) {
      violations.push({
        file: expectation.path,
        line: 1,
        rule: 'ai_caller_guardrail_wrapper_missing_snippet',
        description: `AI/red-zone caller adoption is missing required wrapper usage: ${snippet}`,
        snippet,
      });
    }
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(
      `${violation.rule}:${violation.file}:${violation.line}:${violation.description}\n  ${violation.snippet}`,
    );
  }
  process.exit(1);
}

console.log('campus_readonly_boundary_ok');
