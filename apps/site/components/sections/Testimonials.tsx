import { Container, Section, SectionHeading } from "./ui";
import { Reveal } from "./Reveal";

/* Pre-launch: real quotes/names are not fabricated. These are clearly-marked
   placeholder slots to be filled with consented customer quotes before launch. */
export default function Testimonials() {
  return (
    <Section id="testimonials" full className="bg-bone">
      <Container>
        <Reveal>
          <SectionHeading center eyebrow="Social proof" title="What builders will say." />
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Reveal as="figure" key={i} delay={i * 90}>
              <figure className="card-lift flex h-full flex-col rounded-2xl border border-dashed border-ink/15 bg-white/60 p-7">
                <span aria-hidden className="font-display text-5xl leading-none text-jade/30">
                  &ldquo;
                </span>
                <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-ink/45">
                  Placeholder quote — a customer describes how Plinth recovered revenue and removed
                  the manual reconciliation work.
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-ink/[0.07] pt-5">
                  <div className="h-9 w-9 rounded-full bg-ink/10" aria-hidden />
                  <div className="text-xs text-ink/40">
                    <div className="font-semibold text-ink/55">Name, Role</div>
                    <div>Company</div>
                  </div>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-ink/30">
                    Soon
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
