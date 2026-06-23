---
phase: "01"
plan: "09"
subsystem: frontend-ui
tags: [react, tanstack-query, zustand, shadcn, roster, calling-pipeline]
dependency_graph:
  requires: ["01-06", "01-07", "01-08"]
  provides: ["calling-roster-view", "calling-panel", "tanstack-query-hooks"]
  affects: ["frontend/src/App.tsx", "frontend/src/store/uiStore.ts"]
tech_stack:
  added: ["@tanstack/react-query QueryClientProvider", "useQuery/useMutation hooks"]
  patterns: ["controlled Sheet via Zustand", "org-grouped flex roster rows", "hidden-not-disabled transitions (D-05)"]
key_files:
  created:
    - frontend/src/hooks/useCallings.ts
    - frontend/src/components/RosterView.tsx
    - frontend/src/components/CallingPanel.tsx
  modified:
    - frontend/src/store/uiStore.ts
    - frontend/src/App.tsx
decisions:
  - "Use RosterEntry.org_unit_id (not organization) for grouping — matches actual type from plan 08"
  - "org name map + sort order hardcoded for standard LDS ward structure (Bishopric first, then auxiliaries)"
  - "openPanelForVacant() separate from openPanel() — vacant rows set selectedPositionId, not selectedCallingId"
  - "onOpenChange handler ignores second eventDetails arg from @base-ui/react/dialog (unused)"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-23"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
---

# Phase 01 Plan 09: Calling Roster View and Pipeline Panel Summary

**One-liner:** Org-grouped calling roster with slide-in CallingPanel Sheet wired to PATCH /api/callings/:id/transition via TanStack Query mutations.

## What Was Built

### Task 1: TanStack Query hooks and RosterView
- `frontend/src/hooks/useCallings.ts` — exports `useRoster`, `useCallingDetail`, `useTransitionCalling`, `useCreateCalling`
- `frontend/src/components/RosterView.tsx` — org-grouped roster using `RosterEntry.org_unit_id`; positions sorted by `sort_order`; flex rows (no table); Badge shows Vacant for null status; LoadingSkeleton on fetch
- `frontend/src/store/uiStore.ts` — extended with panel state: `panelOpen`, `selectedCallingId`, `selectedPositionId`, `openPanel`, `openPanelForVacant`, `closePanel`, `setSelectedPosition`

### Task 2: CallingPanel Sheet and App shell
- `frontend/src/components/CallingPanel.tsx` — shadcn Sheet (`side="right"`, `w-full sm:max-w-lg`); VALID_TRANSITIONS map drives hidden-not-disabled action buttons (D-05); destructive variants for declined/cancelled; VacantPosition sub-component creates new pipeline via POST; CallingDetail sub-component shows status badge, days-ago, member, notes, bishopric_owner
- `frontend/src/App.tsx` — wrapped in QueryClientProvider (30s staleTime, 1 retry); sticky header with tab nav (Calling Roster | Pending Actions | Members); RosterView renders for roster tab; CallingPanel always present, Zustand-controlled

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS (exit 0) |
| `grep -c "w-full sm:max-w-lg" CallingPanel.tsx` | 1 |
| `grep -c "VALID_TRANSITIONS" CallingPanel.tsx` | 2 |
| `grep -c "table" RosterView.tsx` | 0 |
| `grep -c "RosterView" App.tsx` | 2 |
| `grep -c "CallingPanel" App.tsx` | 2 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Type Alignment] RosterEntry uses org_unit_id and status, not organization/calling_status**
- **Found during:** Task 1 implementation
- **Issue:** Plan interfaces referred to fields as `organization` and `calling_status` but `types.ts` (from plan 08) exports `org_unit_id` and `status`
- **Fix:** Used actual type field names throughout RosterView and CallingPanel; added `org_unit_id` grouping logic with name map
- **Files modified:** `RosterView.tsx`
- **Commit:** 9df32b5

**2. [Rule 2 - Missing Export] useCallingDetail hook added**
- **Found during:** Task 2 implementation — CallingPanel needs to fetch single calling detail
- **Issue:** Plan's hooks list didn't include a per-calling detail hook, but CallingPanel requires it
- **Fix:** Added `useCallingDetail(callingId: string | null)` to `useCallings.ts` with `enabled: callingId !== null`
- **Files modified:** `frontend/src/hooks/useCallings.ts`
- **Commit:** 9df32b5

**3. [Rule 2 - onOpenChange signature] @base-ui/react/dialog passes two args**
- **Found during:** Task 2 implementation — base-ui's Dialog.Root.onOpenChange sends `(open, eventDetails)` not `(open)`
- **Fix:** Used `(open) => !open && closePanel()` which ignores the second arg safely (TypeScript accepts this)
- **Files modified:** `CallingPanel.tsx`
- **Commit:** ac3fde2

## Threat Surface Scan

No new security surfaces introduced. All roster and calling data is behind `requireAuth` on the backend. Client-side VALID_TRANSITIONS is UX-only per T-09-01 (server validates transitions). No new endpoints or auth paths created.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| Member display shows `Member #{id}` | CallingPanel.tsx | ~102 | CallingPanel detail uses `calling.member_id` string only — member name lookup not wired; requires separate members API call or RosterEntry join. Plan 09 scope is pipeline advancement; member name join is available in RosterRow via RosterView. Next plan should add member name to Calling API response or a secondary query. |
| Pending Actions tab | App.tsx | ~76 | Placeholder content — scheduled for future plan |
| Members tab | App.tsx | ~81 | Placeholder content — scheduled for future plan |

The member name stub does not prevent the plan's goal (pipeline advancement) — clicking a roster row shows calling ID, status, and transition buttons. The roster itself shows member names via `RosterEntry.member_name`.

## Self-Check: PASSED

Files exist:
- frontend/src/hooks/useCallings.ts: FOUND
- frontend/src/components/RosterView.tsx: FOUND
- frontend/src/components/CallingPanel.tsx: FOUND

Commits exist:
- 9df32b5: FOUND (feat(01-09): TanStack Query hooks and RosterView)
- ac3fde2: FOUND (feat(01-09): CallingPanel sheet and App shell)
