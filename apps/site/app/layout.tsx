import type { Metadata } from "next";
import "./globals.css";
import RiveCursor from "@/components/RiveCursor";
import ScrollSnap from "@/components/ScrollSnap";
import ScrollTransitions from "@/components/ScrollTransitions";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/site";

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
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
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
        <ScrollTransitions />
        <ScrollSnap />
        <RiveCursor />
      </body>
    </html>
  );
}
