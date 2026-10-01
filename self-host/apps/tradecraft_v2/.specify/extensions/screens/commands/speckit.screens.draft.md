---
description: "Draft the feature's screens in Penpot with real wording, write screens.md, and collect the owner's reactions"
---

# Rough screens (after specify, before clarify)

You are drafting the screens a feature needs, **quickly and roughly**, so the owner can react to
something visible. The owner has said they only know what they want once they have seen it, so this
step exists to turn abstract requirements into concrete screens before clarify asks its questions.

This step governs constitution principles **I** (process over outcome) and **V** (design before code).
Read `.specify/memory/constitution.md` first.

## User Input

```text
$ARGUMENTS
```

## Steps

1. **Find the feature.** Run `.specify/scripts/bash/check-prerequisites.sh --json --paths-only` from
   the project root and read `FEATURE_DIR` and `FEATURE_SPEC`. Stop with a clear message if
   `spec.md` does not exist.

2. **Read the spec.** Note each user story (with its priority), each functional requirement and each
   key entity. Keep their ids; you will reference them.

3. **Decide whether the feature has screens.** If it is purely backend or has no user-facing screen,
   write `screens.md` from the template with `status: not-applicable` and one sentence of reason,
   ask the owner to confirm with one question, and stop.

4. **Propose the screen list first.** Before drawing anything, list the screens and the states
   worth showing (empty, filled, error, near-limit, and so on), each mapped to the story or stories
   it serves. Use AskUserQuestion to confirm or adjust the list. Keep the questions short and put
   the full content of the question inside the question text: the owner may not see text above the
   dialog.

5. **Draw in Penpot.** Read the Penpot overview tool first. Then, in the owner's Penpot file:
   - Create a page named `v2 NNN feature-name` (use the feature directory name).
   - Reuse the library components from the **Design kit** page: Button / Primary and Secondary,
     Card / Default and Stat, Chip, Input, Nav item, Tab. Do not invent new styling.
   - One frame per screen per state worth showing. Name frames `S1 Daily review: filled`,
     `S1 Daily review: empty` and so on, so they map back to `screens.md`.
   - Use the **real words**: every label, button, empty state, error and notice as it will appear.
     No lorem ipsum, no "label here".
   - Apply the constitution while drawing. Any screen that shows a money figure MUST show process
     information next to it for the same period or trade (principle I). A figure that cannot be
     computed shows a dash and says why (principle III).
   - Export each frame and check it visually before showing it to the owner. Save the images under
     `FEATURE_DIR/screens/` (copy them from the tool result path).

   Penpot quirks learned on this project (follow them):
   - The Penpot plugin tab must be open and connected, and its token must match; if a call fails
     with a tunnel or connection error, wait and retry, and tell the owner.
   - Child `x` and `y` are absolute page coordinates, not relative to the board.
   - Component names containing " / " are split into a path and a name; set them separately.
   - After inserting component instances into a flex board, toggle `flex.rowGap` up and back to
     force the layout to settle.
   - `openPage` needs a short wait before the page is current.
   - Helper functions kept in `storage` are lost on a reload; rebuild them when needed.
   - Remove any stray test shapes before finishing.

6. **Write `screens.md`.** Run `.specify/scripts/bash/resolve-template.sh screens-template --json`, take `TEMPLATE_CONTENT`
   as the scaffold, write it to `FEATURE_DIR/screens.md` and fill it in: the screen inventory, the content list per screen, the
   flows between screens, the constitution check, and the open questions this draft raised. Set
   `status: draft`.

7. **Show and collect reactions.** Show the owner the exported frames. Ask what they react to,
   screen by screen if needed, using AskUserQuestion with the example inside the question text.
   Record every reaction in the `Reactions` table of `screens.md`, and update the frames and wording
   for any change that is clear. Leave unclear points as open questions for clarify.

8. **Hand over to clarify.** Add a short `## Screens` section to `spec.md` that links to
   `screens.md` and lists the open questions, so the clarify step asks about them. Do not run
   clarify yourself.

## Rules

- Rough means rough. Do not polish. A screen the owner rejects costs nothing.
- Never write application code in this step.
- Do not mark anything signed off here; that is the next gate.
- Stay inside `FEATURE_DIR` and the Penpot page you created. Do not edit v1 pages.
- If Penpot is unreachable, say so, write the screen inventory and content list in `screens.md`
  as text, and set `penpot: pending` so the sign-off step does not pass.
