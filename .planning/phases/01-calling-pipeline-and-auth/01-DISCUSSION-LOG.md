# Phase 1: Calling Pipeline & Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 1-Calling Pipeline & Auth
**Areas discussed:** Roster layout & grouping, Pipeline interaction, Member lookup UX

---

## Roster Layout & Grouping

### Q1: How should the calling roster be organized?

| Option | Description | Selected |
|--------|-------------|----------|
| By ward organization | Grouped sections: Bishopric, EQ, RS, Primary, etc. | ✓ |
| Flat list, sortable | All callings in one list, sorted by name/status/org | |
| Kanban by status | Columns: Vacant / In Pipeline / Active / Released | |

**User's choice:** By ward organization
**Notes:** Matches how bishopric members mentally model the ward.

---

### Q2: Within each org section, how should callings display?

| Option | Description | Selected |
|--------|-------------|----------|
| Simple rows | Position name / Member name / Status badge — click to open detail | ✓ |
| Cards with more detail | Each calling gets a card showing position, member, status, days-in-stage | |

**User's choice:** Simple rows
**Notes:** Dense and scannable; consistent with a tool used to quickly check status.

---

### Q3: Where does the Pending Actions inbox live?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate tab/view | Roster and Inbox are two distinct views | ✓ |
| Pinned banner above roster | Inbox items appear as alert strip at top of roster | |
| Highlighted rows in roster | Stuck callings highlighted in-line in their org section | |

**User's choice:** Separate tab/view
**Notes:** Clean separation — "see everything" vs. "act on what's stuck."

---

## Pipeline Interaction

### Q1: How does pipeline detail open when clicking a calling row?

| Option | Description | Selected |
|--------|-------------|----------|
| Slide-in side panel | Roster stays visible left; detail slides from right. Mobile: full-screen | ✓ |
| Full-page detail view | Navigate to dedicated page; back button returns to roster | |
| Modal overlay | Dialog pops over the roster | |

**User's choice:** Slide-in side panel
**Notes:** Best desktop experience while keeping roster context visible.

---

### Q2: How do you advance a calling to the next stage?

| Option | Description | Selected |
|--------|-------------|----------|
| Action buttons per stage | Only valid next actions shown; invalid transitions hidden | ✓ |
| Status dropdown | Dropdown for any status; backend guards catch invalid jumps | |
| Step wizard | Multi-step form for each transition | |

**User's choice:** Action buttons per stage
**Notes:** Prevents user error; hides impossible transitions rather than disabling them.

---

### Q3: What threshold makes a calling appear as "stuck" in the inbox?

| Option | Description | Selected |
|--------|-------------|----------|
| Configurable per stage | Extended: 3 days, Accepted: 7 days, Sustained: 14 days | ✓ |
| Simple 7-day rule | Any calling stuck >7 days in same stage | |
| You decide | Leave threshold logic to planner/researcher | |

**User's choice:** Configurable per stage
**Notes:** Suggested defaults — Extended (3d), Recommended (7d), Accepted-not-yet-sustained (14d).

---

## Member Lookup UX

### Q1: How do you search/select a member when recommending?

| Option | Description | Selected |
|--------|-------------|----------|
| Typeahead search | Type a name, results narrow instantly | ✓ |
| Scrollable dropdown list | All members alphabetical, scroll to find | |
| Two-step: browse orgs → pick | Filter by org first, then pick from filtered list | |

**User's choice:** Typeahead search
**Notes:** Fast, mobile-friendly, no UX friction.

---

### Q2: If the recommended member isn't in the roster yet?

| Option | Description | Selected |
|--------|-------------|----------|
| Add inline during recommendation | "+ Add [name] to roster" appears in search; created on the spot | ✓ |
| Require adding to roster first | Must exist in roster before they can be recommended | |
| Free-text name entry | Type any name directly — no roster link required | |

**User's choice:** Add inline during recommendation
**Notes:** Avoids breaking the flow; member can be fully filled in later.

---

## Claude's Discretion

- Ward organization groupings and default ordering (Bishopric first, then auxiliaries)
- Exact per-stage stuck thresholds (D-06 gives suggested defaults; researcher/planner may refine)
- Session duration and re-auth trigger

## Deferred Ideas

None — discussion stayed within phase scope.
