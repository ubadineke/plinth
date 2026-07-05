import { Container, Section, SectionHeading } from "./ui";
import { Reveal, REVEAL } from "./Reveal";

/* NOTE: figures below are illustrative placeholders — replace with real,
   sourced numbers before launch (do not ship fabricated stats). */
const stats = [
  { value: "~XX%", label: "Recurring card charges that fail" },
  { value: "~XX%", label: "Transfers that clear first try" },
  { value: "+XX%", label: "Revenue recovered by smart dunning" },
];

export default function NigeriaPays() {
  return (
    <Section id="nigeria" full className="bg-white">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <SectionHeading
              eyebrow="The differentiator"
              title={
                <>
                  Built for how <span className="text-jade">Nigeria actually pays.</span>
                </>
              }
              sub="Cards fail often here; bank transfer rarely does. Plinth is transfer-native — it defaults to the rail that works, and falls back to it when cards die."
            />
          </Reveal>

          {/* One charge, two rails — the card → transfer fallback, told visually. */}
          <Reveal delay={120}>
            <div className="rounded-3xl border border-ink/10 bg-bone p-6 sm:p-8">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-mid">
                One charge, two rails
              </div>

              <div className="mt-5 space-y-2.5">
                {/* card rail — often fails */}
                <div className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink/[0.05] text-ink/50">
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                        <rect x="3" y="6" width="18" height="12" rx="2" />
                        <path d="M3 10h18" strokeLinecap="round" />
                      </svg>
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-ink">Card charge</div>
                      <div className="text-xs text-ink/50">First attempt</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.05] px-3 py-1 text-xs font-medium text-ink/55">
                    Often fails
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                      <path d="m7 7 10 10M17 7 7 17" />
                    </svg>
                  </span>
                </div>

                {/* fallback connector */}
                <div className="flex items-center gap-2 pl-6 text-jade">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 5v14m0 0-5-5m5 5 5-5" />
                  </svg>
                  <span className="text-xs font-medium">falls back automatically</span>
                </div>

                {/* transfer rail — clears */}
                <div className="flex items-center justify-between rounded-2xl border border-jade/30 bg-jade-100/50 px-5 py-4 ring-1 ring-jade/10">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-jade/15 text-jade-600">
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4 7h11m0 0-3-3m3 3-3 3" />
                        <path d="M20 17H9m0 0 3-3m-3 3 3 3" />
                      </svg>
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-ink">Bank transfer</div>
                      <div className="text-xs text-ink/55">Dedicated account</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-jade px-3 py-1 text-xs font-semibold text-white">
                    Clears
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m5 12 4 4 10-10" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* the numbers */}
        <div className="mt-14 grid gap-4 sm:mt-16 sm:grid-cols-3 sm:gap-6">
          {stats.map((s, i) => (
            <Reveal as="div" key={s.label} delay={i * REVEAL.step}>
              <div className="card-lift h-full rounded-2xl border border-ink/10 bg-bone p-6 sm:p-7">
                <div className="font-mono text-4xl font-semibold tabular-nums tracking-tightest text-ink">
                  {s.value}
                </div>
                <div className="mt-3 h-px w-10 bg-jade/60" />
                <p className="mt-3 text-sm leading-relaxed text-ink/65">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink/40">
          * Illustrative placeholders — real, sourced figures at launch.
        </p>
      </Container>
    </Section>
  );
}
