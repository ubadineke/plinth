import { eq, and, lte, isNotNull } from 'drizzle-orm';
import { db } from './client.js';
import { fromTxContext, type DrizzleTx, type TxContext } from './unit-of-work.js';
import { subscriptions } from './schema.js';
import type { SubscriptionState } from '../domain/state-machines/subscription.js';

export type { SubscriptionState };

export interface Subscription {
  id: string;
  tenantId: string;
  customerId: string;
  planId: string;
  state: SubscriptionState;
  billingMode: 'advance' | 'arrears';
  quantity: number;
  defaultPaymentMethodId: string | null;
  preferredRail: 'card' | 'transfer' | 'direct_debit';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillAt: Date;
  trialEndAt: Date | null;
  pausedAt: Date | null;
  canceledAt: Date | null;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionRepo {
  findAll(tenantId: string): Promise<Subscription[]>;
  findById(tenantId: string, id: string, tx?: TxContext): Promise<Subscription | null>;
  findForUpdate(tenantId: string, id: string, tx: TxContext): Promise<Subscription | null>;
  findDueForBilling(tenantId: string, asOf: Date, tx?: TxContext): Promise<Subscription[]>;
  findTrialsEnding(tenantId: string, asOf: Date, tx?: TxContext): Promise<Subscription[]>;
  findByState(tenantId: string, state: SubscriptionState): Promise<Subscription[]>;
  findByCustomer(tenantId: string, customerId: string, tx?: TxContext): Promise<Subscription[]>;
  countByPlan(tenantId: string, planId: string): Promise<number>;
  create(subscription: Subscription, tx?: TxContext): Promise<void>;
  updateState(tenantId: string, id: string, state: SubscriptionState, updatedAt: Date, tx: TxContext): Promise<void>;
  update(subscription: Subscription, tx: TxContext): Promise<void>;
}

type Row = typeof subscriptions.$inferSelect;

function toDomain(row: Row): Subscription {
  return {
    id:                     row.id,
    tenantId:               row.tenantId,
    customerId:             row.customerId,
    planId:                 row.planId,
    state:                  row.state,
    billingMode:            (row.billingMode as 'advance' | 'arrears') ?? 'advance',
    quantity:               row.quantity,
    defaultPaymentMethodId: row.defaultPaymentMethodId ?? null,
    preferredRail:          row.preferredRail,
    currentPeriodStart:     row.currentPeriodStart,
    currentPeriodEnd:       row.currentPeriodEnd,
    nextBillAt:             row.nextBillAt,
    trialEndAt:             row.trialEndAt ?? null,
    pausedAt:               row.pausedAt ?? null,
    canceledAt:             row.canceledAt ?? null,
    cancelAtPeriodEnd:      row.cancelAtPeriodEnd ?? false,
    metadata:               (row.metadata as Record<string, unknown>) ?? {},
    createdAt:              row.createdAt,
    updatedAt:              row.updatedAt,
  };
}

function getClient(tx?: TxContext): DrizzleTx | typeof db {
  return tx ? fromTxContext(tx) : db;
}

export class DrizzleSubscriptionRepo implements SubscriptionRepo {
  async findAll(tenantId: string): Promise<Subscription[]> {
    const rows = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId));
    return rows.map(toDomain);
  }

  async findById(tenantId: string, id: string, tx?: TxContext): Promise<Subscription | null> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.id, id)));
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findForUpdate(tenantId: string, id: string, tx: TxContext): Promise<Subscription | null> {
    const client = fromTxContext(tx);
    const rows = await client
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.id, id)))
      .for('update');
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findDueForBilling(tenantId: string, asOf: Date, tx?: TxContext): Promise<Subscription[]> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.tenantId, tenantId),
          eq(subscriptions.state, 'active'),
          lte(subscriptions.nextBillAt, asOf),
        ),
      );
    return rows.map(toDomain);
  }

  async findTrialsEnding(tenantId: string, asOf: Date, tx?: TxContext): Promise<Subscription[]> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.tenantId, tenantId),
          eq(subscriptions.state, 'trialing'),
          isNotNull(subscriptions.trialEndAt),
          lte(subscriptions.trialEndAt, asOf),
        ),
      );
    return rows.map(toDomain);
  }

  async findByState(tenantId: string, state: SubscriptionState): Promise<Subscription[]> {
    const rows = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.tenantId, tenantId),
          eq(subscriptions.state, state),
        ),
      );
    return rows.map(toDomain);
  }

  async findByCustomer(tenantId: string, customerId: string, tx?: TxContext): Promise<Subscription[]> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.customerId, customerId)));
    return rows.map(toDomain);
  }

  async countByPlan(tenantId: string, planId: string): Promise<number> {
    const rows = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.planId, planId)));
    return rows.length;
  }

  async create(subscription: Subscription, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client.insert(subscriptions).values({
      id:                     subscription.id,
      tenantId:               subscription.tenantId,
      customerId:             subscription.customerId,
      planId:                 subscription.planId,
      state:                  subscription.state,
      billingMode:            subscription.billingMode,
      quantity:               subscription.quantity,
      defaultPaymentMethodId: subscription.defaultPaymentMethodId,
      preferredRail:          subscription.preferredRail,
      currentPeriodStart:     subscription.currentPeriodStart,
      currentPeriodEnd:       subscription.currentPeriodEnd,
      nextBillAt:             subscription.nextBillAt,
      trialEndAt:             subscription.trialEndAt,
      pausedAt:               subscription.pausedAt,
      canceledAt:             subscription.canceledAt,
      cancelAtPeriodEnd:      subscription.cancelAtPeriodEnd,
      metadata:               subscription.metadata,
      createdAt:              subscription.createdAt,
      updatedAt:              subscription.updatedAt,
    });
  }

  async updateState(tenantId: string, id: string, state: SubscriptionState, updatedAt: Date, tx: TxContext): Promise<void> {
    const client = fromTxContext(tx);
    await client
      .update(subscriptions)
      .set({ state, updatedAt })
      .where(and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.id, id)));
  }

  async update(subscription: Subscription, tx: TxContext): Promise<void> {
    const client = fromTxContext(tx);
    await client
      .update(subscriptions)
      .set({
        planId:                 subscription.planId,
        state:                  subscription.state,
        billingMode:            subscription.billingMode,
        quantity:               subscription.quantity,
        defaultPaymentMethodId: subscription.defaultPaymentMethodId,
        preferredRail:          subscription.preferredRail,
        currentPeriodStart:     subscription.currentPeriodStart,
        currentPeriodEnd:       subscription.currentPeriodEnd,
        nextBillAt:             subscription.nextBillAt,
        trialEndAt:             subscription.trialEndAt,
        pausedAt:               subscription.pausedAt,
        canceledAt:             subscription.canceledAt,
        cancelAtPeriodEnd:      subscription.cancelAtPeriodEnd,
        metadata:               subscription.metadata,
        updatedAt:              subscription.updatedAt,
      })
      .where(and(eq(subscriptions.tenantId, subscription.tenantId), eq(subscriptions.id, subscription.id)));
  }
}
