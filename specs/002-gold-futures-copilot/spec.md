# Feature Specification: AI-Powered Gold Futures Trading Copilot and Signal Journal

**Feature Branch**: `002-gold-futures-copilot`  
**Created**: 2026-04-11  
**Status**: Draft  
**Input**: User description: "AI-Powered Trading Copilot and Signal Journal focused entirely on Gold Futures."

## Clarifications

### Session 2026-04-11

- Q: Which authentication model should v1 use for creator/admin and paid subscribers? → A: NextAuth for creator/admin + magic-link/email OTP for subscribers (passwordless paid access).
- Q: What paid subscription tiering should v1 use? → A: Single paid tier with all premium features included.
- Q: How should alert dispatch authority work in v1? → A: Semi-automatic mode with per-event policy (auto-send for selected events, confirm-before-send for others).
- Q: Should v1 include integrated payment processing? → A: No; use manual subscription management in v1 and defer payment gateway integration.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Creator Plans, Grades, and Publishes Setups (Priority: P1)

As the strategy creator, I can enter a Gold Futures trade plan, receive an AI grading decision using my rubric and deterministic risk metrics, revise if needed, and publish approved setups to my audience.

**Why this priority**: This is the core product loop; without this flow there is no signal content, no trust layer, and no monetizable output.

**Independent Test**: Can be fully tested by creating a plan with entry/SL/TP/scaling details, submitting it for grading, receiving approve/revise/reject output with score breakdown, and publishing an approved plan.

**Acceptance Scenarios**:

1. **Given** a creator has entered a valid pre-trade plan, **When** the creator requests grading, **Then** the system returns a structured decision (approve/revise/reject), weighted rubric scores, risk flags, and prioritized improvements.
2. **Given** a graded plan is approved, **When** the creator publishes it, **Then** the plan is visible in the appropriate public/paid channels according to monetization gating rules.
3. **Given** a graded plan is rejected or revise-required, **When** the creator updates plan details and re-submits, **Then** the system records a new evaluation while preserving prior evaluation history.

---

### User Story 2 - Anonymous Showroom Builds Trust (Priority: P2)

As an anonymous visitor, I can view historical performance, a high-level explanation of the methodology, and a limited setup preview so I can decide whether to subscribe.

**Why this priority**: Conversion depends on credibility. A strong showroom creates trust without exposing proprietary rules.

**Independent Test**: Can be tested by visiting the public showroom without authentication and confirming that only allowed public data is shown while premium details remain gated.

**Acceptance Scenarios**:

1. **Given** an anonymous visitor opens the showroom, **When** performance data exists, **Then** the visitor sees historical metrics and visual performance summaries.
2. **Given** an active setup exists, **When** an anonymous visitor views current signals, **Then** the visitor sees a masked setup preview (direction/status and non-actionable level summary) rather than full actionable levels.
3. **Given** no active setup exists, **When** an anonymous visitor views current signals, **Then** the visitor sees the most recent closed setup summary and outcome.

---

### User Story 3 - Paid Members Receive Timely Alert Updates (Priority: P3)

As a paid subscriber, I can receive setup and status alerts through Telegram, Discord, or webhook whenever the creator updates a setup state, so I can act quickly.

**Why this priority**: Paid alert delivery is the primary subscription value and recurring revenue driver.

**Independent Test**: Can be tested by activating a paid subscription with at least one alert channel and verifying that status updates trigger deliveries to configured destinations.

**Acceptance Scenarios**:

1. **Given** a paid subscriber has configured Telegram, Discord, or webhook, **When** the creator marks a setup update event, **Then** the system dispatches an alert payload to each enabled channel.
2. **Given** one delivery channel fails, **When** dispatch is attempted, **Then** failures are logged per channel without blocking delivery to other enabled channels.

---

### User Story 4 - Post-Trade Journal Improves Future Decisions (Priority: P4)

As the creator, I can record post-trade outcomes and receive AI retrospective feedback that references similar historical setups, so future plans improve over time.

**Why this priority**: This creates compounding strategy quality and differentiates the product from basic signal broadcasting.

**Independent Test**: Can be tested by submitting a closed trade outcome and confirming that the system updates deterministic performance metrics, stores a trade memory record, and returns a post-trade improvement summary.

**Acceptance Scenarios**:

1. **Given** a published setup has closed trade results, **When** the creator submits outcome details, **Then** deterministic metrics are recalculated and persisted in portfolio history.
2. **Given** historical setup data exists, **When** a post-trade evaluation runs, **Then** the response cites relevant prior patterns and concrete improvement suggestions.

---

### Edge Cases

- Creator submits a plan with missing or contradictory levels (for example, stop loss above long entry logic): grading request is rejected with actionable validation guidance.
- Creator attempts to publish a setup that has not passed approval threshold: publish is blocked and prior grading feedback is shown.
- No historical trades are available for retrieval: AI feedback proceeds using rubric + deterministic math only and explicitly notes low historical context.
- Alert channel credentials become invalid (revoked webhook/token): delivery failure is isolated to that channel and surfaced in delivery status.
- A setup is updated repeatedly in a short period: subscribers receive deduplicated or coalesced updates according to update type.
- No active setup on a given day: showroom presents the most recent closed setup summary without showing stale actionable details.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow the creator to create, edit, and version Gold Futures pre-trade plans with structured fields for entry, stop loss, take profit targets, scaling intentions, and invalidation notes.
- **FR-002**: System MUST evaluate each submitted plan against an active configurable grading rubric with weighted criteria and return a structured decision (approve, revise, reject).
- **FR-003**: System MUST compute and provide deterministic trade and portfolio metrics (including risk exposure, reward-to-risk, realized P&L, win rate, and drawdown) for all AI evaluations.
- **FR-004**: System MUST prevent publication of setups that do not meet the required approval threshold.
- **FR-005**: System MUST support creator workflow stages as separate states (draft, graded, published, closed, archived) and maintain full state transition history.
- **FR-006**: System MUST provide a public showroom view for anonymous visitors that includes historical performance summaries and methodology overview while withholding full actionable live setup details.
- **FR-007**: System MUST display a masked latest setup preview to anonymous visitors when an active setup exists.
- **FR-008**: System MUST display the most recent closed setup summary when no active setup exists.
- **FR-009**: System MUST support per-subscriber alert channel configuration for Telegram, Discord, and webhook endpoints, with access controlled by subscription entitlement.
- **FR-010**: System MUST dispatch alert events when creator-triggered setup status updates occur and track delivery outcomes per destination channel.
- **FR-011**: System MUST support post-trade journaling inputs for outcomes, including adverse/favorable excursion and narrative notes.
- **FR-012**: System MUST generate post-trade AI retrospectives using deterministic outcome metrics and relevant historical context retrieved from prior setups.
- **FR-013**: System MUST store historical setup and outcome memory in retrievable form and support similarity-based retrieval for future evaluations.
- **FR-014**: System MUST produce separate creator-facing and public-facing evaluation explanations so proprietary strategy details remain hidden from non-paying users.
- **FR-015**: System MUST preserve complete audit history of rubric versions, plan evaluations, publish actions, and alert dispatch events.
- **FR-016**: System MUST support future comparison of strategy tracks by tagging plans and outcomes with a strategy origin classification (human-authored or AI-authored).
- **FR-017**: System MUST allow operation without direct live market data feed by accepting manually entered plan and outcome inputs as the canonical source for v1.
- **FR-018**: System MUST authenticate creator/admin access through NextAuth-protected sessions and RBAC checks.
- **FR-019**: System MUST authenticate paid subscribers using passwordless magic-link or email OTP flow before granting premium signal and alert-management access.
- **FR-020**: System MUST provide exactly one paid subscription tier in v1 as the monetization package, unlocking all premium features (full signal details, premium history access, and real-time alert channel management).
- **FR-021**: System MUST support semi-automatic alert dispatch with per-event policy controls that allow each event type to be configured as auto-send or confirm-before-send.
- **FR-022**: System MUST maintain an audit trail for alert policy decisions and dispatch actions, including whether an alert was auto-sent or manually confirmed.
- **FR-023**: System MUST support manual subscription lifecycle administration in v1 (grant, revoke, and renew access) without requiring integrated payment provider workflows.
- **FR-024**: System MUST enforce entitlement checks based on internal subscription status records regardless of payment integration presence.

### Key Entities *(include if feature involves data)*

- **Trade Plan**: A creator-authored pre-trade setup for Gold Futures containing structured levels, risk intent, status, and publish metadata.
- **Rubric Version**: A versioned grading framework with weighted criteria and approval thresholds used for plan evaluation.
- **AI Evaluation**: A structured grading or retrospective result linked to a specific plan and evaluation type, containing score breakdowns, decision, flags, and recommendations.
- **Trade Outcome**: Post-trade execution summary for a plan, including realized result metrics and behavioral notes.
- **Portfolio Snapshot**: Time-based summary of account-level performance and risk statistics used for context and subscriber reporting.
- **Memory Record**: Searchable historical context unit derived from plans, outcomes, and lessons for similarity retrieval in future evaluations.
- **Subscription**: User entitlement record defining paid access state and active plan period.
- **Alert Channel**: Subscriber-specific delivery target configuration for Telegram, Discord, or webhook.
- **Alert Event**: A publishable setup update event with audience scope, payload, and per-channel delivery statuses.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The creator can complete the full plan lifecycle (draft → grade → publish) in under 5 minutes for at least 90% of submitted plans.
- **SC-002**: At least 95% of grading requests return a structured decision and recommendations in under 20 seconds.
- **SC-003**: At least 99% of creator-triggered alert events generate delivery attempts to all enabled paid channels within 60 seconds of the status update.
- **SC-004**: Anonymous showroom visitors can view historical performance summaries and the latest eligible setup preview with a successful page load completion rate of at least 99%.
- **SC-005**: At least 90% of closed trades have completed post-trade journal entries within 24 hours of closure.
- **SC-006**: Within the first 90 days after launch, at least 30% of active paid subscribers consume alerts through two or more configured channels.

## Assumptions

- The product is single-tenant in v1 with one creator account controlling all plan creation and publication.
- Gold Futures is the only instrument covered in v1.
- Real-time market feed automation is out of scope for v1; creator manual updates are the authoritative trigger source.
- Anonymous users see historical performance and masked setup previews, not full live actionable levels.
- A delayed closed-setup example may show more detail than active setups for trust-building while preserving live edge.
- Creator/admin authentication uses NextAuth sessions with role-based authorization.
- Paid subscribers authenticate through passwordless magic-link or email OTP before premium access is granted.
- V1 monetization uses one paid tier only; multi-tier packaging is deferred until post-launch validation.
- V1 alerting uses semi-automatic dispatch with event-level policy, balancing speed and creator control.
- Integrated payment processing (for example Stripe checkout and billing webhooks) is out of scope for v1 and deferred to a later release.
- The AI must not perform authoritative arithmetic; deterministic risk/performance values are provided by backend calculations.
- A formal latency SLA is not promised in v1 marketing, though internal operational targets are tracked.

## Constitution Constraints *(mandatory — do not remove)*

<!--
  List which constitution principles apply to this feature.
  This section is verified during the plan-template.md Constitution Check gate.
-->

- **Principle I (Separation of Concerns)**: Feature MUST stay within its layer(s):
  [ ] frontend-only  [ ] backend-only  [ ] infra-only  [x] full-stack (all three layers)
- **Principle II (Clean Architecture)**: If touching `/backend`:
  handlers → services → repositories; no business logic in `main.go`.
- **Principle III (Zero-Trust Security)**: Admin capabilities MUST use BFF proxy + NextAuth RBAC.
  Docker socket access MUST use `playground.widget=<name>` label filtering.
- **Principle IV (Scale-to-Zero)**: New demo containers MUST be labelled and managed by the
  Go control plane with an idle-shutdown timer. Document idle timeout here: Not applicable for this feature scope.
- **Principle V (Turbopack)**: No `webpack()` overrides; Tailwind v4; Server Components
  default; `"use client"` with justified comment.
- **Principle VI (IaC)**: New services declared in `docker-compose.yml`; secrets in `.env.example`;
  `docs/DEVELOPER_GUIDE.md` updated before merge.
