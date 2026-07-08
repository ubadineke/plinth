import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  loggingMiddleware,
  errorMiddleware,
  makeAuthMiddleware,
  idempotencyMiddleware,
} from './middleware.js';
import { makeTenantsRouter } from './routes/tenants.js';
import { makeCustomersRouter } from './routes/customers.js';
import { makePlanGroupsRouter, makePlansRouter } from './routes/catalog.js';
import { makeSubscriptionsRouter } from './routes/subscriptions.js';
import { makeInvoicesRouter } from './routes/invoices.js';
import { makePolicyRouter } from './routes/policy.js';
import { makeMeRouter } from './routes/me.js';
import { makeNotificationsRouter } from './routes/notifications.js';
import { makeNotificationSettingsRouter } from './routes/notification-settings.js';
import { makeClockRouter, makeTickRouter, makeSuspenseRouter } from './routes/admin.js';
import { makeWebhookRouter } from './routes/webhook.js';
import { makeSandboxRouter } from './routes/sandbox.js';
import { makeApplicationsPublicRouter, makeApplicationsAdminRouter } from './routes/applications.js';
import { makeCheckoutRouter } from './routes/checkout.js';
import { makeWebhookEndpointsRouter } from './routes/webhook-endpoints.js';
import { makeTransferRouter } from './routes/transfer.js';
import { makeAuthRouter } from './routes/auth.js';
import { makeApiKeysRouter } from './routes/keys.js';
import { TestClock } from '../adapters/clock.js';
import { env } from '../config/env.js';
import type { Container } from './container.js';

declare module 'hono' {
  interface ContextVariableMap {
    tenantId: string;
    tenantName: string;
    correlationId: string;
  }
}

export function buildApp(container: Container): Hono {
  const app = new Hono();

  app.use('*', cors({ origin: '*', allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'] }));
  app.use('*', loggingMiddleware);

  // Keep the simulated clock current for EVERY request. TestClock.now() reads a cached value that only
  // refresh() updates — without this, any non-tick path (proration, subscribe, checkout, cancel) would
  // read a stale value or fall through to real time, corrupting time-based math (e.g. proration).
  if (container.clock instanceof TestClock) {
    const testClock = container.clock;
    app.use('*', async (_c, next) => {
      await testClock.refresh();
      await next();
    });
  }

  app.get('/health', (c) => c.json({ status: 'ok', service: 'plinth' }));

  app.route('/sandbox', makeSandboxRouter(container.sandboxService));
  app.route('/v1/auth', makeAuthRouter(container.authService));
  app.route('/v1/applications', makeApplicationsPublicRouter(container.applicationService));
  app.route('/admin/applications', makeApplicationsAdminRouter(container.applicationService, env.ADMIN_SECRET));
  app.route('/admin/clock', makeClockRouter());
  app.route('/admin/tick', makeTickRouter(container.tickService, container.tenantRepo, container.clock));
  app.route('/admin/suspense', makeSuspenseRouter(container.reconService, container.suspenseRepo));
  app.route('/webhooks', makeWebhookRouter(container.reconService, container.cardTokenService, container.tickService, container.planChangeService, container.nomba));

  // Admin: manually run an outbound-webhook dispatch cycle (fan-out + deliver due). The scheduler
  // does this automatically; this lets demos/tests flush immediately.
  app.post('/admin/webhooks/dispatch', async (c) => {
    const result = await container.webhookDispatchService.tick();
    return c.json({ object: 'dispatch_result', ...result });
  });

  const bootstrapRouter = new Hono();
  bootstrapRouter.use('*', idempotencyMiddleware);
  bootstrapRouter.route('/', makeTenantsRouter(container.createTenantService));
  app.route('/v1/tenants', bootstrapRouter);

  const v1 = new Hono();
  v1.use('*', makeAuthMiddleware(container.tenantRepo));
  v1.use('*', idempotencyMiddleware);

  v1.route('/customers',     makeCustomersRouter(container.createCustomerService, container.provisionVaService, container.entitlementsService, container.customerRepo, container.cardTokenService));
  v1.route('/plan-groups',   makePlanGroupsRouter(container.createPlanGroupService, container.planGroupRepo));
  v1.route('/plans',         makePlansRouter(container.createPlanService, container.updatePlanService, container.deletePlanService, container.planRepo));
  v1.route('/subscriptions', makeSubscriptionsRouter(container.createSubscriptionService, container.planChangeService, container.entitlementsService, container.subscriptionRepo, container.scheduledChangeRepo, container.subscriptionLifecycleService));
  v1.route('/subscriptions', makeCheckoutRouter(container.nomba, container.subscriptionRepo, container.customerRepo, container.planRepo, container.planChangeService));
  v1.route('/subscriptions', makeTransferRouter(container.transferPaymentService));
  v1.route('/invoices',     makeInvoicesRouter(container.invoiceRepo));
  v1.route('/policy',       makePolicyRouter(container.policyService));
  v1.route('/webhook-endpoints', makeWebhookEndpointsRouter(container.webhookEndpointService, container.webhookDeliveryRepo));
  v1.route('/me',           makeMeRouter(container.tenantRepo));
  v1.route('/notifications', makeNotificationsRouter(container.notificationLogRepo, container.notificationService));
  v1.route('/notification-settings', makeNotificationSettingsRouter(container.notificationSettingsRepo, container.notificationService, container.clock));
  v1.route('/keys',         makeApiKeysRouter(container.tenantRepo, container.clock));

  app.route('/v1', v1);

  app.onError(errorMiddleware);

  return app;
}
