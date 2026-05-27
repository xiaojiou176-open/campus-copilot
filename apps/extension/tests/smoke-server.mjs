import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const port = Number(process.env.EXTENSION_SMOKE_PORT ?? '4174');
const root = path.resolve(process.cwd(), 'dist/chrome-mv3');
const requiredFiles = ['sidepanel.html', 'options.html', 'popup.html'];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function resolveBuildFilePath(requestUrl) {
  const pathname = new URL(requestUrl ?? '/sidepanel.html', 'http://127.0.0.1').pathname;
  const normalizedPath = pathname === '/' ? '/sidepanel.html' : pathname;
  const filePath = path.resolve(root, `.${normalizedPath}`);
  const relativePath = path.relative(root, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return undefined;
  }

  return filePath;
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function ensureBuildExists() {
  const checks = await Promise.all(
    requiredFiles.map(async (fileName) => ({
      fileName,
      exists: await exists(path.join(root, fileName)),
    })),
  );

  const missing = checks.filter((check) => !check.exists).map((check) => check.fileName);

  if (missing.length > 0) {
    process.stderr.write(
      `missing exported extension build: ${missing.join(', ')} under ${root}\n` +
        'run `pnpm --filter @campus-copilot/extension build` before Playwright smoke.\n',
    );
    process.exit(1);
  }
}

const server = http.createServer(async (req, res) => {
  const filePath = resolveBuildFilePath(req.url);

  if (!filePath) {
    res.writeHead(400);
    res.end('invalid path');
    return;
  }

  if (!(await exists(filePath))) {
    res.writeHead(404);
    res.end('not found');
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, {
    'content-type': MIME_TYPES[ext] ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(res);
});

await ensureBuildExists();

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`smoke server listening on ${port}\n`);
});
