import type { ComponentType } from "react";
import { Container, Section, SectionHeading } from "./ui";
import { Reveal } from "./Reveal";
import {
  SaasIcon,
  CoopIcon,
  SchoolIcon,
  StreamingIcon,
  HomeIcon,
  SparkIcon,
  ArrowRight,
  type IconProps,
} from "./icons";

type Case = {
  tag: string;
  title: string;
  body: string;
  Icon: ComponentType<IconProps>;
};

const cases: Case[] = [
  {
    tag: "SaaS",
    title: "Bill on cards, recover the failures",
    body: "A Lagos SaaS tool bills 400 customers monthly. Cards that fail get retried and recovered automatically.",
    Icon: SaasIcon,
  },
  {
    tag: "Cooperative · ajo / esusu",
    title: "Contributions that reconcile themselves",
    body: "A savings circle gives every member a dedicated account number. Contributions reconcile on their own; the ledger is transparent to everyone.",
    Icon: CoopIcon,
  },
  {
    tag: "School",
    title: "Fees per student, nothing lost",
    body: "Each student has their own account number. Underpayments are tracked, not lost in a spreadsheet.",
    Icon: SchoolIcon,
  },
  {
    tag: "Streaming",
    title: "Plans, upgrades, downgrades",
    body: "Monthly plans with upgrades, downgrades, and proration handled to the kobo.",
    Icon: StreamingIcon,
  },
  {
    tag: "Landlord",
    title: "Rent collection on autopilot",
    body: "A dedicated account per tenant; rent and service charges reconcile automatically each cycle.",
    Icon: HomeIcon,
  },
];

export default function UseCases() {
  return (
    <Section id="use-cases" className="bg-bone">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Who builds on Plinth"
            title="One base, many businesses."
            sub="If you collect money from the same customers on a schedule, Plinth carries the hard part."
          />
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {cases.map((c, i) => (
            <Reveal as="div" key={c.tag} delay={i * 70}>
              <div className="card-lift group flex h-full flex-col rounded-2xl border border-ink/10 bg-white p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-jade/10 text-jade-600 transition-colors duration-300 group-hover:bg-jade group-hover:text-white">
                  <c.Icon className="h-[22px] w-[22px]" />
                </span>
                <span className="mt-5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-jade-600">
                  {c.tag}
                </span>
                <h3 className="mt-2 font-display text-lg font-semibold text-ink">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{c.body}</p>
              </div>
            </Reveal>
          ))}

          {/* build-something-else — an invitation, not a case study */}
          <Reveal as="div" delay={cases.length * 70}>
            <div className="card-lift group flex h-full flex-col justify-between rounded-2xl border border-dashed border-ink/20 bg-white/50 p-6">
              <div>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink/[0.04] text-ink/60">
                  <SparkIcon className="h-[22px] w-[22px]" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-ink">
                  Building something else?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">
                  Presets for common cases, granular policy when you need it.
                </p>
              </div>
              <a
                href="#developers"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-jade transition-colors hover:text-jade-600"
              >
                See the API
                <ArrowRight className="arrow-slide h-4 w-4" />
              </a>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
