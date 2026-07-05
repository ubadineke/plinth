import { Container, Section, SectionHeading, PrimaryButton, SecondaryButton } from "./ui";
import { Reveal } from "./Reveal";
import { CodePanel } from "./CodePanel";
import { CheckIcon } from "./icons";

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
    <Section id="developers" full className="bg-white">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div>
              <SectionHeading
                eyebrow="Developer experience"
                title={
                  <>
                    Integrate in <span className="text-jade">a few lines.</span>
                  </>
                }
                sub="Drop Plinth in; don't rebuild billing. A clean API, SDKs, and webhooks — money-critical correctness handled for you."
              />
              <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-sm text-ink/75">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-jade/12 text-jade-600">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <PrimaryButton href="#" className="group">
                  Read the docs
                </PrimaryButton>
                <SecondaryButton href="#">View API reference</SecondaryButton>
              </div>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <CodePanel filename="subscribe.ts" code={snippet} />
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
