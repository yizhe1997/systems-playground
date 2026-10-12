# Verification: Backtest Accounts and Agent Read Access

**Feature**: `003-backtest-accounts-and-agent-access` | **Run**: 2026-10-12 | **Stack**: the throwaway test stack of `scripts/test.sh` (Docker Compose project `tradecraft-v2-test`, test ports, `TRADECRAFT_ENV=test`)

What was run, what it showed, and what was not run. Nothing here is rounded in our favour.

## Automated, one full run of `scripts/test.sh`

| Check | Result |
|---|---|
| Go tests against a real PostgreSQL (every feature, 000 to 003) | **pass** |
| Playwright on the composed stack, the whole suite (including the accessibility pass B1 to B8 in light and night, and the keyboard-only checks) | **126 passed, 1 failed, 7 skipped** |
| Loopback only (every published port is `127.0.0.1`) | pass |
| No secret in a tracked file or a container log: the database password, `NEXTAUTH_SECRET`, `SERVICE_TOKEN_SECRET`, `DEV_SESSION_SECRET`, `GOOGLE_CLIENT_SECRET` | pass |
| The e2e agent token's value in no tracked file, no container log and no Playwright output (SC-004) | pass |
| Data survives a stop and start (122 accounts and 5,346 trades identical) | pass |

**The one failure** was `us1-sign-in.spec.ts` "signing out ends the session at once, also for a copy of the cookie" (a spec of
feature 002). It passed alone on a fresh stack and then failed in repeated runs on the same stack. Cause: the spec minted the
"copy" cookie stamped with this computer's clock, and a sign-out is stamped with the database's, and the Docker VM's clock was
about a second behind, so a copy made "now" outlived a sign-out "now". This is the accepted risk "a minted session uses the host
clock for `sessionAt`" of `docs/security-review.md`, not a defect of this feature. The spec now backdates its minted sessions by
30 seconds, and it passed 80 of 80 in a repeat of the whole file. **The whole suite was not run again after that one change.**

**The 7 skipped** are the capture specs of the visual review (`zz-screens*.spec.ts`), which run only with `CAPTURE_SCREENS`.

## Per requirement

| Requirement | Shown by |
|---|---|
| SC-001, SC-002 (backtest days never Missing; live figures unchanged by 500 backtest trades, compared byte for byte over eight reads) | `backend/tests/account_kind_test.go`, `e2e/us1-backtest-accounts.spec.ts` |
| SC-003 (a fresh token refused with access off, works with it on; 0 calls after revoke; 0 calls with any token after the switch is off; on again, unrevoked tokens work) | `backend/tests/agent_audit_test.go` (`TestRevokeAndTheSwitchStopEveryCall`, `TestRefusedRequests...`) |
| SC-004 (the value is in no later answer, audit entry, export, log or Playwright output) | `backend/tests/agent_tokens_test.go`, `scripts/check-loopback.sh` |
| SC-005 (one entry per read and per refusal, none with content; a read whose entry cannot be written returns nothing) | `backend/tests/agent_audit_test.go` |
| SC-006 (every tool equals the owner's route for the same scope) | `backend/tests/mcp_test.go` (`TestEachToolEqualsTheOwnersRoute`) |
| SC-007 (each read under 1 s with 5,000 trades) | `backend/tests/mcp_test.go` (`TestEachReadIsFastWithFiveThousandTrades`: each of five reads asserted under 1 s) |
| SC-008 (no tool reaches the audit log, identities, tokens, the switch or the export) | `backend/tests/mcp_test.go` (`TestToolsAreExactlyTheNineReads`), `TestTheTwoKindsOfTokenAreNotInterchangeable` |
| SC-009 (the existing checks still pass apart from the rewritten trading-day vectors) | the full run above; the vectors are in `backend/tests/trading_day_entry_test.go` |
| SC-010, SC-011 (the day from the entry; the recompute changes no price, time, cost or result) | `backend/tests/trading_day_entry_test.go`, including a migration test with data at version 14 |
| FR-023 (accessibility: keyboard, contrast, no meaning by colour alone, light and night) | `e2e/zz-a11y-agent.spec.ts` |

## Reviews

Two local review passes on the agent gate and everything around it (principle IV) are recorded in `docs/security-review.md`
(passes 3 and 4): three small findings, fixed; findings G-11 to G-15 closed.

## Not automated, and not yet done

- **A real agent connecting with a real token (Claude Code or Claude Desktop): the owner's manual check.** The tests use the
  SDK's own client against a listening server, which proves the protocol and the gate, not that a particular product
  connects. Steps are in `quickstart.md` section 4. **Result: not yet run.** The feature is not done until it is recorded here.
- **The visual review** (`/speckit-screens-review`): the built screens were captured in light mode and looked at in part (Settings
  with the Agent access card, the Trades list with Show backtests). Both modes, every frame, and the owner's approval of the
  look are still to do.
- Known to look at in the review: with long account names and a Backtest tag the Trades list is wider than a 1440 px window
  (its last columns scroll); real account names are shorter.
