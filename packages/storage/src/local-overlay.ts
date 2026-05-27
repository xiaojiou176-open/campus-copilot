import { openCampusDb, type CampusCopilotDB } from './db.ts';
import {
  LocalEntityOverlayFieldSchema,
  LocalEntityOverlayInputSchema,
  LocalEntityOverlaySchema,
  type LocalEntityOverlay,
  type LocalEntityOverlayField,
  type LocalEntityOverlayInput,
} from './contracts.ts';

function sanitizeNote(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function hasOverlayContent(input: {
  pinnedAt?: string;
  snoozeUntil?: string;
  dismissUntil?: string;
  note?: string;
}) {
  return Boolean(input.pinnedAt || input.snoozeUntil || input.dismissUntil || input.note);
}

function normalizeOverlay(
  existing: LocalEntityOverlay | undefined,
  input: LocalEntityOverlayInput,
): LocalEntityOverlay | undefined {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const nextOverlay = {
    entityId: input.entityId,
    site: input.site,
    kind: input.kind,
    pinnedAt: input.pinnedAt === null ? undefined : input.pinnedAt ?? existing?.pinnedAt,
    snoozeUntil: input.snoozeUntil === null ? undefined : input.snoozeUntil ?? existing?.snoozeUntil,
    dismissUntil: input.dismissUntil === null ? undefined : input.dismissUntil ?? existing?.dismissUntil,
    note: input.note === null ? undefined : sanitizeNote(input.note ?? existing?.note),
    updatedAt,
  };

  if (!hasOverlayContent(nextOverlay)) {
    return undefined;
  }

  return LocalEntityOverlaySchema.parse(nextOverlay);
}

export async function upsertLocalEntityOverlay(input: LocalEntityOverlayInput, db = openCampusDb) {
  const parsedInput = LocalEntityOverlayInputSchema.parse(input);
  const existing = await db.local_entity_overlay.get(parsedInput.entityId);
  const nextOverlay = normalizeOverlay(existing, parsedInput);

  if (!nextOverlay) {
    await db.local_entity_overlay.delete(parsedInput.entityId);
    return undefined;
  }

  await db.local_entity_overlay.put(nextOverlay);
  return nextOverlay;
}

export async function clearLocalEntityOverlayField(
  entityId: string,
  field: LocalEntityOverlayField,
  db: CampusCopilotDB = openCampusDb,
) {
  const parsedField = LocalEntityOverlayFieldSchema.parse(field);
  const existing = await db.local_entity_overlay.get(entityId);
  if (!existing) {
    return undefined;
  }

  const nextOverlay = normalizeOverlay(existing, {
    entityId: existing.entityId,
    site: existing.site,
    kind: existing.kind,
    [parsedField]: null,
    updatedAt: new Date().toISOString(),
  });

  if (!nextOverlay) {
    await db.local_entity_overlay.delete(entityId);
    return undefined;
  }

  await db.local_entity_overlay.put(nextOverlay);
  return nextOverlay;
}

export async function pinEntity(
  entity: Pick<LocalEntityOverlayInput, 'entityId' | 'site' | 'kind'>,
  pinned: boolean,
  db = openCampusDb,
) {
  return upsertLocalEntityOverlay(
    {
      ...entity,
      pinnedAt: pinned ? new Date().toISOString() : null,
    },
    db,
  );
}

export async function snoozeEntity(
  entity: Pick<LocalEntityOverlayInput, 'entityId' | 'site' | 'kind'>,
  snoozeUntil: string | undefined,
  db = openCampusDb,
) {
  return upsertLocalEntityOverlay(
    {
      ...entity,
      snoozeUntil: snoozeUntil ?? null,
    },
    db,
  );
}

export async function dismissEntity(
  entity: Pick<LocalEntityOverlayInput, 'entityId' | 'site' | 'kind'>,
  dismissUntil: string | undefined,
  db = openCampusDb,
) {
  return upsertLocalEntityOverlay(
    {
      ...entity,
      dismissUntil: dismissUntil ?? null,
    },
    db,
  );
}

export async function saveEntityNote(
  entity: Pick<LocalEntityOverlayInput, 'entityId' | 'site' | 'kind'>,
  note: string | undefined,
  db = openCampusDb,
) {
  return upsertLocalEntityOverlay(
    {
      ...entity,
      note: note ?? null,
    },
    db,
  );
}

export async function getLocalEntityOverlayByEntityIds(entityIds: string[], db: CampusCopilotDB = openCampusDb) {
  const overlays = entityIds.length > 0 ? await db.local_entity_overlay.bulkGet(entityIds) : [];
  return overlays.filter((overlay): overlay is LocalEntityOverlay => Boolean(overlay));
}
