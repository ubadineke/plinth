import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/types';

/* All fields verified across the three pages that read plans (dunning,
   subscriptions, catalog) — same /v1/plans record regardless of caller, so
   one shared shape rather than a subset per page. */
export interface Plan {
  id: string;
  plan_group_id: string;
  name: string;
  amount_minor: string;
  interval: string;
  interval_count: number;
  trial_period_days: number;
  lookup_key?: string | null;
  created_at: string;
}

const planKeys = {
  all: ['plans'] as const,
  lists: () => [...planKeys.all, 'list'] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: planKeys.lists(),
    queryFn: () => api.plans.list() as Promise<ListResponse<Plan>>,
  });
}

export interface CreatePlanInput {
  plan_group_id: string;
  name: string;
  amount_minor: number;
  billing_interval: string;
  billing_interval_count: number;
  trial_period_days: number;
  lookup_key: string;
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlanInput) => api.plans.create(data) as Promise<Plan>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
    },
  });
}

export interface UpdatePlanInput {
  name: string;
  amount_minor: number;
  billing_interval: string;
  billing_interval_count: number;
  trial_period_days: number;
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlanInput }) => api.plans.update(id, data) as Promise<Plan>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.plans.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
    },
  });
}
