import type { SiteSyncOutcome } from '@campus-copilot/core';
import {
  deriveMyPlanPromotionState,
  MYPLAN_EXACT_BLOCKERS,
  MYPLAN_HARD_DEFERRED_MOVES,
  MYPLAN_STAGE_UNDERSTANDING,
} from '../../../packages/adapters-myplan/src/index.ts';
import {
  campusCopilotDb,
  getLatestPlanningSubstrateBySource,
  replacePlanningSubstratesBySource,
  type PlanningSubstrateOwner,
} from '@campus-copilot/storage';
import { extractPageHtml, getActiveTabContext, type SyncTargetOverride } from './background-tab-context';

type PlanningCaptureKind = 'plan' | 'audit';
type MyPlanBootstrapTermSummary = {
  termCode: string;
  termLabel: string;
  planStatus?: 'draft' | 'saved' | 'submitted';
  plannedCourseCount: number;
  backupCourseCount: number;
  scheduleOptionCount: number;
};
type MyPlanBootstrapPlanningSummary = {
  planId: string;
  planLabel: string;
  lastUpdatedAt?: string;
  transferPlanningSummary?: string;
  programExplorationCount: number;
  terms: MyPlanBootstrapTermSummary[];
};
type AuditRequirementSignal = {
  label: string;
  statusLabel?: 'not completed' | 'in progress' | 'completed';
  totalsSummary?: string;
};

function decodeEntities(input: string) {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&amp;/gi, '&');
}

function stripTags(input: string) {
  return decodeEntities(input.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonEmptyString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readRecordArray(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function normalizeTermIdentity(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function termSummariesMatch(
  left: Pick<MyPlanBootstrapTermSummary, 'termCode' | 'termLabel'>,
  right: Pick<MyPlanBootstrapTermSummary, 'termCode' | 'termLabel'>,
) {
  return (
    normalizeTermIdentity(left.termCode) === normalizeTermIdentity(right.termCode) ||
    normalizeTermIdentity(left.termLabel) === normalizeTermIdentity(right.termLabel)
  );
}

function extractEmbeddedMyPlanBootstrap(pageHtml: string) {
  const authState = pageHtml.match(/data-myplan-auth\s*=\s*(['"])(?<value>.*?)\1/i)?.groups?.value?.trim();
  if (authState !== 'authenticated') {
    return undefined;
  }

  for (const match of pageHtml.matchAll(/<script\b(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/script\b[^>]*>/gi)) {
    const attrs = match.groups?.attrs ?? '';
    const body = match.groups?.body ?? '';
    const id = attrs.match(/\bid\s*=\s*(['"])(?<value>.*?)\1/i)?.groups?.value?.trim();
    const type = attrs.match(/\btype\s*=\s*(['"])(?<value>.*?)\1/i)?.groups?.value?.trim();
    if (id !== 'myplan-bootstrap' || type !== 'application/json') {
      continue;
    }

    try {
      return JSON.parse(body) as unknown;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function buildBootstrapPlanningSummary(pageHtml: string): MyPlanBootstrapPlanningSummary | undefined {
  const rawBootstrap = extractEmbeddedMyPlanBootstrap(pageHtml);
  if (!isRecord(rawBootstrap)) {
    return undefined;
  }

  const plan = rawBootstrap.plan;
  if (!isRecord(plan)) {
    return undefined;
  }

  const planId = readNonEmptyString(plan, 'id');
  const planLabel = readNonEmptyString(plan, 'label');
  if (!planId || !planLabel) {
    return undefined;
  }

  const terms = readRecordArray(plan, 'terms')
    .map((term): MyPlanBootstrapTermSummary | undefined => {
      const termCode = readNonEmptyString(term, 'termCode');
      const termLabel = readNonEmptyString(term, 'termLabel');
      if (!termCode || !termLabel) {
        return undefined;
      }

      const planStatus = readNonEmptyString(term, 'planStatus');
      const normalizedPlanStatus =
        planStatus === 'draft' || planStatus === 'saved' || planStatus === 'submitted' ? planStatus : undefined;

      return {
        termCode,
        termLabel,
        planStatus: normalizedPlanStatus,
        plannedCourseCount: readRecordArray(term, 'plannedCourses').length,
        backupCourseCount: readRecordArray(term, 'backupCourses').length,
        scheduleOptionCount: readRecordArray(term, 'scheduleOptions').length,
      };
    })
    .filter((term): term is MyPlanBootstrapTermSummary => Boolean(term));

  if (terms.length === 0) {
    return undefined;
  }

  return {
    planId,
    planLabel,
    lastUpdatedAt: readNonEmptyString(plan, 'lastUpdatedAt'),
    transferPlanningSummary: readNonEmptyString(plan, 'transferPlanningSummary'),
    programExplorationCount: readRecordArray(plan, 'programExplorationResults').length,
    terms,
  };
}

function buildPlanningTermSummary(
  term: Pick<MyPlanBootstrapTermSummary, 'plannedCourseCount' | 'backupCourseCount' | 'scheduleOptionCount' | 'planStatus'>,
  options?: {
    visiblePlannedCourseCount?: number;
    issuesSummary?: string;
  },
) {
  const parts = [];
  if (term.planStatus) {
    parts.push(`${term.planStatus} plan.`);
  }
  parts.push(
    `${term.plannedCourseCount} planned course(s), ${term.backupCourseCount} backup option(s), ${term.scheduleOptionCount} schedule option(s).`,
  );
  if (options?.visiblePlannedCourseCount != null) {
    const visibleSummary =
      options.issuesSummary && options.issuesSummary.length > 0
        ? `${options.visiblePlannedCourseCount} visible planned/issue course card(s) captured from the MyPlan planning page. ${options.issuesSummary}`
        : `${options.visiblePlannedCourseCount} visible planned/issue course card(s) captured from the MyPlan planning page.`;
    parts.push(visibleSummary);
  } else if (options?.issuesSummary) {
    parts.push(options.issuesSummary);
  }
  return parts.join(' ').trim();
}

function mergeBootstrapTerms(
  previousTerms: PlanningSubstrateOwner['terms'],
  visibleTerm: PlanningSubstrateOwner['terms'][number] | undefined,
  bootstrapSummary: MyPlanBootstrapPlanningSummary,
  visibleIssuesSummary?: string,
) {
  const bootstrapTerms: PlanningSubstrateOwner['terms'] = bootstrapSummary.terms.map((term) => ({
    termCode: term.termCode,
    termLabel: term.termLabel,
    plannedCourseCount: term.plannedCourseCount,
    backupCourseCount: term.backupCourseCount,
    scheduleOptionCount: term.scheduleOptionCount,
    summary: buildPlanningTermSummary(term),
  }));

  let nextTerms: PlanningSubstrateOwner['terms'] = [...bootstrapTerms];
  if (visibleTerm) {
    const matchedBootstrap = bootstrapSummary.terms.find((term) => termSummariesMatch(term, visibleTerm));
    const enrichedVisibleTerm = matchedBootstrap
      ? {
          ...visibleTerm,
          plannedCourseCount: Math.max(visibleTerm.plannedCourseCount, matchedBootstrap.plannedCourseCount),
          backupCourseCount: matchedBootstrap.backupCourseCount,
          scheduleOptionCount: matchedBootstrap.scheduleOptionCount,
          summary: buildPlanningTermSummary(matchedBootstrap, {
            visiblePlannedCourseCount: visibleTerm.plannedCourseCount,
            issuesSummary: visibleIssuesSummary,
          }),
        }
      : visibleTerm;
    const remainingBootstrapTerms = bootstrapTerms.filter((term) => !termSummariesMatch(term, enrichedVisibleTerm));
    nextTerms = [enrichedVisibleTerm, ...remainingBootstrapTerms];
  }

  for (const previousTerm of previousTerms) {
    if (!nextTerms.some((term) => termSummariesMatch(term, previousTerm))) {
      nextTerms.push(previousTerm);
    }
  }

  return nextTerms;
}

function detectPlanningCaptureKind(url: string | undefined): PlanningCaptureKind | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'myplan.uw.edu') {
      return undefined;
    }

    if (parsed.pathname.startsWith('/plan/')) {
      return 'plan';
    }

    if (parsed.pathname.startsWith('/audit/')) {
      return 'audit';
    }
  } catch {}

  return undefined;
}

function slugFromUrl(url: string) {
  const hash = new URL(url).hash;
  const match = hash.match(/\/(?<term>[a-z]{2}\d{2})/i);
  return match?.groups?.term?.toLowerCase() ?? 'current';
}

function mergeTerms(
  previousTerms: PlanningSubstrateOwner['terms'],
  nextTerm: PlanningSubstrateOwner['terms'][number] | undefined,
) {
  if (!nextTerm) {
    return previousTerms;
  }

  const remaining = previousTerms.filter((term) => term.termCode !== nextTerm.termCode);
  return [nextTerm, ...remaining];
}

function sumCounts(terms: PlanningSubstrateOwner['terms'], key: 'plannedCourseCount' | 'backupCourseCount' | 'scheduleOptionCount') {
  return terms.reduce((total, term) => total + term[key], 0);
}

function normalizeAuditRequirementStatus(rawStatus: string | undefined): AuditRequirementSignal['statusLabel'] | undefined {
  const normalized = rawStatus?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized.includes('not completed')) {
    return 'not completed';
  }
  if (normalized.includes('in progress')) {
    return 'in progress';
  }
  if (normalized.includes('completed')) {
    return 'completed';
  }
  return undefined;
}

function getAuditRequirementStatusRank(status: AuditRequirementSignal['statusLabel']) {
  switch (status) {
    case 'not completed':
      return 0;
    case 'in progress':
      return 1;
    case 'completed':
      return 2;
    default:
      return 3;
  }
}

function formatAuditRequirementStatus(status: AuditRequirementSignal['statusLabel']) {
  if (!status) {
    return 'Visible';
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function extractAuditRequirementSignals(pageHtml: string) {
  const openings = Array.from(pageHtml.matchAll(/<div[^>]*class="[^"]*\baudit-requirement requirement\b[^"]*"[^>]*>/gi));
  if (openings.length === 0) {
    return [];
  }

  const signals: AuditRequirementSignal[] = [];
  for (const [index, opening] of openings.entries()) {
    const start = opening.index ?? 0;
    const end = openings[index + 1]?.index ?? pageHtml.length;
    const block = pageHtml.slice(start, end);
    const statusLabel = normalizeAuditRequirementStatus(
      stripTags(block.match(/<span[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>(?<text>[\s\S]*?)<\/span>/i)?.groups?.text ?? ''),
    );
    const infoBlock = block.match(/<div[^>]*class="[^"]*\baudit-requirement-info\b[^"]*"[^>]*>(?<info>[\s\S]*?)<\/div>/i)?.groups?.info ?? '';
    const infoTexts = Array.from(
      infoBlock.matchAll(/<div[^>]*class="[^"]*\btext\b[^"]*"[^>]*>(?<text>[\s\S]*?)<\/div>/gi),
    )
      .map((match) => stripTags(match.groups?.text ?? ''))
      .filter(Boolean);
    const label = infoTexts[0] ?? stripTags(infoBlock);
    if (!label) {
      continue;
    }

    const totalsSummary = stripTags(
      block.match(/<div[^>]*class="[^"]*\baudit-requirement-totals\b[^"]*"[^>]*>(?<text>[\s\S]*?)<\/div>/i)?.groups?.text ?? '',
    );

    signals.push({
      label,
      statusLabel,
      totalsSummary: totalsSummary || undefined,
    });
  }

  const deduped = new Map<string, AuditRequirementSignal>();
  for (const signal of signals) {
    const key = signal.label.toLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, signal);
    }
  }

  return Array.from(deduped.values());
}

function buildAuditRequirementSpineSummary(pageHtml: string) {
  const signals = extractAuditRequirementSignals(pageHtml);
  if (signals.length === 0) {
    return undefined;
  }

  const prioritized = [...signals].sort((left, right) => {
    const rankDiff = getAuditRequirementStatusRank(left.statusLabel) - getAuditRequirementStatusRank(right.statusLabel);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return left.label.localeCompare(right.label);
  });
  const highlightedPool = prioritized.filter((signal) => signal.statusLabel !== 'completed');
  const sourcePool = highlightedPool.length > 0 ? highlightedPool : prioritized;
  const visibleSignals = sourcePool.slice(0, 3);
  const renderedSignals = visibleSignals.map((signal) => {
    const totalsSuffix = signal.totalsSummary ? ` (${signal.totalsSummary})` : '';
    return `${formatAuditRequirementStatus(signal.statusLabel)}: ${signal.label}${totalsSuffix}`;
  });
  const remainingCount = sourcePool.length - visibleSignals.length;

  return `Visible DARS requirement spine: ${renderedSignals.join('; ')}${remainingCount > 0 ? `; +${remainingCount} more visible requirement signal(s).` : '.'}`;
}

function buildPlanningBase(previous: PlanningSubstrateOwner | undefined, capturedAt: string) {
  return {
    id: previous?.id ?? 'myplan:planning-substrate:live',
    source: 'myplan' as const,
    fit: 'derived_planning_substrate' as const,
    readOnly: true as const,
    capturedAt,
    planId: previous?.planId ?? 'myplan-live',
    planLabel: previous?.planLabel ?? 'MyPlan live planning workspace',
    lastUpdatedAt: previous?.lastUpdatedAt,
    termCount: previous?.termCount ?? 0,
    plannedCourseCount: previous?.plannedCourseCount ?? 0,
    backupCourseCount: previous?.backupCourseCount ?? 0,
    scheduleOptionCount: previous?.scheduleOptionCount ?? 0,
    requirementGroupCount: previous?.requirementGroupCount ?? 0,
    programExplorationCount: previous?.programExplorationCount ?? 0,
    degreeProgressSummary: previous?.degreeProgressSummary,
    transferPlanningSummary: previous?.transferPlanningSummary,
    currentStage: previous?.currentStage ?? MYPLAN_STAGE_UNDERSTANDING.currentStage,
    runtimePosture: previous?.runtimePosture ?? MYPLAN_STAGE_UNDERSTANDING.runtimePosture,
    currentTruth: previous?.currentTruth ?? MYPLAN_STAGE_UNDERSTANDING.currentTruth,
    exactBlockers:
      previous?.exactBlockers && previous.exactBlockers.length > 0
        ? previous.exactBlockers
        : MYPLAN_EXACT_BLOCKERS.map((blocker) => ({ ...blocker })),
    hardDeferredMoves:
      previous?.hardDeferredMoves && previous.hardDeferredMoves.length > 0
        ? previous.hardDeferredMoves
        : [...MYPLAN_HARD_DEFERRED_MOVES],
    terms: previous?.terms ?? [],
  };
}

function buildPlanCaptureFromHtml(
  pageHtml: string,
  url: string,
  capturedAt: string,
  previous: PlanningSubstrateOwner | undefined,
): PlanningSubstrateOwner {
  const base = buildPlanningBase(previous, capturedAt);
  const bootstrapSummary = buildBootstrapPlanningSummary(pageHtml);
  const headingMatch = pageHtml.match(/<h1[^>]*>\s*(?<heading>[\s\S]*?)\s*<\/h1>/i);
  const rawHeading = stripTags(headingMatch?.groups?.heading ?? '');
  const termLabel = rawHeading.replace(/\s*Current Quarter$/i, '').trim() || 'Current MyPlan term';
  const termCode = slugFromUrl(url);
  const uniqueCourses = new Map<string, { code: string; title: string; credits: number }>();
  const issueCardBlocks = Array.from(
    pageHtml.matchAll(/<li[^>]*id="plan-item-[^"]+"[^>]*>(?<block>[\s\S]*?)(?=<li[^>]*id="plan-item-[^"]+"|<\/ul>)/gi),
  );
  const courseMatches =
    issueCardBlocks.length > 0
      ? issueCardBlocks
          .map((match) => {
            const block = match.groups?.block ?? '';
            const code = stripTags(block.match(/<h3[^>]*>\s*<a[^>]*>(?<code>[\s\S]*?)<\/a>\s*<\/h3>/i)?.groups?.code ?? '');
            const title = stripTags(
              block.match(/<a[^>]*class="[^"]*d-block lead[^"]*"[^>]*>\s*(?<title>[\s\S]*?)\s*<\/a>/i)?.groups?.title ?? '',
            );
            const creditText =
              block.match(/title="(?<credits>\d+(?:-\d+)?)\s*Credits?"/i)?.groups?.credits ??
              block.match(/(?<credits>\d+(?:-\d+)?)\s*Credits?/i)?.groups?.credits ??
              '';
            return { code, title, creditText };
          })
          .filter((match) => match.code && match.title)
      : Array.from(
          pageHtml.matchAll(
            /<h3[^>]*>\s*(?<code>[A-Z][A-Z0-9& ]+\d{3}[A-Z]?)\s*<\/h3>[\s\S]{0,1200}?<a[^>]*class="[^"]*d-block lead[^"]*"[^>]*>\s*(?<title>[\s\S]*?)\s*<\/a>[\s\S]{0,600}?(?:title="(?<credits>\d+(?:-\d+)?)\s*Credits?"|(?<creditsText>\d+(?:-\d+)?)\s*Credits?)/gi,
          ),
        ).map((match) => ({
          code: stripTags(match.groups?.code ?? ''),
          title: stripTags(match.groups?.title ?? ''),
          creditText: match.groups?.credits ?? match.groups?.creditsText ?? '',
        }));
  for (const match of courseMatches) {
    const code = stripTags(match.code ?? '');
    const title = stripTags(match.title ?? '');
    const creditText = match.creditText ?? '';
    const credits = Number.parseInt(creditText.split('-')[0] ?? '0', 10);
    if (!code || uniqueCourses.has(code)) {
      continue;
    }
    uniqueCourses.set(code, { code, title, credits: Number.isFinite(credits) ? credits : 0 });
  }

  const plannedCourseCount = uniqueCourses.size;
  const issuesToResolveMatch = pageHtml.match(/<h2[^>]*>\s*Issues to Resolve\s*<\/h2>[\s\S]*?<div[^>]*class="card-body"[^>]*>(?<body>[\s\S]*?)<\/div>/i);
  const issuesSummary = stripTags(issuesToResolveMatch?.groups?.body ?? '');
  const transferPlanningSummary = pageHtml.includes('Find CTC Transfer Equivalency')
    ? 'CTC transfer equivalency tools are visible from the current MyPlan page.'
    : previous?.transferPlanningSummary;
  const degreeProgressSummary =
    previous?.degreeProgressSummary ??
    'Requirement progress is not exposed on this MyPlan planning page yet. Open Degree Audit (DARS) to capture requirement detail.';

  const nextTerm = {
    termCode,
    termLabel,
    plannedCourseCount,
    backupCourseCount: 0,
    scheduleOptionCount: 0,
    summary:
      plannedCourseCount > 0 && issuesSummary
        ? `${plannedCourseCount} visible planned/issue course card(s) captured from the MyPlan planning page. ${issuesSummary}`
        : issuesSummary || `${plannedCourseCount} visible planned/issue course card(s) captured from the MyPlan planning page.`,
  };
  const terms = bootstrapSummary
    ? mergeBootstrapTerms(base.terms, nextTerm, bootstrapSummary, issuesSummary)
    : mergeTerms(base.terms, nextTerm);

  return {
    ...base,
    planId: bootstrapSummary?.planId ?? base.planId,
    planLabel:
      base.planLabel === 'MyPlan live planning workspace' ? bootstrapSummary?.planLabel ?? termLabel : base.planLabel,
    lastUpdatedAt: bootstrapSummary?.lastUpdatedAt ?? base.lastUpdatedAt,
    terms,
    termCount: terms.length,
    plannedCourseCount: sumCounts(terms, 'plannedCourseCount'),
    backupCourseCount: sumCounts(terms, 'backupCourseCount'),
    scheduleOptionCount: sumCounts(terms, 'scheduleOptionCount'),
    degreeProgressSummary,
    transferPlanningSummary: bootstrapSummary?.transferPlanningSummary ?? transferPlanningSummary,
    programExplorationCount: bootstrapSummary?.programExplorationCount ?? base.programExplorationCount,
    requirementGroupCount: base.requirementGroupCount,
  };
}

function applyPlanningPromotionState(record: PlanningSubstrateOwner) {
  const promotionState = deriveMyPlanPromotionState({
    termCount: record.termCount,
    plannedCourseCount: record.plannedCourseCount,
    backupCourseCount: record.backupCourseCount,
    scheduleOptionCount: record.scheduleOptionCount,
    requirementGroupCount: record.requirementGroupCount,
    degreeProgressSummary: record.degreeProgressSummary,
    liveCurrentUser: true,
  });

  return {
    ...record,
    currentTruth: promotionState.currentTruth,
    exactBlockers: promotionState.exactBlockers,
  };
}

function buildAuditCaptureFromHtml(
  pageHtml: string,
  capturedAt: string,
  previous: PlanningSubstrateOwner | undefined,
): PlanningSubstrateOwner {
  const base = buildPlanningBase(previous, capturedAt);
  const titleMatches = Array.from(pageHtml.matchAll(/<h1[^>]*>\s*(?<heading>[\s\S]*?)\s*<\/h1>/gi));
  const planLabel = stripTags(titleMatches[1]?.groups?.heading ?? titleMatches[0]?.groups?.heading ?? '') || base.planLabel;
  const auditState = stripTags(pageHtml.match(/<div[^>]*class="audit-state"[^>]*>(?<text>[\s\S]*?)<\/div>/i)?.groups?.text ?? '');
  const totals = stripTags(
    pageHtml.match(/<div[^>]*class="audit-requirement-totals"[^>]*>(?<text>[\s\S]*?)<\/div>/i)?.groups?.text ?? '',
  );
  const requirementGroupCount = Array.from(pageHtml.matchAll(/class="audit-requirement requirement\b/gi)).length;
  const requirementSpineSummary = buildAuditRequirementSpineSummary(pageHtml);
  const degreeProgressSummary = [auditState, totals, requirementSpineSummary].filter(Boolean).join(' ');
  const transferPlanningSummary = pageHtml.includes('Find CTC Transfer Equivalency')
    ? 'CTC transfer equivalency tools are visible from the current DARS audit page.'
    : base.transferPlanningSummary;

  return {
    ...base,
    planLabel,
    requirementGroupCount: requirementGroupCount || base.requirementGroupCount,
    degreeProgressSummary: degreeProgressSummary || base.degreeProgressSummary,
    transferPlanningSummary,
  };
}

export function buildMyPlanPlanningSubstrateFromHtml(input: {
  pageHtml: string;
  url: string;
  capturedAt: string;
  previous?: PlanningSubstrateOwner;
}): PlanningSubstrateOwner {
  const kind = detectPlanningCaptureKind(input.url);
  if (!kind) {
    throw new Error('unsupported_context');
  }

  if (kind === 'plan') {
    return applyPlanningPromotionState(
      buildPlanCaptureFromHtml(input.pageHtml, input.url, input.capturedAt, input.previous),
    );
  }

  return applyPlanningPromotionState(buildAuditCaptureFromHtml(input.pageHtml, input.capturedAt, input.previous));
}

export async function capturePlanningSubstrateFromActiveTab(now: string, targetOverride?: SyncTargetOverride) {
  const activeTab = await getActiveTabContext(targetOverride);
  if (!activeTab || !detectPlanningCaptureKind(activeTab.url)) {
    return {
      ok: false as const,
      outcome: 'unsupported_context' as SiteSyncOutcome,
      message: 'Open a MyPlan planning or DARS audit page in the active tab first.',
      capturedAt: now,
    };
  }

  const pageHtml = await extractPageHtml(activeTab.tabId);
  if (!pageHtml) {
    return {
      ok: false as const,
      outcome: 'normalize_failed' as SiteSyncOutcome,
      message: 'The active MyPlan page did not expose readable HTML.',
      capturedAt: now,
    };
  }

  const previous = await getLatestPlanningSubstrateBySource('myplan', campusCopilotDb);
  const next = buildMyPlanPlanningSubstrateFromHtml({
    pageHtml,
    url: activeTab.url,
    capturedAt: now,
    previous,
  });
  await replacePlanningSubstratesBySource('myplan', [next], campusCopilotDb);

  const hasPlanData = next.termCount > 0;
  const hasAuditData = Boolean(next.degreeProgressSummary) && next.requirementGroupCount > 0;
  const outcome: SiteSyncOutcome = hasPlanData && hasAuditData ? 'success' : 'partial_success';

  return {
    ok: true as const,
    outcome,
    capturedAt: now,
    planLabel: next.planLabel,
    message:
      outcome === 'success'
        ? `Captured ${next.planLabel} into Planning Pulse.`
        : `Captured ${next.planLabel} into Planning Pulse, but the other MyPlan/DARS half is still missing.`,
  };
}
