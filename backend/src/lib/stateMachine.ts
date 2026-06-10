import type { CallingStatus } from '../types';

export const VALID_TRANSITIONS: Record<CallingStatus, CallingStatus[]> = {
  recommended: ['extended', 'cancelled'],
  extended:    ['accepted', 'declined', 'cancelled'],
  accepted:    ['sustained', 'cancelled'],
  declined:    [],   // terminal — start new calling record
  sustained:   ['set_apart', 'cancelled'],
  set_apart:   ['released'],
  released:    [],   // terminal
  cancelled:   [],   // terminal
};

export function validateTransition(from: CallingStatus, to: CallingStatus): void {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`);
  }
}
