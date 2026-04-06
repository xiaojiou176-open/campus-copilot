import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkbenchDecisionSections, WorkbenchOperationsSections } from './workbench-panel-sections';
import { getUiText } from './i18n';

describe('workbench decision sections', () => {
  it('renders English-facing alerts and recent updates through localization helpers', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchDecisionSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="sidepanel"
        focusQueue={[]}
        weeklyLoad={[]}
        priorityAlerts={[
          {
            id: 'alert:1',
            kind: 'alert',
            site: 'canvas',
            source: { site: 'canvas', resourceId: 'alert:1', resourceType: 'derived_alert' },
            alertKind: 'due_soon',
            title: 'Homework 5 48 小时内截止',
            summary: '这个任务正在逼近截止时间，应该继续留在高优先级。',
            importance: 'high',
            relatedEntities: [],
            triggeredAt: '2026-04-01T00:00:00.000Z',
          },
        ]}
        criticalAlerts={[]}
        highAlerts={[
          {
            id: 'alert:1',
            kind: 'alert',
            site: 'canvas',
            source: { site: 'canvas', resourceId: 'alert:1', resourceType: 'derived_alert' },
            alertKind: 'due_soon',
            title: 'Homework 5 48 小时内截止',
            summary: '这个任务正在逼近截止时间，应该继续留在高优先级。',
            importance: 'high',
            relatedEntities: [],
            triggeredAt: '2026-04-01T00:00:00.000Z',
          },
        ]}
        mediumAlerts={[]}
        currentRecentUpdates={{
          unseenCount: 1,
          items: [
            {
              id: 'timeline:1',
              kind: 'timeline_entry',
              site: 'edstem',
              source: { site: 'edstem', resourceId: 'timeline:1', resourceType: 'timeline_entry' },
              timelineKind: 'discussion_replied',
              occurredAt: '2026-04-01T01:00:00.000Z',
              title: '讨论区有新动态',
              summary: '近期有新的讨论更新。',
              relatedEntities: [],
            },
          ],
        }}
        onExport={async () => {}}
        onTogglePin={async () => {}}
        onSnooze={async () => {}}
        onDismiss={async () => {}}
        onNote={async () => {}}
      />,
    );

    expect(markup).toContain('Homework 5 is due soon');
    expect(markup).toContain('This work is approaching its deadline and should stay near the top.');
    expect(markup).toContain('High');
    expect(markup).toContain('Recent discussion update');
    expect(markup).toContain('Recent discussion activity landed here.');
    expect(markup).toContain('Discussion reply');
    expect(markup).not.toContain('48 小时内截止');
    expect(markup).not.toContain('近期有新的讨论更新');
  });
});

describe('workbench operations sections', () => {
  it('renders richer assignment, discussion, and schedule detail when canonical summaries are present', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchOperationsSections
        text={getUiText('en')}
        uiLanguage="en"
        surface="sidepanel"
        currentResources={[
          {
            id: 'edstem:resource:1',
            kind: 'resource',
            site: 'edstem',
            source: { site: 'edstem', resourceId: '1', resourceType: 'resource' },
            courseId: 'edstem:course:11',
            resourceKind: 'file',
            title: 'Week 8 review sheet',
            summary: 'Homework',
            detail: 'Download file · PDF · 452 KB',
            downloadUrl: 'https://us.edstem.org/api/resources/1/download/week-8-review-sheet.pdf?dl=1',
            releasedAt: '2026-04-03T09:00:00.000Z',
          },
        ]}
        currentAssignments={[
          {
            id: 'canvas:assignment:1',
            kind: 'assignment',
            site: 'canvas',
            source: { site: 'canvas', resourceId: '1', resourceType: 'assignment' },
            title: 'Homework 5',
            status: 'submitted',
            summary: 'Submitted late and still awaiting grading.',
            detail: 'Q1 1 / 1 · Correct; Q2 0 / 1 · Incorrect',
            dueAt: '2026-04-05T09:00:00.000Z',
          },
        ]}
        currentAnnouncements={[
          {
            id: 'myuw:notice:1',
            kind: 'announcement',
            site: 'myuw',
            source: { site: 'myuw', resourceId: 'notice-1', resourceType: 'notice' },
            title: 'Tuition Due',
            summary: 'Spring quarter tuition is due.',
          },
        ]}
        currentMessages={[
          {
            id: 'edstem:message:1',
            kind: 'message',
            site: 'edstem',
            source: { site: 'edstem', resourceId: '1', resourceType: 'thread' },
            messageKind: 'thread',
            title: 'Staff follow-up',
            summary: 'Project 2 thread: instructor clarified the grading scope.',
            updatedAt: '2026-04-04T09:30:00.000Z',
            unread: true,
            instructorAuthored: true,
          },
        ]}
        currentEvents={[
          {
            id: 'myuw:event:1',
            kind: 'event',
            site: 'myuw',
            source: { site: 'myuw', resourceId: '1', resourceType: 'schedule_meeting' },
            eventKind: 'class',
            title: 'CSE 142 lecture',
            summary: 'Lecture meets in person this week.',
            location: 'MEB 246',
            startAt: '2026-04-04T17:30:00.000Z',
            endAt: '2026-04-04T18:20:00.000Z',
          },
        ]}
        orderedSiteStatus={[]}
        syncFeedback={{}}
        onSyncSite={async () => {}}
        onExport={async () => {}}
        latestSyncRun={undefined}
        recentChangeEvents={[]}
      />,
    );

    expect(markup).toContain('Submitted late and still awaiting grading.');
    expect(markup).toContain('Q1 1 / 1 · Correct; Q2 0 / 1 · Incorrect');
    expect(markup).toContain('Study Materials');
    expect(markup).toContain('Week 8 review sheet');
    expect(markup).toContain('Download file · PDF · 452 KB');
    expect(markup).toContain('Open download');
    expect(markup).toContain('https://us.edstem.org/api/resources/1/download/week-8-review-sheet.pdf?dl=1');
    expect(markup).toContain('Notice Signals');
    expect(markup).toContain('Spring quarter tuition is due.');
    expect(markup).toContain('Discussion Highlights');
    expect(markup).toContain('Project 2 thread: instructor clarified the grading scope.');
    expect(markup).toContain('Unread');
    expect(markup).toContain('Staff');
    expect(markup).toContain('Schedule Outlook');
    expect(markup).toContain('Lecture meets in person this week.');
    expect(markup).toContain('MEB 246');
  });
});
