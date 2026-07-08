// Overridable at deploy time; falls back to the known production domain
// (confirmed via app.useplinth.com / api.useplinth.xyz references elsewhere
// in the monorepo — set NEXT_PUBLIC_SITE_URL explicitly if the marketing
// site's root domain ends up differing from this).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://useplinth.com";

export const SITE_NAME = "Plinth";
export const SITE_TITLE = "Plinth — The base your billing stands on.";
export const SITE_DESCRIPTION =
  "Recurring-payments infrastructure for Nigeria. Subscriptions, recurring billing, and automatic reconciliation — built for how Nigeria actually pays. Powered by Nomba.";
