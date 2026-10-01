# How Tradecraft v2 is built

Written 2026-10-02. This is the process every feature follows. The rules behind it are in the
constitution (`.specify/memory/constitution.md`); this file says how to carry them out.

## The short version

Research first, then one small feature at a time. Each feature goes through a fixed flow where you
see and sign off the screens before any technical design, and nothing is built until the design is
agreed. Agents do the drafting; you make the calls.

```
research -> constitution (once)
         -> specify -> rough screens -> clarify -> screens sign-off
         -> plan -> checklist -> tasks -> analyze
         -> implement -> verify -> converge
```

A diagram of the same flow is in `docs/build-process.html`.

## Status of each piece

| Piece | Status |
|---|---|
| Research on a reference product, flows, and your reactions (`research/`) | Done 2026-10-02 |
| Spec Kit installed and initialised (Claude integration) | Done |
| Constitution v1.0.0 | Written, awaiting your approval |
| The rough-screens step and the sign-off gate | **Not built yet**; designed below |
| First feature `001-journal-and-reflect` | Not started |

## Stages, artifacts, tools and gates

| # | Stage | What happens | Artifact | Tool | Gate |
|---|---|---|---|---|---|
| 0 | Research | Study a mature product and read what it does; you react to concrete ideas | `research/`, decision log `research/12-owner-decisions.md`, vault note | Reading, `archify` diagrams | You have reacted to the ideas |
| 1 | Constitution | Non-negotiable rules for the project, set once | `.specify/memory/constitution.md` | `/speckit-constitution` | You approve the principles |
| 2 | Specify | What to build and why, as user stories and requirements. No technology | `specs/NNN-name/spec.md` | `/speckit-specify` | You read the draft |
| 3 | Rough screens | A first draft of each screen the stories need, with real wording | Penpot page for the feature, `screens.md` (screen list and content) | Penpot MCP, `archify` for flows | You react to what you see |
| 4 | Clarify | Up to five targeted questions about whatever is still unclear, now about concrete screens; answers go back into the spec | updated `spec.md` | `/speckit-clarify` | Questions answered |
| 5 | Screens sign-off | The final check on screens and wording | A signed-off line in `screens.md`, dated | You, in chat | **You sign off.** Plan cannot start without it |
| 6 | Plan | Technical design: data, API contract, how it reuses Tradecraft v1 | `plan.md`, `data-model.md`, `contracts/`, `research.md`, `quickstart.md` | `/speckit-plan` | You approve the plan |
| 7 | Checklist | "Unit tests for the requirements": is the spec complete and consistent | `checklists/*.md` | `/speckit-checklist` | Reviewer ticks the items |
| 8 | Tasks and analyze | Dependency-ordered work list, then a read-only consistency report across spec, plan and tasks | `tasks.md`, analysis report | `/speckit-tasks`, `/speckit-analyze` | Conflicts fixed at the source |
| 9 | Implement | Build in task order | Code, tests, migrations, OpenAPI | `/speckit-implement`, Go, Next.js, sqlc, goose | Pre-commit hook passes |
| 10 | Verify | Run the real stack and a real browser; run a local review pass if the feature touches authentication, import or upload | Verification notes in the feature folder | Docker Compose, the browser pane, `/code-review` | Honest result, failures included |
| 11 | Converge | Compare the code with spec, plan and tasks; any remaining work becomes new tasks | updated `tasks.md` | `/speckit-converge` | Nothing left unbuilt, or listed |

## The two screen steps (our change to the standard flow)

The standard Spec Kit flow has no design step. We add two, because you only know what you want once
you have seen it:

1. **Rough screens, after specify and before clarify.** Once a first spec exists, draft each screen
   its user stories need, quickly, in Penpot, with the real words (labels, empty states, messages).
   You react. The clarify questions then ask about concrete screens, not abstractions.
2. **Screens sign-off, after clarify and before plan.** A hard gate. The signed-off screens become
   constraints the plan, tasks and implementation must honour. Any later UI change updates the
   wireframe in the same change.

How it will be built (not done yet): a small project-local command, `speckit-screens`, written by
us rather than taken from the community catalogue (the one wireframe extension there is unvetted
third-party code). It will be wired into the flow with a hook or a workflow overlay under `.specify/`.
Both are supported by Spec Kit without editing its own files, so upgrades do not overwrite them.

## How to run it

- The `specify` command-line tool is installed (v1.0.14). On this machine Windows blocks its
  launcher, so run it through its Python environment:
  `"$APPDATA/uv/tools/specify-cli/Scripts/python.exe" -c "from specify_cli import main; import sys; sys.argv=['specify']+sys.argv[1:]; main()" <args>`
- The step commands (`/speckit-specify` and the rest) are Claude Code skills in `.claude/skills/`.
  They are available in a Claude session started inside `tradecraft_v2`, or when a session works on
  files under that folder.
- Each step is run one at a time and reviewed before the next. The agent may stop and ask questions.
- Git: everything stays on the branch `tradecraft_v2`. There are no per-feature branches. Feature
  folders are still numbered (`specs/001-...`). Nothing is pushed without your say-so.

## Where things live

| What | Where |
|---|---|
| Constitution | `.specify/memory/constitution.md` |
| Spec Kit templates, scripts, workflow | `.specify/` |
| Skills for each step | `.claude/skills/speckit-*/` |
| Features | `specs/NNN-name/` |
| Research and your reactions | `research/` |
| Screens and wording | Penpot, plus `specs/NNN-name/screens.md` |
| Domain rules, with sources | `docs/domain.md` (to be carried over from v1) |
| Security review and gates | `docs/security-review.md` (to be carried over from v1) |
| Dated decisions | `research/12-owner-decisions.md`, then `docs/decisions.md` |
| Process diagram | `docs/build-process.html` |
| Dev-session notes | The vault, `H:\My Drive\claude-second-brain` |

## What is reused from Tradecraft v1

By default: the backend foundation (ledger, rule engine, Rule Replay, authentication, audit, tests),
the design assets (logo kit, tokens, Penpot flows), and the security and domain documents. Rebuilt:
the review model (focus fields, inheritance, grades) and anything the owner's reactions replaced.
Each reuse decision is made inside a feature's plan and recorded there, so reuse is never silent.

## Order of features

1. `001-journal-and-reflect`: log trades, daily review with yesterday's focus, plan-down focus
   fields, process grades, mistake tags and counter with an optional stop line.
2. Agent read access (ask your journal, Rule Replay in answers), right after the first version.
3. After that, in an order to be chosen from use: live session (gate and log), import with reusable
   profiles, prop-challenge cockpit, setup playbooks, missed trades.
