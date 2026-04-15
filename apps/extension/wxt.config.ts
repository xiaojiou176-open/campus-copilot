import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
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
