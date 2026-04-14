import { describe, expect, it } from 'vitest';
import {
  AlertSchema,
  AnnouncementSchema,
  AssignmentSchema,
  CourseSchema,
  EventSchema,
  FetchMetadataSchema,
  MessageSchema,
  ResourceSchema,
  SiteSchema,
} from './index';

const source = {
  site: 'canvas' as const,
  resourceId: '123',
  resourceType: 'assignment',
};

describe('schema package', () => {
  it('parses phase-1 core entities successfully', () => {
    expect(
      CourseSchema.parse({
        id: 'course-1',
        kind: 'course',
        site: 'canvas',
        source,
        title: 'CSE 142',
      }),
    ).toBeTruthy();

    expect(
      ResourceSchema.parse({
        id: 'resource-1',
        kind: 'resource',
        site: 'edstem',
        source: { ...source, site: 'edstem', resourceType: 'resource' },
        courseId: 'edstem:course:1',
        resourceKind: 'file',
        title: 'Homework 8 solutions',
        summary: 'Homework',
        detail: 'PDF · 452 KB',
        resourceGroup: {
          key: 'edstem:resource-group:1:homework',
          label: 'Homework',
          memberCount: 2,
        },
        resourceModule: {
          key: 'canvas:module:1:week-1',
          label: 'Week 1',
          itemType: 'assignment',
        },
        fileExtension: '.pdf',
        sizeBytes: 452000,
        downloadUrl: 'https://us.edstem.org/api/resources/123/download/homework-8-solutions.pdf?dl=1',
      }),
    ).toBeTruthy();

    expect(
      AssignmentSchema.parse({
        id: 'assignment-1',
        kind: 'assignment',
        site: 'gradescope',
        source: { ...source, site: 'gradescope', resourceType: 'assignment' },
        title: 'Homework 1',
        summary: 'Submitted through Gradescope.',
        detail: 'Q1 1 / 1 · Correct; Q2 0 / 1 · Incorrect',
        dueAt: '2026-03-25T23:59:00-07:00',
        status: 'todo',
      }),
    ).toBeTruthy();

    expect(
      AnnouncementSchema.parse({
        id: 'announcement-1',
        kind: 'announcement',
        site: 'canvas',
        source: { ...source, resourceType: 'announcement' },
        title: 'Project update',
        summary: 'The milestones were updated this week.',
        postedAt: '2026-03-24T09:00:00-07:00',
      }),
    ).toBeTruthy();

    expect(
      MessageSchema.parse({
        id: 'message-1',
        kind: 'message',
        site: 'edstem',
        source: { ...source, site: 'edstem', resourceType: 'thread' },
        messageKind: 'thread',
        title: 'Office hours',
        summary: 'Staff replied with the updated office-hours plan.',
        createdAt: '2026-03-24T12:00:00-07:00',
      }),
    ).toBeTruthy();

    expect(
      EventSchema.parse({
        id: 'event-1',
        kind: 'event',
        site: 'myuw',
        source: { ...source, site: 'myuw', resourceType: 'notice' },
        eventKind: 'deadline',
        title: 'Registration deadline',
        summary: 'Registration closes this Friday.',
        location: 'Schmitz Hall',
        startAt: '2026-03-26T08:00:00-07:00',
      }),
    ).toBeTruthy();

    expect(
      AlertSchema.parse({
        id: 'alert-1',
        kind: 'alert',
        site: 'canvas',
        source: { ...source, resourceType: 'derived_alert' },
        alertKind: 'deadline_risk',
        title: 'Homework 1 due soon',
        summary: 'Due within 24 hours.',
        importance: 'high',
        triggeredAt: '2026-03-24T18:00:00-07:00',
      }),
    ).toBeTruthy();
  });

  it('rejects invalid iso time fields', () => {
    expect(() =>
      AssignmentSchema.parse({
        id: 'assignment-2',
        kind: 'assignment',
        site: 'canvas',
        source,
        title: 'Homework 2',
        dueAt: 'tomorrow evening',
        status: 'todo',
      }),
    ).toThrow();
  });

  it('rejects fact and derived fields mixing through strict schemas', () => {
    expect(() =>
      CourseSchema.parse({
        id: 'course-2',
        kind: 'course',
        site: 'canvas',
        source,
        title: 'CSE 143',
        summary: 'This should not be here.',
      }),
    ).toThrow();

    expect(() =>
      AlertSchema.parse({
        id: 'alert-2',
        kind: 'alert',
        site: 'canvas',
        source: { ...source, resourceType: 'derived_alert' },
        alertKind: 'attention_needed',
        title: 'Attention needed',
        summary: 'Has extra course-specific field.',
        importance: 'medium',
        triggeredAt: '2026-03-24T18:00:00-07:00',
        code: 'CSE-143',
      }),
    ).toThrow();
  });

  it('validates fetch metadata with collector trace fields', () => {
    expect(
      FetchMetadataSchema.parse({
        mode: 'state',
        attemptedAt: '2026-03-24T18:00:00-07:00',
        success: false,
        collectorName: 'CanvasStateAssignmentsCollector',
        errorReason: 'state_missing',
      }),
    ).toBeTruthy();
  });

  it('includes time-schedule in the shared site union', () => {
    expect(SiteSchema.parse('time-schedule')).toBe('time-schedule');

    expect(
      EventSchema.parse({
        id: 'event-time-schedule-1',
        kind: 'event',
        site: 'time-schedule',
        source: {
          site: 'time-schedule',
          resourceId: 'time-schedule:section:12345',
          resourceType: 'public_course_offering_section',
          url: 'https://www.washington.edu/students/timeschd/SPR2026/cse.html',
        },
        eventKind: 'class',
        title: 'CSE 142 A',
        summary: 'Spring 2026 public course offering',
        location: 'SAV 260',
        detail: 'MWF 0930-1020 · public course offerings',
      }),
    ).toBeTruthy();
  });

  it('includes course-sites in the shared site union', () => {
    expect(SiteSchema.parse('course-sites')).toBe('course-sites');

    expect(
      ResourceSchema.parse({
        id: 'resource-course-sites-1',
        kind: 'resource',
        site: 'course-sites',
        source: {
          site: 'course-sites',
          resourceId: 'course-sites:syllabus',
          resourceType: 'syllabus_page',
          url: 'https://courses.cs.washington.edu/courses/cse312/26sp/syllabus.html',
        },
        courseId: 'course-sites:course:cse312:26sp',
        resourceKind: 'link',
        title: 'CSE 312 Syllabus',
        summary: 'Low-risk syllabus summary with a jump link only.',
      }),
    ).toBeTruthy();
  });
});
