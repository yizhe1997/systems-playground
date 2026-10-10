# Quickstart: Sign-in and Audit Log

**Feature**: `002-sign-in-and-audit-log` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

How to set the feature up and prove it works. Commands assume the app folder (`self-host/apps/tradecraft`). Nothing here puts
the app on the network: every port stays on `127.0.0.1`.

## 1. Settings (`.env`, never committed)

Generate each secret once and put it in `.env`. Do not paste them into chat or a file that is tracked.

```bash
openssl rand -base64 48   # run twice: one for NEXTAUTH_SECRET, one for SERVICE_TOKEN_SECRET
```

| Variable | Used by | Value |
|---|---|---|
| `NEXTAUTH_URL` | web | the address you open the app at, for example `http://127.0.0.1:3100` (3101 in your setup; no trailing slash) |
| `NEXTAUTH_SECRET` | web | at least 32 bytes, as generated above |
| `SERVICE_TOKEN_SECRET` | web and API | at least 32 bytes, different from the one above |
| `OWNER_BOOTSTRAP_EMAIL` | API | your own Google email; becomes the first identity |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | web | from section 2; leave empty until you have them |
| `TRADECRAFT_ENV` | web and API | `production` (the default when unset), `local` or `test` |
| `DEV_SESSION_SECRET` | web (and the scripts) | only with `TRADECRAFT_ENV=local` or `test`; **the apps refuse to start if it is set while the environment is `production`** |

`.env.example` lists the names with no values.

## 2. Create the Google sign-in client (once, by the owner)

1. In the Google Cloud console, create or pick a project, and set up the OAuth consent screen (external, testing is fine for one user; add your own Google account as a test user).
2. Create credentials, **OAuth client ID**, type **Web application**.
3. Under **Authorized redirect URIs** add **both** of these, exactly (with your `NEXTAUTH_URL`): `<NEXTAUTH_URL>/api/auth/callback/google` (the sign-in) and `<NEXTAUTH_URL>/api/auth/callback/google-confirm` (the "Confirm it's you" step). Google accepts plain http for `localhost` and `127.0.0.1`.
4. Copy the client id and secret into `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
5. Restart the stack: `docker compose up -d --build`.

What is sent to Google: only the client id, the redirect address, the one-time code and the PKCE verifier. No trade data.

## 3. Prove the real sign-in (manual, once; not automated)

This is the one step the automated checks cannot do for you (research section 18). Record the date and the result in
`verification.md`.

1. Open `NEXTAUTH_URL`. You land on the sign-in screen with no sidebar.
2. Continue with Google and choose the account whose email is `OWNER_BOOTSTRAP_EMAIL`. You arrive on Reviews; the sidebar shows your email and Sign out.
3. Sign out. Open `/trades`: you are sent to the sign-in screen.
4. Continue with Google and choose **another** Google account: you see only "You can't sign in with that account." Open Audit log after signing in again: a "Sign-in refused" entry names that address.

## 4. Automated checks

```bash
POSTGRES_PASSWORD=<anything> ./scripts/test.sh
```

The script generates fresh random secrets for the run, starts the throwaway stack with `TRADECRAFT_ENV=test` and a development
key, runs the Go tests against a real Postgres, runs Playwright against the composed stack with a minted session, then the
secret and loopback checks, and tears everything down. It prints nothing secret.

For the production refusal (SC-008):

```bash
bash scripts/check-dev-secret-refused.sh
```

It starts the web tier and the API once each with `TRADECRAFT_ENV=production` and a development key and expects both to exit
non-zero with a plain message, then with the key absent and expects them to start.

## 5. Scenarios, mapped to the spec

| Story | Do | Expect |
|---|---|---|
| US1 | Open a page with no session; call an API address with no token | Pages go to the sign-in screen; the API answers 401 "Not signed in." (every route but `/health`, SC-001) |
| US1 | Minted session, open Reviews | Signed in; sidebar shows the identity and Sign out |
| US1 | Sign out, then reuse the old cookie | Refused at once; pages closed (FR-005) |
| US1 | Disable the identity from a second session | The first session's next request goes to "Your session ended. Sign in again." |
| US1 | A change request from another origin, or with a non-JSON body | 403 / 415, nothing changed |
| US2 | Delete a trade, restore it, archive and restore an account, change the time zone, retire and restore a mistake, download the export | One entry each, with your email, the kind in words, the subject, no money |
| US2 | Open Audit log, filter by what, who and period, page | Newest first, "Showing x to y of n", empty and no-match states |
| US2 | Try to change or delete an entry in SQL | The database refuses (trigger) |
| US2 | Break the entry write (the test adds a failing trigger) and delete a trade | The trade is still there; "Nothing was changed." |
| US3 | Settings, Access: add `name@example.com`; add it again in capitals with spaces | First is added (active, last sign-in "—"); second says it is already listed |
| US3 | Disable the only active address | "This is the last active address. Enable another one before disabling it." Nothing changes, also with 100 at once (SC-005) |
| US3 | Wait past 10 minutes (the test moves `step_up_at` back) and add an address | "Confirm it's you" first; after the Google step the add finishes. A different Google account: "That account is not the one signed in. Nothing was changed." |
| US4 | `TRADECRAFT_ENV=local DEV_SESSION_SECRET=<x> node frontend/scripts/dev-mint-session.mjs you@example.com` | Prints a cookie line; paste it in the browser's cookie store (or let Playwright do it) and you are signed in as that identity |
| US4 | Any request that tries to start a session without the Google step | Refused; there is no such route |

## 6. Doing local work with a minted session

```bash
# in .env: TRADECRAFT_ENV=local and DEV_SESSION_SECRET=<a long random value>, then restart the stack
DEV_SESSION_SECRET=... node frontend/scripts/dev-mint-session.mjs owner@example.com
```

The script prints a `Cookie:` line (a `next-auth.session-token` cookie). Set it for `NEXTAUTH_URL` in the browser. Remove
`DEV_SESSION_SECRET` (or set `TRADECRAFT_ENV=production`) when you are done; with it present the production start refuses.

To call the API directly from a script (`seed-sample.sh`, `check-persistence.sh`), they take a token from
`scripts/service-token.mjs`, which needs `SERVICE_TOKEN_SECRET` and the identity's email.

## 7. Recovery if you lose access

Set `OWNER_BOOTSTRAP_EMAIL` to the address you can sign in with and restart the API. If no identity is active it creates (or
enables) that one and records the enable in the log as a system action. If an identity is active, nothing happens.
