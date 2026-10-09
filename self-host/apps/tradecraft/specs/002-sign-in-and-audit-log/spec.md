# Feature Specification: Sign-in and Audit Log

**Feature Directory**: `specs/002-sign-in-and-audit-log`

**Created**: 2026-10-10

**Status**: Draft

**Input**: Owner's decision (2026-10-10): the next feature is sign-in and the audit log. Make Tradecraft a signed-in app for its single owner and record who did what. The owner signs in with Google; only allow-listed email addresses get in; the owner manages that list from Settings; every page and API call needs a sign-in; identity changes need a recent sign-in; an append-only audit log records sensitive actions and the owner can read it. The owner allowed looking at Tradecraft v1 (ADR 002 and the security review on the `tradecraft` branch) for how it worked; the plan records what is reused. Out of scope: other roles, passwords, sharing, the agent and MCP features themselves, and exposing the app beyond this computer.

## Why this feature, and who it is for

The owner is one person, and the app so far trusts anyone who can reach it. That was acceptable only because it runs on the owner's own computer and answers nowhere else (the written exception in the constitution, principle IV). Two things stand in the way of ever lifting that exception, and of letting an agent act on the owner's behalf later: the app does not know who is asking, and it keeps no record of what was done.

This feature adds both, and nothing else. It changes no trading rule, number or review screen. After it, every request carries an identity, the owner decides which email addresses count as them, and the sensitive things that happen are written down where the owner can read them. It also prepares the ground for the agent features that come next: an agent will act as an identity the owner allowed, and its actions will land in the same log.

This feature does **not** put the app on the internet. Principle IV still says nothing may be exposed beyond localhost until continuous integration has been proven to run on GitHub; that stays true. What changes is that the exception for "no sign-in and no audit log" ends.

## Clarifications

None yet. Defaults chosen where the description was silent are in Assumptions; `/speckit-clarify` may ask about them before the plan.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in with Google, and be kept out otherwise (Priority: P1)

The owner opens Tradecraft and, if they are not signed in, sees a sign-in screen with one button: **Continue with Google**. They choose their Google account. If that account's email is on the allow-list, they land in the app (on Reviews, the home screen). If it is not, they see one plain refusal that does not say why. Nobody who is not signed in can read or change anything: pages send them to the sign-in screen, and the API answers "not signed in". The session lasts eight hours, and the owner can sign out from the sidebar. If their identity is disabled while they are signed in, their very next request is refused.

**Why this priority**: it is the whole point of the feature and the thing the constitution's exception waits on. Everything else (the log, the access list) is only meaningful once requests have an identity.

**Independent Test**: with one allow-listed identity, sign in through the sign-in screen and reach Reviews; open a page and an API address without a session and confirm both are refused; sign in with a non-allow-listed account and see only the generic refusal; sign out and confirm the pages are closed again; disable the identity from a second session and confirm the first session's next request is refused.

**Acceptance Scenarios**:

1. **Given** the owner is not signed in, **When** they open any page, **Then** they are sent to the sign-in screen, and after signing in they arrive on the page they asked for (or Reviews if none).
2. **Given** an allow-listed identity, **When** the owner continues with that Google account, **Then** they are signed in, the sidebar shows which identity is signed in, and a Sign out control is available.
3. **Given** a Google account that is not on the allow-list (or whose email Google has not verified), **When** it completes the Google step, **Then** the owner sees the same short refusal as for any other failure ("You can't sign in with that account."), no session is created, and the refusal is recorded in the audit log.
4. **Given** no session, **When** anything calls an API address, **Then** it is answered "not signed in" and nothing is read or changed.
5. **Given** a signed-in session older than eight hours, **When** the owner next acts, **Then** they are asked to sign in again and nothing is lost that was already saved; text typed but unsaved stays protected by the existing "Leave without saving?" prompt where it applies.
6. **Given** a signed-in owner, **When** they choose Sign out, **Then** the session ends at once, the pages are closed again, and the sign-out is recorded.
7. **Given** two sessions of the same owner, **When** an identity used by the first is disabled from the second, **Then** the first session's next request is refused and it is sent to the sign-in screen.
8. **Given** a changed request from another website, **When** it reaches the app, **Then** it is refused (changes are accepted only from the app's own pages).

---

### User Story 2 - Every sensitive action is recorded, and the owner can read the log (Priority: P2)

Whenever something sensitive happens, one entry is added to an audit log: when it happened, which identity did it, what kind of action it was, what it was about, and which fields changed (field names only, never their values). The owner opens **Audit log** from the sidebar and reads it newest first, with filters for the identity, the kind of action and the period. The log can only grow: nothing edits or deletes an entry.

The recorded actions are: sign-in and sign-out, a refused sign-in, identity added, disabled and enabled, step-up confirmed, export downloaded, trade deleted and restored, account archived and restored, settings changed, and mistake retired and restored. Later features (agents) add their own kinds to the same log.

**Why this priority**: the log is what makes "who did what" answerable, and what an agent's actions must land in. It needs US1 (an identity per request) but is useful on its own once that exists.

**Independent Test**: do one of each recorded action while signed in and confirm each produces exactly one entry with the right identity, kind and subject; open the Audit log and filter by kind and by period; confirm there is no way in the app or through the API to change or remove an entry.

**Acceptance Scenarios**:

1. **Given** a signed-in owner, **When** they delete a trade, **Then** exactly one entry appears: now, their identity, kind "trade deleted", the trade as subject, and no money figures in it.
2. **Given** a change that is recorded, **When** the record cannot be written, **Then** the change is not made and the owner is told nothing was changed (a change without its record is not allowed); the sign-in record alone is best-effort.
3. **Given** the Audit log with many entries, **When** the owner filters by identity, kind or period, **Then** only matching entries show, newest first, with a total count and paging like the Trades list.
4. **Given** an entry, **When** the owner looks at it, **Then** they see the date and time in the journal time zone, the identity's email, the kind in words, what it was about, and the names of the fields that changed.
5. **Given** the whole app and API, **When** anyone looks for a way to edit or delete an entry, **Then** none exists.
6. **Given** a refused sign-in, **When** the owner reads the log, **Then** the entry names the attempted email address and says it was refused, without saying more than the refusal screen does.

---

### User Story 3 - Decide who counts as the owner (Priority: P2)

The owner may use more than one email address. In Settings, under **Access**, they see the list of identities: email, when it was added, when it last signed in, and whether it is active or disabled. They can add an email, disable an identity, and enable it again. Nothing is ever deleted. The last active identity can never be disabled, so the owner cannot lock themselves out. Adding, disabling and enabling need a **step-up confirmation**: if the owner did not sign in within the last few minutes, they are asked to confirm with Google again before the change is made. Each change is recorded in the audit log.

**Why this priority**: the allow-list needs a first entry and a way to change; without this story it would be edited by hand outside the app. It is P2 because US1 and US2 deliver the gate and the record on their own.

**Independent Test**: add a second email, sign in with it, disable the first identity, confirm the first is refused and the second works; try to disable the last active identity and see it refused; wait past the step-up window and see a change ask for confirmation first; enable the first identity again.

**Acceptance Scenarios**:

1. **Given** the Access list, **When** the owner adds a new email, **Then** it appears as active with no last sign-in, and the entry "identity added" is recorded.
2. **Given** an identity that has never signed in, **When** its first sign-in succeeds, **Then** the provider's stable account identifier is stored against it, so that a later sign-in by someone who has taken over the same email address (a different Google account) is refused.
3. **Given** exactly one active identity, **When** the owner tries to disable it, **Then** it is refused with a plain message and nothing changes, even if two such requests arrive at once.
4. **Given** a disabled identity, **When** the owner enables it again, **Then** the same row comes back with its history; adding the same email again does not create a second row.
5. **Given** the owner signed in more than the step-up window ago, **When** they add, disable or enable an identity, **Then** they are asked to confirm again first, and the change is made only after a fresh Google confirmation.
6. **Given** a fresh sign-in, **When** the owner changes an identity, **Then** no extra confirmation is asked.
7. **Given** an email in a different letter case or with surrounding spaces, **When** it is added or compared, **Then** it counts as the same address.
8. **Given** the very first start with no identity at all, **When** the app starts, **Then** the first identity is created from the owner's own configuration (never from a request), so there is always a way in.

---

### User Story 4 - Tests and local work can sign in without Google (Priority: P3)

A browser test, or the owner working on screens locally, cannot complete a real Google login. A **local-only script** produces a signed-in session for an allowed identity, and a test puts it in the browser. There is no sign-in route, provider or switch for this in the app itself, so nothing exists to attack. If the secret that makes such sessions is present in a production start, the app refuses to start.

**Why this priority**: it keeps the automated tests and the visual review working with the gate on. It is P3 because it serves the builders, not the owner's day.

**Independent Test**: run the script, drop its session in a browser, and reach Reviews; start the app in production mode with the dev secret present and confirm it refuses to start; confirm no request in the running app can create a session without Google.

**Acceptance Scenarios**:

1. **Given** the local script and the development secret, **When** a test uses the session it produces, **Then** it is signed in as the chosen identity and its actions are recorded under that identity.
2. **Given** production mode, **When** the development secret is present, **Then** the app refuses to start and says why.
3. **Given** the running app, **When** any request tries to create a session without a completed Google step, **Then** it is refused.

---

### Edge Cases

- A Google account whose email is not verified by Google is refused like any other non-listed account.
- The owner's Google account is signed in under two emails; each is its own identity and both are the owner.
- The only active identity's email is lost: recovery is the same configuration that creates the first identity (documented in the plan), not a hidden route.
- Two identity changes at once (disable here, disable there) must not leave zero active identities.
- A session cookie that is expired, damaged or signed for something else is treated as no session.
- The sign-in screen is itself reachable without a session, and nothing else is.
- The Audit log with no entries yet says so in plain words.
- An audit entry about an action on something later deleted still reads correctly (the subject is kept as text, not a link that breaks).
- Time zone changes later: entries keep their moment; only the display changes.
- Clock skew between the web tier and the API must not make a valid request look expired by more than a few seconds of tolerance.
- The existing "Leave without saving?" prompts and the 10-second Undo notices still work, and an Undo by a signed-in owner is recorded as its own action where it is recorded at all (restore of a trade, account or mistake).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every page except the sign-in screen, and every API address except its health check, MUST require a signed-in session; without one, a page request goes to the sign-in screen and an API request is answered "not signed in".
- **FR-002**: The sign-in screen MUST offer a single "Continue with Google" action. There is no password, no password reset and no other sign-in method.
- **FR-003**: Only emails on the allow-list, verified by Google, MUST be able to sign in; email comparison MUST ignore letter case and surrounding spaces; every refusal, whatever the reason, MUST show the same short message and MUST NOT reveal whether the address is on the list.
- **FR-004**: On an identity's first sign-in, the system MUST store the provider's stable account identifier against it and MUST refuse any later sign-in for that identity that presents a different identifier.
- **FR-005**: A session MUST last at most eight hours; the owner MUST be able to sign out, which ends the session immediately.
- **FR-006**: On every request, the system MUST re-check that the session's identity is still active; a disabled identity MUST lose access on its very next request.
- **FR-007**: Changes MUST be accepted only from the app's own pages (same-origin) and only as structured data; a change request from elsewhere MUST be refused.
- **FR-008**: The API MUST accept only requests that carry short-lived proof, signed by the web tier, of which identity they are made for; requests that are unsigned, expired, replayed or meant for another audience MUST be refused.
- **FR-009**: The Access list in Settings MUST show each identity's email, when it was added, when it last signed in and whether it is active or disabled, with a filter All, Active, Disabled.
- **FR-010**: The owner MUST be able to add an identity by email, disable an identity and enable it again; no identity is ever deleted; an email can belong to only one identity, disabled ones included.
- **FR-011**: The last active identity MUST never be disabled, including when two requests race; the refusal MUST say why in plain words.
- **FR-012**: Adding, disabling and enabling an identity MUST require a step-up: if the owner's sign-in is older than the step-up window, they MUST confirm with Google again before the change is made.
- **FR-013**: If no identity exists at start, the system MUST create the first one from the owner's own configuration; it MUST NOT be possible to create or list identities without a signed-in session.
- **FR-014**: The system MUST keep one append-only audit log. Each entry MUST hold the moment, the identity, the kind of action, a subject (as text), and the names of the fields that changed (never their values, and never money figures, notes or review text).
- **FR-015**: These actions MUST each add exactly one entry: sign-in, sign-out, a refused sign-in (with the attempted email), step-up confirmed, identity added, identity disabled, identity enabled, export downloaded, trade deleted, trade restored, account archived, account restored, settings changed, mistake retired, mistake restored.
- **FR-016**: If an entry for a change cannot be written, the change MUST NOT be made and the owner MUST be told nothing was changed; the entries for sign-in, sign-out and refused sign-in are best-effort.
- **FR-017**: Nothing in the app or the API MUST be able to edit or delete an audit entry.
- **FR-018**: The Audit log screen MUST list entries newest first with the date and time in the journal time zone, the identity's email, the kind in words, the subject, and the changed field names, paged like the Trades list, with filters for identity, kind and period and a plain empty state.
- **FR-019**: Entries MUST be exportable: the existing export gains the audit entries and the identities (not any secret or provider identifier).
- **FR-020**: There MUST be no sign-in route, provider or switch that creates a session without a completed Google step. Tests and local work MUST use a session produced by a local-only script, and the app MUST refuse to start in production when the secret that script needs is present.
- **FR-021**: No secret (the Google client secret, the signing keys, the development secret, a session or token) MUST appear in the repository, a log, a screenshot or an error message; the existing secret checks MUST be extended to the new variables.
- **FR-022**: The sidebar MUST show the signed-in identity and a Sign out control on every screen; the sign-in screen MUST NOT show the sidebar.
- **FR-023**: Every refusal MUST use plain words; a session that has expired MUST say so ("Your session ended. Sign in again.") instead of showing an error.
- **FR-024**: The new screens (sign-in, Access, Audit log, step-up confirmation, session ended) MUST meet the same accessibility rules as the rest (keyboard, contrast, no meaning by colour alone) in light and night.
- **FR-025**: The feature MUST NOT change any trading rule, figure, review or existing screen other than adding the sidebar identity, Sign out and the two new places in Settings and the sidebar; existing data is kept and belongs to the owner.
- **FR-026**: The audit log MUST be designed so a later actor that is not the owner at the keyboard (an agent acting for the owner) can be recorded as its own kind of identity in the same log, without changing the log's shape.

### Key Entities

- **Identity**: one email address that counts as the owner. Email (unique ignoring case and spaces), the provider, the provider's stable account identifier (set at first sign-in), when added, when last signed in, when disabled (if so). Never deleted.
- **Session**: an eight-hour proof that a person completed the Google step as one identity; ends at sign-out, at expiry, or when its identity is disabled.
- **Step-up**: the moment the owner last confirmed with Google; changes to identities need it to be recent.
- **Audit entry**: one appended record of one sensitive action: moment, identity, kind, subject text, changed field names. Never edited, never deleted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the app's pages and API addresses except the sign-in screen and the health check refuse a request with no session (checked against a list of every route).
- **SC-002**: An allow-listed owner signs in from the sign-in screen to Reviews in under 30 seconds (counting the Google step), and a non-listed account sees only the generic refusal in 100% of tests.
- **SC-003**: After an identity is disabled, 0 further requests from its sessions succeed.
- **SC-004**: Each recorded action in FR-015 produces exactly one audit entry with the correct identity and kind in 100% of tests, and none of them holds a money figure, note or review text.
- **SC-005**: With one active identity, 100% of attempts to disable it are refused, including 100 concurrent attempts; the count of active identities never reaches zero.
- **SC-006**: The Audit log opens its first page in under 1 second with 10,000 entries, and filtering by identity, kind or period answers in under 1 second.
- **SC-007**: No new secret appears in the repository, a container log, or a captured screenshot in the secret checks of `scripts/test.sh`.
- **SC-008**: A production start with the development secret present is refused in 100% of tests, and no running request can create a session without a completed Google step.
- **SC-009**: The existing automated checks (all of features 000 and 001, the accessibility pass, the timings of SC-008 of feature 001) still pass with the gate on, using the local-only session.

## Assumptions

- The owner supplies a Google sign-in client (id and secret) that allows this computer's address as a redirect; this feature documents how and keeps the values only in the environment. Without it the real Google step cannot be exercised, and only the local-only session can be used.
- Google is the only provider, now and for this feature; the identity record names its provider so another could be added later without reshaping it.
- The step-up window is 10 minutes and the session is eight hours (the v1 values); both are settings of the app, not of the owner's day.
- Audit entries are kept for ever (the log is append-only); no purge. They hold no IP address or browser details.
- The audited list in FR-015 is the owner's list of sensitive actions; creating or editing trades, reviews and focuses is not audited one by one, to keep the log readable. Later features add kinds as they need.
- The attempted email of a refused sign-in is recorded, because it is the main signal of someone trying to get in; it is shown only to the signed-in owner in the Audit log.
- The app stays reachable on this computer only: principle IV (nothing exposed beyond localhost until CI has been proven to run on GitHub) still applies. This feature retires only the exception for having no sign-in and no audit log.
- Tradecraft v1 (the `tradecraft` branch) has working versions of the identity list, the signed token between the web tier and the API, step-up and the audit log. The owner allowed using it as a reference; the plan records exactly what is reused and why, and v1 code is not copied unless the plan says so (constitution, Reuse).
- Existing screens keep their wording and layout; the sidebar gains the signed-in identity and Sign out, and the sidebar gains Audit log.
