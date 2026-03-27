import { defineConfig } from '@playwright/test';

const smokeServerPort = Number(process.env.EXTENSION_SMOKE_PORT ?? '4174');

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
    cwd: process.cwd(),
  },
});
