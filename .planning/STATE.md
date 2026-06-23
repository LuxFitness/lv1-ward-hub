---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: "01-09-PLAN.md complete — calling roster UI (RosterView + CallingPanel + QueryClientProvider)"
last_updated: "2026-06-23T00:00:00Z"
last_activity: 2026-06-23 -- Phase 01 plan 09 complete (RosterView + CallingPanel)
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 10
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-26)

**Core value:** Any bishopric member can instantly see where every calling stands — who's in what position, what's pending, and what's fallen through the cracks.
**Current focus:** Phase 01 — calling-pipeline-and-auth

## Current Position

Phase: 01 (calling-pipeline-and-auth) — EXECUTING
Plan: 10 of 10 (plans 01–09 complete, 01-10 remaining)
Status: Executing Phase 01
Last activity: 2026-06-23 -- 01-09 complete: calling roster UI (RosterView + CallingPanel + QueryClientProvider)

Progress: [█████████░] ~90% (9 of 10 Phase 01 plans complete)

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 0: Service account must be created under the ward's Google account, not a personal account — keeps credentials with the ward, not an individual
- Phase 1: Auth is bcrypt shared password + express-session + connect-pg-simple (sessions survive Render restarts)
- Phase 1: Vacancy is a JOIN query result (no active set_apart calling), not a database status value — positions table is separate from callings table
- Phase 1: Append-only calling_events log is cheap to add in Phase 1 schema and avoids regret — include it
- Phase 2/3: All Google API calls route through Express; browser never holds credentials
- 01-07: Member schema is name-only — no contact info; extra body fields silently ignored
- 01-07: DELETE does not guard for active callings — schema ON DELETE SET NULL handles cascade
- 01-07: GET /api/members/:id/calling returns null (not 404) when no active calling — cleaner for frontend

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 0 must be completed before Phase 2 or Phase 3 can begin; Phase 2 and Phase 3 are blocked on service account credentials being stored in Render env vars

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Sheets | Google Sheets write-back (app changes → Sheet) | v2 | Init |
| Sheets | True two-way sync with conflict resolution | v2 | Init |
| Calendar | YM/YW, EQ/RS activity calendar events | v2 | Init |
| Meetings | Meeting agenda builder with action items | v2 | Init |

## Session Continuity

Last session: 2026-06-23
Stopped at: 01-09-PLAN.md complete — calling roster UI (RosterView org-grouped, CallingPanel Sheet, QueryClientProvider)
Resume file: None
