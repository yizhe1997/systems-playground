---
version: 1
slug: "frontend-src-app-admin-page-tsx"
primary_target: "frontend/src/app/admin/page.tsx"
related_targets: ["frontend/src/components/admin/CmsManager.tsx","frontend/src/components/admin/ResumeRequests.tsx","frontend/src/app/admin/login/page.tsx"]
---

## Scope and visitor mode
Admin dashboard: `frontend/src/app/admin/page.tsx` (shell/tabs/settings), `frontend/src/components/admin/CmsManager.tsx` (projects/docs/homepage-curation CMS), `frontend/src/components/admin/ResumeRequests.tsx` (approve/reject flow), `frontend/src/app/admin/login/page.tsx` (Google SSO gate). Operate mode — the operator (site owner) doing CMS/config tasks, plus an anonymous read-only visitor role that was previously public-facing but is being deprioritized (Admin link already removed from public nav).

## Audience, job, action
Primary: the site owner managing CMS content, homepage curation, and resume-request approvals. Secondary (shrinking in priority): anonymous read-only visitors. Job: get through CRUD/approval tasks quickly and correctly; this is a tool, not a pitch.

## Proof / content
Currently 100% shadcn default tokens (bg-background/text-foreground/bg-primary/etc, indigo accent, soft shadows, rounded-xl/2xl, light+dark via next-themes) — a completely different visual language from the pinned Neo-Brutalist public-facing system. Restyle to the same DESIGN.md tokens (yellow/charcoal/sage/white/black, 2px solid black borders, hard zero-blur offset shadows, 0.75rem radius cap, Cabinet Grotesk + Satoshi), but tuned down per Impeccable's Operate-mode guidance: fixed rem type scale (no clamp()), Satoshi for nearly everything (display font reserved for the page-level heading only, never buttons/labels/data), restrained color (accent used for primary actions/state only, not decoration), consistent component vocabulary across all 4 files, hard shadows reserved for major panel-level containers not every small control.

Functionality/data contracts (CMS field shapes, API endpoints, resume-approval flow, NextAuth/Google OAuth) are unchanged — visual restyle only, per explicit operator instruction.

## Memorable moment
Not the goal here — Operate mode: the interface should disappear into the task. Consistency of the button/border/shadow vocabulary across all 4 admin files is the bar, not a signature flourish.

## Unresolved
- Dark mode: admin currently has a working shadcn-token dark toggle (`ThemeToggle.tsx`); operator decided to disable it for now (force light, matching the rest of the site) rather than have it drift from the not-yet-designed Neo-Brutalist dark palette. `ThemeToggle.tsx` file stays for later reactivation; just stop rendering/importing it in `admin/page.tsx`.
- Status semantics (pending/approved/rejected in ResumeRequests) need real distinguishable colors beyond the 5 core brand colors (yellow/charcoal/sage/white/black) — treated as a necessary functional extension per Impeccable's Operate-mode "state-rich semantic vocabulary" allowance, styled with the same 2px-black-border vocabulary rather than soft translucent pills.
