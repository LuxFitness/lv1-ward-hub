# LV1 Ward Hub — v1 Requirements

## v1 Requirements

### Calling Management

- [ ] **CALL-01**: User can view the complete roster of all ward positions with current holder and calling status
- [ ] **CALL-02**: User can view all vacant positions that need to be filled, with any consideration notes
- [ ] **CALL-03**: User can create a new calling pipeline entry for a position, recording the recommended member and which bishopric member is handling it
- [ ] **CALL-04**: User can advance a calling through pipeline stages: Recommended → Extended → Accepted/Declined → Sustained → Set Apart → Active
- [ ] **CALL-05**: User can release a member from a calling with a release date, returning the position to vacant
- [ ] **CALL-06**: User can view a pending actions inbox showing all callings that require a next step
- [ ] **CALL-07**: System prevents duplicate active pipeline entries for the same position (no two callings can be active simultaneously for one position)
- [ ] **CALL-08**: Each pipeline stage transition records the date it occurred (so the app can surface "Extended 3 weeks ago — follow up?")

### Member Roster

- [ ] **MBR-01**: User can add members to the ward roster (name only — no contact info)
- [ ] **MBR-02**: User can edit or remove a member from the roster
- [ ] **MBR-03**: User can view which calling a member currently holds

### Google Calendar Integration

- [ ] **CAL-01**: User can create a calling interview event on the shared ward Google Calendar directly from a calling record
- [ ] **CAL-02**: User can create a setting-apart appointment event on the shared ward calendar when a member is sustained
- [ ] **CAL-03**: User can create a release event on the shared ward calendar when releasing a member from a calling
- [ ] **CAL-04**: User can create a ward council meeting event on the shared ward calendar
- [ ] **CAL-05**: User can create a bishopric meeting event on the shared ward calendar
- [ ] **CAL-06**: When a calling pipeline entry is cancelled or declined, any associated calendar events are automatically deleted

### Google Sheets Integration

- [ ] **SHT-01**: User can import the existing calling roster from the ward's Google Sheet to seed the app
- [ ] **SHT-02**: Import shows a preview of what will be imported (positions, members, current holders) before committing, highlighting duplicates and name conflicts

### Sacrament Meeting Planning

- [ ] **SAC-01**: User can assign speakers to specific upcoming Sundays, including talk topic
- [ ] **SAC-02**: User can view when each member last spoke (date + topic) to avoid repeating speakers too soon
- [ ] **SAC-03**: User can plan musical numbers for each Sunday (sacrament hymn, intermediate, choir, special music)
- [ ] **SAC-04**: User can record who is conducting and presiding each Sunday

### Access & Auth

- [ ] **AUTH-01**: App is protected by a single shared password (no individual accounts)
- [ ] **AUTH-02**: User session persists across browser restarts — login once, stay logged in
- [ ] **AUTH-03**: Login endpoint is rate-limited to prevent brute force attacks

### Responsive UI

- [ ] **UI-01**: Calling roster and pipeline use a card-based layout that works on mobile browsers without horizontal scrolling
- [ ] **UI-02**: Full functionality available on desktop browser
- [ ] **UI-03**: App works on mobile browser without requiring installation

---

## v2 Requirements (deferred)

- Google Sheets write-back — sync app changes back to the existing Google Sheet automatically
- True two-way Sheets sync with conflict resolution
- Meeting agenda builder — create and track ward council / bishopric meeting agendas with action items
- YM/YW, EQ/RS, ward/stake activity calendar events from within the app
- Stake and general conference events on the ward calendar

---

## Out of Scope

- Temple recommend status or tracking — sensitive pastoral data excluded by design
- Interview notes or content — only scheduling (date, time, who) is tracked
- Individual user accounts or per-user audit trails — single shared password, no per-user tracking
- Native mobile app — responsive web covers the mobile use case without App Store overhead
- Stake-level or general authority data — ward-level scope only
- Auxiliary-level calling management by non-bishopric users — bishopric manages all callings centrally

---

## Traceability

*(Filled by roadmapper — maps REQ-IDs to phases)*

| REQ-ID | Phase | Notes |
|--------|-------|-------|
| (pending roadmap) | | |
