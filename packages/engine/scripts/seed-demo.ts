/**
 * Seeds the demo tenant used by the "Try Demo" button on the landing page.
 * Run once before deploying: pnpm tsx scripts/seed-demo.ts
 *
 * Requires DEMO_API_KEY env var (must start with sk_live_).
 * Creates a realistic tenant with customers, subscriptions in various states,
 * and billing history so every dashboard tab has interesting data.
 */
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import {
  tenants, tenantApiKeys, planGroups, plans,
  customers, subscriptions, invoices,
} from '../src/db/schema.js';
import { ulid } from 'ulid';

const url = process.env['DATABASE_URL']!;
const isRemote = url.includes('supabase') || url.includes('pooler') || !url.includes('localhost');
const client = postgres(url, { max: 1, ssl: isRemote ? { rejectUnauthorized: false } : false });
const db = drizzle(client);

const DEMO_KEY = process.env['DEMO_API_KEY'];
if (!DEMO_KEY) {
  console.error('DEMO_API_KEY env var is required');
  process.exit(1);
}
if (!DEMO_KEY.startsWith('sk_live_')) {
  console.error('DEMO_API_KEY must start with sk_live_');
  process.exit(1);
}

const keyHash = createHash('sha256').update(DEMO_KEY).digest('hex');

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function run() {
  const existing = await db.select().from(tenantApiKeys).where(eq(tenantApiKeys.keyHash, keyHash));
  if (existing.length > 0) {
    console.log('Demo tenant already seeded. Skipping.');
    process.exit(0);
  }

  const now = new Date();
  const tenantId = `ten_demo_${ulid()}`;

  // ── IDs ────────────────────────────────────────────────────────────────────
  const pgId   = `pg_${ulid()}`;
  const planS  = `pln_${ulid()}`;
  const planP  = `pln_${ulid()}`;
  const planM  = `pln_${ulid()}`;

  const cAdaeze    = `cus_${ulid()}`;
  const cChukwu    = `cus_${ulid()}`;
  const cFatima    = `cus_${ulid()}`;
  const cBabatunde = `cus_${ulid()}`;
  const cNgozi     = `cus_${ulid()}`;
  const cOluwaseun = `cus_${ulid()}`;
  const cKelechi   = `cus_${ulid()}`;
  const cIfeoma    = `cus_${ulid()}`;

  const subActive1  = `sub_${ulid()}`;
  const subActive2  = `sub_${ulid()}`;
  const subActive3  = `sub_${ulid()}`;
  const subActive4  = `sub_${ulid()}`;
  const subPastDue  = `sub_${ulid()}`;
  const subGrace    = `sub_${ulid()}`;
  const subDelinq   = `sub_${ulid()}`;
  const subCanceled = `sub_${ulid()}`;

  await db.transaction(async (tx) => {
    // ── Tenant + API key ────────────────────────────────────────────────────
    await tx.insert(tenants).values({
      id: tenantId, name: 'Nollybox (Demo)', createdAt: now, expiresAt: null,
    });
    await tx.insert(tenantApiKeys).values({
      id: `key_${ulid()}`, tenantId,
      keyPrefix: DEMO_KEY.slice(0, 12),
      keyHash, mode: 'live', createdAt: now, revokedAt: null,
    });

    // ── Plan group + plans ──────────────────────────────────────────────────
    await tx.insert(planGroups).values({
      id: pgId, tenantId, name: 'Nollybox Plans',
      description: 'Streaming access tiers', createdAt: now, updatedAt: now,
    });
    await tx.insert(plans).values([
      {
        id: planS, tenantId, planGroupId: pgId, name: 'Starter',
        amountMinor: 200000n, currency: 'NGN',
        billingInterval: 'month', billingIntervalCount: 1,
        trialPeriodDays: 0, lookupKey: 'starter_monthly',
        active: true, createdAt: now, updatedAt: now,
      },
      {
        id: planP, tenantId, planGroupId: pgId, name: 'Pro',
        amountMinor: 500000n, currency: 'NGN',
        billingInterval: 'month', billingIntervalCount: 1,
        trialPeriodDays: 0, lookupKey: 'pro_monthly',
        active: true, createdAt: now, updatedAt: now,
      },
      {
        id: planM, tenantId, planGroupId: pgId, name: 'Max',
        amountMinor: 1200000n, currency: 'NGN',
        billingInterval: 'month', billingIntervalCount: 1,
        trialPeriodDays: 7, lookupKey: 'max_monthly',
        active: true, createdAt: now, updatedAt: now,
      },
    ]);

    // ── Customers ───────────────────────────────────────────────────────────
    await tx.insert(customers).values([
      { id: cAdaeze,    tenantId, externalRef: 'demo_001', name: 'Adaeze Okonkwo',    email: 'adaeze@example.ng',    phone: '+2348031234001', accountBalanceMinor: 0n, createdAt: daysAgo(90) },
      { id: cChukwu,    tenantId, externalRef: 'demo_002', name: 'Chukwuemeka Eze',   email: 'chukwu@example.ng',    phone: '+2348031234002', accountBalanceMinor: 0n, createdAt: daysAgo(75) },
      { id: cFatima,    tenantId, externalRef: 'demo_003', name: 'Fatima Al-Rashid',  email: 'fatima@example.ng',    phone: '+2348031234003', accountBalanceMinor: 0n, createdAt: daysAgo(60) },
      { id: cBabatunde, tenantId, externalRef: 'demo_004', name: 'Babatunde Adeleke', email: 'babatunde@example.ng', phone: '+2348031234004', accountBalanceMinor: 0n, createdAt: daysAgo(45) },
      { id: cNgozi,     tenantId, externalRef: 'demo_005', name: 'Ngozi Amaechi',     email: 'ngozi@example.ng',     phone: '+2348031234005', accountBalanceMinor: 0n, createdAt: daysAgo(60) },
      { id: cOluwaseun, tenantId, externalRef: 'demo_006', name: 'Oluwaseun Adesanya',email: 'oluwa@example.ng',     phone: '+2348031234006', accountBalanceMinor: 0n, createdAt: daysAgo(50) },
      { id: cKelechi,   tenantId, externalRef: 'demo_007', name: 'Kelechi Nwosu',     email: 'kelechi@example.ng',   phone: '+2348031234007', accountBalanceMinor: 0n, createdAt: daysAgo(80) },
      { id: cIfeoma,    tenantId, externalRef: 'demo_008', name: 'Ifeoma Obiora',     email: 'ifeoma@example.ng',    phone: '+2348031234008', accountBalanceMinor: 0n, createdAt: daysAgo(70) },
    ]);

    // ── Subscriptions ───────────────────────────────────────────────────────

    // 4 active
    await tx.insert(subscriptions).values([
      {
        id: subActive1, tenantId, customerId: cAdaeze, planId: planP, state: 'active',
        billingMode: 'advance', quantity: 1, preferredRail: 'card',
        currentPeriodStart: daysAgo(15), currentPeriodEnd: daysFromNow(15),
        nextBillAt: daysFromNow(15), metadata: {},
        createdAt: daysAgo(90), updatedAt: now,
      },
      {
        id: subActive2, tenantId, customerId: cChukwu, planId: planM, state: 'active',
        billingMode: 'advance', quantity: 1, preferredRail: 'card',
        currentPeriodStart: daysAgo(10), currentPeriodEnd: daysFromNow(20),
        nextBillAt: daysFromNow(20), metadata: {},
        createdAt: daysAgo(75), updatedAt: now,
      },
      {
        id: subActive3, tenantId, customerId: cFatima, planId: planS, state: 'active',
        billingMode: 'advance', quantity: 1, preferredRail: 'transfer',
        currentPeriodStart: daysAgo(5), currentPeriodEnd: daysFromNow(25),
        nextBillAt: daysFromNow(25), metadata: {},
        createdAt: daysAgo(60), updatedAt: now,
      },
      {
        id: subActive4, tenantId, customerId: cBabatunde, planId: planP, state: 'active',
        billingMode: 'advance', quantity: 1, preferredRail: 'card',
        currentPeriodStart: daysAgo(20), currentPeriodEnd: daysFromNow(10),
        nextBillAt: daysFromNow(10), metadata: {},
        createdAt: daysAgo(45), updatedAt: now,
      },
    ]);

    // past_due
    await tx.insert(subscriptions).values({
      id: subPastDue, tenantId, customerId: cNgozi, planId: planS, state: 'past_due',
      billingMode: 'advance', quantity: 1, preferredRail: 'card',
      currentPeriodStart: daysAgo(35), currentPeriodEnd: daysAgo(5),
      nextBillAt: daysAgo(5),
      metadata: {
        declineCode: 'insufficient_funds',
        dunningNextRetryAt: daysFromNow(2).toISOString(),
        dunningAttempts: 1,
      },
      createdAt: daysAgo(60), updatedAt: now,
    });

    // grace
    await tx.insert(subscriptions).values({
      id: subGrace, tenantId, customerId: cOluwaseun, planId: planP, state: 'grace',
      billingMode: 'advance', quantity: 1, preferredRail: 'card',
      currentPeriodStart: daysAgo(40), currentPeriodEnd: daysAgo(10),
      nextBillAt: daysAgo(10),
      metadata: {
        declineCode: 'do_not_honor',
        enteredGraceAt: daysAgo(4).toISOString(),
        dunningAttempts: 3,
      },
      createdAt: daysAgo(50), updatedAt: now,
    });

    // delinquent
    await tx.insert(subscriptions).values({
      id: subDelinq, tenantId, customerId: cKelechi, planId: planM, state: 'delinquent',
      billingMode: 'advance', quantity: 1, preferredRail: 'card',
      currentPeriodStart: daysAgo(50), currentPeriodEnd: daysAgo(20),
      nextBillAt: daysAgo(20),
      metadata: {
        declineCode: 'card_not_supported',
        enteredDelinquentAt: daysAgo(8).toISOString(),
        dunningAttempts: 6,
      },
      createdAt: daysAgo(80), updatedAt: now,
    });

    // canceled
    await tx.insert(subscriptions).values({
      id: subCanceled, tenantId, customerId: cIfeoma, planId: planS, state: 'canceled',
      billingMode: 'advance', quantity: 1, preferredRail: 'transfer',
      currentPeriodStart: daysAgo(65), currentPeriodEnd: daysAgo(35),
      nextBillAt: daysAgo(35),
      canceledAt: daysAgo(35), cancelAtPeriodEnd: false,
      metadata: {},
      createdAt: daysAgo(70), updatedAt: daysAgo(35),
    });

    // ── Invoices ────────────────────────────────────────────────────────────

    // 3 months paid history for each active sub
    const paidInvoices: (typeof invoices.$inferInsert)[] = [];
    const activeEntries = [
      { subId: subActive1, cusId: cAdaeze,    amount: 500000n, plan: planP },
      { subId: subActive2, cusId: cChukwu,    amount: 1200000n, plan: planM },
      { subId: subActive3, cusId: cFatima,    amount: 200000n, plan: planS },
      { subId: subActive4, cusId: cBabatunde, amount: 500000n, plan: planP },
    ];
    for (const e of activeEntries) {
      for (let m = 3; m >= 1; m--) {
        const pStart = daysAgo(30 * m + 15);
        const pEnd   = daysAgo(30 * (m - 1) + 15);
        const closed = daysAgo(30 * (m - 1) + 14);
        paidInvoices.push({
          id: `inv_${ulid()}`, tenantId, customerId: e.cusId, subscriptionId: e.subId,
          state: 'paid', currency: 'NGN',
          amountDueMinor: e.amount, amountPaidMinor: e.amount,
          periodStart: pStart, periodEnd: pEnd, dueAt: pEnd,
          billingMode: 'advance', isReceivable: false,
          closedAt: closed, createdAt: pStart, updatedAt: closed,
        });
      }
    }
    await tx.insert(invoices).values(paidInvoices);

    // Open overdue invoice for past_due sub
    await tx.insert(invoices).values({
      id: `inv_${ulid()}`, tenantId, customerId: cNgozi, subscriptionId: subPastDue,
      state: 'open', currency: 'NGN',
      amountDueMinor: 200000n, amountPaidMinor: 0n,
      periodStart: daysAgo(35), periodEnd: daysAgo(5), dueAt: daysAgo(5),
      billingMode: 'advance', isReceivable: false,
      closedAt: null, createdAt: daysAgo(35), updatedAt: now,
    });

    // Open overdue for grace sub
    await tx.insert(invoices).values({
      id: `inv_${ulid()}`, tenantId, customerId: cOluwaseun, subscriptionId: subGrace,
      state: 'open', currency: 'NGN',
      amountDueMinor: 500000n, amountPaidMinor: 0n,
      periodStart: daysAgo(40), periodEnd: daysAgo(10), dueAt: daysAgo(10),
      billingMode: 'advance', isReceivable: false,
      closedAt: null, createdAt: daysAgo(40), updatedAt: now,
    });

    // Open overdue for delinquent sub
    await tx.insert(invoices).values({
      id: `inv_${ulid()}`, tenantId, customerId: cKelechi, subscriptionId: subDelinq,
      state: 'open', currency: 'NGN',
      amountDueMinor: 1200000n, amountPaidMinor: 0n,
      periodStart: daysAgo(50), periodEnd: daysAgo(20), dueAt: daysAgo(20),
      billingMode: 'advance', isReceivable: false,
      closedAt: null, createdAt: daysAgo(50), updatedAt: now,
    });

    // 1 paid invoice for canceled sub (last successful payment)
    await tx.insert(invoices).values({
      id: `inv_${ulid()}`, tenantId, customerId: cIfeoma, subscriptionId: subCanceled,
      state: 'paid', currency: 'NGN',
      amountDueMinor: 200000n, amountPaidMinor: 200000n,
      periodStart: daysAgo(65), periodEnd: daysAgo(35), dueAt: daysAgo(35),
      billingMode: 'advance', isReceivable: false,
      closedAt: daysAgo(35), createdAt: daysAgo(65), updatedAt: daysAgo(35),
    });
  });

  console.log('Demo tenant seeded successfully.');
  console.log(`  Tenant   : Nollybox (Demo)`);
  console.log(`  Tenant ID: ${tenantId}`);
  console.log(`  API key  : ${DEMO_KEY}`);
  console.log('');
  console.log('Customers   : 8 (4 active, 1 past_due, 1 grace, 1 delinquent, 1 canceled)');
  console.log('Invoices    : 16 paid + 3 open/overdue');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
