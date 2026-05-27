import {
  AcademicRedZoneSurfaceSchema,
  getAcademicAiCallerGuardrails as getSharedAcademicAiCallerGuardrails,
  getAcademicRedZoneUiGuard as getSharedAcademicRedZoneUiGuard,
  getAcademicRedZoneUiGuards as getSharedAcademicRedZoneUiGuards,
  type AcademicAiCallerGuardrails as SharedAcademicAiCallerGuardrails,
  type AcademicRedZoneUiGuard as SharedAcademicRedZoneUiGuard,
} from '@campus-copilot/ai';

const SHARED_RED_ZONE_REGISTER_GUARD = getSharedAcademicRedZoneUiGuard('register-uw');

export const RED_ZONE_HARD_STOP_HEADING = SHARED_RED_ZONE_REGISTER_GUARD.title;
export const RED_ZONE_HARD_STOP_REASON = SHARED_RED_ZONE_REGISTER_GUARD.reason;
export const RED_ZONE_HARD_STOP_MANUAL_NOTE = SHARED_RED_ZONE_REGISTER_GUARD.manualOnlyNote;
export const RED_ZONE_HARD_STOP_DOC_LABEL = SHARED_RED_ZONE_REGISTER_GUARD.docsLabel;

export const ACADEMIC_RED_ZONE_SURFACES = [...AcademicRedZoneSurfaceSchema.options] as const;

export type AcademicRedZoneSurface = (typeof ACADEMIC_RED_ZONE_SURFACES)[number];
export type AcademicRedZoneHardStop = SharedAcademicRedZoneUiGuard & {
  manualNote: SharedAcademicRedZoneUiGuard['manualOnlyNote'];
};
export type AcademicAiCallerGuardrails = SharedAcademicAiCallerGuardrails;

const RED_ZONE_MANUAL_URLS: Partial<Record<AcademicRedZoneSurface, string>> = {
  'register-uw': 'https://register.uw.edu/',
  'notify-uw': 'https://notify.uw.edu/',
};

export function isAcademicRedZoneSurface(value: string): value is AcademicRedZoneSurface {
  return ACADEMIC_RED_ZONE_SURFACES.includes(value as AcademicRedZoneSurface);
}

export function getAcademicRedZoneHardStop(surface: AcademicRedZoneSurface): AcademicRedZoneHardStop {
  const sharedGuard = getSharedAcademicRedZoneUiGuard(surface);
  return {
    ...sharedGuard,
    manualUrl: RED_ZONE_MANUAL_URLS[surface],
    manualNote: sharedGuard.manualOnlyNote,
  };
}

export function getAcademicRedZoneHardStops(
  surfaces: readonly AcademicRedZoneSurface[],
): AcademicRedZoneHardStop[] {
  return getSharedAcademicRedZoneUiGuards(surfaces).map((surface) => ({
    ...surface,
    manualUrl: RED_ZONE_MANUAL_URLS[surface.surface],
    manualNote: surface.manualOnlyNote,
  }));
}

export function getAcademicAiCallerGuardrails(): AcademicAiCallerGuardrails {
  return getSharedAcademicAiCallerGuardrails();
}
