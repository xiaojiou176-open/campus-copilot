import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@opencampus/workspace-sdk': resolve(__dirname, '../workspace-sdk/src/index.ts'),
    },
  },
});
