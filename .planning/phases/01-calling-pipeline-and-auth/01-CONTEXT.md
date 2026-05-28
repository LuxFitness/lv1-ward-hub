# Phase 1: Calling Pipeline & Auth - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete calling management, member roster, auth, and responsive UI — fully usable without any Google API dependencies. Any bishopric member can log in, see every calling and its status, move a calling through the full pipeline, manage the member roster, and use the app from a phone.

</domain>

<decisions>
## Implementation Decisions

### Roster Layout & Grouping
- **D-01:** Roster is grouped by ward organization (Bishopric, Elders Quorum, Relief Society, Primary, Sunday School, etc.) — matches how bishopric members mentally model the ward.
- **D-02:** Each calling displays as a simple row: Position name | Member name | Status badge. Dense, scannable. Clicking a row opens the pipeline detail panel.
- **D-03:** Pending Actions inbox is a separate tab/view — not a banner or inline highlighting. Clean separation of "see everything" (roster) vs. "act on what's stuck" (inbox).

### Pipeline Interaction
- **D-04:** Pipeline detail opens in a slide-in side panel from the right (roster stays visible on left). On mobile, the panel goes full-screen.
- **D-05:** Stage advancement uses action buttons showing only valid next actions for the current stage — invalid transitions are hidden (not just disabled). Example: at "Recommended" stage, only "Extend Calling" and "Cancel" appear.
- **D-06:** Pending inbox threshold is configurable per stage. Suggested defaults: Extended → 3 days, Recommended → 7 days, Accepted (not yet sustained) → 14 days. Each stuck entry shows stage name and days-in-stage.

### Member Lookup UX
- **D-07:** Member selection when recommending uses typeahead search — type a name, results narrow instantly. Works well on mobile.
- **D-08:** If the searched member isn't in the roster yet, a "+ Add [name] to roster" option appears inline in the search results. Member is created on the spot without leaving the pipeline form; full name can be corrected after.

### Locked Architecture Decisions (from prior context)
- **D-09:** Auth: bcrypt shared password + express-session + connect-pg-simple. Sessions stored in Supabase Postgres — survive Render restarts.
- **D-10:** Vacancy = JOIN query result (no active set_apart calling for the position), not a database status value. Positions table is separate from callings table.
- **D-11:** Append-only `calling_events` log included in Phase 1 schema — records every stage transition with timestamp.
- **D-12:** Partial unique index on callings: `UNIQUE(position_id) WHERE status NOT IN ('declined', 'released', 'cancelled')` — prevents duplicate active pipeline entries per position.
- **D-13:** `state_entered_at` column required on all calling stage transitions — powers the "stuck for X days" inbox logic.

### Claude's Discretion
- Ward organization groupings and their default ordering (Bishopric first, then auxiliaries) — use standard LDS ward org structure.
- Exact per-stage stuck thresholds (D-06 gives suggested defaults — researcher/planner may refine).
- Session duration and re-auth trigger — standard express-session defaults are acceptable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, out-of-scope decisions, key decisions table
- `.planning/REQUIREMENTS.md` — Full v1 requirements with REQ-IDs; Phase 1 covers CALL-01 through CALL-08, MBR-01 through MBR-03, AUTH-01 through AUTH-03, UI-01 through UI-03
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and phase dependencies
- `CLAUDE.md` — Stack details, critical architecture decisions, and key pitfalls to avoid

### Architecture Constraints (from CLAUDE.md)
- Single shared password auth — no individual accounts, no OAuth
- No Supabase Auth — express-session + connect-pg-simple only
- Vercel (frontend) + Render (backend) deployment; cross-origin session cookie requirements (`credentials: 'include'`, `sameSite: 'lax'`, `secure: true`, explicit CORS)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — greenfield project. No existing components or utilities.

### Established Patterns
- Stack is React 18 + Vite 6 + TypeScript 5 + shadcn/ui + Tailwind CSS 3 + TanStack Query v5 + Zustand v5 + React Hook Form v7 + Zod v4 (frontend); Express 4 + TypeScript (backend)
- shadcn/ui provides accessible, responsive primitives (Sheet for slide-in panel, Command for typeahead search, Badge for status display)

### Integration Points
- Backend Express API ↔ Supabase Postgres (calling pipeline, member roster, session store)
- Frontend ↔ Backend: all API calls via `/api/*` relative paths; session cookie carries auth

</code_context>

<specifics>
## Specific Ideas

- Slide-in panel for pipeline detail should behave like a Sheet component (shadcn/ui `Sheet`) — slides from right, dismissible by clicking outside or pressing Escape
- Status badges should visually distinguish: Active (green), In Pipeline (amber), Vacant (muted gray)
- Pending inbox entry format: "[Position] — [Stage] for [N] days" with the org name as secondary text

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Calling Pipeline & Auth*
*Context gathered: 2026-05-27*
