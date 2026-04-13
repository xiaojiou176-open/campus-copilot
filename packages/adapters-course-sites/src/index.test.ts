import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  COURSE_SITES_POLICY_GUARDRAILS,
  createCourseSitesAdapter,
  detectCourseSitePageFamily,
  extractCourseSiteSnapshot,
} from './index';

function readFixture(relativePath: string) {
  return readFileSync(new URL(`./__fixtures__/${relativePath}`, import.meta.url), 'utf8');
}

describe('@campus-copilot/adapters-course-sites', () => {
  it('extracts a course, structured resources, and a welcome announcement from a course home page', async () => {
    const adapter = createCourseSitesAdapter();
    const result = await adapter.sync({
      url: 'https://courses.cs.washington.edu/courses/cse312/26sp/',
      pageHtml: readFixture('home-cse312.html'),
      now: '2026-04-11T12:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.family).toBe('home');
      expect(result.snapshot.courses?.[0]).toEqual(
        expect.objectContaining({
          code: 'CSE 312',
          title: 'CSE 312: Foundations of Computing II',
          site: 'course-sites',
        }),
      );
      expect(result.snapshot.resources?.some((resource) => resource.title.toLowerCase().includes('syllabus'))).toBe(true);
      expect(result.snapshot.resources?.some((resource) => resource.title.toLowerCase().includes('gradescope'))).toBe(true);
      expect(result.snapshot.announcements?.[0]).toEqual(
        expect.objectContaining({
          title: 'Welcome to CSE 312!',
          site: 'course-sites',
        }),
      );
      expect(JSON.stringify(result.snapshot)).not.toContain('<main');
      expect(JSON.stringify(result.snapshot)).not.toContain('cookie');
    }
  });

  it('extracts a course page resource from a syllabus page without exposing the raw page body', () => {
    const extraction = extractCourseSiteSnapshot({
      url: 'https://courses.cs.washington.edu/courses/cse332/26sp/syllabus.html',
      pageHtml: readFixture('syllabus-cse332.html'),
      now: '2026-04-11T12:00:00-07:00',
    });

    expect(extraction.family).toBe('syllabus');
    expect(extraction.snapshot.courses?.[0]).toEqual(
      expect.objectContaining({
        code: 'CSE 332',
        title: 'CSE 332',
      }),
    );
    expect(extraction.snapshot.resources?.[0]).toEqual(
      expect.objectContaining({
        title: 'CSE 332 Syllabus',
        resourceKind: 'link',
      }),
    );
    expect(COURSE_SITES_POLICY_GUARDRAILS.join(' ')).toContain('raw HTML');
  });

  it('extracts schedule events from a calendar or schedule page', async () => {
    const adapter = createCourseSitesAdapter();
    const result = await adapter.sync({
      url: 'https://courses.cs.washington.edu/courses/cse312/26sp/schedule',
      pageHtml: readFixture('schedule-cse312.html'),
      now: '2026-04-11T12:00:00-07:00',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.family).toBe('schedule');
      expect(result.snapshot.events?.[0]).toEqual(
        expect.objectContaining({
          eventKind: 'class',
          title: 'Lecture 1',
          site: 'course-sites',
        }),
      );
      expect(result.snapshot.events?.some((event) => event.title === 'Concept Check due')).toBe(true);
    }
  });

  it('extracts assignments from both assignments-style tables and tasks-style pages', async () => {
    const adapter = createCourseSitesAdapter();
    const tableResult = await adapter.sync({
      url: 'https://courses.cs.washington.edu/courses/cse312/26sp/assignments',
      pageHtml: readFixture('assignments-cse312.html'),
      now: '2026-04-11T12:00:00-07:00',
    });
    const tasksResult = await adapter.sync({
      url: 'https://courses.cs.washington.edu/courses/cse332/26sp/tasks.html',
      pageHtml: readFixture('tasks-cse332.html'),
      now: '2026-04-11T12:00:00-07:00',
    });

    expect(tableResult.ok).toBe(true);
    if (tableResult.ok) {
      expect(tableResult.snapshot.assignments?.[0]).toEqual(
        expect.objectContaining({
          title: 'Pset 1',
          dueAt: '2026-04-08T23:59:00-07:00',
          site: 'course-sites',
        }),
      );
    }

    expect(tasksResult.ok).toBe(true);
    if (tasksResult.ok) {
      expect(tasksResult.snapshot.assignments?.some((assignment) => assignment.title.includes('CC0'))).toBe(true);
      expect(tasksResult.snapshot.events?.some((event) => event.title === 'Exam 1')).toBe(true);
      expect(tasksResult.snapshot.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Exam 2',
            startAt: '2026-06-11T12:30:00-07:00',
            endAt: '2026-06-11T14:20:00-07:00',
            location: 'BAG 131',
            detail: expect.stringContaining('June 11 in BAG 131'),
          }),
        ]),
      );
    }
  });

  it('refuses unsupported page families and malformed HTML honestly', async () => {
    const adapter = createCourseSitesAdapter();
    const unsupported = await adapter.sync({
      url: 'https://courses.cs.washington.edu/courses/cse312/26sp/staff.html',
      pageHtml: readFixture('unsupported-staff.html'),
      now: '2026-04-11T12:00:00-07:00',
    });
    const malformed = await adapter.sync({
      url: 'https://courses.cs.washington.edu/courses/cse312/26sp/',
      pageHtml: '<html><body><h1>Broken course site</h1>',
      now: '2026-04-11T12:00:00-07:00',
    });

    expect(unsupported.ok).toBe(false);
    if (!unsupported.ok) {
      expect(unsupported.outcome).toBe('unsupported_context');
    }

    expect(malformed.ok).toBe(false);
    if (!malformed.ok) {
      expect(malformed.outcome).toBe('normalize_failed');
    }
  });

  it('detects both assignments and tasks page families without relying on a single brittle marker', () => {
    expect(
      detectCourseSitePageFamily({
        url: 'https://courses.cs.washington.edu/courses/cse312/26sp/assignments',
        pageHtml: readFixture('assignments-cse312.html'),
      }).family,
    ).toBe('assignments');
    expect(
      detectCourseSitePageFamily({
        url: 'https://courses.cs.washington.edu/courses/cse332/26sp/tasks.html',
        pageHtml: readFixture('tasks-cse332.html'),
      }).family,
    ).toBe('assignments');
  });

  it('does not let script/comment noise override visible page-family markers', () => {
    expect(
      detectCourseSitePageFamily({
        url: 'https://courses.cs.washington.edu/courses/cse332/26sp/custom.html',
        pageHtml: `<html><head><title>Course shell</title></head><body><!--${'<!--'.repeat(
          256,
        )} hidden marker --!><script>Assignments and Tests</script foo="bar"><h1>Welcome to CSE 332</h1></body></html>`,
      }).family,
    ).toBe('home');
  });

  it('decodes encoded text once instead of collapsing double-escaped entities', () => {
    const extraction = extractCourseSiteSnapshot({
      url: 'https://courses.cs.washington.edu/courses/cse332/26sp/syllabus.html',
      pageHtml:
        '<html><head><title>CSE 332 Syllabus</title></head><body><p>Use &amp;lt;code&amp;gt; and &amp;amp; carefully.</p></body></html>',
      now: '2026-04-11T12:00:00-07:00',
    });

    expect(extraction.snapshot.resources?.[0]).toEqual(
      expect.objectContaining({
        summary: 'Use &lt;code&gt; and &amp; carefully.',
      }),
    );
  });
});
