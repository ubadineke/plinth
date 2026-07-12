import { Container, Section, SectionHeading, PrimaryButton } from "./ui";
import { Reveal } from "./Reveal";
import { CheckIcon } from "./icons";
import { APP_URL } from "@/lib/site";

/* Pricing structure templated; actual amounts are finalised at launch
   (usage-based infra pricing — no fabricated numbers shipped).

   Card model (adapted from the reference): a flat two-tone card — a solid
   colour header carrying the tier name + a flat "orbit" emblem, over a white
   body with the price, a checklist and a full-width CTA. The tiers escalate in
   depth (light jade → deep jade → ink) the way the reference escalates its
   hue. No gradients or glows anywhere — flat brand colour only. */

type Tier = {
  name: string;
  price: string;
  note: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
  /** header theme */
  head: string; // bg + text colours for the header
  emblem: string; // text colour driving the emblem strokes/fills
  badge?: string; // "Most popular" pill colours
};

const tiers: Tier[] = [
  {
    name: "Sandbox",
    price: "Free",
    note: "Build and test end-to-end",
    features: ["Full API & SDK access", "Test mode", "Webhooks", "Community support"],
    cta: "Start building",
    href: APP_URL,
    head: "bg-jade-100 text-ink",
    emblem: "text-jade-600",
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
    href: APP_URL,
    highlight: true,
    head: "bg-jade-600 text-white",
    emblem: "text-white",
    badge: "bg-white text-jade-700",
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "Volume, controls & SLAs",
    features: [
      "Everything in Growth",
      "Volume pricing",
      "Dedicated support & SLA",
      "Custom policy & onboarding",
    ],
    cta: "Talk to sales",
    href: "mailto:support@nomba.com",
    head: "bg-ink-900 text-white",
    emblem: "text-jade-400",
  },
];

/* A flat "orbit" emblem — a filled orb with beaded rings, escalating in
   elaborateness per tier. Monochrome (currentColor), no gradient — the flat
   translation of the reference's 3-D pearl spheres. */
function Orbit({ tier, className = "" }: { tier: number; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden>
      <circle cx="60" cy="58" r="27" fill="currentColor" opacity={0.92} />
      {tier === 0 ? (
        <ellipse
          cx="60"
          cy="58"
          rx="48"
          ry="18"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity={0.55}
          transform="rotate(-24 60 58)"
        />
      ) : (
        <ellipse
          cx="60"
          cy="58"
          rx="50"
          ry="19"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="0.5 8"
          opacity={0.85}
          transform="rotate(-24 60 58)"
        />
      )}
      {tier === 2 && (
        <ellipse
          cx="60"
          cy="58"
          rx="50"
          ry="19"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="0.5 8"
          opacity={0.55}
          transform="rotate(28 60 58)"
        />
      )}
    </svg>
  );
}

export default function Pricing() {
  return (
    <Section id="pricing" stage dwell className="bg-white">
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
              <article
                className={`flex h-full flex-col overflow-hidden rounded-3xl border bg-white ${
                  t.highlight
                    ? "border-jade/30 shadow-[0_28px_60px_-34px_rgba(20,24,28,0.42)] lg:-my-3"
                    : "card-lift border-ink/10 shadow-[0_18px_44px_-30px_rgba(20,24,28,0.32)]"
                }`}
              >
                {/* colour header — tier name + flat orbit emblem */}
                <div className={`relative h-32 px-6 pt-6 ${t.head}`}>
                  <h3 className="font-display text-xl font-semibold">{t.name}</h3>
                  {t.badge && (
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.badge}`}
                    >
                      Most popular
                    </span>
                  )}
                  <Orbit
                    tier={i}
                    className={`pointer-events-none absolute -right-2 top-3 h-28 w-28 ${t.emblem}`}
                  />
                </div>

                {/* white body — pulled up so its rounded top steps over the header */}
                <div className="-mt-5 flex flex-1 flex-col rounded-t-[26px] bg-white px-6 pb-7 pt-6">
                  <div className="font-display text-4xl font-semibold tracking-tightest text-ink">
                    {t.price}
                  </div>
                  <p className="mt-1.5 text-sm text-ink/60">{t.note}</p>

                  <ul className="mt-6 flex-1 space-y-3">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-ink/75">
                        <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-jade/12 text-jade-600">
                          <CheckIcon className="h-2.5 w-2.5" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <PrimaryButton href={t.href} className="mt-8 w-full">
                    {t.cta}
                  </PrimaryButton>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
