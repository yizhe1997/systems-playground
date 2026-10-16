---
name: speckit-screens-draft
description: Draft the feature's wireframes (greyscale, structure, real wording, states) and collect the owner's reactions
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: tradecraft
  source: screens:commands/speckit.screens.draft.md
---

# Wireframes (after specify, before clarify)

You are drafting **wireframes**: greyscale pictures of structure, content, states and behaviour, made
quickly so the owner can react to something visible. The owner has said they only know what they want
once they have seen it, and that a wireframe must not assume a visual identity.

This step governs constitution principles **I** (process over outcome) and **V** (design before code).
Read `.specify/memory/constitution.md` first.

## What a wireframe is here, and is not

A wireframe MUST:
- Be greyscale: white, light grey, mid grey, dark grey, black. Nothing else.
- Use a neutral, plain font. Never the brand font and never a type scale chosen for looks.
- Show layout, grouping, hierarchy by size and weight only, every state, and the real words.
- Mark meaning with a text label or an icon-less tag (for example `[STOP]`, `[draft]`), not with colour.
- Mark a picture or chart as a box with a cross and a caption of what it shows.

A wireframe MUST NOT:
- Use a palette, a brand colour, a brand font, rounded decorative styling, shadows or gradients.
- Copy the look of any earlier project, including Tradecraft v1. If the owner wants that look, it is
  decided in the visual-direction step, not here.
- Use colour to carry meaning (no green for good and red for bad).

## User Input

```text
$ARGUMENTS
```

## Steps

1. **Find the feature.** Run `.specify/scripts/bash/check-prerequisites.sh --json --paths-only` from
   the project root and read `FEATURE_DIR` and `FEATURE_SPEC`. Stop with a clear message if
   `spec.md` does not exist.

2. **Read the spec.** Note each user story (with priority), each functional requirement and each key
   entity, with their ids.

3. **Decide whether the feature has screens.** If it is purely backend, write `screens.md` from the
   template with `status: not-applicable` and one sentence of reason, ask the owner to confirm with
   one question, and stop.

4. **Propose the screen list first.** Before drawing anything, list the screens and the states worth
   showing (empty, filled, error, boundary), each mapped to the story or stories it serves. Confirm or
   adjust with AskUserQuestion. Put the full content of each question inside the question text: the
   owner may not see text written above the dialog.

5. **Draw in Penpot.** Read the Penpot overview tool first. Then, in the owner's current Penpot file:
   - Make one page per screen, named `S1 Daily review` and so on (never one page for everything).
   - Use the **Wireframe kit** page: if it does not exist, make it first from plain grey boxes: a
     button, an input, a tag, a card, a table row, a tab, a nav item, a media box. Nothing styled.
   - One frame per state, named `S1 Daily review: empty day`, so each maps back to `screens.md`.
   - Use the **real words** everywhere (labels, buttons, empty states, errors, notices). No lorem ipsum.
   - Apply the constitution while drawing: any screen that shows a money figure shows process
     information beside it (principle I); a figure that cannot be computed shows a dash and a reason
     (principle III).
   - Export each frame and look at it before showing it to the owner, but wireframes live only in the design tool (Penpot today; any tool that has an MCP or an API so an AI can manage the frames will do). Do not save images of them in the repository; `screens.md` names the frames.

   Penpot quirks learned on this project:
   - The Penpot plugin tab must be open and connected. If a call fails with a tunnel or connection
     error, tell the owner and retry once they have reconnected.
   - Child `x` and `y` are absolute page coordinates, not relative to the board.
   - Text with an empty string cannot be created; skip it.
   - Component names containing " / " are split into a path and a name; set them separately.
   - `openPage` needs a short wait before the page is current.
   - Helper functions in `storage` are lost on reload; rebuild them when needed.
   - Remove stray test shapes before finishing.

6. **Write `screens.md`.** Run `.specify/scripts/bash/resolve-template.sh screens-template --json`, take
   `TEMPLATE_CONTENT` as the scaffold, write it to `FEATURE_DIR/screens.md` and fill it in: inventory,
   content list, flows, constitution check, open questions. Set `status: draft`.

7. **Show and collect reactions.** Show the owner the exported frames. Ask what they react to, screen
   by screen if needed (AskUserQuestion, with the example inside the question text). Record each
   reaction in the `Reactions` table and update the wireframes for any clear change. Leave unclear
   points as open questions for clarify.

8. **Hand over to clarify.** Add a short `## Wireframes` section to `spec.md` that links to
   `screens.md` and lists the open questions, so clarify asks about them. Do not run clarify yourself.

## Rules

- Rough means rough. Do not polish. A wireframe the owner rejects costs nothing.
- Never write application code in this step.
- Do not mark anything signed off here; that is the next gate.
- Stay inside `FEATURE_DIR` and the Penpot pages you created.
- If Penpot is unreachable, say so, write the inventory and content list as text in `screens.md`,
  and set `penpot: pending` so the sign-off step does not pass.