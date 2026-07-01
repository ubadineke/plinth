-- One-live-subscription-per-customer-per-plan-group guard (default on). Integrators that genuinely
-- need concurrent subscriptions in the same plan-group flip this to true to opt out.
ALTER TABLE "tenant_policies" ADD COLUMN "allow_multiple_subscriptions" boolean NOT NULL DEFAULT false;
