import { describe, expect, it } from 'vitest';
import {
  AlertSchema,
  AnnouncementSchema,
  AssignmentSchema,
  CourseSchema,
  EventSchema,
  FetchMetadataSchema,
  MessageSchema,
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
      AssignmentSchema.parse({
        id: 'assignment-1',
        kind: 'assignment',
        site: 'gradescope',
        source: { ...source, site: 'gradescope', resourceType: 'assignment' },
        title: 'Homework 1',
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
        startAt: '2026-03-26T08:00:00-07:00',
      }),
    ).toBeTruthy();

    expect(
      AlertSchema.parse({
        id: 'alert-1',
        kind: 'alert',
        site: 'canvas',
        source: { ...source, resourceType: 'alert' },
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
        source: { ...source, resourceType: 'alert' },
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
});
