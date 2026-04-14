import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:4275',
    headless: true,
  },
  webServer: {
    command: 'pnpm build && pnpm preview:test',
    port: 4275,
    timeout: 120000,
    reuseExistingServer: false,
    cwd: webRoot,
  },
});
