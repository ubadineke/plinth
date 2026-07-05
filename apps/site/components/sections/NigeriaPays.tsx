import { Container, Section, SectionHeading } from "./ui";

/* NOTE: figures below are illustrative placeholders — replace with real,
   sourced numbers before launch (do not ship fabricated stats). */
const stats = [
  { value: "~XX%", label: "Recurring card charges that fail" },
  { value: "~XX%", label: "Transfers that clear first try" },
  { value: "+XX%", label: "Revenue recovered by smart dunning" },
];

export default function NigeriaPays() {
  return (
    <Section id="nigeria" className="bg-white">
      <Container>
        <SectionHeading
          eyebrow="The differentiator"
          title="Built for how Nigeria actually pays."
          sub="Cards fail often here; bank transfer rarely does. Plinth is transfer-native — it defaults to the rail that works, and falls back to it when cards die."
        />
        <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-ink/10 bg-bone p-6 sm:p-7">
              <div className="font-mono tabular-nums text-4xl font-semibold tracking-tightest text-ink">{s.value}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink/40">* Illustrative placeholders — real, sourced figures at launch.</p>
      </Container>
    </Section>
  );
}
