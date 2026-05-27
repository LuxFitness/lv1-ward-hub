# Technology Stack — LV1 Ward Hub

**Project:** LV1 Ward Hub (ward/congregation management web app)
**Researched:** 2026-05-26
**Mode:** Stack dimension for existing React + Supabase foundation

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 18.x (current on project) | Frontend SPA | Already decided; well-understood, large ecosystem |
| Vite | 6.x | Build tool | Consistent with existing health-platform project; fast HMR |
| TypeScript | 5.x | Type safety | Non-negotiable for a CRUD-heavy app — callings pipeline has complex state transitions that TypeScript catches at compile time |
| Express.js | 4.x | Backend API server | Already in use on existing projects; consistent with health-platform |

**Do NOT use Next.js.** The project is a simple SPA with no SSR/SEO requirements. Next.js adds routing complexity, build complexity, and deployment caveats on Render for a use case that doesn't need it. Vite + React is already the user's established pattern.

### Google API Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| googleapis | 172.x | Google Calendar API + Google Sheets API client | Official Google-maintained Node.js client library; covers both Calendar and Sheets in one package |

**Authentication approach: Service Account with calendar/sheet sharing.**

Use a Google Cloud service account, then:
1. Share the existing ward Google Calendar with the service account email (grant `writer` role via Calendar Settings → Share with specific people)
2. Share the existing Google Sheet with the service account email (grant Editor role)
3. Store credentials as split environment variables — NOT as a JSON file (see Deployment section below)

**Why service account over OAuth user flow:**
- The app has no individual user accounts. There is one shared password. There is no "logged in Google user" whose identity the app can act on behalf of.
- Service account is the correct server-to-server pattern when you own the calendar and sheet and want background write access without user consent flows.
- A user OAuth flow would require a designated Google account to authorize, store refresh tokens, and handle re-auth — all unnecessary complexity.
- The calendar and sheet already exist; sharing them with a service account email takes 30 seconds and requires no domain-wide delegation or Workspace admin access.

**Confidence: HIGH** — Verified against Google Calendar API ACL documentation (writer role confirmed for service accounts), googleapis package documentation (v172 current as of May 2026), and multiple production examples.

**WARNING on google-auth-library:** The `google-auth-library-nodejs` standalone repository was archived November 20, 2025 and its code moved into [google-cloud-node-core](https://github.com/googleapis/google-cloud-node-core/tree/main/packages/google-auth-library-nodejs). The `google-auth-library` npm package (v10.6.2) continues publishing from the new home. However: do not install `google-auth-library` separately — **`googleapis` bundles its own auth internally**. Just use `googleapis` directly and authenticate via `google.auth.GoogleAuth`.

**Sheets two-way sync caveat:** True two-way sync with conflict resolution is genuinely complex. The Google Sheets API exposes no built-in conflict detection or change webhooks (only polling via `spreadsheets.values.get`). The recommended phased approach:
- Phase 1: Import-only (read Sheet into Supabase on setup)
- Phase 2: Write-back (app writes to Sheet on mutation, Sheet is treated as read-only by humans during app use)
- Phase 3 (hardening): True two-way with `updatedAt` timestamp comparison and last-write-wins, or move to app-only with Sheet as archive export

### UI Component Library

**Use: shadcn/ui + Tailwind CSS v3**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| shadcn/ui | CLI 2.9.x | UI component system | Copy-owned components, not a dependency; ideal for admin dashboards |
| Tailwind CSS | 3.x (not 4.x yet) | Utility styling | shadcn/ui v4 targets Tailwind 4 but is in active transition; use Tailwind 3 for stability |
| Radix UI primitives | (installed via shadcn CLI) | Accessible headless components | Ships with shadcn/ui automatically |
| TanStack Table | via @tanstack/react-table v8 | Data tables with sorting/filtering/pagination | shadcn/ui's DataTable component is built on TanStack Table; perfect for the callings roster |
| lucide-react | 1.16.x | Icon library | Default icon set for shadcn/ui; comprehensive, consistent |

**Why shadcn/ui over alternatives:**

- **vs. MUI (Material UI):** MUI enforces Material Design aesthetics and is hard to deviate from. For a ward management app used on phones by bishopric members, a cleaner, less corporate look is better. MUI's bundle size is also significant.
- **vs. Ant Design:** Opinionated design system, even heavier bundle, not mobile-first.
- **vs. Tremor:** Excellent for data dashboards but optimized for charts/analytics. Ward Hub is primarily a CRUD/status-tracking app with tables and forms, not charts.
- **vs. CoreUI:** Template-based approach; you own less of the code.

shadcn/ui ships components as source code into your project. You own and modify them. The DataTable component (built on TanStack Table) handles sorting, filtering, column visibility, and pagination out of the box — exactly what the callings roster requires. Mobile responsiveness requires hiding columns below breakpoints (straightforward with Tailwind).

**Confidence: HIGH** — Verified via shadcn/ui Context7 docs (v3.2+ confirmed), TanStack Table integration confirmed in shadcn source.

### State Management

**Use: TanStack Query v5 + Zustand v5 — no Redux**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @tanstack/react-query | 5.100.x | Server state: all Supabase data fetching, caching, mutations | Eliminates manual loading/error state; automatic cache invalidation on mutations |
| zustand | 5.0.x | Client UI state: modal open/close, active filters, selected row, pipeline step drawer | Minimal API, no boilerplate, replaces prop drilling for UI state |

**Why this pair over alternatives:**

- **vs. Redux / Redux Toolkit:** Redux is for large teams with complex interdependent client state. This is a single-developer project with server-dominant state (callings come from Supabase, not from complex client state machines). The 2025 consensus is explicitly "TanStack Query + Zustand replaced Redux for CRUD admin apps."
- **vs. React Context only:** Context re-renders all consumers on every state change — fine for theme/auth, not for frequently-updating lists.
- **vs. SWR:** TanStack Query is more featureful (optimistic updates, mutation callbacks, background refetch, devtools). SWR is simpler but offers less for a CRUD-heavy app.

TanStack Query's `useMutation` with `invalidateQueries` is the correct pattern for the callings pipeline: update a calling status → automatically refetch the roster. No manual cache manipulation needed.

**Confidence: HIGH** — Verified via TanStack Query Context7 docs (v5.100 confirmed), multiple 2025 community sources agree on this combination.

### Forms

**Use: React Hook Form v7 + Zod v3**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-hook-form | 7.76.x | Form state management | Minimal re-renders, excellent TypeScript integration |
| zod | 4.4.x | Schema validation | Type-safe validation that doubles as TypeScript type inference |
| @hookform/resolvers | 5.4.x | Connects Zod schemas to RHF | Official bridge package |

The callings pipeline has multiple form types (new member, new calling, extend calling, schedule interview). Zod schemas serve dual purpose: runtime validation + TypeScript types for Supabase inserts. This eliminates duplicate type definitions.

shadcn/ui's `<Form>` component is built directly on React Hook Form — they integrate with zero configuration.

**Confidence: HIGH** — Verified via npm version checks (all current), confirmed shadcn/ui Form component uses RHF internally.

### Database Client

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | 2.106.x | Supabase database + auth client | Official client; already in use on health-platform |

Use the Supabase JS client directly — do not add an ORM (Prisma, Drizzle) on top. Supabase's generated TypeScript types from the CLI (`supabase gen types`) provide sufficient type safety for the query patterns this app needs. An ORM adds a migration layer that conflicts with Supabase's own migration tooling.

**Confidence: HIGH** — Consistent with existing project patterns.

---

## Supabase Schema Pattern

### Recommended Schema for Ward Data

The ward data has a clear hierarchy: **Organization Units → Positions → Callings (position-holder assignments) → Members**.

```sql
-- Members are the atomic unit; names only, no sensitive data
create table members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now()
);

-- Organization units (ward-level groupings: Bishopric, EQ, RS, YM, Primary, etc.)
create table org_units (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,          -- e.g. "Elders Quorum"
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- Positions are defined roles that exist regardless of who holds them
-- (a position exists even when vacant)
create table positions (
  id          uuid primary key default gen_random_uuid(),
  org_unit_id uuid references org_units(id) on delete cascade,
  name        text not null,          -- e.g. "1st Counselor"
  is_unique   boolean default true,   -- false for "Sunday School Teacher" (multiple holders)
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- Callings: the assignment of a member to a position (current or historical)
-- This is the core junction table, but with meaningful payload
create table callings (
  id              uuid primary key default gen_random_uuid(),
  position_id     uuid references positions(id) on delete cascade,
  member_id       uuid references members(id) on delete set null,
  status          text not null check (status in (
                    'recommended', 'extended', 'accepted', 'declined',
                    'sustained', 'set_apart', 'released'
                  )),
  consideration_notes text,           -- visible to ward council; no pastoral content
  recommended_at  date,
  extended_at     date,
  accepted_at     date,
  sustained_at    date,
  set_apart_at    date,
  released_at     date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Calendar events created through the app (links back to callings)
create table calendar_events (
  id              uuid primary key default gen_random_uuid(),
  google_event_id text,               -- returned by Calendar API after creation
  calling_id      uuid references callings(id) on delete set null,
  event_type      text not null check (event_type in (
                    'interview', 'setting_apart', 'ward_council', 'bishopric_meeting', 'sacrament_prep'
                  )),
  title           text not null,
  scheduled_at    timestamptz,
  created_at      timestamptz default now()
);

-- Sheets sync audit log (tracks last import/export per sheet)
create table sheets_sync_log (
  id              uuid primary key default gen_random_uuid(),
  sheet_id        text not null,
  direction       text check (direction in ('import', 'export')),
  rows_affected   int,
  synced_at       timestamptz default now(),
  status          text check (status in ('success', 'error')),
  error_detail    text
);
```

**Key design decisions:**

1. **Positions are persistent, callings are transient.** When someone is released, the position still exists (vacant). A new calling record is created for the next holder — historical records are preserved.

2. **Status is on the calling, not on the position.** The pipeline (recommended → extended → accepted → sustained → set_apart) lives on the `callings` row. This gives you a full audit trail of how the pipeline moved.

3. **`is_unique` on positions.** Some positions (bishop, counselors) can only have one active holder. Others (Sunday School teacher) can have multiple concurrent callings. Enforce uniqueness constraints in application logic using this flag, not a DB constraint (which would block the transition period when two people overlap).

4. **No RLS needed.** The app uses a single shared password backed by a session JWT. Use Supabase's `service_role` key on the backend (Express), not the `anon` key. All database access goes through the Express API — never expose Supabase credentials to the browser.

**Confidence: HIGH** — Schema pattern derived from standard adjacency-list + junction-table patterns documented in Supabase official docs, verified against the specific requirements in PROJECT.md.

---

## Authentication

**Single shared password via server-side session — do NOT use Supabase Auth.**

The app has no individual users. Supabase Auth is built around the concept of one JWT per user. Using it for a shared password would mean:
- Creating a fake "shared" email account in Supabase Auth
- Dealing with session expiry and refresh for all concurrent browsers
- Unnecessary overhead for a low-sensitivity use case

**Recommended pattern:**

```
Browser ──POST /api/auth/login { password } ──▶ Express
Express checks bcrypt.compare(password, HASHED_PASSWORD_ENV_VAR)
  ├── match: set httpOnly session cookie (express-session + connect-pg-simple storing sessions in Supabase Postgres)
  └── no match: 401

All subsequent API calls:
Browser sends cookie automatically
Express middleware checks req.session.authenticated === true
  ├── authenticated: proceed to handler
  └── not authenticated: 401
```

| Technology | Version | Purpose |
|------------|---------|---------|
| express-session | 1.x | Session middleware |
| connect-pg-simple | 10.x | Store sessions in Supabase Postgres (no Redis needed) |
| bcryptjs | 2.x | Hash the shared password in env var |

Store the hashed password as `APP_PASSWORD_HASH` in the backend `.env`. The plain password is never stored. One `bcrypt.hash()` run locally to generate the hash, then paste the hash into env vars.

**This keeps Supabase doing what it's good at (database) while Express handles the simple session auth.**

**Confidence: HIGH** — Pattern is well-established for simple shared-secret web apps; verified that connect-pg-simple works with Postgres (Supabase exposes a direct Postgres connection string).

---

## Deployment Configuration

### Environment Variables Pattern for Google Service Account

Do NOT commit a service account JSON file. Do NOT base64-encode the entire JSON blob as one env var (causes issues with Vercel/Render env var size limits and newline escaping in private keys).

**Split the key fields:**

```bash
# .env (backend)
GOOGLE_SERVICE_ACCOUNT_EMAIL=ward-hub@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-gcp-project-id
GOOGLE_CALENDAR_ID=your-ward-calendar-id@group.calendar.google.com
GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

```javascript
// Usage in Express server
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});
```

**The `\n` replacement is critical.** Environment variable values store the private key with escaped newlines (`\n` as literal two characters). The `replace(/\\n/g, '\n')` call converts them back to real newlines that the RSA key parser expects.

**Vercel:** Add each variable individually in Project Settings → Environment Variables.
**Render:** Paste all variables from `.env` into the Environment Variables section.

**Confidence: HIGH** — Verified against GCP-on-Vercel documentation and Vercel community solutions for private key newline handling.

---

## Full Dependency List

```bash
# Backend (Express server)
npm install googleapis express express-session connect-pg-simple bcryptjs cors dotenv

# Frontend
npm install react react-dom @tanstack/react-query zustand react-hook-form zod @hookform/resolvers lucide-react @supabase/supabase-js

# Frontend dev
npm install -D vite @vitejs/plugin-react typescript tailwindcss postcss autoprefixer

# shadcn/ui — install via CLI, not npm directly
npx shadcn@latest init
# Then add components as needed:
npx shadcn@latest add table button dialog form input select badge sheet
```

---

## Alternatives Rejected

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| UI library | shadcn/ui | MUI / Ant Design | Opinionated aesthetics, heavy bundle, hard to customize |
| UI library | shadcn/ui | Tremor | Optimized for analytics dashboards; Ward Hub is CRUD tables + forms |
| State | TanStack Query + Zustand | Redux Toolkit | Massive overkill for a single-developer CRUD app; no complex interdependent client state |
| State | TanStack Query | SWR | TanStack Query has better mutation/optimistic update primitives for pipeline status changes |
| Auth | Server session | Supabase Auth | No individual user concept; Supabase Auth is per-user; shared-password use case maps cleanly to server sessions |
| Auth | Server session | Clerk / Auth0 | Third-party auth services require user identity concepts; wrong abstraction for shared password |
| DB | Supabase direct | Prisma ORM | Prisma migration tooling conflicts with Supabase's own; overkill for this schema complexity |
| Google API auth | Service account | OAuth user flow | No persistent "Google user" in the app; user OAuth requires consent screen + token refresh per user |
| Framework | Vite + React SPA | Next.js | No SSR/SEO need; adds complexity for a private authenticated admin tool |
| CSS | Tailwind v3 | Tailwind v4 | shadcn/ui is mid-transition to v4; use v3 for stability until shadcn fully supports v4 |

---

## Sources

- googleapis npm / official docs (Context7, version 172.0.0 confirmed): https://googleapis.dev/nodejs/googleapis/latest/
- google-auth-library archive notice: https://github.com/googleapis/google-auth-library-nodejs
- Google Calendar API ACL / sharing roles: https://developers.google.com/workspace/calendar/api/concepts/sharing
- GCP credentials on Vercel (split env var pattern): https://www.gcpvercel.com/docs/usage
- shadcn/ui data table + TanStack Table (Context7 verified): https://ui.shadcn.com/docs/components/data-table
- TanStack Query mutations / optimistic updates (Context7 verified, v5.100.14): https://tanstack.com/query/latest
- Supabase joins and nested queries: https://supabase.com/docs/guides/database/joins-and-nesting
- State management 2025 consensus: https://dev.to/devforgedev/you-dont-need-redux-zustand-tanstack-query-replaced-90-of-my-state-management-2ggi
- React Hook Form + Zod (2025): https://wasp.sh/blog/2025/01/22/advanced-react-hook-form-zod-shadcn
