# Visual direction

**Status**: approved on 2026-10-04 by the owner

**Decision**: new look for Tradecraft v2, chosen from three finalists (Dovetail, Hex, Inngest): **Hex**, comfortable density, light as the main mode with a matching night mode, standard green and red for profit and loss. Nothing is inherited from Tradecraft v1.

**One line**: "The Lab Notebook": warm parchment and violet-black ink, thin rules, outlined primary buttons, quiet.

## Documents

- [`PRODUCT.md`](../PRODUCT.md): who it is for, purpose, constraints (written with the Impeccable init, confirmed by the owner).
- [`DESIGN.md`](../DESIGN.md) and `.impeccable/design.json`: the directional seed of the design system (colours for both modes, type, spacing, shapes, components, rules). Written 2026-10-04 in seed mode; re-document from the built UI (`/impeccable document`, scan mode) once it exists.

## How it was chosen

- References: the three finalists from the earlier reference study, adapted to dense app screens. Each reference defines one mode only, so the other mode of each was derived. The reference files stay out of git (they describe other companies' branding).
- Compared in: a throwaway playground (`docs/visual-direction/playground.html`, served by the `tradecraft-v2-playground` entry in `.claude/launch.json`) and skinned frames in Penpot `Tradecraft_v2` under the wireframes on the L pages (images in `docs/visual-direction/skins/`).
- The owner's choices: direction Hex, density comfortable, both modes, standard profit and loss colours.
- After approval, the chosen Hex look was also drawn for the other screens and key states (typed result, validation errors, accounts, account dialog, settings), light and dark, beneath the wireframes in Penpot and in `docs/visual-direction/skins/`. The remaining states follow from `DESIGN.md` and are checked in the visual review after implementation.

## Changes made to the Hex reference, with reasons

1. Muted grey: the reference's `#89828d` is 3.7:1 on its parchment, below the 4.5:1 minimum for small text. Light uses `#6b6472` (5.7:1), night uses `#9a92b0`.
2. A selected choice (Long, Short) is a filled ink segment, because with outlined-only buttons the selected side was hard to see. This is the only filled control.
3. Profit and loss: `#187a47` and `#b3261e` (light), `#5fd08f` and `#ff7b72` (night), all above 4.5:1. The tint is allowed only on the text of a net-result figure, never on rows, borders, icons or R, and every figure keeps its sign (colour is never the only signal). This guards the product's idea that the decision matters more than the result; process figures in feature 001 must carry equal visual weight.

## Open or accepted

- Hex's own rule keeps the primary button outlined, so it is quiet beside the text-only secondary buttons. Accepted for now; revisit at the visual review.
- Impeccable live mode needs a running frontend. It is set up once the frontend skeleton exists (a dev-server entry in `.claude/launch.json`, then refinement in the browser), and DESIGN.md is re-written from the built UI.
- Impeccable update (v4.0.2 to v4.5.0): the owner said not important for now.

## Changing it later

A change to the visual direction is a recorded decision that updates this file and the documents.
