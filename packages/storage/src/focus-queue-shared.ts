import type { SyncState } from './contracts.ts';
import { isWithinHours, makePriorityReason } from './storage-shared.ts';

export function formatReasonDetail(detail: string | undefined) {
  return detail?.trim() ? detail.trim() : undefined;
}

export function formatBlockedResource(resource: string) {
  return `未同步 ${resource}`;
}

const STALE_SYNC_HOURS = 24 * 3;

export function buildSiteSyncContext(syncState: SyncState | undefined, now: string) {
  const blockedBy = (syncState?.resourceFailures ?? []).map((item) => formatBlockedResource(item.resource));

  if (!syncState) {
    return {
      blockedBy,
      extraReason: undefined,
      extraScore: 0,
    };
  }

  if (syncState.lastOutcome === 'partial_success') {
    return {
      blockedBy,
      extraReason: makePriorityReason(
        'sync_stale',
        '该站同步仍有缺口',
        'low',
        undefined,
        `缺失资源：${blockedBy.join(' / ') || '无明确资源名'}。`,
      ),
      extraScore: 15,
    };
  }

  if (syncState.status === 'error') {
    return {
      blockedBy,
      extraReason: makePriorityReason(
        'sync_stale',
        '该站最近一次同步失败',
        'medium',
        undefined,
        formatReasonDetail(syncState.errorReason) ?? '最近一次同步没有成功完成。',
      ),
      extraScore: 35,
    };
  }

  if (syncState.lastSyncedAt && !isWithinHours(syncState.lastSyncedAt, now, STALE_SYNC_HOURS)) {
    return {
      blockedBy,
      extraReason: makePriorityReason(
        'sync_stale',
        '该站同步时间偏旧',
        'low',
        undefined,
        `最近同步时间是 ${syncState.lastSyncedAt}。`,
      ),
      extraScore: 10,
    };
  }

  return {
    blockedBy,
    extraReason: undefined,
    extraScore: 0,
  };
}
