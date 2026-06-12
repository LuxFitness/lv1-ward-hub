# Roadmap: LV1 Ward Hub

## Overview

LV1 Ward Hub is built in four phases plus a mandatory infrastructure prerequisite. Phase 0 establishes the Google Cloud project and service account under the ward's Google account — required before any Google API work begins. Phase 1 delivers the complete calling pipeline with auth and responsive UI, giving the bishopric something usable immediately without any Google dependencies. Phase 2 wires in Google Calendar write capability. Phase 3 adds the one-time Google Sheets import to seed the app from existing data. Phase 4 adds Sacrament Meeting Planning as an independent module.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 0: Google Cloud Setup** - Create ward-owned Google Cloud project, service account, and calendar share — prerequisite for all Google API work
- [ ] **Phase 1: Calling Pipeline & Auth** - Complete calling management, member roster, auth, and responsive UI — fully usable without Google APIs
- [ ] **Phase 2: Google Calendar Integration** - Create and delete calendar events for interviews, setting aparts, releases, and meetings from within the app
- [ ] **Phase 3: Google Sheets Import** - One-time import from the existing ward Sheet to seed the app, with preview UI
- [ ] **Phase 4: Sacrament Meeting Planning** - Assign speakers, plan music, record conductors and presidencies for upcoming Sundays

## Phase Details

### Phase 0: Google Cloud Setup
**Goal**: A ward-owned Google Cloud project with a service account exists, has Calendar API access, and the shared ward calendar is shared to the service account — all prerequisites for Phase 2 and Phase 3 API work
**Depends on**: Nothing (first phase)
**Requirements**: *(infrastructure prerequisite — no requirement IDs; unblocks CAL-01 through CAL-06 and SHT-01 through SHT-02)*
**Success Criteria** (what must be TRUE):
  1. A Google Cloud project exists under the ward's Google account (not a personal account), with the Calendar API and Sheets API enabled
  2. A service account key JSON file exists and is stored in Render's environment variables — the app can instantiate a Google API client without error
  3. The shared ward Google Calendar is shared to the service account email with "Make changes to events" permission, confirmed by a test event creation and deletion
**Plans**: TBD
**UI hint**: no

### Phase 1: Calling Pipeline & Auth
**Goal**: Any bishopric member can log in, see every calling and its status, move a calling through the full pipeline, manage the member roster, and use the app from a phone
**Depends on**: Nothing (Phase 0 is infra setup, not a software dependency)
**Requirements**: CALL-01, CALL-02, CALL-03, CALL-04, CALL-05, CALL-06, CALL-07, CALL-08, MBR-01, MBR-02, MBR-03, AUTH-01, AUTH-02, AUTH-03, UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. User can log in with the shared password and stay logged in across browser restarts; login endpoint rejects after repeated wrong attempts
  2. User can see the complete calling roster — every position, its current holder, and its pipeline status — in a card layout that works on a phone without horizontal scrolling
  3. User can see a vacant positions view showing all unfilled positions with any consideration notes
  4. User can create a pipeline entry for a vacant position, advance it through every stage (Recommended → Extended → Accepted/Declined → Sustained → Set Apart → Active), and see the date each stage was entered
  5. User can see a pending actions inbox listing all callings that are stuck mid-pipeline and need a follow-up; the system blocks creating a second active pipeline entry for a position that already has one in progress
**Plans**: 10 plans

Plans:
- [x] 01-01-PLAN.md — Backend scaffold: Express server, Supabase client, auth/rate-limit middleware
- [x] 01-02-PLAN.md — Database migration SQL: all Phase 1 tables, enum, partial unique index, org_units seed
- [x] 01-03-PLAN.md — [BLOCKING] Schema push to Supabase + verification checkpoint
- [x] 01-04-PLAN.md — State machine TDD: CallingStatus types + VALID_TRANSITIONS + test suite
- [x] 01-05-PLAN.md — Auth routes: login, check, logout with rate limiting and session fixation prevention
- [ ] 01-06-PLAN.md — Calling API routes: roster, create, transition, pending inbox
- [x] 01-07-PLAN.md — Member CRUD API: list, create, update, delete, current-calling lookup
- [ ] 01-08-PLAN.md — Frontend scaffold: Vite + shadcn/ui + Tailwind v4 + LoginPage + apiFetch + uiStore
- [ ] 01-09-PLAN.md — Roster UI: RosterView (org-grouped) + CallingPanel (Sheet with valid-only actions)
- [ ] 01-10-PLAN.md — Pending Inbox + MemberSearch typeahead + Members management tab

**UI hint**: yes

### Phase 2: Google Calendar Integration
**Goal**: Users can create and delete Google Calendar events for key calling milestones and meetings without leaving the app, and those events appear on the shared ward calendar
**Depends on**: Phase 0, Phase 1
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, CAL-06
**Success Criteria** (what must be TRUE):
  1. User can schedule a calling interview from a pipeline record — a dated event with the recommended member and bishopric member appears on the shared ward Google Calendar
  2. User can schedule a setting-apart appointment after a member is sustained — a dated event appears on the shared ward calendar
  3. User can schedule a release event when releasing a member, and can create ward council and bishopric meeting events from within the app
  4. When a calling pipeline entry is cancelled or declined, any associated interview or setting-apart calendar events are automatically deleted from the shared ward calendar
**Plans**: TBD
**UI hint**: yes

### Phase 3: Google Sheets Import
**Goal**: The existing calling data from the ward's Google Sheet is imported into the app in a single operation, with a preview that lets the user verify what will be created before committing
**Depends on**: Phase 0, Phase 1
**Requirements**: SHT-01, SHT-02
**Success Criteria** (what must be TRUE):
  1. User can trigger a Sheet import from within the app and see a preview table showing every position, member, and current holder that will be created, with duplicate positions and name conflicts highlighted
  2. User can confirm the import and have the app's calling roster seeded from the Sheet data without losing any existing app records
**Plans**: TBD
**UI hint**: yes

### Phase 4: Sacrament Meeting Planning
**Goal**: Users can plan upcoming Sacrament Meetings — assigning speakers, tracking topics, scheduling music, and recording who conducts and presides — independent of the calling pipeline
**Depends on**: Phase 1
**Requirements**: SAC-01, SAC-02, SAC-03, SAC-04
**Success Criteria** (what must be TRUE):
  1. User can assign speakers to specific upcoming Sundays with a talk topic, and can see when each member last spoke (date and topic) to avoid repeating speakers too soon
  2. User can plan musical numbers for each Sunday (sacrament hymn, intermediate hymn, choir, special music) and record who is conducting and presiding that week
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 0 → 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Google Cloud Setup | 0/TBD | Not started | - |
| 1. Calling Pipeline & Auth | 7/10 | Executing | - |
| 2. Google Calendar Integration | 0/TBD | Not started | - |
| 3. Google Sheets Import | 0/TBD | Not started | - |
| 4. Sacrament Meeting Planning | 0/TBD | Not started | - |
