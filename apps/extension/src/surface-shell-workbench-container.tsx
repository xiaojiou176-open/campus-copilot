import { useWorkbenchView } from '@campus-copilot/storage';
import type { WorkbenchPanelsProps } from './workbench-panels-props';
import { WorkbenchPanels } from './workbench-panels';

export function SurfaceShellWorkbenchContainer(
  props: Omit<
    WorkbenchPanelsProps,
    | 'currentRecentUpdates'
    | 'currentResources'
    | 'currentAnnouncements'
    | 'currentAssignments'
    | 'currentMessages'
    | 'currentEvents'
    | 'courseClusters'
    | 'workItemClusters'
    | 'administrativeSummaries'
    | 'mergeHealth'
  > & {
    now: string;
    refreshKey: number;
  },
) {
  const { now, refreshKey, filters, ...rest } = props;
  const workbenchView = useWorkbenchView(now, filters, undefined, refreshKey);

  return (
    <WorkbenchPanels
      {...rest}
      filters={filters}
      currentRecentUpdates={workbenchView?.recentUpdates}
      currentResources={workbenchView?.resources ?? []}
      currentAnnouncements={workbenchView?.announcements ?? []}
      currentAssignments={workbenchView?.assignments ?? []}
      currentMessages={workbenchView?.messages ?? []}
      currentEvents={workbenchView?.events ?? []}
      courseClusters={workbenchView?.courseClusters ?? []}
      workItemClusters={workbenchView?.workItemClusters ?? []}
      administrativeSummaries={workbenchView?.administrativeSummaries ?? []}
      mergeHealth={workbenchView?.mergeHealth}
    />
  );
}
