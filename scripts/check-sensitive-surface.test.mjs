import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { collectFixtureContentFailures, collectSensitiveSurfaceFailures } from './check-sensitive-surface.mjs';

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

test('skips tracked files that are already deleted from the working tree', () => {
  const failures = collectSensitiveSurfaceFailures({
    trackedFiles: ['design-system/campus-copilot/MASTER.md'],
    readTrackedFile: () => undefined,
  });

  assert.deepEqual(failures, []);
});

test('fails tracked fixture files that still contain direct email addresses or mailto links', () => {
  const fixture = [
    '<html>',
    '  <body>',
    '    <a href="mailto:instructor@uw.edu">instructor@uw.edu</a>',
    '  </body>',
    '</html>',
  ].join('\n');

  const failures = collectFixtureContentFailures({
    file: 'packages/adapters-example/src/__fixtures__/live/example.html',
    buffer: Buffer.from(fixture, 'utf8'),
  });

  assert.match(failures.join('\n'), /fixture_email_pattern:packages\/adapters-example\/src\/__fixtures__\/live\/example\.html:3/);
  assert.match(failures.join('\n'), /fixture_mailto_link:packages\/adapters-example\/src\/__fixtures__\/live\/example\.html:3/);
});

test('flags high-sensitivity live fixtures with real host urls and stable ids', () => {
  const fixture = JSON.stringify(
    {
      user_id: 44896,
      question_submission_id: 3493570125,
      annotatable_id: 1695676780,
      url: 'https://www.gradescope.com/courses/17/assignments/9/submissions/1',
    },
    null,
    2,
  );

  const failures = collectFixtureContentFailures({
    file: 'packages/adapters-gradescope/src/__fixtures__/live/example.json',
    buffer: Buffer.from(fixture, 'utf8'),
  });

  assert.match(failures.join('\n'), /fixture_stable_identifier_key:packages\/adapters-gradescope\/src\/__fixtures__\/live\/example\.json:2/);
  assert.match(failures.join('\n'), /fixture_real_host_url:packages\/adapters-gradescope\/src\/__fixtures__\/live\/example\.json:5/);
});

test('flags newly introduced durable numeric ids and relative-or-example identifier urls in sensitive fixtures', () => {
  const gradescopeFixture = JSON.stringify(
    {
      assignment_id: 7421057,
      url: 'https://gradescope.example.test/courses/1211108/assignments/7421057/submissions/380090124',
    },
    null,
    2,
  );
  const edstemFixture = [
    '<div class="discuss-comment" data-comment-id="1645665">',
    '  <a href="/us/courses/855/discussion/709033?comment=1645665">redacted-text</a>',
    '</div>',
  ].join('\n');
  const myuwFixture = JSON.stringify(
    {
      id: 'notice-27',
      url: 'https://myuw.example.edu/notices/27',
    },
    null,
    2,
  );

  const gradescopeFailures = collectFixtureContentFailures({
    file: 'packages/adapters-gradescope/src/__fixtures__/live/new-sensitive.json',
    buffer: Buffer.from(gradescopeFixture, 'utf8'),
  });
  const edstemFailures = collectFixtureContentFailures({
    file: 'packages/adapters-edstem/src/__fixtures__/live/new-thread.html',
    buffer: Buffer.from(edstemFixture, 'utf8'),
  });
  const myuwFailures = collectFixtureContentFailures({
    file: 'packages/adapters-myuw/src/__fixtures__/live/new-page-state.json',
    buffer: Buffer.from(myuwFixture, 'utf8'),
  });

  assert.match(
    gradescopeFailures.join('\n'),
    /fixture_sensitive_numeric_id_key:packages\/adapters-gradescope\/src\/__fixtures__\/live\/new-sensitive\.json:2/,
  );
  assert.match(
    gradescopeFailures.join('\n'),
    /fixture_sensitive_identifier_url:packages\/adapters-gradescope\/src\/__fixtures__\/live\/new-sensitive\.json:3/,
  );
  assert.match(
    edstemFailures.join('\n'),
    /fixture_sensitive_identifier_url:packages\/adapters-edstem\/src\/__fixtures__\/live\/new-thread\.html:2/,
  );
  assert.match(
    edstemFailures.join('\n'),
    /fixture_sensitive_dom_id_attr:packages\/adapters-edstem\/src\/__fixtures__\/live\/new-thread\.html:1/,
  );
  assert.match(
    myuwFailures.join('\n'),
    /fixture_sensitive_named_id_key:packages\/adapters-myuw\/src\/__fixtures__\/live\/new-page-state\.json:2/,
  );
  assert.match(
    myuwFailures.join('\n'),
    /fixture_sensitive_identifier_url:packages\/adapters-myuw\/src\/__fixtures__\/live\/new-page-state\.json:3/,
  );
});

test('flags admin inline samples that still contain raw markers', () => {
  const fixture = [
    'const accountsHtml = `',
    '<html><title>Financial Aid Status</title></html>',
    '`;',
  ].join('\n');

  const failures = collectFixtureContentFailures({
    file: 'apps/extension/src/background-admin-high-sensitivity-substrate.test.ts',
    buffer: Buffer.from(fixture, 'utf8'),
  });

  assert.match(failures.join('\n'), /fixture_admin_raw_marker:apps\/extension\/src\/background-admin-high-sensitivity-substrate\.test\.ts:2/);
});

test('keeps current redacted baseline sensitive fixtures grandfathered while tightening future matches', () => {
  const gradescopeFixture = JSON.stringify(
    {
      assignment_id: 7421057,
      url: 'https://gradescope.example.test/courses/course-17/assignments/assignment-9/submissions/submission-1',
    },
    null,
    2,
  );
  const edstemFixture = [
    '<div class="discuss-comment" data-comment-id="1645665">',
    '  <a href="/us/courses/855/discussion/709033?comment=1645665">redacted-text</a>',
    '</div>',
  ].join('\n');
  const myuwFixture = JSON.stringify(
    {
      id: 'notice-1',
      url: 'https://myuw.example.edu/notices/1',
    },
    null,
    2,
  );

  const gradescopeFailures = collectFixtureContentFailures({
    file: 'packages/adapters-gradescope/src/__fixtures__/live/course-internal-grades.json',
    buffer: Buffer.from(gradescopeFixture, 'utf8'),
  });
  const edstemFailures = collectFixtureContentFailures({
    file: 'packages/adapters-edstem/src/__fixtures__/live/thread-detail-page.html',
    buffer: Buffer.from(edstemFixture, 'utf8'),
  });
  const myuwFailures = collectFixtureContentFailures({
    file: 'packages/adapters-myuw/src/__fixtures__/live/page-state.json',
    buffer: Buffer.from(myuwFixture, 'utf8'),
  });

  assert.deepEqual(gradescopeFailures, []);
  assert.deepEqual(edstemFailures, []);
  assert.deepEqual(myuwFailures, []);
});

test('still flags later sensitive matches in a file even when the first match is grandfathered', () => {
  const fixture = [
    '<a href="/courses/1211108">existing baseline</a>',
    '<a href="/courses/9999999/assignments/8888888/submissions/7777777">new leak</a>',
  ].join('\n');

  const failures = collectFixtureContentFailures({
    file: 'packages/adapters-gradescope/src/__fixtures__/live/course-sidebar.html',
    buffer: Buffer.from(fixture, 'utf8'),
  });

  assert.match(
    failures.join('\n'),
    /fixture_sensitive_identifier_url:packages\/adapters-gradescope\/src\/__fixtures__\/live\/course-sidebar\.html:2/,
  );
});

test('does not flag public exemplar fixtures just because they contain public absolute urls', () => {
  const fixture = '<a href="https://courses.cs.washington.edu/courses/cse312/26sp/">Home</a>';

  const failures = collectFixtureContentFailures({
    file: 'packages/adapters-course-sites/src/__fixtures__/home-cse312.html',
    buffer: Buffer.from(fixture, 'utf8'),
  });

  assert.deepEqual(failures, []);
});
