"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Container, SectionHeading } from "./ui";
import { Reveal } from "./Reveal";
import { ReconcileVisual } from "./ReconcileVisual";
import { isWebglAvailable } from "@/lib/webgl";

const ReconcileVisual3D = dynamic(() => import("./ReconcileVisual3D"), { ssr: false });

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
  // The 3-D card needs a real WebGL context; falls back to the flat 2-D
  // panel if it's unavailable up front (sandboxed/disabled GPU) or throws
  // during setup (ReconcileVisual3D reports that via onFail — a plain
  // three.js renderer built in an effect throws asynchronously, which a
  // React error boundary can't catch).
  const [use3D, setUse3D] = useState(true);
  useEffect(() => {
    setUse3D(isWebglAvailable());
  }, []);

  return (
    // Pinned "foundation" beat: the inner panel pins for 100vh while How It
    // Works is pulled up over it (-mt-[100vh] on that section) and plasters on
    // top — ScrollTransitions drives the scale-down/scale-down effect across
    // the overlap ("the foundation it's built on", literally). data-tx-target
    // marks the sticky inner as the transform target so the effect can't break
    // its own pin. Touch / reduced-motion: no pin, natural stacked flow.
    // h-[275vh] = 200vh of pin + ~¾vh of dwell so Accounts rests fully settled
    // before How It Works is pulled up over it — it shouldn't jump straight
    // into the next screen.
    <section id="accounts" data-pin="" className="relative scroll-mt-24 bg-white motion-safe:md:h-[275vh]">
      <div
        data-tx-target
        className="flex min-h-[100svh] flex-col justify-center bg-white py-16 motion-safe:md:sticky motion-safe:md:top-0 motion-safe:md:h-screen motion-safe:md:min-h-0 md:py-20"
      >
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Visual — reconciliation, shown as inbound transfers resolving live, as a 3-D clay card
                (falls back to the flat panel if WebGL is unavailable or the scene throws) */}
            <Reveal className="order-last lg:order-first">
              {use3D ? (
                <ReconcileVisual3D onFail={() => setUse3D(false)} />
              ) : (
                <ReconcileVisual />
              )}
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
      </div>
    </section>
  );
}
