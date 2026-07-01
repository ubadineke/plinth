import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { UnitOfWork } from '../db/unit-of-work.js';
import type { SubscriptionRepo, Subscription } from '../db/subscription.repo.js';
import type { EventRepo } from '../db/event.repo.js';
import type { ScheduledChangeRepo } from '../db/scheduled-change.repo.js';
import type { TenantPolicyRepo } from '../db/policy.repo.js';
import { NotFoundError, InvalidRequestError } from '../domain/errors.js';

const CANCELABLE = ['active', 'trialing', 'past_due', 'grace', 'delinquent', 'paused', 'incomplete'];

export interface CancelResult {
  subscriptionId: string;
  state: string;
  cancelAtPeriodEnd: boolean;
  effectiveAt: string;   // when access actually ends: now (immediate) or currentPeriodEnd (end_of_period)
  policy: string;
}

/**
 * Subscription cancellation honoring the tenant's cancel_policy:
 *  - 'immediate'      → cancel now; access ends immediately.
 *  - 'end_of_period'  → keep the subscription active (access retained) and flag it to not renew;
 *                       the billing tick transitions it to 'canceled' at period end (see renewOne).
 * Canceling also supersedes any pending plan change (a sub that won't renew shouldn't downgrade).
 * reactivate() undoes a still-pending end_of_period cancel.
 */
export class SubscriptionLifecycleService {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepo,
    private readonly policyRepo: TenantPolicyRepo,
    private readonly scheduledChangeRepo: ScheduledChangeRepo,
    private readonly eventRepo: EventRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async cancel(params: { tenantId: string; subscriptionId: string }): Promise<CancelResult> {
    const { tenantId, subscriptionId } = params;
    const now = this.clock.now();

    const sub = await this.subscriptionRepo.findById(tenantId, subscriptionId);
    if (!sub) throw new NotFoundError('Subscription', subscriptionId);
    if (sub.state === 'canceled') {
      throw new InvalidRequestError('already_canceled', 'Subscription is already canceled.');
    }
    if (!CANCELABLE.includes(sub.state)) {
      throw new InvalidRequestError('not_cancelable', `Subscription in state ${sub.state} cannot be canceled.`);
    }

    const policy = await this.policyRepo.findByTenantId(tenantId);
    const immediate = policy.cancelPolicy === 'immediate';

    await this.uow.run(async (tx) => {
      const locked = await this.subscriptionRepo.findForUpdate(tenantId, sub.id, tx);
      if (!locked) return;

      const updated: Subscription = immediate
        ? { ...locked, state: 'canceled', canceledAt: now, cancelAtPeriodEnd: false, updatedAt: now }
        : { ...locked, cancelAtPeriodEnd: true, updatedAt: now };
      await this.subscriptionRepo.update(updated, tx);

      // A subscription that won't renew shouldn't carry a pending plan change.
      await this.scheduledChangeRepo.deleteBySubscription(tenantId, sub.id, tx);

      await this.eventRepo.append({
        id: `evt_${ulid()}`, tenantId,
        type: immediate ? 'subscription.canceled' : 'subscription.cancel_scheduled',
        resourceType: 'subscription', resourceId: sub.id,
        payload: {
          subscriptionId: sub.id,
          policy: policy.cancelPolicy,
          effectiveAt: (immediate ? now : locked.currentPeriodEnd).toISOString(),
        },
        occurredAt: now, createdAt: now,
      }, tx);
    });

    return {
      subscriptionId: sub.id,
      state: immediate ? 'canceled' : sub.state,
      cancelAtPeriodEnd: !immediate,
      effectiveAt: (immediate ? now : sub.currentPeriodEnd).toISOString(),
      policy: policy.cancelPolicy,
    };
  }

  // Undo a still-pending end_of_period cancel (the subscription hasn't been canceled yet).
  async reactivate(params: { tenantId: string; subscriptionId: string }): Promise<CancelResult> {
    const { tenantId, subscriptionId } = params;
    const now = this.clock.now();

    const sub = await this.subscriptionRepo.findById(tenantId, subscriptionId);
    if (!sub) throw new NotFoundError('Subscription', subscriptionId);
    if (sub.state === 'canceled') {
      throw new InvalidRequestError('already_ended', 'Subscription has already ended — start a new one to resubscribe.');
    }
    if (!sub.cancelAtPeriodEnd) {
      // Nothing scheduled to cancel — no-op.
      return { subscriptionId: sub.id, state: sub.state, cancelAtPeriodEnd: false, effectiveAt: sub.currentPeriodEnd.toISOString(), policy: 'n/a' };
    }

    await this.uow.run(async (tx) => {
      const locked = await this.subscriptionRepo.findForUpdate(tenantId, sub.id, tx);
      if (!locked) return;
      await this.subscriptionRepo.update({ ...locked, cancelAtPeriodEnd: false, updatedAt: now }, tx);
      await this.eventRepo.append({
        id: `evt_${ulid()}`, tenantId, type: 'subscription.cancel_reverted',
        resourceType: 'subscription', resourceId: sub.id,
        payload: { subscriptionId: sub.id },
        occurredAt: now, createdAt: now,
      }, tx);
    });

    return { subscriptionId: sub.id, state: sub.state, cancelAtPeriodEnd: false, effectiveAt: sub.currentPeriodEnd.toISOString(), policy: 'n/a' };
  }
}
