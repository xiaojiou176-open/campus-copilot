import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { runCli } from '../dist/index.mjs';

test('help alias prints the command summary', async () => {
  const chunks = [];
  const exitCode = await runCli(
    ['--help'],
    {
      write: (value) => {
        chunks.push(value);
      },
      error: () => {},
    },
    async () => {
      throw new Error('fetch should not run for help');
    },
  );

  assert.equal(exitCode, 0);
  assert.match(chunks.join(''), /help \| --help/);
  assert.match(chunks.join(''), /status \[--base-url <url>\]/);
});

test('status alias uses the provider readiness endpoint', async () => {
  const chunks = [];
  const calls = [];
  const exitCode = await runCli(
    ['status'],
    {
      write: (value) => {
        chunks.push(value);
      },
      error: () => {},
    },
    async (input) => {
      calls.push(String(input));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          requestId: 'status-1',
          ok: true,
          providers: {
            openai: { ready: false, reason: 'missing_api_key' },
            gemini: { ready: true, reason: 'configured' },
            switchyard: { ready: false, reason: 'missing_runtime_url' },
          },
        }),
      };
    },
  );

  assert.equal(exitCode, 0);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /\/api\/providers\/status$/);
  assert.match(chunks.join(''), /"gemini"/);
});

test('ask supports provider auto by resolving provider status first', async () => {
  const chunks = [];
  const calls = [];
  const exitCode = await runCli(
    ['ask', '--provider', 'auto', '--question', 'What changed today?'],
    {
      write: (value) => {
        chunks.push(value);
      },
      error: () => {},
    },
    async (input, init) => {
      calls.push({ input: String(input), body: init?.body ? String(init.body) : undefined });
      if (calls.length === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            requestId: 'status-1',
            ok: true,
            providers: {
              openai: { ready: false, reason: 'missing_api_key' },
              gemini: { ready: true, reason: 'configured' },
              switchyard: { ready: false, reason: 'missing_runtime_url' },
            },
          }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          requestId: 'chat-1',
          ok: true,
          provider: 'gemini',
          answerText: 'Direct Gemini fallback is active.',
          forwardedStatus: 200,
        }),
      };
    },
  );

  assert.equal(exitCode, 0);
  assert.equal(calls.length, 2);
  assert.match(calls[0].input, /\/api\/providers\/status$/);
  assert.match(calls[1].input, /\/api\/providers\/gemini\/chat$/);
  assert.match(calls[1].body ?? '', /"provider":"gemini"/);
  assert.match(chunks.join(''), /"provider": "gemini"/);
});

test('snapshot site prints a site-filtered summary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'campus-cli-'));
  const file = join(dir, 'snapshot.json');
  writeFileSync(
    file,
    JSON.stringify({
      generatedAt: '2026-04-03T12:00:00-07:00',
      assignments: [
        {
          id: 'canvas:assignment:1',
          kind: 'assignment',
          site: 'canvas',
          source: { site: 'canvas', resourceId: '1', resourceType: 'assignment' },
          title: 'Homework',
          status: 'todo',
        },
      ],
    }),
    'utf8',
  );

  const result = spawnSync(
    process.execPath,
    ['./dist/bin-entry.mjs', 'snapshot', 'site', '--snapshot', file, '--site', 'canvas'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  rmSync(dir, { recursive: true, force: true });
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.counts.assignments, 1);
  assert.equal(parsed.site, 'canvas');
});

test('bin strips the pnpm run separator before dispatch', () => {
  const result = spawnSync(
    process.execPath,
    ['./dist/bin-entry.mjs', '--', 'help'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /campus-copilot <command> \[--flags\]/);
});
