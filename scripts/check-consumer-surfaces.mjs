import { existsSync, readFileSync } from 'node:fs';

const genericConfigs = [
  'examples/integrations/codex-mcp.example.json',
  'examples/integrations/codex-mcp-shell.example.json',
  'examples/integrations/claude-code-mcp.example.json',
  'examples/integrations/claude-code-mcp-shell.example.json',
  'examples/codex/campus-copilot-mcp.json',
];

const sidecarConfigs = [
  'examples/mcp/codex.example.json',
  'examples/mcp/claude-desktop.example.json',
  'examples/mcp/codex-repo-root.example.json',
  'examples/mcp/claude-desktop-repo-root.example.json',
];

const publicSkills = [
  'read-only-workspace-analysis',
  'read-only-workspace-audit',
  'current-view-triage',
  'openclaw-readonly-consumer',
  'site-mcp-consumer',
  'site-overview-audit',
  'site-snapshot-review',
  'switchyard-runtime-check',
];

const sidecarCommands = new Set([
  'campus-copilot-mcp-canvas',
  'campus-copilot-mcp-gradescope',
  'campus-copilot-mcp-edstem',
  'campus-copilot-mcp-myuw',
]);

const packageReadmeExpectations = [
  {
    path: 'packages/sdk/README.md',
    snippets: ['Read-only builder SDK', '../../examples/toolbox-chooser.md', 'pnpm proof:public'],
  },
  {
    path: 'packages/cli/README.md',
    snippets: ['Use this package when', '../../examples/openclaw-readonly.md', '../../examples/toolbox-chooser.md', 'pnpm proof:public'],
  },
  {
    path: 'packages/mcp/README.md',
    snippets: ['config helpers', '../../examples/toolbox-chooser.md', 'pnpm proof:public'],
  },
  {
    path: 'packages/mcp-readonly/README.md',
    snippets: ['Use this package when', '../../examples/integrations/README.md', '../../examples/toolbox-chooser.md', 'pnpm proof:public'],
  },
  {
    path: 'packages/mcp-server/README.md',
    snippets: ['Use this package when', '../../examples/integrations/README.md', '../../examples/toolbox-chooser.md', 'pnpm proof:public'],
  },
  {
    path: 'packages/provider-runtime/README.md',
    snippets: [
      'Campus-owned semantics stable',
      '../../examples/integrations/plugin-bundles.md',
      '../../examples/provider-runtime-switchyard.ts',
      '../../docs/10-builder-api-and-ecosystem-fit.md',
      '../../docs/14-public-distribution-scoreboard.md',
      'pnpm proof:public',
    ],
  },
  {
    path: 'packages/workspace-sdk/README.md',
    snippets: ['whole workbench', '../../skills/current-view-triage/SKILL.md', '../../examples/toolbox-chooser.md', 'pnpm proof:public'],
  },
  {
    path: 'packages/site-sdk/README.md',
    snippets: ['one supported site', '../../skills/site-overview-audit/SKILL.md', '../../examples/toolbox-chooser.md', 'pnpm proof:public'],
  },
  {
    path: 'packages/gradescope-api/README.md',
    snippets: ['snapshot contract', '../../examples/toolbox-chooser.md', 'pnpm proof:public'],
  },
  {
    path: 'packages/edstem-api/README.md',
    snippets: ['snapshot contract', '../../examples/toolbox-chooser.md', 'pnpm proof:public'],
  },
  {
    path: 'packages/myuw-api/README.md',
    snippets: ['snapshot contract', '../../examples/toolbox-chooser.md', 'pnpm proof:public'],
  },
];

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function validateGenericConfig(path, json) {
  const servers = json.mcpServers;
  if (!servers || typeof servers !== 'object') {
    return [`missing_mcpServers:${path}`];
  }

  const failures = [];
  for (const [name, config] of Object.entries(servers)) {
    if (name !== 'campus-copilot') {
      failures.push(`unexpected_generic_server_name:${path}:${name}`);
    }
    const args = Array.isArray(config.args) ? config.args : [];
    const joined = args.join(' ');
    if (config.command === 'pnpm') {
      if (
        !joined.includes('@campus-copilot/mcp-server') ||
        (!joined.includes('campus-copilot-mcp') && !joined.includes('start'))
      ) {
        failures.push(`unexpected_generic_args:${path}`);
      }
    } else if (config.command === 'bash') {
      if (!joined.includes('/absolute/path/to/campus-copilot/scripts/consumer/campus-copilot-mcp.sh')) {
        failures.push(`unexpected_shell_wrapper_args:${path}`);
      }
    } else {
      failures.push(`unexpected_generic_command:${path}:${config.command ?? 'missing'}`);
    }
  }

  return failures;
}

export function validateSidecarConfig(path, json) {
  const servers = json.mcpServers;
  if (!servers || typeof servers !== 'object') {
    return [`missing_mcpServers:${path}`];
  }

  const failures = [];
  for (const [name, config] of Object.entries(servers)) {
    if (!name.startsWith('campus-copilot-')) {
      failures.push(`unexpected_sidecar_server_name:${path}:${name}`);
    }
    const args = Array.isArray(config.args) ? config.args : [];
    const joined = args.join(' ');
    if (sidecarCommands.has(config.command)) {
      // bare sidecar binaries are valid as-is
    } else if (config.command === 'pnpm') {
      if (!joined.includes('@campus-copilot/mcp-readonly') || !joined.includes('--dir') || !joined.includes('/absolute/path/to/campus-copilot')) {
        failures.push(`unexpected_repo_root_sidecar_args:${path}:${name}`);
      }
    } else if (config.command === 'bash') {
      if (!joined.includes('/absolute/path/to/campus-copilot/scripts/consumer/campus-copilot-site-sidecar.sh')) {
        failures.push(`unexpected_repo_root_sidecar_args:${path}:${name}`);
      }
    } else {
      failures.push(`unexpected_sidecar_command:${path}:${config.command ?? 'missing'}`);
    }
    if (!config.env || typeof config.env.CAMPUS_COPILOT_SNAPSHOT !== 'string') {
      failures.push(`missing_snapshot_env:${path}:${name}`);
    } else if (!config.env.CAMPUS_COPILOT_SNAPSHOT.includes('/absolute/path/')) {
      failures.push(`snapshot_env_placeholder_drift:${path}:${name}`);
    }
  }

  return failures;
}

export function validateSkillInventory() {
  const failures = [];
  const skillsReadme = readFileSync('skills/README.md', 'utf8');
  const examplesReadme = readFileSync('examples/README.md', 'utf8');

  for (const skill of publicSkills) {
    const skillPath = `skills/${skill}/SKILL.md`;
    if (!existsSync(skillPath)) {
      failures.push(`missing_public_skill:${skillPath}`);
    }
    if (!skillsReadme.includes(skill)) {
      failures.push(`skills_readme_missing_skill:${skill}`);
    }
  }

  const expectedExampleLinks = [
    '../skills/openclaw-readonly-consumer/SKILL.md',
    '../skills/current-view-triage/SKILL.md',
    '../skills/site-overview-audit/SKILL.md',
    'integrations/codex-mcp-shell.example.json',
    'integrations/claude-code-mcp-shell.example.json',
    'integrations/plugin-bundles.md',
    'current-view-triage-example.md',
    'site-overview-audit-example.md',
    'toolbox-chooser.md',
    'mcp/README.md',
  ];

  for (const link of expectedExampleLinks) {
    if (!examplesReadme.includes(link)) {
      failures.push(`examples_readme_missing_skill_link:${link}`);
    }
  }

  const requiredSkillReadmeSnippets = [
    'examples/toolbox-chooser.md',
    'examples/current-view-triage-example.md',
    'examples/site-overview-audit-example.md',
  ];

  for (const snippet of requiredSkillReadmeSnippets) {
    if (!skillsReadme.includes(snippet)) {
      failures.push(`skills_readme_missing_reference:${snippet}`);
    }
  }

  return failures;
}

export function validatePackageReadmes() {
  const failures = [];

  for (const { path, snippets } of packageReadmeExpectations) {
    if (!existsSync(path)) {
      failures.push(`missing_package_readme:${path}`);
      continue;
    }

    const body = readFileSync(path, 'utf8');
    for (const snippet of snippets) {
      if (!body.includes(snippet)) {
        failures.push(`package_readme_missing_snippet:${path}:${snippet}`);
      }
    }
  }

  return failures;
}

export function runChecks() {
  const failures = [];

  for (const path of genericConfigs) {
    if (!existsSync(path)) {
      failures.push(`missing_example:${path}`);
      continue;
    }
    failures.push(...validateGenericConfig(path, readJson(path)));
  }

  for (const path of sidecarConfigs) {
    if (!existsSync(path)) {
      failures.push(`missing_example:${path}`);
      continue;
    }
    failures.push(...validateSidecarConfig(path, readJson(path)));
  }

  failures.push(...validateSkillInventory());
  failures.push(...validatePackageReadmes());
  return failures;
}

const failures = runChecks();

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('consumer_surfaces_ok');
