import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  EdStemApiClient,
  createEdStemAdapter,
  type EdStemPathConfig,
  type EdStemRequestExecutor,
} from './index';

const paths: EdStemPathConfig = {
  threadsPath: '/api/courses/11/threads?limit=30&sort=new',
  unreadPath: '/configured/unread-activity',
  recentActivityPath: '/configured/recent-activity',
};

const threadDetailPaths: EdStemPathConfig = {
  threadsPath: '/api/courses/855/threads?limit=5&sort=new',
};

const resourcePaths: EdStemPathConfig = {
  threadsPath: '/api/courses/90031/threads?limit=30&sort=new',
};

const lessonPaths: EdStemPathConfig = {
  threadsPath: '/api/courses/96846/threads?limit=30&sort=new',
};

const lessonDetailPaths: EdStemPathConfig = {
  threadsPath: '/api/courses/96846/threads?limit=30&sort=new',
};

function readFixture(relativePath: string) {
  return readFileSync(new URL(`./__fixtures__/live/${relativePath}`, import.meta.url), 'utf8');
}

function readJsonFixture<T>(relativePath: string): T {
  return JSON.parse(readFixture(relativePath)) as T;
}

const okExecutor =
  (payloads: Record<string, unknown>): EdStemRequestExecutor =>
  async (path) => {
    const payload = payloads[path];
    if (payload === undefined) {
      if (/^\/api\/courses\/\d+\/resources$/.test(path)) {
        return {
          ok: true,
          status: 200,
          responseUrl: `https://us.edstem.org${path}`,
          bodyText: JSON.stringify({ resources: [] }),
          contentType: 'application/json',
        };
      }

      return {
        ok: false,
        code: 'request_failed',
        message: `No mock payload for ${path}`,
        status: 500,
      };
    }

    return {
        ok: true,
        status: 200,
        responseUrl: `https://us.edstem.org${path}`,
        bodyText: JSON.stringify(payload),
        contentType: 'application/json',
      };
  };

describe('EdStemApiClient', () => {
  it('maps 401/403 into unauthorized errors', async () => {
    const client = new EdStemApiClient(
      async () => ({
        ok: true,
        status: 401,
        responseUrl: 'https://us.edstem.org/api/courses/11/threads?limit=30&sort=new',
        bodyText: '{"error":"unauthorized"}',
        contentType: 'application/json',
      }),
      paths,
    );

    await expect(client.getThreads()).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('rejects malformed JSON payloads', async () => {
    const client = new EdStemApiClient(
      async () => ({
        ok: true,
        status: 200,
        responseUrl: 'https://us.edstem.org/api/courses/11/threads?limit=30&sort=new',
        bodyText: '{"not":"an array"}',
        contentType: 'application/json',
      }),
      paths,
    );

    await expect(client.getThreads()).rejects.toMatchObject({
      code: 'malformed_response',
    });
  });

  it('parses threads, unread, and recent activity into unified messages', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/user': {
          courses: [
            {
              course: {
                id: 11,
                code: 'CSE 312 - 26wi',
                name: 'Foundations of Computing II',
              },
            },
          ],
        },
        '/api/courses/11/threads?limit=30&sort=new': readJsonFixture('/threads.json'),
        '/configured/unread-activity': readJsonFixture('/unread-activity.json'),
        '/configured/recent-activity': readJsonFixture('/recent-activity.json'),
      }),
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/11/discussion/7',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.courses?.[0]).toMatchObject({
        id: 'edstem:course:11',
        title: 'Foundations of Computing II',
        code: 'CSE 312 - 26wi',
      });
      expect(result.snapshot.messages).toHaveLength(3);
      expect(result.snapshot.messages?.[0]?.site).toBe('edstem');
      expect(result.snapshot.messages?.some((item) => item.summary && !item.summary.includes('<'))).toBe(true);
      expect(result.snapshot.messages?.some((item) => item.unread)).toBe(true);
      expect(result.snapshot.messages?.some((item) => item.instructorAuthored)).toBe(true);
    }
  });

  it('returns capabilities and health scoped to edstem private-request phase support', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/user': {
          courses: [],
        },
        '/api/courses/11/threads?limit=30&sort=new': [],
        '/configured/unread-activity': [],
        '/configured/recent-activity': [],
      }),
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const capabilities = await adapter.getCapabilities({
      url: 'https://edstem.org/us/courses/11',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
    });
    const health = await adapter.healthCheck?.({
      url: 'https://edstem.org/us/courses/11',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(capabilities.dom).toBe(true);
    expect(capabilities.resources.courses?.modes).toEqual(['private_api', 'dom']);
    expect(capabilities.resources.courses?.preferredMode).toBe('private_api');
    expect(capabilities.resources.messages?.modes).toEqual(['private_api', 'dom']);
    expect(capabilities.resources.messages?.preferredMode).toBe('private_api');
    expect(capabilities.resources.resources?.modes).toEqual(['private_api', 'dom']);
    expect(capabilities.resources.resources?.preferredMode).toBe('private_api');
    expect(health?.status).toBe('healthy');
  });

  it('treats empty thread/activity payloads as a valid empty snapshot', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/user': {
          courses: [],
        },
        '/api/courses/11/threads?limit=30&sort=new': [],
        '/configured/unread-activity': [],
        '/configured/recent-activity': [],
      }),
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/11',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.messages).toHaveLength(0);
    }
  });

  it('keeps private EdStem sync usable when inferred unread and recent paths are unavailable', async () => {
    const client = new EdStemApiClient(
      async (path) => {
        if (path === '/api/user') {
          return {
            ok: true,
            status: 200,
            responseUrl: 'https://us.edstem.org/api/user',
            bodyText: JSON.stringify({
              courses: [
                {
                  course: {
                    id: 11,
                    code: 'CSE 312 - 26wi',
                    name: 'Foundations of Computing II',
                  },
                },
              ],
            }),
            contentType: 'application/json',
          };
        }

        if (path === '/api/courses/11/threads?limit=30&sort=new') {
          return {
            ok: true,
            status: 200,
            responseUrl: 'https://us.edstem.org/api/courses/11/threads?limit=30&sort=new',
            bodyText: readFixture('/threads.json'),
            contentType: 'application/json',
          };
        }

        if (path === '/api/courses/11/resources') {
          return {
            ok: true,
            status: 200,
            responseUrl: 'https://us.edstem.org/api/courses/11/resources',
            bodyText: JSON.stringify({ resources: [] }),
            contentType: 'application/json',
          };
        }

        return {
          ok: true,
          status: 404,
          responseUrl: `https://us.edstem.org${path}`,
          bodyText: '{}',
          contentType: 'application/json',
        };
      },
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/11/discussion/7',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses?.[0]?.id).toBe('edstem:course:11');
      expect(result.snapshot.messages?.map((item) => item.id)).toEqual(['edstem:message:7']);
    }
  });

  it('keeps private EdStem sync usable when optional unread and recent paths return HTML instead of JSON', async () => {
    const client = new EdStemApiClient(
      async (path) => {
        if (path === '/api/user') {
          return {
            ok: true,
            status: 200,
            responseUrl: 'https://us.edstem.org/api/user',
            bodyText: JSON.stringify({
              courses: [
                {
                  course: {
                    id: 11,
                    code: 'CSE 312 - 26wi',
                    name: 'Foundations of Computing II',
                  },
                },
              ],
            }),
            contentType: 'application/json',
          };
        }

        if (path === '/api/courses/11/threads?limit=30&sort=new') {
          return {
            ok: true,
            status: 200,
            responseUrl: 'https://us.edstem.org/api/courses/11/threads?limit=30&sort=new',
            bodyText: readFixture('/threads.json'),
            contentType: 'application/json',
          };
        }

        if (path === '/api/courses/11/resources') {
          return {
            ok: true,
            status: 200,
            responseUrl: 'https://us.edstem.org/api/courses/11/resources',
            bodyText: JSON.stringify({ resources: [] }),
            contentType: 'application/json',
          };
        }

        return {
          ok: true,
          status: 200,
          responseUrl: `https://us.edstem.org${path}`,
          bodyText: '<!doctype html><title>Ed Discussion</title>',
          contentType: 'text/html; charset=utf-8',
        };
      },
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/11/discussion/7',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses?.[0]?.id).toBe('edstem:course:11');
      expect(result.snapshot.messages?.map((item) => item.id)).toEqual(['edstem:message:7']);
    }
  });

  it('falls back to dashboard DOM and returns partial_success when private endpoints are unavailable', async () => {
    const client = new EdStemApiClient(
      async () => ({
        ok: false,
        code: 'unsupported_context',
        message: 'EdStem session-backed request path is unavailable.',
        status: 404,
      }),
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/dashboard',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
      pageHtml: readFixture('dashboard.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.messages?.[0]?.title).toContain('CSE 312 - 26wi');
      expect(result.snapshot.messages?.[0]?.messageKind).toBe('update');
      expect(result.health.code).toBe('partial_success');
    }
  });

  it('returns partial_success when messages succeed but course metadata is unavailable', async () => {
    const client = new EdStemApiClient(
      async (path) => {
        if (path === '/api/user') {
          return {
            ok: true,
            status: 404,
            responseUrl: 'https://us.edstem.org/api/user',
            bodyText: JSON.stringify({ error: 'missing' }),
            contentType: 'application/json',
          };
        }

        if (path === '/api/courses/11/threads?limit=30&sort=new') {
          return {
            ok: true,
            status: 200,
            responseUrl: 'https://us.edstem.org/api/courses/11/threads?limit=30&sort=new',
            bodyText: JSON.stringify({
              threads: [
                {
                  id: 7,
                  course_id: 11,
                  title: 'Wrapping up the quarter',
                  updated_at: '2026-03-26T20:22:29.739841+11:00',
                },
              ],
              users: [],
            }),
            contentType: 'application/json',
          };
        }

        return {
          ok: true,
          status: 200,
          responseUrl: `https://us.edstem.org${path}`,
          bodyText: JSON.stringify([]),
          contentType: 'application/json',
        };
      },
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/11/discussion/7',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.health.code).toBe('partial_success');
      expect(result.health.reason).toBe('edstem_course_metadata_partial');
      expect(result.snapshot.courses).toBeUndefined();
      expect(result.snapshot.messages?.map((item) => item.id)).toEqual(['edstem:message:7']);
    }
  });

  it('replays the committed redacted live fixture set for regression coverage', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/user': {
          courses: [
            {
              course: {
                id: 11,
                code: 'CSE 312 - 26wi',
                name: 'Foundations of Computing II',
              },
            },
          ],
        },
        '/api/courses/11/threads?limit=30&sort=new': readJsonFixture('/threads.json'),
        '/configured/unread-activity': readJsonFixture('/unread-activity.json'),
        '/configured/recent-activity': readJsonFixture('/recent-activity.json'),
      }),
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/11/discussion/7',
      site: 'edstem',
      now: '2026-03-24T18:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.messages?.map((item) => item.id)).toEqual([
        'edstem:message:7',
        'edstem:message:8',
        'edstem:message:9',
      ]);
    }
  });

  it('replays a redacted live dashboard capture from profile 13 for DOM fallback coverage', async () => {
    const client = new EdStemApiClient(
      async () => ({
        ok: false,
        code: 'unsupported_context',
        message: 'EdStem session-backed request path is unavailable.',
        status: 404,
      }),
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/dashboard',
      site: 'edstem',
      now: '2026-03-29T03:01:07.800Z',
      pageHtml: readFixture('dashboard-profile13.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.courses?.map((item) => item.id).sort()).toEqual([
        'edstem:course:488',
        'edstem:course:855',
      ]);
      expect(result.snapshot.courses?.every((item) => item.code === 'redacted-course-code')).toBe(true);
      expect(result.snapshot.messages?.map((item) => item.id)).toEqual([
        'edstem:message:dashboard-course:855',
        'edstem:message:dashboard-course:488',
      ]);
      expect(result.snapshot.messages?.map((item) => item.courseId)).toEqual([
        'edstem:course:855',
        'edstem:course:488',
      ]);
    }
  });

  it('replays a redacted live thread-detail DOM capture with reply bodies', async () => {
    const client = new EdStemApiClient(
      async () => ({
        ok: false,
        code: 'unsupported_context',
        message: 'EdStem session-backed request path is unavailable.',
        status: 404,
      }),
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/855/discussion/709033',
      site: 'edstem',
      now: '2026-04-05T16:00:00-07:00',
      pageHtml: readFixture('thread-detail-page.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.snapshot.courses).toEqual([
        expect.objectContaining({
          id: 'edstem:course:855',
          title: 'redacted-text',
        }),
      ]);
      expect(result.snapshot.messages?.map((item) => item.id)).toEqual([
        'edstem:message:709033',
        'edstem:message:1645665',
        'edstem:message:1645724',
        'edstem:message:1651940',
        'edstem:message:1654435',
      ]);
      expect(result.snapshot.messages?.map((item) => item.messageKind)).toEqual([
        'thread',
        'reply',
        'reply',
        'reply',
        'reply',
      ]);
      expect(result.snapshot.messages?.every((item) => item.threadId === '709033')).toBe(true);
      expect(result.snapshot.messages?.[0]).toMatchObject({
        category: 'redacted-text',
        instructorAuthored: true,
        source: {
          resourceType: 'thread',
        },
      });
      expect(result.snapshot.messages?.[0]?.summary).toContain('redacted-text');
      expect(result.snapshot.messages?.[4]).toMatchObject({
        source: {
          resourceType: 'reply',
        },
        url: 'https://edstem.org/us/courses/855/discussion/709033?comment=1654435',
      });
      expect(result.snapshot.messages?.[4]?.summary).not.toContain('<');
      expect(result.health.code).toBe('partial_success');
    }
  });

  it('commits a redacted resources DOM proof fixture for future EdStem promotion', () => {
    const html = readFixture('resources-page.html');

    expect(html).toContain('class="res-group"');
    expect(html).toContain('class="res-name"');
    expect(html).toContain('class="res-type"');
    expect(html).toContain('icon-download');
  });

  it('collects EdStem resources from the authenticated private API carrier', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/user': {
          courses: [
            {
              course: {
                id: 90031,
                code: 'redacted-course-code',
                name: 'redacted-text',
              },
            },
          ],
        },
        '/api/courses/90031/threads?limit=30&sort=new': {
          threads: [],
          users: [],
        },
        '/api/courses/90031/resources': readJsonFixture('/resources-api.json'),
      }),
      resourcePaths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/90031/resources',
      site: 'edstem',
      now: '2026-04-05T18:00:00-07:00',
      pageHtml: readFixture('resources-page.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.resources).toEqual([
        expect.objectContaining({
          id: 'edstem:resource:101887',
          courseId: 'edstem:course:90031',
          resourceKind: 'file',
          resourceGroup: {
            key: 'edstem:resource-group:90031:redacted-category',
            label: 'redacted-category',
            memberCount: 2,
          },
          fileExtension: '.pdf',
          sizeBytes: 2280609,
          summary: 'redacted-category',
          detail: 'Download file · PDF · 2.2 MB',
          downloadUrl: 'https://us.edstem.org/api/resources/101887/download/redacted-resource.pdf?dl=1',
        }),
        expect.objectContaining({
          id: 'edstem:resource:101262',
          resourceGroup: {
            key: 'edstem:resource-group:90031:redacted-category',
            label: 'redacted-category',
            memberCount: 2,
          },
          detail: 'Download file · PDF · 451 KB',
        }),
      ]);
      expect(result.outcome).toBe('success');
    }
  });

  it('falls back to the resources DOM carrier when the private resource request fails', async () => {
    const client = new EdStemApiClient(
      async (path) => {
        if (path === '/api/user') {
          return {
            ok: true,
            status: 200,
            responseUrl: 'https://us.edstem.org/api/user',
            bodyText: JSON.stringify({
              courses: [
                {
                  course: {
                    id: 90031,
                    code: 'redacted-course-code',
                    name: 'redacted-text',
                  },
                },
              ],
            }),
            contentType: 'application/json',
          };
        }

        if (path === '/api/courses/90031/threads?limit=30&sort=new') {
          return {
            ok: true,
            status: 200,
            responseUrl: 'https://us.edstem.org/api/courses/90031/threads?limit=30&sort=new',
            bodyText: JSON.stringify({ threads: [], users: [] }),
            contentType: 'application/json',
          };
        }

        if (path === '/api/courses/90031/resources') {
          return {
            ok: false,
            code: 'request_failed',
            message: 'mocked resources outage',
            status: 500,
          };
        }

        return {
          ok: false,
          code: 'request_failed',
          message: `No mock payload for ${path}`,
          status: 500,
        };
      },
      resourcePaths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/90031/resources',
      site: 'edstem',
      now: '2026-04-05T18:00:00-07:00',
      pageHtml: readFixture('resources-page.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('partial_success');
      expect(result.health.code).toBe('partial_success');
      expect(result.health.reason).toBe('edstem_resources_dom_fallback');
      expect(result.snapshot.resources).toHaveLength(2);
      expect(result.snapshot.resources?.[0]).toMatchObject({
        courseId: 'edstem:course:90031',
        resourceKind: 'file',
        summary: 'redacted-text',
        detail: 'redacted-text · redacted-text · Download file',
      });
    }
  });

  it('captures multi-member resource groups from the DOM carrier as a shared resourceGroup context', async () => {
    const client = new EdStemApiClient(
      async (path) => {
        if (path === '/api/user') {
          return {
            ok: true,
            status: 200,
            responseUrl: 'https://us.edstem.org/api/user',
            bodyText: JSON.stringify({
              courses: [
                {
                  course: {
                    id: 90031,
                    code: 'redacted-course-code',
                    name: 'redacted-text',
                  },
                },
              ],
            }),
            contentType: 'application/json',
          };
        }

        if (path === '/api/courses/90031/threads?limit=30&sort=new') {
          return {
            ok: true,
            status: 200,
            responseUrl: 'https://us.edstem.org/api/courses/90031/threads?limit=30&sort=new',
            bodyText: JSON.stringify({ threads: [], users: [] }),
            contentType: 'application/json',
          };
        }

        if (path === '/api/courses/90031/resources') {
          return {
            ok: false,
            code: 'request_failed',
            message: 'mocked resources outage',
            status: 500,
          };
        }

        return {
          ok: false,
          code: 'request_failed',
          message: `No mock payload for ${path}`,
          status: 500,
        };
      },
      resourcePaths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/90031/resources',
      site: 'edstem',
      now: '2026-04-14T11:00:00-07:00',
      pageHtml: readFixture('resources-page-multi-group.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'redacted-resource-a',
            resourceGroup: {
              key: 'edstem:resource-group:90031:redacted-group',
              label: 'redacted-group',
              memberCount: 2,
            },
          }),
          expect.objectContaining({
            title: 'redacted-resource-b',
            resourceGroup: {
              key: 'edstem:resource-group:90031:redacted-group',
              label: 'redacted-group',
              memberCount: 2,
            },
          }),
        ]),
      );
    }
  });

  it('collects EdStem lessons from the authenticated lessons DOM carrier', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/user': {
          courses: [
            {
              course: {
                id: 96846,
                code: 'CSE 312 - 26sp',
                name: 'Foundations of Computing II',
              },
            },
          ],
        },
        '/api/courses/96846/threads?limit=30&sort=new': {
          threads: [],
          users: [],
        },
      }),
      lessonPaths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/96846/lessons',
      site: 'edstem',
      now: '2026-04-13T08:00:00-07:00',
      pageHtml: readFixture('lessons-page.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'edstem:lesson:redacted-lesson-a',
            courseId: 'edstem:course:96846',
            resourceKind: 'link',
            title: '[HW1 problem 7(a)] Python Tutorial & Coding Exercises',
            summary: 'A. Using - Spring 2026',
            detail: 'Lesson · attempted · Closed Due: Wed April 8th, 11:59pm',
          }),
          expect.objectContaining({
            id: 'edstem:lesson:redacted-lesson-c',
            detail: 'Lesson · not attempted · Open',
          }),
        ]),
      );
      expect(result.outcome).toBe('partial_success');
    }
  });

  it('collects EdStem lesson detail from the authenticated private lesson carrier', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/user': {
          courses: [
            {
              course: {
                id: 96846,
                code: 'CSE 312 - 26sp',
                name: 'Foundations of Computing II',
              },
            },
          ],
        },
        '/api/courses/96846/threads?limit=30&sort=new': {
          threads: [],
          users: [],
        },
        '/api/lessons/redacted-lesson-a?view=1': readJsonFixture('/lesson-detail-api.json'),
      }),
      lessonDetailPaths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/96846/lessons/redacted-lesson-a',
      site: 'edstem',
      now: '2026-04-14T10:00:00-07:00',
      pageHtml: '<html><body>lesson detail</body></html>',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.resources).toHaveLength(4);
      expect(result.snapshot.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'edstem:lesson:redacted-lesson-a',
            courseId: 'edstem:course:96846',
            resourceKind: 'link',
            source: expect.objectContaining({
              resourceType: 'lesson_detail',
            }),
            title: '[HW1 problem 7(a)] redacted lesson title',
            summary: 'python lesson · attempted · 3 slides · 2 documents, 1 challenge · 2 unseen, 1 completed',
            detail:
              'State: scheduled · Due: 2026-04-09T16:59:00+10:00 · Locks: 2026-04-12T16:59:00+10:00 · Solutions: 2026-04-13T04:00:00+10:00 · Late submissions allowed · Progress: 2 unseen, 1 completed · Meaning: Mixed progress · Slides: 1 · redacted slide title 1 · document · completed · Review document; 2 · redacted slide title 2 · document · unseen · Open document; 3 · redacted coding challenge · challenge · unseen · Start challenge',
          }),
          expect.objectContaining({
            id: 'edstem:lesson-slide:redacted-lesson-a:redacted-slide-1',
            courseId: 'edstem:course:96846',
            resourceKind: 'link',
            source: expect.objectContaining({
              resourceType: 'lesson_slide',
            }),
            summary: '[HW1 problem 7(a)] redacted lesson title',
            resourceGroup: {
              key: 'edstem:resource-group:96846:lesson:redacted-lesson-a',
              label: '[HW1 problem 7(a)] redacted lesson title',
              memberCount: 3,
            },
            detail: 'Slide 1 · document · completed · Review document · Lesson progress: Mixed progress · Lesson state: scheduled',
            url: 'https://edstem.org/us/courses/96846/lessons/redacted-lesson-a/slides/redacted-slide-1',
          }),
          expect.objectContaining({
            id: 'edstem:lesson-slide:redacted-lesson-a:redacted-slide-3',
            detail: 'Slide 3 · challenge · unseen · Start challenge · Lesson progress: Mixed progress · Lesson state: scheduled',
          }),
        ]),
      );
      expect(result.outcome).toBe('success');
      expect(result.health.reason).toBe('edstem_sync_success');
    }
  });

  it('surfaces lesson slide-type composition in the grouped lesson summary', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/user': {
          courses: [
            {
              course: {
                id: 96846,
                code: 'CSE 312 - 26sp',
                name: 'Foundations of Computing II',
              },
            },
          ],
        },
        '/api/courses/96846/threads?limit=30&sort=new': {
          threads: [],
          users: [],
        },
        '/api/lessons/redacted-lesson-a?view=1': readJsonFixture('/lesson-detail-api.json'),
      }),
      lessonDetailPaths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/96846/lessons/redacted-lesson-a',
      site: 'edstem',
      now: '2026-04-14T10:00:00-07:00',
      pageHtml: '<html><body>lesson detail</body></html>',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.resources?.[0]).toMatchObject({
        id: 'edstem:lesson:redacted-lesson-a',
        summary: 'python lesson · attempted · 3 slides · 2 documents, 1 challenge · 2 unseen, 1 completed',
      });
    }
  });

  it('surfaces lesson slide progress composition in the grouped lesson summary and detail', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/user': {
          courses: [
            {
              course: {
                id: 96846,
                code: 'CSE 312 - 26sp',
                name: 'Foundations of Computing II',
              },
            },
          ],
        },
        '/api/courses/96846/threads?limit=30&sort=new': {
          threads: [],
          users: [],
        },
        '/api/lessons/redacted-lesson-a?view=1': readJsonFixture('/lesson-detail-api.json'),
      }),
      lessonDetailPaths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/96846/lessons/redacted-lesson-a',
      site: 'edstem',
      now: '2026-04-14T10:00:00-07:00',
      pageHtml: '<html><body>lesson detail</body></html>',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.resources?.[0]).toMatchObject({
        id: 'edstem:lesson:redacted-lesson-a',
        summary: 'python lesson · attempted · 3 slides · 2 documents, 1 challenge · 2 unseen, 1 completed',
        detail: expect.stringContaining('Progress: 2 unseen, 1 completed'),
      });
      expect(result.snapshot.resources?.[0]?.detail).toContain('Meaning: Mixed progress');
      expect(result.snapshot.resources?.[0]?.detail).toContain('Start challenge');
      expect(result.snapshot.resources?.[1]?.detail).toContain('Review document');
      expect(result.snapshot.resources?.[3]?.detail).toContain('Lesson progress: Mixed progress');
    }
  });

  it('merges thread-detail DOM reply bodies into the private collector without dropping unread state', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/user': {
          courses: [
            {
              course: {
                id: 855,
                code: 'redacted-course-code',
                name: 'redacted-text',
              },
            },
          ],
        },
        '/api/courses/855/threads?limit=5&sort=new': {
          threads: [
            {
              id: 709033,
              user_id: 1,
              course_id: 855,
              type: 'post',
              title: 'redacted-text',
              content: '<p>redacted-text</p>',
              category: 'redacted-text',
              created_at: '2021-10-11T15:31:20.497Z',
              updated_at: '2021-10-12T07:58:47.244Z',
              unread: true,
              url: 'https://edstem.org/us/courses/855/discussion/709033',
            },
          ],
          users: [
            {
              id: 1,
              course_role: 'staff',
            },
          ],
        },
        '/api/courses/855/resources': {
          resources: [],
        },
      }),
      threadDetailPaths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/855/discussion/709033',
      site: 'edstem',
      now: '2026-04-05T16:00:00-07:00',
      pageHtml: readFixture('thread-detail-page.html'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.messages?.map((item) => item.id)).toEqual([
        'edstem:message:709033',
        'edstem:message:1645665',
        'edstem:message:1645724',
        'edstem:message:1651940',
        'edstem:message:1654435',
      ]);
      expect(result.snapshot.messages?.[0]).toMatchObject({
        unread: true,
        category: 'redacted-text',
        source: {
          resourceType: 'thread',
        },
      });
      expect(result.snapshot.messages?.slice(1).every((item) => item.messageKind === 'reply')).toBe(true);
      expect(result.snapshot.messages?.[4]).toMatchObject({
        source: {
          resourceType: 'reply',
        },
        url: 'https://edstem.org/us/courses/855/discussion/709033?comment=1654435',
      });
      expect(result.snapshot.messages?.[4]?.summary).not.toContain('<');
    }
  });

  it('replays a redacted live threads capture from profile 13 for private API coverage', async () => {
    const client = new EdStemApiClient(
      okExecutor({
        '/api/user': readJsonFixture('/user-profile13.json'),
        '/api/courses/11/threads?limit=30&sort=new': readJsonFixture('/threads-profile13.json'),
        '/api/courses/855/resources': {
          resources: [],
        },
        '/configured/unread-activity': [],
        '/configured/recent-activity': [],
      }),
      paths,
    );

    const adapter = createEdStemAdapter(client);
    const result = await adapter.sync({
      url: 'https://edstem.org/us/courses/855/discussion',
      site: 'edstem',
      now: '2026-03-29T03:01:07.800Z',
      pageHtml: '<title>(200) Allen School Career Board – Ed Discussion</title>',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe('success');
      expect(result.snapshot.courses?.map((item) => item.id).sort()).toEqual([
        'edstem:course:801',
        'edstem:course:802',
      ]);
      expect(result.snapshot.courses?.find((item) => item.id === 'edstem:course:801')).toMatchObject({
        title: 'redacted-course-name',
        code: 'redacted-course-code',
      });
      expect(result.snapshot.messages?.map((item) => item.id)).toEqual([
        'edstem:message:7101',
        'edstem:message:7102',
      ]);
      expect(result.snapshot.messages?.every((item) => item.courseId === 'edstem:course:801')).toBe(true);
      expect(result.snapshot.messages?.map((item) => item.unread)).toEqual([false, false]);
      expect(result.snapshot.messages?.map((item) => item.messageKind)).toEqual(['notice', 'notice']);
      expect(result.snapshot.messages?.every((item) => item.instructorAuthored)).toBe(true);
      expect(result.snapshot.messages?.[0]?.source.resourceType).toBe('announcement');
      expect(result.snapshot.messages?.[0]?.updatedAt).toBe('2026-03-29T13:27:51.622544+11:00');
      expect(result.snapshot.messages?.[0]?.summary).toContain('redacted-category');
      expect(result.snapshot.messages?.[0]?.summary).not.toContain('<');
    }
  });
});
