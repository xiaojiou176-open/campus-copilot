import { describe, expect, it } from 'vitest';
import { getAiSitePolicyOverlay } from './ai-site-policy';

describe('ai site policy overlay', () => {
  it('keeps Canvas landed resource metadata in the structured allowlist without widening raw-material access', () => {
    expect(getAiSitePolicyOverlay('canvas')).toEqual({
      site: 'canvas',
      siteLabel: 'Canvas',
      allowedFamilies: ['assignments', 'announcements', 'grades', 'calendar', 'resource metadata'],
      exportOnlyFamilies: ['course_material_excerpt'],
      forbiddenAiObjects: ['unfinished assignment detail pages', 'raw course files', 'raw submission payloads'],
      carrierHonesty:
        'Treat Canvas data as a read-only campus carrier and never present session-backed paths as official public APIs.',
      operatorNote:
        'Canvas answers should stay grounded in structured entities, cited exports, and explicit trust gaps while treating landed module/group/media carriers as resource metadata instead of raw course material access.',
    });
  });

  it('keeps EdStem resources and lesson summaries in the structured allowlist', () => {
    expect(getAiSitePolicyOverlay('edstem')).toEqual({
      site: 'edstem',
      siteLabel: 'EdStem',
      allowedFamilies: ['threads', 'announcements', 'course links', 'resource metadata', 'resource groups', 'lesson details'],
      exportOnlyFamilies: ['thread attachments', 'raw lesson bodies', 'raw resource files'],
      forbiddenAiObjects: ['private draft replies', 'raw attachment bodies', 'hidden thread content', 'raw lesson bodies', 'raw resource files'],
      carrierHonesty:
        'Treat EdStem as a read-only classroom discussion and course-resource carrier; shared lesson/resource summaries are allowed, but this repo still does not claim official LMS parity or raw material ingestion.',
      operatorNote:
        'EdStem answers should focus on structured discussion context, resource metadata, resource-group signals, and lesson-detail signals while keeping broader grouped-material semantics explicit.',
    });
  });
});
