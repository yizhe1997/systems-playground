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
| G-01 | Anyone who can complete Google sign-in gets in (case tricks, an unverified email, an email that changed hands) | Allow-list in `identity`, email normalised, `email_verified` required, provider subject pinned at first sign-in and compared afterwards, one generic refusal | `internal/api/session_routes.go`, `lib/authOptions.ts` | `tests/signin_test.go`, `tests/identities_test.go` | closed (passes 1 and 2) |
| G-02 | A removed or signed-out owner keeps access through a copied cookie | The API re-checks the identity on every request; `sessions_valid_after`; 8 hours from `sessionAt` | `internal/auth/middleware.go` | `tests/signin_test.go` (sign-out), `tests/gate_test.go`, `e2e/us1-sign-in.spec.ts` | closed (passes 1 and 2) |
| G-03 | A dev-login path reaches production | No route, provider or flag creates a session without Google; the development key is accepted only when set; both tiers refuse to start in production with it | `lib/session.ts`, `cmd/api/main.go`, `instrumentation-node.ts` | `scripts/check-dev-secret-refused.sh`, `tests/gate_test.go`, `e2e/us4-minted-session.spec.ts`, `e2e/us1-google.spec.ts` | closed (passes 1 and 2) |
| G-04 | A change made from another website | Same-origin check and JSON only on every change; NextAuth's own CSRF token on its routes | `lib/sameOrigin.ts`, `app/api/[...path]/route.ts` | `e2e/us1-sign-in.spec.ts` | closed (passes 1 and 2) |
| G-05 | The API is called without proof of who is asking, or with a replayed or mis-aimed token | Signed 60 s service token, audience, `jti` used once, role separation, 401 for every cause | `internal/auth/*` | `internal/auth/servicetoken_test.go`, `tests/gate_test.go` | closed (passes 1 and 2) |
| G-06 | A stolen cookie adds or disables identities | Step-up (a Google confirmation within 10 minutes, same account) on add, disable and enable; both tiers enforce it; the last active identity cannot be disabled | `internal/api/identities.go`, `internal/api/session_routes.go`, `lib/authOptions.ts` | `tests/identities_test.go`, `e2e/us3-access.spec.ts` | closed (passes 1 and 2) |
| G-07 | A stolen cookie reaches the private routes through the pass-through | Allow-list of first path segments; `/internal/*` and `/api/auth/*` never forwarded | `app/api/[...path]/route.ts` | `e2e/us4-minted-session.spec.ts`, `e2e/us1-sign-in.spec.ts` | closed (passes 1 and 2) |
| G-08 | The log is rewritten or holds sensitive content | Trigger refuses `UPDATE`, `DELETE`, `TRUNCATE`; no route edits it; subjects and fields are chosen by code, never typed text, amounts or notes | `migrations/00013`, `internal/api/audit.go` | `tests/audit_integrity_test.go`, `tests/audit_test.go`, `e2e/us2-audit.spec.ts` | closed (passes 1 and 2) |
| G-09 | A secret appears in the repository, a log or an error | Environment only; values never logged; checks extended to every new variable | `scripts/check-loopback.sh` | the secret checks of `scripts/test.sh` | closed (passes 1 and 2) |
| G-10 | An open redirect through `next` or the callback address | `next` must start with a single `/`; NextAuth validates its callback URL | `lib/session.ts` (`safeNext`), `app/sign-in/page.tsx`, `lib/authOptions.ts` | `e2e/us1-google.spec.ts`, `e2e/us1-sign-in.spec.ts` | closed (passes 1 and 2) |
| G-11 | An agent token is guessed, or leaks from a log or a response | 32 random bytes (`tca_` + 43 characters), shown once with `Cache-Control: no-store`, stored only as a SHA-256 digest, found by digest, never logged; the secret check also looks for the e2e token in tracked files, container logs and the Playwright output | `internal/api/agent.go`, `internal/api/agent_gate.go`, `scripts/check-loopback.sh` | `tests/agent_tokens_test.go`, `e2e/us2-agent-tokens.spec.ts`, the secret checks of `scripts/test.sh` | closed (passes 1 and 2) |
| G-12 | A web page the owner visits reaches the agent door | A request carrying an `Origin` header is refused first (`403`) and recorded as `Browser request`; the token is the second layer; no `/mcp` route in the web tier's allow-list; loopback only | `internal/api/agent_gate.go`, `app/api/[...path]/route.ts` | `tests/mcp_test.go` (`TestAWebPageIsRefusedWhateverItHolds`), `tests/agent_audit_test.go` | closed (passes 1 and 2) |
| G-13 | A revoked token, a disabled creator or a switched-off journal still reads | Checked on every request in order: switch, token known, not revoked, creator active; one generic `401`; revoke is final (trigger), the switch refuses all without revoking | `internal/api/agent_gate.go`, `migrations/00016` | `tests/agent_audit_test.go`, `tests/agent_tokens_test.go` | closed (passes 1 and 2) |
| G-14 | An agent reads what it must not, or writes | Nine tools, each over a GET handler; no tool for the audit log, identities, tokens, the switch or the export; an agent token is refused on every owner route and a service token at `/mcp`; the token id reaches a tool only through a header the gate overwrites | `internal/api/mcp.go`, `internal/api/agent_gate.go` | `tests/mcp_test.go`, `tests/agent_audit_test.go` (`TestTheTwoKindsOfTokenAreNotInterchangeable`) | closed (passes 1 and 2) |
| G-15 | A read leaves no trace, or the trace holds the content | One `agent_read` entry written before the answer is returned (the read is refused if it cannot be written); subject is the tool and the account's name, never a figure, note or argument value | `internal/api/mcp.go`, `internal/api/audit.go` | `tests/agent_audit_test.go` | closed (passes 1 and 2) |

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
| No rate limit on `/mcp`; a refused call is one audit row each (so any local process can add rows) | Loopback only, a valid token is needed for any work, rows hold no content | Before any exposure: rate limit and collapse repeats |
| An agent token is a long-lived bearer secret kept in the agent's own configuration file | Read-only scope, the switch, revoke, loopback only, and every read is in the Audit log | If expiry is added |
| An agent can read a trade's own free text (its thesis) and the review texts | It is the owner's journal and the agent is the owner's chosen reader; the Audit log shows that it read | Not planned to change |
| A browser-based MCP client (it sends an `Origin` header) cannot connect | The `Origin` check is what keeps a web page out; clients that run as programs are unaffected | Not planned to change |

## Before anything is exposed beyond loopback (principle IV exposure gate)

- [ ] `NEXTAUTH_URL` is the real https origin, so cookies are `Secure` and the Google redirect addresses match
- [ ] Refused sign-in attempts are rate limited and repeats collapsed
- [ ] The replay guard is shared if more than one API instance runs
- [ ] `/mcp` is rate limited and repeated refusals are collapsed (feature 003)
- [ ] Security headers (CSP, `frame-ancestors 'none'`, `Referrer-Policy`) are set by the web tier
- [ ] CI has been shown to run on GitHub
- [ ] The two local review passes below have been repeated on the code as it then stands

## Review passes

Two passes by the author on the code as it stood at the dates below (principle IV: reviewed again after any material
change to this code). The owner has chosen to rely on these passes rather than read the code personally.

| Pass | Date | Scope | Findings | Result |
|---|---|---|---|---|
| 1 | 2026-10-10 | `backend/internal/auth/*`, `backend/internal/api/{session_routes,identities,audit}.go`, `frontend/src/lib/{authOptions,session,serviceToken,sameOrigin,api}.ts`, `src/proxy.ts`, `src/instrumentation*.ts`, the `/api` pass-through, migration `00013` | (1) **The production refusal did not stop the web tier**: Next.js logged the error from the instrumentation hook and kept the process running, found by `scripts/check-dev-secret-refused.sh`; the check now logs and calls `process.exit(1)` from a Node-only file. (2) **A redirect loop** between `/sign-in` and a page when the API refused a cookie that still looked valid locally (disabled identity, signed out elsewhere); the sign-in screen no longer bounces after `reason=ended` or `reason=refused`. (3) **`safeNext` could be bypassed with a tab or line break** (`/<tab>/evil.example` is `//evil.example` to a browser); control characters and backslashes are now refused anywhere in the address, with a test. (4) Noted, not a defect: a copied cookie passes the web tier's local check until the API refuses it, which is the design (the API is the authority). | Fixed (1) to (3), each with a test or a check |
| 2 | 2026-10-10 | the same, as fixed, plus the identity routes' transactions and the audit list's filters | No new findings. Checked: the generic refusal body is identical for every cause; tokens, codes and cookies are not logged; the `/internal` routes accept only the system role and the owner routes only the owner role; the pass-through's allow-list and segment pattern leave no way to reach `internal` or `auth`; the audit list's filters are typed and parameterised; a disabled identity cannot be confirmed; the last active identity is protected inside the same transaction as its count | Closed |
| 3 | 2026-10-12 | feature 003: `backend/internal/api/{agent,agent_gate,mcp}.go`, the changed `audit.go`, `migrations/00014` to `00016`, the pass-through's `agent` handling and step-up pre-check, `AgentAccessCard` and `NewTokenDialog` | (1) `Authorization: bearer` in lower case was refused although the scheme name is case-insensitive: matched with `EqualFold`. (2) A panic inside a tool's handler could have taken the API down: `runRead` recovers and answers a plain failure. (3) The answer that carries a token's value had no cache header: `Cache-Control: no-store`. Checked and found sound: the token is hashed before any use and never logged (the refusal logs only the reason); every refusal is the same `401` body, only the audit subject differs; `Origin` is checked before the token is looked at; the gate deletes a caller's own copy of the token-id header before it sets its own; an agent token is refused by every owner route and a service token by `/mcp` (tested over a list of routes); a read is refused when its entry cannot be written (tested with a trigger); the revoke trigger refuses clearing, deleting and truncating; a name or a value never reaches the Audit log's subject beyond the token's name; the value lives only in the dialog's state and the e2e specs keep it out of trace, screenshot and video | Fixed (1 to 3) |
| 4 | 2026-10-12 | the same, as fixed | No new findings. The three fixes were re-read; the migrations' `Down` steps; the audit registry (a kind the code does not know cannot be written); the web tier's allow-list (no `mcp`) | Closed |
