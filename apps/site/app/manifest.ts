import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_TITLE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description:
      "Recurring-payments infrastructure for Nigeria — subscriptions, billing, and reconciliation.",
    start_url: "/",
    display: "browser",
    background_color: "#FAFAFA",
    theme_color: "#0B8366",
    icons: [{ src: "/icon", sizes: "32x32", type: "image/png" }],
  };
}
