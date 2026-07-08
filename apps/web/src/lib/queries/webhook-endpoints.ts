import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const webhookEndpointKeys = {
  all: ['webhook-endpoints'] as const,
  lists: () => [...webhookEndpointKeys.all, 'list'] as const,
  deliveries: (id: string) => [...webhookEndpointKeys.all, 'deliveries', id] as const,
};

export function useWebhookEndpoints() {
  return useQuery({
    queryKey: webhookEndpointKeys.lists(),
    queryFn: () => api.webhookEndpoints.list(),
  });
}

export function useWebhookDeliveries(endpointId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: webhookEndpointKeys.deliveries(endpointId ?? ''),
    queryFn: () => api.webhookEndpoints.deliveries(endpointId as string),
    enabled,
  });
}

export interface CreateWebhookEndpointInput {
  url: string;
  description?: string;
}

export function useCreateWebhookEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWebhookEndpointInput) => api.webhookEndpoints.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookEndpointKeys.lists() });
    },
  });
}

export function useToggleWebhookEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.webhookEndpoints.update(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookEndpointKeys.lists() });
    },
  });
}

export function useRotateWebhookSecret() {
  return useMutation({
    mutationFn: (id: string) => api.webhookEndpoints.rotate(id),
  });
}

export function useRemoveWebhookEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.webhookEndpoints.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookEndpointKeys.lists() });
    },
  });
}

export function useResendWebhookDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ endpointId, deliveryId }: { endpointId: string; deliveryId: string }) =>
      api.webhookEndpoints.resend(endpointId, deliveryId),
    onSuccess: (_data, { endpointId }) => {
      queryClient.invalidateQueries({ queryKey: webhookEndpointKeys.deliveries(endpointId) });
    },
  });
}
