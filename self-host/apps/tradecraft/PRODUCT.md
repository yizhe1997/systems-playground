# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person, the owner: a futures day trader who takes a few trades a day, working alone at a desktop browser. They log trades, review the day in the evening, and check their focus before the next session. Other trading styles (many trades a day, swing, part-time) must not be designed out, but this version is built around that one routine.

## Product Purpose

A self-hosted trading journal for one owner that judges the decision, not the outcome. Every money figure sits beside process information (plan followed, mistakes), and a focus written once is carried forward to the next review. Success is a daily review light enough to keep doing (the target is a review completed on at least 8 of 10 trading days) and a journal the owner trusts because its numbers are exact.

## Positioning

A results dashboard cannot truthfully claim to put process before profit, and a hosted journal cannot claim the owner holds the data. This one is private to its owner, self-hosted, and built so that process information is always beside the money.

## Operating Context

- Evening: open the day for an account, check the trades, judge each decision, answer three questions, grade the day, write the focus for next session.
- Morning: see yesterday's focus, the week's and the month's, before trading.
- Trades are closed futures trades logged by hand after they exit, per account (prop-firm style accounts are common). Times are read in one journal time zone, Central by default; a trading day can start in the evening of the previous calendar day.
- Runs in containers on the owner's own computer. Agents may later read the journal through scoped, revocable tokens and draft, but only the owner makes anything a real record.

## Capabilities and Constraints

- Built so far on paper: feature 000 (accounts and closed trades, exact money, trading day, export) and feature 001 (daily and weekly reviews, process grades, mistake counter with an optional stop line, week and month focus). Signed-off wireframes exist for both, in greyscale, in `specs/*/wireframes/`.
- Money is exact decimals, never rounded until shown. A figure that cannot be worked out shows a dash and a short reason. The product never invents a number.
- No sign-in and no audit log yet (written exception: local use only until those features exist). No phone layout.
- Open, undecided: whether profit and loss gets any colour hint at all (the references avoid a second chromatic colour; meaning must in any case be carried by words and signs).

## Brand Commitments

Name: Tradecraft (v2). The look is the one decided in the visual-direction step with the owner. One exception, decided by the owner on 2026-10-05: the logo (the T held inside a C, with its uppercase wordmark) made for Tradecraft v1 is brought over and used in v2. Its files are in `design/logo/` with its guidelines. Nothing else of v1's look is inherited.

## Evidence on Hand

- `research/` (a reference-product study, flows, defaults and philosophy, owner decisions).
- `specs/000-log-trades/` and `specs/001-journal-and-reflect/`: specs, signed-off greyscale wireframes, sample data (made up).
- No real trade data, customers, testimonials or benchmarks exist. Nothing here may be fabricated into the product.

## Product Principles

1. Process before profit: no money figure without its process information beside it.
2. Honest numbers: exact, defined, with the sample size stated; a dash and a reason instead of a guess.
3. The owner is in charge: agents read and draft, the owner approves, everything is exportable.
4. One small slice at a time: each feature is usable on its own and states what it excludes.
5. Light enough to keep: the daily review must stay quick, or it stops being done.

## Accessibility & Inclusion

Every control works from the keyboard with a visible focus; labels and errors are readable by assistive software; errors are written out and never shown by colour or position alone; meaning is never carried by colour alone. Light and dark modes are both required.
