import { useLiveQuery } from 'dexie-react-hooks';
import type { Site } from '@campus-copilot/schema';
import {
  campusCopilotDb,
  getAllAnnouncements,
  getAllAssignments,
  getAllEvents,
  getAllGrades,
  getAllMessages,
  getAllSiteEntityCounts,
  getEntityCounts,
  getLatestSyncRunBySite,
  getLatestSyncRuns,
  getLatestSyncState,
  getRecentChangeEvents,
  getSiteEntityCounts,
  getSyncStateBySite,
  getSiteSyncStates,
  type CampusCopilotDB,
  type WorkbenchFilter,
} from './index';
import {
  getFocusQueue,
  getPriorityAlerts,
  getRecentUpdates,
  getTodaySnapshot,
  getWeeklyLoad,
  getWorkbenchView,
} from './derived';

export function useEntityCounts(db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getEntityCounts(db), [db, refreshKey]);
}

export function useSyncState(db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getLatestSyncState(db), [db, refreshKey]);
}

export function useSiteSyncStates(db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getSiteSyncStates(db), [db, refreshKey]);
}

export function useLatestSyncRuns(limit = 8, db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getLatestSyncRuns(limit, db), [limit, db, refreshKey]);
}

export function useLatestSyncRunBySite(
  site: Site,
  db: CampusCopilotDB = campusCopilotDb,
  refreshKey?: number,
) {
  return useLiveQuery(() => getLatestSyncRunBySite(site, db), [site, db, refreshKey]);
}

export function useAllAssignments(db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getAllAssignments(db), [db, refreshKey]);
}

export function useAllAnnouncements(db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getAllAnnouncements(db), [db, refreshKey]);
}

export function useAllMessages(db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getAllMessages(db), [db, refreshKey]);
}

export function useAllGrades(db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getAllGrades(db), [db, refreshKey]);
}

export function useAllEvents(db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getAllEvents(db), [db, refreshKey]);
}

export function useSiteEntityCounts(site: Site, db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getSiteEntityCounts(site, db), [site, db, refreshKey]);
}

export function useAllSiteEntityCounts(db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getAllSiteEntityCounts(db), [db, refreshKey]);
}

export function useSiteSyncState(site: Site, db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getSyncStateBySite(site, db), [site, db, refreshKey]);
}

export function useTodaySnapshot(now: string, db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getTodaySnapshot(now, db), [now, db, refreshKey]);
}

export function usePriorityAlerts(now: string, db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getPriorityAlerts(now, db), [now, db, refreshKey]);
}

export function useRecentUpdates(
  now: string,
  limit = 8,
  db: CampusCopilotDB = campusCopilotDb,
  refreshKey?: number,
) {
  return useLiveQuery(() => getRecentUpdates(now, limit, db), [now, limit, db, refreshKey]);
}

export function useRecentChangeEvents(limit = 20, db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getRecentChangeEvents(limit, db), [limit, db, refreshKey]);
}

export function useFocusQueue(now: string, db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getFocusQueue(now, db), [now, db, refreshKey]);
}

export function useWeeklyLoad(now: string, db: CampusCopilotDB = campusCopilotDb, refreshKey?: number) {
  return useLiveQuery(() => getWeeklyLoad(now, db), [now, db, refreshKey]);
}

export function useWorkbenchView(
  now: string,
  filters: WorkbenchFilter,
  db: CampusCopilotDB = campusCopilotDb,
  refreshKey?: number,
) {
  return useLiveQuery(() => getWorkbenchView(now, filters, db), [now, filters.site, filters.onlyUnseenUpdates, db, refreshKey]);
}
