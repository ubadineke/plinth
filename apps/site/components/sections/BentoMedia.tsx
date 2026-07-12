"use client";

import { useEffect, useRef, useState } from "react";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";

/* ──────────────────────────────────────────────────────────────
   Bento-tile media. Everything is play-on-scroll-in and, by
   default, plays ONCE — a wall of looping tiles fights for
   attention, so motion fires as each tile is first seen and then
   rests. All fill their container; the tile owns the rounding/clip.
   ────────────────────────────────────────────────────────────── */

// Fires `true` the first time the element scrolls into view, then disconnects.
function useInViewOnce<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

/** Lottie that plays when first seen. loop=false → plays once and rests.
    We drive loop/speed through the instance (not just props) because several
    .lottie files carry loop=true in their own manifest, which otherwise wins. */
export function LottieOnce({
  src,
  loop = false,
  speed = 1,
}: {
  src: string;
  loop?: boolean;
  speed?: number;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const dl = useRef<DotLottie | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!inView || !ready || !dl.current) return;
    try {
      dl.current.setLoop(loop);
      dl.current.setSpeed(speed);
      dl.current.play();
    } catch {
      /* not ready yet — the [inView, ready] effect re-fires when it is */
    }
  }, [inView, ready, loop, speed]);

  return (
    <div ref={ref} className="h-full w-full">
      <DotLottieReact
        src={src}
        loop={loop}
        speed={speed}
        autoplay={false}
        dotLottieRefCallback={(x) => {
          dl.current = x;
          setReady(!!x);
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

const FITS: Record<string, Fit> = { cover: Fit.Cover, contain: Fit.Contain, fill: Fit.Fill };

/** Rive that fills its container and plays once on scroll-in — either a named
    linear animation OR a state machine (whichever the file exposes). */
export function RiveFillOnce({
  src,
  animation,
  stateMachine,
  fit = "cover",
  alignment = "center",
}: {
  src: string;
  animation?: string;
  stateMachine?: string;
  fit?: "cover" | "contain" | "fill";
  alignment?: "center" | "bottom";
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const { rive, RiveComponent } = useRive({
    src,
    animations: animation,
    stateMachines: stateMachine,
    autoplay: false,
    layout: new Layout({
      fit: FITS[fit],
      alignment: alignment === "bottom" ? Alignment.BottomCenter : Alignment.Center,
    }),
  });

  useEffect(() => {
    if (!rive || !inView) return;
    try {
      rive.play(stateMachine ?? animation);
    } catch {
      /* instance not ready */
    }
  }, [rive, inView, animation, stateMachine]);

  return (
    <div ref={ref} className="h-full w-full">
      <RiveComponent style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

/** house.riv — the floors cycle 1 → 2 → 3 → 2 → 1 → … on a continuous loop
    once the tile is first seen. We read the "floor" input straight off
    `rive.stateMachineInputs()` rather than through the `useStateMachineInput`
    hook: that hook's effect only re-syncs when the Rive instance identity
    changes, so it can grab the input handle before the state machine has
    attached it and then never refresh — the floor value silently stays
    stuck. Reading it ourselves inside the same effect that starts playback
    sidesteps that. The canvas is taller than the tile and bottom-anchored, so
    the house sits low and the floors rise into the headroom above it. */
export function HouseRive({ src }: { src: string }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: "State Machine 1",
    autoplay: false,
    layout: new Layout({ fit: Fit.Cover, alignment: Alignment.BottomCenter }),
  });

  useEffect(() => {
    if (!rive || !inView) return;
    const input = rive.stateMachineInputs("State Machine 1")?.find((i) => i.name === "floor");
    if (!input) return;
    try {
      rive.play("State Machine 1");
    } catch {
      /* ignore */
    }
    const seq = [1, 2, 3, 2, 1];
    let i = 0;
    let cancelled = false;
    let timer: number;
    const step = () => {
      if (cancelled) return;
      input.value = seq[i];
      i = (i + 1) % seq.length;
      timer = window.setTimeout(step, 950);
    };
    step();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [rive, inView]);

  return (
    <div ref={ref} className="relative h-full w-full">
      {/* taller than the tile and pushed past the bottom edge (negative
          bottom) → the house sits lower than its own artboard bottom margin
          would otherwise allow, floors rise into the headroom and clip at
          the top */}
      <div className="absolute inset-x-0 -bottom-[40%] h-[150%]">
        <RiveComponent style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
