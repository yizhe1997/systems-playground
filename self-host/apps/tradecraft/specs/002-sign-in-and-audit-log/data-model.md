# Data Model: Sign-in and Audit Log

**Feature**: `002-sign-in-and-audit-log` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Two tables in one migration (`backend/migrations/00013_identity_and_audit.sql`). Nothing existing changes: no table gets an
owner column (the app has one owner; FR-025), existing data is kept.

## Identity

One email address that counts as the owner. Never deleted.

| Column | Type | Rules |
|---|---|---|
| `id` | `uuid` | primary key, `gen_random_uuid()` |
| `email` | `text` | not null, **unique**; `CHECK (email = lower(btrim(email)))`, `CHECK (char_length(email) <= 254)` and a simple address shape check (`^[^@\s]+@[^@\s]+\.[^@\s]+$`). The application normalises (trim, lower case) before every compare and insert, so "Owner@Example.com " and "owner@example.com" are one address (FR-003, FR-010) |
| `provider` | `text` | not null, default `'google'`; names the provider so another could be added later |
| `provider_sub` | `text` | null until the first sign-in; then the provider's stable account identifier. Set once by `UPDATE ... WHERE provider_sub IS NULL`; never changed afterwards (FR-004). Never exported, never shown |
| `added_at` | `timestamptz` | not null, default `now()` |
| `last_sign_in_at` | `timestamptz` | null until the first sign-in; set on every accepted sign-in (not by a step-up) |
| `disabled_at` | `timestamptz` | null while active; set by disable, cleared by enable |
| `sessions_valid_after` | `timestamptz` | not null, default `to_timestamp(0)`; set to `now()` by sign-out. A session whose `session_at` is earlier does not count (research 3) |

A trigger refuses `DELETE` on this table ("identities are never deleted"). The count of active identities (those with
`disabled_at IS NULL`) is never zero after the first start: every change that could lower it takes
`pg_advisory_xact_lock(7302)` first and re-counts inside the same transaction (FR-011, SC-005).

### States of an identity

```
 (added) --first sign-in--> pinned (provider_sub set, still active)
 active  --disable (needs another active one)--> disabled
 disabled --enable--> active          (same row, same history; adding the same address again finds this row and says so)
```

## Audit entry

One appended record of one sensitive action. Never edited, never deleted.

| Column | Type | Rules |
|---|---|---|
| `id` | `uuid` | primary key, `gen_random_uuid()` |
| `at` | `timestamptz` | not null, default `clock_timestamp()` (the moment of the action, not the start of the transaction); displayed in the journal time zone |
| `actor_kind` | `text` | not null, `CHECK (actor_kind IN ('owner','agent','system'))`. `owner`: a signed-in person. `agent`: reserved for the agent features (FR-026); an agent acts for an identity and is recorded with it. `system`: no signed-in identity (a refused sign-in, the start-up recovery) |
| `identity_id` | `uuid` | null for `system` entries; otherwise a foreign key to `identity(id)` `ON DELETE RESTRICT` |
| `kind` | `text` | not null, `CHECK (kind ~ '^[a-z][a-z_]*$')`. The kinds in use are the list below; Go code holds the list (a constant and the words shown on screen), so a later feature adds one without a migration |
| `subject` | `text` | not null default `''`, `CHECK (char_length(subject) <= 254)`. What it was about, as text (so it still reads right after the thing is deleted) |
| `changed_fields` | `text[]` | not null default `'{}'`. Names of the fields that changed, never their values |

Indexes for the screen's filters (SC-006): `(at DESC, id DESC)`, `(identity_id, at DESC)`, `(kind, at DESC)`.

**Append-only**: a `BEFORE UPDATE OR DELETE` row trigger and a `BEFORE TRUNCATE` statement trigger raise
"audit entries cannot be changed or removed". There is no API route that edits or deletes either (FR-017).

**Never holds**: money, prices, sizes, notes, review text, an IP address or browser details, a token or a secret.

### Kinds, what they say, and what they list as changed

Written in the same transaction as the change unless marked *best effort* (FR-015, FR-016). Column "Words" is what the Audit log shows.

| `kind` | Words | Written by | `subject` | `changed_fields` |
|---|---|---|---|---|
| `sign_in` | Sign-in | `POST /internal/sign-in` (*best effort*) | the identity's email | none |
| `sign_out` | Sign-out | `POST /internal/sign-out` (*best effort*) | the identity's email | none |
| `sign_in_refused` | Sign-in refused | `POST /internal/sign-in` (*best effort*) | the **attempted** email, trimmed, lower-cased, control characters removed, at most 254 | none. `actor_kind = system`, no identity |
| `step_up_confirmed` | Step-up confirmed | `POST /internal/step-up` (*best effort*) | the identity's email | none |
| `identity_added` | Identity added | `POST /identities` | the new email | `email` |
| `identity_disabled` | Identity disabled | `POST /identities/:id/disable` | that identity's email | `status` |
| `identity_enabled` | Identity enabled | `POST /identities/:id/enable`, and the start-up recovery (`system`) | that identity's email | `status` |
| `export_downloaded` | Export downloaded | `GET /export`, written **before** the body is produced; if it cannot be written the export is refused | `Full export` | none |
| `trade_deleted` | Trade deleted | `DELETE /trades/:id` | `NQ long trade of Wed 1 Oct 09:58` (instrument, direction, **exit** time in the journal zone) | `status` |
| `trade_restored` | Trade restored | `POST /trades/:id/restore` | same form | `status` |
| `account_archived` | Account archived | `POST /accounts/:id/archive` | the account name | `status` |
| `account_restored` | Account restored | `POST /accounts/:id/restore` | the account name | `status` |
| `settings_changed` | Settings changed | `PUT /settings` | `Journal settings` | `time zone` |
| `mistake_retired` | Mistake retired | `POST /mistakes/:id/retire` | the mistake name | `status` |
| `mistake_restored` | Mistake restored | `POST /mistakes/:id/restore` | the mistake name | `status` |

Not audited (spec, confirmed 2026-10-10): creating or editing a trade, review, focus, mistake or account; judging; the day
mistakes; the weekly mark. Saving the settings with the same time zone it already has writes no entry (nothing changed).

A sign-in that happens through a minted (development) session does not exist as a sign-in: no `sign_in` entry is written,
and the actions made with it are recorded under the identity it names (US4 scenario 1).

## Session (not stored)

An eight-hour proof. It lives in NextAuth's encrypted session cookie, and its validity is decided on each request by the API
from the identity row. NextAuth's own cookie expiry slides, so the fixed limit is the `sessionAt` claim, not the cookie.

| Claim | Meaning |
|---|---|
| `email` | the identity's email (normalised) |
| `sessionAt` | unix milliseconds of the sign-in or confirmation, **given by the API** |
| `stepUpAt` | unix milliseconds of the last Google confirmation, given by the API; equals `sessionAt` (a confirmation is a fresh sign-in, research 2) |

Valid when: decrypts with `NEXTAUTH_SECRET` (or `DEV_SESSION_SECRET` when configured), now minus `sessionAt` is under 8 h,
the identity is active, and `sessionAt >= identity.sessions_valid_after`.

## Service token (not stored)

Signed by the web tier for one request; HS256, `SERVICE_TOKEN_SECRET`.

| Claim | Meaning |
|---|---|
| `aud` | `tradecraft-api` |
| `role` | `owner` (every ordinary request) or `system` (only `POST /internal/sign-in`, before a session exists) |
| `sub` | the identity's email; `system` for the `system` role |
| `jti` | random, used once |
| `iat`, `exp` | now and now + 60 s (the API accepts at most 120 s and 10 s of skew) |
| `session_at`, `step_up_at` | copied from the session's `sessionAt` and `stepUpAt`; the API re-checks them against the database |

## Where each new thing is shown

| Data | Screen |
|---|---|
| Identity list | Settings, **Access** card (A2), with the filter All / Active / Disabled |
| Audit entries | **Audit log** (A4) |
| Signed-in email | sidebar block (A5) |
| Identities and audit entries | the existing export, as `identities` (id, email, provider, addedAt, lastSignInAt, disabledAt) and `auditEntries` (all columns, identity as email); never the provider subject (FR-019) |
