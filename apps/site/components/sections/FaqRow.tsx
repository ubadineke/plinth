"use client";

import { useState } from "react";

/* One accordion row. Height animates via the .acc-panel grid-rows trick
   (globals.css) — 0fr → 1fr — so there's no JS measuring or layout jank. */
export function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-ink/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-base font-semibold text-ink transition-colors hover:text-jade"
      >
        <span>{q}</span>
        <span
          aria-hidden
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-lg leading-none transition-all duration-300 ${
            open ? "rotate-45 border-jade/40 bg-jade/10 text-jade" : "border-ink/15 text-ink/50"
          }`}
        >
          +
        </span>
      </button>
      <div className="acc-panel" data-open={open}>
        <div>
          <p className="max-w-2xl pb-5 text-sm leading-relaxed text-ink/65">{a}</p>
        </div>
      </div>
    </div>
  );
}
