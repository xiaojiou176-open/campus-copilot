export type AiPolicySite =
  | 'canvas'
  | 'gradescope'
  | 'edstem'
  | 'myuw'
  | 'myplan'
  | 'time-schedule'
  | 'course-sites';

export type AiSitePolicyOverlay = {
  site: AiPolicySite;
  siteLabel: string;
  allowedFamilies: string[];
  exportOnlyFamilies: string[];
  forbiddenAiObjects: string[];
  carrierHonesty: string;
  operatorNote: string;
};

const AI_SITE_POLICY_OVERLAYS: Record<AiPolicySite, AiSitePolicyOverlay> = {
  canvas: {
    site: 'canvas',
    siteLabel: 'Canvas',
    allowedFamilies: ['assignments', 'announcements', 'grades', 'calendar', 'resource metadata'],
    exportOnlyFamilies: ['course_material_excerpt'],
    forbiddenAiObjects: ['unfinished assignment detail pages', 'raw course files', 'raw submission payloads'],
    carrierHonesty: 'Treat Canvas data as a read-only campus carrier and never present session-backed paths as official public APIs.',
    operatorNote: 'Canvas answers should stay grounded in structured entities, cited exports, and explicit trust gaps while treating landed module/group/media carriers as resource metadata instead of raw course material access.',
  },
  gradescope: {
    site: 'gradescope',
    siteLabel: 'Gradescope',
    allowedFamilies: ['assignments', 'grades', 'review summaries'],
    exportOnlyFamilies: ['submission review artifacts'],
    forbiddenAiObjects: ['raw submission bodies', 'unreleased rubric detail', 'in-progress submission detail'],
    carrierHonesty: 'Treat Gradescope as a read-only session-backed grading carrier and keep reviewer uncertainty explicit.',
    operatorNote: 'Gradescope answers should summarize structured scores and question-level review summaries instead of inventing reviewer intent.',
  },
  edstem: {
    site: 'edstem',
    siteLabel: 'EdStem',
    allowedFamilies: ['threads', 'announcements', 'course links', 'resource metadata', 'resource groups', 'lesson details'],
    exportOnlyFamilies: ['thread attachments', 'raw lesson bodies', 'raw resource files'],
    forbiddenAiObjects: ['private draft replies', 'raw attachment bodies', 'hidden thread content', 'raw lesson bodies', 'raw resource files'],
    carrierHonesty:
      'Treat EdStem as a read-only classroom discussion and course-resource carrier; shared lesson/resource summaries are allowed, but this repo still does not claim official LMS parity or raw material ingestion.',
    operatorNote:
      'EdStem answers should focus on structured discussion context, resource metadata, resource-group signals, and lesson-detail signals while keeping broader grouped-material semantics explicit.',
  },
  myuw: {
    site: 'myuw',
    siteLabel: 'MyUW',
    allowedFamilies: ['events', 'announcements', 'time-sensitive notices', 'current schedule context'],
    exportOnlyFamilies: [
      'degree-audit summaries',
      'transcript summaries',
      'financial aid summaries',
      'profile summaries',
      'tuition and account summaries',
    ],
    forbiddenAiObjects: ['degree audit detail', 'transcript detail', 'financial aid detail', 'profile detail', 'emergency contact detail', 'tuition or account detail'],
    carrierHonesty:
      'Treat MyUW as a read-only student-status carrier; current notices can inform the desk, and transcript/finaid/profile/tuition detail now land as shipped review-ready detail surfaces with stricter export-first / AI-blocked handling.',
    operatorNote:
      'MyUW answers should separate current notices from high-sensitivity records and keep the shipped detail lanes export-first unless a narrower AI-allowed policy explicitly says otherwise.',
  },
  myplan: {
    site: 'myplan',
    siteLabel: 'MyPlan',
    allowedFamilies: ['planning substrates', 'degree requirement summaries', 'schedule option context'],
    exportOnlyFamilies: ['degree-audit summaries', 'comparison review packets'],
    forbiddenAiObjects: ['raw degree audit detail', 'registration automation advice', 'private student records'],
    carrierHonesty:
      'Treat MyPlan as a read-only planning substrate and comparison-oriented carrier, not as proof of enrollment entitlement or registration execution state.',
    operatorNote:
      'MyPlan answers should stay planning-oriented, keep requirement uncertainty visible, and prefer export-first review while the current lane is now a shipped read-only planning runtime lane rather than registration tooling.',
  },
  'time-schedule': {
    site: 'time-schedule',
    siteLabel: 'Time Schedule',
    allowedFamilies: ['public course offerings', 'meeting times', 'section identity'],
    exportOnlyFamilies: ['planning context snapshots'],
    forbiddenAiObjects: ['registration automation advice', 'seat-watcher polling', 'private student records'],
    carrierHonesty:
      "Treat Time Schedule as a public planning carrier, not as proof of the student's enrolled reality or any registration entitlement.",
    operatorNote:
      'Time Schedule answers should stay planning-oriented, cite public section context, and defer enrolled-state claims to MyUW.',
  },
  'course-sites': {
    site: 'course-sites',
    siteLabel: 'Course Websites',
    allowedFamilies: ['course identity', 'assignment metadata', 'schedule events', 'resource metadata'],
    exportOnlyFamilies: ['syllabus summaries', 'policy summaries', 'exam schedules'],
    forbiddenAiObjects: [
      'raw syllabus body',
      'unfinished assignment detail pages',
      'raw course files',
      'past exams or solutions',
    ],
    carrierHonesty:
      'Treat course websites as read-only metadata and schedule carriers first; public visibility does not make their raw materials AI-readable by default.',
    operatorNote:
      'Course-site answers should stay within the current shipped CS-only merge lane, preserve possible-match uncertainty, and prefer export-first review for syllabus, policy, and exam material.',
  },
};

export function getAiSitePolicyOverlay(site?: string | null): AiSitePolicyOverlay | undefined {
  if (!site) {
    return undefined;
  }

  return AI_SITE_POLICY_OVERLAYS[site as AiPolicySite];
}
