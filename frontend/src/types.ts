export type CallingStatus =
  | 'recommended'
  | 'extended'
  | 'accepted'
  | 'declined'
  | 'sustained'
  | 'set_apart'
  | 'released'
  | 'cancelled';

export interface Member {
  id: string;
  name: string;
  created_at: string;
}

export interface Position {
  id: string;
  org_unit_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface Calling {
  id: string;
  position_id: string;
  member_id: string | null;
  status: CallingStatus;
  bishopric_owner: string | null;
  notes: string | null;
  state_entered_at: string;
  created_at: string;
  updated_at: string;
}

export interface RosterEntry {
  position_id: string;
  position_name: string;
  org_unit_id: string;
  org_unit_name: string;
  sort_order: number;
  calling_id: string | null;
  member_id: string | null;
  member_name: string | null;
  status: CallingStatus | null;
  state_entered_at: string | null;
}

export interface CallingDetail {
  id: string;
  position_id: string;
  member_id: string | null;
  status: CallingStatus;
  bishopric_owner: string | null;
  notes: string | null;
  state_entered_at: string;
  members: { name: string } | null;
  positions: { name: string; org_unit_id: string; org_units: { name: string } | null } | null;
}

export interface PendingCalling {
  id: string;
  position_id: string;
  position_name: string;
  member_id: string | null;
  member_name: string | null;
  status: CallingStatus;
  state_entered_at: string;
  days_in_stage: number;
  threshold_days: number;
}
