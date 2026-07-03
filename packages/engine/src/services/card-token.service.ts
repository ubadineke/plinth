import { ulid } from 'ulid';
import { db } from '../db/client.js';
import { subscriptions } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import type { DrizzleCardTokenRepo } from '../db/card-token.repo.js';
import type { CustomerRepo } from '../db/customer.repo.js';

/**
 * Handles card tokenization from Nomba payment_success webhooks.
 * orderReference convention: plinth_{subId}  (e.g. plinth_sub_01XXX — 35 chars, ≤ Nomba's 50 limit)
 */
export class CardTokenizationService {
  constructor(
    private readonly cardTokenRepo: DrizzleCardTokenRepo,
    private readonly customerRepo: CustomerRepo,
  ) {}

  // Parse orderReference → subId → { tenantId, customerId, subscriptionId }. Used by card, transfer, and change paths.
  async resolveFromOrderRef(orderReference: string): Promise<{ tenantId: string; customerId: string; subscriptionId: string } | null> {
    if (!orderReference.startsWith('plinth_')) return null;

    // Format: plinth_{subId}_{6-char-suffix}  e.g. plinth_sub_01XXX_AB1C23
    const withoutPrefix = orderReference.slice('plinth_'.length);
    const lastUnder = withoutPrefix.lastIndexOf('_');
    const subId = lastUnder > 3 ? withoutPrefix.slice(0, lastUnder) : withoutPrefix;

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subId)).limit(1);
    if (!sub) return null;
    return { tenantId: sub.tenantId, customerId: sub.customerId, subscriptionId: sub.id };
  }

  // Revoke a customer's saved card: delete the stored token and clear it off every subscription so
  // the engine can never charge it again. Returns the removed tokenKey (if any) so the caller can
  // also delete it at Nomba. This is the customer's off-switch.
  async revoke(tenantId: string, customerId: string): Promise<{ removed: boolean; tokenKey: string | null }> {
    const existing = await this.cardTokenRepo.findByCustomerId(customerId);
    const tokenKey = existing?.tenantId === tenantId ? existing.tokenKey : null;

    await this.cardTokenRepo.deleteByCustomer(tenantId, customerId);
    await db
      .update(subscriptions)
      .set({ defaultPaymentMethodId: null, updatedAt: new Date() })
      .where(and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.customerId, customerId)));

    return { removed: !!tokenKey, tokenKey };
  }

  async handleTokenized(orderReference: string, tokenKey: string): Promise<{ tenantId: string; customerId: string } | null> {
    const resolved = await this.resolveFromOrderRef(orderReference);
    if (!resolved) return null;

    const { tenantId, customerId } = resolved;

    const now = new Date();

    await this.cardTokenRepo.upsertByCustomer({
      id:         `ctok_${ulid()}`,
      tenantId,
      customerId,
      tokenKey,
      createdAt:  now,
      updatedAt:  now,
    });

    // Wire token onto all active/trialing/past_due subscriptions for this customer
    await db
      .update(subscriptions)
      .set({ defaultPaymentMethodId: tokenKey, updatedAt: now })
      .where(
        and(
          eq(subscriptions.tenantId, tenantId),
          eq(subscriptions.customerId, customerId),
          inArray(subscriptions.state, ['active', 'trialing', 'past_due', 'incomplete']),
        ),
      );

    return { tenantId, customerId };
  }
}
