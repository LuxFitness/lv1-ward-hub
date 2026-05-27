# Domain Pitfalls

**Domain:** Ward/congregation management app with Google API integration
**Researched:** 2026-05-26
**Confidence:** HIGH for Google API pitfalls (official docs verified); MEDIUM for calling pipeline and migration pitfalls (community patterns + domain logic)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or complete feature failure.

---

### Pitfall 1: Google OAuth Refresh Token Silently Revoked in Production

**What goes wrong:** The app works during development, then stops calling Google APIs weeks later with no user-visible error. All Calendar and Sheets operations silently fail.

**Why it happens:** Google revokes refresh tokens when:
- The OAuth consent screen is in "Testing" mode (7-day expiry hard limit — the most common gotcha)
- The refresh token has not been used for 6 months
- The user (the Google account owner) changes their Google account password
- Your app exceeds the per-account token limit (50 live refresh tokens per app per user)
- An admin sets scopes to Restricted after tokens were issued

Once revoked, there is no recovery endpoint. The token is dead. The only fix is re-running the full OAuth flow.

**Consequences:** Every Google API call returns HTTP 400 `invalid_grant`. Calendar events stop being created. Sheets sync stops reading or writing. The app appears functional but nothing happens.

**Warning signs:**
- "Testing" mode is still active in Google Cloud Console OAuth consent screen
- No error surfacing to the UI when an API call fails
- App works fine in dev, breaks after a week in staging

**Prevention:**
1. Publish the OAuth app to "Production" status in Google Cloud Console before any real user depends on it. This removes the 7-day testing-mode token expiry.
2. Store the refresh token in Supabase (same pattern as the existing health platform). On every API call, catch `invalid_grant` and surface a visible re-auth prompt — never silently swallow this error.
3. Consider a service account instead of user OAuth for Calendar and Sheets. Service accounts use private keys (not refresh tokens), avoiding the revocation problem entirely. The tradeoff: the shared calendar must be explicitly shared with the service account email address.
4. If using service accounts, store the JSON key file as an environment variable (Render secret), not in the repo.

**Phase:** Address in Phase 1 (auth setup). Wrong choice here requires a full auth rewrite.

---

### Pitfall 2: Google Sheets Two-Way Sync Overwrites Formula Cells

**What goes wrong:** A bishopric member has a SUM formula or COUNTIF formula in a column of the calling roster sheet. The app writes back to the sheet using `spreadsheets.values.update` on a range that includes that cell. The formula is permanently replaced with the raw value the app computed.

**Why it happens:** The Sheets API `values.update` and `values.batchUpdate` calls write raw data to cells. They have no awareness of cell types — they overwrite whatever is there, including formulas. This is documented API behavior, not a bug.

**Consequences:** User loses their formula, doesn't notice for days, then discovers their totals are wrong. Trust in the sync breaks. Manual recovery required (Ctrl+Z doesn't work after a day).

**Warning signs:**
- The sheet has formula cells mixed into data columns (common in organically grown sheets)
- Sync writes to entire row ranges rather than specific named columns
- No pre-flight check before writing to detect formula cells

**Prevention:**
1. On initial import, detect formula cells using `spreadsheets.get` with `includeGridData: true` and inspect the `userEnteredValue.formulaValue` field. Map which cells are formulae and exclude them from write operations.
2. Define a "sync range" contract: the app only writes to agreed-upon columns, documented with a comment row at the top of the sheet. Keep formula columns outside this range.
3. Use named ranges in the sheet instead of positional column indexes (see Pitfall 3). Named ranges survive column insertions and make the sync target explicit.
4. Default to append-only + separate import sheet pattern for Phase 1. True two-way sync is a hardening milestone — the PROJECT.md already flags this correctly.

**Phase:** Address in Phase 2 (Sheets sync). The import-only MVP in Phase 1 avoids this entirely.

---

### Pitfall 3: Column Index Drift Breaks Sync When Users Modify the Sheet

**What goes wrong:** The sync code maps "Member Name is column C, Status is column D." A bishopric clerk inserts a "Notes" column between B and C to track something informal. Now Member Name is column D and Status is column E. The next sync writes names into the Notes column and statuses into Member Name — silently corrupting the data.

**Why it happens:** The Sheets API uses zero-based column indexes for range references (A1 notation or row/column integer pairs). Neither index system detects schema drift. The code doesn't know a column was inserted.

**Consequences:** Data written to wrong columns. Corruption may persist for multiple sync cycles before anyone notices.

**Warning signs:**
- Sync code uses `A1:E100`-style ranges hardcoded to column letters
- No header row validation before writing
- Sync runs unattended (scheduled or webhook-driven)

**Prevention:**
1. Never use positional column indexes or hardcoded A1 ranges for write-back. Instead, read the header row first on every sync cycle, build a `{columnName → columnIndex}` map, and use that map for all writes.
2. On sync startup, assert that expected headers are present. If a header is missing or the order has changed beyond tolerance, abort the sync and alert (log to Supabase, surface in UI) rather than writing to wrong columns.
3. Use Google Sheets Named Ranges for the sync zone. Named ranges survive column insertions — the API can resolve them to current positions even after schema drift.
4. Document the expected header row in the app's onboarding UI so users know not to insert columns inside the sync zone.

**Phase:** Address in Phase 2 (Sheets sync). Phase 1 import can tolerate this with a manual header-mapping step.

---

### Pitfall 4: Google Calendar Event Ownership Trap

**What goes wrong:** Events created by the app (via a service account or OAuth user) appear on the ward calendar but cannot be edited or deleted by bishopric members through Google Calendar UI directly — because the event organizer is the service account email, not a human. Alternatively, when using user OAuth, events are created under one specific person's Google account, and if that person leaves the bishopric, their account loses access and the app can no longer manage those events.

**Why it happens:** Google Calendar events have a single organizer field. Only the organizer can edit or delete the event. If a service account creates the event, the service account is the organizer. If one bishop's Google OAuth token is used, that bishop is the organizer.

**Consequences:** Bishopric members see events on the calendar but can't delete or edit them from mobile Google Calendar. When the person who authorized the OAuth leaves or changes accounts, all future API calls fail and existing events become orphaned.

**Warning signs:**
- Service account email appearing as event organizer instead of a human name
- OAuth credentials tied to one specific named individual
- No documented "who owns the Google Cloud project" in the ward

**Prevention:**
1. Create a dedicated ward Google account (e.g., `lv1ward@gmail.com` or similar) and use that account's OAuth credentials as the authorized user. This account should be owned by the ward, not an individual, so credentials survive bishopric turnover.
2. Share the ward calendar with the service account email (if using service account). Service accounts access shared calendars only after explicit sharing — this is the most common missed step.
3. For events that need to be editable by humans via mobile Calendar, use the `guestsCanModify: true` flag when creating events, and add bishopric members as guests. Guests with `guestsCanModify` can edit event details.
4. Store all created event IDs in Supabase (`calendar_events` table). Never rely on Google Calendar as the source of truth for "what events exist" — it's a write target, not a database.

**Phase:** Address in Phase 1 (auth architecture). Changing the organizer model after events are created requires deleting and recreating all events.

---

### Pitfall 5: Recurring Event Modification Cascades and Performance Degradation

**What goes wrong:** A bishopric meeting is created as a recurring event (every Sunday at 7am). Someone edits one instance via the app (changing the location for one week). Then edits another. After a dozen individual exceptions, listing instances becomes slow and Google Calendar UI becomes erratic on that event. Eventually, a "delete all" request from the app only deletes the parent, leaving orphaned exception instances on users' calendars.

**Why it happens:** The Calendar API creates an "exception" record for each individually modified instance of a recurring event. There is no limit on the number of exceptions, but performance degrades with many exceptions. Deletion of the parent recurring event via API does not cascade to all exception instances in all cases.

**Consequences:** Stale meeting entries persist on members' calendars. Performance of listing events for that calendar degrades. The app's event count no longer matches what users see.

**Warning signs:**
- Recurring events are modified instance-by-instance rather than at the series level
- The app creates recurring events but has no "edit this and all following" or "edit all" UI

**Prevention:**
1. For the ward's use case (bishopric meetings, ward council meetings), avoid recurring events via the API entirely in Phase 1. Create individual events only. Simpler, no cascade bugs, and meeting schedules change too often for recurring events to be practical anyway.
2. If recurring events are needed later, treat the event series as atomic. Provide only two options: edit all instances (update the parent) or delete-and-recreate from a date (the two-call `UNTIL` split approach documented in the API). Never expose per-instance editing.
3. Always store `eventId` in Supabase when creating events. Use the stored ID for all subsequent edits or deletes. Never reconstruct event IDs from search.

**Phase:** Address in Phase 1 (Calendar integration design). Easier to avoid upfront than to migrate event data later.

---

## Moderate Pitfalls

---

### Pitfall 6: Calling Pipeline Orphaned States

**What goes wrong:** A calling is extended to a member. The member neither accepts nor declines — they "need time to think." The bishopric moves on. Three months later, the calling shows as "Pending - Extended" with no owner actively monitoring it. Multiply by 10 callings and the pending queue becomes noise that everyone ignores. The entire point of the app — no one falls through the cracks — fails.

**Why it happens:** The pipeline state machine has no timeout enforcement. States like "Extended," "Recommended," and "Awaiting Set Apart" have no maximum age. Without automated escalation or expiry, records accumulate in intermediate states indefinitely.

**Warning signs:**
- Any calling record in state "Extended" for more than 2 weeks
- Any calling record in state "Recommended" with no date set for extension
- No dashboard count of "stale pending" callings

**Prevention:**
1. Attach a `state_entered_at` timestamp to every calling state transition in the database. This column costs nothing and enables everything.
2. Add a "stale indicator" to the UI: any calling in an intermediate state for more than N days (configurable, default 14) gets a visual warning. This is purely a read-side display concern — no automated state changes needed.
3. Enforce valid state transitions in the database layer (check constraint or application-layer guard), not just the UI. The valid transitions are: `vacant → recommended → extended → accepted | declined → sustained → set_apart`. A calling cannot jump from `vacant` directly to `sustained`.
4. The `declined` terminal state must be distinct from `vacant`. When a member declines, the calling returns to `vacant` with a note, not a silent reset. This preserves history.

**Phase:** Address in Phase 1 (calling data model). Adding `state_entered_at` after launch requires a migration.

---

### Pitfall 7: Duplicate Calling Records on Multi-Step Approval

**What goes wrong:** A bishopric member creates a "Recommended" calling for a member. A second bishopric member, not seeing it in the UI (perhaps on mobile with a slow connection), creates another recommendation for the same member in the same calling. Now the same person has two pipeline records for the same position. Deduplication requires manual cleanup.

**Why it happens:** No uniqueness constraint at the data layer. The UI shows "Add Recommendation" without checking if one already exists for that position.

**Warning signs:**
- No database unique constraint on `(calling_position_id, status != 'declined')` or equivalent
- The "Add" button is not disabled when a position already has an active recommendation

**Prevention:**
1. Add a database partial unique index: only one calling record per position can be in a non-terminal state at a time. Terminal states (`declined`, `released`) are excluded. This is enforced at the Supabase level, not the application level.
2. The UI "Recommend" action for a position should be disabled/hidden when that position already has an active pipeline record, with a clear explanation ("Smith, John — Extended").
3. For the small scale of this app (15-20 users, one ward), optimistic locking is overkill. The unique index is sufficient.

**Phase:** Address in Phase 1 (database schema). Zero-cost to add at schema definition time; painful to retrofit.

---

### Pitfall 8: Google Sheets API Rate Limit on Sync

**What goes wrong:** The app polls the Google Sheets API every few minutes to check for changes. With 300 read requests per minute per project as the ceiling, this sounds safe — but each "check for changes" might make multiple API calls (list sheets, read header row, read data rows). At 15-20 active users opening the app simultaneously, polling becomes a burst that triggers 429 errors.

**Why it happens:** The per-project limit (300 reads/min) sounds generous for a small ward, but poorly designed sync makes multiple API calls per operation rather than one. Simultaneous page loads all poll at once.

**Consequences:** 429 errors cause sync to silently fail. Users see stale data. The app appears broken.

**Warning signs:**
- Sync triggered on every page load rather than on a schedule
- Multiple sequential API calls per sync cycle instead of `batchGet`
- No exponential backoff in the sync path

**Prevention:**
1. Use `spreadsheets.values.batchGet` to read multiple ranges in a single API call. One call to read header + data rows instead of two.
2. Do not trigger sync on every page load. Use a time-based cache: check a `last_synced_at` timestamp in Supabase; only call the Sheets API if the data is older than 5 minutes.
3. Implement exponential backoff for 429 responses. Do not log 429 as an error — it is expected behavior. Log as info with retry count.
4. For the ward's scale, a simple 5-minute pull interval is sufficient. Push-based sync (Google Sheets push webhooks) is complex and not worth the implementation cost here.

**Phase:** Address in Phase 2 (Sheets sync implementation).

---

### Pitfall 9: Shared Password Brute Force Exposure

**What goes wrong:** The app is password-protected with a single shared password. A script cycles through common passwords against the `/api/auth` endpoint. After some attempts, it guesses "bishop2024" or "lv1ward" and gains full access to the calling pipeline data.

**Why it happens:** A single shared password with no lockout is by definition vulnerable to automated guessing. There is no per-user account to lock, no MFA fallback, and typically no rate limiting on the login endpoint.

**Consequences:** Unauthorized access to the calling roster — who is being recommended, who has been extended. While not highly sensitive (no PII, no temple recommends), it would be a significant privacy breach for the ward.

**Warning signs:**
- No rate limiting on the login route
- No account lockout (impossible with shared password, so rate limit is the only defense)
- Password is a common word or pattern
- No HTTPS enforcement

**Prevention:**
1. Apply `express-rate-limit` to the login route specifically. 5 attempts per 15 minutes per IP is a reasonable threshold for a small internal app. Return 429 with `Retry-After` header.
2. Use `express-slow-down` (progressive delays) in addition to hard limits. This makes brute force extremely slow without locking out legitimate users.
3. Set a session duration and idle timeout. A session left open on a shared device is a larger risk than brute force for this user base. 8 hours max session, 2 hours idle timeout is appropriate.
4. Store the password as a bcrypt hash server-side. Never compare plaintext.
5. Enforce HTTPS at the hosting layer (Vercel handles this automatically).
6. The password should be at least 12 characters with a mix of word + numbers, rotated when a bishopric member is released. Document this in the app's admin notes.

**Phase:** Address in Phase 1 (auth implementation). Rate limiting is a one-hour addition.

---

### Pitfall 10: Ward Data Migration — Member Name Inconsistencies

**What goes wrong:** The existing Google Sheet has member names entered by multiple people over multiple years: "John Smith," "Smith, John," "john smith," "J. Smith," "Brother Smith." When imported into the app's `members` table, all five are treated as distinct members. Callings get split across duplicates. The calling roster is immediately wrong.

**Why it happens:** Freeform text fields with no validation schema in Google Sheets, combined with multiple data entry contributors over time.

**Consequences:** The initial import produces a corrupted member list. Fixing it requires manual review of every calling record. User trust in the app is damaged at launch.

**Warning signs:**
- Member names in the sheet are not in a single canonical format
- The sheet has no unique member ID column — names are the only identifier
- Multiple people have entered data at different times

**Prevention:**
1. Before building the import feature, audit the actual sheet data manually. Identify the de-duplication problem before writing import code.
2. The import process must present a "review and merge" step, not a silent import. Show the parsed member list and flag potential duplicates (fuzzy name match, e.g., Levenshtein distance < 3).
3. Define a canonical name format (First Last, no "Brother/Sister" prefix, no middle names unless needed for disambiguation) and enforce it at the application layer on new entries going forward.
4. Generate a UUID for each member in the app's database. Never use name as a foreign key. This is essential because names change (marriage, legal name changes) and must be updatable without cascading breakage.

**Phase:** Address in Phase 1 (data model) + Phase 2 (import UI with review step). The UUID decision must be made before any data is inserted.

---

## Minor Pitfalls

---

### Pitfall 11: Mobile Table Overflow Breaks Calling Roster View

**What goes wrong:** The calling roster has columns: Position, Organization, Member, Status, Last Updated. On a 375px mobile screen (iPhone SE), this table renders with horizontal overflow. The Status and Last Updated columns are clipped. Bishopric members on their phones can't see what they need most. The app feels broken on mobile.

**Why it happens:** Data-heavy tables designed on desktop don't adapt to mobile without explicit breakpoints or layout changes.

**Warning signs:**
- Table built with `<table>` element with 5+ columns and no responsive handling
- Status column (the most important column) is rightmost and first to be clipped
- No mobile testing during development

**Prevention:**
1. On mobile (< 640px), collapse the table to a card-per-calling layout. Show: Position name, Member name, Status badge. Secondary fields (Organization, date) move to an expandable detail or are omitted.
2. Prioritize column order for mobile: Status first or as a badge overlaid on the name, not last.
3. If a table is kept for mobile, use a sticky first column (position name) with horizontal scroll on the data columns. This at minimum keeps the context visible.
4. Test on 375px viewport width during development, not after. Safari on iOS has additional scrolling behavior differences (momentum scrolling, overscroll) that do not appear in Chrome DevTools.

**Phase:** Address in Phase 1 (UI design). Mobile layout is not a retrofit — build the card view from the start.

---

### Pitfall 12: Calendar Event Timezone Mismatch

**What goes wrong:** The app creates calendar events with a hardcoded UTC offset. During daylight saving time transitions, events shift by one hour. A bishopric interview scheduled for 7:00 AM shows up at 8:00 AM on the day after the clock change.

**Why it happens:** Calendar events must specify timezone. Using UTC offsets (`-07:00`) instead of IANA timezone names (`America/Denver`) breaks at DST transitions because the offset is no longer correct half the year.

**Warning signs:**
- Event creation code uses numeric offsets or `new Date().toISOString()` without timezone context
- Events look correct in testing but the ward is in a DST-observing timezone

**Prevention:**
1. Always pass IANA timezone names (`America/Denver` for Mountain Time) in the `timeZone` field of all event `start` and `end` objects. Never use raw UTC offsets.
2. Store the ward's timezone as a configuration value in Supabase (or environment variable). Default to `America/Denver` for this ward. Use it consistently for all event creation.
3. For recurring events specifically, the `timeZone` field on the recurrence rule is required — the API will reject the event if it's missing.

**Phase:** Address in Phase 1 (Calendar integration). One constant, set it once, never revisit.

---

### Pitfall 13: Google Cloud Project Tied to One Person's Personal Account

**What goes wrong:** The Google Cloud project (with Calendar API and Sheets API credentials) is created under one bishopric member's personal Google account. When they are released from their calling, they take the project with them — or simply stop maintaining it. The API credentials expire, quota limits are lost, and the app stops working.

**Why it happens:** Convenience during setup. The first developer uses their personal account because it's fastest. No one thinks about succession.

**Consequences:** Complete loss of Google API access. Re-creating the project under a new account requires new OAuth credentials, new consent screen verification (can take weeks for unverified apps), and manual update of all stored credentials.

**Prevention:**
1. Create the Google Cloud project under the ward's dedicated Google account (same account that owns the shared calendar), not any individual's personal account.
2. Document the Google Cloud project ID and the credentials location in a "ward admin handoff" document stored with the bishop (not only in the developer's memory).
3. Add at least one other person as Project Owner in the Google Cloud IAM console from day one.

**Phase:** Address in Phase 0 (project setup). Zero cost to do correctly upfront; significant cost to fix later.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Auth setup (Phase 1) | OAuth consent screen in Testing mode → 7-day token expiry | Publish to Production before first real use |
| Calling data model (Phase 1) | No `state_entered_at` → orphaned states undetectable | Add timestamp column at schema creation |
| Calling data model (Phase 1) | No partial unique index → duplicate pipeline records | Add DB constraint before first data entry |
| Calendar integration (Phase 1) | Events owned by individual user → bishopric turnover breaks app | Use ward-owned Google account for OAuth |
| Calendar integration (Phase 1) | UTC offsets instead of IANA timezone | Use `America/Denver` constant from day one |
| Google Cloud setup (Phase 0) | Project under personal account | Create under ward Google account |
| Sheets import (Phase 2) | Name inconsistencies corrupt member list | Manual audit + review step in import UI |
| Sheets sync (Phase 2) | Formula cells overwritten on write-back | Detect formulae before writing; use named ranges |
| Sheets sync (Phase 2) | Column index drift after user edits sheet | Read headers dynamically on every sync cycle |
| Sheets sync (Phase 2) | Rate limits under concurrent user load | Cache with 5-min TTL; use batchGet |
| Mobile UI (Phase 1) | Calling roster table unreadable on 375px | Build card layout from the start, not after |
| Security (Phase 1) | Shared password brute-forceable | Rate limit login route on day one |

---

## Sources

- [Google Sheets API Usage Limits — Official Docs](https://developers.google.com/workspace/sheets/api/limits)
- [Google Calendar API: Recurring Events — Official Docs](https://developers.google.com/workspace/calendar/api/guides/recurringevents)
- [Google Calendar API: Troubleshoot Auth — Official Docs](https://developers.google.com/workspace/calendar/api/troubleshoot-authentication-authorization)
- [Google OAuth invalid_grant: Token expired or revoked — Nango Blog](https://nango.dev/blog/google-oauth-invalid-grant-token-has-been-expired-or-revoked/)
- [Google OAuth: Using Service Accounts — Official Docs](https://developers.google.com/identity/protocols/oauth2/service-account)
- [Google Calendar API: Service Account Integration — Medium/IceApple](https://medium.com/iceapple-tech-talks/integration-with-google-calendar-api-using-service-account-1471e6e102c8)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Express Brute — GitHub](https://github.com/AdamPflug/express-brute)
- [Responsive Table Strategies — CSS-Tricks](https://css-tricks.com/under-engineered-responsive-tables/)
- [Strategies To Handle Tables On Mobile Screens — Medium](https://medium.com/@miquelarranz/strategies-to-handle-tables-on-mobile-screens-faea6d3eeff8)
- [Google Sheets API: Basic Writing — Official Docs](https://developers.google.com/workspace/sheets/api/samples/writing)
- [Google OAuth Refresh Token Revocation — Google Workspace Admin](https://support.google.com/a/answer/6328616?hl=en)
