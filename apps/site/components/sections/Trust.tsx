import { Container, Section, SectionHeading } from "./ui";
import { Reveal } from "./Reveal";
import { LedgerIcon, ShieldIcon, ReconcileIcon, RailsIcon, type IconProps } from "./icons";
import type { ComponentType } from "react";

type Pillar = { title: string; body: string; Icon: ComponentType<IconProps> };

const pillars: Pillar[] = [
  {
    title: "Double-entry ledger",
    body: "Every movement is recorded twice and balances exactly. Kobo-precise money math you can audit.",
    Icon: LedgerIcon,
  },
  {
    title: "Idempotent by design",
    body: "Retries and webhooks can't double-charge or double-count. Safe to call again.",
    Icon: ShieldIcon,
  },
  {
    title: "Every kobo reconciled",
    body: "Exact, partial, overpayment, unidentified — each inbound transfer is accounted for.",
    Icon: ReconcileIcon,
  },
  {
    title: "Built on Nomba's rails",
    body: "Settlement and movement run on regulated, production payment infrastructure.",
    Icon: RailsIcon,
  },
];

export default function Trust() {
  return (
    <Section id="trust" full className="bg-bone">
      <Container>
        <Reveal>
          <SectionHeading
            center
            eyebrow="Correctness & trust"
            title={
              <>
                Money-critical, <span className="text-jade">by default.</span>
              </>
            }
          />
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <Reveal as="div" key={p.title} delay={i * 70}>
              <div className="card-lift group h-full rounded-2xl border border-ink/10 bg-white p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-jade/10 text-jade-600 transition-colors duration-300 group-hover:bg-jade group-hover:text-white">
                  <p.Icon className="h-[22px] w-[22px]" />
                </span>
                <h3 className="mt-5 font-display text-base font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-ink/40">
          Security &amp; compliance details (encryption, access controls, certifications) —
          placeholder, to be finalised before launch.
        </p>
      </Container>
    </Section>
  );
}
