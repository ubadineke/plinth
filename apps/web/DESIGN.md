# Plinth Dashboard — Design System ("Counting House")

Source of truth for the tenant dashboard + admin console. Derived from the Touchline/Gaffer
design language (project f12a62f7 — calm tinted canvas, floating white cards, ink discipline,
mono numbers, dense rows) re-keyed to the **Plinth brand**: monochrome ink/bone + jade.
Do not deviate without explicit approval.

## Product context
- **What:** subscription billing for Nigerian businesses on Nomba rails. The dashboard is a
  serving company's billing back office: MRR, customers, subscriptions, invoices, dunning
  recovery, bank-transfer reconciliation, catalog, notifications, webhooks.
- **Mood:** a well-run counting house. Calm, precise, money-literate. Density is information;
  scroll is friction.
- **Memorable thing:** money reads instantly — every figure mono + tabular, jade only where
  money/positive action lives.

## Typography
- **Display / hero numbers / page headings:** Clash Display 600/700 (self-hosted woff2).
- **UI / body:** Satoshi 400/500/700 (self-hosted).
- **Data:** JetBrains Mono 400-600, `tabular-nums` — all amounts in tables/rows/chips, IDs,
  timestamps, code. (Exception: hero display money may use Clash Display as a headline.)
- **Scale:** 11 labels/chips (mono, uppercase, +0.06em) · 12.5 meta · 13.5 body · 15 row/card
  title · 18 section · 26–40 display.
- Loaded via plain `@font-face` in globals.css (NOT next/font) — real family names.

## Color (CSS vars in globals.css, mapped in tailwind.config.ts)
Light (default):
- **Canvas:** `#F5F5F3` with faint radial lift `#F9F9F7 → #F1F1EE`. No floating shell — the
  shell was the design file's frame, not a product pattern.
- **Card:** `#FFFFFF`, hairline `#E9E9E5`, shadow `0 1px 2px rgba(10,10,10,.04), 0 10px 28px rgba(10,10,10,.05)`.
- **Soft fill:** `#F0F0ED` (hovers, table header, code blocks).
- **Ink ramp:** ink `#0A0A0A` · body `#3D3D3A` · mid `#71716C` · faint `#A3A39E`.
- **Jade (THE accent):** `#0FA37F` · hover `#0C8A6B` · tint `#DFF3EC` · on-dark `#3BC0A1`.
  Jade = brand AND money-positive/success. Never decorative washes.
- **Dark authority panel** (overview hero only): `linear-gradient(125deg,#0B0B0A,#12120F,#132019)`
  + radial jade glow `rgba(15,163,127,.25)`; text `#F2F2EF`, muted `#9BA6A0`.
- **Semantic:** ok = jade · warn `#B45309` chip on `#FAF1E0` (bar `#D97706`) · danger `#D23B43`
  chip on `#FBEAEA` (bar `#E5484D`) · info `#2563EB` chip on `#E8EEFA` · neutral chip mid on soft.
Dark mode: same vars re-declared under `.dark` (canvas `#0C0C0B`, card `#151514`, hairline
`#282825`, ink→`#F2F2EF`…). Light is the demo-polished mode.

## Iconography
Lucide (already installed), 16px in nav/rows, 1.75 stroke. Icons mean things: alert-triangle =
dunning, arrow-left-right = transfers, radio = events. No icon-in-circle decoration grids.

## Spacing, radius, density
- Base 4px. Rows 44px; card padding 16–20; section gap 16; page gutter 24.
- Radius: chips 999 · buttons/inputs 10 · cards 14 · hero/modals 20. Never uniform-bubble.
- Sidebar 232px on canvas (no card); content max 1440 centered.
- Tables: header 11 mono uppercase mid on soft fill, hairline dividers, amounts right-aligned
  mono, status as chips, row hover soft fill.

## Motion
- Ease `cubic-bezier(0.32,0.72,0,1)` (var `--ease`). Hover/press 150ms; entrances 450–650ms
  rise+fade staggered 50ms (framer-motion); modals scale .97→1 + fade 200ms; count-up on hero
  MRR once per load. Transform/opacity only. `prefers-reduced-motion` respected everywhere.

## Anti-patterns (never)
Indigo/purple anything · Inter/system-font UI · floating page shell · icon-circle KPI tiles with
equal padding everywhere · donut charts where a segmented bar is denser · dismissible banner for
data that belongs in a card · `transition: all` · pure #000 · non-mono money.

## Decisions log
| Date | Decision | Why |
|---|---|---|
| 2026-07-04 | Touchline patterns, Plinth palette (ink/bone/jade) | founder: study the reference, use our color |
| 2026-07-04 | No floating shell; full-bleed canvas | reference file frame ≠ product pattern |
| 2026-07-04 | Light mode is the polished demo mode; dark kept via vars | half-baked dark reads worse than none |
