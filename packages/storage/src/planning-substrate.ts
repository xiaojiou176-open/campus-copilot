import { campusCopilotDb, type CampusCopilotDB } from './db.ts';
import { PlanningSubstrateOwnerSchema, type PlanningSubstrateOwner, type PlanningSubstrateSource } from './contracts.ts';
import { recomputeClusterSubstrate } from './cluster-substrate.ts';

function parsePlanningSubstrates(records: PlanningSubstrateOwner[]) {
  return records.map((record) => PlanningSubstrateOwnerSchema.parse(record));
}

export async function putPlanningSubstrates(records: PlanningSubstrateOwner[], db: CampusCopilotDB = campusCopilotDb) {
  await db.planning_substrates.bulkPut(parsePlanningSubstrates(records));
  await recomputeClusterSubstrate(db);
}

export async function replacePlanningSubstratesBySource(
  source: PlanningSubstrateSource,
  records: PlanningSubstrateOwner[],
  db: CampusCopilotDB = campusCopilotDb,
) {
  const parsed = parsePlanningSubstrates(records).filter((record) => record.source === source);
  await db.transaction('rw', [db.planning_substrates], async () => {
    await db.planning_substrates.where('source').equals(source).delete();
    if (parsed.length > 0) {
      await db.planning_substrates.bulkPut(parsed);
    }
  });
  await recomputeClusterSubstrate(db);
}

export async function getPlanningSubstratesBySource(
  source: PlanningSubstrateSource,
  db: CampusCopilotDB = campusCopilotDb,
) {
  return db.planning_substrates.where('source').equals(source).toArray();
}

export async function getAllPlanningSubstrates(db: CampusCopilotDB = campusCopilotDb) {
  return db.planning_substrates.toArray();
}

export async function getLatestPlanningSubstrateBySource(
  source: PlanningSubstrateSource,
  db: CampusCopilotDB = campusCopilotDb,
) {
  const records = await getPlanningSubstratesBySource(source, db);
  return [...records].sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))[0];
}
