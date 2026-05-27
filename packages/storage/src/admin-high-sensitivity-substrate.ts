import { openCampusDb, type OpenCampusDB } from './db.ts';
import { AdminCarrierRecordSchema, type AdminCarrierRecord } from './contracts.ts';

function parseAdminCarriers(records: AdminCarrierRecord[]) {
  return records.map((record) => AdminCarrierRecordSchema.parse(record));
}

export async function upsertAdminCarriers(records: AdminCarrierRecord[], db: OpenCampusDB = openCampusDb) {
  const parsed = parseAdminCarriers(records);
  if (parsed.length === 0) {
    return;
  }
  await db.admin_carriers.bulkPut(parsed);
}

export async function getAdminCarriers(db: OpenCampusDB = openCampusDb) {
  return db.admin_carriers.toArray();
}
