import type { ImportedWorkbenchSnapshot } from '@campus-copilot/storage';
import { buildSiteOverview, type SiteOverview } from '@campus-copilot/workspace-sdk';

export async function getCanvasOverview(snapshot: ImportedWorkbenchSnapshot) {
  return buildSiteOverview(snapshot, 'canvas');
}

export async function getGradescopeOverview(snapshot: ImportedWorkbenchSnapshot) {
  return buildSiteOverview(snapshot, 'gradescope');
}

export async function getEdstemOverview(snapshot: ImportedWorkbenchSnapshot) {
  return buildSiteOverview(snapshot, 'edstem');
}

export async function getMyUwOverview(snapshot: ImportedWorkbenchSnapshot) {
  return buildSiteOverview(snapshot, 'myuw');
}

export const SITE_TOOLBOX_ORDER = ['canvas', 'gradescope', 'edstem', 'myuw', 'time-schedule'] as const;
export type SiteToolboxSite = (typeof SITE_TOOLBOX_ORDER)[number];

export async function getSiteOverview(
  snapshot: ImportedWorkbenchSnapshot,
  site: SiteToolboxSite,
): Promise<SiteOverview> {
  return buildSiteOverview(snapshot, site);
}
