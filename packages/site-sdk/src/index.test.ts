import { describe, expect, it } from 'vitest';
import type { ImportedWorkbenchSnapshot } from '@campus-copilot/storage';
import { getCanvasOverview, getEdstemOverview, SITE_TOOLBOX_ORDER } from './index';

const snapshot: ImportedWorkbenchSnapshot = {
  generatedAt: '2026-04-03T09:00:00-07:00',
  resources: [
    {
      id: 'edstem:resource:guide-1',
      kind: 'resource',
      site: 'edstem',
      source: {
        site: 'edstem',
        resourceId: 'guide-1',
        resourceType: 'resource',
      },
      courseId: 'edstem:course:cse312',
      resourceKind: 'file',
      title: 'Week 8 review sheet',
    },
  ],
  assignments: [
    {
      id: 'canvas:assignment:hw5',
      kind: 'assignment',
      site: 'canvas',
      source: {
        site: 'canvas',
        resourceId: 'hw5',
        resourceType: 'assignment',
      },
      title: 'Homework 5',
      courseId: 'canvas:course:cse142',
      dueAt: '2026-04-04T23:59:00-07:00',
      status: 'submitted',
    },
  ],
  messages: [
    {
      id: 'edstem:message:office-hours',
      kind: 'message',
      site: 'edstem',
      source: {
        site: 'edstem',
        resourceId: 'office-hours',
        resourceType: 'thread',
      },
      courseId: 'edstem:course:cse312',
      messageKind: 'thread',
      threadId: 'office-hours',
      title: 'Office hours follow-up',
      createdAt: '2026-04-03T07:40:00-07:00',
      unread: true,
    },
  ],
};

describe('site sdk', () => {
  it('keeps one convenience entrypoint per supported site', async () => {
    const canvas = await getCanvasOverview(snapshot);
    const edstem = await getEdstemOverview(snapshot);

    expect(SITE_TOOLBOX_ORDER).toEqual(['canvas', 'gradescope', 'edstem', 'myuw', 'time-schedule']);
    expect(canvas.counts.assignments).toBe(1);
    expect(edstem.counts.resources).toBe(1);
    expect(edstem.counts.messages).toBe(1);
  });
});
