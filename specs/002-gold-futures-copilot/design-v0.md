# v0 Design Prompt: Gold Futures Copilot Dashboard

## Design Brief

Design a trading dashboard web app called "Gold Futures Copilot" — an AI-powered signal journal for gold futures (GC contract).

### Aesthetic Direction: Editorial Brutalism × Military HUD × Sci-Fi Tactical Terminal

The design fuses two layers:

**Layer 1 — Swiss Editorial Brutalism (typography as design):**
- **Typography IS the design** — no decorative UI chrome; bold typographic hierarchy does the heavy lifting
- **Oversized KPI numbers** with tiny ALL-CAPS uppercase labels sitting below/above them (e.g. a massive "68%" with "WIN RATE" in small caps underneath, heavily letter-spaced)
- **Bracketed category markers** for section headers: `[ RECENT PLANS ]`, `[ ACTIVE SETUP ]`, `[ ALERT CHANNELS ]`
- **Numbered sequences** for lists and plans: 01. 02. 03. instead of bullet points or plain rows
- **ALL-CAPS** for labels, navigation items, and section titles; mixed-case only for body text and notes
- **Generous whitespace** — sections breathe; don't cram UI elements together
- **Left-aligned, column-based editorial layout** — not centered card grids; think magazine feature page
- **Thin hairline dividers** (1px, ~20% opacity) instead of thick borders or cards

**Layer 2 — Military HUD / Sci-Fi Tactical Overlay (surface and interaction):**

Think Metal Gear Solid codec screens, CODEC radar HUD, tactical map overlays. This is applied as surface texture and interactive detail on top of the clean typography:

- **Custom crosshair cursor** — replace the default browser cursor with an SVG crosshair reticle (thin cross lines meeting at center with a small hollow circle, in gold/brass color `#D4B896`)
- **Subtle dot-grid background** — the page background `#0a0a0a` has a very faint repeating dot grid pattern (2px dots, ~36px spacing, ~4% opacity) giving the feel of graph paper or a tactical map coordinate grid
- **HUD corner brackets** on key stat elements — instead of box borders, use CSS `::before`/`::after` L-shaped corner brackets (like targeting brackets `⌐ ¬` at each corner) to frame the KPI numbers and active setup section. Gold color, 1px.
- **Scan line texture overlay** — a full-page fixed pseudoelement with repeating linear-gradient horizontal lines (1px line every 3px, ~3% opacity black) giving a subtle CRT phosphor screen feel without being loud
- **Pulsing reticle indicator** for live/active states — instead of a generic green dot, use a small animated SVG crosshair that pulses outward (like a sonar ping) on the "SIGNALS LIVE" badge and active plan indicators
- **Classified/encoded text treatment** for masked showroom fields — show redacted stops/targets as `████` block characters or `[ENCRYPTED]` in secondary color with a mono font
- **Corner bracket framing** on the top navigation bar — thin L-bracket corners at the very edges of the header, like a HUD targeting frame for the whole UI
- **Live instrument display** — top-right corner shows `GC / GOLD FUTURES` + current session time formatted as military time `14:23:07Z`, next to a pulsing green dot if market session is active
- **Subtle noise/grain filter** on the background — CSS SVG filter or background-image noise texture at very low opacity to give a worn analog terminal quality

### Color Palette
- **Background**: #0a0a0a (near-black) with #111111 for elevated surfaces
- **Gold Accent**: #D4B896 (warm muted gold — less yellow, more aged brass) for highlights, active states, and key prices
- **Primary Text**: #E8E4DC (warm off-white)
- **Secondary Text**: #6B6560 (muted warm gray) for labels and metadata
- **Long / Profitable / Bullish**: #4ADE80 (green-400, slightly muted)
- **Short / Loss / Bearish**: #F87171 (red-400, slightly muted)
- **Neutral Bias**: #FCD34D (amber-300)
- **Hairline Dividers**: rgba(255,255,255,0.08)

### Typography Principles
- **Headings/Labels**: Geist Mono or JetBrains Mono or `font-mono` — for KPI numbers AND section category labels
- **Body/Notes**: Inter or system-ui sans-serif for body text and descriptive content
- **KPI Display Pattern**: Huge mono number (text-7xl or text-8xl) + tiny ALL-CAPS label underneath (text-xs tracking-widest text-secondary)
- **Section Markers**: `[ SECTION NAME ]` — small, mono, letter-spaced, gold color, no border, just text

---

## Page Designs

### PAGE 1: Dashboard (home / index)

**Top strip**: Full-width ultra-thin bar. Left: `GC COPILOT` logotype in mono font. Right: live session time + `ZURICH (UTC+1)` or similar clock element, plus a dot indicator pulsing if market is open.

**Hero stats row** (not cards — just raw typographic columns separated by hairlines):
- Three columns: `68%` huge / `WIN RATE` tiny label | `2.4 : 1` huge / `AVG RISK-REWARD` tiny label | `03` huge / `ACTIVE PLANS` tiny label
- No box borders, just vertical hairline dividers between columns

**`[ TODAY'S SESSION BIAS ]` section**:
- Full-width. Left side: oversized bias word `LONG` or `SHORT` or `NEUTRAL` in the appropriate color, at display size (text-6xl+). Next to it: entry zone `2,345.00 — 2,348.50` in mono, secondary color, and a one-line note excerpt below in body text.
- Right side: thin vertical hairline, then "NEXT SESSION" countdown timer in mono

**`[ RECENT PLANS ]` section**:
- Editorial numbered list (not a table): each row is `01 / GC / LONG / 2345.0–2348.5 / ACTIVE` spread across the full width with mono spacing
- Status rendered as a small badge: ACTIVE (gold dot), CLOSED (dim dot), INVALIDATED (red dot)
- Each row separated by a hairline

### PAGE 2: Creator Studio

**Page header**: `[ CREATOR STUDIO ]` marker, then below: two column labels — `NEW PLAN` (left) and `LOG OUTCOME` (right) — each as a section marker.

**Two-column layout** (50/50, separated by a vertical hairline, stacked on mobile):

**LEFT — "New Trade Plan"**:
- All field labels are ALL-CAPS mono, tiny, letter-spaced, above each input (not placeholder text)
- SESSION DATE, BIAS (3 toggle pills: LONG / SHORT / NEUTRAL colored), ENTRY LOW, ENTRY HIGH, STOP LOSS (red label), TAKE PROFIT (green label), INVALIDATION NOTES, CREATOR NOTES
- Submit: minimal full-width button, gold border on dark bg, ALL-CAPS `PUBLISH PLAN`

**RIGHT — "Log Outcome"**:
- PLAN ID (with small lookup arrow icon), ENTRY PRICE, EXIT PRICE, POSITION SIZE, CREATOR NOTES
- Below the fields: Live P&L preview line — `P/L EST. +$1,240` or `P/L EST. −$320` in huge mono green/red
- Submit: `SUBMIT OUTCOME` same button style

**`[ RECENT PLANS ]`** numbered list below both panels (same style as dashboard)

### PAGE 3: Showroom (public-facing performance)

**Top**: Large editorial statement. The `strategyOverview` text renders as a pull-quote — big, italic, warm off-white, wide left margin indentation. Below it: `[ PUBLIC PERFORMANCE — SIGNALS DELAYED AND PARTIALLY MASKED ]` in secondary color, tiny.

**Stats strip** (same typographic column pattern as dashboard, 4 columns):
`TOTAL TRADES` | `WIN RATE` | `AVG R:R` | `MAX DRAWDOWN` — each as a huge number + tiny label, hairline-separated

**`[ ACTIVE SETUP ]` section**:
- Two-column editorial split: Left shows `ENTRY ZONE` range as large mono text, with `STOPS REDACTED` text dimly shown (security masking). A pulsing dot + `SIGNALS LIVE` badge in gold.
- Right column: brief masked direction indicator

**`[ LATEST CLOSED ]` section**:
- Entry → Exit as `2,341.50 → 2,363.00` in large mono. Outcome badge: `WIN` in green or `LOSS` in red. RR achieved: `+2.8R`. Brief notes in body text below.

**Performance sparkline**: A minimal line chart (no axes labels, just the equity curve line in gold on dark background), full width, short height — purely visual signal of trajectory.

**Footer**: `LIVE SIGNALS ARE DELAYED AND PARTIALLY MASKED FOR PUBLIC VIEW` — mono, tiny, bottom of page.

### PAGE 4: Subscriber Settings

**Page header**: Huge `[ ALERT CHANNELS ]` marker.

**`[ ADD CHANNEL ]` section**:
- Stacked field labels (ALL-CAPS mono above each input): SUBSCRIBER ID, CHANNEL TYPE
- Channel type: 3 horizontal text-toggle pills with icons — `TELEGRAM`, `DISCORD`, `WEBHOOK` — each highlights gold when active
- DESTINATION field label changes based on selected channel
- `SAVE CHANNEL` button: full-width, gold border

**`[ YOUR CHANNELS ]` section**:
- Numbered editorial list of configured channels: `01 / TELEGRAM / @mychatid / ADDED 2026-01-15`
- Delete: a small `×` or trash icon aligned right, hover turns red
- **Empty state**: No box/card — just centered text: `NO CHANNELS CONFIGURED` in large mono secondary color, with a subline in body text: "Add one above to start receiving trade signals."

---

## Tech Stack Context

- **Framework**: Next.js 14 App Router, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Icons**: Lucide icons
- **Forms**: React useState
- **Auth**: No auth UI needed
- **Font**: JetBrains Mono or Geist Mono for mono elements; Inter for body text

## Field Mapping to API Payloads

Reference the following component implementations for exact field names and types:

### Creator Trade Plan
```typescript
type TradePlanPayload = {
  instrument: 'GC';
  sessionDate: string;
  bias: 'long' | 'short' | 'neutral';
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  takeProfit1: number;
  invalidationNotes?: string;
  creatorNotes?: string;
};
```
Endpoint: `POST /api/proxy/creator/trade-plans`

### Outcome Journal
```typescript
{
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  creatorNotes: string;
  closedAt: ISO8601 string;
}
```
Endpoint: `POST /api/proxy/creator/outcome?id={tradePlanId}`

### Alert Channel
```typescript
{
  subscriberUserId: string;
  channelType: 'telegram' | 'discord' | 'webhook';
  destination: string;
}
```
Endpoint: `POST /api/proxy/subscriber/alert-channels`

### Showroom Data
```typescript
type ShowroomResponse = {
  performance: Record<string, unknown>;
  strategyOverview: string;
  activePreview?: Record<string, unknown> | null;
  latestClosedSummary?: Record<string, unknown> | null;
};
```
Endpoint: `GET /api/proxy/showroom/summary`
