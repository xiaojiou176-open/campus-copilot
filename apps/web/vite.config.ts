import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.CAMPUS_COPILOT_WEB_BASE ?? '/';

function workspaceManualChunks(id: string) {
  if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
    return 'react-vendor';
  }

  if (id.includes('/packages/storage/')) {
    return 'storage-substrate';
  }

  if (id.includes('/packages/ai/')) {
    return 'ai-runtime';
  }

  return undefined;
}

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: workspaceManualChunks,
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4275,
  },
  preview: {
    host: '127.0.0.1',
    port: 4275,
  },
});
