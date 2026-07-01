import { eq } from 'drizzle-orm';
import { db } from './client.js';
import { fromTxContext, type TxContext } from './unit-of-work.js';
import { tenantPolicies } from './schema.js';

export type UpgradeStrategy = 'immediate_prorated' | 'at_period_end';
export type DowngradeStrategy = 'at_period_end' | 'immediate_credit';
export type ChangeDuringDunning = 'gate_upgrades' | 'block_all' | 'allow_all';
export type CancelPolicy = 'end_of_period' | 'immediate';
// How a subscription becomes active — applies both at fresh creation and at trial end.
// activate_then_charge: optimistic — grant access immediately, collect/retry payment around it.
// charge_to_activate:  strict — only grant access once the first payment clears (else: incomplete).
export type ActivationStrategy = 'activate_then_charge' | 'charge_to_activate';
// advance: charge upfront for the coming period. arrears: no upfront charge; bill at period end.
export type BillingMode = 'advance' | 'arrears';

export interface TenantPolicy {
  tenantId: string;
  upgradeStrategy: UpgradeStrategy;
  downgradeStrategy: DowngradeStrategy;
  changeDuringDunning: ChangeDuringDunning;
  cancelPolicy: CancelPolicy;
  activationStrategy: ActivationStrategy;
  billingMode: BillingMode;
  graceDays: number;
  maxDebtMinor: bigint;
  allowMultipleSubscriptions: boolean;
  updatedAt: Date;
}

const DEFAULTS = {
  upgradeStrategy:     'immediate_prorated' as UpgradeStrategy,
  downgradeStrategy:   'at_period_end' as DowngradeStrategy,
  changeDuringDunning: 'gate_upgrades' as ChangeDuringDunning,
  cancelPolicy:        'end_of_period' as CancelPolicy,
  activationStrategy:  'activate_then_charge' as ActivationStrategy,
  billingMode:         'advance' as BillingMode,
  graceDays:           7,
  maxDebtMinor:        10_000_000n,
  allowMultipleSubscriptions: false,
};

export interface TenantPolicyRepo {
  findByTenantId(tenantId: string): Promise<TenantPolicy>;
  upsert(policy: TenantPolicy, tx?: TxContext): Promise<void>;
}

type Row = typeof tenantPolicies.$inferSelect;

function toDomain(tenantId: string, row?: Row): TenantPolicy {
  if (!row) return { tenantId, ...DEFAULTS, updatedAt: new Date(0) };
  return {
    tenantId:            row.tenantId,
    upgradeStrategy:     row.upgradeStrategy as UpgradeStrategy,
    downgradeStrategy:   row.downgradeStrategy as DowngradeStrategy,
    changeDuringDunning: row.changeDuringDunning as ChangeDuringDunning,
    cancelPolicy:        row.cancelPolicy as CancelPolicy,
    activationStrategy:    (row.activationStrategy ?? 'activate_then_charge') as ActivationStrategy,
    billingMode:         (row.billingMode ?? 'advance') as BillingMode,
    graceDays:           row.graceDays,
    maxDebtMinor:        row.maxDebtMinor ?? 10_000_000n,
    allowMultipleSubscriptions: row.allowMultipleSubscriptions ?? false,
    updatedAt:           row.updatedAt,
  };
}

export class DrizzleTenantPolicyRepo implements TenantPolicyRepo {
  async findByTenantId(tenantId: string): Promise<TenantPolicy> {
    const rows = await db.select().from(tenantPolicies).where(eq(tenantPolicies.tenantId, tenantId));
    return toDomain(tenantId, rows[0]);
  }

  async upsert(policy: TenantPolicy, tx?: TxContext): Promise<void> {
    const client = tx ? fromTxContext(tx) : db;
    await client
      .insert(tenantPolicies)
      .values({
        tenantId:            policy.tenantId,
        upgradeStrategy:     policy.upgradeStrategy,
        downgradeStrategy:   policy.downgradeStrategy,
        changeDuringDunning: policy.changeDuringDunning,
        cancelPolicy:        policy.cancelPolicy,
        activationStrategy:    policy.activationStrategy,
        billingMode:         policy.billingMode,
        graceDays:           policy.graceDays,
        maxDebtMinor:        policy.maxDebtMinor,
        allowMultipleSubscriptions: policy.allowMultipleSubscriptions,
        updatedAt:           policy.updatedAt,
      })
      .onConflictDoUpdate({
        target: tenantPolicies.tenantId,
        set: {
          upgradeStrategy:     policy.upgradeStrategy,
          downgradeStrategy:   policy.downgradeStrategy,
          changeDuringDunning: policy.changeDuringDunning,
          cancelPolicy:        policy.cancelPolicy,
          activationStrategy:  policy.activationStrategy,
          billingMode:         policy.billingMode,
          graceDays:           policy.graceDays,
          maxDebtMinor:        policy.maxDebtMinor,
          allowMultipleSubscriptions: policy.allowMultipleSubscriptions,
          updatedAt:           policy.updatedAt,
        },
      });
  }
}
