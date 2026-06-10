import { describe, it, expect } from 'vitest';
import { validateTransition, VALID_TRANSITIONS } from '../src/lib/stateMachine';
import type { CallingStatus } from '../src/types';

describe('validateTransition', () => {
  it('accepts all valid transitions', () => {
    // Loop over every entry in VALID_TRANSITIONS and call validateTransition
    // for each valid next status — expect no throw
    const entries = Object.entries(VALID_TRANSITIONS) as [CallingStatus, CallingStatus[]][];
    for (const [from, nexts] of entries) {
      for (const to of nexts) {
        expect(() => validateTransition(from, to)).not.toThrow();
      }
    }
  });

  it('rejects invalid transitions', () => {
    // recommended → accepted (skipping extended)
    expect(() => validateTransition('recommended', 'accepted')).toThrow(/Invalid transition/);
    // extended → set_apart (skipping stages)
    expect(() => validateTransition('extended', 'set_apart')).toThrow(/Invalid transition/);
    // declined → recommended (terminal state)
    expect(() => validateTransition('declined', 'recommended')).toThrow(/Invalid transition/);
    // released → recommended (terminal state)
    expect(() => validateTransition('released', 'recommended')).toThrow(/Invalid transition/);
    // cancelled → extended (terminal state)
    expect(() => validateTransition('cancelled', 'extended')).toThrow(/Invalid transition/);
  });

  it('rejects backward transitions', () => {
    // set_apart → recommended (going backward)
    expect(() => validateTransition('set_apart', 'recommended')).toThrow(/Invalid transition/);
    // sustained → extended (going backward)
    expect(() => validateTransition('sustained', 'extended')).toThrow(/Invalid transition/);
    // set_apart → cancelled (no path back from set_apart except released)
    expect(() => validateTransition('set_apart', 'cancelled')).toThrow(/Invalid transition/);
  });

  it('terminal states have no valid transitions', () => {
    expect(VALID_TRANSITIONS['declined']).toEqual([]);
    expect(VALID_TRANSITIONS['released']).toEqual([]);
    expect(VALID_TRANSITIONS['cancelled']).toEqual([]);
  });

  it('error message includes both from and to status', () => {
    let caught: Error | null = null;
    try {
      validateTransition('recommended', 'sustained');
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).not.toBeNull();
    expect(caught!.message).toContain('recommended');
    expect(caught!.message).toContain('sustained');
  });

  it('VALID_TRANSITIONS is exhaustive — all 8 CallingStatus keys are present', () => {
    const expectedKeys: CallingStatus[] = [
      'recommended',
      'extended',
      'accepted',
      'declined',
      'sustained',
      'set_apart',
      'released',
      'cancelled',
    ];
    const actualKeys = Object.keys(VALID_TRANSITIONS) as CallingStatus[];
    expect(actualKeys.sort()).toEqual(expectedKeys.sort());
  });
});
