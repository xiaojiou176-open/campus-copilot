import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@campus-copilot/workspace-sdk': resolve(__dirname, '../workspace-sdk/src/index.ts'),
    },
  },
});
