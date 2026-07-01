import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { UnitOfWork } from '../db/unit-of-work.js';
import type { CustomerRepo } from '../db/customer.repo.js';
import type { PlanRepo } from '../db/catalog.repo.js';
import type { SubscriptionRepo, Subscription, SubscriptionState } from '../db/subscription.repo.js';
import type { EventRepo, OutboxEvent } from '../db/event.repo.js';
import type { TenantPolicyRepo } from '../db/policy.repo.js';
import { NotFoundError, PlanInactiveError, ConflictError } from '../domain/errors.js';
import { addInterval, addDays } from '../domain/period.js';

export interface CreateSubscriptionInput {
  tenantId: string;
  customerId: string;
  planId: string;
  quantity?: number;
  defaultPaymentMethodId?: string;
  preferredRail?: 'card' | 'transfer' | 'direct_debit';
  billingMode?: 'advance' | 'arrears';
  metadata?: Record<string, unknown>;
}

export interface CreateSubscriptionResult {
  subscriptionId: string;
  state: SubscriptionState;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndAt: Date | null;
  nextBillAt: Date;
}

export class CreateSubscriptionService {
  constructor(
    private readonly customerRepo: CustomerRepo,
    private readonly planRepo: PlanRepo,
    private readonly subscriptionRepo: SubscriptionRepo,
    private readonly eventRepo: EventRepo,
    private readonly policyRepo: TenantPolicyRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateSubscriptionInput): Promise<CreateSubscriptionResult> {
    const now = this.clock.now();

    const [customer, plan] = await Promise.all([
      this.customerRepo.findById(input.tenantId, input.customerId),
      this.planRepo.findById(input.tenantId, input.planId),
    ]);

    if (!customer) throw new NotFoundError('Customer', input.customerId);
    if (!plan) throw new NotFoundError('Plan', input.planId);
    if (!plan.active) throw new PlanInactiveError(input.planId);

    const policy = await this.policyRepo.findByTenantId(input.tenantId);

    // Guard: one live subscription per customer per plan-group (unless the tenant opts into multiples).
    // Gives integrators a guarantee they can rely on ("a customer is subscribed, or not") instead of
    // writing their own de-duplication. Returns 409 with the existing sub id so they can reuse it.
    if (!policy.allowMultipleSubscriptions) {
      const live = (await this.subscriptionRepo.findByCustomer(input.tenantId, input.customerId))
        .filter((s) => s.state !== 'canceled');
      if (live.length > 0) {
        const groups = await Promise.all(live.map(async (s) => ({
          sub: s, groupId: (await this.planRepo.findById(input.tenantId, s.planId))?.planGroupId,
        })));
        const clash = groups.find((g) => g.groupId === plan.planGroupId);
        if (clash) {
          throw new ConflictError(
            'customer_already_subscribed',
            `Customer already has a live subscription (${clash.sub.id}) in this plan group. Change or cancel it, or enable allow_multiple_subscriptions.`,
            clash.sub.id,
          );
        }
      }
    }

    const subId = `sub_${ulid()}`;
    const hasTrial = plan.trialPeriodDays > 0;
    const billingMode = input.billingMode ?? policy.billingMode;

    const strict = policy.activationStrategy === 'charge_to_activate';

    let trialEndAt: Date | null = null;
    let currentPeriodStart: Date = now;
    let currentPeriodEnd: Date;
    let state: SubscriptionState;
    let nextBillAt: Date;

    if (hasTrial && strict) {
      // Card-required trial (Netflix-style): no access until the card is captured. The sub
      // starts `incomplete`; the tokenization webhook starts the trial once the card lands.
      state = 'incomplete';
      currentPeriodEnd = now;    // placeholder until activation
      nextBillAt = now;          // "due" = capture the card now (at checkout)
    } else if (hasTrial) {
      // Optimistic trial: access granted immediately; card collected via checkout.
      state = 'trialing';
      trialEndAt = addDays(now, plan.trialPeriodDays);
      currentPeriodEnd = trialEndAt;
      nextBillAt = trialEndAt;
    } else {
      currentPeriodEnd = addInterval(now, plan.billingInterval, plan.billingIntervalCount);
      if (billingMode === 'arrears') {
        // Arrears: pay at the end of the period — no upfront charge, access granted.
        state = 'active';
        nextBillAt = currentPeriodEnd;
      } else {
        // Advance: honour the activation strategy.
        state = strict ? 'incomplete' : 'active';
        nextBillAt = state === 'incomplete' ? now : currentPeriodEnd;
      }
    }

    const subscription: Subscription = {
      id:                     subId,
      tenantId:               input.tenantId,
      customerId:             input.customerId,
      planId:                 input.planId,
      state,
      billingMode,
      quantity:               input.quantity ?? 1,
      defaultPaymentMethodId: input.defaultPaymentMethodId ?? null,
      preferredRail:          input.preferredRail ?? 'card',
      currentPeriodStart,
      currentPeriodEnd,
      nextBillAt,
      trialEndAt,
      pausedAt:               null,
      canceledAt:             null,
      cancelAtPeriodEnd:      false,
      metadata:               input.metadata ?? {},
      createdAt:              now,
      updatedAt:              now,
    };

    const event: OutboxEvent = {
      id:           `evt_${ulid()}`,
      tenantId:     input.tenantId,
      type:         'subscription.created',
      resourceType: 'subscription',
      resourceId:   subId,
      payload: {
        id:                 subId,
        customerId:         input.customerId,
        planId:             input.planId,
        state,
        currentPeriodStart: currentPeriodStart.toISOString(),
        currentPeriodEnd:   currentPeriodEnd.toISOString(),
        trialEndAt:         trialEndAt?.toISOString() ?? null,
      },
      occurredAt: now,
      createdAt:  now,
    };

    await this.uow.run(async (tx) => {
      await this.subscriptionRepo.create(subscription, tx);
      await this.eventRepo.append(event, tx);
    });

    return { subscriptionId: subId, state, currentPeriodStart, currentPeriodEnd, trialEndAt, nextBillAt };
  }
}
