# Feature Specification: Backtest Accounts and Agent Read Access

**Feature Directory**: `specs/003-backtest-accounts-and-agent-access`

**Created**: 2026-10-11

**Status**: Draft

**Input**: Owner's decision (2026-10-11): the next feature is agent read access, and the first thing the journal will be used for is backtesting, typed in by hand, with an agent helping to analyse it. Two parts: (1) an account has a kind, Live or Backtest, so backtests are kept apart from live trading; (2) the owner can let an agent read the journal, read-only, with named tokens that can be revoked, a switch that turns it all off, and every agent call written to the audit log. And one correction to a domain rule (3): a trade belongs to the day it was **entered**, not the day it was exited (owner's decision, 2026-10-11). Out of scope: an agent writing anything (drafts come later), Rule Replay and Edge Leak, import, the live session, any model call made by the app itself, and exposing the app beyond this computer.

## Why this feature, and who it is for

The owner is one person, and the first real use of the journal will be **backtesting**: replaying past sessions by hand and typing each trade in. Two things get in the way today.

First, a backtest trade is an ordinary trade. Every backtested day with trades and no review shows as **Missing** in Reviews, and the mistake counter, the Trades list and the weekly figures mix backtest and live. The owner would have to avoid the Reviews screen or read every number with a mental asterisk.

Second, the owner wants an agent (a chat or coding assistant they already use) to read the journal while they work: "how did my last 20 backtest trades compare with my plan?", "which mistake is most common in this backtest?". Today there is no safe way for an agent to read anything. The constitution is clear about how it must be done: scoped, revocable tokens; read plus drafts at most; every agent call in the audit log; model cost only on request.

This feature adds both, plus one correction the owner asked for while it was being specified: **which day a trade belongs to**. Until now a trade belonged to the day it was exited. The journal's thesis is judging decisions, a decision is made at entry, and for a day trader (and a backtester) the two days are almost always the same; when they differ, the owner wants the trade on the day it was entered. That is the only rule this feature changes. After it, backtests live in their own accounts and stay out of live figures, a trade sits on the day it was entered, and the owner can hand an agent a named, revocable, read-only token.

This feature does **not** put the app on the internet. Principle IV still says nothing is exposed beyond this computer until continuous integration has been proven to run on GitHub; an agent running on this computer needs nothing more.

## Clarifications

### Session 2026-10-11

- Q: Should a trade belong to the day it was entered or the day it was exited? → A: The day it was **entered**. The owner chose entry (recommended) over keeping exit and over a journal setting. Only a trade that crosses the day boundary is affected (the account's trading-day start such as 17:00, or an overnight hold).

- Q: Should a token be limited to chosen accounts (for example only the Backtest accounts), or read the whole journal? → A: The **whole journal**. One scope, "read the journal as in FR-014". Limiting a token to accounts is not part of this feature.
- Q: Should every agent read be its own row in the Audit log, or repeats collapsed? → A: No preference; **one row per call**, as the constitution says every agent action is written. If the log gets noisy, a collapsed view is a later change to the screen, not to what is recorded.
- Q: Should the Trades list's first time column be the entry time now that the day follows the entry? → A: Yes: **Entry time first**, then Exit time, then Trading day.
- Q: Should "Show backtests" be off by default? → A: Yes, off.
- Q: Is the wording "All live accounts" in the mistake counter's chooser clear? → A: Yes.

### Session 2026-10-12 (analysis of the tasks)

- Q: Is connecting and asking which tools exist an agent "call" that needs its own audit entry? → A: No. An audited call is a **read of the journal** (a tool call) or a **refused request**, one entry each. Connecting and listing the tools read nothing from the journal and write no entry (they are not an action on the owner's data, constitution II).
- Q: Can an agent filter trades by direction, instrument, plan answer or label? → A: Not in this feature. Trades are read for one account, or for the live accounts with backtests on request, within a range of trading days, deleted ones only on request, with paging. More filters are a later change if paging proves painful.
- Q: In which order are a day's trades listed? → A: By **entry** time, like the Trades list, so a day reads in the order the decisions were made.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keep backtests apart from live trading (Priority: P1)

The owner creates an account and marks it as a **Backtest** account (the choice is on the account form: Live or Backtest). They type backtest trades into it as they would any trade, with dates in the past. These trades and their days never nag and never mix: the Reviews screen does not call a backtest day "Missing", the Trades list and the mistake counter show live accounts unless the owner asks for the backtest, and no live figure changes because a backtest exists. When the owner wants to look at a backtest, they choose its account, and everything works as for a live account: daily review, weekly review, grades, mistakes, focus.

**Why this priority**: it is the first thing the owner will do with the journal, and it is useful on its own, with no agent at all. Without it, backtesting makes the live journal noisy and its numbers untrustworthy.

**Independent Test**: create one Live and one Backtest account with trades on the same past days; confirm the Backtest days are never Missing, the live figures (day, week, counter) are identical to a journal with no backtest account, and choosing the backtest account shows its own days and figures.

**Acceptance Scenarios**:

1. **Given** the account form, **When** the owner creates an account, **Then** they choose Live (the default) or Backtest, and the account list and every account chooser show which is which.
2. **Given** a Backtest account with trades on past days and no reviews, **When** the owner opens Reviews for that account, **Then** its days and weeks are never shown as Missing; a day with a saved review shows Draft or Reviewed as usual.
3. **Given** Live and Backtest accounts, **When** the owner opens the Trades list with no account chosen, **Then** only live accounts' trades are listed; a "Show backtests" switch adds the backtest trades; choosing a backtest account shows its trades without the switch.
4. **Given** the mistake counter, **When** "all accounts" is chosen, **Then** it means all live accounts; a backtest account counts only when chosen on its own.
5. **Given** any live figure (a day, a week, the counter, plan followed X of Y), **When** a backtest account is added or its trades change, **Then** the live figure does not change.
6. **Given** an existing account, **When** the owner changes its kind, **Then** only where its days and trades count changes, nothing typed is altered, and the change is recorded in the audit log.
7. **Given** the export, **When** it is downloaded, **Then** each account carries its kind.

---

### User Story 2 - Decide whether an agent may read, and hand it a token (Priority: P2)

In Settings, a new **Agent access** card has one switch (off until the owner turns it on) and a list of tokens. The owner creates a token by giving it a name ("Claude Desktop, backtests"), and the screen shows its value **once**. The list shows each token's name, when it was made, when it was last used and whether it is active or revoked. The owner can revoke a token at any moment, and can turn agent access off to stop every token at once. Creating a token, revoking one and flipping the switch are identity-level changes: they need the same recent Google confirmation as adding an identity, and they are written to the audit log.

**Why this priority**: it is the gate in front of everything an agent can do. It is useful on its own as the place where the owner sees and controls who can read.

**Independent Test**: with the switch off, a call with a freshly made token is refused; turn it on and the call works; revoke the token and the next call is refused; turn the switch off and every token is refused; the token value cannot be seen again after its creation.

**Acceptance Scenarios**:

1. **Given** Agent access off, **When** the owner turns it on, **Then** tokens can be created and used; turning it off refuses every token at once, without revoking any.
2. **Given** the owner creates a token, **When** it is made, **Then** its value is shown once with a plain warning that it cannot be shown again, and the list shows its name, creation time, "never used" and Active.
3. **Given** an active token, **When** the owner revokes it, **Then** it shows Revoked, is refused from its next use, and stays in the list.
4. **Given** the identity that created a token is disabled, **When** the agent next calls, **Then** it is refused.
5. **Given** a sign-in older than the step-up window, **When** the owner creates a token, revokes one or flips the switch, **Then** they are asked to confirm with Google first and nothing changes until they do.
6. **Given** the audit log, **When** the owner creates or revokes a token or flips the switch, **Then** one entry records it, naming the token but never its value.

---

### User Story 3 - An agent reads the journal, read-only (Priority: P2)

An agent the owner has given a token connects through the Model Context Protocol (MCP) and can ask the journal questions. It can read accounts (with their kind), trades (one account's, or the live accounts' with backtests on request, within a range of trading days), a day's review, a week's review, the mistakes and their counter for a week or a month, the week and month focus, and statistics for a day or a period. Every number carries what it carries on screen: money beside the plan figure for the same trade or period, a dash with its reason when a figure cannot be computed, and the sample size. The agent can write nothing. Every read is one entry in the audit log, so the owner can see exactly what was asked and when.

**Why this priority**: it is the point of the feature, but it needs US2 (a token) and is most useful with US1 (a backtest can be analysed on its own).

**Independent Test**: with a token, call each read and compare its answer with the same figure on screen; confirm a read answers nothing it should not (no audit log, identities, tokens), that a call with no token or a revoked one is refused, and that each read left one audit entry.

**Acceptance Scenarios**:

1. **Given** an active token and agent access on, **When** the agent lists accounts, **Then** it gets each account's name, kind, currency, trading-day start and archived state.
2. **Given** a Backtest account, **When** the agent asks for its trades with a date range, **Then** it gets them newest first with the total, and at most 200 per call with a way to continue.
3. **Given** a day or a period, **When** the agent asks for its statistics, **Then** the answer holds the same figures as the screen (net result, trades, plan followed X of Y, mistakes) and each money figure comes with the plan figure of the same scope.
4. **Given** a figure that cannot be computed (no stop, so no R), **When** the agent asks, **Then** it gets a dash with the reason, never a zero.
5. **Given** the agent asks for something it may not read (the audit log, the identities, the tokens, the secrets, the whole export), **When** it calls, **Then** the answer says it is not available to agents and nothing is returned.
6. **Given** any agent read, answered or refused, **When** it happens, **Then** exactly one audit entry is written with the token's name and what kind of read it was, and never the figures or text in the answer. Connecting and listing the tools write none.
7. **Given** a token that is revoked or unknown, or access switched off, **When** the agent calls, **Then** it is refused with one plain message that does not say which of those it was.

---

---

### User Story 4 - A trade belongs to the day it was entered (Priority: P3)

The owner logs a trade and sees, in the trade form's preview and in every list and review, that its trading day is the day of its **entry**, read in the journal time zone and, when the account has a trading-day start time, shifted the same way as before. A trade that is entered on one trading day and exited on the next shows on the day it was entered, with its result counted there.

**Why this priority**: it is a small correction that makes the day, week and month figures follow the decision. It is independent of backtests and agents, and is P3 because for the owner's own style the old and new day are the same.

**Independent Test**: log a trade entered at 16:50 and exited at 17:10 on an account whose trading day starts at 17:00; confirm it belongs to the day of the entry, that the day's review, the week and the counter use that day, and that every existing trade has its day recomputed from its entry with nothing else changed.

**Acceptance Scenarios**:

1. **Given** an account with no trading-day start, **When** a trade is entered on 7 Oct and exited on 8 Oct, **Then** its trading day is 7 Oct.
2. **Given** an account whose trading day starts at 17:00, **When** a trade is entered at 16:50 and exited at 17:10, **Then** its trading day is the entry's calendar date; **and when** a trade is entered at 17:00 or later, **Then** it belongs to the next calendar date (the same start rule as before, applied to the entry).
3. **Given** trades that already exist, **When** this feature arrives, **Then** each trade's trading day is recomputed from its entry, and no price, time, cost or result changes.
4. **Given** the trade form, **When** the owner types the entry time, **Then** the preview names the trading day from the entry and says which time was read ("entry read in Central Time; ...").
5. **Given** the journal time zone changes, **When** the owner saves it, **Then** every trading day is recomputed from its entry in the new zone and no instant moves, as before.
6. **Given** the Audit log, **When** a trade is deleted or restored, **Then** the entry names the trade by instrument, direction and **entry** time, so it matches the day it is listed under.

---

### Edge Cases

- A Backtest account is switched to Live (or the reverse): its days and trades move into or out of live figures at once; nothing typed changes; it is recorded in the audit log.
- A Backtest account that is archived still reads for an agent, marked archived, as for the owner.
- A deleted trade is not returned to an agent unless it asks for deleted trades; then each is marked deleted (as the Trades list does).
- The agent asks for more than 200 items: it gets the first 200, the total and how to continue.
- A token is used after the switch is turned off and on again: it works again (turning access off does not revoke).
- Two agents with two tokens read at once: each call is its own audit entry under its own token name.
- The same question twice is two entries (every read is recorded; the log shows one row per read).
- A very old backtest day (years back) reads like any other; the time zone rules are the journal's.
- The token's name is empty, very long or already used: refused with a plain message at creation.
- A trade is entered on one day and exited days later: it is listed on the day of its entry, and a day that was already reviewed shows the new trade (its figures change); this is the cost of following the decision and the owner accepted it.
- Reading never changes anything: no review, grade, focus or mistake is created, saved or deleted by an agent, and a "last used" time on a token is the only thing a read updates.

## Requirements *(mandatory)*

### Functional Requirements

**Account kind**

- **FR-001**: Every account MUST have a kind, **Live** or **Backtest**. A new account is Live unless the owner chooses Backtest, and every account that exists when this feature arrives is Live.
- **FR-002**: The owner MUST be able to choose the kind when creating an account and to change it later. Changing it MUST NOT alter any trade, review, grade or focus; it only changes where the account's days and trades count. The change MUST be recorded in the audit log (kind "Account kind changed", changed field "kind").
- **FR-003**: A day or a week of a Backtest account MUST NOT be shown as Missing, and no count of missing reviews anywhere MUST include a Backtest account. A saved review shows Draft or Reviewed as for a live account.
- **FR-004**: Any list or figure that spans accounts MUST cover Live accounts only by default: the Trades list with no account chosen, and the mistake counter's "all accounts". Choosing a Backtest account explicitly MUST show it. The Trades list MUST offer a "Show backtests" switch that adds backtest trades to the no-account list.
- **FR-005**: No live figure (a day's or week's net result, plan followed X of Y, the mistake counter, a stop line's status) MUST change because a Backtest account exists or changes.
- **FR-006**: The account's kind MUST be visible wherever accounts are listed or chosen (the Accounts list, the account choosers of Reviews, Trades and Mistakes).
- **FR-007**: The export MUST carry each account's kind.

**Agent access**

- **FR-008**: Agent access MUST be off until the owner turns it on, by one switch in Settings. Turning it off MUST refuse every token at once and MUST NOT revoke any.
- **FR-009**: The owner MUST be able to create a token by naming it. Its value MUST be shown once, at creation, and MUST NOT be retrievable afterwards. The list MUST show each token's name, when it was made, when it was last used (or "never used"), and whether it is Active or Revoked.
- **FR-010**: The owner MUST be able to revoke a token at any time. A revoked token MUST be refused from its next call and MUST stay in the list.
- **FR-011**: A token MUST stop working when the identity that created it is disabled, and when agent access is off.
- **FR-012**: Creating a token, revoking one, and turning agent access on or off MUST require the same recent Google confirmation as changing identities (FR-012 of feature 002), and each MUST be recorded in the audit log.
- **FR-013**: A token MUST be read-only: nothing an agent does may create, change or delete a record.
- **FR-014**: An agent MUST be able to read: accounts (with kind, currency, trading-day start, archived), trades (for one account, or for the live accounts with backtests on request, within a range of trading days, deleted ones only on request), a day's review, a week's review, the mistakes and their counter for a week or a month, the week and month focus, statistics for a day or a period, and the journal time zone. An agent MUST NOT be able to read the audit log, identities, tokens, the export, or any secret.
- **FR-015**: Every figure an agent reads MUST carry what it carries on screen: each money figure with the plan figure for the same trade or period, a dash and its reason when it cannot be computed, and the sample size and definition of every statistic (constitution I and III).
- **FR-016**: A list read by an agent MUST be bounded to 200 items per call, MUST give the total, and MUST say how to continue.
- **FR-017**: Every read an agent makes of the journal (a tool call), answered or refused, and every refused request MUST write one audit entry: its kind (an agent read, or an agent refused), the token's name, and which read it was. Connecting and asking which tools exist read nothing from the journal and write no entry. It MUST NOT hold any figure, note or review text from the answer. The actor is recorded as an agent acting for the identity that made the token (FR-026 of feature 002).
- **FR-018**: A call with no token, an unknown or revoked token, or access switched off MUST be refused with one message that does not say which; the refusal MUST still be recorded (without a token name when none is known).
- **FR-019**: The token's value MUST be stored only as a one-way digest, MUST NOT appear in any log, export, screenshot or error message, and the existing secret checks MUST cover it.
- **FR-020**: The Audit log screen MUST show the new kinds with the existing filters, and its "Who" column MUST show the token's name for an agent's entries.
- **FR-021**: Agent access MUST be reachable only from this computer (principle IV is unchanged); the app MUST NOT call any model itself (constitution II and VII: no model cost unless the owner's own agent asks).
- **FR-022**: Apart from the trading-day rule of FR-024, the feature MUST NOT change any trading rule or figure definition, and MUST NOT change any existing screen other than showing the account kind, the "Show backtests" switch, the trade form's preview wording and the new Settings card; existing data is kept and every existing account is Live.
- **FR-023**: The new and changed screens MUST meet the same accessibility rules as the rest (keyboard, contrast, no meaning by colour alone) in light and night.

**Trading day**

- **FR-024**: The trading day of a trade MUST be read from its **entry** time, in the journal time zone. With no account start time it is the calendar date of the entry; with a start time S it is the date of the entry plus (24 hours minus S), exactly as the rule worked before but applied to the entry instead of the exit.
- **FR-025**: When this feature arrives, every existing trade's trading day MUST be recomputed from its entry, in one step that changes no price, time, cost or result; reviews, weeks, the counter and every figure derived from the trading day MUST follow.
- **FR-026**: The trade form's preview, the Audit log's name for a trade, and the domain document MUST say entry where they said exit for the trading day; the Trades list MUST show **Entry time** first, then Exit time, then Trading day, and MUST be ordered newest first by entry time, so the order matches the first column. The trades of a day in the daily review MUST be listed in entry order, with the entry time shown.

### Key Entities

- **Account kind**: an attribute of an account, Live or Backtest. It decides where the account's days, weeks and trades count, never what they are.
- **Agent access switch**: one setting for the whole journal, on or off, off by default.
- **Agent token**: a name, a one-way digest of its value, when it was made, by which identity, when it was last used, and when it was revoked (if so). Never deleted.
- **Agent read**: one appended audit entry per call, naming the token and the kind of read, never its content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of tests, a Backtest account's days and weeks are never shown as Missing, and no missing-review count includes it.
- **SC-002**: With a Backtest account holding 500 trades added, every live figure (days, weeks, counter, plan followed) is identical to the same journal without it (compared field by field).
- **SC-003**: With access off, a fresh token is refused in 100% of calls; with it on, the same token reads; after revoke, 0 further calls succeed; after the switch is turned off, 0 calls with any token succeed.
- **SC-004**: A token's value cannot be recovered after creation: it appears in 0 screens, API answers, exports, logs and audit entries after the one time it is shown.
- **SC-005**: Each agent read, answered or refused, and each refused request produces exactly one audit entry in 100% of tests, connecting and listing the tools produce none, and none holds a figure or text from the answer.
- **SC-006**: For every read an agent can make, the figures equal the same figures on screen for the same scope in 100% of compared cases (a check per read).
- **SC-007**: With 5,000 trades, each read answers in under 1 second.
- **SC-008**: An agent cannot read the audit log, identities, tokens or the export through any call (checked against the list of every read).
- **SC-009**: The existing automated checks (all of features 000 to 002, the accessibility pass, the timings) still pass, apart from the test vectors of the trading-day rule, which are rewritten for the entry and stated as such.
- **SC-010**: In 100% of the test vectors (a trade within a day, across midnight, across the account's start time, across a clock change), the trading day equals the rule of FR-024.
- **SC-011**: After the recompute, 100% of existing trades keep every price, time, cost and result unchanged (compared field by field).

## Assumptions

- The owner is the only person; tokens belong to the owner's identities, and an agent acts for the identity that made its token.
- Reading is the whole of agent access in this feature. Drafts written by an agent, Rule Replay and Edge Leak in answers, and any model call made by the app are later features.
- There is one scope, "read the journal as in FR-014". Tokens are not limited to chosen accounts in this feature (owner's answer, 2026-10-11).
- Tokens do not expire in this feature: a token lasts until it is revoked or access is turned off.
- Backtests are told apart by the **account** they sit in (its kind), not by a flag on each trade. One account per backtest set is the expected way to work.
- The agent connects through MCP over a connection to this computer only. The owner pastes the token into their agent's own configuration; the app never sees the agent's side.
- The trading-day rule is changed here from exit to entry (the owner's decision, 2026-10-11; User Story 4). Agents and screens read the trading day the journal defines. The future prop cockpit may group by exit for its own daily-loss rule; that is its own decision.
- Audit entries for agent reads are kept for ever like all entries; they hold no figures, so they stay small.
- The existing accounts, trades and reviews are untouched; every existing account becomes Live.

## Open questions

None. The two questions marked when this spec was written were answered on 2026-10-11 (see Clarifications): a token reads the whole journal, and every agent read is its own audit row.

## Wireframes

The greyscale wireframes of this feature are listed in [screens.md](screens.md) (Penpot pages `B1 Account form` to `B8 Audit log agents`). They are a draft until the owner signs them off.

The questions raised by the draft were answered on 2026-10-11 and are recorded under Clarifications above: Entry time first in the Trades list, "Show backtests" off by default, and the wording "All live accounts" as drawn. None remains open.

## Signed-off wireframes

The wireframes in `screens.md` were signed off by the owner on 2026-10-12 for structure, content, states and behaviour (first on 2026-10-11, recorded again after the spec was clarified on 2026-10-12). Plan, tasks and implementation MUST honour them. The look is not signed off here: it follows the project's approved visual direction and passes a visual review after implementation (constitution principle V). Any change to an interface covered here MUST update `screens.md` and its Penpot frames in the same change.

Clarified on 2026-10-12, after analysis of the tasks: what counts as an audited call (FR-017, SC-005), the trade filters an agent has (FR-014), and the order of a day's trades with the entry time shown (FR-026). One existing screen changes with it (the daily review's trades table, listed in `screens.md`); the owner signed off on that row.

Accepted at sign-off: user story 4 (a trade belongs to its entry day) has no screen of its own by design; it changes the trade form's preview line and the Audit log's name for a trade, both listed in `screens.md`. The existing frames S0 to S5, L1 to L5 and A1 to A5 are not redrawn here; L1, L2 and the account choosers are updated in Penpot in the same change as the build.
