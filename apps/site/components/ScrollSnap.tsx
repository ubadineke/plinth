"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

/* ──────────────────────────────────────────────────────────────
   GSAP scroll-snap. When the user stops scrolling near a section
   boundary, ease to that section's top. Proximity-based (only
   snaps when a boundary is within ~38% of the viewport) so tall
   sections are never trapped mid-read. The snap is cancelled the
   moment the user makes a real scroll gesture (wheel / touch /
   nav keys) — we drive autoKill ourselves rather than relying on
   GSAP's, which can't tell its own scroll from the user's. Off
   for touch + reduced-motion.
   ────────────────────────────────────────────────────────────── */
export default function ScrollSnap() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (reduce || !fine) return;

    gsap.registerPlugin(ScrollToPlugin);

    let snapping = false;
    let tween: gsap.core.Tween | null = null;
    let timer = 0;

    const tops = () => {
      const main = document.querySelector("main");
      if (!main) return [] as number[];
      const y = window.scrollY;
      // Staged/pinned sections ([data-stage]/[data-pin]) are 200vh+ boxes whose
      // panel only settles 100vh in (after the cover transition completes) —
      // snap to the settled point, not the box top, or the snap lands the user
      // mid-transition. Overlap staging is md+, so only offset there.
      const md = window.matchMedia("(min-width: 768px)").matches;
      return Array.from(main.children).map((el) => {
        const offset =
          md && el instanceof HTMLElement && ("stage" in el.dataset || "pin" in el.dataset)
            ? window.innerHeight
            : 0;
        return Math.round(el.getBoundingClientRect().top + y + offset);
      });
    };

    const cancel = () => {
      if (tween) {
        tween.kill();
        tween = null;
      }
      snapping = false;
    };

    const settle = () => {
      if (snapping) return;
      // Stand down while a section transition is mid-flight (ScrollTransitions
      // owns settling in that region; snapping there fights the transition).
      if ((window as Window & { __plinthTxActive?: boolean }).__plinthTxActive) return;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const maxY = document.documentElement.scrollHeight - vh;

      let target = y;
      let best = Infinity;
      for (const t of tops()) {
        const d = Math.abs(t - y);
        if (d < best) {
          best = d;
          target = t;
        }
      }

      // only snap near a boundary, never at the very top, never past the end
      if (best > 2 && best < vh * 0.38 && target > 4 && target < maxY - 4) {
        snapping = true;
        tween = gsap.to(window, {
          scrollTo: { y: target, autoKill: false },
          duration: 0.55,
          ease: "power2.inOut",
          onComplete: () => {
            snapping = false;
            tween = null;
          },
        });
      }
    };

    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 150);
    };

    // genuine user gestures abort an in-progress snap (these never fire from
    // GSAP's own programmatic scrolling, so the snap can't cancel itself)
    const onUserScroll = () => {
      if (snapping) cancel();
    };
    const onKey = (e: KeyboardEvent) => {
      if (
        snapping &&
        ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)
      )
        cancel();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onUserScroll, { passive: true });
    window.addEventListener("touchstart", onUserScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onUserScroll);
      window.removeEventListener("touchstart", onUserScroll);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      cancel();
    };
  }, []);

  return null;
}
