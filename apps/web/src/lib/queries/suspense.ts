import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/types';

export interface SuspenseItem {
  id: string;
  tenant_id: string;
  amount_minor: string;
  account_ref: string;
  narration: string;
  reason: string;
  created_at: string;
}

const suspenseKeys = {
  all: ['suspense'] as const,
  lists: () => [...suspenseKeys.all, 'list'] as const,
};

export function useSuspenseItems() {
  return useQuery({
    queryKey: suspenseKeys.lists(),
    queryFn: () => api.suspense.list() as Promise<ListResponse<SuspenseItem>>,
  });
}

export function useResolveSuspenseItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => api.suspense.resolve(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suspenseKeys.lists() });
    },
  });
}
