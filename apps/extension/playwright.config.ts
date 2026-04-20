import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const smokeServerPort = Number(process.env.EXTENSION_SMOKE_PORT ?? '4174');
const extensionRoot = path.dirname(fileURLToPath(import.meta.url));
const sanitizedEnv = { ...process.env };
delete sanitizedEnv.NO_COLOR;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${smokeServerPort}`,
    headless: true,
  },
  webServer: {
    command: 'node tests/smoke-server.mjs',
    port: smokeServerPort,
    reuseExistingServer: false,
    cwd: extensionRoot,
    env: sanitizedEnv,
  },
});
