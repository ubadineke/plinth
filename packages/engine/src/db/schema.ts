import { sql } from 'drizzle-orm';
import {
  pgTable, text, integer, boolean, timestamp, bigint, json,
  index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { SubscriptionState } from '../domain/state-machines/subscription.js';
import type { InvoiceState, BillingMode } from '../domain/state-machines/invoice.js';

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

export const tenantApiKeys = pgTable(
  'tenant_api_keys',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    keyHash: text('key_hash').notNull(),
    mode: text('mode').notNull().$type<'test' | 'live'>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('tenant_api_keys_key_hash_idx').on(t.keyHash),
    index('tenant_api_keys_tenant_id_idx').on(t.tenantId),
  ],
);

export const clockState = pgTable('clock_state', {
  id: text('id').primaryKey().default('global'),
  mode: text('mode').notNull().$type<'real' | 'test'>().default('real'),
  simulatedNow: timestamp('simulated_now', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    key: text('key').notNull(),
    requestFingerprint: text('request_fingerprint').notNull(),
    responseStatus: integer('response_status'),
    responseBody: json('response_body'),
    resourceId: text('resource_id'),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('idempotency_keys_tenant_key_idx').on(t.tenantId, t.key),
    index('idempotency_keys_created_at_idx').on(t.createdAt),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id'),
    actorId: text('actor_id'),
    actorType: text('actor_type').notNull(),
    action: text('action').notNull(),
    resourceType: text('resource_type'),
    resourceId: text('resource_id'),
    correlationId: text('correlation_id'),
    before: json('before'),
    after: json('after'),
    success: boolean('success').notNull().default(true),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('audit_logs_tenant_id_idx').on(t.tenantId),
    index('audit_logs_resource_idx').on(t.resourceType, t.resourceId),
    index('audit_logs_occurred_at_idx').on(t.occurredAt),
  ],
);

export const customers = pgTable(
  'customers',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    externalRef: text('external_ref').notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    accountBalanceMinor: bigint('account_balance_minor', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('customers_tenant_external_ref_idx').on(t.tenantId, t.externalRef)],
);

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    customerId: text('customer_id').notNull(),
    invoiceId: text('invoice_id'),
    type: text('type').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    balanceAfterMinor: bigint('balance_after_minor', { mode: 'bigint' }).notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('ledger_entries_tenant_customer_idx').on(t.tenantId, t.customerId, t.createdAt),
  ],
);

export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    type: text('type').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id').notNull(),
    payload: json('payload').notNull().$type<Record<string, unknown>>(),
    delivered: boolean('delivered').notNull().default(false),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('events_tenant_id_delivered_idx').on(t.tenantId, t.delivered),
    index('events_occurred_at_idx').on(t.occurredAt),
  ],
);

export const planGroups = pgTable(
  'plan_groups',
  {
    id:          text('id').primaryKey(),
    tenantId:    text('tenant_id').notNull(),
    name:        text('name').notNull(),
    description: text('description'),
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('plan_groups_tenant_id_name_idx').on(t.tenantId, t.name),
  ],
);

export const plans = pgTable(
  'plans',
  {
    id:                   text('id').primaryKey(),
    tenantId:             text('tenant_id').notNull(),
    planGroupId:          text('plan_group_id').notNull(),
    name:                 text('name').notNull(),
    amountMinor:          bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency:             text('currency').notNull().default('NGN'),
    billingInterval:      text('billing_interval').notNull().$type<'day' | 'week' | 'month' | 'year'>(),
    billingIntervalCount: integer('billing_interval_count').notNull().default(1),
    trialPeriodDays:      integer('trial_period_days').notNull().default(0),
    // Stable, human-meaningful handle for a plan (e.g. "standard_monthly"). Lets integrating
    // apps reference plans by role instead of by environment-specific UUIDs.
    lookupKey:            text('lookup_key'),
    active:               boolean('active').notNull().default(true),
    createdAt:            timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt:            timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('plans_tenant_id_idx').on(t.tenantId),
    index('plans_plan_group_id_idx').on(t.planGroupId),
    uniqueIndex('plans_tenant_lookup_key_idx').on(t.tenantId, t.lookupKey),
  ],
);

export const entitlements = pgTable(
  'entitlements',
  {
    id:        text('id').primaryKey(),
    tenantId:  text('tenant_id').notNull(),
    planId:    text('plan_id').notNull(),
    feature:   text('feature').notNull(),
    value:     text('value').notNull().default('true'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('entitlements_plan_id_idx').on(t.planId),
    index('entitlements_tenant_id_feature_idx').on(t.tenantId, t.feature),
  ],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id:                     text('id').primaryKey(),
    tenantId:               text('tenant_id').notNull(),
    customerId:             text('customer_id').notNull(),
    planId:                 text('plan_id').notNull(),
    state:                  text('state').notNull().$type<SubscriptionState>(),
    billingMode:            text('billing_mode').notNull().default('advance').$type<'advance' | 'arrears'>(),
    quantity:               integer('quantity').notNull().default(1),
    defaultPaymentMethodId: text('default_payment_method_id'),
    preferredRail:          text('preferred_rail').notNull().default('card').$type<'card' | 'transfer' | 'direct_debit'>(),
    currentPeriodStart:     timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd:       timestamp('current_period_end', { withTimezone: true }).notNull(),
    nextBillAt:             timestamp('next_bill_at', { withTimezone: true }).notNull(),
    trialEndAt:             timestamp('trial_end_at', { withTimezone: true }),
    pausedAt:               timestamp('paused_at', { withTimezone: true }),
    canceledAt:             timestamp('canceled_at', { withTimezone: true }),
    // end_of_period cancel: stays active (keeps access) but won't renew — the tick cancels it at period end.
    cancelAtPeriodEnd:      boolean('cancel_at_period_end').notNull().default(false),
    metadata:               json('metadata').notNull().default({}).$type<Record<string, unknown>>(),
    createdAt:              timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt:              timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('subscriptions_tenant_state_idx').on(t.tenantId, t.state),
    index('subscriptions_next_bill_at_idx').on(t.nextBillAt),
    index('subscriptions_customer_id_idx').on(t.customerId),
    index('subscriptions_trial_end_at_idx').on(t.trialEndAt),
  ],
);

export const invoices = pgTable(
  'invoices',
  {
    id:              text('id').primaryKey(),
    tenantId:        text('tenant_id').notNull(),
    customerId:      text('customer_id').notNull(),
    subscriptionId:  text('subscription_id').notNull(),
    state:           text('state').notNull().$type<InvoiceState>(),
    currency:        text('currency').notNull().default('NGN'),
    amountDueMinor:  bigint('amount_due_minor', { mode: 'bigint' }).notNull(),
    amountPaidMinor: bigint('amount_paid_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    periodStart:     timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd:       timestamp('period_end', { withTimezone: true }).notNull(),
    dueAt:           timestamp('due_at', { withTimezone: true }).notNull(),
    billingMode:     text('billing_mode').notNull().default('advance').$type<BillingMode>(),
    isReceivable:    boolean('is_receivable').notNull().default(false),
    closedAt:        timestamp('closed_at', { withTimezone: true }),
    createdAt:       timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('invoices_tenant_state_idx').on(t.tenantId, t.state),
    index('invoices_subscription_id_idx').on(t.subscriptionId),
    index('invoices_customer_id_idx').on(t.customerId),
    index('invoices_due_at_idx').on(t.dueAt),
  ],
);

export const invoiceLineItems = pgTable(
  'invoice_line_items',
  {
    id:          text('id').primaryKey(),
    tenantId:    text('tenant_id').notNull(),
    invoiceId:   text('invoice_id').notNull(),
    description: text('description').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    quantity:    integer('quantity').notNull().default(1),
    type:        text('type').notNull().$type<'subscription' | 'proration' | 'credit' | 'adjustment'>(),
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('invoice_line_items_invoice_id_idx').on(t.invoiceId),
  ],
);

export const tenantPolicies = pgTable('tenant_policies', {
  tenantId:            text('tenant_id').primaryKey(),
  upgradeStrategy:     text('upgrade_strategy').notNull().default('immediate_prorated'),
  downgradeStrategy:   text('downgrade_strategy').notNull().default('at_period_end'),
  changeDuringDunning: text('change_during_dunning').notNull().default('gate_upgrades'),
  cancelPolicy:        text('cancel_policy').notNull().default('end_of_period'),
  activationStrategy:  text('activation_strategy').notNull().default('activate_then_charge'),
  billingMode:         text('billing_mode').notNull().default('advance').$type<'advance' | 'arrears'>(),
  graceDays:           integer('grace_days').notNull().default(7),
  maxDebtMinor:        bigint('max_debt_minor', { mode: 'bigint' }).notNull().default(sql`10000000`),
  // false (default) → one live subscription per customer per plan-group. true → allow concurrent subs.
  allowMultipleSubscriptions: boolean('allow_multiple_subscriptions').notNull().default(false),
  updatedAt:           timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const subscriptionScheduledChanges = pgTable(
  'subscription_scheduled_changes',
  {
    id:             text('id').primaryKey(),
    tenantId:       text('tenant_id').notNull(),
    subscriptionId: text('subscription_id').notNull(),
    newPlanId:      text('new_plan_id').notNull(),
    newQuantity:    integer('new_quantity').notNull().default(1),
    // 'period_end' → apply on scheduledFor (a date). 'payment' → apply when a checkout payment settles.
    applyOn:        text('apply_on').notNull().default('period_end'),
    scheduledFor:   timestamp('scheduled_for', { withTimezone: true }),
    // For apply_on='payment': the proration amount quoted at checkout (kobo), recorded as the paid invoice on settle.
    dueMinor:       bigint('due_minor', { mode: 'bigint' }),
    createdAt:      timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('sub_scheduled_changes_sub_idx').on(t.subscriptionId),
    index('sub_scheduled_changes_tenant_idx').on(t.tenantId),
  ],
);

export const virtualAccounts = pgTable(
  'virtual_accounts',
  {
    id:                   text('id').primaryKey(),
    tenantId:             text('tenant_id').notNull(),
    customerId:           text('customer_id').notNull(),
    accountRef:           text('account_ref').notNull(),
    nombaAccountHolderId: text('nomba_account_holder_id').notNull(),
    accountNumber:        text('account_number').notNull(),
    bankName:             text('bank_name').notNull(),
    accountName:          text('account_name').notNull(),
    createdAt:            timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('virtual_accounts_account_ref_idx').on(t.accountRef),
    uniqueIndex('virtual_accounts_customer_id_idx').on(t.customerId),
    index('virtual_accounts_tenant_id_idx').on(t.tenantId),
  ],
);

export const inboundTransferEvents = pgTable(
  'inbound_transfer_events',
  {
    id:             text('id').primaryKey(),
    nombaRequestId: text('nomba_request_id').notNull(),
    accountRef:     text('account_ref').notNull(),
    amountMinor:    bigint('amount_minor', { mode: 'bigint' }).notNull(),
    narration:      text('narration').notNull().default(''),
    sessionId:      text('session_id').notNull().default(''),
    tenantId:       text('tenant_id'),
    customerId:     text('customer_id'),
    invoiceId:      text('invoice_id'),
    outcome:        text('outcome').notNull(),
    createdAt:      timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('inbound_transfer_events_nomba_request_id_idx').on(t.nombaRequestId),
  ],
);

export const suspenseItems = pgTable(
  'suspense_items',
  {
    id:             text('id').primaryKey(),
    tenantId:       text('tenant_id'),
    amountMinor:    bigint('amount_minor', { mode: 'bigint' }).notNull(),
    accountRef:     text('account_ref').notNull(),
    narration:      text('narration').notNull().default(''),
    nombaRequestId: text('nomba_request_id').notNull(),
    reason:         text('reason').notNull(),
    resolvedAt:     timestamp('resolved_at', { withTimezone: true }),
    resolvedNote:   text('resolved_note'),
    createdAt:      timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('suspense_items_tenant_id_idx').on(t.tenantId),
    index('suspense_items_resolved_at_idx').on(t.resolvedAt),
  ],
);

export const dunningAttempts = pgTable(
  'dunning_attempts',
  {
    id:             text('id').primaryKey(),
    tenantId:       text('tenant_id').notNull(),
    subscriptionId: text('subscription_id').notNull(),
    invoiceId:      text('invoice_id').notNull(),
    attemptNumber:  integer('attempt_number').notNull(),
    declineCode:    text('decline_code').notNull(),
    declineType:    text('decline_type').notNull().$type<'soft' | 'hard'>(),
    nextRetryAt:    timestamp('next_retry_at', { withTimezone: true }),
    attemptedAt:    timestamp('attempted_at', { withTimezone: true }).notNull(),
    createdAt:      timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('dunning_attempts_sub_idx').on(t.subscriptionId),
    index('dunning_attempts_tenant_idx').on(t.tenantId),
  ],
);

export const cardTokens = pgTable(
  'card_tokens',
  {
    id:         text('id').primaryKey(),
    tenantId:   text('tenant_id').notNull(),
    customerId: text('customer_id').notNull(),
    tokenKey:   text('token_key').notNull(),
    createdAt:  timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('card_tokens_customer_id_idx').on(t.customerId),
    index('card_tokens_tenant_id_idx').on(t.tenantId),
  ],
);

export const claimTokens = pgTable(
  'claim_tokens',
  {
    id:        text('id').primaryKey(),
    tenantId:  text('tenant_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    usedAt:    timestamp('used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('claim_tokens_token_hash_idx').on(t.tokenHash)],
);

export const tenantApplications = pgTable(
  'tenant_applications',
  {
    id:                 text('id').primaryKey(),
    businessName:       text('business_name').notNull(),
    email:              text('email').notNull(),
    rcNumber:           text('rc_number'),
    website:            text('website'),
    contactName:        text('contact_name').notNull(),
    description:        text('description'),
    status:             text('status').notNull().$type<'pending' | 'approved' | 'rejected'>().default('pending'),
    nombaSubAccountId:  text('nomba_sub_account_id'),
    tenantId:           text('tenant_id'),
    rejectionReason:    text('rejection_reason'),
    reviewedAt:         timestamp('reviewed_at', { withTimezone: true }),
    createdAt:          timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('tenant_applications_status_idx').on(t.status),
    index('tenant_applications_email_idx').on(t.email),
  ],
);
