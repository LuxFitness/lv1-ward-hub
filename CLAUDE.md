# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project

**LV1 Ward Hub** — Ward management app for the Long Valley 1st Ward bishopric and ward council. Consolidates callings, calendar scheduling, and sacrament meeting planning from scattered Google Sheets into a single responsive web app.

## GSD Workflow

This project uses the GSD workflow. Planning artifacts live in `.planning/`.

- **Roadmap**: `.planning/ROADMAP.md` — 5 phases (Phase 0 infra setup through Phase 4 sacrament planning)
- **Requirements**: `.planning/REQUIREMENTS.md` — 29 v1 requirements with REQ-IDs
- **Research**: `.planning/research/` — Stack, features, architecture, pitfalls, and synthesis

**Start here**: `/gsd-discuss-phase 1` (after completing Phase 0 manually)

## Stack

- **Frontend**: React 18 + Vite 6, TypeScript 5, shadcn/ui + Tailwind CSS 3
- **State**: TanStack Query v5 (server state), Zustand v5 (UI state)
- **Forms**: React Hook Form v7 + Zod v4
- **Backend**: Express 4, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Google APIs**: `googleapis` v172 via service account (not user OAuth)
- **Auth**: Single shared password — bcrypt + express-session + connect-pg-simple
- **Deploy**: Vercel (frontend) + Render (backend)

## Critical Architecture Decisions

1. **Google APIs use a service account** — not user OAuth. The ward calendar and sheet are shared to the service account email. Never use per-user Google OAuth.
2. **GCP project must be under the ward's Google account** — not anyone's personal account. Bishopric turnover will break the app otherwise.
3. **Calling status is a PostgreSQL enum** with Express-side transition guards. Valid transitions enforced in middleware.
4. **Partial unique index on callings**: `UNIQUE(position_id) WHERE status NOT IN ('declined', 'released', 'cancelled')` — prevents duplicate active callings for the same position.
5. **`state_entered_at` column required** on all calling stage transitions — powers the pending actions inbox "stuck for X days" logic.
6. **No Supabase Auth** — shared password auth via express-session stored in Supabase Postgres.

## Key Pitfalls to Avoid

- OAuth consent screen left in "Testing" mode → refresh tokens expire after 7 days silently breaking Calendar/Sheets
- Hardcoded column indexes in Sheets sync → column drift corrupts data silently
- Calendar events owned by a personal account → bishopric turnover breaks event management
- Cross-origin session cookies: Vercel frontend + Render backend requires `credentials: 'include'` on fetch and `sameSite: 'lax'`, `secure: true`, explicit CORS config

## Data Sensitivity

No sensitive pastoral data is stored. No temple recommend status, no interview content, no contact info — member names only. Single shared password is intentional for this use case.
