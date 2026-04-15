import type { ReactNode } from 'react';
import type { WeeklyLoadEntry } from '@campus-copilot/storage';

export function formatDateTime(value: string | undefined) {
  if (!value) {
    return 'No time provided';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatRelativeTime(value: string | undefined) {
  if (!value) {
    return 'Not synced yet';
  }

  const deltaMinutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(deltaMinutes) < 60) {
    return formatter.format(deltaMinutes, 'minute');
  }
  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 48) {
    return formatter.format(deltaHours, 'hour');
  }
  return formatter.format(Math.round(deltaHours / 24), 'day');
}

function formatCountLabel(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function getResourceActionLabel(input: {
  site?: string;
  resourceKind: 'file' | 'link' | 'embed' | 'other';
  downloadUrl?: string;
  source?: { resourceType?: string };
}) {
  if (input.site === 'gradescope' && input.source?.resourceType === 'regrade_requests') {
    return 'Open regrade hub';
  }

  if (input.site === 'edstem') {
    if (input.source?.resourceType === 'lesson_slide') {
      return 'Open slide';
    }
    if (input.source?.resourceType === 'lesson' || input.source?.resourceType === 'lesson_detail') {
      return 'Open lesson';
    }
    if (input.resourceKind === 'file' && input.downloadUrl) {
      return 'Download file';
    }
  }

  switch (input.resourceKind) {
    case 'link':
      return 'Open link';
    case 'embed':
      return 'Open material';
    default:
      return 'Open download';
  }
}

export function formatWeeklyLoadSummary(entry: WeeklyLoadEntry) {
  const highlights: string[] = [];
  if (entry.overdueCount > 0) {
    highlights.push(formatCountLabel(entry.overdueCount, 'overdue item', 'overdue items'));
  }
  if (entry.dueSoonCount > 0) {
    highlights.push(formatCountLabel(entry.dueSoonCount, 'item due within 48 hours', 'items due within 48 hours'));
  }
  if (entry.pinnedCount > 0) {
    highlights.push(formatCountLabel(entry.pinnedCount, 'pinned item', 'pinned items'));
  }
  if ((entry.eventCount ?? 0) > 0) {
    highlights.push(formatCountLabel(entry.eventCount ?? 0, 'calendar item', 'calendar items'));
  }

  const loadBand =
    entry.totalScore >= 200 ? 'High load' : entry.totalScore >= 120 ? 'Moderate load' : entry.totalScore > 0 ? 'Light load' : 'Clear lane';

  return highlights.length > 0 ? `${loadBand}: ${highlights.join(' · ')}.` : `${loadBand}: no new scheduling pressure right now.`;
}

const LOADING_INLINE_COPY = 'Loading shared workbench data...';

export function LoadingInlineState() {
  return (
    <div className="loading-inline-state" aria-busy="true">
      <p>{LOADING_INLINE_COPY}</p>
      <div className="loading-inline-row" />
      <div className="loading-inline-row loading-inline-row--wide" />
      <div className="loading-inline-row" />
    </div>
  );
}

export function ReadyStateBlock({
  ready,
  hasItems,
  children,
  emptyState,
}: {
  ready: boolean;
  hasItems: boolean;
  children: ReactNode;
  emptyState: ReactNode;
}) {
  if (!ready) {
    return <LoadingInlineState />;
  }

  return hasItems ? <>{children}</> : <>{emptyState}</>;
}

export function LoadingStatValue({ ready, value }: { ready: boolean; value: ReactNode }) {
  return ready ? (
    <strong>{value}</strong>
  ) : (
    <strong aria-busy="true">
      <span aria-hidden="true">—</span>
      <span className="sr-only">Loading</span>
    </strong>
  );
}
