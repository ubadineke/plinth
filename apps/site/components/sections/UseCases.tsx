import type { ComponentType } from "react";
import Image from "next/image";
import { Container, Section } from "./ui";
import { Reveal } from "./Reveal";
import {
  CameraIcon,
  PaletteIcon,
  PortraitIcon,
  CubeIcon,
  SaasIcon,
  SparkIcon,
  ArrowRight,
  type IconProps,
} from "./icons";

/* ──────────────────────────────────────────────────────────────
   "One base, many businesses" as a bento board.

   Every tile except the jade title and the Plinth mark is an ASSET
   SLOT — a labelled placeholder telling the founder exactly which
   illustration/photo to drop in. Little to no body copy: the notes
   ARE the content. Once the art lands, this reads like a real board.
   ────────────────────────────────────────────────────────────── */

type AssetType = "Photo" | "Illustration" | "Product UI" | "Portrait" | "3D";
type Tone = "bone" | "soft" | "jade";

const typeIcon: Record<AssetType, ComponentType<IconProps>> = {
  Photo: CameraIcon,
  Illustration: PaletteIcon,
  "Product UI": SaasIcon,
  Portrait: PortraitIcon,
  "3D": CubeIcon,
};

const toneCls: Record<Tone, string> = {
  bone: "bg-bone border-ink/15",
  soft: "bg-ink/[0.03] border-ink/15",
  jade: "bg-jade/[0.06] border-jade/30",
};

function AssetSlot({
  tag,
  type,
  note,
  tone = "bone",
}: {
  tag: string;
  type: AssetType;
  note: string;
  tone?: Tone;
}) {
  const Icon = typeIcon[type];
  return (
    <div className={`flex h-full flex-col rounded-2xl border border-dashed p-4 ${toneCls[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-jade-600">
          {tag}
        </span>
        <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink/60 ring-1 ring-ink/10">
          {type}
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center py-3">
        <Icon className="h-8 w-8 text-ink/25" />
      </div>
      <p className="text-[11.5px] leading-snug text-ink/60">{note}</p>
    </div>
  );
}

export default function UseCases() {
  return (
    <Section id="use-cases" full className="bg-bone">
      <Container>
        <div className="grid auto-rows-[168px] grid-cols-2 gap-3 md:auto-rows-[176px] md:grid-cols-4 md:gap-4">
          {/* A — title (jade anchor) */}
          <Reveal className="col-span-2 row-span-2 md:col-start-1 md:row-start-1">
            <div className="flex h-full flex-col justify-between rounded-2xl bg-jade-600 p-6 text-white">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-white/90">
                Who builds on Plinth
              </span>
              <div>
                <h2 className="font-display text-3xl font-semibold leading-[1.04] tracking-tight md:text-[34px]">
                  One base,
                  <br />
                  many businesses.
                </h2>
                <p className="mt-3 max-w-[26ch] text-sm leading-relaxed text-white/95">
                  If you collect on a schedule, Plinth carries the hard part.
                </p>
              </div>
            </div>
          </Reveal>

          {/* B — SaaS */}
          <Reveal delay={70} className="col-span-2 md:col-start-3 md:row-start-1">
            <AssetSlot
              tag="SaaS"
              type="Product UI"
              tone="soft"
              note="Billing dashboard — a “payment recovered” toast; card → transfer retry. Dark product UI, wide."
            />
          </Reveal>

          {/* C — Streaming */}
          <Reveal delay={140} className="col-span-2 md:col-start-3 md:row-start-2">
            <AssetSlot
              tag="Streaming"
              type="Product UI"
              note="Plan picker — Basic / Pro / Family, an upgrade mid-flow with a proration line."
            />
          </Reveal>

          {/* D — Cooperative (tall) */}
          <Reveal delay={210} className="col-span-1 row-span-2 md:col-start-1 md:row-start-3">
            <AssetSlot
              tag="Cooperative · ajo / esusu"
              type="Illustration"
              tone="jade"
              note="Savings circle — hands passing naira, a rotating contribution ring. Warm editorial illustration (fits the cultural set)."
            />
          </Reveal>

          {/* E — School */}
          <Reveal delay={280} className="col-span-1 md:col-start-2 md:row-start-3">
            <AssetSlot
              tag="School"
              type="Photo"
              note="Student in uniform at a school gate, or a fees receipt."
            />
          </Reveal>

          {/* F — Landlord */}
          <Reveal delay={350} className="col-span-1 md:col-start-2 md:row-start-4">
            <AssetSlot
              tag="Landlord"
              type="Photo"
              tone="soft"
              note="Apartment keys, or a Lagos low-rise. Rent day."
            />
          </Reveal>

          {/* G — Plinth mark (real asset, no text) */}
          <Reveal delay={280} className="col-span-1 md:col-start-3 md:row-start-3">
            <div className="relative flex h-full items-center justify-center overflow-hidden rounded-2xl bg-ink-900">
              <div aria-hidden className="absolute -inset-6 bg-jade/10 blur-2xl" />
              <Image
                src="/plinth-logo.png"
                alt=""
                aria-hidden
                width={96}
                height={96}
                className="relative w-24 select-none"
              />
            </div>
          </Reveal>

          {/* H — build-something-else CTA */}
          <Reveal delay={350} className="col-span-1 md:col-start-3 md:row-start-4">
            <a
              href="#developers"
              className="group flex h-full flex-col justify-between rounded-2xl border border-ink/12 bg-white p-5 transition-colors hover:border-jade/40"
            >
              <SparkIcon className="h-6 w-6 text-jade-600" />
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-jade-600">
                Build something else
                <ArrowRight className="arrow-slide h-4 w-4" />
              </span>
            </a>
          </Reveal>

          {/* I — human portrait (tall) */}
          <Reveal delay={210} className="col-span-2 row-span-2 md:col-span-1 md:col-start-4 md:row-start-3">
            <AssetSlot
              tag="Any business"
              type="Portrait"
              note="A Nigerian founder or market vendor with a phone, natural light. Warm and human — the face of the section."
            />
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
