import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/* Verified against dunning (grace_days) and catalog (activation_strategy,
   billing_mode, change_during_dunning, cancel_policy — used for preset
   detection). Extended further when settings' billing-policy form (which
   also writes upgrade/downgrade strategy, max debt, etc.) is migrated. */
export interface Policy {
  activation_strategy: string;
  billing_mode: string;
  grace_days: number;
  change_during_dunning: string;
  cancel_policy: string;
  [key: string]: unknown;
}

const policyKeys = { all: ['policy'] as const };

export function usePolicy() {
  return useQuery({
    queryKey: policyKeys.all,
    queryFn: () => api.policy.get() as Promise<Policy>,
  });
}

export function useApplyPolicyPreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preset: string) => api.policy.applyPreset(preset) as Promise<Policy>,
    onSuccess: (updated) => {
      queryClient.setQueryData(policyKeys.all, updated);
    },
  });
}

export interface UpdatePolicyInput {
  upgrade_strategy: string;
  downgrade_strategy: string;
  dunning_change_policy: string;
  grace_days: number;
  max_debt_kobo: number;
  max_attempts: number;
  payday_day: number;
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePolicyInput) => api.policy.update(data) as Promise<Policy>,
    onSuccess: (updated) => {
      queryClient.setQueryData(policyKeys.all, updated);
    },
  });
}
