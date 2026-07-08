import { mockApi, USE_MOCKS } from './fixtures';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:7331';

export interface VirtualAccount {
  id: string; customer_id: string; account_number: string; bank_name: string;
  account_name: string; account_ref: string; created_at: string;
}
export interface WebhookEndpoint {
  id: string; url: string; description: string | null; enabled: boolean;
  event_types: string[]; secret?: string; created_at: string; updated_at: string;
}
export interface WebhookDelivery {
  id: string; endpoint_id: string; event_id: string; event_type: string;
  status: 'pending' | 'retrying' | 'succeeded' | 'failed'; attempts: number;
  response_code: number | null; error: string | null;
  next_retry_at: string | null; last_attempt_at: string | null; created_at: string;
}

function getKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('nomba_api_key') ?? '';
}

function getTenantId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('nomba_tenant_id') ?? '';
}

// Routed through /api/admin/* (a same-origin Next.js proxy) rather than the engine directly —
// the real ADMIN_SECRET is attached server-side there, so it never reaches the client bundle.
async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getKey()}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('nomba_api_key');
  localStorage.removeItem('nomba_tenant_id');
}

const realApi = {
  me: {
    get: () => request<{ id: string; name: string; created_at: string }>('/v1/me'),
  },
  customers: {
    list:          ()         => request('/v1/customers'),
    get:           (id: string)  => request(`/v1/customers/${id}`),
    entitlements:  (id: string)  => request(`/v1/customers/${id}/entitlements`),
    create:        (data: unknown) => request('/v1/customers', { method: 'POST', body: JSON.stringify(data) }),
    virtualAccount:(id: string)  => request<VirtualAccount>(`/v1/customers/${id}/virtual-account`, { method: 'POST' }),
    getVirtualAccount:(id: string) => request<VirtualAccount>(`/v1/customers/${id}/virtual-account`),
  },
  subscriptions: {
    list:          ()         => request('/v1/subscriptions'),
    get:           (id: string)  => request(`/v1/subscriptions/${id}`),
    status:        (id: string)  => request(`/v1/subscriptions/${id}/status`),
    create:        (data: unknown) => request('/v1/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
    checkoutLink:  (id: string)  => request<{ checkoutLink: string; orderReference: string; customerId: string; subscriptionId: string }>(`/v1/subscriptions/${id}/checkout-link`, { method: 'POST', body: '{}' }),
    previewChange: (id: string, data: unknown) => request(`/v1/subscriptions/${id}/preview-change`, { method: 'POST', body: JSON.stringify(data) }),
    change:        (id: string, data: unknown) => request(`/v1/subscriptions/${id}/change`, { method: 'POST', body: JSON.stringify(data) }),
  },
  plans: {
    list:   ()            => request('/v1/plans'),
    create: (data: unknown) => request('/v1/plans', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => request(`/v1/plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ archived: boolean; deleted: boolean }>(`/v1/plans/${id}`, { method: 'DELETE' }),
  },
  invoices: {
    list:   ()            => request('/v1/invoices'),
  },
  notifications: {
    list: (customerId?: string) =>
      request(`/v1/notifications${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ''}`),
    remind: (customerId: string) =>
      request('/v1/notifications/remind', { method: 'POST', body: JSON.stringify({ customer_id: customerId }) }),
  },
  notificationSettings: {
    get:    ()                => request('/v1/notification-settings'),
    update: (data: unknown)   => request('/v1/notification-settings', { method: 'PUT', body: JSON.stringify(data) }),
    test:   (channel: 'sms' | 'email', to: string) =>
      request('/v1/notification-settings/test', { method: 'POST', body: JSON.stringify({ channel, to }) }),
  },
  policy: {
    get:         ()                     => request('/v1/policy'),
    update:      (data: unknown)        => request('/v1/policy', { method: 'PUT', body: JSON.stringify(data) }),
    applyPreset: (preset: string)       => request('/v1/policy/preset', { method: 'POST', body: JSON.stringify({ preset }) }),
  },
  // Dev-only: simulate a Nomba payment_success webhook so a card token gets wired
  // onto the customer's subscriptions (no real checkout needed in fake-Nomba mode).
  webhooks: {
    simulatePayment: (orderReference: string, amountMinor: number) =>
      fetch(`${API_BASE}/webhooks/nomba`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'payment_success',
          requestId:  `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          data: {
            transaction: {
              type:              'card_payment',
              transactionAmount: amountMinor,
              orderReference,
            },
            tokenizedCardData: { tokenKey: `tok_test_${Math.random().toString(36).slice(2, 12)}` },
          },
        }),
      }).then((r) => { if (!r.ok) throw new Error(`Simulate failed ${r.status}`); return r.json(); }),
  },
  planGroups: {
    list:   ()            => request('/v1/plan-groups'),
    create: (data: unknown) => request('/v1/plan-groups', { method: 'POST', body: JSON.stringify(data) }),
  },
  clock: {
    get:     ()               => request('/admin/clock'),
    advance: (advanceSeconds: number) => request('/admin/clock/advance', { method: 'POST', body: JSON.stringify({ advanceSeconds }) }),
    reset:   ()               => request('/admin/clock/reset', { method: 'POST' }),
  },
  tick: {
    run: () => request(`/admin/tick?tenant_id=${getTenantId()}`, { method: 'POST' }),
  },
  suspense: {
    list:    ()                      => request('/admin/suspense'),
    resolve: (id: string, note: string) => request(`/admin/suspense/${id}/resolve`, { method: 'POST', body: JSON.stringify({ note }) }),
  },
  sandbox: {
    create: (data: unknown) => request('/sandbox', { method: 'POST', body: JSON.stringify(data) }),
  },
  auth: {
    claim:      (token: string)  => request<{ tenant_id: string; api_key: string }>('/v1/auth/claim', { method: 'POST', body: JSON.stringify({ token }) }),
    magicLink:  (email: string)  => request('/v1/auth/magic-link', { method: 'POST', body: JSON.stringify({ email }) }),
    demo:       ()               => request<{ tenant_id: string; api_key: string }>('/v1/auth/demo', { method: 'POST' }),
  },
  keys: {
    list:   ()                         => request('/v1/keys'),
    create: (mode: 'live' | 'test')    => request<{ api_key: string; id: string; prefix: string }>('/v1/keys', { method: 'POST', body: JSON.stringify({ mode }) }),
    revoke: (id: string)               => request(`/v1/keys/${id}`, { method: 'DELETE' }),
  },
  webhookEndpoints: {
    list:        ()             => request<{ data: WebhookEndpoint[] }>('/v1/webhook-endpoints'),
    create:      (data: { url: string; description?: string; event_types?: string[] }) =>
                                   request<WebhookEndpoint>('/v1/webhook-endpoints', { method: 'POST', body: JSON.stringify(data) }),
    update:      (id: string, data: unknown) => request<WebhookEndpoint>(`/v1/webhook-endpoints/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    rotate:      (id: string)   => request<WebhookEndpoint>(`/v1/webhook-endpoints/${id}/rotate-secret`, { method: 'POST' }),
    remove:      (id: string)   => request(`/v1/webhook-endpoints/${id}`, { method: 'DELETE' }),
    deliveries:  (id: string)   => request<{ counts: Record<string, number>; data: WebhookDelivery[] }>(`/v1/webhook-endpoints/${id}/deliveries`),
    resend:      (id: string, deliveryId: string) => request(`/v1/webhook-endpoints/${id}/deliveries/${deliveryId}/resend`, { method: 'POST' }),
  },
  applications: {
    submit:  (data: unknown) => request('/v1/applications', { method: 'POST', body: JSON.stringify(data) }),
  },
  adminApplications: {
    list:    ()                                          => adminRequest('/admin/applications'),
    approve: (id: string, nombaSubAccountId: string)    => adminRequest<{ tenantId: string }>(`/admin/applications/${id}/approve`, { method: 'POST', body: JSON.stringify({ nombaSubAccountId }) }),
    reject:  (id: string, reason: string)               => adminRequest(`/admin/applications/${id}/reject`,  { method: 'POST', body: JSON.stringify({ reason }) }),
  },
};

// When NEXT_PUBLIC_USE_MOCKS=true, serve fixtures so the whole dashboard renders with no backend.
export const api = (USE_MOCKS ? (mockApi as unknown as typeof realApi) : realApi);
