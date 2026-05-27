# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-26)

**Core value:** Any bishopric member can instantly see where every calling stands — who's in what position, what's pending, and what's fallen through the cracks.
**Current focus:** Phase 0 — Google Cloud Setup (prerequisite)

## Current Position

Phase: 0 of 4 (Google Cloud Setup — infrastructure prerequisite)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-05-26 — Roadmap created; all 29 v1 requirements mapped across 4 phases

Progress: [░░░░░░░░░░] 0%

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

Last session: 2026-05-26
Stopped at: Roadmap created; ROADMAP.md, STATE.md, and REQUIREMENTS.md traceability written
Resume file: None
