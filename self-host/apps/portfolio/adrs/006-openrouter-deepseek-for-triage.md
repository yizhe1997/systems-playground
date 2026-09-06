# ADR 006: OpenRouter + DeepSeek V4 Flash for resume-request triage

**Date:** 2026-09-06
**Status:** Accepted
**Supersedes:** the triage-model portion of ADR 003 (secure resume storage) — that ADR covers the resume file itself, not the triage call

## Context

Triage (`backend/triage.go`) called Claude Haiku 4.5 directly against `api.anthropic.com`. The operator wanted a cheaper model and asked for an explicit feasibility/PII investigation before switching — this triage call sends real requester PII (name, email, company, reason, and optional hiring agency/work type/industry/salary/job posting URL) to whichever model handles it, so the swap wasn't just a model-string change.

The investigation's findings:

- **Claude Haiku 4.5 (previous default)**: called directly with a plain API key, no Zero Data Retention arrangement. Under Anthropic's default commercial API policy, conversation content is not retained by default for non-"Covered Models" (Haiku 4.5 isn't one), and retained data is never used for training without express permission. Already reasonably safe with no extra configuration.
- **`deepseek/deepseek-v4-flash-0731`**: genuinely cheap ($0.045/M input, $0.09/M output vs. Haiku's pricing) and available via OpenRouter. But it's served by ~28 different providers on OpenRouter, including DeepSeek's own endpoint — which per DeepSeek's own privacy policy stores data on servers in China and may use it for training unless opted out (and that opt-out language is written for their own direct customers, not clearly for traffic routed through a third party). Of those 28 providers, OpenRouter's own Zero-Data-Retention registry confirmed exactly one ("Makora") for this specific model at the time of writing. **Default OpenRouter routing could silently land PII on DeepSeek's own China-hosted endpoint or any other unconfirmed provider** — this was the real risk, not the model itself.

## Decision

Use `deepseek/deepseek-v4-flash-0731` via OpenRouter (not DeepSeek's API directly — OpenRouter is the layer that can enforce routing constraints), with the request's `provider` field set explicitly:

```json
{ "provider": { "zdr": true, "ignore": ["deepseek"] } }
```

- `zdr: true` restricts routing to OpenRouter-confirmed zero-data-retention endpoints only.
- `ignore: ["deepseek"]` excludes DeepSeek's own endpoint explicitly, regardless of its ZDR status at request time — that status is OpenRouter's own tracking, not a first-party guarantee from DeepSeek.

Implemented as a hand-rolled HTTP call against OpenRouter's OpenAI-compatible `/chat/completions` endpoint (`backend/triage.go`) rather than pulling in an SDK for one call site — same reasoning as the rest of this backend's raw-HTTP integrations (Filebrowser, SMTP).

## Consequences

- `ANTHROPIC_API_KEY` is no longer read anywhere in the backend; replaced by `OPENROUTER_API_KEY` (`docker-compose.yml`, `.env.example`). `github.com/anthropics/anthropic-sdk-go` is no longer imported (was only ever used in `triage.go`) — left in `go.mod`/`go.sum` as unused cruft rather than hand-edited, since there's no local Go toolchain to run `go mod tidy` against in this environment.
- **Real availability risk accepted knowingly**: with `zdr: true` currently pinning this model to a single confirmed provider (Makora), that provider going down or dropping ZDR status means triage calls fail — which is not silent data loss, since a failed triage call still routes the request to manual review (`markTriageFailed`, unchanged), just with a slower/all-manual path until it recovers.
- If OpenRouter's confirmed-ZDR provider set for this model changes (more providers get confirmed, or Makora stops being one), no code change is needed — the `zdr: true` constraint re-evaluates against OpenRouter's current registry on every request.
- `req.AIModel` now stores the OpenRouter model slug (`deepseek/deepseek-v4-flash-0731`) instead of an Anthropic model constant string. The public status page's FAQ copy was generalized from naming "Claude Haiku 4.5" to "a model" so it doesn't need editing on a future model swap.
