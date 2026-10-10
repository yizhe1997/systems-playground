# Security review: sign-in, the API gate and the audit log

**Feature**: `002-sign-in-and-audit-log` | **Started**: 2026-10-10 | **Constitution**: principle IV

The record the constitution asks for ("a security review record per gate"). It names what is protected, who and what is trusted,
each finding with its control and the test that proves it, and what must be re-checked before anything is exposed beyond this
computer. Written with the feature; updated by each local review pass and after any material change to the code it covers.

## What is protected

The owner's trading history (trades, reviews, focuses, mistakes), the list of who counts as the owner, and the audit log.

## Actors and trust boundaries

| Actor | Trusted for | Not trusted for |
|---|---|---|
| Browser | Showing the screens | Anything it sends: cookies, paths, bodies, `next`, headers |
| Web tier (Next.js) | Reading the session, signing the service token, asking the API to decide sign-ins | Being reachable by anyone but the owner's browser (loopback only) |
| API (Go) | The identity and session decision on every request, the audit write | Nothing it is told by a caller without a valid signed token |
| Postgres | Holding the data and refusing audit changes | |
| Google | Saying which Google account is at the browser | The email alone (the subject is pinned; `email_verified` is required) |

## Findings

Filled in as the work lands; closed by the two local review passes (tasks T060 and T061).

| ID | Threat | Control | Where | Proven by | Status |
|---|---|---|---|---|---|
| G-01 | Anyone who can complete Google sign-in gets in (case tricks, an unverified email, an email that changed hands) | Allow-list in `identity`, email normalised, `email_verified` required, provider subject pinned at first sign-in and compared afterwards, one generic refusal | `internal/api/session_routes.go`, `lib/authOptions.ts` | `tests/signin_test.go` | open |
| G-02 | A removed or signed-out owner keeps access through a copied cookie | The API re-checks the identity on every request; `sessions_valid_after`; 8 hours from `sessionAt` | `internal/auth/middleware.go` | `tests/signout_test.go`, `tests/gate_test.go` | open |
| G-03 | A dev-login path reaches production | No route, provider or flag creates a session without Google; the development key is accepted only when set; both tiers refuse to start in production with it | `lib/session.ts`, `cmd/api/main.go`, `instrumentation.ts` | `scripts/check-dev-secret-refused.sh`, `tests/no_session_route_test.go` | open |
| G-04 | A change made from another website | Same-origin check and JSON only on every change; NextAuth's own CSRF token on its routes | `lib/sameOrigin.ts`, `app/api/[...path]/route.ts` | `e2e/us1-sign-in.spec.ts` | open |
| G-05 | The API is called without proof of who is asking, or with a replayed or mis-aimed token | Signed 60 s service token, audience, `jti` used once, role separation, 401 for every cause | `internal/auth/*` | `internal/auth/servicetoken_test.go`, `tests/gate_test.go` | open |
| G-06 | A stolen cookie adds or disables identities | Step-up (a Google confirmation within 10 minutes, same account) on add, disable and enable; both tiers enforce it; the last active identity cannot be disabled | `internal/api/identities.go`, `lib/authOptions.ts` | `tests/identities_test.go`, `tests/stepup_test.go`, `e2e/us3-access.spec.ts` | open |
| G-07 | A stolen cookie reaches the private routes through the pass-through | Allow-list of first path segments; `/internal/*` and `/api/auth/*` never forwarded | `app/api/[...path]/route.ts` | `e2e/us4-minted-session.spec.ts` | open |
| G-08 | The log is rewritten or holds sensitive content | Trigger refuses `UPDATE`, `DELETE`, `TRUNCATE`; no route edits it; subjects and fields are chosen by code, never typed text, amounts or notes | `migrations/00013`, `internal/api/audit.go` | `tests/audit_integrity_test.go`, `tests/audit_test.go` | open |
| G-09 | A secret appears in the repository, a log or an error | Environment only; values never logged; checks extended to every new variable | `scripts/check-loopback.sh` | the secret checks of `scripts/test.sh` | open |
| G-10 | An open redirect through `next` or the callback address | `next` must start with a single `/`; NextAuth validates its callback URL | `app/sign-in/page.tsx`, `lib/authOptions.ts` | `e2e/us1-sign-in.spec.ts` | open |

## Outbound calls to a third party (constitution VII)

Three calls, all to Google and all part of sign-in, all made by NextAuth: the browser is redirected to `accounts.google.com`;
the web tier posts the one-time code to `oauth2.googleapis.com/token`; it fetches Google's public keys from `www.googleapis.com`.
What leaves: the client id, the redirect address, the code and the PKCE verifier. No trade, review or account data. Disclosure
at the point of use: the sign-in screen says "You will be asked to choose a Google account."

## Reachable without a session

Only the sign-in screen, NextAuth's own `/api/auth/*` routes (they have to be, and carry their own CSRF token), static assets and
icons, and `GET /health` on the API.

## Accepted risks

| Risk | Why accepted | Ends |
|---|---|---|
| A refused sign-in writes a log row each time | Only this computer can reach the port | Before any exposure: rate limit and collapse repeats |
| The replay guard is in memory, one API instance | One instance runs; tokens live 60 s | When a second API instance is run |
| A copied cookie works until sign-out, disable or 8 hours | Same as any bearer session | Not planned to change |
| A minted session uses the host clock for `sessionAt` | Local and test sessions only | Not planned to change |
| Google may not ask for a password again at step-up | What it proves is a browser holding the owner's Google session | Not planned to change |
| NextAuth v4 is in maintenance | Security fixes continue; v1 ran it on this stack | If fixes stop: replace the web tier's sign-in files |

## Before anything is exposed beyond loopback (principle IV exposure gate)

- [ ] `NEXTAUTH_URL` is the real https origin, so cookies are `Secure` and the Google redirect addresses match
- [ ] Refused sign-in attempts are rate limited and repeats collapsed
- [ ] The replay guard is shared if more than one API instance runs
- [ ] Security headers (CSP, `frame-ancestors 'none'`, `Referrer-Policy`) are set by the web tier
- [ ] CI has been shown to run on GitHub
- [ ] The two local review passes below have been repeated on the code as it then stands

## Review passes

| Pass | Date | Scope | Findings | Result |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
