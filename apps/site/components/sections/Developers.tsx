import { Container, Section, SectionHeading, PrimaryButton, SecondaryButton } from "./ui";

const snippet = `import { Plinth } from "@plinth/sdk";
const plinth = new Plinth(process.env.PLINTH_API_KEY);

// 1. Define a plan (₦5,000/month — amounts are in kobo)
const plan = await plinth.plans.create({
  name: "Pro",
  amount: 500_000,
  interval: "monthly",
});

// 2. Subscribe a customer
const sub = await plinth.subscriptions.create({
  customer: "cus_bob",
  plan: plan.id,
});

// 3. Ask who has access — your product gates on this
const access = await plinth.entitlements.get("cus_bob");
// → { active: true, features: ["pro"], valid_until: "2026-07-25" }`;

const bullets = ["Clean REST API", "Typed SDKs", "Webhooks for every event", "Idempotent by design"];

export default function Developers() {
  return (
    <Section id="developers" className="bg-white">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Developer experience"
              title="Integrate in a few lines."
              sub="Drop Plinth in; don't rebuild billing. A clean API, SDKs, and webhooks — money-critical correctness handled for you."
            />
            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-ink/75">
                  <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-jade" fill="none">
                    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryButton href="#">Read the docs</PrimaryButton>
              <SecondaryButton href="#">View API reference</SecondaryButton>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-ink/10 bg-ink-900 shadow-sm">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-white/20" />
              <span className="h-3 w-3 rounded-full bg-white/20" />
              <span className="h-3 w-3 rounded-full bg-white/20" />
              <span className="ml-2 font-mono text-xs text-white/40">subscribe.ts</span>
            </div>
            <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed md:p-5">
              <code className="font-mono text-bone-200">{snippet}</code>
            </pre>
          </div>
        </div>
      </Container>
    </Section>
  );
}
