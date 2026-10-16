---
name: Tradecraft
description: A quiet research notebook for judging trading decisions, in warm parchment and violet ink, with a matching night mode.
colors:
  parchment: "#fffcfc"
  bone-mist: "#ecedf2"
  card-white: "#ffffff"
  fog-border: "#dbd7da"
  ink-violet: "#01011b"
  storm-mauve: "#43394c"
  plum-ash: "#6b6472"
  plum-charcoal: "#31263b"
  twilight-plum: "#473982"
  profit-green: "#187a47"
  loss-red: "#b3261e"
  night-canvas: "#100f19"
  night-surface: "#171525"
  night-card: "#1c1a2b"
  night-border: "#2f2b45"
  night-ink: "#f2f0fa"
  night-mist: "#b3abc8"
  night-ash: "#9a92b0"
  night-outline: "#d9d4ee"
  amethyst: "#9e91d6"
  profit-green-night: "#5fd08f"
  loss-red-night: "#ff7b72"
typography:
  title:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  section:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
  figure:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
    fontFeature: "'tnum' 1"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  button: "3px"
  card: "6px"
  field: "6px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  row: "48px"
  field: "36px"
  card-padding: "18px"
components:
  button-primary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-violet}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    height: "{spacing.field}"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-violet}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    height: "{spacing.field}"
    padding: "0 12px"
  input:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-violet}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    height: "{spacing.field}"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-violet}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  segment-selected:
    backgroundColor: "{colors.ink-violet}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.button}"
    height: "{spacing.field}"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.storm-mauve}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: Tradecraft

*Status: directional seed, written 2026-10-04 from the owner's choice of the Hex direction, comfortable density, light and dark. Re-document from the built UI once it exists (`/impeccable document` in scan mode). The look is not yet approved; see `docs/visual-direction.md`.*

## Overview

**Creative North Star: "The Lab Notebook"**

A calm notebook where you check your own work. Warm parchment paper, violet-black ink, thin rules and small soft shadows; nothing shouts. The product's idea is that a decision matters more than its outcome, so the interface keeps the loudest thing on the page for what you wrote and judged, never for the profit figure.

Comfortable density: 14px text, 48px table rows, 36px fields. There is no display typography in the app; hierarchy comes from size, weight and spacing only. Light is the primary mode and night is a matching mode, not an afterthought.

**Key Characteristics:**
- Warm near-white paper, never pure white or pure black.
- One ink (violet-black) and one quiet accent (twilight plum), used rarely.
- Outlined, not filled, primary buttons; filled only for a selected choice.
- Thin rules and tone steps instead of heavy shadows (a soft violet-tinted shadow lifts cards in light mode only).
- Profit and loss tinted on the figure alone; words and signs always carry the meaning.

## Colors

Warm parchment and bone-mist surfaces, violet-black ink, one plum accent, and two semantic tints for profit and loss.

### Primary
- **Twilight Plum** (#473982, night: #9e91d6 "Amethyst"): focus rings (a 3px halo at 15% opacity), the active-navigation marker, links. Rare: no more than about 5% of any screen.

### Neutral
- **Parchment** (#fffcfc): page background. Night: **Night Canvas** (#100f19).
- **Bone Mist** (#ecedf2): sidebar, table banding, section bands. Night: **Night Surface** (#171525).
- **Card White** (#ffffff): cards, fields, popovers. Night: **Night Card** (#1c1a2b).
- **Fog Border** (#dbd7da): hairlines and field borders. Night: **Night Border** (#2f2b45).
- **Ink Violet** (#01011b): text, outlines of the primary button (as **Plum Charcoal** #31263b). Night: **Night Ink** (#f2f0fa), button outline **Night Outline** (#d9d4ee).
- **Storm Mauve** (#43394c): secondary text. Night: **Night Mist** (#b3abc8).
- **Plum Ash** (#6b6472): helper lines, reasons under a dash, placeholders. Night: **Night Ash** (#9a92b0).

### Semantic
- **Profit Green** (#187a47, night #5fd08f) and **Loss Red** (#b3261e, night #ff7b72): the tint of a signed net-result figure, and nothing else.

### Named Rules
**The Quiet Outcome Rule.** Profit and loss colour appears only on the text of a net-result figure. Never on row backgrounds, borders, icons, totals bars or charts' fills, and never on R or any process figure, so the outcome is never the loudest thing on the screen.
**The Words Before Colour Rule.** Every signed figure has its sign (+ or -) or a word; colour is a hint, never the only signal. Red and green must remain distinguishable with the colour removed.
**The One Ink Rule.** One text colour family and one accent. The accent is never a button fill.
**The Contrast Floor Rule.** All text at least 4.5:1 against its surface, in both modes. (The Hex reference's own muted grey, #89828d, measures only 3.7:1 on parchment, so this system uses Plum Ash.)

## Typography

**UI and Body Font:** IBM Plex Sans (with system-ui, sans-serif fallback)
**Mono Font:** IBM Plex Mono, only for code-like text and fixed-width annotations

**Character:** A technical, neutral workbench face. Numbers use tabular figures so columns line up.

### Hierarchy
- **Title** (600, 24px, 1.25, -0.02em): page title.
- **Section** (600, 16px, 1.3): card and section headings.
- **Body** (400, 14px, 1.45): everything readable; never below 14px except labels and helper lines.
- **Label** (500, 12px, 1.3): field labels, table column headers (sentence case, not uppercase), tags.
- **Figure** (600, 14px, tabular numerals): money, sizes, R. In a stat card the figure is **20px**; the statement of a focus and the title of a week are **16px**; an empty-state heading is **20px**.
- **Scale** (changed 2026-10-10 from eight near-identical sizes to six): 12, 13, 14, 16, 20, 24. 12 is only for short labels, table heads, tags and captions; 13 for helper sentences; 14 body and controls; 16 section titles, the focus statement and week titles; 20 figures and empty-state headings; 24 the page title. No 11, 15, 18, 22 or 26.
- **Weights:** only 400, 500 and 600 are loaded, so bold is 600 everywhere (`strong` included). Grade stars are line icons (lucide), not text glyphs, so they do not fall back to another font.
- **Helper** (400, 13px in Plum Ash): reasons under a dash ("no stop recorded"), formulas under a preview figure, footnotes.

### Named Rules
**The No Display Rule.** There is no hero or display type in the app. Nothing larger than the 24px title.

## Layout

A 220px sidebar and a single content column up to 1136px; content cards on the parchment. Base unit 8px; rows 48px, fields 36px, card padding 18px, gaps 8 to 24px. Desktop browser first; below 1100px the sidebar narrows and two-column forms stack. Phone layout is not a goal.

**Wide screens (added 2026-10-04 after the owner found the build too small and too empty at 1907 px).** The Penpot frames are 1440 px wide, and the design says nothing about larger screens, so the build scales the whole interface (type, sidebar, rows, fields, spacing) together: x1.1 from 1600 px, x1.25 from 1800 px, x1.5 from 2300 px, x2 from 3000 px. A 1920 px screen therefore reads like the 1440 px design at 125 percent, with the content column centred beside the sidebar. The type scale itself is unchanged (no display type, 24 px largest) and no separate typography pass has been run yet (Impeccable's `typeset` and `layout` commands exist for that and are the way to refine it).

## Elevation & Depth

Hybrid, mostly flat. Depth comes from tone steps (parchment, bone-mist, card-white) and hairlines. In light mode only, cards carry a soft violet-tinted shadow (`0 0 0 1px rgba(71,57,130,0.06), 0 14px 40px -18px rgba(49,38,59,0.28)`). Night mode uses no shadows, only tone. Dialogs sit on a 35% dim of the canvas.

## Shapes

Small, quiet corners: 3px for buttons, 6px for cards and fields, pill only for tags. Borders are 1px hairlines.

## Components

### Buttons
- **Shape:** 3px radius, 36px high.
- **Primary:** white or transparent fill, 1px Plum Charcoal outline (night: Night Outline), Ink text, 500 weight, 16px side padding. Hover: outline thickens to 2px. Focus: plum halo.
- **Secondary:** no fill, no outline, Ink text; underline on hover.
- **Never** a coloured fill.

### Selected choice (segmented control)
- A selected option is Ink fill with Parchment text (night: Night Ink fill with Night Canvas text); the unselected option is a plain outline. This is the one filled control, because it is a state, not an action.

### Tags
- Pill, no fill, 1px Fog Border, Storm Mauve label 12px. Missing or dashed states use a dashed border plus a word.

### Cards
- 6px radius, Card White, 1px Fog Border, 18px padding, the light-mode shadow above.

### Inputs / Fields
- 36px high, Card White, 1px border, 6px radius, 12px side padding. Focus: plum border and a 3px 15% halo. Error: 2px Ink border plus a written message marked "!" below, never colour alone.

### Logo

The sidebar brand is the horizontal lockup of the T-in-a-C symbol and the uppercase wordmark, in the small cut (124 px wide, never below 120 px). The symbol takes the accent colour (violet `#473982` in light, soft violet `#9e91d6` at night, the two colours of the logo guidelines) and the wordmark the ink colour. Use the files in `design/logo/` (see `design/logo/GUIDELINES.md` for clear space, minimum sizes and the don'ts); never retype the wordmark. The favicon, tab icon and app icon are `frontend/src/app/icon.svg`, `favicon.ico` and `apple-icon.png`.

### Date range and collapsible

The Trades date range is a field-shaped button (calendar icon and the range, for example 1 Oct 2025 – 31 Oct 2025) that opens a two-month calendar in a card-like popover: Monday weeks, month and year dropdowns, range ends in Ink with Parchment text, the days between in Bone Mist, today underlined. The weeks of Reviews are cards with a header (title, summary, status chip, Open weekly review) and a 36px outlined icon button with up-and-down chevrons that shows or hides the days. Both are Base UI parts styled in `src/styles/ui.css`; no brand colour fill.

### Navigation
- Sidebar on Bone Mist; each item has an 18px line icon from lucide-react (stroke 1.75, drawn in the item's text colour: Reviews a checked clipboard, Trades candlesticks, Mistakes a warning triangle, Accounts a wallet, Settings a cog); items 36px high, 3px radius; the active item is Card White with a 3px Twilight Plum bar at its left edge and 600 weight.

### Tables
- 48px rows, hairline rules, sentence-case 12px column headers in Storm Mauve, figures in tabular numerals. A figure that cannot be worked out shows an em dash with a Plum Ash reason beneath.

## Do's and Don'ts

### Do:
- **Do** keep the primary button outlined (1px Plum Charcoal, 3px radius) and the page on parchment (#fffcfc).
- **Do** tint a net-result figure Profit Green or Loss Red and keep its sign.
- **Do** write every error and dash reason in words, with "!" for errors.
- **Do** keep helper text at Plum Ash or darker so it passes 4.5:1.
- **Do** use tabular figures for every money, size and R column.

### Don't:
- **Don't** use pure black (#000000) for text or pure white for the page.
- **Don't** fill a button with the plum accent or any brand colour.
- **Don't** colour rows, borders, icons or R; and don't let colour carry meaning alone.
- **Don't** use radii above 6px on cards or buttons, or any gradient.
- **Don't** add display or serif type to the app.
- **Don't** copy the marketing look of the reference sites: this is a working notebook, not a landing page.
