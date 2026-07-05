import type { Metadata } from "next";
import "./globals.css";
import RiveCursor from "@/components/RiveCursor";
import ScrollSnap from "@/components/ScrollSnap";

/* Fonts are plain @font-face in globals.css (self-hosted in /public/fonts)
   rather than next/font, so the REAL family names stay usable from canvas
   textures (RoadLogos). Critical cuts are preloaded below. */
const PRELOAD_FONTS = [
  "/fonts/ClashDisplay-Bold.woff2",
  "/fonts/ClashDisplay-Semibold.woff2",
  "/fonts/Satoshi-Regular.woff2",
  "/fonts/Satoshi-Medium.woff2",
];

export const metadata: Metadata = {
  title: "Plinth — The base your billing stands on.",
  description:
    "Recurring-payments infrastructure for Nigeria. Subscriptions, recurring billing, and automatic reconciliation — built for how Nigeria actually pays. Powered by Nomba.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {PRELOAD_FONTS.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body className="font-sans bg-bone text-ink antialiased">
        {children}
        <ScrollSnap />
        <RiveCursor />
      </body>
    </html>
  );
}
