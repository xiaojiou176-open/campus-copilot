interface SnapshotSiteEntity {
  site?: string;
}

interface SnapshotLike {
  generatedAt?: string;
  resources?: SnapshotSiteEntity[];
  assignments?: SnapshotSiteEntity[];
  announcements?: SnapshotSiteEntity[];
  messages?: SnapshotSiteEntity[];
  grades?: SnapshotSiteEntity[];
  events?: SnapshotSiteEntity[];
}

function buildGradescopeSiteView(snapshot: SnapshotLike, limit = 50) {
  const bySite = (entry: SnapshotSiteEntity) => entry?.site === 'gradescope';
  const assignments = Array.isArray(snapshot?.assignments) ? snapshot.assignments.filter(bySite).slice(0, limit) : [];
  const announcements = Array.isArray(snapshot?.announcements) ? snapshot.announcements.filter(bySite).slice(0, limit) : [];
  const messages = Array.isArray(snapshot?.messages) ? snapshot.messages.filter(bySite).slice(0, limit) : [];
  const grades = Array.isArray(snapshot?.grades) ? snapshot.grades.filter(bySite).slice(0, limit) : [];
  const events = Array.isArray(snapshot?.events) ? snapshot.events.filter(bySite).slice(0, limit) : [];
  const resources = Array.isArray(snapshot?.resources) ? snapshot.resources.filter(bySite).slice(0, limit) : [];

  return {
    site: 'gradescope',
    generatedAt: snapshot?.generatedAt,
    counts: {
      resources: resources.length,
      assignments: assignments.length,
      announcements: announcements.length,
      messages: messages.length,
      grades: grades.length,
      events: events.length,
    },
    resources,
    assignments,
    announcements,
    messages,
    grades,
    events,
  };
}

export function buildGradescopeSnapshotView(snapshot: SnapshotLike, limit = 50) {
  return buildGradescopeSiteView(snapshot, limit);
}
