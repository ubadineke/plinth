-- After a subscription has been delinquent (access revoked, unpaid) for this many days, the billing
-- tick cancels it — the customer becomes a regular (free) user instead of sitting "on hold" forever.
ALTER TABLE "tenant_policies" ADD COLUMN "delinquent_cancel_days" integer NOT NULL DEFAULT 30;
