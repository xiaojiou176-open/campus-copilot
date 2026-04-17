import { defineConfig } from 'wxt';

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
  srcDir: '.',
  hooks: {
    'vite:build:extendConfig': (entrypoints, viteConfig) => {
      const hasBackground = entrypoints.some((entrypoint) => entrypoint.type === 'background');
      if (hasBackground) {
        return;
      }

      viteConfig.build ??= {};
      viteConfig.build.rollupOptions ??= {};
      const output =
        Array.isArray(viteConfig.build.rollupOptions.output) || viteConfig.build.rollupOptions.output == null
          ? {}
          : viteConfig.build.rollupOptions.output;
      output.manualChunks = workspaceManualChunks;
      viteConfig.build.rollupOptions.output = output;
    },
  },
  manifest: {
    name: 'Campus Copilot for UW',
    short_name: 'Campus Copilot',
    description:
      'Campus Copilot for UW: a local-first academic decision workspace with cited AI over Canvas, Gradescope, EdStem, and MyUW.',
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    permissions: ['sidePanel', 'activeTab', 'scripting', 'downloads', 'storage'],
    host_permissions: [
      'https://canvas.uw.edu/*',
      'https://www.gradescope.com/*',
      'https://edstem.org/*',
      'https://us.edstem.org/*',
      'https://my.uw.edu/*',
      'https://myplan.uw.edu/*',
      'https://www.washington.edu/students/timeschd/*',
      'http://127.0.0.1/*',
      'http://localhost/*',
    ],
  },
});
