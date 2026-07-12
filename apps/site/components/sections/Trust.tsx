import Image from "next/image";
import { Container, Section, SectionHeading } from "./ui";
import { Reveal } from "./Reveal";
import { Clothesline } from "./Clothesline";

/* ──────────────────────────────────────────────────────────────
   "Correctness & trust" as a clothesline of polaroids: each proof
   point is a photo clipped by a little jade peg to a gently curving
   string, tilted and staggered along the arc the way pinned photos
   hang. Desktop shows the full line; on mobile the cards straighten
   into a clean vertical stack (no string, tilts dropped).
   ────────────────────────────────────────────────────────────── */

type Pin = {
  title: string;
  body: string;
  src: string;
  alt: string;
  /** md+ hang transform — tilt + vertical offset that seats the peg on the arc */
  hang: string;
  /** per-image framing tweak (object-position / zoom) */
  img?: string;
};

const pins: Pin[] = [
  {
    title: "Double-entry ledger",
    body: "Every movement is recorded twice and balances exactly. Kobo-precise money math you can audit.",
    src: "/trust/double-ledger.jpg",
    alt: "A hand tapping a phone to confirm a balanced entry",
    hang: "md:-rotate-[4deg] md:translate-y-9",
  },
  {
    title: "Idempotent by design",
    body: "Retries and webhooks can't double-charge or double-count. Safe to call again.",
    src: "/trust/idempotent.jpg",
    alt: "Two identical request windows resolving to a single result",
    hang: "md:rotate-[3deg] md:translate-y-16",
    // subject sits small and centred on white — zoom in so it fills the frame
    img: "scale-[1.5]",
  },
  {
    title: "Every kobo reconciled",
    body: "Exact, partial, overpayment, unidentified — each inbound transfer is accounted for.",
    src: "/trust/reconciled-money.jpg",
    alt: "Hands stacking banknotes into a neatly built wall",
    hang: "md:-rotate-[3deg] md:translate-y-14",
  },
  {
    title: "Built on Nomba's rails",
    body: "Settlement and movement run on regulated, production payment infrastructure.",
    src: "/trust/noma-rails.jpg",
    alt: "Railway tracks curving forward beside the Nomba logo",
    hang: "md:rotate-[5deg] md:translate-y-4",
  },
];

export default function Trust() {
  return (
    <Section id="trust" stage dwell className="bg-bone">
      {/* full-width layer so the wire can run off both screen edges while the
          Container keeps the cards centred. The wire sits BEHIND the cards
          (earlier in the DOM + absolute) so each peg clips over it. */}
      <div className="relative">
        <Clothesline />
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

          {/* clothesline rack */}
          <div className="relative mx-auto mt-14 max-w-[1040px] md:mt-20">
            <div className="flex flex-col items-center gap-12 md:flex-row md:items-start md:justify-between md:gap-0">
              {pins.map((p, i) => (
                <Reveal
                  as="div"
                  key={p.title}
                  delay={i * 90}
                  className="w-[248px] shrink-0 md:w-[168px] lg:w-[240px]"
                >
                  {/* hang transform lives here so it never fights Reveal's inline
                      entrance transform (outer) or the hover lift (inner figure) */}
                  <div className={`${p.hang} will-change-transform`}>
                    {/* whisper of sway — the card breathes on the line like it's
                        caught in a light breeze (paused for reduced-motion) */}
                    <div className="clothes-sway" style={{ animationDelay: `${i * -1.6}s` }}>
                      <figure className="card-lift group relative rounded-2xl border border-ink/5 bg-white p-3 pb-4 shadow-[0_18px_44px_-26px_rgba(20,24,28,0.42)]">
                        {/* peg — the wire is measured to seat at its top */}
                        <span
                          data-clothes-peg
                          aria-hidden
                          className="absolute -top-[13px] left-1/2 z-10 h-7 w-[18px] -translate-x-1/2 rounded-[5px] bg-jade shadow-[0_2px_5px_rgba(20,24,28,0.28)]"
                        >
                          <span className="absolute left-1/2 top-[7px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/45" />
                        </span>

                    {/* photo */}
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-bone-200">
                      <Image
                        src={p.src}
                        alt={p.alt}
                        fill
                        sizes="(max-width: 768px) 80vw, 240px"
                        className={`object-cover ${p.img ?? ""}`}
                      />
                    </div>

                    {/* caption */}
                    <figcaption className="px-1 pt-3">
                      <h3 className="font-display text-[15px] font-semibold leading-tight text-ink">
                        {p.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink/55">{p.body}</p>
                        </figcaption>
                      </figure>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <p className="mt-16 text-center text-xs text-ink/55 md:mt-24">
            Security &amp; compliance details (encryption, access controls, certifications) —
            placeholder, to be finalised before launch.
          </p>
        </Container>
      </div>
    </Section>
  );
}
