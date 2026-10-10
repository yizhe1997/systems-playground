# Web tier routes, feature 002

The web tier (Next.js) is the only thing the browser talks to. This lists what is new or changed. The API it forwards to is in
[openapi.yaml](openapi.yaml).

## Pages

| Path | Needs a session | What |
|---|---|---|
| `/sign-in` | no | Screen A1. Query `reason=refused` shows "You can't sign in with that account."; `reason=ended` shows "Your session ended. Sign in again."; `next` is where to go after signing in (a single-slash path, else `/reviews`). No sidebar. A request that already has a good session is sent to `next` |
| `/audit` | yes | Screen A4. Query `identity`, `kind`, `from`, `to`, `offset` (same paging as `/trades`) |
| `/settings` | yes | Gains the Access card (A2). Query `stepup=failed` opens the dialog's failed state (A3) |
| every other existing page | yes | Unchanged, plus the sidebar's Audit log item and signed-in block (A5) |

## Auth routes (not under `/api`, never forwarded to the API)

| Method and path | Needs a session | What |
|---|---|---|
| `GET /auth/google` | no (step-up: yes) | Starts the Google flow. Query `next`, and `mode=step-up` for a confirmation. Sets a short-lived (10 minutes) signed `tradecraft_oauth` cookie holding `state`, `nonce`, the PKCE verifier, `mode` and `next`, then redirects (302) to Google with `scope=openid email`, `response_type=code`, `code_challenge_method=S256` and, for step-up, `prompt=select_account` |
| `GET /auth/google/callback` | no | Checks `state` against the cookie, exchanges the code (server to server), verifies the ID token (signature, issuer, audience, expiry, nonce, `email_verified`). **Sign-in**: calls `POST /internal/sign-in` (system token); accepted: sets the `tradecraft_session` cookie, clears the `tradecraft_oauth` cookie and redirects to `next`; anything else (any check, any refusal, an unreachable API, Google not configured): redirects to `/sign-in?reason=refused`, the same for every cause, and logs the reason. **Step-up**: calls `POST /internal/step-up`; accepted: re-issues the session cookie with the new `step_up_at` and redirects to `next`; refused: redirects to `/settings?stepup=failed` |
| `POST /auth/sign-out` | yes | Same-origin only. Calls `POST /internal/sign-out`, clears the session cookie, answers 303 to `/sign-in`. Used by a plain form in the sidebar, so it works without scripts. With no session it just redirects |

## The `/api/*` pass-through (changed)

`/api/[...path]` forwards to the API with a freshly signed service token built from the session cookie.

| Rule | Detail |
|---|---|
| No valid session cookie | `401 {code: "unauthorized", message: "Not signed in."}`, nothing forwarded |
| Allow-list | Only first segments `accounts`, `trades`, `reviews`, `weekly`, `focus`, `mistakes`, `settings`, `currencies`, `export`, `identities`, `audit`. Anything else is `404`, including `internal` |
| Path shape | Each segment is letters, digits, `-`, `_` or a UUID; anything else is `404` |
| Same origin | Every method except `GET`, and `GET /api/export`, must pass the same-origin check (`Sec-Fetch-Site`, else `Origin` against the host), else `403` |
| Structured data | A request with a body must be `application/json`, else `415` |
| Identity changes | `POST /api/identities` and `.../disable`, `.../enable`: if the session's `step_up_at` is older than 10 minutes the web tier answers `403 {code: "step_up_required"}` itself, without forwarding |
| An API `401` | passed through; the browser helper turns it into a move to `/sign-in?reason=ended` |

## Cookies

| Name | Holds | Flags |
|---|---|---|
| `tradecraft_session` | the signed session (data-model.md "Session") | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` 8 h, `Secure` when `PUBLIC_ORIGIN` is https |
| `tradecraft_oauth` | the signed one-use sign-in state (10 minutes) | `HttpOnly`, `SameSite=Lax`, `Path=/auth`, `Secure` as above; cleared at the callback |

## Start-up refusals

| Tier | Refuses to start when |
|---|---|
| Web (`instrumentation.ts`) | `SESSION_SECRET` or `SERVICE_TOKEN_SECRET` is missing or under 32 bytes; `PUBLIC_ORIGIN` is missing or not an `http(s)` origin; `TRADECRAFT_ENV` is `production` (or unset) and `DEV_SESSION_SECRET` is set |
| API (`main`) | `SERVICE_TOKEN_SECRET` is missing or under 32 bytes; `DEV_SESSION_SECRET` is set while `TRADECRAFT_ENV` is `production` (or unset); no identity can be made active (research 11) |

Missing `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` does **not** stop the app; sign-in then refuses and logs why, and the minted
session still works.
