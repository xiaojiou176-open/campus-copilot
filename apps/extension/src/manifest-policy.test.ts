import { describe, expect, it } from 'vitest';
import config from '../wxt.config';

describe('extension manifest policy', () => {
  it('keeps the current permission boundary narrow, cookie-free, storage-backed, scoped to the supported campus pages plus the local BFF loopback hosts, and away from red-zone registration hosts', () => {
    const manifest =
      typeof config.manifest === 'function' || config.manifest instanceof Promise ? undefined : config.manifest;

    expect(manifest?.permissions).toEqual(['sidePanel', 'activeTab', 'scripting', 'downloads', 'storage']);
    expect(manifest?.permissions).not.toContain('cookies');
    expect(manifest?.host_permissions).not.toContain('https://register.uw.edu/*');
    expect(manifest?.host_permissions).not.toContain('https://notify.uw.edu/*');
    expect(manifest?.host_permissions).toEqual([
      'https://canvas.uw.edu/*',
      'https://www.gradescope.com/*',
      'https://edstem.org/*',
      'https://us.edstem.org/*',
      'https://my.uw.edu/*',
      'https://myplan.uw.edu/*',
      'https://www.washington.edu/students/timeschd/*',
      'http://127.0.0.1/*',
      'http://localhost/*',
    ]);
  });
});
