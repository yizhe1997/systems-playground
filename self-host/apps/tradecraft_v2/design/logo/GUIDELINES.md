# Tradecraft: logo guidelines

## 1. The logo
- **Idea**: a T held inside a C. The trader inside the rule boundary; the opening in the C is the breach point.
- **Versions**: horizontal (primary) · stacked · symbol · wordmark.
- **Construction**: symbol on a 256-unit board. The T (112 × 112) is centred in the C's cavity with 28 units on every side, equal to the ring's thickness.
- **Wordmark**: IBM Plex Sans 600 in capitals, letter-spaced 12% (small cut: weight 660, spaced 15%), converted to outlines (SIL OFL 1.1, so free for logo use). Never retype it or change its spacing; use the files.

## 2. Which file to use
| Use | File |
|---|---|
| App header, docs, README | `tradecraft-horizontal.svg` (`-on-dark` on dark surfaces) |
| Square spaces, sign-in page, posters | `tradecraft-stacked.svg` |
| Sidebar mark, avatar | `tradecraft-symbol.svg` (`variants/tradecraft-symbol-square.svg` for avatars) |
| Anything under about 32 px (favicon, tab, small icon) | `tradecraft-symbol-small.svg`, a heavier cut of the same symbol |
| Horizontal lockup under about 200 px wide | `tradecraft-horizontal-small.svg` |
| One colour | `variants/*-black.svg`, `variants/*-white.svg`, `variants/tradecraft-symbol-mono-473982.svg` |
| Favicon, app icon, PWA | `web/` (has `head-snippet.html` and `site.webmanifest`) |

## 3. Clear space
Keep a clear zone equal to **¼ of the symbol's height** on every side. It scales with the logo.

## 4. Minimum size
| Version | Screen |
|---|---|
| Symbol (small cut) | 16 px |
| Symbol (main cut) | 32 px |
| Horizontal | 120 px wide with the small cut; 200 px wide with the main cut |
| Stacked | 96 px wide |

## 5. Colour
| Name | HEX | RGB | Use |
|---|---|---|---|
| Violet | `#473982` | 71, 57, 130 | Symbol on light; tile behind the white symbol |
| Soft violet | `#9e91d6` | 158, 145, 214 | Symbol on dark |
| Ink | `#01011b` | 1, 1, 27 | Wordmark on light; dark surfaces |
| Paper | `#edebf7` | 237, 235, 247 | Wordmark on dark |

Approved pairs: violet + ink on white · soft violet + paper on ink · white on violet · one colour (black or white) anywhere else. Print colour (CMYK / Pantone) has not been proofed.

## 6. Don'ts
Don't stretch or squash · don't recolour outside the palette · don't rotate · don't add shadows, outlines or gradients · don't set the wordmark in lowercase or change its letter-spacing · don't move the T off centre · don't use the main-cut symbol below 32 px · don't place the violet symbol on a dark surface (use `-on-dark`).

## 7. Decisions worth remembering
- Chosen from six variations of the C (round, square-cut, light, open, solid, heavy). **Light** won.
- Wordmark chosen from six styles (Plex Sans title case, lowercase, uppercase tracked, two-weight, Cormorant italic, Plex Mono). **Two-weight** was picked first, then dropped: the light `trade` half had little impact next to the mark. **Uppercase tracked** replaced it. Its weight matches the blocky T, it reads as firm and institutional, and it holds up at 20 px.
- Not yet done: trademark search, print proofing, kerning pass by a type designer (spacing was tuned by eye, not by a kerning table).
