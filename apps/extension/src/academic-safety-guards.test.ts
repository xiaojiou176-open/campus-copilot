import { describe, expect, it } from 'vitest';
import {
  ACADEMIC_RED_ZONE_SURFACES,
  RED_ZONE_HARD_STOP_DOC_LABEL,
  RED_ZONE_HARD_STOP_HEADING,
  RED_ZONE_HARD_STOP_MANUAL_NOTE,
  RED_ZONE_HARD_STOP_REASON,
  getAcademicAiCallerGuardrails,
  getAcademicRedZoneHardStop,
  getAcademicRedZoneHardStops,
  isAcademicRedZoneSurface,
} from './academic-safety-guards';

describe('academic safety guards', () => {
  it('returns a disabled hard-stop contract for register and notify surfaces', () => {
    expect(getAcademicRedZoneHardStop('register-uw')).toMatchObject({
      surfaceLabel: 'Register.UW',
      title: RED_ZONE_HARD_STOP_HEADING,
      reason: RED_ZONE_HARD_STOP_REASON,
      actionLabel: 'Registration automation stays off',
      manualNote: RED_ZONE_HARD_STOP_MANUAL_NOTE,
      docsLabel: RED_ZONE_HARD_STOP_DOC_LABEL,
      docsPath: '/docs/07-security-privacy-compliance.md',
      manualUrl: 'https://register.uw.edu/',
      ctaDisabled: true,
      manualPathOnly: true,
    });
    expect(getAcademicRedZoneHardStop('notify-uw')).toMatchObject({
      surfaceLabel: 'Notify.UW',
      manualUrl: 'https://notify.uw.edu/',
      ctaDisabled: true,
      manualPathOnly: true,
    });
  });

  it('covers every frozen red-zone identifier and rejects non red-zone surfaces', () => {
    expect(ACADEMIC_RED_ZONE_SURFACES).toEqual([
      'register-uw',
      'notify-uw',
      'registration-related-resources',
      'seat-watcher-waitlist-polling',
      'add-drop-submission',
      'seat-swap-hold-seat',
      'registration-query-loop',
    ]);
    expect(isAcademicRedZoneSurface('registration-query-loop')).toBe(true);
    expect(isAcademicRedZoneSurface('time-schedule')).toBe(false);
  });

  it('exposes a reusable list helper for route-level red-zone adoption', () => {
    expect(getAcademicRedZoneHardStops(['register-uw', 'notify-uw']).map((item) => item.surface)).toEqual([
      'register-uw',
      'notify-uw',
    ]);
  });

  it('re-exports the shared caller guardrails contract for extension AI callers', () => {
    expect(getAcademicAiCallerGuardrails()).toMatchObject({
      redZone: {
        primaryHardStop: {
          surface: 'register-uw',
          surfaceLabel: 'Register.UW',
          docsPath: '/docs/07-security-privacy-compliance.md',
          ctaDisabled: true,
          manualPathOnly: true,
        },
        badge: 'manual_only',
      },
      advancedMaterial: {
        status: 'default_disabled',
        enabled: false,
        toggleLabel: 'Advanced material analysis',
      },
    });
  });
});
