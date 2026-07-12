"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __plinthTxActive?: boolean;
  }
}

/* ──────────────────────────────────────────────────────────────
   ScrollTransitions — scroll-linked section transitions modelled on
   the classic Codrops "Page Transitions" effects
   (tympanus.net/Development/PageTransitions/), adapted from timed
   page swaps to a continuous scroll site.

   For each boundary between two sections we compute a progress
   q ∈ [0,1] from the incoming section's top edge; that single q
   drives BOTH halves of the named effect at once — the outgoing
   section's exit and the incoming section's enter — so the pair
   moves together and reverses cleanly on scroll-up.

   PERFORMANCE MODEL (this is deliberate — don't regress it):
   • Only transform + opacity are ever animated. "3-D shading" is a
     per-panel overlay div whose opacity we drive — never a CSS
     filter, which would force a full-layer re-raster every frame.
   • Styles (and will-change promotion) exist ONLY while a boundary
     is actively transitioning. Settled and far-away sections carry
     no inline styles and no promoted layers — at idle this
     controller touches nothing.
   • Transforms land on each section's own element (or its
     [data-tx-target] inner for pinned sections) — never a wrapping
     ancestor, which would break the md:sticky pins.

   Desktop + motion only. On touch / reduced-motion the controller
   never touches the DOM and sections render in their natural flow.
   ────────────────────────────────────────────────────────────── */

type Style = {
  transform?: string;
  opacity?: number;
  zIndex?: number;
  transformOrigin?: string;
  /** 0..1 darkness of the panel's shade overlay — sells depth/tilt without
      animating a filter (overlay opacity is compositor-cheap) */
  shade?: number;
  /** constant while a transition is active (rasterised once on the pre-warmed
      layer, then scales with the transform for free) — the soft edge that
      reads as a card lifting over the one behind it */
  boxShadow?: string;
};

type Recipe = {
  exit: (q: number) => Style; // applied to the outgoing (upper) section
  enter: (q: number) => Style; // applied to the incoming (lower) section
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeIn = (x: number) => x * x;
const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const IN = 30; // incoming sits above outgoing
const OUT = 1;

const RECIPES: Record<string, Recipe> = {
  // Accounts → How it works: outgoing recedes (scales down + fades), incoming
  // zooms in from 1.2 and lands plastered on top.
  scaleDownScaleDown: {
    exit: (q) => {
      const e = easeInOut(q);
      return { transform: `scale(${1 - 0.15 * e})`, opacity: 1 - 0.7 * e, zIndex: OUT };
    },
    enter: (q) => {
      const e = easeInOut(q);
      return { transform: `scale(${1.2 - 0.2 * e})`, opacity: clamp01(q * 1.6), zIndex: IN };
    },
  },

  // How it works → The Differentiator: outgoing fades in place, incoming slides
  // up from below and settles. (The "normal" one — in-flow, no cover.)
  fadeFromBottom: {
    exit: (q) => ({ opacity: 1 - easeInOut(q), zIndex: OUT }),
    enter: (q) => {
      const e = easeOut(q);
      return { transform: `translateY(${(1 - e) * 6}vh)`, opacity: clamp01(q * 1.4), zIndex: IN };
    },
  },

  // The Differentiator → Bento grid: outgoing grows toward the viewer and fades,
  // incoming grows up from small.
  scaleUpScaleUp: {
    exit: (q) => {
      const e = easeIn(q);
      return { transform: `scale(${1 + 0.18 * e})`, opacity: 1 - e, zIndex: OUT };
    },
    enter: (q) => {
      const e = easeOut(q);
      return { transform: `scale(${0.82 + 0.18 * e})`, opacity: clamp01(q * 1.5), zIndex: IN };
    },
  },

  /* Bento → Dev → Trust → Pricing — three DISTINCT smooth covers that replace
     the glue/room rotations (which opened wedges and went steppy on wheels) but
     keep their original DIRECTIONS: from-right, from-left, up. In every case the
     incoming is a solid opaque panel that covers the outgoing, which sinks into
     shadow behind it (dim only — no scale/translate on the outgoing, so it never
     reveals the page at its edges). Pure translate/scale + overlay opacity → no
     rotation, no wedge, nothing translucent → smooth and nothing shows behind.
     The directional box-shadow reads as the panel lifting in from that side. */

  // Bento grid → Developer experience: incoming slides in from the RIGHT.
  coverFromRight: {
    exit: (q) => ({ shade: 0.34 * easeInOut(q), zIndex: OUT }),
    enter: (q) => {
      const e = easeOut(q);
      return {
        transform: `translateX(${(1 - e) * 12}vw)`,
        boxShadow: "-34px 0 70px -34px rgba(20,24,28,0.28)",
        zIndex: IN,
      };
    },
  },

  // Developer experience → Correctness & trust: mirror — incoming from the LEFT.
  coverFromLeft: {
    exit: (q) => ({ shade: 0.34 * easeInOut(q), zIndex: OUT }),
    enter: (q) => {
      const e = easeOut(q);
      return {
        transform: `translateX(${(1 - e) * -12}vw)`,
        boxShadow: "34px 0 70px -34px rgba(20,24,28,0.28)",
        zIndex: IN,
      };
    },
  },

  // Correctness & trust → Pricing: incoming zooms UP into place (echoes "room to
  // top" — a vertical arrival — without the 3-D rotation).
  coverZoomUp: {
    exit: (q) => ({ shade: 0.36 * easeInOut(q), zIndex: OUT }),
    enter: (q) => {
      const e = easeOut(q);
      return {
        transform: `scale(${1.1 - 0.1 * e})`,
        boxShadow: "0 -34px 70px -34px rgba(20,24,28,0.3)",
        zIndex: IN,
      };
    },
  },

  // Pricing → Social proof: 3-D "cube" — rigid, no fade, sharper than the room.
  // Both faces stay opaque and pivot on their shared horizontal edge; the shade
  // is what makes the two panels read as adjacent cube faces.
  cubeToTop: {
    exit: (q) => {
      const e = easeIn(q);
      return {
        transformOrigin: "center bottom",
        transform: `perspective(1700px) rotateX(${e * 90}deg)`,
        shade: 0.5 * e,
        zIndex: OUT,
      };
    },
    enter: (q) => {
      const e = easeOut(q);
      return {
        transformOrigin: "center top",
        transform: `perspective(1700px) rotateX(${(1 - e) * -90}deg)`,
        shade: 0.45 * (1 - e),
        zIndex: IN,
      };
    },
  },

  // Social proof → FAQ → and on down: incoming springs up from below with an
  // overshoot ("different easing"); outgoing drifts up and dims a touch.
  differentEasingFromBottom: {
    exit: (q) => {
      const e = easeIn(q);
      return { transform: `translateY(${-e * 6}vh)`, opacity: 1 - 0.5 * e, zIndex: OUT };
    },
    enter: (q) => {
      const b = easeOutBack(clamp01(q));
      return { transform: `translateY(${(1 - b) * 9}vh)`, opacity: clamp01(q * 1.5), zIndex: IN };
    },
  },
};

// a=outgoing (upper) section, b=incoming (lower) section, fx=effect name.
// "__footer__" resolves to the page's <footer>. enterOnly: skip the exit half —
// used for the footer, which is shorter than the viewport, so its outgoing
// section stays visible above it and must not hold a dimmed exit state.
const BOUNDARIES: { a: string; b: string; fx: keyof typeof RECIPES; enterOnly?: boolean }[] = [
  { a: "accounts", b: "how-it-works", fx: "scaleDownScaleDown" },
  { a: "how-it-works", b: "nigeria", fx: "fadeFromBottom" },
  { a: "nigeria", b: "use-cases", fx: "scaleUpScaleUp" },
  { a: "use-cases", b: "developers", fx: "coverFromRight" },
  { a: "developers", b: "trust", fx: "coverFromLeft" },
  { a: "trust", b: "pricing", fx: "coverZoomUp" },
  { a: "pricing", b: "testimonials", fx: "cubeToTop" },
  { a: "testimonials", b: "faq", fx: "differentEasingFromBottom" },
  { a: "faq", b: "start", fx: "differentEasingFromBottom" },
  { a: "start", b: "__footer__", fx: "differentEasingFromBottom", enterOnly: true },
];

// ids whose recipes use `shade` — only these get an overlay element
const SHADED = new Set(["use-cases", "developers", "trust", "pricing", "testimonials"]);

// The cube opens a wedge between its two faces mid-pivot; the stage-void
// backdrop shows through it (instead of whatever sections physically sit
// behind), like the dark stage in the original Codrops demos. The cover
// effects are opaque and reveal nothing behind, so they need no backdrop.
const THREED = new Set<keyof typeof RECIPES>(["cubeToTop"]);

// Per-frame lerp factor for the displayed progress. Mouse wheels scroll in
// ~100px steps — driving a 90° rotation straight off scrollY makes each step
// jump several degrees at once. Easing the displayed value toward the target
// turns those steps into smooth motion (trackpads are unaffected feel-wise).
const SMOOTH = 0.2;

export default function ScrollTransitions() {
  useEffect(() => {
    const mqDesktop = window.matchMedia("(min-width: 768px)");
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let els: Map<string, HTMLElement> | null = null;
    let needsRelative: WeakSet<HTMLElement> | null = null;
    let shades: Map<HTMLElement, HTMLElement> | null = null;
    let backdrop: HTMLElement | null = null;
    // displayed (smoothed) progress per boundary — lerps toward the measured value
    let dq: number[] = [];

    const resolve = (id: string): HTMLElement | null => {
      if (id === "__footer__") return document.querySelector("footer");
      // pinned sections receive the transform on an inner [data-tx-target]
      const inner = document.querySelector<HTMLElement>(`#${id} [data-tx-target]`);
      return inner ?? document.getElementById(id);
    };

    const ensureShade = (el: HTMLElement): HTMLElement => {
      let sh = el.querySelector<HTMLElement>(":scope > [data-tx-shade]");
      if (!sh) {
        sh = document.createElement("div");
        sh.setAttribute("data-tx-shade", "");
        sh.setAttribute("aria-hidden", "true");
        sh.style.cssText =
          "position:absolute;inset:0;background:#0E1113;opacity:0;pointer-events:none;z-index:60;";
        el.appendChild(sh);
      }
      return sh;
    };

    const clear = (el: HTMLElement) => {
      // settled/far sections carry NO inline styles and NO promoted layer
      el.style.transform = "";
      el.style.opacity = "";
      el.style.zIndex = "";
      el.style.transformOrigin = "";
      el.style.boxShadow = "";
      el.style.willChange = "";
      const sh = shades?.get(el);
      if (sh) sh.style.opacity = "0";
      if (needsRelative?.has(el) && el.style.position === "relative") el.style.position = "";
    };

    const apply = (el: HTMLElement, s: Style) => {
      el.style.transform = s.transform ?? "";
      el.style.opacity = s.opacity != null ? String(s.opacity) : "";
      el.style.transformOrigin = s.transformOrigin ?? "";
      el.style.boxShadow = s.boxShadow ?? "";
      el.style.willChange = "transform, opacity";
      const sh = shades?.get(el);
      if (sh) sh.style.opacity = s.shade ? s.shade.toFixed(4) : "0";
      if (s.zIndex != null) {
        el.style.zIndex = String(s.zIndex);
        // z-index needs a positioning context; only force it on statically
        // positioned elements so we never clobber a sticky/relative element.
        if (needsRelative?.has(el)) el.style.position = "relative";
      } else {
        el.style.zIndex = "";
      }
    };

    const build = () => {
      els = new Map();
      needsRelative = new WeakSet();
      shades = new Map();
      const seen = new Set<string>();
      for (const { a, b } of BOUNDARIES) {
        for (const id of [a, b]) {
          if (seen.has(id)) continue;
          seen.add(id);
          const el = resolve(id);
          if (!el) continue;
          els.set(id, el);
          if (getComputedStyle(el).position === "static") needsRelative.add(el);
          if (SHADED.has(id)) shades.set(el, ensureShade(el));
        }
      }
      // one shared stage-void backdrop, shown only mid-3-D-transition; z=0
      // keeps it above settled (z-auto) content but below the two active
      // panels (z 1 / 30)
      backdrop = document.querySelector<HTMLElement>("[data-tx-backdrop]");
      if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.setAttribute("data-tx-backdrop", "");
        backdrop.setAttribute("aria-hidden", "true");
        backdrop.style.cssText =
          "position:fixed;inset:0;background:#11161B;opacity:0;pointer-events:none;z-index:0;";
        document.body.appendChild(backdrop);
      }
    };

    // measure every boundary's target progress in one read pass (no
    // interleaved writes → no forced reflows)
    const measure = () => {
      const vh = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      const scrollY = window.scrollY;
      return BOUNDARIES.map(({ b }) => {
        const elB = els!.get(b);
        if (!elB) return { qN: 0, qRaw: 0, top: Infinity };
        const top = elB.getBoundingClientRect().top;
        // Short final sections (the footer) can never travel a full viewport;
        // normalise by the distance they CAN travel so their transition still
        // completes instead of freezing partway at the end of the page.
        const denom = Math.max(1, Math.min(vh, docH - (top + scrollY)));
        return { qN: clamp01((vh - top) / denom), qRaw: clamp01((vh - top) / vh), top };
      });
    };

    const frame = () => {
      raf = 0;
      if (!els) return;
      const vh = window.innerHeight;
      const m = measure();

      const styles = new Map<HTMLElement, Style>();
      const warm = new Set<HTMLElement>();
      let midFlight = false;
      let showBackdrop = false;
      let needMore = false;

      // Pass 1 — smooth each boundary's progress, assign active EXITS (exit
      // wins over enter for a section that is both, so it never fights itself).
      BOUNDARIES.forEach(({ a, fx, b, enterOnly }, i) => {
        // lerp the displayed value toward the measured target — this is what
        // turns steppy wheel input into eased motion
        const target = m[i].qN;
        let v = dq[i] ?? target;
        const d = target - v;
        if (Math.abs(d) > 0.45) {
          // teleport (anchor link, Home/End, restored scroll) — snap, don't
          // replay the whole transition at the destination
          v = target;
        } else if (Math.abs(d) > 0.004) {
          v += d * SMOOTH;
          needMore = true;
        } else {
          v = target;
        }
        dq[i] = v;

        if (v > 0.02 && v < 0.98) midFlight = true;
        if (THREED.has(fx) && v > 0.01 && v < 0.99) showBackdrop = true;

        const elA = els!.get(a);
        const elB = els!.get(b);
        // Pre-warm (promote) both panels while the boundary is NEAR, so the
        // browser rasterises their layers before the transition's first frame
        // instead of hitching on it.
        if (m[i].top < vh * 1.5 && m[i].top > -vh) {
          if (elA) warm.add(elA);
          if (elB) warm.add(elB);
        }
        // Exit only while the boundary is genuinely in flight — gated on BOTH
        // the real cover (qRaw) and the smoothed value, so the exit never pops
        // off before the eased motion finishes.
        if (elA && !enterOnly && v > 0.001 && (m[i].qRaw < 0.999 || v < 0.999)) {
          styles.set(elA, RECIPES[fx].exit(v));
        }
      });

      // Pass 2 — assign active ENTERS for elements not claimed by an exit.
      BOUNDARIES.forEach(({ b, fx }, i) => {
        const elB = els!.get(b);
        if (!elB || styles.has(elB)) return;
        const v = dq[i];
        if (v > 0.001 && v < 0.999) styles.set(elB, RECIPES[fx].enter(v));
      });

      // While a transition is mid-flight ScrollSnap stands down (see
      // ScrollSnap.tsx) so it can't fight the transition.
      window.__plinthTxActive = midFlight;
      if (backdrop) backdrop.style.opacity = showBackdrop ? "1" : "0";

      els.forEach((el) => {
        const s = styles.get(el);
        if (s) apply(el, s);
        else {
          clear(el);
          if (warm.has(el)) el.style.willChange = "transform, opacity";
        }
      });

      // keep easing until every displayed value reaches its target, even with
      // no further scroll events
      if (needMore && !raf) raf = requestAnimationFrame(frame);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    let active = false;
    const activate = () => {
      if (active) return;
      active = true;
      build();
      // seed the smoothed values at their targets so a load mid-page (scroll
      // restoration, anchor links) doesn't animate every passed boundary in
      dq = measure().map((mi) => mi.qN);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      frame();
    };
    const deactivate = () => {
      if (!active) return;
      active = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      els?.forEach(clear);
      shades?.forEach((sh) => sh.remove());
      shades = null;
      backdrop?.remove();
      backdrop = null;
      dq = [];
      window.__plinthTxActive = false;
    };

    const sync = () => {
      if (mqDesktop.matches && !mqReduce.matches) activate();
      else deactivate();
    };

    sync();
    mqDesktop.addEventListener("change", sync);
    mqReduce.addEventListener("change", sync);

    return () => {
      mqDesktop.removeEventListener("change", sync);
      mqReduce.removeEventListener("change", sync);
      deactivate();
    };
  }, []);

  return null;
}
