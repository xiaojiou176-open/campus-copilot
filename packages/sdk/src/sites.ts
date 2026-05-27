import type { Site } from '@campus-copilot/schema';
import type { ImportedWorkbenchSnapshot } from './snapshot.ts';
import { selectSiteSnapshot } from './snapshot.ts';

export function getCanvasAssignments(snapshot: ImportedWorkbenchSnapshot) {
  return selectSiteSnapshot(snapshot, 'canvas').assignments;
}

export function getGradescopeAssignments(snapshot: ImportedWorkbenchSnapshot) {
  return selectSiteSnapshot(snapshot, 'gradescope').assignments;
}

export function getEdStemMessages(snapshot: ImportedWorkbenchSnapshot) {
  return selectSiteSnapshot(snapshot, 'edstem').messages;
}

export function getMyUwEvents(snapshot: ImportedWorkbenchSnapshot) {
  return selectSiteSnapshot(snapshot, 'myuw').events;
}

export function getSiteRecords(snapshot: ImportedWorkbenchSnapshot, site: Site) {
  return selectSiteSnapshot(snapshot, site);
}
