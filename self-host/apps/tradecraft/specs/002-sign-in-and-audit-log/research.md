# Research: Sign-in and Audit Log

**Feature**: `002-sign-in-and-audit-log` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

Decisions taken while planning, each with its reason and what else was weighed. Tradecraft v1 (branch `tradecraft`, paths
under `self-host/apps/tradecraft/`) was read as the reference the owner allowed; section 1 is the reuse ledger the constitution
asks for. Items marked **For the owner** are the ones this plan is least sure the owner would choose the same way.

## 1. What is reused from v1, and why

Nothing is copied by file. Each row says what v2 takes (the idea, or the code rewritten to v2's names and stack) and what it leaves.

| v1 source | What v2 does with it | Why |
|---|---|---|
| ADR 002 (Google only, allow-list, 8 h session, 60 s service token with `sub`/`role`/`jti`/`aud`, identity table with pinned provider subject, audit table, no dev-login in the production path) | **Taken as the design**, with the changes in sections 2 to 8 | It is the owner's own earlier decision and the constitution (IV) names these gates. Nothing to re-argue |
| `backend/internal/auth/servicetoken.go` (HS256 verify, lifetime and skew bounds, audience, `FreshStepUp`) | **Rewritten** for v2 (same checks; skew 10 s not 30 s; claims `session_at` and `step_up_at`; window 10 min not 5) | The verification is 40 lines of stdlib crypto; v2's claims differ, so copying would be editing anyway |
| `backend/internal/auth/replay.go` (in-memory first-use guard on `jti`) | **Taken nearly as is** | Correct and tiny. Ceiling kept: one API instance (section 19) |
| `backend/internal/auth/middleware.go` (`RequireSystem`, `RequireIdentity`, `RequireStepUp`, one generic 401, reason logged) | **Rewritten**: adds the session checks of section 3 and the two roles' route groups | Same shape, different checks |
| `backend/internal/auth/bootstrap.go` (first identity from `OWNER_BOOTSTRAP_EMAIL`, re-enable on lock-out) | **Taken nearly as is**, plus an audit entry for the re-enable | The spec's FR-013 and the recovery edge case are exactly this |
| `queries/identity.sql` (pin conditional on `provider_sub IS NULL`, advisory lock for the last active identity, enable never inserts) | **Taken** (rewritten in v2's query style) | These are the concurrency answers to SC-005; they are the hard part and v1 already got them right |
| `queries/audit.sql`, `internal/api/audit.go` (`recordAudit` in the transaction fails the request, `writeAudit` best effort) | **Taken as the pattern**; v2 adds filters, paging and the immutability trigger | FR-016 is this rule |
| `frontend/src/lib/csrf.ts` (`Sec-Fetch-Site`, then `Origin` against the host) | **Taken as is** | One function, already the right logic |
| `frontend/src/lib/service-token.ts` | **Rewritten** with `jose` (same claims plus v2's two) | |
| `frontend/src/lib/{owner-session,identity-action,owner-proxy,step-up}.ts` | **Not copied**; their jobs are done by `lib/session.ts` and the route handlers of section 12 | They are glue around NextAuth, which v2 does not use (section 2) |
| `frontend/scripts/dev-mint-session.mjs` | **Rewritten** (section 7): same idea, signs v2's cookie with the development key | v1's script encodes NextAuth's encrypted token format |
| NextAuth v4 (`[...nextauth]/route.ts`, sliding `maxAge` plus its `authTime` work-around) | **Not used** | Section 2 |
| `docs/security-review.md` (S-01 to S-06, S-31, S-32, S-35) | **Carried into v2's own `docs/security-review.md`** as the gate record, re-worded to v2's design; v1's file is not copied whole (most of it is about imports and strategies) | Constitution IV wants a security review record per gate |
| v1 sign-in wireframe and its pages | **Not used**; the signed-off A1 to A5 are drawn fresh | Owner said design goes through the normal spec process |

## 2. Sign-in is a hand-written Google authorization-code flow with `jose`, not NextAuth

**Decision**: the web tier implements the OpenID Connect authorization-code flow with PKCE itself (about 150 lines in
`lib/google.ts` and two route handlers) and uses the `jose` package for the signed values (the session cookie, the service
token, the checks on Google's ID token). `jose` is the only new dependency (zero dependencies of its own, 6.x).

**Why** (my position; **For the owner**, because v1 used NextAuth):
- A fixed 8-hour session and a "last confirmed" time are two things NextAuth v4 fights. Its `maxAge` slides on every read; v1 had to add an `authTime` claim and a second expiry check in three places to get a fixed limit. Here they are two claims in a cookie we sign.
- The local-only session (US4) becomes one `SignJWT` call that mirrors the real cookie. v1's script has to produce NextAuth's encrypted token format and so depends on its internals.
- v4 is in maintenance and v5 has been a beta for years; its Next 16 support is a peer-dependency range, not something proven here.
- The flow is short and has one correct shape: random `state`, `nonce` and PKCE verifier kept in a short-lived signed cookie; the code exchanged server to server; the ID token checked for signature (Google's key set), issuer, audience, expiry, nonce and `email_verified`. Each check is a unit test (section 18).

**Alternatives**: NextAuth v4 as v1 (works; more glue, the sliding session, an extra dependency tree); Auth.js v5 beta (a beta
in the sign-in path is not acceptable); a hosted identity service (a different decision, v1 left it open and the constitution
keeps everything self-hosted).

**Cost if the owner prefers NextAuth**: `lib/session.ts`, `lib/google.ts` and the two `/auth/google` routes are replaced by its
configuration; the API, the audit log, the Access list and the step-up rules do not change, because they only see the service
token. Cheap to switch before tasks are generated.

Google endpoints are constants in `lib/google.ts` (authorization `https://accounts.google.com/o/oauth2/v2/auth`, token
`https://oauth2.googleapis.com/token`, keys `https://www.googleapis.com/oauth2/v3/certs`, issuer `https://accounts.google.com`),
checked against Google's discovery document once at implementation. There is no setting that changes the provider (FR-020).

## 3. The session is a signed cookie; the API holds the truth about whether it still counts

**Decision**:
- Cookie `tradecraft_session`: a JWT (HS256, `SESSION_SECRET`) with `sub` (the identity's email, lower case), `session_at` and `step_up_at` (unix milliseconds) and `exp` (`session_at` + 8 h, fixed). `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` 8 h, `Secure` when `PUBLIC_ORIGIN` is https.
- `session_at` and `step_up_at` are **given by the API** (its database clock) when it accepts a sign-in or a step-up, so the web tier cannot invent a fresh confirmation and tests that pin the journal clock are not confused.
- The API re-checks on every request: the identity exists and is active (FR-006); `session_at` is not older than 8 h; and `session_at >= identity.sessions_valid_after`.
- **Sign-out** sets `identity.sessions_valid_after = now()` (and clears the cookie), so a copy of the cookie stops working at once, not only in the browser that signed out (FR-005). Because it is a column on the identity, signing out ends every session of that identity: with one owner that is the intent, and the spec's two-session scenario is about disabling, which also ends them at the next request.
- Step-up re-issues the cookie with a new `step_up_at` and the same `session_at` and `exp`, so confirming never extends the 8 hours.

**Why**: statelessness in the web tier (it has no database) with revocation held where the data is. A `session` table was
weighed (one row per sign-in, deletable) and rejected: it adds a table, a cleanup and a second thing the local-only script
would have to write, for a single owner who gains nothing from per-session revocation.

**Alternatives**: opaque random id in the cookie with a server table (the best for revocation per browser; rejected as above);
JWT only with no revocation (sign-out would not end a copied cookie, which fails FR-005 as written).

## 4. The API gate: a signed service token on every route, a database check behind it

**Decision**: every API route except `GET /health` goes through one Fiber middleware that:
1. reads `Authorization: Bearer <token>`; verifies HS256 with `SERVICE_TOKEN_SECRET`, `aud = tradecraft-api`, expiry, `iat` not in the future by more than 10 s, lifetime at most 120 s (the web tier signs 60 s), a `jti` not seen before (in-memory guard until expiry);
2. requires `role = owner` for ordinary routes, `role = system` for the one pre-session route (`POST /internal/sign-in`);
3. loads the identity by email and applies the checks of section 3;
4. for routes that change identities, requires `step_up_at` within 10 minutes (`403 step_up_required`).

Every failure answers `401 {code: "unauthorized", message: "Not signed in."}` and logs the real reason server side
(S-01 style: no hint to the caller). A database failure is a 500, not a 401, so an outage is not mistaken for a refusal.

**Check for SC-001**: a Go test walks `app.GetRoutes()` and asserts that every route except `GET /health` answers 401 without a
token. A new route that forgets the gate fails that test.

**Alternatives**: a bare shared key (what the constitution forbids); a signed token that names no identity and trusts the cookie
(the API could not tell whose action to record).

## 5. What the browser can reach

**Decision**: the web tier's catch-all `/api/[...path]` forwards only an **allow-list of first path segments**
(`accounts`, `trades`, `reviews`, `weekly`, `focus`, `mistakes`, `settings`, `currencies`, `export`, `identities`, `audit`).
`/internal/*` (sign-in, sign-out, step-up) is called only by web-tier server code, with values the web tier has itself
verified (for example the provider subject taken from Google's ID token). A forwarded path is checked segment by segment
(letters, digits, `-`, `_`), so a caller cannot reach another route with `..` or an encoded slash.

**Why**: without the allow-list, a stolen cookie could call `/internal/step-up` with a guessed provider subject and refresh the
step-up window without Google. This is the one place v1's catch-all would have been wrong for v2's shape.

## 6. Step-up: the Google account chooser again, and it must be the same Google account

**Decision**: when `step_up_at` is older than 10 minutes, the Access card opens the "Confirm it's you" dialog (A3). Its
Continue starts the same Google flow with `mode=step-up`, `prompt=select_account`. On return the web tier requires that the
Google `sub` equals the one pinned to the signed-in identity (the API compares: `POST /internal/step-up`); a different account
shows "That account is not the one signed in. Nothing was changed." and changes nothing. On success the cookie is re-issued and
the owner lands back on Settings where the action they were making finishes (the card keeps the pending action in
`sessionStorage` across the redirect and replays it once).

**What it does and does not prove**: Google does not promise to ask for the password again. What the step proves is that a
person is at a browser that holds the owner's Google session right now. A thief with only the Tradecraft cookie cannot pass it.
That is the S-35 threat; it is what v1 relied on too.

**Both tiers enforce it**: the web tier answers `403 step_up_required` before forwarding; the API checks the claim again.

## 7. The local-only session

**Decision**:
- `DEV_SESSION_SECRET` is a **second** key. The web tier accepts a session cookie signed with `SESSION_SECRET`, or one signed with `DEV_SESSION_SECRET` **only when that variable is set**. The key set is built once at start.
- `TRADECRAFT_ENV` is `production` (the default when unset), `local` or `test`. If it is `production` and `DEV_SESSION_SECRET` is set, **both** the web tier (in `instrumentation.ts`) and the API (in `main`) exit with a plain message. The default being `production` means a mistake fails closed.
- `frontend/scripts/dev-mint-session.mjs <email>` prints a cookie signed with `DEV_SESSION_SECRET` (`session_at` and `step_up_at` are "now", expiry 8 h). It needs the secret in the environment and nothing else; there is no route, flag or provider in the app that creates a session.
- The Playwright set-up and the API-direct test helper use the same minting function (a shared module the script also uses).

**Why a second key**: with one signing key the secret "the script needs" would be the production key, and FR-020 / SC-008 ("refuse
to start when it is present") could not be true. A cookie signed with the production key that claims to be a development session
is not accepted as one; there is no such claim.

**Honest limit**: the code that accepts the development key exists in the production build and is switched off by the variable
being absent plus the start-up refusal. That is the trade FR-020 itself describes. The refusal is tested in both tiers
(`scripts/check-dev-secret-refused.sh`).

## 8. The audit log

**Decision**: one table `audit_entry` (data-model.md). Append-only is enforced by the database, not only by the absence of a
route: a trigger raises an error on `UPDATE`, `DELETE` and `TRUNCATE`. The identity foreign key is `ON DELETE RESTRICT` and
identities cannot be deleted either. `actor_kind` (`owner`, `agent`, `system`) answers FR-026: an agent later is an entry with
`actor_kind = 'agent'` and the identity it acts for; the table does not change shape.

**Test reset**: the Go tests' `reset` truncates the table inside a transaction with `SET LOCAL session_replication_role = replica`
(the test database user is the superuser of a throwaway server); the application's own user path never does.

## 9. A change and its entry are one transaction

**Decision**: a small helper `s.inTx(ctx, func(q *store.Queries) error)` begins a transaction, runs the change and
`recordAudit` on the same `*Queries`, and commits; an error from either rolls both back and the owner gets the existing
"Something went wrong. Nothing was changed." (FR-016). The seven audited mutation handlers (`setDeleted`, `setArchived`,
`updateSettings`, `setRetired` and the identity routes) switch to it; the export handler records its entry first and fails the
request if it cannot. Sign-in, sign-out, refused sign-in and step-up are best effort, as the spec says.

## 10. What each kind writes

Held in data-model.md. Two choices to note:
- **Trade subject** is `"<instrument> <direction> trade of <weekday> <d> <Mon> <HH:MM>"` using the **exit** time in the journal time zone (the spec's example, "09:58", is the exit of the quickstart trade; the trading day is also set by the exit). No amounts, notes or review text, ever (FR-014).
- **Changed fields** are lower-case words stored as text (`status`, `time zone`, `email`), not column names, so the log reads the same if a column is renamed.

## 11. First identity and recovery

`OWNER_BOOTSTRAP_EMAIL` is read by the API at start (v1's logic). If at least one identity is active it does nothing. If none
exists it creates the first one. If all are disabled it enables the one with that address (and records an `identity_enabled`
entry with `actor_kind = 'system'`). If neither is possible the API exits with a plain message, so there is never a running
app nobody can sign in to. This is also the documented recovery (spec edge case): set the variable, restart.

## 12. Gating pages

Three layers, so none is the only one:
1. `src/proxy.ts` (Next 16's replacement for middleware) redirects a page request without a verifiable session cookie to `/sign-in?next=<path>` and answers `/api/*` without one with `401`. It is a convenience and the cheap rejection; it is not the authority.
2. The root layout reads the session: with none it renders no sidebar (this is the sign-in screen, FR-022); with one it renders the sidebar with the identity and Sign out.
3. The data layer: `lib/api.ts` signs a service token from the session for every call and turns a `401` into `redirect("/sign-in?reason=ended")`; `lib/browserApi.ts` does the same with `location.assign`. Even if the proxy were bypassed, no page can read data without the API accepting the token.

## 13. Same origin and structured data (FR-007)

Every `/api/*` request that is not `GET`, and `POST /auth/sign-out`, must pass `isSameOrigin` (v1's function) and, when it
has a body, `content-type: application/json`; otherwise `403` (not same origin) or `415` (not JSON). `GET /api/export` also passes `isSameOrigin`, because it now
writes an audit entry and should not be triggerable by another site's navigation.

## 14. Origin, cookies and redirect addresses

`PUBLIC_ORIGIN` (for now `http://127.0.0.1:3100`, in the owner's setup `:3101`) is one required setting: it builds the Google
redirect address (`<origin>/auth/google/callback`, which the owner registers with Google), decides `Secure`, and is the host the
same-origin fallback compares against. `next` (the page to return to) must start with a single `/`; anything else becomes
`/reviews`. Principle IV's exposure gate must re-check these settings (they are on its checklist in `docs/security-review.md`).

## 15. The existing checks under the gate (SC-009)

- **Go tests**: `api.New(pool, now, secret)` takes the service secret. `main_test.go` creates one active identity, and the `do` helper signs a token for it with the real clock (token times are wall time; the journal's pinned `clock` is only for the "not in the future" trade rule). The existing assertions do not change.
- **Playwright**: `helpers.ts`' `api()` signs a service token (shared module, `SERVICE_TOKEN_SECRET` from the environment); a global set-up mints the cookie for the browser context (`storageState`). Specs that drive the browser do not change.
- **Scripts** that call the API directly (`seed-sample.sh`, `check-persistence.sh`) get a token from `scripts/service-token.mjs` (needs `SERVICE_TOKEN_SECRET`; local use only).
- `scripts/test.sh` generates fresh random secrets for each run and exports them; they are never written to a file.

## 16. Secrets

All new values live in the environment (`.env`, untracked): `SESSION_SECRET`, `SERVICE_TOKEN_SECRET` (each at least 32
bytes, `openssl rand -base64 48`; both tiers refuse a shorter one), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and for local
and test only `DEV_SESSION_SECRET`. `.env.example` lists the names with no values. `check-loopback.sh` already looks for the
database password in tracked files and container logs; it is extended to every one of these values (SC-007). Error messages
and logs name the reason ("token expired"), never a token or a secret; the Google `code`, ID token and cookies are not logged.

## 17. Outbound calls to a third party (constitution VII)

Three, all to Google, all part of sign-in: the browser is redirected to `accounts.google.com`; the web tier posts the one-time
code to `oauth2.googleapis.com/token`; and it fetches Google's public keys from `www.googleapis.com`. What leaves: the client
id, the redirect address, the code and the PKCE verifier. No trade, review or account data. The disclosure at the point of use
is the sign-in screen's own line ("You will be asked to choose a Google account."), signed off in A1.

## 18. What is tested automatically, and what is not

| Part | How |
|---|---|
| Token verification (bad signature, expired, wrong audience, replayed, over-long lifetime, future `iat`) | Go unit tests |
| The gate on every route (SC-001), 401 body | Go test over `app.GetRoutes()` |
| Identity rules: add, duplicate, case and spaces, pin at first sign-in, different subject refused, disable, enable, last active (100 concurrent), bootstrap and recovery | Go tests against real Postgres |
| Audit: one entry per kind with the right identity and subject, none holds a figure, entry failure rolls the change back, the table refuses `UPDATE`, `DELETE`, `TRUNCATE`, filters and paging, 10,000 entries timing (SC-006) | Go tests (the entry failure by a temporary trigger on `audit_entry` that raises on insert, so the change's own transaction must roll back) |
| Google step: state, nonce, PKCE, issuer, audience, expiry, `email_verified`, wrong provider subject | Unit tests of `lib/google.ts` against a locally generated key set (the check function takes the key set as a parameter; nothing in the app can supply one). Written as Playwright specs that import the module, so no test runner is added |
| The redirect to Google carries the right parameters | Playwright: the navigation to `accounts.google.com` is intercepted and its address checked; nothing leaves the machine |
| Page and API gate, sign-out, expired session, disabled identity, Access list, step-up dialog, audit screen, sidebar | Playwright on the composed stack, signed in by the minted cookie |
| Production refusal with the development key present (SC-008) | `scripts/check-dev-secret-refused.sh` starts each service with it and expects a non-zero exit |
| **The real round trip through Google with the owner's client** | **Not automated.** Needs the owner's Google client and a person. Done once by the owner from `quickstart.md` section 3 and recorded in `verification.md` as manual, with its date |

## 19. Accepted risks (with the reason and when they end)

| Risk | Why accepted | Ends |
|---|---|---|
| A refused sign-in writes a log row each time; someone who can reach the port could grow the log | Only this computer can reach it (principle IV) | Before any exposure: rate limit and collapse repeats (checklist item in `docs/security-review.md`) |
| The replay guard is in memory, one API instance | One instance runs; a restart forgets 60 s of ids and tokens are 60 s long | When a second API instance is run |
| A copied cookie works until sign-out, disable or 8 h | Same as any bearer session; sign-out and disable end it at the next request | Not planned to change |
| Development-session clock: a minted session uses the host clock for `session_at`; after a sign-out, a Docker clock behind the host's by more than the gap would look "older than the sign-out" | Only affects local and test sessions, and only just after a sign-out | Not planned to change |
| Google may not re-ask for a password at step-up | Section 6 | Not planned to change |

## 20. Open items for the owner

1. **NextAuth or the hand-written flow** (section 2): this plan assumes the hand-written one.
2. **A Google client**: the owner creates an OAuth client (type "Web application"), adds `<PUBLIC_ORIGIN>/auth/google/callback` as an authorized redirect address, and puts the id and secret in `.env`. Steps are in `quickstart.md`. Until then only the minted session works and the Google button answers with the refusal screen (the reason is logged: "GOOGLE_CLIENT_ID is not set").
3. **Which address is the first identity** (`OWNER_BOOTSTRAP_EMAIL`): the owner's own Google email, set in `.env`.
4. Section 10's choice of the **exit time** in a trade's "About".
