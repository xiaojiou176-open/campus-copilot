import { campusCopilotDb, type CampusCopilotDB } from './db.ts';
import {
  ClusterReviewDecisionSchema,
  ClusterReviewOverrideSchema,
  ClusterReviewTargetKindSchema,
  type ClusterReviewDecision,
  type ClusterReviewOverride,
  type ClusterReviewTargetKind,
} from './contracts.ts';
import { recomputeClusterSubstrate } from './cluster-substrate.ts';

function makeOverrideId(targetKind: ClusterReviewTargetKind, targetId: string) {
  return `cluster-review:${targetKind}:${targetId}`;
}

export async function getClusterReviewOverrides(db: CampusCopilotDB = campusCopilotDb) {
  return db.cluster_review_overrides.toArray();
}

export async function setClusterReviewDecision(
  input: {
    targetKind: ClusterReviewTargetKind;
    targetId: string;
    decision: ClusterReviewDecision;
  },
  db: CampusCopilotDB = campusCopilotDb,
) {
  const targetKind = ClusterReviewTargetKindSchema.parse(input.targetKind);
  const decision = ClusterReviewDecisionSchema.parse(input.decision);
  const nextOverride = ClusterReviewOverrideSchema.parse({
    id: makeOverrideId(targetKind, input.targetId),
    targetKind,
    targetId: input.targetId,
    decision,
    decidedAt: new Date().toISOString(),
  });

  await db.cluster_review_overrides.put(nextOverride);
  await recomputeClusterSubstrate(db);
  return nextOverride;
}

export async function clearClusterReviewDecision(
  input: {
    targetKind: ClusterReviewTargetKind;
    targetId: string;
  },
  db: CampusCopilotDB = campusCopilotDb,
) {
  const targetKind = ClusterReviewTargetKindSchema.parse(input.targetKind);
  await db.cluster_review_overrides.delete(makeOverrideId(targetKind, input.targetId));
  await recomputeClusterSubstrate(db);
}

export function applyClusterReviewOverrides<T extends { id: string }>(
  targetKind: ClusterReviewTargetKind,
  clusters: T[],
  overrides: ClusterReviewOverride[],
) {
  const overrideMap = new Map(
    overrides.filter((override) => override.targetKind === targetKind).map((override) => [override.targetId, override]),
  );

  return clusters.map((cluster) => {
    const override = overrideMap.get(cluster.id);
    if (!override) {
      return cluster;
    }

    return {
      ...cluster,
      reviewDecision: override.decision,
      reviewDecidedAt: override.decidedAt,
    };
  });
}
