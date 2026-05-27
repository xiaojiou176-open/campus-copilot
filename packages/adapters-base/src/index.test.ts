import { describe, expect, it } from 'vitest';
import { runCollectorPipeline, type AdapterContext, type ResourceCollector } from './index';

const ctx: AdapterContext = {
  url: 'https://canvas.example.edu/courses/1',
  site: 'canvas',
  now: '2026-03-24T18:00:00-07:00',
};

describe('adapters-base pipeline', () => {
  it('runs collectors in API -> state -> DOM order', async () => {
    const execution: string[] = [];

    const collectors: ResourceCollector<string>[] = [
      {
        name: 'DomCollector',
        resource: 'assignments',
        mode: 'dom',
        priority: 30,
        supports: async () => true,
        collect: async () => {
          execution.push('dom');
          return ['dom'];
        },
      },
      {
        name: 'ApiCollector',
        resource: 'assignments',
        mode: 'official_api',
        priority: 10,
        supports: async () => true,
        collect: async () => {
          execution.push('api');
          throw new Error('api_failed');
        },
      },
      {
        name: 'StateCollector',
        resource: 'assignments',
        mode: 'state',
        priority: 20,
        supports: async () => true,
        collect: async () => {
          execution.push('state');
          return ['state'];
        },
      },
    ];

    const result = await runCollectorPipeline(ctx, collectors);
    expect(execution).toEqual(['api', 'state']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.winningMode).toBe('state');
      expect(result.items).toEqual(['state']);
    }
  });

  it('skips collectors whose supports returns false', async () => {
    const result = await runCollectorPipeline(ctx, [
      {
        name: 'UnsupportedApiCollector',
        resource: 'assignments',
        mode: 'official_api',
        priority: 10,
        supports: async () => false,
        collect: async () => ['should-not-run'],
      },
      {
        name: 'DomCollector',
        resource: 'assignments',
        mode: 'dom',
        priority: 20,
        supports: async () => true,
        collect: async () => ['dom'],
      },
    ]);

    expect(result.ok).toBe(true);
    expect(result.attempts[0]?.skipped).toBe(true);
  });

  it('continues after collector failures and records metadata', async () => {
    const result = await runCollectorPipeline(ctx, [
      {
        name: 'PrivateCollector',
        resource: 'assignments',
        mode: 'private_api',
        priority: 10,
        supports: async () => true,
        collect: async () => {
          throw new Error('private_request_failed');
        },
      },
      {
        name: 'DomCollector',
        resource: 'assignments',
        mode: 'dom',
        priority: 20,
        supports: async () => true,
        collect: async () => ['dom-result'],
      },
    ]);

    expect(result.ok).toBe(true);
    expect(result.attempts[0]?.errorReason).toBe('private_request_failed');
    if (result.ok) {
      expect(result.winningCollector).toBe('DomCollector');
    }
  });

  it('returns a structured failure when all collectors fail', async () => {
    const result = await runCollectorPipeline(ctx, [
      {
        name: 'StateCollector',
        resource: 'assignments',
        mode: 'state',
        priority: 10,
        supports: async () => true,
        collect: async () => {
          throw new Error('state_failed');
        },
      },
      {
        name: 'DomCollector',
        resource: 'assignments',
        mode: 'dom',
        priority: 20,
        supports: async () => true,
        collect: async () => {
          throw new Error('dom_failed');
        },
      },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorReason).toBe('all_collectors_failed');
      expect(result.attempts).toHaveLength(2);
    }
  });
});
