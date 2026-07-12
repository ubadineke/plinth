import Image from "next/image";
import { Container, Section } from "./ui";
import { Reveal } from "./Reveal";
import { SparkIcon, ArrowRight } from "./icons";
import { LottieOnce, RiveFillOnce, HouseRive } from "./BentoMedia";

/* ──────────────────────────────────────────────────────────────
   "One base, many businesses" as a bento board — each use-case
   tile carries its own live asset (Rive / Lottie / screenshot /
   photo). Motion plays once as each tile is first seen so the
   board reads alive without a wall of competing loops.
   ────────────────────────────────────────────────────────────── */

function TileLabel({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`font-mono text-[10px] font-medium uppercase tracking-[0.12em] ${
        dark ? "text-white/90" : "text-jade-600"
      }`}
    >
      {children}
    </span>
  );
}

export default function UseCases() {
  return (
    <Section id="use-cases" stage dwell className="bg-bone">
      <Container>
        <div className="grid auto-rows-[164px] grid-cols-2 gap-3 md:auto-rows-[150px] md:grid-cols-4 md:gap-4">
          {/* A — title (jade anchor) */}
          <Reveal className="col-span-2 row-span-2 md:col-start-1 md:row-start-1">
            <div className="flex h-full flex-col justify-between rounded-2xl bg-jade-600 p-6 text-white">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-white/90">
                Who builds on Plinth
              </span>
              <div>
                <h2 className="font-display text-3xl font-semibold leading-[1.04] tracking-tight md:text-[34px]">
                  One base,
                  <br />
                  many businesses.
                </h2>
                <p className="mt-3 max-w-[26ch] text-sm leading-relaxed text-white/95">
                  If you collect on a schedule, Plinth carries the hard part.
                </p>
              </div>
            </div>
          </Reveal>

          {/* B — SaaS: a macOS-window dashboard screenshot peeking up from the bottom */}
          <Reveal delay={70} className="col-span-2 md:col-start-3 md:row-start-1">
            <div className="relative h-full overflow-hidden rounded-2xl border border-ink/12 bg-ink/[0.03]">
              <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
                <TileLabel>SaaS</TileLabel>
                <span className="rounded-full bg-white/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink/60 ring-1 ring-ink/10">
                  Product UI
                </span>
              </div>
              <div className="pointer-events-none absolute right-3 top-[44%] w-[80%] overflow-hidden rounded-t-lg border border-ink/15 bg-white shadow-[0_-14px_36px_-20px_rgba(20,24,28,0.4)]">
                <div className="flex items-center gap-1 border-b border-ink/10 bg-ink/[0.04] px-2 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink/15" />
                  <span className="h-1.5 w-1.5 rounded-full bg-ink/15" />
                  <span className="h-1.5 w-1.5 rounded-full bg-ink/15" />
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/bento/dashboard.png" alt="" className="block w-full" />
              </div>
            </div>
          </Reveal>

          {/* C — Streaming: square Lottie beside the copy (the tile is wider than the art) */}
          <Reveal delay={140} className="col-span-2 md:col-start-3 md:row-start-2">
            <div className="flex h-full items-center gap-4 rounded-2xl border border-ink/12 bg-ink/[0.03] p-4">
              <div className="aspect-square h-full shrink-0">
                <LottieOnce src="/animations/streaming.lottie" />
              </div>
              <div className="min-w-0">
                <TileLabel>Streaming</TileLabel>
                <p className="mt-2 text-[12px] leading-snug text-ink/60">
                  Plan picker: Basic, Pro, Family. Upgrades mid-flow, prorated to the kobo.
                </p>
              </div>
            </div>
          </Reveal>

          {/* D — Cooperative / ajo / esusu (tall) */}
          <Reveal delay={210} className="col-span-1 row-span-2 md:col-start-1 md:row-start-3">
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-jade/30 bg-jade/[0.06] p-4">
              <TileLabel>Cooperative · ajo / esusu</TileLabel>
              <div className="relative min-h-0 flex-1">
                <LottieOnce src="/animations/cooperative.lottie" />
              </div>
            </div>
          </Reveal>

          {/* E — School: Rive "Pop up", fills the tile */}
          <Reveal delay={280} className="col-span-1 md:col-start-2 md:row-start-3">
            <div className="relative h-full overflow-hidden rounded-2xl border border-ink/12 bg-ink/[0.03]">
              <RiveFillOnce src="/animations/school.riv" stateMachine="State Machine 1" fit="cover" />
              <span className="pointer-events-none absolute bottom-3 left-4 z-10">
                <TileLabel>School</TileLabel>
              </span>
            </div>
          </Reveal>

          {/* F — Landlord: house.riv, floors build 1 to 3 then back (top clips) */}
          <Reveal delay={350} className="col-span-1 md:col-start-2 md:row-start-4">
            <div className="relative h-full overflow-hidden rounded-2xl border border-ink/12 bg-ink/[0.03]">
              <HouseRive src="/animations/house.riv" />
              <span className="pointer-events-none absolute bottom-3 left-4 z-10">
                <TileLabel>Landlord</TileLabel>
              </span>
            </div>
          </Reveal>

          {/* G — Plinth mark (real asset, no text) */}
          <Reveal delay={280} className="col-span-1 md:col-start-3 md:row-start-3">
            <div className="relative flex h-full items-center justify-center overflow-hidden rounded-2xl bg-ink-900">
              <div aria-hidden className="absolute -inset-6 bg-jade/10 blur-2xl" />
              <Image
                src="/plinth-logo.png"
                alt=""
                aria-hidden
                width={96}
                height={96}
                className="relative w-24 select-none"
              />
            </div>
          </Reveal>

          {/* H — build-something-else CTA */}
          <Reveal delay={350} className="col-span-1 md:col-start-3 md:row-start-4">
            <a
              href="#developers"
              className="group flex h-full flex-col justify-between rounded-2xl border border-ink/12 bg-white p-5 transition-colors hover:border-jade/40"
            >
              <SparkIcon className="h-6 w-6 text-jade-600" />
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-jade-600">
                Build something else
                <ArrowRight className="arrow-slide h-4 w-4" />
              </span>
            </a>
          </Reveal>

          {/* I — Any business: hand-drawn business doodle (line art on white),
              rotated to portrait so it fits the tall tile. Plain inline
              styles, not a Tailwind arbitrary background utility class —
              that wasn't being picked up (image rendered at native size and
              got clipped by overflow-hidden instead of scaling to fit).
              background-size: 100% auto fits the image to the tile's width
              exactly (height scales proportionally and crops top/bottom via
              overflow-hidden) — a "fit width" background-size has no native
              CSS keyword, this is the standard way to express it. */}
          <Reveal delay={210} className="col-span-2 row-span-2 md:col-span-1 md:col-start-4 md:row-start-3">
            <div
              role="img"
              aria-label="Business ideas — charts, gears and growth, hand-drawn"
              className="relative h-full overflow-hidden rounded-2xl border border-ink/12 bg-white"
              style={{
                backgroundImage: "url('/bento/any-business.jpg')",
                backgroundSize: "100% auto",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              <span className="absolute left-3 top-3 z-10 rounded-full bg-white/85 px-2.5 py-1 ring-1 ring-ink/10">
                <TileLabel>Any business</TileLabel>
              </span>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
