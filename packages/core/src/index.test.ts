import { describe, expect, it } from 'vitest';
import { CanvasSyncOutcomeSchema, createSurfaceSnapshot } from './index';

describe('core contracts', () => {
  it('creates a surface snapshot from canonical storage results', () => {
    const snapshot = createSurfaceSnapshot('sidepanel', {
      courses: 1,
      assignments: 2,
      announcements: 3,
      messages: 0,
      events: 0,
      alerts: 1,
    });

    expect(snapshot.surface).toBe('sidepanel');
    expect(snapshot.counts.assignments).toBe(2);
  });

  it('locks canvas sync outcomes to the allowed contract', () => {
    expect(CanvasSyncOutcomeSchema.parse('success')).toBe('success');
    expect(CanvasSyncOutcomeSchema.parse('unauthorized')).toBe('unauthorized');
    expect(() => CanvasSyncOutcomeSchema.parse('not_a_real_outcome')).toThrow();
  });
});
