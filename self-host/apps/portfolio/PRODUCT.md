# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Recruiters and hiring managers doing fast, first-pass screening across a wide net of general software engineering roles — not a narrow specialization. Their job in the moment: skim a candidate's portfolio in seconds and decide whether to request more (resume, follow-up). Chosen deliberately over targeting a narrower, higher-conviction niche, since there isn't yet a standout/exceptional project to justify that narrower bet.

## Product Purpose

A personal portfolio whose job is to generate interview opportunities. Primary success metric is resume-request conversions; site traffic is a secondary, supporting metric — traffic still matters, it's just not sufficient on its own if it isn't converting into requests. Baseline from the last time this site was live: 1 resume request, ever.

## Positioning

The differentiator is a real, working, self-hosted platform (this portfolio's own parent monorepo: Docker Compose, CI/CD, secrets management, the whole operating stack) combined with explicitly showing the AI/agent-assisted process used to build it — the build process itself is evidence of skill, not a hidden implementation detail. This replaces an earlier approach (a live "playground" of real backend demo containers) that only impressed the small slice of visitors willing to dig in technically — illegible to a recruiter scanning in seconds. See the retired approach's ADR: `self-host/apps/portfolio/adrs/004-retire-live-playground.md`.

## Operating Context

Self-hosted deployment on a limited-RAM host (Docker Compose). Go/Fiber backend + Next.js 16 frontend. Content is CMS-driven: projects and documents are unified into one content type (no separate "Documents" section). Resume access is gated behind a request-and-admin-approval flow (email notification + Filebrowser expiring share link on approval). Admin dashboard is role-gated via NextAuth + Google OAuth.

## Capabilities and Constraints

- CMS: projects/documents (unified type), homepage featured-content curation, admin dashboard.
- Resume request → admin approval → emailed expiring share link.
- **No live/runtime AI-powered features anywhere on the site** — cost constraint. A visitor-facing AI-personalization idea (e.g. AI-tailored hero copy per visitor) was explicitly considered and parked as a "someday, if it ever makes sense" idea, not in scope.
- Self-hosted on a limited-RAM host — this constraint is what drove retiring the earlier live-container demo playground (see Positioning).
- IA restructure is implemented: Home / Projects / Docs / How This Was Built / About are real routes with a shared header+footer. "Resume" and "Contact/Links" from the original v1 tab list were deliberately folded into existing surfaces rather than built as standalone pages — Resume is the gated request-modal flow (triggered from Home's hero, available site-wide via `ResumeRequestModal`'s context), and Contact/Links is the footer's Social column (GitHub/LinkedIn). Both are real and functional; there is no missing page here.
- Undecided / not yet built: the "How This Was Built" flagship section's actual content — curated build timeline, before/after gallery, annotated prompt/diff snippets, reflective write-up (separate content-drafting task, Phase 4). The structural shell and tool-credit strip are built; the real content is not.

## Brand Commitments

Name: Chin Yi Zhe, also used as "YZ" — both forms already appear consistently in the existing site/repo (e.g. hero "Hi, I'm YZ", logo alt text "Systems Playground > YZ"). *Inferred from existing repo evidence, not a fresh interview answer — flag for correction if wrong.*

## Evidence on Hand

**None confirmed yet — explicitly TBD.** The previous README included two "Case Study" write-ups (an ATS webhook-idempotency project, an enterprise job-portal modernization) that read as drafted/fictional placeholder copy, not confirmed work history. They must not be treated as real evidence or carried forward into any new work. Real work history, past roles, and any genuine case studies still need to be supplied before the "About / Work History" and "How This Was Built" content can be written for real.

## Product Principles

1. Legible in seconds, not minutes — every surface must work for a fast-scanning recruiter, not only a deeply engaged technical reviewer.
2. Show real work, not staged demos — content anyone can immediately parse, not infrastructure depth only a technical visitor would dig into.
3. The build process is content — how this site itself was built, including AI/agent assistance, is presented as evidence of skill, not hidden.
4. No invented evidence — case studies, testimonials, and history must be real and confirmed; never fabricated to fill a section.
5. No live AI-inference cost — every feature ships as static/pre-built content; no per-visitor AI calls.
