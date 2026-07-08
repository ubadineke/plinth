// Every request to this app talks to exactly one external origin: the
// engine API (NEXT_PUBLIC_API_URL, see .env.local.example). Everything else
// — fonts, the logo, icons — is self-hosted. That's what makes the CSP below
// safe to write by hand rather than guess: there's nothing else to allow.
const apiOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7331";

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(), interest-cohort=()",
  },
  // Report-Only for now — nothing to break since it doesn't block, but it
  // gives real violation signal (devtools console) before ever enforcing.
  { key: "Content-Security-Policy-Report-Only", value: CSP },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
