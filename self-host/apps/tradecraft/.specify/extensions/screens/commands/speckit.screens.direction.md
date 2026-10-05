---
description: "Check that the project's visual direction (DESIGN.md and PRODUCT.md) has been decided and approved by the owner; if not, run the visual-direction step with them"
---

# Visual direction check (before implement)

The look of the product (palette, type, density, component feel) is decided **once per project, by the
owner**, and MUST be approved before the first implementation starts. It is never assumed from an
earlier project. This enforces constitution principle **V**.

The record of the decision is `docs/visual-direction.md`. The design documents themselves are
`DESIGN.md` and `PRODUCT.md` at the project root, written with the Impeccable skill.

## User Input

```text
$ARGUMENTS
```

## Steps

1. **Check the record.** If `docs/visual-direction.md` exists and says `status: approved`, report
   "visual direction approved on DATE: <one line>" and let the caller continue. Stop here.

2. **Otherwise run the visual-direction step with the owner.** Tell the caller **not to continue to
   implement** until it is approved.

   a. **Ask what they want**, with AskUserQuestion and the full content inside each question text:
      - Start from the look of an earlier project (name it, for example Tradecraft v1), revise it, or
        start new?
      - Do they have references to look at (screenshots, sites, a brand)? If yes, ask them to supply
        them, and read them.
      - Density and tone in plain words (calm and dense, bold and spacious, and so on).

   b. **Write the documents with Impeccable.** Invoke the `impeccable` skill: its `init` command for
      `PRODUCT.md` (who it is for, what it feels like, anti-references) and its `document` command for
      `DESIGN.md` (palette, type, spacing, components). Base them on the owner's answers and references,
      not on any assumption. If the owner chose to reuse an earlier project's look, copy that project's
      documents in as the starting point and ask what to change.

   c. **Show a style test.** Pick **one** signed-off wireframe and render it once, in code or in Penpot,
      using the new `DESIGN.md`, so the owner can judge the look on real structure. Iterate on the owner's
      reactions.

   d. **Ask for approval** with AskUserQuestion. Only an explicit approval counts.

3. **Record it.** Write `docs/visual-direction.md` with: status `approved`, the date, the decision (reuse,
   revise or new), the references used, links to `DESIGN.md` and `PRODUCT.md`, and a one-line summary.

4. **Tell the caller.** "Visual direction approved. You may continue to implement." Or: "Not approved.
   Do not continue to implement."

## Rules

- Never decide the look for the owner and never copy an earlier look without asking.
- Do not write feature code here. The style test is a throwaway, labelled as such.
- A later change to the visual direction is a recorded decision that updates this file and the
  documents.
