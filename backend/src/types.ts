export type CallingStatus =
  | 'recommended'
  | 'extended'
  | 'accepted'
  | 'declined'
  | 'sustained'
  | 'set_apart'
  | 'released'
  | 'cancelled';

export interface MemberRow {
  id: string;
  name: string;
  created_at: string;
}

export interface PositionRow {
  id: string;
  org_unit_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface CallingRow {
  id: string;
  position_id: string;
  member_id: string | null;
  status: CallingStatus;
  bishopric_owner: string | null;
  notes: string | null;
  state_entered_at: string; // D-13: powers stuck inbox
  created_at: string;
  updated_at: string;
}

export interface CallingEventRow {
  id: string;
  calling_id: string;
  from_status: CallingStatus | null;
  to_status: CallingStatus;
  note: string | null;
  created_at: string;
}
