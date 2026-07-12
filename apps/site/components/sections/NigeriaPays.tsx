import { Container, Section, SectionHeading } from "./ui";
import { Reveal, REVEAL } from "./Reveal";
import { CountUp } from "./CountUp";
import { LottieOnce } from "./BentoMedia";

const stats = [
  { value: 62, prefix: "", suffix: "%", label: "Recurring card charges that fail" },
  { value: 91, prefix: "", suffix: "%", label: "Transfers that clear first try" },
  { value: 34, prefix: "+", suffix: "%", label: "Revenue recovered by smart dunning" },
];

export default function NigeriaPays() {
  return (
    <Section id="nigeria" pin className="bg-white">
      <Container>
        <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-16">
          <Reveal className="lg:order-first">
            <SectionHeading
              eyebrow="The differentiator"
              title={
                <>
                  Built for how <span className="text-jade">Nigeria actually pays.</span>
                </>
              }
              sub="Cards fail often here; bank transfer rarely does. Plinth is transfer-native, so it defaults to the rail that works and falls back to it when cards die."
            />
          </Reveal>

          {/* card → transfer fallback, told as a motion illustration */}
          <Reveal delay={120}>
            <div className="mx-auto aspect-square w-full max-w-[300px] lg:ml-auto lg:mr-0">
              <LottieOnce src="/animations/bank-card-animation.lottie" />
            </div>
          </Reveal>
        </div>

        {/* the numbers: no container, just big confident figures */}
        <div className="mt-8 grid gap-8 sm:mt-10 sm:grid-cols-3 sm:gap-10">
          {stats.map((s, i) => (
            <Reveal as="div" key={s.label} delay={i * REVEAL.step}>
              <CountUp
                value={s.value}
                prefix={s.prefix}
                suffix={s.suffix}
                className="font-display text-6xl font-bold tabular-nums tracking-tightest text-ink md:text-7xl"
              />
              <div className="mt-4 h-px w-10 bg-jade/60" />
              <p className="mt-4 text-sm leading-relaxed text-ink/65">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
