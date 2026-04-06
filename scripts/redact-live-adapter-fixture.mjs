import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const USAGE = `Usage:
  node scripts/redact-live-adapter-fixture.mjs --kind <json|html> --input <path> --output <path>

Example:
  node scripts/redact-live-adapter-fixture.mjs \\
    --kind json \\
    --input .runtime-cache/raw/gradescope-internal-assignments.json \\
    --output .runtime-cache/live-fixtures/gradescope/internal-assignments.redacted.json
`;

const args = process.argv.slice(2);

function readFlag(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

if (args.includes('--help')) {
  process.stdout.write(`${USAGE}\n`);
  process.exit(0);
}

const kind = readFlag('--kind');
const inputPath = readFlag('--input');
const outputPath = readFlag('--output');

if (!kind || !inputPath || !outputPath || !['json', 'html'].includes(kind)) {
  process.stderr.write(`${USAGE}\n`);
  process.exit(1);
}

const repoRoot = process.cwd();
const absoluteInputPath = resolve(repoRoot, inputPath);
const absoluteOutputPath = resolve(repoRoot, outputPath);

const SEMANTIC_STRING_KEYS = new Set([
  'kind',
  'site',
  'status',
  'mode',
  'authMode',
  'workflow_state',
  'submission_status',
  'messageKind',
  'eventKind',
  'alertKind',
  'resourceType',
  'timelineKind',
  'classification',
  'reason',
]);

const SEMANTIC_STRING_VALUES = new Set([
  'available',
  'submitted',
  'graded',
  'missing',
  'overdue',
  'unknown',
  'deadline',
  'class',
  'exam',
  'notice',
  'other',
  'thread',
  'reply',
  'update',
  'todo',
  'success',
  'partial_success',
  'unsupported_context',
  'unauthorized',
  'request_failed',
  'collector_failed',
  'normalize_failed',
]);

function looksLikeIsoDateTime(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

function looksLikeRelativePath(value) {
  return value.startsWith('/');
}

function sanitizeUrl(value) {
  try {
    const url = new URL(value);
    const preservePathHosts = new Set([
      'canvas.uw.edu',
      'www.gradescope.com',
      'edstem.org',
      'us.edstem.org',
      'my.uw.edu',
    ]);

    if (!preservePathHosts.has(url.host)) {
      return '<redacted-url>';
    }

    // Keep path structure and path IDs intact because adapter parsers often
    // recover course/thread/assignment identifiers from URL segments.
    // Strip query and hash by default so the output stays review-friendly.
    return `${url.origin}${url.pathname}`;
  } catch {
    return '<redacted-url>';
  }
}

function shouldRedactNumericJsonValue(key, path) {
  if (!key) {
    return false;
  }

  if (/(user_id|uploaded_by_user_id|creator_id)$/i.test(key)) {
    return true;
  }

  if (key === 'id' && path.some((segment) => ['course_members', 'current_user', 'ownerships'].includes(segment))) {
    return true;
  }

  return false;
}

function sanitizeJson(value, key, path = []) {
  if (value === null || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return shouldRedactNumericJsonValue(key, path) ? 0 : value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeJson(entry, key, path));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        sanitizeJson(childValue, childKey, [...path, key].filter(Boolean)),
      ]),
    );
  }

  if (typeof value !== 'string') {
    return value;
  }

  if (value.length === 0) {
    return value;
  }

  if (SEMANTIC_STRING_KEYS.has(key ?? '') || SEMANTIC_STRING_VALUES.has(value)) {
    return value;
  }

  if (looksLikeIsoDateTime(value)) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return sanitizeUrl(value);
  }

  if ((key ?? '').toLowerCase().includes('url')) {
    return sanitizeUrl(value);
  }

  if ((key ?? '').toLowerCase().includes('path') || looksLikeRelativePath(value)) {
    return value;
  }

  if ((key ?? '').endsWith('At')) {
    return value;
  }

  if (/(title|name|summary|body|description|label)$/i.test(key ?? '')) {
    return `<redacted-${(key ?? 'text').toLowerCase()}>`;
  }

  return '<redacted-string>';
}

function sanitizeHtml(rawHtml) {
  return rawHtml
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '<redacted-email>')
    .replace(/https?:\/\/[^\s"'<>]+/g, (value) => sanitizeUrl(value))
    .replace(/\s(aria-label|title|placeholder|value)="[^"]*"/gi, (_match, key) => ` ${key}="redacted-${key.toLowerCase()}"`)
    .replace(/>([^<]+)</g, (_match, innerText) => {
      const normalized = innerText.replace(/\s+/g, ' ').trim();
      if (!normalized) {
        return `>${innerText}<`;
      }

      if (looksLikeIsoDateTime(normalized) || /^\d+([.:/ -]\d+)*$/.test(normalized)) {
        return `>${normalized}<`;
      }

      return '>redacted-text<';
    });
}

const rawInput = readFileSync(absoluteInputPath, 'utf8');
const sanitized =
  kind === 'json'
    ? JSON.stringify(sanitizeJson(JSON.parse(rawInput)), null, 2)
    : sanitizeHtml(rawInput);

mkdirSync(dirname(absoluteOutputPath), { recursive: true });
writeFileSync(absoluteOutputPath, sanitized, 'utf8');

process.stdout.write(
  JSON.stringify(
    {
      status: 'ok',
      kind,
      input: relative(repoRoot, absoluteInputPath),
      output: relative(repoRoot, absoluteOutputPath),
    },
    null,
    2,
  ) + '\n',
);
