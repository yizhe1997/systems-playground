# Decisions

Dated decisions for the code (constitution principle VIII). Earlier product decisions are in
`research/12-owner-decisions.md`; feature decisions and their alternatives are in each feature's `research.md`.

| Date | Decision | Reason |
|---|---|---|
| 2026-10-04 | Pinned versions at implementation: Go 1.26, PostgreSQL 18, Node 24, Next.js 16.3, React 19.3, Playwright 1.63, Fiber 2.52, pgx 5.11, goose 3.28, shopspring/decimal 1.4 | The plan said "current stable at implementation, recorded here". Versions come from the registries on this date |
| 2026-10-04 | The API container listens on all of its own interfaces; the loopback-only rule is enforced where the ports are published (`127.0.0.1:...` in `docker-compose.yml`) | A process bound to the container's loopback is unreachable through a published port. SC-009 is about published ports |
| 2026-10-04 | PostgreSQL 18 data volume is mounted at `/var/lib/postgresql` | That is where the 18 images keep their versioned data folder |
| 2026-10-04 | Rules that decide numbers live in SQL functions; money crosses the API as exact decimal strings | One definition for the screen preview, the saved figures and feature 001 (see `specs/000-log-trades/research.md`) |
| 2026-10-04 | The browser reaches the API only through a same-origin pass-through route in the web tier (`/api/...`); the API port is never used by the browser | Keeps the "web tier calls the API server-side only" rule and needs no CORS |
| 2026-10-04 | Times are typed as a native date field plus a 24-hour `HH:MM` text field. The date field shows in the browser's own format (for example 10/01/2025), not as "Wed 1 Oct 2025" | A native date picker is accessible and cheap. `HH:MM` text keeps the 24-hour clock that the spec asks for. Recorded as a visual gap for the owner |
| 2026-10-04 | Direction has no default: Long or Short must be chosen | A silent default would log a wrong direction without anyone noticing |
| 2026-10-04 | After Save, the list opens on the month of the saved trade's trading day | The default month would hide a back-dated trade, which looks like it was lost |
| 2026-10-04 | The Result preview tints only the net result, not the gross result | DESIGN.md "Quiet Outcome Rule". The approved Hex skin image tinted the gross result green too; the written rule wins unless the owner says otherwise |
| 2026-10-04 | Dialogs close with Escape or Cancel, not by clicking the dimmed background | A stray click must not throw away what was typed |
| 2026-10-04 | Trades list rows use plain links and one delegated handler for Delete and Restore, and Intl formatters are reused | Thousands of per-row client components made 5,000 rows take 7 s to open; this halved it |
| 2026-10-04 | `GET /currencies` added to the contract (active ISO 4217 codes, USD first) | One source for the currency chooser and the check on save |
| 2026-10-04 | Local host port for the web tier is 3101 on the owner's machine (set in the untracked `.env`) | Port 3100 is already held by a process inside WSL. The documented default stays 3100 |
| 2026-10-04 | Browser tests run Playwright on the host (Chromium downloaded once by `npx playwright install chromium`); `@axe-core/playwright` is a dev dependency for the accessibility pass | Keeps `scripts/test.sh` simple; axe checks WCAG A and AA rules including the 4.5:1 text contrast |
| 2026-10-04 | A trade's `updated_at` is bumped by `clock_timestamp()` in a trigger, and the concurrency check compares it for equality | An edit made from a copy that is not the latest is refused (409); microsecond precision survives the JSON round trip |
| 2026-10-04 | Visual review, owner's choice "approve, fix 1 and 4": each time is now one typed field that accepts `2025-10-01 09:41` or `Wed 1 Oct 2025 09:41` (weekday optional, checked against the date) and rewrites ISO to the screen style on leaving the field. The filter dates stay native date pickers | One field as in the wireframe; the parsing lives in `backend/internal/timeinput`, the one place that knows about time zones |
| 2026-10-04 | Visual review, owner's choice: the trades list is paged at 200 (`limit` and `offset` on `GET /trades`, total in the `X-Total-Count` header, "Showing 1 to 200 of n" with Newer and Older). Export still returns everything | SC-008: a page opens in about 0.3 s where the whole 5,000-row list took 3.9 s. `spec.md` still says "no paging"; amending it would make the sign-off stale, so it is left for the owner to decide whether to re-sign |
| 2026-10-04 | Feature 001 statistics live in SQL (views and functions in migration 00010); the Go API only names the numbers. sqlc cannot read the columns of table-returning functions, so `day_stats` and `period_stats` are called from hand-written queries in `backend/internal/store/stats.go` | One definition for a day, a week and the mistake counter |
| 2026-10-04 | A `valid_loss` label needs a plan answer of Yes, held by a CHECK written with `coalesce(...)` | A bare comparison with NULL passes a CHECK; the first version let a label with no plan answer through and a test caught it |
| 2026-10-04 | Reviews is the home screen (`/` redirects to `/reviews`) and the sidebar brand reads "Tradecraft" | Plan defaults e and f, approved 2026-10-04 |
| 2026-10-04 | The account switcher is a query parameter on every review screen, defaulting to the first active account by name | Plan default; keeps the account while moving between Reviews, a day and a week |
