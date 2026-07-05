"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Container, Section } from "./ui";
import { LottieBg, RiveBg } from "./CardMedia";

gsap.registerPlugin(ScrollTrigger);

/* Three problems as minimal translucent panels on a dark section — a doodle
   animation glowing on each, a numbered label, a bold title, one tight line. */
const cards = [
  {
    n: "01",
    title: "Charges fail",
    desc: "Most recurring card charges in Nigeria don’t go through.",
    media: <LottieBg src="/animations/card-fail.lottie" />,
  },
  {
    n: "02",
    title: "Reconciled by hand",
    desc: "Matching inbound transfers to customers is slow and manual.",
    media: <RiveBg src="/animations/reconciled-coding.riv" artboard="victor_boy-01.svg" />,
  },
  {
    n: "03",
    title: "Slips away",
    desc: "Failed charges churn silently; deposits go untracked.",
    media: <RiveBg src="/animations/losing.riv" stateMachine="cryingvinbadge" />,
  },
];

export default function Problem() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const grid = root.current;
    if (!grid) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-card]", {
        x: -110,
        opacity: 0,
        duration: 0.85,
        ease: "power3.out",
        stagger: 0.18,
        scrollTrigger: { trigger: grid, start: "top 80%" },
      });
    }, grid);
    return () => ctx.revert();
  }, []);

  return (
    <Section id="problem" className="flex min-h-[100svh] items-center bg-ink">
      <Container>
        <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-bone/40">
          <span className="h-1 w-1 rounded-full bg-jade" />
          The problem
        </span>
        <h2 className="mt-4 max-w-3xl font-display text-3xl font-semibold leading-[1.05] tracking-tight text-bone md:text-4xl">
          Recurring payments in Nigeria are leaky and manual.
        </h2>

        <div ref={root} className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
          {cards.map((c) => (
            <div key={c.title} data-card>
              {/* minimal dark glass panel */}
              <div className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
                <span className="absolute left-5 top-5 z-10 font-mono text-sm font-medium text-bone/30">
                  {c.n}
                </span>
                {/* doodle animation — glows on the dark panel */}
                <div className="absolute inset-0">{c.media}</div>
                <span className="absolute bottom-5 left-5 z-10 font-display text-lg font-semibold text-bone">
                  {c.title}
                </span>
              </div>

              <p className="mt-4 px-1 text-sm leading-relaxed text-bone/60">{c.desc}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
