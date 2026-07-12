import Image from "next/image";
import { Container } from "./ui";
import { Reveal } from "./Reveal";
import { DOCS_URL } from "@/lib/site";

// Known destinations for footer links; anything not listed here is still a
// placeholder ("#") — pre-launch, no page exists for it yet.
const LINK_HREFS: Record<string, string> = {
  Docs: DOCS_URL,
  "API reference": `${DOCS_URL}/api-reference`,
};

const columns = [
  { title: "Product", links: ["Subscriptions", "Accounts", "Pricing", "Entitlements API"] },
  { title: "Developers", links: ["Docs", "API reference", "SDKs", "Status", "Changelog"] },
  { title: "Company", links: ["About", "Careers", "Blog", "FAQ"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security", "Compliance"] },
];

const offices = [
  { flag: "🇳🇬", country: "Nigeria", lines: ["16 Billings Way, Oregun", "Ikeja, Lagos"] },
  { flag: "🇳🇬", country: "Nigeria", lines: ["19B Bosun Adekoya Street", "Lekki Phase 1, Lagos"] },
  { flag: "🇨🇦", country: "Canada", lines: ["2 Lansing Square, Suite 707", "North York, Ontario"] },
  { flag: "🇺🇸", country: "United States", lines: ["1776 Sacramento St, Apt 311", "San Francisco, CA"] },
  { flag: "🇨🇩", country: "DR Congo", lines: ["Concession Silikin Village", "372 av. Colonel Mondjiba, Kinshasa"] },
];

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-bone-200">
      <Container className="py-16">
        {/* ── brand + nav columns ── */}
        <Reveal className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-2 md:gap-10 lg:grid-cols-12">
          <div className="col-span-2 md:col-span-1 lg:col-span-4">
            <a href="#" className="flex items-center gap-2">
              <Image src="/plinth-logo.png" alt="Plinth" width={32} height={32} className="h-8 w-8 object-contain" />
              <span className="font-display text-lg font-semibold tracking-tightest text-ink">Plinth</span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/60">
              The base your billing stands on. Recurring-payments infrastructure for Nigeria.
            </p>

            {/* contact */}
            <div className="mt-6 space-y-1.5 text-sm text-ink/65">
              <a href="tel:+2012018888866" className="block transition hover:text-ink">0201 888 8866</a>
              <a href="tel:+2012018885008" className="block transition hover:text-ink">0201 888 5008</a>
              <a href="mailto:support@nomba.com" className="block transition hover:text-ink">support@nomba.com</a>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-ink/60">
              <span className="h-1.5 w-1.5 rounded-full bg-jade" />
              Powered by Nomba
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wide text-ink/60">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href={LINK_HREFS[l] ?? "#"} className="text-sm text-ink/65 transition hover:text-ink">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Reveal>

        {/* ── offices ── */}
        <Reveal delay={80} className="mt-14 border-t border-ink/10 pt-8">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wide text-ink/60">Offices</h3>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {offices.map((o, i) => (
              <div key={`${o.country}-${i}`} className="text-sm leading-relaxed text-ink/60">
                <div className="mb-1.5 flex items-center gap-2 font-medium text-ink/80">
                  <span aria-hidden className="text-base leading-none">{o.flag}</span>
                  {o.country}
                </div>
                {o.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ))}
          </div>
        </Reveal>

        <p className="mt-10 text-xs text-ink/60">
          Naira (NGN). Amounts shown human-readable; the API uses kobo.
        </p>
        {/* Freepik license: attribution required for the "any business" photo */}
        <p className="mt-2 text-xs text-ink/45">
          Imagery{" "}
          <a
            href="http://www.freepik.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition hover:text-ink/70"
          >
            designed by rawpixel.com / Freepik
          </a>
          .
        </p>
      </Container>

      {/* ── regulatory base bar (dark) ── */}
      <div className="bg-ink text-bone">
        <Container className="py-7">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-md border border-bone/25 px-2 py-1 text-[11px] font-semibold tracking-wide text-bone/85">CBN</span>
                <span className="rounded-md border border-bone/25 px-2 py-1 text-[11px] font-semibold tracking-wide text-bone/85">NDIC</span>
              </div>
              <p className="max-w-md text-xs leading-relaxed text-bone/55">
                Banking services by Nombank MFB. Deposits NDIC insured. Licensed by the CBN.
              </p>
            </div>
            <p className="text-xs text-bone/55">© {new Date().getFullYear()} Nomba. All rights reserved.</p>
          </div>
        </Container>
      </div>
    </footer>
  );
}
