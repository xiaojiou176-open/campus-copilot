import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { collectSensitiveHistoryFailures } from './check-sensitive-history.mjs';

test('flags forbidden tracked paths in reachable history', () => {
  const failures = collectSensitiveHistoryFailures({
    historyEntries: [{ objectId: 'abc123', file: '.env' }],
    readObject: () => Buffer.from('GEMINI_API_KEY=still-bad\n', 'utf8'),
  });

  assert.match(failures.join('\n'), /history_tracked_secret_env_file:\.env/);
});

test('flags secret patterns and local paths in reachable history blobs', () => {
  const fakePath = ['/Users', 'tester', 'Desktop', 'secret.txt'].join('/');
  const fakePat = ['github_pat_', 'x'.repeat(30)].join('');
  const failures = collectSensitiveHistoryFailures({
    historyEntries: [{ objectId: 'deadbeefcafe', file: 'docs/archive.md' }],
    readObject: () =>
      Buffer.from(
        [
          '# Archive',
          fakePath,
          fakePat,
        ].join('\n'),
        'utf8',
      ),
  });

  assert.match(failures.join('\n'), /history_absolute_local_path:docs\/archive\.md@deadbeefcafe:2/);
  assert.match(failures.join('\n'), /history_github_pat_pattern:docs\/archive\.md@deadbeefcafe:3/);
});

test('skips binary history blobs', () => {
  const failures = collectSensitiveHistoryFailures({
    historyEntries: [{ objectId: 'feedface', file: 'docs/assets/icon.png' }],
    readObject: () => Buffer.from([0, 1, 2, 3]),
  });

  assert.deepEqual(failures, []);
});
