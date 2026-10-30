# Specification Quality Checklist: Home and Analytics

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) (FR-017 names "a read route of the API" because quoting figures from one place is itself the requirement; no framework, library or schema is named)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain (three points have written defaults and are listed under "Open points for the clarify step")
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined (worked examples checked by hand: profit factor 350 / 290 = 1.21, average win 116.67, average loss 41.43, payoff 2.82, expectancy 6.00; sample day replay 45.00, 175.00, leak -130.00)
- [x] Edge cases are identified
- [x] Scope is clearly bounded (read-only, no stored data; score, setup analytics, drawdown percentage, MAE and MFE excluded and named)
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Constitution checks: I (plan figure beside every money figure: FR-003, SC-003), III (dashes, definitions, sample sizes, no invented capital basis: FR-013, FR-014, SC-004), VI (independent value and exclusions stated), VII (read-only, nothing new to export: FR-018), VIII (domain rules and decisions logged: FR-019).
- Every new rule is flagged unconfirmed until the owner confirms it (FR-019, SC-009).
- The `.specify` git-branch rule in the constitution ("single branch tradecraft_v2") is out of date: work has been on short branches and pull requests since feature 003; a patch amendment is due and is not part of this feature.
