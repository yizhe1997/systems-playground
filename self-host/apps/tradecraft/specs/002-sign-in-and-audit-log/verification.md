# Verification: Sign-in and Audit Log

Results of running the quickstart and the automated checks, stated plainly, including what failed and what was not
exercised. Last run: 2026-10-10 on the composed stack (`./scripts/test.sh`, fresh random secrets, `TRADECRAFT_ENV=test`).

## Summary

| Check | Result |
|---|---|
| Go tests against real Postgres (all of features 000 and 001 with a token, plus gate, token, sign-in, sign-out, step-up, identities, concurrency, audit, integrity, filters and timing) | **Pass** |
| Playwright on the composed stack (existing specs of 000 and 001, and the new specs of this feature) | **109 passed, 1 failed, 5 skipped** (see below) |
| Loopback only; no secret of feature 002 (and not the database password) in a tracked file or a container log | **Pass** |
| Data identical after a stop and start (SC-010 of 000) | **Pass** (92 accounts, 5,324 trades) |
| `scripts/check-dev-secret-refused.sh` (SC-008): both services refuse in production with the development secret, and start without it | **Pass** (after a defect it found, see "Found while verifying") |
| Accessibility (axe, WCAG 2 A and AA, contrast 4.5:1) on A1 to A5 in light and night | **Pass** |
| The real Google round trip with the owner's client | **Not exercised.** Manual, by the owner (task T062). Until it is recorded here the feature is not done |

## The one failure, and what is known about it

`e2e/zz-a11y-reviews.spec.ts` "keyboard only: stars, the drawer, dialogs, the collapsible weeks and the pickers" failed once in a
full run: after opening the judge drawer, 12 presses of Tab left focus outside the dialog. It passed in the full run before it
(T021), in the full run after the first fix, and 6 of 6 times when run alone against the same build. It is the one spec that
counts Tab presses inside a drawer whose content arrives asynchronously, so a slow moment can change the count; nothing in
this feature changes the drawer. Not fixed here; if it recurs, make the spec wait for the drawer's content before tabbing.

The 5 skipped are the screen-capture specs, which only run with `CAPTURE_SCREENS` set.

## Quickstart section 5, mapped

| Story | Scenario | Evidence |
|---|---|---|
| US1 | A page and an API address with no session | `us1-sign-in` (every page found in `src/app`, `/api/*` 401), `gate_test` (every API route but `/health` is 401, SC-001) |
| US1 | Minted session reaches Reviews; sidebar shows the identity and Sign out | `us1-sign-in`, `zz-a11y-auth` |
| US1 | Sign out ends a copy of the cookie | `us1-sign-in`, `signin_test` (sign-out) |
| US1 | Disabled identity loses its next request | `us1-sign-in`, `gate_test`, `identities_test` |
| US1 | Change from another origin (403), not structured data (415), export from another site (403) | `us1-sign-in` |
| US1 | A session that ends while a form holds text: the text and the leave prompt stay | `us1-sign-in` |
| US1 | The way to Google carries state, a PKCE challenge, the redirect address; a forged callback is the refusal | `us1-google` (intercepted; nothing leaves the machine) |
| US2 | One entry per recorded action, no figure in it, a repeat records nothing | `audit_test`, `us2-audit` |
| US2 | Filters, paging, 10,000 entries under 1 s (SC-006) | `audit_test` (`TestAuditListFiltersPagesAndTimes`), `us2-audit` |
| US2 | The database refuses to change or remove an entry; an entry that cannot be written means the change is not made | `audit_integrity_test` |
| US3 | Add (case and spaces), duplicate, invalid, disable, enable | `identities_test`, `us3-access` |
| US3 | Last active identity refused, also with 100 concurrent attempts (SC-005) | `identities_test` |
| US3 | A stale confirmation shows "Confirm it's you" first and changes nothing; Google's account chooser is asked for; the failed state | `us3-access`, `TestStepUpConfirmation` in `identities_test` |
| US3 | First identity from `OWNER_BOOTSTRAP_EMAIL` and the recovery | `identities_test` (`TestBootstrap`) |
| US4 | The minted session acts as the chosen identity and is recorded under it | `us4-minted-session` |
| US4 | No route creates a session without Google; the private routes are not reachable from the browser | `gate_test`, `us4-minted-session` |
| US4 | Production refuses to start with the development secret | `check-dev-secret-refused.sh`, `auth` unit tests |

## Found while verifying (all fixed, each with a test or a check)

1. The web tier "refused" a production start with the development secret but kept running: Next.js only logs an error thrown
   from the instrumentation hook. Now the check ends with `process.exit(1)` from a Node-only file.
2. A redirect loop between a page and `/sign-in` when the API refused a cookie that still looked valid to the web tier.
3. `safeNext` accepted `/<tab>/evil.example`, which a browser reads as `//evil.example`.
4. An existing spec's non-exact "Save" button name matched an Access row button ("Enable unsaved-..."); the new spec's test
   address no longer contains "save".
5. Visual review: dates in the Access and Audit tables were misaligned (a grid class meant for a two-part value was put on
   table cells), the "Add email" label wrapped to two lines, and the filter chips looked like plain links.

## Not done, and why

- **Rate limiting of refused sign-ins**: out of scope until the app is exposed (docs/security-review.md, accepted risks).
- **The A4 "Nothing recorded yet" state is checked only on a fresh journal** (the accessibility spec and the capture spec
  both do it when the log is empty); no spec forces an empty log in the middle of a run.
