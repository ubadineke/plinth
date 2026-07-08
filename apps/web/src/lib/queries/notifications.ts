import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ListResponse, NotificationRecord } from '@/lib/types';

// customerId is optional by design — omit it (with enabled: true) to fetch
// the unscoped, all-customers list (dunning, notifications pages). `enabled`
// is the caller's sole gate; it must NOT be ANDed with Boolean(customerId)
// here, or the unscoped case would silently never fetch (undefined is falsy).
export function useNotifications(customerId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.notifications.lists(customerId),
    queryFn: () => api.notifications.list(customerId) as Promise<ListResponse<NotificationRecord>>,
    enabled,
  });
}

/* customerId is a mutate-time argument, not baked in at hook-call time — so a
   page rendering one reminder button per row (dunning) can call this hook
   once per row and get independent pending/success/error state per
   customer, instead of every row sharing one mutation's state. */
export function useSendReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => api.notifications.remind(customerId) as Promise<{ ok?: boolean }>,
    onSuccess: (_data, customerId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists(customerId) });
    },
  });
}
