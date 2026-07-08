import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { clockState } from '../../db/schema.js';
import { TestClock } from '../../adapters/clock.js';
import { RealClock } from '../../adapters/clock.js';
import type { TickService, TickResult } from '../../services/billing.service.js';
import type { TransferReconService } from '../../services/transfer-recon.service.js';
import type { SuspenseRepo } from '../../db/suspense.repo.js';
import type { TenantRepo } from '../../db/tenant.repo.js';

const AdvanceClockSchema = z.object({
  advanceSeconds: z.number().int().positive().max(60 * 60 * 24 * 365 * 2),
});

export function makeClockRouter(): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    const rows = await db.select().from(clockState).where(eq(clockState.id, 'global'));
    const row = rows[0];
    return c.json({
      mode:          row?.mode ?? 'real',
      simulated_now: row?.simulatedNow?.toISOString() ?? null,
      updated_at:    row?.updatedAt?.toISOString() ?? null,
    });
  });

  router.post('/advance', zValidator('json', AdvanceClockSchema), async (c) => {
    const { advanceSeconds } = c.req.valid('json');
    const next = await TestClock.advance(advanceSeconds);

    console.log(
      JSON.stringify({
        level: 'info',
        event: 'clock.advanced',
        advanceSeconds,
        simulatedNow: next.toISOString(),
        correlationId: c.get('correlationId') ?? null,
      }),
    );

    return c.json({
      object:              'clock_state',
      mode:                'test',
      simulated_now:       next.toISOString(),
      advanced_by_seconds: advanceSeconds,
    });
  });

  router.post('/reset', async (c) => {
    await db
      .insert(clockState)
      .values({ id: 'global', mode: 'real', updatedAt: new Date() })
      .onConflictDoUpdate({
        target: clockState.id,
        set: { mode: 'real', simulatedNow: null, updatedAt: new Date() },
      });

    return c.json({ object: 'clock_state', mode: 'real', simulated_now: null });
  });

  return router;
}

export function makeTickRouter(tickService: TickService, tenantRepo: TenantRepo, clock: RealClock | TestClock): Hono {
  const router = new Hono();

  router.post('/', async (c) => {
    const tenantId = c.req.query('tenant_id') ?? '';

    if (clock instanceof TestClock) await clock.refresh();

    // No tenant_id → tick every tenant, so a single scheduled caller (cron, uptime pinger) covers
    // the whole platform without needing to know tenant IDs up front.
    const tenantIds = tenantId ? [tenantId] : await tenantRepo.listIds();

    const [results, purged] = await Promise.all([
      Promise.all(tenantIds.map((id) => tickService.tick(id))),
      tenantRepo.deleteExpired(new Date()),
    ]);

    const totals = results.reduce<TickResult>(
      (acc, r) => ({
        renewed:            acc.renewed + r.renewed,
        trialsConverted:    acc.trialsConverted + r.trialsConverted,
        failed:             acc.failed + r.failed,
        dunningRetried:     acc.dunningRetried + r.dunningRetried,
        dunningRecovered:   acc.dunningRecovered + r.dunningRecovered,
        graceExpired:       acc.graceExpired + r.graceExpired,
        delinquentCanceled: acc.delinquentCanceled + r.delinquentCanceled,
      }),
      { renewed: 0, trialsConverted: 0, failed: 0, dunningRetried: 0, dunningRecovered: 0, graceExpired: 0, delinquentCanceled: 0 },
    );

    return c.json({
      object:              'tick_result',
      tenants_ticked:      tenantIds.length,
      renewed:             totals.renewed,
      trials_converted:    totals.trialsConverted,
      failed:              totals.failed,
      dunning_retried:     totals.dunningRetried,
      dunning_recovered:   totals.dunningRecovered,
      grace_expired:       totals.graceExpired,
      delinquent_canceled: totals.delinquentCanceled,
      sandboxes_purged:    purged,
    });
  });

  return router;
}

const ResolveSchema = z.object({
  note: z.string().min(1),
});

export function makeSuspenseRouter(reconService: TransferReconService, suspenseRepo: SuspenseRepo): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    const tenantId = c.req.query('tenant_id');
    const items = await suspenseRepo.findUnresolved(tenantId);
    return c.json({
      object: 'list',
      data: items.map((s) => ({
        id:              s.id,
        tenant_id:       s.tenantId,
        amount_minor:    s.amountMinor.toString(),
        account_ref:     s.accountRef,
        narration:       s.narration,
        nomba_request_id: s.nombaRequestId,
        reason:          s.reason,
        created_at:      s.createdAt.toISOString(),
      })),
    });
  });

  router.post('/:id/resolve', zValidator('json', ResolveSchema), async (c) => {
    const { id } = c.req.param();
    const { note } = c.req.valid('json');
    await suspenseRepo.resolve(id, note, new Date());
    return c.json({ object: 'suspense_item', id, resolved: true });
  });

  router.get('/tie-out', async (c) => {
    const tenantId = c.req.query('tenant_id') ?? '';
    if (!tenantId) return c.json({ error: 'tenant_id query param required' }, 400);
    const result = await reconService.tieOut(tenantId);
    return c.json({ object: 'tie_out', ...result });
  });

  return router;
}
