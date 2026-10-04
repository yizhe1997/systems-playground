# Visual direction

**Status**: in progress (three candidate looks to compare; not approved)

The look of Tradecraft v2 (palette, type, density, component feel, tone) is decided once per project by the owner and must be approved before the first implementation starts (constitution principle V). Nothing here is assumed from Tradecraft v1.

## Decision

Not made yet. On 2026-10-04 the owner chose three candidate directions from the earlier reference study (Dovetail, Hex, Inngest; the reference files themselves stay out of git because they describe other companies' branding), both light and dark.

What exists to compare:

- `PRODUCT.md` (written with the Impeccable init, confirmed by the owner).
- A throwaway playground, `docs/visual-direction/playground.html` (serve it with the `tradecraft-v2-playground` entry in `.claude/launch.json`): direction, light or dark, and three densities on the trades list, the log-a-trade form and the accounts screen.
- Penpot file `Tradecraft_v2`: skinned frames beneath the greyscale wireframes on the pages `L1 Trades list` and `L2 Log a trade`, named `Dovetail: ...`, `Hex: ...`, `Inngest: ...` (dark and light). Images in `docs/visual-direction/skins/`.
- Each reference defines only one mode (Dovetail dark, Hex light, Inngest dark); the other mode of each is derived and is an interpretation, not a source.

Still to decide: the direction, the density, whether profit and loss gets any colour hint at all, and how the primary button looks (Hex's own rule keeps it outlined, Inngest's is a gold pill, Dovetail's is a white or black filled rectangle). After approval, Impeccable's `document` writes `DESIGN.md`, and the look is refined in the browser with live mode once the frontend runs.

## Options on record

- **Reuse Tradecraft v1's look** (`self-host/apps/tradecraft/DESIGN.md` and `PRODUCT.md`): only if the owner chooses it. Starting point, not a default.
- **Revise** v1's look.
- **Start new** from the owner's references.

## When approved

Fill in: date, decision, references, links to `DESIGN.md` and `PRODUCT.md`, one-line summary, and set the status to `approved`.
