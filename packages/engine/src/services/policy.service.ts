import type { Clock } from '../adapters/clock.js';
import type { TenantPolicy, TenantPolicyRepo } from '../db/policy.repo.js';

// Named billing presets — each bundles a coherent set of policy knobs, including the
// trial-end strategy. These mirror the preset cards in the dashboard Catalog page.
export type PresetId = 'saas_standard' | 'lenient' | 'strict' | 'transfer_first' | 'postpaid';

type PresetKnobs = Omit<TenantPolicy, 'tenantId' | 'updatedAt'>;

export const PRESETS: Record<PresetId, PresetKnobs> = {
  saas_standard: {
    upgradeStrategy:     'immediate_prorated',
    downgradeStrategy:   'at_period_end',
    changeDuringDunning: 'gate_upgrades',
    cancelPolicy:        'end_of_period',
    activationStrategy:  'activate_then_charge',
    billingMode:         'advance',
    graceDays:           7,

    delinquentCancelDays: 30,
    maxDebtMinor:        10_000_000n,
    allowMultipleSubscriptions: false,
  },
  lenient: {
    upgradeStrategy:     'at_period_end',
    downgradeStrategy:   'at_period_end',
    changeDuringDunning: 'allow_all',
    cancelPolicy:        'end_of_period',
    activationStrategy:  'activate_then_charge',
    billingMode:         'advance',
    graceDays:           14,

    delinquentCancelDays: 45,
    maxDebtMinor:        20_000_000n,
    allowMultipleSubscriptions: false,
  },
  strict: {
    upgradeStrategy:     'immediate_prorated',
    downgradeStrategy:   'immediate_credit',
    changeDuringDunning: 'block_all',
    cancelPolicy:        'immediate',
    activationStrategy:  'charge_to_activate',
    billingMode:         'advance',
    graceDays:           3,

    delinquentCancelDays: 14,
    maxDebtMinor:        5_000_000n,
    allowMultipleSubscriptions: false,
  },
  transfer_first: {
    upgradeStrategy:     'at_period_end',
    downgradeStrategy:   'at_period_end',
    changeDuringDunning: 'allow_all',
    cancelPolicy:        'end_of_period',
    activationStrategy:  'activate_then_charge',
    billingMode:         'advance',
    graceDays:           21,

    delinquentCancelDays: 60,
    maxDebtMinor:        20_000_000n,
    allowMultipleSubscriptions: false,
  },
  postpaid: {
    upgradeStrategy:     'immediate_prorated',
    downgradeStrategy:   'at_period_end',
    changeDuringDunning: 'gate_upgrades',
    cancelPolicy:        'end_of_period',
    activationStrategy:  'activate_then_charge',
    billingMode:         'arrears',
    graceDays:           7,

    delinquentCancelDays: 30,
    maxDebtMinor:        10_000_000n,
    allowMultipleSubscriptions: false,
  },
};

export class PolicyService {
  constructor(
    private readonly policyRepo: TenantPolicyRepo,
    private readonly clock: Clock,
  ) {}

  async get(tenantId: string): Promise<TenantPolicy> {
    return this.policyRepo.findByTenantId(tenantId);
  }

  async update(
    tenantId: string,
    patch: { [K in keyof PresetKnobs]?: PresetKnobs[K] | undefined },
  ): Promise<TenantPolicy> {
    const current = await this.policyRepo.findByTenantId(tenantId);
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const next: TenantPolicy = { ...current, ...clean, tenantId, updatedAt: this.clock.now() };
    await this.policyRepo.upsert(next);
    return next;
  }

  async applyPreset(tenantId: string, preset: PresetId): Promise<TenantPolicy> {
    const knobs = PRESETS[preset];
    if (!knobs) throw new Error(`Unknown preset: ${preset}`);
    return this.update(tenantId, knobs);
  }
}
