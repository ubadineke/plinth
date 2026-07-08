/* Hierarchical query-key factory (TanStack Query convention: broad → narrow),
   so invalidating queryKeys.customers.all also invalidates every detail/
   entitlements/virtual-account key nested under it. Grown resource-by-
   resource alongside the migration, not authored all at once. */
export const queryKeys = {
  me: ['me'] as const,
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.customers.all, 'detail', id] as const,
    entitlements: (id: string) => [...queryKeys.customers.all, 'entitlements', id] as const,
    virtualAccount: (id: string) => [...queryKeys.customers.all, 'virtual-account', id] as const,
  },
  subscriptions: {
    all: ['subscriptions'] as const,
    lists: () => [...queryKeys.subscriptions.all, 'list'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    lists: (customerId?: string) => [...queryKeys.notifications.all, 'list', customerId ?? 'all'] as const,
  },
};
