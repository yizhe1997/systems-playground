# Implementation Plan: Sign-in and Audit Log

**Feature**: `002-sign-in-and-audit-log` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-sign-in-and-audit-log/spec.md` (screens signed off 2026-10-10; spec hash `d805ef6f…c66a`)

## Summary

Make Tradecraft a signed-in app for its one owner and record who did what. The web tier signs the owner in with Google
(authorization code with PKCE, written for this app with `jose`), keeps an eight-hour signed cookie, and signs a 60-second service
token for every call to the API. The API refuses every route but `/health` without that token, re-checks on each request that the
identity is active and the session still counts, and keeps the identity list (Access, with step-up for changes and a rule that the
last active identity can never be disabled) and one append-only audit log that is written in the same transaction as the change it
records. The owner reads the log in a new Audit log screen and manages identities in Settings. A local-only script mints a
session for tests and for working on screens; the app refuses to start in production when its key is present.

Tradecraft v1's decisions (ADR 002, security review) and its identity and audit queries are the reference the owner allowed.
**What is reused and why is in [research.md](research.md) section 1.** One deliberate difference: v1 used NextAuth; this plan
writes the Google flow directly (research section 2), which is the first item for the owner at this gate.

This feature changes no trading rule, figure, review or existing screen apart from the sidebar's signed-in block and Audit log
item and the Access card in Settings (FR-025). It does not expose the app beyond this computer (principle IV).

## Technical Context

**Language/Version**: Go 1.26 and TypeScript (Next.js 16.3, React 19), as pinned in `000`

**Primary Dependencies**: Go: unchanged (Fiber, pgx, sqlc, goose, shopspring/decimal); the service token is verified with the standard library (`crypto/hmac`), as v1 did. Web: **`jose` 6.x added** (signing and verifying the session cookie and the service token, and checking Google's ID token); no other change. No NextAuth, no password library.

**Storage**: PostgreSQL 18, the same database; one migration (`00013_identity_and_audit.sql`): `identity`, `audit_entry`, their triggers and indexes ([data-model.md](data-model.md))

**Testing**: Go tests against real Postgres (gate, identities, audit, concurrency, immutability, timing); Playwright on the composed stack with a minted session for the flows in [quickstart.md](quickstart.md) and for every existing spec (SC-009); unit-style Playwright specs for the Google checks; shell checks for the production refusal and for secrets. The real Google round trip is manual (research 18) and said so.

**Target Platform**: Linux containers under Docker Compose on the owner's computer; desktop browser; loopback only

**Project Type**: web application (Go API plus Next.js web tier), the same two services

**Performance Goals**: the Audit log's first page and each filter answer in under 1 s with 10,000 entries (SC-006); the per-request identity check is one indexed read and adds no visible delay to existing screens (their timings in `000` SC-008 and `001` SC-008 must still pass, SC-009)

**Constraints**: loopback only until CI is proven on GitHub; no secret in the repository, a log or a screenshot; one owner, Google only; sessions fixed at 8 h, step-up window 10 min; a change and its entry succeed or fail together

**Scale/Scope**: 1 owner, a few identities, a log that grows by a handful of entries a day (10,000 entries is the test size, not the expectation); 3 new screens or cards (sign-in, Access with its step-up dialog, Audit log) plus the sidebar block

## Constitution Check

*Gate: passed before research; re-checked after design (below).*

| Principle | Status | How the plan meets it |
|---|---|---|
| I Process over outcome | Met (not applicable) | No screen of this feature shows a money figure (screens.md constitution check). The audit "About" names a trade by instrument, direction and time only, never amounts |
| II Owner in charge, agents draft | Met, and prepares for it | Every write is the owner's action through the one API. The audit entry carries `actor_kind` and an identity, so a scoped agent token later is recorded in the same table without changing its shape (FR-026). No agent access is built here |
| III Honest numbers | Met | No figure. A "Last sign-in" that has not happened and a log entry with no field change show a dash |
| IV Security gates | **Met, and ends `000`'s written exception** | This feature *is* the gates: single owner, email allow-list, service token between web tier and API, audit log, step-up for identity changes, same-origin on changes. Auth code gets local review passes after implementation and again after any material change (tasks), recorded in `docs/security-review.md`. Secrets only in the environment. **Nothing is exposed beyond loopback**; the exposure gate (CI proven on GitHub) is untouched and `docs/security-review.md` lists what to re-check before it (cookie `Secure`, `PUBLIC_ORIGIN`, rate limiting of refusals) |
| V Design before code | Met | Screens signed off 2026-10-10; visual direction approved for the project 2026-10-04; new components use the existing tokens and parts; visual review after implementation. US4 has no screen by design. Existing frames S and L gain the sidebar block and Audit log item in Penpot in the same change |
| VI One small slice | Met | Only the gate, the identities and the log. Out: other roles, passwords, sharing, rate limiting, agents themselves, any exposure (spec) |
| VII Own your data | Met | The export gains identities and audit entries (never the provider subject, FR-019). Google is the one third party; its three calls and the disclosure are listed (research 17) |
| VIII Decisions logged, domain sourced | Met in the plan, finished at implement | Decisions are in `research.md`; they go to `docs/decisions.md` and the gate record to `docs/security-review.md` in the same change as the behaviour. No trading rule is touched, so `docs/domain.md` is unchanged |

**Reuse (constitution, Technology and Domain Constraints)**: the owner asked for v1 to be looked at for this feature; the ledger
is research section 1. Nothing from v1 is carried by default; every item is either taken as an idea or rewritten to v2's code.

**Re-check after design**: no new violations. Two points of judgement are written down rather than hidden: the development key's
verification code exists in the production build and is switched off by absence and a start-up refusal (research 7), and Google
may not ask for a password again at step-up (research 6).

## Project Structure

### Documentation (this feature)

```text
specs/002-sign-in-and-audit-log/
├── spec.md
├── screens.md           # signed off 2026-10-10
├── plan.md              # this file
├── research.md          # decisions, v1 reuse ledger, accepted risks, items for the owner
├── data-model.md        # identity, audit entry, session and token claims, kinds
├── quickstart.md        # settings, Google client, how to prove it
├── contracts/
│   ├── openapi.yaml     # the API additions and the gate
│   └── web-routes.md    # pages, /auth routes, the /api pass-through, cookies, start-up refusals
├── checklists/requirements.md
└── tasks.md             # next step (/speckit-tasks)
```

### Source Code

```text
backend/
├── cmd/api/main.go                      # reads SERVICE_TOKEN_SECRET, OWNER_BOOTSTRAP_EMAIL, TRADECRAFT_ENV; start-up refusals; bootstrap
├── migrations/00013_identity_and_audit.sql
├── queries/
│   ├── identity.sql                     # new: get by email / id, list, create, pin, touch, lock, disable, enable, counts, sign-out
│   └── audit.sql                        # new: insert, list with filters and count, kinds, export
├── internal/
│   ├── auth/                            # new package
│   │   ├── servicetoken.go              # HS256 verify, bounds, audience (stdlib)
│   │   ├── replay.go                    # first-use guard on jti
│   │   ├── middleware.go                # RequireSystem, RequireOwner (session checks), RequireStepUp
│   │   ├── bootstrap.go                 # first identity and recovery
│   │   └── env.go                       # TRADECRAFT_ENV, secret length, development-key refusal (shared by main and tests)
│   ├── api/
│   │   ├── server.go                    # New(pool, now, secret): gate every route but /health; inTx helper
│   │   ├── session_routes.go            # /internal/sign-in, /internal/sign-out, /internal/step-up
│   │   ├── identities.go                # list, add, disable, enable (advisory lock, step-up)
│   │   ├── audit.go                     # recordAudit (in the transaction), writeAudit (best effort), list, kinds, kind registry
│   │   ├── trades.go                    # setDeleted: transaction and entry
│   │   ├── accounts.go                  # setArchived: transaction and entry
│   │   ├── settings.go                  # updateSettings: transaction and entry (only when the zone changes)
│   │   ├── mistakes.go                  # setRetired: transaction and entry
│   │   └── export.go                    # entry first; identities and auditEntries added
│   └── store/                           # sqlc output regenerated
└── tests/
    ├── main_test.go                     # secret, test identity, token helper; reset truncates audit under replica role
    ├── gate_test.go                     # every route but /health is 401; token rules; replay
    ├── identities_test.go               # add, normalise, pin, disable, enable, last active (100 concurrent), bootstrap, recovery
    ├── audit_test.go                    # one entry per kind, no figures, rollback, immutability, filters, paging, 10,000-entry timing
    └── (existing tests: unchanged assertions, requests now carry a token)

frontend/
├── package.json                         # + jose
├── scripts/
│   └── dev-mint-session.mjs             # local-only cookie, signed with DEV_SESSION_SECRET
├── src/
│   ├── instrumentation.ts               # start-up refusals
│   ├── proxy.ts                         # page redirect and /api 401 when there is no session
│   ├── lib/
│   │   ├── authConfig.ts                # environment, key set (production key; development key only when configured)
│   │   ├── session.ts                   # sign, verify, read from cookies, step-up re-issue
│   │   ├── serviceToken.ts              # signs the 60 s token from the session
│   │   ├── google.ts                    # authorize URL, code exchange, ID token checks (key set injectable)
│   │   ├── sameOrigin.ts                # isSameOrigin (v1's logic)
│   │   ├── api.ts                       # signs a token per call; 401 becomes redirect to /sign-in?reason=ended
│   │   ├── browserApi.ts                # 401 becomes a move to /sign-in?reason=ended; step_up_required surfaced
│   │   └── data.ts                      # + identities, audit, kinds
│   ├── app/
│   │   ├── layout.tsx                   # sidebar only with a session; signed-in block
│   │   ├── sign-in/page.tsx             # A1
│   │   ├── audit/page.tsx               # A4
│   │   ├── settings/page.tsx            # + Access card (A2)
│   │   ├── auth/google/route.ts         # start
│   │   ├── auth/google/callback/route.ts# finish (sign-in and step-up)
│   │   ├── auth/sign-out/route.ts
│   │   └── api/[...path]/route.ts       # allow-list, same origin, JSON only, step-up check, signed token
│   └── components/
│       ├── Nav.tsx                      # + Audit log item
│       ├── SignedInBlock.tsx            # email and Sign out form (A5)
│       ├── AccessCard.tsx               # A2 (list, filter, add, disable, enable, pending action across the redirect)
│       ├── ConfirmItsYouDialog.tsx      # A3
│       └── AuditFilters.tsx, AuditTable.tsx   # A4 (reuses Pager and DateRangeFilter)
├── e2e/
│   ├── global-setup.ts                  # mints the cookie once, storageState for the context
│   ├── helpers.ts                       # api() signs a service token; owner email constant
│   ├── us1-sign-in.spec.ts              # gate, redirect, refused, ended, sign-out, disabled
│   ├── us1-google.spec.ts               # unit-style checks of lib/google.ts and the redirect to Google
│   ├── us2-audit.spec.ts                # one entry per kind, log screen, filters
│   ├── us3-access.spec.ts               # add, duplicate, last active, step-up dialog
│   ├── zz-a11y-auth.spec.ts             # axe on A1 to A5, both modes
│   └── (existing specs: unchanged)
scripts/
├── test.sh                              # generates secrets per run; passes them to compose and Playwright
├── check-loopback.sh                    # + the new secret values searched in tracked files and logs
├── check-dev-secret-refused.sh          # new (SC-008)
└── service-token.mjs                    # new: a token for seed-sample.sh and check-persistence.sh
docker-compose.yml                       # new variables; header comment updated (the exception ends)
.env.example                             # new names, no values
docs/
├── decisions.md                         # decisions of research.md, dated
├── security-review.md                   # new: the gate record for sign-in, audit and step-up
└── build-process.md                     # unchanged unless the flow changes
```

**Structure Decision**: the two existing services stay as they are. The gate lives in one new Go package (`auth`) and one
middleware; the web tier gains `lib/session.ts`, `lib/google.ts` and three route handlers. No new service, no session table, no
new container.

## Build order

The order keeps the app working and its whole check suite green at each step, because the gate changes every request.

1. **Foundation (US1 and US4 groundwork)**: migration; `auth` package; `New(pool, now, secret)` with the gate; `inTx` and `recordAudit`; test harness (token helper, identity in `TestMain`, audit reset); the minting module and `dev-mint-session.mjs`; `global-setup.ts` and `helpers.ts`; `scripts/test.sh` secrets. At the end of this step every existing Go and Playwright test passes with the gate on (SC-009). US4 is P3 but its script is needed here, because every browser test needs it.
2. **US1**: `lib/session.ts`, `lib/serviceToken.ts`, `proxy.ts`, `api.ts`, the `/api` pass-through, `google.ts` and the two `/auth/google` routes, sign-out, `/sign-in`, layout and the signed-in block, start-up refusals, bootstrap.
3. **US2**: entries in the seven change handlers and the export; `/audit` and `/audit/kinds`; the Audit log screen.
4. **US3**: identity routes and rules; the Access card and the step-up dialog.
5. **Close**: a11y spec for A1 to A5; secret and refusal checks; `docs/security-review.md` and `docs/decisions.md`; Penpot S and L frames updated with the sidebar block and Audit log item; the two local review passes on the auth code (principle IV) with findings fixed or recorded; the owner's manual Google check (quickstart 3); visual review.

## Complexity Tracking

No constitution violation to justify. Three things that are more than the minimum, each with its reason:

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| `jose` added for a hand-written flow | One library for every signed value; the flow is shorter than NextAuth's configuration plus its work-arounds | The standard library can sign HS256 but verifying Google's RS256 keys by hand is the kind of code review would rather not carry |
| Two cookie keys (production and development) | Makes "refuse to start when the development secret is present" true (FR-020, SC-008) | One key would make the script's secret the production secret |
| Database trigger for append-only, besides having no route | The log is the evidence; a bug in a future handler must not be able to rewrite it | "No route edits it" alone is a promise about code, not a property of the data |

## Items for the owner at this gate

1. **NextAuth or the hand-written flow** (research 2). I recommend the hand-written one for the reasons there; switching later costs only the web tier's sign-in files.
2. **Sign-out ends every session of that identity**, not only the browser's (research 3). With one owner this is the safer reading of "ends the session immediately".
3. **`TRADECRAFT_ENV` defaults to `production`** (research 7), so the apps fail closed; local work and tests set it explicitly.
4. **A trade is named by its exit time** in the log (research 10).
5. **The real Google round trip is manual** and needs your OAuth client (quickstart 2 and 3); everything else is automated.
6. **Nothing in the app gets exposed by this feature.** Refused-sign-in rate limiting waits for the exposure gate (research 19).
