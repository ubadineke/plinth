"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

/* ──────────────────────────────────────────────────────────────
   Reveal — a lightweight, dependency-free entrance primitive.

   The polished hero/subscriptions acts drive their own GSAP
   choreography; the content sections below just need to arrive
   with intent as they scroll into view. One IntersectionObserver
   per element, fires once, and a single CSS transition does the
   rest — no framer-motion, matching the rest of the app.

   Stagger a group by passing an index-based `delay`:
     items.map((x, i) => <Reveal key={x} delay={i * STEP}>…</Reveal>)

   Respects prefers-reduced-motion: content appears immediately,
   no transform.
   ────────────────────────────────────────────────────────────── */

// Motion tokens — one place, no magic numbers scattered in JSX.
export const REVEAL = {
  duration: 620, // ms — mount entrance
  ease: "cubic-bezier(0.22, 0.72, 0.2, 1)",
  y: 18, // px — default rise distance
  step: 80, // ms — recommended per-item stagger
} as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** stagger offset in ms */
  delay?: number;
  /** rise distance in px */
  y?: number;
  /** render element */
  as?: ElementType;
  /** fraction of the element visible before firing */
  threshold?: number;
  style?: CSSProperties;
};

export function Reveal({
  children,
  className = "",
  delay = 0,
  y = REVEAL.y,
  as: Tag = "div",
  threshold = 0.12,
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  // `Tag` is polymorphic (ElementType). Aliasing to `any` sidesteps a TS quirk where the union's
  // `children` prop collapses to `never`, which broke the production type-check.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const El = Tag as any;

  return (
    <El
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translateY(${y}px)`,
        transition: `opacity ${REVEAL.duration}ms ${REVEAL.ease} ${delay}ms, transform ${REVEAL.duration}ms ${REVEAL.ease} ${delay}ms`,
        willChange: shown ? undefined : "opacity, transform",
        ...style,
      }}
    >
      {children}
    </El>
  );
}
