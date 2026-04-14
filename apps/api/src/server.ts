import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { createCampusCopilotApiServer, loadApiEnv } from './index.ts';

const repoEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env');

if (existsSync(repoEnvPath)) {
  try {
    loadEnvFile(repoEnvPath);
  } catch {
    // Prefer the existing process environment when the local .env file cannot be loaded.
  }
}

const env = loadApiEnv();
const port = Number(env.PORT ?? '8787');
const host = env.HOST ?? '127.0.0.1';

const server = createCampusCopilotApiServer(env);

server.listen(port, host, () => {
  process.stdout.write(`Campus Copilot BFF listening on http://${host}:${port}\n`);
});
