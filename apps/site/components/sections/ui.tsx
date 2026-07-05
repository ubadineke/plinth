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
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  /** fill the viewport (min 100svh) with content vertically centred — desktop
      up; on mobile it falls back to natural height so phones don't over-scroll */
  full?: boolean;
}) {
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
      className={`inline-flex items-center justify-center rounded-full bg-jade px-6 py-3 text-sm font-semibold text-white transition hover:bg-jade-600 ${className}`}
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
      className={`flex items-center justify-center rounded-xl border border-dashed border-ink/20 bg-ink/[0.02] text-xs font-medium uppercase tracking-wide text-ink/40 ${className}`}
      aria-label={`Placeholder: ${label}`}
    >
      {label}
    </div>
  );
}
