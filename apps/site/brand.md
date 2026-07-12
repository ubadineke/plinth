# Plinth — Brand & Design System

> Recurring-payments infrastructure for Nigeria (subscriptions, recurring billing,
> automatic reconciliation). Powered by Nomba.

**Direction:** _Warm Editorial_ over a _Gradient-Trust_ fintech base. The product is
trust-critical (it moves money), so surfaces stay warm, restrained and legible — but the
marketing voice is editorial and confident: big poster type, an elegant serif-italic
accent, and a single jade accent against warm neutrals. Status: **active**.

## Palette (tokens in `tailwind.config.ts`)

| Token | Hex | Role |
|---|---|---|
| `ink` | `#14181C` | primary text / dark surfaces (never pure `#000`) |
| `ink-900/800/700` | `#0E1114` / `#1A2026` / `#272D33` | deeper / hover ink |
| `bone` | `#F6F3EC` | page background, light text on ink |
| `bone-200` | `#ECE8DD` | warm section bands |
| `jade` | `#0FA37F` | **the single accent** — CTAs, emphasis, eyebrows |
| `jade-600/400/100` | `#0C8A6B` / `#3BC0A1` / `#DCF1EA` | hover / light jade |
| `danfo` | `#F5B915` | reserved — only the 3-D danfo bus in the hero |

One accent (jade) + warm grayscale. Don't introduce competing colours.

## Typography — five voices, used with intent

Wired via `next/font/google` in `app/layout.tsx`, exposed as Tailwind families.

| Family | Font | Use |
|---|---|---|
| `font-poster` | **Anton** | Big statement words only — the hero, statement headlines. Heavy condensed grotesque. Uppercase, `tracking-tight`, `leading-[0.82]`. |
| `font-serif` | **Fraunces** _italic_ | The **elegance accent**. One emphasised word inside a heading or sentence — use the `<Emph>` primitive. Never set whole paragraphs in it. |
| `font-display` | **Space Grotesk** | Section headings (`<SectionHeading>`), UI display. The structural workhorse. |
| `font-sans` | **Inter** | All body copy, controls, nav. |
| `font-mono` | **JetBrains Mono** | Labels & eyebrows — `<Eyebrow>`, kicker labels, "POWERED BY NOMBA". Uppercase, `tracking-[0.18em]`. |

**Hero treatment** (the system's reference): a **centered** stack — a quiet mono
"Powered by Nomba" eyebrow, then a big `font-poster` (Anton) all-caps title where every
line is full-size (THE BASE / YOUR _billing_ / STANDS ON.), with only **"billing"** set in
`font-serif` jade italic as the lone accent. Centered subcopy (italic accent on "actually")
and centered CTAs (which stack on mobile). The bridge rises symmetrically through the
title; no text sits behind the pylon.

Hierarchy discipline: ≤3 weights and ~4–5 sizes per view. Whitespace is generous — cramped
reads cheap.

## Motion

- `animate-nudge` — a slim long arrow nudges forward (twice, then resets) inside primary
  CTAs. Subtle, ~2.4s loop.
- `animate-floaty` — gentle drift, available for ambient elements.
- Entry > exit. No `transition-all`. Custom/curated transitions only.
- Hero respects `prefers-reduced-motion`; `?still=1` freezes intro + danfo for captures.

## CTAs & voice

- Primary action: **Try Demo** (jade, arrow) → links to the app. Secondary: **Watch a video**
  (play glyph → product video). Nav keeps **Docs** + **Start building** — don't duplicate those
  as in-page CTAs.
- Nomba attribution is quiet text ("Powered by Nomba"), never a pill/tag.
- Pre-launch: never fabricate logos / metrics / testimonials — use `<Placeholder>`.

## Anti-slop guardrails

No pure `#000`; single accent + warm grayscale; content in cards/panels on warm bands, not
bare bg; low-opacity shadows (≤8%); poster face reserved for statement moments (don't set
every H2 in Anton).
