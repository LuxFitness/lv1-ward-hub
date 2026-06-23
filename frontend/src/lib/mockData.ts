import type { RosterEntry, PendingCalling, Member, Calling } from '../types';

export const MOCK_ROSTER: RosterEntry[] = [
  // Bishopric
  { position_id: 'p1', position_name: 'Bishop', org_unit_id: 'bishopric', sort_order: 1, calling_id: 'c1', member_id: 'm1', member_name: 'James Hammond', status: 'set_apart', state_entered_at: '2024-01-15T00:00:00Z' },
  { position_id: 'p2', position_name: 'First Counselor', org_unit_id: 'bishopric', sort_order: 2, calling_id: 'c2', member_id: 'm2', member_name: 'Tyler Weston', status: 'set_apart', state_entered_at: '2024-01-15T00:00:00Z' },
  { position_id: 'p3', position_name: 'Second Counselor', org_unit_id: 'bishopric', sort_order: 3, calling_id: 'c3', member_id: 'm3', member_name: 'Brian Nakamura', status: 'set_apart', state_entered_at: '2024-01-15T00:00:00Z' },
  { position_id: 'p4', position_name: 'Executive Secretary', org_unit_id: 'bishopric', sort_order: 4, calling_id: null, member_id: null, member_name: null, status: null, state_entered_at: null },

  // Elders Quorum
  { position_id: 'p5', position_name: 'Elders Quorum President', org_unit_id: 'elders_quorum', sort_order: 1, calling_id: 'c5', member_id: 'm5', member_name: 'Marcus Oduya', status: 'set_apart', state_entered_at: '2024-03-10T00:00:00Z' },
  { position_id: 'p6', position_name: 'First Counselor', org_unit_id: 'elders_quorum', sort_order: 2, calling_id: 'c6', member_id: 'm6', member_name: 'Derek Fowler', status: 'set_apart', state_entered_at: '2024-03-10T00:00:00Z' },
  { position_id: 'p7', position_name: 'Second Counselor', org_unit_id: 'elders_quorum', sort_order: 3, calling_id: null, member_id: null, member_name: null, status: null, state_entered_at: null },
  { position_id: 'p8', position_name: 'Secretary', org_unit_id: 'elders_quorum', sort_order: 4, calling_id: 'c8', member_id: 'm8', member_name: 'Caleb Stirling', status: 'recommended', state_entered_at: '2026-06-08T00:00:00Z' },

  // Relief Society
  { position_id: 'p9', position_name: 'Relief Society President', org_unit_id: 'relief_society', sort_order: 1, calling_id: 'c9', member_id: 'm9', member_name: 'Amanda Christensen', status: 'set_apart', state_entered_at: '2024-06-01T00:00:00Z' },
  { position_id: 'p10', position_name: 'First Counselor', org_unit_id: 'relief_society', sort_order: 2, calling_id: 'c10', member_id: 'm10', member_name: 'Priya Bhatt', status: 'set_apart', state_entered_at: '2024-06-01T00:00:00Z' },
  { position_id: 'p11', position_name: 'Second Counselor', org_unit_id: 'relief_society', sort_order: 3, calling_id: 'c11', member_id: 'm11', member_name: 'Lori Tanner', status: 'accepted', state_entered_at: '2026-06-01T00:00:00Z' },
  { position_id: 'p12', position_name: 'Secretary', org_unit_id: 'relief_society', sort_order: 4, calling_id: null, member_id: null, member_name: null, status: null, state_entered_at: null },

  // Sunday School
  { position_id: 'p13', position_name: 'Sunday School President', org_unit_id: 'sunday_school', sort_order: 1, calling_id: 'c13', member_id: 'm13', member_name: 'Rob Jensen', status: 'set_apart', state_entered_at: '2025-01-12T00:00:00Z' },
  { position_id: 'p14', position_name: 'First Counselor', org_unit_id: 'sunday_school', sort_order: 2, calling_id: null, member_id: null, member_name: null, status: null, state_entered_at: null },
  { position_id: 'p15', position_name: 'Teacher — Gospel Principles', org_unit_id: 'sunday_school', sort_order: 3, calling_id: 'c15', member_id: 'm15', member_name: 'Sarah McKay', status: 'extended', state_entered_at: '2026-06-10T00:00:00Z' },

  // Young Men
  { position_id: 'p16', position_name: 'Young Men President', org_unit_id: 'young_mens', sort_order: 1, calling_id: 'c16', member_id: 'm16', member_name: 'Troy Ballard', status: 'set_apart', state_entered_at: '2025-03-01T00:00:00Z' },
  { position_id: 'p17', position_name: 'First Counselor', org_unit_id: 'young_mens', sort_order: 2, calling_id: null, member_id: null, member_name: null, status: null, state_entered_at: null },
  { position_id: 'p18', position_name: 'Second Counselor', org_unit_id: 'young_mens', sort_order: 3, calling_id: null, member_id: null, member_name: null, status: null, state_entered_at: null },

  // Young Women
  { position_id: 'p19', position_name: 'Young Women President', org_unit_id: 'young_womens', sort_order: 1, calling_id: 'c19', member_id: 'm19', member_name: 'Emily Larsen', status: 'set_apart', state_entered_at: '2025-02-15T00:00:00Z' },
  { position_id: 'p20', position_name: 'First Counselor', org_unit_id: 'young_womens', sort_order: 2, calling_id: 'c20', member_id: 'm20', member_name: 'Natalie Pierce', status: 'sustained', state_entered_at: '2026-05-28T00:00:00Z' },
  { position_id: 'p21', position_name: 'Second Counselor', org_unit_id: 'young_womens', sort_order: 3, calling_id: null, member_id: null, member_name: null, status: null, state_entered_at: null },

  // Primary
  { position_id: 'p22', position_name: 'Primary President', org_unit_id: 'primary', sort_order: 1, calling_id: 'c22', member_id: 'm22', member_name: 'Jennifer Cole', status: 'set_apart', state_entered_at: '2024-09-01T00:00:00Z' },
  { position_id: 'p23', position_name: 'First Counselor', org_unit_id: 'primary', sort_order: 2, calling_id: 'c23', member_id: 'm23', member_name: 'Diana Reyes', status: 'set_apart', state_entered_at: '2024-09-01T00:00:00Z' },
  { position_id: 'p24', position_name: 'Second Counselor', org_unit_id: 'primary', sort_order: 3, calling_id: 'c24', member_id: 'm24', member_name: 'Beth Sorensen', status: 'recommended', state_entered_at: '2026-06-03T00:00:00Z' },
  { position_id: 'p25', position_name: 'Secretary', org_unit_id: 'primary', sort_order: 4, calling_id: null, member_id: null, member_name: null, status: null, state_entered_at: null },
];

export const MOCK_PENDING: PendingCalling[] = [
  { id: 'c8', position_id: 'p8', position_name: 'EQ Secretary', member_id: 'm8', member_name: 'Caleb Stirling', status: 'recommended', state_entered_at: '2026-06-08T00:00:00Z', days_in_stage: 7, threshold_days: 7 },
  { id: 'c24', position_id: 'p24', position_name: 'Primary 2nd Counselor', member_id: 'm24', member_name: 'Beth Sorensen', status: 'recommended', state_entered_at: '2026-06-03T00:00:00Z', days_in_stage: 12, threshold_days: 7 },
  { id: 'c20', position_id: 'p20', position_name: 'YW 1st Counselor', member_id: 'm20', member_name: 'Natalie Pierce', status: 'sustained', state_entered_at: '2026-05-28T00:00:00Z', days_in_stage: 18, threshold_days: 14 },
  { id: 'c11', position_id: 'p11', position_name: 'RS 2nd Counselor', member_id: 'm11', member_name: 'Lori Tanner', status: 'accepted', state_entered_at: '2026-06-01T00:00:00Z', days_in_stage: 14, threshold_days: 14 },
];

export const MOCK_MEMBERS: Member[] = [
  { id: 'm1', name: 'James Hammond', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm2', name: 'Tyler Weston', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm3', name: 'Brian Nakamura', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm5', name: 'Marcus Oduya', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm6', name: 'Derek Fowler', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm8', name: 'Caleb Stirling', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm9', name: 'Amanda Christensen', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm10', name: 'Priya Bhatt', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm11', name: 'Lori Tanner', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm13', name: 'Rob Jensen', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm15', name: 'Sarah McKay', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm16', name: 'Troy Ballard', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm19', name: 'Emily Larsen', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm20', name: 'Natalie Pierce', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm22', name: 'Jennifer Cole', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm23', name: 'Diana Reyes', created_at: '2024-01-01T00:00:00Z' },
  { id: 'm24', name: 'Beth Sorensen', created_at: '2024-01-01T00:00:00Z' },
];

export const MOCK_CALLINGS: Calling[] = MOCK_ROSTER
  .filter((r) => r.calling_id !== null)
  .map((r) => ({
    id: r.calling_id as string,
    position_id: r.position_id,
    member_id: r.member_id,
    status: r.status!,
    bishopric_owner: null,
    notes: null,
    state_entered_at: r.state_entered_at as string,
    created_at: r.state_entered_at as string,
    updated_at: r.state_entered_at as string,
  }));

// Upcoming ordinances and ward events (mirrors the agenda sheet structure)
export type OrdinanceType = 'baby_blessing' | 'baptism' | 'ordination' | 'temple' | 'patriarchal';

export interface UpcomingOrdinance {
  id: string;
  type: OrdinanceType;
  name: string;
  date: string | null;
  nextStep: string;
}

export const MOCK_UPCOMING: UpcomingOrdinance[] = [
  { id: 'u1', type: 'baby_blessing', name: 'Michael & Megan Hawkins', date: '2026-06-27', nextStep: '10:00 AM — Assign bishopric member' },
  { id: 'u2', type: 'baby_blessing', name: 'Carson & Abbie Bird', date: '2026-06-28', nextStep: 'Ready — print certificate after' },
  { id: 'u3', type: 'baptism', name: 'Lincoln Hammond', date: '2026-08-01', nextStep: 'Meet with Bishop in late June/July' },
  { id: 'u4', type: 'ordination', name: 'Hudson Andrus', date: '2026-07-06', nextStep: 'Ordination to Teacher — in quorum class' },
  { id: 'u5', type: 'ordination', name: 'Brody Melessa', date: '2026-07-06', nextStep: 'Ordination to Teacher — in quorum class' },
  { id: 'u6', type: 'temple', name: 'Cassidy Iverson', date: null, nextStep: 'Temple Prep in progress — schedule bishop interview' },
  { id: 'u7', type: 'patriarchal', name: 'Aaliyah Moors', date: null, nextStep: 'Meet with Patriarch — schedule appointment' },
  { id: 'u8', type: 'patriarchal', name: 'Cayson Rhodes', date: null, nextStep: 'Meet with Patriarch — schedule appointment' },
];

// ── Sacrament Meeting Planning ─────────────────────────────────────────────

export interface SpeakerSlot {
  slot: string;
  name: string | null;
  topic: string | null;
}

export interface SacramentWeek {
  id: string;
  date: string;
  presiding: string;
  conducting: string;
  stake_business: boolean;
  ward_business: boolean;
  move_ins: string[];
  callings_to_present: string[];
  releases_to_present: string[];
  opening_prayer: string | null;
  closing_prayer: string | null;
  speakers: SpeakerSlot[];
  opening_hymn: string | null;
  sacrament_hymn: string | null;
  closing_hymn: string | null;
  chorister: string | null;
  organist: string | null;
  approved: boolean;
}

export const MOCK_SACRAMENT_WEEKS: SacramentWeek[] = [
  {
    id: 's1',
    date: '2026-06-28',
    presiding: 'Bishop De La Fuente',
    conducting: 'Bro. Michael Hammond',
    stake_business: false,
    ward_business: true,
    move_ins: ['Addylin Brusman'],
    callings_to_present: ['Taitlin Gonzalez — YW 1st Counselor', 'Benjamin Potzch — Primary Teacher', 'Wesley Doyle — Primary Teacher', 'Zack Boyce — Nursery Leader'],
    releases_to_present: ['Kandice Brown — YW Camp Director', 'Taitlin Gonzalez — YW Secretary', 'Ashlyn Lawrence — YW Adviser'],
    opening_prayer: null,
    closing_prayer: null,
    speakers: [
      { slot: 'Youth', name: null, topic: null },
      { slot: 'Speaker 1', name: null, topic: null },
      { slot: 'Speaker 2', name: null, topic: null },
    ],
    opening_hymn: '#1005: His Eye is on the Sparrow',
    sacrament_hymn: null,
    closing_hymn: null,
    chorister: 'Ashly Barraclough',
    organist: 'Jesse Barraclough',
    approved: false,
  },
  {
    id: 's2',
    date: '2026-07-05',
    presiding: 'Bishop De La Fuente',
    conducting: 'Marc Gibson',
    stake_business: false,
    ward_business: false,
    move_ins: [],
    callings_to_present: [],
    releases_to_present: [],
    opening_prayer: null,
    closing_prayer: null,
    speakers: [
      { slot: 'Fast & Testimony', name: null, topic: null },
    ],
    opening_hymn: null,
    sacrament_hymn: null,
    closing_hymn: null,
    chorister: 'Ashly Barraclough',
    organist: 'Jesse Barraclough',
    approved: false,
  },
  {
    id: 's3',
    date: '2026-07-12',
    presiding: 'Bishop De La Fuente',
    conducting: 'Brian Nakamura',
    stake_business: false,
    ward_business: false,
    move_ins: [],
    callings_to_present: [],
    releases_to_present: [],
    opening_prayer: null,
    closing_prayer: null,
    speakers: [
      { slot: 'Youth', name: null, topic: null },
      { slot: 'Speaker 1', name: null, topic: null },
      { slot: 'Speaker 2', name: null, topic: null },
    ],
    opening_hymn: null,
    sacrament_hymn: null,
    closing_hymn: null,
    chorister: 'Ashly Barraclough',
    organist: 'Jesse Barraclough',
    approved: false,
  },
  {
    id: 's4',
    date: '2026-07-19',
    presiding: 'Bishop De La Fuente',
    conducting: 'Tyler Weston',
    stake_business: false,
    ward_business: false,
    move_ins: [],
    callings_to_present: [],
    releases_to_present: [],
    opening_prayer: null,
    closing_prayer: null,
    speakers: [
      { slot: 'Youth', name: null, topic: null },
      { slot: 'Speaker 1', name: null, topic: null },
      { slot: 'Speaker 2', name: null, topic: null },
    ],
    opening_hymn: null,
    sacrament_hymn: null,
    closing_hymn: null,
    chorister: 'Ashly Barraclough',
    organist: 'Jesse Barraclough',
    approved: false,
  },
];

// ── Move-Ins ───────────────────────────────────────────────────────────────

export type RecordStatus = 'transferred' | 'pending' | 'requested' | 'out_of_unit';

export interface MoveIn {
  id: string;
  family_name: string;
  names: string;
  moved_in_date: string;
  record_status: RecordStatus;
  welcomed_in_sm: string | null;
  assigned_ministers: string | null;
  bishopric_visit: string | null;
  notes: string;
}

export const MOCK_MOVE_INS: MoveIn[] = [
  { id: 'mi1', family_name: 'Brusman', names: 'Addylin Brusman', moved_in_date: '2026-06-18', record_status: 'transferred', welcomed_in_sm: '2026-06-28', assigned_ministers: null, bishopric_visit: null, notes: '' },
  { id: 'mi2', family_name: 'Resendez', names: 'Brenden, McKenna, Oakley, Ryder', moved_in_date: '2026-06-05', record_status: 'transferred', welcomed_in_sm: '2026-06-14', assigned_ministers: 'EQ assigned', bishopric_visit: null, notes: '' },
  { id: 'mi3', family_name: 'Hunt', names: 'Johnny, Cindy, Charlotte, Maggie, Olivia', moved_in_date: '2026-06-05', record_status: 'pending', welcomed_in_sm: '2026-06-14', assigned_ministers: null, bishopric_visit: null, notes: 'Records pending transfer from previous ward' },
  { id: 'mi4', family_name: 'Bethea', names: 'Easton & Olivia', moved_in_date: '2026-05-20', record_status: 'transferred', welcomed_in_sm: '2026-05-25', assigned_ministers: 'Marcus Oduya', bishopric_visit: '2026-06-10', notes: '' },
  { id: 'mi5', family_name: 'Munns', names: 'Joshua, Rachel, Max', moved_in_date: '2026-05-15', record_status: 'transferred', welcomed_in_sm: '2026-05-17', assigned_ministers: 'Derek Fowler', bishopric_visit: null, notes: 'Max is 9 — active in primary' },
  { id: 'mi6', family_name: 'Valdez', names: 'Maree Valdez', moved_in_date: '2026-04-28', record_status: 'out_of_unit', welcomed_in_sm: null, assigned_ministers: null, bishopric_visit: null, notes: 'Employment need flagged — coordinate with RS' },
];

export const ORG_NAMES: Record<string, string> = {
  bishopric: 'Bishopric',
  elders_quorum: 'Elders Quorum',
  relief_society: 'Relief Society',
  sunday_school: 'Sunday School',
  young_mens: "Young Men's",
  young_womens: "Young Women's",
  primary: 'Primary',
};

export const ORG_ORDER = [
  'bishopric',
  'elders_quorum',
  'relief_society',
  'primary',
  'sunday_school',
  'young_mens',
  'young_womens',
];

// ── Meeting Agendas (Bishopric + Ward Council) ────────────────────────────────

export type MeetingType = 'bishopric' | 'ward_council' | 'pec';
export type AgendaItemStatus = 'pending' | 'discussed' | 'tabled' | 'resolved';

export interface AgendaItem {
  id: string;
  title: string;
  details?: string | null;
  owner?: string | null;
  status: AgendaItemStatus;
  sort_order: number;
}

export interface ActionItem {
  id: string;
  title: string;
  owner?: string | null;
  due_date?: string | null;
  completed: boolean;
  completed_at?: string | null;
}

export interface MeetingAgenda {
  id: string;
  meeting_type: MeetingType;
  meeting_date: string;
  notes?: string | null;
  agenda_items: AgendaItem[];
  action_items: ActionItem[];
}

export const MOCK_AGENDAS: MeetingAgenda[] = [
  // Bishopric — next meeting
  {
    id: 'bm1',
    meeting_type: 'bishopric',
    meeting_date: '2026-06-29',
    notes: null,
    agenda_items: [
      { id: 'bi1', title: 'Opening Devotional', status: 'pending', sort_order: 0 },
      { id: 'bi2', title: 'Review Action Items from Last Week', status: 'pending', sort_order: 1 },
      { id: 'bi3', title: 'Callings to Discuss', details: 'Primary Pres. nominee (Sis. Reeder), Ward Mission Leader', owner: 'Bishop', status: 'pending', sort_order: 2 },
      { id: 'bi4', title: 'Upcoming Ordinances', details: 'Jensen baptism interview, Taylor Aaronic ordination (July 6)', status: 'pending', sort_order: 3 },
      { id: 'bi5', title: 'Sacrament Meeting — July 6', details: 'Confirm 3rd speaker; Bishop conducting; move-ins to welcome', status: 'pending', sort_order: 4 },
      { id: 'bi6', title: 'Youth — Summer Camps', details: 'YM camp July 14–18 (14 registered), YW camp July 21–25 (11 registered)', owner: '1st Counselor', status: 'pending', sort_order: 5 },
      { id: 'bi7', title: 'Ministry Follow-up', details: 'Adams family still unvisited — coordinate with EQ', owner: 'Bishop', status: 'pending', sort_order: 6 },
      { id: 'bi8', title: 'Closing Prayer', status: 'pending', sort_order: 7 },
    ],
    action_items: [
      { id: 'ba1', title: 'Extend Primary Pres. calling to Sis. Reeder', owner: 'Bishop', due_date: '2026-07-02', completed: false },
      { id: 'ba2', title: 'Temple recommend interview: Sis. Park', owner: '2nd Counselor', due_date: '2026-06-28', completed: false },
      { id: 'ba3', title: 'Submit Q2 budget report to Stake', owner: '2nd Counselor', due_date: '2026-06-30', completed: false },
    ],
  },
  // Bishopric — last meeting
  {
    id: 'bm2',
    meeting_type: 'bishopric',
    meeting_date: '2026-06-16',
    notes: 'Good meeting. Budget discussion tabled for 6/29.',
    agenda_items: [
      { id: 'bi10', title: 'Opening Devotional', status: 'discussed', sort_order: 0 },
      { id: 'bi11', title: 'Review Action Items', status: 'discussed', sort_order: 1 },
      { id: 'bi12', title: 'Callings — EQ 2nd Counselor', details: 'Approved: extend to Bro. Mahler', owner: 'Bishop', status: 'discussed', sort_order: 2 },
      { id: 'bi13', title: 'Sacrament Meeting — June 22', details: 'Youth speakers: Maddie Christensen, Tyler Park — all hymns confirmed', status: 'discussed', sort_order: 3 },
      { id: 'bi14', title: 'Ward Budget Review Q2', details: 'Numbers look good; formal report due June 30', owner: '2nd Counselor', status: 'tabled', sort_order: 4 },
      { id: 'bi15', title: 'Closing Prayer', status: 'discussed', sort_order: 5 },
    ],
    action_items: [
      { id: 'ba4', title: 'Extend calling to Bro. Mahler (EQ 2nd Counselor)', owner: 'Bishop', due_date: '2026-06-22', completed: true, completed_at: '2026-06-18' },
      { id: 'ba5', title: 'Confirm June 22 sacrament speakers', owner: '1st Counselor', due_date: '2026-06-19', completed: true, completed_at: '2026-06-17' },
    ],
  },
  // Bishopric — two weeks ago
  {
    id: 'bm3',
    meeting_type: 'bishopric',
    meeting_date: '2026-06-09',
    notes: null,
    agenda_items: [
      { id: 'bi20', title: 'Opening Devotional', status: 'discussed', sort_order: 0 },
      { id: 'bi21', title: 'Callings — new youth callings', details: 'YM 2nd Asst. approved: Bro. Clyde', status: 'discussed', sort_order: 1 },
      { id: 'bi22', title: 'Welfare discussion', details: 'Johnson family — job loss; Bishop to visit', owner: 'Bishop', status: 'discussed', sort_order: 2 },
      { id: 'bi23', title: 'Sacrament June 15 — Ward Choir', status: 'discussed', sort_order: 3 },
    ],
    action_items: [
      { id: 'ba6', title: 'Visit Johnson family', owner: 'Bishop', due_date: '2026-06-13', completed: true, completed_at: '2026-06-11' },
      { id: 'ba7', title: 'Extend YM 2nd Asst. calling to Bro. Clyde', owner: '1st Counselor', due_date: '2026-06-15', completed: true, completed_at: '2026-06-12' },
    ],
  },
  // Ward Council — next
  {
    id: 'wc1',
    meeting_type: 'ward_council',
    meeting_date: '2026-07-12',
    notes: null,
    agenda_items: [
      { id: 'wi1', title: 'Opening Prayer', status: 'pending', sort_order: 0 },
      { id: 'wi2', title: 'Review Action Items from Last Meeting', status: 'pending', sort_order: 1 },
      { id: 'wi3', title: 'Elders Quorum Report', owner: 'EQ President', status: 'pending', sort_order: 2 },
      { id: 'wi4', title: 'Relief Society Report', owner: 'RS President', status: 'pending', sort_order: 3 },
      { id: 'wi5', title: 'Young Men Report', owner: 'YM President', status: 'pending', sort_order: 4 },
      { id: 'wi6', title: 'Young Women Report', owner: 'YW President', status: 'pending', sort_order: 5 },
      { id: 'wi7', title: 'Primary Report', owner: 'Primary President', status: 'pending', sort_order: 6 },
      { id: 'wi8', title: 'Sunday School Report', owner: 'SS President', status: 'pending', sort_order: 7 },
      { id: 'wi9', title: 'Ministry / Welfare', details: 'Follow up on Valdez & Adams families', owner: 'Bishop', status: 'pending', sort_order: 8 },
      { id: 'wi10', title: 'New Business', status: 'pending', sort_order: 9 },
      { id: 'wi11', title: 'Closing Prayer', status: 'pending', sort_order: 10 },
    ],
    action_items: [],
  },
  // Ward Council — last
  {
    id: 'wc2',
    meeting_type: 'ward_council',
    meeting_date: '2026-06-08',
    notes: 'Strong meeting. Ministry coverage at 87%.',
    agenda_items: [
      { id: 'wi20', title: 'Opening Prayer', status: 'discussed', sort_order: 0 },
      { id: 'wi21', title: 'Review Action Items', status: 'discussed', sort_order: 1 },
      { id: 'wi22', title: 'Elders Quorum Report', details: '42 active, 3 inactive visits planned this month', owner: 'EQ President', status: 'discussed', sort_order: 2 },
      { id: 'wi23', title: 'Relief Society Report', details: 'Camp Morinda rescheduled to Aug 8 — need venue confirmation', owner: 'RS President', status: 'discussed', sort_order: 3 },
      { id: 'wi24', title: 'Young Men Report', details: 'Camp July 14–18, 14 registered, 2 still need medical forms', owner: 'YM President', status: 'discussed', sort_order: 4 },
      { id: 'wi25', title: 'Young Women Report', details: 'Camp July 21–25, 11 registered', owner: 'YW President', status: 'discussed', sort_order: 5 },
      { id: 'wi26', title: 'Primary Report', details: 'Great sharing time program; nursery at 6 children', owner: 'Primary President', status: 'discussed', sort_order: 6 },
      { id: 'wi27', title: 'Ministry / Welfare', details: 'Adams family unvisited 2+ months; Johnson family job loss', owner: 'Bishop', status: 'discussed', sort_order: 8 },
    ],
    action_items: [
      { id: 'wa1', title: 'Visit Adams family (EQ + RS ministers coordinate)', owner: 'EQ President', due_date: '2026-06-30', completed: false },
      { id: 'wa2', title: 'Confirm Morinda camp venue for Aug 8', owner: 'RS President', due_date: '2026-06-20', completed: false },
      { id: 'wa3', title: 'Collect medical forms from YM campers', owner: 'YM President', due_date: '2026-07-05', completed: false },
      { id: 'wa4', title: 'Check in with Johnson family re: job search', owner: 'Bishop', due_date: '2026-06-15', completed: true, completed_at: '2026-06-11' },
    ],
  },
];
