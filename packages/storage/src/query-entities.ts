import { SiteSchema, type Site } from '@opencampus/schema';
import { campusCopilotDb, type CampusCopilotDB } from './db.ts';
import {
  EntityCountsSchema,
  SiteEntityCountsSchema,
  type EntityCounts,
  type SiteEntityCounts,
} from './contracts.ts';
import { compareNewest } from './storage-shared.ts';

export async function getEntityCounts(db: CampusCopilotDB = campusCopilotDb): Promise<EntityCounts> {
  return EntityCountsSchema.parse({
    courses: await db.courses.count(),
    resources: await db.resources.count(),
    assignments: await db.assignments.count(),
    announcements: await db.announcements.count(),
    messages: await db.messages.count(),
    events: await db.events.count(),
  });
}

export async function getAssignmentsBySite(site: Site, db: CampusCopilotDB = campusCopilotDb) {
  return db.assignments.where('site').equals(site).sortBy('dueAt');
}

export async function getSiteEntityCounts(site: Site, db: CampusCopilotDB = campusCopilotDb): Promise<SiteEntityCounts> {
  return SiteEntityCountsSchema.parse({
    site,
    courses: await db.courses.where('site').equals(site).count(),
    resources: await db.resources.where('site').equals(site).count(),
    assignments: await db.assignments.where('site').equals(site).count(),
    announcements: await db.announcements.where('site').equals(site).count(),
    grades: await db.grades.where('site').equals(site).count(),
    messages: await db.messages.where('site').equals(site).count(),
    events: await db.events.where('site').equals(site).count(),
  });
}

export async function getAllSiteEntityCounts(db: CampusCopilotDB = campusCopilotDb): Promise<SiteEntityCounts[]> {
  return Promise.all(SiteSchema.options.map((site) => getSiteEntityCounts(site, db)));
}

export async function getAllAssignments(db: CampusCopilotDB = campusCopilotDb) {
  const assignments = await db.assignments.toArray();
  return assignments.sort((left, right) => compareNewest(left.dueAt, right.dueAt));
}

export async function getAllCourses(db: CampusCopilotDB = campusCopilotDb) {
  const courses = await db.courses.toArray();
  return courses.sort((left, right) => left.title.localeCompare(right.title));
}

export async function getAllResources(db: CampusCopilotDB = campusCopilotDb) {
  const resources = await db.resources.toArray();
  return resources.sort((left, right) =>
    compareNewest(left.releasedAt ?? left.updatedAt ?? left.createdAt, right.releasedAt ?? right.updatedAt ?? right.createdAt),
  );
}

export async function getAllAnnouncements(db: CampusCopilotDB = campusCopilotDb) {
  const announcements = await db.announcements.toArray();
  return announcements.sort((left, right) => compareNewest(left.postedAt, right.postedAt));
}

export async function getAllMessages(db: CampusCopilotDB = campusCopilotDb) {
  const messages = await db.messages.toArray();
  return messages.sort((left, right) => compareNewest(left.createdAt, right.createdAt));
}

export async function getAllGrades(db: CampusCopilotDB = campusCopilotDb) {
  const grades = await db.grades.toArray();
  return grades.sort((left, right) =>
    compareNewest(left.releasedAt ?? left.gradedAt, right.releasedAt ?? right.gradedAt),
  );
}

export async function getAllEvents(db: CampusCopilotDB = campusCopilotDb) {
  const events = await db.events.toArray();
  return events.sort((left, right) => compareNewest(left.startAt ?? left.endAt, right.startAt ?? right.endAt));
}
