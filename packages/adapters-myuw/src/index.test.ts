import { describe, expect, it } from 'vitest';
import { createMyUWAdapter } from './index';

describe('MyUWAdapter', () => {
  it('parses notices and events from page state first', async () => {
    const adapter = createMyUWAdapter();
    const result = await adapter.sync({
      url: 'https://myuw.example.edu',
      site: 'myuw',
      now: '2026-03-24T18:00:00-07:00',
      pageState: {
        notices: [
          {
            id: 'notice-1',
            title: 'Registration window opens',
            postedAt: '2026-03-24T08:00:00-07:00',
            url: 'https://myuw.example.edu/notices/1',
          },
        ],
        events: [
          {
            id: 'event-1',
            title: 'Advising session',
            startAt: '2026-03-26T10:00:00-07:00',
            endAt: '2026-03-26T11:00:00-07:00',
            eventKind: 'class',
            url: 'https://myuw.example.edu/events/1',
          },
        ],
      },
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
      pageHtml: `
        <script data-myuw-notices>
          [{"id":"notice-2","title":"Campus update","postedAt":"2026-03-24T09:00:00-07:00","url":"https://myuw.example.edu/notices/2"}]
        </script>
        <script data-myuw-events>
          [{"id":"event-2","title":"Registration deadline","startAt":"2026-03-28T09:00:00-07:00","endAt":"2026-03-28T09:30:00-07:00","eventKind":"deadline","url":"https://myuw.example.edu/events/2"}]
        </script>
      `,
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
      pageHtml: `
        <div>
          <button
            data-bs-target="#noticeCard-5dd8d3f0a49087fb8a7033a879b8aa4a-collapse-108"
            aria-controls="noticeCard-5dd8d3f0a49087fb8a7033a879b8aa4a-collapse-108"
            type="button"
            class="btn btn-link p-0 border-0 align-top notice-link text-start myuw-text-md no-track-collapse collapsed track-collapse">
            <span class="d-inline-block fw-bold text-danger me-1 notice-critical">Critical:</span>
            <span><span class="notice-title">International Student Full-time Registration Reminder</span></span>
          </button>
        </div>
        <div id="noticeCard-5dd8d3f0a49087fb8a7033a879b8aa4a-collapse-108" class="collapse" tabindex="0">
          <div class="p-3 mt-2 bg-light text-dark notice-body myuw-text-md">
            <div><span class="notice-body-with-title">Spring quarter registration reminder</span></div>
          </div>
        </div>

        <div id="myuw-events">
          <div class="card-body p-3">
            <div class="myuw-card-body">
              <p class="text-muted myuw-text-md">Showing events in the next 14 days.</p>
              <ul class="list-unstyled mb-0 myuw-text-md">
            <li class="mb-2">
              <strong>Apr 6</strong>
              <a
                href="https://myuw.example.edu/events/1"
                aria-label="Apr 6. 9:00 AM. Dissertation defense. Location not available"
                class="d-block external-link">
                <span class="text-dark fw-light d-inline-block me-1">9:00 AM</span>
                <span>Dissertation defense</span>
              </a>
            </li>
              </ul>
            </div>
          </div>
        </div>
      `,
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
      pageHtml: `
        <script data-myuw-notices>not-json</script>
        <script data-myuw-events>[]</script>
      `,
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
});
