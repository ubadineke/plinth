// The app's own code makes zero external fetch/XHR calls — fonts, images,
// the Rive cursor (/cursor.riv) and Lottie clip are all self-hosted from
// /public. But @rive-app/react-canvas and @lottiefiles/dotlottie-web both
// fetch their WASM runtime from a CDN at runtime, confirmed by checking
// Report-Only violations against an actual `next build && next start`
// (not `next dev`, which also reports 40+ unrelated eval violations from
// webpack's dev-only eval-source-map devtool):
//   - https://unpkg.com/@rive-app/canvas — Rive's WASM binary
//   - https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web — its WASM binary
//   - blob: — Rive's internal canvas/worker messaging
//   - 'wasm-unsafe-eval' — required to instantiate either WASM module at all
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' blob: https://cdn.jsdelivr.net https://unpkg.com",
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
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
