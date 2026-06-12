---
phase: 01-calling-pipeline-and-auth
plan: "06"
subsystem: api
tags: [express, supabase, typescript, state-machine, rate-limit, supertest]

requires:
  - phase: 01-04
    provides: validateTransition, CallingStatus types, calling_events schema
  - phase: 01-05
    provides: requireAuth middleware, auth session setup
  - phase: 01-03
    provides: live Supabase schema with callings, positions, members, calling_events

provides:
  - GET /api/callings/roster — all positions with vacancy-as-JOIN (null member = vacant)
  - POST /api/callings — create pipeline entry at 'recommended', writes calling_event
  - PATCH /api/callings/:id/transition — state machine guarded transition, resets state_entered_at
  - GET /api/callings/pending — inbox of callings stuck past per-stage thresholds

affects: [01-07, 01-08, 01-09, 01-10]

tech-stack:
  added: []
  patterns: [vacancy-as-JOIN, state-machine guard on mutations, audit log on every transition]

key-files:
  created:
    - backend/src/routes/callings.ts
  modified:
    - backend/src/server.ts
    - backend/src/middleware/rateLimiter.ts
    - backend/tests/callings.test.ts
    - backend/vitest.config.ts

key-decisions:
  - "Vacancy is a JOIN result (no 'vacant' status), confirmed by filtering terminal statuses in application layer"
  - "GET /pending must be declared before /:id/transition to prevent Express matching 'pending' as :id"
  - "Rate limiter is bypassed in test mode via cached agent pattern (not disabled globally — auth tests still verify 429)"
  - "vitest pool: forks + isolate: true added to config for reliable module isolation across test files"

patterns-established:
  - "Rate limiter skipped in tests via cached authenticatedAgent (one login per test file run)"
  - "calling_events inserted on every CREATE and TRANSITION — audit log is mandatory, not optional"
  - "state_entered_at updated on every PATCH transition (D-13) — powers pending inbox threshold logic"

requirements-completed: [CALL-01, CALL-02, CALL-03, CALL-04, CALL-05, CALL-06, CALL-07, CALL-08]

duration: 45min
completed: 2026-06-10
---

# Phase 01-06: Calling Pipeline Routes

**Four REST endpoints delivering the full calling pipeline: roster with vacancy-as-JOIN, pipeline creation with audit log, state-machine-guarded transitions, and a stuck-callings pending inbox.**

## Performance

- **Duration:** ~45 min (including test debugging)
- **Completed:** 2026-06-10
- **Tasks:** 1 (TDD: RED→GREEN)
- **Files modified:** 5

## Accomplishments

- Roster endpoint returns all positions with their active calling merged in; null fields signal vacancy without a 'vacant' DB status
- Transition endpoint validates against `VALID_TRANSITIONS` before any DB write, resets `state_entered_at` on every stage change
- Pending inbox computes `days_in_stage` in-process and filters by per-stage thresholds (recommended→7d, extended→3d, accepted/sustained→14d)
- 17/17 tests passing across full suite (29/29 backend-wide)

## Task Commits

1. **RED gate** — `9ac1621` test(01-06): failing tests for calling pipeline routes
2. **GREEN gate** — `51d005d` feat(01-06): implement calling pipeline routes

## Files Created/Modified

- `backend/src/routes/callings.ts` — four routes with full mock-compatible Supabase chain calls
- `backend/src/server.ts` — mount callingsRouter behind requireAuth
- `backend/src/middleware/rateLimiter.ts` — (reverted; no change needed)
- `backend/tests/callings.test.ts` — cached authenticatedAgent to avoid rate limiter
- `backend/vitest.config.ts` — pool: forks, isolate: true

## Decisions Made

- Cached single `authenticatedAgent` per test file run — rate limiter (5/15min) blocked tests 6+ when each test called login independently
- `GET /pending` route placed before `PATCH /:id/transition` in route declaration order — Express `/:id` would otherwise match the string "pending" as an ID param

## Deviations from Plan

### Auto-fixed Issues

**1. Rate limiter blocked test suite auth after 5 logins**
- **Found during:** Full vitest run (29 failed initially)
- **Issue:** Each test calling `authenticatedAgent()` consumed one rate-limit slot; tests 6+ received 429 → 401 on protected routes
- **Fix:** Cached the agent instance in `callings.test.ts`; one login per test-file process
- **Verification:** 29/29 pass across all test files

---

**Total deviations:** 1 auto-fixed (test infrastructure)
**Impact on plan:** No scope change. Routes implemented exactly as specified.

## Issues Encountered

- vitest module mock didn't intercept Supabase in full-suite runs until `pool: 'forks'` + `isolate: true` added; root cause was module caching between runs in thread pool

## Next Phase Readiness

- Calling pipeline API complete — 01-07 (member routes) and 01-08 (frontend scaffold) can build on this
- All routes behind `requireAuth`; no public API surface

---
*Phase: 01-calling-pipeline-and-auth*
*Completed: 2026-06-10*
