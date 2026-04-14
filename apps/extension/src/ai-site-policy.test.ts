import { describe, expect, it } from 'vitest';
import { getAiSitePolicyOverlay } from './ai-site-policy';

describe('ai site policy overlay', () => {
  it('keeps EdStem resources and lesson summaries in the structured allowlist', () => {
    expect(getAiSitePolicyOverlay('edstem')).toEqual({
      site: 'edstem',
      siteLabel: 'EdStem',
      allowedFamilies: ['threads', 'announcements', 'course links', 'resource metadata', 'lesson summaries'],
      exportOnlyFamilies: ['thread attachments', 'raw lesson bodies', 'raw resource files'],
      forbiddenAiObjects: ['private draft replies', 'raw attachment bodies', 'hidden thread content', 'raw lesson bodies', 'raw resource files'],
      carrierHonesty:
        'Treat EdStem as a read-only classroom discussion and course-resource carrier; shared lesson/resource summaries are allowed, but this repo still does not claim official LMS parity or raw material ingestion.',
      operatorNote:
        'EdStem answers should focus on structured discussion context, resource metadata, and lesson-summary signals while keeping task-detail and grouped-material gaps explicit.',
    });
  });
});
