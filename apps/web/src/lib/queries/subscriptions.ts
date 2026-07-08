import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ListResponse, Subscription } from '@/lib/types';

export function useSubscriptions() {
  return useQuery({
    queryKey: queryKeys.subscriptions.lists(),
    queryFn: () => api.subscriptions.list() as Promise<ListResponse<Subscription>>,
  });
}

export interface CreateSubscriptionInput {
  customer_id: string;
  plan_id: string;
  quantity: number;
  preferred_rail: 'card' | 'transfer' | 'direct_debit';
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSubscriptionInput) => api.subscriptions.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.lists() });
    },
  });
}

export interface CheckoutLinkResult {
  checkoutLink: string;
  orderReference: string;
  customerId: string;
  subscriptionId: string;
}

export function useCheckoutLink() {
  return useMutation({
    mutationFn: (subscriptionId: string) =>
      api.subscriptions.checkoutLink(subscriptionId) as Promise<CheckoutLinkResult>,
  });
}

export function useSimulatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderReference, amountMinor }: { orderReference: string; amountMinor: number }) =>
      api.webhooks.simulatePayment(orderReference, amountMinor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.lists() });
    },
  });
}
