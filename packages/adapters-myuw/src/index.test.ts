import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMyUWAdapter } from './index';

function readFixture(relativePath: string) {
  return readFileSync(new URL(`./__fixtures__/live/${relativePath}`, import.meta.url), 'utf8');
}

function readJsonFixture<T>(relativePath: string): T {
  return JSON.parse(readFixture(relativePath)) as T;
}

describe('MyUWAdapter', () => {
  it('parses notices and events from page state first', async () => {
    const adapter = createMyUWAdapter();
    const result = await adapter.sync({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
      pageState: readJsonFixture('/page-state.json'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.announcements).toHaveLength(1);
      expect(result.snapshot.events).toHaveLength(1);
      expect(result.snapshot.announcements?.[0]?.kind).toBe('announcement');
      expect(result.snapshot.events?.[0]?.kind).toBe('event');
    }
  });

  it('falls back to DOM script payloads when page state is missing', async () => {
    const adapter = createMyUWAdapter();
    const result = await adapter.sync({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('script-payload.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.announcements?.[0]?.title).toBe('Campus update');
      expect(result.snapshot.events?.[0]?.eventKind).toBe('deadline');
      expect(result.attemptsByResource?.announcements?.[0]?.mode).toBe('state');
      expect(result.attemptsByResource?.announcements?.[0]?.skipped).toBe(true);
      expect(result.attemptsByResource?.announcements?.[1]?.mode).toBe('dom');
      expect(result.attemptsByResource?.announcements?.[1]?.success).toBe(true);
    }
  });

  it('parses visible notices and events from the current MyUW DOM when script payloads are absent', async () => {
    const adapter = createMyUWAdapter();
    const result = await adapter.sync({
      url: 'https://my.uw.edu/',
      site: 'myuw',
      now: '2026-03-26T18:00:00-07:00',
      pageHtml: readFixture('visible-dom.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.announcements?.[0]?.title).toBe(
        'International Student Full-time Registration Reminder',
      );
      expect(result.snapshot.events?.[0]?.title).toBe('Dissertation defense');
    }
  });

  it('returns unsupported_context when neither state nor DOM is available', async () => {
    const adapter = createMyUWAdapter();
    const result = await adapter.sync({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.outcome).toBe('unsupported_context');
    }
  });

  it('maps malformed DOM payloads to normalize_failed', async () => {
    const adapter = createMyUWAdapter();
    const result = await adapter.sync({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('malformed-script-payload.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.announcements).toBeUndefined();
      expect(result.snapshot.events).toHaveLength(0);
      expect(result.health.code).toBe('partial_success');
    }
  });

  it('reports capabilities and health for state/dom-first support', async () => {
    const adapter = createMyUWAdapter();
    const capabilities = await adapter.getCapabilities({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
      pageState: {},
    });
    const health = await adapter.healthCheck?.({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
      pageState: {},
    });

    expect(capabilities.resources.announcements?.preferredMode).toBe('state');
    expect(capabilities.resources.events?.preferredMode).toBe('dom');
    expect(health?.status).toBe('healthy');
  });

  it('replays the committed redacted live fixture set for regression coverage', async () => {
    const adapter = createMyUWAdapter();
    const result = await adapter.sync({
      url: 'https://my.uw.edu/',
      site: 'myuw',
      now: '2026-03-26T18:00:00-07:00',
      pageState: readJsonFixture('/page-state.json'),
      pageHtml: readFixture('visible-dom.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.announcements?.map((item) => item.id)).toContain('myuw:notice:notice-1');
      expect(result.snapshot.events?.some((item) => item.id === 'myuw:event:event-1')).toBe(true);
    }
  });
});
