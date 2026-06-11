---
phase: "01"
plan: "05"
subsystem: "auth"
tags: ["auth", "express-session", "bcrypt", "rate-limiting", "tdd"]
dependency_graph:
  requires:
    - "01-01: server.ts scaffold with session middleware and requireAuth"
    - "01-01: rateLimiter.ts with loginRateLimiter and loginSlowDown"
  provides:
    - "POST /api/auth/login — bcrypt password check, session regeneration, rate-limited"
    - "GET /api/auth/check — session-based auth verification"
    - "POST /api/auth/logout — session destruction"
    - "backend/tests/auth.test.ts — AUTH-01 and AUTH-03 test coverage"
  affects:
    - "All subsequent API plans (auth is the gate for protected routes)"
tech_stack:
  added:
    - "supertest@^6.x — HTTP testing against Express app without network"
    - "@types/supertest"
  patterns:
    - "TDD RED/GREEN cycle: failing tests committed before implementation"
    - "NODE_ENV=test branches session store to in-memory (avoids Postgres dependency in unit tests)"
    - "req.session.regenerate() on successful login prevents session fixation (T-05-02)"
    - "Generic 'Invalid credentials' message for both wrong-password and missing-password cases (T-05-03)"
key_files:
  created:
    - "backend/src/routes/auth.ts — authRouter with /login, /check, /logout"
    - "backend/tests/auth.test.ts — 6 tests covering AUTH-01, AUTH-03"
    - "backend/vitest.config.ts — Vitest test runner configuration"
  modified:
    - "backend/src/server.ts — import authRouter, branch session store for test env, mount /api/auth"
    - "backend/package.json — added supertest, @types/supertest dev dependencies"
decisions:
  - "NODE_ENV=test uses express-session built-in memory store — avoids Postgres connection requirement in unit tests while keeping production behavior unchanged"
  - "cookie.secure set to false in test mode — supertest does not run over HTTPS; production retains secure: true"
  - "loginSlowDown applied before loginRateLimiter in route chain — progressive delay fires first, hard limit second"
metrics:
  duration: "2m 22s"
  completed_date: "2026-06-10"
  tasks_completed: 1
  files_created: 3
  files_modified: 2
---

# Phase 1 Plan 5: Auth Endpoints (login, check, logout) Summary

**One-liner:** bcrypt shared-password login with session regeneration, rate limiting (5/15min/IP), and in-memory test store branch.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | Write failing auth tests | df1d0c3 | backend/tests/auth.test.ts, backend/vitest.config.ts |
| GREEN | Implement auth routes and mount | dbdf5d5 | backend/src/routes/auth.ts, backend/src/server.ts |

## What Was Built

Three auth endpoints implementing requirements AUTH-01, AUTH-02, AUTH-03:

**`POST /api/auth/login`**
- Applies `loginSlowDown` then `loginRateLimiter` (5 attempts/15min/IP — AUTH-03)
- `bcrypt.compare(body.password, process.env.APP_PASSWORD_HASH)` — AUTH-01
- On success: `req.session.regenerate()` → sets `session.authenticated = true` → `session.save()` → 200 `{ ok: true }`
- On failure (wrong password or missing hash): 401 `{ error: 'Invalid credentials' }` — same message for both cases (T-05-03, no oracle)

**`GET /api/auth/check`**
- No auth middleware — this IS the auth check
- Returns 200 `{ authenticated: true }` if `session.authenticated === true`
- Returns 401 `{ authenticated: false }` otherwise

**`POST /api/auth/logout`**
- `req.session.destroy()` → `res.clearCookie('connect.sid')` → 200 `{ ok: true }`

**`backend/src/server.ts` changes:**
- `app.use('/api/auth', authRouter)` mounted before any `requireAuth` middleware
- Session store branches: `NODE_ENV=test` → `undefined` (express-session in-memory); production → `new PGStore(...)` (Supabase Postgres — AUTH-02)
- `cookie.secure` set to `false` in test environment

## Test Coverage

6 tests in `backend/tests/auth.test.ts`, all passing:

1. Correct password → 200 `{ ok: true }`
2. Wrong password → 401 `{ error: 'Invalid credentials' }` (AUTH-01)
3. 6 wrong-password requests, same IP → first 5 are 401, 6th is 429 (AUTH-03)
4. `/check` with no session → 401 `{ authenticated: false }`
5. `/check` after login with agent (cookie persisted) → 200 `{ authenticated: true }`
6. Logout → 200 `{ ok: true }` + subsequent `/check` returns 401

## TDD Gate Compliance

- RED gate: `test(01-05)` commit `df1d0c3` — 6 tests, all failing before implementation
- GREEN gate: `feat(01-05)` commit `dbdf5d5` — all 6 tests passing after implementation
- REFACTOR gate: Not needed — implementation was clean

## Deviations from Plan

None — plan executed exactly as written.

The plan's suggested NODE_ENV test-mode branching was already specified in the task. The `cookie.secure: false` in test mode was a minor addition (Rule 2 — without it, the in-memory store session cookie would be rejected by supertest since it does not run over HTTPS).

## Threat Mitigations Applied

| Threat | Mitigation | Verified |
|--------|-----------|---------|
| T-05-01 Brute force | `loginSlowDown` + `loginRateLimiter` (5/15min/IP) | Test 3 confirms 429 on 6th attempt |
| T-05-02 Session fixation | `req.session.regenerate()` on every successful login | `grep -c regenerate auth.ts` = 1 |
| T-05-03 Info disclosure | Both wrong-password and missing-password return identical `{ error: 'Invalid credentials' }` | Test 2 confirms message |

## Known Stubs

None — all endpoints are fully functional.

## Threat Flags

None — no new network surface beyond what the plan specified.

## Self-Check: PASSED

- `backend/src/routes/auth.ts` — EXISTS
- `backend/tests/auth.test.ts` — EXISTS
- `01-05-SUMMARY.md` — EXISTS
- Commits `df1d0c3` (RED) and `dbdf5d5` (GREEN) — CONFIRMED in git log
- `npx vitest run tests/auth.test.ts` — 6/6 PASSED
- `npx tsc --noEmit` — 0 errors
