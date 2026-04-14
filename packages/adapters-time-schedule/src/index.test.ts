import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  TIME_SCHEDULE_CARRIER_ORDER,
  TIME_SCHEDULE_EXACT_BLOCKERS,
  TIME_SCHEDULE_FIELD_DECISIONS,
  TIME_SCHEDULE_PROMOTION_HOLDS,
  TIME_SCHEDULE_STAGE_UNDERSTANDING,
  buildTimeScheduleRuntimePromotionPacket,
  extractTimeScheduleSectionDetailPage,
  type PublicCourseOfferingCourse,
  extractPublicCourseOfferingsPage,
  extractPublicCourseOfferingsPrototype,
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
    expect(cse590?.sections[0].meetings[0]).toEqual(
      expect.objectContaining({
        days: 'TUESDAYS',
        rawTime: '1:00-1:50 PM',
        startTime: '1:00 PM',
        endTime: '1:50 PM',
        daysSource: 'note',
        timeSource: 'note',
      }),
    );
    expect(page.warnings).toContain('meeting_pattern_is_note_derived:CSE 590:K');
    expect(page.warnings).toContain('location_can_be_note_derived:CSE 590:K');
  });

  it('carries note-derived meeting timing into the productized public-offerings prototype', () => {
    const prototype = extractPublicCourseOfferingsPrototype({
      html: readFixture('public-course-offerings-cse.html'),
      sourceUrl: 'https://www.washington.edu/students/timeschd/pub/SPR2026/cse.html',
      quarterLabel: 'Spring Quarter 2026',
    });
    const cse590 = prototype.courses.find((course) => course.courseKey === 'CSE 590');
    const seminar = cse590?.offerings.find((offering) => offering.sectionCode === 'K');

    expect(seminar?.meetings[0]).toEqual(
      expect.objectContaining({
        days: 'TUESDAYS',
        rawTime: '1:00-1:50 PM',
        startTime: '1:00 PM',
        endTime: '1:50 PM',
      }),
    );
    expect(
      prototype.events.find((event) => event.sectionIdentity === 'CSE 590:K:12821'),
    ).toEqual(
      expect.objectContaining({
        meetingPatternText: 'TUESDAYS 1:00-1:50 PM',
        location: 'CSE 624',
      }),
    );
    expect(prototype.warnings).toContain('meeting_pattern_is_note_derived:CSE 590:K');
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

  it('builds a runtime-promotion packet that keeps the public carrier honest about remaining blockers', () => {
    const packet = buildTimeScheduleRuntimePromotionPacket({
      rootHtml: readFixture('schedule-root.html'),
      offeringsHtml: readFixture('public-course-offerings-cse.html'),
      sourceUrl: 'https://www.washington.edu/students/timeschd/pub/SPR2026/cse.html',
      quarterLabel: 'Spring Quarter 2026',
    });

    expect(packet.surface).toBe('time-schedule');
    expect(packet.stage).toBe(TIME_SCHEDULE_STAGE_UNDERSTANDING.currentStage);
    expect(packet.runtimePosture).toBe(TIME_SCHEDULE_STAGE_UNDERSTANDING.runtimePosture);
    expect(packet.boundaryProof.fullScheduleRequiresNetId).toBe(true);
    expect(packet.prototype.carrier).toBe('public-course-offerings-view');
    expect(packet.fieldDecisions).toBe(TIME_SCHEDULE_FIELD_DECISIONS);
    expect(packet.promotionHolds).toBe(TIME_SCHEDULE_PROMOTION_HOLDS);
    expect(packet.exactBlockers).toEqual(
      expect.arrayContaining(
        TIME_SCHEDULE_EXACT_BLOCKERS.map((blocker) =>
          expect.objectContaining({
            id: blocker.id,
            class: blocker.class,
          }),
        ),
      ),
    );
    expect(packet.noRegistrationAutomation).toBe(true);
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

  it('extracts structured detail from a section-status fallback page', () => {
    const detail = extractTimeScheduleSectionDetailPage(readFixture('section-detail-cse121a.html'));

    expect(detail.quarterLabel).toBe('Spring Quarter 2026');
    expect(detail.sln).toBe('12473');
    expect(detail.courseKey).toBe('CSE 121');
    expect(detail.sectionId).toBe('A');
    expect(detail.sectionType).toBe('LC');
    expect(detail.credits).toBe('4');
    expect(detail.title).toBe('COMP PROGRAMMING I');
    expect(detail.generalEducation).toBe('NSc,RSN');
    expect(detail.textbooksAvailable).toBe(true);
    expect(detail.currentEnrollment).toBe(161);
    expect(detail.enrollmentLimit).toBe(250);
    expect(detail.roomCapacity).toBe(345);
    expect(detail.spaceAvailable).toBe(89);
    expect(detail.status).toBe('open');
    expect(detail.meetings[0]).toEqual({
      days: 'WF',
      timeText: '11:30-12:20',
      location: 'GUG 220',
      instructor: 'Wang,Matt',
    });
    expect(detail.noteLines).toContain(
      'SEE THE CSE 12X SELF-PLACEMENT WEBPAGE FOR GUIDANCE ON CHOOSING THE APPROPRIATE CSE 12X COURSE',
    );
  });
});
