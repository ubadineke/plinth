import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface ClockState {
  simulated_now: string | null;
  [key: string]: unknown;
}

const clockKeys = { all: ['clock'] as const };

export function useClock() {
  return useQuery({
    queryKey: clockKeys.all,
    queryFn: () => api.clock.get() as Promise<ClockState>,
  });
}

export function useAdvanceClock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (advanceSeconds: number) => api.clock.advance(advanceSeconds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clockKeys.all });
    },
  });
}

export interface TickResult {
  renewed?: number;
  [key: string]: unknown;
}

export function useRunTick() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.tick.run() as Promise<TickResult>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.lists() });
      queryClient.invalidateQueries({ queryKey: clockKeys.all });
    },
  });
}
