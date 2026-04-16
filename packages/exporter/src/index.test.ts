import { describe, expect, it } from 'vitest';
import { createExportArtifact } from './index';

const generatedAt = '2026-03-24T18:00:00-07:00';

const baseInput = {
  generatedAt,
  viewTitle: 'Status board',
  scope: {
    site: 'canvas',
    courseIdOrKey: 'canvas:course:1',
  },
  authorization: {
    policyVersion: 'wave1-skeleton',
    rules: [
      {
        id: 'canvas-layer1',
        layer: 'layer1_read_export' as const,
        status: 'allowed' as const,
        site: 'canvas',
        courseIdOrKey: 'canvas:course:1',
        resourceFamily: 'workspace_snapshot',
      },
      {
        id: 'canvas-layer2',
        layer: 'layer2_ai_read_analysis' as const,
        status: 'blocked' as const,
        site: 'canvas',
        courseIdOrKey: 'canvas:course:1',
        resourceFamily: 'workspace_snapshot',
      },
    ],
  },
  assignments: [
    {
      id: 'canvas:assignment:1',
      kind: 'assignment' as const,
      site: 'canvas' as const,
      source: {
        site: 'canvas' as const,
        resourceId: '1',
        resourceType: 'assignment',
      },
      courseId: 'canvas:course:1',
      title: 'Homework 5',
      summary: 'Submitted draft is already in Canvas.',
      detail: 'Q1 1 / 1 · Correct; Q2 0 / 1 · Incorrect',
      actionHints: ['Download graded copy', 'Submission history'],
      dueAt: '2026-03-26T23:59:00-07:00',
      status: 'todo' as const,
      reviewSummary: {
        questions: [
          {
            label: 'Q1',
            modality: 'manual' as const,
            score: 1,
            maxScore: 1,
            rubricLabels: ['Correct'],
            annotationPages: [3],
            annotationCount: 1,
          },
        ],
      },
    },
  ],
  announcements: [
    {
      id: 'canvas:announcement:2',
      kind: 'announcement' as const,
      site: 'canvas' as const,
      source: {
        site: 'canvas' as const,
        resourceId: '2',
        resourceType: 'announcement',
      },
      title: 'Project requirements changed',
      summary: 'Milestones and acceptance criteria were updated.',
      postedAt: '2026-03-23T20:00:00-07:00',
    },
  ],
  resources: [
    {
      id: 'edstem:resource:1',
      kind: 'resource' as const,
      site: 'edstem' as const,
      source: {
        site: 'edstem' as const,
        resourceId: 'resource-1',
        resourceType: 'resource',
      },
      courseId: 'edstem:course:1',
      title: 'Status board',
      resourceKind: 'file' as const,
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
      summary: 'Week 8 review set',
      detail: 'PDF · 452 KB',
      releasedAt: '2026-03-25T09:00:00-07:00',
      url: 'https://edstem.org/us/courses/1/resources/1',
    },
  ],
  messages: [
    {
      id: 'edstem:message:3',
      kind: 'message' as const,
      site: 'edstem' as const,
      source: {
        site: 'edstem' as const,
        resourceId: '3',
        resourceType: 'thread',
      },
      messageKind: 'thread' as const,
      title: 'Staff follow-up',
      summary: 'Staff posted a reply with the updated review checklist.',
      createdAt: '2026-03-24T08:00:00-07:00',
      unread: true,
    },
  ],
  grades: [
    {
      id: 'gradescope:grade:4',
      kind: 'grade' as const,
      site: 'gradescope' as const,
      source: {
        site: 'gradescope' as const,
        resourceId: '4',
        resourceType: 'grade',
      },
      assignmentId: 'gradescope:assignment:4',
      title: 'Midterm',
      score: 95,
      maxScore: 100,
      releasedAt: '2026-03-22T10:00:00-07:00',
    },
  ],
  events: [
    {
      id: 'myuw:event:5',
      kind: 'event' as const,
      site: 'myuw' as const,
      source: {
        site: 'myuw' as const,
        resourceId: '5',
        resourceType: 'event',
      },
      eventKind: 'deadline' as const,
      title: 'Registration deadline',
      summary: 'Drop and registration changes close this Friday.',
      location: 'Schmitz Hall',
      startAt: '2026-03-28T09:00:00-07:00',
      endAt: '2026-03-28T09:30:00-07:00',
    },
  ],
  alerts: [
    {
      id: 'derived:alert:6',
      kind: 'alert' as const,
      site: 'canvas' as const,
      source: {
        site: 'canvas' as const,
        resourceId: '6',
        resourceType: 'derived_alert',
      },
      alertKind: 'due_soon' as const,
      title: 'Homework 5 due soon',
      summary: 'Due within this week.',
      importance: 'high' as const,
      relatedEntities: [],
      triggeredAt: '2026-03-24T18:00:00-07:00',
    },
  ],
  timelineEntries: [
    {
      id: 'derived:timeline:7',
      kind: 'timeline_entry' as const,
      site: 'canvas' as const,
      source: {
        site: 'canvas' as const,
        resourceId: '7',
        resourceType: 'timeline_entry',
      },
      timelineKind: 'announcement_posted' as const,
      occurredAt: '2026-03-23T20:00:00-07:00',
      title: 'Project requirements changed',
      relatedEntities: [],
    },
  ],
  focusQueue: [
    {
      id: 'focus:assignment:1',
      kind: 'assignment',
      site: 'canvas',
      title: 'Homework 5',
      score: 210,
      summary: 'Submitted draft is already in Canvas.',
      pinned: true,
      note: 'Start this tonight',
      dueAt: '2026-03-26T23:59:00-07:00',
      entityId: 'canvas:assignment:1',
      entity: {
        id: 'canvas:assignment:1',
        kind: 'assignment',
        site: 'canvas',
      },
      reasons: [
        {
          code: 'due_soon',
          label: '48 hours remaining',
          importance: 'high',
          detail: 'Due at 2026-03-26T23:59:00-07:00.',
        },
      ],
      blockedBy: [],
    },
  ],
  weeklyLoad: [
    {
      dateKey: '2026-03-26',
      startsAt: '2026-03-26T00:00:00.000Z',
      endsAt: '2026-03-26T23:59:59.999Z',
      assignmentCount: 1,
      eventCount: 0,
      overdueCount: 0,
      dueSoonCount: 1,
      pinnedCount: 1,
      totalScore: 210,
      summary: 'High load: 1 item due soon and 1 pinned item.',
      highlights: ['1 item due soon', '1 pinned item'],
    },
  ],
  syncRuns: [
    {
      id: 'sync-run:canvas:1',
      site: 'canvas',
      status: 'success',
      outcome: 'partial_success',
      startedAt: '2026-03-24T17:59:00-07:00',
      completedAt: '2026-03-24T18:00:00-07:00',
      changeCount: 2,
      errorReason: 'announcements collector failed',
    },
  ],
  changeEvents: [
    {
      id: 'change-event:1',
      site: 'canvas',
      changeType: 'due_changed',
      occurredAt: '2026-03-24T18:00:00-07:00',
      title: 'Homework 5 due date changed',
      summary: 'Due date moved by one day.',
      entityId: 'canvas:assignment:1',
      previousValue: '2026-03-25T23:59:00-07:00',
      nextValue: '2026-03-26T23:59:00-07:00',
    },
  ],
  courseClusters: [
    {
      id: 'cluster:course:cse312',
      title: 'CSE 312',
      summary: 'Course website now leads the course identity merge.',
      authoritySource: 'course-sites:course_page',
      authorityNarrative:
        'Course identity stays on the course website while Canvas keeps the execution lane, EdStem keeps the discussion lane, and Gradescope keeps the assessment lane.',
      authorityBreakdown: [
        {
          role: 'course_identity',
          surface: 'course-sites',
          entityKey: 'course-sites:course:cse312:26sp',
          resourceType: 'course_page',
          label: 'CSE 312',
          reason: 'Course identity stays on the course website.',
        },
        {
          role: 'course_delivery',
          surface: 'canvas',
          entityKey: 'canvas:course:cse312',
          resourceType: 'course',
          label: 'CSE 312',
          reason: 'Canvas keeps the execution lane.',
        },
        {
          role: 'discussion_runtime',
          surface: 'edstem',
          entityKey: 'edstem:course:cse312',
          resourceType: 'thread',
          label: 'CSE 312',
          reason: 'EdStem keeps the discussion lane.',
        },
        {
          role: 'assessment_runtime',
          surface: 'gradescope',
          entityKey: 'gradescope:course:cse312',
          resourceType: 'assignment_row',
          label: 'CSE 312',
          reason: 'Gradescope keeps the assessment lane.',
        },
      ],
      matchConfidence: 'high' as const,
      relatedSites: ['canvas', 'edstem', 'gradescope', 'course-sites'],
      needsReview: false,
    },
  ],
  workItemClusters: [
    {
      id: 'cluster:work:cse312:hw5',
      title: 'Homework 5',
      summary: 'Assignment merge still needs human confirmation.',
      authoritySource: 'course-sites:assignment_row',
      authorityNarrative: 'course-sites owns the assignment spec and time anchor while Canvas still reflects the submission state.',
      authorityBreakdown: [
        {
          role: 'assignment_spec',
          surface: 'course-sites',
          entityKey: 'course-sites:assignment:hw5',
          resourceType: 'assignment_row',
          label: 'Homework 5',
          reason: 'Course site owns the assignment spec.',
        },
        {
          role: 'schedule_signal',
          surface: 'course-sites',
          entityKey: 'course-sites:assignment:hw5',
          resourceType: 'assignment_row',
          label: 'Homework 5',
          reason: 'Course site also carries the due-date anchor.',
        },
        {
          role: 'submission_state',
          surface: 'canvas',
          entityKey: 'canvas:assignment:hw5',
          resourceType: 'assignment',
          label: 'Homework 5',
          reason: 'Canvas still owns the submission state.',
        },
        {
          role: 'feedback_detail',
          surface: 'gradescope',
          entityKey: 'gradescope:grade:hw5',
          resourceType: 'grade',
          label: 'Homework 5',
          reason: 'Gradescope still owns the richer feedback lane.',
        },
      ],
      matchConfidence: 'medium' as const,
      relatedSites: ['canvas', 'course-sites', 'gradescope'],
      workType: 'assignment',
      dueAt: '2026-03-26T23:59:00-07:00',
      status: 'todo',
      needsReview: true,
    },
  ],
};

const planningInput = {
  generatedAt,
  viewTitle: 'Planning board',
  scope: {
    site: 'myplan' as const,
  },
  planningSubstrates: [
    {
      id: 'myplan:planning-substrate:live',
      source: 'myplan' as const,
      fit: 'derived_planning_substrate' as const,
      readOnly: true as const,
      capturedAt: '2026-04-10T08:00:00.000Z',
      lastUpdatedAt: '2026-04-10T09:30:00.000Z',
      planId: 'myplan-live',
      planLabel: 'Allen School planning draft',
      termCount: 3,
      plannedCourseCount: 9,
      backupCourseCount: 2,
      scheduleOptionCount: 4,
      requirementGroupCount: 5,
      programExplorationCount: 1,
      degreeProgressSummary: 'Core degree requirements still need one systems elective.',
      transferPlanningSummary: 'Transfer equivalency review remains manual.',
      currentStage: 'partial_shared_landing',
      runtimePosture: 'comparison_oriented_planning_substrate',
      currentTruth: 'Planning Pulse is now visible as a read-only summary lane.',
      exactBlockers: [
        {
          id: 'shared_planning_substrate_contract',
          class: 'repo-owned blocker' as const,
          summary: 'Shared planning promotion still needs a source-aware merge.',
          whyItStopsPromotion: 'The adapter proof exists, but export parity still needs to stay aligned.',
        },
      ],
      terms: [
        {
          termCode: '2026-sp',
          termLabel: 'Spring 2026',
          plannedCourseCount: 3,
          backupCourseCount: 1,
          scheduleOptionCount: 2,
        },
      ],
    },
    {
      id: 'time-schedule:planning-substrate:spring-2026',
      source: 'time-schedule' as const,
      fit: 'derived_planning_substrate' as const,
      readOnly: true as const,
      capturedAt: '2026-04-10T09:00:00.000Z',
      planId: 'timeschedule-spring-2026',
      planLabel: 'Time Schedule · Spring 2026',
      termCount: 1,
      plannedCourseCount: 2,
      backupCourseCount: 0,
      scheduleOptionCount: 1,
      requirementGroupCount: 0,
      programExplorationCount: 0,
      currentTruth: 'Time Schedule stays a public planning carrier.',
      exactBlockers: [],
      terms: [
        {
          termCode: '2026-sp',
          termLabel: 'Spring 2026',
          plannedCourseCount: 2,
          backupCourseCount: 0,
          scheduleOptionCount: 1,
        },
      ],
    },
  ],
};

describe('exporter package', () => {
  it('builds weekly assignments as human-readable markdown', () => {
    const artifact = createExportArtifact({
      preset: 'weekly_assignments',
      format: 'markdown',
      input: baseInput,
    });

    expect(artifact.filename).toContain('weekly-assignments');
    expect(artifact.mimeType).toBe('text/markdown');
    expect(artifact.content).toContain('# Weekly assignments');
    expect(artifact.content).toContain('Homework 5');
    expect(artifact.content).toContain('Submitted draft is already in Canvas.');
    expect(artifact.content).toContain('Q1 1 / 1 · Correct; Q2 0 / 1 · Incorrect');
  });

  it('builds recent updates as csv rows', () => {
    const artifact = createExportArtifact({
      preset: 'recent_updates',
      format: 'csv',
      input: baseInput,
    });

    expect(artifact.mimeType).toBe('text/csv');
    expect(artifact.content).toContain(
      'kind,site,scopeType,scopeSite,scopeCourseIdOrKey,resourceFamily,authorizationLevel,aiAllowed,riskLabel,matchConfidence,provenance,title',
    );
    expect(artifact.content).toContain(',detail,');
    expect(artifact.content).toContain('false');
    expect(artifact.content).toContain('announcement,canvas,current_course,canvas,canvas:course:1,recent_updates');
    expect(artifact.content).toContain('Milestones and acceptance criteria were updated.');
    expect(artifact.content).toContain('grade,gradescope,current_course,canvas,canvas:course:1,recent_updates');
    expect(artifact.content).toContain('Project requirements changed');
    expect(artifact.content).toContain('Midterm');
  });

  it('builds all deadlines as calendar output', () => {
    const artifact = createExportArtifact({
      preset: 'all_deadlines',
      format: 'ics',
      input: baseInput,
    });

    expect(artifact.mimeType).toBe('text/calendar');
    expect(artifact.content).toContain('BEGIN:VCALENDAR');
    expect(artifact.content).toContain('X-CAMPUS-COPILOT-AUTHORIZATION-LEVEL');
    expect(artifact.content).toContain('X-CAMPUS-COPILOT-GENERATED-AT');
    expect(artifact.content).toContain('X-CAMPUS-COPILOT-MATCH-CONFIDENCE');
    expect(artifact.content).toContain('X-CAMPUS-COPILOT-PROVENANCE');
    expect(artifact.content).toContain('SUMMARY:Homework 5');
    expect(artifact.content).toContain('SUMMARY:Registration deadline');
  });

  it('builds current view as structured json', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'json',
      input: baseInput,
    });

    expect(artifact.mimeType).toBe('application/json');
    expect(artifact.scope.site).toBe('canvas');
    expect(artifact.scope.courseIdOrKey).toBe('canvas:course:1');
    expect(artifact.packaging.authorizationLevel).toBe('allowed');
    expect(artifact.packaging.aiAllowed).toBe(false);
    expect(artifact.packaging.provenance.some((entry) => entry.label === 'Canvas official API carrier')).toBe(true);
    expect(artifact.content).toContain('"title": "Status board"');
    expect(artifact.content).toContain('"scope"');
    expect(artifact.content).toContain('"packaging"');
    expect(artifact.content).toContain('"authorization_level": "allowed"');
    expect(artifact.content).toContain('"ai_allowed": false');
    expect(artifact.content).toContain('"match_confidence": "medium"');
    expect(artifact.content).toContain('"assignments": 1');
    expect(artifact.content).toContain('"reviewSummary"');
    expect(artifact.content).toContain('"actionHints"');
    expect(artifact.content).toContain('"rubricLabels"');
    expect(artifact.content).toContain('"timelineEntries": 1');
    expect(artifact.content).toContain('"focusQueue": 1');
    expect(artifact.content).toContain('"weeklyLoad": 1');
  });

  it('labels regrade hubs and lesson resources with semantic labels in csv', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'csv',
      input: {
        ...baseInput,
        resources: [
          {
            id: 'gradescope:resource:1211108:regrade_requests',
            kind: 'resource' as const,
            site: 'gradescope' as const,
            source: {
              site: 'gradescope' as const,
              resourceId: '1211108:regrade_requests',
              resourceType: 'regrade_requests',
            },
            courseId: 'gradescope:course:1211108',
            resourceKind: 'other' as const,
            title: 'Regrade requests',
            summary: 'No submitted regrade requests yet.',
            detail: 'Course-level regrade hub is currently empty.',
            url: 'https://www.gradescope.com/courses/1211108/regrade_requests',
          },
          {
            id: 'edstem:lesson:162340',
            kind: 'resource' as const,
            site: 'edstem' as const,
            source: {
              site: 'edstem' as const,
              resourceId: '162340',
              resourceType: 'lesson',
            },
            courseId: 'edstem:course:1',
            resourceKind: 'link' as const,
            title: 'Week 8 review walkthrough',
            summary: 'Lesson summary',
            detail: 'Lesson · attempted',
            url: 'https://edstem.org/us/courses/1/lessons/162340',
          },
          {
            id: 'edstem:lesson-slide:162340:954014',
            kind: 'resource' as const,
            site: 'edstem' as const,
            source: {
              site: 'edstem' as const,
              resourceId: '954014',
              resourceType: 'lesson_slide',
            },
            courseId: 'edstem:course:1',
            resourceKind: 'link' as const,
            title: 'Week 8 slide 1',
            summary: 'Lesson slide summary',
            detail: 'Slide 1',
            url: 'https://edstem.org/us/courses/1/lessons/162340/slides/954014',
          },
        ],
      },
    });

    expect(artifact.content).toContain('Regrade requests,gradescope:course:1211108,,regrade hub');
    expect(artifact.content).toContain('Week 8 review walkthrough,edstem:course:1,,lesson');
    expect(artifact.content).toContain('Week 8 slide 1,edstem:course:1,,lesson slide');
  });

  it('builds current view as csv with assignment detail in the dedicated detail column', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'csv',
      input: baseInput,
    });

    expect(artifact.mimeType).toBe('text/csv');
    expect(artifact.content).toContain(',detail,');
    expect(artifact.content).toContain(',resourceGroupLabel,resourceGroupCount,resourceModuleLabel,resourceModuleItemType,');
    expect(artifact.content).toContain('Submitted draft is already in Canvas.');
    expect(artifact.content).toContain('Q1 1 / 1 · Correct; Q2 0 / 1 · Incorrect');
    expect(artifact.content).toContain('Actions: Download graded copy | Submission history');
    expect(artifact.content).toContain('Question breakdown: Q1 1 / 1 (Correct) [1 annotation on page 3]');
    expect(artifact.content).toContain('Homework');
    expect(artifact.content).toContain('Week 1');
  });

  it('includes planning substrate data in current-view json artifacts', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'json',
      input: planningInput,
    });

    expect(artifact.packaging.provenance.some((entry) => entry.label === 'Planning Pulse shared lane')).toBe(true);
    expect(artifact.content).toContain('"planningSubstrates": 2');
    expect(artifact.content).toContain('"planLabel": "Allen School planning draft"');
    expect(artifact.content).toContain('"currentTruth": "Planning Pulse is now visible as a read-only summary lane."');
    expect(artifact.content).toContain('"planLabel": "Time Schedule · Spring 2026"');
  });

  it('exports the latest planning pulse body in current-view csv artifacts', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'csv',
      input: planningInput,
    });

    expect(artifact.content).toContain('planning_substrate,myplan,current_view,myplan,,workspace_snapshot');
    expect(artifact.content).toContain('Allen School planning draft');
    expect(artifact.content).toContain('Current stage: partial shared landing');
    expect(artifact.content).toContain('Runtime posture: comparison oriented planning substrate');
    expect(artifact.content).toContain('Degree progress: Core degree requirements still need one systems elective.');
    expect(artifact.content).toContain('Transfer planning: Transfer equivalency review remains manual.');
    expect(artifact.content).toContain('Exact blockers: shared_planning_substrate_contract');
    expect(artifact.content).toContain('Terms: Spring 2026: 3 planned · 1 backup · 2 option(s)');
    expect(artifact.content).not.toContain('Time Schedule · Spring 2026');
  });

  it('exports the latest planning pulse body in current-view markdown artifacts', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'markdown',
      input: planningInput,
    });

    expect(artifact.content).toContain('## Planning Pulse');
    expect(artifact.content).toContain('Allen School planning draft (MyPlan; 3 term(s) · 9 planned course(s) · 2 backup course(s) · 4 schedule option(s); requirement groups 5; exploration paths 1; current stage partial shared landing; runtime posture comparison oriented planning substrate)');
    expect(artifact.content).toContain('captured 2026-04-10T08:00:00.000Z; updated 2026-04-10T09:30:00.000Z');
    expect(artifact.content).toContain('Planning Pulse is now visible as a read-only summary lane.');
    expect(artifact.content).toContain('degree progress Core degree requirements still need one systems elective.');
    expect(artifact.content).toContain('transfer planning Transfer equivalency review remains manual.');
    expect(artifact.content).toContain('exact blockers shared_planning_substrate_contract');
    expect(artifact.content).toContain('term Spring 2026: 3 planned · 1 backup · 2 option(s)');
    expect(artifact.content).not.toContain('Time Schedule · Spring 2026');
  });

  it('labels regrade hubs and lesson resources with semantic labels in markdown', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'markdown',
      input: {
        ...baseInput,
        resources: [
          {
            id: 'gradescope:resource:1211108:regrade_requests',
            kind: 'resource' as const,
            site: 'gradescope' as const,
            source: {
              site: 'gradescope' as const,
              resourceId: '1211108:regrade_requests',
              resourceType: 'regrade_requests',
            },
            courseId: 'gradescope:course:1211108',
            resourceKind: 'other' as const,
            title: 'Regrade requests',
            summary: 'No submitted regrade requests yet.',
            detail: 'Course-level regrade hub is currently empty.',
            url: 'https://www.gradescope.com/courses/1211108/regrade_requests',
          },
          {
            id: 'edstem:lesson:162340',
            kind: 'resource' as const,
            site: 'edstem' as const,
            source: {
              site: 'edstem' as const,
              resourceId: '162340',
              resourceType: 'lesson',
            },
            courseId: 'edstem:course:1',
            resourceKind: 'link' as const,
            title: 'Week 8 review walkthrough',
            summary: 'Lesson summary',
            detail: 'Lesson · attempted',
            url: 'https://edstem.org/us/courses/1/lessons/162340',
          },
          {
            id: 'edstem:lesson-slide:162340:954014',
            kind: 'resource' as const,
            site: 'edstem' as const,
            source: {
              site: 'edstem' as const,
              resourceId: '954014',
              resourceType: 'lesson_slide',
            },
            courseId: 'edstem:course:1',
            resourceKind: 'link' as const,
            title: 'Week 8 slide 1',
            summary: 'Lesson slide summary',
            detail: 'Slide 1',
            url: 'https://edstem.org/us/courses/1/lessons/162340/slides/954014',
          },
        ],
      },
    });

    expect(artifact.content).toContain('- Regrade requests (gradescope) - kind regrade hub');
    expect(artifact.content).toContain('- Week 8 review walkthrough (edstem) - kind lesson');
    expect(artifact.content).toContain('- Week 8 slide 1 (edstem) - kind lesson slide');
  });

  it('keeps course-sites spec witness and regrade hub detail visible in markdown exports', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'markdown',
      input: {
        ...baseInput,
        assignments: [
          {
            id: 'course-sites:assignment:cse312-pset1',
            kind: 'assignment' as const,
            site: 'course-sites' as const,
            source: {
              site: 'course-sites' as const,
              resourceId: 'cse312:pset1',
              resourceType: 'assignment_row',
            },
            courseId: 'course-sites:course:cse312:26sp',
            title: 'Pset 1',
            status: 'unknown' as const,
            summary: 'Spec witness: PDF spec · HTML spec · LaTeX template. Released April 1.',
            detail: 'Spec columns: Pset (pdf) · Pset (html) · Latex template.',
            actionHints: ['Open PDF spec', 'Open HTML spec', 'Open LaTeX template'],
            dueAt: '2026-04-08T23:59:00-07:00',
          },
        ],
        resources: [
          {
            id: 'gradescope:resource:1211108:regrade_requests',
            kind: 'resource' as const,
            site: 'gradescope' as const,
            source: {
              site: 'gradescope' as const,
              resourceId: '1211108:regrade_requests',
              resourceType: 'regrade_requests',
            },
            courseId: 'gradescope:course:1211108',
            resourceKind: 'other' as const,
            title: 'Regrade requests',
            summary: 'No submitted regrade requests yet.',
            detail: 'Course-level regrade hub is currently empty. Columns: Question · Assignment · Requested · Status.',
            url: 'https://www.gradescope.com/courses/1211108/regrade_requests',
          },
        ],
      },
    });

    expect(artifact.content).toContain('Spec witness: PDF spec · HTML spec · LaTeX template. Released April 1.');
    expect(artifact.content).toContain('detail Spec columns: Pset (pdf) · Pset (html) · Latex template.');
    expect(artifact.content).toContain('actions Open PDF spec | Open HTML spec | Open LaTeX template');
    expect(artifact.content).toContain('Regrade requests (gradescope) - kind regrade hub');
    expect(artifact.content).toContain('detail Course-level regrade hub is currently empty. Columns: Question · Assignment · Requested · Status.');
  });

  it('builds focus queue as markdown without re-deriving scores', () => {
    const artifact = createExportArtifact({
      preset: 'focus_queue',
      format: 'markdown',
      input: baseInput,
    });

    expect(artifact.filename).toContain('focus-queue');
    expect(artifact.content).toContain('# Focus queue');
    expect(artifact.content).toContain('## Policy Envelope');
    expect(artifact.content).toContain('Homework 5');
    expect(artifact.content).toContain('score 210');
    expect(artifact.content).toContain('Submitted draft is already in Canvas.');
    expect(artifact.content).toContain('48 hours remaining: Due at 2026-03-26T23:59:00-07:00.');
  });

  it('includes structured assignment review summaries in markdown exports when present', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'markdown',
      input: baseInput,
    });

    expect(artifact.content).toContain('review Q1 1 / 1 (Correct) [1 annotation on page 3]');
    expect(artifact.content).toContain('resource set Homework (2 items)');
    expect(artifact.content).toContain('module Week 1 (assignment)');
    expect(artifact.content).toContain('authority course-sites · course page');
    expect(artifact.content).toContain('authority course-sites · assignment row');
    expect(artifact.content).toContain(
      'authority narrative Course identity stays on the course website while Canvas keeps the execution lane, EdStem keeps the discussion lane, and Gradescope keeps the assessment lane.',
    );
    expect(artifact.content).toContain(
      'boundary map identity[title/code/term/link]=course-sites · delivery[modules/assignments/announcements/runtime]=canvas · discussion[threads/replies/lesson-entry]=edstem · assessment[submissions/scores/review]=gradescope',
    );
    expect(artifact.content).toContain(
      'surface coverage course-sites=>identity[title/code/term/link] · canvas=>delivery[modules/assignments/announcements/runtime] · edstem=>discussion[threads/replies/lesson-entry] · gradescope=>assessment[submissions/scores/review]',
    );
    expect(artifact.content).toContain(
      'course identity: course-sites · course page · fields title/code/term/link - Course identity stays on the course website.',
    );
    expect(artifact.content).toContain(
      'discussion runtime: edstem · thread · fields threads/replies/lesson-entry - EdStem keeps the discussion lane.',
    );
    expect(artifact.content).toContain(
      'assessment runtime: gradescope · assignment row · fields submissions/scores/review - Gradescope keeps the assessment lane.',
    );
    expect(artifact.content).toContain(
      'boundary map spec[title/spec/link]=course-sites · schedule[dueAt/startAt/endAt]=course-sites · submission[status/submission]=canvas · feedback[score/rubric/comment/annotation]=gradescope',
    );
    expect(artifact.content).toContain(
      'surface coverage course-sites=>spec[title/spec/link] + schedule[dueAt/startAt/endAt] · canvas=>submission[status/submission] · gradescope=>feedback[score/rubric/comment/annotation]',
    );
  });

  it('surfaces value-level authority corroboration separately when breakdown reasons carry current values', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'markdown',
      input: {
        ...baseInput,
        resources: [],
        assignments: [],
        announcements: [],
        messages: [],
        grades: [],
        events: [],
        alerts: [],
        timelineEntries: [],
        focusQueue: [],
        weeklyLoad: [],
        syncRuns: [],
        changeEvents: [],
        courseClusters: [
          {
            id: 'cluster:course:cse312',
            title: 'CSE 312',
            summary: 'Course website now leads the course identity merge.',
            authoritySource: 'course-sites:course_page',
            authorityNarrative: '课程身份与执行面已经分层对齐。',
            authorityBreakdown: [
              {
                role: 'course_identity',
                surface: 'course-sites',
                entityKey: 'course-sites:course:cse312:26sp',
                resourceType: 'course_page',
                label: 'CSE 312',
                reason:
                  '课程网站承担课程身份 authority。 字段佐证锁在 课程标题 / 课程代码 / 学期 / 课程链接。 当前值锁在 title=CSE 312 / code=CSE 312 / term=26sp / linkHost=courses.cs.washington.edu。',
              },
            ],
            matchConfidence: 'high' as const,
            relatedSites: ['course-sites'],
          },
        ],
        workItemClusters: [
          {
            id: 'cluster:work:cse312:hw5',
            title: 'Homework 5',
            summary: 'Assignment merge still needs human confirmation.',
            authoritySource: 'course-sites:assignment_row',
            authorityNarrative: 'course-sites owns the assignment spec.',
            authorityBreakdown: [
              {
                role: 'schedule_signal',
                surface: 'course-sites',
                entityKey: 'course-sites:assignment:hw5',
                resourceType: 'assignment_row',
                label: 'Homework 5',
                reason:
                  '时间锚点以课程网站为准。 字段佐证锁在 dueAt。 当前值锁在 dueAt=2026-03-26T23:59:00-07:00。',
              },
            ],
            matchConfidence: 'medium' as const,
            relatedSites: ['course-sites'],
            workType: 'assignment',
          },
        ],
      },
    });

    expect(artifact.content).toContain(
      'course identity: course-sites · course page · fields title/code/term/link · values title=CSE 312 / code=CSE 312 / term=26sp / linkHost=courses.cs.washington.edu - 课程网站承担课程身份 authority。 字段佐证锁在 课程标题 / 课程代码 / 学期 / 课程链接。',
    );
    expect(artifact.content).toContain(
      'coverage gaps delivery runtime not landed · discussion runtime not landed · assessment runtime not landed',
    );
    expect(artifact.content).toContain(
      'schedule signal: course-sites · assignment row · fields dueAt/startAt/endAt · values dueAt=2026-03-26T23:59:00-07:00 - 时间锚点以课程网站为准。 字段佐证锁在 dueAt。',
    );
  });

  it('treats locally reviewed cluster decisions as resolved export statuses instead of open review blockers', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'markdown',
      input: {
        ...baseInput,
        resources: [],
        assignments: [],
        announcements: [],
        messages: [],
        grades: [],
        events: [],
        alerts: [],
        timelineEntries: [],
        focusQueue: [],
        weeklyLoad: [],
        syncRuns: [],
        changeEvents: [],
        mergeHealth: {
          mergedCount: 2,
          possibleMatchCount: 0,
          unresolvedCount: 0,
          authorityConflictCount: 0,
        },
        courseClusters: [
          {
            id: 'cluster:course:cse312',
            title: 'CSE 312',
            summary: 'Course website merge was accepted locally.',
            authoritySource: 'course-sites:course_page',
            authorityNarrative:
              'Course website merge was accepted after confirming the course identity lives on the course site.',
            matchConfidence: 'medium' as const,
            relatedSites: ['canvas', 'course-sites'],
            needsReview: true,
            reviewDecision: 'accepted' as const,
          },
        ],
        workItemClusters: [
          {
            id: 'cluster:work:cse312:hw5',
            title: 'Homework 5',
            summary: 'This cluster was dismissed locally because it is not the same assignment.',
            authoritySource: 'course-sites:assignment_row',
            authorityNarrative:
              'Course site and Canvas were reviewed together, but this row stayed dismissed because the assignment identities diverged.',
            matchConfidence: 'medium' as const,
            relatedSites: ['canvas', 'course-sites'],
            workType: 'assignment',
            dueAt: '2026-03-26T23:59:00-07:00',
            status: 'todo',
            needsReview: true,
            reviewDecision: 'dismissed' as const,
          },
        ],
      },
    });

    expect(artifact.content).toContain('CSE 312 (accepted locally; medium; authority course-sites · course page)');
    expect(artifact.content).toContain('Homework 5 (assignment; dismissed locally; medium; authority course-sites · assignment row)');
    expect(artifact.content).toContain(
      'authority narrative Course website merge was accepted after confirming the course identity lives on the course site.',
    );
    expect(artifact.content).not.toContain('possible match');
  });

  it('builds weekly load as csv rows', () => {
    const artifact = createExportArtifact({
      preset: 'weekly_load',
      format: 'csv',
      input: baseInput,
    });

    expect(artifact.filename).toContain('weekly-load');
    expect(artifact.content).toContain('dateKey');
    expect(artifact.content).toContain('2026-03-26');
    expect(artifact.content).toContain('High load: 1 item due soon and 1 pinned item.');
    expect(artifact.content).toContain('1 item due soon | 1 pinned item');
  });

  it('builds change journal as markdown from sync runs and change events', () => {
    const artifact = createExportArtifact({
      preset: 'change_journal',
      format: 'markdown',
      input: baseInput,
    });

    expect(artifact.filename).toContain('change-journal');
    expect(artifact.content).toContain('# Change journal');
    expect(artifact.content).toContain('Sync Runs');
    expect(artifact.content).toContain('Change Events');
    expect(artifact.content).toContain('Homework 5 due date changed');
  });

  it('falls back to a conservative packaging skeleton when no auth rules are provided', () => {
    const artifact = createExportArtifact({
      preset: 'focus_queue',
      format: 'json',
      input: {
        generatedAt,
        focusQueue: baseInput.focusQueue,
      },
    });

    expect(artifact.scope.scopeType).toBe('multi_site');
    expect(artifact.scope.resourceFamily).toBe('focus_queue');
    expect(artifact.packaging.authorizationLevel).toBe('partial');
    expect(artifact.packaging.aiAllowed).toBe(false);
    expect(artifact.packaging.provenance).toHaveLength(2);
  });

  it('tightens workspace snapshot packaging when high-sensitivity administrative summaries are present', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'json',
      input: {
        generatedAt,
        authorization: {
          policyVersion: 'wave2-deepwater-productization',
          rules: [
            {
              id: 'workspace-layer1',
              layer: 'layer1_read_export',
              status: 'allowed',
              resourceFamily: 'workspace_snapshot',
            },
            {
              id: 'workspace-layer2',
              layer: 'layer2_ai_read_analysis',
              status: 'allowed',
              resourceFamily: 'workspace_snapshot',
            },
            {
              id: 'transcript-layer1',
              layer: 'layer1_read_export',
              status: 'confirm_required',
              resourceFamily: 'transcript_summary',
            },
            {
              id: 'transcript-layer2',
              layer: 'layer2_ai_read_analysis',
              status: 'blocked',
              resourceFamily: 'transcript_summary',
            },
          ],
        },
        administrativeSummaries: [
          {
            id: 'admin:transcript:1',
            family: 'transcript',
            laneStatus: 'landed_summary_lane',
            detailRuntimeStatus: 'pending',
            detailRuntimeNote:
              'Review-ready summary stays export-first until a stronger transcript detail lane is promoted.',
            title: 'Transcript summary',
            summary: 'Latest transcript lane currently appears as a review-first summary and stays export-first.',
            importance: 'high',
            aiDefault: 'blocked',
            authoritySource: 'myuw summary lane',
            sourceSurface: 'myuw',
            exactBlockers: [
              {
                id: 'transcript_ai_blocked',
                summary: 'Transcript AI remains blocked.',
                whyItStopsPromotion: 'Keep transcript review/export-first until a lawful summary workflow is explicitly promoted.',
              },
            ],
          },
        ],
      },
    });

    expect(artifact.scope.resourceFamily).toBe('workspace_snapshot');
    expect(artifact.packaging.authorizationLevel).toBe('confirm_required');
    expect(artifact.packaging.aiAllowed).toBe(false);
    expect(artifact.packaging.riskLabel).toBe('high');
    expect(artifact.packaging.provenance.some((entry) => entry.label === 'Administrative summary surface')).toBe(true);
    expect(
      artifact.packaging.provenance.some((entry) =>
        entry.detail?.includes('their presence does not mean a truthful runtime carrier is landed'),
      ),
    ).toBe(false);
    expect(artifact.content).toContain('"administrativeSummaries": 1');
    expect(artifact.content).toContain('"authorization_level": "confirm_required"');
    expect(artifact.content).toContain('"detailRuntimeStatus": "pending"');
    expect(artifact.content).toContain('"detailRuntimeNote": "Review-ready summary stays export-first until a stronger transcript detail lane is promoted."');
    expect(artifact.content).toContain('"sourceSurface": "myuw"');
    expect(artifact.content).toContain('"exactBlockers"');
  });

  it('ignores caller-supplied packaging overrides that would overstate authorization truth', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'csv',
      input: {
        generatedAt,
        scope: {
          site: 'myuw',
        },
        packaging: {
          authorizationLevel: 'allowed',
          aiAllowed: true,
        },
        authorization: {
          policyVersion: 'wave2-deepwater-productization',
          rules: [
            {
              id: 'workspace-layer1',
              layer: 'layer1_read_export',
              status: 'allowed',
              resourceFamily: 'workspace_snapshot',
            },
            {
              id: 'workspace-layer2',
              layer: 'layer2_ai_read_analysis',
              status: 'allowed',
              resourceFamily: 'workspace_snapshot',
            },
            {
              id: 'transcript-layer1',
              layer: 'layer1_read_export',
              status: 'confirm_required',
              resourceFamily: 'transcript_summary',
            },
            {
              id: 'transcript-layer2',
              layer: 'layer2_ai_read_analysis',
              status: 'blocked',
              resourceFamily: 'transcript_summary',
            },
          ],
        },
        administrativeSummaries: [
          {
            id: 'admin-summary:transcript:blocker',
            family: 'transcript',
            laneStatus: 'carrier_not_landed',
            detailRuntimeStatus: 'blocked_missing_carrier',
            detailRuntimeNote: 'Transcript runtime detail remains blocked until a lawful carrier is proven.',
            title: 'Transcript summary lane',
            summary: 'No truthful transcript runtime carrier is landed yet. Historical-record detail remains blocked until a lawful summary carrier is proven.',
            importance: 'high',
            aiDefault: 'blocked',
            authoritySource: 'myuw candidate lane',
            sourceSurface: 'myuw',
            exactBlockers: [
              {
                id: 'transcript_missing_runtime_lane',
                summary: 'Transcript summary carrier is missing.',
                whyItStopsPromotion:
                  'Keep export-first and AI-blocked until a summary carrier is landed or an exact external blocker is proven.',
              },
            ],
          },
        ],
      },
    });

    expect(artifact.packaging.authorizationLevel).toBe('confirm_required');
    expect(artifact.packaging.aiAllowed).toBe(false);
    const myuwCarrier = artifact.packaging.provenance.find((entry) => entry.label === 'MyUW student-status carrier');
    expect(myuwCarrier?.detail).toContain('statement-backed tuition surfaces stay review-first');
    expect(myuwCarrier?.detail).not.toContain('promotion still pending');
    expect(
      artifact.packaging.provenance.some((entry) =>
        entry.detail?.includes('their presence does not mean every family has a summary-ready lane yet'),
      ),
    ).toBe(true);
    expect(artifact.content).toContain('administrative_summary,myuw,current_view,myuw,,workspace_snapshot');
    expect(artifact.content).toContain('Source surface: myuw | Authority: myuw candidate lane | Detail runtime: blocked missing carrier');
    expect(artifact.content).toContain('Exact blockers: transcript_missing_runtime_lane');
    expect(artifact.content).toContain('carrier_not_landed');
    expect(artifact.content).toContain('Detail runtime: blocked missing carrier');
  });

  it('renders administrative summaries in markdown with source, authority, and export-safe blocker context', () => {
    const artifact = createExportArtifact({
      preset: 'current_view',
      format: 'markdown',
      input: {
        generatedAt,
        authorization: {
          policyVersion: 'wave2-deepwater-productization',
          rules: [
            {
              id: 'workspace-layer1',
              layer: 'layer1_read_export',
              status: 'confirm_required',
              resourceFamily: 'workspace_snapshot',
            },
            {
              id: 'workspace-layer2',
              layer: 'layer2_ai_read_analysis',
              status: 'blocked',
              resourceFamily: 'workspace_snapshot',
            },
          ],
        },
        administrativeSummaries: [
          {
            id: 'admin-summary:transcript:blocker',
            family: 'transcript',
            laneStatus: 'carrier_not_landed',
            detailRuntimeStatus: 'blocked_missing_carrier',
            detailRuntimeNote: 'Transcript runtime detail remains blocked until a lawful carrier is proven.',
            title: 'Transcript summary lane',
            summary:
              'No truthful transcript runtime carrier is landed yet. Historical-record detail remains blocked until a lawful summary carrier is proven.',
            importance: 'high',
            aiDefault: 'blocked',
            authoritySource: 'myuw candidate lane',
            sourceSurface: 'myuw',
            nextAction:
              'Keep export-first and AI-blocked until a summary carrier is landed or an exact external blocker is proven.',
            exactBlockers: [
              {
                id: 'transcript_missing_runtime_lane',
                summary: 'Transcript summary carrier is missing.',
                whyItStopsPromotion:
                  'Keep export-first and AI-blocked until a summary carrier is landed or an exact external blocker is proven.',
              },
            ],
          },
        ],
      },
    });

    expect(artifact.content).toContain('## Administrative Summaries');
    expect(artifact.content).toContain(
      'Transcript summary lane (transcript; source myuw; AI blocked; detail runtime blocked missing carrier; authority myuw candidate lane; exact blockers transcript_missing_runtime_lane)',
    );
    expect(artifact.content).toContain(
      'note Transcript runtime detail remains blocked until a lawful carrier is proven.',
    );
    expect(artifact.content).toContain(
      'next: Keep export-first and AI-blocked until a summary carrier is landed or an exact external blocker is proven.',
    );
  });
});
