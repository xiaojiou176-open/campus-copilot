import { z } from 'zod';

export const ProviderIdSchema = z.enum(['openai', 'gemini', 'switchyard']);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const SwitchyardRuntimeProviderSchema = z.enum([
  'chatgpt',
  'gemini',
  'claude',
  'grok',
  'qwen',
]);
export type SwitchyardRuntimeProvider = z.infer<typeof SwitchyardRuntimeProviderSchema>;

export const SwitchyardLaneSchema = z.enum(['web', 'byok']);
export type SwitchyardLane = z.infer<typeof SwitchyardLaneSchema>;

export const AiRuntimeModeSchema = z.enum(['auto', 'switchyard_first', 'direct']);
export type AiRuntimeMode = z.infer<typeof AiRuntimeModeSchema>;

export const AiRuntimePathSchema = z.enum(['direct', 'switchyard']);
export type AiRuntimePath = z.infer<typeof AiRuntimePathSchema>;

export const AcademicRedZoneSurfaceSchema = z.enum([
  'register-uw',
  'notify-uw',
  'registration-related-resources',
  'seat-watcher-waitlist-polling',
  'add-drop-submission',
  'seat-swap-hold-seat',
  'registration-query-loop',
]);
export type AcademicRedZoneSurface = z.infer<typeof AcademicRedZoneSurfaceSchema>;

export const AcademicRedZoneHardStopSchema = z
  .object({
    surface: AcademicRedZoneSurfaceSchema,
    title: z.literal('Not supported in the current product path'),
    reason: z.literal('This surface crosses the current read-only academic safety boundary.'),
    actionLabel: z.literal('Registration automation stays off'),
    manualOnlyNote: z.literal('Open the original site if you need to continue manually.'),
    docsLabel: z.literal('Academic Safety Contract'),
  })
  .strict();
export type AcademicRedZoneHardStop = z.infer<typeof AcademicRedZoneHardStopSchema>;

export const AdvancedMaterialAnalysisGuardSchema = z
  .object({
    status: z.literal('default_disabled'),
    enabled: z.literal(false),
    toggleLabel: z.literal('Advanced material analysis'),
    note: z.literal(
      'Default off. Raw course files, lecture slides, instructor-authored notes, exams, quizzes, assignment PDFs, and solution documents stay outside the default AI path.',
    ),
    requirements: z
      .tuple([
        z.literal('explicit per-course opt-in'),
        z.literal('separate UX'),
        z.literal('separate review'),
        z.literal('user-responsibility language'),
      ]),
  })
  .strict();
export type AdvancedMaterialAnalysisGuard = z.infer<typeof AdvancedMaterialAnalysisGuardSchema>;

export const AdvancedMaterialAnalysisDefaultSchema = z
  .object({
    enabled: z.literal(false),
    policy: z.literal('default_disabled'),
  })
  .strict();
export type AdvancedMaterialAnalysisDefault = z.infer<typeof AdvancedMaterialAnalysisDefaultSchema>;

export const AdvancedMaterialAnalysisPerCourseOptInSchema = z
  .object({
    enabled: z.literal(true),
    policy: z.literal('per_course_opt_in'),
    courseId: z.string().trim().min(1),
    courseLabel: z.string().trim().min(1),
    excerpt: z.string().trim().min(1),
    userAcknowledgedResponsibility: z.literal(true),
  })
  .strict();
export type AdvancedMaterialAnalysisPerCourseOptIn = z.infer<typeof AdvancedMaterialAnalysisPerCourseOptInSchema>;

export const AdvancedMaterialAnalysisRequestSchema = z.union([
  AdvancedMaterialAnalysisDefaultSchema,
  AdvancedMaterialAnalysisPerCourseOptInSchema,
]);
export type AdvancedMaterialAnalysisRequest = z.infer<typeof AdvancedMaterialAnalysisRequestSchema>;

export const AiPolicySiteSchema = z.enum([
  'canvas',
  'gradescope',
  'edstem',
  'myuw',
  'myplan',
  'time-schedule',
  'course-sites',
]);
export type AiPolicySite = z.infer<typeof AiPolicySiteSchema>;

export const AiSitePolicyOverlaySchema = z
  .object({
    site: AiPolicySiteSchema,
    siteLabel: z.string().trim().min(1),
    allowedFamilies: z.array(z.string().trim().min(1)).min(1),
    exportOnlyFamilies: z.array(z.string().trim().min(1)),
    forbiddenAiObjects: z.array(z.string().trim().min(1)).min(1),
    carrierHonesty: z.string().trim().min(1),
    operatorNote: z.string().trim().min(1),
  })
  .strict();
export type AiSitePolicyOverlay = z.infer<typeof AiSitePolicyOverlaySchema>;

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
      'Treat MyUW as a read-only student status carrier; current notices can inform the desk, but DARS/transcript/finaid/profile/tuition detail still need explicit future lanes and stronger human confirmation.',
    operatorNote:
      'MyUW answers should separate current notices from high-sensitivity records and prefer export-first handoff when an administrative detail lane is not yet landed.',
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
      'MyPlan answers should stay planning-oriented, keep requirement uncertainty visible, and prefer export-first review while the current lane remains a review-first summary lane rather than a detail/runtime lane.',
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
      'Course-site answers should stay within the current scope-limited runtime lane, preserve possible-match uncertainty, and prefer export-first review for syllabus, policy, and exam material.',
  },
};

const DEFAULT_ADVANCED_MATERIAL_ANALYSIS: AdvancedMaterialAnalysisDefault = {
  enabled: false,
  policy: 'default_disabled',
};

export const AcademicRedZoneUiGuardSchema = z
  .object({
    surface: AcademicRedZoneSurfaceSchema,
    surfaceLabel: z.string().trim().min(1),
    title: z.literal('Not supported in the current product path'),
    reason: z.literal('This surface crosses the current read-only academic safety boundary.'),
    actionLabel: z.literal('Registration automation stays off'),
    manualOnlyNote: z.literal('Open the original site if you need to continue manually.'),
    docsLabel: z.literal('Academic Safety Contract'),
    docsPath: z.literal('/docs/07-security-privacy-compliance.md'),
    manualUrl: z.string().url().optional(),
    ctaDisabled: z.literal(true),
    manualPathOnly: z.literal(true),
  })
  .strict();
export type AcademicRedZoneUiGuard = z.infer<typeof AcademicRedZoneUiGuardSchema>;

export const AcademicAiCallerGuardrailsSchema = z
  .object({
    redZone: z
      .object({
        primaryHardStop: AcademicRedZoneUiGuardSchema,
        summary: z.literal(
          'Register.UW, Notify.UW, seat watching, and registration-related polling stay outside the current product path.',
        ),
        badge: z.literal('manual_only'),
      })
      .strict(),
    advancedMaterial: AdvancedMaterialAnalysisGuardSchema,
  })
  .strict();
export type AcademicAiCallerGuardrails = z.infer<typeof AcademicAiCallerGuardrailsSchema>;

export const ToolNameSchema = z.enum([
  'get_today_snapshot',
  'get_recent_updates',
  'get_priority_alerts',
  'export_current_view',
  'get_planning_substrates',
  'get_opted_in_course_material_excerpt',
]);
export type ToolName = z.infer<typeof ToolNameSchema>;

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string().min(1),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ToolResultSchema = z.object({
  name: ToolNameSchema,
  payload: z.unknown(),
});
export type ToolResult = z.infer<typeof ToolResultSchema>;

export const AiCitationSchema = z
  .object({
    entityId: z.string().trim().min(1),
    kind: z.string().trim().min(1),
    site: z.string().trim().min(1),
    title: z.string().trim().min(1),
    url: z.string().trim().min(1).optional(),
  })
  .strict();
export type AiCitation = z.infer<typeof AiCitationSchema>;

export const AiStructuredAnswerSchema = z
  .object({
    summary: z.string().trim().min(1),
    bullets: z.array(z.string().trim().min(1)),
    nextActions: z.array(z.string().trim().min(1)).default([]),
    trustGaps: z.array(z.string().trim().min(1)).default([]),
    citations: z.array(AiCitationSchema),
  })
  .strict();
export type AiStructuredAnswer = z.infer<typeof AiStructuredAnswerSchema>;
export const AiCitationCoverageSchema = z.enum(['structured_citations', 'uncited_fallback', 'no_answer']);
export type AiCitationCoverage = z.infer<typeof AiCitationCoverageSchema>;

export const HealthPayloadSchema = z
  .object({
    ok: z.literal(true),
    service: z.literal('campus-copilot-bff'),
    mode: z.literal('thin-bff'),
    requestId: z.string().optional(),
  })
  .strict();
export type HealthPayload = z.infer<typeof HealthPayloadSchema>;

export const ProviderReadinessSchema = z
  .object({
    ready: z.boolean(),
    reason: z.string().min(1),
  })
  .strict();
export type ProviderReadiness = z.infer<typeof ProviderReadinessSchema>;

export const ProviderStatusPayloadSchema = z
  .object({
    ok: z.literal(true),
    providers: z.object({
      openai: ProviderReadinessSchema,
      gemini: ProviderReadinessSchema,
      switchyard: ProviderReadinessSchema,
    }),
    requestId: z.string().optional(),
  })
  .strict();
export type ProviderStatusPayload = z.infer<typeof ProviderStatusPayloadSchema>;

export const AiRuntimeRequestSchema = z.object({
  provider: ProviderIdSchema,
  model: z.string().min(1),
  question: z.string().min(1),
  switchyardProvider: SwitchyardRuntimeProviderSchema.optional(),
  switchyardLane: SwitchyardLaneSchema.optional(),
  advancedMaterialAnalysis: AdvancedMaterialAnalysisRequestSchema.default(DEFAULT_ADVANCED_MATERIAL_ANALYSIS),
  sitePolicyOverlay: AiSitePolicyOverlaySchema.optional(),
  toolResults: z.array(ToolResultSchema).default([]),
});
export type AiRuntimeRequest = z.infer<typeof AiRuntimeRequestSchema>;

export const CampusAiAskRequestSchema = z
  .object({
    provider: z.enum(['openai', 'gemini']).default('gemini'),
    model: z.string().min(1),
    messages: z.array(ChatMessageSchema).min(1),
    runtimeMode: AiRuntimeModeSchema.default('switchyard_first'),
    switchyardProvider: SwitchyardRuntimeProviderSchema.optional(),
    lane: SwitchyardLaneSchema.optional(),
    advancedMaterialAnalysis: AdvancedMaterialAnalysisRequestSchema.default(DEFAULT_ADVANCED_MATERIAL_ANALYSIS),
  })
  .strict();
export type CampusAiAskRequest = z.infer<typeof CampusAiAskRequestSchema>;

export const CampusAiAskResponseSchema = z
  .object({
    ok: z.boolean(),
    provider: ProviderIdSchema,
    runtimePath: AiRuntimePathSchema,
    runtimeProvider: SwitchyardRuntimeProviderSchema.optional(),
    lane: SwitchyardLaneSchema.optional(),
    forwardedStatus: z.number().int().optional(),
    answerText: z.string().optional(),
    structuredAnswer: AiStructuredAnswerSchema.optional(),
    citationCoverage: AiCitationCoverageSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    requestId: z.string().optional(),
  })
  .strict();
export type CampusAiAskResponse = z.infer<typeof CampusAiAskResponseSchema>;

export interface ToolDefinition {
  name: ToolName;
  description: string;
}

export interface AiRuntimeMessages {
  systemPrompt: string;
  userPrompt: string;
}

export function getAiSitePolicyOverlay(site?: string | null): AiSitePolicyOverlay | undefined {
  if (!site) {
    return undefined;
  }

  return AI_SITE_POLICY_OVERLAYS[site as AiPolicySite];
}

export interface ProviderProxyRequest {
  route: '/api/providers/openai/chat' | '/api/providers/gemini/chat' | '/api/providers/switchyard/chat';
  body:
    | {
        provider: 'openai' | 'gemini';
        model: string;
        messages: ChatMessage[];
      }
    | {
        provider: SwitchyardRuntimeProvider;
        model: string;
        messages: ChatMessage[];
        lane?: SwitchyardLane;
      };
}

export interface ResolvedAiAnswer {
  answerText?: string;
  structuredAnswer?: AiStructuredAnswer;
  citationCoverage: AiCitationCoverage;
}

export interface AiMaterialBoundaryVerdict {
  allowed: boolean;
  matchedInputs: string[];
  denialReason?: string;
}

const ACADEMIC_RED_ZONE_HARD_STOP_COPY = {
  title: 'Not supported in the current product path',
  reason: 'This surface crosses the current read-only academic safety boundary.',
  actionLabel: 'Registration automation stays off',
  manualOnlyNote: 'Open the original site if you need to continue manually.',
  docsLabel: 'Academic Safety Contract',
} as const;

const ACADEMIC_RED_ZONE_DOC_PATH = '/docs/07-security-privacy-compliance.md' as const;

const ACADEMIC_RED_ZONE_SURFACE_LABELS: Record<AcademicRedZoneSurface, string> = {
  'register-uw': 'Register.UW',
  'notify-uw': 'Notify.UW',
  'registration-related-resources': 'Registration-related resources',
  'seat-watcher-waitlist-polling': 'Seat watcher / waitlist polling',
  'add-drop-submission': 'Add/drop submission',
  'seat-swap-hold-seat': 'Seat swap / hold-seat helpers',
  'registration-query-loop': 'Registration-related query loop',
};

const ACADEMIC_AI_CALLER_RED_ZONE_SUMMARY =
  'Register.UW, Notify.UW, seat watching, and registration-related polling stay outside the current product path.';

const ADVANCED_MATERIAL_ANALYSIS_GUARD = {
  status: 'default_disabled',
  enabled: false,
  toggleLabel: 'Advanced material analysis',
  note: 'Default off. Raw course files, lecture slides, instructor-authored notes, exams, quizzes, assignment PDFs, and solution documents stay outside the default AI path.',
  requirements: [
    'explicit per-course opt-in',
    'separate UX',
    'separate review',
    'user-responsibility language',
  ],
} as const;

const MATERIAL_REQUEST_PATTERNS = [
  { label: 'raw course files', pattern: /\b(raw\s+)?course files?\b/i },
  { label: 'lecture slides', pattern: /\blecture slides?\b|课件|幻灯片/iu },
  { label: 'instructor-authored notes', pattern: /\binstructor-authored notes?\b|老师(?:笔记|讲义)|教师(?:笔记|讲义)/iu },
  { label: 'assignment PDFs', pattern: /\bassignment pdfs?\b|作业\s*pdf/iu },
  { label: 'solution documents', pattern: /\bsolution documents?\b|\bsolution pdfs?\b|题解|答案文档/iu },
  { label: 'exam files', pattern: /\bexam (pdfs?|files?)\b|试卷(?:文件|pdf)?/iu },
  { label: 'quiz files', pattern: /\bquiz (pdfs?|files?)\b|测验(?:文件|pdf)?/iu },
] as const;

const ADVANCED_MATERIAL_ANALYSIS_DISABLED_MESSAGE =
  'Advanced material analysis is not supported in the current product path.';

function extractCodeFenceBody(raw: string) {
  const openingFenceIndex = raw.indexOf('```');
  if (openingFenceIndex < 0) {
    return undefined;
  }

  const afterOpeningFence = raw.slice(openingFenceIndex + 3);
  const closingFenceIndex = afterOpeningFence.indexOf('```');
  if (closingFenceIndex < 0) {
    return undefined;
  }

  let body = afterOpeningFence.slice(0, closingFenceIndex);
  const trimmedLeading = body.trimStart();
  if (trimmedLeading.toLowerCase().startsWith('json')) {
    body = trimmedLeading.slice(4);
  }

  return body.trim();
}

function extractFirstJsonObject(raw: string) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (start === -1) {
      if (char === '{') {
        start = index;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, index + 1);
      }
    }
  }

  return undefined;
}

function parseStructuredAnswerCandidate(candidate: string | undefined) {
  if (!candidate) {
    return undefined;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

export function parseAiStructuredAnswer(raw: string): AiStructuredAnswer | undefined {
  const directValue = parseStructuredAnswerCandidate(raw);
  const fencedBody = extractCodeFenceBody(raw);
  const fencedValue = parseStructuredAnswerCandidate(fencedBody);
  const extractedValue =
    parseStructuredAnswerCandidate(extractFirstJsonObject(raw)) ??
    parseStructuredAnswerCandidate(extractFirstJsonObject(fencedBody ?? ''));

  for (const value of [directValue, fencedValue, extractedValue]) {
    const result = AiStructuredAnswerSchema.safeParse(value);
    if (result.success) {
      return result.data;
    }
  }

  return undefined;
}

export function resolveAiAnswer(input: {
  answerText?: string;
  structuredAnswer?: unknown;
  citationCoverage?: unknown;
}): ResolvedAiAnswer {
  const answerText = typeof input.answerText === 'string' && input.answerText.trim() ? input.answerText : undefined;
  const explicitStructured = AiStructuredAnswerSchema.safeParse(input.structuredAnswer);
  const structuredAnswer = explicitStructured.success
    ? explicitStructured.data
    : answerText
      ? parseAiStructuredAnswer(answerText)
      : undefined;
  const explicitCoverage = AiCitationCoverageSchema.safeParse(input.citationCoverage);

  return {
    answerText,
    structuredAnswer,
    citationCoverage: explicitCoverage.success
      ? explicitCoverage.data
      : structuredAnswer
        ? 'structured_citations'
        : answerText
          ? 'uncited_fallback'
          : 'no_answer',
  };
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_today_snapshot',
    description: 'Return the latest structured today snapshot from the local-first workbench.',
  },
  {
    name: 'get_recent_updates',
    description: 'Return recent timeline-like updates from structured storage, not raw web pages.',
  },
  {
    name: 'get_priority_alerts',
    description: 'Return the current derived alerts that explain what needs attention first.',
  },
  {
    name: 'export_current_view',
    description: 'Return an export artifact for the current structured workbench view.',
  },
  {
    name: 'get_planning_substrates',
    description: 'Return planning-only substrates and their current coverage posture from the shared workbench.',
  },
  {
    name: 'get_opted_in_course_material_excerpt',
    description: 'Return the one explicitly opted-in course-material excerpt, if the user enabled that narrow lane.',
  },
];

export function getToolDefinitions() {
  return [...TOOL_DEFINITIONS];
}

export function getAcademicRedZoneHardStop(surface: AcademicRedZoneSurface): AcademicRedZoneHardStop {
  return AcademicRedZoneHardStopSchema.parse({
    surface,
    ...ACADEMIC_RED_ZONE_HARD_STOP_COPY,
  });
}

export function getAcademicRedZoneHardStops(
  surfaces: readonly AcademicRedZoneSurface[],
): AcademicRedZoneHardStop[] {
  return z.array(AcademicRedZoneSurfaceSchema).parse(surfaces).map((surface) => getAcademicRedZoneHardStop(surface));
}

export function getAdvancedMaterialAnalysisGuard(): AdvancedMaterialAnalysisGuard {
  return AdvancedMaterialAnalysisGuardSchema.parse(ADVANCED_MATERIAL_ANALYSIS_GUARD);
}

export function getAcademicRedZoneUiGuard(surface: AcademicRedZoneSurface): AcademicRedZoneUiGuard {
  const sharedGuard = getAcademicRedZoneHardStop(surface);
  return AcademicRedZoneUiGuardSchema.parse({
    ...sharedGuard,
    surfaceLabel: ACADEMIC_RED_ZONE_SURFACE_LABELS[surface],
    docsPath: ACADEMIC_RED_ZONE_DOC_PATH,
    ctaDisabled: true,
    manualPathOnly: true,
  });
}

export function getAcademicRedZoneUiGuards(
  surfaces: readonly AcademicRedZoneSurface[],
): AcademicRedZoneUiGuard[] {
  return z.array(AcademicRedZoneSurfaceSchema).parse(surfaces).map((surface) => getAcademicRedZoneUiGuard(surface));
}

export function getAcademicAiCallerGuardrails(): AcademicAiCallerGuardrails {
  return AcademicAiCallerGuardrailsSchema.parse({
    redZone: {
      primaryHardStop: getAcademicRedZoneUiGuard('register-uw'),
      summary: ACADEMIC_AI_CALLER_RED_ZONE_SUMMARY,
      badge: 'manual_only',
    },
    advancedMaterial: getAdvancedMaterialAnalysisGuard(),
  });
}

export function getAiMaterialBoundaryVerdict(
  question: string,
  advancedMaterialAnalysis: AdvancedMaterialAnalysisRequest = DEFAULT_ADVANCED_MATERIAL_ANALYSIS,
): AiMaterialBoundaryVerdict {
  const matchedInputs = MATERIAL_REQUEST_PATTERNS.filter(({ pattern }) => pattern.test(question)).map(
    ({ label }) => label,
  );

  if (matchedInputs.length === 0) {
    return {
      allowed: true,
      matchedInputs: [],
    };
  }

  const uniqueInputs = Array.from(new Set(matchedInputs));

  if (advancedMaterialAnalysis.enabled) {
    return {
      allowed: true,
      matchedInputs: uniqueInputs,
    };
  }

  return {
    allowed: false,
    matchedInputs: uniqueInputs,
    denialReason: `${ADVANCED_MATERIAL_ANALYSIS_DISABLED_MESSAGE} Matched raw-material request categories: ${uniqueInputs.join(', ')}.`,
  };
}

export function assertAiQuestionWithinAcademicBoundary(
  question: string,
  advancedMaterialAnalysis: AdvancedMaterialAnalysisRequest = DEFAULT_ADVANCED_MATERIAL_ANALYSIS,
) {
  const verdict = getAiMaterialBoundaryVerdict(question, advancedMaterialAnalysis);
  if (verdict.allowed) {
    return;
  }

  throw new Error(verdict.denialReason);
}

export function buildAiRuntimeMessages(input: z.input<typeof AiRuntimeRequestSchema>): AiRuntimeMessages {
  const request = AiRuntimeRequestSchema.parse(input);
  assertAiQuestionWithinAcademicBoundary(request.question, request.advancedMaterialAnalysis);
  const toolSummary =
    request.toolResults.length === 0
      ? 'No tool results have been provided yet.'
      : request.toolResults.map((result) => `- ${result.name}: ${JSON.stringify(result.payload)}`).join('\n');
  const advancedMaterialPromptLines = request.advancedMaterialAnalysis.enabled
    ? [
        `The user explicitly opted in to advanced material analysis for the course "${request.advancedMaterialAnalysis.courseLabel}".`,
        'Use only the supplied user-pasted excerpt for that one course; do not infer, fetch, upload, or request any additional raw course files, URLs, or hidden page content.',
        "Keep the answer scoped to what the excerpt says and make any uncertainty explicit in 'trustGaps'.",
      ]
    : [
      'Never request or consume raw course files, lecture slides, instructor-authored notes, exams, quizzes, assignment PDFs, solution documents, or copyright-sensitive or sharing-unclear course materials.',
      'Advanced material analysis stays default-disabled; do not promote raw course-material analysis unless a future per-course opt-in contract explicitly enables it.',
      ];
  const sitePolicyPromptLines = request.sitePolicyOverlay
    ? [
        `Current site policy overlay: ${request.sitePolicyOverlay.siteLabel}.`,
        `Allowed structured families: ${request.sitePolicyOverlay.allowedFamilies.join(', ')}.`,
        `Export-only but not default AI families: ${request.sitePolicyOverlay.exportOnlyFamilies.join(', ') || 'none'}.`,
        `Forbidden AI objects: ${request.sitePolicyOverlay.forbiddenAiObjects.join(', ')}.`,
        request.sitePolicyOverlay.carrierHonesty,
        request.sitePolicyOverlay.operatorNote,
      ]
    : [];

  return {
    systemPrompt: [
      'You are Campus Copilot AI.',
      'You operate strictly after structure: use only unified schema, read-model, and export results.',
      'Never request raw DOM, raw HTML, cookies, or site-specific payloads.',
      ...advancedMaterialPromptLines,
      ...sitePolicyPromptLines,
      'Return a JSON object with keys "summary", "bullets", "nextActions", "trustGaps", and "citations".',
      'Use "nextActions" for concrete operator next steps and "trustGaps" for uncertainty, blockers, or evidence gaps. Use empty arrays when there is nothing to list.',
      'Each citation must include "entityId", "kind", "site", "title", and optional "url".',
      'Do not expose raw provider metadata or raw tool payloads in the answer.',
      'When information is missing, say so clearly instead of inventing facts.',
    ].join(' '),
    userPrompt: [`Question: ${request.question}`, 'Structured tool results:', toolSummary].join('\n'),
  };
}

export function createProviderProxyRequest(input: {
  provider: ProviderId;
  model: string;
  messages: ChatMessage[];
  switchyardProvider?: SwitchyardRuntimeProvider;
  switchyardLane?: SwitchyardLane;
}): ProviderProxyRequest {
  const messages = z.array(ChatMessageSchema).parse(input.messages);

  if (input.provider === 'switchyard') {
    return {
      route: '/api/providers/switchyard/chat',
      body: {
        provider: input.switchyardProvider ?? 'chatgpt',
        model: input.model,
        messages,
        lane: input.switchyardLane ?? 'web',
      },
    };
  }

  return {
    route: input.provider === 'openai' ? '/api/providers/openai/chat' : '/api/providers/gemini/chat',
    body: {
      provider: input.provider,
      model: input.model,
      messages,
    },
  };
}
