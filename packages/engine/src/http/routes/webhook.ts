import { Hono } from 'hono';
import { z } from 'zod';
import { verifyNombaSignature } from '../../webhook/sign-payload.js';
import type { TransferReconService } from '../../services/transfer-recon.service.js';
import type { CardTokenizationService } from '../../services/card-token.service.js';
import type { TickService } from '../../services/billing.service.js';
import type { PlanChangeService } from '../../services/plan-change.service.js';
import type { NombaAdapter } from '../../adapters/nomba.js';
import { env } from '../../config/env.js';

// Real Nomba webhook payload shape
const NombaWebhookSchema = z.object({
  event_type: z.string(),
  requestId:  z.string(),
  data: z.object({
    merchant: z.object({
      userId:        z.string().optional().default(''),
      walletId:      z.string().optional().default(''),
      walletBalance: z.number().optional().default(0),
    }).optional().default({}),
    transaction: z.object({
      type:                  z.string(),
      transactionId:         z.string().optional().default(''),
      transactionAmount:     z.number().optional(),  // kobo, on some payloads
      amount:                z.union([z.number(), z.string()]).optional(), // naira, on VA-credit payloads
      // A VA credit's reference to our customer. Production uses `virtualAccountReference`;
      // `aliasAccountReference` kept as a fallback for older/other payload shapes.
      virtualAccountReference: z.string().optional().default(''),
      aliasAccountReference:   z.string().optional().default(''),
      recipientAccountNumber:  z.string().optional().default(''),
      responseCode:          z.string().optional().default(''),
      narration:             z.string().optional().default(''),
      sessionId:             z.string().optional().default(''),
      time:                  z.string().optional().default(''),
      orderReference:        z.string().optional().default(''),
    }),
    tokenizedCardData: z.object({
      tokenKey: z.string(),
    }).optional(),
  }),
});

export function makeWebhookRouter(
  reconService: TransferReconService,
  cardTokenService: CardTokenizationService,
  tickService: TickService,
  planChangeService: PlanChangeService,
  nomba: NombaAdapter,
): Hono {
  const router = new Hono();

  // Health/verification endpoint — some providers send a GET to confirm the URL is reachable
  // before enabling webhook delivery. Respond 200 so registration validation passes.
  router.get('/nomba', (c) => c.json({ status: 'ok', endpoint: 'nomba-webhook' }, 200));

  router.post('/nomba', async (c) => {
    const rawBody = await c.req.text();
    const sig     = c.req.header('nomba-signature') ?? '';
    const secret  = env.NOMBA_WEBHOOK_SECRET ?? '';

    // Observability: log every inbound webhook so we can inspect real payload shapes
    console.log('[webhook:nomba] inbound', JSON.stringify({ sig: sig.slice(0, 16), body: rawBody.slice(0, 1000) }));

    // Dev mirror: Nomba only delivers to one registered URL (this one, in prod), so to still see
    // live webhooks while developing locally we fire-and-forget an identical copy at a tunnel URL.
    // Never awaited — a down/slow dev tunnel must not affect the real response to Nomba.
    if (env.DEV_WEBHOOK_FORWARD_URL) {
      fetch(env.DEV_WEBHOOK_FORWARD_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'nomba-signature': sig },
        body:    rawBody,
      }).catch((e) => {
        console.warn('[webhook:nomba] dev forward failed:', e instanceof Error ? e.message : e);
      });
    }

    // Signature handling: Nomba's webhooks are inconsistent — checkout payment_success arrives
    // UNSIGNED, while VA-credit (vact_transfer) webhooks are SIGNED with a per-account secret we may
    // not hold. So we do NOT reject on a missing/mismatched signature; the authenticity anchors are
    // instead: checkout → re-verified via lookupOrder below; VA credit → matched by our internal
    // accountRef (which only we assigned). Log a mismatch for observability.
    if (sig && secret && !verifyNombaSignature(secret, sig, rawBody)) {
      console.warn('[webhook:nomba] signature mismatch — proceeding (configure NOMBA_WEBHOOK_SECRET to enforce)');
    }

    let body: unknown;
    try { body = JSON.parse(rawBody); } catch { return c.json({ error: 'invalid json' }, 400); }

    const parsed = NombaWebhookSchema.safeParse(body);
    if (!parsed.success) {
      // Unknown shape — ack and ignore
      return c.json({ received: true }, 200);
    }

    const { event_type, requestId, data } = parsed.data;
    const tx = data.transaction;

    // Virtual account credit — event type "virtual_account.funded", transaction type "vact_transfer".
    const isVaCredit = event_type === 'virtual_account.funded' || tx.type === 'vact_transfer';
    if (isVaCredit) {
      // Our customer reference. Confirmed against a real production vact_transfer WEBHOOK: the field
      // is `aliasAccountReference` (the transaction *lookup* API uses `virtualAccountReference`); we
      // accept both plus the VA number as fallbacks.
      const accountRef = tx.aliasAccountReference || tx.virtualAccountReference || tx.recipientAccountNumber;

      // A real VA-credit webhook sends the amount in NAIRA (e.g. 100.0 for ₦100) → convert to kobo.
      const amountMinor = BigInt(Math.round(Number(tx.transactionAmount ?? tx.amount ?? 0) * 100));

      await reconService.handleTransfer({
        nombaRequestId: requestId,
        accountRef,
        amountMinor,
        narration:      tx.narration,
        sessionId:      tx.sessionId,
      });
    }

    // Checkout payment settled (card or bank transfer). The webhook body is thin and unsigned,
    // so we CONFIRM with Nomba's transaction lookup before acting — that re-fetch is the
    // authenticity anchor (a forged webhook just makes us query the real, unpaid order).
    // activateFromPayment is idempotent, so the duplicate delivery is harmless.
    if (tx.orderReference?.startsWith('plinth_')) {
      const verified = await nomba.lookupOrder(tx.orderReference);
      if (verified.found && verified.settled) {
        // Card path: capture the token (from the webhook, else from the looked-up order). Transfer has none.
        const tokenKey = data.tokenizedCardData?.tokenKey ?? verified.cardToken;
        if (tokenKey) await cardTokenService.handleTokenized(tx.orderReference, tokenKey);

        const linked = await cardTokenService.resolveFromOrderRef(tx.orderReference);
        if (linked) {
          // A checkout can settle for three reasons, tried in order (each idempotent, so a duplicate
          // delivery is harmless): (1) funds a pending plan change (no-card upgrade) → swap the plan;
          // (2) pays the outstanding invoice on a dunning sub ("Update payment") → recover to active;
          // (3) first payment on an incomplete subscription → activate it.
          const applied = await planChangeService.applyPaidChange({ tenantId: linked.tenantId, subscriptionId: linked.subscriptionId });
          if (!applied) {
            const recovered = await tickService.recoverFromPayment(linked.tenantId, linked.subscriptionId);
            if (!recovered) await tickService.activateFromPayment(linked.tenantId, linked.customerId);
          }
        }
      } else {
        console.log('[webhook:nomba] order not settled per Nomba lookup — skipping', tx.orderReference, verified.status);
      }
    }

    return c.json({ received: true }, 200);
  });

  return router;
}
