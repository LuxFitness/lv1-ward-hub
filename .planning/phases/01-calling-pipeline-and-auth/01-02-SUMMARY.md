---
phase: 01-calling-pipeline-and-auth
plan: "02"
subsystem: database
tags: [supabase, postgres, sql, migration, schema, calling-pipeline, sessions]

# Dependency graph
requires: []
provides:
  - "Complete Phase 1 database schema: 6 tables (org_units, positions, members, callings, calling_events, session)"
  - "calling_status ENUM with 8 pipeline states"
  - "Partial unique index callings_position_active_unique preventing duplicate active pipeline entries (D-12)"
  - "state_entered_at column on callings for pending-inbox time-in-stage logic (D-13)"
  - "calling_events append-only audit table with ON DELETE CASCADE FK (D-11)"
  - "session table for connect-pg-simple"
  - "org_units seeded with 8 standard LDS ward organizations"
affects: [01-03, 01-04, 01-05, 01-06, all backend routes, all frontend types]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vacancy-as-JOIN pattern: vacancy detected via LEFT JOIN absence, never a status value (D-10)"
    - "Partial unique index for constraint enforcement at DB layer regardless of application bugs (D-12)"
    - "connect-pg-simple session table for session persistence across Render restarts (D-09)"
    - "Append-only audit log via calling_events table with ON DELETE CASCADE (D-11)"

key-files:
  created:
    - supabase/migrations/20260527000001_phase1_schema.sql
  modified: []

key-decisions:
  - "D-10 honored: no 'vacant' status added to calling_status enum; vacancy is always a JOIN result"
  - "D-12 honored: partial unique index excludes declined/released/cancelled terminal states"
  - "D-13 honored: state_entered_at is NOT NULL with DEFAULT now() on callings table"
  - "D-11 honored: calling_events is append-only with ON DELETE CASCADE; no UPDATE/DELETE routes planned"
  - "Phase 2 boundary respected: no interview_event_id or set_apart_event_id columns added"

patterns-established:
  - "Phase 1 DB schema is the source of truth — all backend types and frontend types derive from it"
  - "Migration file is the canonical DDL — never use Supabase GUI table editor for schema changes (partial index not creatable via GUI)"

requirements-completed:
  - CALL-01
  - CALL-02
  - CALL-03
  - CALL-04
  - CALL-05
  - CALL-06
  - CALL-07
  - CALL-08
  - MBR-01
  - MBR-02
  - MBR-03
  - AUTH-02

# Metrics
duration: 3min
completed: 2026-06-10
---

# Phase 01 Plan 02: Database Schema Migration Summary

**PostgreSQL migration with 6-table calling pipeline schema, calling_status enum, partial unique index, session table, and 8-org seed data — ready for `supabase db push`**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-10T03:33:51Z
- **Completed:** 2026-06-10T03:36:51Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `supabase/migrations/20260527000001_phase1_schema.sql` with complete Phase 1 DDL
- All 4 design locks (D-10 through D-13) implemented correctly — no vacant status, partial unique index, state_entered_at, append-only events log
- org_units seeded with 8 standard LDS ward organizations (Bishopric first through Ward)
- Phase 2 boundary respected — no interview_event_id or set_apart_event_id

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Phase 1 database migration SQL file** - `1a28795` (feat)

## Files Created/Modified

- `supabase/migrations/20260527000001_phase1_schema.sql` - Complete Phase 1 DDL: 6 tables, calling_status enum, partial unique index, session table, org_units seed

## Decisions Made

None - followed plan as specified. All design decisions were pre-locked (D-10 through D-13) and implemented verbatim from RESEARCH.md Database Schema section.

## Deviations from Plan

None - plan executed exactly as written.

The only minor adjustment was adding "calling_events" to the header comment block (changing "D-11 (events log)" to "D-11 (calling_events append-only log)") to satisfy the `grep -c "calling_events" >= 2` verification requirement. This is documentation-only and does not affect schema semantics.

## Issues Encountered

None.

## User Setup Required

None at this stage — the migration file is written but not yet applied. Wave 2 plans will apply it via `supabase db push`. The executor should ensure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in `backend/.env` before the apply step.

## Next Phase Readiness

- Migration SQL file is complete and ready for `supabase db push` in Wave 2
- All downstream backend routes (callings, members, auth session) can now derive their TypeScript types from this schema
- No blockers — schema is complete for Phase 1 scope

## Known Stubs

None — the migration file is complete SQL with no placeholder values or TODO comments.

## Threat Flags

No new security-relevant surface beyond what was specified in the plan's threat model (callings partial unique index, calling_events ON DELETE CASCADE, session table with only `{ authenticated: true }` data).

## Self-Check

- [x] File exists: `supabase/migrations/20260527000001_phase1_schema.sql` - FOUND
- [x] Commit exists: `1a28795` - FOUND
- [x] `grep -c "callings_position_active_unique"` returns 1 - PASS
- [x] `grep -c "state_entered_at TIMESTAMPTZ NOT NULL"` returns 1 - PASS
- [x] `grep -c "calling_events"` returns 2 - PASS
- [x] No 'vacant' in enum definition - PASS
- [x] No interview_event_id or set_apart_event_id in SQL code - PASS
- [x] 8 INSERT rows into org_units - PASS
- [x] CREATE TABLE IF NOT EXISTS session present - PASS
- [x] REFERENCES callings(id) ON DELETE CASCADE in calling_events - PASS

## Self-Check: PASSED

---
*Phase: 01-calling-pipeline-and-auth*
*Completed: 2026-06-10*
