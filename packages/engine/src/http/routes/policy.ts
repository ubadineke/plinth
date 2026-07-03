import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { PolicyService, PresetId } from '../../services/policy.service.js';
import type { TenantPolicy } from '../../db/policy.repo.js';

const PresetSchema = z.object({
  preset: z.enum(['saas_standard', 'lenient', 'strict', 'transfer_first', 'postpaid']),
});

const UpdateSchema = z.object({
  upgradeStrategy:     z.enum(['immediate_prorated', 'at_period_end']).optional(),
  downgradeStrategy:   z.enum(['at_period_end', 'immediate_credit']).optional(),
  changeDuringDunning: z.enum(['gate_upgrades', 'block_all', 'allow_all']).optional(),
  cancelPolicy:        z.enum(['end_of_period', 'immediate']).optional(),
  activationStrategy:    z.enum(['activate_then_charge', 'charge_to_activate']).optional(),
  billingMode:         z.enum(['advance', 'arrears']).optional(),
  graceDays:           z.number().int().min(0).max(90).optional(),
  delinquentCancelDays: z.number().int().min(0).max(365).optional(),
  allowMultipleSubscriptions: z.boolean().optional(),
});

function serialize(p: TenantPolicy) {
  return {
    object:                'policy',
    upgrade_strategy:      p.upgradeStrategy,
    downgrade_strategy:    p.downgradeStrategy,
    change_during_dunning: p.changeDuringDunning,
    cancel_policy:         p.cancelPolicy,
    activation_strategy:   p.activationStrategy,
    billing_mode:          p.billingMode,
    grace_days:            p.graceDays,
    delinquent_cancel_days: p.delinquentCancelDays,
    max_debt_minor:        p.maxDebtMinor.toString(),
    allow_multiple_subscriptions: p.allowMultipleSubscriptions,
    updated_at:            p.updatedAt.toISOString(),
  };
}

export function makePolicyRouter(policyService: PolicyService): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    return c.json(serialize(await policyService.get(tenantId)));
  });

  router.put('/', zValidator('json', UpdateSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const updated = await policyService.update(tenantId, c.req.valid('json'));
    return c.json(serialize(updated));
  });

  router.post('/preset', zValidator('json', PresetSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const updated = await policyService.applyPreset(tenantId, c.req.valid('json').preset as PresetId);
    return c.json(serialize(updated));
  });

  return router;
}
