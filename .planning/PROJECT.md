# LV1 Ward Hub

## What This Is

LV1 Ward Hub is a web app for the Long Valley 1st Ward bishopric and ward council to manage callings, meetings, and ward administration from a single place. It replaces a scattered collection of Google Sheets and files with a unified dashboard accessible on both web and phone, synchronized with the ward's existing Google Calendar and Google Sheets.

## Core Value

Any bishopric member can instantly see where every calling stands — who's in what position, what's pending, and what's fallen through the cracks.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Callings Management**
- [ ] View the complete roster of all ward callings with current holder and status
- [ ] See all open/vacant positions that need to be filled with consideration notes
- [ ] Track calling pipeline: Recommended → Extended → Accepted/Declined → Sustained → Set Apart
- [ ] Add, edit, and release members from callings
- [ ] Store member names (no contact info, no sensitive data)

**Calendar Integration**
- [ ] Create Google Calendar events on the existing shared ward calendar from within the app
- [ ] Schedule calling interviews (recommended member + bishopric member + time/location)
- [ ] Schedule setting apart appointments after a member is sustained
- [ ] Schedule ward council meetings and bishopric meetings with agenda context
- [ ] Schedule sacrament meeting prep reminders for speakers

**Google Sheets Sync**
- [ ] Two-way sync between the app and existing Google Sheets (app ↔ Sheets)
- [ ] Import existing Sheet data to seed the app on initial setup

**Access & Auth**
- [ ] Single shared password protects the app (no individual accounts)
- [ ] Works on both desktop browser and mobile browser (responsive design)

### Out of Scope

- Temple recommend tracking — privacy decision; sensitive pastoral data stays out
- Interview notes or details — only scheduling (date/time/who) is tracked
- Individual user accounts / audit trails — single shared password, no per-user tracking
- Native mobile app — responsive web works on phone without the App Store overhead
- Stake or general authority data — ward-level scope only for now
- YM/YW, EQ/RS, ward/stake activity calendar events — deferred to a later milestone after core callings+calendar is proven
- Auxiliary-level calling management by non-bishopric users — bishopric manages all callings

## Context

- **Existing infrastructure:** Supabase (already provisioned), Vercel + Render (existing hosting) — no new accounts needed
- **Existing Google assets:** Shared ward Google Calendar already exists; existing Google Sheets hold current calling/meeting data
- **Current pain:** The calling pipeline (extended → accepted → sustained → set apart) loses track between steps — people fall through the cracks; no single place to see what's pending
- **Ward scale:** Growing ward, ~15-20 ward council members who need visibility
- **Privacy posture:** No sensitive pastoral data. Everything visible to entire ward council. Single shared password is acceptable given low sensitivity of data stored.
- **Google integration complexity note:** True two-way Sheets sync requires conflict resolution and webhook/polling infrastructure. Initial implementation may use import + write-back, with true sync as a hardening milestone.

## Constraints

- **Tech stack**: React + Supabase + Vercel/Render — consistent with user's existing projects
- **Auth**: Single shared password — no OAuth, no individual accounts, keeps it simple
- **Data sensitivity**: No temple recommend status, no interview content, no PII beyond member names
- **Google APIs**: Requires Google Calendar API + Google Sheets API credentials (OAuth service account or user OAuth flow)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single shared password (not individual accounts) | Low data sensitivity; simpler for bishopric adoption; no account management overhead | — Pending |
| Web app only (no native mobile) | Responsive web covers the phone use case without App Store friction | — Pending |
| True two-way Google Sheets sync | User wants existing sheet workflows to keep working | — Pending (complexity risk — may phase this) |
| Supabase as primary database | Already provisioned; avoids new infrastructure | — Pending |
| Callings + calendar as v1 core | Addresses the #1 pain (callings out of sync) and adds immediate calendar utility | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-26 after initialization*
