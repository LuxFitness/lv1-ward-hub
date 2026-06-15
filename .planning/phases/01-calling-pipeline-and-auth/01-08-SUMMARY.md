---
phase: 01-calling-pipeline-and-auth
plan: "08"
subsystem: ui
tags: [react, vite, tailwind, zustand, typescript]

requires:
  - phase: 01-05
    provides: POST /api/auth/login, GET /api/auth/check

provides:
  - React 18 + Vite frontend scaffold with Tailwind v4
  - apiFetch wrapper with credentials:include
  - Zustand auth store (isAuthenticated, isLoading, error)
  - LoginPage with 401/429 error handling
  - Auth-gated App shell (check on mount → login or dashboard placeholder)

affects: [01-09, 01-10]

tech-stack:
  added: [react, react-dom, vite, tailwindcss, @tailwindcss/vite, zustand, @tanstack/react-query, react-hook-form, zod]
  patterns: [Tailwind v4 @theme CSS vars, Zustand for auth state, apiFetch with credentials:include]

key-files:
  created:
    - frontend/src/lib/api.ts
    - frontend/src/store/uiStore.ts
    - frontend/src/types.ts
    - frontend/src/components/LoginPage.tsx
    - frontend/src/App.tsx
    - frontend/vite.config.ts
    - frontend/src/index.css

key-decisions:
  - "Tailwind v4 via @tailwindcss/vite plugin — no tailwind.config.js, CSS @theme for tokens"
  - "ignoreDeprecations: 6.0 added to tsconfig for baseUrl/paths (TS7 deprecation warning)"
  - "apiFetch throws ApiError with status code — callers distinguish 401 vs 429 vs 500"

patterns-established:
  - "All API calls via apiFetch (credentials:include, JSON Content-Type, throws ApiError on non-OK)"
  - "Auth state in Zustand useUiStore — single source of truth for isAuthenticated"

requirements-completed: [AUTH-01, UI-01]

duration: 20min
completed: 2026-06-15
---

# Phase 01-08: React Frontend Scaffold

**Vite + React 18 + Tailwind v4 (no config file) frontend with auth-gated App shell, apiFetch wrapper, Zustand store, and LoginPage.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-06-15
- **Tasks:** 2/2
- **Files modified:** 22

## Accomplishments

- Tailwind v4 wired via `@tailwindcss/vite` plugin — `@import "tailwindcss"` + `@theme` tokens in index.css, no config file
- `apiFetch` wraps all backend calls with `credentials: 'include'`, typed generics, and `ApiError` for status-aware error handling
- `useUiStore` (Zustand v5) holds `isAuthenticated`, `isLoading`, `error` — single auth source of truth
- `App.tsx` checks `/api/auth/check` on mount and routes to `LoginPage` or dashboard placeholder
- LoginPage handles 401 (wrong password) and 429 (rate limited) distinctly

## Task Commits

1. **Task 1 + 2** — `b2c1cbe` feat(01-08): scaffold React frontend

## Files Created/Modified

- `frontend/src/lib/api.ts` — apiFetch + ApiError class
- `frontend/src/store/uiStore.ts` — Zustand auth state
- `frontend/src/types.ts` — mirrored backend types + RosterEntry, PendingCalling
- `frontend/src/components/LoginPage.tsx` — login form
- `frontend/src/App.tsx` — auth-gated shell
- `frontend/vite.config.ts` — Tailwind v4 plugin + /api proxy + @/ alias
- `frontend/src/index.css` — @import tailwindcss + @theme tokens

## Decisions Made

- `ignoreDeprecations: "6.0"` added to tsconfig — TypeScript 5 warns that `baseUrl` is deprecated but it's required for `@/` path aliases until TS7 ships new syntax

## Deviations from Plan

None — plan executed as specified.

## Issues Encountered

- Previous agent created bare Vite scaffold but didn't install dependencies or create custom files — completed manually

## Next Phase Readiness

- Frontend scaffold ready for 01-09 (RosterView + CallingPanel)
- Vite proxy routes `/api/*` → `localhost:5001` for local dev
- shadcn/ui not yet initialized — 01-09 can add components as needed

---
*Phase: 01-calling-pipeline-and-auth*
*Completed: 2026-06-15*
