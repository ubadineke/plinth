import { Container, Section, SectionHeading } from "./ui";

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
    <Section id="how-it-works" className="bg-bone">
      <Container>
        <SectionHeading
          center
          eyebrow="How it works"
          title="Three steps to recurring revenue."
        />
        <ol className="mt-10 grid gap-4 md:mt-14 md:grid-cols-3 md:gap-6">
          {steps.map((s) => (
            <li key={s.n} className="relative rounded-2xl border border-ink/10 bg-white p-6 md:p-7">
              <span className="font-mono text-sm font-semibold text-jade">{s.n}</span>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{s.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
