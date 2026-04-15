# FUTURES COPILOT: CORE ARCHITECTURE & FEATURES

## The Goal
A deterministic, AI-assisted trade journaling and risk-management platform for Prop Firm traders. It prevents emotional blow-ups by enforcing mathematically rigid risk parameters and providing LLM-driven "over-the-shoulder" behavioral checks before a trade is entered.

## System Architecture
*   **Frontend**: Next.js (App Router), React 19, Tailwind CSS, Framer Motion, NextAuth (Google SSO).
*   **Backend**: Go (Fiber), REST API, UUID generation.
*   **Database**: Postgres (w/ pgvector for future RAG retrospectives).
*   **Aesthetic**: Brutalist Swiss UI, high contrast B&W, 1px sharp chamfered borders (`clip-path`), mono typography, no rounded corners.

---

## 1. Trade Lifecycle (The Core Loop)

1. **DRAFT STATE (The Guardrail)**: 
   * User clicks "Draft New Setup" and enters intended `Instrument`, `Entry`, `Stop Loss`, `Target`, `Contracts`, and picks a `Rubric`.
   * **The AI Check**: The backend calculates the exact monetary risk. It passes the trade parameters, the active Account's `rules_context`, and the chosen `Rubric` to the LLM. 
   * **Outcome**: The trade is saved as `draft`. The UI displays the AI's approval/rejection decision and reasoning. The user must manually choose to proceed.

2. **WORKING STATE (The Radar)**:
   * Once a draft is submitted to the market (limit order placed), it is marked as `working`.
   * The "Live Radar" on the dashboard tracks this order. Users can edit levels if they adjust their working order in their broker.

3. **FILLED STATE (The Position)**:
   * When the broker fills the order, the user marks it `filled`. 
   * The Copilot locks the Entry. Only SL/TP targets can be updated (e.g., trailing a stop).

4. **CLOSED / JOURNALED STATE (The Retrospective)**:
   * The trade closes. User logs the final PnL, Outcome (WIN/LOSS), and a textual reflection.
   * Moved to the historical `trade_outcomes` table for future AI analysis.

---

## 2. Prop Firm Account Management (The "State vs Logic" Paradigm)

Prop firms (Topstep, Apex, MyFundedFutures) have incredibly complex, mutating rules (e.g., Intraday Trailing Drawdowns that lock at $0 once a certain profit is hit). 
Hardcoding these relational rules into a database schema is brittle and mathematically dangerous. 

Instead, Futures Copilot separates **Current State** (deterministic math) from **Broker Logic** (AI context).

### The Account Data Model:
*   `type`: Name of the account (e.g., "Topstep 50k Express").
*   **Current State Guardrails (Dumb Math)**:
    *   `current_balance`: The exact balance *right now*.
    *   `current_daily_stop_level`: The monetary floor for the day (e.g., if balance is $51,000 and max daily loss is $1000, this is $50,000).
    *   `current_max_loss_level`: The absolute monetary floor before the account is blown.
*   **Broker Logic (Unstructured AI Context)**:
    *   `rules_context` (TEXT): A blob of scraped or pasted text explaining the broker's rules (e.g., "Max loss trails up until initial balance + $2k, then locks at $0").

### Updating Accounts:
Because the `current_max_loss_level` trails and moves based on the specific broker's `rules_context`, the **Account must be highly updatable by the user**. 
The dashboard must allow the user to easily update their `current_balance` and `current_max_loss_level` at the start/end of every trading session.

---

## 3. Rubrics (Behavioral Enforcement)

Rubrics are user-defined checklists and rulesets (e.g., "Golden Zone Strategy").
*   Users define plain-text rules (e.g., "Only trade between 9:30 AM and 11:00 AM EST", "Must have 15m divergence").
*   When a trade is drafted, the backend explicitly instructs the LLM to grade the setup against these rules.

---

## 4. UI / UX Principles

*   **No "Appy" feel**: Hide scrollbars where possible. Rely on layout over boxes.
*   **Live Charts**: Use the native TradingView Advanced Chart iframe widget (`tv.js`) tied directly to the active `working` or `filled` trade's ticker for zero-latency monitoring.
*   **Speed**: Forms should slide in via `framer-motion` modals (`clip-path` chamfered) from the right without page reloads.
