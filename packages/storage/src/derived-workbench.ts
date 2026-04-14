import {
  TodaySnapshotSchema,
  WorkbenchFilterSchema,
  WorkbenchViewSchema,
  type TodaySnapshot,
  type WorkbenchFilter,
  type WorkbenchView,
} from './contracts.ts';
import { campusCopilotDb, type CampusCopilotDB } from './db.ts';
import { getPriorityAlerts, getRecentUpdates } from './derived-alerts-and-updates.ts';
import {
  isAssignmentOpen,
  isEntryUnseen,
  isWithinHours,
  isWithinUpcomingHours,
  matchesSiteFilter,
} from './storage-shared.ts';
import { getAllPlanningSubstrates } from './planning-substrate.ts';
import { getAdministrativeSummaries, getAllCourseClusters, getAllWorkItemClusters, getMergeHealthSummary } from './cluster-substrate.ts';

export async function getTodaySnapshot(now: string, db: CampusCopilotDB = campusCopilotDb): Promise<TodaySnapshot> {
  const [assignments, grades, syncStates, recentUpdates, alerts] = await Promise.all([
    db.assignments.toArray(),
    db.grades.toArray(),
    db.sync_state.toArray(),
    getRecentUpdates(now, 20, db),
    getPriorityAlerts(now, db),
  ]);

  const openAssignments = assignments.filter((assignment) => isAssignmentOpen(assignment));
  const dueSoonAssignments = openAssignments.filter((assignment) => isWithinUpcomingHours(assignment.dueAt, now, 48));
  const newGrades = grades.filter((grade) => isWithinHours(grade.releasedAt ?? grade.gradedAt, now, 24 * 7));
  const syncedSites = syncStates.filter((state) => state.status === 'success').length;

  return TodaySnapshotSchema.parse({
    totalAssignments: openAssignments.length,
    dueSoonAssignments: dueSoonAssignments.length,
    recentUpdates: recentUpdates.items.length,
    newGrades: newGrades.length,
    riskAlerts: alerts.length,
    syncedSites,
  });
}

export async function getWorkbenchView(
  now: string,
  filters: WorkbenchFilter,
  db: CampusCopilotDB = campusCopilotDb,
): Promise<WorkbenchView> {
  const parsedFilters = WorkbenchFilterSchema.parse(filters);
  const [
    resources,
    assignments,
    announcements,
    messages,
    grades,
    events,
    alerts,
    recentUpdates,
    planningSubstrates,
    courseClusters,
    workItemClusters,
    administrativeSummaries,
    mergeHealth,
    entityStates,
  ] =
    await Promise.all([
      db.resources.toArray(),
      db.assignments.toArray(),
      db.announcements.toArray(),
      db.messages.toArray(),
      db.grades.toArray(),
      db.events.toArray(),
      getPriorityAlerts(now, db),
      getRecentUpdates(now, 20, db),
      parsedFilters.site === 'all' ? getAllPlanningSubstrates(db) : Promise.resolve([]),
      getAllCourseClusters(db),
      getAllWorkItemClusters(db),
      getAdministrativeSummaries(db),
      getMergeHealthSummary(db),
      db.entity_state.toArray(),
    ]);

  const stateMap = new Map(entityStates.map((state) => [state.entityId, state]));
  const filteredRecentUpdates = recentUpdates.items.filter((entry) => {
    const matchesSite = parsedFilters.site === 'all' || entry.site === parsedFilters.site;
    if (!matchesSite) {
      return false;
    }

    return parsedFilters.onlyUnseenUpdates ? isEntryUnseen(entry, stateMap) : true;
  });
  const orderedPlanningSubstrates = [...planningSubstrates].sort((left, right) =>
    right.capturedAt.localeCompare(left.capturedAt),
  );
  const siteFilter = parsedFilters.site === 'all' ? undefined : parsedFilters.site;
  const filteredCourseClusters =
    siteFilter == null ? courseClusters : courseClusters.filter((cluster) => cluster.relatedSites.includes(siteFilter));
  const filteredWorkItemClusters =
    siteFilter == null ? workItemClusters : workItemClusters.filter((cluster) => cluster.relatedSites.includes(siteFilter));
  const filteredAdministrativeSummaries =
    siteFilter == null ? administrativeSummaries : administrativeSummaries.filter((summary) => summary.sourceSurface === siteFilter);

  return WorkbenchViewSchema.parse({
    filters: parsedFilters,
    resources: matchesSiteFilter(resources, parsedFilters.site),
    assignments: matchesSiteFilter(assignments, parsedFilters.site),
    announcements: matchesSiteFilter(announcements, parsedFilters.site),
    messages: matchesSiteFilter(messages, parsedFilters.site),
    grades: matchesSiteFilter(grades, parsedFilters.site),
    events: matchesSiteFilter(events, parsedFilters.site),
    alerts: matchesSiteFilter(alerts, parsedFilters.site),
    planningSubstrates: orderedPlanningSubstrates,
    courseClusters: filteredCourseClusters,
    workItemClusters: filteredWorkItemClusters,
    administrativeSummaries: filteredAdministrativeSummaries,
    mergeHealth,
    recentUpdates: {
      items: filteredRecentUpdates,
      unseenCount: filteredRecentUpdates.filter((entry) => isEntryUnseen(entry, stateMap)).length,
    },
  });
}
