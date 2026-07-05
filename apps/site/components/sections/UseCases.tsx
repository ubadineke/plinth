import { Container, Section, SectionHeading } from "./ui";

const cases = [
  {
    tag: "SaaS",
    title: "Bill on cards, recover the failures",
    body: "A Lagos SaaS tool bills 400 customers monthly. Cards that fail get retried and recovered automatically.",
  },
  {
    tag: "Cooperative · ajo / esusu",
    title: "Contributions that reconcile themselves",
    body: "A savings circle gives every member a dedicated account number. Contributions reconcile on their own; the ledger is transparent to everyone.",
  },
  {
    tag: "School",
    title: "Fees per student, nothing lost",
    body: "Each student has their own account number. Underpayments are tracked, not lost in a spreadsheet.",
  },
  {
    tag: "Streaming",
    title: "Plans, upgrades, downgrades",
    body: "Monthly plans with upgrades, downgrades, and proration handled to the kobo.",
  },
  {
    tag: "Landlord",
    title: "Rent collection on autopilot",
    body: "A dedicated account per tenant; rent and service charges reconcile automatically each cycle.",
  },
];

export default function UseCases() {
  return (
    <Section id="use-cases" className="bg-bone">
      <Container>
        <SectionHeading
          eyebrow="Who builds on Plinth"
          title="One base, many businesses."
          sub="If you collect money from the same customers on a schedule, Plinth carries the hard part."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {cases.map((c) => (
            <div key={c.tag} className="flex flex-col rounded-2xl border border-ink/10 bg-white p-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-jade">{c.tag}</span>
              <h3 className="mt-3 font-display text-lg font-semibold text-ink">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{c.body}</p>
            </div>
          ))}
          <div className="flex flex-col justify-center rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6">
            <h3 className="font-display text-lg font-semibold text-ink">Building something else?</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">
              Presets for common cases, granular policy when you need it.
            </p>
            <a href="#developers" className="-mb-2 mt-2 pb-2 pt-2 text-sm font-semibold text-jade hover:text-jade-600">
              See the API →
            </a>
          </div>
        </div>
      </Container>
    </Section>
  );
}
