import { useLiveQuery } from 'dexie-react-hooks';
import type { Site } from '@opencampus/schema';
import { openCampusDb, type OpenCampusDB } from './db.ts';
import type { WorkbenchFilter } from './contracts.ts';
import {
  getAllAnnouncements,
  getAllAssignments,
  getAllCourses,
  getAllEvents,
  getAllGrades,
  getAllMessages,
  getAllResources,
  getAllSiteEntityCounts,
  getEntityCounts,
  getSiteEntityCounts,
} from './query-entities.ts';
import { getAllPlanningSubstrates, getPlanningSubstratesBySource } from './planning-substrate.ts';
import {
  getLatestSyncRunBySite,
  getLatestSyncRuns,
  getLatestSyncState,
  getRecentChangeEvents,
  getSyncStateBySite,
  getSiteSyncStates,
} from './sync-ledger.ts';
import {
  getFocusQueue,
  getPriorityAlerts,
  getRecentUpdates,
  getTodaySnapshot,
  getWeeklyLoad,
  getWorkbenchView,
} from './derived.ts';

export function useEntityCounts(db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getEntityCounts(db), [db, refreshKey]);
}

export function useSyncState(db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getLatestSyncState(db), [db, refreshKey]);
}

export function useSiteSyncStates(db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getSiteSyncStates(db), [db, refreshKey]);
}

export function useLatestSyncRuns(limit = 8, db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getLatestSyncRuns(limit, db), [limit, db, refreshKey]);
}

export function useLatestSyncRunBySite(
  site: Site,
  db: OpenCampusDB = openCampusDb,
  refreshKey?: number,
) {
  return useLiveQuery(() => getLatestSyncRunBySite(site, db), [site, db, refreshKey]);
}

export function useAllAssignments(db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getAllAssignments(db), [db, refreshKey]);
}

export function useAllCourses(db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getAllCourses(db), [db, refreshKey]);
}

export function useAllResources(db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getAllResources(db), [db, refreshKey]);
}

export function useAllAnnouncements(db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getAllAnnouncements(db), [db, refreshKey]);
}

export function useAllMessages(db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getAllMessages(db), [db, refreshKey]);
}

export function useAllGrades(db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getAllGrades(db), [db, refreshKey]);
}

export function useAllEvents(db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getAllEvents(db), [db, refreshKey]);
}

export function useSiteEntityCounts(site: Site, db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getSiteEntityCounts(site, db), [site, db, refreshKey]);
}

export function useAllSiteEntityCounts(db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getAllSiteEntityCounts(db), [db, refreshKey]);
}

export function useSiteSyncState(site: Site, db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getSyncStateBySite(site, db), [site, db, refreshKey]);
}

export function useTodaySnapshot(now: string, db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getTodaySnapshot(now, db), [now, db, refreshKey]);
}

export function usePriorityAlerts(now: string, db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getPriorityAlerts(now, db), [now, db, refreshKey]);
}

export function useRecentUpdates(
  now: string,
  limit = 8,
  db: OpenCampusDB = openCampusDb,
  refreshKey?: number,
) {
  return useLiveQuery(() => getRecentUpdates(now, limit, db), [now, limit, db, refreshKey]);
}

export function useRecentChangeEvents(limit = 20, db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getRecentChangeEvents(limit, db), [limit, db, refreshKey]);
}

export function useFocusQueue(now: string, db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getFocusQueue(now, db), [now, db, refreshKey]);
}

export function useWeeklyLoad(now: string, db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getWeeklyLoad(now, db), [now, db, refreshKey]);
}

export function usePlanningSubstratesBySource(
  source: 'myplan' | 'time-schedule',
  db: OpenCampusDB = openCampusDb,
  refreshKey?: number,
) {
  return useLiveQuery(() => getPlanningSubstratesBySource(source, db), [source, db, refreshKey]);
}

export function useAllPlanningSubstrates(db: OpenCampusDB = openCampusDb, refreshKey?: number) {
  return useLiveQuery(() => getAllPlanningSubstrates(db), [db, refreshKey]);
}

export function useWorkbenchView(
  now: string,
  filters: WorkbenchFilter,
  db: OpenCampusDB = openCampusDb,
  refreshKey?: number,
) {
  return useLiveQuery(() => getWorkbenchView(now, filters, db), [now, filters.site, filters.onlyUnseenUpdates, db, refreshKey]);
}
