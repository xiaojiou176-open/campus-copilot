export const CTCLINK_ALLOWED_PUBLIC_CARRIER = 'public_page_behavior' as const;
export const CTCLINK_SHARED_PROVED_FIELDS = [
  'institution',
  'term',
  'subject',
  'keyword',
  'class_number_search',
  'instructor_last_name_search',
  'meeting_days_search',
  'meeting_time_search',
  'instruction_mode_search',
  'open_classes_only_filter',
] as const;

export const CTCLINK_DEFERRED_FIELDS = [
  'academic_organization_search',
  'location_affordance',
  'availability_status',
  'seat_counts',
  'waitlist_counts',
  'dom_row_schema',
  'shared_schema_promotion',
  'shared_storage_promotion',
  'shared_core_promotion',
  'registration_semantics',
  'identity_finance_records',
] as const;

export const CTCLINK_FORBIDDEN_CLAIMS = [
  'stable_anonymous_json_api',
  'statewide_stable_contract',
  'current_shipped_support',
  'registration_identity_finance_records_expansion',
  'watcher_polling_or_seat_alert_semantics',
] as const;

export type CtcLinkPublicCarrierClass = typeof CTCLINK_ALLOWED_PUBLIC_CARRIER;
export type CtcLinkMachineCarrierClass = 'not_proved' | 'internal_endpoint' | 'one_off_observation';
export type CtcLinkUserFlowStability = 'stable_for_public_user_flow' | 'context_sensitive_public_flow';
export type CtcLinkMachineDeepLinkStatus = 'not_stable_for_stateless_fetch' | 'not_proved';

export interface RawCtcLinkSchoolProofFixture {
  schoolKey: string;
  schoolLabel: string;
  institutionCode: string;
  publicFrontDoorUrls: string[];
  publicFrontDoorStatements: string[];
  publicCarrierClass: CtcLinkPublicCarrierClass;
  publicUserFlowStability: CtcLinkUserFlowStability;
  machineCarrierClass: CtcLinkMachineCarrierClass;
  machineDeepLinkStatus: CtcLinkMachineDeepLinkStatus;
  machineEvidence: string[];
  stableFields: string[];
  deferredFields?: string[];
  forbiddenClaims?: string[];
  evidenceUrls: string[];
  notes?: string[];
}

export interface CtcLinkSchoolProofSnapshot {
  surface: 'ctclink_class_search';
  schoolKey: string;
  schoolLabel: string;
  institutionCode: string;
  readOnly: true;
  publicFrontDoorPresent: true;
  publicCarrierClass: CtcLinkPublicCarrierClass;
  publicUserFlowStability: CtcLinkUserFlowStability;
  machineCarrierClass: CtcLinkMachineCarrierClass;
  machineDeepLinkStatus: CtcLinkMachineDeepLinkStatus;
  prototypeEligible: boolean;
  publicFrontDoorUrls: string[];
  publicFrontDoorStatements: string[];
  stableFields: string[];
  deferredFields: string[];
  forbiddenClaims: string[];
  evidenceUrls: string[];
  machineEvidence: string[];
  notes: string[];
}

export interface CtcLinkNarrowPrototypeDecision {
  surface: 'ctclink_class_search';
  prototypeKind: 'proof_oriented_school_front_door';
  allowed: boolean;
  allowedCarrierClass: CtcLinkPublicCarrierClass | null;
  matchedSchoolKeys: string[];
  blockedSchoolKeys: string[];
  sharedStableFields: string[];
  deferredFields: string[];
  forbiddenClaims: string[];
  rationale: string[];
}

function ensureNonEmptyList(values: string[], label: string) {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  if (normalized.length === 0) {
    throw new Error(`${label} must contain at least one non-empty value`);
  }
  return Array.from(new Set(normalized));
}

function intersectFieldSets(fieldSets: string[][]) {
  if (fieldSets.length === 0) {
    return [];
  }

  return fieldSets.slice(1).reduce((shared, current) => {
    const currentSet = new Set(current);
    return shared.filter((field) => currentSet.has(field));
  }, [...fieldSets[0]!]);
}

export function buildCtcLinkSchoolProof(
  fixture: RawCtcLinkSchoolProofFixture,
): CtcLinkSchoolProofSnapshot {
  if (!fixture.schoolKey.trim()) {
    throw new Error('schoolKey is required');
  }

  if (fixture.publicCarrierClass !== CTCLINK_ALLOWED_PUBLIC_CARRIER) {
    throw new Error(`unsupported public carrier class: ${fixture.publicCarrierClass}`);
  }

  const stableFields = ensureNonEmptyList([...fixture.stableFields], 'stableFields');
  const deferredFields = ensureNonEmptyList(
    [...(fixture.deferredFields ?? CTCLINK_DEFERRED_FIELDS)],
    'deferredFields',
  );
  const forbiddenClaims = ensureNonEmptyList(
    [...(fixture.forbiddenClaims ?? CTCLINK_FORBIDDEN_CLAIMS)],
    'forbiddenClaims',
  );
  const publicFrontDoorUrls = ensureNonEmptyList([...fixture.publicFrontDoorUrls], 'publicFrontDoorUrls');
  const publicFrontDoorStatements = ensureNonEmptyList(
    [...fixture.publicFrontDoorStatements],
    'publicFrontDoorStatements',
  );
  const evidenceUrls = ensureNonEmptyList([...fixture.evidenceUrls], 'evidenceUrls');
  const machineEvidence = ensureNonEmptyList([...fixture.machineEvidence], 'machineEvidence');

  return {
    surface: 'ctclink_class_search',
    schoolKey: fixture.schoolKey,
    schoolLabel: fixture.schoolLabel,
    institutionCode: fixture.institutionCode,
    readOnly: true,
    publicFrontDoorPresent: true,
    publicCarrierClass: fixture.publicCarrierClass,
    publicUserFlowStability: fixture.publicUserFlowStability,
    machineCarrierClass: fixture.machineCarrierClass,
    machineDeepLinkStatus: fixture.machineDeepLinkStatus,
    prototypeEligible: fixture.publicUserFlowStability === 'stable_for_public_user_flow',
    publicFrontDoorUrls,
    publicFrontDoorStatements,
    stableFields,
    deferredFields,
    forbiddenClaims,
    evidenceUrls,
    machineEvidence,
    notes: [...(fixture.notes ?? [])],
  };
}

export function getCtcLinkSharedStableFields(schools: CtcLinkSchoolProofSnapshot[]) {
  return intersectFieldSets(schools.map((school) => school.stableFields));
}

export function buildCtcLinkNarrowPrototypeDecision(schools: CtcLinkSchoolProofSnapshot[]): CtcLinkNarrowPrototypeDecision {
  const eligibleSchools = schools.filter(
    (school) =>
      school.readOnly &&
      school.publicCarrierClass === CTCLINK_ALLOWED_PUBLIC_CARRIER &&
      school.publicUserFlowStability === 'stable_for_public_user_flow',
  );

  const sharedStableFields = getCtcLinkSharedStableFields(eligibleSchools);
  const allowed = eligibleSchools.length >= 2 && sharedStableFields.length > 0;

  return {
    surface: 'ctclink_class_search',
    prototypeKind: 'proof_oriented_school_front_door',
    allowed,
    allowedCarrierClass: allowed ? CTCLINK_ALLOWED_PUBLIC_CARRIER : null,
    matchedSchoolKeys: eligibleSchools.map((school) => school.schoolKey),
    blockedSchoolKeys: schools
      .filter((school) => !eligibleSchools.some((candidate) => candidate.schoolKey === school.schoolKey))
      .map((school) => school.schoolKey),
    sharedStableFields,
    deferredFields: [...CTCLINK_DEFERRED_FIELDS],
    forbiddenClaims: [...CTCLINK_FORBIDDEN_CLAIMS],
    rationale: allowed
      ? [
          'At least two schools prove the same low-risk public page behavior carrier.',
          'The prototype remains proof-oriented and does not package internal endpoints as official APIs.',
          'The package stays isolated from shared schema, storage, and core promotion.',
        ]
      : [
          'Fewer than two schools reached the same stable public carrier class.',
          'Keep school-by-school proof first until the carrier class converges.',
        ],
  };
}
