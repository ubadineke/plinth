import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { CreateCustomerService } from '../../services/customer.service.js';
import type { ProvisionVirtualAccountService } from '../../services/virtual-account.service.js';
import type { EntitlementsService } from '../../services/entitlements.service.js';
import type { CardTokenizationService } from '../../services/card-token.service.js';
import type { CustomerRepo } from '../../db/customer.repo.js';

const CreateCustomerSchema = z.object({
  external_ref: z.string().min(1).max(200),
  name:         z.string().min(1).max(200),
  email:        z.string().email(),
  phone:        z.string().max(20).optional(),
});

export function makeCustomersRouter(
  createCustomerService: CreateCustomerService,
  provisionVaService: ProvisionVirtualAccountService,
  entitlementsService: EntitlementsService,
  customerRepo: CustomerRepo,
  cardTokenService: CardTokenizationService,
): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const list = await customerRepo.findAll(tenantId);
    return c.json({
      object: 'list',
      data: list.map((cu) => ({
        object:       'customer',
        id:           cu.id,
        external_ref: cu.externalRef,
        name:         cu.name,
        email:        cu.email,
        phone:        cu.phone,
        balance:      cu.accountBalanceMinor.toString(),
        created_at:   cu.createdAt.toISOString(),
      })),
    });
  });

  router.get('/:id', async (c) => {
    const tenantId = c.get('tenantId');
    const cu = await customerRepo.findById(tenantId, c.req.param('id'));
    if (!cu) return c.json({ error: 'not_found' }, 404);
    return c.json({
      object:       'customer',
      id:           cu.id,
      external_ref: cu.externalRef,
      name:         cu.name,
      email:        cu.email,
      phone:        cu.phone,
      balance:      cu.accountBalanceMinor.toString(),
      created_at:   cu.createdAt.toISOString(),
    });
  });

  router.post('/', zValidator('json', CreateCustomerSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const body = c.req.valid('json');

    const result = await createCustomerService.execute({
      tenantId,
      externalRef: body.external_ref,
      name:        body.name,
      email:       body.email,
      phone:       body.phone ?? null,
    });

    return c.json(
      {
        object:       'customer',
        id:           result.customerId,
        external_ref: result.externalRef,
        name:         result.name,
        created_at:   result.createdAt.toISOString(),
      },
      201,
    );
  });

  router.get('/:id/entitlements', async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();
    const status = await entitlementsService.getForCustomer(tenantId, id);
    return c.json({
      object:          'entitlements',
      subscription_id: status.subscriptionId,
      state:           status.state,
      has_access:      status.hasAccess,
      tier:            status.tier,
      features:        status.features,
    });
  });

  const serializeVa = (va: { id: string; customerId: string; accountNumber: string; bankName: string; accountName: string; accountRef: string; createdAt: Date }) => ({
    object:         'virtual_account',
    id:             va.id,
    customer_id:    va.customerId,
    account_number: va.accountNumber,
    bank_name:      va.bankName,
    account_name:   va.accountName,
    account_ref:    va.accountRef,
    created_at:     va.createdAt.toISOString(),
  });

  router.post('/:id/virtual-account', async (c) => {
    const tenantId = c.get('tenantId');
    const va = await provisionVaService.execute({ tenantId, customerId: c.req.param('id') });
    return c.json(serializeVa(va), 201);
  });

  // Fetch the existing VA without provisioning (404 if none yet).
  router.get('/:id/virtual-account', async (c) => {
    const tenantId = c.get('tenantId');
    const va = await provisionVaService.findExisting(tenantId, c.req.param('id'));
    if (!va) return c.json({ error: 'no_virtual_account' }, 404);
    return c.json(serializeVa(va));
  });

  // Revoke a saved card — the customer's off-switch. Deletes the stored token and clears it off
  // every subscription so the engine can never charge the card again.
  router.delete('/:id/payment-method', async (c) => {
    const tenantId = c.get('tenantId');
    const result = await cardTokenService.revoke(tenantId, c.req.param('id'));
    return c.json({ object: 'payment_method', customer_id: c.req.param('id'), revoked: result.removed });
  });

  return router;
}
