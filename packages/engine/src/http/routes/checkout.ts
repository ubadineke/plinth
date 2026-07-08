import { Hono } from 'hono';
import { z } from 'zod';
import { ulid } from 'ulid';
import type { NombaAdapter } from '../../adapters/nomba.js';
import type { SubscriptionRepo } from '../../db/subscription.repo.js';
import type { CustomerRepo } from '../../db/customer.repo.js';
import type { PlanRepo } from '../../db/catalog.repo.js';
import type { PlanChangeService } from '../../services/plan-change.service.js';
import { env } from '../../config/env.js';

const CheckoutLinkSchema = z.object({
  callbackUrl: z.string().url().optional(),
});

const ChangeCheckoutSchema = z.object({
  plan_id:     z.string(),
  callbackUrl: z.string().url().optional(),
});

export function makeCheckoutRouter(
  nomba: NombaAdapter,
  subscriptionRepo: SubscriptionRepo,
  customerRepo: CustomerRepo,
  planRepo: PlanRepo,
  planChangeService: PlanChangeService,
): Hono {
  const router = new Hono();

  // POST /v1/subscriptions/:id/checkout-link
  // Returns a Nomba-hosted payment link for the customer to pay with (and tokenize) their card.
  // orderReference encodes tenantId+customerId so the payment_success webhook can link back.
  router.post('/:id/checkout-link', async (c) => {
    const tenantId = c.get('tenantId');
    const subId    = c.req.param('id');

    const sub = await subscriptionRepo.findById(tenantId, subId);
    if (!sub) return c.json({ error: 'subscription_not_found' }, 404);

    const customer = await customerRepo.findById(tenantId, sub.customerId);
    if (!customer) return c.json({ error: 'customer_not_found' }, 404);

    const plan = await planRepo.findById(tenantId, sub.planId);
    if (!plan) return c.json({ error: 'plan_not_found' }, 404);

    const body = CheckoutLinkSchema.safeParse(await c.req.json().catch(() => ({})));
    const callbackUrl = body.success ? (body.data.callbackUrl ?? env.CHECKOUT_CALLBACK_URL ?? 'https://app.useplinth.xyz/checkout/complete') : 'https://app.useplinth.xyz/checkout/complete';

    // Convention: plinth_{subId}_{6-char suffix} — ~42 chars, within Nomba's 50-char limit.
    // Suffix ensures each retry gets a fresh Nomba order (Nomba rejects duplicate refs).
    // Webhook strips the suffix (last underscore onward) to recover the subId.
    const orderReference = `plinth_${sub.id}_${ulid().slice(-6)}`;

    // Nomba's hosted checkout rejects a ₦0 amount, so there is no card-tokenization-without-charge.
    // The checkout is therefore only used for the "pay to unlock" path (an `incomplete` subscription):
    // it charges period 1 and tokenizes the card in one step. No-card trials never reach here — the
    // caller grants access without a checkout and collects payment at trial end.
    const result = await nomba.createCheckoutOrder({
      amountMinor:        plan.amountMinor,
      currency:           plan.currency ?? 'NGN',
      orderReference,
      callbackUrl,
      customerEmail:      customer.email,
      customerId:         customer.id,
      tokenizeCard:       true,
      // Split settlement to the tenant's sub-account when configured (omit → no split).
      ...(env.NOMBA_SUB_ACCOUNT_ID ? { tenantSubAccountId: env.NOMBA_SUB_ACCOUNT_ID } : {}),
    });

    return c.json({
      checkoutLink:   result.checkoutLink,
      orderReference: result.orderReference,
      customerId:     customer.id,
      subscriptionId: sub.id,
    }, 200);
  });

  // POST /v1/subscriptions/:id/change-checkout
  // No-card upgrade path: when the customer has no payment method on file, collect the prorated
  // upgrade amount via a Nomba-hosted checkout instead of erroring. The intended change is recorded
  // as pending; the payment webhook (applyPaidChange) swaps the plan once the money settles.
  router.post('/:id/change-checkout', async (c) => {
    const tenantId = c.get('tenantId');
    const subId    = c.req.param('id');

    const parsed = ChangeCheckoutSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: 'plan_id_required' }, 400);

    const sub = await subscriptionRepo.findById(tenantId, subId);
    if (!sub) return c.json({ error: 'subscription_not_found' }, 404);

    const customer = await customerRepo.findById(tenantId, sub.customerId);
    if (!customer) return c.json({ error: 'customer_not_found' }, 404);

    // Records the pending change and returns the amount to collect (throws no_payment_required if nothing is due).
    const change = await planChangeService.beginCheckoutChange({
      tenantId, subscriptionId: subId, newPlanId: parsed.data.plan_id,
    });

    const callbackUrl = parsed.data.callbackUrl ?? env.CHECKOUT_CALLBACK_URL ?? 'https://app.useplinth.xyz/checkout/complete';
    const orderReference = `plinth_${sub.id}_${ulid().slice(-6)}`;

    const result = await nomba.createCheckoutOrder({
      amountMinor:   BigInt(change.dueMinor),
      currency:      'NGN',
      orderReference,
      callbackUrl,
      customerEmail: customer.email,
      customerId:    customer.id,
      tokenizeCard:  true,
      ...(env.NOMBA_SUB_ACCOUNT_ID ? { tenantSubAccountId: env.NOMBA_SUB_ACCOUNT_ID } : {}),
    });

    return c.json({
      checkoutLink:   result.checkoutLink,
      orderReference: result.orderReference,
      customerId:     customer.id,
      subscriptionId: sub.id,
      dueMinor:       change.dueMinor,
      direction:      change.direction,
      newPlanName:    change.newPlanName,
    }, 200);
  });

  return router;
}
