---
phase: 01-calling-pipeline-and-auth
plan: "01"
subsystem: infra
tags: [express, typescript, session, bcrypt, rate-limit, supabase, cors]

# Dependency graph
requires: []
provides:
  - Express TypeScript backend scaffold with trust proxy, CORS, helmet, and session middleware
  - requireAuth middleware gating all non-auth API routes
  - Supabase service_role client singleton
  - loginRateLimiter (5 attempts/15min/IP) and loginSlowDown exports
  - GET /api/health endpoint returning { status: 'ok' }
  - backend package.json with all prod + dev dependencies
  - backend tsconfig.json with strict mode and CommonJS target
  - backend .env.example documenting all required environment variables
affects: [02-auth-routes, 03-db-schema, 04-callings-crud, all-backend-plans]

# Tech tracking
tech-stack:
  added:
    - express@5.2.1
    - cors@2.8.6
    - helmet@8.2.0
    - express-session@1.19.0
    - connect-pg-simple@10.0.0
    - bcryptjs@3.0.3
    - express-rate-limit@8.5.2
    - express-slow-down@3.1.0
    - "@supabase/supabase-js@2.106.2"
    - dotenv@16
    - typescript@5.8
    - ts-node-dev@2
    - vitest@4.1.7
  patterns:
    - "Express app exported separately from app.listen for testability (require.main guard)"
    - "dotenv/config imported first in server.ts before any env-dependent imports"
    - "connect-pg-simple factory pattern: connectPg(session) to create PGStore class"
    - "Session augmentation via declare module 'express-session' for typed authenticated flag"

key-files:
  created:
    - backend/package.json
    - backend/tsconfig.json
    - backend/.env.example
    - backend/src/server.ts
    - backend/src/db.ts
    - backend/src/middleware/auth.ts
    - backend/src/middleware/rateLimiter.ts
    - .gitignore
  modified: []

key-decisions:
  - "server.ts exports app and calls listen only via require.main guard — enables test imports without server startup"
  - "dotenv/config imported first in server.ts to ensure env vars loaded before Supabase client init"
  - ".gitignore created (was missing) to prevent node_modules from being committed"

patterns-established:
  - "Pattern: requireAuth checks req.session.authenticated === true; returns generic 401 (no info disclosure)"
  - "Pattern: trust proxy = 1 set before CORS and session middleware — required for Render reverse proxy"
  - "Pattern: Supabase client throws at module load if env vars missing — fail fast"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 8min
completed: 2026-06-10
---

# Phase 01 Plan 01: Express Backend Scaffold Summary

**Express + TypeScript backend scaffold with cross-origin session cookie config, requireAuth middleware, Supabase service_role client, and bcrypt-compatible rate limiter — all dependencies installed, TypeScript compiles clean**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-10T03:35:02Z
- **Completed:** 2026-06-10T03:43:00Z
- **Tasks:** 2
- **Files modified:** 8 (7 created + .gitignore)

## Accomplishments

- Installed all 10 production and 9 development dependencies for the backend; TypeScript compiles clean with strict mode
- Created Express server with exact cross-origin cookie config: trust proxy, CORS credentials, sameSite lax, rolling sessions via PGStore (connect-pg-simple)
- Created requireAuth middleware, Supabase service_role client singleton, and rate limiter exports as specified in the plan interfaces

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize backend package and install all dependencies** - `767a10c` (chore)
2. **Task 2: Create Express server, Supabase client, and auth/rate-limit middleware** - `5b6573b` (feat)

**Plan metadata:** (committed with SUMMARY.md below)

## Files Created/Modified

- `backend/package.json` - npm manifest with all prod/dev deps; dev/build/start/test scripts
- `backend/tsconfig.json` - TypeScript config: ES2020 target, CommonJS module, strict mode, skipLibCheck
- `backend/.env.example` - Documents SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_DB_URL, SESSION_SECRET, APP_PASSWORD_HASH, FRONTEND_URL, PORT
- `backend/src/server.ts` - Express app: trust proxy, helmet, CORS, express-session with PGStore, GET /api/health
- `backend/src/db.ts` - Supabase createClient singleton with service_role key; throws on missing env vars
- `backend/src/middleware/auth.ts` - requireAuth: checks req.session.authenticated === true, 401 on fail
- `backend/src/middleware/rateLimiter.ts` - loginRateLimiter (max 5/15min) and loginSlowDown (delay after 2 hits)
- `.gitignore` - Created (was missing); ignores node_modules, dist, .env, OS files

## Decisions Made

- Used `import 'dotenv/config'` as first line of server.ts so env vars are available before any module that reads them (including db.ts via session PGStore)
- Exported `app` from server.ts and gated `app.listen()` behind `require.main === module` check — enables test imports without binding to a port
- Created .gitignore (plan did not include it, but node_modules being untracked was a deviation risk)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Created .gitignore**
- **Found during:** Task 1 (after npm install completed)
- **Issue:** No .gitignore existed in the project root; `backend/node_modules/` appeared as untracked which would have been committed accidentally
- **Fix:** Created `.gitignore` with standard Node.js ignores (node_modules, dist, .env, OS files)
- **Files modified:** `.gitignore` (new)
- **Verification:** `git status --short` confirms node_modules no longer appears as untracked
- **Committed in:** 5b6573b (Task 2 commit — .gitignore staged at same time)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** .gitignore is a correctness requirement for any Node project with node_modules. No scope creep.

## Issues Encountered

- Port 5001 was already in use by the FitSync health platform backend during server smoke test. Used PORT=5099 for test and confirmed `{ "status": "ok" }` response. No impact on the deliverable.

## User Setup Required

None — no external service configuration required at this stage. The .env.example documents what will be needed when deploying, but this plan only scaffolds the server skeleton.

## Next Phase Readiness

- Express backend scaffold is complete; plan 01-02 (auth routes) can proceed immediately
- The requireAuth middleware and loginRateLimiter are ready to be wired into auth routes
- Supabase client is ready; actual DB connection requires SUPABASE_DB_URL and SUPABASE_SERVICE_KEY in .env
- node_modules not committed (gitignore in place); backend/package-lock.json should be committed in a follow-up

---
*Phase: 01-calling-pipeline-and-auth*
*Completed: 2026-06-10*
