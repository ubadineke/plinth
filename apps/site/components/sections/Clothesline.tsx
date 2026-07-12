"use client";

import { useEffect, useRef } from "react";

/* ──────────────────────────────────────────────────────────────
   Clothesline — the wire the Trust polaroids hang from.

   It measures the real on-screen position of every peg
   (`[data-clothes-peg]`) and draws a single wire that threads
   through them and runs off BOTH screen edges (full-bleed), so it
   reads as one long line the cards are pinned to — robust at any
   viewport width because it reads actual geometry rather than
   hard-coded fractions.

   The pegs are fixed clips; between them the wire sags and drifts
   on a slow sine, the way a real line moves in a light breeze. Only
   the segments BETWEEN clips move — the clip points stay put, so the
   cards never appear to detach. Coordinates are plain CSS px (the
   SVG has no viewBox), so the hairline stroke never distorts.

   Desktop + motion only: on mobile the cards stack and no wire is
   drawn; on reduced-motion the wire is static (sag, no sway).
   ────────────────────────────────────────────────────────────── */

type Pt = { x: number; y: number };

export function Clothesline() {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!svg || !path) return;

    const mqMd = window.matchMedia("(min-width: 768px)");
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let inView = false;
    let anchors: Pt[] = []; // [leftEdge, ...pegs, rightEdge], in svg-local px
    let width = 0;

    // Re-read peg geometry (mount / resize / layout shifts). Cheap, rare.
    const remeasure = () => {
      const sb = svg.getBoundingClientRect();
      width = sb.width;
      const pegs = Array.from(
        document.querySelectorAll<HTMLElement>("[data-clothes-peg]"),
      )
        .map((el) => {
          const r = el.getBoundingClientRect();
          // seat the wire a few px into the top of the clip
          return { x: r.left + r.width / 2 - sb.left, y: r.top - sb.top + 5 };
        })
        .sort((a, b) => a.x - b.x);

      if (pegs.length < 2) {
        anchors = [];
        return;
      }
      // wire rises gently toward each far edge, off screen
      const first = pegs[0];
      const last = pegs[pegs.length - 1];
      anchors = [{ x: 0, y: first.y - 18 }, ...pegs, { x: width, y: last.y - 24 }];
    };

    // Build the path `d`. `t` (ms) drives a subtle sway on the mid-point of each
    // segment; the anchors themselves never move.
    const build = (t: number) => {
      if (anchors.length < 2) return "";
      const sway = mqReduce.matches ? 0 : 1;
      let d = `M ${anchors[0].x.toFixed(1)} ${anchors[0].y.toFixed(1)}`;
      for (let i = 0; i < anchors.length - 1; i++) {
        const a = anchors[i];
        const b = anchors[i + 1];
        const w = b.x - a.x;
        const sag = Math.min(Math.abs(w) * 0.045, 13); // wider gap → more droop
        const amp = 2.4 * sway;
        const cx = (a.x + b.x) / 2;
        const cy =
          (a.y + b.y) / 2 + sag + amp * Math.sin(t / 1900 + i * 0.9);
        d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      }
      return d;
    };

    const tick = (t: number) => {
      // remeasure every frame so the wire tracks the pegs exactly — through the
      // Reveal entrance (cards rise into place) and the continuous card sway, not
      // just their first painted position. Reads are cheap: a path `d` change
      // doesn't dirty the pegs' box layout, so these rects don't force reflow.
      remeasure();
      path.setAttribute("d", build(t));
      raf = inView && !mqReduce.matches ? requestAnimationFrame(tick) : 0;
    };

    const start = () => {
      if (raf) return;
      if (mqReduce.matches) {
        remeasure();
        path.setAttribute("d", build(0)); // static frame (no sway)
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const sync = () => {
      remeasure();
      if (mqMd.matches) {
        path.setAttribute("d", build(0));
        if (inView) start();
      } else {
        stop();
        path.setAttribute("d", "");
      }
    };

    // only animate while the section is actually on screen
    const io = new IntersectionObserver(
      ([e]) => {
        inView = e.isIntersecting;
        if (inView && mqMd.matches) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(svg);

    const ro = new ResizeObserver(() => sync());
    ro.observe(document.body);

    mqMd.addEventListener("change", sync);
    mqReduce.addEventListener("change", sync);
    window.addEventListener("resize", sync);

    sync();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      mqMd.removeEventListener("change", sync);
      mqReduce.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible md:block"
    >
      <path
        ref={pathRef}
        fill="none"
        stroke="rgb(10 10 10 / 0.18)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
