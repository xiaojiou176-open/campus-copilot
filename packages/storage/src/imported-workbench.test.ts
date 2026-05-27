import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createCampusCopilotDb } from './db';
import { getFocusQueue } from './focus-queue';
import { replaceImportedWorkbenchSnapshot } from './imported-workbench';
import { getRecentChangeEvents } from './sync-ledger';
import { getWeeklyLoad } from './weekly-load';

describe('replaceImportedWorkbenchSnapshot', () => {
  it('hydrates the shared storage contract for a read-only web surface', async () => {
    const db = createCampusCopilotDb(`campus-copilot-import-${Date.now()}`);
    await replaceImportedWorkbenchSnapshot(
      {
        generatedAt: '2026-04-03T09:00:00-07:00',
        assignments: [
          {
            id: 'canvas:assignment:1',
            kind: 'assignment',
            site: 'canvas',
            source: {
              site: 'canvas',
              resourceId: '1',
              resourceType: 'assignment',
            },
            title: 'Homework 1',
            summary: 'Graded · 95 / 100',
            dueAt: '2026-04-04T09:00:00-07:00',
            status: 'graded',
            score: 95,
            maxScore: 100,
          },
        ],
        messages: [
          {
            id: 'edstem:message:7',
            kind: 'message',
            site: 'edstem',
            source: {
              site: 'edstem',
              resourceId: '7',
              resourceType: 'thread',
            },
            courseId: 'edstem:course:11',
            messageKind: 'thread',
            threadId: '7',
            title: 'Project kickoff',
            summary: 'general / logistics · Bring your draft architecture to section.',
            category: 'general',
            subcategory: 'logistics',
            createdAt: '2026-04-03T08:00:00-07:00',
            updatedAt: '2026-04-03T08:30:00-07:00',
            instructorAuthored: true,
            unread: true,
          },
        ],
        events: [
          {
            id: 'myuw:event:11111:final-exam',
            kind: 'event',
            site: 'myuw',
            source: {
              site: 'myuw',
              resourceId: '11111:final-exam',
              resourceType: 'schedule_final_exam',
            },
            courseId: 'myuw:course:11111',
            eventKind: 'exam',
            title: 'CSE 312 A final exam',
            summary: 'FOUNDATIONS COMP II',
            location: 'Kane Hall 130',
            startAt: '2026-04-05T13:30:00-07:00',
            endAt: '2026-04-05T15:20:00-07:00',
            detail: 'final exam · Kane Hall 130',
          },
        ],
        syncRuns: [
          {
            id: 'sync:canvas:1',
            site: 'canvas',
            status: 'success',
            outcome: 'success',
            startedAt: '2026-04-03T08:40:00-07:00',
            completedAt: '2026-04-03T08:41:00-07:00',
            changeCount: 1,
          },
        ],
        changeEvents: [
          {
            id: 'change:canvas:1',
            runId: 'sync:canvas:1',
            site: 'canvas',
            changeType: 'grade_released',
            occurredAt: '2026-04-03T08:41:00-07:00',
            title: 'Homework 1 released a new grade',
            summary: 'Canvas published a new score for Homework 1.',
            entityId: 'canvas:assignment:1',
            entityKind: 'assignment',
          },
        ],
      },
      db,
    );

    const focusQueue = await getFocusQueue('2026-04-03T09:00:00-07:00', db);
    const weeklyLoad = await getWeeklyLoad('2026-04-03T09:00:00-07:00', db);
    const changeEvents = await getRecentChangeEvents(4, db);

    expect(focusQueue[0]?.title).toBe('Homework 1');
    expect(weeklyLoad.some((entry) => entry.items.length > 0)).toBe(true);
    expect(changeEvents[0]?.title).toContain('Homework 1');

    await db.delete();
  });
});
