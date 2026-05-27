# Feature Landscape

**Domain:** LDS ward/congregation management — bishopric and ward council focus
**Researched:** 2026-05-26
**Comparable tools:** Planning Center, Breeze ChMS, Elvanto, ChurchTools, Plan2Lead, LDS Callings Tools, Ward Agenda, ClerkTools

---

## Table Stakes

Features that any serious congregation management tool must have. Their absence makes the tool feel incomplete and forces workarounds.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Complete calling roster** — all ward positions with current holder | The foundational view. Without it there is nothing. A vacant position is as important as a filled one. | Low | Every ChMS has this. LDS Callings Tools, ClerkTools, and the Coda Bishopric Hub all start here. |
| **Vacant/open position list** | Leaders cannot act on what they cannot see. Vacancies are the primary recruitment queue. | Low | "30-day unfilled positions" is an explicitly tracked metric in ChMS best practices. |
| **Calling pipeline with named stages** | The LDS calling lifecycle has 6 distinct stages with different responsible parties. Generic task management loses the ritual and handoff structure. Pipeline stages: Recommended → Extended → Accepted → Sustained → Set Apart → Active | Medium | This is the #1 gap in existing LCR (Leader & Clerk Resources). Every ward-specific tool (LDS Callings Tools, Coda hub) was built specifically to fill it. |
| **Release tracking** | Callings end. Who is being released, by when, and has the member been privately notified first? | Low | Official handbook requires private notification before public announcement. Must be trackable separately from the new calling. |
| **Calling assignment to a specific position** | Many positions share a title (e.g., "Sunday School Teacher"). Each position slot must be uniquely tracked, not just the role name. | Low-Med | Position = role + slot + assignment. Without slots you cannot distinguish Vacancy from Filled across identical roles. |
| **Member name list** | Every tool needs a roster to pull names from when assigning callings. No contact info required for this app, but names are required. | Low | Scoped to name only per PROJECT.md privacy constraints. |
| **Calendar event creation** | Scheduling interviews, set-aparts, and meetings is the second core workflow. Without calendar write capability the app is read-only. | Medium | Google Calendar API with OAuth service account or user OAuth. |
| **Meeting scheduling (bishopric meeting, ward council)** | These are recurring, structured meetings with agenda context. Scheduling without agenda linkage is generic calendar. | Medium | Executive secretary owns agenda prep; bishopric meeting is weekly. |
| **Interview scheduling** | Calling extension interview must be booked between a bishopric member and the recommended person. Time, location, and which bishopric member matter. | Medium | Directly tied to the Recommended → Extended pipeline stage. |
| **Set-apart appointment scheduling** | After sustaining, the set-apart must happen before service begins. Often falls through the cracks. | Low-Med | Tied to the Sustained → Set Apart stage. |
| **Mobile-responsive UI** | Bishopric members check this on their phones during Sunday between meetings. A desktop-only tool gets abandoned. | Low | Pure CSS/layout concern; not a feature per se but a hard requirement. |
| **Single shared password auth** | Bishopric has agreed on this model. Individual accounts add adoption friction for no security gain given low data sensitivity. | Low | SESSION_SECRET + server-side session. Standard pattern. |

---

## Differentiators

Features that separate a good tool from a great one. Not universally expected, but recognized as high-value when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Sacrament meeting speaker log** | When did each member last speak? Bishopric currently tracks this in spreadsheets. A query that surfaces "hasn't spoken in 12 months" is immediately actionable. | Low-Med | This is a known pain point in the LDS tech community; Google Sheets and Ward Agenda solve it with varying success. "Last spoke" date + topic is sufficient. |
| **Pipeline stage with who-is-responsible callout** | For each calling in the pipeline, display which bishopric member owns the next action (e.g., "Counselor A needs to extend to Jane Doe"). Eliminates the "I thought you were handling it" problem. | Medium | The Coda Bishopric Hub and the Leading Saints article both cite distributed action items as the #1 coordination failure. |
| **Pending actions summary / inbox view** | A single view that shows everything requiring action across all callings. "3 callings waiting to be sustained." "2 set-aparts scheduled but not confirmed." | Medium | This is the "dashboard" view — the value of the whole system in one screen. |
| **Sacrament meeting planning grid** | A weekly view showing upcoming Sundays with speakers assigned, open speaker slots, prayers, conducting assignment. Directly replaces the Google Sheet that wards currently use. | Medium | Ward Agenda and WardBullet exist for this; integrating it into the same tool avoids context switching. |
| **Google Sheets import/seed** | The ward already has data. Asking leaders to re-enter everything manually is a common ChMS adoption killer. One-time import path dramatically reduces friction. | Medium | Per PROJECT.md: initial implementation may be import + write-back, with true two-way sync as a hardening milestone. |
| **Calling history / tenure tracking** | How long has this member been in this calling? Average tenure helps identify burnout risk and rotation timing. The handbook recommends 2–5 year tenures. | Low | Store start date on calling assignment; tenure is a simple calculation. No new data required. |
| **Auxiliary recommendation flow** | Sunday School president recommends a teacher to the bishopric. The app should support this handoff so recommendations don't arrive as a text message. | Med-High | LDS Callings Tools was built specifically for this. In scope: recommendation originator + notes. Out of scope: auxiliary user accounts (bishopric manages all per PROJECT.md). |
| **Notes/consideration field per pending calling** | When the bishopric discusses candidates, the executive secretary captures context ("member is overwhelmed, revisit in 3 months"). This is the institutional memory that lives in a bishop's notebook today. | Low | Plain text. No sensitive pastoral content — just coordination notes. |
| **Ward council member list with roles** | The 15–20 council members have defined roles. Quick reference to "who is the EQ president" is a daily need. | Low | Static-ish data; changes only when callings change. Can be derived from the calling roster if those callings exist. |

---

## Anti-Features

Features that look useful in planning, that other ChMS tools have built, and that the LDS ward context argues against building — at least for this v1 scope.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Individual user accounts per bishopric member** | Adds auth complexity, password reset flows, role management, and onboarding friction. The data stored is low-sensitivity. One shared credential covers all users for this ward scale. | Single shared password. If audit trails become important later, add a "who updated this" text field as a low-tech workaround before building full auth. |
| **Email / text notifications to members** | Planning Center and Breeze both offer this; it adds SMTP/SMS infrastructure and creates expectation of reliability. More importantly, the LDS calling extension is a sacred, personal conversation — a system-generated text invitation undermines the spiritual weight of the calling. | Calendar invites handle scheduling; verbal and in-person communication handles the actual calling. The app supports the process, not replaces it. |
| **Donation tracking / tithing records** | Every general-purpose ChMS includes giving. It has no applicability here; LDS financial records are entirely handled by LCR and the ward clerk. Building it adds scope, legal exposure (financial data), and complexity with zero payoff. | LCR handles this. Out of scope permanently. |
| **Child check-in / attendance tracking** | Planning Center and Breeze include check-in as a major product. For this ward it is irrelevant — there is no staffed check-in gate. Attendance is a stake/general church metric tracked separately. | N/A — omit entirely. |
| **Full two-way Google Sheets sync with conflict resolution** | Real two-way sync requires polling or webhooks, conflict resolution logic, schema versioning, and a robust error handling layer. This is an entire engineering problem on its own. Building it in v1 risks derailing the entire project for marginal value. | Import once at setup (seed from Sheet), write back from app to Sheet via API when records change. Full bidirectional sync is a hardening milestone only if wards demonstrate they need it. |
| **Public-facing ward website / church bulletin publishing** | WardBullet and sacramentmeetingprogram.com exist for this. Adding a public bulletin publisher is a separate product, not an admin tool. | Link to Ward Agenda or WardBullet if sacrament programs need to be published. |
| **Reporting / analytics dashboards** | General ChMS platforms build executive dashboards for attendance trends, giving trends, volunteer hours. For a bishopric tool, a complex analytics layer is unused overhead. The congregation is small enough that a list is a dashboard. | Simple counts inline (e.g., "7 vacant positions" on the roster page) are sufficient. No chart library or reporting engine needed. |
| **Temple recommend scheduling** | Explicitly out of scope per PROJECT.md. Sensitive pastoral data. | Keep out permanently. |
| **Interview content / notes** | Only scheduling (date/time/who) is tracked per PROJECT.md. Interview notes belong in the bishop's personal journal. | Scheduling metadata only — no notes field on interview records. |
| **Stake or multi-ward views** | Each ward is its own bounded context. Cross-ward visibility requires stake-level access control that this app cannot support with a single shared password model. | Scope to one ward. If the stake wants a tool, that is a separate product. |

---

## Feature Dependencies

Dependencies determine build order. A feature cannot be built before what it depends on.

```
Member name list
    → Calling position catalog (list of ward positions)
        → Calling assignment (member + position)
            → Pipeline stage tracking (status on the assignment)
                → Interview scheduling (tied to Recommended → Extended stage)
                    → Google Calendar event creation
                → Set-apart scheduling (tied to Sustained → Set Apart stage)
                    → Google Calendar event creation
            → Release tracking (separate record, same member)
        → Vacancy detection (positions with no active assignment)
            → Pending actions summary / inbox view

Google Calendar event creation (standalone)
    → Sacrament meeting planning grid (uses calendar for Sunday anchors)
    → Ward council meeting scheduling

Google Sheets import
    → Member name list (seeded from Sheet)
    → Calling assignment (seeded from Sheet)
    (one-directional seed; does not block other features)

Sacrament meeting speaker log
    → Member name list (needs roster to log against)
    (independent of calling pipeline)

Pipeline stage + responsible bishopric member callout
    → Calling assignment
    → Member name list (to identify the bishopric member as owner)
```

---

## LDS-Specific Calling Pipeline — Detailed Stage Breakdown

This expands on the pipeline stage feature since it is the app's core differentiator versus generic ChMS tools.

| Stage | What Happened | Responsible Party | Next Action | Can the App Help? |
|-------|--------------|-------------------|-------------|-------------------|
| **Recommended** | Auxiliary leader or bishopric member has suggested a name | Bishopric (to discuss and approve) | Bishopric discusses, prays, approves or declines | Yes — note the recommender, capture consideration notes |
| **Extended** | A bishopric member has had the private conversation with the member | The specific bishopric member who extended | Wait for member response | Yes — record which bishopric counselor extended, date extended |
| **Accepted** | Member said yes | Member (no app interaction) | Schedule for sustaining in sacrament meeting | Yes — schedule sustaining Sunday; trigger set-apart scheduling |
| **Declined** | Member said no | Bishopric (to discuss next candidate) | Return to Recommended with a new name | Yes — close this record, note declined, re-open position as vacant |
| **Sustained** | Congregation vote in sacrament meeting | Ward (no app interaction) | Schedule set-apart appointment | Yes — record sustaining date, trigger scheduling of set-apart |
| **Set Apart** | Priesthood blessing conferred by authorized leader | Bishopric member or stake leader | Update official LCR records | Yes — record set-apart date; mark calling as Active |
| **Active** | Member is serving | Auxiliary leader (day-to-day) | Monitor for release signals | Yes — show tenure, flag long-tenured callings |
| **Released** | Member released from calling | Bishopric | Announce in sacrament meeting; notify LCR | Yes — record release date; reopen position as vacant |

The Accepted and Declined stages are binary outcomes of the Extended stage. Both must be explicitly trackable — Declined callings frequently get lost, leaving positions appearing "in progress" when they are actually open again.

---

## Calendar Integration Patterns

Research across Planning Center, Breeze, and Google-native church workflows reveals these patterns:

**Pattern 1: Write-only from app to calendar (recommended for v1)**
App creates events on the existing shared Google Calendar. No reading or syncing. Simple, reliable, one-directional. Sufficient for interview scheduling, set-aparts, and meeting setup.

**Pattern 2: Event templates per meeting type**
Each scheduling action (interview, set-apart, ward council, sacrament prep reminder) has a pre-filled template with title format, default duration, and description template. Reduces bishop's friction — pick the type, pick the date, done.

**Pattern 3: Sunday anchor for sacrament planning**
The sacrament meeting planner is anchored to calendar Sundays. "Next 6 Sundays" as a scrollable view with speaker assignments per date. Does not require calendar read — the app generates the Sunday dates arithmetically.

**Pattern 4: Avoid bidirectional calendar sync**
Event updates made in Google Calendar would need to sync back to the app. Managing orphaned events, deletions, and edits is disproportionate to the value. If someone cancels an interview in Google Calendar, they can also update the app.

---

## MVP Feature Recommendation

### Must-Ship (v1 Core)

1. **Member name roster** — names only, no contact info
2. **Ward calling position catalog** — all positions, each slot uniquely identified
3. **Calling assignment** — member to position, with start date
4. **Pipeline stage tracking** — 7 stages with responsible bishopric member field
5. **Vacancy view** — open positions at a glance
6. **Pending actions inbox** — what needs action and by whom, across all callings
7. **Google Calendar write** — create events (interviews, set-aparts, meetings)
8. **Interview scheduling form** — member + bishopric member + date/time
9. **Set-apart scheduling form** — member + date/time, triggered by Sustained stage
10. **Google Sheets import** — one-time seed of existing data

### Defer to Milestone 2

- Sacrament meeting speaker log and scheduling grid (high value, but not the core pain)
- Auxiliary recommendation submission flow (collaborative coordination; needs more workflow design)
- Calling history / tenure view (useful, not urgent)
- Google Sheets write-back (technical complexity; validate need after v1)

### Omit Permanently

- Individual user accounts
- Email/text to members
- Donation/giving tracking
- Attendance/check-in
- Reporting dashboards
- Temple recommend scheduling
- Interview content/notes
- Stake/multi-ward views

---

## Sources

- [Planning Center Church Management](https://www.planningcenter.com/use-cases/chms)
- [Planning Center Volunteer Pipeline](https://help.planningcenter.com/en/142869-create-a-volunteer-pipeline-in-people.html)
- [Breeze ChMS All Features](https://www.breezechms.com/all-features)
- [Breeze Volunteer Management](https://support.breezechms.com/hc/en-us/articles/360022282594-Volunteer-Management-Getting-Started)
- [LDS Callings Tools FAQ](https://ldscallingstools.wordpress.com/faq/)
- [Plan2Lead LDS Ward Leadership Software](https://plan2lead.com/ward-council-tools)
- [The Ultimate Bishopric Organization Hub (Coda)](https://coda.io/@bob-hales/the-ultimate-bishopric-organization-hub)
- [Ward Agenda LDS Ward Management System](https://wardagenda.com/)
- [General Handbook Chapter 30 — Callings in the Church](https://www.churchofjesuschrist.org/study/manual/general-handbook/30-callings-in-the-church?lang=eng)
- [General Handbook Chapter 29 — Meetings in the Church](https://www.churchofjesuschrist.org/study/manual/general-handbook/29-meetings-in-the-church?lang=eng)
- [Leading Saints — How to Manage Callings in Your Ward](https://leadingsaints.org/how-to-manage-callings-in-your-ward-or-stake-tips-tricks/)
- [Sacrament Meeting Speaker Tracking — Church Tech Forum](https://tech.churchofjesuschrist.org/forum/viewtopic.php?t=28797)
- [LDS Church Tech Forum — Tracking Calling Forms](https://tech.churchofjesuschrist.org/forum/viewtopic.php?t=12133)
- [Wisefig — Church management without the bloat](https://www.wisefig.com/)
- [Breeze ChMS Audit Trail](https://support.breezechms.com/hc/en-us/articles/360001192054-Log-of-Changes-Audit-Trail)
