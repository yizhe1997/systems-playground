# Verification: Sign-in and Audit Log

Results of running the quickstart and the automated checks, with failures stated plainly. Written during the build.

## T021: the existing suite behind the gate (2026-10-10)

`./scripts/test.sh` on the composed stack with `TRADECRAFT_ENV=test`, a minted session for the owner identity, and fresh
random secrets:

- Go tests against real Postgres: **pass** (existing tests of features 000 and 001 unchanged apart from carrying a token;
  new gate, token, sign-in, sign-out, step-up, identity, audit and integrity tests).
- Playwright (features 000 and 001, accessibility, console, process-beside-money, scale): **all 74 pass**, including
  SC-008 of 000 and 001 (5,000 trades: open a month 320 ms, change a filter 102 ms, save a trade 293 ms).
- Loopback only, no secret of feature 002 in a tracked file or a container log, data identical after a stop and start:
  **pass**.
