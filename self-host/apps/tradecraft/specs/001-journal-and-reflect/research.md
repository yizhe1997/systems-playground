# Research and decisions: Journal and Reflect (001)

**Date**: 2026-10-04. Builds on feature `000` as built (accounts, closed trades, `trade_detail`, the SQL rule functions, the
trading day, the API conventions). Nothing is taken from Tradecraft v1 (constitution 1.2.0). Where the spec or the signed-off
screens leave a detail open, the choice below is a default for the owner to overrule at the plan gate; those are collected
in section 14.

## 1. Where the statistics are computed

**Decision**: in Postgres, as views and small SQL functions over `trade_detail`, the judgement tables and the review tables.
The Go API assembles screens from them and does no counting or summing of its own. Money sums use `numeric`; the API sends
them as decimal strings, as in `000`.

**Why**: the same rule as `000` (one definition, exact decimals, testable on its own with hand-worked vectors). Every figure
the screens show (plan followed, mistakes, valid losses, win rate, net result) comes from the same views for a day, a week and
the mistake counter, so a day and its week cannot disagree.

**Alternatives**: counting in Go (a second definition, and more code that handles rows one by one); counting in the browser
(forbidden for money by `000`, and pointless for counts).

## 2. Weeks, months, and "today"

- A **week** is Monday to Sunday (`week_start(d) = date_trunc('week', d)`). A **month** is the calendar month. Both are taken
  on the **trading day**, never on the exit timestamp.
- A week is listed under the month its **Sunday** falls in (spec FR-026; 29 Sep to 5 Oct is under October).
- **Today** is per account: the trading day of the current instant, `trading_day(now(), journal time zone, account day start)`.
  So an account with a 17:00 start is already on tomorrow's trading day at 17:30. A day has *ended* when it is before that.
- **Missing** (daily): the day has ended, it has at least one live trade, and there is no saved review row. **Draft**: a row exists
  and `reviewed_at` is empty. **Reviewed**: `reviewed_at` is set. A day with no trades has no state until it is opened and saved.
- **Missing** (weekly): its Sunday has ended, at least one of its days has a live trade, and there is no weekly mark. Otherwise
  "Not reviewed" or "Reviewed". The current week is never Missing.

**Unconfirmed domain interpretations**, to be written into `docs/domain.md` and flagged: weeks start on Monday; "today" follows the
account's trading day; a week belongs to the month of its Sunday.

## 3. What a daily review stores

**Decision**: one row per `(account_id, trading_day)` in `daily_review`: the three answers, the two grades, `reviewed_at`,
`edited_at` (set when a reviewed review is saved again), `created_at`, `updated_at`. A row exists once something has been saved.
"Save draft" saves the answers; "Mark as reviewed" sets `reviewed_at` (first time only). Saving again after that sets `edited_at`.
`updated_at` is the version token for concurrent edits, with the same 409 rule as `000`.

**"Trades changed after review"** is derived, not stored: the number of trades of that account and trading day whose
`updated_at` is later than `reviewed_at` (a soft delete and a new trade both count, because both touch `updated_at`). Judging a
trade writes only to the judgement tables, so judging does not count as a trade change.

**Known limit**: a trade moved to another day after the review is no longer on that day, so it is not counted there.

## 4. Judging a trade

**Decision**: `trade_judgement` (one row per trade, created on first save): `plan_followed` (yes, partly, no), `label`
(valid_loss, mistake), `updated_at`. Mistake tags are rows in `trade_mistake (trade_id, mistake_id)`.

**Rules held by the database**, so they hold whoever writes:
- a CHECK: `label = 'valid_loss'` only when `plan_followed = 'yes'` (clarify answer, FR-009);
- a trigger on `trade`: when a trade's net result is no longer a loss (below zero), a `valid_loss` label is cleared (a win cannot be
  a valid loss);
- the API refuses `valid_loss` for a trade that is not a loss, with the reason text of the wireframe.

**Mistake label versus mistake tags** (default, section 14a): the *counter and every "Mistakes n" figure count tags* (records), as in
the wireframes ("Mistakes 1 (Chased entry x1)"). A trade labelled "Mistake" with no tag shows "Mistake, not tagged" and adds nothing
to the counter. **Breakeven** trades (net exactly zero) count as neither a win nor a loss; they can carry plan answer and tags,
and the label `mistake`, but not `valid_loss`.

## 5. Mistakes: one list, two kinds of record

**Decision**: `mistake` (name unique ignoring case and surrounding spaces, retired included; optional stop line: `stop_line` integer
at least 1 and `stop_period` week or month; `retired_at`). Seeded with the five starter names. Tagging on a trade is `trade_mistake`;
recording for a whole day is `day_mistake (account_id, trading_day, mistake_id)`, one row per mistake per day.
**Retire** hides a mistake from new tags and keeps every old record; **rename** changes the one row, so history and counts follow.
Adding a name that matches a *retired* mistake brings that mistake back (default, section 14d), because the name is unique.

**Counter** (S3): for a period (week or month, calendar), count per mistake = tags on live trades whose trading day is in the period
plus day-level records in the period, each record once, across accounts, with the split by account and by kind (on trades, on the
day). **Status**: `STOP TRADING` when the stop line's own period count has reached the line, else the count only (for example "5 of 6
this month"); no other status (clarify). A mistake with no stop line shows its count only.

## 6. Focus

**Decision**: `focus (period, period_start, text, updated_at)`, primary key `(period, period_start)`, period `week` (start = the Monday)
or `month` (start = the first). Global to the owner, not per account (spec assumption). Text 1 to 280 **characters** (Unicode code
points counted by the API; "27 over" in the message is exact). Clearing deletes the row.

A daily review shows three things at its top: **yesterday** (the latest earlier review *of the same account* whose "next session"
answer is not empty, labelled with its date, which covers the "nearest earlier" rule), the **week** focus and the **month** focus of
its trading day.

## 7. Weekly review

**Decision**: `weekly_review_mark (account_id, week_start, reviewed_at)` is the only thing stored (FR-021a). Everything else on
S5 is read from the days at request time. There is no way to remove the mark (no unmark in the wireframes); marking again is a no-op.

## 8. API shape

REST/JSON like `000`, one contract file (`contracts/openapi.yaml`). Screens get one read endpoint each, so a page is one request
and the numbers on it come from one query set: `GET /reviews` (S0), `GET /reviews/day` (S1), `GET /weekly` (S5), `GET /mistakes/counter`
(S3), plus small reads for the day and week pickers. Writes are small and separate: `PUT /reviews/day`, `PUT /reviews/day-mistakes`,
`PUT /trades/{id}/judgement`, `PUT /focus`, `POST /weekly/mark`, mistake management. Errors keep the `000` shape and wording style
(`code`, `message`, `fields[]`), 409 for an out-of-date copy. The account is always a query or body parameter; there is no
"current account" on the server.

**Concurrency**: `updatedAt` / `expectedUpdatedAt` on daily review, judgement, focus and mistake edits, exactly as in `000`.

## 9. Web tier

Routes: `/reviews` (S0, the new home: `/` redirects here), `/reviews/day` (S1, `?account=&date=`), `/reviews/week` (S5,
`?account=&week=`), `/mistakes` (S3). **S2** is a drawer opened from S1 (client state, no route of its own); **S4** is a dialog opened
from S1, S5 and S0 (same). The account switcher is a query parameter; with none, the first active account by name. Pickers (month
list, jump to date, day picker, week picker) read `GET /reviews/calendar`. Server components fetch; client components handle the
drawer, dialogs, stars, and saving. Money and counts are shown as the API sends them; the browser formats but never calculates.
Nav becomes Reviews, Trades, Mistakes, Accounts, Settings, with the brand "Tradecraft".

## 10. Export

`GET /export` (feature `000`) gains the new records, additively: `mistakes`, `dailyReviews`, `focuses`, `weeklyMarks`, and a
`judgement` object (plan answer, label, mistake names) on each trade, plus `dayMistakes`. The existing **Export** button on the
Trades screen stays the one place to export (default, section 14c); no new button is drawn.

## 11. The Trades list and principle I

The written exception on feature `000` (no process information beside money) was to expire when `001` is built. After this
feature a plan answer exists for each trade, so the Trades list gets a **Plan** column (Followed, Partly, Not followed, or "Not
judged yet") beside the net result, and a "Mistake" chip where a trade is labelled so. This changes a signed-off screen of `000` (L1) and
needs the owner's yes at this gate (section 14g); it is the honest way to end the exception.

## 12. Testing

Go tests against real Postgres, as in `000`: hand-worked vectors for every statistic (day, week, counter) including the dash cases;
the state rules at their boundaries (a day that has just ended, a 17:00 account at 17:30, a week that crosses two months); rules held
by the database (valid loss with a non-Yes plan, a loss turning into a win); counts after rename, retire, soft delete and restore;
export completeness. Playwright on the composed stack for the evening flow, the morning flow, look back, the mistake counter and
stop line, focus (including 280), the weekly review, the picker states, and the Trades list Plan column. Axe pass again on the new
screens in both modes, and a visual review at the end.

## 13. Look and feel

The visual direction (Hex, comfortable, light and night) is approved for the project and is used as is. The new components (five
stars, status chips, the judge drawer, collapsible week blocks, pickers) are built from the existing tokens in `DESIGN.md`; the
Quiet Outcome Rule holds (profit and loss tint on the net-result text only; stop-line status and "Missing" are carried by words, not
colour). The owner has further feel changes in mind for after this feature; they are not part of this plan.

## 13a. Outcomes of the requirements checklists (2026-10-04)

Evaluating the two checklists changed the spec (definitions, FR-005 to FR-018, FR-021a, FR-023, FR-025, new FR-027 to FR-030, SC-008) and
three owner decisions, recorded in the spec's clarifications: marking reviewed requires nothing; leaving unsaved asks first; clearing a
focus and retiring a mistake show a 10-second Undo. Restoring a retired mistake is `POST /mistakes/{id}/restore`. The stop line is limited to
1 to 999 and belongs to one period; its status is read from that period for the viewed week or month. Reviews stay on the date they were written
when the time zone or an account's day start moves trades.

## 14. Defaults the owner may overrule at the plan gate

**Approved by the owner on 2026-10-04: yes to all eight (a to h), including the Plan column on the Trades list.**

a. "Mistakes" figures count **tags**, not the "Mistake" label (section 4).
b. The plan line also shows trades **not judged yet** when there are any, for example "Plan followed 1 of 3 (1 not followed · 0 partly · 1 not judged yet)". The wireframe omits it; without it the three parts do not add up to the total on a day with an unjudged trade.
c. Export stays on the existing Export button of the Trades screen (section 10).
d. Adding a name that matches a retired mistake restores it (section 5).
e. `/` opens Reviews, not Trades (section 9).
f. The sidebar brand reads "Tradecraft" (the 001 wireframes) instead of "App name" (the 000 wireframes).
g. The Trades list gains a Plan column (section 11), which amends a signed-off screen of `000`.
h. A breakeven trade is neither a win nor a loss, and cannot be a valid loss (section 4).
