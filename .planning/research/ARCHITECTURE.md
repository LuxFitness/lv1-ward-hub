# Architecture Patterns

**Domain:** Ward / congregation management web app with Google Workspace integration
**Researched:** 2026-05-26

---

## Recommended Architecture

A three-layer system: React SPA (Vite) on the frontend, an Express.js API server on the backend, and Supabase (PostgreSQL) as the primary database. Google APIs (Calendar + Sheets) are called exclusively from the backend — never the frontend — so credentials never touch the browser.

```
Browser (React SPA)
  │
  │  HTTPS + session cookie
  ▼
Express.js API Server (Render)
  ├── /api/auth          — shared password check, session issue
  ├── /api/callings      — CRUD for calling records + state transitions
  ├── /api/calendar      — proxy to Google Calendar API
  ├── /api/sheets        — proxy to Google Sheets API (import + write-back)
  └── /api/positions     — ward org structure queries
  │
  ├── Supabase (PostgreSQL) — primary source of truth
  └── Google APIs (OAuth service account)
        ├── Calendar API v3
        └── Sheets API v4
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| React SPA | UI rendering, session state, optimistic updates | Express API only (relative /api paths) |
| Express API | Business logic, state machine enforcement, Google API proxy | Supabase, Google Calendar API, Google Sheets API |
| Supabase (PostgreSQL) | Source of truth for all app data | Express API only |
| Google Calendar API | Owns calendar event state; app stores the event ID | Express API (OAuth service account) |
| Google Sheets API | External view of calling data; app reads + writes back | Express API (OAuth service account or user OAuth) |

**Critical boundary rule:** The browser never holds Google API tokens. All Google calls route through Express. This prevents credential leakage and centralizes token refresh logic.

---

## Data Flow Direction

### Normal operations (app → database)
```
User action in React
  → POST/PATCH /api/callings/:id/transition
  → Express validates transition (state machine check)
  → Supabase UPDATE callings SET status = 'extended', updated_at = now()
  → 200 OK → React optimistic update confirmed
```

### Calendar event lifecycle
```
User schedules interview
  → POST /api/calendar/events
  → Express calls Google Calendar API (insert)
  → Google returns { id: 'gcal_event_id' }
  → Express writes gcal_event_id to callings.interview_event_id in Supabase
  → React shows "interview scheduled" state

User cancels calling
  → PATCH /api/callings/:id { status: 'cancelled' }
  → Express checks callings.interview_event_id
  → If present → DELETE /calendar/v3/calendars/.../events/:gcal_event_id
  → Express clears interview_event_id in Supabase
  → Supabase UPDATE callings SET status = 'cancelled', interview_event_id = NULL
```

### Google Sheets sync (import-first model)
```
Initial import
  → GET /api/sheets/import
  → Express reads Sheets API v4 (spreadsheetValues.get)
  → Express maps rows to callings schema
  → Supabase bulk upsert (conflict on position_id)

Write-back (app → Sheet)
  → Any calling update triggers background job
  → Express calls Sheets API (values.update or batchUpdate)
  → Updates the corresponding row in the sheet

Sheet → App detection (polling, not webhooks)
  → Scheduled job every 5 minutes (cron on Render, or setInterval)
  → GET Sheets API for modified rows since last_synced_at
  → Compare with Supabase; apply non-conflicting changes
  → Flag conflicts for manual resolution (see conflict strategy below)
```

---

## 1. Google Sheets Two-Way Sync

### Recommendation: Import-first, polling write-back — NOT true bidirectional sync for v1

True bidirectional sync is a hardening milestone, not a v1 feature. The PROJECT.md already flags this. Here is why and what to build instead.

**Why webhooks (push notifications) are not the right v1 choice:**

The Google Drive Changes API does support push notifications (watch channels), but they have critical limitations for this use case:
- Notifications expire after ~1 hour (max 1 week); require constant re-registration
- Notifications are vague: they say "file XYZ changed" but not what changed or who changed it
- You must then call Changes.list to retrieve the actual diff — it is effectively polling with a trigger
- Apps Script onChange triggers do NOT fire when changes are made via the Sheets API — only when a human edits in the browser
- Minimum batching interval is ~3 minutes even with push notifications

**Recommended v1 sync strategy:**

| Direction | Mechanism | Frequency |
|-----------|-----------|-----------|
| Sheet → App | Polling (Sheets API spreadsheetValues.get) | Every 5 min via server cron |
| App → Sheet | Synchronous write-back on every calling update | Immediate (on save) |

**Conflict resolution strategy: last-write-wins with a source-of-truth flag**

Use a `sheets_synced_at` column and a `last_modified_by` enum (`'app'` or `'sheet'`) on every calling row. The rule:

- If the app updated a row after the last sheets poll → app wins; write app value to sheet
- If the sheet row has a newer timestamp than `sheets_synced_at` → sheet wins; overwrite app value
- If both changed in the same poll window → app wins (the app is the operational system of record)

**Change detection in Google Sheets:** Add an Apps Script `onEdit` trigger to the sheet that writes a `last_modified` timestamp in a dedicated column whenever a human edits a row. The polling job reads this column to find rows that changed since the last sync. This is more reliable than using the Drive Changes API for per-row granularity.

**Schema anchor:**
```sql
-- On the callings table
sheets_row_index   integer,          -- which row in the sheet this maps to
sheets_synced_at   timestamptz,      -- when we last read/wrote this row to Sheets
last_modified_by   text DEFAULT 'app' CHECK (last_modified_by IN ('app', 'sheet'))
```

---

## 2. Calling Pipeline State Machine

### Recommendation: Simple status enum column + transition validation in Express middleware, with an append-only event log for history

**Do not use a PostgreSQL FSM extension.** For this scale (15-20 users, <100 callings at any time), a full pg_fsm extension adds complexity with no operational benefit. The correct pattern is:

**Option A (recommended): Status enum + server-side transition guard**

```sql
-- PostgreSQL enum enforces valid states at the type level
CREATE TYPE calling_status AS ENUM (
  'recommended',
  'extended',
  'accepted',
  'declined',
  'sustained',
  'set_apart',
  'released',
  'cancelled'
);

CREATE TABLE callings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id     uuid NOT NULL REFERENCES positions(id),
  member_name     text NOT NULL,
  status          calling_status NOT NULL DEFAULT 'recommended',
  bishopric_owner text,                 -- which bishopric member owns this pipeline
  notes           text,
  interview_event_id  text,             -- Google Calendar event ID for interview
  set_apart_event_id  text,             -- Google Calendar event ID for setting apart
  sheets_row_index    integer,
  sheets_synced_at    timestamptz,
  last_modified_by    text DEFAULT 'app',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

**Valid transitions (enforced in Express, not the database):**

```
recommended  → extended  | cancelled
extended     → accepted  | declined  | cancelled
accepted     → sustained | cancelled
declined     → (terminal — start new calling record)
sustained    → set_apart | cancelled
set_apart    → released  (terminal for this calling cycle)
cancelled    → (terminal)
released     → (terminal)
```

Express middleware pattern:
```javascript
const VALID_TRANSITIONS = {
  recommended: ['extended', 'cancelled'],
  extended:    ['accepted', 'declined', 'cancelled'],
  accepted:    ['sustained', 'cancelled'],
  declined:    [],
  sustained:   ['set_apart', 'cancelled'],
  set_apart:   ['released'],
  cancelled:   [],
  released:    [],
};

function validateTransition(currentStatus, nextStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Invalid transition: ${currentStatus} → ${nextStatus}`);
  }
}
```

**Option B (additive): Append-only event log for audit trail**

If you want "how did this calling reach this state?" history, add:

```sql
CREATE TABLE calling_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calling_id  uuid NOT NULL REFERENCES callings(id),
  from_status calling_status,
  to_status   calling_status NOT NULL,
  note        text,
  created_at  timestamptz DEFAULT now()
);
```

This is not required for v1 but is cheap to add and eliminates regret later. The current state remains on `callings.status` — the event log is purely additive history.

**Build order recommendation:** Status enum column first. Add event log in a second migration if audit trail is requested.

---

## 3. Calendar Event Lifecycle

### Recommendation: Store Google Calendar event IDs in the callings table; cascade cancellation in Express

Google Calendar events are owned by Google. The app is the controller. The database stores only the event ID to maintain the reference link.

**Event ID storage:**

```sql
-- Two events per calling (interview + setting apart)
interview_event_id  text,   -- gcal event id, NULL if not scheduled
set_apart_event_id  text,   -- gcal event id, NULL if not scheduled
```

**Lifecycle rules (enforced in Express):**

| App action | Calendar action |
|-----------|----------------|
| Schedule interview | `calendar.events.insert` → store returned `id` |
| Reschedule interview | `calendar.events.patch` using stored id |
| Cancel calling | If `interview_event_id` present → `calendar.events.delete`; set to NULL |
| Decline extended | If `interview_event_id` present → `calendar.events.delete`; set to NULL |
| Member sustained | `calendar.events.insert` for setting apart → store `set_apart_event_id` |
| Member set apart | `calendar.events.delete` on `set_apart_event_id` (or leave — optional) |

**Event deletion is a soft concern:** Deleting a calendar event via API removes it from the shared ward calendar immediately. There is no "cancelled" state in the app-to-calendar direction — just delete. This is intentional: bishopric members will see the event disappear, which is the correct behavior.

**Stale event ID handling:** If a calendar event is deleted directly in Google Calendar (not through the app), the stored `id` becomes stale. A `404` from `calendar.events.get` should trigger a NULL-out of that column. Add this defensively in the Express calendar proxy layer.

**Service account vs. user OAuth:** Use a Google service account with domain-wide delegation (or a dedicated ward Google account that the service account impersonates). This means the app never requires individual Google OAuth logins. The service account acts as the calendar event organizer. This is the correct architecture for a shared-password, team-access app.

---

## 4. Ward Org Structure

### Recommendation: Separate `positions` table (the org chart) from `callings` table (the current holder)

The key insight is that the org chart of positions is stable and hierarchical; the people filling those positions change. These are two different concerns and must be two different tables.

**Schema:**

```sql
CREATE TABLE positions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,             -- "Relief Society President"
  organization  text NOT NULL,             -- "RS", "EQ", "Bishopric", "Primary", etc.
  parent_id     uuid REFERENCES positions(id),  -- for hierarchy (RS Pres → RS 1st Counselor)
  sort_order    integer DEFAULT 0,
  is_active     boolean DEFAULT true,
  notes         text,                       -- consideration notes for vacant positions
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE callings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id   uuid NOT NULL REFERENCES positions(id),
  member_name   text NOT NULL,
  status        calling_status NOT NULL DEFAULT 'recommended',
  -- ... rest of columns from section 2
);
```

**Vacancy query:** A position is vacant when it has no calling record with status = 'set_apart'. (A calling that is 'released' or 'cancelled' does not count as filling the position.)

```sql
SELECT p.*, c.member_name, c.status
FROM positions p
LEFT JOIN callings c
  ON c.position_id = p.id
  AND c.status = 'set_apart'
WHERE p.is_active = true
ORDER BY p.organization, p.sort_order;
```

Rows where `c.member_name IS NULL` are vacant positions.

**Hierarchy:** Use adjacency list (self-referencing `parent_id`) rather than nested sets. At ward scale (< 200 positions), adjacency list is simpler to understand and query. Materialized paths or `HierarchyID` are not needed.

**Organization groupings:** Use a plain `organization` text column (not a foreign key to another table) for the grouping labels. "RS", "EQ", "Bishopric", "Primary", "Sunday School", "YM", "YW", "Ward" covers the universe and is cheap to query with a GROUP BY.

**Seeding from Google Sheets:** On initial import, the Sheets data seeds the `positions` table first, then creates `callings` records for currently-filled positions. Position names are matched by exact text; duplicates are caught with a UNIQUE constraint on `(name, organization)`.

---

## 5. Shared Password Authentication

### Recommendation: Single bcrypt-hashed password stored in an environment variable; express-session for session management; no database user table

This is intentionally simple. The risk profile is low (no sensitive data, ward council visibility is acceptable, < 20 users). Do not over-engineer this.

**Implementation pattern:**

```
Environment variable: WARD_PASSWORD_HASH (bcrypt hash of the shared password)

POST /api/auth/login
  → body: { password: string }
  → bcrypt.compare(body.password, process.env.WARD_PASSWORD_HASH)
  → If match: req.session.authenticated = true → 200
  → If no match: 401

GET /api/auth/check
  → Returns 200 if req.session.authenticated === true, else 401

POST /api/auth/logout
  → req.session.destroy() → 200

Middleware: requireAuth
  → All /api/* routes except /api/auth/* check req.session.authenticated
  → If missing: 401 (React redirects to login page)
```

**Session storage:** Use `connect-pg-simple` to store sessions in a Supabase `sessions` table. This survives Render service restarts (which reset in-memory session stores). Render's free tier restarts frequently.

```sql
-- Handled automatically by connect-pg-simple; run their init SQL
CREATE TABLE session (
  sid    varchar NOT NULL COLLATE "default" PRIMARY KEY,
  sess   json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX idx_session_expire ON session(expire);
```

**Password rotation:** The shared password is changed by updating `WARD_PASSWORD_HASH` in Render's environment variables and redeploying. All sessions are invalidated on restart. This is acceptable for a small team.

**Frontend auth state:** React stores auth state in a context (`AuthContext`). On app load, it calls `GET /api/auth/check`. If 401, renders the login screen. If 200, renders the app. No JWT, no localStorage token — the session cookie handles everything.

**HTTPS:** Vercel and Render both enforce HTTPS. Set `cookie: { secure: true, httpOnly: true, sameSite: 'lax' }` on express-session. This is required for cross-origin cookies (React on Vercel, API on Render).

---

## Suggested Build Order

Based on dependencies between the components above:

### Phase 1 — Foundation (no Google APIs)
1. Supabase schema: `positions`, `callings` (with status enum), `calling_events`
2. Express API: auth middleware, `/api/auth/*`, `/api/positions`, `/api/callings` CRUD
3. React SPA: login screen, calling roster view, vacancy view, pipeline status board

**Why first:** Everything else depends on the calling data model. Google integrations are additive. Ship something the bishopric can use immediately.

### Phase 2 — Calendar Integration
1. Google service account setup + credentials in Render environment
2. Express: `/api/calendar/*` proxy layer (create, update, delete events)
3. React: "Schedule Interview" and "Schedule Setting Apart" UI flows
4. Lifecycle cleanup: cancel calling → delete associated calendar events

**Why second:** Calendar integration has zero Sheets dependencies. It is self-contained. The event ID storage columns are already in the schema from Phase 1.

### Phase 3 — Google Sheets Sync
1. Apps Script `onEdit` trigger on the existing ward Sheet (adds `last_modified` column)
2. Express: `/api/sheets/import` (one-time import for data migration)
3. Express: write-back job (calling updates → Sheets API patch)
4. Express: polling job (5-minute cron, reads Sheet changes → Supabase)
5. React: sync status indicator + conflict flag UI

**Why third:** Sheets sync is the most complex and most likely to require iteration. By Phase 3, the team is already using the app, which makes the conflict resolution requirements concrete rather than speculative.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Calling Google APIs from the browser
**What:** Using Google API client libraries directly in React with tokens in localStorage.
**Why bad:** Exposes service account credentials or user tokens to the browser. Impossible to rotate without redeployment. Breaks on token expiry with no recovery path.
**Instead:** All Google API calls go through Express. Express holds credentials in environment variables.

### Anti-Pattern 2: Using the status column as the org chart
**What:** Storing "vacant" as a status value on a calling record.
**Why bad:** Vacancies are the absence of a calling, not a calling state. This forces NULL member names, confusing queries, and breaks the state machine (you can't transition from "vacant").
**Instead:** A position is vacant when no `callings` row with `status = 'set_apart'` references it. Vacancy is a JOIN query result, not a database value.

### Anti-Pattern 3: Treating Google Sheets as the source of truth
**What:** Designing the app to always defer to the Sheet on conflict.
**Why bad:** The Sheet is a legacy view. The app is the new system of record. When both change, app wins. Deferring to the Sheet permanently means the app never becomes authoritative, and users will not trust it.
**Instead:** App wins on conflict. Sheet is a human-readable view that the app maintains.

### Anti-Pattern 4: True bidirectional sync in v1
**What:** Building webhook registration, conflict queuing, and two-way reconciliation from the start.
**Why bad:** The Drive Changes API is insufficient for granular change tracking. Apps Script onChange triggers do not fire on API writes. The engineering cost exceeds the v1 value.
**Instead:** Import once to seed, write-back on every app save, poll to detect human Sheet edits. Graduate to true sync only if polling proves insufficient.

### Anti-Pattern 5: Storing sessions only in memory
**What:** Using express-session default in-memory store on Render.
**Why bad:** Render's free tier restarts instances frequently. Every restart logs out all users. In a shared-password app with no re-auth friction, this is annoying but acceptable — except it erodes trust.
**Instead:** Use `connect-pg-simple` with the Supabase `session` table. Sessions survive restarts.

---

## Scalability Considerations

This is a single-ward tool for ~20 users with <200 callings total. Scalability is not a primary concern. The architecture above has no known scalability ceiling for this use case.

| Concern | At 20 users | Notes |
|---------|------------|-------|
| Supabase reads | No issue | Single Supabase free tier handles this easily |
| Google Calendar API | No issue | Quota is 1M requests/day; this app will use <100/day |
| Google Sheets polling | No issue | 5-min polling = 288 requests/day, well under quota |
| Session storage | No issue | A few dozen rows in the session table |

---

## Sources

- [Implementing State Machines in PostgreSQL — Felix Geisendörfer](https://felixge.de/2017/07/27/implementing-state-machines-in-postgresql/)
- [Mastering Two-Way Sync: Key Concepts and Implementation Strategies — Stacksync](https://www.stacksync.com/blog/mastering-two-way-sync-key-concepts-and-implementation-strategies)
- [Demystifying the Google Drive Changes API — Emptor](https://www.emptor.io/blog/demystifying-the-google-drive-changes-api)
- [Google Calendar API — Events Resource Reference](https://developers.google.com/workspace/calendar/api/v3/reference/events)
- [Google Calendar API — Events Update](https://developers.google.com/workspace/calendar/api/v3/reference/events/update)
- [Displaying Vacant or Temporary Positions in Org Charts — SharepointOrgChart](https://sharepointorgchart.com/how-to/displaying-vacant-or-temporary-positions-organization-chart)
- [Representing an Organization within an SQL Database — OrgChartComponent](http://www.orgchartcomponent.com/walkthrough/Article1/)
- [Google Sheets API Webhooks — Moldstud](https://moldstud.com/articles/p-enhance-google-sheets-functionality-with-advanced-api-webhooks-a-comprehensive-guide)
- [Google Drive Push Notifications — Medium/SWLH](https://medium.com/swlh/google-drive-push-notification-b62e2e2b3df4)
- [Session and Cookie Management in Express.js — Medium](https://medium.com/@ucangun76/session-and-cookie-management-in-express-js-for-login-and-authentication-bc63ec89e000)
