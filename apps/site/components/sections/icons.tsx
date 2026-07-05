/* ──────────────────────────────────────────────────────────────
   Line icons — one consistent set for the content sections.
   24×24, 1.5px stroke, round caps, currentColor. Editorial and
   quiet; they carry meaning without shouting for attention.
   ────────────────────────────────────────────────────────────── */

export type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/* — Trust pillars — */
export function LedgerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 4h11a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V4Z" />
      <path d="M9 8h5M9 12h5M9 16h3" />
      <path d="M5 4a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2" />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 5 6v5.5c0 4.2 2.9 7.4 7 8.5 4.1-1.1 7-4.3 7-8.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function ReconcileIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h11m0 0-3-3m3 3-3 3" />
      <path d="M20 17H9m0 0 3-3m-3 3 3 3" />
    </svg>
  );
}

export function RailsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 20V9a8 8 0 0 1 16 0v11" />
      <path d="M4 15h16M9 9v11M15 9v11" />
    </svg>
  );
}

/* — Use cases — */
export function SaasIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M8 20h8M3 9h18" />
      <path d="m9 13 1.5-1.5L9 10M13 13h2" />
    </svg>
  );
}

export function CoopIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="8.5" r="2" />
      <circle cx="8" cy="14" r="2" />
      <circle cx="16" cy="14" r="2" />
    </svg>
  );
}

export function SchoolIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 9 12 5l9.5 4L12 13 2.5 9Z" />
      <path d="M6 11v4c0 1.3 2.7 2.5 6 2.5s6-1.2 6-2.5v-4" />
      <path d="M21.5 9v4.5" />
    </svg>
  );
}

export function StreamingIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m10 9 5 3-5 3V9Z" />
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9h12v-9" />
      <path d="M10 19v-5h4v5" />
    </svg>
  );
}

export function SparkIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" />
    </svg>
  );
}

/* — misc — */
export function ArrowRight({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12h14m0 0-6-6m6 6-6 6" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m4 12 5 5L20 6" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M13 3 5 13h5l-1 8 8-10h-5l1-8Z" />
    </svg>
  );
}

/* — asset-slot type glyphs — */
export function CameraIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 8a2 2 0 0 1 2-2h1.2a2 2 0 0 0 1.6-.8l.7-1a1.5 1.5 0 0 1 1.2-.6h2.6a1.5 1.5 0 0 1 1.2.6l.7 1a2 2 0 0 0 1.6.8H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function PaletteIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.1-4-7.4-9-7.4Z" />
      <circle cx="7.5" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.2" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PortraitIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

export function CubeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 4 7.2v9.6L12 21l8-4.2V7.2L12 3Z" />
      <path d="m4 7.2 8 4.3 8-4.3M12 11.5V21" />
    </svg>
  );
}
