import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

export const forbiddenTrackedPathRules = [
  { pattern: /^\.env$/, code: 'tracked_secret_env_file' },
  { pattern: /^\.env\.(?!example$).+$/, code: 'tracked_secret_env_variant' },
  { pattern: /^\.runtime-cache\//, code: 'tracked_runtime_artifact' },
  { pattern: /^logs\//, code: 'tracked_log_artifact' },
  { pattern: /^cache\//, code: 'tracked_cache_artifact' },
  { pattern: /^\.cache\//, code: 'tracked_hidden_cache_artifact' },
  { pattern: /^\.agent\//, code: 'tracked_agent_workdir' },
  { pattern: /^\.codex\//, code: 'tracked_codex_workdir' },
  { pattern: /^\.claude\//, code: 'tracked_claude_workdir' },
  { pattern: /^\.serena\//, code: 'tracked_serena_workdir' },
  { pattern: /^\.agents\/(?!skills\/)/, code: 'tracked_local_agents_artifact' },
];

export const forbiddenContentRules = [
  { pattern: /\/Users\/[^/\s]+\/[^\n]*/g, code: 'absolute_local_path' },
  { pattern: /\/home\/[^/\s]+\/[^\n]*/g, code: 'absolute_local_path' },
  { pattern: /[A-Za-z]:\\Users\\[^\\\s]+\\[^\n]*/g, code: 'absolute_local_path' },
  { pattern: /gh[pousr]_[A-Za-z0-9]{20,}/g, code: 'github_token_pattern' },
  { pattern: /github_pat_[A-Za-z0-9_]{20,}/g, code: 'github_pat_pattern' },
  { pattern: /(?<![A-Za-z0-9])sk-(?:live|proj|test)?[A-Za-z0-9_-]{16,}(?![A-Za-z0-9])/g, code: 'openai_token_pattern' },
  { pattern: /AKIA[0-9A-Z]{16}/g, code: 'aws_access_key_pattern' },
  { pattern: /ASIA[0-9A-Z]{16}/g, code: 'aws_sts_key_pattern' },
  { pattern: /AIza[0-9A-Za-z_-]{35}/g, code: 'google_api_key_pattern' },
  { pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/g, code: 'slack_token_pattern' },
  { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, code: 'private_key_marker' },
];

export const fixtureForbiddenContentRules = [
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, code: 'fixture_email_pattern' },
  { pattern: /mailto:/gi, code: 'fixture_mailto_link' },
];

export const sensitiveFixtureForbiddenContentRules = [
  {
    pattern:
      /https?:\/\/(?:www\.)?gradescope\.com\b|https?:\/\/(?:us\.)?edstem\.org\b|https?:\/\/myplan\.uw\.edu\b|https?:\/\/register\.uw\.edu\b|https?:\/\/my\.uw\.edu\b|https?:\/\/sdb\.admin\.uw\.edu\b/gi,
    code: 'fixture_real_host_url',
  },
  {
    pattern: /"(?:user_id|submission_id|question_submission_id|annotatable_id|uploaded_by_user_id|creator_id)"\s*:/gi,
    code: 'fixture_stable_identifier_key',
  },
  {
    pattern: /"(?:assignment_id|thread_id)"\s*:\s*\d+/gi,
    code: 'fixture_sensitive_numeric_id_key',
  },
  {
    pattern: /"id"\s*:\s*"(?:notice|event)-\d+"/gi,
    code: 'fixture_sensitive_named_id_key',
  },
  {
    pattern:
      /(?:https?:\/\/(?:gradescope\.example\.test|myuw\.example\.edu)|\/)(?:courses\/\d+(?:\/assignments\/\d+(?:\/submissions\/\d+)?)?|us\/courses\/\d+(?:\/discussion\/\d+(?:\?comment=\d+)?)?|notices\/\d+|events\/\d+)/gi,
    code: 'fixture_sensitive_identifier_url',
  },
  {
    pattern: /data-comment-id="\d+"/gi,
    code: 'fixture_sensitive_dom_id_attr',
  },
  {
    pattern:
      /\b(?:Registration window opens|Advising session|Campus update|Registration deadline|Project kickoff|Recent staff reply|Unread follow-up|Allen School Career Board|Career-related events)\b/g,
    code: 'fixture_reidentifiable_title',
  },
  {
    pattern:
      /\b(?:Unofficial Transcript|Financial Aid Status|Student Fiscal Services \(SFS\)|Total Educational Borrowing|Estimated Monthly Loan Payment)\b/g,
    code: 'fixture_admin_raw_marker',
  },
];

const grandfatheredSensitiveFixtureMatches = [
  {
    code: 'fixture_sensitive_numeric_id_key',
    filePattern: /^packages\/adapters-gradescope\/src\/__fixtures__\/live\/(?:internal|course-internal)-grades\.json$/,
    matchPattern: /"assignment_id"\s*:\s*(?:9|7421057)/,
  },
  {
    code: 'fixture_sensitive_numeric_id_key',
    filePattern: /^packages\/adapters-edstem\/src\/__fixtures__\/live\/(?:unread|recent)-activity\.json$/,
    matchPattern: /"thread_id"\s*:\s*7/,
  },
  {
    code: 'fixture_sensitive_named_id_key',
    filePattern: /^packages\/adapters-myuw\/src\/__fixtures__\/live\/(?:page-state\.json|script-payload\.html)$/,
    matchPattern: /"id"\s*:\s*"(?:notice|event)-[12]"/,
  },
  {
    code: 'fixture_sensitive_identifier_url',
    filePattern: /^packages\/adapters-gradescope\/src\/__fixtures__\/live\/(?:course-sidebar|dashboard-course-boxes)\.html$/,
    matchPattern: /\/courses\/1211108/,
  },
  {
    code: 'fixture_sensitive_identifier_url',
    filePattern: /^packages\/adapters-gradescope\/src\/__fixtures__\/live\/course-page-row\.html$/,
    matchPattern: /\/courses\/1211108\/assignments\/7421057\/submissions\/380090124/,
  },
  {
    code: 'fixture_sensitive_identifier_url',
    filePattern:
      /^packages\/adapters-gradescope\/src\/__fixtures__\/live\/submission-question-detail(?:-evaluations|-multi)?\.html$/,
    matchPattern: /\/courses\/(?:1064763|1144890|1211108)/,
  },
  {
    code: 'fixture_sensitive_identifier_url',
    filePattern: /^packages\/adapters-gradescope\/src\/__fixtures__\/live\/(?:course-)?internal-(?:assignments|grades)\.json$/,
    matchPattern:
      /https:\/\/gradescope\.example\.test\/courses\/course-17\/assignments\/assignment-9\/submissions\/submission-1/,
  },
  {
    code: 'fixture_sensitive_identifier_url',
    filePattern: /^packages\/adapters-edstem\/src\/__fixtures__\/live\/dashboard(?:-profile13)?\.html$/,
    matchPattern: /\/us\/courses\/(?:488|855|90031)/,
  },
  {
    code: 'fixture_sensitive_identifier_url',
    filePattern: /^packages\/adapters-edstem\/src\/__fixtures__\/live\/thread-detail-page\.html$/,
    matchPattern: /\/us\/courses\/855\/discussion\/709033(?:\?comment=\d+)?/,
  },
  {
    code: 'fixture_sensitive_dom_id_attr',
    filePattern: /^packages\/adapters-edstem\/src\/__fixtures__\/live\/thread-detail-page\.html$/,
    matchPattern: /data-comment-id="(?:1645665|1645724|1651940|1654435)"/,
  },
  {
    code: 'fixture_sensitive_identifier_url',
    filePattern: /^packages\/adapters-myuw\/src\/__fixtures__\/live\/(?:page-state\.json|script-payload\.html|visible-dom\.html)$/,
    matchPattern: /(?:https:\/\/myuw\.example\.edu)?\/(?:notices|events)\/[12]/,
  },
];

function isProbablyBinary(buffer) {
  return buffer.includes(0);
}

function getLineNumber(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) {
      line += 1;
    }
  }
  return line;
}

function buildFailure(code, { file, content, matchIndex, prefix = '', objectId = '' }) {
  const objectSuffix = objectId.length > 0 ? `@${objectId}` : '';
  return `${prefix}${code}:${file}${objectSuffix}:${getLineNumber(content, matchIndex)}`;
}

function isGrandfatheredSensitiveFixtureMatch({ code, file, matchedText }) {
  return grandfatheredSensitiveFixtureMatches.some(
    (rule) => rule.code === code && rule.filePattern.test(file) && rule.matchPattern.test(matchedText),
  );
}

function isFixtureLikePath(file) {
  return file.includes('/__fixtures__/') || file.includes('/tests/fixtures/');
}

function isSensitiveFixturePath(file) {
  return (
    /^apps\/extension\/src\/background-admin-high-sensitivity-substrate\.test\.ts$/.test(file) ||
    /^packages\/adapters-(gradescope|edstem|myplan|myuw)\/src\/__fixtures__\/(?:live|redacted)\//.test(file)
  );
}

export function collectTrackedPathFailures({ files, prefix = '' }) {
  const failures = [];

  for (const file of files) {
    for (const rule of forbiddenTrackedPathRules) {
      if (rule.pattern.test(file)) {
        failures.push(`${prefix}${rule.code}:${file}`);
      }
    }
  }

  return failures;
}

export function collectContentFailures({ file, buffer, prefix = '', objectId = '' }) {
  if (isProbablyBinary(buffer)) {
    return [];
  }

  const failures = [];
  const content = buffer.toString('utf8');
  const objectSuffix = objectId.length > 0 ? `@${objectId}` : '';

  for (const rule of forbiddenContentRules) {
    const match = rule.pattern.exec(content);
    rule.pattern.lastIndex = 0;
    if (!match) {
      continue;
    }

    failures.push(`${prefix}${rule.code}:${file}${objectSuffix}:${getLineNumber(content, match.index)}`);
  }

  return failures;
}

export function collectSensitiveSurfaceFailures({ trackedFiles, readTrackedFile }) {
  const failures = [];

  for (const file of trackedFiles) {
    failures.push(...collectTrackedPathFailures({ files: [file] }));

    let buffer;
    try {
      buffer = readTrackedFile(file);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    if (!buffer) {
      continue;
    }
    failures.push(...collectContentFailures({ file, buffer }));

    failures.push(...collectFixtureContentFailures({ file, buffer }));
  }

  return failures;
}

export function collectFixtureContentFailures({ file, buffer, prefix = '', objectId = '' }) {
  if (isProbablyBinary(buffer)) {
    return [];
  }

  const failures = [];
  const content = buffer.toString('utf8');

  if (isFixtureLikePath(file)) {
    for (const rule of fixtureForbiddenContentRules) {
      let match;
      while ((match = rule.pattern.exec(content)) !== null) {
        failures.push(buildFailure(rule.code, { file, content, matchIndex: match.index, prefix, objectId }));
      }
      rule.pattern.lastIndex = 0;
    }
  }

  if (isSensitiveFixturePath(file)) {
    for (const rule of sensitiveFixtureForbiddenContentRules) {
      let match;
      while ((match = rule.pattern.exec(content)) !== null) {
        if (isGrandfatheredSensitiveFixtureMatch({ code: rule.code, file, matchedText: match[0] })) {
          continue;
        }
        failures.push(buildFailure(rule.code, { file, content, matchIndex: match.index, prefix, objectId }));
      }
      rule.pattern.lastIndex = 0;
    }
  }

  return failures;
}

function listTrackedFiles() {
  const stdout = execFileSync('git', ['ls-files', '-z'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return stdout
    .split('\0')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function main() {
  const failures = collectSensitiveSurfaceFailures({
    trackedFiles: listTrackedFiles(),
    readTrackedFile: (file) => (existsSync(file) ? readFileSync(file) : undefined),
  });

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log('sensitive_surface_ok');
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
