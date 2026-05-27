import type { AdminCarrierRecord } from '@campus-copilot/storage';

function stripHtml(value: string | undefined) {
  return (value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFirstMatch(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return stripHtml(match?.[1]);
}

function extractLastMatch(html: string, pattern: RegExp) {
  const matches = Array.from(html.matchAll(pattern));
  const value = matches.at(-1)?.[1];
  return stripHtml(value);
}

function extractTranscriptHeaderValues(pageHtml: string) {
  const match = pageHtml.match(
    /<th[^>]*>\s*Student No\s*<\/th>\s*<th[^>]*>\s*Birth Date\s*<\/th>\s*<th[^>]*>\s*Class\s*<\/th>\s*<th[^>]*>\s*College\s*<\/th>\s*<th[^>]*>\s*Major\s*<\/th>\s*<\/tr>\s*<tr[^>]*>\s*<td[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i,
  );

  return {
    classValue: stripHtml(match?.[1]),
    majorValue: stripHtml(match?.[2]),
  };
}

function extractFinaidPrimaryMessage(pageHtml: string) {
  const messagesTableHtml =
    pageHtml.match(/<table[^>]*(?:id="dgMessagesList[^"]*"|aria-label="dgMessagesList")[^>]*>([\s\S]*?)<\/table>/i)?.[1] ??
    pageHtml;
  const tableMessage = Array.from(
    messagesTableHtml.matchAll(/<td[^>]*class="[^"]*\bfacontenttext\b[^"]*"[^>]*>[\s\S]*?<b>([\s\S]*?)<\/b>[\s\S]*?<\/td>/gi),
  )
    .map((match) => stripHtml(match[1]))
    .find(Boolean);
  if (tableMessage) {
    return tableMessage;
  }

  return Array.from(pageHtml.matchAll(/<b[^>]*>([\s\S]*?)<\/b>/gi))
    .map((match) => stripHtml(match[1]))
    .find((candidate) => candidate.length > 0 && !/Student Personal Services|Financial Aid Status|Loan History|Messages/i.test(candidate));
}

function detectAdminCarrierFamily(url: string) {
  const normalized = url.toLowerCase();
  if (normalized.includes('untranscript.aspx')) {
    return 'transcript' as const;
  }
  if (normalized.includes('finaidstatus.aspx')) {
    return 'finaid' as const;
  }
  if (normalized.includes('/accounts')) {
    return 'accounts' as const;
  }
  if (normalized.includes('/profile')) {
    return 'profile' as const;
  }
  if (normalized.includes('tuition.aspx')) {
    return 'tuition_detail' as const;
  }
  return undefined;
}

type AdminCarrierLane = Pick<
  AdminCarrierRecord,
  'laneStatus' | 'detailRuntimeStatus' | 'detailRuntimeNote' | 'exactBlockers'
>;

function buildPromotionBlocker(id: string, summary: string, whyItStopsPromotion: string) {
  return {
    id,
    summary,
    whyItStopsPromotion,
  };
}

function buildReviewReadyLane(note: string, exactBlockers: AdminCarrierRecord['exactBlockers']): AdminCarrierLane {
  return {
    laneStatus: 'standalone_detail_runtime_lane',
    detailRuntimeStatus: 'review_ready',
    detailRuntimeNote: note,
    exactBlockers,
  };
}

function buildPendingLane(note: string, exactBlockers: AdminCarrierRecord['exactBlockers']): AdminCarrierLane {
  return {
    laneStatus: 'landed_summary_lane',
    detailRuntimeStatus: 'pending',
    detailRuntimeNote: note,
    exactBlockers,
  };
}

function buildTranscriptCarrier(pageHtml: string, url: string, now: string): AdminCarrierRecord {
  const transcriptHeader = extractTranscriptHeaderValues(pageHtml);
  const classValue = transcriptHeader.classValue || extractFirstMatch(pageHtml, /<th>Class<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
  const majorValue = transcriptHeader.majorValue || extractFirstMatch(pageHtml, /<th>Major<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
  const transferCredits = extractFirstMatch(pageHtml, /TOTAL CREDITS EARNED:\s*([0-9.]+)/i);
  const cumulativeGpa = extractLastMatch(pageHtml, /CUM GPA:\s*([0-9.]+)/gi);
  const standing = extractFirstMatch(pageHtml, /ACADEMIC STANDING:\s*([A-Z ]+)/i);
  const workInProgress = extractFirstMatch(pageHtml, /QTR\s+REGISTERED:\s*([0-9.]+)/i);

  return {
    id: 'admin-carrier:transcript',
    family: 'transcript',
    ...buildReviewReadyLane(
      'Transcript detail now has a standalone review-first lane backed by the transcript page, but it still stops at export/manual review instead of AI-readable record detail.',
      [
        buildPromotionBlocker(
          'transcript_ai_export_first',
          'Transcript detail remains export-first and AI-blocked.',
          'The landed lane is lawful for manual/export review, but the repo still forbids direct AI reading of transcript detail.',
        ),
        buildPromotionBlocker(
          'transcript_line_item_history_not_normalized',
          'Line-item transcript history is not yet normalized into standalone structured records.',
          'The current lane captures standing/GPA/credits summaries, not a complete course-by-course historical ledger.',
        ),
      ],
    ),
    title: 'Unofficial transcript',
    summary: `Transcript summary shows class ${classValue || 'unknown'}, major ${majorValue || 'unknown'}, total credits earned ${transferCredits || 'unknown'}, cumulative GPA ${cumulativeGpa || 'unknown'}, standing ${standing || 'unknown'}, and ${workInProgress || 'unknown'} credits currently in progress.`,
    sourceSurface: 'myuw',
    sourceUrl: url,
    authoritySource: 'sdb.admin unofficial transcript page',
    importance: 'high',
    aiDefault: 'blocked',
    nextAction: 'Review or export the transcript summary before any AI analysis.',
    updatedAt: now,
  };
}

function buildFinaidCarrier(pageHtml: string, url: string, now: string): AdminCarrierRecord {
  const messagesCount = extractFirstMatch(pageHtml, /Messages\s*\((\d+)\)/i);
  const mainStatus =
    extractFinaidPrimaryMessage(pageHtml) ||
    extractFirstMatch(pageHtml, /<b[^>]*>(Aid status summary[\s\S]*?processing support\.)<\/b>/i) ||
    'Financial aid application status is visible on the current page.';
  const totalPrincipal =
    extractFirstMatch(pageHtml, /Total borrowing[\s\S]*?\$([0-9,]+)/i) ||
    extractFirstMatch(pageHtml, /Total Educational Borrowing[\s\S]*?\$([0-9,]+)/i);
  const monthlyPayment =
    extractFirstMatch(pageHtml, /Estimated monthly payment[\s\S]*?\$([0-9,]+)/i) ||
    extractFirstMatch(pageHtml, /Estimated Monthly Loan Payment[\s\S]*?\$([0-9,]+)/i);

  return {
    id: 'admin-carrier:finaid',
    family: 'finaid',
    ...buildReviewReadyLane(
      'Financial-aid detail now has a standalone review-first lane backed by the aid-status page, but checklist/doc-detail and AI access still stay blocked.',
      [
        buildPromotionBlocker(
          'finaid_ai_export_first',
          'Financial-aid detail remains export-first and AI-blocked.',
          'The current lane is only approved for manual/export review, not direct AI analysis of aid detail.',
        ),
        buildPromotionBlocker(
          'finaid_document_checklist_not_normalized',
          'Aid document/checklist detail is not yet normalized into a stronger runtime lane.',
          'The landed summary captures status and borrowing context, but not a full aid-document or requirement ledger.',
        ),
      ],
    ),
    title: 'Financial aid status',
    summary: `Financial aid summary shows ${messagesCount || 'unknown'} message(s); current status says "${mainStatus}". Estimated total borrowing is $${totalPrincipal || 'unknown'} with estimated monthly repayment $${monthlyPayment || 'unknown'}.`,
    sourceSurface: 'myuw',
    sourceUrl: url,
    authoritySource: 'sdb.admin financial aid status page',
    importance: 'high',
    aiDefault: 'blocked',
    nextAction: 'Review or export the financial-aid summary before any AI analysis.',
    updatedAt: now,
  };
}

function buildAccountsCarrier(pageHtml: string, url: string, now: string): AdminCarrierRecord[] {
  const amountDue =
    extractFirstMatch(pageHtml, /Amount Due[\s\S]*?\$\s*([0-9.,]+)/i) ||
    extractFirstMatch(pageHtml, /Billing overview[\s\S]*?\$\s*([0-9.,]+)/i);
  const huskyStatus =
    extractFirstMatch(pageHtml, /Eligibility[\s\S]*?Status[\s\S]*?<li[^>]*>([\s\S]*?)<\/li>/i) ||
    extractFirstMatch(pageHtml, /Eligibility Status[\s\S]*?<li[^>]*>([\s\S]*?)<\/li>/i);
  const huskyAccount =
    extractFirstMatch(pageHtml, /Account Balance[\s\S]*?\$\s*([0-9.,]+)/i) ||
    extractFirstMatch(pageHtml, /Student Husky Account[\s\S]*?\$\s*([0-9.,]+)/i);
  const libraryHeader = /(Library Account|Library)/i.test(pageHtml) ? 'present' : 'missing';

  return [
    {
      id: 'admin-carrier:tuition-detail',
      family: 'tuition_detail',
      ...buildPendingLane(
        'The accounts page only provides a billing overview and statement handoff. It does not yet land the standalone statement-backed tuition detail lane.',
        [
          buildPromotionBlocker(
            'tuition_statement_detail_not_opened',
            'Accounts overview only points at the statement-backed lane.',
            'The accounts card gives billing overview context, but it is not the standalone statement detail lane.',
          ),
          buildPromotionBlocker(
            'tuition_ai_export_first',
            'Tuition detail remains export-first and AI-blocked.',
            'Even after a stronger statement carrier lands, billing detail must still stay review/export-first before any AI analysis.',
          ),
        ],
      ),
      title: 'Tuition and fees summary',
      summary: `Accounts page shows billing overview amount due $${amountDue || 'unknown'} and a direct tuition statement handoff for deeper review.`,
      sourceSurface: 'myuw',
      sourceUrl: url,
      authoritySource: 'myuw accounts tuition card',
      importance: 'high',
      aiDefault: 'blocked',
      nextAction: 'Review or export the tuition summary before any AI analysis.',
      updatedAt: now,
    },
    {
      id: 'admin-carrier:accounts',
      family: 'accounts',
      ...buildReviewReadyLane(
        'Accounts detail now has a standalone review-first lane backed by the MyUW accounts page, but it still avoids billing actions and AI-readable account detail.',
        [
          buildPromotionBlocker(
            'accounts_ai_export_first',
            'Accounts detail remains export-first and AI-blocked.',
            'The landed lane supports review/export, not direct AI analysis of account-state detail.',
          ),
          buildPromotionBlocker(
            'accounts_subsystems_not_split',
            'Accounts subsystems are still summarized together instead of becoming separate runtime lanes.',
            'Eligibility, Husky account, library, and tuition handoff still share one review lane rather than multiple fully normalized detail lanes.',
          ),
        ],
      ),
      title: 'Accounts summary',
      summary: `Accounts page shows eligibility ${huskyStatus || 'unknown'}, account balance $${huskyAccount || 'unknown'}, and library panel ${libraryHeader}.`,
      sourceSurface: 'myuw',
      sourceUrl: url,
      authoritySource: 'myuw accounts page cards',
      importance: 'medium',
      aiDefault: 'blocked',
      nextAction: 'Use export-first review for account-state details.',
      updatedAt: now,
    },
  ];
}

function buildProfileCarrier(pageHtml: string, url: string, now: string): AdminCarrierRecord {
  const preferredNamePresent = /Preferred Name/i.test(pageHtml);
  const pronounsPresent = /Pronouns/i.test(pageHtml);
  const localAddressPresent = /Local Address/i.test(pageHtml);
  const emailSectionPresent = /Email Address/i.test(pageHtml) || /Email Addresses/i.test(pageHtml);
  const emergencyContactCount = (pageHtml.match(/Emergency Contact \d+/gi) ?? []).length;

  return {
    id: 'admin-carrier:profile',
    family: 'profile',
    ...buildReviewReadyLane(
      'Profile detail now has a standalone review-first lane backed by the profile page, but personally identifying detail stays export-first and AI-blocked.',
      [
        buildPromotionBlocker(
          'profile_ai_export_first',
          'Profile detail remains export-first and AI-blocked.',
          'The landed lane is only approved for manual/export review so personal identifiers do not enter AI by default.',
        ),
        buildPromotionBlocker(
          'profile_field_history_not_normalized',
          'Profile field history and lower-level personal-record detail are not normalized into a richer runtime lane.',
          'The current lane captures visible summary sections, not full change history or deeper personal-record breakdowns.',
        ),
      ],
    ),
    title: 'MyUW profile summary',
    summary: `Profile page confirms preferred-name ${preferredNamePresent ? 'support' : 'absence'}, pronouns ${pronounsPresent ? 'visibility' : 'not visible'}, local-contact block ${localAddressPresent ? 'present' : 'not visible'}, email section ${emailSectionPresent ? 'present' : 'not visible'}, and ${emergencyContactCount || 0} emergency contact record(s).`,
    sourceSurface: 'myuw',
    sourceUrl: url,
    authoritySource: 'myuw profile page summary cards',
    importance: 'medium',
    aiDefault: 'blocked',
    nextAction: 'Review or export the profile summary before any AI analysis.',
    updatedAt: now,
  };
}

function buildTuitionDetailCarrier(pageHtml: string, url: string, now: string): AdminCarrierRecord {
  const quarter =
    extractFirstMatch(pageHtml, /Official Tuition Charge Statement\s*-\s*([^<\n]+)/i) ||
    extractFirstMatch(pageHtml, /Detail of Account - Charges and payments beginning:\s*([^<\n]+)/i);
  const dueAmount =
    extractFirstMatch(pageHtml, /\*\*\*\s*\$\s*([0-9.,]+)\s*\*\*\*/i) ||
    extractFirstMatch(pageHtml, /BALANCE:\s*\$\s*([0-9.,]+)/i);
  const tuitionClassification = extractFirstMatch(pageHtml, /Tuition Classification:\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  const creditHours = extractFirstMatch(pageHtml, /Credit Hours:\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  const paymentsTotal = extractFirstMatch(
    pageHtml,
    /<b>TOTAL:<\/b>[\s\S]*?<td[^>]*><tt>([0-9.,]+)<\/tt><\/td>\s*<td[^>]*><tt>([0-9.,]+)<\/tt><\/td>\s*<td[^>]*><tt>BALANCE:/i,
  );
  const chargesTotal = extractFirstMatch(
    pageHtml,
    /<b>TOTAL:<\/b>[\s\S]*?<td[^>]*><tt>[0-9.,]+<\/tt><\/td>\s*<td[^>]*><tt>([0-9.,]+)<\/tt><\/td>\s*<td[^>]*><tt>BALANCE:/i,
  );
  const financialAidTableHtml =
    pageHtml.match(/<table[^>]*id="tblFinancialAid"[^>]*>([\s\S]*?)<\/table>/i)?.[1] ?? pageHtml;
  const financialAidTotalsMatch = financialAidTableHtml.match(
    /<tt><b>TOTAL:<\/b><\/tt>[\s\S]*?<tt>([0-9.,]+)<\/tt>[\s\S]*?<tt>([0-9.,]+)<\/tt>[\s\S]*?<tt>([0-9.,]+)<\/tt>[\s\S]*?<tt>([0-9.,]+)<\/tt>[\s\S]*?UNDISBURSED AID:\s*\$&nbsp;?([0-9.,]+)/i,
  );
  const aidToAccount = stripHtml(financialAidTotalsMatch?.[3]);
  const undisbursedAid = stripHtml(financialAidTotalsMatch?.[5]) || extractFirstMatch(pageHtml, /UNDISBURSED AID:\s*\$[^\d]*([0-9.,]+)/i);
  const hasBreakdown = /Tuition Charge Breakdown/i.test(pageHtml);

  return {
    id: 'admin-carrier:tuition-detail',
    family: 'tuition_detail',
    ...buildReviewReadyLane(
      'Tuition detail now has a standalone review-first lane backed by the statement page, but billing actions and longitudinal statement history remain outside the current runtime lane.',
      [
        buildPromotionBlocker(
          'tuition_ai_export_first',
          'Tuition detail remains export-first and AI-blocked.',
          'The statement-backed lane supports manual/export review but still does not authorize direct AI reading of billing detail.',
        ),
        buildPromotionBlocker(
          'tuition_actions_not_supported',
          'Billing actions and broader statement history are still outside the landed lane.',
          'The current lane summarizes the active statement, not payment actions, account mutations, or a full historical statement ledger.',
        ),
      ],
    ),
    title: 'Tuition statement summary',
    summary: `${quarter || 'Current quarter'} tuition statement shows balance due $${dueAmount || 'unknown'}, tuition classification ${
      tuitionClassification || 'unknown'
    }, ${creditHours || 'unknown'} credit hours, charges $${chargesTotal || 'unknown'}, payments $${paymentsTotal || 'unknown'}, aid to account $${
      aidToAccount || 'unknown'
    }, undisbursed aid $${undisbursedAid || 'unknown'}, and ${hasBreakdown ? 'a visible mandatory-fee breakdown' : 'no parsed fee-breakdown table'}.`,
    sourceSurface: 'myuw',
    sourceUrl: url,
    authoritySource: 'sdb.admin tuition statement page',
    importance: 'high',
    aiDefault: 'blocked',
    nextAction: 'Review or export the tuition statement summary before any AI analysis.',
    updatedAt: now,
  };
}

export function extractAdminCarriersFromPageHtml(input: {
  url: string;
  pageHtml?: string;
  now: string;
}): AdminCarrierRecord[] {
  if (!input.pageHtml?.trim()) {
    return [];
  }

  const family = detectAdminCarrierFamily(input.url);
  if (!family) {
    return [];
  }

  if (family === 'transcript') {
    return [buildTranscriptCarrier(input.pageHtml, input.url, input.now)];
  }
  if (family === 'finaid') {
    return [buildFinaidCarrier(input.pageHtml, input.url, input.now)];
  }
  if (family === 'accounts') {
    return buildAccountsCarrier(input.pageHtml, input.url, input.now);
  }
  if (family === 'profile') {
    return [buildProfileCarrier(input.pageHtml, input.url, input.now)];
  }
  return [buildTuitionDetailCarrier(input.pageHtml, input.url, input.now)];
}
