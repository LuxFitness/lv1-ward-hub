---
phase: 01-calling-pipeline-and-auth
plan: "07"
subsystem: api
tags: [express, typescript, supabase, vitest, supertest, members, crud]

# Dependency graph
requires:
  - phase: 01-01
    provides: Supabase client (db.ts)
  - phase: 01-03
    provides: requireAuth middleware
  - phase: 01-05
    provides: types.ts (MemberRow, CallingRow)
provides:
  - GET /api/members — list all members sorted by name
  - POST /api/members — create member (name-only, inline add D-08)
  - PATCH /api/members/:id — update member name
  - DELETE /api/members/:id — remove member
  - GET /api/members/:id/calling — current active calling lookup (set_apart)
affects: [01-frontend, calling-pipeline-ui, member-typeahead]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "membersRouter: 5-endpoint name-only CRUD behind requireAuth"
    - "maybeSingle() for nullable single-row queries (no active calling = null)"
    - "PGRST116/Not found error code check in PATCH for 404 vs 500 discrimination"

key-files:
  created:
    - backend/src/routes/members.ts
    - backend/tests/members.test.ts
  modified:
    - backend/src/server.ts

key-decisions:
  - "Member schema is name-only — no contact info (email, phone, address) per MBR requirements; extra fields in request body are silently ignored"
  - "DELETE does not check for active callings — schema ON DELETE SET NULL handles cascade; deleting a member NULLs the calling reference (vacant position)"
  - "GET /api/members/:id/calling uses maybeSingle() — returns null (not 404) when member has no active set_apart calling"
  - "PATCH returns 404 by checking error.code PGRST116 or error.message 'Not found' from Supabase — avoids returning 500 for not-found updates"

patterns-established:
  - "Cached authenticated agent pattern in tests to avoid login rate limiter — same pattern as callings.test.ts"
  - "maybeSingle() for optional single-row queries that should return null rather than error"

requirements-completed:
  - MBR-01
  - MBR-02
  - MBR-03

# Metrics
duration: 4min
completed: 2026-06-12
---

# Phase 01 Plan 07: Member Roster CRUD API Summary

**Express Router with 5 name-only member endpoints (list, create, update, delete, current calling) mounted behind requireAuth in server.ts**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-12T03:03:59Z
- **Completed:** 2026-06-12T03:07:39Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Implemented all 5 member CRUD endpoints per MBR-01 through MBR-03
- Mounted membersRouter behind requireAuth in server.ts
- Wrote 22 new tests covering auth gates, validation, CRUD behavior, and current calling lookup
- All 51 tests (new + existing) passing

## Task Commits

1. **Task 1: Member CRUD routes + server mount** - `12c9c5a` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `backend/src/routes/members.ts` — 5-endpoint membersRouter: list, create, update, delete, current calling
- `backend/tests/members.test.ts` — 22 tests using cached-agent pattern (avoids rate limiter)
- `backend/src/server.ts` — Added membersRouter import and mount at /api/members

## Decisions Made

- Member data is name-only; POST and PATCH destructure only `name` from request body — extra fields (email, phone) silently ignored per requirements
- DELETE uses schema-level ON DELETE SET NULL rather than application-level guard; deleting a member NULLs their calling reference, leaving the position vacant
- GET /api/members/:id/calling returns `null` (not 404) when no active calling exists — cleaner for frontend to check `data === null`
- PATCH 404 detection via `error.code === 'PGRST116'` or `error.message === 'Not found'` — necessary because Supabase single() returns an error (not null data) when no row matches

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed PATCH returning 500 instead of 404 for non-existent member**
- **Found during:** Task 1 (test run)
- **Issue:** Route checked `if (error) return 500` before checking `if (!data) return 404`. Supabase `.single()` returns an error object when no row matches, so non-existent member updates returned 500 instead of 404.
- **Fix:** Added discriminated error check: `if (error.code === 'PGRST116' || error.message === 'Not found') return 404` before the generic 500 fallback.
- **Files modified:** backend/src/routes/members.ts
- **Verification:** Test `returns 404 for non-existent member` now passes; all 51 tests green.
- **Committed in:** `12c9c5a` (part of task commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for correct HTTP semantics. No scope creep.

## Issues Encountered

None beyond the auto-fixed bug above.

## Known Stubs

None — all endpoints are fully wired with real Supabase queries.

## Threat Flags

No new security surface beyond what the plan's threat model covers. All routes gated by requireAuth. T-07-02 (name injection) mitigated by Supabase parameterized queries and `name.trim()`.

## User Setup Required

None — no external service configuration required.

## Self-Check: PASSED

All files exist and commit `12c9c5a` verified in git log.

## Next Phase Readiness

- Member roster API complete; frontend typeahead and inline-add (D-07, D-08) can now call POST /api/members directly
- GET /api/members/:id/calling ready for pipeline detail panel to show member's current position
- All 51 backend tests passing; ready for frontend plan (01-08 or equivalent)

---
*Phase: 01-calling-pipeline-and-auth*
*Completed: 2026-06-12*
