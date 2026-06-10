---
phase: 1
phase-slug: calling-pipeline-and-auth
date: 2026-05-27
---

# Phase 1: Calling Pipeline & Auth — Validation Strategy

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 |
| Config file | `backend/vitest.config.ts` |
| Quick run | `npx vitest run` |
| Full suite | `npx vitest run --coverage` |

## Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Test File |
|--------|----------|-----------|-------------------|-----------|
| CALL-04 | All valid transitions accepted, invalid rejected | unit | `npx vitest run tests/stateMachine.test.ts` | backend/tests/stateMachine.test.ts |
| CALL-07 | Duplicate pipeline entries rejected (partial unique index) | unit | `npx vitest run tests/stateMachine.test.ts` | backend/tests/stateMachine.test.ts |
| CALL-08 | state_entered_at updated on every transition | unit | `npx vitest run tests/callings.test.ts` | backend/tests/callings.test.ts |
| CALL-06 | Pending inbox returns callings past per-stage threshold | unit | `npx vitest run tests/pending.test.ts` | backend/tests/pending.test.ts |
| AUTH-01 | Wrong password returns 401; correct password returns 200 | unit | `npx vitest run tests/auth.test.ts` | backend/tests/auth.test.ts |
| AUTH-03 | 6th login attempt within 15min returns 429 | unit | `npx vitest run tests/auth.test.ts` | backend/tests/auth.test.ts |
| AUTH-02 | Session persists across requests (cookie sent on subsequent call) | integration | manual smoke test | — |
| UI-01 | Roster renders without horizontal scroll at 375px viewport | manual | — | — |

## Sampling Rate

- **Per task commit:** `npx vitest run tests/stateMachine.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

## Wave 0 Gaps (must exist before Wave 3)

- [ ] `backend/tests/stateMachine.test.ts` — covers CALL-04, CALL-07
- [ ] `backend/tests/auth.test.ts` — covers AUTH-01, AUTH-03
- [ ] `backend/tests/pending.test.ts` — covers CALL-06
- [ ] `backend/tests/callings.test.ts` — covers CALL-08
- [ ] `backend/vitest.config.ts` — Vitest configuration
- [ ] `npm install -D vitest` in backend/

## Manual Verification Checklist

- [ ] POST /api/auth/login with correct password → 200 + Set-Cookie header
- [ ] POST /api/auth/login with wrong password → 401, body: `{ error: "Invalid credentials" }`
- [ ] 6 rapid POSTs to /api/auth/login → 6th returns 429
- [ ] GET /api/callings (after login) → 200 with org-grouped roster array
- [ ] GET /api/callings/pending → returns callings past threshold
- [ ] PATCH /api/callings/:id/transition with invalid transition → 422
- [ ] Roster renders on 375px viewport (iPhone SE) without horizontal scroll
- [ ] CallingPanel slides in from right on desktop; full-screen on mobile
- [ ] Session cookie survives page reload (AUTH-02)
