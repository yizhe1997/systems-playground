# AI-Powered Futures Copilot (MVP Concept)

**Document Version:** 1.3 (Living PRD)
**Design Reference:** [Sutera.ch](https://www.sutera.ch/) - Swiss minimalism, high contrast, elegant typography, deep negative space, content-first.

## 1. Core Concept
A single-tenant trading journal and risk-management copilot for Futures (Gold, NQ, ES, etc.). It acts as a deterministic risk manager before execution and a retrospective AI journal after closure. Extended to include monetization (paid subscribers) and automated alert distribution.

## 2. Monorepo Constraints
- Must live entirely within `projects/futures-copilot/`.
- **Backend:** Go Fiber extensions or a self-contained Go service running alongside the platform.
- **Frontend:** Next.js (App Router), Tailwind CSS v4, shadcn/ui.
- **Database:** Redis-backed (NO Postgres or heavy SQL for MVP). Storing trades as JSON in Redis Lists/Hashes.
- No cross-project internal imports.

## 3. The Trading Lifecycle (The "Happy Path")
1. **Global Settings (Account Config):** Set Starting Balance, Daily Loss Limit, Default Risk, and Current Account Type (Evaluation/Funded). Managed via the **Account Reset/New Modal**.
2. **Strategy Definition (Rubric Config):** The creator sets the rules (e.g., "Must be a 15m order block"). Managed via the **Rubric Config Modal**.
3. **Draft Mode:** Spot an S&D zone on TradingView -> Enter Limit Price, SL, TP, Bias, and Setup Type into the app.
4. **AI Sanity Check:** App computes deterministic Math (Risk $, R:R, % of Balance). AI checks the math against the `copilot:rubric` and issues a Go/No-Go warning (e.g., "This puts you near your daily loss limit.").
5. **Set & Filled:** Mark trade as 'Working' when order is placed, and 'Filled' when entered.
6. **Closed & Journaled:** Trade completes. Managed via the **Post-Trade Journal Modal**. Log Actual P&L and reflection notes. AI digests this into its memory for future analysis.

## 4. Frontend & UX/UI (Sutera Aesthetic)
- **Visuals:** Swiss minimalism. Vast negative space, stark typography. No cluttered forms. A focus on high legibility for trading metrics.
- **The Showroom (Landing Page - `/`):** 
  - **Hero & Stats:** "AI-Assisted Futures Trading." Simple performance stats.
  - **Auth/Monetization:** Google Sign-In in header. "Subscribe" button triggers a payment plan modal.
  - **Transparency:** Displays the current active trade. History shows the latest few closed trades.
  - **Footer:** Links and platform information.
- **The Command Center (`/dashboard`):** 
  - **Admin View:** Full interaction (Draft -> Set -> Filled -> Closed), Rubric config, Account config.
  - **Subscriber View:** Can view the entire trades list, but cannot interact/edit.
  - **Anon View:** Can only see the top 3 trades per account.
- **Subscriber Settings (`/alerts`):** UI for paid subscribers to configure Telegram, Discord, or generic Webhooks for live trade alerts.
- **Admin Users Panel (`/admin/subscribers`):** UI for the Admin to see who paid, subscription status, and manage access.

## 5. Backend Tracking (What has been built in Frontend UI so far)
- [x] Landing Page (Hero, Stats, Active Trade, Recent Outcomes)
- [x] Trade Command Center (List view, Red/Green styling)
- [x] Slide-out Modals (Draft Trade, Rubric Config, Account Reset, Post-Trade Journal)
- [ ] Role-Based Mock State (Admin vs Subscriber vs Anon limits in Dashboard)
- [ ] Payment Plan Modal (Subscribe CTA)
- [ ] Notification Setup Page (`/alerts`)
- [ ] Admin Subscribers Page (`/admin/subscribers`)
- [ ] Google Auth Header & Footer integration