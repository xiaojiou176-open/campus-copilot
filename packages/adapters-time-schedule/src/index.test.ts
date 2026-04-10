import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  TIME_SCHEDULE_CARRIER_ORDER,
  TIME_SCHEDULE_FIELD_DECISIONS,
  TIME_SCHEDULE_PROMOTION_HOLDS,
  type PublicCourseOfferingCourse,
  extractPublicCourseOfferingsPage,
  extractScheduleRootSnapshot,
} from './index';

function readFixture(relativePath: string) {
  return readFileSync(new URL(`./__fixtures__/${relativePath}`, import.meta.url), 'utf8');
}

describe('adapters-time-schedule limited shared landing', () => {
  it('keeps the carrier order public-first, session-second, DOM-fallback-last', () => {
    const snapshot = extractScheduleRootSnapshot(readFixture('schedule-root.html'));

    expect(TIME_SCHEDULE_CARRIER_ORDER.map((entry) => entry.carrier)).toEqual([
      'public_course_offerings',
      'netid_full_schedule_view',
      'dom_sln_detail_fallback',
    ]);
    expect(snapshot.publicDisclosure).toContain('require a NetID to view');
    expect(snapshot.publicDisclosure).toContain('limited view');
    expect(snapshot.quarterLinks.find((entry) => entry.quarter === 'Spring Quarter 2026')).toEqual(
      expect.objectContaining({
        netIdTimeScheduleUrl: 'https://www.washington.edu/students/timeschd/SPR2026/',
        publicCourseOfferingsUrl: 'https://www.washington.edu/students/timeschd/pub/SPR2026/',
      }),
    );
  });

  it('extracts read-only course and section proof from the public course offerings carrier', () => {
    const page = extractPublicCourseOfferingsPage(readFixture('public-course-offerings-cse.html'));
    const cse121 = page.courses.find((course: PublicCourseOfferingCourse) => course.courseKey === 'CSE 121');
    const cse590 = page.courses.find((course: PublicCourseOfferingCourse) => course.courseKey === 'CSE 590');

    expect(page.carrier).toBe('public_course_offerings');
    expect(page.quarter).toBe('Spring Quarter 2026');
    expect(page.lastUpdatedText).toBe('12:03 am April 9, 2026');
    expect(page.department).toContain('COMPUTER SCIENCE & ENGINEERING');

    expect(cse121?.title).toBe('COMP PROGRAMMING I');
    expect(cse121?.catalogUrl).toBe('https://www.washington.edu/students/crscat/cse.html#cse121');
    expect(cse121?.sections.map((section) => section.sln)).toEqual(['12473', '12474']);
    expect(cse121?.sections[0]).toEqual(
      expect.objectContaining({
        sectionId: 'A',
        meetingDays: 'WF',
        timeText: '1130-1220',
        daysSource: 'row',
        timeSource: 'row',
      }),
    );
    expect(cse121?.sections[1]).toEqual(
      expect.objectContaining({
        sectionId: 'AA',
        meetingDays: 'TTh',
        timeText: '830-920',
      }),
    );

    expect(cse590?.sections[0]).toEqual(
      expect.objectContaining({
        sln: '12821',
        sectionId: 'K',
        meetingMode: 'arranged',
        meetingDays: 'TUESDAYS',
        timeText: '1:00-1:50 PM',
        locationText: 'CSE 624',
        daysSource: 'note',
        timeSource: 'note',
        locationSource: 'note',
      }),
    );
  });

  it('treats modality as note-derived partial proof instead of a row-backed field', () => {
    const page = extractPublicCourseOfferingsPage(readFixture('public-course-offerings-math.html'));
    const math124 = page.courses.find((course: PublicCourseOfferingCourse) => course.courseKey === 'MATH 124');

    expect(math124?.sections[0]).toEqual(
      expect.objectContaining({
        sln: '16579',
        sectionId: 'B',
        meetingMode: 'arranged',
        modality: 'hybrid',
      }),
    );
  });

  it('keeps field proof and promotion holds honest about what remains deferred', () => {
    expect(TIME_SCHEDULE_FIELD_DECISIONS.find((decision) => decision.field === 'course_identity')?.status).toBe(
      'proved',
    );
    expect(TIME_SCHEDULE_FIELD_DECISIONS.find((decision) => decision.field === 'location')?.status).toBe(
      'partially_proved',
    );
    expect(TIME_SCHEDULE_FIELD_DECISIONS.find((decision) => decision.field === 'modality')?.status).toBe(
      'partially_proved',
    );
    expect(
      TIME_SCHEDULE_FIELD_DECISIONS.find((decision) => decision.field === 'registration_semantics')?.status,
    ).toBe('deferred');
    expect(TIME_SCHEDULE_PROMOTION_HOLDS.join(' ')).toContain('public course-offerings carrier');
    expect(TIME_SCHEDULE_PROMOTION_HOLDS.join(' ')).toContain('registration workflows');
  });

  it('stays package-local even though shared runtime adoption now happens elsewhere', () => {
    const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      dependencies?: Record<string, string>;
    };

    expect(source).not.toContain('@campus-copilot/schema');
    expect(source).not.toContain('@campus-copilot/storage');
    expect(source).not.toContain('@campus-copilot/core');
    expect(packageJson.dependencies ?? {}).toEqual({});
  });

  it('preserves encoded angle-bracket text instead of decoding it into removable markup', () => {
    const html = readFixture('public-course-offerings-cse.html').replace(
      'RESEARCH SEMINAR',
      'RESEARCH &lt;LAB&gt; SEMINAR',
    );

    const page = extractPublicCourseOfferingsPage(html);
    const cse590 = page.courses.find((course: PublicCourseOfferingCourse) => course.courseKey === 'CSE 590');

    expect(cse590?.title).toBe('RESEARCH <LAB> SEMINAR');
  });
});
