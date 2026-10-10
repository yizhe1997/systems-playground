# Web tier routes, feature 002

The web tier (Next.js) is the only thing the browser talks to. This lists what is new or changed. The API it forwards to is in
[openapi.yaml](openapi.yaml). Sign-in is NextAuth v4 (research section 2).

## Pages

| Path | Needs a session | What |
|---|---|---|
| `/sign-in` | no | Screen A1. Query `reason=refused` (or NextAuth's own `error=...`) shows "You can't sign in with that account."; `reason=ended` shows "Your session ended. Sign in again."; `next` is where to go after signing in (a single-slash path, else `/reviews`). No sidebar. A request that already has a good session is sent to `next` |
| `/audit` | yes | Screen A4. Query `identity`, `kind`, `from`, `to`, `offset` (same paging as `/trades`) |
| `/settings` | yes | Gains the Access card (A2). Query `stepup=failed` opens the dialog's failed state (A3) |
| every other existing page | yes | Unchanged, plus the sidebar's Audit log item and signed-in block (A5) |

## Sign-in routes (NextAuth, `src/app/api/auth/[...nextauth]/route.ts`)

NextAuth serves `/api/auth/*`. It is a more specific route than the pass-through below, so it is never forwarded to the API.

| Path | What |
|---|---|
| `/api/auth/signin/google`, `/api/auth/callback/google` | The sign-in. The button on A1 calls `signIn("google", { callbackUrl: next })`. The `signIn` callback asks the API (`POST /internal/sign-in`, system token). Accepted: NextAuth sets the session cookie and goes to `next`. Anything else (a failed check, a refusal, an unreachable API, Google not configured): redirect to `/sign-in?reason=refused`, the same for every cause, and the reason is logged |
| `/api/auth/signin/google-confirm`, `/api/auth/callback/google-confirm` | The step-up confirmation (A3), same Google client, `prompt=select_account`. The `signIn` callback reads the current session and asks the API (`POST /internal/step-up`). Accepted: a new cookie with new `sessionAt` and `stepUpAt`, back to Settings. A different Google account: redirect to `/settings?stepup=failed`, old session untouched |
| `/api/auth/signout` | The Sign out button calls `signOut({ callbackUrl: "/sign-in" })`. `events.signOut` calls `POST /internal/sign-out`; the cookie is cleared |
| `/api/auth/session`, `/api/auth/csrf`, `/api/auth/providers` | NextAuth's own; the POSTs of NextAuth carry its CSRF token |

## The `/api/*` pass-through (changed)

`/api/[...path]` forwards to the API with a freshly signed service token built from the session cookie.

| Rule | Detail |
|---|---|
| No valid session cookie | `401 {code: "unauthorized", message: "Not signed in."}`, nothing forwarded |
| Allow-list | Only first segments `accounts`, `trades`, `reviews`, `weekly`, `focus`, `mistakes`, `settings`, `currencies`, `export`, `identities`, `audit`. Anything else is `404`, including `internal` and `auth` |
| Path shape | Each segment is letters, digits, `-`, `_` or a UUID; anything else is `404` |
| Same origin | Every method except `GET`, and `GET /api/export`, must pass the same-origin check (`Sec-Fetch-Site`, else `Origin` against the host), else `403` |
| Structured data | A request with a body must be `application/json`, else `415` |
| Identity changes | `POST /api/identities` and `.../disable`, `.../enable`: if the session's `stepUpAt` is older than 10 minutes the web tier answers `403 {code: "step_up_required"}` itself, without forwarding |
| An API `401` | passed through; the browser helper turns it into a move to `/sign-in?reason=ended` |

## Cookies

| Name | Holds | Flags |
|---|---|---|
| `next-auth.session-token` (`__Secure-` prefix when `NEXTAUTH_URL` is https) | NextAuth's encrypted session: `email`, `sessionAt`, `stepUpAt` (data-model.md "Session") | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` when https, 8 h |
| `next-auth.csrf-token`, `next-auth.callback-url`, `next-auth.state`, `next-auth.pkce.code_verifier` | NextAuth's own short-lived sign-in state | its defaults; cleared at the callback |

## Start-up refusals

| Tier | Refuses to start when |
|---|---|
| Web (`instrumentation.ts`) | `NEXTAUTH_SECRET` or `SERVICE_TOKEN_SECRET` is missing or under 32 bytes; `NEXTAUTH_URL` is missing or not an `http(s)` origin; `TRADECRAFT_ENV` is `production` (or unset) and `DEV_SESSION_SECRET` is set |
| API (`main`) | `SERVICE_TOKEN_SECRET` is missing or under 32 bytes; `DEV_SESSION_SECRET` is set while `TRADECRAFT_ENV` is `production` (or unset); no identity can be made active (research 11) |

Missing `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` does **not** stop the app; sign-in then refuses and logs why, and the minted
session still works.
