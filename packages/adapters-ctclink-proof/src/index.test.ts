import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CTCLINK_ALLOWED_PUBLIC_CARRIER,
  CTCLINK_DEFERRED_FIELDS,
  CTCLINK_FORBIDDEN_CLAIMS,
  CTCLINK_SHARED_PROVED_FIELDS,
  buildCtcLinkNarrowPrototypeDecision,
  buildCtcLinkSchoolProof,
  getCtcLinkSharedStableFields,
  type RawCtcLinkSchoolProofFixture,
} from './index';

function readFixture(relativePath: string) {
  return JSON.parse(
    readFileSync(new URL(`./__fixtures__/redacted/${relativePath}`, import.meta.url), 'utf8'),
  ) as RawCtcLinkSchoolProofFixture;
}

describe('ctcLink proof package', () => {
  it('normalizes Bellevue into a public-front-door proof snapshot without overclaiming a machine carrier', () => {
    const bellevue = buildCtcLinkSchoolProof(readFixture('bellevue-proof.json'));

    expect(bellevue.schoolKey).toBe('bellevue');
    expect(bellevue.publicFrontDoorPresent).toBe(true);
    expect(bellevue.publicCarrierClass).toBe(CTCLINK_ALLOWED_PUBLIC_CARRIER);
    expect(bellevue.publicUserFlowStability).toBe('stable_for_public_user_flow');
    expect(bellevue.machineCarrierClass).toBe('not_proved');
    expect(bellevue.machineDeepLinkStatus).toBe('not_stable_for_stateless_fetch');
    expect(bellevue.stableFields).toEqual(
      expect.arrayContaining([
        'term',
        'subject',
        'keyword',
        'instruction_mode_search',
        'availability_status',
      ]),
    );
  });

  it('normalizes North Seattle into the same public carrier class while keeping machine deep links out of the proof contract', () => {
    const northSeattle = buildCtcLinkSchoolProof(readFixture('north-seattle-proof.json'));

    expect(northSeattle.schoolKey).toBe('north_seattle');
    expect(northSeattle.publicCarrierClass).toBe(CTCLINK_ALLOWED_PUBLIC_CARRIER);
    expect(northSeattle.publicUserFlowStability).toBe('stable_for_public_user_flow');
    expect(northSeattle.machineCarrierClass).toBe('not_proved');
    expect(northSeattle.machineDeepLinkStatus).toBe('not_stable_for_stateless_fetch');
    expect(northSeattle.stableFields).toEqual(
      expect.arrayContaining([
        'term',
        'subject',
        'class_number_search',
        'meeting_days_search',
        'location_affordance',
      ]),
    );
  });

  it('keeps Green River in the proof packet while excluding it from the prototype bar because the downstream flow is still context-sensitive', () => {
    const greenRiver = buildCtcLinkSchoolProof(readFixture('green-river-proof.json'));

    expect(greenRiver.publicFrontDoorPresent).toBe(true);
    expect(greenRiver.publicCarrierClass).toBe(CTCLINK_ALLOWED_PUBLIC_CARRIER);
    expect(greenRiver.publicUserFlowStability).toBe('context_sensitive_public_flow');
    expect(greenRiver.machineCarrierClass).toBe('one_off_observation');
    expect(greenRiver.prototypeEligible).toBe(false);
  });

  it('computes the shared stable field set across the two schools that satisfy the narrow prototype bar', () => {
    const eligibleSchools = [
      buildCtcLinkSchoolProof(readFixture('bellevue-proof.json')),
      buildCtcLinkSchoolProof(readFixture('north-seattle-proof.json')),
    ];

    expect(getCtcLinkSharedStableFields(eligibleSchools)).toEqual([...CTCLINK_SHARED_PROVED_FIELDS]);
  });

  it('allows a proof-oriented narrow prototype once two schools prove the same low-risk public carrier class', () => {
    const decision = buildCtcLinkNarrowPrototypeDecision([
      buildCtcLinkSchoolProof(readFixture('bellevue-proof.json')),
      buildCtcLinkSchoolProof(readFixture('north-seattle-proof.json')),
      buildCtcLinkSchoolProof(readFixture('green-river-proof.json')),
    ]);

    expect(decision.allowed).toBe(true);
    expect(decision.allowedCarrierClass).toBe(CTCLINK_ALLOWED_PUBLIC_CARRIER);
    expect(decision.matchedSchoolKeys).toEqual(['bellevue', 'north_seattle']);
    expect(decision.blockedSchoolKeys).toEqual(['green_river']);
    expect(decision.sharedStableFields).toEqual([...CTCLINK_SHARED_PROVED_FIELDS]);
    expect(decision.deferredFields).toEqual([...CTCLINK_DEFERRED_FIELDS]);
    expect(decision.forbiddenClaims).toEqual([...CTCLINK_FORBIDDEN_CLAIMS]);
  });

  it('rejects an invalid fixture that tries to erase stable fields', () => {
    expect(() =>
      buildCtcLinkSchoolProof({
        schoolKey: 'invalid',
        schoolLabel: 'Invalid School',
        institutionCode: 'WA000',
        publicFrontDoorUrls: ['https://example.edu/class-search'],
        publicFrontDoorStatements: ['public front door exists'],
        publicCarrierClass: 'public_page_behavior',
        publicUserFlowStability: 'stable_for_public_user_flow',
        machineCarrierClass: 'not_proved',
        machineDeepLinkStatus: 'not_stable_for_stateless_fetch',
        machineEvidence: ['stateless deep-link falls into login/error html'],
        stableFields: [],
        evidenceUrls: ['https://example.edu/class-search'],
      }),
    ).toThrow(/stableFields/);
  });
});
