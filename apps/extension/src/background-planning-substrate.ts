import type { SiteSyncOutcome } from '@campus-copilot/core';
import {
  campusCopilotDb,
  getLatestPlanningSubstrateBySource,
  replacePlanningSubstratesBySource,
  type PlanningSubstrateOwner,
} from '@campus-copilot/storage';
import { extractPageHtml, getActiveTabContext, type SyncTargetOverride } from './background-tab-context';

type PlanningCaptureKind = 'plan' | 'audit';

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

function buildPlanningBase(previous: PlanningSubstrateOwner | undefined, capturedAt: string) {
  return {
    id: previous?.id ?? 'myplan:planning-substrate:live',
    source: 'myplan' as const,
    fit: 'derived_planning_substrate' as const,
    readOnly: true as const,
    capturedAt,
    lastUpdatedAt: capturedAt,
    planId: previous?.planId ?? 'myplan-live',
    planLabel: previous?.planLabel ?? 'MyPlan live planning workspace',
    termCount: previous?.termCount ?? 0,
    plannedCourseCount: previous?.plannedCourseCount ?? 0,
    backupCourseCount: previous?.backupCourseCount ?? 0,
    scheduleOptionCount: previous?.scheduleOptionCount ?? 0,
    requirementGroupCount: previous?.requirementGroupCount ?? 0,
    programExplorationCount: previous?.programExplorationCount ?? 0,
    degreeProgressSummary: previous?.degreeProgressSummary,
    transferPlanningSummary: previous?.transferPlanningSummary,
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
  const terms = mergeTerms(base.terms, nextTerm);

  return {
    ...base,
    planLabel: base.planLabel === 'MyPlan live planning workspace' ? termLabel : base.planLabel,
    terms,
    termCount: terms.length,
    plannedCourseCount: sumCounts(terms, 'plannedCourseCount'),
    backupCourseCount: sumCounts(terms, 'backupCourseCount'),
    scheduleOptionCount: sumCounts(terms, 'scheduleOptionCount'),
    degreeProgressSummary,
    transferPlanningSummary,
    programExplorationCount: base.programExplorationCount,
    requirementGroupCount: base.requirementGroupCount,
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
  const degreeProgressSummary = [auditState, totals].filter(Boolean).join(' ');
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
    return buildPlanCaptureFromHtml(input.pageHtml, input.url, input.capturedAt, input.previous);
  }

  return buildAuditCaptureFromHtml(input.pageHtml, input.capturedAt, input.previous);
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
