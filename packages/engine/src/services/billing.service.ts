import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { NotificationService } from './notification.service.js';
import type { UnitOfWork } from '../db/unit-of-work.js';
import type { SubscriptionRepo, Subscription } from '../db/subscription.repo.js';
import type { InvoiceRepo, Invoice } from '../db/invoice.repo.js';
import type { EventRepo } from '../db/event.repo.js';
import type { PlanRepo } from '../db/catalog.repo.js';
import type { NombaAdapter } from '../adapters/nomba.js';
import type { PostLedgerEntryService } from './ledger.service.js';
import type { ScheduledChangeRepo } from '../db/scheduled-change.repo.js';
import type { DunningAttemptRepo } from '../db/dunning.repo.js';
import type { TenantPolicyRepo } from '../db/policy.repo.js';
import { classifyDecline } from '../domain/decline-classifier.js';
import { nextRetryAt, MAX_DUNNING_ATTEMPTS } from '../domain/dunning-schedule.js';
import { addInterval } from '../domain/period.js';
import { assertTransition } from '../domain/state-machines/subscription.js';
import type { Kobo } from '../domain/money.js';

// States a checkout payment can recover back to active (the dunning ladder).
const DUNNING_RECOVERABLE = ['past_due', 'grace', 'delinquent'];

export interface ChargeCardInput {
  tokenKey: string;
  amountMinor: Kobo;
  merchantTxRef: string;
  description: string;
}

export interface ChargeCardResult {
  success: boolean;
  providerReference: string;
  declineCode: string;
  message: string;
}

export class ChargeCardService {
  constructor(private readonly nomba: NombaAdapter) {}

  async charge(input: ChargeCardInput): Promise<ChargeCardResult> {
    try {
      const result = await this.nomba.chargeTokenizedCard({
        tokenKey:      input.tokenKey,
        amountMinor:   input.amountMinor,
        merchantTxRef: input.merchantTxRef,
        description:   input.description,
      });
      return {
        success:           result.success,
        providerReference: result.providerReference,
        declineCode:       result.providerCode,
        message:           result.message,
      };
    } catch (err) {
      return {
        success:           false,
        providerReference: '',
        declineCode:       'unknown',
        message:           err instanceof Error ? err.message : 'unknown error',
      };
    }
  }
}

export interface TickResult {
  renewed: number;
  trialsConverted: number;
  failed: number;
  dunningRetried: number;
  dunningRecovered: number;
  graceExpired: number;
  delinquentCanceled: number;
}

export class TickService {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepo,
    private readonly invoiceRepo: InvoiceRepo,
    private readonly eventRepo: EventRepo,
    private readonly planRepo: PlanRepo,
    private readonly chargeCardService: ChargeCardService,
    private readonly postLedgerEntry: PostLedgerEntryService,
    private readonly scheduledChangeRepo: ScheduledChangeRepo,
    private readonly dunningRepo: DunningAttemptRepo,
    private readonly policyRepo: TenantPolicyRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    // Optional so tests can omit it; when present, customer SMS notifications fire on lifecycle events.
    private readonly notify?: NotificationService,
  ) {}

  async tick(tenantId: string): Promise<TickResult> {
    const now = this.clock.now();
    let renewed = 0;
    let trialsConverted = 0;
    let failed = 0;

    const endingTrials = await this.subscriptionRepo.findTrialsEnding(tenantId, now);
    for (const sub of endingTrials) {
      try {
        await this.convertTrial(sub, now);
        trialsConverted++;
      } catch {
        failed++;
      }
    }

    const due = await this.subscriptionRepo.findDueForBilling(tenantId, now);
    for (const sub of due) {
      try {
        const result = await this.renewOne(sub, now);
        if (result) renewed++;
        else failed++;
      } catch {
        failed++;
      }
    }

    const dunningResult = await this.tickDunning(tenantId, now);
    const graceResult = await this.tickGrace(tenantId, now);
    const delinquentResult = await this.tickDelinquent(tenantId, now);

    return {
      renewed,
      trialsConverted,
      failed,
      dunningRetried: dunningResult.retried,
      dunningRecovered: dunningResult.recovered,
      graceExpired: graceResult.expired,
      delinquentCanceled: delinquentResult.canceled,
    };
  }

  // Trial end behaviour is policy-driven:
  //  - activate_then_charge (optimistic): grant access immediately, then bill via the normal due loop.
  //  - charge_to_activate   (strict):     bill first; only grant access once the first charge clears.
  private async convertTrial(sub: Subscription, now: Date): Promise<void> {
    const policy = await this.policyRepo.findByTenantId(sub.tenantId);
    if (policy.activationStrategy === 'charge_to_activate') {
      await this.activateByCharge(sub, now);
    } else {
      await this.activateOptimistic(sub, now);
    }
  }

  // Optimistic: flip to active but leave nextBillAt at the trial end, so the same tick's
  // due-billing loop (findDueForBilling → renewOne) bills the first period. A failed charge
  // routes to past_due, which still grants access while dunning retries.
  private async activateOptimistic(sub: Subscription, now: Date): Promise<void> {
    assertTransition(sub.state, 'active');
    await this.uow.run(async (tx) => {
      const locked = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
      if (!locked || locked.state !== 'trialing') return;

      await this.subscriptionRepo.update({
        ...locked,
        state:     'active',
        // currentPeriodEnd / nextBillAt remain at trialEndAt so the due loop bills now
        updatedAt: now,
      }, tx);

      await this.eventRepo.append({
        id:           `evt_${ulid()}`,
        tenantId:     sub.tenantId,
        type:         'subscription.trial_ended',
        resourceType: 'subscription',
        resourceId:   sub.id,
        payload: { subscriptionId: sub.id, strategy: 'activate_then_charge', activatedAt: now.toISOString() },
        occurredAt:   now,
        createdAt:    now,
      }, tx);
    });
    await this.notify?.trialEnded({ tenantId: sub.tenantId, customerId: sub.customerId, subscriptionId: sub.id });
  }

  // Strict: attempt the first charge before granting access. Success → active; no card or a
  // failed charge → incomplete (no access) until it clears. Also used to recover incomplete
  // subscriptions once a card is on file.
  private async activateByCharge(sub: Subscription, now: Date): Promise<void> {
    const plan = await this.planRepo.findById(sub.tenantId, sub.planId);
    if (!plan) return;

    const tokenKey = sub.defaultPaymentMethodId;
    if (!tokenKey) {
      await this.moveToIncomplete(sub, now, 'no_payment_method');
      return;
    }

    const periodStart = sub.currentPeriodEnd; // = trialEndAt
    const periodEnd   = addInterval(periodStart, plan.billingInterval, plan.billingIntervalCount);
    const amountDue   = plan.amountMinor * BigInt(sub.quantity);
    const invoiceId   = `inv_${ulid()}`;

    const invoice: Invoice = {
      id:              invoiceId,
      tenantId:        sub.tenantId,
      customerId:      sub.customerId,
      subscriptionId:  sub.id,
      state:           'open',
      currency:        'NGN',
      amountDueMinor:  amountDue,
      amountPaidMinor: 0n,
      periodStart,
      periodEnd,
      dueAt:           now,
      billingMode:     sub.billingMode,
      isReceivable:    false,
      closedAt:        null,
      createdAt:       now,
      updatedAt:       now,
    };

    await this.uow.run(async (tx) => {
      const locked = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
      if (!locked || (locked.state !== 'trialing' && locked.state !== 'incomplete')) return;
      await this.invoiceRepo.create(invoice, tx);
    });

    const charge = await this.chargeCardService.charge({
      tokenKey,
      amountMinor:   amountDue,
      merchantTxRef: `trial_activation_${invoiceId}`,
      description:   `Trial activation for ${sub.id}`,
    });

    if (!charge.success) {
      await this.moveToIncomplete(sub, now, charge.declineCode);
      return;
    }

    await this.uow.run(async (tx) => {
      await this.invoiceRepo.update({ ...invoice, state: 'paid', amountPaidMinor: amountDue, closedAt: now, updatedAt: now }, tx);

      const locked = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
      if (locked && (locked.state === 'trialing' || locked.state === 'incomplete')) {
        await this.subscriptionRepo.update({
          ...locked,
          state:              'active',
          currentPeriodStart: periodStart,
          currentPeriodEnd:   periodEnd,
          nextBillAt:         periodEnd,
          updatedAt:          now,
        }, tx);
      }

      await this.postLedgerEntry.executeInTx({
        tenantId:    sub.tenantId,
        customerId:  sub.customerId,
        type:        'payment_received',
        amountMinor: amountDue,
        invoiceId,
        description: `Trial activation payment for invoice ${invoiceId}`,
      }, tx);

      await this.eventRepo.append({
        id:           `evt_${ulid()}`,
        tenantId:     sub.tenantId,
        type:         'subscription.trial_ended',
        resourceType: 'subscription',
        resourceId:   sub.id,
        payload: { subscriptionId: sub.id, strategy: 'charge_to_activate', invoiceId, activatedAt: now.toISOString() },
        occurredAt:   now,
        createdAt:    now,
      }, tx);
    });
    await this.notify?.trialEnded({ tenantId: sub.tenantId, customerId: sub.customerId, subscriptionId: sub.id });
  }

  private async moveToIncomplete(sub: Subscription, now: Date, reason: string): Promise<void> {
    await this.uow.run(async (tx) => {
      const locked = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
      if (!locked || locked.state === 'incomplete') return; // already there or gone
      if (locked.state !== 'trialing') return;
      assertTransition(locked.state, 'incomplete');

      await this.subscriptionRepo.update({ ...locked, state: 'incomplete', updatedAt: now }, tx);

      await this.eventRepo.append({
        id:           `evt_${ulid()}`,
        tenantId:     sub.tenantId,
        type:         'subscription.trial_ended',
        resourceType: 'subscription',
        resourceId:   sub.id,
        payload: { subscriptionId: sub.id, result: 'incomplete', reason },
        occurredAt:   now,
        createdAt:    now,
      }, tx);
    });
  }

  // Called when a checkout payment_success webhook arrives. The hosted checkout already
  // collected the first period's payment, so we RECORD it (paid invoice) and grant access —
  // we do NOT charge again. Activates the customer's incomplete (strict) subscriptions.
  async activateFromPayment(tenantId: string, customerId: string): Promise<number> {
    const now = this.clock.now();
    const candidates = [
      ...await this.subscriptionRepo.findByState(tenantId, 'incomplete'),
      ...await this.subscriptionRepo.findByState(tenantId, 'active'),
    ].filter((s) => s.customerId === customerId);

    let handled = 0;
    for (const sub of candidates) {
      // Arrears subs were tokenized with a ₦0 checkout — no upfront payment to record.
      if (sub.billingMode === 'arrears') continue;

      const plan = await this.planRepo.findById(tenantId, sub.planId);
      if (!plan) continue;
      const amount = plan.amountMinor * BigInt(sub.quantity);

      if (sub.state === 'incomplete') {
        // Pay-to-unlock: the checkout charged period 1 and tokenized the card → record it and
        // grant access. (Nomba can't ₦0-tokenize, so there's no "card-required free trial".)
        const periodStart = now;
        const periodEnd   = addInterval(now, plan.billingInterval, plan.billingIntervalCount);
        await this.recordPaidInvoiceAndActivate(sub, amount, periodStart, periodEnd, true, now);
        handled++;
      } else {
        // Optimistic (already active): record the first-period payment once, no state change.
        const existing = await this.invoiceRepo.findBySubscription(tenantId, sub.id);
        if (existing.length > 0) continue;
        await this.recordPaidInvoiceAndActivate(sub, amount, sub.currentPeriodStart, sub.currentPeriodEnd, false, now);
        handled++;
      }
    }
    return handled;
  }

  // Recover a subscription stuck in dunning (past_due/grace/delinquent) after the customer pays the
  // outstanding invoice via checkout ("Update payment"). Settles the open invoice and returns the sub
  // to active. Card tokens are captured separately (handleTokenized); a transfer recovery leaves no
  // token, so the next renewal will dun again — inherent to transfer (no auto-charge).
  async recoverFromPayment(tenantId: string, subscriptionId: string): Promise<boolean> {
    const now = this.clock.now();
    const sub = await this.subscriptionRepo.findById(tenantId, subscriptionId);
    if (!sub || !DUNNING_RECOVERABLE.includes(sub.state)) return false;

    const invoice = await this.invoiceRepo.findOldestOpen(tenantId, sub.customerId);

    await this.uow.run(async (tx) => {
      const locked = await this.subscriptionRepo.findForUpdate(tenantId, sub.id, tx);
      if (!locked || !DUNNING_RECOVERABLE.includes(locked.state)) return;

      if (invoice) {
        await this.invoiceRepo.update({ ...invoice, state: 'paid', amountPaidMinor: invoice.amountDueMinor, closedAt: now, updatedAt: now }, tx);
        await this.postLedgerEntry.executeInTx({
          tenantId, customerId: sub.customerId, type: 'payment_received',
          amountMinor: invoice.amountDueMinor, invoiceId: invoice.id,
          description: `Dunning recovery (checkout) for ${sub.id}`,
        }, tx);
      }

      // Clear dunning bookkeeping so a recovered sub starts clean.
      const meta = { ...locked.metadata };
      delete (meta as Record<string, unknown>)['dunningNextRetryAt'];
      delete (meta as Record<string, unknown>)['enteredGraceAt'];

      // The settled invoice is for the new period — advance the sub into it so it renews next at
      // that period's end, not immediately (the old period already lapsed while dunning).
      const period = invoice
        ? { currentPeriodStart: invoice.periodStart, currentPeriodEnd: invoice.periodEnd, nextBillAt: invoice.periodEnd }
        : {};

      await this.subscriptionRepo.update({ ...locked, ...period, state: 'active', metadata: meta, updatedAt: now }, tx);
      await this.eventRepo.append({
        id: `evt_${ulid()}`, tenantId, type: 'subscription.recovered',
        resourceType: 'subscription', resourceId: sub.id,
        payload: { subscriptionId: sub.id, invoiceId: invoice?.id ?? null, via: 'checkout_payment' },
        occurredAt: now, createdAt: now,
      }, tx);
    });
    await this.notify?.recovered({ tenantId, customerId: sub.customerId, subscriptionId: sub.id, invoiceId: invoice?.id ?? null, occurredAt: now });
    return true;
  }

  // Recover any of a customer's dunning subscriptions to active — used by the transfer recon after it
  // settles the outstanding invoice (a bank transfer landing on the customer's VA). recoverFromPayment
  // no-ops the already-paid invoice and just flips the state back to active.
  async recoverFromPaymentByCustomer(tenantId: string, customerId: string): Promise<number> {
    const subs = await this.subscriptionRepo.findByCustomer(tenantId, customerId);
    let recovered = 0;
    for (const s of subs) {
      if (DUNNING_RECOVERABLE.includes(s.state) && (await this.recoverFromPayment(tenantId, s.id))) {
        recovered++;
      }
    }
    return recovered;
  }

  // Records a paid first-period invoice for a checkout payment that already happened.
  // When `activate` is true the subscription transitions incomplete → active and its period
  // is re-anchored to now; otherwise the (already-active) subscription is left as-is.
  private async recordPaidInvoiceAndActivate(
    sub: Subscription, amount: Kobo, periodStart: Date, periodEnd: Date, activate: boolean, now: Date,
  ): Promise<void> {
    const invoiceId = `inv_${ulid()}`;
    const invoice: Invoice = {
      id:              invoiceId,
      tenantId:        sub.tenantId,
      customerId:      sub.customerId,
      subscriptionId:  sub.id,
      state:           'paid',
      currency:        'NGN',
      amountDueMinor:  amount,
      amountPaidMinor: amount,
      periodStart,
      periodEnd,
      dueAt:           now,
      billingMode:     sub.billingMode,
      isReceivable:    false,
      closedAt:        now,
      createdAt:       now,
      updatedAt:       now,
    };

    await this.uow.run(async (tx) => {
      const locked = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
      if (!locked) return;
      if (activate && locked.state !== 'incomplete') return;
      if (!activate && locked.state !== 'active') return;

      await this.invoiceRepo.create(invoice, tx);

      if (activate) {
        await this.subscriptionRepo.update({
          ...locked,
          state:              'active',
          currentPeriodStart: periodStart,
          currentPeriodEnd:   periodEnd,
          nextBillAt:         periodEnd,
          updatedAt:          now,
        }, tx);
      }

      await this.postLedgerEntry.executeInTx({
        tenantId:    sub.tenantId,
        customerId:  sub.customerId,
        type:        'payment_received',
        amountMinor: amount,
        invoiceId,
        description: `Checkout payment for invoice ${invoiceId}`,
      }, tx);

      await this.eventRepo.append({
        id:           `evt_${ulid()}`,
        tenantId:     sub.tenantId,
        type:         activate ? 'subscription.activated' : 'invoice.paid',
        resourceType: 'subscription',
        resourceId:   sub.id,
        payload: { subscriptionId: sub.id, invoiceId, via: 'checkout_payment' },
        occurredAt:   now,
        createdAt:    now,
      }, tx);
    });

    // First activation → welcome; an ongoing renewal payment → receipt.
    if (activate) {
      await this.notify?.activated({ tenantId: sub.tenantId, customerId: sub.customerId, invoiceId, amountMinor: amount });
    } else {
      await this.notify?.paymentReceipt({ tenantId: sub.tenantId, customerId: sub.customerId, invoiceId, amountMinor: amount });
    }
  }

  private async renewOne(sub: Subscription, now: Date): Promise<boolean> {
    // Honor an end_of_period cancel: the period is up, so end the subscription instead of renewing.
    if (sub.cancelAtPeriodEnd) {
      await this.uow.run(async (tx) => {
        const locked = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
        if (!locked || locked.state === 'canceled') return;
        await this.subscriptionRepo.update({ ...locked, state: 'canceled', canceledAt: now, updatedAt: now }, tx);
        await this.scheduledChangeRepo.deleteBySubscription(sub.tenantId, sub.id, tx);
        await this.eventRepo.append({
          id: `evt_${ulid()}`, tenantId: sub.tenantId, type: 'subscription.canceled',
          resourceType: 'subscription', resourceId: sub.id,
          payload: { subscriptionId: sub.id, reason: 'cancel_at_period_end' },
          occurredAt: now, createdAt: now,
        }, tx);
      });
      await this.notify?.canceled({ tenantId: sub.tenantId, customerId: sub.customerId, subscriptionId: sub.id });
      return false;
    }

    // Apply any pending scheduled change at renewal
    const scheduledChange = await this.scheduledChangeRepo.findBySubscription(sub.tenantId, sub.id);
    const effectivePlanId = scheduledChange?.newPlanId ?? sub.planId;
    const effectiveQty    = scheduledChange?.newQuantity ?? sub.quantity;

    const plan = await this.planRepo.findById(sub.tenantId, effectivePlanId);
    if (!plan) return false;

    const invoiceId = `inv_${ulid()}`;
    const nextPeriodStart = sub.currentPeriodEnd;
    const nextPeriodEnd = addInterval(sub.currentPeriodEnd, plan.billingInterval, plan.billingIntervalCount);
    const amountDue = plan.amountMinor * BigInt(effectiveQty);

    const invoice: Invoice = {
      id:              invoiceId,
      tenantId:        sub.tenantId,
      customerId:      sub.customerId,
      subscriptionId:  sub.id,
      state:           'open',
      currency:        'NGN',
      amountDueMinor:  amountDue,
      amountPaidMinor: 0n,
      periodStart:     nextPeriodStart,
      periodEnd:       nextPeriodEnd,
      dueAt:           now,
      billingMode:     sub.billingMode,
      isReceivable:    false,
      closedAt:        null,
      createdAt:       now,
      updatedAt:       now,
    };

    await this.uow.run(async (tx) => {
      const locked = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
      if (!locked || locked.state !== 'active') return;
      await this.invoiceRepo.create(invoice, tx);
    });

    // Transfer rail: there's no card to charge. Open the invoice and let the customer pay it by
    // transfer to their virtual account — do NOT treat "no card" as a failed payment. Advance the
    // period (access continues) and emit a payment-due event; the app fetches the VA lazily via
    // /transfer-details. The transfer-reconciliation webhook closes the invoice when the money lands.
    if (sub.preferredRail === 'transfer') {
      await this.uow.run(async (tx) => {
        const locked = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
        if (!locked) return;
        await this.subscriptionRepo.update({
          ...locked,
          planId:             effectivePlanId,
          quantity:           effectiveQty,
          currentPeriodStart: nextPeriodStart,
          currentPeriodEnd:   nextPeriodEnd,
          nextBillAt:         nextPeriodEnd,
          updatedAt:          now,
        }, tx);
        if (scheduledChange) await this.scheduledChangeRepo.deleteBySubscription(sub.tenantId, sub.id, tx);
        await this.eventRepo.append({
          id: `evt_${ulid()}`, tenantId: sub.tenantId, type: 'invoice.payment_due',
          resourceType: 'invoice', resourceId: invoiceId,
          payload: { subscriptionId: sub.id, invoiceId, amountMinor: amountDue.toString(), rail: 'transfer' },
          occurredAt: now, createdAt: now,
        }, tx);
      });
      // Flagship notification: tell the transfer customer their account + amount so they can pay ahead.
      await this.notify?.paymentDue({ tenantId: sub.tenantId, customerId: sub.customerId, invoiceId, amountMinor: amountDue });
      return true;
    }

    const tokenKey = sub.defaultPaymentMethodId;
    if (!tokenKey) {
      await this.markPastDue(sub, invoiceId, 'no_payment_method', now);
      return false;
    }

    const charge = await this.chargeCardService.charge({
      tokenKey,
      amountMinor:   amountDue,
      merchantTxRef: `renewal_${invoiceId}`,
      description:   `Subscription renewal for ${sub.id}`,
    });

    if (charge.success) {
      await this.uow.run(async (tx) => {
        await this.invoiceRepo.update({ ...invoice, state: 'paid', amountPaidMinor: amountDue, closedAt: now, updatedAt: now }, tx);

        const locked = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
        if (locked) {
          await this.subscriptionRepo.update({
            ...locked,
            planId:             effectivePlanId,
            quantity:           effectiveQty,
            currentPeriodStart: nextPeriodStart,
            currentPeriodEnd:   nextPeriodEnd,
            nextBillAt:         nextPeriodEnd,
            updatedAt:          now,
          }, tx);
        }

        // If a scheduled change was applied, clean it up
        if (scheduledChange) {
          await this.scheduledChangeRepo.deleteBySubscription(sub.tenantId, sub.id, tx);
          await this.eventRepo.append({
            id:           `evt_${ulid()}`,
            tenantId:     sub.tenantId,
            type:         'subscription.plan_change_applied',
            resourceType: 'subscription',
            resourceId:   sub.id,
            payload: { subscriptionId: sub.id, fromPlanId: sub.planId, toPlanId: effectivePlanId, invoiceId },
            occurredAt:   now,
            createdAt:    now,
          }, tx);
        }

        await this.postLedgerEntry.executeInTx({
          tenantId:    sub.tenantId,
          customerId:  sub.customerId,
          type:        'payment_received',
          amountMinor: amountDue,
          invoiceId,
          description: `Renewal payment for invoice ${invoiceId}`,
        }, tx);

        await this.eventRepo.append({
          id:           `evt_${ulid()}`,
          tenantId:     sub.tenantId,
          type:         'subscription.renewed',
          resourceType: 'subscription',
          resourceId:   sub.id,
          payload: {
            subscriptionId: sub.id,
            invoiceId,
            amountMinor:    amountDue.toString(),
            period: {
              start: nextPeriodStart.toISOString(),
              end:   nextPeriodEnd.toISOString(),
            },
          },
          occurredAt: now,
          createdAt:  now,
        }, tx);
      });
      return true;
    } else {
      await this.markPastDue(sub, invoiceId, charge.declineCode, now);
      return false;
    }
  }

  private async markPastDue(sub: Subscription, invoiceId: string, declineCode: string, now: Date): Promise<void> {
    const declineType = classifyDecline(declineCode);

    if (declineType === 'hard') {
      // Hard decline → skip past_due, go straight to grace
      await this.dunningRepo.create({
        id:             `dun_${ulid()}`,
        tenantId:       sub.tenantId,
        subscriptionId: sub.id,
        invoiceId,
        attemptNumber:  0,
        declineCode,
        declineType:    'hard',
        nextRetryAt:    null,
        attemptedAt:    now,
        createdAt:      now,
      });
      await this.advanceToGrace(sub, now);
      return;
    }

    const retryAt = nextRetryAt(0, now);
    await this.dunningRepo.create({
      id:             `dun_${ulid()}`,
      tenantId:       sub.tenantId,
      subscriptionId: sub.id,
      invoiceId,
      attemptNumber:  0,
      declineCode,
      declineType:    'soft',
      nextRetryAt:    retryAt,
      attemptedAt:    now,
      createdAt:      now,
    });

    await this.uow.run(async (tx) => {
      await this.subscriptionRepo.update({
        ...sub,
        state:    'past_due',
        metadata: { ...sub.metadata, dunningNextRetryAt: retryAt.toISOString() },
        updatedAt: now,
      }, tx);
      await this.eventRepo.append({
        id:           `evt_${ulid()}`,
        tenantId:     sub.tenantId,
        type:         'subscription.past_due',
        resourceType: 'subscription',
        resourceId:   sub.id,
        payload:      { subscriptionId: sub.id, invoiceId, declineCode, nextRetryAt: retryAt.toISOString() },
        occurredAt:   now,
        createdAt:    now,
      }, tx);
    });
    await this.notify?.pastDue({ tenantId: sub.tenantId, customerId: sub.customerId, invoiceId });
  }

  private async advanceToGrace(sub: Subscription, now: Date): Promise<void> {
    await this.uow.run(async (tx) => {
      const locked = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
      if (!locked || (locked.state !== 'past_due' && locked.state !== 'active')) return;
      await this.subscriptionRepo.update({
        ...locked,
        state:    'grace',
        metadata: { ...locked.metadata, enteredGraceAt: now.toISOString() },
        updatedAt: now,
      }, tx);
      await this.eventRepo.append({
        id:           `evt_${ulid()}`,
        tenantId:     sub.tenantId,
        type:         'subscription.grace',
        resourceType: 'subscription',
        resourceId:   sub.id,
        payload:      { subscriptionId: sub.id, enteredGraceAt: now.toISOString() },
        occurredAt:   now,
        createdAt:    now,
      }, tx);
    });
  }

  private async tickDunning(tenantId: string, now: Date): Promise<{ retried: number; recovered: number }> {
    const pastDueSubs = await this.subscriptionRepo.findByState(tenantId, 'past_due');

    // Filter those where dunningNextRetryAt <= now
    const dueForRetry = pastDueSubs.filter((sub) => {
      const nextRetry = sub.metadata['dunningNextRetryAt'] as string | undefined;
      if (!nextRetry) return true; // no retry date = retry immediately
      return new Date(nextRetry) <= now;
    });

    let retried = 0;
    let recovered = 0;

    for (const sub of dueForRetry) {
      try {
        const wasRecovered = await this.retryDunning(sub, now);
        retried++;
        if (wasRecovered) recovered++;
      } catch { /* continue */ }
    }

    return { retried, recovered };
  }

  private async retryDunning(sub: Subscription, now: Date): Promise<boolean> {
    const attemptCount = await this.dunningRepo.countBySub(sub.tenantId, sub.id);

    const tokenKey = sub.defaultPaymentMethodId;
    if (!tokenKey) {
      await this.advanceToGrace(sub, now);
      return false;
    }

    // Find the open invoice for this sub
    const invoice = await this.invoiceRepo.findOldestOpen(sub.tenantId, sub.customerId);
    if (!invoice) {
      // No open invoice — recover (was already paid somehow)
      await this.uow.run(async (tx) => {
        await this.subscriptionRepo.updateState(sub.tenantId, sub.id, 'active', now, tx);
        await this.eventRepo.append({
          id:           `evt_${ulid()}`,
          tenantId:     sub.tenantId,
          type:         'subscription.recovered',
          resourceType: 'subscription',
          resourceId:   sub.id,
          payload:      { subscriptionId: sub.id, via: 'no_outstanding_invoice' },
          occurredAt:   now,
          createdAt:    now,
        }, tx);
      });
      return true;
    }

    const charge = await this.chargeCardService.charge({
      tokenKey,
      amountMinor:   invoice.amountDueMinor,
      merchantTxRef: `dunning_${invoice.id}_${attemptCount + 1}`,
      description:   `Dunning retry ${attemptCount + 1} for ${sub.id}`,
    });

    if (charge.success) {
      await this.uow.run(async (tx) => {
        const lockedSub = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
        if (!lockedSub || lockedSub.state !== 'past_due') return;

        await this.invoiceRepo.update({
          ...invoice,
          state:           'paid',
          amountPaidMinor: invoice.amountDueMinor,
          closedAt:        now,
          updatedAt:       now,
        }, tx);
        await this.subscriptionRepo.update({
          ...lockedSub,
          state:    'active',
          metadata: { ...lockedSub.metadata, dunningNextRetryAt: undefined },
          updatedAt: now,
        }, tx);
        await this.postLedgerEntry.executeInTx({
          tenantId:    sub.tenantId,
          customerId:  sub.customerId,
          type:        'payment_received',
          amountMinor: invoice.amountDueMinor,
          invoiceId:   invoice.id,
          description: `Dunning recovery payment`,
        }, tx);
        await this.dunningRepo.create({
          id:             `dun_${ulid()}`,
          tenantId:       sub.tenantId,
          subscriptionId: sub.id,
          invoiceId:      invoice.id,
          attemptNumber:  attemptCount,
          declineCode:    '00',
          declineType:    'soft',
          nextRetryAt:    null,
          attemptedAt:    now,
          createdAt:      now,
        }, tx);
        await this.eventRepo.append({
          id:           `evt_${ulid()}`,
          tenantId:     sub.tenantId,
          type:         'subscription.recovered',
          resourceType: 'subscription',
          resourceId:   sub.id,
          payload:      { subscriptionId: sub.id, invoiceId: invoice.id, attempt: attemptCount + 1 },
          occurredAt:   now,
          createdAt:    now,
        }, tx);
      });
      return true;
    }

    const declineType = classifyDecline(charge.declineCode);

    if (declineType === 'hard' || attemptCount + 1 >= MAX_DUNNING_ATTEMPTS) {
      await this.dunningRepo.create({
        id:             `dun_${ulid()}`,
        tenantId:       sub.tenantId,
        subscriptionId: sub.id,
        invoiceId:      invoice.id,
        attemptNumber:  attemptCount,
        declineCode:    charge.declineCode,
        declineType,
        nextRetryAt:    null,
        attemptedAt:    now,
        createdAt:      now,
      });
      await this.advanceToGrace(sub, now);
      return false;
    }

    // Soft decline, more attempts remain
    const retryAt = nextRetryAt(attemptCount, now);
    await this.dunningRepo.create({
      id:             `dun_${ulid()}`,
      tenantId:       sub.tenantId,
      subscriptionId: sub.id,
      invoiceId:      invoice.id,
      attemptNumber:  attemptCount,
      declineCode:    charge.declineCode,
      declineType,
      nextRetryAt:    retryAt,
      attemptedAt:    now,
      createdAt:      now,
    });

    await this.uow.run(async (tx) => {
      const locked = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
      if (!locked) return;
      await this.subscriptionRepo.update({
        ...locked,
        metadata:  { ...locked.metadata, dunningNextRetryAt: retryAt.toISOString() },
        updatedAt: now,
      }, tx);
      await this.eventRepo.append({
        id:           `evt_${ulid()}`,
        tenantId:     sub.tenantId,
        type:         'subscription.dunning_retried',
        resourceType: 'subscription',
        resourceId:   sub.id,
        payload:      { subscriptionId: sub.id, attempt: attemptCount + 1, nextRetryAt: retryAt.toISOString(), declineCode: charge.declineCode },
        occurredAt:   now,
        createdAt:    now,
      }, tx);
    });
    return false;
  }

  private async tickGrace(tenantId: string, now: Date): Promise<{ expired: number }> {
    const policy = await this.policyRepo.findByTenantId(tenantId);
    const graceDays = policy.graceDays;

    const graceSubs = await this.subscriptionRepo.findByState(tenantId, 'grace');
    let expired = 0;

    for (const sub of graceSubs) {
      const enteredGraceAt = sub.metadata['enteredGraceAt'] as string | undefined;
      if (!enteredGraceAt) continue;
      const graceExpiry = new Date(new Date(enteredGraceAt).getTime() + graceDays * 86_400_000);
      if (now >= graceExpiry) {
        try {
          await this.uow.run(async (tx) => {
            const locked = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
            if (!locked || locked.state !== 'grace') return;
            await this.subscriptionRepo.update({
              ...locked, state: 'delinquent',
              metadata: { ...locked.metadata, enteredDelinquentAt: now.toISOString() },
              updatedAt: now,
            }, tx);
            await this.eventRepo.append({
              id:           `evt_${ulid()}`,
              tenantId,
              type:         'subscription.delinquent',
              resourceType: 'subscription',
              resourceId:   sub.id,
              payload:      { subscriptionId: sub.id },
              occurredAt:   now,
              createdAt:    now,
            }, tx);
          });
          await this.notify?.delinquent({ tenantId: sub.tenantId, customerId: sub.customerId, subscriptionId: sub.id, occurredAt: now });
          expired++;
        } catch { /* continue */ }
      }
    }
    return { expired };
  }

  // After a subscription has been delinquent for delinquent_cancel_days, cancel it — the customer
  // becomes a regular (free) user instead of sitting "on hold" indefinitely. delinquent_cancel_days=0
  // disables this (delinquent stays terminal).
  private async tickDelinquent(tenantId: string, now: Date): Promise<{ canceled: number }> {
    const policy = await this.policyRepo.findByTenantId(tenantId);
    const days = policy.delinquentCancelDays;
    if (!days || days <= 0) return { canceled: 0 };

    const subs = await this.subscriptionRepo.findByState(tenantId, 'delinquent');
    let canceled = 0;

    for (const sub of subs) {
      const enteredAt = (sub.metadata['enteredDelinquentAt'] as string | undefined) ?? sub.updatedAt.toISOString();
      const cancelAt = new Date(new Date(enteredAt).getTime() + days * 86_400_000);
      if (now < cancelAt) continue;
      try {
        await this.uow.run(async (tx) => {
          const locked = await this.subscriptionRepo.findForUpdate(sub.tenantId, sub.id, tx);
          if (!locked || locked.state !== 'delinquent') return;
          await this.subscriptionRepo.update({ ...locked, state: 'canceled', canceledAt: now, updatedAt: now }, tx);
          await this.scheduledChangeRepo.deleteBySubscription(sub.tenantId, sub.id, tx);
          await this.eventRepo.append({
            id: `evt_${ulid()}`, tenantId, type: 'subscription.canceled',
            resourceType: 'subscription', resourceId: sub.id,
            payload: { subscriptionId: sub.id, reason: 'delinquent_expired' },
            occurredAt: now, createdAt: now,
          }, tx);
        });
        await this.notify?.canceled({ tenantId: sub.tenantId, customerId: sub.customerId, subscriptionId: sub.id });
        canceled++;
      } catch { /* continue */ }
    }
    return { canceled };
  }
}
