export const MYPLAN_PROVED_FIELDS = [
  'carrier.authenticated_bootstrap',
  'carrier.authenticated_session_snapshot_candidate',
  'plan.label',
  'plan.lastUpdatedAt',
  'term.termCode',
  'term.termLabel',
  'term.planStatus',
  'term.plannedCourses',
  'term.backupCourses',
  'term.scheduleOptions',
  'degreeProgress.summary',
  'degreeProgress.percentComplete',
  'degreeProgress.creditsEarned',
  'degreeProgress.creditsPlanned',
  'degreeProgress.creditsRequired',
  'requirementGroups.summary',
  'programExplorationResults.summary',
] as const;

export const MYPLAN_CONTINUATION_PROVED_FIELDS = [
  'carrier.authenticated_bootstrap',
  'carrier.authenticated_session_snapshot_candidate',
  'carrier.capturedFrom',
  'plan.label',
  'plan.lastUpdatedAt',
  'term.termCode',
  'term.termLabel',
  'term.planStatus',
  'term.plannedCourses',
  'term.backupCourses',
  'term.scheduleOptions',
  'degreeProgress.summary',
  'degreeProgress.percentComplete',
  'degreeProgress.creditsEarned',
  'degreeProgress.creditsPlanned',
  'degreeProgress.creditsRequired',
  'requirementGroups.summary',
  'programExplorationResults.summary',
  'transferPlanningSummary',
] as const;

export const MYPLAN_BOUNDARY_CLASS = 'institution_recognized_session_backed_surface' as const;
export const MYPLAN_PUBLIC_CLAIM = 'planned_readonly_expansion' as const;

export const MYPLAN_DEFERRED_FIELDS = [
  'registrationHandoff',
  'adviserShare',
  'collaborationActions',
  'writeBackControls',
  'rawAuditBlocks',
] as const;

export const MYPLAN_COMPARISON_DEFERRED_FIELDS = [
  'registrationHandoff',
  'adviserShare',
  'collaborationActions',
  'writeBackControls',
  'rawAuditBlocks',
  'plannedCourses.registerHref',
  'plannedCourses.shoppingCartToken',
  'backupOptions.sendToRegistration',
  'degreeProgress.sendPlannedCoursesUrl',
  'adviserSharing.sharePlanUrl',
  'collaboration.inviteUrl',
] as const;

export const MYPLAN_FORBIDDEN_KEYS = [
  'registrationHandoff',
  'adviserShare',
  'adviserSharing',
  'collaboration',
  'writeBackControls',
  'sendToRegistration',
  'registrationUrl',
  'registerHref',
  'shoppingCartToken',
  'sharePlanUrl',
  'inviteUrl',
  'targetUrl',
] as const;

export type MyPlanCourseStatus = 'planned' | 'backup';
export type MyPlanCarrierKind = 'authenticated_html_bootstrap' | 'authenticated_session_snapshot_candidate';
export type MyPlanPrototypeProofStatus =
  | 'redacted_fixture_prototype'
  | 'redacted_fixture_evidence'
  | 'redacted_fixture_comparison_candidate';
export type MyPlanPlanStatus = 'draft' | 'saved' | 'submitted';

export interface MyPlanCourseRef {
  courseId: string;
  courseCode: string;
  title: string;
  credits?: number;
  note?: string;
  status: MyPlanCourseStatus;
}

export interface MyPlanScheduleOption {
  optionId: string;
  label: string;
  plannedCourseIds: string[];
  summary?: string;
}

export interface MyPlanTermPlan {
  termCode: string;
  termLabel: string;
  planStatus?: MyPlanPlanStatus;
  plannedCourses: MyPlanCourseRef[];
  backupCourses: MyPlanCourseRef[];
  scheduleOptions: MyPlanScheduleOption[];
}

export interface MyPlanDegreeProgress {
  summary: string;
  completedCredits: number;
  remainingCredits: number;
  percentComplete?: number;
  creditsEarned?: number;
  creditsPlanned?: number;
  creditsRequired?: number;
}

export interface MyPlanRequirementGroupSummary {
  requirementId: string;
  label: string;
  status: 'complete' | 'in_progress' | 'not_started';
  summary?: string;
  completedCount?: number;
  totalCount?: number;
  remainingCredits?: number;
}

export interface MyPlanProgramExplorationResult {
  programId: string;
  label: string;
  kind: 'major' | 'minor' | 'option' | 'transfer_path';
  summary?: string;
}

export interface MyPlanCarrierProof {
  authBoundary: 'authenticated';
  posture: 'read_only';
  carrierKind: MyPlanCarrierKind;
  proofStatus: MyPlanPrototypeProofStatus;
  shellTitle: string;
  capturedFrom?: string;
}

export interface MyPlanPrototypeMetadata {
  contractRole: 'planning_substrate_candidate';
  canonicalEntitySink: false;
  readOnly: true;
  authenticated: true;
  termCount: number;
  plannedCourseCount: number;
  backupCourseCount: number;
  scheduleOptionCount: number;
  requirementGroupCount: number;
  programExplorationCount: number;
}

export interface MyPlanPrototypeProvenance {
  sourceKind: 'redacted_html_shell' | 'redacted_json_bootstrap' | 'redacted_authenticated_session_snapshot';
  boundaryClass: typeof MYPLAN_BOUNDARY_CLASS;
  publicClaim: typeof MYPLAN_PUBLIC_CLAIM;
  redacted: true;
  capturedAt: string;
  capturedFrom?: string;
}

export interface MyPlanCarrierComparisonPacket {
  surface: 'myplan';
  fit: 'derived_planning_substrate';
  comparedAt: string;
  carrierPosture: 'comparison_only_candidate_evidence';
  comparedCarriers: MyPlanCarrierKind[];
  stableSignals: string[];
  bootstrapOnlySignals: string[];
  sessionSnapshotOnlySignals: string[];
  continuationProvedFields: Array<(typeof MYPLAN_CONTINUATION_PROVED_FIELDS)[number]>;
  deferredSignalsConfirmed: Array<(typeof MYPLAN_COMPARISON_DEFERRED_FIELDS)[number]>;
  planningLayerCandidateSignals: string[];
  weeklyLoadCandidateSignals: string[];
  promotionEntryCriteria: string[];
  sharedPromotionBlockers: string[];
}

export interface MyPlanPrototypeSnapshot {
  surface: 'myplan';
  fit: 'derived_planning_substrate';
  capturedAt: string;
  carrier: MyPlanCarrierProof;
  planId: string;
  planLabel: string;
  lastUpdatedAt?: string;
  terms: MyPlanTermPlan[];
  degreeProgress: MyPlanDegreeProgress;
  requirementGroups: MyPlanRequirementGroupSummary[];
  transferPlanningSummary?: string;
  programExplorationResults: MyPlanProgramExplorationResult[];
  metadata: MyPlanPrototypeMetadata;
  provenance: MyPlanPrototypeProvenance;
  provedFields: Array<(typeof MYPLAN_CONTINUATION_PROVED_FIELDS)[number]>;
  deferredFields: Array<(typeof MYPLAN_DEFERRED_FIELDS)[number]>;
}

interface RawMyPlanCourse {
  id: string | number;
  code: string;
  title: string;
  credits?: number;
  note?: string;
}

interface RawMyPlanScheduleOption {
  id: string | number;
  label: string;
  plannedCourseIds: Array<string | number>;
  summary?: string;
}

interface RawMyPlanTerm {
  termCode: string;
  termLabel: string;
  planStatus?: MyPlanPlanStatus;
  plannedCourses: RawMyPlanCourse[];
  backupCourses: RawMyPlanCourse[];
  scheduleOptions: RawMyPlanScheduleOption[];
}

interface RawMyPlanDegreeProgress {
  summary: string;
  completedCredits: number;
  remainingCredits: number;
  percentComplete?: number;
  creditsEarned?: number;
  creditsPlanned?: number;
  creditsRequired?: number;
}

interface RawMyPlanRequirementGroup {
  id: string | number;
  label: string;
  status: MyPlanRequirementGroupSummary['status'];
  summary?: string;
  completedCount?: number;
  totalCount?: number;
  remainingCredits?: number;
}

interface RawMyPlanProgramExplorationResult {
  id: string | number;
  label: string;
  kind: MyPlanProgramExplorationResult['kind'];
  summary?: string;
}

interface RawMyPlanBootstrap {
  authentication: {
    state: 'authenticated';
    sessionKind: 'netid' | 'institution_sso';
  };
  carrier: {
    kind: 'authenticated_html_bootstrap';
    shellTitle: string;
    capturedFrom?: string;
  };
  plan: {
    id: string | number;
    label: string;
    lastUpdatedAt?: string;
    terms: RawMyPlanTerm[];
    degreeProgress: RawMyPlanDegreeProgress;
    requirementGroups: RawMyPlanRequirementGroup[];
    transferPlanningSummary?: string;
    programExplorationResults: RawMyPlanProgramExplorationResult[];
    [key: string]: unknown;
  };
}

interface RawMyPlanPlanningSnapshotCourse {
  courseRef: string;
  label: string;
  credits?: number;
  note?: string;
  reason?: string;
}

interface RawMyPlanPlanningSnapshotScheduleOption {
  optionId: string;
  summary: string;
  courseRefs: string[];
}

interface RawMyPlanPlanningSnapshotRequirement {
  requirementId: string;
  title: string;
  status: 'complete' | 'in_progress' | 'planned';
  summary: string;
  completedCredits?: number;
  remainingCredits?: number;
}

interface RawMyPlanPlanningSnapshotProgramResult {
  programId: string;
  label: string;
  kind?: MyPlanProgramExplorationResult['kind'];
  summary?: string;
  matchSummary?: string;
}

interface RawMyPlanPlanningSnapshot {
  auth: {
    state: 'authenticated';
    surface: 'myplan';
    carrier: 'authenticated_session_snapshot_candidate';
    redacted: true;
    capturedFrom?: string;
  };
  planTerms: RawMyPlanTerm[];
  degreeProgress: RawMyPlanDegreeProgress;
  requirementSummaries: RawMyPlanPlanningSnapshotRequirement[];
  transferPlanningSummary?: string;
  programExplorationResults: RawMyPlanPlanningSnapshotProgramResult[];
  sanitizedEvidence?: {
    excludedRiskFields?: Array<(typeof MYPLAN_COMPARISON_DEFERRED_FIELDS)[number]>;
  };
  [key: string]: unknown;
}

export interface BuildMyPlanPrototypeInput {
  capturedAt: string;
  bootstrap?: unknown;
  pageHtml?: string;
  sessionSnapshot?: unknown;
}

const ISO_DATE_TIME_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function readString(record: Record<string, unknown>, key: string, message: string) {
  const value = record[key];
  assert(typeof value === 'string' && value.trim().length > 0, message);
  return value;
}

function readOptionalString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (value == null) {
    return undefined;
  }
  assert(typeof value === 'string' && value.trim().length > 0, `${key} must be a non-empty string.`);
  return value;
}

function readOptionalStringWithFallback(record: Record<string, unknown>, primaryKey: string, fallbackKey: string) {
  return readOptionalString(record, primaryKey) ?? readOptionalString(record, fallbackKey);
}

function readNumber(record: Record<string, unknown>, key: string, message: string) {
  const value = record[key];
  assert(typeof value === 'number' && Number.isFinite(value) && value >= 0, message);
  return value;
}

function readOptionalNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (value == null) {
    return undefined;
  }
  assert(typeof value === 'number' && Number.isFinite(value) && value >= 0, `${key} must be a non-negative number.`);
  return value;
}

function readBoolean(record: Record<string, unknown>, key: string, message: string) {
  const value = record[key];
  assert(typeof value === 'boolean', message);
  return value;
}

function readStringOrNumber(record: Record<string, unknown>, key: string, message: string) {
  const value = record[key];
  assert(typeof value === 'string' || typeof value === 'number', message);
  return value;
}

function readArray(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (value == null) {
    return [];
  }
  assert(Array.isArray(value), `${key} must be an array.`);
  return value;
}

function assertIsoDateTime(value: string, label: string) {
  assert(ISO_DATE_TIME_WITH_OFFSET.test(value), `${label} must be an ISO datetime with offset.`);
  return value;
}

function isHtmlTagNameStart(char: string | undefined) {
  if (!char) {
    return false;
  }

  const code = char.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isHtmlTagBoundary(char: string | undefined) {
  return char == null || char === ' ' || char === '\n' || char === '\r' || char === '\t' || char === '>';
}

function findHtmlTagEnd(source: string, startIndex: number) {
  let quote: '"' | "'" | undefined;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    if (!char) {
      break;
    }

    if (quote) {
      if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '>') {
      return index;
    }
  }

  return -1;
}

function normalizeCourse(rawCourse: RawMyPlanCourse, status: MyPlanCourseStatus): MyPlanCourseRef {
  return {
    courseId: String(rawCourse.id),
    courseCode: rawCourse.code,
    title: rawCourse.title,
    credits: rawCourse.credits,
    note: rawCourse.note,
    status,
  };
}

function normalizeTermPlan(rawTerm: RawMyPlanTerm): MyPlanTermPlan {
  return {
    termCode: rawTerm.termCode,
    termLabel: rawTerm.termLabel,
    planStatus: rawTerm.planStatus,
    plannedCourses: rawTerm.plannedCourses.map((course: RawMyPlanCourse) => normalizeCourse(course, 'planned')),
    backupCourses: rawTerm.backupCourses.map((course: RawMyPlanCourse) => normalizeCourse(course, 'backup')),
    scheduleOptions: rawTerm.scheduleOptions.map((option: RawMyPlanScheduleOption) => ({
      optionId: String(option.id),
      label: option.label,
      plannedCourseIds: option.plannedCourseIds.map((courseId: string | number) => String(courseId)),
      summary: option.summary,
    })),
  };
}

function readHtmlAttribute(openTag: string, attributeName: string) {
  const lowerOpenTag = openTag.toLowerCase();
  const lowerAttributeName = attributeName.toLowerCase();
  let searchIndex = 0;

  while (searchIndex < lowerOpenTag.length) {
    const attributeIndex = lowerOpenTag.indexOf(lowerAttributeName, searchIndex);
    if (attributeIndex < 0) {
      return undefined;
    }

    const previousChar = lowerOpenTag[attributeIndex - 1];
    const nextChar = lowerOpenTag[attributeIndex + lowerAttributeName.length];
    if (
      (attributeIndex === 0 || isHtmlTagBoundary(previousChar)) &&
      (nextChar === '=' || nextChar === ' ' || nextChar === '\n' || nextChar === '\r' || nextChar === '\t')
    ) {
      let valueStart = attributeIndex + lowerAttributeName.length;
      while (
        valueStart < openTag.length &&
        (openTag[valueStart] === ' ' ||
          openTag[valueStart] === '\n' ||
          openTag[valueStart] === '\r' ||
          openTag[valueStart] === '\t')
      ) {
        valueStart += 1;
      }
      if (openTag[valueStart] !== '=') {
        searchIndex = attributeIndex + lowerAttributeName.length;
        continue;
      }
      valueStart += 1;
      while (
        valueStart < openTag.length &&
        (openTag[valueStart] === ' ' ||
          openTag[valueStart] === '\n' ||
          openTag[valueStart] === '\r' ||
          openTag[valueStart] === '\t')
      ) {
        valueStart += 1;
      }

      const firstChar = openTag[valueStart];
      if (!firstChar) {
        return undefined;
      }

      if (firstChar === '"' || firstChar === "'") {
        const valueEnd = openTag.indexOf(firstChar, valueStart + 1);
        return valueEnd < 0 ? undefined : openTag.slice(valueStart + 1, valueEnd);
      }

      let valueEnd = valueStart;
      while (valueEnd < openTag.length && !isHtmlTagBoundary(openTag[valueEnd])) {
        valueEnd += 1;
      }
      return openTag.slice(valueStart, valueEnd);
    }

    searchIndex = attributeIndex + lowerAttributeName.length;
  }

  return undefined;
}

function findFirstHtmlAttributeValue(pageHtml: string, attributeName: string) {
  for (let index = 0; index < pageHtml.length; index += 1) {
    if (pageHtml[index] !== '<' || !isHtmlTagNameStart(pageHtml[index + 1])) {
      continue;
    }

    const tagEnd = findHtmlTagEnd(pageHtml, index + 1);
    if (tagEnd < 0) {
      return undefined;
    }

    const value = readHtmlAttribute(pageHtml.slice(index, tagEnd + 1), attributeName);
    if (value !== undefined) {
      return value;
    }

    index = tagEnd;
  }

  return undefined;
}

function findScriptElementText(pageHtml: string, predicate: (openTag: string) => boolean) {
  const lowerPageHtml = pageHtml.toLowerCase();
  let searchIndex = 0;

  while (searchIndex < pageHtml.length) {
    const openTagStart = lowerPageHtml.indexOf('<script', searchIndex);
    if (openTagStart < 0) {
      return undefined;
    }

    if (!isHtmlTagBoundary(lowerPageHtml[openTagStart + '<script'.length])) {
      searchIndex = openTagStart + 1;
      continue;
    }

    const openTagEnd = findHtmlTagEnd(pageHtml, openTagStart + '<script'.length);
    if (openTagEnd < 0) {
      return undefined;
    }

    const openTag = pageHtml.slice(openTagStart, openTagEnd + 1);
    if (!predicate(openTag)) {
      searchIndex = openTagEnd + 1;
      continue;
    }

    const contentStart = openTagEnd + 1;
    const closeTagIndex = lowerPageHtml.indexOf('</script>', contentStart);
    if (closeTagIndex < 0) {
      return undefined;
    }

    return pageHtml.slice(contentStart, closeTagIndex);
  }

  return undefined;
}

function extractBootstrapFromHtml(pageHtml: string): unknown {
  const authState = findFirstHtmlAttributeValue(pageHtml, 'data-myplan-auth');
  if (authState !== 'authenticated') {
    throw new Error('MyPlan authenticated carrier shell is unavailable.');
  }

  const jsonPayload = findScriptElementText(
    pageHtml,
    (openTag) =>
      readHtmlAttribute(openTag, 'id') === 'myplan-bootstrap' &&
      readHtmlAttribute(openTag, 'type') === 'application/json',
  );
  if (!jsonPayload) {
    throw new Error('MyPlan bootstrap payload is unavailable.');
  }

  try {
    return JSON.parse(jsonPayload);
  } catch {
    throw new Error('MyPlan bootstrap payload is malformed.');
  }
}

function stripForbiddenKeys(rawBootstrap: RawMyPlanBootstrap) {
  const plan: Record<string, unknown> = { ...rawBootstrap.plan };
  for (const key of MYPLAN_FORBIDDEN_KEYS) {
    delete plan[key];
  }
  return plan;
}

function stripForbiddenKeysFromRecord(record: Record<string, unknown>) {
  const normalized = { ...record };
  for (const key of MYPLAN_FORBIDDEN_KEYS) {
    delete normalized[key];
  }
  return normalized;
}

function parseCourse(value: unknown): RawMyPlanCourse {
  assert(isRecord(value), 'MyPlan course must be an object.');
  return {
    id: readStringOrNumber(value, 'id', 'MyPlan course id is required.'),
    code: readString(value, 'code', 'MyPlan course code is required.'),
    title: readString(value, 'title', 'MyPlan course title is required.'),
    credits: readOptionalNumber(value, 'credits'),
    note: readOptionalString(value, 'note'),
  };
}

function parseScheduleOption(value: unknown): RawMyPlanScheduleOption {
  assert(isRecord(value), 'MyPlan schedule option must be an object.');
  return {
    id: readStringOrNumber(value, 'id', 'MyPlan schedule option id is required.'),
    label: readString(value, 'label', 'MyPlan schedule option label is required.'),
    plannedCourseIds: readArray(value, 'plannedCourseIds').map((courseId) => {
      assert(typeof courseId === 'string' || typeof courseId === 'number', 'MyPlan plannedCourseIds must be strings or numbers.');
      return courseId;
    }),
    summary: readOptionalString(value, 'summary'),
  };
}

function parseTerm(value: unknown): RawMyPlanTerm {
  assert(isRecord(value), 'MyPlan term must be an object.');
  const planStatus = readOptionalString(value, 'planStatus');
  if (planStatus != null) {
    assert(
      planStatus === 'draft' || planStatus === 'saved' || planStatus === 'submitted',
      'MyPlan term planStatus is invalid.',
    );
  }
  return {
    termCode: readString(value, 'termCode', 'MyPlan termCode is required.'),
    termLabel: readString(value, 'termLabel', 'MyPlan termLabel is required.'),
    planStatus,
    plannedCourses: readArray(value, 'plannedCourses').map(parseCourse),
    backupCourses: readArray(value, 'backupCourses').map(parseCourse),
    scheduleOptions: readArray(value, 'scheduleOptions').map(parseScheduleOption),
  };
}

function parseDegreeProgress(value: unknown): RawMyPlanDegreeProgress {
  assert(isRecord(value), 'MyPlan degreeProgress must be an object.');
  return {
    summary: readString(value, 'summary', 'MyPlan degree progress summary is required.'),
    completedCredits: readNumber(value, 'completedCredits', 'MyPlan completedCredits is required.'),
    remainingCredits: readNumber(value, 'remainingCredits', 'MyPlan remainingCredits is required.'),
    percentComplete: readOptionalNumber(value, 'percentComplete'),
    creditsEarned: readOptionalNumber(value, 'creditsEarned'),
    creditsPlanned: readOptionalNumber(value, 'creditsPlanned'),
    creditsRequired: readOptionalNumber(value, 'creditsRequired'),
  };
}

function parseRequirementGroup(value: unknown): RawMyPlanRequirementGroup {
  assert(isRecord(value), 'MyPlan requirement group must be an object.');
  const status = readString(value, 'status', 'MyPlan requirement group status is required.');
  assert(
    status === 'complete' || status === 'in_progress' || status === 'not_started',
    'MyPlan requirement group status must be complete, in_progress, or not_started.',
  );

  return {
    id: readStringOrNumber(value, 'id', 'MyPlan requirement group id is required.'),
    label: readString(value, 'label', 'MyPlan requirement group label is required.'),
    status,
    summary: readOptionalString(value, 'summary'),
    completedCount: readOptionalNumber(value, 'completedCount'),
    totalCount: readOptionalNumber(value, 'totalCount'),
    remainingCredits: readOptionalNumber(value, 'remainingCredits'),
  };
}

function parseProgramExploration(value: unknown): RawMyPlanProgramExplorationResult {
  assert(isRecord(value), 'MyPlan program exploration result must be an object.');
  const kind = readString(value, 'kind', 'MyPlan program exploration kind is required.');
  assert(
    kind === 'major' || kind === 'minor' || kind === 'option' || kind === 'transfer_path',
    'MyPlan program exploration kind is invalid.',
  );

  return {
    id: readStringOrNumber(value, 'id', 'MyPlan program exploration id is required.'),
    label: readString(value, 'label', 'MyPlan program exploration label is required.'),
    kind,
    summary: readOptionalString(value, 'summary'),
  };
}

function parsePlanningSnapshotCourse(value: unknown): RawMyPlanCourse {
  assert(isRecord(value), 'MyPlan session snapshot course must be an object.');
  return {
    id: readString(value, 'courseRef', 'MyPlan session snapshot courseRef is required.'),
    code: readString(value, 'courseRef', 'MyPlan session snapshot courseRef is required.'),
    title: readString(value, 'label', 'MyPlan session snapshot label is required.'),
    credits: readOptionalNumber(value, 'credits'),
    note: readOptionalString(value, 'note') ?? readOptionalString(value, 'reason'),
  };
}

function parsePlanningSnapshotScheduleOption(value: unknown): RawMyPlanScheduleOption {
  assert(isRecord(value), 'MyPlan session snapshot schedule option must be an object.');
  const summary = readString(value, 'summary', 'MyPlan session snapshot schedule option summary is required.');
  return {
    id: readString(value, 'optionId', 'MyPlan session snapshot optionId is required.'),
    label: summary,
    plannedCourseIds: readArray(value, 'courseRefs').map((courseRef) => {
      assert(typeof courseRef === 'string', 'MyPlan session snapshot courseRefs must be strings.');
      return courseRef;
    }),
    summary,
  };
}

function parsePlanningSnapshot(value: unknown): RawMyPlanPlanningSnapshot {
  assert(isRecord(value), 'MyPlan session snapshot must be an object.');

  const auth = value.auth;
  assert(isRecord(auth), 'MyPlan session snapshot auth block is required.');
  assert(
    readString(auth, 'state', 'MyPlan session snapshot auth state is required.') === 'authenticated',
    'MyPlan session snapshot must be authenticated.',
  );
  assert(
    readString(auth, 'surface', 'MyPlan session snapshot surface is required.') === 'myplan',
    'MyPlan session snapshot surface must stay myplan.',
  );
  assert(
    readString(auth, 'carrier', 'MyPlan session snapshot carrier is required.') ===
      'authenticated_session_snapshot_candidate',
    'MyPlan session snapshot carrier must stay authenticated_session_snapshot_candidate.',
  );
  assert(readBoolean(auth, 'redacted', 'MyPlan session snapshot redacted flag is required.'), 'MyPlan session snapshot must stay redacted.');
  const capturedFrom = readOptionalString(auth, 'capturedFrom');

  const planTerms = readArray(value, 'planTerms').map((termValue) => {
    assert(isRecord(termValue), 'MyPlan session snapshot term must be an object.');
    const planStatus = readString(termValue, 'planStatus', 'MyPlan session snapshot planStatus is required.');
    assert(
      planStatus === 'draft' || planStatus === 'saved' || planStatus === 'submitted',
      'MyPlan session snapshot planStatus is invalid.',
    );

    return {
      termCode: readString(termValue, 'termId', 'MyPlan session snapshot termId is required.'),
      termLabel: readString(termValue, 'termLabel', 'MyPlan session snapshot termLabel is required.'),
      planStatus,
      plannedCourses: readArray(termValue, 'plannedCourses').map(parsePlanningSnapshotCourse),
      backupCourses: readArray(termValue, 'backupOptions').map(parsePlanningSnapshotCourse),
      scheduleOptions: readArray(termValue, 'scheduleOptions').map(parsePlanningSnapshotScheduleOption),
    } satisfies RawMyPlanTerm;
  });
  assert(planTerms.length > 0, 'MyPlan session snapshot must include at least one plan term.');

  const degreeProgressValue = value.degreeProgress;
  assert(isRecord(degreeProgressValue), 'MyPlan session snapshot degreeProgress is required.');
  const creditsRequired = readNumber(degreeProgressValue, 'creditsRequired', 'MyPlan session snapshot creditsRequired is required.');
  const creditsEarned = readNumber(degreeProgressValue, 'creditsEarned', 'MyPlan session snapshot creditsEarned is required.');
  const creditsPlanned = readNumber(degreeProgressValue, 'creditsPlanned', 'MyPlan session snapshot creditsPlanned is required.');
  const degreeProgress: RawMyPlanDegreeProgress = {
    summary: readString(degreeProgressValue, 'summary', 'MyPlan session snapshot degree progress summary is required.'),
    percentComplete: readNumber(degreeProgressValue, 'percentComplete', 'MyPlan session snapshot percentComplete is required.'),
    creditsEarned,
    creditsPlanned,
    creditsRequired,
    completedCredits: creditsEarned + creditsPlanned,
    remainingCredits: Math.max(creditsRequired - (creditsEarned + creditsPlanned), 0),
  };

  const requirementGroups = readArray(value, 'requirementSummaries').map((requirementValue) => {
    assert(isRecord(requirementValue), 'MyPlan session snapshot requirement summary must be an object.');
    const status = readString(requirementValue, 'status', 'MyPlan session snapshot requirement status is required.');
    const normalizedStatus =
      status === 'planned'
        ? 'in_progress'
        : status === 'complete' || status === 'in_progress' || status === 'not_started'
          ? status
          : undefined;
    assert(normalizedStatus, 'MyPlan session snapshot requirement status is invalid.');

    return {
      id: readString(requirementValue, 'requirementId', 'MyPlan session snapshot requirementId is required.'),
      label: readString(requirementValue, 'title', 'MyPlan session snapshot requirement title is required.'),
      status: normalizedStatus,
      summary: readString(requirementValue, 'summary', 'MyPlan session snapshot requirement summary is required.'),
      remainingCredits: readOptionalNumber(requirementValue, 'remainingCredits'),
    } satisfies RawMyPlanRequirementGroup;
  });
  assert(requirementGroups.length > 0, 'MyPlan session snapshot must include at least one requirement summary.');

  const programExplorationResults = readArray(value, 'programExplorationResults').map((programValue) => {
    assert(isRecord(programValue), 'MyPlan session snapshot program result must be an object.');
    const programKind = readOptionalString(programValue, 'kind');
    if (programKind != null) {
      assert(
        programKind === 'major' || programKind === 'minor' || programKind === 'option' || programKind === 'transfer_path',
        'MyPlan session snapshot program kind is invalid.',
      );
    }
    const normalizedProgramKind: MyPlanProgramExplorationResult['kind'] =
      programKind == null ? 'major' : programKind;
    return {
      id: readString(programValue, 'programId', 'MyPlan session snapshot programId is required.'),
      label: readString(programValue, 'label', 'MyPlan session snapshot program label is required.'),
      kind: normalizedProgramKind,
      summary: readOptionalStringWithFallback(programValue, 'summary', 'matchSummary'),
    } satisfies RawMyPlanProgramExplorationResult;
  });

  return {
    auth: {
      state: 'authenticated',
      surface: 'myplan',
      carrier: 'authenticated_session_snapshot_candidate',
      redacted: true,
      capturedFrom,
    },
    planTerms,
    degreeProgress,
    requirementSummaries: requirementGroups.map((group) => ({
      requirementId: String(group.id),
      title: group.label,
      status: group.status === 'not_started' ? 'planned' : group.status,
      summary: group.summary ?? '',
      completedCredits: undefined,
      remainingCredits: group.remainingCredits,
    })),
    transferPlanningSummary: readOptionalString(value, 'transferPlanningSummary'),
    programExplorationResults: programExplorationResults.map((result) => ({
      programId: String(result.id),
      label: result.label,
      kind: result.kind,
      summary: result.summary,
      matchSummary: result.summary ?? '',
    })),
    sanitizedEvidence: isRecord(value.sanitizedEvidence)
      ? {
          excludedRiskFields: readArray(value.sanitizedEvidence, 'excludedRiskFields').map((field) => {
            assert(typeof field === 'string', 'MyPlan sanitized excluded risk field must be a string.');
            return field as (typeof MYPLAN_COMPARISON_DEFERRED_FIELDS)[number];
          }),
        }
      : undefined,
  };
}

function parseBootstrap(value: unknown): RawMyPlanBootstrap {
  assert(isRecord(value), 'MyPlan bootstrap payload must be an object.');

  const authentication = value.authentication;
  assert(isRecord(authentication), 'MyPlan authentication block is required.');
  const authState = readString(authentication, 'state', 'MyPlan authentication state is required.');
  assert(authState === 'authenticated', 'MyPlan bootstrap must be authenticated.');
  const sessionKind = readString(authentication, 'sessionKind', 'MyPlan session kind is required.');
  assert(sessionKind === 'netid' || sessionKind === 'institution_sso', 'MyPlan session kind is invalid.');

  const carrier = value.carrier;
  assert(isRecord(carrier), 'MyPlan carrier block is required.');
  const carrierKind = readString(carrier, 'kind', 'MyPlan carrier kind is required.');
  assert(carrierKind === 'authenticated_html_bootstrap', 'MyPlan carrier kind must stay authenticated_html_bootstrap.');
  const shellTitle = readString(carrier, 'shellTitle', 'MyPlan shell title is required.');
  const capturedFrom = readOptionalString(carrier, 'capturedFrom');

  const plan = value.plan;
  assert(isRecord(plan), 'MyPlan plan block is required.');
  const terms = readArray(plan, 'terms').map(parseTerm);
  assert(terms.length > 0, 'MyPlan plan must include at least one term.');
  const requirementGroups = readArray(plan, 'requirementGroups').map(parseRequirementGroup);
  assert(requirementGroups.length > 0, 'MyPlan plan must include at least one requirement group.');

  const lastUpdatedAt = readOptionalString(plan, 'lastUpdatedAt');
  if (lastUpdatedAt) {
    assertIsoDateTime(lastUpdatedAt, 'lastUpdatedAt');
  }

  return {
    authentication: {
      state: 'authenticated',
      sessionKind,
    },
    carrier: {
      kind: 'authenticated_html_bootstrap',
      shellTitle,
      capturedFrom,
    },
    plan: {
      ...plan,
      id: readStringOrNumber(plan, 'id', 'MyPlan plan id is required.'),
      label: readString(plan, 'label', 'MyPlan plan label is required.'),
      lastUpdatedAt,
      terms,
      degreeProgress: parseDegreeProgress(plan.degreeProgress),
      requirementGroups,
      transferPlanningSummary: readOptionalString(plan, 'transferPlanningSummary'),
      programExplorationResults: readArray(plan, 'programExplorationResults').map(parseProgramExploration),
    },
  };
}

function buildPrototypeMetadataFromTerms(
  terms: RawMyPlanTerm[],
  requirementGroupCount: number,
  programExplorationCount: number,
): MyPlanPrototypeMetadata {
  return {
    contractRole: 'planning_substrate_candidate',
    canonicalEntitySink: false,
    readOnly: true,
    authenticated: true,
    termCount: terms.length,
    plannedCourseCount: terms.reduce((total, term) => total + term.plannedCourses.length, 0),
    backupCourseCount: terms.reduce((total, term) => total + term.backupCourses.length, 0),
    scheduleOptionCount: terms.reduce((total, term) => total + term.scheduleOptions.length, 0),
    requirementGroupCount,
    programExplorationCount,
  };
}

function buildPrototypeMetadata(rawBootstrap: RawMyPlanBootstrap): MyPlanPrototypeMetadata {
  return buildPrototypeMetadataFromTerms(
    rawBootstrap.plan.terms,
    rawBootstrap.plan.requirementGroups.length,
    rawBootstrap.plan.programExplorationResults.length,
  );
}

function buildPrototypeFromPlanningSnapshot(
  rawSnapshot: RawMyPlanPlanningSnapshot,
  capturedAt: string,
): MyPlanPrototypeSnapshot {
  return {
    surface: 'myplan',
    fit: 'derived_planning_substrate',
    capturedAt,
    carrier: {
      authBoundary: 'authenticated',
      posture: 'read_only',
      carrierKind: 'authenticated_session_snapshot_candidate',
      proofStatus: 'redacted_fixture_comparison_candidate',
      shellTitle: 'MyPlan authenticated session snapshot',
      capturedFrom: rawSnapshot.auth.capturedFrom,
    },
    planId: 'session-snapshot-redacted',
    planLabel: 'Authenticated planning session snapshot',
    terms: rawSnapshot.planTerms.map((term) => normalizeTermPlan(term)),
    degreeProgress: rawSnapshot.degreeProgress,
    requirementGroups: rawSnapshot.requirementSummaries.map((group) => ({
      requirementId: group.requirementId,
      label: group.title,
      status: group.status === 'planned' ? 'in_progress' : group.status,
      summary: group.summary,
      remainingCredits: group.remainingCredits,
    })),
    programExplorationResults: rawSnapshot.programExplorationResults.map((result) => ({
      programId: result.programId,
      label: result.label,
      kind: (result.kind ?? 'major') as MyPlanProgramExplorationResult['kind'],
      summary: result.summary ?? result.matchSummary,
    })),
    metadata: buildPrototypeMetadataFromTerms(
      rawSnapshot.planTerms,
      rawSnapshot.requirementSummaries.length,
      rawSnapshot.programExplorationResults.length,
    ),
    provenance: {
      sourceKind: 'redacted_authenticated_session_snapshot',
      boundaryClass: MYPLAN_BOUNDARY_CLASS,
      publicClaim: MYPLAN_PUBLIC_CLAIM,
      redacted: true,
      capturedAt,
      capturedFrom: rawSnapshot.auth.capturedFrom,
    },
    transferPlanningSummary: rawSnapshot.transferPlanningSummary,
    provedFields: [...MYPLAN_CONTINUATION_PROVED_FIELDS],
    deferredFields: [...MYPLAN_DEFERRED_FIELDS],
  };
}

export function buildMyPlanPrototype(input: BuildMyPlanPrototypeInput): MyPlanPrototypeSnapshot {
  assertIsoDateTime(input.capturedAt, 'capturedAt');
  if (input.sessionSnapshot) {
    return buildPrototypeFromPlanningSnapshot(parsePlanningSnapshot(input.sessionSnapshot), input.capturedAt);
  }

  const sourceKind = input.bootstrap ? 'redacted_json_bootstrap' : 'redacted_html_shell';
  const bootstrapSource = input.bootstrap ?? (input.pageHtml ? extractBootstrapFromHtml(input.pageHtml) : undefined);
  if (!bootstrapSource) {
    throw new Error('MyPlan prototype requires an authenticated bootstrap payload, shell HTML, or authenticated session snapshot.');
  }

  const rawBootstrap = parseBootstrap(bootstrapSource);
  const plan = stripForbiddenKeys(rawBootstrap) as RawMyPlanBootstrap['plan'];

  return {
    surface: 'myplan',
    fit: 'derived_planning_substrate',
    capturedAt: input.capturedAt,
    carrier: {
      authBoundary: 'authenticated',
      posture: 'read_only',
      carrierKind: rawBootstrap.carrier.kind,
      proofStatus: 'redacted_fixture_prototype',
      shellTitle: rawBootstrap.carrier.shellTitle,
      capturedFrom: rawBootstrap.carrier.capturedFrom,
    },
    planId: String(plan.id),
    planLabel: plan.label,
    lastUpdatedAt: plan.lastUpdatedAt,
    terms: plan.terms.map((term: RawMyPlanTerm) => normalizeTermPlan(term)),
    degreeProgress: plan.degreeProgress,
    requirementGroups: plan.requirementGroups.map((group: RawMyPlanRequirementGroup) => ({
      requirementId: String(group.id),
      label: group.label,
      status: group.status,
      summary: group.summary,
      completedCount: group.completedCount,
      totalCount: group.totalCount,
      remainingCredits: group.remainingCredits,
    })),
    transferPlanningSummary: plan.transferPlanningSummary,
    programExplorationResults: plan.programExplorationResults.map((result: RawMyPlanProgramExplorationResult) => ({
      programId: String(result.id),
      label: result.label,
      kind: result.kind,
      summary: result.summary,
    })),
    metadata: buildPrototypeMetadata(rawBootstrap),
    provenance: {
      sourceKind,
      boundaryClass: MYPLAN_BOUNDARY_CLASS,
      publicClaim: MYPLAN_PUBLIC_CLAIM,
      redacted: true,
      capturedAt: input.capturedAt,
      capturedFrom: rawBootstrap.carrier.capturedFrom,
    },
    provedFields: [...MYPLAN_PROVED_FIELDS],
    deferredFields: [...MYPLAN_DEFERRED_FIELDS],
  };
}

function collectSignals(snapshot: MyPlanPrototypeSnapshot) {
  const signals = new Set<string>();
  signals.add('plan.label');
  if (snapshot.carrier.capturedFrom) {
    signals.add(
      snapshot.carrier.carrierKind === 'authenticated_html_bootstrap'
        ? 'carrier.authenticated_bootstrap'
        : 'carrier.authenticated_session_snapshot_candidate',
    );
    signals.add('carrier.capturedFrom');
  }
  if (snapshot.lastUpdatedAt) {
    signals.add('plan.lastUpdatedAt');
  }
  if (snapshot.terms.length > 0) {
    signals.add('term.termCode');
    signals.add('term.termLabel');
  }
  if (snapshot.terms.some((term) => term.planStatus)) {
    signals.add('term.planStatus');
  }
  if (snapshot.terms.some((term) => term.plannedCourses.length > 0)) {
    signals.add('term.plannedCourses');
  }
  if (snapshot.terms.some((term) => term.backupCourses.length > 0)) {
    signals.add('term.backupCourses');
  }
  if (snapshot.terms.some((term) => term.scheduleOptions.length > 0)) {
    signals.add('term.scheduleOptions');
  }
  signals.add('degreeProgress.summary');
  if (snapshot.degreeProgress.percentComplete != null) {
    signals.add('degreeProgress.percentComplete');
  }
  if (snapshot.degreeProgress.creditsEarned != null) {
    signals.add('degreeProgress.creditsEarned');
  }
  if (snapshot.degreeProgress.creditsPlanned != null) {
    signals.add('degreeProgress.creditsPlanned');
  }
  if (snapshot.degreeProgress.creditsRequired != null) {
    signals.add('degreeProgress.creditsRequired');
  }
  if (snapshot.requirementGroups.some((group) => group.summary)) {
    signals.add('requirementGroups.summary');
  }
  if (snapshot.programExplorationResults.some((result) => result.summary)) {
    signals.add('programExplorationResults.summary');
  }
  if (snapshot.transferPlanningSummary) {
    signals.add('transferPlanningSummary');
  }
  return signals;
}

export function buildMyPlanCarrierComparisonPacket(input: {
  comparedAt: string;
  bootstrap: unknown;
  sessionSnapshot: unknown;
}): MyPlanCarrierComparisonPacket {
  assertIsoDateTime(input.comparedAt, 'comparedAt');
  const bootstrapPrototype = buildMyPlanPrototype({
    capturedAt: input.comparedAt,
    bootstrap: input.bootstrap,
  });
  const sessionPrototype = buildMyPlanPrototype({
    capturedAt: input.comparedAt,
    sessionSnapshot: input.sessionSnapshot,
  });

  const bootstrapSignals = collectSignals(bootstrapPrototype);
  const sessionSignals = collectSignals(sessionPrototype);

  return {
    surface: 'myplan',
    fit: 'derived_planning_substrate',
    comparedAt: input.comparedAt,
    carrierPosture: 'comparison_only_candidate_evidence',
    comparedCarriers: [bootstrapPrototype.carrier.carrierKind, sessionPrototype.carrier.carrierKind],
    stableSignals: [...bootstrapSignals].filter((signal) => sessionSignals.has(signal)),
    bootstrapOnlySignals: [...bootstrapSignals].filter((signal) => !sessionSignals.has(signal)),
    sessionSnapshotOnlySignals: [...sessionSignals].filter((signal) => !bootstrapSignals.has(signal)),
    continuationProvedFields: [...MYPLAN_CONTINUATION_PROVED_FIELDS],
    deferredSignalsConfirmed: [...MYPLAN_COMPARISON_DEFERRED_FIELDS],
    planningLayerCandidateSignals: [
      'degreeProgress.summary',
      'requirementGroups.summary',
      'programExplorationResults.summary',
      'transferPlanningSummary',
      'term.scheduleOptions',
      'term.planStatus',
    ],
    weeklyLoadCandidateSignals: ['term.scheduleOptions', 'term.plannedCourses', 'term.backupCourses'],
    promotionEntryCriteria: [
      'prove one live current-user session can corroborate both authenticated carriers without widening into registration or adviser-sharing flows',
      'promote planning/program signals through a shared derived planning substrate contract instead of forcing them into current canonical entity families',
      'keep registration handoff, adviser sharing, collaboration, and raw audit content outside the normalized contract',
    ],
    sharedPromotionBlockers: [
      'live current-user carrier lock still pending',
      'Planner-owned shared derived planning substrate contract still pending',
      'shared schema/storage/core authorization still pending',
    ],
  };
}

export function getMyPlanMinimalFieldSet() {
  return [...MYPLAN_PROVED_FIELDS];
}

export function getMyPlanDeferredFieldSet() {
  return [...MYPLAN_DEFERRED_FIELDS];
}
