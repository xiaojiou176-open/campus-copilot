import type { Dispatch, SetStateAction } from 'react';
import type { ExportPreset } from '@campus-copilot/exporter';
import type { SiteSyncOutcome } from '@campus-copilot/core';
import type { Alert, Announcement, Assignment, EntityKind, Event, Message, Resource, Site } from '@campus-copilot/schema';
import type {
  ChangeEvent,
  FocusQueueItem,
  RecentUpdatesFeed,
  SyncRun,
  TodaySnapshot,
  WeeklyLoadEntry,
  WorkbenchFilter,
} from '@campus-copilot/storage';
import type { ResolvedUiLanguage } from './i18n';
import type { DiagnosticsSummary } from './diagnostics';
import type { OrderedSiteStatusEntry, SurfaceKind } from './surface-shell-model';
import type { UiText } from './surface-shell-view-helpers';

export interface WorkbenchPanelsProps {
  surface: SurfaceKind;
  copy: {
    eyebrow: string;
    title: string;
    description: string;
  };
  text: UiText;
  uiLanguage: ResolvedUiLanguage;
  selectedFormatLabel?: string;
  filters: WorkbenchFilter;
  setFilters: Dispatch<SetStateAction<WorkbenchFilter>>;
  todaySnapshot?: TodaySnapshot;
  currentRecentUpdates?: RecentUpdatesFeed;
  syncFeedback: {
    inFlightSite?: Site;
    outcome?: SiteSyncOutcome;
    message?: string;
  };
  exportFeedback?: string;
  currentSiteSelection?: Site;
  onSyncSite: (site: Site) => Promise<void>;
  onExport: (preset: ExportPreset) => Promise<void>;
  onOpenConfiguration: () => void;
  onMarkVisibleUpdatesSeen: () => Promise<void>;
  onExportDiagnostics: () => Promise<void>;
  diagnostics: DiagnosticsSummary;
  focusQueue: FocusQueueItem[];
  weeklyLoad: WeeklyLoadEntry[];
  priorityAlerts: Alert[];
  criticalAlerts: Alert[];
  highAlerts: Alert[];
  mediumAlerts: Alert[];
  currentResources: Resource[];
  currentAnnouncements: Announcement[];
  currentAssignments: Assignment[];
  currentMessages: Message[];
  currentEvents: Event[];
  orderedSiteStatus: OrderedSiteStatusEntry[];
  recentChangeEvents: ChangeEvent[];
  latestSyncRun?: SyncRun;
  lastSuccessfulSync?: string;
  onTogglePin: (input: { entityId: string; site: Site; kind: EntityKind; pinned: boolean }) => Promise<void>;
  onSnooze: (input: { entityId: string; site: Site; kind: EntityKind }) => Promise<void>;
  onDismiss: (input: { entityId: string; site: Site; kind: EntityKind }) => Promise<void>;
  onNote: (input: { entityId: string; site: Site; kind: EntityKind; title: string; note?: string }) => Promise<void>;
}
