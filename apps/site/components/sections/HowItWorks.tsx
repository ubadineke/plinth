import { Container, Section, SectionHeading } from "./ui";
import { Reveal, REVEAL } from "./Reveal";

const steps = [
  {
    n: "01",
    title: "Create a plan",
    body: "Define pricing and interval — e.g. ₦5,000/month. Presets or granular policy, your call.",
  },
  {
    n: "02",
    title: "Subscribe a customer",
    body: "Attach a customer to the plan. They get a dedicated account; cards work too.",
  },
  {
    n: "03",
    title: "Plinth does the rest",
    body: "It collects, retries, reconciles, and tells your product exactly who has access.",
  },
];

export default function HowItWorks() {
  return (
    <Section id="how-it-works" full className="bg-bone">
      <Container>
        <Reveal>
          <SectionHeading
            center
            eyebrow="How it works"
            title={
              <>
                Three steps to <span className="text-jade">recurring revenue.</span>
              </>
            }
          />
        </Reveal>

        <div className="relative mt-16 md:mt-20">
          {/* the process line — a hairline the nodes sit on (desktop only) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[46px] hidden md:block"
          >
            <div className="mx-auto h-px max-w-3xl bg-gradient-to-r from-transparent via-ink/15 to-transparent" />
          </div>

          <ol className="grid gap-12 md:grid-cols-3 md:gap-6">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * REVEAL.step} className="group relative">
                <div className="flex flex-col items-center text-center md:px-5">
                  {/* node */}
                  <div className="relative mb-6">
                    <span className="relative z-10 grid h-[92px] w-[92px] place-items-center rounded-full border border-ink/10 bg-white transition-colors duration-300 group-hover:border-jade/40">
                      <span className="font-display text-3xl font-semibold tracking-tight text-ink transition-colors duration-300 group-hover:text-jade">
                        {s.n}
                      </span>
                    </span>
                    {/* jade tick marking the active node */}
                    <span className="absolute -right-0.5 -top-0.5 z-20 grid h-6 w-6 place-items-center rounded-full bg-jade text-white shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 max-w-[24ch] text-sm leading-relaxed text-ink/65">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </Section>
  );
}
