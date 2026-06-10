---
plan: "01-03"
phase: "01"
status: complete
completed_at: "2026-06-10"
key-files:
  created:
    - supabase/config.toml
    - supabase/migrations/20260527000001_phase1_schema.sql (applied)
  modified:
    - backend/.env.example
deviations: []
---

# Plan 01-03: Apply Schema Migration — Complete

## What Was Built

Supabase project created (LV1 Ward Hub, `neszcnykqaepgvqvdnho`, us-west-1) and Phase 1 schema migration applied and verified via MCP tools.

## Verification Results

| Check | Result |
|-------|--------|
| 6 tables exist (org_units, positions, members, callings, calling_events, session) | ✅ PASS |
| calling_status enum (8 values) | ✅ PASS |
| callings_position_active_unique partial unique index | ✅ PASS |
| org_units seed data (8 rows) | ✅ PASS |

**calling_status values:** recommended, extended, accepted, declined, sustained, set_apart, released, cancelled

**Partial unique index confirmed:** `callings_position_active_unique` on callings(position_id) WHERE status NOT IN ('declined', 'released', 'cancelled')

## Project Details

- **Project ID:** neszcnykqaepgvqvdnho
- **URL:** https://neszcnykqaepgvqvdnho.supabase.co
- **Region:** us-west-1

## Remaining Setup (manual — not automated)

1. **Service role key** — get from Supabase Dashboard → Settings → API → service_role (secret) key → add to `backend/.env` as `SUPABASE_SERVICE_KEY`
2. **DB password** — for `SUPABASE_DB_URL` in `.env`; found in Dashboard → Settings → Database → Connection string

## Self-Check: PASSED

All must-haves verified:
- [x] All 6 Phase 1 tables exist
- [x] calling_status enum exists with 8 values
- [x] callings_position_active_unique partial unique index exists
- [x] org_units has 8 seed rows
- [x] session table exists for connect-pg-simple
