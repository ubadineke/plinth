import { Container, Section } from "./ui";

export default function FinalCTA() {
  return (
    <Section id="start" className="bg-bone">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-16 text-center md:px-12 md:py-20">
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tightest text-bone md:text-5xl">
            Build on Plinth.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-bone/70">
            Your product is the column. Plinth is the base it stands on — recurring payments, on solid ground.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <a
              href="#"
              className="inline-flex w-full items-center justify-center rounded-full bg-jade px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-jade-600 sm:w-auto"
            >
              Start building
            </a>
            <a
              href="#developers"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-bone backdrop-blur transition hover:bg-white/10 sm:w-auto"
            >
              Read the docs →
            </a>
          </div>
        </div>
      </Container>
    </Section>
  );
}
