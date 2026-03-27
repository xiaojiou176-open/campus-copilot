import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  manifest: {
    name: 'Campus Copilot',
    short_name: 'Campus Copilot',
    description: 'A local-first academic information organizer for Canvas, Gradescope, EdStem, and MyUW.',
    permissions: ['sidePanel', 'activeTab', 'scripting', 'downloads', 'storage'],
    host_permissions: [
      'https://canvas.uw.edu/*',
      'https://www.gradescope.com/*',
      'https://edstem.org/*',
      'https://us.edstem.org/*',
      'https://my.uw.edu/*',
      'http://127.0.0.1/*',
      'http://localhost/*',
    ],
  },
});
