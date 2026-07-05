"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import type { BronzeCfg, HoverInfo, EditInfo } from "./BronzeCanvas";
import { Container, Section, SectionHeading, Eyebrow, PrimaryButton } from "./ui";
import { LottieBg, RiveBg } from "./CardMedia";
import Problem from "./Problem";

const BronzeCanvas = dynamic(() => import("./BronzeCanvas"), { ssr: false });

const features = [
  {
    title: "Transfer-native dunning",
    body: "Smart, payday-aware retries recover payments that fail — and most card charges in Nigeria do.",
  },
  {
    title: "Cards, fully supported",
    body: "A complete, conventional card experience too — first-class, not an afterthought.",
  },
  {
    title: "Proration & plan changes",
    body: "Upgrades, downgrades, prepaid and postpaid billing, prorated to the kobo.",
  },
  {
    title: "Entitlements API",
    body: "Tells your product who currently has access, so you can gate features cleanly.",
  },
];

// the three problem beats — shown centred on the dark stage before the bronze
// pieces take over. Same content as the static Problem section, compact layout.
const problems = [
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

// All eight pieces in one scene. `name`/`desc` drive the hover tooltip (lore on how
// each was lost). base/scale/rot0 are the placement (hand-set in edit mode); move/aside
// drive the parallax drift + the reveal "parting" so the centred content lands clear.
const MODELS: BronzeCfg[] = [
  {
    src: "/models/benin-bronze-3-3d.glb",
    name: "Benin Bronze Mask",
    desc: "Court mask of Benin — looted in the 1897 Punitive Expedition, still catalogued under another flag.",
    base: [-1.91, -0.6, -3.03],
    scale: 1.8,
    rot0: [3.14, -1.14, 3.08],
    move: [-0.2, 0.3], // deep: gentle drift
    rotDelta: [0, 0.1, 0],
    aside: [-1.3, -1.5], // parts down-left
  },
  {
    src: "/models/benin-bronze-2-3d.glb",
    name: "Benin Bronze Head",
    desc: "Memorial head of an Oba — taken from the palace in 1897, scattered through foreign museums.",
    base: [0.61, 0.82, -2.2],
    scale: 1.3,
    rot0: [0.05, -1.55, 0],
    move: [0.2, 1.0],
    rotDelta: [0.03, 0.12, 0],
    aside: [0.1, 0.9], // rises out the top
  },
  {
    src: "/models/igbo-ukwu-castings-3d.glb",
    name: "Igbo-Ukwu Casting",
    desc: "9th-century Igbo bronzework — unearthed, dispersed, and rarely seen on home soil.",
    base: [2.62, 1.7, -1.33],
    scale: 1.6,
    rot0: [0, -1.13, -0.05],
    move: [0.3, 0.7],
    rotDelta: [0.03, 0.12, 0],
    aside: [0.8, 0.5], // parts up-right
  },
  {
    src: "/models/nok-terracottas-3d.glb",
    name: "Nok Terracotta",
    desc: "Two thousand years old — pulled from the earth that made it and traded away.",
    base: [-5.21, 0.2, -2],
    scale: 1.5,
    rot0: [0, 0.22, -0.05],
    move: [-0.5, 0.3], // already at the left edge → drifts off
    rotDelta: [0, 0.1, 0],
    aside: [-0.6, 0.1],
  },
  {
    src: "/models/ife-bronze-head-3d.glb",
    name: "Ife Bronze Head",
    desc: "Yoruba royal head, cast c. 14th century — carried overseas for ‘study’, still far from Ife.",
    base: [3.23, 0.47, 1.4],
    scale: 1.75,
    rot0: [3.14, -0.87, 3.09],
    move: [0.6, 0.8], // foreground: strong parallax
    rotDelta: [0.04, 0.18, 0],
    aside: [1.1, 0.4], // parts off to the right
  },
  {
    src: "/models/benin-bronze-4-3d.glb",
    name: "Benin Leopard Mask",
    desc: "A ceremonial leopard mask — sold at auction, lost to the festival it was made for.",
    base: [-2.09, 1.53, 0.9],
    scale: 1.45,
    rot0: [0.04, -1.55, 0.03],
    move: [-0.5, 1.0],
    rotDelta: [0.04, 0.16, 0],
    aside: [-1.1, 0.8], // parts up-left
  },
  {
    src: "/models/benin-leopard-3d.glb",
    name: "Benin Bronze Leopard",
    desc: "Brass leopard, emblem of the Oba’s power — one of a royal pair, split between continents.",
    base: [-1.41, -2.25, 1.1],
    scale: 1.7,
    rot0: [0.05, 1.45, 0],
    move: [-0.2, -0.3], // already low → exits downward
    rotDelta: [0.02, 0.12, 0],
    aside: [-1.0, -1.1], // parts down-left, below the content
  },
  {
    src: "/models/nok-terracottas-1-3d.glb",
    name: "Nok Terracotta Head",
    desc: "A Nok face — moved through grey markets, far from the Nigerian ground it came from.",
    base: [2.65, -1.48, 0.8],
    scale: 1.4,
    rot0: [0.05, -1.55, 0],
    move: [0.4, -0.3],
    rotDelta: [0.04, 0.16, 0],
    aside: [1.1, -1.1], // parts down-right
  },
];

/* ── scroll choreography — a single pinned "act", driven by one progress p ∈ [0,1] ──
   The bronze scene bridges the problem and the subscriptions reveal so the two never
   just cut. In order:
     1. 0.00–0.16  the problem sits on the dark stage and is read
     2. 0.16–0.30  the bronze pieces FADE IN, at rest, over the problem
     3. 0.30–0.42  the problem copy FADES OUT, leaving only the pieces
     4. 0.42–0.68  the pieces do their OUTRO — parting to reveal position — dark → bone
     5. 0.64–0.96  the subscriptions copy RISES in the cleared centre                */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

function ImmersiveStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const boneRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const subsRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const apiRef = useRef<(() => void) | null>(null);
  const cardsPlayed = useRef(false);
  const [active, setActive] = useState(false);
  const [edit, setEdit] = useState(false);
  const [tip, setTip] = useState<HoverInfo>(null);
  const [info, setInfo] = useState<EditInfo>(null);

  const onHover = useCallback((h: HoverInfo) => setTip(h), []);
  const onInfo = useCallback((i: EditInfo) => setInfo(i), []);

  // Shift+E toggles edit mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        setEdit((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // entering edit mode: pin the section at p=0 and lock scroll so pieces hold still
  useEffect(() => {
    if (!edit) {
      document.body.style.overflow = "";
      return;
    }
    const section = sectionRef.current;
    if (section) {
      const top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.round(top));
    }
    progress.current = 0;
    setTip(null);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [edit]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      rootMargin: "900px 0px",
    });
    io.observe(section);

    let raf = 0;
    const update = () => {
      raf = 0;
      const total = section.offsetHeight - window.innerHeight;
      const rectTop = section.getBoundingClientRect().top;
      const p = clamp01(-rectTop / total);

      // slide the (pre-hidden) problem cards in from the left, once the beat is in view
      if (!cardsPlayed.current && !edit && rectTop <= window.innerHeight * 0.2) {
        cardsPlayed.current = true;
        gsap.to("[data-problem-card]", {
          x: 0,
          opacity: 1,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.18,
          overwrite: "auto",
        });
      }

      // choreography values for this frame
      const canvasO = range(p, 0.16, 0.3); // pieces fade in
      const problemO = 1 - range(p, 0.3, 0.42); // problem fades out
      const modelP = range(p, 0.42, 0.68); // pieces part to reveal position
      const boneO = range(p, 0.44, 0.64); // stage brightens dark → bone

      // edit mode freezes the act: pieces at rest, visible, on the dark stage
      progress.current = edit ? 0 : modelP;

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.opacity = edit ? "1" : String(canvasO);
        canvas.style.pointerEvents = edit || canvasO > 0.9 ? "auto" : "none";
      }
      const bone = boneRef.current;
      if (bone) bone.style.opacity = edit ? "0" : String(boneO);

      const problem = problemRef.current;
      if (problem) {
        const o = edit ? 0 : problemO;
        problem.style.opacity = String(o);
        problem.style.transform = `translateY(${(1 - o) * -20}px)`;
        // blur the copy as the bronze pieces fade in over it, so focus pulls to the
        // models and the transition — they sit clearly forward, copy recedes behind
        problem.style.filter = `blur(${(edit ? 0 : canvasO * 5).toFixed(2)}px)`;
      }

      const subs = subsRef.current;
      if (subs) {
        subs.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
          const s = parseFloat(el.dataset.s || "0");
          const e = parseFloat(el.dataset.e || "1");
          const r = edit ? 0 : range(p, s, e);
          el.style.opacity = String(r);
          el.style.transform = `translateY(${(1 - r) * 24}px)`;
        });
      }

      const hint = hintRef.current;
      if (hint) hint.style.opacity = edit ? "0" : String(Math.max(0, 1 - p / 0.14));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [edit]);

  // pre-hide the problem cards off to the left; the scroll loop slides them in on cue
  useEffect(() => {
    gsap.set("[data-problem-card]", { x: -110, opacity: 0 });
  }, []);

  return (
    <section id="problem" ref={sectionRef} className="relative bg-ink" style={{ height: "500vh" }}>
      {/* nav anchor — "Subscriptions" lands on the settled reveal (p ≈ 0.96) */}
      <div id="subscriptions" aria-hidden className="absolute left-0 h-px w-px" style={{ top: "77%" }} />

      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        {/* stage background: dark base, bone brightening in as the pieces part */}
        <div className="absolute inset-0 z-0 bg-ink" />
        <div ref={boneRef} className="absolute inset-0 z-0 bg-bone" style={{ opacity: 0 }} />

        {/* ── problem beat — centred on the dark stage, fades out under the pieces ── */}
        <div
          ref={problemRef}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-5"
        >
          <div className="mx-auto w-full max-w-5xl">
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-bone/40">
              <span className="h-1 w-1 rounded-full bg-jade" />
              The problem
            </span>
            <h2 className="mt-4 max-w-3xl font-display text-3xl font-semibold leading-[1.05] tracking-tight text-bone md:text-4xl">
              Recurring payments in Nigeria are leaky and manual.
            </h2>
            <div className="mt-8 grid grid-cols-3 gap-5">
              {problems.map((c) => (
                <div key={c.title} data-problem-card>
                  <div
                    className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]"
                    style={{ height: "clamp(150px,26vh,290px)" }}
                  >
                    <span className="absolute left-4 top-4 z-10 font-mono text-sm font-medium text-bone/30">
                      {c.n}
                    </span>
                    <div className="absolute inset-0">{c.media}</div>
                    <span className="absolute bottom-4 left-4 z-10 font-display text-lg font-semibold text-bone">
                      {c.title}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-bone/60">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── bronze scene — fades in over the problem, then parts to reveal ── */}
        {active && (
          <div ref={canvasRef} className="absolute inset-0 z-20" style={{ opacity: 0 }}>
            <BronzeCanvas
              models={MODELS}
              progress={progress}
              edit={edit}
              onHover={onHover}
              onInfo={onInfo}
              apiRef={apiRef}
            />
          </div>
        )}

        {/* ── subscriptions beat — rises in the cleared centre, on the bone stage ── */}
        <div
          ref={subsRef}
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-5"
        >
          <div className="mx-auto w-full max-w-3xl text-center">
            <div data-reveal data-s="0.64" data-e="0.72" style={{ opacity: 0, transform: "translateY(24px)" }}>
              <Eyebrow>Plinth Subscriptions · the billing engine</Eyebrow>
              <h2 className="mt-4 font-display text-[clamp(36px,5vw,64px)] font-semibold leading-[1.02] tracking-tight text-ink">
                Billing that recovers what others lose.
              </h2>
            </div>
            <p
              data-reveal
              data-s="0.68"
              data-e="0.76"
              className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink/65"
              style={{ opacity: 0, transform: "translateY(24px)" }}
            >
              A managed recurring-billing layer on Nigerian rails. Plinth collects, retries, and
              reconciles — so revenue actually lands.
            </p>

            <div className="mx-auto mt-10 grid max-w-2xl gap-x-10 gap-y-8 sm:grid-cols-2">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  data-reveal
                  data-s={(0.72 + i * 0.03).toFixed(2)}
                  data-e={(0.8 + i * 0.03).toFixed(2)}
                  className="border-l-2 border-ink/10 pl-6 text-left"
                  style={{ opacity: 0, transform: "translateY(24px)" }}
                >
                  <h3 className="font-display text-base font-semibold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">{f.body}</p>
                </div>
              ))}
            </div>

            <div
              data-reveal
              data-s="0.88"
              data-e="0.96"
              className="pointer-events-auto mt-9"
              style={{ opacity: 0, transform: "translateY(24px)" }}
            >
              <PrimaryButton href="#start">Explore the billing engine</PrimaryButton>
            </div>
          </div>
        </div>

        {/* scroll affordance */}
        <div
          ref={hintRef}
          className="pointer-events-none absolute bottom-7 left-1/2 z-40 -translate-x-1/2 font-mono text-[11px] uppercase tracking-[0.3em] text-bone/40"
        >
          Scroll to explore
        </div>

        {/* hover tooltip — name + lore */}
        {tip && !edit && (
          <div
            className="pointer-events-none fixed z-40 max-w-[260px] rounded-xl border border-ink/10 bg-ink/95 px-3.5 py-2.5 text-bone shadow-lg backdrop-blur"
            style={{ left: 0, top: 0, transform: `translate(${tip.x + 18}px, ${tip.y + 18}px)` }}
          >
            <div className="font-display text-sm font-semibold">{tip.name}</div>
            <div className="mt-1 text-xs leading-relaxed text-bone/65">{tip.desc}</div>
          </div>
        )}

        {/* edit-mode HUD */}
        {edit && (
          <div className="pointer-events-none fixed left-4 top-4 z-40 max-w-xs rounded-xl border border-jade/30 bg-ink/95 px-4 py-3 font-mono text-[11px] leading-relaxed text-bone shadow-lg">
            <div className="font-semibold tracking-wide text-jade-400">EDIT MODE — Shift+E to exit</div>
            <div className="mt-1.5 text-bone/70">
              Click a piece · drag the gizmo to place it
              <br />
              <span className="text-bone/90">G</span> move · <span className="text-bone/90">R</span> rotate ·{" "}
              <span className="text-bone/90">S</span> scale · arrows nudge
            </div>
            {info ? (
              <div className="mt-2 border-t border-bone/15 pt-2 text-bone/85">
                <span className="text-jade-400">{info.name}</span>
                <br />
                base [{info.x}, {info.y}, {info.z}] · scale {info.scale} · rotY {info.rotY}
              </div>
            ) : (
              <div className="mt-2 border-t border-bone/15 pt-2 text-bone/50">Select a piece to begin.</div>
            )}
            <button
              type="button"
              onClick={() => apiRef.current?.()}
              className="pointer-events-auto mt-3 w-full rounded-md bg-jade px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-white transition hover:bg-jade-600"
            >
              Log all placements to console
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── static fallback (touch / mobile / reduced-motion / SSR) ──
   No pinned choreography: the full-height Problem section, then the subscriptions grid. */
function StaticSubscriptions() {
  return (
    <Section id="subscriptions" className="bg-bone">
      <Container>
        <SectionHeading
          eyebrow="Plinth Subscriptions · the billing engine"
          title="Billing that recovers what others lose."
          sub="A managed recurring-billing layer on Nigerian rails. Plinth collects, retries, and reconciles — so revenue actually lands."
        />
        <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="border-l-2 border-ink/10 pl-6">
              <h3 className="font-display text-base font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <PrimaryButton href="#start">Explore the billing engine</PrimaryButton>
        </div>
      </Container>
    </Section>
  );
}

export default function Subscriptions() {
  const [immersive, setImmersive] = useState(false);

  useEffect(() => {
    const ok =
      window.matchMedia("(min-width:768px)").matches &&
      window.matchMedia("(pointer:fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setImmersive(ok);

    if (ok) {
      const w = window as typeof window & { requestIdleCallback?: (cb: () => void) => number };
      const run = () => void import("./BronzeCanvas");
      if (w.requestIdleCallback) w.requestIdleCallback(run);
      else setTimeout(run, 1200);
    }
  }, []);

  // Immersive desktop runs the whole Problem → Subscriptions act as one pinned scene.
  // Everything else falls back to the two sections stacked normally.
  return immersive ? (
    <ImmersiveStory />
  ) : (
    <>
      <Problem />
      <StaticSubscriptions />
    </>
  );
}
