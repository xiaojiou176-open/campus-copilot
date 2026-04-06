import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.CAMPUS_COPILOT_WEB_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4175,
  },
  preview: {
    host: '127.0.0.1',
    port: 4175,
  },
});
