# How Tradecraft v2 is built

Written 2026-10-02, revised the same day (constitution 1.1.0). This is the process every feature follows.
The rules behind it are in the constitution
([`.specify/memory/constitution.md`](../.specify/memory/constitution.md)); this file says how to carry
them out.

## The short version

Research first, then one small feature at a time. Each feature goes through a fixed flow in which you see
and sign off **greyscale wireframes** before any technical design, the **look** is decided once per
project by you, and a **visual review** closes each feature. Agents do the drafting; you make the calls.

```
research -> constitution (once)
         -> specify -> wireframes -> clarify -> wireframe sign-off
         -> plan -> checklist -> tasks -> analyze
         -> visual-direction check -> implement -> visual review -> converge
```

A diagram of the same flow: [build-process.html](build-process.html) (open it in a browser).

## Three separate design decisions

We keep structure, look and result apart, because they are different decisions with different costs.

| Decision | When | Who decides | What it covers | Artifact |
|---|---|---|---|---|
| **Wireframes** | Per feature, after specify, signed off before plan | You | Structure, layout, content and wording, states, behaviour. Greyscale. **No brand, colour or type choices** | Penpot pages, `specs/NNN/screens.md`, `wireframes/` images |
| **Visual direction** | Once per project, checked before the first implement (you can decide it earlier or later, but code cannot start without it) | You, with references you provide | Palette, type, density, component feel, tone. Never assumed from an earlier project | `DESIGN.md`, `PRODUCT.md`, `docs/visual-direction.md` |
| **Visual review** | Per feature, after implement | You | The built screens, in a real browser, against the wireframes and the visual direction | `built/` screenshots, a "Visual review" section in `screens.md` |

Where Impeccable (the frontend design skill) is used:
- **Visual direction:** its `init` command writes `PRODUCT.md` and its `document` command writes `DESIGN.md`.
- **Plan:** its `shape` command can turn the signed-off wireframes into a UI brief (optional).
- **Implement:** the frontend code is written against `DESIGN.md`, with its design guidance active.
- **Visual review:** its `critique` and `audit` commands run on the built screens, and `polish` if you want it.

## Status of each piece

| Piece | Status |
|---|---|
| Research on a reference product, flows, and your reactions (`research/`) | Done 2026-10-02 |
| Spec Kit installed and initialised (Claude integration) | Done |
| Constitution | **v1.2.0**: principle V split into wireframes, visual direction and visual review (1.1.0); clean start, v1 reused only when you ask (1.2.0, 2026-10-04) |
| Design gates extension (wireframes, sign-off, direction check, visual review) | Built and installed v0.2.0; **not yet exercised end to end** |
| Visual direction | **Approved 2026-10-04**: Hex, comfortable density, light and dark, standard profit and loss tints (`docs/visual-direction.md`, `DESIGN.md`, `PRODUCT.md`) |
| Feature `000-log-trades` (accounts and trades) | Specified, clarified, wireframes **signed off 2026-10-04**. Next: plan. Built first |
| Feature `001-journal-and-reflect` | Specified, clarified, wireframes signed off 2026-10-03; **paused** until 000 is built. Its spec needs one small fix (it assumed accounts and trades came from v1) and a re-sign-off |

## Stages, artifacts, tools and gates

| # | Stage | What happens | Artifact | Tool | Gate |
|---|---|---|---|---|---|
| 0 | Research | Study a mature product and read what it does; you react to concrete ideas | `research/`, `research/12-owner-decisions.md`, vault note | Reading, `archify` diagrams | You have reacted to the ideas |
| 1 | Constitution | Non-negotiable rules for the project, set once | `.specify/memory/constitution.md` | `/speckit-constitution` | You approve the principles |
| 2 | Specify | What to build and why, as user stories and requirements. No technology | `specs/NNN-name/spec.md` | `/speckit-specify` | You read the draft |
| 3 | Wireframes | Greyscale drawings of each screen and state, with the real wording | Penpot pages (one per screen), `screens.md`, `wireframes/` | `/speckit-screens-draft`, Penpot | You react to what you see |
| 4 | Clarify | Up to five targeted questions about what is still unclear, now about concrete screens | updated `spec.md` | `/speckit-clarify` | Questions answered |
| 5 | Wireframe sign-off | The final check on structure, content, states and behaviour. Not the look | A dated sign-off in `screens.md`, plus a "Signed-off wireframes" section in `spec.md` | `/speckit-screens-signoff` | **You sign off.** Plan cannot start without it |
| 6 | Plan | Technical design: data, API contract, how it reuses Tradecraft v1 | `plan.md`, `data-model.md`, `contracts/`, `research.md`, `quickstart.md` | `/speckit-plan` | You approve the plan |
| 7 | Checklist | "Unit tests for the requirements": is the spec complete and consistent | `checklists/*.md` | `/speckit-checklist` | Reviewer ticks the items |
| 8 | Tasks and analyze | Dependency-ordered work list, then a read-only consistency report across spec, plan and tasks | `tasks.md`, analysis report | `/speckit-tasks`, `/speckit-analyze` | Conflicts fixed at the source |
| 9 | Visual-direction check | If the project's look is not decided and approved, decide it now with you and write `DESIGN.md` and `PRODUCT.md`; otherwise a one-line pass | `docs/visual-direction.md`, `DESIGN.md`, `PRODUCT.md` | `/speckit-screens-direction`, Impeccable | **You approve the look.** Implement cannot start without it |
| 10 | Implement | Build in task order, against the wireframes and `DESIGN.md` | Code, tests, migrations, OpenAPI | `/speckit-implement`, Go, Next.js, sqlc, goose | Pre-commit hook passes |
| 11 | Visual review | Run the real stack and a real browser; compare with the wireframes; critique and audit; run a local review pass if the feature touches authentication, import or upload | `built/` screenshots, "Visual review" in `screens.md` | `/speckit-screens-review`, Docker Compose, browser pane, Impeccable, `/code-review` | **You approve the look.** The feature is not done without it |
| 12 | Converge | Compare the code with spec, plan and tasks; remaining work becomes new tasks | updated `tasks.md` | `/speckit-converge` | Nothing left unbuilt, or listed |

## The design gates extension

Our own Spec Kit extension, source in `speckit-extensions/screens/` (see its
[README](../speckit-extensions/screens/README.md)). We wrote it ourselves because the one wireframe
extension in the community catalogue is unvetted third-party code. It adds four commands and four
mandatory hooks, written to `.specify/extensions.yml` by the install so Spec Kit upgrades do not
overwrite them:

| Hook | Command | What it does |
|---|---|---|
| after `specify` | `/speckit-screens-draft` | Draws greyscale wireframes, writes `screens.md`, collects your reactions, passes open questions to clarify |
| before `plan` | `/speckit-screens-signoff` | Checks wireframes against the clarified spec (including that they are really greyscale), asks for your sign-off, records the spec hash; goes stale if the spec changes |
| before `implement` | `/speckit-screens-direction` | Passes if the visual direction is approved; otherwise runs that step with you |
| after `implement` | `/speckit-screens-review` | Built screens vs wireframes in a browser, Impeccable checks, your approval of the look |

To change the extension, edit the source folder and reinstall with `--force`.

## How to run it

- The `specify` command-line tool is installed (v1.0.14). On this machine Windows blocks its
  launcher, so run it through its Python environment:
  `"$APPDATA/uv/tools/specify-cli/Scripts/python.exe" -c "from specify_cli import main; import sys; sys.argv=['specify']+sys.argv[1:]; main()" <args>`
- The step commands (`/speckit-specify` and the rest) are Claude Code skills in `.claude/skills/`. They
  are available in a Claude session started inside `tradecraft_v2`, or one working on files under it.
- Each step is run one at a time and reviewed before the next. The agent may stop and ask questions.
- Git: everything stays on the branch `tradecraft_v2`. There are no per-feature branches. Feature folders
  are still numbered (`specs/001-...`). Nothing is pushed without your say-so.
- Penpot: the plugin tab must be open and connected for the wireframe steps. If it drops, the step says
  so and waits.

## Where things live

| What | Where |
|---|---|
| Constitution | [`.specify/memory/constitution.md`](../.specify/memory/constitution.md) |
| Spec Kit templates, scripts, workflow | `.specify/` |
| Skills for each step | `.claude/skills/speckit-*/` |
| Features | `specs/NNN-name/` |
| Research and your reactions | [`research/`](../research/00-README.md) |
| Wireframes | Penpot file `Tradecraft_v2` (one page per screen, plus a wireframe kit page), `specs/NNN-name/screens.md`, images in `specs/NNN-name/wireframes/` |
| Visual direction | `docs/visual-direction.md`, `DESIGN.md`, `PRODUCT.md` |
| Built-screen screenshots | `specs/NNN-name/built/` |
| Domain rules, with sources | `docs/domain.md` (to be carried over from v1) |
| Security review and gates | `docs/security-review.md` (to be carried over from v1) |
| Dated decisions | `research/12-owner-decisions.md`, then `docs/decisions.md` |
| Process diagram | [build-process.html](build-process.html) |
| Dev-session notes | The vault, `H:\My Drive\claude-second-brain` |

## What is reused from Tradecraft v1

**Nothing, by default** (constitution 1.2.0, 2026-10-04). v2 starts clean so that no earlier assumption
sneaks in. Features Tradecraft v1 already has (sign-in, audit log, rule engine, import) are separate v2
features; when you ask for one, its plan looks at v1 and records exactly what was reused and why. **The look
is never reused unless you choose it** in the visual-direction step.

## Order of features

0. `000-log-trades`: accounts and closed trades, with exact money, the trading day and the honest dash.
   Built first because everything else needs it. Written from scratch (the owner's rule: v2 starts clean).
1. `001-journal-and-reflect`: daily review with yesterday's focus, plan-down focus fields, process grades,
   mistake tags and counter with an optional stop line, weekly review.
2. Agent read access (ask your journal, Rule Replay in answers), right after the first version.
3. After that, in an order to be chosen from use: sign-in and audit (with a review pass), live session
   (gate and log), import with reusable profiles, prop-challenge cockpit, setup playbooks, missed trades.
