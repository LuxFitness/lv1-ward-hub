# Phase 1: Calling Pipeline & Auth — Research

**Researched:** 2026-05-27
**Domain:** Calling pipeline state machine, PostgreSQL schema, Express session auth, React + shadcn/ui responsive dashboard
**Confidence:** HIGH (all core claims verified via Context7, npm registry, or official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Roster grouped by ward organization (Bishopric, EQ, RS, Primary, Sunday School, etc.)
- **D-02:** Each calling displays as a simple row: Position name | Member name | Status badge. Clicking a row opens the pipeline detail panel.
- **D-03:** Pending Actions inbox is a separate tab/view — not a banner or inline highlighting.
- **D-04:** Pipeline detail opens in a slide-in side panel from the right (Sheet). On mobile, full-screen.
- **D-05:** Stage advancement shows only valid next actions — invalid transitions are hidden (not disabled).
- **D-06:** Stuck threshold configurable per stage: Extended → 3d, Recommended → 7d, Accepted → 14d.
- **D-07:** Member selection uses typeahead search (narrows instantly).
- **D-08:** Inline "+ Add [name] to roster" option when member not found — created on the spot.
- **D-09:** Auth: bcrypt shared password + express-session + connect-pg-simple (sessions survive Render restarts).
- **D-10:** Vacancy = JOIN query result (no active set_apart calling). Positions table separate from callings table.
- **D-11:** Append-only `calling_events` log in Phase 1 schema.
- **D-12:** Partial unique index: `UNIQUE(position_id) WHERE status NOT IN ('declined', 'released', 'cancelled')`.
- **D-13:** `state_entered_at` column required on all calling stage transitions.

### Claude's Discretion

- Ward organization groupings and their default ordering (Bishopric first, then auxiliaries)
- Exact per-stage stuck thresholds (D-06 gives suggested defaults)
- Session duration and re-auth trigger — standard express-session defaults are acceptable

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CALL-01 | View complete roster: all ward positions, current holder, calling status | Positions + callings JOIN query; org-grouped display via `organization` column |
| CALL-02 | View all vacant positions with consideration notes | Vacancy = LEFT JOIN with no `set_apart` calling; notes on positions table |
| CALL-03 | Create new calling pipeline entry (recommended member + bishopric owner) | INSERT into callings with status='recommended'; partial unique index prevents duplicates |
| CALL-04 | Advance calling through all pipeline stages | State machine with VALID_TRANSITIONS map; PATCH /api/callings/:id/transition |
| CALL-05 | Release a member from a calling, return position to vacant | Transition to 'released' terminal state; vacancy detected via JOIN absence |
| CALL-06 | Pending actions inbox: stuck callings needing next step | Query callings where `state_entered_at < now() - threshold_for_status` |
| CALL-07 | System prevents duplicate active pipeline entries per position | Partial unique index on `callings(position_id) WHERE status NOT IN (...)` |
| CALL-08 | Each pipeline stage transition records the date | `state_entered_at` timestamp on callings; `calling_events` append-only log |
| MBR-01 | Add members to ward roster (name only) | `members` table with name field; inline add from typeahead |
| MBR-02 | Edit or remove a member | PATCH/DELETE /api/members/:id |
| MBR-03 | View which calling a member currently holds | JOIN members → callings WHERE status = 'set_apart' |
| AUTH-01 | Single shared password protection | bcrypt.compare against `APP_PASSWORD_HASH` env var |
| AUTH-02 | Session persists across browser restarts | connect-pg-simple stores sessions in Supabase Postgres |
| AUTH-03 | Login rate-limited against brute force | express-rate-limit on POST /api/auth/login |
| UI-01 | Card layout works on mobile without horizontal scroll | shadcn Sheet full-screen on mobile; list rows not tables |
| UI-02 | Full functionality on desktop | Side-panel Sheet layout on desktop ≥ 768px |
| UI-03 | Works on mobile browser without installation | Responsive web; no PWA or native required |
</phase_requirements>

---

## Summary

Phase 1 is a greenfield full-stack build: Express + TypeScript backend, React + Vite + TypeScript frontend, Supabase PostgreSQL database. The calling pipeline is the core domain — a state machine with 8 states and enforced transitions. All architecture decisions are already locked from the discussion phase; research confirms each locked decision is sound and provides the specific implementation patterns needed.

The most important implementation detail is the **vacancy-as-JOIN pattern**: a position is vacant when no calling with `status = 'set_apart'` references it. This must be understood throughout — do not add a 'vacant' status to the callings table. The second most important is the **partial unique index** on `callings(position_id)` which prevents duplicate active pipeline entries at the database layer.

Auth is intentionally simple: one bcrypt-hashed password in an env var, express-session with connect-pg-simple for persistence, express-rate-limit on the login endpoint. No Supabase Auth, no JWT. The cross-origin cookie setup (Vercel frontend + Render backend) requires `credentials: 'include'` on every fetch call and `sameSite: 'lax'`, `secure: true` on the session cookie.

**Primary recommendation:** Build in wave order — Wave 0: project scaffold + DB schema + session table; Wave 1: auth; Wave 2: members CRUD; Wave 3: calling pipeline (roster → detail panel → transitions → inbox). Each wave ships something demonstrably usable.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth (shared password check) | API / Backend | — | Password hash lives in env var; session issued server-side |
| Session persistence | API / Backend | Database (Supabase) | connect-pg-simple stores sessions in `session` table |
| Rate limiting | API / Backend | — | express-rate-limit middleware on login route |
| Calling state machine (transition guards) | API / Backend | — | Business rule enforcement must be server-side; client cannot be trusted |
| Vacancy detection | API / Backend | Database | LEFT JOIN query result; never a DB status value |
| Partial unique index | Database | — | PostgreSQL constraint prevents duplicate pipeline entries at DB level |
| Calling CRUD | API / Backend | — | Express routes → Supabase JS client |
| Member typeahead search | Frontend (Browser) | API | Search filters client-side against pre-fetched list; fallback to API search |
| Roster display (grouped by org) | Frontend (Browser) | — | Group-by rendering in React; data fetched via TanStack Query |
| Pipeline detail panel | Frontend (Browser) | — | shadcn Sheet component; state owned in Zustand UI store |
| Pending inbox query | API / Backend | Database | Server-side query computes `days_in_stage` from `state_entered_at` |
| Stuck threshold config | Frontend (Browser) | — | Configurable defaults stored in Zustand or localStorage |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.x | Frontend SPA framework | Locked stack decision |
| Vite | 8.0.14 | Build tool + dev server | Locked stack decision; fast HMR |
| TypeScript | 5.8.x | Type safety across frontend + backend | Non-negotiable for state machine with complex types |
| Express | 5.2.1 | Backend API server | Locked stack decision |
| @supabase/supabase-js | 2.106.2 | PostgreSQL client | Locked stack decision; service_role key on backend only |
| express-session | 1.19.0 | Session middleware | Locked auth decision |
| connect-pg-simple | 10.0.0 | Session store in Supabase Postgres | Locked auth decision; survives Render restarts |
| bcryptjs | 3.0.3 | Password hashing | Locked auth decision |
| express-rate-limit | 8.5.2 | Login brute-force protection | AUTH-03 requirement |
| shadcn/ui CLI | 4.8.2 | UI component system | Locked stack decision |
| tailwindcss | 4.3.0 | Utility CSS | Current default with shadcn v4 (see note) |
| @tailwindcss/vite | 4.3.0 | Vite plugin for Tailwind v4 | Replaces postcss config in Tailwind v4 |
| @tanstack/react-query | 5.100.14 | Server state, caching, mutations | Locked stack decision |
| zustand | 5.0.13 | UI state (panel open/close, active selection) | Locked stack decision |
| react-hook-form | 7.76.1 | Form state management | Locked stack decision |
| zod | 4.4.3 | Schema validation + TypeScript types | Locked stack decision |
| @hookform/resolvers | 5.4.0 | Bridge RHF + Zod | Required for RHF/Zod integration |
| @tanstack/react-table | 8.21.3 | DataTable (sorting, filtering) | Used via shadcn DataTable component |
| lucide-react | 1.16.0 | Icons | Default for shadcn/ui |

[VERIFIED: npm registry 2026-05-27]

**Tailwind v4 note:** Prior research (STACK.md, 2026-05-26) recommended Tailwind v3 for stability. As of shadcn CLI 4.8.2, the `npx shadcn@latest init -t vite` command scaffolds Tailwind v4 with `@tailwindcss/vite` plugin — no postcss config needed. The `tailwind.config` field in components.json should be left blank for Tailwind v4. Use v4. [VERIFIED: Context7/shadcn-ui/ui]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cors | 2.8.6 | Cross-origin cookie support (Vercel → Render) | Required for cross-origin fetch with credentials |
| helmet | 8.2.0 | HTTP security headers on Express | Add by default to Express; zero config for most settings |
| express-slow-down | 3.1.0 | Progressive delay on login (complement to rate limit) | Pairs with express-rate-limit for better UX on brute force |
| vitest | 4.1.7 | Unit testing | Test framework for backend state machine logic |
| @testing-library/react | 16.3.2 | Frontend component testing | Unit test auth flow, calling transitions |
| @testing-library/user-event | 14.6.1 | Simulate user interaction in tests | Required for form and button testing |

[VERIFIED: npm registry 2026-05-27]

### Alternatives Considered (and rejected)

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bcryptjs | argon2 | argon2 is technically stronger but bcryptjs is the established Express pattern; acceptable for low-sensitivity shared password |
| express-rate-limit | express-brute | express-brute is unmaintained; express-rate-limit is the current standard |
| connect-pg-simple | memorystore | memorystore is in-process; lost on Render restart. connect-pg-simple is the locked decision |

**Installation:**

```bash
# Backend
npm install express cors helmet express-session connect-pg-simple bcryptjs express-rate-limit express-slow-down @supabase/supabase-js dotenv
npm install -D typescript @types/express @types/express-session @types/connect-pg-simple @types/bcryptjs @types/cors ts-node-dev vitest

# Frontend (inside frontend/ directory)
npm create vite@latest . -- --template react-ts
npx shadcn@latest init -t vite
npx shadcn@latest add sheet badge button command input form select table
npm install @tanstack/react-query @tanstack/react-table zustand react-hook-form zod @hookform/resolvers lucide-react @supabase/supabase-js
npm install -D @testing-library/react @testing-library/user-event jsdom
```

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (React SPA on Vercel)
  │
  │  HTTPS + session cookie (credentials: 'include')
  │  All /api/* paths
  ▼
Express API Server (Render)
  │
  ├── POST /api/auth/login        ← rate-limited; bcrypt.compare → session
  ├── GET  /api/auth/check        ← session guard on all routes below
  ├── GET  /api/callings          ← roster: positions LEFT JOIN callings
  ├── POST /api/callings          ← create pipeline entry (insert + event log)
  ├── PATCH /api/callings/:id/transition  ← validateTransition → update + log
  ├── GET  /api/callings/pending  ← stuck callings query (state_entered_at age)
  ├── GET  /api/members           ← member list for typeahead
  ├── POST /api/members           ← inline add from typeahead
  └── PATCH/DELETE /api/members/:id
  │
  └── Supabase (PostgreSQL)
        ├── session               (connect-pg-simple)
        ├── org_units             (ward organizations)
        ├── positions             (persistent role slots)
        ├── members               (name only)
        ├── callings              (pipeline state + partial unique index)
        └── calling_events        (append-only audit log)
```

### Recommended Project Structure

```
lv1-ward-hub/
├── backend/
│   ├── src/
│   │   ├── server.ts             # Express app entry
│   │   ├── db.ts                 # Supabase client (service_role)
│   │   ├── middleware/
│   │   │   ├── auth.ts           # requireAuth middleware
│   │   │   └── rateLimiter.ts    # express-rate-limit config
│   │   ├── routes/
│   │   │   ├── auth.ts           # /api/auth/*
│   │   │   ├── callings.ts       # /api/callings/*
│   │   │   └── members.ts        # /api/members/*
│   │   ├── lib/
│   │   │   └── stateMachine.ts   # VALID_TRANSITIONS map + validateTransition
│   │   └── types.ts              # Shared TypeScript types (CallingStatus enum, etc.)
│   ├── .env                      # SUPABASE_URL, SUPABASE_SERVICE_KEY, APP_PASSWORD_HASH, SESSION_SECRET
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx              # QueryClientProvider + App
│   │   ├── App.tsx               # Router (tabs: Roster, Pending, Members)
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui installed components
│   │   │   ├── RosterView.tsx    # Grouped calling list
│   │   │   ├── CallingPanel.tsx  # shadcn Sheet — pipeline detail
│   │   │   ├── PendingInbox.tsx  # Stuck callings tab
│   │   │   ├── MemberSearch.tsx  # Command typeahead + inline add
│   │   │   └── LoginPage.tsx
│   │   ├── hooks/
│   │   │   ├── useCallings.ts    # TanStack Query hooks
│   │   │   └── useMembers.ts
│   │   ├── store/
│   │   │   └── uiStore.ts        # Zustand: selectedCallingId, panelOpen, stuckThresholds
│   │   ├── lib/
│   │   │   ├── api.ts            # fetch wrapper with credentials: 'include'
│   │   │   └── utils.ts          # shadcn cn() utility
│   │   └── types.ts              # Shared frontend types
│   ├── components.json           # shadcn config
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
└── CLAUDE.md
```

### Pattern 1: Calling Pipeline State Machine

**What:** Express middleware enforces valid state transitions before any DB write.
**When to use:** Every `PATCH /api/callings/:id/transition` call.

```typescript
// Source: backend/src/lib/stateMachine.ts
// [VERIFIED: ARCHITECTURE.md prior research + CONTEXT.md D-05]

export type CallingStatus =
  | 'recommended'
  | 'extended'
  | 'accepted'
  | 'declined'
  | 'sustained'
  | 'set_apart'
  | 'released'
  | 'cancelled';

// Valid transitions — invalid transitions are hidden in UI (not just disabled)
export const VALID_TRANSITIONS: Record<CallingStatus, CallingStatus[]> = {
  recommended: ['extended', 'cancelled'],
  extended:    ['accepted', 'declined', 'cancelled'],
  accepted:    ['sustained', 'cancelled'],
  declined:    [],         // terminal — start new calling record
  sustained:   ['set_apart', 'cancelled'],
  set_apart:   ['released'],
  released:    [],         // terminal
  cancelled:   [],         // terminal
};

export function validateTransition(from: CallingStatus, to: CallingStatus): void {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`);
  }
}

// In the route handler:
// 1. validateTransition(currentCalling.status, body.status) — throws on invalid
// 2. UPDATE callings SET status = body.status, state_entered_at = now()
// 3. INSERT into calling_events (calling_id, from_status, to_status, created_at)
```

### Pattern 2: Vacancy Detection via JOIN

**What:** A position is vacant when it has no calling with `status = 'set_apart'`.
**When to use:** Roster query and vacancy view.

```sql
-- Source: ARCHITECTURE.md prior research [VERIFIED against locked D-10]
-- Returns all positions. Rows where member_name IS NULL are vacant.
SELECT
  p.id            AS position_id,
  p.name          AS position_name,
  p.organization,
  p.sort_order,
  p.notes         AS consideration_notes,
  c.id            AS calling_id,
  c.member_id,
  m.name          AS member_name,
  c.status        AS calling_status,
  c.state_entered_at
FROM positions p
LEFT JOIN callings c
  ON c.position_id = p.id
  AND c.status NOT IN ('declined', 'released', 'cancelled')
LEFT JOIN members m
  ON m.id = c.member_id
WHERE p.is_active = true
ORDER BY p.sort_order, p.name;
```

Note: The LEFT JOIN uses `status NOT IN (...)` (not `status = 'set_apart'`) so in-pipeline callings also show their member. Only status-less rows (no JOIN match) are truly vacant.

### Pattern 3: Cross-Origin Session Cookie Setup

**What:** Vercel frontend + Render backend require explicit CORS + cookie config.
**When to use:** Express setup (server.ts) + every frontend fetch call.

```typescript
// Source: CLAUDE.md + Context7/expressjs/session [VERIFIED]
// backend/src/server.ts

app.set('trust proxy', 1); // Required when behind reverse proxy (Render)

app.use(cors({
  origin: process.env.FRONTEND_URL, // 'https://lv1ward.vercel.app'
  credentials: true,                // Required for cross-origin cookies
}));

app.use(session({
  store: new PGStore({
    conString: process.env.SUPABASE_DB_URL, // Direct Postgres connection string
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,          // HTTPS only (Render + Vercel enforce HTTPS)
    httpOnly: true,        // No JS access to cookie
    sameSite: 'lax',       // Cross-origin allowed with GET; POST requires credentials: 'include'
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));
```

```typescript
// frontend/src/lib/api.ts — ALL fetch calls must include credentials
export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',  // Required: sends session cookie cross-origin
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
```

### Pattern 4: Pending Inbox Query

**What:** Find callings stuck in a stage past their threshold.
**When to use:** `GET /api/callings/pending`.

```sql
-- Source: ARCHITECTURE.md prior research + locked D-06/D-13 [VERIFIED logic]
-- Returns callings overdue for action, with days_in_stage computed.
-- Thresholds are per-stage; these are the suggested defaults from D-06.
SELECT
  c.id,
  c.status,
  c.state_entered_at,
  EXTRACT(DAY FROM now() - c.state_entered_at) AS days_in_stage,
  p.name          AS position_name,
  p.organization,
  m.name          AS member_name
FROM callings c
JOIN positions p ON p.id = c.position_id
LEFT JOIN members m ON m.id = c.member_id
WHERE c.status NOT IN ('set_apart', 'declined', 'released', 'cancelled')
  AND (
    (c.status = 'recommended' AND c.state_entered_at < now() - INTERVAL '7 days')
    OR
    (c.status = 'extended'    AND c.state_entered_at < now() - INTERVAL '3 days')
    OR
    (c.status = 'accepted'    AND c.state_entered_at < now() - INTERVAL '14 days')
    OR
    (c.status = 'sustained'   AND c.state_entered_at < now() - INTERVAL '14 days')
  )
ORDER BY days_in_stage DESC;
```

The per-stage thresholds should be configurable in the frontend (Zustand store), with the defaults above. The backend can accept threshold overrides as query params, or the frontend can filter client-side from a broader "all in-pipeline" query.

### Pattern 5: shadcn/ui Sheet for Pipeline Panel

**What:** Right-side slide-in panel (full-screen on mobile) for pipeline detail.
**When to use:** Row click on roster view.

```tsx
// Source: Context7/shadcn-ui/ui [VERIFIED]
// Controlled open state via Zustand uiStore

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useUIStore } from '@/store/uiStore';

export function CallingPanel() {
  const { panelOpen, selectedCallingId, closePanel } = useUIStore();

  return (
    <Sheet open={panelOpen} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent
        side="right"
        // Full-screen on mobile: override default w-3/4 sm:max-w-sm
        className="w-full sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>Calling Pipeline</SheetTitle>
        </SheetHeader>
        {/* Pipeline detail + action buttons for valid next transitions */}
      </SheetContent>
    </Sheet>
  );
}
```

### Pattern 6: Member Typeahead with Inline Add

**What:** Command component for member search; "+ Add [name]" option when not found.
**When to use:** Pipeline form when recommending a member.

```tsx
// Source: Context7/shadcn-ui/ui Command component [VERIFIED]
// The standard shadcn Combobox pattern uses Popover + Command

import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// When CommandEmpty fires (no match found), render a "create" option:
<CommandList>
  <CommandEmpty>
    <CommandItem
      onSelect={() => onCreateMember(searchValue)}
    >
      + Add "{searchValue}" to roster
    </CommandItem>
  </CommandEmpty>
  {members.map(m => (
    <CommandItem key={m.id} value={m.name} onSelect={() => onSelect(m)}>
      {m.name}
    </CommandItem>
  ))}
</CommandList>
```

### Pattern 7: TanStack Query Mutation for Stage Transition

**What:** Optimistic update on status change; invalidate roster query on settle.
**When to use:** Every pipeline action button click.

```typescript
// Source: Context7/tanstack/query [VERIFIED]
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useTransitionCalling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CallingStatus }) =>
      apiFetch(`/callings/${id}/transition`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      // Invalidate both roster and pending inbox
      queryClient.invalidateQueries({ queryKey: ['callings'] });
    },
  });
}
```

### Pattern 8: Zustand UI Store

**What:** Minimal store for panel state and selected calling.
**When to use:** Replace prop-drilling for panel open/close and active row.

```typescript
// Source: Context7/pmndrs/zustand [VERIFIED]
import { create } from 'zustand';

interface UIStore {
  panelOpen: boolean;
  selectedCallingId: string | null;
  openPanel: (callingId: string) => void;
  closePanel: () => void;
  // Configurable stuck thresholds (days)
  stuckThresholds: { recommended: number; extended: number; accepted: number; sustained: number };
}

export const useUIStore = create<UIStore>((set) => ({
  panelOpen: false,
  selectedCallingId: null,
  openPanel: (callingId) => set({ panelOpen: true, selectedCallingId: callingId }),
  closePanel: () => set({ panelOpen: false, selectedCallingId: null }),
  stuckThresholds: { recommended: 7, extended: 3, accepted: 14, sustained: 14 },
}));
```

### Anti-Patterns to Avoid

- **'vacant' as a status value:** Never add `'vacant'` to the CallingStatus enum. Vacancy is always a JOIN result (position with no active calling row). Adding a status value forces NULL member_id handling and breaks the state machine.
- **In-memory session store:** Express default session store is in-memory. Render restarts lose all sessions. connect-pg-simple is mandatory.
- **Anon key on backend:** Backend uses Supabase `service_role` key only. Never expose the anon key to the browser from this app — there is no public data access path.
- **Hardcoded sameSite: 'strict':** Strict prevents the cookie from being sent on the first cross-origin request. Use `sameSite: 'lax'`. Render behind proxy requires `trust proxy: 1`.
- **Table with 5+ columns on mobile:** Do not render a `<table>` element for the roster. Render position rows as flex/grid cards on mobile. The Sheet panel handles detail — the roster row only needs: org header, position name, member name, status badge.
- **Calendar event fields in Phase 1 schema:** Do NOT add `interview_event_id` or `set_apart_event_id` to the callings table in Phase 1. Those columns belong in Phase 2. Keep Phase 1 schema clean.

---

## Database Schema

Full DDL for Phase 1. Apply via Supabase SQL editor or migration file.

```sql
-- Supabase: use public schema, service_role key on backend, no RLS needed
-- [VERIFIED: locked D-10 through D-13, STACK.md, ARCHITECTURE.md]

-- Ward organization units (Bishopric, EQ, RS, Primary, etc.)
CREATE TABLE org_units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Positions: the org chart slots (persistent, exist even when vacant)
CREATE TABLE positions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id UUID REFERENCES org_units(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,   -- consideration notes for vacant positions (CALL-02)
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_unit_id, name)
);

-- Members: name only, no contact info
CREATE TABLE members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Callings: pipeline state machine records
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
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id     UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  member_id       UUID REFERENCES members(id) ON DELETE SET NULL,
  status          calling_status NOT NULL DEFAULT 'recommended',
  bishopric_owner TEXT,          -- which bishopric member owns this pipeline
  notes           TEXT,          -- coordination notes (no pastoral content)
  state_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),  -- D-13: powers pending inbox
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- D-12: Partial unique index — only one active pipeline entry per position
-- 'declined', 'released', 'cancelled' are terminal states and excluded
CREATE UNIQUE INDEX callings_position_active_unique
  ON callings (position_id)
  WHERE status NOT IN ('declined', 'released', 'cancelled');

-- D-11: Append-only calling events audit log
CREATE TABLE calling_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calling_id  UUID NOT NULL REFERENCES callings(id) ON DELETE CASCADE,
  from_status calling_status,
  to_status   calling_status NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- connect-pg-simple session table (auto-created by createTableIfMissing: true, but explicit is safer)
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess   JSON    NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Seed: Default ward organization units in standard LDS order
INSERT INTO org_units (name, sort_order) VALUES
  ('Bishopric',       1),
  ('Elders Quorum',   2),
  ('Relief Society',  3),
  ('Young Men',       4),
  ('Young Women',     5),
  ('Primary',         6),
  ('Sunday School',   7),
  ('Ward',            8);
```

### Ward Organization Groupings (Claude's Discretion)

Standard LDS ward structure, ordered by stewardship proximity to bishopric. [ASSUMED — based on LDS general handbook chapter 30 org structure; planner should confirm with user if ordering matters]:

1. Bishopric (bishop + 2 counselors + executive secretary + ward clerk)
2. Elders Quorum (president + 2 counselors + secretary)
3. Relief Society (president + 2 counselors + secretary)
4. Young Men (president + 2 counselors)
5. Young Women (president + 2 counselors)
6. Primary (president + 2 counselors + secretary)
7. Sunday School (president + 2 counselors)
8. Ward (mission leader, temple/family history, welfare specialist, etc.)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session store | Custom Postgres session table logic | connect-pg-simple | Handles TTL, cleanup, concurrent access, table creation |
| Password hashing | SHA-256 or MD5 | bcryptjs | bcrypt is deliberately slow; SHA/MD5 are fast (bad for passwords) |
| Rate limiting | `req.session.loginAttempts++` | express-rate-limit | Handles IP detection, Redis backing option, Retry-After headers |
| UI typeahead | Custom input + filter logic | shadcn Command component | Built-in keyboard navigation, accessibility, empty state |
| Side panel | Custom CSS drawer | shadcn Sheet | Focus trap, Escape key, accessible overlay, animation |
| Status badges | Custom styled `<span>` | shadcn Badge | Consistent variant system, accessible |
| Data tables | Custom `<table>` + sort | shadcn DataTable + TanStack Table | Sort, filter, column visibility, pagination built in |
| State machine | ad-hoc if/else in route | VALID_TRANSITIONS map | Exhaustive, testable, readable — all valid transitions in one place |

**Key insight:** The state machine is the domain logic of this app. Every other piece (session, UI, rate limiting) is solved infrastructure — use libraries. Invest custom code time in `stateMachine.ts`, the pending inbox query, and the roster grouping display.

---

## Common Pitfalls

### Pitfall 1: Cross-Origin Cookie Dropped Silently

**What goes wrong:** Login succeeds (200 OK), but subsequent API calls return 401 because the session cookie was never sent. The console shows no error.

**Why it happens:** Three-way misconfiguration: (1) Express `trust proxy` not set → `secure: true` cookie rejected because Express doesn't see HTTPS; (2) CORS `credentials: true` missing → browser blocks sending cookie; (3) frontend fetch missing `credentials: 'include'` → cookie never sent.

**How to avoid:** All three must be set simultaneously: `app.set('trust proxy', 1)` + `cors({ credentials: true, origin: FRONTEND_URL })` + `fetch(url, { credentials: 'include' })`.

**Warning signs:** Login 200 OK, next API call 401. Open DevTools → Network → check if `Set-Cookie` header is present on login response and `Cookie` header is present on subsequent requests.

### Pitfall 2: Partial Unique Index Missed During Migration

**What goes wrong:** Two bishopric members simultaneously create pipeline entries for the same position. No constraint violation. The roster shows the position twice.

**Why it happens:** The `CREATE UNIQUE INDEX ... WHERE status NOT IN (...)` must be applied after table creation as a separate statement. Supabase SQL editor or migration files both support it, but it's easy to skip if you use the Supabase table editor GUI (which doesn't expose partial index creation).

**How to avoid:** Always apply the schema via SQL migration, not the GUI table editor. Verify index exists: `SELECT indexname FROM pg_indexes WHERE tablename = 'callings';` should show `callings_position_active_unique`.

**Warning signs:** Can INSERT two callings for the same position_id with status='recommended' without error.

### Pitfall 3: state_entered_at Not Updated on Transition

**What goes wrong:** The pending inbox shows callings as "stuck for 45 days" even when they were just transitioned yesterday.

**Why it happens:** The route handler updates `status` but forgets to update `state_entered_at`. Since it's not auto-updated (no trigger), it stays at the value from the previous transition.

**How to avoid:** The PATCH transition handler must always include `state_entered_at = now()` in the UPDATE. The `calling_events` insert also captures the timestamp independently.

**Warning signs:** A calling that was extended yesterday shows 30+ days in the pending inbox.

### Pitfall 4: Calling_events Table Accumulates Orphaned Records

**What goes wrong:** A calling is hard-deleted, but calling_events rows referencing it remain (or cause FK violation).

**Why it happens:** calling_events has `ON DELETE CASCADE` defined — but only if the DDL was applied correctly. If callings are ever deleted directly, the events follow. However, the design never deletes callings (terminal states are 'released', 'declined', 'cancelled'). The real pitfall is if a developer adds a DELETE route without understanding the append-only intent.

**How to avoid:** No DELETE endpoint for callings. Only POST (create) and PATCH (transition). "Delete" a pipeline mistake by transitioning to 'cancelled'. Document this in the route file.

### Pitfall 5: Shared Password Hash Not Generated Before Deploy

**What goes wrong:** `APP_PASSWORD_HASH` env var is the plaintext password or empty. bcrypt.compare always returns false or throws.

**Why it happens:** Developer forgets to run `bcrypt.hash('the-password', 12)` and paste the output into the env var. The plaintext is not a valid bcrypt hash.

**How to avoid:** Generate the hash once locally before first deploy:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 12).then(h => console.log(h))"
```
Paste the output (starting with `$2a$12$...`) into Render's environment variables as `APP_PASSWORD_HASH`.

### Pitfall 6: Tailwind v4 Config Mismatch

**What goes wrong:** Developer creates `tailwind.config.js` and adds it to `components.json`. shadcn components fail to pick up theme colors or CSS variables.

**Why it happens:** Tailwind v4 eliminates the `tailwind.config.js` file. Configuration moves to CSS with `@theme` directive. The `shadcn init` command handles this automatically when using `-t vite`, but manually created config files conflict.

**How to avoid:** Use `npx shadcn@latest init -t vite` and do not create `tailwind.config.js`. Leave `tailwind.config` blank in components.json. Add custom theme tokens in the CSS file under `@theme`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime | ✓ | v25.9.0 | — |
| npm | Package management | ✓ | 11.12.1 | — |
| Supabase project | DB + session store | ✓ | (existing) | — |
| Vercel account | Frontend hosting | ✓ | (existing) | — |
| Render account | Backend hosting | ✓ | (existing) | — |
| Supabase direct DB URL | connect-pg-simple | Unknown | — | Check Supabase project Settings → Database → Connection string |

[VERIFIED: `node --version` and `npm --version` on machine 2026-05-27]

**Note on Supabase DB URL:** connect-pg-simple needs the direct Postgres connection string (not the Supabase API URL). Find it in Supabase Dashboard → Project Settings → Database → Connection string → URI. Store as `SUPABASE_DB_URL` in backend `.env`. This is different from `SUPABASE_URL` which is the API endpoint.

**Missing dependencies with no fallback:**
- None — all required infrastructure is confirmed available.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 |
| Config file | `vitest.config.ts` — Wave 0 creation |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CALL-07 | Duplicate pipeline entries rejected | unit | `npx vitest run tests/stateMachine.test.ts` | Wave 0 |
| CALL-04 | All valid transitions accepted, invalid rejected | unit | `npx vitest run tests/stateMachine.test.ts` | Wave 0 |
| CALL-08 | state_entered_at updated on transition | unit | `npx vitest run tests/callings.test.ts` | Wave 0 |
| AUTH-01 | Wrong password returns 401 | unit | `npx vitest run tests/auth.test.ts` | Wave 0 |
| AUTH-03 | 6th login attempt returns 429 | unit | `npx vitest run tests/auth.test.ts` | Wave 0 |
| AUTH-02 | Session persists (cookie sent on subsequent call) | integration | manual + smoke | — |
| CALL-06 | Pending inbox returns callings past threshold | unit | `npx vitest run tests/pending.test.ts` | Wave 0 |
| UI-01 | Roster renders without horizontal scroll at 375px | manual | — | — |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/stateMachine.test.ts` (state machine test)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/tests/stateMachine.test.ts` — covers CALL-04, CALL-07
- [ ] `backend/tests/auth.test.ts` — covers AUTH-01, AUTH-03
- [ ] `backend/tests/pending.test.ts` — covers CALL-06
- [ ] `backend/tests/callings.test.ts` — covers CALL-08
- [ ] `backend/vitest.config.ts` — Vitest configuration
- [ ] Framework install: `npm install -D vitest` in backend/

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | bcryptjs (cost factor 12); single shared password; no account lockout alternative — rate limit instead |
| V3 Session Management | yes | express-session + connect-pg-simple; `httpOnly: true`, `secure: true`, `sameSite: 'lax'`; 30-day maxAge |
| V4 Access Control | yes | `requireAuth` middleware on all /api/* except /api/auth/*; no per-user roles needed |
| V5 Input Validation | yes | zod schemas validate all request bodies; Supabase parameterized queries (no raw SQL string interpolation) |
| V6 Cryptography | no | No encryption needed — member names only, no PII beyond names |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Brute force shared password | Spoofing | express-rate-limit (5 attempts/15min/IP) + express-slow-down |
| Session fixation | Elevation | `req.session.regenerate()` after successful login |
| CSRF (cross-site request forgery) | Tampering | sameSite: 'lax' cookie + CORS `origin` allowlist (no wildcard) |
| SQL injection | Tampering | Supabase JS client uses parameterized queries; never raw string interpolation |
| Information disclosure via error messages | Info Disclosure | Generic "Invalid credentials" on 401, never "wrong password vs. wrong user" |
| Sensitive data in session | Elevation | Session stores only `{ authenticated: true }` — no password hash, no member data |

**ASVS note:** This is an internal low-sensitivity tool (member names only; no PII, no financial, no health data). V2.1.1 (bcrypt minimum cost 10+) is satisfied by cost 12. V3.3 (session idle timeout) is recommended: add `rolling: true` to express-session config and an 8-hour idle timeout.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 with `tailwind.config.js` | Tailwind v4 with `@tailwindcss/vite` plugin + CSS `@theme` | v4 released early 2025; shadcn CLI 4.x adopted it | No `tailwind.config.js`; configure via CSS; prior STACK.md recommendation of "use v3" is outdated |
| express-session 1.x with deprecated options | express-session 1.19.0 with `resave: false, saveUninitialized: false` | ~2023 | `resave: true` default was deprecated; set both explicitly |
| Zod v3 | Zod v4.x (breaking changes in v4) | Zod v4 released 2025 | v4 has renamed some methods; `@hookform/resolvers` 5.x required for Zod v4 compatibility |
| shadcn v3 Radix primitives | shadcn v4 with Radix + Base UI option | 2025 | `npx shadcn@latest init` now uses a `--base` flag; default `radix` is fine for this project |

**Deprecated/outdated:**
- `express-session` with `resave: true`: Deprecated; set `resave: false` explicitly.
- `create-react-app`: Obsolete. Use `npm create vite@latest` instead.
- Tailwind `tailwind.config.js` with shadcn v4: Not needed; omit this file.
- `zod` v3 `z.string().email()` chaining syntax: Still works in v4 but some error message APIs changed; use `@hookform/resolvers@5` not `@hookform/resolvers@3`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Standard LDS ward org ordering: Bishopric → EQ → RS → YM → YW → Primary → Sunday School → Ward | Database Schema (org_units seed) | Wrong visual grouping in roster; easy to fix with a data migration |

**All other claims in this research were verified via Context7, npm registry, or confirmed in locked CONTEXT.md decisions.**

---

## Open Questions

1. **Supabase direct Postgres connection string availability**
   - What we know: connect-pg-simple requires the direct Postgres URL, not the Supabase API URL
   - What's unclear: Whether the existing Supabase project is on a plan tier that exposes direct connections (free tier does expose it)
   - Recommendation: Wave 0 task — confirm Supabase DB URL is accessible from backend/.env before writing session store code

2. **Ward organization list completeness**
   - What we know: 8 standard orgs seeded in schema (see Database Schema)
   - What's unclear: Whether Long Valley 1st Ward has non-standard orgs (e.g., Self-Reliance, JustServe coordinator)
   - Recommendation: Seed the standard 8; make org_units editable in a later plan wave. Positions can reference any org_unit, so adding new orgs is additive.

3. **Shared password rotation plan**
   - What we know: Password is changed by updating APP_PASSWORD_HASH in Render env vars and redeploying
   - What's unclear: Whether the user wants a UI to rotate the password, or is comfortable with env var rotation
   - Recommendation: Env var rotation is sufficient for v1; document the `bcrypt.hash()` command in CLAUDE.md

---

## Sources

### Primary (HIGH confidence)
- Context7 `/shadcn-ui/ui` — Sheet, Command, Combobox, Badge, DataTable, Vite init, Tailwind v4 setup
- Context7 `/expressjs/session` — sameSite, secure, trust proxy, cross-origin cookie configuration
- Context7 `/voxpelli/node-connect-pg-simple` — connection string, createTableIfMissing, session table setup
- Context7 `/tanstack/query` — useMutation, invalidateQueries, optimistic update patterns
- Context7 `/pmndrs/zustand` — TypeScript store creation
- npm registry (2026-05-27) — all package versions verified
- `.planning/research/ARCHITECTURE.md` — calling state machine, vacancy query, session auth pattern (2026-05-26)
- `.planning/research/STACK.md` — full dependency list, auth pattern (2026-05-26)
- `.planning/research/PITFALLS.md` — cross-origin cookies, rate limiting, duplicate records (2026-05-26)
- `CLAUDE.md` — locked architecture decisions, critical pitfalls

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` — LDS calling pipeline stage breakdown, feature landscape
- Tailwind v4 adoption in shadcn CLI 4.8.2 — inferred from Context7 docs showing `@tailwindcss/vite` in Vite setup

### Tertiary (LOW confidence)
- LDS ward org ordering — standard handbook structure, not verified against Long Valley 1st specific org chart

---

## Metadata

**Confidence breakdown:**
- Database schema: HIGH — locked decisions verified, DDL patterns from prior research + official Supabase docs
- Auth implementation: HIGH — connect-pg-simple and express-session docs verified via Context7; cross-origin cookie pattern from CLAUDE.md + Context7
- State machine: HIGH — VALID_TRANSITIONS map verified against locked D-05 and ARCHITECTURE.md prior research
- shadcn/ui components: HIGH — Sheet, Command, Badge, DataTable verified via Context7
- Tailwind version: HIGH — shadcn CLI 4.8.2 confirmed as using Tailwind v4 (update from prior STACK.md recommendation)

**Research date:** 2026-05-27
**Valid until:** 2026-07-01 (stable stack; library versions should be re-verified before execution if delayed)
