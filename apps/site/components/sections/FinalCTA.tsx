import { Container, Section } from "./ui";
import { Reveal } from "./Reveal";
import { ArrowRight } from "./icons";

export default function FinalCTA() {
  return (
    <Section id="start" full className="bg-bone">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-16 text-center md:px-12 md:py-28">
          {/* the plinth itself — big on the background. The mark IS a column on a
              base, so it doubles as the section's meaning: your product stands on it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/plinth-logo.png"
            alt=""
            aria-hidden
            loading="lazy"
            className="pointer-events-none absolute left-1/2 top-1/2 w-[min(640px,108%)] max-w-none -translate-x-1/2 -translate-y-[46%] select-none opacity-70"
          />

          {/* atmosphere — a slow jade aurora, layered under the mark's own glow */}
          <div
            aria-hidden
            className="cta-aurora pointer-events-none absolute -left-24 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-jade/20 blur-[130px]"
          />

          {/* faint fluting — like the grooves down a column shaft */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 64px)",
            }}
          />

          {/* legibility scrim — keeps the copy crisp over the mark */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-900/70 via-ink-900/45 to-ink-900/80"
          />

          <Reveal className="relative">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-jade-400">
              <span className="h-1 w-1 rounded-full bg-jade-400" />
              Get started
            </span>
            <h2 className="mx-auto mt-5 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tightest text-bone drop-shadow-[0_2px_16px_rgba(7,7,7,0.6)] md:text-5xl">
              Build on Plinth.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-bone/75 drop-shadow-[0_1px_10px_rgba(7,7,7,0.5)]">
              Your product is the column. Plinth is the base it stands on — recurring payments, on
              solid ground.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-jade px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-jade-600 sm:w-auto"
              >
                Start building
                <ArrowRight className="arrow-slide h-4 w-4" />
              </a>
              <a
                href="#developers"
                className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-bone backdrop-blur transition hover:bg-white/10 sm:w-auto"
              >
                Read the docs
              </a>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
