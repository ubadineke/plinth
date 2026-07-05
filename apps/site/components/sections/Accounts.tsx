import { Container, Section, SectionHeading } from "./ui";
import { Reveal } from "./Reveal";
import { ReconcileVisual } from "./ReconcileVisual";

const points = [
  {
    title: "A dedicated account number per customer",
    body: "Every customer gets their own virtual account — so money arrives already attributed.",
  },
  {
    title: "Automatic reconciliation",
    body: "Inbound transfers reconcile themselves: exact, partial, overpayment, or unidentified.",
  },
  {
    title: "Statements & a running ledger",
    body: "Per-customer statements and a transparent, double-entry ledger you can trust.",
  },
  {
    title: "Standalone-capable",
    body: "Use it on its own, or as the solid base beneath Plinth Subscriptions.",
  },
];

export default function Accounts() {
  return (
    <Section id="accounts" full className="bg-white">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Visual — reconciliation, shown as inbound transfers resolving live */}
          <Reveal className="order-last lg:order-first">
            <ReconcileVisual />
          </Reveal>

          <Reveal delay={120}>
            <div>
              <SectionHeading
                eyebrow="Plinth Accounts · the foundation"
                title="And the foundation it's built on."
                sub="Dedicated virtual accounts with automatic reconciliation — the base the billing engine runs on, useful on its own too."
              />
              <ul className="mt-8 space-y-5">
                {points.map((p) => (
                  <li key={p.title} className="flex gap-3">
                    <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-jade" />
                    <div>
                      <h3 className="font-display text-base font-semibold text-ink">{p.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink/65">{p.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
