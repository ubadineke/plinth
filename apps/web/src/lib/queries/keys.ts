import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/types';

export interface ApiKey {
  id: string;
  prefix: string;
  mode: string;
  created_at: string;
  revoked_at: string | null;
}

const apiKeyKeys = {
  all: ['api-keys'] as const,
  lists: () => [...apiKeyKeys.all, 'list'] as const,
};

export function useApiKeys(enabled: boolean) {
  return useQuery({
    queryKey: apiKeyKeys.lists(),
    queryFn: () => api.keys.list() as Promise<ListResponse<ApiKey>>,
    enabled,
  });
}

export interface CreateApiKeyResult {
  api_key: string;
  id: string;
  prefix: string;
}

/* The mock (list()/create()/revoke()) never actually persists a create or
   revoke — list() always returns the same static array. The original code
   worked around this by splicing the optimistic result into local state
   instead of refetching; setQueryData reproduces that exactly, whereas
   invalidateQueries would silently drop the new/revoked key on refetch. */
export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mode: 'live' | 'test') => api.keys.create(mode) as Promise<CreateApiKeyResult>,
    onSuccess: (created, mode) => {
      queryClient.setQueryData<ListResponse<ApiKey>>(apiKeyKeys.lists(), (old) => ({
        object: old?.object,
        data: [
          { id: created.id, prefix: created.prefix, mode, created_at: new Date().toISOString(), revoked_at: null },
          ...(old?.data ?? []),
        ],
      }));
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.keys.revoke(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ListResponse<ApiKey>>(apiKeyKeys.lists(), (old) => ({
        object: old?.object,
        data: (old?.data ?? []).map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k)),
      }));
    },
  });
}
