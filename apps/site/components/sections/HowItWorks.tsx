"use client";

import { useEffect, useRef } from "react";
import { Container, SectionHeading } from "./ui";

const steps = [
  {
    n: "01",
    title: "Create a plan",
    body: "Define pricing and interval — e.g. ₦5,000/month. Presets or granular policy, your call.",
  },
  {
    n: "02",
    title: "Subscribe a customer",
    body: "Attach a customer to the plan. They get a dedicated account; cards work too.",
  },
  {
    n: "03",
    title: "Plinth does the rest",
    body: "It collects, retries, reconciles, and tells your product exactly who has access.",
  },
];

/* Scroll-scrubbed: the section is pinned (sticky) and taller than the viewport;
   scroll progress p ∈ [0,1] drives the reveal. Each step and each connecting
   segment has a scroll window — so you literally scroll 1 → 2, then 2 → 3, and
   it reverses if you scroll back up. Ties into the same choreography model as
   the Subscriptions bronze act. Mobile / reduced-motion: everything settled. */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

/* The section is 380vh with a -100vh pull-up over Accounts: its FIRST 100vh of
   scroll is the cover entrance (ScrollTransitions' scale-down/scale-down), which
   ends at p = 100/(380-100) ≈ 0.36. All scrub windows start after that, so the
   steps animate only once the section has fully landed — never mid-cover. */
const STEP_WIN: [number, number][] = [
  [0.4, 0.54],
  [0.61, 0.74],
  [0.82, 0.95],
];
const SEG_WIN: [number, number][] = [
  [0.51, 0.64],
  [0.71, 0.85],
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const segRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 768px)").matches;

    // mobile or reduced-motion → no pin/scrub, render settled
    if (reduced || !desktop) {
      stepRefs.current.forEach((el) => {
        if (el) {
          el.style.opacity = "1";
          el.style.transform = "none";
        }
      });
      segRefs.current.forEach((el) => {
        if (el) el.style.transform = "scaleX(1)";
      });
      return;
    }

    const section = sectionRef.current;
    if (!section) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const total = section.offsetHeight - window.innerHeight;
      const p = total > 0 ? clamp01(-section.getBoundingClientRect().top / total) : 0;
      stepRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = range(p, STEP_WIN[i][0], STEP_WIN[i][1]);
        el.style.opacity = String(r);
        el.style.transform = `translateY(${(1 - r) * 18}px) scale(${(0.94 + 0.06 * r).toFixed(3)})`;
      });
      segRefs.current.forEach((el, i) => {
        if (!el) return;
        el.style.transform = `scaleX(${range(p, SEG_WIN[i][0], SEG_WIN[i][1]).toFixed(3)})`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      data-stage=""
      // -mt-[100vh] pulls this section up over the pinned Accounts inner (which
      // has 100vh of pin slack) so it slides up and plasters on top as you
      // scroll; the ScrollTransitions controller drives the scale-down/scale-down
      // effect across that overlap. Stacking is handled by DOM order plus the
      // controller's per-transition z-index (incoming above outgoing).
      // 380vh = 100vh cover entrance + 280vh for the steps scrub (see STEP_WIN).
      className="relative scroll-mt-24 bg-bone motion-safe:md:h-[380vh] motion-safe:md:-mt-[100vh]"
    >
      {/* data-tx-target: transforms land on THIS inner element rather than the
          outer <section> — a transform on the sticky element's ancestor would
          break its pin. */}
      <div
        data-tx-target
        className="flex flex-col justify-center bg-bone py-16 motion-safe:md:sticky motion-safe:md:top-0 motion-safe:md:h-screen md:py-0"
      >
        <Container>
          <SectionHeading
            center
            eyebrow="How it works"
            title={
              <>
                Three steps to <span className="text-jade">recurring revenue.</span>
              </>
            }
          />

          <div className="relative mt-16 md:mt-20">
            {/* process line — each segment draws as its step activates (desktop) */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[46px] hidden md:block">
              <div className="mx-auto flex h-px max-w-3xl">
                {[0, 1].map((seg) => (
                  <div
                    key={seg}
                    ref={(el) => {
                      segRefs.current[seg] = el;
                    }}
                    className="h-full flex-1 origin-left bg-ink/15"
                    style={{ transform: "scaleX(0)" }}
                  />
                ))}
              </div>
            </div>

            <ol className="grid gap-12 md:grid-cols-3 md:gap-6">
              {steps.map((s, i) => (
                <li key={s.n} className="group relative">
                  <div
                    ref={(el) => {
                      stepRefs.current[i] = el;
                    }}
                    className="flex flex-col items-center text-center md:px-5"
                    style={{ opacity: 0, transform: "translateY(18px) scale(0.94)" }}
                  >
                    {/* node */}
                    <div className="relative mb-6">
                      <span className="relative z-10 grid h-[92px] w-[92px] place-items-center rounded-full border border-ink/10 bg-white transition-colors duration-300 group-hover:border-jade/40">
                        <span className="font-display text-3xl font-semibold tracking-tight text-ink transition-colors duration-300 group-hover:text-jade">
                          {s.n}
                        </span>
                      </span>
                      <span className="absolute -right-0.5 -top-0.5 z-20 grid h-6 w-6 place-items-center rounded-full bg-jade text-white shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                    </div>

                    <h3 className="font-display text-xl font-semibold text-ink">{s.title}</h3>
                    <p className="mt-2 max-w-[24ch] text-sm leading-relaxed text-ink/65">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </div>
    </section>
  );
}
