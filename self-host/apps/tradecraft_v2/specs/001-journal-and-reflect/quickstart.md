# Quickstart: validating Journal and Reflect (001)

How to prove the feature works end to end once it is built. A run guide, not the implementation. Contracts:
[contracts/openapi.yaml](contracts/openapi.yaml). Data and rules: [data-model.md](data-model.md). Same stack and commands as
feature `000` (`README.md`): `docker compose up --build -d --wait`, `./scripts/test.sh`.

## Sample data

Account "Funded 50K", USD, trading-day start 17:00, journal zone America/Chicago (CDT, UTC-5 in October). NQ, dollars per point 20, no costs.
Wednesday **1 Oct 2025** has three trades (made-up data, in journal time):

| Trade | Entry to exit | Entry, exit | Net | Plan answer | Label | Tags |
|---|---|---|---|---|---|---|
| W (long) | 09:41 to 09:58 | 21450.00 to 21465.00 | +300.00 | yes | none | none |
| L1 (long) | 10:14 to 10:31 | 21500.00 to 21493.75 | -125.00 | yes | valid loss | none |
| L2 (long) | 10:40 to 10:52 | 21500.00 to 21493.50 | -130.00 | no | mistake | Chased entry |

Expected for 1 Oct (S1): net result **+45.00**; plan followed **2 of 3** (1 not followed · 0 partly); mistakes **1** (Chased entry x1);
valid losses **1 (of 2 losing trades)**; win rate **1 of 3** (33%).

## Scenarios (API, with curl; amounts are strings)

| # | Do | Expect |
|---|---|---|
| A | Create the three trades (feature 000), judge them as in the table, then `GET /reviews/day?accountId=…&date=2025-10-01` | the figures above, exactly; `state` is `null` (no review saved yet) and, because 1 Oct has ended, `GET /reviews` lists the day as `missing` |
| B | `PUT /reviews/day` with the three answers, grades 4 and 4, `markReviewed` false | `state` `draft`, `savedAt` set, `reviewedAt` null; the answer to the third question is the next day's "yesterday" |
| C | `GET /reviews/day` for 2025-10-02 | `focus.yesterday` is the 1 Oct answer with its date; for 2025-10-06 (nothing in between) it is still that answer, labelled 2025-10-01; for an account with no review at all it is `null` |
| D | `PUT /reviews/day` with `markReviewed` true; then edit a price on trade W through the 000 API; `GET /reviews/day` | `state` `reviewed`, `reviewedAt` set, `tradesChangedAfterReview` 1; a further save sets `editedAt`; the review stays editable |
| E | `PUT /trades/{L1}/judgement` with `label` `valid_loss` after setting the plan answer to `no` | 422 "Not available: you answered that the plan was not followed."; with the plan answer `yes` it is saved; changing the answer to `partly` clears the label (`label` `null`) |
| F | Valid loss on trade W (a win) | 422 "Not available: this trade is not a loss."; edit L1 so it becomes a win: its `valid_loss` label is cleared by the database |
| G | Tag Chased entry on W (a win) and set `label` `mistake` | allowed; the day shows 2 mistakes, and W is a profitable mistake, not a clean win |
| H | `PUT /reviews/day-mistakes` with Revenge mode (a mistake added first) for 1 Oct, twice | one record for the day: it counts once, whichever way it is written |
| I | Set Moved stop's stop line to 2 per week, tag Moved stop on two trades of that week; `GET /mistakes/counter?period=week&date=2025-10-01` | status `stop`, progress "2 of 2 this week"; with one tag the status is `count_only` and nothing else; a stop line of 0 gives 422 "Stop line must be 1 or more." |
| J | Rename Moved stop, retire Oversized, then read the counter and the 1 Oct trades | counts and history unchanged under the new name; a retired mistake is missing from `GET /mistakes` but still listed on old trades and in the counter; adding the name "Oversized" again restores it |
| K | `PUT /focus` for the month and the week of 1 Oct, then read three daily reviews in that week and one in the next week | the three show both, labelled; the next week shows the month and "no focus" for the week; a 281-character text gives 422 "Too long: 1 character over. Shorten it to save." (exact count); an empty body clears it |
| L | `GET /weekly?accountId=…&date=2025-10-01` after reviewing 1 Oct only | seven days listed Monday to Sunday; 29 Sep `missing` with its trades counted in the totals, 1 Oct `reviewed`, 2 Oct `no_trades`, weekend one line each; the week state `missing` (it has ended); `POST /weekly/mark` makes it `reviewed` and a second call changes nothing |
| M | `GET /reviews?accountId=…&month=2025-10`, and `month=2025-09` | the week of 29 Sep to 5 Oct is under October (its Sunday is the 5th), not under September; the filter counts equal the days listed |
| N | Trading-day edges: an exit at 17:30 on the 1st for the 17:00 account | belongs to 2 Oct for the review and for `GET /reviews/calendar`; today for that account is the next day from 17:00 |
| O | `GET /export` | the 000 document plus every mistake, daily review, focus, weekly mark, day mistake, and each trade's judgement, counts equal to the screens |
| P | `GET /trades` (feature 000) | each trade carries `planFollowed` and `label` (null until judged) for the Plan column |
| Q | Save a review from an out-of-date copy | 409 "This review was changed elsewhere. Reload to see the latest version."; the same for a focus and a mistake |
| R | Open a day with no trades, then save the third answer only | the review opens with the empty-day message (S1), is saved as a draft, and appears under that day in S0 |

## Browser run (real Chromium, composed stack)

Playwright drives this, and the same steps can be walked by hand:

1. **Evening**: Reviews (S0) shows 1 Oct as Missing (or today) for Funded 50K; Review this day opens S1 with the figures above and the
   focus card ("Yesterday: nothing to show" the first time). Judge the three trades through the drawer (S2): the valid-loss option is
   dashed with its reason until the plan answer is Yes. Write the three answers, set two grades by stars, Mark as reviewed: the line
   under the title reads "Reviewed … ".
2. **Morning**: open 2 Oct: the focus card shows "Yesterday: Wed 1 Oct" with the answer written the evening before.
3. **Longer focus**: write the week and the month focus from the cards in S1 (dialog S4); the 281st character shows "! Too long: 1 characters
   over." and Save is unavailable; clear one; the daily and weekly reviews show them.
4. **Look back**: step months with the arrows, open the month list, press Today, jump to a date; open a week and a day; the day picker
   marks days with trades (•) and missing reviews (!).
5. **Habit**: Mistakes (S3) shows the counts for the week and month with the account split; set a stop line in the editor ("Stop line must be
   1 or more."); reach it and the row says STOP TRADING.
6. **End of week**: Weekly review (S5): seven days, the missing day named with its trades still counted, mark as reviewed.
7. **Changed after review**: edit a trade of a reviewed day: S1 shows "1 trade changed after you marked this review as reviewed …".
8. **Trades list**: the Plan column shows Followed, Partly, Not followed or Not judged yet beside each net result (feature 000's list).
9. Compare every screen with `wireframes/` and record any difference (this feeds the visual review).

## Done when

Scenarios A to R pass, the browser run completes with no console errors, the accessibility pass has no violations in light and night, and
the results, including any failure, are recorded honestly in the feature's verification notes.
