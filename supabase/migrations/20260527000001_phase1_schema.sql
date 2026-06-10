-- Phase 1: Calling Pipeline & Auth — Database Schema
-- Apply via: supabase db push
-- Locks implemented: D-10 (vacancy=JOIN), D-11 (calling_events append-only log), D-12 (partial unique index), D-13 (state_entered_at)
-- IMPORTANT: Do NOT add interview_event_id or set_apart_event_id — those belong to Phase 2

-- Ward organization units (Bishopric, EQ, RS, Primary, etc.)
CREATE TABLE org_units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Positions: the org chart slots (persistent, exist even when vacant)
CREATE TABLE positions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id UUID REFERENCES org_units(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,   -- consideration notes for vacant positions (CALL-02)
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_unit_id, name)
);

-- Members: name only, no contact info
CREATE TABLE members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Callings: pipeline state machine records
CREATE TYPE calling_status AS ENUM (
  'recommended',
  'extended',
  'accepted',
  'declined',
  'sustained',
  'set_apart',
  'released',
  'cancelled'
);

CREATE TABLE callings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id      UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  member_id        UUID REFERENCES members(id) ON DELETE SET NULL,
  status           calling_status NOT NULL DEFAULT 'recommended',
  bishopric_owner  TEXT,          -- which bishopric member owns this pipeline
  notes            TEXT,          -- coordination notes (no pastoral content)
  state_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),  -- D-13: powers pending inbox
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- D-12: Partial unique index — only one active pipeline entry per position
-- 'declined', 'released', 'cancelled' are terminal states and excluded
CREATE UNIQUE INDEX callings_position_active_unique
  ON callings (position_id)
  WHERE status NOT IN ('declined', 'released', 'cancelled');

-- D-11: Append-only calling events audit log
CREATE TABLE calling_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calling_id  UUID NOT NULL REFERENCES callings(id) ON DELETE CASCADE,
  from_status calling_status,
  to_status   calling_status NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- connect-pg-simple session table (auto-created by createTableIfMissing: true, but explicit is safer)
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess   JSON    NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Seed: Default ward organization units in standard LDS order
INSERT INTO org_units (name, sort_order) VALUES
  ('Bishopric',      1),
  ('Elders Quorum',  2),
  ('Relief Society', 3),
  ('Young Men',      4),
  ('Young Women',    5),
  ('Primary',        6),
  ('Sunday School',  7),
  ('Ward',           8);
