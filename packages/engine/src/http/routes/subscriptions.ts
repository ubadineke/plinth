import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { CreateSubscriptionService } from '../../services/subscription.service.js';
import type { PlanChangeService } from '../../services/plan-change.service.js';
import type { EntitlementsService } from '../../services/entitlements.service.js';
import type { SubscriptionRepo } from '../../db/subscription.repo.js';
import type { ScheduledChangeRepo, ScheduledChange } from '../../db/scheduled-change.repo.js';
import type { SubscriptionLifecycleService } from '../../services/subscription-lifecycle.service.js';

const CreateSubscriptionSchema = z.object({
  customer_id:               z.string().min(1),
  plan_id:                   z.string().min(1),
  quantity:                  z.number().int().positive().default(1),
  default_payment_method_id: z.string().optional(),
  preferred_rail:            z.enum(['card', 'transfer', 'direct_debit']).default('card'),
  metadata:                  z.record(z.unknown()).optional(),
});

const PreviewChangeSchema = z.object({
  plan_id:  z.string().min(1),
  quantity: z.number().int().positive().optional(),
});

const ChangeSchema = z.object({
  plan_id:  z.string().min(1),
  quantity: z.number().int().positive().optional(),
});

export function makeSubscriptionsRouter(
  createSubscriptionService: CreateSubscriptionService,
  planChangeService: PlanChangeService,
  entitlementsService: EntitlementsService,
  subscriptionRepo: SubscriptionRepo,
  scheduledChangeRepo: ScheduledChangeRepo,
  lifecycleService: SubscriptionLifecycleService,
): Hono {
  const router = new Hono();

  // Serialize a pending period-end change (e.g. a scheduled downgrade) so clients can surface
  // "switching to X on <date>". Payment-triggered changes are excluded (findBySubscription filters them).
  const serializeScheduledChange = (sc: ScheduledChange | null) =>
    sc ? {
      id:           sc.id,
      new_plan_id:  sc.newPlanId,
      new_quantity: sc.newQuantity,
      scheduled_for: sc.scheduledFor?.toISOString() ?? null,
    } : null;

  router.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const list = await subscriptionRepo.findAll(tenantId);
    const data = await Promise.all(list.map(async (s) => ({
      object:               'subscription',
      id:                   s.id,
      customer_id:          s.customerId,
      plan_id:              s.planId,
      state:                s.state,
      quantity:             s.quantity,
      preferred_rail:       s.preferredRail,
      current_period_start: s.currentPeriodStart.toISOString(),
      current_period_end:   s.currentPeriodEnd.toISOString(),
      next_bill_at:         s.nextBillAt.toISOString(),
      trial_end_at:         s.trialEndAt?.toISOString() ?? null,
      cancel_at_period_end: s.cancelAtPeriodEnd,
      canceled_at:          s.canceledAt?.toISOString() ?? null,
      has_card:             s.defaultPaymentMethodId != null,
      created_at:           s.createdAt.toISOString(),
      scheduled_change:     serializeScheduledChange(await scheduledChangeRepo.findBySubscription(tenantId, s.id)),
    })));
    return c.json({ object: 'list', data });
  });

  router.get('/:id', async (c) => {
    const tenantId = c.get('tenantId');
    const s = await subscriptionRepo.findById(tenantId, c.req.param('id'));
    if (!s) return c.json({ error: 'not_found' }, 404);
    return c.json({
      object:               'subscription',
      id:                   s.id,
      customer_id:          s.customerId,
      plan_id:              s.planId,
      state:                s.state,
      quantity:             s.quantity,
      preferred_rail:       s.preferredRail,
      default_payment_method_id: s.defaultPaymentMethodId,
      current_period_start: s.currentPeriodStart.toISOString(),
      current_period_end:   s.currentPeriodEnd.toISOString(),
      next_bill_at:         s.nextBillAt.toISOString(),
      trial_end_at:         s.trialEndAt?.toISOString() ?? null,
      cancel_at_period_end: s.cancelAtPeriodEnd,
      canceled_at:          s.canceledAt?.toISOString() ?? null,
      created_at:           s.createdAt.toISOString(),
      scheduled_change:     serializeScheduledChange(await scheduledChangeRepo.findBySubscription(tenantId, s.id)),
    });
  });

  router.post('/', zValidator('json', CreateSubscriptionSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const body = c.req.valid('json');

    const input: Parameters<typeof createSubscriptionService.execute>[0] = {
      tenantId,
      customerId:    body.customer_id,
      planId:        body.plan_id,
      quantity:      body.quantity,
      preferredRail: body.preferred_rail,
    };
    if (body.default_payment_method_id !== undefined) input.defaultPaymentMethodId = body.default_payment_method_id;
    if (body.metadata !== undefined) input.metadata = body.metadata;

    const result = await createSubscriptionService.execute(input);

    return c.json(
      {
        object:               'subscription',
        id:                   result.subscriptionId,
        state:                result.state,
        current_period_start: result.currentPeriodStart.toISOString(),
        current_period_end:   result.currentPeriodEnd.toISOString(),
        trial_end_at:         result.trialEndAt?.toISOString() ?? null,
        next_bill_at:         result.nextBillAt.toISOString(),
      },
      201,
    );
  });

  router.post('/:id/preview-change', zValidator('json', PreviewChangeSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();
    const body = c.req.valid('json');
    const result = await planChangeService.previewChange({
      tenantId, subscriptionId: id, newPlanId: body.plan_id,
      ...(body.quantity !== undefined ? { newQuantity: body.quantity } : {}),
    });
    return c.json({ object: 'preview', ...result });
  });

  router.post('/:id/change', zValidator('json', ChangeSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();
    const body = c.req.valid('json');
    const result = await planChangeService.commitChange({
      tenantId, subscriptionId: id, newPlanId: body.plan_id,
      ...(body.quantity !== undefined ? { newQuantity: body.quantity } : {}),
    });
    return c.json({ object: 'subscription', ...result });
  });

  router.get('/:id/status', async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();
    const status = await entitlementsService.getSubscriptionStatus(tenantId, id);
    return c.json({
      object:          'entitlements',
      subscription_id: status.subscriptionId,
      state:           status.state,
      has_access:      status.hasAccess,
      tier:            status.tier,
      features:        status.features,
    });
  });

  router.delete('/:id/scheduled-change/:changeId', async (c) => {
    const tenantId = c.get('tenantId');
    const { id, changeId } = c.req.param();
    await planChangeService.cancelScheduledChange({ tenantId, subscriptionId: id, changeId });
    return c.json({ object: 'scheduled_change', id: changeId, canceled: true });
  });

  // Cancel a subscription, honoring the tenant's cancel_policy (immediate vs end_of_period).
  router.post('/:id/cancel', async (c) => {
    const tenantId = c.get('tenantId');
    const result = await lifecycleService.cancel({ tenantId, subscriptionId: c.req.param('id') });
    return c.json({ object: 'subscription', ...result });
  });

  // Undo a still-pending end_of_period cancel (keep the subscription).
  router.post('/:id/reactivate', async (c) => {
    const tenantId = c.get('tenantId');
    const result = await lifecycleService.reactivate({ tenantId, subscriptionId: c.req.param('id') });
    return c.json({ object: 'subscription', ...result });
  });

  return router;
}
