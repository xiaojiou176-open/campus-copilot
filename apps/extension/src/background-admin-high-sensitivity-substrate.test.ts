import { describe, expect, it } from 'vitest';
import { extractAdminCarriersFromPageHtml } from './background-admin-high-sensitivity-substrate';

const transcriptHtml = `
  <html><head><title>Academic record summary</title></head><body>
    <th>Class</th><td>Level 4</td><th>Major</th><td>redacted-major</td>
    TOTAL CREDITS EARNED: 101.0 GPA:4.00
    CUM GPA: 0.84
    ACADEMIC STANDING: GOOD STANDING
    WORK IN PROGRESS QTR REGISTERED: 14.0
  </body></html>
`;

const finaidHtml = `
  <html><head><title>Support summary</title></head><body>
    <span>Messages (5)</span>
    <b>Aid status summary: redacted-status-message while we continue processing support.</b>
    <span>Total borrowing</span><span>$15,000</span>
    <span>Estimated monthly payment</span><span>$167</span>
  </body></html>
`;

const finaidLiveStyleHtml = `
  <html><body>
    <b>Student Support Portal | Help | Logout · Registration · Grade Inquiry · Degree Review · Aid Overview</b>
    <div id="divLNItem3"><a href="javascript:displayDiv('Messages');">Messages (5)</a></div>
    <table id="dgMessagesList">
      <tr>
        <td class="facontenttext"><img alt=" For your information."></td>
        <td class="facontenttext"><b>We have received your financial aid application for the year, but have not yet offered you aid.</b></td>
      </tr>
    </table>
    <div id="LoanHistory">
      <span>Total borrowing</span><span>$15,000</span>
      <span>Estimated monthly payment</span><span>$167</span>
    </div>
  </body></html>
`;

const accountsHtml = `
  <html><head><title>Administrative summary</title></head><body>
    <h2>Tuition &amp; Fees</h2>
    <h3>Billing overview</h3><span>$ 0</span><div>Amount Due</div><a href="https://example.invalid/redacted-tuition-statement">Tuition Statement</a>
    <h2>Eligibility</h2><h3>Status</h3><li>eligible</li>
    <h2>Account summary</h2><h3>Account Balance</h3><span>$0.00</span>
    <h2>Library</h2>
  </body></html>
`;

const profileHtml = `
  <html><head><title>Profile - MyUW</title></head><body>
    <h2>Name &amp; Pronouns</h2>
    <h3>Preferred Name</h3><div>Example Student</div>
    <h3>Pronouns</h3><div>He/him/his</div>
    <h3>Local Address</h3><div>Redacted address</div>
    <h2>Email Addresses</h2><div>redacted@example.invalid</div>
    <h3>Emergency Contact 1</h3><div>Emergency Contact A</div>
    <h3>Emergency Contact 2</h3><div>Emergency Contact B</div>
  </body></html>
`;

const tuitionHtml = `
  <html><head><title>Tuition Charge Statement</title></head><body>
    <h1>Official Tuition Charge Statement - Spring 2026</h1>
    <table id="tblBalance">
      <tr><th>Due Date</th><th>Amount</th></tr>
      <tr><td colspan="2"><tt><b>*** $ 0.00 ***</b></tt></td></tr>
    </table>
    <table id="tblClassification">
      <tr><th>Tuition Classification:</th><td>UNDERGRAD RESIDENT</td></tr>
      <tr><th>Credit Hours:</th><td>14</td></tr>
    </table>
    <h3>Detail of Account - Charges and payments beginning: Spring 2026 (3/25/26)</h3>
    <table id="tblDetailOfAccount">
      <tr><th>Date</th><th>Transaction</th><th>Payments</th><th>Charges</th></tr>
      <tr><td><tt>3/30/26</tt></td><td><tt>Tuition</tt></td><td></td><td><tt>4395.00</tt></td></tr>
      <tr><td><tt>3/30/26</tt></td><td><tt>Aid Disbursed to Account</tt></td><td><tt>4468.00</tt></td><td></td></tr>
      <tr><td colspan="2"><tt><b>TOTAL:</b></tt></td><td><tt>4468.00</tt></td><td><tt>4468.00</tt></td><td><tt>BALANCE: $ 0.00</tt></td></tr>
    </table>
    <table id="tblFinancialAid">
      <tr><th>Program</th><th>Amount Offered</th><th>Disbursed to Account</th></tr>
      <tr><td><tt>PEDRIZETTI FAMILY SCHOLARSHIP</tt></td><td><tt>1000.00</tt></td><td><tt>1000.00</tt></td></tr>
      <tr><td><tt>WASHINGTON COLLEGE GRANT</tt></td><td><tt>4260.00</tt></td><td><tt>3468.00</tt></td><td><tt>792.00</tt></td></tr>
      <tr><td><tt><b>TOTAL:</b></tt></td><td><tt>5260.00</tt></td><td><tt>4468.00</tt></td><td><tt>792.00</tt></td><td><tt>UNDISBURSED AID: $ 0.00</tt></td></tr>
    </table>
    <div id="panelTuitionBreakdown"><h3>Tuition Charge Breakdown</h3></div>
  </body></html>
`;

const tuitionLiveStyleHtml = `
  <html><body>
    <h1>Official Tuition Charge Statement - Spring 2026</h1>
    <table id="tblClassification">
      <tr><th>Tuition Classification:</th><td>UNDERGRAD RESIDENT</td></tr>
      <tr><th>Credit Hours:</th><td>14</td></tr>
    </table>
    <table id="tblDetailOfAccount">
      <tr><td><tt><b>TOTAL:</b></tt></td><td><tt>4468.00</tt></td><td><tt>4468.00</tt></td><td><tt>BALANCE: $ 0.00</tt></td></tr>
    </table>
    <table id="tblFinancialAid">
      <tr><th>Program</th><th>Amount Offered</th><th>Disbursement Date</th><th>Disbursed to Check</th><th>Disbursed to Account</th><th>Direct Deposit</th><th>Comments</th></tr>
      <tr><td><tt>PEDRIZETTI FAMILY SCHOLARSHIP</tt></td><td><tt>1000.00</tt></td><td><tt>3/30/26</tt></td><td><tt>0.00</tt></td><td><tt>1000.00</tt></td><td><tt>0.00</tt></td><td></td></tr>
      <tr><td><tt>WASHINGTON COLLEGE GRANT</tt></td><td><tt>4260.00</tt></td><td><tt>3/30/26</tt></td><td><tt>0.00</tt></td><td><tt>3468.00</tt></td><td><tt>792.00</tt></td><td></td></tr>
      <tr><td><tt><b>TOTAL:</b></tt></td><td><tt>5260.00</tt></td><td></td><td><tt>0.00</tt></td><td><tt>4468.00</tt></td><td><tt>792.00</tt></td><td><tt>UNDISBURSED AID: $&nbsp;0.00</tt></td></tr>
    </table>
    <div id="panelTuitionBreakdown"><h3>Tuition Charge Breakdown</h3></div>
  </body></html>
`;

const transcriptLiveStyleHtml = `
  <html><body>
    <table>
      <tr bgcolor="#d0d0d0"><th>Student No</th><th>Birth Date</th><th>Class</th><th>College</th><th>Major</th></tr>
      <tr><td>2582656</td><td>07/31/XX</td><td>JUNIOR</td><td>Arts &amp; Sciences</td><td>COMPUTER SCIENCE</td></tr>
    </table>
    TOTAL CREDITS EARNED:              101.0 GPA:4.00
    CUM GRADED AT:  8.0 GRADE PTS:  17.6  CUM GPA:  2.20
    CUM GRADED AT: 21.0 GRADE PTS:  17.6  CUM GPA:  0.84
    ACADEMIC STANDING: WARNING
    <table><tr><th>WORK IN PROGRESS</th></tr><tr><td><pre>SPRING 2026 C SCI 3
      QTR  REGISTERED:             14.0
    </pre></td></tr></table>
  </body></html>
`;

describe('background admin high-sensitivity substrate', () => {
  it('extracts a transcript summary carrier from transcript html', () => {
    const records = extractAdminCarriersFromPageHtml({
      url: 'https://example.invalid/redacted/untranscript.aspx',
      pageHtml: transcriptHtml,
      now: '2026-04-11T12:00:00-07:00',
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.family).toBe('transcript');
    expect(records[0]?.summary).toContain('101.0');
    expect(records[0]?.summary).toContain('0.84');
  });

  it('extracts a financial-aid summary carrier from finaid html', () => {
    const records = extractAdminCarriersFromPageHtml({
      url: 'https://example.invalid/redacted/finaidstatus.aspx',
      pageHtml: finaidHtml,
      now: '2026-04-11T12:00:00-07:00',
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.family).toBe('finaid');
    expect(records[0]?.summary).toContain('5 message');
    expect(records[0]?.summary).toContain('$15,000');
  });

  it('prefers the first live financial-aid message instead of a generic page header', () => {
    const records = extractAdminCarriersFromPageHtml({
      url: 'https://example.invalid/redacted/finaidstatus.aspx',
      pageHtml: finaidLiveStyleHtml,
      now: '2026-04-21T10:00:00-07:00',
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.summary).toContain('We have received your financial aid application for the year');
    expect(records[0]?.summary).not.toContain('Student Personal Services');
  });

  it('extracts accounts and tuition-detail carriers from accounts html', () => {
    const records = extractAdminCarriersFromPageHtml({
      url: 'https://example.invalid/accounts/',
      pageHtml: accountsHtml,
      now: '2026-04-11T12:00:00-07:00',
    });

    expect(records.map((record) => record.family).sort()).toEqual(['accounts', 'tuition_detail']);
    expect(records.find((record) => record.family === 'accounts')?.summary).toContain('eligible');
    expect(records.find((record) => record.family === 'tuition_detail')?.summary).toContain('$0');
  });

  it('extracts a profile summary carrier from profile html without echoing raw profile values', () => {
    const records = extractAdminCarriersFromPageHtml({
      url: 'https://example.invalid/profile/',
      pageHtml: profileHtml,
      now: '2026-04-11T12:00:00-07:00',
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.family).toBe('profile');
    expect(records[0]?.summary).toContain('preferred-name support');
    expect(records[0]?.summary).toContain('2 emergency contact record');
    expect(records[0]?.summary).not.toContain('Example Student');
    expect(records[0]?.summary).not.toContain('redacted@example.invalid');
  });

  it('extracts a statement-backed tuition summary carrier from tuition html', () => {
    const records = extractAdminCarriersFromPageHtml({
      url: 'https://example.invalid/redacted/tuition.aspx',
      pageHtml: tuitionHtml,
      now: '2026-04-11T12:00:00-07:00',
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.family).toBe('tuition_detail');
    expect(records[0]?.summary).toContain('Spring 2026');
    expect(records[0]?.summary).toContain('UNDERGRAD RESIDENT');
    expect(records[0]?.summary).toContain('14 credit hours');
    expect(records[0]?.summary).toContain('charges $4468.00');
    expect(records[0]?.summary).toContain('payments $4468.00');
    expect(records[0]?.summary).toContain('undisbursed aid $0.00');
    expect(records[0]?.summary).toContain('visible mandatory-fee breakdown');
  });

  it('extracts live tuition disbursement totals from the financial-aid summary row', () => {
    const records = extractAdminCarriersFromPageHtml({
      url: 'https://example.invalid/redacted/tuition.aspx',
      pageHtml: tuitionLiveStyleHtml,
      now: '2026-04-21T10:00:00-07:00',
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.summary).toContain('aid to account $4468.00');
    expect(records[0]?.summary).toContain('undisbursed aid $0.00');
  });

  it('extracts live transcript class, major, cumulative GPA, and registered credits from the transcript table layout', () => {
    const records = extractAdminCarriersFromPageHtml({
      url: 'https://example.invalid/redacted/untranscript.aspx',
      pageHtml: transcriptLiveStyleHtml,
      now: '2026-04-21T10:00:00-07:00',
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.summary).toContain('class JUNIOR');
    expect(records[0]?.summary).toContain('major COMPUTER SCIENCE');
    expect(records[0]?.summary).toContain('cumulative GPA 0.84');
    expect(records[0]?.summary).toContain('14.0 credits currently in progress');
  });
});
