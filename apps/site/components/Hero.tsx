"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import gsap from "gsap";
import { BridgeSceneBoundary, BridgeFallback } from "./BridgeSceneBoundary";
import { VideoModal } from "./VideoModal";
import { isWebglAvailable } from "@/lib/webgl";
import { APP_URL, DOCS_URL } from "@/lib/site";

const BridgeScene = dynamic(() => import("./BridgeScene"), { ssr: false });

const VIDEO_URL = "https://youtu.be/30QIrW4ATC0";

/* a slim long arrow that nudges forward (paired with `animate-nudge`) */
function LongArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="26"
      height="10"
      viewBox="0 0 26 10"
      fill="none"
      aria-hidden
    >
      <path
        d="M0 5h23M19.5 1 24 5l-4.5 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayGlyph({ className = "" }: { className?: string }) {
  return (
    <span
      className={`grid h-5 w-5 place-items-center rounded-full bg-ink text-white ${className}`}
    >
      <svg width="7" height="8" viewBox="0 0 9 10" fill="currentColor" aria-hidden>
        <path d="M0 0v10l9-5z" />
      </svg>
    </span>
  );
}

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const [reduce, setReduce] = useState(false);
  const [webglOk, setWebglOk] = useState(true);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setWebglOk(isWebglAvailable());
  }, []);

  useLayoutEffect(() => {
    if (new URLSearchParams(window.location.search).has("still")) return; // freeze for capture
    // respect reduced-motion: skip the intro tween so .intro elements stay at
    // their natural (visible) state rather than animating in from opacity:0
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".intro", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        delay: 0.15,
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative min-h-[100svh] overflow-hidden">
      {/* base sky — a quiet wash so there's no flash before the 3D scene mounts.
          Once the bridge canvas loads it paints its own (opaque) sky over this. */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg,#84bde3 0%,#9ec8e0 32%,#c4dbe1 62%,#ece3cf 100%)",
        }}
      />

      {/* live 3D bridge + danfo + the PLINTH backdrop word behind the pylon —
          falls back to a static photo if WebGL is unavailable or the scene
          throws (unsupported GPU, driver crash, lost context). */}
      <div className="absolute inset-0 z-0">
        {webglOk ? (
          <BridgeSceneBoundary>
            <BridgeScene reduce={reduce} />
          </BridgeSceneBoundary>
        ) : (
          <BridgeFallback />
        )}
      </div>

      {/* ── nav ── plain links, no capsule; wordmark in the poster face ── */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 pt-6">
        <a href="#" className="flex items-center gap-2.5">
          <Image
            src="/plinth-logo.png"
            alt="Plinth"
            width={36}
            height={36}
            priority
            className="h-9 w-9 object-contain"
          />
          <span className="font-display text-2xl font-bold leading-none tracking-tight text-ink">
            Plinth
          </span>
        </a>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink/65 md:flex">
          {[
            { l: "Subscriptions", href: "#subscriptions" },
            { l: "Accounts", href: "#accounts" },
            { l: "Docs", href: DOCS_URL },
            { l: "Pricing", href: "#pricing" },
          ].map(({ l, href }) => (
            <a key={l} href={href} className="transition-colors hover:text-ink">
              {l}
            </a>
          ))}
        </nav>

        <a
          href={APP_URL}
          className="group inline-flex items-center gap-2.5 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bone shadow-sm transition hover:bg-ink-700"
        >
          Start building
          <LongArrow className="animate-nudge text-bone/90" />
        </a>
      </header>

      {/* ── copy (centered) ── */}
      <div className="pointer-events-none relative z-10 mx-auto max-w-6xl px-5 pt-16 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          {/* Option D — contained frame: "The base" tucks to the 'Y',
              "Stands on." tucks to the end of 'billing'. */}
          <h1 className="mx-auto w-max max-w-full font-display font-bold uppercase leading-[0.9] tracking-tight text-ink">
            <span className="intro block text-left text-[clamp(34px,5vw,64px)] tracking-[0.01em]">
              The base
            </span>
            {/* the big line: stretched ~12% taller than the face draws it, with a hairline
                stroke (em-scaled) fattening the 700 cut a touch beyond its native weight.
                Mobile stacks YOUR over BILLING; md+ restores the side-by-side frame. */}
            <span className="intro my-[0.05em] flex scale-y-[1.12] flex-col items-start [-webkit-text-stroke:0.012em_currentColor] md:flex-row md:items-baseline md:gap-[clamp(40px,9vw,150px)]">
              <span className="text-[clamp(74px,21vw,134px)] md:text-[clamp(60px,11vw,134px)]">
                Your
              </span>
              <span className="-mt-[0.1em] text-[clamp(74px,21vw,134px)] md:mt-0 md:text-[clamp(52px,9.5vw,116px)]">
                billing
              </span>
            </span>
            <span className="intro block text-right text-[clamp(34px,5vw,64px)] tracking-[0.01em]">
              Stands on.
            </span>
          </h1>

          <p className="intro mx-auto mt-7 max-w-md text-lg font-medium leading-relaxed text-ink/70">
            Recurring billing &amp; reconciliation, built for how Nigeria{" "}
            <span className="italic text-ink/80">actually</span> pays.
          </p>

          {/* ── CTAs (centered; stack on mobile) ── */}
          <div className="intro pointer-events-auto mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row md:mt-9">
            <a
              href={APP_URL}
              className="group inline-flex items-center gap-2.5 rounded-full bg-jade-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-jade-700"
            >
              Try Demo
              <LongArrow className="animate-nudge text-white/90" />
            </a>
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className="group inline-flex items-center gap-2.5 rounded-full border border-ink/10 bg-white/70 px-6 py-3.5 text-sm font-semibold text-ink backdrop-blur transition hover:bg-white"
            >
              <PlayGlyph className="transition-transform group-hover:scale-105" />
              Watch a video
            </button>
          </div>
        </div>
      </div>

      <VideoModal url={VIDEO_URL} open={videoOpen} onClose={() => setVideoOpen(false)} />
    </section>
  );
}
