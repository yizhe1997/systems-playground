# Research: Sign-in and Audit Log

**Feature**: `002-sign-in-and-audit-log` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

Decisions taken while planning, each with its reason and what else was weighed. Tradecraft v1 (branch `tradecraft`, paths
under `self-host/apps/tradecraft/`) was read as the reference the owner allowed; section 1 is the reuse ledger the constitution
asks for. **Revised 2026-10-10:** the owner chose NextAuth (as v1) over a hand-written Google flow; sections 2, 3, 6, 7, 12 to 16
and 18 reflect that.

## 1. What is reused from v1, and why

Nothing is copied by file. Each row says what v2 takes (the idea, or the code rewritten to v2's names and stack) and what it leaves.

| v1 source | What v2 does with it | Why |
|---|---|---|
| ADR 002 (Google only, allow-list, 8 h session, 60 s service token with `sub`/`role`/`jti`/`aud`, identity table with pinned provider subject, audit table, no dev-login in the production path) | **Taken as the design**, with the changes in sections 2 to 8 | It is the owner's own earlier decision and the constitution (IV) names these gates. Nothing to re-argue |
| NextAuth v4 with the Google provider, JWT sessions, the `signIn` callback that asks the API, an absolute-age check on a `authTime` claim because NextAuth's own `maxAge` slides | **Taken** (section 2), with `sessionAt` / `stepUpAt` in place of `authTime` | The owner chose it. It is the version proven against this stack in v1 |
| `backend/internal/auth/servicetoken.go` (HS256 verify, lifetime and skew bounds, audience, `FreshStepUp`) | **Rewritten** for v2 (same checks; skew 10 s not 30 s; claims `session_at` and `step_up_at`; window 10 min not 5) | The verification is 40 lines of stdlib crypto; v2's claims differ, so copying would be editing anyway |
| `backend/internal/auth/replay.go` (in-memory first-use guard on `jti`) | **Taken nearly as is** | Correct and tiny. Ceiling kept: one API instance (section 19) |
| `backend/internal/auth/middleware.go` (`RequireSystem`, `RequireIdentity`, `RequireStepUp`, one generic 401, reason logged) | **Rewritten**: adds the session checks of section 3 and the two roles' route groups | Same shape, different checks |
| `backend/internal/auth/bootstrap.go` (first identity from `OWNER_BOOTSTRAP_EMAIL`, re-enable on lock-out) | **Taken nearly as is**, plus an audit entry for the re-enable | The spec's FR-013 and the recovery edge case are exactly this |
| `queries/identity.sql` (pin conditional on `provider_sub IS NULL`, advisory lock for the last active identity, enable never inserts) | **Taken** (rewritten in v2's query style) | These are the concurrency answers to SC-005; they are the hard part and v1 already got them right |
| `queries/audit.sql`, `internal/api/audit.go` (`recordAudit` in the transaction fails the request, `writeAudit` best effort) | **Taken as the pattern**; v2 adds filters, paging and the immutability trigger | FR-016 is this rule |
| `frontend/src/lib/csrf.ts` (`Sec-Fetch-Site`, then `Origin` against the host) | **Taken as is** | One function, already the right logic |
| `frontend/src/lib/service-token.ts` (`jose` HS256, 60 s) | **Taken nearly as is** (adds `session_at`, `step_up_at`) | |
| `frontend/src/lib/{owner-session,step-up,session-age}.ts` | **Merged into one smaller `lib/session.ts`** | Same jobs (read the session, absolute age, step-up freshness), one file and one test |
| `frontend/src/lib/{identity-action,owner-proxy}.ts` | **Not copied**; the catch-all route handler does their job (section 5) | v1 had a route file per resource; v2 has one pass-through |
| `frontend/scripts/dev-mint-session.mjs` | **Taken** (section 7): `next-auth/jwt` `encode`, signed with the development key | Same idea; v2 adds the second key so the production refusal is real |
| `docs/security-review.md` (S-01 to S-06, S-31, S-32, S-35) | **Carried into v2's own `docs/security-review.md`** as the gate record, re-worded to v2's design; v1's file is not copied whole (most of it is about imports and strategies) | Constitution IV wants a security review record per gate |
| v1 sign-in wireframe and its pages | **Not used**; the signed-off A1 to A5 are drawn fresh | Owner said design goes through the normal spec process |

## 2. Sign-in is NextAuth v4 with the Google provider (the owner's choice, 2026-10-10)

**Decision**: the web tier uses `next-auth` 4.24 (`getServerSession` in server code; `signIn` / `signOut` from
`next-auth/react` in the two buttons). `jose` is added directly only to sign the service token, as in v1. Two providers are
registered, both Google with the same client id and secret:

| Provider id | Used for | Notes |
|---|---|---|
| `google` | the sign-in (A1) | |
| `google-confirm` | the step-up confirmation (A3) | `authorization.params.prompt = "select_account"`. A separate id is how the `signIn` callback tells a confirmation from a sign-in (`account.provider`) without reading the request |

Callbacks and events (all in `app/api/auth/[...nextauth]/route.ts`):
- `signIn`: calls the API (`POST /internal/sign-in` or `/internal/step-up`, system token) with the email, the Google subject and `email_verified`. Returns `true` to accept. **Returns a path string to redirect instead of failing**: `/sign-in?reason=refused` for a refused sign-in, `/settings?stepup=failed` for a confirmation by a different account. The API's `sessionAt` and `stepUpAt` are put on the `user` object for the `jwt` callback.
- `jwt`: copies `sessionAt` and `stepUpAt` onto the token when an account is present (that is, at sign-in or confirmation).
- `session`: exposes them to `getServerSession`.
- `events.signOut`: calls `POST /internal/sign-out`, so the API ends the identity's sessions (section 3).

`session.strategy = "jwt"`, `maxAge` 8 h, `pages.signIn = pages.error = "/sign-in"`. An unexpected error page request (`?error=...`) is shown as the same refusal text.

**Known frictions (v1 met all three), and how they are handled**:
1. NextAuth v4's `maxAge` slides: the cookie is re-issued on every session read. The fixed 8 hours therefore comes from our own claim: `sessionAt`, checked by the web tier and again by the API (section 3). This is what v1's `authTime` did.
2. The cookie is an encrypted token in NextAuth's own format. The local-only script uses NextAuth's own `encode`, so it never hand-builds the format (section 7).
3. v4 is in maintenance (security fixes, no features). It declares Next 16 in its peer range and ran on Next 16.3 in v1. If it ever stops receiving fixes, replacing it touches only the web tier's sign-in files; the API and the log do not change.

**Interpretation to record**: a step-up confirmation is a fresh Google sign-in, so it starts a new 8 hours as well as a new
10-minute window. Ordinary activity never extends the session (FR-005); re-authenticating does. The spec says "a session ends 8
hours after sign-in"; a confirmation is a sign-in in that sense. If the owner wants the 8 hours kept from the first sign-in, the
`signIn` callback can carry the old `sessionAt` forward; not done, because it needs the old cookie in the callback and adds
glue for little.

**Alternatives weighed**: the same flow written directly with `jose` (the previous version of this plan; fewer moving parts
and a cleaner fixed session, but the owner preferred the library most people use and have reviewed); Auth.js v5 (still a
beta); a hosted identity service (a different decision, and the constitution keeps things self-hosted).

Google endpoints, state, PKCE, the code exchange and the ID token checks are NextAuth's (openid-client). The app adds the
`email_verified` check in the `signIn` callback, as v1 did. There is no setting that changes the provider (FR-020).

## 3. The session is a NextAuth cookie; the API holds the truth about whether it still counts

**Decision**:
- NextAuth's session cookie (`next-auth.session-token`, or `__Secure-next-auth.session-token` when `NEXTAUTH_URL` is https): an encrypted token with `email` (normalised), `sessionAt` and `stepUpAt` (unix milliseconds). `HttpOnly`, `SameSite=Lax`, `Secure` when the origin is https (NextAuth's defaults).
- `sessionAt` and `stepUpAt` are **given by the API** (its database clock) when it accepts a sign-in or a confirmation, so the web tier cannot invent a fresh confirmation and tests that pin the journal clock are not confused.
- The web tier treats a session older than 8 h from `sessionAt` as no session; the API checks the same, and also that the identity exists and is active (FR-006) and that `sessionAt >= identity.sessions_valid_after`.
- **Sign-out** (`events.signOut`) calls the API, which sets `identity.sessions_valid_after = now()`, so a copy of the cookie stops working at once, not only in the browser that signed out (FR-005). Because it is a column on the identity, signing out ends every session of that identity: with one owner that is the intent (the owner agreed 2026-10-10). Disabling an identity also ends its sessions at their next request.

**Why**: the web tier has no database, so revocation lives where the data is. A `session` table was weighed (one row per
sign-in) and rejected: it adds a table, a cleanup and a second thing the local-only script would have to write, for a single
owner who gains nothing from per-session revocation.

## 4. The API gate: a signed service token on every route, a database check behind it

**Decision**: every API route except `GET /health` goes through one Fiber middleware that:
1. reads `Authorization: Bearer <token>`; verifies HS256 with `SERVICE_TOKEN_SECRET`, `aud = tradecraft-api`, expiry, `iat` not in the future by more than 10 s, lifetime at most 120 s (the web tier signs 60 s), a `jti` not seen before (in-memory guard until expiry);
2. requires `role = owner` for ordinary routes, `role = system` for the `/internal/*` routes (called before a session exists, or by NextAuth's own callbacks);
3. for `owner` calls, loads the identity by email and applies the checks of section 3;
4. for routes that change identities, requires `step_up_at` within 10 minutes (`403 step_up_required`).

Every failure answers `401 {code: "unauthorized", message: "Not signed in."}` and logs the real reason server side
(no hint to the caller). A database failure is a 500, not a 401, so an outage is not mistaken for a refusal.

**Check for SC-001**: a Go test walks `app.GetRoutes()` and asserts that every route except `GET /health` answers 401 without a
token. A new route that forgets the gate fails that test.

**Alternatives**: a bare shared key (what the constitution forbids); a signed token that names no identity and trusts the cookie
(the API could not tell whose action to record).

## 5. What the browser can reach

**Decision**: the web tier's catch-all `/api/[...path]` forwards only an **allow-list of first path segments**
(`accounts`, `trades`, `reviews`, `weekly`, `focus`, `mistakes`, `settings`, `currencies`, `export`, `identities`, `audit`).
`/api/auth/*` is NextAuth's own route (a more specific route, never forwarded). `/internal/*` on the API (sign-in, sign-out,
step-up) is called only by web-tier server code, with values the web tier has itself checked (for example the Google subject
NextAuth received). A forwarded path is checked segment by segment (letters, digits, `-`, `_`), so a caller cannot reach
another route with `..` or an encoded slash.

**Why**: without the allow-list, a stolen cookie could call the API's step-up route through the pass-through with a guessed
provider subject and refresh the confirmation window without Google. (This is a hole v2's design would have had if v1's
pass-through approach had been copied as it was; it is not a bug that ran in v1.)

## 6. Step-up: the Google account chooser again, and it must be the same Google account

**Decision**: when `step_up_at` is older than 10 minutes, the Access card opens the "Confirm it's you" dialog (A3). Its
Continue calls `signIn("google-confirm", { callbackUrl: "/settings" })`. In the `signIn` callback, for that provider, the web
tier reads the current session (`getServerSession`) and asks the API (`POST /internal/step-up` with the session's email and
the Google subject) whether that subject is the one pinned to that identity. A different Google account redirects to
`/settings?stepup=failed` ("That account is not the one signed in. Nothing was changed."); the existing session is untouched
because no new token is made. On success NextAuth issues a new cookie with the new `sessionAt` and `stepUpAt`, and the owner
lands back on Settings where the action they were making finishes (the card keeps the pending action in `sessionStorage`
across the redirect and replays it once).

A confirmation records `step_up_confirmed`, not `sign_in`, and does not change the identity's last sign-in time.

**What it does and does not prove**: Google does not promise to ask for the password again. What the step proves is that a
person is at a browser that holds the owner's Google session right now. A thief with only the Tradecraft cookie cannot pass it.
That is the S-35 threat; it is what v1 relied on too.

**Both tiers enforce it**: the web tier answers `403 step_up_required` before forwarding; the API checks the claim again.

## 7. The local-only session

**Decision**:
- `DEV_SESSION_SECRET` is a **second** key. NextAuth is given a custom `jwt.decode` that tries `NEXTAUTH_SECRET`, and tries `DEV_SESSION_SECRET` **only when that variable is set**. The proxy and `lib/session.ts` use the same function.
- `TRADECRAFT_ENV` is `production` (the default when unset), `local` or `test`. If it is `production` and `DEV_SESSION_SECRET` is set, **both** the web tier (in `instrumentation.ts`) and the API (in `main`) exit with a plain message. The default being `production` means a mistake fails closed.
- `frontend/scripts/dev-mint-session.mjs <email>` prints a cookie made with NextAuth's own `encode` and `DEV_SESSION_SECRET` (`sessionAt` and `stepUpAt` are "now"). It needs the secret in the environment and nothing else; there is no route, flag or provider in the app that creates a session.
- The Playwright set-up and the API-direct test helper use the same minting module (the script also uses it).

**Why a second key**: with one key the secret "the script needs" would be the production key, and FR-020 / SC-008 ("refuse to
start when it is present") could not be true.

**Honest limit**: the code that accepts the development key exists in the production build and is switched off by the variable
being absent plus the start-up refusal. That is the trade FR-020 itself describes. The refusal is tested in both tiers
(`scripts/check-dev-secret-refused.sh`).

## 8. The audit log

**Decision**: one table `audit_entry` (data-model.md). Append-only is enforced by the database, not only by the absence of a
route: a trigger raises an error on `UPDATE`, `DELETE` and `TRUNCATE`. The identity foreign key is `ON DELETE RESTRICT` and
identities cannot be deleted either. `actor_kind` (`owner`, `agent`, `system`) answers FR-026: an agent later is an entry with
`actor_kind = 'agent'` and the identity it acts for; the table does not change shape.

**Test reset**: the Go tests' `reset` truncates the table inside a transaction with `SET LOCAL session_replication_role = replica`
(the test database user is the superuser of a throwaway server); the application's own path never does.

## 9. A change and its entry are one transaction

**Decision**: a small helper `s.inTx(ctx, func(q *store.Queries) error)` begins a transaction, runs the change and
`recordAudit` on the same `*Queries`, and commits; an error from either rolls both back and the owner gets the existing
"Something went wrong. Nothing was changed." (FR-016). The audited mutation handlers (`setDeleted`, `setArchived`,
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
1. `src/proxy.ts` (Next 16's replacement for middleware) redirects a page request without a readable, unexpired session cookie to `/sign-in?next=<path>` and answers `/api/*` (other than `/api/auth/*`) without one with `401`. It is a convenience and the cheap rejection; it is not the authority.
2. The root layout reads the session: with none it renders no sidebar (this is the sign-in screen, FR-022); with one it renders the sidebar with the identity and Sign out.
3. The data layer: `lib/api.ts` signs a service token from the session for every call and turns a `401` into `redirect("/sign-in?reason=ended")`; `lib/browserApi.ts` does the same with `location.assign`. Even if the proxy were bypassed, no page can read data without the API accepting the token.

## 13. Same origin and structured data (FR-007)

Every `/api/*` request that is not `GET` (other than NextAuth's own `/api/auth/*`, which has its CSRF token) must pass
`isSameOrigin` (v1's function) and, when it has a body, `content-type: application/json`; otherwise `403` (not same origin)
or `415` (not JSON). `GET /api/export` also passes `isSameOrigin`, because it now writes an audit entry and should not be
triggerable by another site's navigation.

## 14. Origin and cookies

`NEXTAUTH_URL` (for now `http://127.0.0.1:3100`, in the owner's setup `:3101`) is one required setting: NextAuth builds the Google
redirect addresses from it (`<origin>/api/auth/callback/google` and `/api/auth/callback/google-confirm`, which the owner registers
with Google), it decides `Secure`, and the same-origin fallback compares against its host. `next` (the page to return to) must
start with a single `/`; anything else becomes `/reviews`. Principle IV's exposure gate must re-check these settings (they are on
its checklist in `docs/security-review.md`).

## 15. The existing checks under the gate (SC-009)

- **Go tests**: `api.New(pool, now, secret)` takes the service secret. `main_test.go` creates one active identity, and the `do` helper signs a token for it with the real clock (token times are wall time; the journal's pinned `clock` is only for the "not in the future" trade rule). The existing assertions do not change.
- **Playwright**: `helpers.ts`' `api()` signs a service token (shared module, `SERVICE_TOKEN_SECRET` from the environment); a global set-up mints the cookie for the browser context (`storageState`). Specs that drive the browser do not change.
- **Scripts** that call the API directly (`seed-sample.sh`, `check-persistence.sh`) get a token from `scripts/service-token.mjs` (needs `SERVICE_TOKEN_SECRET`; local use only).
- `scripts/test.sh` generates fresh random secrets for each run and exports them; they are never written to a file.

## 16. Secrets

All new values live in the environment (`.env`, untracked): `NEXTAUTH_SECRET`, `SERVICE_TOKEN_SECRET` (each at least 32
bytes, `openssl rand -base64 48`; both tiers refuse a shorter one), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and for local
and test only `DEV_SESSION_SECRET`. `.env.example` lists the names with no values. `check-loopback.sh` already looks for the
database password in tracked files and container logs; it is extended to every one of these values (SC-007). Error messages
and logs name the reason ("token expired"), never a token or a secret; the Google `code`, ID token and cookies are not logged.

## 17. Outbound calls to a third party (constitution VII)

Three, all to Google, all part of sign-in (made by NextAuth): the browser is redirected to `accounts.google.com`; the web tier
posts the one-time code to `oauth2.googleapis.com/token`; and it fetches Google's public keys. What leaves: the client id, the
redirect address, the code and the PKCE verifier. No trade, review or account data. The disclosure at the point of use is the
sign-in screen's own line ("You will be asked to choose a Google account."), signed off in A1.

## 18. What is tested automatically, and what is not

| Part | How |
|---|---|
| Token verification (bad signature, expired, wrong audience, replayed, over-long lifetime, future `iat`) | Go unit tests |
| The gate on every route (SC-001), 401 body | Go test over `app.GetRoutes()` |
| Identity rules: add, duplicate, case and spaces, pin at first sign-in, different subject refused, disable, enable, last active (100 concurrent), bootstrap and recovery | Go tests against real Postgres |
| Sign-in decision (`/internal/sign-in`): active, disabled, unknown, unverified email, subject pinned then different, refused entry holds the attempted email | Go tests |
| Step-up decision (`/internal/step-up`): same subject accepted, different refused, entry kinds | Go tests |
| Audit: one entry per kind with the right identity and subject, none holds a figure, entry failure rolls the change back, the table refuses `UPDATE`, `DELETE`, `TRUNCATE`, filters and paging, 10,000-entry timing (SC-006) | Go tests (the entry failure by a temporary trigger on `audit_entry` that raises on insert, so the change's own transaction must roll back) |
| The redirect to Google carries the right parameters, and `google-confirm` adds `prompt=select_account` | Playwright: the navigation to `accounts.google.com` is intercepted and its address checked; nothing leaves the machine |
| Page and API gate, sign-out ends a copied cookie, expired session, disabled identity, Access list, step-up dialog, audit screen, sidebar | Playwright on the composed stack, signed in by the minted cookie |
| The session helper (absolute 8 h from `sessionAt`, development key accepted only when configured) | Unit-style Playwright specs that import `lib/session.ts` (no test runner is added) |
| Production refusal with the development key present (SC-008) | `scripts/check-dev-secret-refused.sh` starts each service with it and expects a non-zero exit |
| **The real round trip through Google with the owner's client** | **Not automated.** Needs the owner's Google client and a person. Done once by the owner from `quickstart.md` section 3 and recorded in `verification.md` as manual, with its date |

## 19. Accepted risks (with the reason and when they end)

| Risk | Why accepted | Ends |
|---|---|---|
| A refused sign-in writes a log row each time; someone who can reach the port could grow the log | Only this computer can reach it (principle IV) | Before any exposure: rate limit and collapse repeats (checklist item in `docs/security-review.md`) |
| The replay guard is in memory, one API instance | One instance runs; a restart forgets 60 s of ids and tokens are 60 s long | When a second API instance is run |
| A copied cookie works until sign-out, disable or 8 h | Same as any bearer session; sign-out and disable end it at the next request | Not planned to change |
| Development-session clock: a minted session uses the host clock for `sessionAt`; after a sign-out, a Docker clock behind the host's by more than the gap would look "older than the sign-out" | Only affects local and test sessions, and only just after a sign-out | Not planned to change |
| Google may not re-ask for a password at step-up | Section 6 | Not planned to change |
| NextAuth v4 is in maintenance | Security fixes continue; v1 ran it on this stack | If fixes stop: replace the web tier's sign-in files (section 2) |

## 20. Open items for the owner

1. **A Google client**: the owner creates an OAuth client (type "Web application"), adds **two** authorized redirect addresses, `<NEXTAUTH_URL>/api/auth/callback/google` and `<NEXTAUTH_URL>/api/auth/callback/google-confirm`, and puts the id and secret in `.env`. Steps are in `quickstart.md`. Until then only the minted session works and the Google button answers with the refusal screen (the reason is logged: "GOOGLE_CLIENT_ID is not set").
2. **Which address is the first identity** (`OWNER_BOOTSTRAP_EMAIL`): the owner's own Google email, set in `.env`.
3. Settled 2026-10-10 by the owner: NextAuth (section 2); sign-out ends every session of the identity (section 3); the log names a trade by its exit time (section 10).
