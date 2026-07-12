import { ReactNode } from "react";

/* ──────────────────────────────────────────────────────────────
   Shared layout primitives for the marketing sections.
   Intentionally light on styling — the design-system pass will
   restyle from here, so keep visual decisions centralised.
   ────────────────────────────────────────────────────────────── */

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-6xl px-5 ${className}`}>{children}</div>;
}

export function Section({
  id,
  className = "",
  children,
  full = false,
  stage = false,
  pin = false,
  dwell = false,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  /** fill the viewport (min 100svh) with content vertically centred — desktop
      up; on mobile it falls back to natural height so phones don't over-scroll */
  full?: boolean;
  /** Staged panel: on desktop+motion the section becomes a 200vh box whose inner
      panel pins (sticky) and is pulled up over the previous section (-mt-[100vh]),
      so ScrollTransitions can transition it in as a solid full-viewport panel
      that covers its neighbour — the "genuine page-transition" model, rather
      than transforming content in place against a matching background. The
      transform lands on the [data-tx-target] inner so it can't break the pin.
      Mobile / reduced-motion: natural stacked flow. */
  stage?: boolean;
  /** Pinned panel: like `stage` but WITHOUT the pull-up — it enters the
      viewport in normal flow (so an in-flow effect like fade/from-bottom can
      bring it in), then pins for 100vh so the NEXT staged section has a held
      surface to cover. Use when a section is covered by its successor but
      should not itself cover its predecessor. */
  pin?: boolean;
  /** Add ~¾-viewport of extra pinned height AFTER the section has fully
      arrived, so it rests on screen (fully settled, nothing transitioning)
      before the next section's cover transition begins on further scroll —
      i.e. it doesn't immediately jump into the next screen. The extra height
      lands at the bottom of the box, so the section's own arrival is unchanged;
      only its exit (the next section covering it) is delayed. */
  dwell?: boolean;
}) {
  if (stage || pin) {
    return (
      <section
        id={id}
        {...(stage ? { "data-stage": "" } : { "data-pin": "" })}
        className={`relative scroll-mt-24 ${
          dwell ? "motion-safe:md:h-[275vh]" : "motion-safe:md:h-[200vh]"
        } ${stage ? "motion-safe:md:-mt-[100vh]" : ""}`}
      >
        <div
          data-tx-target
          className={`flex min-h-[100svh] flex-col justify-center py-8 md:py-10 motion-safe:md:sticky motion-safe:md:top-0 motion-safe:md:h-screen motion-safe:md:min-h-0 motion-safe:md:overflow-hidden ${className}`}
        >
          {children}
        </div>
      </section>
    );
  }
  return (
    <section
      id={id}
      className={`scroll-mt-24 ${
        full
          ? "flex flex-col justify-center py-16 md:min-h-[100svh] md:py-20"
          : "py-20 md:py-28"
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-mid">
      <span className="h-1 w-1 rounded-full bg-jade" />
      {children}
    </span>
  );
}

/** Emphasise a word inside a heading or sentence: <Emph>actually</Emph>.
    Same family as everything else now — just a weight shift, no serif accent. */
export function Emph({ children }: { children: ReactNode }) {
  return <span className="font-medium text-ink">{children}</span>;
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  center = false,
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={`${center ? "mx-auto text-center" : ""} max-w-2xl ${className}`}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-tight text-ink md:text-5xl">
        {title}
      </h2>
      {sub ? <p className="mt-4 text-lg leading-relaxed text-ink/65">{sub}</p> : null}
    </div>
  );
}

export function PrimaryButton({
  children,
  href = "#",
  className = "",
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-full bg-jade-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-jade-700 ${className}`}
    >
      {children}
    </a>
  );
}

export function SecondaryButton({
  children,
  href = "#",
  className = "",
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-full border border-ink/10 bg-transparent px-6 py-3 text-sm font-semibold text-ink transition hover:bg-ink/[0.04] ${className}`}
    >
      {children}
    </a>
  );
}

/** A clearly-marked placeholder slot — pre-launch, never fabricate real
    logos / metrics / testimonials. Swap these out before going live. */
export function Placeholder({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-dashed border-ink/20 bg-ink/[0.02] text-xs font-medium uppercase tracking-wide text-ink/60 ${className}`}
      aria-label={`Placeholder: ${label}`}
    >
      {label}
    </div>
  );
}
