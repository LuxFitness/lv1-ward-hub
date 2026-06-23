-- Sacrament meeting planner + meeting agendas (Bishopric / Ward Council)
-- Apply via: supabase db push

-- ── Sacrament weeks ──────────────────────────────────────────────────────────

CREATE TABLE sacrament_weeks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                DATE NOT NULL UNIQUE,
  presiding           TEXT,
  conducting          TEXT,
  stake_business      BOOLEAN DEFAULT false,
  ward_business       BOOLEAN DEFAULT false,
  move_ins            TEXT[] DEFAULT '{}',
  callings_to_present TEXT[] DEFAULT '{}',
  releases_to_present TEXT[] DEFAULT '{}',
  opening_prayer      TEXT,
  closing_prayer      TEXT,
  speakers            JSONB NOT NULL DEFAULT '[]',  -- [{slot, name, topic}]
  opening_hymn        TEXT,
  sacrament_hymn      TEXT,
  closing_hymn        TEXT,
  chorister           TEXT,
  organist            TEXT,
  approved            BOOLEAN DEFAULT false,
  google_sheet_row    INT,   -- row number in the Drive planner sheet (for sync)
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER sacrament_weeks_updated_at
  BEFORE UPDATE ON sacrament_weeks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Meeting agendas ───────────────────────────────────────────────────────────

CREATE TYPE meeting_type AS ENUM ('bishopric', 'ward_council', 'pec');
CREATE TYPE agenda_item_status AS ENUM ('pending', 'discussed', 'tabled', 'resolved');

-- One row per meeting instance
CREATE TABLE meeting_agendas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_type meeting_type NOT NULL,
  meeting_date DATE NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (meeting_type, meeting_date)
);

CREATE TRIGGER meeting_agendas_updated_at
  BEFORE UPDATE ON meeting_agendas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Ordered discussion items within an agenda
CREATE TABLE agenda_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id   UUID NOT NULL REFERENCES meeting_agendas(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  details     TEXT,
  owner       TEXT,
  status      agenda_item_status DEFAULT 'pending',
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER agenda_items_updated_at
  BEFORE UPDATE ON agenda_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Action items from a meeting (carry forward until complete)
CREATE TABLE action_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id    UUID NOT NULL REFERENCES meeting_agendas(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  owner        TEXT,
  due_date     DATE,
  completed    BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER action_items_updated_at
  BEFORE UPDATE ON action_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
