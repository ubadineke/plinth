import { Container, Section, SectionHeading, PrimaryButton, SecondaryButton } from "./ui";
import { Reveal } from "./Reveal";
import { CheckIcon } from "./icons";

/* Pricing structure templated; actual amounts are finalised at launch
   (usage-based infra pricing — no fabricated numbers shipped). */
const tiers = [
  {
    name: "Sandbox",
    price: "Free",
    note: "Build and test end-to-end",
    features: ["Full API & SDK access", "Test mode", "Webhooks", "Community support"],
    cta: "Start building",
    highlight: false,
  },
  {
    name: "Growth",
    price: "Usage-based",
    note: "Go live and scale",
    features: [
      "Everything in Sandbox",
      "Live transfers & cards",
      "Smart, payday-aware dunning",
      "Reconciliation & ledger",
      "Email support",
    ],
    cta: "Start building",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "Volume, controls & SLAs",
    features: ["Everything in Growth", "Volume pricing", "Dedicated support & SLA", "Custom policy & onboarding"],
    cta: "Talk to sales",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <Section id="pricing" full className="bg-white">
      <Container>
        <Reveal>
          <SectionHeading
            center
            eyebrow="Pricing"
            title={
              <>
                Start free. <span className="text-jade">Pay as you grow.</span>
              </>
            }
            sub="Transparent, usage-based pricing — final rates published at launch."
            className="mx-auto"
          />
        </Reveal>

        <div className="mt-14 grid items-center gap-6 lg:grid-cols-3">
          {tiers.map((t, i) => (
            <Reveal as="div" key={t.name} delay={i * 90}>
              <div
                className={`relative ${t.highlight ? "lg:-my-3 lg:py-3" : ""}`}
              >
                {/* soft jade glow behind the featured tier */}
                {t.highlight && (
                  <div
                    aria-hidden
                    className="absolute -inset-3 -z-10 rounded-[30px] bg-jade/15 blur-3xl"
                  />
                )}
                <div
                  className={`flex h-full flex-col rounded-2xl border p-7 ${
                    t.highlight
                      ? "border-jade/40 bg-white shadow-md ring-1 ring-jade/20"
                      : "card-lift border-ink/10 bg-bone"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold text-ink">{t.name}</h3>
                    {t.highlight ? (
                      <span className="rounded-full bg-jade px-2.5 py-1 text-[11px] font-semibold text-white">
                        Most popular
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 font-display text-3xl font-semibold tracking-tightest text-ink">
                    {t.price}
                  </div>
                  <p className="mt-1 text-sm text-ink/60">{t.note}</p>

                  <div className="my-6 h-px bg-ink/[0.07]" />

                  <ul className="flex-1 space-y-3">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-ink/75">
                        <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-jade/12 text-jade-600">
                          <CheckIcon className="h-2.5 w-2.5" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    {t.highlight ? (
                      <PrimaryButton href="#" className="w-full">
                        {t.cta}
                      </PrimaryButton>
                    ) : (
                      <SecondaryButton href="#" className="w-full">
                        {t.cta}
                      </SecondaryButton>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
