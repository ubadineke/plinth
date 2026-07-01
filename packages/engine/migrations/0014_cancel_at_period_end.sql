-- Subscription cancellation honoring cancel_policy. For 'end_of_period', the subscription stays
-- active (access retained) but is flagged to not renew; the renewal tick transitions it to
-- 'canceled' at period end. For 'immediate', it goes to 'canceled' right away (no flag needed).
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" boolean NOT NULL DEFAULT false;
