# Plinth

**A Stripe-like subscription billing engine for Nomba.** Plinth gives any business a
policy-driven recurring-billing backend — subscriptions, invoices, dunning, entitlements,
and customer notifications — on top of Nigerian payment rails.

Plinth is tenant-agnostic: each business is a **tenant** that onboards, gets API keys, defines
its plans and billing policy, and bills its own customers. (The `nollybox` app is a demo
consumer, not part of Plinth.)

**▶ Demo video:** https://youtu.be/u3Z_KNJPMBg — the full lifecycle end to end (subscribe → failed
renewal → automated dunning → recovery by bank transfer), across the customer app and the billing dashboard.

> **Reviewing the dashboard?** Login is passwordless (magic link tied to a business email), so it isn't
> open to anonymous sign-in. To click through the full UI with sample data and no backend, run it in
> **mock mode** (`NEXT_PUBLIC_USE_MOCKS=true`) — see [Dashboard mock mode](#dashboard-mock-mode-no-backend-needed) below.

---

## What it does

- **Subscriptions & plans** — plan groups, trials, quantities, upgrades/downgrades (prorated or at period end).
- **Three payment rails** — card (tokenized auto-charge), bank transfer (dedicated virtual accounts), and direct debit (adapter-ready).
- **Dunning ladder** — failed payment → `past_due` → retries → `grace` → `delinquent` → auto-cancel, all policy-configurable.
- **Entitlements** — ask Plinth whether a customer currently has access, and to what.
- **Notifications** — customer-facing SMS (Twilio) + email on billing events, tenant-branded and deduped.
- **Outbound webhooks** — signed event delivery to the tenant's own systems, with retries and a delivery log.
- **Test clock** — advance simulated time to exercise renewals, trials, and the full dunning ladder without waiting.
- **Multi-tenant onboarding** — signup → admin approval → API keys, with a dashboard for each side.

---

## Repository structure

```
plinth/
├── packages/engine/   # Billing engine — Hono + Drizzle + Postgres (API on :7331)
├── apps/web/          # Dashboard — Next.js (tenant + platform-admin UI, :3002)
├── docs/              # Documentation site (Mintlify)
└── migrations/        # (per package) SQL schema migrations
```

- **Engine** — the API and all billing logic (subscriptions, invoices, policies, dunning, notifications, webhooks, reconciliation).
- **Dashboard** — two audiences: the **tenant** (serving company) manages customers, plans, subscriptions, invoices, dunning, and notifications; the **platform admin** approves tenant applications.

---

## Payment rails

| Rail | How it works | Status |
|------|--------------|--------|
| **Card** | Tokenized via Nomba checkout, then auto-charged each period | Live |
| **Transfer** | Each customer gets a dedicated virtual account (NUBAN); inbound transfers reconcile to invoices | Live |
| **Direct debit** | NIBSS e-mandate | Adapter-ready |

---

## Quickstart

### Prerequisites
- Node.js 20+
- pnpm
- PostgreSQL (running locally or reachable via `DATABASE_URL`)

### Setup
```bash
pnpm install

# Configure environment (copy and fill in)
cp .env.example .env    # if present; otherwise create .env — see "Environment" below

# Apply database migrations
pnpm db:migrate
# (or apply the SQL files in packages/engine/migrations/ directly with psql)
```

### Run
```bash
# 1) Billing engine  →  http://localhost:7331
pnpm dev

# 2) Dashboard  →  http://localhost:3002
cd apps/web && pnpm dev -- -p 3002

# 3) Docs (optional)
cd docs && mintlify dev
```

### Dashboard mock mode (no backend needed)

For **design / UI work — or to explore the product hands-on** — the dashboard can run against built-in fixtures instead of the engine —
no Postgres, no seeding, every page fully populated with realistic data in **every state**
(subscriptions across all lifecycle states, a full dunning board, notifications with sent/failed
rows, webhook deliveries in every status, etc.).

```bash
cd apps/web
cp .env.local.example .env.local     # sets NEXT_PUBLIC_USE_MOCKS=true
pnpm dev -- -p 3002
```

The fixtures live in [`apps/web/src/lib/fixtures.ts`](apps/web/src/lib/fixtures.ts) — add a row there
to surface a new state on any screen. Set `NEXT_PUBLIC_USE_MOCKS` back to unset/false to hit the real API.

### Environment

Key variables in `.env` (at the repo root):

```bash
DATABASE_URL=postgres://postgres@localhost:5432/plinth
PORT=7331
NODE_ENV=development          # controls the test clock (real clock in production)

# Nomba API (sandbox or production)
NOMBA_CLIENT_ID=...
NOMBA_CLIENT_SECRET=...
NOMBA_ACCOUNT_ID=...          # parent account
NOMBA_SUB_ACCOUNT_ID=...      # your sub-account
NOMBA_BASE_URL=https://sandbox.nomba.com
NOMBA_WEBHOOK_SECRET=...

# Notifications (optional — without these, notifications just log)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
SMTP_USER=...
SMTP_PASS=...
```

---

## Core concepts

- **Tenant** — a business using Plinth to bill its customers. Everything is scoped by tenant + API key.
- **Billing policy** — per-tenant knobs: activation strategy, upgrade/downgrade behavior, grace days,
  dunning attempts, delinquent-cancel window, and billing mode (advance vs arrears). Presets available
  (SaaS-Standard, Lenient, Strict, Transfer-First, Postpaid).
- **Tick** — the billing engine's heartbeat: renews due subscriptions, runs retries, and advances
  dunning states. In dev, drive it with the test clock; in production it runs on a schedule.
- **Notifications** — SMS + email off billing events (`payment_due`, `past_due`, `delinquent`,
  `recovered`, `activated`, `receipt`, `trial_ended`, `canceled`), branded with the tenant's name and
  configurable per tenant.

---

## Tech stack

- **Engine:** TypeScript, Hono, Drizzle ORM, PostgreSQL
- **Dashboard:** Next.js (App Router), Tailwind CSS
- **Payments:** Nomba (card, virtual accounts, webhooks)
- **Notifications:** Twilio (SMS), SMTP/Nodemailer (email)
- **Docs:** Mintlify

---

## Tests

```bash
pnpm test          # watch mode
pnpm test:run      # single run
```
