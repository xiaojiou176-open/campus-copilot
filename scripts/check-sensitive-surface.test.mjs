import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { collectSensitiveSurfaceFailures } from './check-sensitive-surface.mjs';

test('allows repo-safe paths and $HOME-based documentation', () => {
  const files = new Map([
    ['AGENTS.md', Buffer.from('- `$HOME/Library/Application Support/Google/Chrome`\n', 'utf8')],
    ['.agents/skills/README.md', Buffer.from('# Skill index\n', 'utf8')],
  ]);

  const failures = collectSensitiveSurfaceFailures({
    trackedFiles: [...files.keys()],
    readTrackedFile: (file) => files.get(file) ?? Buffer.alloc(0),
  });

  assert.deepEqual(failures, []);
});

test('fails tracked local-only artifact paths', () => {
  const files = new Map([
    ['.env', Buffer.from('GEMINI_API_KEY=local-only\n', 'utf8')],
    ['.runtime-cache/live-traces/run.json', Buffer.from('{}\n', 'utf8')],
    ['.agents/Conversations/thread.md', Buffer.from('# ignored archive\n', 'utf8')],
  ]);

  const failures = collectSensitiveSurfaceFailures({
    trackedFiles: [...files.keys()],
    readTrackedFile: (file) => files.get(file) ?? Buffer.alloc(0),
  });

  assert.match(failures.join('\n'), /tracked_secret_env_file:\.env/);
  assert.match(failures.join('\n'), /tracked_runtime_artifact:\.runtime-cache\/live-traces\/run\.json/);
  assert.match(failures.join('\n'), /tracked_local_agents_artifact:\.agents\/Conversations\/thread\.md/);
});

test('fails absolute local paths and private key markers in tracked text files', () => {
  const sensitivePath = ['/Users', 'tester', 'Documents', 'private', 'file.md'].join('/');
  const fakeGithubToken = ['gh', 'p_', 'A'.repeat(36)].join('');
  const fakeOpenAiToken = ['sk-', 'proj', 'X'.repeat(24)].join('');
  const fakeAwsKey = ['AKIA', 'B'.repeat(16)].join('');
  const fakePrivateKeyMarker = ['-----BEGIN ', 'PRIVATE KEY', '-----'].join('');
  const files = new Map([
    [
      'docs/example.md',
      Buffer.from(
        [
          '# Example',
          `- ${sensitivePath}`,
          `- ${fakeGithubToken}`,
          `- ${fakeOpenAiToken}`,
          `- ${fakeAwsKey}`,
          fakePrivateKeyMarker,
        ].join('\n'),
        'utf8',
      ),
    ],
  ]);

  const failures = collectSensitiveSurfaceFailures({
    trackedFiles: [...files.keys()],
    readTrackedFile: (file) => files.get(file) ?? Buffer.alloc(0),
  });

  assert.match(failures.join('\n'), /absolute_local_path:docs\/example\.md:2/);
  assert.match(failures.join('\n'), /github_token_pattern:docs\/example\.md:3/);
  assert.match(failures.join('\n'), /openai_token_pattern:docs\/example\.md:4/);
  assert.match(failures.join('\n'), /aws_access_key_pattern:docs\/example\.md:5/);
  assert.match(failures.join('\n'), /private_key_marker:docs\/example\.md:6/);
});

test('skips binary tracked files', () => {
  const files = new Map([['docs/assets/social-preview.png', Buffer.from([0, 1, 2, 3])]]);

  const failures = collectSensitiveSurfaceFailures({
    trackedFiles: [...files.keys()],
    readTrackedFile: (file) => files.get(file) ?? Buffer.alloc(0),
  });

  assert.deepEqual(failures, []);
});
