import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const CODE_ROOTS = ['apps', 'packages', 'scripts'];
const IGNORED_DIRS = new Set([
  '.git',
  '.next',
  '.runtime-cache',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);
const ALLOWED_EXTENSIONS = new Set(['.cjs', '.js', '.mjs', '.py', '.sh', '.ts', '.tsx', '.zsh']);
const IGNORED_FILES = new Set(['check-host-safety-contract.mjs']);
const FORBIDDEN_RULES = [
  {
    id: 'host_safety_osascript',
    pattern: /\bosascript\b/,
    description: 'host-facing code must not shell out to AppleScript',
  },
  {
    id: 'host_safety_system_events',
    pattern: /System Events/,
    description: 'host-facing code must not fall back to System Events GUI automation',
  },
  {
    id: 'host_safety_loginwindow',
    pattern: /loginwindow/,
    description: 'host-facing code must not target loginwindow',
  },
  {
    id: 'host_safety_force_quit_panel',
    pattern: /showForceQuitPanel/,
    description: 'host-facing code must not target the Force Quit panel',
  },
  {
    id: 'host_safety_apple_event',
    pattern: /AppleEvent/,
    description: 'host-facing code must not rely on broad AppleEvent control paths',
  },
  {
    id: 'host_safety_killall',
    pattern: /\bkillall\b/,
    description: 'host-facing code must not mass-kill processes with killall',
  },
  {
    id: 'host_safety_pkill',
    pattern: /\bpkill\b/,
    description: 'host-facing code must not broad-match processes with pkill',
  },
  {
    id: 'host_safety_negative_pid',
    pattern: /process\.kill\(\s*-/,
    description: 'host-facing code must not signal process groups via negative pid',
  },
  {
    id: 'host_safety_process_group_kill',
    pattern: /os\.killpg\(/,
    description: 'host-facing code must not broad-kill process groups',
  },
  {
    id: 'host_safety_global_tab_fallback',
    pattern: /CAMPUS_COPILOT_ALLOW_GLOBAL_TAB_FALLBACK/,
    description: 'live probe must not fall back to arbitrary desktop Chrome tabs',
  },
];

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

    if (!entry.isFile()) {
      continue;
    }

    if (IGNORED_FILES.has(entry.name) || !ALLOWED_EXTENSIONS.has(extname(entry.name))) {
      continue;
    }

    yield entryPath;
  }
}

const violations = [];

for (const root of CODE_ROOTS) {
  const rootPath = join(ROOT, root);
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

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(
      `${violation.rule}:${violation.file}:${violation.line}:${violation.description}\n  ${violation.snippet}`,
    );
  }
  process.exit(1);
}

console.log('host_safety_contract_ok');
