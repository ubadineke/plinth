import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_TITLE } from "@/lib/site";

export const alt = SITE_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Runs on the Node.js runtime (the App Router default for this file
// convention) specifically so it can read fonts + the real brand
// illustration off disk, instead of recreating them from scratch.
// satori (which powers ImageResponse) can't parse WOFF2 — assets/fonts
// holds TTF decompressions of the same site fonts, server-side only
// (not under public/, so they're never served to browsers).
export default async function OpengraphImage() {
  const [clashBold, satoshiMedium, logo] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/ClashDisplay-Bold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Satoshi-Medium.ttf")),
    readFile(join(process.cwd(), "public/plinth-logo.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 88px",
          background: "linear-gradient(135deg, #070707 0%, #0A0A0A 62%, #0d1310 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -140,
            bottom: -170,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "#0FA37F",
            opacity: 0.28,
            filter: "blur(120px)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620, zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3BC0A1", display: "flex" }} />
            <span
              style={{
                fontFamily: "Satoshi",
                fontSize: 19,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#3BC0A1",
                fontWeight: 500,
              }}
            >
              Recurring payments for Nigeria
            </span>
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Clash Display",
              fontWeight: 700,
              fontSize: 60,
              lineHeight: 1.08,
              color: "#FAFAFA",
              letterSpacing: -1.5,
            }}
          >
            The base your billing stands on.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontFamily: "Satoshi",
              fontSize: 23,
              lineHeight: 1.5,
              color: "rgba(250,250,250,0.7)",
            }}
          >
            Subscriptions, recurring billing, and automatic reconciliation.
          </div>
        </div>

        <img src={logoSrc} width={430} height={430} style={{ zIndex: 1, opacity: 0.95 }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Clash Display", data: clashBold, weight: 700, style: "normal" },
        { name: "Satoshi", data: satoshiMedium, weight: 500, style: "normal" },
      ],
    },
  );
}
