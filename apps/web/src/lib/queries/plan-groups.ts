import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/types';

export interface PlanGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const planGroupKeys = {
  all: ['plan-groups'] as const,
  lists: () => [...planGroupKeys.all, 'list'] as const,
};

export function usePlanGroups() {
  return useQuery({
    queryKey: planGroupKeys.lists(),
    queryFn: () => api.planGroups.list() as Promise<ListResponse<PlanGroup>>,
  });
}

export interface CreatePlanGroupInput {
  name: string;
  description?: string;
}

export function useCreatePlanGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlanGroupInput) => api.planGroups.create(data) as Promise<PlanGroup>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planGroupKeys.lists() });
    },
  });
}
