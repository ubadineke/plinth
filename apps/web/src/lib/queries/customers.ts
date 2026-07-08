import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { Customer, Entitlements, ListResponse, VirtualAccount } from '@/lib/types';

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers.lists(),
    queryFn: () => api.customers.list() as Promise<ListResponse<Customer>>,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id ?? ''),
    queryFn: () => api.customers.get(id as string) as Promise<Customer>,
    enabled: Boolean(id),
  });
}

/* Best-effort, same as the old Promise.allSettled: a failure here (including
   a 404) just means the customer detail page renders without this data,
   it never blocks the page or surfaces as a hard error. */
export function useCustomerEntitlements(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.entitlements(id ?? ''),
    queryFn: () => api.customers.entitlements(id as string) as Promise<Entitlements>,
    enabled: Boolean(id),
  });
}

export function useCustomerVirtualAccount(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.virtualAccount(id ?? ''),
    // "no VA yet" resolves as null (mock) or rejects 404 (real backend) —
    // either way the UI just checks truthiness, so both are handled below.
    queryFn: () => api.customers.getVirtualAccount(id as string) as Promise<VirtualAccount | null>,
    enabled: Boolean(id),
  });
}

export interface CreateCustomerInput {
  external_ref: string;
  name: string;
  email: string;
  phone?: string;
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomerInput) => api.customers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
    },
  });
}

export function useProvisionVirtualAccount(customerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.customers.virtualAccount(customerId as string) as Promise<VirtualAccount>,
    onSuccess: (va) => {
      if (customerId) queryClient.setQueryData(queryKeys.customers.virtualAccount(customerId), va);
    },
  });
}
