import {
  TodaySnapshotSchema,
  WorkbenchFilterSchema,
  WorkbenchViewSchema,
  campusCopilotDb,
  type CampusCopilotDB,
  type TodaySnapshot,
  type WorkbenchFilter,
  type WorkbenchView,
} from './index';
import { getPriorityAlerts, getRecentUpdates } from './derived-alerts-and-updates';
import {
  isAssignmentOpen,
  isEntryUnseen,
  isWithinHours,
  isWithinUpcomingHours,
  matchesSiteFilter,
} from './derived-shared';

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
  const [assignments, announcements, messages, grades, events, alerts, recentUpdates, entityStates] = await Promise.all([
    db.assignments.toArray(),
    db.announcements.toArray(),
    db.messages.toArray(),
    db.grades.toArray(),
    db.events.toArray(),
    getPriorityAlerts(now, db),
    getRecentUpdates(now, 20, db),
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

  return WorkbenchViewSchema.parse({
    filters: parsedFilters,
    assignments: matchesSiteFilter(assignments, parsedFilters.site),
    announcements: matchesSiteFilter(announcements, parsedFilters.site),
    messages: matchesSiteFilter(messages, parsedFilters.site),
    grades: matchesSiteFilter(grades, parsedFilters.site),
    events: matchesSiteFilter(events, parsedFilters.site),
    alerts: matchesSiteFilter(alerts, parsedFilters.site),
    recentUpdates: {
      items: filteredRecentUpdates,
      unseenCount: filteredRecentUpdates.filter((entry) => isEntryUnseen(entry, stateMap)).length,
    },
  });
}
