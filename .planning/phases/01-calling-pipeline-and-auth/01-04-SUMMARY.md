---
phase: "01"
plan: "04"
subsystem: "backend/state-machine"
tags: ["tdd", "state-machine", "types", "vitest"]
dependency_graph:
  requires: ["01-01"]
  provides: ["CallingStatus type", "VALID_TRANSITIONS map", "validateTransition function", "backend TypeScript types"]
  affects: ["backend/src/routes/callings.ts", "any route handler calling validateTransition"]
tech_stack:
  added: ["vitest@4.1.7 (test runner)"]
  patterns: ["TDD RED/GREEN cycle", "VALID_TRANSITIONS record map", "union type for domain enum"]
key_files:
  created:
    - backend/src/types.ts
    - backend/src/lib/stateMachine.ts
    - backend/tests/stateMachine.test.ts
    - backend/vitest.config.ts
  modified: []
decisions:
  - "State machine implemented as VALID_TRANSITIONS Record<CallingStatus, CallingStatus[]> — exhaustive, testable, all valid transitions in one place per RESEARCH.md recommendation"
  - "CallingStatus is a TypeScript union type (not enum) — avoids enum runtime footprint, works cleanly with Supabase string columns"
  - "Terminal states (declined, released, cancelled) map to empty arrays — no special-casing needed in validateTransition"
metrics:
  duration: "2 minutes"
  completed_date: "2026-06-10"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
requirements_covered: ["CALL-04", "CALL-07", "CALL-08"]
---

# Phase 01 Plan 04: Calling Pipeline State Machine Summary

**One-liner:** TypeScript union CallingStatus type and VALID_TRANSITIONS record map with validateTransition enforcer — 6 tests green, tsc clean.

## What Was Built

The core domain logic for the calling pipeline:

- `backend/src/types.ts` — `CallingStatus` union type (8 values), `MemberRow`, `PositionRow`, `CallingRow` (includes `state_entered_at` per D-13), `CallingEventRow` interfaces
- `backend/src/lib/stateMachine.ts` — `VALID_TRANSITIONS: Record<CallingStatus, CallingStatus[]>` and `validateTransition(from, to)` that throws `Error` on invalid transitions
- `backend/vitest.config.ts` — vitest configuration targeting `tests/**/*.test.ts`
- `backend/tests/stateMachine.test.ts` — full test suite: valid transitions, invalid transitions, backward transitions, terminal states, error message format, exhaustiveness check

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test) | `0860ef1` — `test(01-04): add failing state machine tests` | PASSED — tests failed with "Cannot find module '../src/lib/stateMachine'" |
| GREEN (feat) | `5cc3fa5` — `feat(01-04): implement calling pipeline state machine` | PASSED — all 6 tests green |
| REFACTOR | N/A | Not needed — implementation was clean on first pass |

## Test Results

```
Test Files  1 passed (1)
     Tests  6 passed (6)
  Duration  112ms
```

Test cases:
1. Accepts all valid transitions (loops over every VALID_TRANSITIONS entry)
2. Rejects invalid transitions (recommended→accepted, extended→set_apart, declined→recommended, released→recommended, cancelled→extended)
3. Rejects backward transitions (set_apart→recommended, sustained→extended, set_apart→cancelled)
4. Terminal states have no valid transitions (declined, released, cancelled all map to `[]`)
5. Error message includes both from and to status strings
6. VALID_TRANSITIONS is exhaustive — all 8 CallingStatus keys present

## Verification

- `cd backend && npx vitest run tests/stateMachine.test.ts` — exits 0, 6/6 pass
- `npx tsc --noEmit` — exits 0, no TypeScript errors
- `grep -c "set_apart.*released" backend/src/lib/stateMachine.ts` — returns 1

## Deviations from Plan

None — plan executed exactly as written. Both files match the interfaces block verbatim.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. This plan is pure domain logic and type definitions. The `validateTransition` function is the enforcement point referenced in the threat model (T-04-01) — it is implemented correctly and will be called in route handlers before any DB write.

## Known Stubs

None — this plan contains no UI rendering, data flow, or placeholder values.

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| `0860ef1` | test | add failing state machine tests (RED gate) |
| `5cc3fa5` | feat | implement calling pipeline state machine (GREEN gate) |

## Self-Check: PASSED

- `backend/src/types.ts` — FOUND
- `backend/src/lib/stateMachine.ts` — FOUND
- `backend/vitest.config.ts` — FOUND
- `backend/tests/stateMachine.test.ts` — FOUND
- Commit `0860ef1` — FOUND
- Commit `5cc3fa5` — FOUND
