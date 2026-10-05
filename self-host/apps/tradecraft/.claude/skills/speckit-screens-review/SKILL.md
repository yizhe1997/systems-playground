---
name: speckit-screens-review
description: 'Visual review after implement: the built screens in a real browser against the wireframes and the approved visual direction, with the owner''s approval of the look'
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: tradecraft
  source: screens:commands/speckit.screens.review.md
---

# Visual review (after implement)

A feature is not done until its built screens have been looked at in a real browser, compared with the
signed-off wireframes, checked against the approved visual direction, and approved by the owner. This
enforces constitution principle **V**.

## User Input

```text
$ARGUMENTS
```

## Steps

1. **Find the feature.** Run `.specify/scripts/bash/check-prerequisites.sh --json --paths-only` and read
   `FEATURE_DIR`. Read `screens.md` (the wireframes and states) and `docs/visual-direction.md`,
   `DESIGN.md` and `PRODUCT.md`. If the visual direction is not approved, stop and say so.

2. **Run the real stack.** Start the composed stack for this project (see the project's compose file
   and `docs/build-process.md`), seed realistic data that exercises every state in `screens.md`
   (empty, filled, error, boundary), and open the app in the browser tool. Do not use mocks.

3. **Capture every state.** For each screen and state in `screens.md`, take a screenshot and save it
   in `FEATURE_DIR/built/`, named like its wireframe frame. That folder is local and git-ignored: the screenshots are shown to the owner in the review and are never committed.

4. **Compare with the wireframes.** For each state, state plainly whether structure, content, wording,
   states and behaviour match the signed-off wireframe. Any difference is either a defect (fix it) or
   a decision (ask the owner and update the wireframe in the same change).

5. **Run the design checks.** With the `impeccable` skill, run `critique` and `audit` on the built
   screens against `DESIGN.md` and `PRODUCT.md` (hierarchy, spacing, type, colour, accessibility,
   responsive behaviour, empty and error states). Fix what is clearly wrong. Offer `polish` and apply it
   only if the owner wants it.

6. **Check the constitution on the real screens.** Every money figure has process information beside
   it; figures that cannot be computed show a dash and a reason; nothing shows results alone.

7. **Ask for approval of the look.** Show the owner the built screenshots beside the wireframes and
   the findings. Use AskUserQuestion with the summary inside the question text. Options: approve,
   changes needed. Iterate until they approve or park the rest as recorded follow-ups.

8. **Record it.** Add a `## Visual review` section to `screens.md` with the date, the screenshots, the
   checks run, what was fixed, anything parked, and the owner's approval.

9. **Tell the caller.** "Visual review approved." Or: "Not approved. The feature is not done."

## Rules

- Report honestly, including failures and anything not exercised.
- Never approve on the owner's behalf.
- Do not change the signed-off structure or wording without asking; if the build and the wireframe
  differ on purpose, update the wireframe in the same change.