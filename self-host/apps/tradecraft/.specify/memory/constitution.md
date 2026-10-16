# Tradecraft v2 Constitution

Tradecraft v2 is a self-hosted trading journal for a single owner. It is built on the Tradecraft v1
stack and is designed to be read and drafted into by agents, with the owner always in control.

## Core Principles

### I. Process Over Outcome

The product judges decisions, not results. A review surface MUST NOT show profit and loss alone:
every figure MUST appear next to process information (plan-adherence grade, tagged mistakes) for
the same period or trade.

Rationale: a journal that only reports results teaches the owner to repeat lucky mistakes.
Check: every review, summary and analytics screen is reviewed for a process figure beside each
money figure.

### II. Owner in Charge, Agents Read and Draft

Agents MAY read the owner's data and MAY write drafts. Anything that becomes a real record (a
trade, a review, a rule) MUST be approved by the owner. Agent access MUST use scoped, revocable
tokens, and every agent action MUST be written to the audit log. Features that cost model tokens
(for example an agent-run pre-trade gate) MUST run only on request and MUST NOT be always on.

Rationale: the owner's journal is their own record and their own accountability.
Check: no write path accepts an agent token without an approval step; each agent call appears in
the audit log; no feature starts model calls without a user action.

### III. Honest Numbers

Money MUST be exact decimals and MUST NOT be floating point. A figure that cannot be computed MUST
show a dash and state why. The product MUST NOT invent a capital basis. Every statistic MUST state
its definition and its sample size.

Rationale: invented or silently rounded numbers make a journal worse than none.
Check: calculation tests cover the dash cases; every statistic has a stated definition in the
domain document.

### IV. Security Gates and No Secrets

The Tradecraft v1 gates remain in force: a single owner, an email allow-list, a service token
between the web tier and the API, an audit log, step-up confirmation for identity changes, and
same-origin checks on changes. Code for authentication, import or upload MUST pass local review
passes before it merges, and MUST be reviewed again after any material change. The owner has chosen
to rely on those reviews rather than reading such code personally. Secrets MUST NOT appear in logs,
the repository or chat. Nothing MAY be exposed beyond localhost until continuous integration has
been proven to run on GitHub.

Rationale: the journal holds trading history that is worth protecting.
Check: a security review record per gate, and a passing CI run before any exposure.

### V. Design Before Code

No feature code MAY be written until the feature's wireframes and wording are signed off. Wireframes
are greyscale and carry structure, content, states and behaviour; they MUST NOT assume a visual
identity. The visual direction (palette, type, density and component feel, recorded in `DESIGN.md`
and `PRODUCT.md`) is decided once per project by the owner, and MUST be approved before the first
implementation starts; it is never assumed from an earlier project. After implementation, the built
screens MUST pass a visual review in a real browser against the wireframes, with the owner's approval
of the look. Any change to an interface MUST update its wireframe in the same change. The flow
includes wireframes after specify (before clarify), a sign-off gate before plan, a visual-direction
check before implement, and a visual review after implement.

Rationale: the owner only knows what they want once they have seen it, and structure and look are
different decisions: structure is expensive to change after code exists, look is cheap.
Check: a plan cannot start without a recorded wireframe sign-off; implementation cannot start
without an approved visual direction; a feature is not done without a recorded visual review.

### VI. One Small Slice at a Time

Each feature MUST be usable on its own. The first version is deliberately small: logging trades,
a daily review with yesterday's focus, plan-down focus fields, process grades, and mistake tags
with a counter and an optional stop line. A slice MUST contain only what that slice needs.

Rationale: a small usable slice gives real feedback before more is built on top of it.
Check: each specification states its independent value and lists what it excludes.

### VII. Own Your Data

The system runs self-hosted in containers. All data MUST be exportable. Trade data MUST NOT go to
a third party without a clear disclosure at the point of use. AI features MUST be opt-in and MUST
have a working kill switch.

Rationale: the owner keeps control of their records and of who sees them.
Check: an export exists for every stored kind of data; every outbound call to a third party is
listed in the security review with its disclosure text.

### VIII. Decisions Logged, Domain Sourced

Every decision MUST be recorded with its date and reason and MUST NOT be reopened without new
information. Trading rules (the trading day, R-multiple, drawdown and similar) MUST live in a
domain document with sources, and any interpretation the owner has not confirmed MUST be flagged
there as unconfirmed.

Rationale: domain knowledge is the weakest part of the project; writing down what is known, and
what is guessed, stops guesses hardening into facts.
Check: the domain document and the decision log are updated in the same change as the behaviour.

## Technology and Domain Constraints

- **Stack**: Go with Fiber and Postgres for the API, Next.js for the web tier, a design tool with an MCP or API for design (Penpot today),
  Docker Compose for running everything. Changing the stack needs a recorded decision.
- **Testing**: domain logic and APIs MUST be tested against a real Postgres. The interface MUST be
  verified in a real browser on the composed stack. Tests are added together with the feature;
  test-first is not required.
- **Domain**: the trading day, R-multiple, drawdown, break-even and similar rules are defined in
  the domain document and nowhere else.
- **Reuse**: Tradecraft v2 starts clean. Code, database schema, screens and design assets from
  Tradecraft v1 are NOT carried over by default, and a plan MUST NOT assume them. When the owner asks
  for a specific feature to look at v1 (for example sign-in or the audit log), that feature's plan
  records what was reused and why. Reuse still passes through the specification flow.

## Workflow and Quality Gates

- **Flow**: constitution (once), specify, wireframes, clarify, wireframe sign-off, plan, checklist,
  tasks, analyze, visual-direction check, implement, visual review, converge.
- **Branches**: all work stays on the single branch `tradecraft_v2`; there are no per-feature git
  branches. Feature directories are still numbered under `specs/`.
- **Commits**: commits are made only when the owner asks, or as part of a flow step the owner has
  started. Nothing is pushed to the remote without the owner's say-so. Commit messages end with
  the Co-Authored-By line for Claude.
- **Reviews**: local review passes run for any change to authentication, import or upload code;
  findings are fixed or recorded as accepted risk with a reason.
- **Verification**: a feature is not done until it has been exercised through the composed stack
  and a real browser, and the result is stated honestly, including any failures.

## Governance

This constitution overrides other practices in this project. An amendment MUST be recorded with
its date and reason and MUST bump the version. Versioning follows semantic rules: MAJOR for
removing or redefining a principle, MINOR for adding a principle or materially widening guidance,
PATCH for wording and clarifications. Amendment log: 1.2.0 (2026-10-04) replaced the Reuse constraint (v1 reused where it fits) with a clean start, reused only when the owner asks for a feature, because the owner wants no inherited assumptions in v2; 1.1.0 (2026-10-02) split principle V into
wireframe sign-off, a once-per-project visual direction, and a post-implementation visual review,
because the first screens drafted assumed the earlier project's look. Each specification, plan and review MUST check compliance with
these principles, and any exception MUST be written down with its justification and an expiry.

**Version**: 1.2.0 | **Ratified**: 2026-10-02 | **Last Amended**: 2026-10-04
