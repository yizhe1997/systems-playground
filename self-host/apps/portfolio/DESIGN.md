<!-- Pinned by the operator, sourced from https://superdesign.dev/library/lumina-saas-landing-page - supersedes both prior directions ("Config File" - rejected as flat/unfinished; "Mosaic Grid Architecture" - rejected for weird spacing and an AI-slop-feeling background). Per Impeccable's own rule, a user-pinned decision beats any roll or prior direction, always. Re-run `/impeccable document` once the build settles to capture final tokens. -->

---
name: Chin Yi Zhe — Portfolio
description: A recruiter-facing portfolio in a Neo-Brutalist style - hard shadows, thick black borders, bold geometric type
colors:
  yellow: "#ffe17c"
  charcoal: "#171e19"
  sage: "#b7c6c2"
  white: "#ffffff"
  black: "#000000"
typography:
  display:
    fontFamily: "Cabinet Grotesk, ui-sans-serif, sans-serif"
    fontSize: "clamp(2.5rem, 7vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Satoshi, ui-sans-serif, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: "normal"
rounded:
  sm: "0.75rem"
  none: "0px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.black}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    padding: "1rem 2rem"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.black}"
    rounded: "{rounded.sm}"
    padding: "1rem 2rem"
---

# Design System: Chin Yi Zhe — Portfolio

## Overview

**Creative North Star: "The Push Button"**

Neo-Brutalist: hard 2px black borders on everything, offset box-shadows with zero blur (`4px 4px 0px #000` standard, `8px 8px 0px #000` large), and a physical "press" interaction where buttons translate into their own shadow on hover. Bold, geometric, high-contrast, playful but confident — the opposite of both prior directions, which erred toward flat/quiet/generic.

Pinned directly by the operator from an external reference (superdesign.dev's library), after two prior directions were built and rejected: "The Config File" (flat, no scale hierarchy, no imagery) and "The Technical Blueprint" / Mosaic Grid (weird spacing, background read as generic AI-slop texture). This direction is deliberately louder and more mechanically prescriptive (exact shadow/border values, exact hover transform) specifically to reduce ambiguity in execution.

Scope note: the source reference is a full SaaS marketing site (testimonials, customer logos, personas, social-proof marquee). Only sections mapping to real portfolio content are built - testimonials/personas/logos would require fabricating fake customers, which breaks PRODUCT.md's "no invented evidence" principle. The visual language (color, shadow, border, type, interaction) is adopted in full; the section inventory is not.

**Key Characteristics:**
- Thick black borders (2px) on every interactive/bounded element — no exceptions
- Hard offset shadows, zero blur, in two sizes (4px standard, 8px large) — the primary depth cue
- Buttons physically "press": translate(4px, 4px) + shadow removal on hover, not a fade or scale
- Yellow (`#ffe17c`) as the dominant background field, charcoal and sage as supporting colors — high energy, not muted

## Colors

### Primary
- **Yellow** (`#ffe17c`): dominant background for hero/CTA sections, primary brand color.
- **Charcoal** (`#171e19`): dark sections, primary text on light backgrounds, button fills.

### Secondary
- **Sage** (`#b7c6c2`): supporting accent — icon boxes, card fills, secondary panels.

### Neutral
- **White** (`#ffffff`): card/panel surfaces, text on charcoal/black fills.
- **Black** (`#000000`): all borders and shadows, strictly — never a softened gray.

### Named Rules
**The Strict Border Rule.** Every interactive element and every bounded container gets a 2px solid black border. No exceptions, no softened `--ds-grid`-at-20%-opacity hairlines like the prior direction — full-strength black, always.

## Typography

**Display Font:** Cabinet Grotesk (fallback: system sans)
**Body Font:** Satoshi (fallback: system sans) — both loaded via Fontshare CDN, neither is on Google Fonts.

**Character:** Extrabold, tight-tracking geometric display type paired with a medium-weight readable body sans. No monospace anywhere in this direction (a deliberate departure from both prior directions).

### Hierarchy
- **Display** (800, `clamp(2.5rem, 7vw, 6rem)`, 0.95 line-height, -0.02em tracking): hero headline, section headlines.
- **Body** (500, 16px, 1.6 line-height): all prose content.

### Named Rules
**The One Keyword Rule.** The hero headline may use `-webkit-text-stroke` (outline-only, transparent fill) on exactly one emphasized word, never more than one, and never on any other heading.

## Layout

Vertically stacked sections with hard-contrast transitions (yellow to charcoal to white, not gradual). No hairline dividers between sections — the color-block transition itself is the divider, reinforced by a 2px black border where sections meet.

## Elevation & Depth

Hard offset shadows are the entire depth system — `box-shadow: 4px 4px 0px 0px #000` standard, `8px 8px 0px 0px #000` large/hero elements, `12px 12px 0px 0px #000` for the largest showcase containers. Zero blur radius on every shadow, always.

### Named Rules
**The Zero-Blur Rule.** Every shadow in this system has `0` blur and `0` spread beyond the explicit offset — a soft/blurred shadow anywhere is an error, not a stylistic variant.

## Shapes

`0.75rem` (12px) radius on cards/buttons/panels — never larger, to keep the geometric character. `0px` radius permitted on strictly geometric elements (the logo square, dot-pattern texture).

## Components

### Neo-Brutalist Push Button
- **Shape:** 12px radius, 2px solid black border.
- **Primary:** black fill, white text, `8px 8px 0px #000` shadow.
- **Secondary:** white fill, black text, `4px 8px 0px #000` shadow (matches the reference's dual-CTA hero pattern).
- **Hover:** `transform: translate(4px, 4px)`, shadow removed — a physical press, not a fade/scale.

### Bento Feature Card
White fill, 2px black border, 4px hard shadow, 32px padding. A `16x16` icon box in sage that shifts to yellow on hover sits above a Cabinet Grotesk heading.

### Dot Pattern Texture
Radial dot pattern, 32px grid, 10% opacity — used only on yellow backgrounds, never elsewhere.

## Do's and Don'ts

### Do:
- **Do** keep every shadow at zero blur, exact offsets only.
- **Do** apply the translate-into-shadow press effect on every button.
- **Do** keep borders at exactly 2px solid black everywhere.

### Don't:
- **Don't** fabricate testimonials, customer logos, or personas for content that doesn't exist — see the Scope note in Overview.
- **Don't** use any blurred or soft shadow anywhere.
- **Don't** round any button corner above 12px, or use pill shapes.
- **Don't** use gradients anywhere.
