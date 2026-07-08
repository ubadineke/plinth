/* Canonical resource shapes shared across pages/hooks. Previously each page
   redeclared its own copy of these interfaces (customers/page.tsx,
   customers/[id]/page.tsx, etc.) — consolidated here as the data layer moves
   to TanStack Query so query hooks and pages agree on one shape. Grown
   resource-by-resource as each page is migrated, not guessed upfront. */

export interface ListResponse<T> {
  object?: string;
  data: T[];
}

export interface Customer {
  id: string;
  external_ref: string;
  name: string;
  email: string;
  phone: string | null;
  balance: string;
  created_at: string;
}

export interface Entitlements {
  subscription_id: string | null;
  state: string | null;
  has_access: boolean;
  tier: string | null;
  features: string[] | null;
}

/* current_period_end/next_bill_at are read by the customer detail page;
   preferred_rail/metadata by dunning — both are real fields on the same
   /v1/subscriptions record, not two different shapes. */
export interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  state: string;
  quantity: number;
  current_period_end?: string | null;
  next_bill_at?: string | null;
  trial_end_at?: string | null;
  created_at?: string;
  preferred_rail?: string;
  metadata?: Record<string, unknown>;
}

/* Named Record, not Notification — the latter would silently shadow the DOM
   Notification global (Web Notifications API) inside any file that imports it.
   customer_id/sms_to/email_to are present on list responses (notifications
   page) but absent on the customer-scoped list embedded in the customer
   detail page — optional rather than split into two types. */
export interface NotificationRecord {
  id: string;
  customer_id?: string;
  event_type: string | null;
  message: string | null;
  sms_to?: string | null;
  sms_status: string | null;
  email_to?: string | null;
  email_status: string | null;
  created_at: string;
}

export type { VirtualAccount, WebhookEndpoint, WebhookDelivery } from './api';
